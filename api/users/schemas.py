from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    timezone: Optional[str] = None
    theme: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID4
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    timezone: str
    current_level: int
    total_xp: int
    theme: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
