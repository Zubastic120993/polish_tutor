"""Phase B: Whisper STT stub service."""

from pathlib import Path


class WhisperSTTService:
    """
    Stub for speech-to-text recognition.
    Step 6: Define function signatures only.
    """

    def transcribe(self, audio_path: Path) -> dict:
        """
        Accepts an audio file and returns a STUB transcript.
        NOTE: Real Whisper integration will be added in Step 7–10.
        """
        return {"transcript": "stub transcript", "words": []}
