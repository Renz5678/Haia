import os

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


def delete_user_account(user_id: str) -> None:
    """Hard-delete all user data across every table, then delete the Supabase auth user.
    Uses the service-role key — never called from the browser directly.
    """
    client = get_supabase_service_client()

    # Delete in dependency order (FK constraints)
    TABLES_IN_ORDER = [
        "chat_messages", "xp_events", "habit_logs", "streaks",
        "tasks", "habits", "goals", "courses", "subjects",
        "integrations", "users",
    ]
    for table in TABLES_IN_ORDER:
        try:
            client.schema("haia").table(table).delete().eq("user_id", user_id).execute()
        except Exception:
            # Best-effort — some tables may not have user_id or may already be empty
            pass

    # Finally delete the Supabase Auth user via the admin API
    import httpx
    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if supabase_url and service_role_key:
        httpx.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
            timeout=10,
        )

