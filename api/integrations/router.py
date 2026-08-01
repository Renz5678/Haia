import secrets
from datetime import datetime, timedelta, timezone

from core.config import get_settings
from core.dependencies import get_current_user
from fastapi import APIRouter, Depends, Request

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/google/connect")
def google_connect(user: dict = Depends(get_current_user)):
    """
    Step 1 of Google OAuth: return the authorization URL.
    The frontend redirects the user here.
    Phase 5 — full implementation.
    """
    # TODO(phase-5): build Google OAuth URL with Calendar + Gmail scopes
    return {"auth_url": "Google OAuth coming in Phase 5"}


@router.get("/google/callback")
async def google_callback(code: str, state: str | None = None):
    """
    Step 2 of Google OAuth: exchange code for tokens, store in integrations table.
    Phase 5 — full implementation.
    """
    # TODO(phase-5): exchange code, store access_token + refresh_token
    return {"message": "Google OAuth callback — Phase 5"}


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    from integrations import service
    settings = get_settings()
    
    # In production, we'd validate the webhook secret via X-Telegram-Bot-Api-Secret-Token
    # For now, we trust the incoming webhook since it's an internal test or the secret is configured in Telegram
    payload = await request.json()
    
    # Run in background or await? We should probably just await since FastAPI can handle it asynchronously
    await service.handle_telegram_webhook(payload)
    return {"ok": True}


@router.post("/email/inbound")
async def email_inbound(request: Request):
    """
    Mailgun / Postmark inbound email webhook.
    Phase 8 — full implementation.
    """
    # TODO(phase-8): validate signature, extract body + attachments, pass to parsing pipeline
    return {"ok": True}


@router.post("/telegram/link-code")
def generate_telegram_link_code(user: dict = Depends(get_current_user)):
    from core.supabase import get_supabase_service_client
    client = get_supabase_service_client()
    
    code = secrets.token_hex(3).upper()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    
    payload = {
        "user_id": user["id"],
        "service": "telegram",
        "is_active": False,
        "external_id": None,
        "metadata": {"link_code": code, "expires_at": expires_at}
    }
    client.schema("haia").table("integrations").upsert(payload).execute()
    return {"link_code": code, "expires_in_minutes": 15}
