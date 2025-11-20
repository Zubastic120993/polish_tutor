"""Lesson flow service providing sequential tutor phrases."""

import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)

# Hardcoded lessons for testing
MOCK_LESSONS: Dict[str, List[Dict[str, str]]] = {
    "lesson_mock_001": [
        {"id": "p1", "pl": "Cześć!", "en": "Hi!"},
        {"id": "p2", "pl": "Jak się masz?", "en": "How are you?"},
        {"id": "p3", "pl": "Miłego dnia!", "en": "Have a good day!"},
    ],
    "p1": [
        {"id": "p1_1", "pl": "Cześć!", "en": "Hi!"},
        {"id": "p1_2", "pl": "Jak się masz?", "en": "How are you?"},
        {"id": "p1_3", "pl": "Dobrze, dziękuję!", "en": "Good, thank you!"},
        {"id": "p1_4", "pl": "Miło cię poznać.", "en": "Nice to meet you."},
    ],
}

# Path to lesson data files
PROJECT_ROOT = Path(__file__).resolve().parents[2]
LESSONS_DIR = PROJECT_ROOT / "data" / "lessons"


def _load_a1_lesson(lesson_id: str) -> List[Dict[str, str]] | None:
    """Load an A1 lesson from JSON file and convert to phrase format."""
    lesson_file = LESSONS_DIR / f"{lesson_id}.json"
    if not lesson_file.exists():
        return None

    try:
        with open(lesson_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Convert dialogues to phrases
        phrases: list[dict[str, str]] = []
        dialogues = data.get("dialogues", [])

        for dialogue in dialogues:
            phrase = {
                "id": dialogue.get("id", f"{lesson_id}_{len(phrases)}"),
                "pl": dialogue.get("tutor", ""),
                "en": dialogue.get("translation", ""),
            }
            phrases.append(phrase)

        logger.info(f"Loaded lesson {lesson_id} with {len(phrases)} phrases")
        return phrases

    except Exception as e:
        logger.error(f"Failed to load lesson {lesson_id}: {e}")
        return None


def _load_all_lessons() -> Dict[str, List[Dict[str, str]]]:
    """Load all lessons including mock lessons and A1 lessons from files."""
    lessons = dict(MOCK_LESSONS)

    # Load all A1 lessons (A1_L01 through A1_L60)
    for i in range(1, 61):
        lesson_id = f"A1_L{i:02d}"
        phrases = _load_a1_lesson(lesson_id)
        if phrases:
            lessons[lesson_id] = phrases

    # Also try to load coffee_001 if it exists
    coffee_phrases = _load_a1_lesson("coffee_001")
    if coffee_phrases:
        lessons["coffee_001"] = coffee_phrases

    logger.info(f"Loaded {len(lessons)} total lessons")
    return lessons


# Load lessons on module import
LESSONS = _load_all_lessons()


class LessonFlowService:
    """In-memory lesson navigation helper (Phase B mock)."""

    def __init__(self, lessons: Dict[str, List[Dict[str, str]]] | None = None) -> None:
        self._lessons = lessons or LESSONS
        self._phrase_lookup: Dict[str, Tuple[str, int, Dict[str, str]]] = {}
        for lesson_id, phrases in self._lessons.items():
            for index, phrase in enumerate(phrases):
                self._phrase_lookup[phrase["id"]] = (lesson_id, index, phrase)

    def get_next_phrase(self, lesson_id: str, index: int) -> Dict[str, object]:
        """
        Return metadata for the requested phrase.

        :raises KeyError: lesson not found
        :raises IndexError: index outside lesson range
        """
        lesson = self._lessons.get(lesson_id)
        if not lesson:
            raise KeyError(f"Unknown lesson_id '{lesson_id}'")

        total = len(lesson)
        if index < 0 or index >= total:
            raise IndexError(f"index {index} outside range 0..{total-1}")

        phrase = lesson[index]
        tutor_phrase = phrase["pl"]
        phrase_id = phrase.get("id", f"{lesson_id}_{index}")

        return {
            "lesson_id": lesson_id,
            "current_index": index,
            "total": total,
            "tutor_phrase": tutor_phrase,
            "expected_phrases": [tutor_phrase],
            "phrase_id": phrase_id,
        }

    def find_phrase(self, phrase_id: str) -> Tuple[str, int, Dict[str, str]]:
        """Return lesson metadata for a phrase id."""
        if phrase_id not in self._phrase_lookup:
            raise KeyError(f"Unknown phrase_id '{phrase_id}'")
        return self._phrase_lookup[phrase_id]

    def total_for_lesson(self, lesson_id: str) -> int:
        """Return total phrases for a lesson."""
        lesson = self._lessons.get(lesson_id)
        if not lesson:
            raise KeyError(f"Unknown lesson_id '{lesson_id}'")
        return len(lesson)

    def lesson_phrases(self, lesson_id: str) -> List[Dict[str, str]]:
        """Return immutable copy of lesson phrase metadata."""
        lesson = self._lessons.get(lesson_id)
        if not lesson:
            raise KeyError(f"Unknown lesson_id '{lesson_id}'")
        return [dict(phrase) for phrase in lesson]
