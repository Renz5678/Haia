"""
Haia — FastAPI Backend
Entry point: uvicorn main:app --reload
"""

from contextlib import asynccontextmanager

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from auth.router import router as auth_router
from chat.router import router as chat_router
from core.config import get_settings
from courses.router import router as courses_router
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from gamification.router import router as gamification_router
from goals.router import router as goals_router
from habits.router import router as habits_router
from integrations.router import router as integrations_router
from parsing.router import router as parsing_router
from subjects.router import router as subjects_router
from tasks.router import router as tasks_router
from users.router import router as users_router

structlog.configure(
    processors=[
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)
settings = get_settings()


# ─── Background Jobs ──────────────────────────────────────────────────────────

async def job_deadline_reminders() -> None:
    """
    Daily job: send Telegram messages for tasks due within the next 24 hours.
    Runs at 08:00 local time (Asia/Manila).
    ""
    import logging
    from datetime import datetime, timedelta, timezone

    job_logger = logging.getLogger("jobs.deadline_reminders")
    try:
        from core.supabase import get_supabase_service_client

        client = get_supabase_service_client()
        now_utc = datetime.now(timezone.utc)
        window_end = now_utc + timedelta(hours=24)

        # Find all pending tasks due within the next 24 h that have not been notified
        tasks = (
            client.schema("haia").table("tasks")
            .select("id, user_id, title, due_date")
            .eq("status", "pending")
            .gte("due_date", now_utc.isoformat())
            .lte("due_date", window_end.isoformat())
            .execute()
            .data
        )

        if not tasks:
            job_logger.info("deadline_reminders: no tasks due in next 24 h")
            return

        # Group by user
        from collections import defaultdict
        by_user: dict[str, list] = defaultdict(list)
        for t in tasks:
            by_user[t["user_id"]].append(t)

        # Fetch Telegram integrations for these users
        user_ids = list(by_user.keys())
        integrations = (
            client.schema("haia").table("integrations")
            .select("user_id, metadata")
            .eq("service", "telegram")
            .eq("is_active", True)
            .in_("user_id", user_ids)
            .execute()
            .data
        )

        if not integrations:
            job_logger.info("deadline_reminders: no active Telegram integrations")
            return

        import httpx

        bot_token = settings.telegram_bot_token
        if not bot_token:
            job_logger.warning("deadline_reminders: TELEGRAM_BOT_TOKEN not set — skipping")
            return

        async with httpx.AsyncClient(timeout=10) as http:
            for integration in integrations:
                chat_id = integration.get("metadata", {}).get("chat_id")
                if not chat_id:
                    continue

                user_tasks = by_user[integration["user_id"]]
                lines = ["⚔️ *Quest Deadline Alert!* Tasks due in the next 24 hours:\n"]
                for task in user_tasks:
                    due = task["due_date"][:16].replace("T", " ")
                    lines.append(f"• *{task['title']}* — due {due} UTC")
                lines.append("\n_Finish strong, warrior!_ 🔥")
                message = "\n".join(lines)

                await http.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
                )
                job_logger.info("Sent deadline reminder to chat_id=%s", chat_id)

    except Exception as exc:
        job_logger.error("deadline_reminders job failed: %s", exc, exc_info=True)


async def job_backfill_embeddings() -> None:
    """
    Hourly job: find goals with a NULL embedding column and generate embeddings
    for them. This ensures goals created before the embedding feature went live
    are progressively backfilled without any manual intervention.
    Processes up to 20 goals per run to stay within Gemini rate limits.
    """
    import logging

    job_logger = logging.getLogger("jobs.backfill_embeddings")
    try:
        from core.supabase import get_supabase_service_client
        from goals.service import _generate_and_store_embedding

        client = get_supabase_service_client()
        goals = (
            client.schema("haia").table("goals")
            .select("id, title, description")
            .is_("embedding", "null")
            .limit(20)
            .execute()
            .data
        )

        if not goals:
            return  # Nothing to do — silent success

        job_logger.info("backfill_embeddings: processing %d goal(s)", len(goals))
        import asyncio
        from goals.service import _embed_executor

        loop = asyncio.get_running_loop()
        for goal in goals:
            loop.run_in_executor(
                _embed_executor,
                _generate_and_store_embedding,
                goal["id"],
                goal["title"],
                goal.get("description"),
            )

    except Exception as exc:
        job_logger.error("backfill_embeddings job failed: %s", exc, exc_info=True)


async def job_streak_reset() -> None:
    """
    Midnight job (Asia/Manila): reset current_streak to 0 for any streak whose
    last_activity_date is more than 1 day in the past.
    Replaces the equivalent pg_cron SQL job in 003_pg_cron_jobs.sql.
    """
    import logging
    from datetime import date, timedelta

    job_logger = logging.getLogger("jobs.streak_reset")
    try:
        from core.supabase import get_supabase_service_client

        client = get_supabase_service_client()
        yesterday = (date.today() - timedelta(days=1)).isoformat()

        result = (
            client.schema("haia")
            .table("streaks")
            .update({"current_streak": 0})
            .lt("last_activity_date", yesterday)
            .gt("current_streak", 0)  # Only touch rows that are non-zero (idempotent)
            .execute()
        )
        job_logger.info("streak_reset: updated %d row(s)", len(result.data or []))
    except Exception as exc:
        job_logger.error("streak_reset job failed: %s", exc, exc_info=True)


async def job_daily_digest() -> None:
    """
    7:00 AM job (Asia/Manila): send each user a Telegram message listing today's
    classes.  Replaces the pg_cron / pg_net PL/pgSQL function in
    003_pg_cron_jobs.sql so all scheduling lives in the Python layer.
    """
    import logging
    from datetime import datetime

    import httpx

    job_logger = logging.getLogger("jobs.daily_digest")
    try:
        from core.supabase import get_supabase_service_client

        bot_token = settings.telegram_bot_token
        if not bot_token:
            job_logger.warning("daily_digest: TELEGRAM_BOT_TOKEN not set — skipping")
            return

        client = get_supabase_service_client()

        # Day abbreviation matching the DB 'days' array (e.g. ['Mon','Wed'])
        day_abbr = datetime.now().strftime("%a")  # e.g. 'Mon'

        # Fetch all active Telegram integrations
        integrations = (
            client.schema("haia").table("integrations")
            .select("user_id, metadata")
            .eq("service", "telegram")
            .eq("is_active", True)
            .execute().data
        )

        if not integrations:
            job_logger.info("daily_digest: no active Telegram integrations")
            return

        async with httpx.AsyncClient(timeout=10) as http:
            for integration in integrations:
                user_id = integration["user_id"]
                chat_id = integration.get("metadata", {}).get("chat_id")
                if not chat_id:
                    continue

                # Fetch courses that occur today
                courses = (
                    client.schema("haia").table("courses")
                    .select("code, start_time, end_time, room, modality")
                    .eq("user_id", user_id)
                    .contains("days", [day_abbr])
                    .order("start_time")
                    .execute().data
                )

                if not courses:
                    msg = f"Good morning! You have no classes scheduled for today ({day_abbr}). Enjoy your free day! 🎉"
                else:
                    lines = [f"Good morning! Here is your schedule for today ({day_abbr}):\n"]
                    for c in courses:
                        start = str(c.get("start_time", ""))[:5]
                        end = str(c.get("end_time", ""))[:5]
                        lines.append(f"📚 *{c['code']}* ({c.get('modality', 'f2f')})")
                        lines.append(f"⏰ {start} – {end}")
                        if c.get("room"):
                            lines.append(f"📍 {c['room']}")
                        lines.append("")
                    lines.append("Have a great day, boss! 🚀")
                    msg = "\n".join(lines)

                try:
                    resp = await http.post(
                        f"https://api.telegram.org/bot{bot_token}/sendMessage",
                        json={"chat_id": chat_id, "text": msg, "parse_mode": "Markdown"},
                    )
                    if resp.status_code == 400:
                        # Fallback to plain text on Markdown parse error
                        await http.post(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            json={"chat_id": chat_id, "text": msg},
                        )
                    job_logger.info("daily_digest: sent to chat_id=%s", chat_id)
                except Exception as send_exc:
                    job_logger.error("daily_digest: failed for chat_id=%s — %s", chat_id, send_exc)

    except Exception as exc:
        job_logger.error("daily_digest job failed: %s", exc, exc_info=True)


# ─── App Lifespan ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Haia API starting up — env: %s", settings.app_env)

    if settings.sentry_dsn_api:
        import sentry_sdk
        sentry_sdk.init(dsn=settings.sentry_dsn_api, environment=settings.app_env)
        logger.info("Sentry initialised")

    # Start APScheduler (in-process, async-native)
    scheduler = AsyncIOScheduler(timezone="Asia/Manila")

    # Deadline reminders: daily at 08:00 local time
    scheduler.add_job(
        job_deadline_reminders,
        CronTrigger(hour=8, minute=0, timezone="Asia/Manila"),
        id="deadline_reminders",
        name="Deadline Reminders",
        replace_existing=True,
        misfire_grace_time=3600,  # fire up to 1 h late if server was down
    )

    # Embedding backfill: every hour at :00
    scheduler.add_job(
        job_backfill_embeddings,
        CronTrigger(minute=0, timezone="Asia/Manila"),
        id="backfill_embeddings",
        name="Goal Embedding Backfill",
        replace_existing=True,
        misfire_grace_time=1800,
    )

    # Streak reset: midnight (replaces pg_cron SQL job)
    scheduler.add_job(
        job_streak_reset,
        CronTrigger(hour=0, minute=0, timezone="Asia/Manila"),
        id="streak_reset",
        name="Streak Reset",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Daily schedule digest: 07:00 (replaces pg_cron / pg_net PL/pgSQL function)
    scheduler.add_job(
        job_daily_digest,
        CronTrigger(hour=7, minute=0, timezone="Asia/Manila"),
        id="daily_digest",
        name="Daily Schedule Digest",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    scheduler.start()
    logger.info(
        "APScheduler started — %d job(s) scheduled",
        len(scheduler.get_jobs()),
    )

    logger.info("Application startup complete.")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    scheduler.shutdown(wait=False)
    logger.info("Haia API shutting down")



app = FastAPI(
    title="Haia API",
    description="Backend for Haia — personal life-and-school management with gamification.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers under /api/v1
PREFIX = "/api/v1"
app.include_router(tasks_router,        prefix=PREFIX)
app.include_router(habits_router,       prefix=PREFIX)
app.include_router(goals_router,        prefix=PREFIX)
app.include_router(courses_router,      prefix=PREFIX)
app.include_router(gamification_router, prefix=PREFIX)
app.include_router(chat_router,         prefix=PREFIX)
app.include_router(parsing_router,      prefix=PREFIX)
app.include_router(integrations_router, prefix=PREFIX)
app.include_router(subjects_router,     prefix=PREFIX)
app.include_router(users_router,        prefix=PREFIX)
app.include_router(auth_router,         prefix=PREFIX)


@app.get("/health")
def health_check():
    return {"status": "ok", "env": settings.app_env}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", exc_info=exc, path=request.url.path)
    if settings.sentry_dsn_api:
        import sentry_sdk
        sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )
