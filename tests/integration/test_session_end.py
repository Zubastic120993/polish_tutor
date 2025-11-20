"""Integration tests for session end functionality."""

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def test_session_end_flow(client):
    """Test the complete session start and end flow via API."""
    # Start a session
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200, f"Failed to start session: {response.text}"
    
    data = response.json()
    assert "session_id" in data, "session_id missing from response"
    session_id = data["session_id"]
    assert session_id > 0, "session_id should be positive"
    
    # End the session
    payload = {
        "session_id": session_id,
        "xp_from_phrases": 100
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200, f"Failed to end session: {response.text}"
    
    data = response.json()
    
    # Verify response structure
    assert data["session_id"] == session_id
    assert "session_start" in data
    assert "session_end" in data
    assert "session_duration_seconds" in data
    assert data["xp_from_phrases"] == 100
    assert data["xp_total"] == 100  # Should equal xp_from_phrases for now


def test_end_session_invalid_id(client):
    """Test ending a session with invalid session ID."""
    payload = {
        "session_id": -1,
        "xp_from_phrases": 50
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code in [400, 422], "Should return validation error"


def test_end_session_nonexistent(client):
    """Test ending a non-existent session."""
    payload = {
        "session_id": 99999,
        "xp_from_phrases": 50
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 400, "Should return 400 for non-existent session"


def test_end_session_twice(client):
    """Test that ending a session twice fails."""
    # Start a session
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200
    session_id = response.json()["session_id"]
    
    # End the session once
    payload = {
        "session_id": session_id,
        "xp_from_phrases": 50
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    
    # Try to end it again
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 400, "Should not be able to end session twice"

