"""Integration tests for badge unlock engine."""

import pytest

from src.core.database import SessionLocal
from src.models import Badge, UserBadge, User, UserSession
from src.services.badge_service import BadgeService


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


def test_xp_500_badge_unlock(db_session, test_user):
    """Test that crossing 500 XP unlocks XP_500 badge."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Check with less than 500 XP - should not unlock
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=400,
        streak=0,
        total_sessions=5,
        perfect_day=False,
    )
    assert not any(
        b.code == "XP_500" for b in unlocked
    ), "XP_500 should not unlock with 400 XP"

    # Check with 500+ XP - should unlock
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=550,
        streak=0,
        total_sessions=5,
        perfect_day=False,
    )
    assert any(b.code == "XP_500" for b in unlocked), "XP_500 should unlock with 550 XP"

    # Verify badge is in database
    user_badge = (
        db_session.query(UserBadge)
        .join(Badge)
        .filter(UserBadge.user_id == test_user.id, Badge.code == "XP_500")
        .first()
    )
    assert user_badge is not None, "XP_500 badge should be in database"


def test_streak_7_badge_unlock(db_session, test_user):
    """Test that 7-day streak unlocks STREAK_7 badge."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Check with 6-day streak - should not unlock
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=100,
        streak=6,
        total_sessions=6,
        perfect_day=False,
    )
    assert not any(
        b.code == "STREAK_7" for b in unlocked
    ), "STREAK_7 should not unlock with 6-day streak"

    # Check with 7-day streak - should unlock
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=100,
        streak=7,
        total_sessions=7,
        perfect_day=False,
    )
    assert any(
        b.code == "STREAK_7" for b in unlocked
    ), "STREAK_7 should unlock with 7-day streak"


def test_unlocking_twice_does_not_duplicate(db_session, test_user):
    """Test that unlocking a badge twice does not create duplicates."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Unlock badge first time
    unlocked1 = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=600,
        streak=0,
        total_sessions=5,
        perfect_day=False,
    )
    assert any(b.code == "XP_500" for b in unlocked1), "XP_500 should unlock first time"

    # Try to unlock again
    unlocked2 = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=700,
        streak=0,
        total_sessions=5,
        perfect_day=False,
    )
    assert not any(
        b.code == "XP_500" for b in unlocked2
    ), "XP_500 should not unlock second time"

    # Verify only one badge exists in database
    count = (
        db_session.query(UserBadge)
        .join(Badge)
        .filter(UserBadge.user_id == test_user.id, Badge.code == "XP_500")
        .count()
    )
    assert count == 1, "Should have exactly one XP_500 badge"


def test_session_milestone_badges(db_session, test_user):
    """Test that session milestones unlock SESSIONS_* badges."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Check with 10 sessions - should unlock SESSIONS_10
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=100,
        streak=0,
        total_sessions=10,
        perfect_day=False,
    )
    assert any(
        b.code == "SESSIONS_10" for b in unlocked
    ), "SESSIONS_10 should unlock with 10 sessions"

    # Check with 50 sessions - should unlock SESSIONS_50
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=100,
        streak=0,
        total_sessions=50,
        perfect_day=False,
    )
    assert any(
        b.code == "SESSIONS_50" for b in unlocked
    ), "SESSIONS_50 should unlock with 50 sessions"

    # Check with 200 sessions - should unlock SESSIONS_200
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=100,
        streak=0,
        total_sessions=200,
        perfect_day=False,
    )
    assert any(
        b.code == "SESSIONS_200" for b in unlocked
    ), "SESSIONS_200 should unlock with 200 sessions"


def test_multiple_badges_unlock_simultaneously(db_session, test_user):
    """Test that multiple badges can unlock in the same check."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Check with conditions for multiple badges
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=2500,  # Should unlock XP_500 and XP_2000
        streak=8,  # Should unlock STREAK_3 and STREAK_7
        total_sessions=15,  # Should unlock SESSIONS_10
        perfect_day=False,
    )

    unlocked_codes = [b.code for b in unlocked]

    # Should have unlocked multiple badges
    assert "XP_500" in unlocked_codes, "XP_500 should unlock"
    assert "XP_2000" in unlocked_codes, "XP_2000 should unlock"
    assert "STREAK_3" in unlocked_codes, "STREAK_3 should unlock"
    assert "STREAK_7" in unlocked_codes, "STREAK_7 should unlock"
    assert "SESSIONS_10" in unlocked_codes, "SESSIONS_10 should unlock"

    assert len(unlocked) == 5, f"Should unlock 5 badges, got {len(unlocked)}"


def test_badge_service_get_user_badges(db_session, test_user):
    """Test getting all badges for a user."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Initially should have no badges
    user_badges = badge_service.get_user_badges(test_user.id)
    assert len(user_badges) == 0, "User should start with no badges"

    # Unlock some badges
    badge_service.check_badges(
        user_id=test_user.id,
        total_xp=600,
        streak=4,
        total_sessions=12,
        perfect_day=False,
    )

    # Now should have badges
    user_badges = badge_service.get_user_badges(test_user.id)
    assert len(user_badges) > 0, "User should have unlocked badges"


def test_perfect_day_badge_unlock(db_session, test_user):
    """Test that perfect_day flag unlocks PERFECT_DAY badge."""
    cleanup_user_badges(db_session, test_user.id)

    badge_service = BadgeService(db_session)

    # Check without perfect_day - should not unlock
    unlocked = badge_service.check_badges(
        user_id=test_user.id,
        total_xp=100,
        streak=0,
        total_sessions=5,
        perfect_day=False,
    )
    assert not any(
        b.code == "PERFECT_DAY" for b in unlocked
    ), "PERFECT_DAY should not unlock without perfect_day=True"

    # Check with perfect_day=True - should unlock
    unlocked = badge_service.check_badges(
        user_id=test_user.id, total_xp=100, streak=0, total_sessions=5, perfect_day=True
    )
    assert any(
        b.code == "PERFECT_DAY" for b in unlocked
    ), "PERFECT_DAY should unlock with perfect_day=True"


def test_end_session_endpoint_includes_unlocked_badges(client):
    """Test that end-session API endpoint returns unlocked badges."""
    # Start a session
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200
    session_id = response.json()["session_id"]

    # End session with high XP to potentially unlock badges
    payload = {
        "session_id": session_id,
        "xp_from_phrases": 100,
        "correct_phrases": 5,
        "total_phrases": 5,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200

    data = response.json()

    # Verify response includes unlocked_badges field
    assert "unlocked_badges" in data, "Response should include unlocked_badges field"
    assert isinstance(data["unlocked_badges"], list), "unlocked_badges should be a list"
