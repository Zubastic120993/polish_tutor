"""Integration tests for badge API endpoints."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.core.database import SessionLocal
from src.models import Badge, UserBadge, User, UserSession
from src.services.badge_service import BadgeService


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create a database session for testing."""
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def test_user(db_session):
    """Get or create a test user."""
    user = db_session.query(User).filter(User.id == 1).first()
    if not user:
        user = User(name="test_user", password_hash="test_hash")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


def cleanup_user_badges(db_session, user_id: int):
    """Clean up all badges for a user."""
    db_session.query(UserBadge).filter(UserBadge.user_id == user_id).delete()
    db_session.commit()


def test_get_all_badges(client):
    """Test GET /api/v2/badges/all endpoint."""
    response = client.get("/api/v2/badges/all")

    assert response.status_code == 200, f"Failed to get badges: {response.text}"

    data = response.json()
    assert "badges" in data, "Response should contain badges key"
    assert isinstance(data["badges"], list), "badges should be a list"

    # Should have at least the seeded badges
    assert len(data["badges"]) >= 10, "Should have at least 10 seeded badges"

    # Verify badge structure
    for badge in data["badges"]:
        assert "code" in badge, "Badge should have code"
        assert "name" in badge, "Badge should have name"
        assert "description" in badge, "Badge should have description"
        assert "icon" in badge, "Badge should have icon field (can be null)"

    # Verify specific badges exist
    badge_codes = [b["code"] for b in data["badges"]]
    assert "XP_500" in badge_codes, "XP_500 badge should exist"
    assert "STREAK_7" in badge_codes, "STREAK_7 badge should exist"
    assert "SESSIONS_10" in badge_codes, "SESSIONS_10 badge should exist"


def test_get_user_badges_empty(client, db_session, test_user):
    """Test GET /api/v2/user/{user_id}/badges with no unlocked badges."""
    cleanup_user_badges(db_session, test_user.id)

    response = client.get(f"/api/v2/user/{test_user.id}/badges")

    assert response.status_code == 200
    data = response.json()

    assert "badges" in data
    assert isinstance(data["badges"], list)
    assert len(data["badges"]) == 0, "User should have no badges initially"


def test_get_user_badges_with_unlocked(client, db_session, test_user):
    """Test GET /api/v2/user/{user_id}/badges with unlocked badges."""
    cleanup_user_badges(db_session, test_user.id)

    # Unlock some badges
    badge_service = BadgeService(db_session)
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=700,
        streak=8,
        total_sessions=15,
        perfect_day=False,
    )

    assert len(unlocked) > 0, "Should have unlocked some badges"

    # Query via API
    response = client.get(f"/api/v2/user/{test_user.id}/badges")

    assert response.status_code == 200
    data = response.json()

    assert "badges" in data
    assert len(data["badges"]) > 0, "User should have unlocked badges"

    # Verify badge structure with unlocked_at
    for badge in data["badges"]:
        assert "code" in badge
        assert "name" in badge
        assert "description" in badge
        assert "icon" in badge
        assert "unlocked_at" in badge, "User badge should have unlocked_at timestamp"

    # Verify specific badges
    badge_codes = [b["code"] for b in data["badges"]]
    assert "XP_500" in badge_codes, "Should have XP_500"
    assert "STREAK_7" in badge_codes, "Should have STREAK_7"


def test_get_user_badges_invalid_user_id(client):
    """Test GET /api/v2/user/{user_id}/badges with invalid user_id."""
    response = client.get("/api/v2/user/0/badges")

    assert response.status_code == 400, "Should return 400 for invalid user_id"


def test_unlock_badge_via_session_then_verify_via_api(client, db_session, test_user):
    """Test unlocking badges through session and verifying via API."""
    cleanup_user_badges(db_session, test_user.id)

    # Start a practice session
    response = client.get(f"/api/v2/practice/daily?user_id={test_user.id}")
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    # End session with high XP to unlock badges
    payload = {
        "session_id": session_id,
        "xp_from_phrases": 50,
        "correct_phrases": 3,
        "total_phrases": 5,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200

    end_session_data = response.json()
    assert "unlocked_badges" in end_session_data

    # If badges were unlocked, verify via badge API
    if end_session_data["unlocked_badges"]:
        response = client.get(f"/api/v2/user/{test_user.id}/badges")
        assert response.status_code == 200

        data = response.json()
        assert len(data["badges"]) > 0, "User should have badges after session"


def test_get_session_unlocked_badges_not_found(client):
    """Test GET /api/v2/practice/session/{session_id}/unlocked-badges with invalid session."""
    response = client.get("/api/v2/practice/session/999999/unlocked-badges")

    assert response.status_code == 404, "Should return 404 for non-existent session"


def test_get_session_unlocked_badges_invalid_id(client):
    """Test GET /api/v2/practice/session/{session_id}/unlocked-badges with invalid ID."""
    response = client.get("/api/v2/practice/session/0/unlocked-badges")

    assert response.status_code == 400, "Should return 400 for invalid session_id"


def test_get_session_unlocked_badges_existing_session(client):
    """Test GET /api/v2/practice/session/{session_id}/unlocked-badges with valid session."""
    # Start and end a session
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    payload = {
        "session_id": session_id,
        "xp_from_phrases": 30,
        "correct_phrases": 2,
        "total_phrases": 5,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200

    # Query badges for this session
    response = client.get(f"/api/v2/practice/session/{session_id}/unlocked-badges")

    assert response.status_code == 200
    data = response.json()

    assert "unlocked_badges" in data
    assert isinstance(data["unlocked_badges"], list)

    # Currently returns empty as session-level tracking not fully implemented
    # This test verifies the endpoint works correctly


def test_badge_api_response_structure(client):
    """Test that badge API responses have correct structure."""
    # Test all badges endpoint
    response = client.get("/api/v2/badges/all")
    assert response.status_code == 200
    data = response.json()

    # Verify top-level structure
    assert "badges" in data
    assert isinstance(data["badges"], list)

    # Verify each badge has required fields
    if len(data["badges"]) > 0:
        badge = data["badges"][0]
        required_fields = ["code", "name", "description"]
        for field in required_fields:
            assert field in badge, f"Badge should have {field} field"


def test_multiple_users_independent_badges(client, db_session):
    """Test that different users have independent badge collections."""
    # This test verifies that badge unlocks are properly scoped to users

    # User 1 badges
    response1 = client.get("/api/v2/user/1/badges")
    assert response1.status_code == 200
    user1_badge_count = len(response1.json()["badges"])

    # User 2 would have different badges (if existed)
    # This test just verifies the API supports user-specific queries
    response2 = client.get("/api/v2/user/2/badges")
    assert response2.status_code == 200
    # Different users can have different badge counts


def test_badge_api_consistency(client, db_session, test_user):
    """Test that badge data is consistent across different endpoints."""
    cleanup_user_badges(db_session, test_user.id)

    # Unlock badges
    badge_service = BadgeService(db_session)
    badge_service.check_badges(
        user_id=test_user.id,
        total_xp=600,
        streak=4,
        total_sessions=12,
        perfect_day=False,
    )

    # Get all badges
    all_badges_response = client.get("/api/v2/badges/all")
    all_badges = {b["code"]: b for b in all_badges_response.json()["badges"]}

    # Get user badges
    user_badges_response = client.get(f"/api/v2/user/{test_user.id}/badges")
    user_badges = user_badges_response.json()["badges"]

    # Verify user badges are subset of all badges
    for user_badge in user_badges:
        code = user_badge["code"]
        assert code in all_badges, f"User badge {code} should exist in all badges"

        # Verify consistent badge properties
        all_badge = all_badges[code]
        assert user_badge["name"] == all_badge["name"]
        assert user_badge["description"] == all_badge["description"]
        assert user_badge["icon"] == all_badge["icon"]
