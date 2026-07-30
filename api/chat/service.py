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
    from parsing.service import parse_text
    from parsing.schemas import ParseTextRequest
    from gamification.service import get_user_stats
    import google.generativeai as genai
    from core.config import get_settings
    from gemini_client import _get_model, _load_prompt
    import json

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
        
        saved = save_message(user_id=user_id, role="assistant", content=reply, channel=data.channel, 
                             intent=res.intent, linked_item_type=res.parsed_type, linked_item_id=res.saved_id)
        return saved
        
    # 4. Conversational branch
    stats = get_user_stats(user_id)
    history = get_history(user_id, limit=5)
    
    # Just a simple text generation with context
    model = _get_model("gemini-flash-latest")
    prompt_template = _load_prompt("chat_reply")
    
    # We aren't fetching recent tasks/goals in the stub, just stats for brevity
    # but we could fetch them here.
    client = get_supabase_service_client()
    recent_tasks = client.schema("haia").table("tasks").select("title, status").eq("user_id", user_id).limit(5).execute().data
    recent_goals = client.schema("haia").table("goals").select("title, status").eq("user_id", user_id).limit(3).execute().data
    
    history_str = json.dumps([{"role": msg["role"], "content": msg["content"]} for msg in history])
    
    prompt = prompt_template.replace("{user_stats}", json.dumps(stats.model_dump() if hasattr(stats, 'model_dump') else stats))
    prompt = prompt.replace("{recent_tasks}", json.dumps(recent_tasks))
    prompt = prompt.replace("{recent_goals}", json.dumps(recent_goals))
    prompt = prompt.replace("{chat_history}", history_str)
    prompt += f"\n\nUser: {data.content}\nHaia:"

    ai_res = model.generate_content(prompt)
    reply = ai_res.text.strip()
    
    saved = save_message(user_id=user_id, role="assistant", content=reply, channel=data.channel, intent="conversational")
    return saved
