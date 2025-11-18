"""Lesson navigation endpoints for Phase B."""

from fastapi import APIRouter, HTTPException, Query

from src.schemas.v2.lessons import LessonNextResponse
from src.services.lesson_flow import LessonFlowService

router = APIRouter()
_lesson_flow_service = LessonFlowService()


@router.get("/{lesson_id}/next", response_model=LessonNextResponse)
async def get_next_phrase(lesson_id: str, index: int = Query(0, ge=0)) -> LessonNextResponse:
    """Return the tutor phrase at the requested index."""
    try:
        result = _lesson_flow_service.get_next_phrase(lesson_id, index)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown lesson_id") from None
    except IndexError:
        raise HTTPException(status_code=400, detail="index out of range") from None

    return LessonNextResponse(**result)
