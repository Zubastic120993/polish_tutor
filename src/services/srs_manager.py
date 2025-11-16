"""SRS Manager for spaced repetition system using SM-2 algorithm."""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import and_

from src.models import SRSMemory

if TYPE_CHECKING:
    from src.services.database_service import Database

logger = logging.getLogger(__name__)

# SM-2 Algorithm Constants
INITIAL_EFACTOR = 2.5
MIN_EFACTOR = 1.3
MAX_INTERVAL_DAYS = 365
FIRST_REVIEW_INTERVAL = 1  # days

# Quality to efactor adjustment mapping (0-5 scale)
QUALITY_EFACTOR_ADJUSTMENTS = {
    0: -0.8,  # complete blackout
    1: -0.54,  # incorrect, remembered
    2: -0.32,  # incorrect, easy recall
    3: -0.14,  # correct, difficult
    4: 0.0,  # correct, easy (unchanged)
    5: 0.1,  # perfect, instant
}


class SRSManager:
    """Manager for spaced repetition system using SM-2 algorithm."""

    def __init__(self, database: Optional["Database"] = None):
        """Initialize SRSManager.

        Args:
            database: Database service instance (optional)
        """
        self.database = database

    def update_efactor(self, current_efactor: float, quality: int) -> float:
        """Update efactor based on quality score.

        Args:
            current_efactor: Current ease factor
            quality: Quality score (0-5)

        Returns:
            Updated efactor (clamped to MIN_EFACTOR)
        """
        if quality not in QUALITY_EFACTOR_ADJUSTMENTS:
            logger.warning(f"Invalid quality {quality}, using quality 3")
            quality = 3

        adjustment = QUALITY_EFACTOR_ADJUSTMENTS[quality]
        new_efactor = current_efactor + adjustment

        # Clamp to minimum
        return max(MIN_EFACTOR, new_efactor)

    def calculate_interval(
        self,
        current_interval: int,
        efactor: float,
        review_count: int,
        confidence: Optional[int] = None,
    ) -> int:
        """Calculate next review interval using SM-2 algorithm.

        Args:
            current_interval: Current interval in days
            efactor: Current ease factor
            review_count: Number of times this item has been reviewed
            confidence: Confidence slider value (1-5, optional)

        Returns:
            Next interval in days (capped at MAX_INTERVAL_DAYS)
        """
        # First review: always 1 day
        if review_count == 0:
            base_interval = FIRST_REVIEW_INTERVAL
        # Second review: efactor × previous interval (min 1 day)
        elif review_count == 1:
            base_interval = max(1, int(efactor * current_interval))
        # Subsequent reviews: efactor × previous interval
        else:
            base_interval = int(efactor * current_interval)

        # Apply confidence slider modifier if provided
        if confidence is not None:
            # Confidence slider (1-5) modifies interval: ±20% per step from center (3)
            # Formula: final_interval = base_interval × (1 + (confidence - 3) × 0.2)
            confidence_modifier = 1 + (confidence - 3) * 0.2
            base_interval = int(base_interval * confidence_modifier)
            # Ensure minimum 1 day after confidence adjustment
            base_interval = max(1, base_interval)

        # Cap at maximum interval
        return min(base_interval, MAX_INTERVAL_DAYS)

    def schedule_next(
        self,
        quality: int,
        current_efactor: float,
        current_interval: int,
        review_count: int,
        confidence: Optional[int] = None,
    ) -> tuple[float, int, datetime]:
        """Schedule next review based on SM-2 algorithm.

        Args:
            quality: Quality score (0-5)
            current_efactor: Current ease factor
            current_interval: Current interval in days
            review_count: Number of times reviewed
            confidence: Confidence slider value (1-5, optional)

        Returns:
            Tuple of (new_efactor, new_interval_days, next_review_date)
        """
        # Update efactor based on quality
        new_efactor = self.update_efactor(current_efactor, quality)

        # Calculate new interval
        new_interval = self.calculate_interval(
            current_interval, new_efactor, review_count, confidence
        )

        # Calculate next review date
        next_review = datetime.utcnow() + timedelta(days=new_interval)

        logger.debug(
            f"Scheduled next review: quality={quality}, efactor={current_efactor:.2f}→{new_efactor:.2f}, "
            f"interval={current_interval}→{new_interval} days, next_review={next_review.date()}"
        )

        return (new_efactor, new_interval, next_review)

    def get_due_items(
        self, user_id: int, database: Optional["Database"] = None
    ) -> List[SRSMemory]:
        """Get all SRS items due for review for a user.

        Args:
            user_id: User ID
            database: Database service instance (uses self.database if not provided)

        Returns:
            List of SRSMemory items due for review
        """
        db = database or self.database
        if not db:
            raise ValueError("Database service required")

        now = datetime.utcnow()

        with db.get_session() as session:
            due_items = (
                session.query(SRSMemory)
                .filter(
                    and_(
                        SRSMemory.user_id == user_id,
                        SRSMemory.next_review <= now,
                    )
                )
                .order_by(SRSMemory.next_review.asc())
                .all()
            )

            # Expunge all objects from session so they can be used after session closes
            for item in due_items:
                session.expunge(item)

        logger.info(f"Found {len(due_items)} items due for review for user {user_id}")
        return due_items

    def create_or_update_srs_memory(
        self,
        user_id: int,
        phrase_id: str,
        quality: int,
        confidence: Optional[int] = None,
        database: Optional["Database"] = None,
    ) -> SRSMemory:
        """Create or update SRS memory for a phrase after review.

        Args:
            user_id: User ID
            phrase_id: Phrase ID
            quality: Quality score (0-5)
            confidence: Confidence slider value (1-5, optional)
            database: Database service instance (uses self.database if not provided)

        Returns:
            Updated or created SRSMemory instance
        """
        db = database or self.database
        if not db:
            raise ValueError("Database service required")

        with db.get_session() as session:
            # Check if SRS memory already exists
            existing = (
                session.query(SRSMemory)
                .filter(
                    and_(
                        SRSMemory.user_id == user_id,
                        SRSMemory.phrase_id == phrase_id,
                    )
                )
                .first()
            )

            if existing:
                # Update existing memory
                current_efactor = existing.efactor
                current_interval = existing.interval_days
                review_count = existing.review_count

                # Schedule next review
                new_efactor, new_interval, next_review = self.schedule_next(
                    quality=quality,
                    current_efactor=current_efactor,
                    current_interval=current_interval,
                    review_count=review_count,
                    confidence=confidence,
                )

                # Update strength level based on quality (map 0-5 to 1-5)
                strength_level = max(1, min(5, quality + 1))

                existing.efactor = new_efactor
                existing.interval_days = new_interval
                existing.next_review = next_review
                existing.last_review = datetime.utcnow()
                existing.review_count = review_count + 1
                existing.strength_level = strength_level

                session.commit()
                session.refresh(existing)
                if hasattr(session, "expunge"):
                    session.expunge(existing)

                logger.info(
                    f"Updated SRS memory for user {user_id}, phrase {phrase_id}: "
                    f"efactor={new_efactor:.2f}, interval={new_interval} days"
                )

                return existing

            else:
                # Create new memory
                # First review: schedule for 1 day from now
                next_review = datetime.utcnow() + timedelta(days=FIRST_REVIEW_INTERVAL)
                strength_level = max(1, min(5, quality + 1))

                new_memory = SRSMemory(
                    user_id=user_id,
                    phrase_id=phrase_id,
                    strength_level=strength_level,
                    efactor=INITIAL_EFACTOR,
                    interval_days=FIRST_REVIEW_INTERVAL,
                    next_review=next_review,
                    last_review=datetime.utcnow(),
                    review_count=1,
                )

                session.add(new_memory)
                session.commit()
                session.refresh(new_memory)
                if hasattr(session, "expunge"):
                    session.expunge(new_memory)

                logger.info(
                    f"Created SRS memory for user {user_id}, phrase {phrase_id}: "
                    f"next_review={next_review.date()}"
                )

                return new_memory

    def get_forgotten_items(
        self, user_id: int, database: Optional["Database"] = None
    ) -> List[SRSMemory]:
        """Get items that were forgotten (quality < 3) in recent reviews.

        Args:
            user_id: User ID
            database: Database service instance (uses self.database if not provided)

        Returns:
            List of SRSMemory items that need reinjection into lessons
        """
        db = database or self.database
        if not db:
            raise ValueError("Database service required")

        # Items with strength_level < 3 (quality < 3) that were reviewed recently
        # (within last 7 days) should be reinjected
        cutoff_date = datetime.utcnow() - timedelta(days=7)

        with db.get_session() as session:
            forgotten_items = (
                session.query(SRSMemory)
                .filter(
                    and_(
                        SRSMemory.user_id == user_id,
                        SRSMemory.strength_level < 3,
                        SRSMemory.last_review >= cutoff_date,
                    )
                )
                .order_by(SRSMemory.strength_level.asc(), SRSMemory.last_review.desc())
                .all()
            )

        logger.info(f"Found {len(forgotten_items)} forgotten items for user {user_id}")
        return forgotten_items
