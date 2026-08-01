from datetime import date, datetime

from pydantic import UUID4, BaseModel


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    goal_type: str = "custom"
    target_value: float | None = None
    target_date: date | None = None
    subject_id: UUID4 | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    target_date: date | None = None


class GoalResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    title: str
    description: str | None
    goal_type: str
    target_value: float | None
    current_value: float | None
    target_date: date | None
    status: str
    subject_id: UUID4 | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
