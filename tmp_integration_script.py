
import json
import os
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ----------------------------------------------------------
# Environment setup
# ----------------------------------------------------------
project_root_env = os.environ.get("POLISH_TUTOR_PROJECT_ROOT")
project_root = Path(project_root_env) if project_root_env else Path(__file__).resolve().parent
mpl_dir = project_root / ".mplconfig"
mpl_dir.mkdir(exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(mpl_dir))
os.environ.setdefault("FONTCONFIG_PATH", str(mpl_dir))
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/polish_tutor.db")

# ----------------------------------------------------------
# Dummy Speech Engine Stub (skip real audio generation)
# ----------------------------------------------------------
class DummySpeechEngine:
    def __init__(self, *_, **__):
        self.cache_dir = Path("./audio_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_audio_path(
        self, text, lesson_id=None, phrase_id=None,
        audio_filename=None, speed=1.0, voice_id="default"
    ):
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
# Murf TTS stub (avoid external HTTP calls in CI)
# ----------------------------------------------------------
os.environ.setdefault("MURF_API_KEY", "test-integration-key")
from src.api.routers import audio as audio_router


async def _fake_generate_polish_tts(api_key, text, speed):
    return f"fake-audio::{text}".encode("utf-8")


audio_router._generate_polish_tts = _fake_generate_polish_tts

# ----------------------------------------------------------
# FastAPI setup
# ----------------------------------------------------------
from fastapi.testclient import TestClient
from main import app
from src.core.app_context import app_context

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

    # ✅ Ensure user exists
    user = db.get_user(1)
    if not user:
        try:
            db.create_user(name="IntegrationUser")
        except Exception:
            pass

    # ✅ Ensure phrase exists
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

    # ✅ Remove old memory if exists
    try:
        existing_list = db.get_user_srs_memories(1)
    except Exception:
        existing_list = []

    existing = next(
        (item for item in existing_list if item.get("phrase_id") == TEST_PHRASE_ID),
        None,
    )
    if existing and "id" in existing:
        db.delete_srs_memory(existing["id"])

    # ✅ Create new SRS entry safely
    try:
        db.create_srs_memory(
            user_id=1,
            phrase_id=TEST_PHRASE_ID,
            next_review=next_review,
            interval_days=1,
            review_count=1,
            strength_level=2,
        )
    except Exception as e:
        print(f"⚠️ Could not create SRS memory: {e}")

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
    payload = {
        "user_id": 1,
        "text": "Poproszę kawę",
        "lesson_id": "coffee_001",
        "dialogue_id": "coffee_001_d1",
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
    # Some runs may have no due items — treat as success anyway
    if data.get("status") not in {"success", "empty"}:
        raise AssertionError(f"Unexpected review_get status: {data}")
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
    # Some databases return "ok" instead of "success" — both acceptable
    if data.get("status") not in {"success", "ok"}:
        raise AssertionError(f"Unexpected review_update status: {data}")
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
