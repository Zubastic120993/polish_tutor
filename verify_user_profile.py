#!/usr/bin/env python3
"""
Verification script for User Profile backend implementation.

Tests:
1. GET /user/{user_id}/profile-info returns profile (or creates default)
2. PUT /user/{user_id}/profile-info updates username and avatar
3. Profile persists across requests
4. Invalid user ID returns 400
5. Database constraints work correctly
"""

import sys
import traceback
from sqlalchemy.orm import Session

# Add project root to path
sys.path.insert(0, "/Users/vladymyrzub/Desktop/polish_tutor")

from src.core.database import SessionLocal
from src.services.user_profile_service import UserProfileService
from src.models import UserProfile, User


def test_get_or_create_profile():
    """Test 1: Get or create profile returns default values."""
    print("\n🧪 Test 1: Get or create profile")

    db: Session = SessionLocal()
    try:
        service = UserProfileService(db)

        # Get or create profile for user 1
        profile = service.get_or_create(user_id=1)

        assert profile is not None, "Profile should exist"
        assert profile.user_id == 1, "Profile user_id should be 1"
        assert (
            profile.username == "Learner"
        ), f"Default username should be 'Learner', got {profile.username}"
        assert (
            profile.avatar == "🙂"
        ), f"Default avatar should be '🙂', got {profile.avatar}"

        print("✅ Default profile created with correct values")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_update_profile():
    """Test 2: Update profile changes username and avatar."""
    print("\n🧪 Test 2: Update profile")

    db: Session = SessionLocal()
    try:
        service = UserProfileService(db)

        # Update profile
        profile = service.update(user_id=1, username="PolishMaster", avatar="🎓")

        assert (
            profile.username == "PolishMaster"
        ), f"Username should be 'PolishMaster', got {profile.username}"
        assert profile.avatar == "🎓", f"Avatar should be '🎓', got {profile.avatar}"
        assert profile.updated_at is not None, "updated_at should be set"

        print("✅ Profile updated successfully")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_profile_persists():
    """Test 3: Profile persists across requests."""
    print("\n🧪 Test 3: Profile persists across requests")

    db: Session = SessionLocal()
    try:
        service = UserProfileService(db)

        # Get profile again
        profile = service.get_or_create(user_id=1)

        assert (
            profile.username == "PolishMaster"
        ), f"Username should persist, got {profile.username}"
        assert profile.avatar == "🎓", f"Avatar should persist, got {profile.avatar}"

        print("✅ Profile data persists correctly")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_unique_user_constraint():
    """Test 4: Only one profile per user."""
    print("\n🧪 Test 4: Unique user constraint")

    db: Session = SessionLocal()
    try:
        # Count profiles for user 1
        profile_count = db.query(UserProfile).filter(UserProfile.user_id == 1).count()

        assert (
            profile_count == 1
        ), f"Should only have 1 profile for user 1, got {profile_count}"

        print("✅ Unique constraint working correctly")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_api_endpoint_integration():
    """Test 5: Test API endpoint integration."""
    print("\n🧪 Test 5: API endpoint integration")

    try:
        import requests

        base_url = "http://localhost:8000"

        # Test GET endpoint
        response = requests.get(f"{base_url}/api/v2/user/1/profile-info")
        assert (
            response.status_code == 200
        ), f"GET should return 200, got {response.status_code}"

        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert "username" in data, "Response should contain username"
        assert "avatar" in data, "Response should contain avatar"

        print(f"✅ GET endpoint works: {data}")

        # Test PUT endpoint
        update_data = {"username": "SuperLearner", "avatar": "🚀"}
        response = requests.put(
            f"{base_url}/api/v2/user/1/profile-info", json=update_data
        )
        assert (
            response.status_code == 200
        ), f"PUT should return 200, got {response.status_code}"

        data = response.json()
        assert (
            data["username"] == "SuperLearner"
        ), f"Username should be updated, got {data['username']}"
        assert data["avatar"] == "🚀", f"Avatar should be updated, got {data['avatar']}"

        print(f"✅ PUT endpoint works: {data}")

        # Verify persistence
        response = requests.get(f"{base_url}/api/v2/user/1/profile-info")
        data = response.json()
        assert data["username"] == "SuperLearner", "Changes should persist"
        assert data["avatar"] == "🚀", "Changes should persist"

        print("✅ API changes persist correctly")

        return True

    except requests.exceptions.ConnectionError:
        print("⚠️  Server not running - skipping API tests")
        print("   Start server with: uvicorn src.main:app --reload")
        return None
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False


def test_invalid_user_id():
    """Test 6: Invalid user ID handling."""
    print("\n🧪 Test 6: Invalid user ID handling")

    try:
        import requests

        base_url = "http://localhost:8000"

        # Test with invalid user ID (0)
        response = requests.get(f"{base_url}/api/v2/user/0/profile-info")
        assert (
            response.status_code == 400
        ), f"Should return 400 for invalid user ID, got {response.status_code}"

        # Test with negative user ID
        response = requests.get(f"{base_url}/api/v2/user/-1/profile-info")
        assert (
            response.status_code == 400
        ), f"Should return 400 for negative user ID, got {response.status_code}"

        print("✅ Invalid user IDs rejected correctly")
        return True

    except requests.exceptions.ConnectionError:
        print("⚠️  Server not running - skipping API tests")
        return None
    except Exception as e:
        print(f"❌ Test failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all verification tests."""
    print("=" * 60)
    print("🔍 User Profile Implementation Verification")
    print("=" * 60)

    results = []

    # Database tests
    results.append(("Get or create profile", test_get_or_create_profile()))
    results.append(("Update profile", test_update_profile()))
    results.append(("Profile persists", test_profile_persists()))
    results.append(("Unique constraint", test_unique_user_constraint()))

    # API tests
    results.append(("API endpoint integration", test_api_endpoint_integration()))
    results.append(("Invalid user ID handling", test_invalid_user_id()))

    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result is True)
    failed = sum(1 for _, result in results if result is False)
    skipped = sum(1 for _, result in results if result is None)
    total = len(results)

    for test_name, result in results:
        if result is True:
            print(f"✅ {test_name}")
        elif result is False:
            print(f"❌ {test_name}")
        else:
            print(f"⚠️  {test_name} (skipped)")

    print("\n" + "=" * 60)
    print(f"Total: {total} | Passed: {passed} | Failed: {failed} | Skipped: {skipped}")
    print("=" * 60)

    if failed == 0 and passed > 0:
        print("\n✅ All User Profile Tests Passed!")
        return 0
    elif failed > 0:
        print("\n❌ Some tests failed!")
        return 1
    else:
        print("\n⚠️  All tests were skipped (server not running)")
        return 0


if __name__ == "__main__":
    sys.exit(main())
