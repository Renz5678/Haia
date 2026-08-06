"""
Unified AI chatbot service.
Handles intent routing and conversational replies for both Telegram and web.
All messages are stored per-user (not per-channel) in chat_messages.
"""
from core.supabase import get_supabase_service_client
from fastapi import HTTPException
import time
import logging

from chat.schemas import ChatMessageCreate

logger = logging.getLogger(__name__)


def get_history(user_id: str, limit: int = 20) -> list[dict]:
    client = get_supabase_service_client()
    rows = (
        client.schema("haia").table("chat_messages")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute().data
    )
    return list(reversed(rows))  # Return chronological order


def save_message(user_id: str, role: str, content: str, channel: str,
                 intent: str | None = None,
                 linked_item_type: str | None = None,
                 linked_item_id: str | None = None) -> dict:
    client = get_supabase_service_client()
    payload = {
        "user_id": user_id,
        "role": role,
        "content": content,
        "channel": channel,
        "intent": intent,
        "linked_item_type": linked_item_type,
        "linked_item_id": linked_item_id,
    }
    return client.schema("haia").table("chat_messages").insert(payload).execute().data[0]


def process_message(user_id: str, data: ChatMessageCreate) -> dict:
    import json
    from datetime import datetime

    from gamification.service import get_user_stats
    from gemini_client import _get_client, _load_prompt
    from parsing.schemas import ParseTextRequest
    from parsing.service import parse_text

    # 1. Save the user's message
    save_message(user_id=user_id, role="user", content=data.content, channel=data.channel)

    # 2. Route intent
    req = ParseTextRequest(raw_input=data.content, channel=data.channel)
    res = parse_text(user_id, req)

    # 3. Formulate reply
    if res.intent in ["task", "habit", "goal"]:
        if res.intent == "task":
            reply = f"✅ Task saved: {res.data.get('title')}"
        elif res.intent == "habit":
            reply = f"🔁 Habit created: {res.data.get('name')}"
        else:
            reply = f"🎯 Goal set: {res.data.get('title')}"
        
        intent_map = {
            "task": "new_task",
            "habit": "new_habit",
            "goal": "new_goal",
            "conversational": "conversational",
        }
        db_intent = intent_map.get(res.intent, "unknown")
        saved = save_message(user_id=user_id, role="assistant", content=reply, channel=data.channel, 
                             intent=db_intent, linked_item_type=res.parsed_type, linked_item_id=res.saved_id)
        return saved
        
    # 4. Conversational branch
    stats = get_user_stats(user_id)
    history = get_history(user_id, limit=5)
    
    # Just a simple text generation with context
    gemini_client = _get_client()
    prompt_template = _load_prompt("chat_reply")
    
    # We aren't fetching recent tasks/goals in the stub, just stats for brevity
    # but we could fetch them here.
    # Better live snapshot grounding
    client = get_supabase_service_client()
    
    pending_tasks = (
        client.schema("haia").table("tasks")
        .select("title, due_date, priority")
        .eq("user_id", user_id)
        .eq("status", "pending")
        .order("due_date")
        .limit(5)
        .execute().data
    )
    
    recent_goals = (
        client.schema("haia").table("goals")
        .select("title, status")
        .eq("user_id", user_id)
        .eq("status", "in_progress")
        .limit(3)
        .execute().data
    )
    
    courses = (
        client.schema("haia").table("courses")
        .select("code, name, days, start_time, end_time")
        .eq("user_id", user_id)
        .execute().data
    )
    
    habits = (
        client.schema("haia").table("habits")
        .select("name, frequency, custom_days")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute().data
    )
    
    # 1. Compress context into highly token-efficient strings instead of raw JSON dumps
    tasks_str = "|".join([f"{t.get('title')}({t.get('due_date') or ''})" for t in pending_tasks]) if pending_tasks else "None"
    goals_str = "|".join([g.get("title", "") for g in recent_goals]) if recent_goals else "None"
    courses_str = "|".join([f"{c.get('code')}({c.get('days')})" for c in courses]) if courses else "None"
    habits_str = "|".join([h.get("name", "") for h in habits]) if habits else "None"
    
    # Format history concisely: User: msg | Haia: msg
    history_lines = []
    for msg in history:
        history_lines.append(f"{'Haia' if msg['role'] == 'assistant' else 'User'}: {msg['content']}")
    history_str = "\n".join(history_lines)
    
    current_time_str = datetime.now().strftime("%A, %B %d, %Y %I:%M %p")
    stats_dict = stats.model_dump() if hasattr(stats, 'model_dump') else stats
    stats_str = f"Lvl{stats_dict.get('current_level', 1)} XP:{stats_dict.get('total_xp', 0)}"

    prompt = prompt_template.replace("{current_time}", current_time_str)
    prompt = prompt.replace("{user_stats}", stats_str)
    prompt = prompt.replace("{recent_tasks}", tasks_str)
    prompt = prompt.replace("{recent_goals}", goals_str)
    prompt = prompt.replace("{courses}", courses_str)
    prompt = prompt.replace("{habits}", habits_str)
    prompt = prompt.replace("{chat_history}", history_str)
    prompt += f"\n\nUser: {data.content}\nHaia:"
    
    # 2. Robust exponential backoff
    ai_reply = None
    max_retries = 3
    for attempt in range(max_retries):
        try:
            ai_res = gemini_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )
            ai_reply = ai_res.text if ai_res.text else "I seem to have lost my train of thought. Can we try that again?"
            break
        except Exception as e:
            err_str = str(e).lower()
            if ("503" in err_str or "429" in err_str or "quota" in err_str or "rate limit" in err_str) and attempt < max_retries - 1:
                sleep_time = 2 ** attempt
                logger.warning(f"Gemini API unavailable/rate limited (attempt {attempt + 1}). Retrying in {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                logger.error(f"Gemini API call failed after {attempt + 1} attempts: {e}")
                # Raise 503 Service Unavailable so frontend can handle it gracefully
                raise HTTPException(status_code=503, detail="The AI is resting right now due to high demand. Please try again in a moment!")
    
    if ai_reply is None:
        raise HTTPException(status_code=503, detail="The AI is resting right now due to high demand. Please try again in a moment!")
    
    saved = save_message(user_id=user_id, role="assistant", content=ai_reply, channel=data.channel, intent="conversational")
    return saved
