"""Evaluation endpoint wiring real scoring pipeline."""

import logging
from typing import Optional, Tuple

from fastapi import APIRouter, HTTPException

from src.core.app_context import app_context
from src.schemas.v2.evaluate import EvaluateRequest, EvaluateResponse
from src.services.evaluator import EvaluationService
from src.services.lesson_flow import LessonFlowService
from src.services.progress_tracker import ProgressTracker

router = APIRouter()

_evaluation_service = EvaluationService()
_lesson_flow_service = LessonFlowService()
_progress_tracker = ProgressTracker()
logger = logging.getLogger(__name__)


def _lookup_phrase_text(phrase_id: str) -> Tuple[Optional[str], Optional[str]]:
    """Attempt to fetch the canonical Polish phrase and lesson id from DB/lessons."""
    try:
        database = app_context.database
        phrase = database.get_phrase(phrase_id)
    except Exception:  # pragma: no cover - database access failure
        return (None, None)

    if not phrase:
        return (None, None)

    lesson_id = getattr(phrase, "lesson_id", None)
    text = getattr(phrase, "text", None)

    if lesson_id:
        try:
            lesson_data = app_context.tutor.lesson_manager.get_lesson(lesson_id)
        except Exception:
            lesson_data = None

        if lesson_data:
            for dialogue in lesson_data.get("dialogues", []):
                if dialogue.get("id") == phrase_id:
                    expected = dialogue.get("expected") or []
                    if expected:
                        text = expected[0]
                    elif dialogue.get("tutor"):
                        text = dialogue["tutor"]
                    break

    return (text, lesson_id)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(payload: EvaluateRequest) -> EvaluateResponse:
    """Evaluate a user transcript for a specific phrase."""
    if not payload.phrase_id.strip():
        raise HTTPException(status_code=400, detail="phrase_id is required")
    if not payload.user_transcript.strip():
        raise HTTPException(status_code=400, detail="user_transcript is required")

    reference_text: Optional[str] = (
        payload.expected_phrase.strip() if payload.expected_phrase else None
    )
    lesson_context: Optional[Tuple[str, int, int]] = None

    # Only lookup reference text if not provided in payload
    if not reference_text:
        try:
            lesson_id, phrase_index, phrase = _lesson_flow_service.find_phrase(
                payload.phrase_id
            )
            lesson_total = _lesson_flow_service.total_for_lesson(lesson_id)
            lesson_context = (lesson_id, phrase_index, lesson_total)
            reference_text = phrase.get("pl")
        except KeyError:
            # Fallback to database lookup
            fallback_text, _ = _lookup_phrase_text(payload.phrase_id)
            reference_text = fallback_text

    if not reference_text:
        raise HTTPException(status_code=404, detail="Unknown phrase_id")

    result = _evaluation_service.evaluate(reference_text, payload.user_transcript)

    if lesson_context:
        lesson_id, phrase_index, lesson_total = lesson_context
        try:
            _progress_tracker.record_evaluation(
                lesson_id=lesson_id,
                lesson_index=phrase_index,
                lesson_total=lesson_total,
                phrase_id=payload.phrase_id,
                transcript=payload.user_transcript,
                final_score=result.score,
                phonetic_similarity=result.phonetic_similarity,
                semantic_accuracy=result.semantic_accuracy,
                passed=result.passed,
                audio_ref=payload.audio_url,
            )
        except Exception as exc:  # pragma: no cover - persistence best effort
            logger.exception("Failed to persist evaluation attempt")
            raise HTTPException(
                status_code=500, detail="Failed to persist evaluation"
            ) from exc

    return EvaluateResponse(**result.response_payload())
