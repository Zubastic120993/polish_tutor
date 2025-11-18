"""Phase B: Speech recognition endpoint backed by OpenAI STT."""

from fastapi import APIRouter, HTTPException, status

from src.schemas.v2.speech import (
    SpeechRecognitionRequest,
    SpeechRecognitionResponse,
)
from src.services.whisper_stt import WhisperSTTService

router = APIRouter()
stt_service = WhisperSTTService()


@router.post("/recognize", response_model=SpeechRecognitionResponse)
async def recognize_speech(
    payload: SpeechRecognitionRequest,
) -> SpeechRecognitionResponse:
    """Transcribe learner audio using OpenAI's STT service."""
    try:
        return stt_service.transcribe_base64(payload.audio_base64)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
