from datetime import datetime

from pydantic import UUID4, BaseModel


class UserUpdate(BaseModel):
    display_name: str | None = None
    timezone: str | None = None
    theme: str | None = None

class UserResponse(BaseModel):
    id: UUID4
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    timezone: str
    current_level: int
    total_xp: int
    theme: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
