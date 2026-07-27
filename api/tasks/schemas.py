from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = "task"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    subject_id: Optional[UUID4] = None
    course_id: Optional[UUID4] = None
    source: str = "typed"
    raw_input: Optional[str] = None
    goal_ids: list[UUID4] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    subject_id: Optional[UUID4] = None


class TaskResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    title: str
    description: Optional[str]
    task_type: str
    status: str
    priority: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    xp_value: int
    source: str
    subject_id: Optional[UUID4]
    course_id: Optional[UUID4]
    calendar_event_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Schema Gemini must produce when parsing raw text into a task
class ParsedTask(BaseModel):
    title: str
    task_type: str  # task | deadline | assignment | exam | project | quiz | lab
    priority: str   # low | medium | high | critical
    due_date: Optional[str] = None   # ISO 8601 string or null
    subject_hint: Optional[str] = None  # Subject name hint from the raw text
    description: Optional[str] = None
