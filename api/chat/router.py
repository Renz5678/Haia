from fastapi import APIRouter, Depends
from core.dependencies import get_current_user
from chat import service
from chat.schemas import ChatMessageCreate, ChatMessageResponse

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/history", response_model=list[ChatMessageResponse])
def get_history(limit: int = 50, user: dict = Depends(get_current_user)):
    return service.get_history(user_id=user["id"], limit=limit)


@router.post("/message", response_model=ChatMessageResponse)
def send_message(data: ChatMessageCreate, user: dict = Depends(get_current_user)):
    return service.process_message(user_id=user["id"], data=data)
