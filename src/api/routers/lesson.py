"""Lesson API endpoints."""

import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.api.schemas import (
    LessonCatalogResponse,
    LessonGetResponse,
    LessonOptionsResponse,
)
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lesson", tags=["lesson"])


# Schemas for lesson generation
class LessonGenerateRequest(BaseModel):
    """Request to generate a new lesson."""

    topic: str
    level: str = "A0"
    num_dialogues: int = 5


class LessonGenerateResponse(BaseModel):
    """Response with generated lesson data."""

    status: str
    message: str
    data: dict


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
                status_code=404, detail=f"Lesson not found: {lesson_id}"
            )

        return {
            "status": "success",
            "message": f"Lesson '{lesson_id}' retrieved successfully",
            "data": lesson_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in lesson_get: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/options", response_model=LessonOptionsResponse, status_code=200)
async def lesson_options(
    lesson_id: str = Query(..., description="Lesson ID"),
    dialogue_id: str = Query(..., description="Dialogue ID"),
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
                status_code=404, detail=f"Lesson not found: {lesson_id}"
            )

        # Find dialogue
        dialogue = None
        for d in lesson_data.get("dialogues", []):
            if d.get("id") == dialogue_id:
                dialogue = d
                break

        if not dialogue:
            raise HTTPException(
                status_code=404, detail=f"Dialogue not found: {dialogue_id}"
            )

        # Extract options
        options = dialogue.get("options", [])

        return {
            "status": "success",
            "message": f"Options for dialogue '{dialogue_id}' retrieved successfully",
            "data": {"dialogue_id": dialogue_id, "options": options},
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in lesson_options: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/catalog", response_model=LessonCatalogResponse, status_code=200)
async def lesson_catalog():
    """Retrieve flattened lesson catalog metadata."""
    try:
        lesson_manager = app_context.tutor.lesson_manager
        catalog_entries = lesson_manager.load_lesson_catalog()

        return {
            "status": "success",
            "message": f"Retrieved {len(catalog_entries)} lesson catalog entries",
            "data": {"entries": catalog_entries},
        }

    except Exception as e:
        logger.error(f"Error in lesson_catalog: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/generate", response_model=LessonGenerateResponse, status_code=200)
async def lesson_generate(request: LessonGenerateRequest):
    """Generate a custom lesson on-demand using AI.

    Args:
        request: Lesson generation request with topic, level, num_dialogues

    Returns:
        Generated lesson data
    """
    try:
        lesson_generator = app_context.tutor.lesson_generator

        # Check if lesson generation is available
        if not lesson_generator.can_generate():
            raise HTTPException(
                status_code=503,
                detail="AI lesson generation not available. Please check OpenAI API key.",
            )

        # Generate lesson
        logger.info(
            f"🎓 Generating lesson: topic='{request.topic}', level={request.level}, dialogues={request.num_dialogues}"
        )

        lesson_data = lesson_generator.generate_lesson(
            topic=request.topic,
            level=request.level,
            num_dialogues=request.num_dialogues,
        )

        if not lesson_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate lesson. AI returned no data.",
            )

        # Cache the generated lesson so it can be retrieved later
        lesson_manager = app_context.tutor.lesson_manager
        lesson_id = lesson_data.get("id")
        if lesson_id:
            lesson_manager.cache_lesson(lesson_id, lesson_data)
            logger.info(f"✅ Lesson '{lesson_id}' generated and cached successfully")

        return {
            "status": "success",
            "message": f"Lesson about '{request.topic}' generated successfully",
            "data": lesson_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in lesson_generate: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
