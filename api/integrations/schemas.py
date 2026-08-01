from datetime import datetime

from pydantic import UUID4, BaseModel


class IntegrationResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    service: str
    external_id: str | None
    email_address: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
