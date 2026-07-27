from fastapi import APIRouter, Depends, status
from core.dependencies import get_current_user
from subjects.schemas import SubjectCreate, SubjectUpdate, SubjectResponse
from subjects import service

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/", response_model=list[SubjectResponse])
def list_subjects(area: str | None = None, user: dict = Depends(get_current_user)):
    return service.list_subjects(user_id=user["id"], area=area)


@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, user: dict = Depends(get_current_user)):
    return service.create_subject(user_id=user["id"], data=data)


@router.patch("/{subject_id}", response_model=SubjectResponse)
def update_subject(subject_id: str, data: SubjectUpdate, user: dict = Depends(get_current_user)):
    return service.update_subject(user_id=user["id"], subject_id=subject_id, data=data)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: str, user: dict = Depends(get_current_user)):
    service.delete_subject(user_id=user["id"], subject_id=subject_id)
