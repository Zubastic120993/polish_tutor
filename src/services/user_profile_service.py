"""User profile service for managing user customization."""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class UserProfileService:
    """Service for managing user profile data."""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create(self, user_id: int):
        """
        Get existing user profile or create a new one.

        Args:
            user_id: The ID of the user

        Returns:
            UserProfile: The user's profile
        """
        # Lazy import to avoid circular dependencies
        from src.models import UserProfile

        profile = (
            self.db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        )

        if not profile:
            profile = UserProfile(user_id=user_id)
            self.db.add(profile)
            self.db.commit()
            self.db.refresh(profile)
            logger.info(f"Created new profile for user {user_id}")

        return profile

    def update(
        self,
        user_id: int,
        username: str,
        avatar: str,
        goal_text: Optional[str] = None,
        goal_created_at: Optional[datetime] = None,
    ):
        """
        Update user profile.

        Args:
            user_id: The ID of the user
            username: New username
            avatar: New avatar emoji
            goal_text: Optional learning goal text
            goal_created_at: Optional goal creation timestamp

        Returns:
            UserProfile: The updated profile
        """
        profile = self.get_or_create(user_id)
        profile.username = username
        profile.avatar = avatar

        # Update goal fields if provided (allows clearing by passing empty string/None)
        if goal_text is not None:
            profile.goal_text = goal_text if goal_text else None
        if goal_created_at is not None:
            profile.goal_created_at = goal_created_at

        profile.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(profile)

        log_msg = (
            f"Updated profile for user {user_id}: username={username}, avatar={avatar}"
        )
        if goal_text is not None:
            log_msg += f", goal_text={'set' if goal_text else 'cleared'}"
        logger.info(log_msg)

        return profile
