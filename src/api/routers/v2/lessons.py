"""Phase B: Next-phrase endpoint (stub)."""

from fastapi import APIRouter
from src.schemas.v2.lessons import LessonNextResponse

router = APIRouter()  # <== MUST BE EMPTY

@router.get("/{lesson_id}/next", response_model=LessonNextResponse)
async def get_next_phrase(lesson_id: str):
    return LessonNextResponse(
        lesson_id=lesson_id,
        current_index=1,
        total=5,
        tutor_phrase="Mock phrase",
        expected_phrases=["Mock expected"]
    )
