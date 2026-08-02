from datetime import datetime, time
from typing import Literal

from pydantic import UUID4, BaseModel


class CourseCreate(BaseModel):
    code: str
    section: str | None = None
    name: str | None = None
    instructor: str | None = None
    room: str | None = None
    modality: str
    days: list[str]
    start_time: time
    end_time: time
    units: float | None = None
    semester_id: UUID4 | None = None
    subject_id: UUID4 | None = None


class CourseUpdate(BaseModel):
    code: str | None = None
    section: str | None = None
    name: str | None = None
    instructor: str | None = None
    room: str | None = None
    modality: str | None = None
    days: list[str] | None = None
    start_time: time | None = None
    end_time: time | None = None
    units: float | None = None
    semester_id: UUID4 | None = None
    subject_id: UUID4 | None = None
class CourseResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    semester_id: UUID4 | None
    subject_id: UUID4 | None
    code: str
    section: str | None
    name: str | None
    instructor: str | None
    room: str | None
    modality: str
    days: list[str]
    start_time: time
    end_time: time
    units: float | None
    calendar_event_id: str | None
    meet_link: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Schema Gemini must produce when parsing a COR / schedule photo
class ParsedCourse(BaseModel):
    code: str
    section: str | None = None
    name: str | None = None
    instructor: str | None = None
    room: str | None = None
    modality: Literal["in_person", "online", "hybrid"]
    days: list[str]  # e.g. ["Mon", "Wed", "Fri"]
    start_time: time
    end_time: time
    units: float | None = None


class ParsedSchedule(BaseModel):
    courses: list[ParsedCourse]
