"""Session Manager for user conversation state."""
import logging
from typing import Dict, Optional, Set
import difflib
import Levenshtein

from src.core.lesson_manager import LessonManager

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages user session state and conversation context."""

    def __init__(self, lesson_manager: Optional[LessonManager] = None):
        """Initialize Session Manager.

        Args:
            lesson_manager: Lesson manager instance
        """
        self.lesson_manager = lesson_manager or LessonManager()

        # Cache for known lesson IDs
        self._known_lesson_ids: Optional[Set[str]] = None

    def get_dialogue(self, lesson_data: Dict, dialogue_id: str) -> Optional[Dict]:
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

    def determine_next_dialogue(
        self, user_text: str, current_dialogue: Dict, lesson_data: Dict, score: float
    ) -> Optional[str]:
        """Determine next dialogue using branching logic.

        Branching order:
        1. Exact string match (normalized)
        2. Fuzzy match (Levenshtein distance ≤ 2)
        3. Default branch

        Args:
            user_text: User's input text
            current_dialogue: Current dialogue data
            lesson_data: Full lesson data
            score: Feedback score (0-1)

        Returns:
            Next dialogue ID or None
        """
        branches = current_dialogue.get("branches", [])

        # Normalize user input
        normalized_input = self._normalize_text(user_text)

        # 1. Check exact string matches
        for branch in branches:
            if branch.get("condition") == "exact":
                expected = self._normalize_text(branch.get("expected", ""))
                if normalized_input == expected:
                    return branch.get("next")

        # 2. Check fuzzy matches (Levenshtein distance ≤ 2)
        for branch in branches:
            if branch.get("condition") == "fuzzy":
                expected = self._normalize_text(branch.get("expected", ""))
                distance = Levenshtein.distance(normalized_input, expected)
                if distance <= 2:
                    return branch.get("next")

        # 3. Score-based branching
        for branch in branches:
            if branch.get("condition") == "score":
                threshold = branch.get("threshold", 0.0)
                if score >= threshold:
                    return branch.get("next")

        # 4. Default branch
        for branch in branches:
            if branch.get("condition") == "default":
                return branch.get("next")

        # No valid next dialogue found
        return None

    def get_audio_paths(
        self,
        dialogue: Dict,
        lesson_id: str,
        dialogue_id: str,
        next_dialogue_id: Optional[str],
        speed: float = 1.0
    ) -> Dict[str, str]:
        """Get audio file paths for dialogue.

        Args:
            dialogue: Current dialogue data
            lesson_id: Lesson ID
            dialogue_id: Current dialogue ID
            next_dialogue_id: Next dialogue ID
            speed: Audio speed multiplier

        Returns:
            Dictionary with 'current' and optional 'next' audio paths
        """
        audio_paths = {}

        # Current dialogue audio
        current_audio = dialogue.get("audio")
        if current_audio:
            audio_paths["current"] = f"/audio_cache/{current_audio}"

        # Next dialogue preview audio (if available)
        if next_dialogue_id:
            try:
                lesson_data = self.lesson_manager.get_lesson(lesson_id)
                if lesson_data:
                    next_dialogue = self.get_dialogue(lesson_data, next_dialogue_id)
                    if next_dialogue and next_dialogue.get("audio"):
                        audio_paths["next"] = f"/audio_cache/{next_dialogue['audio']}"
            except Exception as e:
                logger.warning(f"Could not load next dialogue audio: {e}")

        return audio_paths

    def get_known_lesson_ids(self) -> Set[str]:
        """Get set of all known lesson IDs."""
        if self._known_lesson_ids is None:
            try:
                catalog = self.lesson_manager.get_catalog()
                self._known_lesson_ids = set(lesson.get("id", "") for lesson in catalog)
            except Exception as e:
                logger.error(f"Error loading lesson catalog: {e}")
                self._known_lesson_ids = set()
        return self._known_lesson_ids

    def is_lesson_request(self, text: str) -> Optional[str]:
        """Check if text contains a lesson request."""
        return self._detect_direct_lesson_request(text)

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

    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        if not text:
            return ""
        # Convert to lowercase, strip whitespace, normalize punctuation
        import re
        text = text.lower().strip()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Normalize common punctuation
        text = re.sub(r'[.!?]+$', '', text)
        return text
