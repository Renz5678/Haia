from fastapi import APIRouter, Depends, status

from core.dependencies import get_current_user
from goals import service
from goals.schemas import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/", response_model=list[GoalResponse])
def list_goals(goal_status: str | None = None, user: dict = Depends(get_current_user)):
    return service.list_goals(user_id=user["id"], status=goal_status)


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(data: GoalCreate, user: dict = Depends(get_current_user)):
    return service.create_goal(user_id=user["id"], data=data)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: str, data: GoalUpdate, user: dict = Depends(get_current_user)):
    return service.update_goal(user_id=user["id"], goal_id=goal_id, data=data)


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(goal_id: str, user: dict = Depends(get_current_user)):
    from fastapi import HTTPException
    goal = service.get_goal(user_id=user["id"], goal_id=goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    service.delete_goal(user_id=user["id"], goal_id=goal_id)


@router.get("/{goal_id}/progress")
def get_goal_progress(goal_id: str, user: dict = Depends(get_current_user)):
    return service.get_goal_progress(user_id=user["id"], goal_id=goal_id)
