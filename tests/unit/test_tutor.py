from typing import Dict, Optional, Any, Tuple
from difflib import SequenceMatcher

import pytest

from src.core.tutor import Tutor


class StubFeedbackEngine:
    def __init__(
        self,
        feedback_response: Optional[Dict[str, Any]] = None,
        conversational_response: str = "Jasne, porozmawiajmy!",
    ):
        self.feedback_response = feedback_response or {
            "feedback_type": "high",
            "score": 0.98,
            "reply_text": "Świetnie!",
            "hint": None,
            "grammar_explanation": None,
            "show_answer": False,
            "expected_phrase": None,
        }
        self.conversational_response = conversational_response
        self.last_generate_feedback_args: Optional[Dict[str, Any]] = None

    def normalize_text(self, text: str) -> str:
        return text.lower().strip()

    def calculate_similarity(self, text: str, expected: str) -> float:
        return SequenceMatcher(
            None, self.normalize_text(text), self.normalize_text(expected)
        ).ratio()

    def generate_feedback(self, **kwargs: Any) -> Dict[str, Any]:
        self.last_generate_feedback_args = kwargs
        return self.feedback_response

    def generate_conversational_response(
        self, user_text: str, user_id: int, lesson_context: Optional[str]
    ) -> str:
        return self.conversational_response


class StubLessonManager:
    def __init__(
        self,
        lessons: Optional[Dict[str, Dict]] = None,
        catalog: Optional[list] = None,
        all_lessons: Optional[Dict[str, Dict]] = None,
    ):
        self._lessons = lessons or {}
        self._catalog = catalog or []
        self._all_lessons = all_lessons

    def get_lesson(self, lesson_id: str) -> Optional[Dict]:
        return self._lessons.get(lesson_id)

    def load_lesson_catalog(self) -> list:
        return list(self._catalog)

    def load_all_lessons(self, validate: bool = True) -> Dict[str, Dict]:
        if self._all_lessons is not None:
            return dict(self._all_lessons)
        return dict(self._lessons)


class StubSpeechEngine:
    def __init__(
        self, audio_map: Optional[Dict[str, Tuple[Optional[str], str]]] = None
    ):
        self.audio_map = audio_map or {}

    def get_audio_path(self, *, phrase_id: str, **__) -> Tuple[Optional[str], str]:
        return self.audio_map.get(phrase_id, (None, "unavailable"))


class StubSRSManager:
    def __init__(self):
        self.calls = []

    def create_or_update_srs_memory(self, **kwargs: Any):
        self.calls.append(kwargs)


class StubDatabase:
    def __init__(self, attempt_id: int = 1):
        self.attempt_id = attempt_id
        self.records = []

    def create(self, model, **kwargs: Any):
        self.records.append((model, kwargs))

        class Result:
            def __init__(self, attempt_id: int):
                self.id = attempt_id

        return Result(self.attempt_id)


class StubLessonGenerator:
    def __init__(self, can_generate: bool):
        self._can_generate = can_generate

    def can_generate(self) -> bool:
        return self._can_generate


def _build_tutor(
    lessons: Dict[str, Dict],
    *,
    feedback_engine: Optional[StubFeedbackEngine] = None,
    lesson_manager: Optional[StubLessonManager] = None,
    speech_engine: Optional[StubSpeechEngine] = None,
    srs_manager: Optional[StubSRSManager] = None,
    database: Optional[StubDatabase] = None,
) -> Tutor:
    return Tutor(
        lesson_manager=lesson_manager or StubLessonManager(lessons),
        feedback_engine=feedback_engine or StubFeedbackEngine(),
        srs_manager=srs_manager or StubSRSManager(),
        speech_engine=speech_engine or StubSpeechEngine(),
        database=database or StubDatabase(),
    )


def test_determine_next_dialogue_prefers_exact_match():
    dialogue = {
        "id": "turn_1",
        "options": [
            {"match": "Świetnie", "next": "turn_exact"},
            {"match": "Świentie", "next": "turn_fuzzy"},
            {"next": "turn_default", "default": True},
        ],
    }
    lesson_data = {"dialogues": [dialogue, {"id": "turn_exact"}]}

    tutor = _build_tutor({"lesson_a": lesson_data})
    next_id = tutor._determine_next_dialogue(
        " świetnie ", dialogue, lesson_data, score=1.0
    )

    assert next_id == "turn_exact"


def test_determine_next_dialogue_uses_fuzzy_match_when_close():
    dialogue = {
        "id": "turn_1",
        "options": [
            {"match": "Świetnie", "next": "turn_exact"},
            {"match": "Świentie", "next": "turn_fuzzy"},
            {"next": "turn_default", "default": True},
        ],
    }
    lesson_data = {"dialogues": [dialogue, {"id": "turn_fuzzy"}]}

    tutor = _build_tutor({"lesson_a": lesson_data})
    next_id = tutor._determine_next_dialogue(
        "swientie", dialogue, lesson_data, score=0.8
    )

    assert next_id == "turn_fuzzy"


def test_determine_next_dialogue_falls_back_to_default():
    dialogue = {
        "id": "turn_1",
        "options": [
            {"match": "Tak", "next": "turn_yes"},
            {"next": "turn_default", "default": True},
        ],
    }
    lesson_data = {"dialogues": [dialogue, {"id": "turn_default"}]}

    tutor = _build_tutor({"lesson_a": lesson_data})
    next_id = tutor._determine_next_dialogue(
        "nie wiem", dialogue, lesson_data, score=0.2
    )

    assert next_id == "turn_default"


def test_determine_next_dialogue_without_options_advances_sequentially():
    dialogue = {
        "id": "turn_1",
        "options": [],
    }
    next_dialogue = {"id": "turn_2", "options": []}
    lesson_data = {"dialogues": [dialogue, next_dialogue]}

    tutor = _build_tutor({"lesson_a": lesson_data})
    next_id = tutor._determine_next_dialogue(
        "cokolwiek", dialogue, lesson_data, score=0.5
    )

    assert next_id == "turn_2"


@pytest.mark.parametrize(
    "score,feedback_type,expected",
    [
        (0.97, "high", 5),
        (0.9, "high", 4),
        (0.8, "high", 3),
        (0.6, "medium", 2),
        (0.2, "low", 0),
        (0.4, "low", 1),
    ],
)
def test_score_to_quality_mapping(score, feedback_type, expected):
    tutor = _build_tutor({"lesson_a": {"dialogues": []}})
    assert tutor._score_to_quality(score, feedback_type) == expected


def test_respond_rejects_empty_input(monkeypatch):
    tutor = _build_tutor({"lesson_a": {"dialogues": []}})
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = tutor.respond(
        user_id=1, text="   ", lesson_id="lesson_a", dialogue_id="turn_1"
    )

    assert result["status"] == "error"
    assert "text cannot be empty" in result["message"]


def test_respond_handles_direct_lesson_request(monkeypatch):
    lessons = {
        "A1_L01": {
            "title": "Powitania",
            "level": "A1",
            "dialogues": [
                {
                    "id": "turn_1",
                    "tutor": "Cześć",
                    "expected": ["Cześć"],
                    "options": [],
                },
            ],
        }
    }
    lesson_manager = StubLessonManager(
        lessons, catalog=[{"id": "A1_L01", "title_pl": "Powitania"}]
    )
    tutor = _build_tutor(lessons, lesson_manager=lesson_manager)
    tutor.lesson_generator = StubLessonGenerator(can_generate=False)
    tutor._lesson_catalog = lesson_manager.load_lesson_catalog()
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = tutor.respond(
        user_id=5,
        text="Can we do A1_L01 next?",
        lesson_id="A1_L01",
        dialogue_id="turn_1",
    )

    assert result["status"] == "success"
    assert result["data"]["command"] == "load_lesson"
    assert result["data"]["lesson_id"] == "A1_L01"


def test_respond_logs_attempt_and_updates_srs(monkeypatch):
    lessons = {
        "lesson_a": {
            "dialogues": [
                {
                    "id": "turn_1",
                    "tutor": "Dzień dobry",
                    "expected": ["Dzień dobry"],
                    "options": [{"next": "turn_2", "default": True}],
                },
                {
                    "id": "turn_2",
                    "tutor": "Jak się masz?",
                    "expected": ["W porządku"],
                    "options": [],
                },
            ]
        }
    }
    feedback = StubFeedbackEngine(
        feedback_response={
            "feedback_type": "low",
            "score": 0.25,
            "reply_text": "Spróbuj jeszcze raz.",
            "hint": "Powiedz 'Dzień dobry'",
            "grammar_explanation": None,
            "show_answer": True,
            "expected_phrase": "Dzień dobry",
        }
    )
    srs_manager = StubSRSManager()
    database = StubDatabase(attempt_id=42)
    speech_engine = StubSpeechEngine(
        audio_map={
            "turn_1": ("static/audio/turn_1.mp3", "cache"),
            "turn_2": ("static/audio/turn_2.mp3", "cache"),
        }
    )
    lesson_manager = StubLessonManager(lessons)

    tutor = _build_tutor(
        lessons,
        feedback_engine=feedback,
        lesson_manager=lesson_manager,
        srs_manager=srs_manager,
        database=database,
        speech_engine=speech_engine,
    )
    tutor.lesson_generator = StubLessonGenerator(can_generate=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    tutor._detect_intent = lambda *_, **__: {"type": "practice"}

    response = tutor.respond(
        user_id=7,
        text="Źle mówię",
        lesson_id="lesson_a",
        dialogue_id="turn_1",
        speed=1.0,
        confidence=3,
    )

    assert response["status"] == "success"
    assert response["data"]["next_dialogue_id"] == "turn_2"
    assert response["metadata"]["attempt_id"] == 42
    assert "/static/audio/turn_1.mp3" in response["data"]["audio"]
    assert tutor._consecutive_lows[(7, "turn_1")] == 1
    assert srs_manager.calls[0]["quality"] == 0
    assert srs_manager.calls[0]["confidence"] == 3


def test_execute_ai_detected_command_change_topic_needs_info(monkeypatch):
    lessons = {
        "A1_L01": {
            "dialogues": [
                {"id": "turn_1", "tutor": "Cześć", "expected": [], "options": []}
            ]
        }
    }
    lesson_manager = StubLessonManager(
        lessons,
        catalog=[
            {"id": "A1_L01", "title_pl": "Powitania", "title_en": "Greetings"},
            {"id": "A1_L02", "title_pl": "Zakupy", "title_en": "Shopping"},
        ],
    )
    tutor = _build_tutor(lessons, lesson_manager=lesson_manager)
    tutor.lesson_generator = StubLessonGenerator(can_generate=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    intent = {
        "type": "command",
        "action": "change_topic",
        "ai_response": "Which topic interests you?",
        "needs_info": True,
    }

    result = tutor._execute_ai_detected_command(
        intent=intent,
        text="show me lessons",
        lesson_id="A1_L01",
        dialogue_id="turn_1",
        user_id=99,
        speed=1.0,
    )

    assert result["status"] == "success"
    assert "📚 Here's a quick list" in result["message"]
    assert "Powitania" in result["message"]
    assert result["data"]["command"] == "chat"


def test_detect_direct_lesson_request():
    tutor = _build_tutor({})
    tutor._get_known_lesson_ids = lambda: {"A1_L01", "A1_L02", "B1_L05"}

    # Should detect lesson IDs
    assert tutor._detect_direct_lesson_request("Can we do A1_L01?") == "A1_L01"
    assert tutor._detect_direct_lesson_request("Let's try B1_L05") == "B1_L05"

    # Should not detect unknown lesson IDs
    assert tutor._detect_direct_lesson_request("Let's do C2_L10") is None
    assert tutor._detect_direct_lesson_request("Hello there") is None


def test_is_catalog_request():
    tutor = _build_tutor({})

    # Should detect catalog requests
    assert tutor._is_catalog_request("show me lessons") is True
    assert tutor._is_catalog_request("what lessons are available") is True
    assert tutor._is_catalog_request("list all lessons") is True
    assert tutor._is_catalog_request("catalog") is True

    # Should not detect non-catalog requests
    assert tutor._is_catalog_request("hello") is False
    assert tutor._is_catalog_request("let's practice") is False


def test_get_known_lesson_ids():
    # Set up catalog as flattened list (same format as load_lesson_catalog returns)
    catalog = [
        {"id": "A1_L01", "title_pl": "Powitania", "status": "completed"},
        {"id": "A1_L02", "title_pl": "Przedstawianie", "status": "completed"},
        {"id": "B1_L03", "title_pl": "Zaawansowane", "status": "pending"},
    ]
    lesson_manager = StubLessonManager(catalog=catalog)
    tutor = _build_tutor({}, lesson_manager=lesson_manager)

    known_ids = tutor._get_known_lesson_ids()
    assert known_ids == {
        "A1_L01",
        "A1_L02",
        "B1_L03",
        "a1_l01",
        "a1_l02",
        "b1_l03",
        "A1_L01",
        "A1_L02",
        "B1_L03",
    }


def test_get_dialogue():
    lesson_data = {
        "dialogues": [
            {"id": "turn_1", "tutor": "Hello"},
            {"id": "turn_2", "tutor": "How are you?"},
        ]
    }
    tutor = _build_tutor({})

    # Should find existing dialogue
    dialogue = tutor._get_dialogue(lesson_data, "turn_1")
    assert dialogue == {"id": "turn_1", "tutor": "Hello"}

    # Should return None for non-existent dialogue
    assert tutor._get_dialogue(lesson_data, "turn_999") is None


def test_detect_confusion():
    tutor = _build_tutor({})

    # Should detect confusion with many consecutive lows
    assert (
        tutor._detect_confusion(
            user_id=1,
            text="I don't understand",
            expected_phrases=["Hello", "Hi"],
            consecutive_lows=3,
        )
        is True
    )

    # Should not detect confusion with few consecutive lows
    assert (
        tutor._detect_confusion(
            user_id=1,
            text="I don't understand",
            expected_phrases=["Hello", "Hi"],
            consecutive_lows=1,
        )
        is False
    )

    # Should detect confusion even for clear matches when consecutive lows are high
    assert (
        tutor._detect_confusion(
            user_id=1,
            text="Hello",
            expected_phrases=["Hello", "Hi"],
            consecutive_lows=3,
        )
        is True
    )

    # Should not detect confusion for clear matches with low consecutive lows
    assert (
        tutor._detect_confusion(
            user_id=2,  # Different user to avoid history interference
            text="Hello",
            expected_phrases=["Hello", "Hi"],
            consecutive_lows=0,
        )
        is False
    )


def test_is_conversational_query():
    tutor = _build_tutor({})

    # Should detect conversational queries about Polish language
    assert (
        tutor._is_conversational_query("What does this mean in Polish?", user_id=1)
        is True
    )
    assert (
        tutor._is_conversational_query("Can you explain Polish grammar?", user_id=2)
        is True
    )
    assert (
        tutor._is_conversational_query("Why is this Polish word important?", user_id=3)
        is True
    )

    # Should not detect practice responses as conversational
    assert tutor._is_conversational_query("Dzień dobry", user_id=4) is False
    assert tutor._is_conversational_query("Hello", user_id=5) is False


def test_score_to_quality_edge_cases():
    tutor = _build_tutor({})

    # Test boundary conditions
    assert tutor._score_to_quality(0.95, "high") == 5  # Perfect high score
    assert tutor._score_to_quality(0.85, "high") == 4  # Good high score
    assert tutor._score_to_quality(0.75, "high") == 3  # Borderline high score
    assert tutor._score_to_quality(0.65, "medium") == 2  # Good medium score
    assert tutor._score_to_quality(0.35, "low") == 1  # Borderline low score
    assert tutor._score_to_quality(0.15, "low") == 0  # Poor low score
