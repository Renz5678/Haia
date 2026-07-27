from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from core.supabase import get_supabase_anon_client, get_supabase_service_client
from core.config import get_settings
from typing import Optional, Any

bearer_scheme = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[dict[str, Any]]:
    """
    Returns the user dictionary if a valid token is provided, otherwise None.
    """
    if not credentials:
        return None

    token = credentials.credentials
    client: Client = get_supabase_anon_client()
    try:
        response = client.auth.get_user(token)
        if not response.user:
            return None
        
        user_id = response.user.id
        
        # Fetch the full profile from the DB using the service client to bypass RLS issues 
        # during first-time signup if RLS policies are strict. 
        # Actually, anon client should be able to read their own profile if RLS is setup right,
        # but for auth middleware it's safer to use the anon client for validation, then fetch 
        # from haia.users using service role if needed, or just let RLS handle it.
        # RLS in 001_initial_schema.sql allows users to select their own row.
        db_resp = client.schema("haia").table("users").select("*").eq("id", user_id).execute()
        
        if not db_resp.data:
            # User exists in Auth but not in public.users yet (trigger might have failed or delayed)
            # We return basic info
            return {
                "id": user_id,
                "email": response.user.email,
                "display_name": response.user.user_metadata.get("full_name", response.user.email),
                "timezone": "Asia/Manila",
                "current_level": 1,
                "total_xp": 0
            }
            
        return db_resp.data[0]
        
    except Exception as e:
        return None


async def get_current_user(
    user: Optional[dict[str, Any]] = Depends(get_optional_user),
) -> dict[str, Any]:
    """
    FastAPI dependency that validates the Supabase JWT from the Authorization header
    and returns the authenticated user's data from haia.users.

    Raises 401 if missing or invalid.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or missing token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
