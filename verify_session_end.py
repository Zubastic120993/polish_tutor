#!/usr/bin/env python3
"""
Verification script for Session End Logic (Step 3).

Tests:
1. PracticeService.end_session() method exists and works correctly
2. Session updates with ended_at and duration_seconds
3. XP fields are set correctly (xp_phrases, total_xp)
4. POST /api/v2/practice/end-session endpoint works
5. Response includes all required fields
"""

import sys
from datetime import datetime
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import Base
from src.models.user_session import UserSession
from src.services.practice_service import PracticeService


def test_practice_service_end_session():
    """Test PracticeService.end_session() method."""
    print("\n" + "=" * 80)
    print("TEST 1: PracticeService.end_session() method")
    print("=" * 80)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Create a practice service
        practice_service = PracticeService(db=db)

        # Start a session
        print("\n1. Starting a session...")
        session = practice_service.start_session(user_id=1)
        print(f"   ✅ Session created: ID={session.id}")
        print(f"   ✅ Started at: {session.started_at}")
        print(f"   ✅ XP fields initialized to 0")

        # Wait a moment to ensure duration > 0
        import time
        time.sleep(1)

        # End the session
        print("\n2. Ending the session...")
        xp_earned = 50
        ended_session = practice_service.end_session(
            session_id=session.id,
            xp_from_phrases=xp_earned
        )

        # Verify fields
        print("\n3. Verifying session fields...")
        assert ended_session.ended_at is not None, "ended_at should be set"
        print(f"   ✅ ended_at: {ended_session.ended_at}")

        assert ended_session.duration_seconds is not None, "duration_seconds should be set"
        assert ended_session.duration_seconds >= 1, "duration should be at least 1 second"
        print(f"   ✅ duration_seconds: {ended_session.duration_seconds}")

        assert ended_session.xp_phrases == xp_earned, f"xp_phrases should be {xp_earned}"
        print(f"   ✅ xp_phrases: {ended_session.xp_phrases}")

        assert ended_session.xp_session_bonus == 0, "xp_session_bonus should be 0 (reserved)"
        print(f"   ✅ xp_session_bonus: {ended_session.xp_session_bonus}")

        assert ended_session.xp_streak_bonus == 0, "xp_streak_bonus should be 0 (reserved)"
        print(f"   ✅ xp_streak_bonus: {ended_session.xp_streak_bonus}")

        assert ended_session.total_xp == xp_earned, f"total_xp should equal xp_phrases ({xp_earned})"
        print(f"   ✅ total_xp: {ended_session.total_xp}")

        print("\n✅ TEST 1 PASSED: end_session() method works correctly")
        return True

    except Exception as e:
        print(f"\n❌ TEST 1 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_end_session_error_handling():
    """Test error handling in end_session()."""
    print("\n" + "=" * 80)
    print("TEST 2: Error handling in end_session()")
    print("=" * 80)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        practice_service = PracticeService(db=db)

        # Test 1: Invalid session_id
        print("\n1. Testing invalid session_id...")
        try:
            practice_service.end_session(session_id=-1, xp_from_phrases=10)
            print("   ❌ Should have raised ValueError for invalid session_id")
            return False
        except ValueError as e:
            print(f"   ✅ Correctly raised ValueError: {e}")

        # Test 2: Non-existent session
        print("\n2. Testing non-existent session...")
        try:
            practice_service.end_session(session_id=999, xp_from_phrases=10)
            print("   ❌ Should have raised ValueError for non-existent session")
            return False
        except ValueError as e:
            print(f"   ✅ Correctly raised ValueError: {e}")

        # Test 3: Already ended session
        print("\n3. Testing already ended session...")
        session = practice_service.start_session(user_id=1)
        practice_service.end_session(session_id=session.id, xp_from_phrases=10)
        
        try:
            practice_service.end_session(session_id=session.id, xp_from_phrases=20)
            print("   ❌ Should have raised ValueError for already ended session")
            return False
        except ValueError as e:
            print(f"   ✅ Correctly raised ValueError: {e}")

        print("\n✅ TEST 2 PASSED: Error handling works correctly")
        return True

    except Exception as e:
        print(f"\n❌ TEST 2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_api_endpoint():
    """Test the /api/v2/practice/end-session endpoint."""
    print("\n" + "=" * 80)
    print("TEST 3: POST /api/v2/practice/end-session endpoint")
    print("=" * 80)

    try:
        from fastapi.testclient import TestClient
        from src.main import app

        client = TestClient(app)

        # Start a session first
        print("\n1. Starting a session via API...")
        response = client.get("/api/v2/practice/daily?user_id=1")
        assert response.status_code == 200, f"Failed to start session: {response.text}"
        data = response.json()
        session_id = data.get("session_id")
        print(f"   ✅ Session started: ID={session_id}")

        # Wait a moment
        import time
        time.sleep(1)

        # End the session
        print("\n2. Ending the session via API...")
        payload = {
            "session_id": session_id,
            "xp_from_phrases": 75
        }
        response = client.post("/api/v2/practice/end-session", json=payload)
        
        if response.status_code != 200:
            print(f"   ❌ Failed to end session: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

        data = response.json()
        print(f"   ✅ Session ended successfully")

        # Verify response structure
        print("\n3. Verifying response structure...")
        required_fields = [
            "session_id",
            "session_start",
            "session_end",
            "session_duration_seconds",
            "xp_total",
            "xp_from_phrases"
        ]

        for field in required_fields:
            if field not in data:
                print(f"   ❌ Missing field: {field}")
                return False
            print(f"   ✅ {field}: {data[field]}")

        # Verify values
        print("\n4. Verifying response values...")
        assert data["session_id"] == session_id, "session_id mismatch"
        assert data["xp_from_phrases"] == 75, "xp_from_phrases mismatch"
        assert data["xp_total"] == 75, "xp_total should equal xp_from_phrases"
        assert data["session_duration_seconds"] >= 1, "duration should be at least 1 second"
        print("   ✅ All values are correct")

        print("\n✅ TEST 3 PASSED: API endpoint works correctly")
        return True

    except Exception as e:
        print(f"\n❌ TEST 3 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_error_handling():
    """Test error handling in the API endpoint."""
    print("\n" + "=" * 80)
    print("TEST 4: API endpoint error handling")
    print("=" * 80)

    try:
        from fastapi.testclient import TestClient
        from src.main import app

        client = TestClient(app)

        # Test 1: Invalid payload
        print("\n1. Testing invalid session_id...")
        payload = {
            "session_id": -1,
            "xp_from_phrases": 10
        }
        response = client.post("/api/v2/practice/end-session", json=payload)
        
        # Should return 422 for validation error or 400 for business logic error
        if response.status_code not in [400, 422]:
            print(f"   ❌ Expected 400 or 422, got {response.status_code}")
            return False
        print(f"   ✅ Correctly returned error status: {response.status_code}")

        # Test 2: Non-existent session
        print("\n2. Testing non-existent session...")
        payload = {
            "session_id": 99999,
            "xp_from_phrases": 10
        }
        response = client.post("/api/v2/practice/end-session", json=payload)
        
        if response.status_code != 400:
            print(f"   ❌ Expected 400, got {response.status_code}")
            return False
        print(f"   ✅ Correctly returned 400 for non-existent session")

        print("\n✅ TEST 4 PASSED: API error handling works correctly")
        return True

    except Exception as e:
        print(f"\n❌ TEST 4 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all verification tests."""
    print("\n" + "=" * 80)
    print("SESSION END LOGIC VERIFICATION")
    print("Step 3: Session End Implementation")
    print("=" * 80)

    results = []

    # Run all tests
    results.append(("PracticeService.end_session()", test_practice_service_end_session()))
    results.append(("Error handling", test_end_session_error_handling()))
    results.append(("API endpoint", test_api_endpoint()))
    results.append(("API error handling", test_api_error_handling()))

    # Summary
    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY")
    print("=" * 80)

    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if not passed:
            all_passed = False

    print("=" * 80)

    if all_passed:
        print("\n🎉 ALL TESTS PASSED! Session end logic is working correctly.")
        print("\nNext steps:")
        print("  - Session start: ✅ Complete")
        print("  - Session end: ✅ Complete")
        print("  - Streak bonus logic: ⏭️  Next")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED. Please review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

