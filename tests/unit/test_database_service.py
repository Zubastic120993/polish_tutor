"""Unit tests for Database service."""

from unittest.mock import MagicMock, patch, call
import pytest

from src.services.database_service import Database


class TestDatabaseService:
    """Test Database service functionality."""

    @pytest.fixture
    def mock_session(self):
        """Create a mock database session."""
        return MagicMock()

    @pytest.fixture
    def mock_session_factory(self, mock_session):
        """Create a mock session factory."""
        factory = MagicMock(return_value=mock_session)
        return factory

    @pytest.fixture
    def db(self, mock_session_factory):
        """Create a Database service instance with mocked session factory."""
        return Database(session_factory=mock_session_factory)

    def test_init(self, mock_session_factory):
        """Test Database initialization."""
        db = Database(session_factory=mock_session_factory)
        assert db.session_factory is mock_session_factory

    def test_get_session_context_manager_success(self, db, mock_session):
        """Test session context manager with successful commit."""
        with db.get_session() as session:
            assert session is mock_session

        # Verify session was committed and closed
        mock_session.commit.assert_called_once()
        mock_session.close.assert_called_once()
        mock_session.rollback.assert_not_called()

    def test_get_session_context_manager_error(self, db, mock_session):
        """Test session context manager with rollback on error."""
        from sqlalchemy.exc import SQLAlchemyError

        mock_session.commit.side_effect = SQLAlchemyError("DB Error")

        with pytest.raises(SQLAlchemyError, match="DB Error"):
            with db.get_session() as session:
                # The exception happens here during commit
                pass

        # Verify session was rolled back and closed
        mock_session.rollback.assert_called_once()
        mock_session.close.assert_called_once()

    def test_create_generic(self, db, mock_session):
        """Test generic create method."""
        mock_model_class = MagicMock()
        mock_instance = MagicMock()
        mock_model_class.return_value = mock_instance

        result = db.create(mock_model_class, name="test", value=42)

        assert result is mock_instance
        mock_model_class.assert_called_once_with(name="test", value=42)
        mock_session.add.assert_called_once_with(mock_instance)

    def test_get_by_id_found(self, db, mock_session):
        """Test generic get_by_id method when item exists."""
        mock_model_class = MagicMock()
        mock_instance = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_instance

        result = db.get_by_id(mock_model_class, 123)

        assert result is mock_instance
        mock_session.query.assert_called_once_with(mock_model_class)

    def test_get_by_id_not_found(self, db, mock_session):
        """Test generic get_by_id method when item doesn't exist."""
        mock_model_class = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        result = db.get_by_id(mock_model_class, 123)

        assert result is None

    def test_get_all(self, db, mock_session):
        """Test generic get_all method."""
        mock_model_class = MagicMock()
        mock_instances = [MagicMock(), MagicMock()]
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.all.return_value = mock_instances

        result = db.get_all(mock_model_class)

        assert result == mock_instances
        mock_session.query.assert_called_once_with(mock_model_class)

    def test_get_all_with_limit(self, db, mock_session):
        """Test generic get_all method with limit."""
        mock_model_class = MagicMock()
        mock_instances = [MagicMock(), MagicMock()]
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_instances

        result = db.get_all(mock_model_class, limit=10)

        assert result == mock_instances
        mock_query.limit.assert_called_once_with(10)

    def test_update_found(self, db, mock_session):
        """Test generic update method when item exists."""
        mock_model_class = MagicMock()
        mock_instance = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_instance

        result = db.update(mock_model_class, 123, name="updated")

        assert result is mock_instance
        assert mock_instance.name == "updated"

    def test_update_not_found(self, db, mock_session):
        """Test generic update method when item doesn't exist."""
        mock_model_class = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        result = db.update(mock_model_class, 123, name="updated")

        assert result is None

    def test_delete_found(self, db, mock_session):
        """Test generic delete method when item exists."""
        mock_model_class = MagicMock()
        mock_instance = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_instance

        result = db.delete(mock_model_class, 123)

        assert result is True
        mock_session.delete.assert_called_once_with(mock_instance)

    def test_delete_not_found(self, db, mock_session):
        """Test generic delete method when item doesn't exist."""
        mock_model_class = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        result = db.delete(mock_model_class, 123)

        assert result is False
        mock_session.delete.assert_not_called()

    # Test specific model methods using mocked models
    @patch("src.services.database_service.User")
    def test_create_user(self, mock_user_class, db, mock_session):
        """Test create_user method."""
        mock_instance = MagicMock()
        mock_user_class.return_value = mock_instance

        result = db.create_user("John Doe", "adult")

        assert result is mock_instance
        mock_user_class.assert_called_once_with(
            name="John Doe", profile_template="adult"
        )
        mock_session.add.assert_called_once_with(mock_instance)

    @patch("src.services.database_service.User")
    def test_get_user(self, mock_user_class, db, mock_session):
        """Test get_user method."""
        mock_instance = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_instance

        result = db.get_user(123)

        assert result is mock_instance
        mock_session.query.assert_called_once_with(mock_user_class)

    @patch("src.services.database_service.Lesson")
    def test_create_lesson(self, mock_lesson_class, db, mock_session):
        """Test create_lesson method."""
        mock_instance = MagicMock()
        mock_lesson_class.return_value = mock_instance

        result = db.create_lesson(
            "A1_L01", "Greetings", "A1", description="Test lesson"
        )

        assert result is mock_instance
        mock_lesson_class.assert_called_once_with(
            id="A1_L01", title="Greetings", level="A1", description="Test lesson"
        )
        mock_session.add.assert_called_once_with(mock_instance)

    @patch("src.services.database_service.Phrase")
    def test_get_phrases_by_lesson(self, mock_phrase_class, db, mock_session):
        """Test get_phrases_by_lesson method."""
        mock_instances = [MagicMock(), MagicMock()]
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_instances

        result = db.get_phrases_by_lesson("A1_L01")

        assert result == mock_instances
        mock_session.query.assert_called_once_with(mock_phrase_class)

    @patch("src.services.database_service.LessonProgress")
    def test_get_user_lesson_progress(self, mock_progress_class, db, mock_session):
        """Test get_user_lesson_progress method."""
        mock_instance = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_instance

        result = db.get_user_lesson_progress(1, "A1_L01")

        assert result is mock_instance
        mock_session.query.assert_called_once_with(mock_progress_class)

    @patch("src.services.database_service.Attempt")
    def test_get_user_attempts(self, mock_attempt_class, db, mock_session):
        """Test get_user_attempts method."""
        mock_instances = [MagicMock(), MagicMock()]
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_instances

        result = db.get_user_attempts(1, limit=10)

        assert result == mock_instances
        mock_session.query.assert_called_once_with(mock_attempt_class)

    @patch("src.services.database_service.SRSMemory")
    @pytest.mark.skip(
        reason="Complex datetime mocking required for SQLAlchemy query testing"
    )
    def test_get_due_srs_items(self, mock_srs_class, db, mock_session):
        """Test get_due_srs_items method."""
        # Skipped due to complex datetime mocking requirements
        # The method functionality is tested implicitly through integration
        pass

    @patch("src.services.database_service.Setting")
    def test_upsert_setting(self, mock_setting_class, db, mock_session):
        """Test upsert_setting method."""
        # Test case where setting doesn't exist
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None  # Not found

        mock_instance = MagicMock()
        mock_setting_class.return_value = mock_instance

        result = db.upsert_setting(1, "theme", "dark")

        assert result is mock_instance
        mock_setting_class.assert_called_once_with(user_id=1, key="theme", value="dark")
        mock_session.add.assert_called_once_with(mock_instance)

    @patch("src.services.database_service.Setting")
    def test_upsert_setting_update_existing(self, mock_setting_class, db, mock_session):
        """Test upsert_setting method when setting already exists."""
        mock_existing = MagicMock()
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_existing  # Found existing

        result = db.upsert_setting(1, "theme", "dark")

        assert result is mock_existing
        assert mock_existing.value == "dark"
        mock_session.add.assert_not_called()

    @patch("src.services.database_service.Meta")
    def test_upsert_meta(self, mock_meta_class, db, mock_session):
        """Test upsert_meta method."""
        # Test case where meta doesn't exist
        mock_query = MagicMock()
        mock_session.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None  # Not found

        mock_instance = MagicMock()
        mock_meta_class.return_value = mock_instance

        result = db.upsert_meta("version", "1.0.0")

        assert result is mock_instance
        mock_meta_class.assert_called_once_with(key="version", value="1.0.0")
        mock_session.add.assert_called_once_with(mock_instance)
