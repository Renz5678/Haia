from datetime import date, datetime, time

from pydantic import UUID4, BaseModel


class HabitCreate(BaseModel):
    name: str
    description: str | None = None
    frequency: str = "daily"
    custom_days: list[int] | None = None
    target_count: int | None = None
    target_time: time | None = None
    subject_id: UUID4 | None = None
    xp_value: int = 5
    goal_ids: list[UUID4] = []


class HabitUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    frequency: str | None = None
    custom_days: list[int] | None = None
    target_count: int | None = None
    target_time: time | None = None
    is_active: bool | None = None


class HabitResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    name: str
    description: str | None = None
    frequency: str
    custom_days: list[int] | None = None
    target_count: int | None = None
    target_time: time | None = None
    xp_value: int
    is_active: bool
    subject_id: UUID4 | None = None
    created_at: datetime
    updated_at: datetime
    goal_ids: list[UUID4] = []

    model_config = {"from_attributes": True}


class HabitLogCreate(BaseModel):
    logged_date: date
    note: str | None = None


class HabitLogResponse(BaseModel):
    id: UUID4
    habit_id: UUID4
    user_id: UUID4
    logged_date: date
    logged_at: datetime
    note: str | None
    xp_awarded: int

    model_config = {"from_attributes": True}
