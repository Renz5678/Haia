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
            "start_time": course.start_time.strftime("%H:%M:%S"),
            "end_time": course.end_time.strftime("%H:%M:%S"),
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


async def render_and_upload_schedule_png(user_id: str) -> dict:
    """
    Render a styled weekly-grid PNG from the user's courses using Playwright,
    upload it to Supabase Storage (bucket: 'schedules'), and return the public URL.

    Falls back gracefully with an error dict if Playwright is not installed,
    so this never crashes the calling request.
    """
    import logging
    import os
    import tempfile

    _logger = logging.getLogger(__name__)

    try:
        from courses.renderer import render_schedule_png
    except ImportError:
        _logger.warning("Playwright not installed — skipping PNG render. Run: playwright install chromium")
        return {"ok": False, "error": "Playwright not installed on this server."}

    client = get_supabase_service_client()

    # Fetch the user's courses
    courses = (
        client.schema("haia").table("courses")
        .select("*")
        .eq("user_id", user_id)
        .order("start_time")
        .execute().data
    )

    if not courses:
        return {"ok": False, "error": "No courses found. Upload a schedule photo first."}

    # Render the PNG to a temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        output_path = tmp.name

    try:
        await render_schedule_png(courses=courses, output_path=output_path)

        with open(output_path, "rb") as f:
            png_bytes = f.read()
    finally:
        if os.path.exists(output_path):
            os.remove(output_path)

    # Upload to Supabase Storage
    storage_path = f"{user_id}/schedule.png"
    try:
        # upsert=True overwrites any previous render for this user
        client.storage.from_("schedules").upload(
            path=storage_path,
            file=png_bytes,
            file_options={"content-type": "image/png", "upsert": "true"},
        )
    except Exception as e:
        _logger.error("Failed to upload schedule PNG to Supabase Storage: %s", e)
        return {"ok": False, "error": "PNG rendered but upload to storage failed."}

    # Get a long-lived public URL
    public_url = client.storage.from_("schedules").get_public_url(storage_path)

    _logger.info("Schedule PNG rendered and uploaded for user %s: %s", user_id, public_url)
    return {"ok": True, "png_url": public_url}



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
