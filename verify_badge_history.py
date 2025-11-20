#!/usr/bin/env python3
"""Verification script for Badge History feature."""

from fastapi.testclient import TestClient
from src.main import app
from src.core.database import SessionLocal
from src.models import UserBadge
from src.services.badge_service import BadgeService
from datetime import datetime


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
    print("Badge History Feature - Verification Tests")
    print("=" * 70)

    # Test 1: Endpoint returns history
    print("\n✅ Test 1: Badge History Endpoint Returns History")
    cleanup_badges(1)

    # Unlock some badges through practice sessions
    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]
    response = client.post(
        "/api/v2/practice/end-session",
        json={
            "session_id": session_id,
            "xp_from_phrases": 50,
            "correct_phrases": 10,
            "total_phrases": 10,
        },
    )
    assert response.status_code == 200

    # Fetch badge history
    response = client.get("/api/v2/user/1/badge-history")
    assert response.status_code == 200
    data = response.json()

    assert "history" in data, "Response should have 'history' field"
    assert isinstance(data["history"], list), "History should be a list"
    assert len(data["history"]) > 0, "Should have at least one badge unlocked"

    print(f"   ✓ Endpoint returned {len(data['history'])} badge(s)")
    print(f"   ✓ Response structure correct")

    # Test 2: History items have required fields
    print("\n✅ Test 2: History Items Have Required Fields")

    item = data["history"][0]
    required_fields = ["code", "name", "description", "icon", "unlocked_at"]

    for field in required_fields:
        assert field in item, f"History item should have '{field}' field"

    print(f"   ✓ All required fields present: {', '.join(required_fields)}")
    print(f"   ✓ Sample badge: {item['name']} ({item['code']})")
    print(f"   ✓ Unlocked at: {item['unlocked_at']}")

    # Test 3: Empty history for new user
    print("\n✅ Test 3: Empty History for New User")
    cleanup_badges(1)

    response = client.get("/api/v2/user/1/badge-history")
    assert response.status_code == 200
    data = response.json()

    assert data["history"] == [], "New user should have empty history"
    print(f"   ✓ Empty history returned correctly")

    # Test 4: Badge details match seeded badges
    print("\n✅ Test 4: Badge Details Match Seeded Badges")
    cleanup_badges(1)

    # Unlock a specific badge
    db = SessionLocal()
    try:
        badge_service = BadgeService(db)
        all_badges = badge_service.get_all_badges()
        streak_badge = next(b for b in all_badges if b.code == "STREAK_3")
        badge_service.unlock_badge(1, streak_badge)
    finally:
        db.close()

    response = client.get("/api/v2/user/1/badge-history")
    assert response.status_code == 200
    data = response.json()

    assert len(data["history"]) == 1
    item = data["history"][0]

    assert item["code"] == "STREAK_3"
    assert item["name"] == "3-Day Streak"
    assert item["description"] == "Practice 3 days in a row."
    assert item["icon"] == "🔥"

    print(f"   ✓ Badge code: {item['code']}")
    print(f"   ✓ Badge name: {item['name']}")
    print(f"   ✓ Badge icon: {item['icon']}")
    print(f"   ✓ All details match seeded badge")

    # Test 5: History is sorted by date (descending)
    print("\n✅ Test 5: History Sorted by Date (Most Recent First)")
    cleanup_badges(1)

    # Unlock multiple badges across different sessions
    for i in range(3):
        response = client.get("/api/v2/practice/daily?user_id=1")
        session_id = response.json()["session_id"]
        client.post(
            "/api/v2/practice/end-session",
            json={
                "session_id": session_id,
                "xp_from_phrases": 50 * (i + 1),
                "correct_phrases": 10,
                "total_phrases": 10,
            },
        )

    response = client.get("/api/v2/user/1/badge-history")
    assert response.status_code == 200
    data = response.json()
    history = data["history"]

    if len(history) > 1:
        # Parse dates and verify sorting
        dates = [
            datetime.fromisoformat(item["unlocked_at"].replace("Z", "+00:00"))
            for item in history
        ]
        for i in range(len(dates) - 1):
            assert (
                dates[i] >= dates[i + 1]
            ), "History should be sorted by date (descending)"

        print(f"   ✓ History has {len(history)} items")
        print(f"   ✓ Items are sorted by unlock date (most recent first)")
        print(f"   ✓ Most recent: {history[0]['name']}")
        print(f"   ✓ Oldest: {history[-1]['name']}")
    else:
        print(f"   ✓ Only one badge unlocked, sorting not applicable")

    # Test 6: Invalid user ID handling
    print("\n✅ Test 6: Invalid User ID Handling")

    response = client.get("/api/v2/user/0/badge-history")
    assert response.status_code == 400, "Should reject user_id=0"

    response = client.get("/api/v2/user/-1/badge-history")
    assert response.status_code == 400, "Should reject negative user_id"

    print(f"   ✓ Rejects invalid user IDs (0, negative)")
    print(f"   ✓ Returns 400 status code")

    # Test 7: Multiple badges included
    print("\n✅ Test 7: All Unlocked Badges Included")
    cleanup_badges(1)

    # Unlock multiple badges
    db = SessionLocal()
    try:
        badge_service = BadgeService(db)
        all_badges = badge_service.get_all_badges()

        codes_to_unlock = ["STREAK_3", "XP_500", "SESSIONS_10"]
        expected_codes = set()

        for badge in all_badges:
            if badge.code in codes_to_unlock:
                badge_service.unlock_badge(1, badge)
                expected_codes.add(badge.code)
    finally:
        db.close()

    response = client.get("/api/v2/user/1/badge-history")
    assert response.status_code == 200
    data = response.json()

    returned_codes = {item["code"] for item in data["history"]}
    assert returned_codes == expected_codes, "Should return all unlocked badges"

    print(f"   ✓ Unlocked {len(expected_codes)} badges")
    print(f"   ✓ All {len(data['history'])} badges included in history")
    print(f"   ✓ Codes: {', '.join(sorted(returned_codes))}")

    print("\n" + "=" * 70)
    print("✅ All Badge History Tests Passed!")
    print("=" * 70)
    print("\nSummary:")
    print("  ✓ /user/<id>/badge-history endpoint works")
    print("  ✓ Returns badge unlocks sorted by date (desc)")
    print("  ✓ Includes icon, description, name, code, unlocked_at")
    print("  ✓ Empty history returns []")
    print("  ✓ Badge details match seeded badges")
    print("  ✓ Invalid user IDs rejected")
    print("  ✓ All unlocked badges included")
    print("=" * 70)

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
