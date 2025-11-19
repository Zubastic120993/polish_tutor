"""Lesson flow service providing sequential tutor phrases."""

from typing import Dict, List, Tuple

LESSONS: Dict[str, List[Dict[str, str]]] = {
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
