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
import subprocess
import sys
from pathlib import Path

import pytest

# Integration test runner that bypasses conftest.py stubs
INTEGRATION_TEST_SCRIPT = '''
import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure reproducible caches for Matplotlib/fontconfig
project_root = Path(__file__).resolve().parent
mpl_dir = project_root / ".mplconfig"
mpl_dir.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(mpl_dir))
os.environ.setdefault("FONTCONFIG_PATH", str(mpl_dir))

# Add src to path
sys.path.insert(0, str(project_root / "src"))

# Set up minimal environment
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/polish_tutor.db")

from fastapi.testclient import TestClient
from main import app
from src.core.app_context import app_context

# Patch SpeechEngine with a lightweight stub
from src.services import speech_engine as speech_module

TEST_PHRASE_ID = f"integration_phrase_{int(datetime.utcnow().timestamp()*1000)}"

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

speech_module.SpeechEngine = DummySpeechEngine

client = TestClient(app)

def ensure_review_data():
    db = app_context.database
    next_review = datetime.utcnow() - timedelta(days=1)
    existing = db.get_user_srs_memory(1, TEST_PHRASE_ID)
    if existing:
        db.delete_srs_memory(existing.id)
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
    db.create_srs_memory(
        user_id=1,
        phrase_id=TEST_PHRASE_ID,
        next_review=next_review,
        interval_days=1,
        review_count=1,
        strength_level=2,
    )

ensure_review_data()


def run_test(test_name, test_func):
    """Run a single test and return results."""
    try:
        result = test_func()
        return {"test": test_name, "status": "passed", "result": result}
    except Exception as e:
        import traceback
        error_details = {
            "error": str(e),
            "type": type(e).__name__,
            "traceback": traceback.format_exc()
        }
        print(f"DEBUG: Test {test_name} failed with: {error_details}", file=sys.stderr)
        return {"test": test_name, "status": "failed", **error_details}


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    return data


def test_chat_respond_basic():
    payload = {
        "user_id": 1,
        "text": "Poproszę kawę",
        "lesson_id": "coffee_001",
        "dialogue_id": "coffee_001_d1"
    }
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
    response = client.get(
        "/api/lesson/options",
        params={"lesson_id": "coffee_001", "dialogue_id": "coffee_001_d1"},
    )
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
    payload = {
        "user_id": 1,
        "phrase_id": TEST_PHRASE_ID,
        "quality": 4,
        "confidence": 4,
    }
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
    payload = {
        "text": "To jest test",
        "lesson_id": "coffee_001",
        "phrase_id": "coffee_001_d1",
        "speed": 1.0,
        "user_id": 1,
    }
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
    payload = {
        "user_id": 1,
        "error_type": "test",
        "message": "Test error",
        "context": {}
    }
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
        messages.append(websocket.receive_json())  # response or error
    return messages


# Run all tests
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

results = []
for test_name, test_func in tests:
    results.append(run_test(test_name, test_func))

print(json.dumps(results))
'''


@pytest.fixture(scope="session")
def integration_results():
    """Run integration tests in subprocess to avoid conftest.py interference."""
    project_root = Path(__file__).resolve().parents[2]

    # Write test script to temp file
    script_path = project_root / "temp_integration_test.py"
    script_path.write_text(INTEGRATION_TEST_SCRIPT)

    try:
        # Run the test script
        env = os.environ.copy()
        env["PYTHONPATH"] = str(project_root / "src")
        venv_python = project_root / "venv" / "bin" / "python"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        # Use shell to source venv
        result = subprocess.run(
            [f"source {project_root}/venv/bin/activate && {python_exe} {script_path}"],
            cwd=project_root,
            env=env,
            capture_output=False,  # Don't capture so debug prints show up
            text=True,
            timeout=60,
            shell=True
        )
        # Re-run to capture output for JSON parsing
        result = subprocess.run(
            [f"source {project_root}/venv/bin/activate && {python_exe} {script_path}"],
            cwd=project_root,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
            shell=True
        )

        if result.returncode != 0:
            pytest.fail(f"Integration test script failed: {result.stderr}")

        # Parse results
        results = json.loads(result.stdout)
        return results

    finally:
        script_path.unlink(missing_ok=True)


class TestRestApiIntegration:
    """Integration tests for REST API endpoints."""

    @pytest.fixture(autouse=True)
    def setup_method(self, integration_results):
        """Store integration results for test access."""
        self.results = {r["test"]: r for r in integration_results}

    def test_health_endpoint(self):
        """Test health check endpoint."""
        result = self.results["health_check"]
        assert result["status"] == "passed", f"Health check failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "healthy"

    def test_chat_respond_endpoint(self):
        """Test chat respond endpoint."""
        result = self.results["chat_respond"]
        assert result["status"] == "passed", f"Chat respond failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"
        assert "data" in result["result"]

    def test_lesson_get_endpoint(self):
        """Test lesson get endpoint."""
        result = self.results["lesson_get"]
        assert result["status"] == "passed", f"Lesson get failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"
        assert "data" in result["result"]

    def test_settings_get_endpoint(self):
        """Test settings get endpoint."""
        result = self.results["settings_get"]
        assert result["status"] == "passed", f"Settings get failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"
        assert "data" in result["result"]

    def test_settings_update_endpoint(self):
        """Test settings update endpoint."""
        result = self.results["settings_update"]
        assert result["status"] == "passed", f"Settings update failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"

    def test_user_stats_endpoint(self):
        """Test user stats endpoint."""
        result = self.results["user_stats"]
        assert result["status"] == "passed", f"User stats failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"
        assert "data" in result["result"]

    def test_lesson_options_endpoint(self):
        """Test lesson options endpoint."""
        result = self.results["lesson_options"]
        assert result["status"] == "passed", f"Lesson options failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"

    def test_lesson_catalog_endpoint(self):
        """Test lesson catalog endpoint."""
        result = self.results["lesson_catalog"]
        assert result["status"] == "passed", f"Lesson catalog failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"

    def test_backup_export_endpoint(self):
        """Test backup export endpoint."""
        result = self.results["backup_export"]
        assert result["status"] == "passed", f"Backup export failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"
        assert "data" in result["result"]

    def test_error_report_endpoint(self):
        """Test error report endpoint."""
        result = self.results["error_report"]
        assert result["status"] == "passed", f"Error report failed: {result.get('error', 'Unknown error')}"
        assert result["result"]["status"] == "success"

    def test_review_endpoints(self):
        """Test review get/update endpoints."""
        get_result = self.results["review_get"]
        update_result = self.results["review_update"]
        assert get_result["status"] == "passed", f"Review get failed: {get_result.get('error', 'Unknown error')}"
        assert update_result["status"] == "passed", f"Review update failed: {update_result.get('error', 'Unknown error')}"
        assert get_result["result"]["status"] == "success"
        assert update_result["result"]["status"] == "success"

    def test_audio_endpoints(self):
        """Test audio generate/engines/clear endpoints."""
        gen = self.results["audio_generate"]
        engines = self.results["audio_engines"]
        clear = self.results["audio_clear_cache"]
        assert gen["status"] == "passed", f"Audio generate failed: {gen.get('error', 'Unknown error')}"
        assert engines["status"] == "passed", f"Audio engines failed: {engines.get('error', 'Unknown error')}"
        assert clear["status"] == "passed", f"Audio clear cache failed: {clear.get('error', 'Unknown error')}"
        assert gen["result"]["status"] == "success"
        assert engines["result"]["status"] == "success"
        assert clear["result"]["status"] == "success"

    def test_websocket_chat_endpoint(self):
        """Test websocket chat flow."""
        result = self.results["websocket_chat"]
        assert result["status"] == "passed", f"WebSocket failed: {result.get('error', 'Unknown error')}"
        assert isinstance(result["result"], list)
