from core.supabase import get_supabase_service_client

from habits.schemas import HabitCreate, HabitLogCreate, HabitUpdate


def create_habit(user_id: str, data: HabitCreate) -> dict:
    client = get_supabase_service_client()
    payload = {
        **data.model_dump(exclude={"goal_ids", "target_time"}),
        "user_id": user_id,
        "subject_id": str(data.subject_id) if data.subject_id else None,
        "target_time": data.target_time.isoformat() if data.target_time else None,
    }
    response = client.schema("haia").table("habits").insert(payload).execute()
    habit = response.data[0]

    if data.goal_ids:
        links = [{"habit_id": habit["id"], "goal_id": str(gid)} for gid in data.goal_ids]
        client.schema("haia").table("habit_goals").insert(links).execute()

    # Create streak tracking row for this habit
    client.schema("haia").table("streaks").insert({
        "user_id": user_id,
        "habit_id": habit["id"],
        "streak_type": "habit",
    }).execute()

    return habit


def list_habits(user_id: str, active_only: bool = True) -> list[dict]:
    client = get_supabase_service_client()
    query = client.schema("haia").table("habits").select("*").eq("user_id", user_id)
    if active_only:
        query = query.eq("is_active", True)
    habits = query.order("created_at").execute().data

    if not habits:
        return []
        
    habit_ids = [h["id"] for h in habits]
    hg_response = client.schema("haia").table("habit_goals").select("habit_id, goal_id").in_("habit_id", habit_ids).execute()
    
    goal_map = {}
    for hg in hg_response.data:
        goal_map.setdefault(hg["habit_id"], []).append(hg["goal_id"])
        
    for h in habits:
        h["goal_ids"] = goal_map.get(h["id"], [])
        
    return habits


def log_habit(user_id: str, habit_id: str, data: HabitLogCreate) -> dict:
    """Record a habit completion and update streak."""
    from gamification.service import award_xp_for_habit

    client = get_supabase_service_client()

    # Get the habit to find xp_value
    habit = client.schema("haia").table("habits").select("xp_value").eq("id", habit_id).single().execute().data
    xp = habit["xp_value"]

    log_payload = {
        "habit_id": habit_id,
        "user_id": user_id,
        "logged_date": data.logged_date.isoformat(),
        "note": data.note,
        "xp_awarded": xp,
    }
    response = client.schema("haia").table("habit_logs").upsert(log_payload, on_conflict="habit_id,logged_date").execute()
    log = response.data[0]

    award_xp_for_habit(user_id=user_id, habit_id=habit_id, log_id=log["id"], xp=xp, logged_date=data.logged_date)

    return log


def get_habit_logs(user_id: str, habit_id: str, limit: int = 90) -> list[dict]:
    client = get_supabase_service_client()
    return (
        client.schema("haia").table("habit_logs")
        .select("*")
        .eq("habit_id", habit_id)
        .eq("user_id", user_id)
        .order("logged_date", desc=True)
        .limit(limit)
        .execute().data
    )

def update_habit(user_id: str, habit_id: str, data: HabitUpdate) -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Exclude goal_ids from payload if present (though it's not in HabitUpdate schema yet, good to be safe)
    if "goal_ids" in payload:
        del payload["goal_ids"]

    # Format time if present
    if "target_time" in payload and payload["target_time"] is not None:
        payload["target_time"] = payload["target_time"].isoformat()

    result = (
        client.schema("haia").table("habits")
        .update(payload)
        .eq("id", habit_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]
