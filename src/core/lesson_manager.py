"""Lesson Manager for loading and validating lesson JSON files."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import jsonschema
from jsonschema import ValidationError

from src.models import Lesson
from src.services.database_service import Database

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# JSON Schema for lesson validation
# -------------------------------------------------------------------

LESSON_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["id", "title", "level", "dialogues"],
    "properties": {
        "id": {"type": "string"},
        "title": {"type": "string"},
        "level": {"type": "string"},
        "cefr_goal": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "dialogues": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": ["id", "tutor", "expected"],
                "properties": {
                    "id": {"type": "string"},
                    "tutor": {"type": "string"},
                    "expected": {
                        "type": "array",
                        "minItems": 1,
                        "items": {"type": "string"},
                    },
                    "translation": {"type": "string"},
                    "hint": {"type": "string"},
                    "grammar": {"type": "string"},
                    "audio": {"type": "string"},
                    "audio_slow": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "match": {"type": "string"},
                                "next": {"type": "string"},
                                "description": {"type": "string"},
                                "default": {"type": "boolean"},
                            },
                            "required": ["next"],
                        },
                    },
                },
            },
        },
    },
}

# -------------------------------------------------------------------
# LessonManager
# -------------------------------------------------------------------


class LessonManager:
    """Manages lesson loading, validation, and caching."""

    def __init__(
        self,
        lessons_dir: Optional[str] = None,
        audio_base_dir: Optional[str] = None,
        database: Optional[Database] = None,
    ):
        """Initialize LessonManager."""
        self.lessons_dir: Path = Path(lessons_dir or "./data/lessons")
        self.audio_base_dir: Path = Path(audio_base_dir or "./static/audio/native")
        self.database: Database = database or Database()
        self._cache: Dict[str, Dict[str, Any]] = {}  # Cached lessons

    # -------------------------------------------------------------------
    # Lesson loading
    # -------------------------------------------------------------------

    def load_lesson(self, lesson_id: str, validate: bool = True) -> Dict[str, Any]:
        """Load a lesson JSON file."""
        if lesson_id in self._cache:
            logger.debug(f"Lesson {lesson_id} loaded from cache")
            return self._cache[lesson_id]

        lesson_file = self.lessons_dir / f"{lesson_id}.json"
        if not lesson_file.exists():
            raise FileNotFoundError(f"Lesson file not found: {lesson_file}")

        with open(lesson_file, "r", encoding="utf-8") as f:
            lesson_data = json.load(f)

        if validate:
            self._validate_schema(lesson_data)
            self._validate_branches(lesson_data)
            self._validate_audio_files(lesson_data)

        self._cache[lesson_id] = lesson_data
        return lesson_data

    def load_all_lessons(self, validate: bool = True) -> Dict[str, Dict[str, Any]]:
        """Load all lessons from directory."""
        lessons: Dict[str, Dict[str, Any]] = {}
        if not self.lessons_dir.exists():
            logger.warning(f"Lessons directory not found: {self.lessons_dir}")
            return lessons

        for json_file in self.lessons_dir.glob("*.json"):
            lesson_id = json_file.stem
            try:
                lessons[lesson_id] = self.load_lesson(lesson_id, validate)
            except Exception as e:
                logger.error(f"Failed to load lesson {lesson_id}: {e}")
        logger.info(f"Loaded {len(lessons)} lessons")
        return lessons

    def load_lesson_catalog(self) -> List[Dict[str, Any]]:
        """Load catalog.json (flattened)."""
        catalog_file = self.lessons_dir / "catalog.json"
        if not catalog_file.exists():
            return []

        try:
            with open(catalog_file, "r", encoding="utf-8") as f:
                catalog_data = json.load(f)
        except Exception as exc:
            logger.warning(f"Cannot read catalog: {exc}")
            return []

        entries: List[Dict[str, Any]] = []
        seen: Set[str] = set()

        def push_entry(entry: Dict[str, Any], part_title: Optional[str] = None, module_title: Optional[str] = None) -> None:
            lesson_id = entry.get("id")
            if not lesson_id or lesson_id in seen:
                return
            seen.add(lesson_id)
            entries.append(
                {
                    "id": lesson_id,
                    "title_pl": entry.get("title_pl"),
                    "title_en": entry.get("title_en"),
                    "status": entry.get("status", "pending"),
                    "module": module_title,
                    "part": part_title,
                }
            )

        for part in catalog_data.get("parts", []):
            part_title = part.get("title")
            for lesson in part.get("lessons", []):
                push_entry(lesson, part_title=part_title)
            for module in part.get("modules", []):
                module_title = module.get("title_pl") or module.get("title_en")
                for lesson in module.get("lessons", []):
                    push_entry(lesson, part_title=part_title, module_title=module_title)
        return entries

    # -------------------------------------------------------------------
    # Database integration
    # -------------------------------------------------------------------

    def save_lesson_to_db(self, lesson_id: str) -> Optional[Lesson]:
        """Load and save a lesson into DB."""
        try:
            lesson_data = self.load_lesson(lesson_id, validate=True)
            existing = self.database.get_lesson(lesson_id)
            if existing:
                logger.info(f"Lesson {lesson_id} already exists.")
                return existing

            tags_json = json.dumps(lesson_data.get("tags", []))
            lesson = self.database.create_lesson(
                lesson_id=lesson_data["id"],
                title=lesson_data["title"],
                level=lesson_data["level"],
                tags=tags_json,
                cefr_goal=lesson_data.get("cefr_goal"),
            )

            for dlg in lesson_data.get("dialogues", []):
                dlg_id = dlg["id"]
                expected_text = ", ".join(dlg.get("expected", []))
                audio_path = f"{lesson_id}/{dlg['audio']}" if dlg.get("audio") else None

                self.database.create_phrase(
                    phrase_id=dlg_id,
                    lesson_id=lesson_id,
                    text=expected_text,
                    grammar=dlg.get("grammar"),
                    audio_path=audio_path,
                )
            return lesson
        except Exception as e:
            logger.error(f"Failed to save lesson {lesson_id}: {e}")
            return None

    # -------------------------------------------------------------------
    # Cache and helpers
    # -------------------------------------------------------------------

    def get_lesson(self, lesson_id: str) -> Optional[Dict[str, Any]]:
        if lesson_id in self._cache:
            return self._cache[lesson_id]
        try:
            return self.load_lesson(lesson_id, validate=False)
        except FileNotFoundError:
            return None

    def clear_cache(self) -> None:
        self._cache.clear()
        logger.info("Lesson cache cleared")

    def cache_lesson(self, lesson_id: str, lesson_data: Dict[str, Any]) -> None:
        self._cache[lesson_id] = lesson_data
        logger.info(f"Lesson {lesson_id} cached in memory")

    # -------------------------------------------------------------------
    # Validation helpers
    # -------------------------------------------------------------------

    def _validate_schema(self, lesson_data: Dict[str, Any]) -> None:
        try:
            jsonschema.validate(instance=lesson_data, schema=LESSON_SCHEMA)
        except ValidationError as e:
            raise ValueError(f"Invalid lesson schema: {e.message}") from e

    def _validate_branches(self, lesson_data: Dict[str, Any]) -> None:
        lesson_id = lesson_data["id"]
        dialogues: List[Dict[str, Any]] = lesson_data.get("dialogues", [])
        dialogue_ids: Set[str] = {dlg["id"] for dlg in dialogues}

        missing: List[str] = []
        for dlg in dialogues:
            for opt in dlg.get("options", []):
                nxt = opt.get("next")
                if nxt and nxt not in dialogue_ids and not nxt.startswith(lesson_id):
                    missing.append(nxt)

        if missing:
            raise ValueError(f"Lesson {lesson_id} references missing IDs: {missing}")

        for dlg in dialogues:
            options = dlg.get("options", [])
            if options:
                default_count = sum(1 for o in options if o.get("default", False))
                if default_count != 1:
                    raise ValueError(
                        f"Dialogue {dlg['id']} must have exactly one default option (found {default_count})"
                    )

    def _validate_audio_files(self, lesson_data: Dict[str, Any]) -> None:
        lesson_id = lesson_data["id"]
        missing: List[str] = []
        for dlg in lesson_data.get("dialogues", []):
            for key in ("audio", "audio_slow"):
                fname = dlg.get(key)
                if fname:
                    fpath = self.audio_base_dir / lesson_id / fname
                    if not fpath.exists():
                        missing.append(str(fpath))
        if missing:
            logger.warning(f"Audio files missing for {lesson_id}: {missing}")
            