"""Badge API endpoints."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.models import Badge, UserBadge, UserSession
from src.schemas.v2.badges import (
    BadgeBase,
    BadgeListResponse,
    SessionBadgeUnlockResponse,
    UserBadgeListResponse,
    UserBadgeResponse,
)

router = APIRouter(tags=["badges"])
logger = logging.getLogger(__name__)


@router.get("/badges/all", response_model=BadgeListResponse)
async def get_all_badges(db: Session = Depends(get_db)) -> BadgeListResponse:
    """
    Get all available badges in the system.

    Returns a list of all badges that users can potentially unlock,
    regardless of whether they have been unlocked by anyone.
    """
    badges = db.query(Badge).all()

    badge_list = [
        BadgeBase(
            code=badge.code,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
        )
        for badge in badges
    ]

    logger.info(f"Retrieved {len(badge_list)} badges")
    return BadgeListResponse(badges=badge_list)


@router.get("/user/{user_id}/badges", response_model=UserBadgeListResponse)
async def get_user_badges(
    user_id: int, db: Session = Depends(get_db)
) -> UserBadgeListResponse:
    """
    Get all badges unlocked by a specific user.

    Args:
        user_id: The ID of the user

    Returns:
        List of badges with unlock timestamps for the user
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    # Query user badges with joined badge information
    user_badges = (
        db.query(UserBadge, Badge)
        .join(Badge, UserBadge.badge_id == Badge.id)
        .filter(UserBadge.user_id == user_id)
        .all()
    )

    badge_list = [
        UserBadgeResponse(
            code=badge.code,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
            unlocked_at=user_badge.unlocked_at,
        )
        for user_badge, badge in user_badges
    ]

    logger.info(f"User {user_id} has {len(badge_list)} unlocked badges")
    return UserBadgeListResponse(badges=badge_list)


@router.get(
    "/practice/session/{session_id}/unlocked-badges",
    response_model=SessionBadgeUnlockResponse,
)
async def get_session_unlocked_badges(
    session_id: int, db: Session = Depends(get_db)
) -> SessionBadgeUnlockResponse:
    """
    Get badges that were unlocked during a specific practice session.

    Args:
        session_id: The ID of the practice session

    Returns:
        List of badges that were newly unlocked in this session

    Note:
        This endpoint currently returns badges based on the session's
        unlocked_badges field. If the field is not populated, it returns
        an empty list.
    """
    if session_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    session = db.query(UserSession).filter(UserSession.id == session_id).first()

    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Get badge codes from session (if tracked)
    # Note: This requires session-level tracking of unlocked badges
    # For now, returns empty list if not implemented
    badge_codes = getattr(session, "unlocked_badges", None) or []

    if not badge_codes:
        logger.debug(f"No badges tracked for session {session_id}")
        return SessionBadgeUnlockResponse(unlocked_badges=[])

    # Fetch badge details for the codes
    badges = db.query(Badge).filter(Badge.code.in_(badge_codes)).all()

    badge_list = [
        BadgeBase(
            code=badge.code,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
        )
        for badge in badges
    ]

    logger.info(f"Session {session_id} unlocked {len(badge_list)} badges")
    return SessionBadgeUnlockResponse(unlocked_badges=badge_list)
