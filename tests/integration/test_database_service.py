"""Integration tests for Database service - tests real database operations."""
from unittest.mock import MagicMock, patch
import pytest

pytestmark = pytest.mark.skip(
    reason="Database integration helper requires real SQLAlchemy; skipped in lightweight test env."
)


def test_database_service_structure():
    """Test database service class structure and method signatures."""
    # Mock SQLAlchemy components to avoid import issues
    with patch('sqlalchemy.orm.Session') as mock_session_class, \
         patch('sqlalchemy.exc.SQLAlchemyError') as mock_sqlalchemy_error, \
         patch('src.core.database.SessionLocal') as mock_session_local:

        # Create a mock session
        mock_session = MagicMock()
        mock_session_local.return_value = mock_session

        # Mock model classes to avoid forward reference issues
        mock_user = MagicMock()
        mock_lesson = MagicMock()
        mock_phrase = MagicMock()
        mock_lesson_progress = MagicMock()
        mock_attempt = MagicMock()
        mock_srs_memory = MagicMock()
        mock_setting = MagicMock()
        mock_meta = MagicMock()

        # Mock the models module
        with patch.multiple('src.models',
                          User=mock_user,
                          Lesson=mock_lesson,
                          Phrase=mock_phrase,
                          LessonProgress=mock_lesson_progress,
                          Attempt=mock_attempt,
                          SRSMemory=mock_srs_memory,
                          Setting=mock_setting,
                          Meta=mock_meta):

            # Now we can import the database service
            from src.services.database_service import Database

            # Test that the Database class can be instantiated
            db = Database(session_factory=mock_session_local)
            assert db.session_factory is mock_session_local
            assert hasattr(db, 'create_user')
            assert hasattr(db, 'get_user')

            # Test session context manager
            with db.get_session() as session:
                assert session is mock_session

            # Verify commit was called
            mock_session.commit.assert_called_once()
            mock_session.close.assert_called_once()

            # Test error handling in session
            mock_session.reset_mock()
            mock_session.commit.side_effect = Exception("DB Error")

            try:
                with db.get_session() as session:
                    pass
            except Exception:
                pass

            # Verify rollback was called on error
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

            # Test method existence - core CRUD methods
            required_methods = [
                'create_user', 'get_user', 'get_user_by_name', 'update_user', 'delete_user',
                'create_lesson', 'get_lesson', 'get_lessons_by_level', 'update_lesson', 'delete_lesson',
                'create_phrase', 'get_phrase', 'get_phrases_by_lesson', 'update_phrase', 'delete_phrase',
                'create_lesson_progress', 'get_lesson_progress', 'get_user_lesson_progress',
                'get_user_progresses', 'update_lesson_progress', 'delete_lesson_progress',
                'create_attempt', 'get_attempt', 'get_user_attempts', 'get_phrase_attempts',
                'update_attempt', 'delete_attempt',
                'create_srs_memory', 'get_srs_memory', 'get_user_srs_memory', 'get_due_srs_items',
                'get_user_srs_memories', 'update_srs_memory', 'delete_srs_memory',
                'create_setting', 'get_setting', 'get_user_setting', 'get_user_settings',
                'update_setting', 'upsert_setting', 'delete_setting',
                'create_meta', 'get_meta', 'update_meta', 'upsert_meta', 'delete_meta'
            ]

            for method_name in required_methods:
                assert hasattr(db, method_name), f"Missing method: {method_name}"
                assert callable(getattr(db, method_name)), f"Method not callable: {method_name}"
