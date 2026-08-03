"""
Unified AI chatbot service.
Handles intent routing and conversational replies for both Telegram and web.
All messages are stored per-user (not per-channel) in chat_messages.
"""
from core.supabase import get_supabase_service_client

from chat.schemas import ChatMessageCreate


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
    
    history_str = json.dumps([{"role": msg["role"], "content": msg["content"]} for msg in history])
    
    current_time_str = datetime.now().strftime("%A, %B %d, %Y %I:%M %p")

    prompt = prompt_template.replace("{current_time}", current_time_str)
    prompt = prompt.replace("{user_stats}", json.dumps(stats.model_dump() if hasattr(stats, 'model_dump') else stats))
    prompt = prompt.replace("{recent_tasks}", json.dumps(pending_tasks))
    prompt = prompt.replace("{recent_goals}", json.dumps(recent_goals))
    prompt = prompt.replace("{courses}", json.dumps(courses))
    prompt = prompt.replace("{habits}", json.dumps(habits))
    prompt = prompt.replace("{chat_history}", history_str)
    prompt += f"\n\nUser: {data.content}\nHaia:"

    ai_res = gemini_client.models.generate_content(
        model="gemini-1.5-flash",
        contents=prompt
    )
    reply = ai_res.text.strip()
    
    saved = save_message(user_id=user_id, role="assistant", content=reply, channel=data.channel, intent="conversational")
    return saved
