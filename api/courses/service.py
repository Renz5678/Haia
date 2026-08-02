from core.supabase import get_supabase_service_client

from courses.schemas import ParsedSchedule


def list_courses(user_id: str, semester_id: str | None = None) -> list[dict]:
    client = get_supabase_service_client()
    query = client.schema("haia").table("courses").select("*").eq("user_id", user_id)
    if semester_id:
        query = query.eq("semester_id", semester_id)
    return query.order("start_time").execute().data


def save_parsed_schedule(user_id: str, parsed: ParsedSchedule, semester_id: str | None = None) -> list[dict]:
    """Persist courses extracted from a COR/schedule photo."""
    client = get_supabase_service_client()
    rows = []
    for course in parsed.courses:
        payload = {
            **course.model_dump(),
            "user_id": user_id,
            "semester_id": semester_id,
        }
        response = client.schema("haia").table("courses").insert(payload).execute()
        rows.append(response.data[0])

    from integrations.gcal import sync_course_to_gcal
    import asyncio
    
    # We can trigger it asynchronously or just block
    for row in rows:
        try:
            sync_course_to_gcal(user_id, row)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to sync course {row['id']} to GCal: {e}")
            
    return rows


def create_course(user_id: str, data: "CourseCreate") -> dict:
    client = get_supabase_service_client()
    payload = {
        **data.model_dump(),
        "user_id": user_id,
        "start_time": data.start_time.isoformat(),
        "end_time": data.end_time.isoformat(),
        "semester_id": str(data.semester_id) if data.semester_id else None,
        "subject_id": str(data.subject_id) if data.subject_id else None,
    }
    response = client.schema("haia").table("courses").insert(payload).execute()
    return response.data[0]


def get_course(user_id: str, course_id: str) -> dict | None:
    client = get_supabase_service_client()
    result = (
        client.schema("haia").table("courses")
        .select("*")
        .eq("id", course_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return result.data


def update_course(user_id: str, course_id: str, data: "CourseUpdate") -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "start_time" in payload:
        payload["start_time"] = payload["start_time"].isoformat()
    if "end_time" in payload:
        payload["end_time"] = payload["end_time"].isoformat()
    if "semester_id" in payload:
        payload["semester_id"] = str(payload["semester_id"]) if payload["semester_id"] else None
    if "subject_id" in payload:
        payload["subject_id"] = str(payload["subject_id"]) if payload["subject_id"] else None

    result = (
        client.schema("haia").table("courses")
        .update(payload)
        .eq("id", course_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]


def delete_course(user_id: str, course_id: str) -> None:
    client = get_supabase_service_client()
    client.schema("haia").table("courses").delete().eq("id", course_id).eq("user_id", user_id).execute()
