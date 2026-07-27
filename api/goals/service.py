from core.supabase import get_supabase_service_client
from goals.schemas import GoalCreate, GoalUpdate


def create_goal(user_id: str, data: GoalCreate) -> dict:
    client = get_supabase_service_client()
    payload = {
        **data.model_dump(),
        "user_id": user_id,
        "subject_id": str(data.subject_id) if data.subject_id else None,
        "target_date": data.target_date.isoformat() if data.target_date else None,
    }
    response = client.schema("haia").table("goals").insert(payload).execute()
    goal = response.data[0]

    # TODO(phase-6): generate and store Gemini embedding for semantic matching

    return goal


def list_goals(user_id: str, status: str | None = None) -> list[dict]:
    client = get_supabase_service_client()
    query = client.schema("haia").table("goals").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data


def update_goal(user_id: str, goal_id: str, data: GoalUpdate) -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = (
        client.schema("haia").table("goals")
        .update(payload)
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


def get_goal(user_id: str, goal_id: str) -> dict | None:
    client = get_supabase_service_client()
    result = (
        client.schema("haia").table("goals")
        .select("*")
        .eq("id", goal_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def delete_goal(user_id: str, goal_id: str) -> None:
    client = get_supabase_service_client()
    client.schema("haia").table("goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()


def get_goal_progress(user_id: str, goal_id: str) -> dict:
    client = get_supabase_service_client()
    # Count linked tasks
    task_links = client.schema("haia").table("task_goals").select("task_id").eq("goal_id", goal_id).execute().data
    if not task_links:
        return {"progress_pct": 0.0}

    task_ids = [link["task_id"] for link in task_links]
    
    # Get status of these tasks
    tasks = client.schema("haia").table("tasks").select("status").in_("id", task_ids).eq("user_id", user_id).execute().data
    
    total = len(tasks)
    if total == 0:
        return {"progress_pct": 0.0}
        
    completed = sum(1 for t in tasks if t["status"] == "completed")
    return {"progress_pct": round((completed / total) * 100, 2)}
