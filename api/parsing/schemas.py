
from pydantic import BaseModel


class ParseTextRequest(BaseModel):
    raw_input: str
    channel: str = "typed"  # typed | telegram | email | voice
    context: dict = {}      # Optional context (e.g. user's active subjects)


class IntentClassification(BaseModel):
    intent: str


class ParsedHabit(BaseModel):
    name: str
    frequency: str
    custom_days: list[int] | None = None
    target_time: str | None = None
    description: str | None = None


class ParsedGoal(BaseModel):
    title: str
    description: str | None = None
    area: str
    target_date: str | None = None


class ParseTextResponse(BaseModel):
    intent: str
    parsed_type: str        # task | habit | goal | unknown
    confidence: str         # high | medium | low
    data: dict              # The parsed structured item
    saved_id: str | None = None  # ID of the saved row, if auto-saved
