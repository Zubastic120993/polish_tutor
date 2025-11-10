import json
from pathlib import Path

import pytest

from src.core.lesson_manager import LessonManager


def _write_lesson_file(directory: Path, lesson_id: str, data: dict) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"{lesson_id}.json").write_text(json.dumps(data), encoding="utf-8")


def _sample_dialogue(dialogue_id: str = "turn_001") -> dict:
    return {
        "id": dialogue_id,
        "tutor": "Cześć!",
        "expected": ["Cześć!"],
        "hint": "Powitaj osobę.",
        "options": [
            {"match": "Cześć!", "next": "turn_002"},
            {"match": "Dzień dobry!", "next": "turn_002"},
            {"next": "turn_002", "default": True},
        ],
    }


def _sample_lesson(lesson_id: str = "test_lesson") -> dict:
    return {
        "id": lesson_id,
        "title": "Przywitanie",
        "level": "A1",
        "dialogues": [
            _sample_dialogue("turn_001"),
            {
                "id": "turn_002",
                "tutor": "Jak się masz?",
                "expected": ["Dobrze"],
                "options": [],
            },
        ],
    }


def test_load_lesson_caches_result(tmp_path):
    lessons_dir = tmp_path / "lessons"
    audio_dir = tmp_path / "audio"
    lesson_id = "greeting_001"

    _write_lesson_file(lessons_dir, lesson_id, _sample_lesson(lesson_id))

    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(audio_dir),
        database=None,
    )

    first = manager.load_lesson(lesson_id)
    second = manager.load_lesson(lesson_id)

    assert first is second
    assert lesson_id in manager._cache  # noqa: SLF001 - validating cache behaviour


def test_load_lesson_missing_file_raises(tmp_path):
    manager = LessonManager(
        lessons_dir=str(tmp_path / "missing_lessons"),
        audio_base_dir=str(tmp_path / "audio"),
        database=None,
    )

    with pytest.raises(FileNotFoundError):
        manager.load_lesson("does_not_exist")


def test_load_all_lessons_skips_invalid(tmp_path, caplog):
    lessons_dir = tmp_path / "lessons"
    audio_dir = tmp_path / "audio"

    valid_id = "valid_001"
    invalid_id = "invalid_001"

    _write_lesson_file(lessons_dir, valid_id, _sample_lesson(valid_id))
    _write_lesson_file(
        lessons_dir,
        invalid_id,
        {"id": invalid_id, "title": "Broken", "level": "A1"},  # missing dialogues
    )

    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(audio_dir),
        database=None,
    )

    lessons = manager.load_all_lessons()

    assert set(lessons.keys()) == {valid_id}
    assert any(
        "Failed to load lesson invalid_001" in message
        for message in caplog.messages
    )


def test_load_lesson_catalog_flattens_entries(tmp_path):
    lessons_dir = tmp_path / "lessons"
    lessons_dir.mkdir(parents=True, exist_ok=True)

    catalog = {
        "parts": [
            {
                "title": "Part 1",
                "lessons": [
                    {"id": "lesson_a", "title_pl": "Lekcja A", "status": "ready"}
                ],
                "modules": [
                    {
                        "title_pl": "Moduł 1",
                        "lessons": [
                            {"id": "lesson_b", "title_pl": "Lekcja B"},
                            {"id": "lesson_a", "title_pl": "Duplicate"},  # dedupe check
                        ],
                    }
                ],
            }
        ]
    }

    (lessons_dir / "catalog.json").write_text(
        json.dumps(catalog),
        encoding="utf-8",
    )

    manager = LessonManager(
        lessons_dir=str(lessons_dir),
        audio_base_dir=str(tmp_path / "audio"),
        database=None,
    )

    entries = manager.load_lesson_catalog()
    ids = {entry["id"] for entry in entries}
    assert ids == {"lesson_a", "lesson_b"}
    assert any(entry["module"] == "Moduł 1" for entry in entries if entry["id"] == "lesson_b")

