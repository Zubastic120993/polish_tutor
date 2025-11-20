"""Badge service for managing badge unlock logic."""

import logging
from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from src.models import Badge, UserBadge

logger = logging.getLogger(__name__)


class BadgeService:
    """Service for managing badge unlocks and queries."""

    def __init__(self, db: Session):
        """
        Initialize badge service with database session.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def get_all_badges(self) -> List[Badge]:
        """
        Get all available badges in the system.

        Returns:
            List of all Badge objects
        """
        return self.db.query(Badge).all()

    def get_user_badges(self, user_id: int) -> List[UserBadge]:
        """
        Get all badges unlocked by a specific user.

        Args:
            user_id: The ID of the user

        Returns:
            List of UserBadge objects for this user
        """
        return self.db.query(UserBadge).filter(UserBadge.user_id == user_id).all()

    def unlock_badge(self, user_id: int, badge: Badge) -> bool:
        """
        Unlock a badge for a user if not already unlocked.

        Args:
            user_id: The ID of the user
            badge: The Badge object to unlock

        Returns:
            True if badge was newly unlocked, False if user already had it
        """
        # Check if badge is already unlocked
        existing = (
            self.db.query(UserBadge)
            .filter(UserBadge.user_id == user_id, UserBadge.badge_id == badge.id)
            .first()
        )

        if existing:
            return False

        # Create new unlock record
        user_badge = UserBadge(
            user_id=user_id, badge_id=badge.id, unlocked_at=datetime.utcnow()
        )
        self.db.add(user_badge)
        self.db.commit()

        logger.info(f"Badge unlocked: user_id={user_id}, badge={badge.code}")
        return True

    def check_badges(
        self,
        user_id: int,
        *,
        total_xp: int,
        streak: int,
        total_sessions: int,
        perfect_day: bool = False,
    ) -> List[Badge]:
        """
        Check all badge conditions and unlock any that are newly satisfied.

        Args:
            user_id: The ID of the user
            total_xp: User's total lifetime XP
            streak: User's current daily streak
            total_sessions: User's total number of completed sessions
            perfect_day: Whether user achieved 100% accuracy today

        Returns:
            List of Badge objects that were newly unlocked
        """
        newly_unlocked = []

        for badge in self.get_all_badges():
            code = badge.code
            should_unlock = False

            # --- STREAK BADGES ---
            if code == "STREAK_3" and streak >= 3:
                should_unlock = True
            elif code == "STREAK_7" and streak >= 7:
                should_unlock = True
            elif code == "STREAK_30" and streak >= 30:
                should_unlock = True

            # --- XP BADGES ---
            elif code == "XP_500" and total_xp >= 500:
                should_unlock = True
            elif code == "XP_2000" and total_xp >= 2000:
                should_unlock = True
            elif code == "XP_10000" and total_xp >= 10000:
                should_unlock = True

            # --- SESSION BADGES ---
            elif code == "SESSIONS_10" and total_sessions >= 10:
                should_unlock = True
            elif code == "SESSIONS_50" and total_sessions >= 50:
                should_unlock = True
            elif code == "SESSIONS_200" and total_sessions >= 200:
                should_unlock = True

            # --- PERFECT DAY ---
            elif code == "PERFECT_DAY" and perfect_day:
                should_unlock = True

            # Attempt to unlock if conditions met
            if should_unlock:
                if self.unlock_badge(user_id, badge):
                    newly_unlocked.append(badge)

        if newly_unlocked:
            logger.info(
                f"User {user_id} unlocked {len(newly_unlocked)} new badges: "
                f"{[b.code for b in newly_unlocked]}"
            )

        return newly_unlocked
