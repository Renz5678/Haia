from datetime import datetime

from pydantic import UUID4, BaseModel


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    task_type: str = "task"
    priority: str = "medium"
    due_date: datetime | None = None
    subject_id: UUID4 | None = None
    course_id: UUID4 | None = None
    source: str = "typed"
    raw_input: str | None = None
    goal_ids: list[UUID4] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    task_type: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    subject_id: UUID4 | None = None


class TaskResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    title: str
    description: str | None
    task_type: str
    status: str
    priority: str
    due_date: datetime | None
    completed_at: datetime | None
    xp_value: int
    source: str
    subject_id: UUID4 | None
    course_id: UUID4 | None
    calendar_event_id: str | None
    created_at: datetime
    updated_at: datetime
    goal_ids: list[UUID4] = []

    model_config = {"from_attributes": True}


# Schema Gemini must produce when parsing raw text into a task
class ParsedTask(BaseModel):
    title: str
    task_type: str  # task | deadline | assignment | exam | project | quiz | lab
    priority: str   # low | medium | high | critical
    due_date: str | None = None   # ISO 8601 string or null
    subject_hint: str | None = None  # Subject name hint from the raw text
    description: str | None = None
