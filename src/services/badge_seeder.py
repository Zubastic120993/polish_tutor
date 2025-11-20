"""Badge seeding service for populating default badges."""

import logging
from sqlalchemy.orm import Session

from src.models import Badge

logger = logging.getLogger(__name__)


def seed_badges(db_session: Session) -> None:
    """
    Seed the database with default badge definitions.

    This function is idempotent - it will not create duplicates if badges
    already exist (checked by code field).

    Args:
        db_session: SQLAlchemy database session
    """
    # List of badge definitions
    default_badges = [
        # --- STREAK BADGES ---
        {
            "code": "STREAK_3",
            "name": "3-Day Streak",
            "description": "Practice 3 days in a row.",
            "icon": "🔥",
        },
        {
            "code": "STREAK_7",
            "name": "7-Day Streak",
            "description": "Practice for 7 consecutive days.",
            "icon": "🌕",
        },
        {
            "code": "STREAK_30",
            "name": "30-Day Streak",
            "description": "One month of daily practice!",
            "icon": "☀️",
        },
        # --- XP BADGES ---
        {
            "code": "XP_500",
            "name": "500 XP",
            "description": "Earn 500 XP total.",
            "icon": "💪",
        },
        {
            "code": "XP_2000",
            "name": "2000 XP",
            "description": "Earn 2000 XP total.",
            "icon": "🚀",
        },
        {
            "code": "XP_10000",
            "name": "10,000 XP",
            "description": "Earn 10,000 XP total.",
            "icon": "🧠",
        },
        # --- SESSION BADGES ---
        {
            "code": "SESSIONS_10",
            "name": "10 Sessions",
            "description": "Complete 10 practice sessions.",
            "icon": "🎯",
        },
        {
            "code": "SESSIONS_50",
            "name": "50 Sessions",
            "description": "Complete 50 practice sessions.",
            "icon": "🎓",
        },
        {
            "code": "SESSIONS_200",
            "name": "200 Sessions",
            "description": "Complete 200 practice sessions.",
            "icon": "🏆",
        },
        # --- ACCURACY BADGE ---
        {
            "code": "PERFECT_DAY",
            "name": "Perfect Polish",
            "description": "Achieve 100% accuracy in a day.",
            "icon": "🎤",
        },
    ]

    badges_created = 0
    badges_existing = 0

    for badge_data in default_badges:
        # Check if badge already exists
        existing = db_session.query(Badge).filter_by(code=badge_data["code"]).first()

        if not existing:
            badge = Badge(**badge_data)
            db_session.add(badge)
            badges_created += 1
            logger.debug(f"Created badge: {badge_data['code']} - {badge_data['name']}")
        else:
            badges_existing += 1

    db_session.commit()

    if badges_created > 0:
        logger.info(
            f"Badge seeding completed: {badges_created} new badges created, {badges_existing} already existed"
        )
    else:
        logger.debug(f"Badge seeding: All {badges_existing} badges already exist")
