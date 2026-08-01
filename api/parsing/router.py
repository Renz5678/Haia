from fastapi import APIRouter, Depends

from core.dependencies import get_current_user
from parsing import service
from parsing.schemas import ParseTextRequest, ParseTextResponse

router = APIRouter(prefix="/parse", tags=["parsing"])


@router.post("/text", response_model=ParseTextResponse)
def parse_text(request: ParseTextRequest, user: dict = Depends(get_current_user)):
    """
    Convert a freeform text message into a structured task/habit/goal.
    This is the core AI pipeline endpoint — used by the web quick-capture box,
    Telegram bot, and email webhook.
    """
    return service.parse_text(user_id=user["id"], request=request)
