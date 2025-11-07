"""Tutor class for orchestrating conversation flow."""
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import Levenshtein

from src.core.lesson_manager import LessonManager
from src.models import Attempt
from src.services.database_service import Database
from src.services.feedback_engine import FeedbackEngine
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
        """Initialize Tutor.

        Args:
            lesson_manager: LessonManager instance
            feedback_engine: FeedbackEngine instance
            srs_manager: SRSManager instance
            speech_engine: SpeechEngine instance
            database: Database service instance
        """
        self.lesson_manager = lesson_manager or LessonManager()
        self.feedback_engine = feedback_engine or FeedbackEngine()
        self.srs_manager = srs_manager or SRSManager()
        self.speech_engine = speech_engine or SpeechEngine()
        self.database = database or Database()

        # Track consecutive low scores per user/phrase for auto-reveal
        self._consecutive_lows: Dict[Tuple[int, str], int] = {}

    def respond(
        self,
        user_id: int,
        text: str,
        lesson_id: str,
        dialogue_id: str,
        speed: float = 1.0,
        confidence: Optional[int] = None,
    ) -> Dict:
        """Process user input and generate tutor response.

        Args:
            user_id: User ID
            text: User's input text
            lesson_id: Current lesson ID
            dialogue_id: Current dialogue ID
            speed: Audio playback speed (0.75 or 1.0)
            confidence: Confidence slider value (1-5, optional)

        Returns:
            Response dictionary matching API specification
        """
        # Validate input
        if not text or not text.strip():
            return {
                "status": "error",
                "message": "Invalid input: text cannot be empty",
                "data": None,
            }

        # Load lesson and get current dialogue
        try:
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
        except Exception as e:
            logger.error(f"Error loading lesson: {e}")
            return {
                "status": "error",
                "message": f"Error loading lesson: {str(e)}",
                "data": None,
            }

        # Get expected phrases
        expected_phrases = dialogue.get("expected", [])

        # Track consecutive lows for auto-reveal
        consecutive_lows = self._consecutive_lows.get((user_id, dialogue_id), 0)

        # Generate feedback
        feedback = self.feedback_engine.generate_feedback(
            user_text=text,
            expected_phrases=expected_phrases,
            grammar=dialogue.get("grammar"),
            hint=dialogue.get("hint"),
            consecutive_lows=consecutive_lows,
        )

        # Update consecutive lows counter
        if feedback["feedback_type"] == "low":
            self._consecutive_lows[(user_id, dialogue_id)] = consecutive_lows + 1
        else:
            # Reset on non-low feedback
            self._consecutive_lows.pop((user_id, dialogue_id), None)

        # Determine next dialogue using branching logic
        next_dialogue_id = self._determine_next_dialogue(
            text, dialogue, lesson_data, feedback["score"]
        )

        # Get audio paths
        audio_paths = self._get_audio_paths(
            dialogue, lesson_id, dialogue_id, next_dialogue_id, speed
        )

        # Log attempt to database
        attempt_id = self._log_attempt(
            user_id=user_id,
            phrase_id=dialogue_id,
            user_text=text,
            score=feedback["score"],
            feedback_type=feedback["feedback_type"],
        )

        # Update SRS memory (convert score to quality 0-5)
        quality = self._score_to_quality(feedback["score"], feedback["feedback_type"])
        try:
            self.srs_manager.create_or_update_srs_memory(
                user_id=user_id,
                phrase_id=dialogue_id,
                quality=quality,
                confidence=confidence,
                database=self.database,
            )
        except Exception as e:
            logger.warning(f"Failed to update SRS memory: {e}")

        # Format response
        return {
            "status": "success",
            "message": feedback["reply_text"],
            "data": {
                "reply_text": feedback["reply_text"],
                "score": feedback["score"],
                "feedback_type": feedback["feedback_type"],
                "hint": feedback.get("hint"),
                "grammar_explanation": feedback.get("grammar_explanation"),
                "audio": audio_paths,
                "next_dialogue_id": next_dialogue_id,
                "show_answer": feedback.get("show_answer", False),
                "expected_phrase": feedback.get("expected_phrase"),
            },
            "metadata": {
                "attempt_id": attempt_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        }

    def _get_dialogue(self, lesson_data: Dict, dialogue_id: str) -> Optional[Dict]:
        """Get dialogue from lesson data.

        Args:
            lesson_data: Lesson data dictionary
            dialogue_id: Dialogue ID

        Returns:
            Dialogue dictionary or None if not found
        """
        dialogues = lesson_data.get("dialogues", [])
        for dialogue in dialogues:
            if dialogue.get("id") == dialogue_id:
                return dialogue
        return None

    def _determine_next_dialogue(
        self, user_text: str, dialogue: Dict, lesson_data: Dict, score: float
    ) -> Optional[str]:
        """Determine next dialogue using branching logic.

        Branching order:
        1. Exact string match (normalized)
        2. Fuzzy match (Levenshtein distance ≤ 2)
        3. Default branch

        Args:
            user_text: User's input text
            dialogue: Current dialogue dictionary
            lesson_data: Lesson data dictionary
            score: Feedback score

        Returns:
            Next dialogue ID or None
        """
        options = dialogue.get("options", [])
        if not options:
            # No options, try to find next dialogue in sequence
            dialogues = lesson_data.get("dialogues", [])
            current_idx = None
            for idx, d in enumerate(dialogues):
                if d.get("id") == dialogue.get("id"):
                    current_idx = idx
                    break
            if current_idx is not None and current_idx + 1 < len(dialogues):
                return dialogues[current_idx + 1].get("id")
            return None

        # Normalize user input
        normalized_input = self.feedback_engine.normalize_text(user_text)

        # Try exact match first
        for option in options:
            match_text = option.get("match", "")
            if match_text:
                normalized_match = self.feedback_engine.normalize_text(match_text)
                if normalized_input == normalized_match:
                    return option.get("next")

        # Try fuzzy match (Levenshtein distance ≤ 2)
        for option in options:
            match_text = option.get("match", "")
            if match_text:
                normalized_match = self.feedback_engine.normalize_text(match_text)
                distance = Levenshtein.distance(normalized_input, normalized_match)
                if distance <= 2:
                    return option.get("next")

        # Use default branch
        for option in options:
            if option.get("default", False):
                return option.get("next")

        return None

    def _get_audio_paths(
        self,
        dialogue: Dict,
        lesson_id: str,
        dialogue_id: str,
        next_dialogue_id: Optional[str],
        speed: float,
    ) -> List[str]:
        """Get audio file paths for response.

        Args:
            dialogue: Current dialogue dictionary
            lesson_id: Lesson ID
            dialogue_id: Current dialogue ID
            next_dialogue_id: Next dialogue ID (for tutor response)
            speed: Playback speed

        Returns:
            List of audio file paths (relative URLs)
        """
        audio_paths = []

        # Get audio for tutor's response text
        tutor_text = dialogue.get("tutor", "")
        if tutor_text:
            audio_path, _ = self.speech_engine.get_audio_path(
                text=tutor_text,
                lesson_id=lesson_id,
                phrase_id=dialogue_id,
                audio_filename=dialogue.get("audio"),
                speed=speed,
            )
            if audio_path:
                # Convert to relative URL
                rel_path = str(audio_path).replace("\\", "/")
                if rel_path.startswith("./"):
                    rel_path = rel_path[2:]
                audio_paths.append(f"/{rel_path}")

        return audio_paths

    def _log_attempt(
        self,
        user_id: int,
        phrase_id: str,
        user_text: str,
        score: float,
        feedback_type: str,
    ) -> Optional[int]:
        """Log attempt to database.

        Args:
            user_id: User ID
            phrase_id: Phrase ID
            user_text: User's input text
            score: Similarity score
            feedback_type: Feedback type (high/medium/low)

        Returns:
            Attempt ID or None if logging failed
        """
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
            return attempt.id
        except Exception as e:
            logger.error(f"Failed to log attempt: {e}")
            return None

    def _score_to_quality(self, score: float, feedback_type: str) -> int:
        """Convert feedback score to SRS quality (0-5).

        Args:
            score: Similarity score (0.0-1.0)
            feedback_type: Feedback type (high/medium/low)

        Returns:
            Quality score (0-5)
        """
        if feedback_type == "high":
            if score >= 0.95:
                return 5  # Perfect
            elif score >= 0.85:
                return 4  # Correct, easy
            else:
                return 3  # Correct, difficult
        elif feedback_type == "medium":
            return 2  # Incorrect, easy recall
        else:  # low
            if score < 0.3:
                return 0  # Complete blackout
            else:
                return 1  # Incorrect, remembered

