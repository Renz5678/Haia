from core.dependencies import get_current_user
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from courses import service
from courses.schemas import CourseCreate, CourseResponse, CourseUpdate, ParsedSchedule

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("/", response_model=list[CourseResponse])
def list_courses(semester_id: str | None = None, user: dict = Depends(get_current_user)):
    return service.list_courses(user_id=user["id"], semester_id=semester_id)


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(data: CourseCreate, user: dict = Depends(get_current_user)):
    return service.create_course(user_id=user["id"], data=data)


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, user: dict = Depends(get_current_user)):
    course = service.get_course(user_id=user["id"], course_id=course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(course_id: str, data: CourseUpdate, user: dict = Depends(get_current_user)):
    return service.update_course(user_id=user["id"], course_id=course_id, data=data)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: str, user: dict = Depends(get_current_user)):
    service.delete_course(user_id=user["id"], course_id=course_id)


@router.post("/parse-schedule", response_model=list[CourseResponse], status_code=status.HTTP_201_CREATED)
async def parse_schedule_photo(
    file: UploadFile = File(...),
    semester_id: str | None = None,
    user: dict = Depends(get_current_user),
):
    from gemini_client import parse_image_to_schema
    image_bytes = await file.read()
    parsed_schedule = await parse_image_to_schema(
        file_bytes=image_bytes,
        mime_type=file.content_type,
        prompt_name="parse_schedule",
        schema=ParsedSchedule,
    )
    return service.save_parsed_schedule(user_id=user["id"], parsed=parsed_schedule, semester_id=semester_id)
