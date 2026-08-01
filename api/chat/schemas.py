from datetime import datetime

from pydantic import UUID4, BaseModel


class ChatMessageCreate(BaseModel):
    content: str
    channel: str = "web"  # web | telegram


class ChatMessageResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    role: str
    content: str
    channel: str
    intent: str | None = None
    linked_item_type: str | None = None
    linked_item_id: UUID4 | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
