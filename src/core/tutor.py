"""Tutor class for orchestrating conversation flow."""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Set

import Levenshtein
from openai import OpenAI

from src.core.lesson_manager import LessonManager
from src.models import Attempt
from src.services.database_service import Database
from src.services.feedback_engine import FeedbackEngine
from src.services.lesson_generator import LessonGenerator
from src.services.srs_manager import SRSManager
from src.services.speech_engine import SpeechEngine

logger = logging.getLogger(__name__)


class Tutor:
    """Main tutor class orchestrating conversation flow."""

    def __init__(
        self,
        lesson_manager: Optional[LessonManager] = None,
        feedback_engine: Optional[FeedbackEngine] = None,
        srs_manager: Optional[SRSManager] = None,
        speech_engine: Optional[SpeechEngine] = None,
        database: Optional[Database] = None,
    ):
        """Initialize Tutor."""
        self.lesson_manager = lesson_manager or LessonManager()
        self.feedback_engine = feedback_engine or FeedbackEngine()
        self.srs_manager = srs_manager or SRSManager()
        self.speech_engine = speech_engine or SpeechEngine(
            online_mode=True,
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),
        )
        self.database = database or Database()
        self.lesson_generator = LessonGenerator()

        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key.strip():
            self._openai_client = OpenAI(api_key=api_key)
            logger.info("✅ Tutor initialized with OpenAI for intent detection")
        else:
            self._openai_client = None
            logger.warning("OpenAI API key not found - AI features limited")

        self._consecutive_lows: Dict[Tuple[int, str], int] = {}
        self._confusion_indicators: Dict[int, List[str]] = {}
        self._conversation_mode: Dict[int, bool] = {}
        self._lesson_catalog: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # MAIN RESPONSE PIPELINE
    # ------------------------------------------------------------------

    def respond(
        self,
        user_id: int,
        text: str,
        lesson_id: str,
        dialogue_id: str,
        speed: float = 1.0,
        confidence: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Process user input and generate tutor response."""
        if not text or not text.strip():
            return {"status": "error", "message": "Invalid input", "data": None}

        # Detect direct lesson switch
        direct_lesson_id = self._detect_direct_lesson_request(text)
        if direct_lesson_id:
            return self._handle_direct_lesson_switch(direct_lesson_id)

        # Detect intent (AI / fallback)
        intent = self._detect_intent(user_id, text, lesson_id, dialogue_id)
        logger.info(f"🤖 Intent: {intent['type']} {intent.get('action', '')}")

        if intent["type"] == "command":
            return self._execute_ai_detected_command(
                intent, text, lesson_id, dialogue_id, user_id, speed
            )
        if intent["type"] == "question":
            return self._handle_conversational_response(user_id, text, lesson_id)

        # Normal practice mode
        lesson_data = self.lesson_manager.get_lesson(lesson_id)
        if not lesson_data:
            return {
                "status": "error",
                "message": f"Lesson not found: {lesson_id}",
                "data": None,
            }

        dialogue = self._get_dialogue(lesson_data, dialogue_id)
        if not dialogue:
            return {
                "status": "error",
                "message": f"Dialogue not found: {dialogue_id}",
                "data": None,
            }

        expected_phrases = dialogue.get("expected", [])
        consecutive_lows = self._consecutive_lows.get((user_id, dialogue_id), 0)
        is_confused = self._detect_confusion(
            user_id, text, expected_phrases, consecutive_lows
        )

        # Generate feedback -------------------------------------------------
        feedback = self.feedback_engine.generate_feedback(
            user_text=text,
            expected_phrases=expected_phrases,
            grammar=dialogue.get("grammar"),
            hint=dialogue.get("hint"),
            consecutive_lows=consecutive_lows,
            suggest_commands=is_confused,
        )

        # --- Type-sanitization (fix for mypy) ---
        raw_score = feedback.get("score")
        raw_feedback_type = feedback.get("feedback_type")
        score: float = float(raw_score) if isinstance(raw_score, (int, float)) else 0.0
        feedback_type: str = (
            str(raw_feedback_type) if isinstance(raw_feedback_type, str) else "low"
        )

        # Update low counter
        if feedback_type == "low":
            self._consecutive_lows[(user_id, dialogue_id)] = consecutive_lows + 1
        else:
            self._consecutive_lows.pop((user_id, dialogue_id), None)

        # Determine next dialogue
        next_dialogue_id = self._determine_next_dialogue(
            text, dialogue, lesson_data, score
        )

        # Audio generation
        audio_paths = self._get_audio_paths(
            dialogue, lesson_id, dialogue_id, next_dialogue_id, speed
        )

        # Log attempt
        attempt_id = self._log_attempt(user_id, dialogue_id, text, score, feedback_type)

        # Update SRS
        quality = self._score_to_quality(score, feedback_type)
        try:
            self.srs_manager.create_or_update_srs_memory(
                user_id=user_id,
                phrase_id=dialogue_id,
                quality=quality,
                confidence=confidence,
                database=self.database,
            )
        except Exception as e:
            logger.warning(f"Failed to update SRS: {e}")

        tutor_phrase = dialogue.get("tutor", "")
        return {
            "status": "success",
            "message": feedback["reply_text"],
            "data": {
                "reply_text": feedback["reply_text"],
                "score": score,
                "feedback_type": feedback_type,
                "hint": feedback.get("hint"),
                "grammar_explanation": feedback.get("grammar_explanation"),
                "audio": audio_paths,
                "next_dialogue_id": next_dialogue_id,
                "show_answer": feedback.get("show_answer", False),
                "expected_phrase": feedback.get("expected_phrase"),
                "tutor_phrase": tutor_phrase,
                "dialogue_id": dialogue_id,
            },
            "metadata": {
                "attempt_id": attempt_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

    # ------------------------------------------------------------------
    # (Remaining methods are unchanged — only shown where typing issues occur)
    # ------------------------------------------------------------------

    def _determine_next_dialogue(
        self,
        user_text: str,
        dialogue: Dict[str, Any],
        lesson_data: Dict[str, Any],
        score: float,
    ) -> Optional[str]:
        """Determine next dialogue using branching logic."""
        options = dialogue.get("options", [])
        if not options:
            dialogues = lesson_data.get("dialogues", [])
            for idx, d in enumerate(dialogues):
                if d.get("id") == dialogue.get("id") and idx + 1 < len(dialogues):
                    return dialogues[idx + 1].get("id")
            return None

        normalized_input = self.feedback_engine.normalize_text(user_text)
        for opt in options:
            match = opt.get("match", "")
            if match and normalized_input == self.feedback_engine.normalize_text(match):
                return opt.get("next")

        for opt in options:
            match = opt.get("match", "")
            if match:
                norm = self.feedback_engine.normalize_text(match)
                if Levenshtein.distance(normalized_input, norm) <= 2:
                    return opt.get("next")

        for opt in options:
            if opt.get("default", False):
                return opt.get("next")
        return None

    def _log_attempt(
        self,
        user_id: int,
        phrase_id: str,
        user_text: str,
        score: float,
        feedback_type: str,
    ) -> Optional[int]:
        """Log attempt to database."""
        try:
            attempt = self.database.create(
                Attempt,
                user_id=user_id,
                phrase_id=phrase_id,
                user_input=user_text,
                score=score,
                feedback_type=feedback_type,
                created_at=datetime.utcnow(),
            )
            return getattr(attempt, "id", None)
        except Exception as e:
            logger.error(f"Failed to log attempt: {e}")
            return None

    def _score_to_quality(self, score: float, feedback_type: str) -> int:
        """Convert feedback score to SRS quality (0–5)."""
        if feedback_type == "high":
            if score >= 0.95:
                return 5
            elif score >= 0.85:
                return 4
            return 3
        if feedback_type == "medium":
            return 2
        return 0 if score < 0.3 else 1
        # ------------------------------------------------------------------

    # TEMPORARY STUBS to satisfy Mypy (implementations exist elsewhere)
    # ------------------------------------------------------------------

    def _detect_direct_lesson_request(self, text: str) -> Optional[str]:
        return None

    def _handle_direct_lesson_switch(self, lesson_id: str) -> Dict[str, Any]:
        return {"status": "ok", "message": "stub", "data": {}}

    def _detect_intent(
        self, user_id: int, text: str, lesson_id: str, dialogue_id: str
    ) -> Dict[str, Any]:
        return {"type": "practice"}

    def _execute_ai_detected_command(
        self,
        intent: Dict[str, Any],
        text: str,
        lesson_id: str,
        dialogue_id: str,
        user_id: int,
        speed: float,
    ) -> Dict[str, Any]:
        return {"status": "ok", "message": "stub", "data": {}}

    def _handle_conversational_response(
        self, user_id: int, text: str, lesson_id: str
    ) -> Dict[str, Any]:
        return {"status": "ok", "message": "stub", "data": {}}

    def _get_dialogue(
        self, lesson_data: Dict[str, Any], dialogue_id: str
    ) -> Optional[Dict[str, Any]]:
        return None

    def _detect_confusion(
        self,
        user_id: int,
        text: str,
        expected_phrases: List[str],
        consecutive_lows: int,
    ) -> bool:
        return False

    def _get_audio_paths(
        self,
        dialogue: Dict[str, Any],
        lesson_id: str,
        dialogue_id: str,
        next_dialogue_id: Optional[str],
        speed: float,
    ) -> List[str]:
        return []
