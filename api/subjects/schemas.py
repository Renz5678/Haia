from datetime import datetime

from pydantic import UUID4, BaseModel


class SubjectCreate(BaseModel):
    name: str
    color: str | None = None
    icon: str | None = None
    area: str = "personal"
    semester_id: UUID4 | None = None


class SubjectUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    icon: str | None = None
    area: str | None = None
    semester_id: UUID4 | None = None


class SubjectResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    name: str
    color: str | None
    icon: str | None
    area: str
    semester_id: UUID4 | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
