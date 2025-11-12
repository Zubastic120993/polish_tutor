"""User API endpoints."""

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import UserStatsResponse
from src.core.app_context import app_context
from src.models import Attempt, LessonProgress

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/stats", response_model=UserStatsResponse, status_code=200)
async def user_stats(user_id: int = Query(..., description="User ID", gt=0)):
    """Return progress %, study time, accuracy trends.

    Args:
        user_id: User identifier

    Returns:
        User statistics including progress, study time, accuracy
    """
    try:
        database = app_context.database

        # Get all attempts for user
        attempts = database.get_user_attempts(user_id)

        # Calculate statistics
        total_attempts = len(attempts)

        if total_attempts == 0:
            return {
                "status": "success",
                "message": "No statistics available",
                "data": {
                    "user_id": user_id,
                    "total_attempts": 0,
                    "progress_percent": 0.0,
                    "study_time_minutes": 0,
                    "average_accuracy": 0.0,
                    "accuracy_trend": [],
                },
            }

        # Extract scores immediately while session is active
        attempt_scores = [
            attempt.score for attempt in attempts if attempt.score is not None
        ]
        total_score = sum(attempt_scores)
        average_accuracy = (
            (total_score / total_attempts) * 100 if total_attempts > 0 else 0.0
        )

        # Calculate study time (estimate: 1 minute per 5 attempts)
        study_time_minutes = total_attempts / 5

        # Get lesson progress
        lesson_progress = database.get_user_progresses(user_id)
        completed_lessons = len(
            [lp for lp in lesson_progress if lp.status == "completed"]
        )
        total_lessons = len(lesson_progress) if lesson_progress else 1
        progress_percent = (
            (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0.0
        )

        # Calculate accuracy trend (last 10 attempts)
        recent_attempts = sorted(
            attempts,
            key=lambda x: x.created_at if x.created_at else datetime.min,
            reverse=True,
        )[:10]
        accuracy_trend = [
            {
                "date": (
                    attempt.created_at.isoformat() + "Z"
                    if attempt.created_at
                    else datetime.utcnow().isoformat() + "Z"
                ),
                "accuracy": attempt.score * 100 if attempt.score else 0.0,
            }
            for attempt in reversed(recent_attempts)
        ]

        return {
            "status": "success",
            "message": "Statistics retrieved successfully",
            "data": {
                "user_id": user_id,
                "total_attempts": total_attempts,
                "progress_percent": round(progress_percent, 2),
                "study_time_minutes": round(study_time_minutes, 1),
                "average_accuracy": round(average_accuracy, 2),
                "accuracy_trend": accuracy_trend,
            },
        }

    except Exception as e:
        logger.error(f"Error in user_stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
