"""Profile service for user statistics aggregation."""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ProfileService:
    """Service for computing user profile statistics."""

    def __init__(self, db: Session):
        self.db = db

    def compute_level(self, total_xp: int) -> Tuple[int, int, int]:
        """
        Compute user level based on total XP.

        Leveling curve:
        - Level 1: 0 XP
        - Level 2: 500 XP
        - Level 3: 1500 XP
        - Level 4: 3000 XP
        - Level 5: 5000 XP
        - Level 6: 8000 XP
        - Level 7: 12000 XP

        Args:
            total_xp: Total XP earned by user

        Returns:
            Tuple of (level, next_level_xp, xp_for_next_level)
        """
        thresholds = [0, 500, 1500, 3000, 5000, 8000, 12000]

        level = 1
        for i, threshold in enumerate(thresholds):
            if total_xp >= threshold:
                level = i + 1

        # Calculate next level XP requirement
        if level < len(thresholds):
            next_level_xp = thresholds[level]
            xp_for_next_level = next_level_xp - total_xp
        else:
            # Max level reached
            next_level_xp = thresholds[-1]
            xp_for_next_level = 0

        return level, next_level_xp, xp_for_next_level

    def calculate_current_streak(self, user_id: int) -> int:
        """
        Calculate the user's current daily practice streak.

        Args:
            user_id: The ID of the user

        Returns:
            Current streak count (number of consecutive days)
        """
        # Lazy import to avoid circular dependencies
        from src.models import UserSession

        sessions = (
            self.db.query(UserSession)
            .filter(UserSession.user_id == user_id, UserSession.ended_at.isnot(None))
            .all()
        )

        if not sessions:
            return 0

        # Get unique practice days
        practice_days = set(
            s.started_at.date() for s in sessions if s.started_at is not None
        )

        # Count consecutive days from today backwards
        today = datetime.utcnow().date()
        streak = 0

        # Check if user practiced today or yesterday
        if (
            today not in practice_days
            and (today - timedelta(days=1)) not in practice_days
        ):
            return 0

        # Count backwards from today
        check_date = today
        while check_date in practice_days:
            streak += 1
            check_date = check_date - timedelta(days=1)

        return streak

    def get_profile(self, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive profile statistics for a user.

        Args:
            user_id: The ID of the user

        Returns:
            Dictionary containing user profile data
        """
        # Lazy imports to avoid circular dependencies
        from src.models import UserSession, Badge, UserBadge

        # Fetch all completed sessions
        sessions = (
            self.db.query(UserSession)
            .filter(UserSession.user_id == user_id, UserSession.ended_at.isnot(None))
            .all()
        )

        # Calculate total XP
        total_xp = sum(s.total_xp or 0 for s in sessions)

        # Count total sessions
        total_sessions = len(sessions)

        # Calculate current streak
        current_streak = self.calculate_current_streak(user_id)

        # Compute level
        level, next_level_xp, xp_for_next_level = self.compute_level(total_xp)

        # Get best badges (most recent 4 unlocked badges)
        unlocked_badges = (
            self.db.query(UserBadge)
            .join(Badge, Badge.id == UserBadge.badge_id)
            .filter(UserBadge.user_id == user_id)
            .order_by(UserBadge.unlocked_at.desc())
            .limit(4)
            .all()
        )

        best_badges = [
            {
                "code": ub.badge.code,
                "name": ub.badge.name,
                "icon": ub.badge.icon,
            }
            for ub in unlocked_badges
        ]

        logger.info(
            f"Profile computed for user {user_id}: "
            f"XP={total_xp}, Level={level}, Streak={current_streak}, "
            f"Sessions={total_sessions}, Badges={len(best_badges)}"
        )

        return {
            "user_id": user_id,
            "total_xp": total_xp,
            "total_sessions": total_sessions,
            "current_streak": current_streak,
            "level": level,
            "next_level_xp": next_level_xp,
            "xp_for_next_level": xp_for_next_level,
            "best_badges": best_badges,
        }
