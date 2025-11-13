"""Backup API endpoints."""

import logging
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import BackupExportResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/export", response_model=BackupExportResponse, status_code=200)
async def backup_export(user_id: int = Query(..., description="User ID", gt=0)):
    """Export user data (SRS + settings) for backup or migration."""
    try:
        database = app_context.database

        # Get user data
        user_srs_memories: List[Dict[str, Any]] = database.get_user_srs_memories(user_id)
        user_settings: Dict[str, Any] = database.get_user_settings(user_id)

        # ----------------------------
        # Initialize strongly typed backup container
        # ----------------------------
        srs_memories: List[Dict[str, Any]] = []
        settings_data: List[Dict[str, Any]] = []

        # Fill SRS memories
        for memory in user_srs_memories:
            srs_memories.append(
                {
                    "phrase_id": memory.get("phrase_id"),
                    "efactor": memory.get("efactor"),
                    "interval_days": memory.get("interval_days"),
                    "review_count": memory.get("review_count"),
                    "strength_level": memory.get("strength_level"),
                    "next_review": memory.get("next_review"),
                    "last_review": memory.get("last_review"),
                }
            )

        # Fill settings
        for key, value in user_settings.items():
            settings_data.append({"key": key, "value": value})

        # Final backup object
        backup_data: Dict[str, Any] = {
            "user_id": user_id,
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "srs_memories": srs_memories,
            "settings": settings_data,
        }

        metadata = {
            "export_count": len(srs_memories),
            "settings_count": len(settings_data),
            "timestamp": backup_data["exported_at"],
        }

        logger.info(
            f"📦 Backup exported for user {user_id}: "
            f"{len(srs_memories)} SRS items, {len(settings_data)} settings"
        )

        return {
            "status": "success",
            "message": "Backup exported successfully",
            "data": backup_data,
            "metadata": metadata,
        }

    except Exception as e:
        logger.error(f"Error exporting backup for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
        