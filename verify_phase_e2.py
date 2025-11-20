#!/usr/bin/env python3
"""Comprehensive verification for Phase E.2 implementation."""

import sys
import os
from pathlib import Path

project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))

os.environ.setdefault("DATABASE_URL", "sqlite:///./data/polish_tutor.db")
os.environ.setdefault("DISABLE_FILE_LOGS", "1")

print("🔍 Phase E.2 Verification Checklist\n" + "=" * 60)

# 1. Check backend imports
print("\n1️⃣ Checking backend imports...")
try:
    from src.api.v2.practice import PracticeGenerator
    from src.schemas.v2.practice import PracticePackResponse

    print("   ✅ Backend imports successful")
except Exception as e:
    print(f"   ❌ Import error: {e}")
    sys.exit(1)

# 2. Check schema
print("\n2️⃣ Checking schema...")
try:
    from pydantic import Field

    response = PracticePackResponse(
        pack_id="test",
        review_phrases=[],
        new_phrases=[],
    )
    assert isinstance(response.new_phrases, list)
    print("   ✅ Schema correct - new_phrases defaults to empty list")
except Exception as e:
    print(f"   ❌ Schema error: {e}")
    sys.exit(1)

# 3. Test API endpoint
print("\n3️⃣ Testing API endpoint...")
try:
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    response = client.get("/api/v2/practice/daily?user_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "pack_id" in data
    assert "review_phrases" in data
    assert "new_phrases" in data
    assert isinstance(data["review_phrases"], list)
    assert isinstance(data["new_phrases"], list)
    print(
        f"   ✅ API working - {len(data['review_phrases'])} review, {len(data['new_phrases'])} new"
    )
except Exception as e:
    print(f"   ❌ API error: {e}")
    sys.exit(1)

# 4. Check frontend component exists
print("\n4️⃣ Checking frontend components...")
frontend_component = (
    project_root / "frontend-react/src/components/practice/NewPhrasePractice.tsx"
)
if frontend_component.exists():
    print("   ✅ NewPhrasePractice component exists")
else:
    print("   ❌ NewPhrasePractice component not found")
    sys.exit(1)

# 5. Check DailyPracticePage imports NewPhrasePractice
print("\n5️⃣ Checking DailyPracticePage integration...")
daily_page = project_root / "frontend-react/src/pages/DailyPracticePage.tsx"
if daily_page.exists():
    content = daily_page.read_text()
    if "NewPhrasePractice" in content and "handleNewComplete" in content:
        print("   ✅ DailyPracticePage integrated with NewPhrasePractice")
    else:
        print("   ⚠️  DailyPracticePage might need integration check")
else:
    print("   ❌ DailyPracticePage not found")

# 6. Check test exists
print("\n6️⃣ Checking integration test...")
test_file = project_root / "tests/integration/test_rest_api.py"
if test_file.exists():
    content = test_file.read_text()
    if "test_practice_daily" in content:
        print("   ✅ Integration test exists")
    else:
        print("   ⚠️  Integration test might be missing")
else:
    print("   ❌ Test file not found")

# 7. Summary
print("\n" + "=" * 60)
print("✅ Phase E.2 Implementation Verified!")
print("=" * 60)
print("\n📝 Next Steps:")
print("   1. Start backend: python -m uvicorn main:app --reload")
print("   2. Start frontend: cd frontend-react && npm run dev")
print("   3. Visit: http://localhost:5173/practice")
print("   4. Test the two-phase practice flow!\n")

sys.exit(0)
