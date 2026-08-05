from datetime import date, datetime

from pydantic import UUID4, BaseModel, model_validator


class GoalCreate(BaseModel):
    title: str
    description: str | None = None
    goal_type: str = "custom"
    target_value: float | None = None
    target_date: date | None = None
    subject_id: UUID4 | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    target_value: float | None = None
    current_value: float | None = None
    target_date: date | None = None


class GoalResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    title: str
    description: str | None
    goal_type: str
    target_value: float | None
    current_value: float | None
    target_date: date | None
    status: str
    subject_id: UUID4 | None
    created_at: datetime
    updated_at: datetime
    # Computed from current_value / target_value — always 0-100
    progress: float = 0.0

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_progress(self) -> "GoalResponse":
        """Derive progress % from current_value/target_value after model hydration."""
        if self.target_value and self.target_value > 0:
            self.progress = round(
                min(100.0, (self.current_value or 0) / self.target_value * 100), 2
            )
        else:
            # current_value IS the percentage when there's no target_value
            self.progress = float(self.current_value or 0)
        return self
