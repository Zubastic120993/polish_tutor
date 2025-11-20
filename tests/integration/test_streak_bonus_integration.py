"""
Integration test for streak bonus calculation.

This test verifies that:
1. Streak bonus is calculated correctly based on session history
2. Streak values are stored in UserSession
3. The /end-session API returns streak information
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
def test_streak_bonus_end_to_end():
    """Test that streak bonus is calculated and returned correctly."""

    # Create a temporary database for this test
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = tmp_db.name

    try:
        # Run integration test in subprocess to avoid conftest.py interference
        test_script = f"""
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

project_root = Path(r"{PROJECT_ROOT}")
sys.path.insert(0, str(project_root))

os.environ["DATABASE_URL"] = "sqlite:///{tmp_db_path}"

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

# Create a completed session from yesterday (streak = 1)
yesterday = datetime.utcnow() - timedelta(days=1)
past_session = UserSession(
    user_id=1,
    started_at=yesterday,
    ended_at=yesterday + timedelta(minutes=10),
    duration_seconds=600,
    xp_phrases=50,
    xp_streak_bonus=0,
    total_xp=50,
    streak_before=0,
    streak_after=1,
)
session.add(past_session)
session.commit()
session.close()

# Test the API endpoints
client = TestClient(app)

# Start a new session
daily_response = client.get("/api/v2/practice/daily?user_id=1")
assert daily_response.status_code == 200, f"Expected 200, got {{daily_response.status_code}}"
data = daily_response.json()
session_id = data["session_id"]
print("Started session:", session_id)

# End the session with XP
end_payload = {{
    "session_id": session_id,
    "xp_from_phrases": 100
}}
end_response = client.post("/api/v2/practice/end-session", json=end_payload)
assert end_response.status_code == 200, f"Expected 200, got {{end_response.status_code}}"

end_data = end_response.json()
print("End session response:", json.dumps(end_data, indent=2))

# Verify streak bonus is included in response
assert "streak_before" in end_data, f"streak_before not in response: {{end_data}}"
assert "streak_after" in end_data, f"streak_after not in response: {{end_data}}"
assert "xp_streak_bonus" in end_data, f"xp_streak_bonus not in response: {{end_data}}"

# Verify streak values
assert end_data["streak_before"] == 1, f"Expected streak_before=1, got {{end_data['streak_before']}}"
assert end_data["streak_after"] == 2, f"Expected streak_after=2, got {{end_data['streak_after']}}"

# Streak of 2 should give no bonus (need 3+ for bonus)
assert end_data["xp_streak_bonus"] == 0, f"Expected xp_streak_bonus=0, got {{end_data['xp_streak_bonus']}}"

# Total XP should be phrases + session_bonus + streak_bonus
assert end_data["xp_total"] == 110, f"Expected xp_total=110 (100+10+0), got {{end_data['xp_total']}}"

# Verify in database
session = Session()
db_session = session.query(UserSession).filter(UserSession.id == session_id).first()
assert db_session is not None
assert db_session.streak_before == 1
assert db_session.streak_after == 2
assert db_session.xp_streak_bonus == 0
assert db_session.xp_session_bonus == 10
assert db_session.total_xp == 110
print("VERIFIED: Streak values stored in database")
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
        ), f"Test failed with return code {{result.returncode}}\\nSTDOUT: {{result.stdout}}\\nSTDERR: {{result.stderr}}"
        assert "TEST PASSED" in result.stdout

    finally:
        # Clean up temporary database
        if os.path.exists(tmp_db_path):
            os.unlink(tmp_db_path)


@pytest.mark.integration
def test_streak_bonus_with_7_day_streak():
    """Test that 7-day streak gives 25 XP bonus."""

    # Create a temporary database for this test
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = tmp_db.name

    try:
        test_script = f"""
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

project_root = Path(r"{PROJECT_ROOT}")
sys.path.insert(0, str(project_root))

os.environ["DATABASE_URL"] = "sqlite:///{tmp_db_path}"

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

# Create a completed session from yesterday with 6-day streak
yesterday = datetime.utcnow() - timedelta(days=1)
past_session = UserSession(
    user_id=1,
    started_at=yesterday,
    ended_at=yesterday + timedelta(minutes=10),
    duration_seconds=600,
    xp_phrases=50,
    xp_streak_bonus=10,
    total_xp=60,
    streak_before=5,
    streak_after=6,
)
session.add(past_session)
session.commit()
session.close()

# Test the API endpoints
client = TestClient(app)

# Start and end a new session
daily_response = client.get("/api/v2/practice/daily?user_id=1")
session_id = daily_response.json()["session_id"]

end_payload = {{
    "session_id": session_id,
    "xp_from_phrases": 80
}}
end_response = client.post("/api/v2/practice/end-session", json=end_payload)
end_data = end_response.json()

# Verify 7-day streak gives 25 XP bonus
assert end_data["streak_before"] == 6, f"Expected streak_before=6, got {{end_data['streak_before']}}"
assert end_data["streak_after"] == 7, f"Expected streak_after=7, got {{end_data['streak_after']}}"
assert end_data["xp_streak_bonus"] == 25, f"Expected xp_streak_bonus=25, got {{end_data['xp_streak_bonus']}}"
assert end_data["xp_total"] == 115, f"Expected xp_total=115 (80+10+25), got {{end_data['xp_total']}}"

print("TEST PASSED: 7-day streak gives 25 XP bonus")
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
        ), f"Test failed\\nSTDOUT: {{result.stdout}}\\nSTDERR: {{result.stderr}}"
        assert "TEST PASSED" in result.stdout

    finally:
        if os.path.exists(tmp_db_path):
            os.unlink(tmp_db_path)


@pytest.mark.integration
def test_session_bonus_integration():
    """Test that session completion bonus is calculated and returned correctly."""

    # Create a temporary database for this test
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        tmp_db_path = tmp_db.name

    try:
        test_script = f"""
import json
import os
import sys
from pathlib import Path
from datetime import datetime

project_root = Path(r"{PROJECT_ROOT}")
sys.path.insert(0, str(project_root))

os.environ["DATABASE_URL"] = "sqlite:///{tmp_db_path}"

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

# Test the API endpoints
client = TestClient(app)

# Start a new session
daily_response = client.get("/api/v2/practice/daily?user_id=1")
assert daily_response.status_code == 200, f"Expected 200, got {{daily_response.status_code}}"
data = daily_response.json()
session_id = data["session_id"]
print("Started session:", session_id)

# End the session with XP
end_payload = {{
    "session_id": session_id,
    "xp_from_phrases": 50
}}
end_response = client.post("/api/v2/practice/end-session", json=end_payload)
assert end_response.status_code == 200, f"Expected 200, got {{end_response.status_code}}"

end_data = end_response.json()
print("End session response:", json.dumps(end_data, indent=2))

# Verify session bonus is included in response
assert "xp_session_bonus" in end_data, f"xp_session_bonus not in response: {{end_data}}"

# Verify session bonus is 10
assert end_data["xp_session_bonus"] == 10, f"Expected xp_session_bonus=10, got {{end_data['xp_session_bonus']}}"

# Total XP should be phrases + session_bonus + streak_bonus
# First session: streak_after = 1, so streak_bonus = 0
expected_total = 50 + 10 + 0  # phrases + session_bonus + streak_bonus
assert end_data["xp_total"] == expected_total, f"Expected xp_total={{expected_total}}, got {{end_data['xp_total']}}"

# Verify in database
session = Session()
db_session = session.query(UserSession).filter(UserSession.id == session_id).first()
assert db_session is not None
assert db_session.xp_session_bonus == 10, f"Expected db xp_session_bonus=10, got {{db_session.xp_session_bonus}}"
assert db_session.xp_phrases == 50, f"Expected db xp_phrases=50, got {{db_session.xp_phrases}}"
assert db_session.xp_streak_bonus == 0, f"Expected db xp_streak_bonus=0, got {{db_session.xp_streak_bonus}}"
assert db_session.total_xp == expected_total, f"Expected db total_xp={{expected_total}}, got {{db_session.total_xp}}"
print("VERIFIED: Session bonus stored in database correctly")
session.close()

print("TEST PASSED: Session bonus integration")
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
    test_streak_bonus_end_to_end()
    test_streak_bonus_with_7_day_streak()
    test_session_bonus_integration()
    print("✅ All integration tests passed!")
