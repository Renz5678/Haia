"""
Goals service.
Handles CRUD for goals and semantic embedding generation via Gemini.

Embedding strategy:
  • text-embedding-004 produces 768-dimensional vectors, matching the
    extensions.vector(768) column in haia.goals.
  • Embeddings are generated asynchronously (ThreadPoolExecutor) so they
    never block the HTTP request cycle.
  • Failures are logged but non-fatal — the goal is saved even if the
    embedding call fails.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from core.supabase import get_supabase_service_client
from goals.schemas import GoalCreate, GoalUpdate

logger = logging.getLogger(__name__)

# One shared thread pool for all embedding work — keeps I/O off the event loop
_embed_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="embed")


def _build_embedding_text(title: str, description: str | None) -> str:
    """Combine title and description into a single string for embedding."""
    parts = [title]
    if description:
        parts.append(description)
    return " — ".join(parts)


def _generate_and_store_embedding(goal_id: str, title: str, description: str | None) -> None:
    """
    Blocking function: generate a Gemini embedding and write it to the DB.
    Intended to be called in a background thread via _embed_executor.
    """
    try:
        from gemini_client import get_embedding

        text = _build_embedding_text(title, description)
        vector = get_embedding(text)  # list[float] of 768 dims

        client = get_supabase_service_client()
        client.schema("haia").table("goals").update(
            {"embedding": vector}
        ).eq("id", goal_id).execute()

        logger.info("Embedding stored for goal %s", goal_id)
    except Exception as exc:
        # Non-fatal — goal already saved, embedding can be backfilled later
        logger.warning("Failed to generate embedding for goal %s: %s", goal_id, exc)


def _schedule_embedding(goal_id: str, title: str, description: str | None) -> None:
    """
    Submit embedding work to the background thread pool.
    Works whether called from a sync or async context.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(
            _embed_executor,
            _generate_and_store_embedding,
            goal_id,
            title,
            description,
        )
    except RuntimeError:
        # No running event loop (e.g., during tests) — run synchronously
        _generate_and_store_embedding(goal_id, title, description)


# ─── CRUD ────────────────────────────────────────────────────────────────────

def create_goal(user_id: str, data: GoalCreate) -> dict:
    client = get_supabase_service_client()
    payload = {
        **data.model_dump(),
        "user_id": user_id,
        "subject_id": str(data.subject_id) if data.subject_id else None,
        "target_date": data.target_date.isoformat() if data.target_date else None,
    }
    response = client.schema("haia").table("goals").insert(payload).execute()
    goal = response.data[0]

    # Fire-and-forget: generate embedding without blocking the response
    _schedule_embedding(goal["id"], data.title, data.description)

    return goal


def list_goals(user_id: str, status: str | None = None) -> list[dict]:
    client = get_supabase_service_client()
    query = client.schema("haia").table("goals").select(
        "id, user_id, title, description, goal_type, target_value, "
        "current_value, target_date, status, subject_id, created_at, updated_at"
    ).eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data


def update_goal(user_id: str, goal_id: str, data: GoalUpdate) -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = (
        client.schema("haia").table("goals")
        .update(payload)
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    updated = result.data[0]

    # Re-embed if title or description changed
    if "title" in payload or "description" in payload:
        _schedule_embedding(
            goal_id,
            updated.get("title", ""),
            updated.get("description"),
        )

    return updated


def get_goal(user_id: str, goal_id: str) -> dict | None:
    client = get_supabase_service_client()
    result = (
        client.schema("haia").table("goals")
        .select(
            "id, user_id, title, description, goal_type, target_value, "
            "current_value, target_date, status, subject_id, created_at, updated_at"
        )
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def delete_goal(user_id: str, goal_id: str) -> None:
    client = get_supabase_service_client()
    client.schema("haia").table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()


def get_goal_progress(user_id: str, goal_id: str) -> dict:
    client = get_supabase_service_client()
    task_links = client.schema("haia").table("task_goals").select("task_id").eq("goal_id", goal_id).execute().data
    if not task_links:
        return {"progress_pct": 0.0}

    task_ids = [link["task_id"] for link in task_links]
    tasks = client.schema("haia").table("tasks").select("status").in_("id", task_ids).eq("user_id", user_id).execute().data

    total = len(tasks)
    if total == 0:
        return {"progress_pct": 0.0}

    completed = sum(1 for t in tasks if t["status"] == "completed")
    pct = round((completed / total) * 100, 2)
    return {"progress_pct": pct}


def recalculate_goal_progress(user_id: str, goal_id: str) -> dict:
    """Re-compute task-completion progress for a goal and persist it to DB."""
    client = get_supabase_service_client()
    task_links = client.schema("haia").table("task_goals").select("task_id").eq("goal_id", goal_id).execute().data

    if not task_links:
        pct = 0.0
    else:
        task_ids = [link["task_id"] for link in task_links]
        tasks = client.schema("haia").table("tasks").select("status").in_("id", task_ids).eq("user_id", user_id).execute().data
        total = len(tasks)
        if total == 0:
            pct = 0.0
        else:
            completed = sum(1 for t in tasks if t["status"] == "completed")
            pct = round((completed / total) * 100, 2)

    # Persist back so GoalResponse.progress stays accurate
    client.schema("haia").table("goals").update(
        {"current_value": pct}
    ).eq("id", goal_id).eq("user_id", user_id).execute()

    return {"goal_id": goal_id, "progress_pct": pct}

