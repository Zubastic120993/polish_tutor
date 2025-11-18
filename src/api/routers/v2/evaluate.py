"""Evaluation endpoint wiring real scoring pipeline."""

from fastapi import APIRouter, HTTPException

from src.schemas.v2.evaluate import EvaluateRequest, EvaluateResponse
from src.services.evaluator import EvaluationService

router = APIRouter(prefix="/evaluate")

TARGET_PHRASES = {
    "p1": "cześć",
    "p2": "jak się masz?",
    "p3": "miłego dnia!",
}

_evaluation_service = EvaluationService()


@router.post("", response_model=EvaluateResponse)
async def evaluate(payload: EvaluateRequest) -> EvaluateResponse:
    """Evaluate a user transcript for a specific phrase."""
    if not payload.phrase_id.strip():
        raise HTTPException(status_code=400, detail="phrase_id is required")
    if not payload.user_transcript.strip():
        raise HTTPException(status_code=400, detail="user_transcript is required")

    target_phrase = TARGET_PHRASES.get(payload.phrase_id)
    if not target_phrase:
        raise HTTPException(status_code=404, detail="Unknown phrase_id")

    result = _evaluation_service.evaluate(target_phrase, payload.user_transcript)
    return EvaluateResponse(**result)
