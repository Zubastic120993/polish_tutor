"""Review API endpoints."""

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import ReviewGetResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/due", response_model=ReviewGetResponse, status_code=200)
async def review_get_due(user_id: int = Query(..., description="User ID", gt=0)):
    """Return due review items for the user."""
    try:
        database = app_context.database

        # Returns a list of dicts, not ORM models
        due_items: List[Dict[str, Any]] = database.get_due_srs_items(user_id)

        if not due_items:
            return {
                "status": "success",
                "message": "No due items found.",
                "data": [],
                "metadata": {
                    "due_count": 0,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }

        # Format response with safe dict access
        review_list: List[Dict[str, Any]] = []
        for item in due_items:
            review_list.append(
                {
                    "phrase_id": item.get("phrase_id"),
                    "user_id": item.get("user_id"),
                    "next_review": item.get("next_review"),
                    "efactor": item.get("efactor"),
                    "interval_days": item.get("interval_days"),
                    "review_count": item.get("review_count"),
                    "strength_level": item.get("strength_level"),
                }
            )

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
        logger.error(f"Error retrieving due review items for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
        