from core.dependencies import get_current_user
from fastapi import APIRouter, Depends, status

from habits import service
from habits.schemas import (
    HabitCreate,
    HabitLogCreate,
    HabitLogResponse,
    HabitResponse,
)

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("/", response_model=list[HabitResponse])
def list_habits(active_only: bool = True, user: dict = Depends(get_current_user)):
    return service.list_habits(user_id=user["id"], active_only=active_only)


@router.post("/", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
def create_habit(data: HabitCreate, user: dict = Depends(get_current_user)):
    return service.create_habit(user_id=user["id"], data=data)


@router.post("/{habit_id}/log", response_model=HabitLogResponse, status_code=status.HTTP_201_CREATED)
def log_habit(habit_id: str, data: HabitLogCreate, user: dict = Depends(get_current_user)):
    return service.log_habit(user_id=user["id"], habit_id=habit_id, data=data)


@router.get("/{habit_id}/logs", response_model=list[HabitLogResponse])
def get_logs(habit_id: str, limit: int = 90, user: dict = Depends(get_current_user)):
    return service.get_habit_logs(user_id=user["id"], habit_id=habit_id, limit=limit)
