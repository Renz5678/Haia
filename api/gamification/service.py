"""
Gamification business logic.
Handles XP awards, level calculation, and streak updates.
All writes use the service-role client — this module is called by other
services (tasks, habits) after a completion event, never directly by the user.
"""
from datetime import date

from core.supabase import get_supabase_service_client


def award_xp_for_task(user_id: str, task: dict) -> dict:
    """Award XP when a task is completed. Logs to xp_events (DB trigger syncs users.total_xp)."""
    client = get_supabase_service_client()
    xp = task.get("xp_value", 10)
    event = {
        "user_id": user_id,
        "xp_amount": xp,
        "source_type": "task",
        "source_id": task["id"],
        "reason": f"Completed quest: {task['title']}",
    }
    event_record = client.schema("haia").table("xp_events").insert(event).execute().data[0]
    
    return event_record


def award_xp_for_habit(user_id: str, habit_id: str, log_id: str, xp: int, logged_date: date) -> None:
    """Award XP for a habit check-in and update the habit streak."""
    client = get_supabase_service_client()

    # Log XP event
    client.schema("haia").table("xp_events").insert({
        "user_id": user_id,
        "xp_amount": xp,
        "source_type": "habit",
        "source_id": log_id,
        "reason": "Habit check-in logged",
    }).execute()

    # Update habit streak via python logic to avoid missing RPC
    from datetime import timedelta
    
    streaks = client.schema("haia").table("streaks").select("*").eq("user_id", user_id).eq("habit_id", habit_id).execute().data
    
    if not streaks:
        client.schema("haia").table("streaks").insert({
            "user_id": user_id,
            "habit_id": habit_id,
            "streak_type": "habit",
            "current_streak": 1,
            "longest_streak": 1,
            "last_activity_date": logged_date.isoformat()
        }).execute()
    else:
        streak = streaks[0]
        
        if streak.get("last_activity_date"):
            last_date = date.fromisoformat(streak["last_activity_date"])
        else:
            last_date = None
        
        # If logged today, no change to streak length
        if last_date == logged_date:
            return
            
        # If logged yesterday, increment streak
        if last_date and last_date == logged_date - timedelta(days=1):
            new_current = streak["current_streak"] + 1
            new_longest = max(streak["longest_streak"], new_current)
            client.schema("haia").table("streaks").update({
                "current_streak": new_current,
                "longest_streak": new_longest,
                "last_activity_date": logged_date.isoformat()
            }).eq("id", streak["id"]).execute()
        else:
            # Streak broken
            client.schema("haia").table("streaks").update({
                "current_streak": 1,
                "last_activity_date": logged_date.isoformat()
            }).eq("id", streak["id"]).execute()


def get_user_stats(user_id: str) -> dict:
    """Pull a snapshot of XP, level, and streak data for the Home tab and AI chat context."""
    client = get_supabase_service_client()

    user = client.schema("haia").table("users").select("total_xp,current_level").eq("id", user_id).single().execute().data
    streaks = client.schema("haia").table("streaks").select("*").eq("user_id", user_id).execute().data
    tasks_completed = (
        client.schema("haia").table("tasks")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("status", "completed")
        .execute().count or 0
    )

    total_xp = user["total_xp"]
    level = user["current_level"]
    # XP needed for next level using the triangular formula
    xp_for_current = int(level * (level - 1) / 2 * 50)
    xp_for_next = int(level * (level + 1) / 2 * 50)
    xp_to_next = xp_for_next - total_xp

    longest = max((s["longest_streak"] for s in streaks), default=0)

    return {
        "user_id": user_id,
        "total_xp": total_xp,
        "current_level": level,
        "xp_to_next_level": max(xp_to_next, 0),
        "longest_streak": longest,
        "tasks_completed": tasks_completed,
    }
