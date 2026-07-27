from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional


class XPEventResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    xp_amount: int
    source_type: str
    source_id: Optional[UUID4]
    reason: str
    earned_at: datetime

    model_config = {"from_attributes": True}


class StreakResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    habit_id: Optional[UUID4]
    streak_type: str
    category: Optional[str]
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[str]

    model_config = {"from_attributes": True}


class UserStatsResponse(BaseModel):
    user_id: UUID4
    total_xp: int
    current_level: int
    xp_to_next_level: int
    longest_streak: int
    tasks_completed: int
