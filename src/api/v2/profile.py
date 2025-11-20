"""Profile API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.schemas.v2.profile import ProfileResponse
from src.services.profile_service import ProfileService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["Profile"])


@router.get("/{user_id}/profile", response_model=ProfileResponse)
def get_profile(user_id: int, db: Session = Depends(get_db)) -> ProfileResponse:
    """
    Get user profile with aggregated statistics.

    Returns:
    - Total XP earned
    - Total sessions completed
    - Current practice streak
    - Level (based on XP)
    - XP requirements for next level
    - Top 4 most recent badges

    Args:
        user_id: The ID of the user
        db: Database session

    Returns:
        ProfileResponse containing user statistics
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user id")

    service = ProfileService(db)
    data = service.get_profile(user_id)

    logger.info(f"Profile retrieved for user {user_id}")
    return ProfileResponse(**data)
