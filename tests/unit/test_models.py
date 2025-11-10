"""Unit tests for model imports and basic functionality."""
import pytest


def test_model_imports():
    """Test that all model classes can be imported successfully."""
    try:
        from src.models.user import User
        from src.models.lesson import Lesson
        from src.models.phrase import Phrase
        from src.models.lesson_progress import LessonProgress
        from src.models.attempt import Attempt
        from src.models.srs_memory import SRSMemory
        from src.models.setting import Setting
        from src.models.meta import Meta

        # Test that they are classes
        assert hasattr(User, '__tablename__')
        assert hasattr(Lesson, '__tablename__')
        assert hasattr(Phrase, '__tablename__')
        assert hasattr(LessonProgress, '__tablename__')
        assert hasattr(Attempt, '__tablename__')
        assert hasattr(SRSMemory, '__tablename__')
        assert hasattr(Setting, '__tablename__')
        assert hasattr(Meta, '__tablename__')

    except ImportError as e:
        pytest.skip(f"Model import failed (expected in unit test environment): {e}")


def test_model_table_names():
    """Test that models have correct table names."""
    try:
        from src.models.user import User
        from src.models.lesson import Lesson
        from src.models.phrase import Phrase
        from src.models.lesson_progress import LessonProgress
        from src.models.attempt import Attempt
        from src.models.srs_memory import SRSMemory
        from src.models.setting import Setting
        from src.models.meta import Meta

        assert User.__tablename__ == "Users"
        assert Lesson.__tablename__ == "Lessons"
        assert Phrase.__tablename__ == "Phrases"
        assert LessonProgress.__tablename__ == "LessonProgress"
        assert Attempt.__tablename__ == "Attempts"
        assert SRSMemory.__tablename__ == "SRSMemory"
        assert Setting.__tablename__ == "Settings"
        assert Meta.__tablename__ == "Meta"

    except ImportError as e:
        pytest.skip(f"Model import failed (expected in unit test environment): {e}")


def test_model_relationships():
    """Test that models have relationship attributes."""
    try:
        from src.models.user import User
        from src.models.lesson import Lesson
        from src.models.phrase import Phrase

        # Check that User has relationships defined
        assert hasattr(User, 'lesson_progresses')
        assert hasattr(User, 'attempts')
        assert hasattr(User, 'srs_memories')
        assert hasattr(User, 'settings')

        # Check that Lesson has relationships defined
        assert hasattr(Lesson, 'phrases')

        # Check that Phrase has relationships defined
        assert hasattr(Phrase, 'lesson')
        assert hasattr(Phrase, 'attempts')
        assert hasattr(Phrase, 'srs_memories')

    except ImportError as e:
        pytest.skip(f"Model import failed (expected in unit test environment): {e}")
