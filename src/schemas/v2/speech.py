"""Pydantic models for speech recognition endpoints."""

from typing import List

from pydantic import BaseModel


class SpeechRecognitionRequest(BaseModel):
    """Payload containing a Base64-encoded microphone recording."""

    audio_base64: str


class WordTiming(BaseModel):
    """Timing metadata for each recognized word in the transcript."""

    word: str
    start: float
    end: float


class SpeechRecognitionResponse(BaseModel):
    """Response containing the transcript and per-word timing."""

    transcript: str
    words: List[WordTiming]
