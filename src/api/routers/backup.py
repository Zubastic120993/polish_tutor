"""Backup API endpoints."""
import json
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from src.api.schemas import BackupExportResponse
from src.core.app_context import app_context
from src.models import Attempt, LessonProgress, SRSMemory, Setting

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/export", response_model=BackupExportResponse, status_code=200)
async def backup_export(
    user_id: int = Query(..., description="User ID", gt=0),
    format: str = Query("json", description="Export format: 'json' or 'csv'")
):
    """Download latest progress backup (JSON or CSV).
    
    Args:
        user_id: User identifier
        format: Export format ('json' or 'csv')
        
    Returns:
        Backup data in requested format
    """
    try:
        database = app_context.database
        
        # Collect all user data
        attempts = database.get_user_attempts(user_id)
        lesson_progress = database.get_user_progresses(user_id)
        srs_memories = database.get_user_srs_memories(user_id)
        settings_list = database.get_user_settings(user_id)

        # Extract data while session is active
        attempts_data = [
            {
                "id": a.id,
                "phrase_id": a.phrase_id,
                "user_input": a.user_input,
                "score": a.score,
                "feedback_type": a.feedback_type,
                "created_at": a.created_at.isoformat() + "Z" if a.created_at else None,
            }
            for a in attempts
        ]

        # Format data
        backup_data = {
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat() + "Z",
            "attempts": attempts_data,
            "lesson_progress": [
                {
                    "lesson_id": lp.lesson_id,
                    "current_dialogue_id": lp.current_dialogue_id,
                    "completed": lp.completed,
                    "last_accessed": lp.last_accessed.isoformat() + "Z" if lp.last_accessed else None,
                }
                for lp in lesson_progress
            ],
            "srs_memories": [
                {
                    "phrase_id": sm.phrase_id,
                    "efactor": sm.efactor,
                    "interval_days": sm.interval_days,
                    "review_count": sm.review_count,
                    "repetitions": sm.review_count,  # legacy key retained for compatibility
                    "next_review": sm.next_review.isoformat() + "Z" if sm.next_review else None,
                    "last_review": sm.last_review.isoformat() + "Z" if sm.last_review else None,
                    "last_reviewed": sm.last_review.isoformat() + "Z" if sm.last_review else None,
                }
                for sm in srs_memories
            ],
            "settings": {
                setting.key: setting.value
                for setting in settings_list
            } if settings_list else {},
        }
        
        if format.lower() == "csv":
            # Convert to CSV format (simplified - just return JSON for now)
            # Full CSV conversion would require additional processing
            return JSONResponse(
                content={
                    "status": "success",
                    "message": "CSV format not yet implemented, returning JSON",
                    "data": backup_data
                }
            )
        else:
            return {
                "status": "success",
                "message": "Backup exported successfully",
                "data": backup_data
            }
        
    except Exception as e:
        logger.error(f"Error in backup_export: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
