"""Lesson flow service providing sequential tutor phrases."""

from typing import Dict, List

LESSONS: Dict[str, List[Dict[str, str]]] = {
    "lesson_mock_001": [
        {"id": "p1", "pl": "Cześć!", "en": "Hi!"},
        {"id": "p2", "pl": "Jak się masz?", "en": "How are you?"},
        {"id": "p3", "pl": "Miłego dnia!", "en": "Have a good day!"},
    ]
}


class LessonFlowService:
    """In-memory lesson navigation helper (Phase B mock)."""

    def __init__(self, lessons: Dict[str, List[Dict[str, str]]] | None = None) -> None:
        self._lessons = lessons or LESSONS

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

        return {
            "lesson_id": lesson_id,
            "current_index": index,
            "total": total,
            "tutor_phrase": tutor_phrase,
            "expected_phrases": [tutor_phrase],
        }
