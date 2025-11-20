"""Shared fixtures for integration tests."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.core.database import SessionLocal
from src.services.badge_seeder import seed_badges
from src.models import User


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Seed badges and create test users once for all integration tests."""
    with SessionLocal() as db:
        # Seed badges
        seed_badges(db)

        # Create test users if they don't exist
        # Integration tests use user_id 1, 2, and 3
        for user_id in [1, 2, 3]:
            existing_user = db.query(User).filter(User.id == user_id).first()
            if not existing_user:
                user = User(
                    id=user_id, name=f"test_user_{user_id}", password_hash="test_hash"
                )
                db.add(user)

        db.commit()
    yield


@pytest.fixture
def client():
    """Create a test client for FastAPI app."""
    return TestClient(app)
