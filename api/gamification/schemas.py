from datetime import datetime

from pydantic import UUID4, BaseModel


class XPEventResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    xp_amount: int
    source_type: str
    source_id: UUID4 | None
    reason: str
    earned_at: datetime

    model_config = {"from_attributes": True}


class StreakResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    habit_id: UUID4 | None
    streak_type: str
    category: str | None
    current_streak: int
    longest_streak: int
    last_activity_date: str | None

    model_config = {"from_attributes": True}


class UserStatsResponse(BaseModel):
    user_id: UUID4
    total_xp: int
    current_level: int
    xp_to_next_level: int
    xp_for_next_level: int
    longest_streak: int
    current_streak: int
    today_xp: int
    tasks_completed: int
    habits_completed: int
