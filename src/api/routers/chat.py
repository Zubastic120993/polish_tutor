"""Chat API endpoints."""

import logging
from fastapi import APIRouter, HTTPException

from src.api.schemas import ChatRespondRequest, ChatRespondResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/respond", response_model=ChatRespondResponse, status_code=200)
async def chat_respond(request: ChatRespondRequest):
    """Process user message and return tutor response.

    Args:
        request: Chat request with user_id, text, lesson_id, dialogue_id, etc.

    Returns:
        Chat response with tutor reply, score, feedback, and audio URLs
    """
    try:
        tutor = app_context.tutor

        # Call Tutor.respond() method
        response = tutor.respond(
            user_id=request.user_id,
            text=request.text,
            lesson_id=request.lesson_id,
            dialogue_id=request.dialogue_id,
            speed=request.speed or 1.0,
            confidence=request.confidence,
        )

        # Tutor.respond() already returns the correct format
        # Check if it's an error response
        if response.get("status") == "error":
            raise HTTPException(
                status_code=400, detail=response.get("message", "Invalid request")
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in chat_respond: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
