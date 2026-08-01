from functools import lru_cache

from core.config import get_settings
from supabase import Client, create_client


@lru_cache
def get_supabase_service_client() -> Client:
    """
    Service-role client — bypasses RLS.
    Use ONLY in backend logic (gamification, streak resets, Telegram webhook).
    Never expose to the browser.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_anon_client() -> Client:
    """
    Anon-key client — respects RLS.
    Use when acting on behalf of an authenticated user with their JWT.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)
