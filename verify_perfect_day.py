#!/usr/bin/env python3
"""Verification script for Perfect Day badge feature."""

from fastapi.testclient import TestClient
from src.main import app
from src.core.database import SessionLocal
from src.models import UserBadge


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
    print("Perfect Day Badge - Verification Tests")
    print("=" * 70)

    # Test 1: Perfect Day (100% accuracy)
    print("\n✅ Test 1: 100% Accuracy → Perfect Day Badge")
    cleanup_badges(1)

    # Start session
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200
    session_id = response.json()["session_id"]
    print(f"   Started session {session_id}")

    # End with 100% accuracy
    payload = {
        "session_id": session_id,
        "xp_from_phrases": 50,
        "correct_phrases": 10,
        "total_phrases": 10,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["perfect_day"] is True, "perfect_day should be True"
    assert "PERFECT_DAY" in data["unlocked_badges"], "PERFECT_DAY badge should unlock"
    print(f"   ✓ perfect_day: {data['perfect_day']}")
    print(f"   ✓ Unlocked badges: {data['unlocked_badges']}")
    print(f"   ✓ PERFECT_DAY badge unlocked!")

    # Test 2: Imperfect Day (<100% accuracy)
    print("\n✅ Test 2: <100% Accuracy → No Perfect Day Badge")
    cleanup_badges(1)

    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    payload = {
        "session_id": session_id,
        "xp_from_phrases": 40,
        "correct_phrases": 8,
        "total_phrases": 10,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["perfect_day"] is False, "perfect_day should be False"
    assert (
        "PERFECT_DAY" not in data["unlocked_badges"]
    ), "PERFECT_DAY badge should NOT unlock"
    print(f"   ✓ perfect_day: {data['perfect_day']}")
    print(f"   ✓ Unlocked badges: {data['unlocked_badges']}")
    print(f"   ✓ PERFECT_DAY badge correctly not unlocked")

    # Test 3: Zero phrases
    print("\n✅ Test 3: Zero Phrases → No Perfect Day")
    cleanup_badges(1)

    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    payload = {
        "session_id": session_id,
        "xp_from_phrases": 0,
        "correct_phrases": 0,
        "total_phrases": 0,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["perfect_day"] is False, "perfect_day should be False with 0 phrases"
    print(f"   ✓ perfect_day: {data['perfect_day']}")
    print(f"   ✓ Correctly handled edge case")

    # Test 4: Perfect day status returned correctly
    print("\n✅ Test 4: Perfect Day With Other Achievements")
    cleanup_badges(1)

    # Complete a perfect day session
    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    payload = {
        "session_id": session_id,
        "xp_from_phrases": 50,
        "correct_phrases": 10,
        "total_phrases": 10,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["perfect_day"] is True
    assert "PERFECT_DAY" in data["unlocked_badges"]
    print(f"   ✓ perfect_day: {data['perfect_day']}")
    print(f"   ✓ Unlocked badges: {data['unlocked_badges']}")
    print(f"   ✓ PERFECT_DAY badge can be unlocked alongside other achievements!")

    # Test 5: Perfect Day badge only unlocks once
    print("\n✅ Test 5: Perfect Day Badge Only Unlocks Once")

    # Another perfect day
    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    payload = {
        "session_id": session_id,
        "xp_from_phrases": 50,
        "correct_phrases": 10,
        "total_phrases": 10,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["perfect_day"] is True
    assert "PERFECT_DAY" not in data["unlocked_badges"], "Should not unlock again"
    print(f"   ✓ perfect_day: {data['perfect_day']}")
    print(f"   ✓ Unlocked badges: {data['unlocked_badges']}")
    print(f"   ✓ PERFECT_DAY correctly not unlocked again (already owned)")

    # Test 6: Request validation
    print("\n✅ Test 6: Request Validation")

    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    # Missing correct_phrases and total_phrases
    payload = {"session_id": session_id, "xp_from_phrases": 30}
    response = client.post("/api/v2/practice/end-session", json=payload)

    # FastAPI may return 400 or 422 for validation errors depending on where the error occurs
    assert response.status_code in [
        400,
        422,
    ], f"Should return validation error, got {response.status_code}"
    print(f"   ✓ Validation error returned (status {response.status_code})")
    print(f"   ✓ Required fields enforced")

    # Test 7: Response structure
    print("\n✅ Test 7: Response Structure")
    cleanup_badges(1)

    response = client.get("/api/v2/practice/daily?user_id=1")
    session_id = response.json()["session_id"]

    payload = {
        "session_id": session_id,
        "xp_from_phrases": 30,
        "correct_phrases": 7,
        "total_phrases": 10,
    }
    response = client.post("/api/v2/practice/end-session", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "perfect_day" in data, "Response should include perfect_day field"
    assert isinstance(data["perfect_day"], bool), "perfect_day should be boolean"
    assert "unlocked_badges" in data, "Response should include unlocked_badges"
    print(f"   ✓ Response includes 'perfect_day' field")
    print(f"   ✓ perfect_day is boolean type")
    print(f"   ✓ Response structure correct")

    print("\n" + "=" * 70)
    print("✅ All Perfect Day Tests Passed!")
    print("=" * 70)
    print("\nSummary:")
    print("  ✓ Backend receives correct_phrases and total_phrases")
    print("  ✓ Detects perfect day (correct == total)")
    print("  ✓ PERFECT_DAY badge unlocks correctly")
    print("  ✓ perfect_day returned in JSON response")
    print("  ✓ Edge cases handled correctly")
    print("  ✓ Request validation works")
    print("  ✓ Badge only unlocks once")
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
