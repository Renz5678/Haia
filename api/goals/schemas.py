from pydantic import BaseModel, UUID4
from datetime import datetime, date
from typing import Optional


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    goal_type: str = "custom"
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    subject_id: Optional[UUID4] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    target_date: Optional[date] = None


class GoalResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    title: str
    description: Optional[str]
    goal_type: str
    target_value: Optional[float]
    current_value: Optional[float]
    target_date: Optional[date]
    status: str
    subject_id: Optional[UUID4]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
