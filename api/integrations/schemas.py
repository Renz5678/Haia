from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional


class IntegrationResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    service: str
    external_id: Optional[str]
    email_address: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
