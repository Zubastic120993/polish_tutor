"""Unit tests for application context."""

import os
from unittest.mock import patch, MagicMock
import pytest

from src.core.app_context import AppContext, app_context


class TestAppContext:
    """Test application context functionality."""

    def test_app_context_initialization(self):
        """Test AppContext initializes with correct defaults."""
        context = AppContext()

        # Check that session factory is set
        assert context._db_session_factory is not None

        # Check that other attributes are initially None
        assert context._config is None
        assert context._cache_manager is None
        assert context._tutor is None
        assert context._database is None

    def test_db_session_factory_property(self):
        """Test db_session_factory property returns session factory."""
        context = AppContext()
        factory = context.db_session_factory

        assert factory is not None
        assert factory is context._db_session_factory

    @patch.dict(os.environ, {}, clear=True)
    def test_config_property_loads_environment(self):
        """Test config property loads environment variables."""
        context = AppContext()

        config = context.config

        # Verify config structure
        assert isinstance(config, dict)
        assert "database_url" in config
        assert "debug" in config
        assert "log_level" in config
        assert "host" in config
        assert "port" in config

    @patch.dict(
        os.environ,
        {
            "DATABASE_URL": "sqlite:///./test.db",
            "DEBUG": "true",
            "LOG_LEVEL": "DEBUG",
            "HOST": "127.0.0.1",
            "PORT": "3000",
        },
        clear=True,
    )
    def test_config_property_uses_environment_variables(self):
        """Test config property uses environment variables when set."""
        context = AppContext()

        config = context.config

        assert config["database_url"] == "sqlite:///./test.db"
        assert config["debug"] is True
        assert config["log_level"] == "DEBUG"
        assert config["host"] == "127.0.0.1"
        assert config["port"] == 3000

    @patch.dict(os.environ, {"DEBUG": "False"}, clear=True)
    def test_config_property_uses_defaults(self):
        """Test config property uses defaults when environment variables not set."""
        context = AppContext()

        config = context.config

        assert config["database_url"] == "sqlite:///./data/polish_tutor.db"
        assert config["debug"] is False
        assert config["log_level"] == "INFO"
        assert config["host"] == "0.0.0.0"
        assert config["port"] == 8000

    def test_config_property_caches_result(self):
        """Test config property caches the result."""
        context = AppContext()

        # First call
        config1 = context.config
        # Second call
        config2 = context.config

        # Should return the same object (cached)
        assert config1 is config2
        assert config1 is context._config

    def test_cache_manager_property_returns_none(self):
        """Test cache_manager property returns None (placeholder)."""
        context = AppContext()

        cache_manager = context.cache_manager

        # Currently returns None as placeholder
        assert cache_manager is None

    @patch("src.core.app_context.Database")
    def test_database_property_creates_database_instance(self, mock_database_class):
        """Test database property creates Database instance on first access."""
        mock_database_instance = MagicMock()
        mock_database_class.return_value = mock_database_instance

        context = AppContext()

        # First access
        database1 = context.database
        # Second access
        database2 = context.database

        # Should create instance only once
        mock_database_class.assert_called_once_with(
            session_factory=context._db_session_factory
        )
        assert database1 is mock_database_instance
        assert database2 is mock_database_instance
        assert database1 is database2

    @patch("src.core.app_context.Tutor")
    @patch("src.core.app_context.Database")
    def test_tutor_property_creates_tutor_instance(
        self, mock_database_class, mock_tutor_class
    ):
        """Test tutor property creates Tutor instance on first access."""
        mock_database_instance = MagicMock()
        mock_database_class.return_value = mock_database_instance

        mock_tutor_instance = MagicMock()
        mock_tutor_class.return_value = mock_tutor_instance

        context = AppContext()

        # First access
        tutor1 = context.tutor
        # Second access
        tutor2 = context.tutor

        # Should create instances only once
        mock_database_class.assert_called_once()
        mock_tutor_class.assert_called_once_with(database=mock_database_instance)
        assert tutor1 is mock_tutor_instance
        assert tutor2 is mock_tutor_instance
        assert tutor1 is tutor2

    def test_global_app_context_instance_exists(self):
        """Test that global app_context instance is available."""
        # Import the global instance
        from src.core.app_context import app_context

        assert isinstance(app_context, AppContext)
        assert app_context is not None

    @patch("src.core.app_context.Database")
    @patch("src.core.app_context.Tutor")
    def test_lazy_initialization_order(self, mock_tutor_class, mock_database_class):
        """Test that database is initialized before tutor."""
        mock_database_instance = MagicMock()
        mock_database_class.return_value = mock_database_instance

        mock_tutor_instance = MagicMock()
        mock_tutor_class.return_value = mock_tutor_instance

        context = AppContext()

        # Access tutor first (should initialize both)
        tutor = context.tutor

        # Verify database was created first
        mock_database_class.assert_called_once()
        mock_tutor_class.assert_called_once_with(database=mock_database_instance)

    def test_independent_instances(self):
        """Test that multiple AppContext instances are independent."""
        context1 = AppContext()
        context2 = AppContext()

        # They should be separate instances
        assert context1 is not context2

        # Initially all should be None
        assert context1._config is None
        assert context2._config is None
        assert context1._database is None
        assert context2._database is None
        assert context1._tutor is None
        assert context2._tutor is None

        # After accessing config, they should have independent config objects
        config1 = context1.config
        config2 = context2.config
        assert config1 is not config2
