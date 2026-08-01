from core.supabase import get_supabase_service_client

from subjects.schemas import SubjectCreate, SubjectUpdate


def create_subject(user_id: str, data: SubjectCreate) -> dict:
    client = get_supabase_service_client()
    payload = {
        **data.model_dump(),
        "user_id": user_id,
        "semester_id": str(data.semester_id) if data.semester_id else None,
    }
    return client.schema("haia").table("subjects").insert(payload).execute().data[0]

def list_subjects(user_id: str, area: str | None = None) -> list[dict]:
    client = get_supabase_service_client()
    query = client.schema("haia").table("subjects").select("*").eq("user_id", user_id)
    if area:
        query = query.eq("area", area)
    return query.order("name").execute().data

def update_subject(user_id: str, subject_id: str, data: SubjectUpdate) -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "semester_id" in payload:
        payload["semester_id"] = str(payload["semester_id"]) if payload["semester_id"] else None

    result = (
        client.schema("haia").table("subjects")
        .update(payload)
        .eq("id", subject_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0]

def delete_subject(user_id: str, subject_id: str) -> None:
    client = get_supabase_service_client()
    client.schema("haia").table("subjects").delete().eq("id", subject_id).eq("user_id", user_id).execute()
