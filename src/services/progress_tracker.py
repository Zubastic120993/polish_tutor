"""Service responsible for persisting Phase D evaluation progress."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.core.database import SessionLocal

try:  # pragma: no cover - fallback for test stubs
    from src.models.v2 import DailyReview, PhraseAttempt, UserProgress
except ModuleNotFoundError:  # tests may stub src.models
    DailyReview = PhraseAttempt = UserProgress = object  # type: ignore[assignment]
from src.services.stats_manager import StatsManager, StatsDelta


DEFAULT_USER_UUID = os.getenv(
    "V2_DEFAULT_USER_UUID", "00000000-0000-0000-0000-000000000001"
)


class ProgressTracker:
    """Saves attempts, updates lesson progress, stats, and review schedule."""

    def __init__(self, session_factory=SessionLocal):
        self._session_factory = session_factory
        self._default_user_id = self._parse_user_id(DEFAULT_USER_UUID)

    def record_evaluation(
        self,
        *,
        user_id: Optional[UUID] = None,
        lesson_id: str,
        lesson_index: Optional[int],
        lesson_total: Optional[int],
        phrase_id: str,
        transcript: str,
        final_score: float,
        phonetic_similarity: float,
        semantic_accuracy: float,
        passed: bool,
        audio_ref: Optional[str] = None,
    ) -> StatsDelta:
        """Persist a learner attempt and cascade updates."""
        session = self._session_factory()
        target_user = user_id or self._default_user_id
        try:
            attempt = PhraseAttempt(
                id=uuid4(),
                user_id=target_user,
                phrase_id=phrase_id,
                transcript=transcript,
                score=final_score,
                phonetic_distance=max(0.0, min(1.0, 1.0 - phonetic_similarity)),
                semantic_accuracy=semantic_accuracy,
                response_time_ms=None,
                audio_ref=audio_ref,
            )
            session.add(attempt)

            progress = (
                session.query(UserProgress)
                .filter(
                    UserProgress.user_id == target_user,
                    UserProgress.lesson_id == lesson_id,
                )
                .one_or_none()
            )
            if not progress:
                progress = UserProgress(
                    id=uuid4(),
                    user_id=target_user,
                    lesson_id=lesson_id,
                    current_index=lesson_index or 0,
                    total=lesson_total or 0,
                )
                session.add(progress)

            if lesson_total is not None:
                progress.total = lesson_total
            if lesson_index is not None:
                progress.current_index = lesson_index + 1 if passed else lesson_index

            stats_delta = StatsManager(session).apply_attempt(
                user_id=target_user, final_score=final_score, passed=passed
            )

            if passed:
                self._enqueue_review(session, target_user, phrase_id)

            session.commit()
            return stats_delta
        except SQLAlchemyError:
            session.rollback()
            raise
        finally:
            session.close()

    def _enqueue_review(self, session: Session, user_id: UUID, phrase_id: str) -> None:
        """Create or refresh spaced-repetition reminder."""
        next_review_time = datetime.now(timezone.utc) + timedelta(days=1)
        existing = (
            session.query(DailyReview)
            .filter(
                DailyReview.user_id == user_id,
                DailyReview.phrase_id == phrase_id,
            )
            .one_or_none()
        )
        if existing:
            existing.next_review = next_review_time
            existing.interval_days = 1
            return

        session.add(
            DailyReview(
                id=uuid4(),
                user_id=user_id,
                phrase_id=phrase_id,
                next_review=next_review_time,
                interval_days=1,
                easiness=2.5,
            )
        )

    @staticmethod
    def _parse_user_id(raw: str) -> UUID:
        try:
            return UUID(raw)
        except ValueError:
            return UUID(DEFAULT_USER_UUID)
