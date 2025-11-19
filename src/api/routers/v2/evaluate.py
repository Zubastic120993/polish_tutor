"""Evaluation endpoint wiring real scoring pipeline."""

import logging

from fastapi import APIRouter, HTTPException

from src.schemas.v2.evaluate import EvaluateRequest, EvaluateResponse
from src.services.evaluator import EvaluationService
from src.services.lesson_flow import LessonFlowService
from src.services.progress_tracker import ProgressTracker

router = APIRouter()

_evaluation_service = EvaluationService()
_lesson_flow_service = LessonFlowService()
_progress_tracker = ProgressTracker()
logger = logging.getLogger(__name__)


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(payload: EvaluateRequest) -> EvaluateResponse:
    """Evaluate a user transcript for a specific phrase."""
    if not payload.phrase_id.strip():
        raise HTTPException(status_code=400, detail="phrase_id is required")
    if not payload.user_transcript.strip():
        raise HTTPException(status_code=400, detail="user_transcript is required")

    try:
        lesson_id, phrase_index, phrase = _lesson_flow_service.find_phrase(
            payload.phrase_id
        )
        lesson_total = _lesson_flow_service.total_for_lesson(lesson_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown phrase_id") from exc

    result = _evaluation_service.evaluate(phrase["pl"], payload.user_transcript)

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
