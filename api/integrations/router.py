import secrets
from datetime import datetime, timedelta, timezone

from core.config import get_settings
from core.dependencies import get_current_user
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse
from google_auth_oauthlib.flow import Flow

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/google/connect")
def google_connect(user: dict = Depends(get_current_user)):
    """
    Step 1 of Google OAuth: return the authorization URL.
    The frontend redirects the user here.
    Phase 5 — full implementation.
    """
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        return {"auth_url": f"{settings.web_base_url}/settings?error=missing_credentials"}

    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    flow.redirect_uri = settings.google_redirect_uri
    
    # Pass the user ID in the state parameter
    auth_url, state = flow.authorization_url(prompt="consent", access_type="offline", state=user["id"])
    return {"auth_url": auth_url}


@router.get("/google/callback")
async def google_callback(code: str, state: str | None = None):
    """
    Step 2 of Google OAuth: exchange code for tokens, store in integrations table.
    Phase 5 — full implementation.
    """
    settings = get_settings()
    if not settings.google_client_id or not settings.google_client_secret:
        return HTMLResponse("Error: Missing Google Client ID or Secret", status_code=500)

    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.google_redirect_uri]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=["https://www.googleapis.com/auth/calendar"]
    )
    flow.redirect_uri = settings.google_redirect_uri
    
    try:
        flow.fetch_token(code=code)
    except Exception as e:
        return HTMLResponse(f"Error fetching token: {e}", status_code=400)
        
    credentials = flow.credentials
    user_id = state
    
    from core.supabase import get_supabase_service_client
    client = get_supabase_service_client()
    
    payload = {
        "user_id": user_id,
        "service": "google",
        "is_active": True,
        "external_id": credentials.client_id,
        "metadata": {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": credentials.scopes
        }
    }
    
    existing = client.schema("haia").table("integrations").select("id").eq("user_id", user_id).eq("service", "google").execute()
    if existing.data:
        client.schema("haia").table("integrations").update(payload).eq("id", existing.data[0]["id"]).execute()
    else:
        client.schema("haia").table("integrations").insert(payload).execute()
    
    return HTMLResponse(
        "<script>window.opener.postMessage('google_connected', '*'); window.close();</script>"
        "<h2>Google connected successfully! You can close this window.</h2>"
    )


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    from integrations import service
    settings = get_settings()
    
    if settings.telegram_webhook_secret:
        secret_token = request.headers.get("x-telegram-bot-api-secret-token")
        if secret_token != settings.telegram_webhook_secret:
            raise HTTPException(status_code=401, detail="Unauthorized")
            
    payload = await request.json()
    
    # Run in background or await? We should probably just await since FastAPI can handle it asynchronously
    await service.handle_telegram_webhook(payload)
    return {"ok": True}


@router.post("/email/inbound")
async def email_inbound(request: Request):
    """
    Mailgun inbound email webhook.
    """
    form_data = await request.form()
    sender = form_data.get("sender")
    subject = form_data.get("subject", "")
    body_text = form_data.get("stripped-text", "")
    
    if not sender:
        return {"ok": False, "error": "No sender"}
        
    from core.supabase import get_supabase_service_client
    client = get_supabase_service_client()
    
    # Identify user by email
    user_res = client.schema("haia").table("users").select("id").eq("email", sender).execute()
    if not user_res.data:
        return {"ok": False, "error": "User not found"}
        
    user_id = user_res.data[0]["id"]
    
    # Combine subject and body for the parser
    raw_input = f"{subject}\n{body_text}".strip()
    if not raw_input:
        return {"ok": True, "message": "Empty email body"}
        
    from parsing.schemas import ParseTextRequest
    from parsing.service import parse_text
    
    req = ParseTextRequest(raw_input=raw_input, channel="email")
    try:
        parse_text(user_id, req)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to parse email: {e}")
        
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
    
    existing = client.schema("haia").table("integrations").select("id").eq("user_id", user["id"]).eq("service", "telegram").execute()
    if existing.data:
        client.schema("haia").table("integrations").update(payload).eq("id", existing.data[0]["id"]).execute()
    else:
        client.schema("haia").table("integrations").insert(payload).execute()
        
    return {"link_code": code, "expires_in_minutes": 15}
