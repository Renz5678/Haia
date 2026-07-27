from pydantic import BaseModel
from typing import Optional


class ParseTextRequest(BaseModel):
    raw_input: str
    channel: str = "typed"  # typed | telegram | email | voice
    context: dict = {}      # Optional context (e.g. user's active subjects)


class IntentClassification(BaseModel):
    intent: str


class ParsedHabit(BaseModel):
    name: str
    frequency: str
    custom_days: Optional[list[int]] = None
    target_time: Optional[str] = None
    description: Optional[str] = None


class ParsedGoal(BaseModel):
    title: str
    description: Optional[str] = None
    area: str
    target_date: Optional[str] = None


class ParseTextResponse(BaseModel):
    intent: str
    parsed_type: str        # task | habit | goal | unknown
    confidence: str         # high | medium | low
    data: dict              # The parsed structured item
    saved_id: Optional[str] = None  # ID of the saved row, if auto-saved
