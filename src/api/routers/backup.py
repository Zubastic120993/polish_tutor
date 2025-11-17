"""Backup API endpoints."""

import logging
from datetime import datetime
from typing import Any, Dict, Iterable, List, Tuple, Union

from fastapi import APIRouter, HTTPException, Query

from src.api.schemas import BackupExportResponse
from src.core.app_context import app_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.get("/export", response_model=BackupExportResponse, status_code=200)
async def backup_export(
    user_id: int = Query(..., description="User ID", gt=0),
    format: str = Query(
        "json",
        description="Export format (json or csv)",
        regex="^(?i)(json|csv)$",
    ),
):
    """Export user data (SRS + settings) for backup or migration."""
    try:
        database = app_context.database
        export_format = (format or "json").lower()

        if export_format == "csv":
            timestamp = datetime.utcnow().isoformat() + "Z"
            return {
                "status": "success",
                "message": "CSV export not yet implemented — please request JSON instead.",
                "data": {
                    "user_id": user_id,
                    "exported_at": timestamp,
                    "download_url": None,
                },
                "metadata": {
                    "format": "csv",
                    "timestamp": timestamp,
                    "status": "pending",
                },
            }

        # Get user data
        raw_srs_memories = database.get_user_srs_memories(user_id)
        raw_settings = database.get_user_settings(user_id)
        raw_attempts = database.get_user_attempts(user_id)
        raw_progress = database.get_user_progresses(user_id)

        # ----------------------------
        # Initialize strongly typed backup container
        # ----------------------------
        srs_memories: List[Dict[str, Any]] = []
        settings_data: Dict[str, Any] = {}

        # Fill SRS memories
        for memory in _as_iterable(raw_srs_memories):
            srs_memories.append(
                {
                    "phrase_id": _get_field(memory, "phrase_id"),
                    "efactor": _get_field(memory, "efactor"),
                    "interval_days": _get_field(memory, "interval_days"),
                    "review_count": _get_field(memory, "review_count"),
                    "strength_level": _get_field(memory, "strength_level"),
                    "next_review": _serialize_datetime(
                        _get_field(memory, "next_review")
                    ),
                    "last_review": _serialize_datetime(
                        _get_field(memory, "last_review")
                    ),
                }
            )

        # Fill settings
        for key, value in _iter_settings(raw_settings):
            if key:
                settings_data[key] = value

        attempts = [
            _serialize_attempt(attempt) for attempt in _as_iterable(raw_attempts)
        ]
        progresses = [
            _serialize_progress(progress) for progress in _as_iterable(raw_progress)
        ]

        # Final backup object
        backup_data: Dict[str, Any] = {
            "user_id": user_id,
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "srs_memories": srs_memories,
            "settings": settings_data,
            "attempts": attempts,
            "lesson_progress": progresses,
        }

        metadata = {
            "export_count": len(srs_memories),
            "settings_count": len(settings_data),
            "attempt_count": len(attempts),
            "lesson_progress_count": len(progresses),
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


def _serialize_attempt(attempt: Any) -> Dict[str, Any]:
    """Serialize Attempt ORM/stub objects into primitives."""
    return {
        "id": _get_field(attempt, "id"),
        "phrase_id": _get_field(attempt, "phrase_id"),
        "user_input": _get_field(attempt, "user_input"),
        "score": _get_field(attempt, "score"),
        "feedback_type": _get_field(attempt, "feedback_type"),
        "created_at": _serialize_datetime(_get_field(attempt, "created_at")),
    }


def _serialize_progress(progress: Any) -> Dict[str, Any]:
    """Serialize lesson progress records."""
    return {
        "lesson_id": _get_field(progress, "lesson_id"),
        "current_dialogue_id": _get_field(progress, "current_dialogue_id"),
        "completed": _get_field(progress, "completed"),
        "last_accessed": _serialize_datetime(_get_field(progress, "last_accessed")),
    }


def _as_iterable(value: Any) -> Iterable[Any]:
    """Normalize list-like values (ORM result, tuple, None) into an iterable."""
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return value
    return [value]


def _get_field(obj: Any, key: str) -> Any:
    """Retrieve a field from dicts, objects, or fallback to getattr-style access."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    if hasattr(obj, key):
        return getattr(obj, key)
    getter = getattr(obj, "get", None)
    if callable(getter):
        try:
            return getter(key)
        except Exception:
            return None
    # Last resort: try __dict__
    if hasattr(obj, "__dict__"):
        return obj.__dict__.get(key)
    return None


def _serialize_datetime(value: Any) -> Any:
    """Serialize datetime objects to ISO strings."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        iso = value.isoformat()
        if not iso.endswith("Z"):
            iso += "Z"
        return iso
    return value


def _iter_settings(
    raw_settings: Union[Dict[str, Any], Iterable[Any], None],
) -> Iterable[Tuple[str, Any]]:
    """Yield (key, value) pairs from potential storage formats."""
    if not raw_settings:
        return []
    if isinstance(raw_settings, dict):
        return raw_settings.items()

    items: List[Tuple[str, Any]] = []
    for entry in raw_settings:
        if isinstance(entry, dict):
            key = entry.get("key")
            value = entry.get("value")
        else:
            key = getattr(entry, "key", None)
            value = getattr(entry, "value", None)
        if key is None:
            continue
        items.append((key, value))
    return items
