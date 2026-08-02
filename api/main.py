"""
Haia — FastAPI Backend
Entry point: uvicorn main:app --reload
"""

from contextlib import asynccontextmanager

import structlog
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Haia API starting up — env: %s", settings.app_env)
    if settings.sentry_dsn_api:
        import sentry_sdk
        sentry_sdk.init(dsn=settings.sentry_dsn_api, environment=settings.app_env)
        logger.info("Sentry initialised")
        
    logger.info("Application startup complete.")
        
    yield
    # Shutdown
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
