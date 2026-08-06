import logging

import httpx
from core.config import get_settings
from core.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


async def _get_telegram_file_bytes(file_id: str) -> tuple[bytes, str]:
    """
    Download a file from Telegram servers by file_id.
    Returns (raw_bytes, mime_type).
    """
    settings = get_settings()
    bot_token = settings.telegram_bot_token

    async with httpx.AsyncClient(timeout=30) as http:
        # Step 1: resolve file_id → file_path
        r = await http.get(
            f"https://api.telegram.org/bot{bot_token}/getFile",
            params={"file_id": file_id},
        )
        r.raise_for_status()
        file_path = r.json()["result"]["file_path"]

        # Step 2: download the actual file
        dl = await http.get(
            f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        )
        dl.raise_for_status()

        # Infer mime type from extension
        ext = file_path.rsplit(".", 1)[-1].lower() if "." in file_path else ""
        mime_map = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif",
            "ogg": "audio/ogg",
            "oga": "audio/ogg",
            "mp3": "audio/mpeg",
            "m4a": "audio/mp4",
            "wav": "audio/wav",
        }
        mime_type = mime_map.get(ext, "application/octet-stream")

        return dl.content, mime_type


async def handle_telegram_webhook(payload: dict):
    settings = get_settings()
    message = payload.get("message")
    if not message:
        return

    chat_id = str(message.get("chat", {}).get("id"))
    if not chat_id:
        return

    text = message.get("text")
    photo = message.get("photo")       # list of PhotoSize objects, largest last
    voice = message.get("voice")       # Voice object
    document = message.get("document") # Document object (for PDFs etc.)

    # At least one content type must be present
    if not text and not photo and not voice and not document:
        return

    client = get_supabase_service_client()
    # Find user by telegram ID
    integration = (
        client.schema("haia").table("integrations")
        .select("user_id")
        .eq("service", "telegram")
        .eq("external_id", chat_id)
        .eq("is_active", True)
        .execute().data
    )

    if not integration:
        # Only text messages can carry linking codes
        if text:
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

                await _send_telegram_message(chat_id, "✅ Successfully linked to your Haia account! You can now send me tasks, goals, photos, and voice notes.")
                return

        # Unknown user / invalid code
        await _send_telegram_message(
            chat_id,
            "Welcome to Haia! Please generate a linking code in the Haia Web App settings and send it to me here to connect your account."
        )
        return

    user_id = integration[0]["user_id"]

    # ── Route to the correct parsing pipeline ──────────────────────────────────

    # 1. Photo message → parse_photo
    if photo:
        await _handle_photo(chat_id, user_id, photo)
        return

    # 2. Voice message → parse_voice
    if voice:
        await _handle_voice(chat_id, user_id, voice)
        return

    # 3. Document (PDF, DOCX, etc.) → parse_syllabus
    if document:
        await _handle_document(chat_id, user_id, document)
        return

    # 4. Plain text → unified chat pipeline
    from chat.schemas import ChatMessageCreate
    from chat.service import process_message

    msg_data = ChatMessageCreate(content=text, channel="telegram")
    try:
        res = await process_message(user_id, msg_data)
        reply = res.get("content", "I couldn't quite understand that. Could you rephrase?")
    except Exception as e:
        logger.error(f"Error processing telegram message: {e}")
        reply = "I'm having trouble processing that right now. Please try again later."

    await _send_telegram_message(chat_id, reply)


async def _handle_photo(chat_id: str, user_id: str, photo: list) -> None:
    """Download the largest photo and route it through parse_photo."""
    try:
        # Telegram sends multiple resolutions; the last entry is the largest
        largest = photo[-1]
        file_id = largest["file_id"]

        file_bytes, mime_type = await _get_telegram_file_bytes(file_id)

        from parsing.service import parse_photo as svc_parse_photo
        from fastapi import UploadFile
        import io

        # Wrap bytes in a mock UploadFile for the parsing service
        upload = UploadFile(
            filename="photo.jpg",
            file=io.BytesIO(file_bytes),
        )
        upload.content_type = mime_type

        res = await svc_parse_photo(user_id=user_id, file=upload)

        if res.intent in ["task", "habit", "goal"]:
            name = res.data.get("title") or res.data.get("name") or "item"
            reply = f"📸 Got it! I spotted a *{res.intent}* in that photo:\n_{name}_\nSaved to your {res.intent}s ✅"
        else:
            reply = "📸 I looked at that photo but couldn't find a clear task, habit, or goal. Could you add a note describing what you need?"
    except Exception as e:
        logger.error(f"Photo parsing failed for user {user_id}: {e}")
        reply = "Couldn't quite parse that photo — try a clearer shot or add a text description!"

    await _send_telegram_message(chat_id, reply)


async def _handle_voice(chat_id: str, user_id: str, voice: dict) -> None:
    """Download the voice note and route it through parse_voice."""
    try:
        file_id = voice["file_id"]
        file_bytes, mime_type = await _get_telegram_file_bytes(file_id)

        from parsing.service import parse_voice as svc_parse_voice
        from fastapi import UploadFile
        import io

        upload = UploadFile(
            filename="voice.ogg",
            file=io.BytesIO(file_bytes),
        )
        upload.content_type = mime_type

        res = await svc_parse_voice(user_id=user_id, file=upload)

        if res.intent in ["task", "habit", "goal"]:
            name = res.data.get("title") or res.data.get("name") or "item"
            reply = f"🎙️ Heard you! I caught a *{res.intent}*:\n_{name}_\nSaved ✅"
        else:
            reply = "🎙️ I transcribed your voice note but couldn't find a clear task, habit, or goal. Try sending a quick text summary too!"
    except Exception as e:
        logger.error(f"Voice parsing failed for user {user_id}: {e}")
        reply = "Couldn't parse that voice note right now. Try again or type it out!"

    await _send_telegram_message(chat_id, reply)


async def _handle_document(chat_id: str, user_id: str, document: dict) -> None:
    """Download a document (PDF, DOCX, etc.) and route it through parse_syllabus."""
    mime_type = document.get("mime_type", "application/octet-stream")
    file_name = document.get("file_name", "document")

    # Only accept document types we can meaningfully parse
    supported_mime_prefixes = ("application/pdf", "application/vnd", "text/")
    if not any(mime_type.startswith(p) for p in supported_mime_prefixes):
        await _send_telegram_message(
            chat_id,
            f"I received a file ({file_name}) but I can only parse PDFs and Word documents for syllabi. Send a supported file type!"
        )
        return

    try:
        file_id = document["file_id"]
        file_bytes, _ = await _get_telegram_file_bytes(file_id)

        from parsing.service import parse_syllabus as svc_parse_syllabus
        from fastapi import UploadFile
        import io

        upload = UploadFile(
            filename=file_name,
            file=io.BytesIO(file_bytes),
        )
        upload.content_type = mime_type

        res = await svc_parse_syllabus(user_id=user_id, file=upload)

        count = len(res.tasks) if res.tasks else 0
        if count:
            reply = f"📄 Syllabus imported! I extracted *{count} quest{'s' if count != 1 else ''}* and saved them to your Quest Log ✅\nCheck the dashboard to review them!"
        else:
            reply = "📄 I read the document but couldn't find any clear tasks or deadlines. Try uploading a course syllabus!"
    except Exception as e:
        logger.error(f"Document parsing failed for user {user_id}: {e}")
        reply = "Couldn't parse that document right now. Make sure it's a readable PDF or Word file!"

    await _send_telegram_message(chat_id, reply)


async def _send_telegram_message(chat_id: str, text: str):
    settings = get_settings()
    if not settings.telegram_bot_token:
        logger.warning("No Telegram token configured, skipping message send")
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=10) as client:
        # Gemini uses ** for bold, but Telegram's legacy Markdown uses * for bold
        formatted_text = text.replace("**", "*")

        # Try sending with Markdown first
        resp = await client.post(url, json={"chat_id": chat_id, "text": formatted_text, "parse_mode": "Markdown"})

        # If Telegram rejects it due to unclosed formatting tags, fallback to plain text
        if resp.status_code == 400:
            await client.post(url, json={"chat_id": chat_id, "text": text})
