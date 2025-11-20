#!/usr/bin/env python3
"""Verification script for Profile API endpoint."""

from fastapi.testclient import TestClient
from src.main import app
from src.core.database import SessionLocal
from src.models import UserBadge
from src.services.badge_service import BadgeService


def cleanup_badges(user_id: int):
    """Clean up badges for testing."""
    db = SessionLocal()
    try:
        db.query(UserBadge).filter(UserBadge.user_id == user_id).delete()
        db.commit()
    finally:
        db.close()


def main():
    client = TestClient(app)

    print("=" * 70)
    print("Profile API - Verification Tests")
    print("=" * 70)

    # Test 1: Profile endpoint exists and returns data
    print("\n✅ Test 1: Profile Endpoint Returns Data")

    response = client.get("/api/v2/user/1/profile")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    data = response.json()
    print(f"   ✓ Endpoint returned status 200")
    print(f"   ✓ Response received")

    # Test 2: Response has required fields
    print("\n✅ Test 2: Response Has Required Fields")

    required_fields = [
        "user_id",
        "total_xp",
        "total_sessions",
        "current_streak",
        "level",
        "next_level_xp",
        "xp_for_next_level",
        "best_badges",
    ]

    for field in required_fields:
        assert field in data, f"Missing field: {field}"

    print(f"   ✓ All required fields present")
    print(f"   ✓ user_id: {data['user_id']}")
    print(f"   ✓ total_xp: {data['total_xp']}")
    print(f"   ✓ total_sessions: {data['total_sessions']}")
    print(f"   ✓ current_streak: {data['current_streak']}")
    print(f"   ✓ level: {data['level']}")
    print(f"   ✓ next_level_xp: {data['next_level_xp']}")
    print(f"   ✓ xp_for_next_level: {data['xp_for_next_level']}")
    print(f"   ✓ best_badges count: {len(data['best_badges'])}")

    # Test 3: Field types are correct
    print("\n✅ Test 3: Field Types Are Correct")

    assert isinstance(data["user_id"], int)
    assert isinstance(data["total_xp"], int)
    assert isinstance(data["total_sessions"], int)
    assert isinstance(data["current_streak"], int)
    assert isinstance(data["level"], int)
    assert isinstance(data["next_level_xp"], int)
    assert isinstance(data["xp_for_next_level"], int)
    assert isinstance(data["best_badges"], list)

    print(f"   ✓ All field types correct")

    # Test 4: Best badges structure
    print("\n✅ Test 4: Best Badges Structure")

    if len(data["best_badges"]) > 0:
        badge = data["best_badges"][0]
        assert "code" in badge
        assert "name" in badge
        assert "icon" in badge

        print(f"   ✓ Badge structure correct")
        print(f"   ✓ Sample badge: {badge['name']} ({badge['code']})")
        print(f"   ✓ Icon: {badge['icon']}")
    else:
        print(f"   ✓ No badges unlocked yet (valid state)")

    # Test 5: Level computation
    print("\n✅ Test 5: Level Computation")

    # The level should be consistent with XP
    assert data["level"] >= 1, "Level should be at least 1"
    assert data["next_level_xp"] >= 0, "Next level XP should be non-negative"
    assert data["xp_for_next_level"] >= 0, "XP for next level should be non-negative"

    print(f"   ✓ Level: {data['level']}")
    print(f"   ✓ Next level requires: {data['next_level_xp']} XP")
    print(f"   ✓ XP needed for next level: {data['xp_for_next_level']}")

    # Test 6: Practice some sessions and check updated profile
    print("\n✅ Test 6: Profile Updates After Practice Sessions")
    cleanup_badges(1)

    # Get initial profile
    response = client.get("/api/v2/user/1/profile")
    initial_data = response.json()
    initial_sessions = initial_data["total_sessions"]
    initial_xp = initial_data["total_xp"]

    # Complete a practice session
    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    response = client.post(
        "/api/v2/practice/end-session",
        json={
            "session_id": session_id,
            "xp_from_phrases": 100,
            "correct_phrases": 10,
            "total_phrases": 10,
        },
    )
    assert response.status_code == 200

    # Get updated profile
    response = client.get("/api/v2/user/1/profile")
    updated_data = response.json()

    # Verify profile was updated
    assert (
        updated_data["total_sessions"] > initial_sessions
    ), "Session count should increase"
    assert updated_data["total_xp"] > initial_xp, "XP should increase"

    print(f"   ✓ Sessions: {initial_sessions} → {updated_data['total_sessions']}")
    print(f"   ✓ XP: {initial_xp} → {updated_data['total_xp']}")
    print(f"   ✓ Profile updates correctly after practice")

    # Test 7: Invalid user ID handling
    print("\n✅ Test 7: Invalid User ID Handling")

    response = client.get("/api/v2/user/0/profile")
    assert response.status_code == 400, "Should reject user_id=0"

    response = client.get("/api/v2/user/-1/profile")
    assert response.status_code == 400, "Should reject negative user_id"

    print(f"   ✓ Rejects invalid user IDs")
    print(f"   ✓ Returns 400 status code")

    # Test 8: Best badges (top 4)
    print("\n✅ Test 8: Best Badges Limited to 4")
    cleanup_badges(1)

    # Unlock multiple badges
    db = SessionLocal()
    try:
        badge_service = BadgeService(db)
        all_badges = badge_service.get_all_badges()

        # Unlock 6 badges
        for i, badge in enumerate(all_badges[:6]):
            badge_service.unlock_badge(1, badge)
    finally:
        db.close()

    response = client.get("/api/v2/user/1/profile")
    data = response.json()

    assert len(data["best_badges"]) <= 4, "Should return at most 4 badges"
    print(f"   ✓ Best badges limited to {len(data['best_badges'])} (max 4)")

    if len(data["best_badges"]) > 0:
        print(f"   ✓ Top badges: {', '.join([b['name'] for b in data['best_badges']])}")

    print("\n" + "=" * 70)
    print("✅ All Profile API Tests Passed!")
    print("=" * 70)
    print("\nSummary:")
    print("  ✓ /user/<id>/profile endpoint works")
    print("  ✓ Returns all required fields")
    print("  ✓ Field types correct")
    print("  ✓ Best badges structure correct")
    print("  ✓ Level computation works")
    print("  ✓ Profile updates after practice")
    print("  ✓ Invalid user IDs rejected")
    print("  ✓ Best badges limited to 4")
    print("=" * 70)

    # Print example output
    print("\n📊 Example Profile Response:")
    print("-" * 70)
    response = client.get("/api/v2/user/1/profile")
    import json

    print(json.dumps(response.json(), indent=2))
    print("-" * 70)

    return True


if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except AssertionError as e:
        print(f"\n❌ Test Failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        exit(1)
