"""Agent Orchestrator for conversation flow management."""
import logging
from typing import Dict, Optional
from datetime import datetime

from src.core.lesson_manager import LessonManager
from src.services.database_service import Database
from src.services.feedback_engine import FeedbackEngine
from src.services.srs_manager import SRSManager
from src.services.speech_engine import SpeechEngine

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Main orchestrator for AI agent conversation flow."""

    def __init__(
        self,
        lesson_manager: Optional[LessonManager] = None,
        feedback_engine: Optional[FeedbackEngine] = None,
        srs_manager: Optional[SRSManager] = None,
        speech_engine: Optional[SpeechEngine] = None,
        database: Optional[Database] = None,
    ):
        """Initialize Agent Orchestrator.

        Args:
            lesson_manager: Lesson manager instance
            feedback_engine: Feedback engine instance
            srs_manager: SRS manager instance
            speech_engine: Speech engine instance
            database: Database service instance
        """
        self.lesson_manager = lesson_manager or LessonManager()
        self.feedback_engine = feedback_engine or FeedbackEngine()
        self.srs_manager = srs_manager or SRSManager()
        self.speech_engine = speech_engine or SpeechEngine()
        self.database = database or Database()

        # Track consecutive low scores for auto-reveal logic
        self._consecutive_lows: Dict[tuple, int] = {}

    def process_message(
        self,
        user_id: int,
        text: str,
        lesson_id: str,
        dialogue_id: str,
        speed: float = 1.0,
        confidence: Optional[int] = None,
    ) -> Dict:
        """Process user message and generate response.

        Args:
            user_id: User ID
            text: User's input text
            lesson_id: Current lesson ID
            dialogue_id: Current dialogue ID
            speed: Audio playback speed
            confidence: Confidence slider value

        Returns:
            Response dictionary
        """
        # Validate input
        if not text or not text.strip():
            return {
                "status": "error",
                "message": "Invalid input: text cannot be empty",
                "data": None,
            }

        # Check for direct lesson selection
        direct_lesson_id = self._detect_direct_lesson_request(text)
        if direct_lesson_id:
            logger.info(f"📘 User requested lesson '{direct_lesson_id}' directly")
            return self._handle_direct_lesson_switch(direct_lesson_id)

        # Detect intent using AI
        intent = self._detect_intent(user_id, text, lesson_id, dialogue_id)
        logger.info(f"🤖 AI detected intent: {intent['type']} - {intent.get('action', 'N/A')}")

        # Route based on intent
        if intent['type'] == 'command':
            return self._execute_command(intent, text, lesson_id, dialogue_id, user_id, speed)
        elif intent['type'] == 'question':
            return self._handle_conversational_response(user_id, text, lesson_id)

        # Default: practice mode - continue with lesson evaluation
        return self._process_practice_response(user_id, text, lesson_id, dialogue_id, speed, confidence)

    def _detect_direct_lesson_request(self, text: str) -> Optional[str]:
        """Detect if user is requesting a specific lesson by ID."""
        import re
        # Match patterns like "lesson L01", "L01", "lesson 1", etc.
        patterns = [
            r'\blesson\s+(L\d+|\d+)\b',
            r'\b(L\d+)\b',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                lesson_id = match.group(1) if match.group(1).startswith('L') else f"L{match.group(1).zfill(2)}"
                return lesson_id
        return None

    def _handle_direct_lesson_switch(self, lesson_id: str) -> Dict:
        """Handle direct lesson selection."""
        try:
            lesson_data = self.lesson_manager.get_lesson(lesson_id)
            if not lesson_data:
                raise FileNotFoundError(f"Lesson not found: {lesson_id}")

            title = lesson_data.get("title") or lesson_id
            level = lesson_data.get("level")
            description = lesson_data.get("description", "")

            response_text = f"📘 **{title}**"
            if level:
                response_text += f" (Level {level})"
            if description:
                response_text += f"\n{description}"

            # Get first dialogue ID
            dialogues = lesson_data.get("dialogues", [])
            first_dialogue_id = dialogues[0].get("id") if dialogues else None

            if not first_dialogue_id:
                return {
                    "status": "error",
                    "message": f"No dialogues found in lesson {lesson_id}",
                    "data": None,
                }

            return {
                "status": "success",
                "message": response_text,
                "data": {
                    "reply_text": response_text,
                    "lesson_switched": True,
                    "new_lesson_id": lesson_id,
                    "next_dialogue_id": first_dialogue_id,
                    "dialogue_id": first_dialogue_id,
                },
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                },
            }
        except Exception as e:
            logger.error(f"Error switching to lesson {lesson_id}: {e}")
            return {
                "status": "error",
                "message": f"Could not switch to lesson {lesson_id}: {str(e)}",
                "data": None,
            }

    def _detect_intent(self, user_id: int, text: str, lesson_id: str, dialogue_id: str) -> Dict:
        """Detect user intent using AI (placeholder for now)."""
        # TODO: Implement AI intent detection
        # For now, return practice intent as default
        return {
            "type": "practice",
            "confidence": 1.0,
        }

    def _execute_command(self, intent: Dict, text: str, lesson_id: str, dialogue_id: str, user_id: int, speed: float) -> Dict:
        """Execute detected command."""
        # TODO: Implement command execution
        return {
            "status": "error",
            "message": "Command execution not yet implemented",
            "data": None,
        }

    def _handle_conversational_response(self, user_id: int, text: str, lesson_id: str) -> Dict:
        """Handle conversational questions."""
        # TODO: Implement conversational response
        return {
            "status": "error",
            "message": "Conversational responses not yet implemented",
            "data": None,
        }

    def _process_practice_response(self, user_id: int, text: str, lesson_id: str, dialogue_id: str, speed: float, confidence: Optional[int]) -> Dict:
        """Process practice mode response."""
        # TODO: Implement practice response processing
        return {
            "status": "error",
            "message": "Practice response processing not yet implemented",
            "data": None,
        }
