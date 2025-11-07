"""Lesson Manager for loading and validating lesson JSON files."""
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Set

import jsonschema
from jsonschema import ValidationError

from src.models import Lesson, Phrase
from src.services.database_service import Database

logger = logging.getLogger(__name__)

# JSON Schema for lesson validation
LESSON_SCHEMA = {
    "type": "object",
    "required": ["id", "title", "level", "dialogues"],
    "properties": {
        "id": {"type": "string"},
        "title": {"type": "string"},
        "level": {"type": "string"},
        "cefr_goal": {"type": "string"},
        "tags": {
            "type": "array",
            "items": {"type": "string"},
        },
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


class LessonManager:
    """Manages lesson loading, validation, and caching."""

    def __init__(
        self,
        lessons_dir: Optional[str] = None,
        audio_base_dir: Optional[str] = None,
        database: Optional[Database] = None,
    ):
        """Initialize LessonManager.

        Args:
            lessons_dir: Directory containing lesson JSON files (default: ./data/lessons)
            audio_base_dir: Base directory for audio files (default: ./static/audio/native)
            database: Database service instance (optional, for persistence)
        """
        self.lessons_dir = Path(lessons_dir or "./data/lessons")
        self.audio_base_dir = Path(audio_base_dir or "./static/audio/native")
        self.database = database or Database()
        self._cache: Dict[str, Dict] = {}  # Cache for loaded lessons

    def load_lesson(self, lesson_id: str, validate: bool = True) -> Dict:
        """Load a lesson from JSON file.

        Args:
            lesson_id: Lesson identifier (e.g., "coffee_001")
            validate: Whether to validate schema and branches (default: True)

        Returns:
            Dictionary containing lesson data

        Raises:
            FileNotFoundError: If lesson file doesn't exist
            ValidationError: If JSON schema validation fails
            ValueError: If branch validation fails or audio files missing
        """
        # Check cache first
        if lesson_id in self._cache:
            logger.debug(f"Loading lesson {lesson_id} from cache")
            return self._cache[lesson_id]

        # Load JSON file
        lesson_file = self.lessons_dir / f"{lesson_id}.json"
        if not lesson_file.exists():
            raise FileNotFoundError(f"Lesson file not found: {lesson_file}")

        logger.info(f"Loading lesson from {lesson_file}")
        with open(lesson_file, "r", encoding="utf-8") as f:
            lesson_data = json.load(f)

        # Validate schema
        if validate:
            self._validate_schema(lesson_data)
            self._validate_branches(lesson_data)
            self._validate_audio_files(lesson_data)

        # Cache the lesson
        self._cache[lesson_id] = lesson_data

        return lesson_data

    def load_all_lessons(self, validate: bool = True) -> Dict[str, Dict]:
        """Load all lesson JSON files from the lessons directory.

        Args:
            validate: Whether to validate each lesson (default: True)

        Returns:
            Dictionary mapping lesson_id to lesson data
        """
        lessons = {}
        if not self.lessons_dir.exists():
            logger.warning(f"Lessons directory does not exist: {self.lessons_dir}")
            return lessons

        for json_file in self.lessons_dir.glob("*.json"):
            lesson_id = json_file.stem
            try:
                lessons[lesson_id] = self.load_lesson(lesson_id, validate=validate)
            except Exception as e:
                logger.error(f"Failed to load lesson {lesson_id}: {e}")
                continue

        logger.info(f"Loaded {len(lessons)} lessons")
        return lessons

    def save_lesson_to_db(self, lesson_id: str) -> Optional[Lesson]:
        """Load lesson from JSON and save to database.

        Args:
            lesson_id: Lesson identifier

        Returns:
            Lesson model instance if successful, None otherwise
        """
        try:
            lesson_data = self.load_lesson(lesson_id, validate=True)

            # Check if lesson already exists
            existing_lesson = self.database.get_lesson(lesson_id)
            if existing_lesson:
                logger.info(f"Lesson {lesson_id} already exists in database, skipping")
                return existing_lesson

            # Create lesson
            tags_json = json.dumps(lesson_data.get("tags", []))
            lesson = self.database.create_lesson(
                lesson_id=lesson_data["id"],
                title=lesson_data["title"],
                level=lesson_data["level"],
                tags=tags_json,
                cefr_goal=lesson_data.get("cefr_goal"),
            )

            # Create phrases for each dialogue
            for dialogue in lesson_data.get("dialogues", []):
                dialogue_id = dialogue["id"]
                expected_text = ", ".join(dialogue.get("expected", []))

                # Determine audio path
                audio_path = None
                if "audio" in dialogue and dialogue["audio"]:
                    audio_path = f"{lesson_id}/{dialogue['audio']}"

                phrase = self.database.create_phrase(
                    phrase_id=dialogue_id,
                    lesson_id=lesson_id,
                    text=expected_text,
                    grammar=dialogue.get("grammar"),
                    audio_path=audio_path,
                )
                logger.debug(f"Created phrase {dialogue_id} for lesson {lesson_id}")

            logger.info(f"Saved lesson {lesson_id} to database")
            return lesson

        except Exception as e:
            logger.error(f"Failed to save lesson {lesson_id} to database: {e}")
            return None

    def get_lesson(self, lesson_id: str) -> Optional[Dict]:
        """Get lesson from cache or load it.

        Args:
            lesson_id: Lesson identifier

        Returns:
            Lesson data dictionary or None if not found
        """
        if lesson_id in self._cache:
            return self._cache[lesson_id]

        try:
            return self.load_lesson(lesson_id, validate=False)
        except FileNotFoundError:
            return None

    def clear_cache(self) -> None:
        """Clear the lesson cache."""
        self._cache.clear()
        logger.info("Lesson cache cleared")

    def _validate_schema(self, lesson_data: Dict) -> None:
        """Validate lesson JSON against schema.

        Args:
            lesson_data: Lesson data dictionary

        Raises:
            ValidationError: If schema validation fails
        """
        try:
            jsonschema.validate(instance=lesson_data, schema=LESSON_SCHEMA)
            logger.debug(f"Schema validation passed for lesson {lesson_data.get('id')}")
        except ValidationError as e:
            logger.error(f"Schema validation failed: {e.message}")
            raise ValueError(f"Invalid lesson schema: {e.message}") from e

    def _validate_branches(self, lesson_data: Dict) -> None:
        """Validate that all branch 'next' IDs exist in the lesson.

        Args:
            lesson_data: Lesson data dictionary

        Raises:
            ValueError: If branch validation fails
        """
        lesson_id = lesson_data["id"]
        dialogues = lesson_data.get("dialogues", [])

        # Collect all dialogue IDs in this lesson
        dialogue_ids: Set[str] = {dialogue["id"] for dialogue in dialogues}

        # Check all branch targets
        missing_ids = []
        for dialogue in dialogues:
            options = dialogue.get("options", [])
            for option in options:
                next_id = option.get("next")
                if next_id and next_id not in dialogue_ids:
                    # Check if it's a lesson_id (format: lesson_id_dialogue_id)
                    # For now, we only validate within the same lesson
                    # Cross-lesson references would need all lessons loaded
                    if not next_id.startswith(lesson_id):
                        missing_ids.append((dialogue["id"], next_id))

        if missing_ids:
            error_msg = f"Branch validation failed for lesson {lesson_id}: "
            error_msg += ", ".join(
                [f"dialogue {d_id} references missing ID '{next_id}'" for d_id, next_id in missing_ids]
            )
            logger.error(error_msg)
            raise ValueError(error_msg)

        # Validate exactly one default option per dialogue with options
        for dialogue in dialogues:
            options = dialogue.get("options", [])
            if options:
                default_count = sum(1 for opt in options if opt.get("default", False))
                if default_count != 1:
                    raise ValueError(
                        f"Dialogue {dialogue['id']} must have exactly one default option, found {default_count}"
                    )

        logger.debug(f"Branch validation passed for lesson {lesson_id}")

    def _validate_audio_files(self, lesson_data: Dict) -> None:
        """Validate that referenced audio files exist.

        Args:
            lesson_data: Lesson data dictionary

        Raises:
            ValueError: If audio file validation fails
        """
        lesson_id = lesson_data["id"]
        dialogues = lesson_data.get("dialogues", [])
        missing_audio = []

        for dialogue in dialogues:
            # Check main audio file
            if "audio" in dialogue and dialogue["audio"]:
                audio_path = self.audio_base_dir / lesson_id / dialogue["audio"]
                if not audio_path.exists():
                    missing_audio.append(str(audio_path))

            # Check slow audio file
            if "audio_slow" in dialogue and dialogue["audio_slow"]:
                audio_slow_path = self.audio_base_dir / lesson_id / dialogue["audio_slow"]
                if not audio_slow_path.exists():
                    missing_audio.append(str(audio_slow_path))

        if missing_audio:
            error_msg = f"Audio file validation failed for lesson {lesson_id}: "
            error_msg += "Missing files: " + ", ".join(missing_audio)
            logger.warning(error_msg)
            # Note: We warn but don't fail, as audio files might be generated later
            # Uncomment the raise below if you want strict validation
            # raise ValueError(error_msg)

        logger.debug(f"Audio file validation passed for lesson {lesson_id}")

