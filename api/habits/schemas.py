from pydantic import BaseModel, UUID4
from datetime import datetime, date, time
from typing import Optional


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"
    custom_days: Optional[list[int]] = None
    target_time: Optional[time] = None
    subject_id: Optional[UUID4] = None
    xp_value: int = 5
    goal_ids: list[UUID4] = []


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[str] = None
    custom_days: Optional[list[int]] = None
    target_time: Optional[time] = None
    is_active: Optional[bool] = None


class HabitResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    name: str
    description: Optional[str]
    frequency: str
    custom_days: Optional[list[int]]
    target_time: Optional[time]
    xp_value: int
    is_active: bool
    subject_id: Optional[UUID4]
    created_at: datetime
    updated_at: datetime
    goal_ids: list[UUID4] = []

    model_config = {"from_attributes": True}


class HabitLogCreate(BaseModel):
    logged_date: date
    note: Optional[str] = None


class HabitLogResponse(BaseModel):
    id: UUID4
    habit_id: UUID4
    user_id: UUID4
    logged_date: date
    logged_at: datetime
    note: Optional[str]
    xp_awarded: int

    model_config = {"from_attributes": True}
