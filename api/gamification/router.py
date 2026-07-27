from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from gamification import service
from gamification.schemas import XPEventResponse, StreakResponse, UserStatsResponse

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/stats", response_model=UserStatsResponse)
def get_stats(user: dict = Depends(get_current_user)):
    """Full XP/level/streak snapshot — used by Home tab and AI chat context."""
    return service.get_user_stats(user_id=user["id"])


@router.get("/xp-events", response_model=list[XPEventResponse])
def list_xp_events(limit: int = 50, user: dict = Depends(get_current_user)):
    from core.supabase import get_supabase_service_client
    client = get_supabase_service_client()
    return (
        client.schema("haia").table("xp_events")
        .select("*")
        .eq("user_id", user["id"])
        .order("earned_at", desc=True)
        .limit(limit)
        .execute().data
    )


@router.get("/streaks", response_model=list[StreakResponse])
def list_streaks(user: dict = Depends(get_current_user)):
    from core.supabase import get_supabase_service_client
    client = get_supabase_service_client()
    return client.schema("haia").table("streaks").select("*").eq("user_id", user["id"]).execute().data
