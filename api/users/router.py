from core.dependencies import get_current_user
from fastapi import APIRouter, Depends
from users import service
from users.schemas import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    # Fallback to the token's basic info if DB fetch fails in dependency
    # But get_current_user already returns the DB profile now.
    return user

@router.patch("/me", response_model=UserResponse)
def update_me(data: UserUpdate, user: dict = Depends(get_current_user)):
    return service.update_user_profile(user_id=user["id"], data=data)
