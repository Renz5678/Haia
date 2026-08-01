"""
Task business logic.
All DB access uses the service-role Supabase client (bypasses RLS).
Authentication is enforced at the router layer via get_current_user.
"""
from core.supabase import get_supabase_service_client

from tasks.schemas import TaskCreate, TaskUpdate


def _xp_for_task(task_type: str, priority: str) -> int:
    """Compute XP value at creation time based on task type and priority."""
    base = {"task": 10, "assignment": 20, "deadline": 15, "exam": 50, "project": 40, "quiz": 25, "lab": 30}
    multiplier = {"low": 0.75, "medium": 1.0, "high": 1.5, "critical": 2.0}
    return int(base.get(task_type, 10) * multiplier.get(priority, 1.0))


def create_task(user_id: str, data: TaskCreate) -> dict:
    client = get_supabase_service_client()
    xp = _xp_for_task(data.task_type, data.priority)
    payload = {
        **data.model_dump(exclude={"goal_ids"}),
        "user_id": user_id,
        "xp_value": xp,
        "subject_id": str(data.subject_id) if data.subject_id else None,
        "course_id": str(data.course_id) if data.course_id else None,
        "due_date": data.due_date.isoformat() if data.due_date else None,
    }
    response = client.schema("haia").table("tasks").insert(payload).execute()
    task = response.data[0]

    # Link to goals (task_goals junction)
    if data.goal_ids:
        links = [{"task_id": task["id"], "goal_id": str(gid)} for gid in data.goal_ids]
        client.schema("haia").table("task_goals").insert(links).execute()
        
    from integrations.gcal import sync_task_to_gcal
    sync_task_to_gcal(user_id, task)

    return task


def list_tasks(user_id: str, status: str | None = None, area: str | None = None) -> list[dict]:
    client = get_supabase_service_client()
    query = client.schema("haia").table("tasks").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    tasks = query.order("due_date", desc=False).execute().data

    if not tasks:
        return []
    
    task_ids = [t["id"] for t in tasks]
    tg_response = client.schema("haia").table("task_goals").select("task_id, goal_id").in_("task_id", task_ids).execute()
    
    goal_map = {}
    for tg in tg_response.data:
        goal_map.setdefault(tg["task_id"], []).append(tg["goal_id"])
        
    for t in tasks:
        t["goal_ids"] = goal_map.get(t["id"], [])
        
    return tasks


def get_task(user_id: str, task_id: str) -> dict | None:
    client = get_supabase_service_client()
    result = (
        client.schema("haia").table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def update_task(user_id: str, task_id: str, data: TaskUpdate) -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    result = (
        client.schema("haia").table("tasks")
        .update(payload)
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    task = result.data[0]
    
    from integrations.gcal import sync_task_to_gcal
    sync_task_to_gcal(user_id, task)
    
    return task


def complete_task(user_id: str, task_id: str) -> dict:
    """Mark a task complete and trigger XP award via gamification service."""
    from datetime import datetime, timezone

    from gamification.service import award_xp_for_task

    client = get_supabase_service_client()
    now = datetime.now(timezone.utc).isoformat()
    result = (
        client.schema("haia").table("tasks")
        .update({"status": "completed", "completed_at": now})
        .eq("id", task_id)
        .eq("user_id", user_id)
        .execute()
    )
    task = result.data[0]
    award_xp_for_task(user_id=user_id, task=task)
    
    from integrations.gcal import sync_task_to_gcal
    sync_task_to_gcal(user_id, task)
    
    return task


def delete_task(user_id: str, task_id: str) -> None:
    task = get_task(user_id, task_id)
    
    client = get_supabase_service_client()
    client.schema("haia").table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
    
    if task and task.get("calendar_event_id"):
        from integrations.gcal import delete_task_from_gcal
        delete_task_from_gcal(user_id, task["calendar_event_id"])
