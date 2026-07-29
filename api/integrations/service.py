import logging
import httpx
from core.supabase import get_supabase_service_client
from core.config import get_settings
from parsing.schemas import ParseTextRequest
from parsing.service import parse_text

logger = logging.getLogger(__name__)

async def handle_telegram_webhook(payload: dict):
    settings = get_settings()
    message = payload.get("message")
    if not message:
        return

    chat_id = str(message.get("chat", {}).get("id"))
    text = message.get("text")
    if not chat_id or not text:
        return

    client = get_supabase_service_client()
    # Find user by telegram ID
    integration = client.schema("haia").table("integrations").select("user_id").eq("service", "telegram").eq("external_id", chat_id).eq("is_active", True).execute().data
    
    if not integration:
        text_clean = text.strip().upper()
        
        # Check for pending linking codes
        pending = client.schema("haia").table("integrations").select("*").eq("service", "telegram").eq("is_active", False).execute()
        
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        matched_integration = None
        for p in pending.data:
            meta = p.get("metadata", {})
            if meta.get("link_code") == text_clean:
                expires_at_str = meta.get("expires_at")
                if expires_at_str:
                    try:
                        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                        if expires_at > now:
                            matched_integration = p
                            break
                    except Exception:
                        pass
        
        if matched_integration:
            # Activate and bind the Chat ID
            new_meta = matched_integration.get("metadata", {})
            new_meta.pop("link_code", None)
            new_meta.pop("expires_at", None)
            
            client.schema("haia").table("integrations").update({
                "external_id": chat_id,
                "is_active": True,
                "metadata": new_meta
            }).eq("id", matched_integration["id"]).execute()
            
            await _send_telegram_message(chat_id, "✅ Successfully linked to your Haia account! You can now send me tasks and goals.")
            return

        # Unknown user / Invalid code
        await _send_telegram_message(
            chat_id,
            "Welcome to Haia! Please generate a 6-digit linking code in the Haia Web App settings and send it to me here to connect your account."
        )
        return

    user_id = integration[0]["user_id"]
    
    # Parse intent and save
    req = ParseTextRequest(raw_input=text, channel="telegram")
    res = parse_text(user_id, req)
    
    # Formulate reply based on what was saved
    if res.intent == "task" and res.parsed_type == "task":
        reply = f"✅ Task saved: {res.data.get('title')}"
    elif res.intent == "habit" and res.parsed_type == "habit":
        reply = f"🔁 Habit created: {res.data.get('name')}"
    elif res.intent == "goal" and res.parsed_type == "goal":
        reply = f"🎯 Goal set: {res.data.get('title')}"
    elif res.intent == "conversational":
        # For now, just echo. Unified AI Chat is Step 8
        reply = "I hear you! Conversational AI is coming in the next update."
    else:
        reply = "I couldn't quite understand that. Could you rephrase?"

    await _send_telegram_message(chat_id, reply)

async def _send_telegram_message(chat_id: str, text: str):
    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.warning("No Telegram token configured, skipping message send")
        return
        
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"chat_id": chat_id, "text": text})
