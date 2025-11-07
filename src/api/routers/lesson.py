"""Lesson API endpoints."""
import logging
from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import LessonGetResponse, LessonOptionsResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lesson", tags=["lesson"])


@router.get("/get", response_model=LessonGetResponse, status_code=200)
async def lesson_get(lesson_id: str = Query(..., description="Lesson ID")):
    """Fetch lesson dialogues and metadata.
    
    Args:
        lesson_id: Lesson identifier
        
    Returns:
        Lesson data with dialogues and metadata
    """
    try:
        lesson_manager = app_context.tutor.lesson_manager
        lesson_data = lesson_manager.get_lesson(lesson_id)
        
        if not lesson_data:
            raise HTTPException(
                status_code=404,
                detail=f"Lesson not found: {lesson_id}"
            )
        
        return {
            "status": "success",
            "message": f"Lesson '{lesson_id}' retrieved successfully",
            "data": lesson_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in lesson_get: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.get("/options", response_model=LessonOptionsResponse, status_code=200)
async def lesson_options(
    lesson_id: str = Query(..., description="Lesson ID"),
    dialogue_id: str = Query(..., description="Dialogue ID")
):
    """Retrieve branch options for current dialog node.
    
    Args:
        lesson_id: Lesson identifier
        dialogue_id: Current dialogue identifier
        
    Returns:
        Branch options for the current dialogue
    """
    try:
        lesson_manager = app_context.tutor.lesson_manager
        lesson_data = lesson_manager.get_lesson(lesson_id)
        
        if not lesson_data:
            raise HTTPException(
                status_code=404,
                detail=f"Lesson not found: {lesson_id}"
            )
        
        # Find dialogue
        dialogue = None
        for d in lesson_data.get("dialogues", []):
            if d.get("id") == dialogue_id:
                dialogue = d
                break
        
        if not dialogue:
            raise HTTPException(
                status_code=404,
                detail=f"Dialogue not found: {dialogue_id}"
            )
        
        # Extract options
        options = dialogue.get("options", [])
        
        return {
            "status": "success",
            "message": f"Options for dialogue '{dialogue_id}' retrieved successfully",
            "data": {
                "dialogue_id": dialogue_id,
                "options": options
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in lesson_options: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

