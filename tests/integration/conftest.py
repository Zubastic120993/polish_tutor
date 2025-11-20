"""Shared fixtures for integration tests."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.core.database import SessionLocal
from src.services.badge_seeder import seed_badges


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Seed badges once for all integration tests."""
    with SessionLocal() as db:
        seed_badges(db)
    yield


@pytest.fixture
def client():
    """Create a test client for FastAPI app."""
    return TestClient(app)

