import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from src.core.lesson_manager import LessonManager


def _write_lesson(path: Path, lesson_id: str, with_default: bool = True):
    lesson = {
        "id": lesson_id,
        "title": "Demo Lesson",
        "level": "A0",
        "dialogues": [
            {
                "id": f"{lesson_id}_d1",
                "tutor": "Cześć!",
                "expected": ["Cześć!"],
                "audio": f"{lesson_id}_d1.mp3",
                "options": [
                    {"match": "hej", "next": f"{lesson_id}_d2", "default": with_default},
                ],
            },
            {
                "id": f"{lesson_id}_d2",
                "tutor": "Jak się masz?",
                "expected": ["Dobrze"],
                "options": [],
            },
        ],
    }
    (path / f"{lesson_id}.json").write_text(json.dumps(lesson), encoding="utf-8")
    return lesson


def test_load_lesson_uses_cache(tmp_path):
    lessons_dir = tmp_path / "lessons"
    lessons_dir.mkdir()
    audio_dir = tmp_path / "audio" / "demo_lesson"
    audio_dir.mkdir(parents=True)
    (audio_dir / "demo_lesson_d1.mp3").write_bytes(b"fake audio")

    expected_data = _write_lesson(lessons_dir, "demo_lesson")

    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(tmp_path / "audio"),
    )

    loaded = manager.load_lesson("demo_lesson")
    assert loaded["title"] == expected_data["title"]

    # Remove file to ensure subsequent call is served from cache
    (lessons_dir / "demo_lesson.json").unlink()

    cached = manager.load_lesson("demo_lesson")
    assert cached["dialogues"][0]["tutor"] == "Cześć!"


def test_branch_validation_requires_single_default(tmp_path):
    lessons_dir = tmp_path / "lessons"
    lessons_dir.mkdir()
    bad_lesson = _write_lesson(lessons_dir, "broken_lesson", with_default=False)
    bad_lesson["dialogues"][0]["options"].append({"match": "inne", "next": "missing"})
    (lessons_dir / "broken_lesson.json").write_text(json.dumps(bad_lesson), encoding="utf-8")

    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(tmp_path / "audio"),
    )

    with pytest.raises(ValueError):
        manager.load_lesson("broken_lesson")


class StubDatabase:
    def __init__(self, existing=None):
        self.existing = existing
        self.created_lessons = []
        self.created_phrases = []

    def get_lesson(self, lesson_id):
        return self.existing

    def create_lesson(self, **kwargs):
        lesson = SimpleNamespace(**kwargs)
        self.created_lessons.append(lesson)
        return lesson

    def create_phrase(self, **kwargs):
        phrase = SimpleNamespace(**kwargs)
        self.created_phrases.append(phrase)
        return phrase


def test_save_lesson_to_db_creates_records(tmp_path):
    lessons_dir = tmp_path / "lessons"
    lessons_dir.mkdir()
    audio_dir = tmp_path / "audio" / "demo"
    audio_dir.mkdir(parents=True)
    (audio_dir / "demo_d1.mp3").write_bytes(b"")

    lesson_data = _write_lesson(lessons_dir, "demo")

    db = StubDatabase()
    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(tmp_path / "audio"),
        database=db,
    )

    saved = manager.save_lesson_to_db("demo")
    assert saved is not None
    assert db.created_lessons[0].lesson_id == lesson_data["id"]
    assert len(db.created_phrases) == len(lesson_data["dialogues"])


def test_save_lesson_to_db_returns_existing(tmp_path):
    lessons_dir = tmp_path / "lessons"
    lessons_dir.mkdir()
    _write_lesson(lessons_dir, "demo2")

    existing = SimpleNamespace(id="demo2")
    db = StubDatabase(existing=existing)
    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(tmp_path / "audio"),
        database=db,
    )

    saved = manager.save_lesson_to_db("demo2")
    assert saved is existing
    assert db.created_lessons == []


def test_load_lesson_catalog_handles_nested_structure(tmp_path):
    lessons_dir = tmp_path / "lessons"
    lessons_dir.mkdir()
    catalog = {
        "parts": [
            {
                "title": "Part A",
                "lessons": [{"id": "p1", "title_pl": "Lekcja 1"}],
                "modules": [
                    {
                        "title_pl": "Module X",
                        "lessons": [{"id": "p2", "title_pl": "Lekcja 2"}],
                    }
                ],
            }
        ]
    }
    (lessons_dir / "catalog.json").write_text(json.dumps(catalog), encoding="utf-8")

    manager = LessonManager(lessons_dir=str(lessons_dir))
    entries = manager.load_lesson_catalog()

    assert len(entries) == 2
    assert entries[0]["id"] == "p1"
