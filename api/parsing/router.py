from core.dependencies import get_current_user
from fastapi import APIRouter, Depends, File, UploadFile

from parsing import service
from parsing.schemas import ParsedBulkTasks, ParseTextRequest, ParseTextResponse

router = APIRouter(prefix="/parse", tags=["parsing"])


@router.post("/text", response_model=ParseTextResponse)
def parse_text(request: ParseTextRequest, user: dict = Depends(get_current_user)):
    """
    Convert a freeform text message into a structured task/habit/goal.
    This is the core AI pipeline endpoint — used by the web quick-capture box,
    Telegram bot, and email webhook.
    """
    return service.parse_text(user_id=user["id"], request=request)

@router.post("/photo", response_model=ParseTextResponse)
async def parse_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """
    Extract tasks, habits, or goals from a photo using Gemini Vision.
    """
    return await service.parse_photo(user_id=user["id"], file=file)

@router.post("/voice", response_model=ParseTextResponse)
async def parse_voice(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """
    Transcribe a voice note and parse it into a task, habit, or goal.
    """
    return await service.parse_voice(user_id=user["id"], file=file)

@router.post("/syllabus", response_model=ParsedBulkTasks)
async def parse_syllabus(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """
    Extract multiple tasks from a syllabus document using Gemini long context.
    """
    return await service.parse_syllabus(user_id=user["id"], file=file)
