from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
import pytest

from src.api.routers.lesson import router
from src.core.app_context import app_context


class StubLessonManager:
    def __init__(self, lessons, catalog=None):
        self.lessons = lessons
        self.catalog = catalog or []
        self.cached_lessons = {}

    def get_lesson(self, lesson_id):
        return self.lessons.get(lesson_id)

    def cache_lesson(self, lesson_id, data):
        self.cached_lessons[lesson_id] = data

    def load_lesson_catalog(self):
        return list(self.catalog)


class StubLessonGenerator:
    def __init__(self, available=True, generated_data=None):
        self.available = available
        self.generated_data = generated_data or {}
        self.calls = []

    def can_generate(self):
        return self.available

    def generate_lesson(self, *, topic, level, num_dialogues):
        self.calls.append({"topic": topic, "level": level, "num_dialogues": num_dialogues})
        return self.generated_data


@pytest.fixture
def test_app():
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def stub_context():
    lessons = {
        "A1_L01": {
            "id": "A1_L01",
            "title": "Powitania",
            "dialogues": [
                {
                    "id": "turn_1",
                    "tutor": "Cześć!",
                    "options": [
                        {"match": "Cześć", "next": "turn_2"},
                        {"next": "turn_default", "default": True},
                    ],
                },
                {
                    "id": "turn_2",
                    "tutor": "Jak się masz?",
                    "options": [],
                },
            ],
        }
    }
    catalog = [
        {"id": "A1_L01", "title_pl": "Powitania", "title_en": "Greetings"},
        {"id": "A1_L02", "title_pl": "Zakupy", "title_en": "Shopping"},
    ]
    lesson_manager = StubLessonManager(lessons, catalog=catalog)
    lesson_generator = StubLessonGenerator(
        available=True,
        generated_data={"id": "AI_001", "topic": "travel", "dialogues": []},
    )
    original_tutor = getattr(app_context, "_tutor", None)
    app_context._tutor = SimpleNamespace(
        lesson_manager=lesson_manager,
        lesson_generator=lesson_generator,
    )
    try:
        yield {
            "lesson_manager": lesson_manager,
            "lesson_generator": lesson_generator,
        }
    finally:
        app_context._tutor = original_tutor


def test_lesson_get_success(test_app, stub_context):
    response = test_app.get("/api/lesson/get", params={"lesson_id": "A1_L01"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["id"] == "A1_L01"


def test_lesson_get_not_found(test_app, stub_context):
    response = test_app.get("/api/lesson/get", params={"lesson_id": "missing"})
    assert response.status_code == 404
    assert "Lesson not found" in response.json()["detail"]


def test_lesson_options_success(test_app, stub_context):
    response = test_app.get(
        "/api/lesson/options",
        params={"lesson_id": "A1_L01", "dialogue_id": "turn_1"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["data"]["dialogue_id"] == "turn_1"
    assert len(payload["data"]["options"]) == 2


def test_lesson_options_dialogue_not_found(test_app, stub_context):
    response = test_app.get(
        "/api/lesson/options",
        params={"lesson_id": "A1_L01", "dialogue_id": "turn_x"},
    )
    assert response.status_code == 404
    assert "Dialogue not found" in response.json()["detail"]


def test_lesson_catalog_success(test_app, stub_context):
    response = test_app.get("/api/lesson/catalog")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["data"]["entries"]) == 2


def test_lesson_generate_success(test_app, stub_context):
    response = test_app.post(
        "/api/lesson/generate",
        json={"topic": "travel", "level": "A1", "num_dialogues": 4},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["id"] == "AI_001"
    assert "AI_001" in stub_context["lesson_manager"].cached_lessons


def test_lesson_generate_unavailable(test_app, stub_context):
    stub_context["lesson_generator"].available = False
    response = test_app.post(
        "/api/lesson/generate",
        json={"topic": "culture", "level": "A2", "num_dialogues": 3},
    )
    assert response.status_code == 503
    assert "not available" in response.json()["detail"].lower()


def test_lesson_generate_no_data(test_app, stub_context):
    generator = stub_context["lesson_generator"]
    generator.available = True
    generator.generated_data = None
    response = test_app.post(
        "/api/lesson/generate",
        json={"topic": "food", "level": "A1", "num_dialogues": 2},
    )
    assert response.status_code == 500
    assert "failed to generate" in response.json()["detail"].lower()
