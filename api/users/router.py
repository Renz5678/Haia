from core.dependencies import get_current_user
from fastapi import APIRouter, Depends, status
from users import service
from users.schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(data: UserUpdate, user: dict = Depends(get_current_user)):
    return service.update_user_profile(user_id=user["id"], data=data)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(user: dict = Depends(get_current_user)):
    """Hard-delete all user data and their Supabase auth account.
    Irreversible — requires the user to be authenticated."""
    service.delete_user_account(user_id=user["id"])

