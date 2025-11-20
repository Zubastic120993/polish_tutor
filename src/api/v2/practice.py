"""Practice pack API serving daily review sessions."""

from __future__ import annotations

import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.core.app_context import app_context
from src.core.database import get_db
from src.models import Phrase
from src.schemas.v2.practice import (
    EndSessionRequest,
    EndSessionResponse,
    PracticePackResponse,
    PhraseItem,
    WeeklyStatsResponse,
)
from src.services.speech_engine import SpeechEngine
from src.services.practice_service import PracticeService
from src.services.badge_service import BadgeService

practice_router = APIRouter(prefix="/practice", tags=["practice-v2"])
logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
NATIVE_AUDIO_DIR = PROJECT_ROOT / "static" / "audio" / "native"
AUDIO_CACHE_V2_DIR = PROJECT_ROOT / "static" / "audio_cache_v2"
AUDIO_CACHE_V2_DIR.mkdir(parents=True, exist_ok=True)
_speech_engine = SpeechEngine(cache_dir=str(AUDIO_CACHE_V2_DIR))


def _resolve_dialogue_metadata(
    lesson_id: Optional[str],
    phrase_id: str,
    cache: Dict[str, Optional[Dict[str, Any]]],
) -> Optional[Dict[str, Any]]:
    """Return dialogue metadata from lesson JSON (cached for efficiency)."""
    if not lesson_id:
        return None

    if lesson_id not in cache:
        try:
            cache[lesson_id] = app_context.tutor.lesson_manager.get_lesson(lesson_id)
        except FileNotFoundError:
            logger.debug(
                "Lesson %s missing on disk when building practice pack", lesson_id
            )
            cache[lesson_id] = None

    lesson_data = cache.get(lesson_id)
    if not lesson_data:
        return None

    for dialogue in lesson_data.get("dialogues", []):
        if dialogue.get("id") == phrase_id:
            return dialogue
    return None


def _build_dialogue_audio_url(
    lesson_id: Optional[str], filename: Optional[str]
) -> Optional[str]:
    if not lesson_id or not filename:
        return None
    native_path = NATIVE_AUDIO_DIR / lesson_id / filename
    if native_path.exists():
        return f"/static/audio/native/{lesson_id}/{filename}"
    return None


def _build_phrase_audio_url(audio_path: Optional[str]) -> Optional[str]:
    if not audio_path:
        return None
    relative = audio_path.lstrip("/")
    native_path = NATIVE_AUDIO_DIR / relative
    if native_path.exists():
        return f"/static/audio/native/{relative}"
    return None


def _ensure_cached_audio(
    lesson_id: Optional[str], phrase_id: str, text: str
) -> Optional[str]:
    if not text:
        return None

    filename = f"practice_{phrase_id}.mp3"
    target_path = AUDIO_CACHE_V2_DIR / filename
    if target_path.exists():
        return f"/audio_cache_v2/{filename}"

    try:
        source_path, _ = _speech_engine.get_audio_path(
            text=text,
            lesson_id=lesson_id or "practice",
            phrase_id=phrase_id,
        )
    except Exception:  # pragma: no cover - best effort
        return None

    if not source_path:
        return None

    try:
        src = Path(source_path)
        if src.exists():
            shutil.copyfile(src, target_path)
            return f"/audio_cache_v2/{filename}"
    except OSError:
        return None

    return None


class PracticeGenerator:
    """Generator for practice pack items."""

    def __init__(self, db: Session, tutor, srs_manager):
        self.db = db
        self.tutor = tutor
        self.srs_manager = srs_manager
        self._lesson_cache: Dict[str, Optional[Dict[str, Any]]] = {}

    def generate_review_phrases(self, user_id: int, database) -> List[PhraseItem]:
        """Generate review phrases from SRS due items."""
        try:
            due_items = self.srs_manager.get_due_items(
                user_id=user_id, database=database
            )
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.exception("Failed to load SRS due items for user %s", user_id)
            raise HTTPException(
                status_code=500, detail="Unable to load review items"
            ) from exc

        if not due_items:
            return []

        phrase_ids = [
            item.phrase_id for item in due_items if getattr(item, "phrase_id", None)
        ]
        review_phrases: List[PhraseItem] = []

        if phrase_ids:
            phrases = self.db.query(Phrase).filter(Phrase.id.in_(phrase_ids)).all()
            phrase_map = {phrase.id: phrase for phrase in phrases}
        else:
            phrase_map = {}

        for memory in due_items:
            phrase_id = getattr(memory, "phrase_id", None)
            if not phrase_id:
                continue
            phrase = phrase_map.get(phrase_id)
            if not phrase:
                logger.debug("Skipping SRS phrase %s (not found in DB)", phrase_id)
                continue

            phrase_item = self._build_phrase_item(phrase, phrase_id)
            if phrase_item:
                review_phrases.append(phrase_item)

        return review_phrases

    def generate_new_phrases(self, user_id: int, limit: int = 3) -> List[PhraseItem]:
        """Generate new (unseen) phrases for practice."""
        from src.models import SRSMemory

        # Get all phrase IDs that the user has already seen (has SRS memory)
        seen_phrase_ids_query = (
            self.db.query(SRSMemory.phrase_id)
            .filter(SRSMemory.user_id == user_id)
            .all()
        )
        seen_phrase_ids = {row.phrase_id for row in seen_phrase_ids_query}

        # Query unseen phrases from available lessons
        query = self.db.query(Phrase)

        if seen_phrase_ids:
            query = query.filter(~Phrase.id.in_(seen_phrase_ids))

        # Prefer A1 lessons if available, otherwise use any lesson
        unseen_phrases = (
            query.order_by(Phrase.lesson_id, Phrase.id)
            .limit(limit * 3)  # Get more than needed to filter out integration phrases
            .all()
        )

        new_phrases: List[PhraseItem] = []
        for phrase in unseen_phrases:
            if len(new_phrases) >= limit:
                break

            phrase_id = phrase.id
            raw_text = (phrase.text or "").strip()

            # Skip integration phrases
            if raw_text.lower() == "integration phrase" or phrase_id.startswith(
                "integration_phrase"
            ):
                logger.debug("Skipping placeholder integration phrase %s", phrase_id)
                continue

            phrase_item = self._build_phrase_item(phrase, phrase_id)
            if phrase_item:
                new_phrases.append(phrase_item)

        return new_phrases

    def _build_phrase_item(self, phrase, phrase_id: str) -> Optional[PhraseItem]:
        """Build a PhraseItem from a Phrase model instance."""
        lesson_id: Optional[str] = getattr(phrase, "lesson_id", None)
        raw_text = (phrase.text or "").strip()

        # Skip integration phrases
        if raw_text.lower() == "integration phrase" or phrase_id.startswith(
            "integration_phrase"
        ):
            return None

        dialogue_meta = _resolve_dialogue_metadata(
            lesson_id, phrase_id, self._lesson_cache
        )

        target_text = raw_text
        translation = ""
        audio_url: Optional[str] = None
        expected_responses: Optional[List[str]] = None

        if dialogue_meta:
            translation = dialogue_meta.get("translation") or ""
            # Use the EXPECTED user response (what user should say/repeat)
            expected = dialogue_meta.get("expected") or []
            if expected:
                target_text = expected[0]  # Show what user should say
                expected_responses = expected  # All acceptable answers
            audio_url = _build_dialogue_audio_url(lesson_id, dialogue_meta.get("audio"))

        if not audio_url:
            audio_url = _build_phrase_audio_url(getattr(phrase, "audio_path", None))
        if not audio_url:
            audio_url = _ensure_cached_audio(lesson_id, phrase_id, target_text)

        return PhraseItem(
            id=phrase_id,
            polish=target_text,
            english=translation,
            audio_url=audio_url,
            expected_responses=expected_responses,
        )


@practice_router.get("/daily", response_model=PracticePackResponse)
async def get_daily_practice_pack(
    user_id: int = Query(1, ge=1),
    db: Session = Depends(get_db),
) -> PracticePackResponse:
    """Return a daily practice pack with review phrases and new phrases."""
    tutor = app_context.tutor
    srs_manager = getattr(tutor, "srs_manager", None)
    if not srs_manager:
        raise HTTPException(status_code=500, detail="SRS manager unavailable")

    database = app_context.database
    pack_id = f"daily_{datetime.utcnow().date().isoformat()}"

    # Start a new practice session
    practice_service = PracticeService(db=db)
    user_session = practice_service.start_session(user_id=user_id)
    logger.info(f"Started practice session {user_session.id} for user {user_id}")

    # Initialize generator
    generator = PracticeGenerator(db=db, tutor=tutor, srs_manager=srs_manager)

    # Generate review phrases from SRS
    review_phrases = generator.generate_review_phrases(
        user_id=user_id, database=database
    )

    # Generate new phrases (unseen items)
    new_phrases = generator.generate_new_phrases(user_id=user_id, limit=3)

    return PracticePackResponse(
        pack_id=pack_id,
        session_id=user_session.id,
        review_phrases=review_phrases,
        new_phrases=new_phrases,
        dialog=None,
        pronunciation_drill=None,
    )


@practice_router.post("/end-session", response_model=EndSessionResponse)
async def end_practice_session(
    payload: EndSessionRequest,
    db: Session = Depends(get_db),
) -> EndSessionResponse:
    """End a practice session and compute metrics including streak bonus."""
    practice_service = PracticeService(db=db)

    try:
        # Get the session to extract user_id
        session = practice_service.get_session(payload.session_id)
        if not session:
            raise HTTPException(
                status_code=404, detail=f"Session {payload.session_id} not found"
            )

        # Calculate daily streak
        streak_before, streak_after = practice_service.calculate_daily_streak(
            session.user_id
        )

        # Detect perfect day (100% accuracy)
        correct = payload.correct_phrases
        total = payload.total_phrases
        perfect_day = total > 0 and correct == total

        # End session with streak information and perfect day status
        session = practice_service.end_session(
            session_id=payload.session_id,
            xp_from_phrases=payload.xp_from_phrases,
            streak_before=streak_before,
            streak_after=streak_after,
            perfect_day=perfect_day,
        )
        logger.info(
            f"Ended practice session {session.id} - "
            f"Duration: {session.duration_seconds}s, XP: {session.total_xp}, "
            f"Streak: {session.streak_before} -> {session.streak_after}, "
            f"Perfect Day: {session.perfect_day}"
        )

        # Check and unlock badges
        from src.models import UserSession

        badge_service = BadgeService(db)

        # Calculate user totals for badge checking
        all_user_sessions = (
            db.query(UserSession)
            .filter(
                UserSession.user_id == session.user_id, UserSession.ended_at.isnot(None)
            )
            .all()
        )
        total_xp = sum(s.total_xp or 0 for s in all_user_sessions)
        total_sessions = len(all_user_sessions)

        # Check for newly unlocked badges
        unlocked_badges = badge_service.check_badges(
            user_id=session.user_id,
            total_xp=total_xp,
            streak=session.streak_after,
            total_sessions=total_sessions,
            perfect_day=perfect_day,
        )

        unlocked_badge_codes = [badge.code for badge in unlocked_badges]
        if unlocked_badge_codes:
            logger.info(
                f"User {session.user_id} unlocked badges: {unlocked_badge_codes}"
            )

        return EndSessionResponse(
            session_id=session.id,
            session_start=session.started_at,
            session_end=session.ended_at,  # type: ignore
            session_duration_seconds=session.duration_seconds,  # type: ignore
            xp_total=session.total_xp,
            xp_from_phrases=session.xp_phrases,
            xp_session_bonus=session.xp_session_bonus,
            xp_streak_bonus=session.xp_streak_bonus,
            streak_before=session.streak_before,
            streak_after=session.streak_after,
            perfect_day=perfect_day,
            unlocked_badges=unlocked_badge_codes,
        )
    except ValueError as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error ending session: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@practice_router.get("/weekly-stats", response_model=WeeklyStatsResponse)
async def get_weekly_stats(
    user_id: int = Query(1, ge=1, description="User ID to get weekly statistics for"),
    db: Session = Depends(get_db),
) -> WeeklyStatsResponse:
    """
    Get weekly practice statistics for the last 7 days.

    Returns aggregated statistics including:
    - Total sessions, XP, and practice time
    - Number of unique practice days (weekly streak)
    - Daily breakdown of activity
    """
    practice_service = PracticeService(db=db)

    try:
        stats = practice_service.get_weekly_stats(user_id=user_id)
        logger.info(
            f"Retrieved weekly stats for user {user_id}: {stats['total_sessions']} sessions, {stats['total_xp']} XP"
        )
        return WeeklyStatsResponse(**stats)
    except Exception as e:
        logger.exception(f"Error retrieving weekly stats for user {user_id}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to retrieve weekly statistics"
        )
