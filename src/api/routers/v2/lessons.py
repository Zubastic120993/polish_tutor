"""Lesson navigation endpoints for Phase B."""

from pathlib import Path
import logging
import shutil

from fastapi import APIRouter, HTTPException, Query

from src.schemas.v2.lessons import LessonMetaResponse, LessonNextResponse
from src.services.lesson_flow import LessonFlowService
from src.services.speech_engine import SpeechEngine

logger = logging.getLogger(__name__)

router = APIRouter()
_lesson_flow_service = LessonFlowService()

PROJECT_ROOT = Path(__file__).resolve().parents[4]
AUDIO_CACHE_V2_DIR = PROJECT_ROOT / "static" / "audio_cache_v2"
AUDIO_CACHE_V2_DIR.mkdir(parents=True, exist_ok=True)
_speech_engine = SpeechEngine(cache_dir=str(AUDIO_CACHE_V2_DIR))


def _ensure_phrase_audio(lesson_id: str, phrase_id: str, text: str) -> str:
    """Generate or retrieve cached audio for the given phrase."""
    target_path = AUDIO_CACHE_V2_DIR / f"{phrase_id}.mp3"
    if target_path.exists():
        return f"/audio_cache_v2/{target_path.name}"

    source_path_str = None
    try:
        source_path_str, _ = _speech_engine.get_audio_path(
            text=text, lesson_id=lesson_id, phrase_id=phrase_id
        )
    except Exception as exc:  # pragma: no cover - log + fallback
        logger.warning(
            "Failed to synthesize audio for %s:%s (%s)", lesson_id, phrase_id, exc
        )

    if source_path_str:
        source_path = Path(source_path_str)
        try:
            if source_path.exists():
                if source_path.resolve() == target_path.resolve():
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                else:
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(source_path, target_path)
        except OSError as exc:  # pragma: no cover
            logger.error("Unable to copy synthesized audio for %s: %s", phrase_id, exc)

    if not target_path.exists():
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.touch()

    return f"/audio_cache_v2/{target_path.name}"


@router.get("/{lesson_id}", response_model=LessonMetaResponse)
async def get_lesson_manifest(lesson_id: str) -> LessonMetaResponse:
    """Return lesson manifest (ids + translations)."""
    try:
        phrases = _lesson_flow_service.lesson_phrases(lesson_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown lesson_id") from None

    return LessonMetaResponse(
        lesson_id=lesson_id,
        phrases=[
            {
                "id": phrase["id"],
                "pl": phrase["pl"],
                "en": phrase.get("en", ""),
            }
            for phrase in phrases
        ],
    )


@router.get("/{lesson_id}/next", response_model=LessonNextResponse)
async def get_next_phrase(
    lesson_id: str, index: int = Query(0, ge=0)
) -> LessonNextResponse:
    """Return the tutor phrase at the requested index."""
    try:
        result = _lesson_flow_service.get_next_phrase(lesson_id, index)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown lesson_id") from None
    except IndexError:
        raise HTTPException(status_code=400, detail="index out of range") from None

    phrase_id = result.pop("phrase_id", f"{lesson_id}_{result['current_index']}")
    audio_url = result.get("audio_url")
    if audio_url:
        filename = Path(audio_url).name
        result["audio_url"] = f"/audio_cache_v2/{filename}"
    else:
        result["audio_url"] = _ensure_phrase_audio(
            lesson_id, phrase_id, result["tutor_phrase"]
        )

    return LessonNextResponse(**result)
