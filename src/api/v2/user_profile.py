"""User profile API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.core.database import get_db
from src.schemas.v2.user_profile import UserProfileResponse, UserProfileUpdate
from src.services.user_profile_service import UserProfileService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User Profile"])


@router.get("/{user_id}/profile-info", response_model=UserProfileResponse)
def get_profile_info(
    user_id: int, db: Session = Depends(get_db)
) -> UserProfileResponse:
    """
    Get user profile information (username, avatar, and learning goal).

    Args:
        user_id: The ID of the user
        db: Database session

    Returns:
        UserProfileResponse containing username, avatar, and goal data
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    service = UserProfileService(db)
    profile = service.get_or_create(user_id)

    logger.info(f"Profile info retrieved for user {user_id}")

    return UserProfileResponse(
        user_id=user_id,
        username=profile.username,
        avatar=profile.avatar,
        goal_text=profile.goal_text,
        goal_created_at=profile.goal_created_at,
    )


@router.put("/{user_id}/profile-info", response_model=UserProfileResponse)
def update_profile_info(
    user_id: int, payload: UserProfileUpdate, db: Session = Depends(get_db)
) -> UserProfileResponse:
    """
    Update user profile information (username, avatar, and learning goal).

    Args:
        user_id: The ID of the user
        payload: Updated username, avatar, and optional goal data
        db: Database session

    Returns:
        UserProfileResponse with updated data
    """
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    service = UserProfileService(db)
    profile = service.update(
        user_id=user_id,
        username=payload.username,
        avatar=payload.avatar,
        goal_text=payload.goal_text,
        goal_created_at=payload.goal_created_at,
    )

    logger.info(f"Profile info updated for user {user_id}")

    return UserProfileResponse(
        user_id=user_id,
        username=profile.username,
        avatar=profile.avatar,
        goal_text=profile.goal_text,
        goal_created_at=profile.goal_created_at,
    )
