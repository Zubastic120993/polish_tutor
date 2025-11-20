"""Integration tests for weekly statistics endpoint."""

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def test_no_sessions_returns_zeros(client):
    """Test that a user with no sessions gets all zero stats."""
    response = client.get("/api/v2/practice/weekly-stats?user_id=999")
    assert response.status_code == 200

    data = response.json()
    assert data["total_sessions"] == 0
    assert data["total_xp"] == 0
    assert data["total_time_seconds"] == 0
    assert data["weekly_streak"] == 0
    assert data["days"] == []


def test_endpoint_structure(client):
    """Test that the endpoint returns correct structure."""
    response = client.get("/api/v2/practice/weekly-stats?user_id=1")
    assert response.status_code == 200

    data = response.json()

    # Check all required fields exist
    assert "total_sessions" in data
    assert "total_xp" in data
    assert "total_time_seconds" in data
    assert "weekly_streak" in data
    assert "days" in data

    # Check types
    assert isinstance(data["total_sessions"], int)
    assert isinstance(data["total_xp"], int)
    assert isinstance(data["total_time_seconds"], int)
    assert isinstance(data["weekly_streak"], int)
    assert isinstance(data["days"], list)


def test_after_practice_session(client):
    """Test weekly stats after completing a practice session."""
    # Start a practice session
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    # End the session with some XP
    payload = {"session_id": session_id, "xp_from_phrases": 100}
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200

    # Get weekly stats
    response = client.get("/api/v2/practice/weekly-stats?user_id=1")
    assert response.status_code == 200

    data = response.json()

    # Should have at least one session now
    assert data["total_sessions"] >= 1
    assert data["total_xp"] >= 100
    assert data["total_time_seconds"] >= 0
    assert data["weekly_streak"] >= 1

    # Days should have at least one entry
    assert len(data["days"]) >= 1

    # Check day structure
    if len(data["days"]) > 0:
        day = data["days"][0]
        assert "date" in day
        assert "sessions" in day
        assert "xp" in day
        assert "time_seconds" in day


def test_multiple_sessions_same_day(client):
    """Test that multiple sessions on the same day are aggregated correctly."""
    user_id = 2

    # Create first session
    response = client.get(f"/api/v2/practice/daily?user_id={user_id}")
    assert response.status_code == 200
    session_id_1 = response.json()["session_id"]

    response = client.post(
        "/api/v2/practice/end-session",
        json={"session_id": session_id_1, "xp_from_phrases": 50},
    )
    assert response.status_code == 200

    # Create second session
    response = client.get(f"/api/v2/practice/daily?user_id={user_id}")
    assert response.status_code == 200
    session_id_2 = response.json()["session_id"]

    response = client.post(
        "/api/v2/practice/end-session",
        json={"session_id": session_id_2, "xp_from_phrases": 75},
    )
    assert response.status_code == 200

    # Get weekly stats
    response = client.get(f"/api/v2/practice/weekly-stats?user_id={user_id}")
    assert response.status_code == 200

    data = response.json()

    # Should have 2 sessions
    assert data["total_sessions"] >= 2
    # XP should be at least the sum of both sessions (may include bonuses)
    assert data["total_xp"] >= 125
    # Streak should be 1 (same day)
    assert data["weekly_streak"] == 1


def test_invalid_user_id(client):
    """Test that invalid user ID returns appropriate response."""
    # Negative user ID
    response = client.get("/api/v2/practice/weekly-stats?user_id=-1")
    assert response.status_code in [400, 422], "Should reject negative user_id"


def test_date_format(client):
    """Test that dates in response are in correct format."""
    # Create a session first
    response = client.get("/api/v2/practice/daily?user_id=3")
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    response = client.post(
        "/api/v2/practice/end-session",
        json={"session_id": session_id, "xp_from_phrases": 50},
    )
    assert response.status_code == 200

    # Get weekly stats
    response = client.get("/api/v2/practice/weekly-stats?user_id=3")
    assert response.status_code == 200

    data = response.json()

    # Check date format (YYYY-MM-DD)
    if len(data["days"]) > 0:
        date_str = data["days"][0]["date"]
        assert len(date_str) == 10
        assert date_str[4] == "-"
        assert date_str[7] == "-"

        # Check that it's a valid date
        from datetime import datetime

        datetime.strptime(date_str, "%Y-%m-%d")


def test_days_sorted_chronologically(client):
    """Test that days are sorted in chronological order."""
    # Create a session
    response = client.get("/api/v2/practice/daily?user_id=4")
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    response = client.post(
        "/api/v2/practice/end-session",
        json={"session_id": session_id, "xp_from_phrases": 50},
    )
    assert response.status_code == 200

    # Get weekly stats
    response = client.get("/api/v2/practice/weekly-stats?user_id=4")
    assert response.status_code == 200

    data = response.json()

    # Check that days are in ascending order
    dates = [day["date"] for day in data["days"]]
    assert dates == sorted(dates), "Days should be sorted chronologically"


def test_no_incomplete_sessions_in_stats(client):
    """Test that incomplete sessions (not ended) don't appear in weekly stats."""
    user_id = 5

    # Start but don't end a session
    response = client.get(f"/api/v2/practice/daily?user_id={user_id}")
    assert response.status_code == 200
    incomplete_session_id = response.json()["session_id"]

    # Get weekly stats (should be empty)
    response = client.get(f"/api/v2/practice/weekly-stats?user_id={user_id}")
    assert response.status_code == 200

    data = response.json()

    # The incomplete session should not be counted
    # (assuming this is a fresh user with no other sessions)
    # Note: If user 5 has existing sessions, this test would need adjustment
    assert data["total_sessions"] == 0, "Incomplete sessions should not be counted"
