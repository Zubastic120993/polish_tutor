"""Phase B: Speech recognition endpoint (stub)."""

from fastapi import APIRouter
from src.schemas.v2.speech import (
    SpeechRecognitionRequest,
    SpeechRecognitionResponse,
    WordTiming
)

router = APIRouter()

@router.post("/recognize", response_model=SpeechRecognitionResponse)
async def recognize_speech(payload: SpeechRecognitionRequest):
    """Stub Whisper STT endpoint — returns mock transcript."""
    return SpeechRecognitionResponse(
        transcript="mock transcript",
        words=[
            WordTiming(word="mock", start=0.0, end=0.5),
            WordTiming(word="transcript", start=0.5, end=1.0)
        ]
    )
