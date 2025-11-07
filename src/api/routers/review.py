"""Review API endpoints."""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import ReviewUpdateRequest, ReviewUpdateResponse, ReviewGetResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/review", tags=["review"])


@router.get("/get", response_model=ReviewGetResponse, status_code=200)
async def review_get(user_id: int = Query(..., description="User ID", gt=0)):
    """Provide due SRS items for review.
    
    Args:
        user_id: User identifier
        
    Returns:
        List of due SRS items
    """
    try:
        database = app_context.database
        
        # Get due items using database service
        due_items = database.get_due_srs_items(user_id=user_id)
        
        # Format response
        items_data = []
        for item in due_items:
            items_data.append({
                "phrase_id": item.phrase_id,
                "user_id": item.user_id,
                "next_review": item.next_review.isoformat() + "Z" if item.next_review else None,
                "efactor": item.efactor,
                "interval_days": item.interval_days,
                "repetitions": item.repetitions,
            })
        
        return {
            "status": "success",
            "message": f"Found {len(items_data)} due items",
            "data": items_data
        }
        
    except Exception as e:
        logger.error(f"Error in review_get: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/update", response_model=ReviewUpdateResponse, status_code=200)
async def review_update(request: ReviewUpdateRequest):
    """Submit review result (success/partial/fail).
    
    Args:
        request: Review update request with user_id, phrase_id, quality, confidence
        
    Returns:
        Updated SRS data with next review date
    """
    try:
        srs_manager = app_context.tutor.srs_manager
        database = app_context.database
        
        # Update SRS memory
        srs_memory = srs_manager.create_or_update_srs_memory(
            user_id=request.user_id,
            phrase_id=request.phrase_id,
            quality=request.quality,
            confidence=request.confidence,
            database=database,
        )
        
        # Get next review date
        next_review = srs_memory.next_review
        if next_review:
            next_review_str = next_review.isoformat() + "Z"
        else:
            # Calculate next review if not set
            from datetime import timedelta
            next_review = datetime.utcnow() + timedelta(days=srs_memory.interval_days)
            next_review_str = next_review.isoformat() + "Z"
        
        return {
            "status": "success",
            "message": "Review updated successfully",
            "data": {
                "next_review": next_review_str,
                "efactor": srs_memory.efactor,
                "interval_days": srs_memory.interval_days,
            }
        }
        
    except Exception as e:
        logger.error(f"Error in review_update: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

