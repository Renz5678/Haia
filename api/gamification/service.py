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
    
    # Get habit details for flexible streaks
    habit = client.schema("haia").table("habits").select("frequency").eq("id", habit_id).single().execute().data
    
    streaks = client.schema("haia").table("streaks").select("*").eq("user_id", user_id).eq("habit_id", habit_id).execute().data
    
    if not streaks:
        client.schema("haia").table("streaks").insert({
            "user_id": user_id,
            "habit_id": habit_id,
            "streak_type": "habit",
            "current_streak": 0 if habit.get("frequency") == "flexible" else 1,
            "longest_streak": 0 if habit.get("frequency") == "flexible" else 1,
            "last_activity_date": logged_date.isoformat()
        }).execute()
        # For flexible habits, we just created the row. We will handle increment below.
        if habit.get("frequency") != "flexible":
            return
        
        streaks = client.schema("haia").table("streaks").select("*").eq("user_id", user_id).eq("habit_id", habit_id).execute().data

    streak = streaks[0]
        
    if streak.get("last_activity_date"):
        last_date = date.fromisoformat(streak["last_activity_date"])
    else:
        last_date = None
        
    if habit.get("frequency") == "flexible":
        # Weekly flexible streak logic
        target = habit.get("target_count") or 1
        
        # Get all logs for this week (Monday to Sunday)
        start_of_week = logged_date - timedelta(days=logged_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        week_logs_count = client.schema("haia").table("habit_logs").select("id", count="exact")\
            .eq("habit_id", habit_id)\
            .gte("logged_date", start_of_week.isoformat())\
            .lte("logged_date", end_of_week.isoformat())\
            .execute().count or 0
            
        # If we just hit the target exactly, we increment the streak
        if week_logs_count == target:
            # Check if they hit it last week
            if last_date and last_date >= start_of_week - timedelta(days=7):
                # Consecutive week
                new_current = streak["current_streak"] + 1
            else:
                # Started a new weekly streak
                new_current = 1
                
            new_longest = max(streak["longest_streak"], new_current)
            client.schema("haia").table("streaks").update({
                "current_streak": new_current,
                "longest_streak": new_longest,
                "last_activity_date": start_of_week.isoformat()
            }).eq("id", streak["id"]).execute()
        return
        
    # --- Regular daily streak logic ---
    if last_date == logged_date:
        # Already logged today — idempotent, nothing to update
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
        # Streak broken — reset to 1
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
