"""Review API endpoints."""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from fastapi import APIRouter, Body, HTTPException, Query

from src.api.schemas import (
    ReviewGetResponse,
    ReviewUpdateRequest,
    ReviewUpdateResponse,
)
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/get", response_model=ReviewGetResponse, status_code=200)
@router.get("/due", response_model=ReviewGetResponse, status_code=200)
async def review_get_due(user_id: int = Query(..., description="User ID", gt=0)):
    """Return due review items for the user."""
    try:
        tutor = app_context.tutor
        database = app_context.database

        # Try SRS manager first, fall back to direct database query in tests/offline mode
        due_memories: Iterable[Any] = []
        srs_manager = getattr(tutor, "srs_manager", None)
        if srs_manager and hasattr(srs_manager, "get_due_items"):
            try:
                due_memories = srs_manager.get_due_items(user_id, database=database)
            except TypeError:
                due_memories = srs_manager.get_due_items(user_id)
        elif hasattr(database, "get_due_srs_items"):
            due_memories = database.get_due_srs_items(user_id)
        else:
            due_memories = []

        if not due_memories:
            return {
                "status": "success",
                "message": "No due items found.",
                "data": [],
                "metadata": {
                    "due_count": 0,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }

        # Format response with phrase details from lesson files
        # Extract attributes from ORM objects while session is accessible
        review_list: List[Dict[str, Any]] = []
        for memory in due_memories:
            # Extract all attributes before session closes
            phrase_id = _get_attr(memory, "phrase_id")
            user_id_value = _get_attr(memory, "user_id") or user_id
            next_review = _get_attr(memory, "next_review")
            efactor = _get_attr(memory, "efactor")
            interval_days = _get_attr(memory, "interval_days")
            review_count = _get_attr(memory, "review_count")
            strength_level = _get_attr(memory, "strength_level")

            if not phrase_id:
                continue

            # Get phrase details from lesson
            lesson_id = None
            phrase_text = None
            translation = None
            audio = None

            # Try to get phrase from database first
            phrase = (
                database.get_phrase(phrase_id)
                if hasattr(database, "get_phrase")
                else None
            )
            if phrase:
                lesson_id = getattr(phrase, "lesson_id", None)
                phrase_text = getattr(phrase, "text", None)

            # If lesson_id not found from database, extract from phrase_id (format: L1_turn1)
            if not lesson_id:
                parts = phrase_id.split("_", 1)
                if len(parts) >= 1:
                    lesson_id = parts[0]

            # Get phrase details from lesson file if lesson_id is known
            if lesson_id:
                lesson_data = tutor.lesson_manager.get_lesson(lesson_id)
                if lesson_data and "dialogues" in lesson_data:
                    # Find the dialogue matching this phrase_id
                    for dialogue in lesson_data["dialogues"]:
                        if dialogue.get("id") == phrase_id:
                            # Prefer tutor line but fall back to expected responses
                            lesson_phrase_text = dialogue.get("tutor") or (
                                dialogue.get("expected", [None])[0]
                                if dialogue.get("expected")
                                else None
                            )
                            phrase_text = lesson_phrase_text or phrase_text
                            translation = dialogue.get("translation") or translation
                            audio = dialogue.get("audio") or audio
                            break

            # Build review item dict
            review_item = {
                "phrase_id": phrase_id,
                "user_id": user_id_value,
                "next_review": _serialize_datetime(next_review),
                "efactor": efactor,
                "interval_days": interval_days,
                "review_count": review_count,
                "strength_level": strength_level,
            }

            # Add phrase details if available
            if phrase_text:
                review_item["phrase_text"] = phrase_text
            if translation:
                review_item["translation"] = translation
            if audio:
                review_item["audio"] = audio
            if lesson_id:
                review_item["lesson_id"] = lesson_id

            review_list.append(review_item)

        metadata = {
            "due_count": len(review_list),
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        logger.info(f"🧠 Found {len(review_list)} due SRS items for user {user_id}")

        return {
            "status": "success",
            "message": f"{len(review_list)} due review items found.",
            "data": review_list,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(
            f"Error retrieving due review items for user {user_id}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/update", response_model=ReviewUpdateResponse, status_code=200)
async def review_update(request: ReviewUpdateRequest = Body(...)):
    """Update SRS memory after review submission."""
    try:
        tutor = app_context.tutor
        database = app_context.database

        # Update SRS memory using SRSManager
        updated_memory = tutor.srs_manager.create_or_update_srs_memory(
            user_id=request.user_id,
            phrase_id=request.phrase_id,
            quality=request.quality,
            confidence=request.confidence,
            database=database,
        )
        next_review_value = getattr(updated_memory, "next_review", None)
        if not next_review_value:
            interval_days = getattr(updated_memory, "interval_days", None)
            try:
                if interval_days is not None:
                    next_review_value = datetime.utcnow() + timedelta(
                        days=float(interval_days)
                    )
            except (TypeError, ValueError):
                next_review_value = None

        next_review_str = _serialize_datetime(next_review_value)
        if not next_review_str:
            next_review_str = datetime.utcnow().isoformat() + "Z"

        # Format response
        response_data = {
            "next_review": next_review_str,
            "efactor": getattr(updated_memory, "efactor", None),
            "interval_days": getattr(updated_memory, "interval_days", None),
        }

        logger.info(
            f"✅ Updated SRS memory for user {request.user_id}, phrase {request.phrase_id}, "
            f"quality {request.quality}, next review: {response_data['next_review']}"
        )

        return {
            "status": "success",
            "message": "Review updated successfully.",
            "data": response_data,
        }

    except Exception as e:
        logger.error(
            f"Error updating review for user {request.user_id}, phrase {request.phrase_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


def _get_attr(obj: Any, key: str, default: Optional[Any] = None) -> Any:
    """Retrieve key/attribute from multiple storage types."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    if hasattr(obj, key):
        return getattr(obj, key)
    getter = getattr(obj, "get", None)
    if callable(getter):
        try:
            return getter(key)
        except Exception:
            return default
    if hasattr(obj, "__dict__"):
        return obj.__dict__.get(key, default)
    return default


def _serialize_datetime(value: Any) -> Optional[str]:
    """Normalize datetime/datetime-like values to ISO strings."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        iso = value.isoformat()
        if not iso.endswith("Z"):
            iso += "Z"
        return iso
    return None
