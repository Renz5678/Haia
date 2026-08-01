from core.supabase import get_supabase_service_client
from users.schemas import UserUpdate


def get_user_profile(user_id: str) -> dict:
    client = get_supabase_service_client()
    result = client.schema("haia").table("users").select("*").eq("id", user_id).single().execute()
    return result.data

def update_user_profile(user_id: str, data: UserUpdate) -> dict:
    client = get_supabase_service_client()
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not payload:
        return get_user_profile(user_id)
        
    result = (
        client.schema("haia").table("users")
        .update(payload)
        .eq("id", user_id)
        .execute()
    )
    return result.data[0]
