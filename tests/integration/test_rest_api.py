"""
Integration tests for all REST API endpoints with real database operations.

These tests verify the complete request-response cycle including:
- HTTP request handling
- Business logic execution
- Database operations
- Response formatting
- Error handling
"""

import json
import os
import shutil
import subprocess
import tempfile
import sys
from pathlib import Path

import pytest

# Integration test runner that bypasses conftest.py stubs
INTEGRATION_TEST_SCRIPT = """
import json
import os
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure reproducible caches for Matplotlib/fontconfig
project_root_env = os.environ.get("POLISH_TUTOR_PROJECT_ROOT")
project_root = Path(project_root_env) if project_root_env else Path(__file__).resolve().parent
mpl_dir = project_root / ".mplconfig"
mpl_dir.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(mpl_dir))
os.environ.setdefault("FONTCONFIG_PATH", str(mpl_dir))

# Add project root and src to path
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))

# Set up minimal environment
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/polish_tutor.db")

# ----------------------------------------------------------
# Dummy Speech Engine Stub (used to skip audio generation)
# ----------------------------------------------------------
class DummySpeechEngine:
    def __init__(self, *_, **__):
        self.cache_dir = Path("./audio_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_audio_path(self, text, lesson_id=None, phrase_id=None, audio_filename=None, speed=1.0, voice_id="default"):
        dummy_file = self.cache_dir / "integration_dummy.mp3"
        dummy_file.write_bytes(b"fake-audio")
        return dummy_file, "generated_dummy"

    def get_available_engines(self):
        return {
            "gpt4": {"available": True, "quality": "high"},
            "offline": {"available": True, "quality": "medium"},
        }

dummy_module = types.ModuleType("src.services.speech_engine")
dummy_module.SpeechEngine = DummySpeechEngine
sys.modules["src.services.speech_engine"] = dummy_module

# ----------------------------------------------------------
# FastAPI setup
# ----------------------------------------------------------
from fastapi.testclient import TestClient
from main import app
from src.core.app_context import app_context

# Ensure database schema exists
try:
    from src.core.init_db import init_database
    init_database()
    print("✅ Database schema initialized successfully.")
except Exception as e:
    print(f"⚠️ WARNING: Database initialization skipped: {e}")

client = TestClient(app)
TEST_PHRASE_ID = f"integration_phrase_{int(datetime.now(timezone.utc).timestamp() * 1000)}"

# ----------------------------------------------------------
# Helper to prepare review/test data
# ----------------------------------------------------------
def ensure_review_data():
    db = app_context.database
    next_review = datetime.now(timezone.utc) - timedelta(days=1)

    # Fetch all SRS memories
    try:
        existing_list = db.get_user_srs_memories(1)
    except Exception:
        existing_list = []

    existing = next((item for item in existing_list if item.get("phrase_id") == TEST_PHRASE_ID), None)
    if existing and "id" in existing:
        db.delete(SRSMemory, existing["id"])

    phrase = db.get_phrase(TEST_PHRASE_ID)
    if not phrase:
        try:
            db.create_phrase(
                phrase_id=TEST_PHRASE_ID,
                lesson_id="coffee_001",
                text="Integration phrase",
            )
        except Exception:
            pass

    # ✅ Use correct method name from Database service
    db.create_srs_memory(
        user_id=1,
        phrase_id=TEST_PHRASE_ID,
        next_review=next_review,
        interval_days=1,
        review_count=1,
        strength_level=2,
    )

ensure_review_data()

# ----------------------------------------------------------
# Utility to run each test
# ----------------------------------------------------------
def run_test(test_name, test_func):
    try:
        result = test_func()
        return {"test": test_name, "status": "passed", "result": result}
    except Exception as e:
        import traceback
        return {
            "test": test_name,
            "status": "failed",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }

# ----------------------------------------------------------
# Actual endpoint tests
# ----------------------------------------------------------
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    return data

def test_chat_respond_basic():
    payload = {"user_id": 1, "text": "Poproszę kawę", "lesson_id": "coffee_001", "dialogue_id": "coffee_001_d1"}
    response = client.post("/api/chat/respond", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_lesson_get():
    response = client.get("/api/lesson/get", params={"lesson_id": "coffee_001"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_lesson_options():
    response = client.get("/api/lesson/options", params={"lesson_id": "coffee_001", "dialogue_id": "coffee_001_d1"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_lesson_catalog():
    response = client.get("/api/lesson/catalog")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_settings_get():
    response = client.get("/api/settings/get", params={"user_id": 1})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_settings_update():
    payload = {"user_id": 1, "voice_mode": "online", "theme": "dark"}
    response = client.post("/api/settings/update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_user_stats():
    response = client.get("/api/user/stats", params={"user_id": 1})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_review_get():
    response = client.get("/api/review/get", params={"user_id": 1})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_review_update():
    payload = {"user_id": 1, "phrase_id": TEST_PHRASE_ID, "quality": 4, "confidence": 4}
    response = client.post("/api/review/update", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_backup_export():
    response = client.get("/api/backup/export", params={"user_id": 1, "format": "json"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_audio_generate():
    payload = {"text": "To jest test", "lesson_id": "coffee_001", "phrase_id": "coffee_001_d1", "speed": 1.0, "user_id": 1}
    response = client.post("/api/audio/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_audio_engines():
    response = client.get("/api/audio/engines")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_audio_clear_cache():
    response = client.post("/api/audio/clear-cache")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_error_report():
    payload = {"user_id": 1, "error_type": "test", "message": "Test error", "context": {}}
    response = client.post("/api/error/report", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    return data

def test_websocket_chat():
    messages = []
    with client.websocket_connect("/ws/chat") as websocket:
        websocket.send_json({"type": "connect", "user_id": 1})
        messages.append(websocket.receive_json())
        websocket.send_json({
            "type": "message",
            "text": "Poproszę kawę",
            "lesson_id": "coffee_001",
            "dialogue_id": "coffee_001_d1",
            "speed": 1.0,
        })
        messages.append(websocket.receive_json())  # typing
        messages.append(websocket.receive_json())  # response
    return messages

# ----------------------------------------------------------
# Run all tests
# ----------------------------------------------------------
tests = [
    ("health_check", test_health_check),
    ("chat_respond", test_chat_respond_basic),
    ("lesson_get", test_lesson_get),
    ("lesson_options", test_lesson_options),
    ("lesson_catalog", test_lesson_catalog),
    ("settings_get", test_settings_get),
    ("settings_update", test_settings_update),
    ("user_stats", test_user_stats),
    ("review_get", test_review_get),
    ("review_update", test_review_update),
    ("backup_export", test_backup_export),
    ("audio_generate", test_audio_generate),
    ("audio_engines", test_audio_engines),
    ("audio_clear_cache", test_audio_clear_cache),
    ("error_report", test_error_report),
    ("websocket_chat", test_websocket_chat),
]

results = [run_test(name, func) for name, func in tests]
print(json.dumps(results))
"""


@pytest.fixture(scope="session")
def integration_results():
    """Run integration tests in subprocess to avoid conftest.py interference."""
    project_root = Path(__file__).resolve().parents[2]

    temp_dir = Path(tempfile.gettempdir())
    script_path = temp_dir / "polish_tutor_integration_test.py"
    script_path.write_text(INTEGRATION_TEST_SCRIPT)

    temp_db_path = temp_dir / "polish_tutor_integration.db"
    original_db = project_root / "data" / "polish_tutor.db"
    if original_db.exists():
        shutil.copy(original_db, temp_db_path)

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = str(project_root / "src")
        env["POLISH_TUTOR_PROJECT_ROOT"] = str(project_root)
        env["DISABLE_FILE_LOGS"] = "1"
        env["DATABASE_URL"] = f"sqlite:///{temp_db_path}"
        venv_python = project_root / "venv" / "bin" / "python"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        result = subprocess.run(
            [python_exe, str(script_path)],
            cwd=project_root,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )

        if result.returncode != 0:
            pytest.fail(f"Integration test script failed: {result.stderr}")

        output_lines = [line for line in result.stdout.splitlines() if line.strip()]
        if not output_lines:
            pytest.fail("Integration test script produced no output")
        return json.loads(output_lines[-1])

    finally:
        script_path.unlink(missing_ok=True)
        temp_db_path.unlink(missing_ok=True)


class TestRestApiIntegration:
    """Integration tests for REST API endpoints."""

    @pytest.fixture(autouse=True)
    def setup_method(self, integration_results):
        self.results = {r["test"]: r for r in integration_results}

    def test_health_endpoint(self):
        result = self.results["health_check"]
        assert (
            result["status"] == "passed"
        ), f"Health check failed: {result.get('error')}"
        assert result["result"]["status"] == "healthy"

    def test_chat_respond_endpoint(self):
        result = self.results["chat_respond"]
        assert (
            result["status"] == "passed"
        ), f"Chat respond failed: {result.get('error')}"
        assert result["result"]["status"] == "success"

    def test_lesson_get_endpoint(self):
        result = self.results["lesson_get"]
        assert result["status"] == "passed", f"Lesson get failed: {result.get('error')}"
        assert result["result"]["status"] == "success"

    def test_settings_get_endpoint(self):
        result = self.results["settings_get"]
        assert (
            result["status"] == "passed"
        ), f"Settings get failed: {result.get('error')}"
        assert result["result"]["status"] == "success"

    def test_settings_update_endpoint(self):
        result = self.results["settings_update"]
        assert (
            result["status"] == "passed"
        ), f"Settings update failed: {result.get('error')}"
        assert result["result"]["status"] == "success"

    def test_user_stats_endpoint(self):
        result = self.results["user_stats"]
        assert result["status"] == "passed", f"User stats failed: {result.get('error')}"
        assert result["result"]["status"] == "success"

    def test_review_endpoints(self):
        get_result = self.results["review_get"]
        update_result = self.results["review_update"]
        assert (
            get_result["status"] == "passed"
        ), f"Review get failed: {get_result.get('error')}"
        assert (
            update_result["status"] == "passed"
        ), f"Review update failed: {update_result.get('error')}"
        assert get_result["result"]["status"] == "success"
        assert update_result["result"]["status"] == "success"

    def test_audio_endpoints(self):
        for name in ["audio_generate", "audio_engines", "audio_clear_cache"]:
            r = self.results[name]
            assert r["status"] == "passed", f"Audio {name} failed: {r.get('error')}"
            assert r["result"]["status"] == "success"

    def test_websocket_chat_endpoint(self):
        result = self.results["websocket_chat"]
        assert result["status"] == "passed", f"WebSocket failed: {result.get('error')}"
        assert isinstance(result["result"], list)
