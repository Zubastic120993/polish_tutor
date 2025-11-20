"""
Integration test for practice session tracking via API.

This test verifies that:
1. The /api/v2/practice/daily endpoint creates a session
2. The session_id is returned in the response
3. A UserSession record is created in the database
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.integration
def test_practice_daily_creates_session():
    """Test that the /api/v2/practice/daily endpoint creates and returns a session."""

    # Create a temporary database for this test
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = tmp_db.name

    try:
        # Run integration test in subprocess to avoid conftest.py interference
        test_script = f"""
import os
import sys
from pathlib import Path

project_root = Path(r"{PROJECT_ROOT}")
sys.path.insert(0, str(project_root))

os.environ["DATABASE_URL"] = "sqlite:///{tmp_db_path}"

from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import Base
from src.models.user import User
from src.models.user_session import UserSession
from main import app

# Create database and test user
engine = create_engine("sqlite:///{tmp_db_path}")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

test_user = User(id=1, name="test_user")
session.add(test_user)
session.commit()
session.close()

# Test the API endpoint
client = TestClient(app)
response = client.get("/api/v2/practice/daily?user_id=1")

print("STATUS:", response.status_code)
print("RESPONSE:", response.json())

# Verify response
assert response.status_code == 200, f"Expected 200, got {{response.status_code}}"
data = response.json()
assert "session_id" in data, f"session_id not in response: {{data}}"
assert data["session_id"] is not None, "session_id should not be None"
print("SESSION_ID:", data["session_id"])

# Verify UserSession was created in database
session = Session()
user_session = session.query(UserSession).filter(UserSession.id == data["session_id"]).first()
assert user_session is not None, f"UserSession with id {{data['session_id']}} not found"
assert user_session.user_id == 1
assert user_session.ended_at is None
assert user_session.xp_phrases == 0
assert user_session.total_xp == 0
print("VERIFIED: UserSession created in database")
session.close()

print("TEST PASSED")
"""

        result = subprocess.run(
            [sys.executable, "-c", test_script],
            capture_output=True,
            text=True,
            env={**os.environ, "DATABASE_URL": f"sqlite:///{tmp_db_path}"},
        )

        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)

        assert (
            result.returncode == 0
        ), f"Test failed with return code {result.returncode}\\nSTDOUT: {result.stdout}\\nSTDERR: {result.stderr}"
        assert "TEST PASSED" in result.stdout

    finally:
        # Clean up temporary database
        if os.path.exists(tmp_db_path):
            os.unlink(tmp_db_path)


if __name__ == "__main__":
    test_practice_daily_creates_session()
    print("✅ All tests passed!")
