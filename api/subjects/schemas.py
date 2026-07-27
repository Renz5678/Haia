from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional


class SubjectCreate(BaseModel):
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    area: str = "personal"
    semester_id: Optional[UUID4] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    area: Optional[str] = None
    semester_id: Optional[UUID4] = None


class SubjectResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    name: str
    color: Optional[str]
    icon: Optional[str]
    area: str
    semester_id: Optional[UUID4]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
