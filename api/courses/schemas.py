from pydantic import BaseModel, UUID4
from datetime import datetime, time
from typing import Optional

class CourseCreate(BaseModel):
    code: str
    section: Optional[str] = None
    name: Optional[str] = None
    instructor: Optional[str] = None
    room: Optional[str] = None
    modality: str
    days: list[str]
    start_time: time
    end_time: time
    units: Optional[float] = None
    semester_id: Optional[UUID4] = None
    subject_id: Optional[UUID4] = None


class CourseUpdate(BaseModel):
    code: Optional[str] = None
    section: Optional[str] = None
    name: Optional[str] = None
    instructor: Optional[str] = None
    room: Optional[str] = None
    modality: Optional[str] = None
    days: Optional[list[str]] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    units: Optional[float] = None
    semester_id: Optional[UUID4] = None
    subject_id: Optional[UUID4] = None
class CourseResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    semester_id: Optional[UUID4]
    subject_id: Optional[UUID4]
    code: str
    section: Optional[str]
    name: Optional[str]
    instructor: Optional[str]
    room: Optional[str]
    modality: str
    days: list[str]
    start_time: time
    end_time: time
    units: Optional[float]
    calendar_event_id: Optional[str]
    meet_link: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Schema Gemini must produce when parsing a COR / schedule photo
class ParsedCourse(BaseModel):
    code: str
    section: Optional[str] = None
    name: Optional[str] = None
    instructor: Optional[str] = None
    room: Optional[str] = None
    modality: str  # in_person | online | hybrid
    days: list[str]  # e.g. ["Mon", "Wed", "Fri"]
    start_time: str  # HH:MM 24h
    end_time: str    # HH:MM 24h
    units: Optional[float] = None


class ParsedSchedule(BaseModel):
    courses: list[ParsedCourse]
