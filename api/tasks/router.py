from fastapi import APIRouter, Depends, HTTPException, status
from core.dependencies import get_current_user
from tasks import service
from tasks.schemas import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskResponse])
def list_tasks(
    task_status: str | None = None,
    area: str | None = None,
    user: dict = Depends(get_current_user),
):
    return service.list_tasks(user_id=user["id"], status=task_status, area=area)


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    return service.create_task(user_id=user["id"], data=data)


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = service.get_task(user_id=user["id"], task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    return service.update_task(user_id=user["id"], task_id=task_id, data=data)


@router.post("/{task_id}/complete", response_model=TaskResponse)
def complete_task(task_id: str, user: dict = Depends(get_current_user)):
    return service.complete_task(user_id=user["id"], task_id=task_id)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    service.delete_task(user_id=user["id"], task_id=task_id)
