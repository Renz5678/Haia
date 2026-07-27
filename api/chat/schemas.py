from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Optional


class ChatMessageCreate(BaseModel):
    content: str
    channel: str = "web"  # web | telegram


class ChatMessageResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    role: str
    content: str
    channel: str
    intent: Optional[str]
    linked_item_type: Optional[str]
    linked_item_id: Optional[UUID4]
    created_at: datetime

    model_config = {"from_attributes": True}
