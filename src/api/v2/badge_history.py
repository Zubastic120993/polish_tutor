"""Badge history API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models import UserBadge, Badge
from src.schemas.v2.badge_history import BadgeHistoryResponse, BadgeHistoryItem

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/user/{user_id}/badge-history", response_model=BadgeHistoryResponse)
def get_badge_history(
    user_id: int, db: Session = Depends(get_db)
) -> BadgeHistoryResponse:
    """
    Retrieve badge unlock history for a user, sorted by unlock date (most recent first).

    Args:
        user_id: The ID of the user
        db: Database session

    Returns:
        BadgeHistoryResponse containing list of unlocked badges with timestamps
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    # Query UserBadge and Badge joined, ordered by unlock date descending
    rows = (
        db.query(UserBadge, Badge)
        .join(Badge, UserBadge.badge_id == Badge.id)
        .filter(UserBadge.user_id == user_id)
        .order_by(UserBadge.unlocked_at.desc())
        .all()
    )

    history = [
        BadgeHistoryItem(
            code=badge.code,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
            unlocked_at=user_badge.unlocked_at,
        )
        for user_badge, badge in rows
    ]

    logger.info(f"Retrieved {len(history)} badge history items for user {user_id}")
    return BadgeHistoryResponse(history=history)
