"""Utility helpers for maintaining aggregated learner stats."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

try:  # pragma: no cover - allow tests to stub src.models
    from src.models.v2 import UserStats
except ModuleNotFoundError:
    UserStats = object  # type: ignore


@dataclass
class StatsDelta:
    """Lightweight struct describing XP/streak changes."""

    xp_gained: int
    total_xp: int
    streak: int


class StatsManager:
    """Encapsulate streak / XP bookkeeping."""

    BASE_XP = 10
    PASS_BONUS = 5

    def __init__(self, session: Session):
        self._session = session

    def apply_attempt(
        self, *, user_id: UUID, final_score: float, passed: bool
    ) -> StatsDelta:
        stats = (
            self._session.query(UserStats)
            .filter(UserStats.user_id == user_id)
            .one_or_none()
        )
        if not stats:
            stats = UserStats(
                id=uuid4(),
                user_id=user_id,
                xp=0,
                streak=0,
                total_attempts=0,
                total_passed=0,
            )
            self._session.add(stats)

        stats.total_attempts = (stats.total_attempts or 0) + 1
        if passed:
            stats.total_passed = (stats.total_passed or 0) + 1
            stats.streak = (stats.streak or 0) + 1
        else:
            stats.streak = 0

        xp_gain = self._calculate_xp(final_score, passed)
        stats.xp = (stats.xp or 0) + xp_gain

        return StatsDelta(
            xp_gained=xp_gain,
            total_xp=stats.xp,
            streak=stats.streak,
        )

    def _calculate_xp(self, final_score: float, passed: bool) -> int:
        """Weight XP by accuracy with a small completion bonus."""
        bonus = self.PASS_BONUS if passed else 0
        weighted = int(round(final_score * 20))
        return max(1, self.BASE_XP + weighted + bonus)
