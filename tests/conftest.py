import importlib.machinery
import os
import sys
import types
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Skip dummy module setup for integration and API tests
# Unit tests need dummies, integration/API tests need real dependencies
# Note: Tests should be run separately to avoid conflicts:
#   - pytest tests/unit/           # Uses dummies
#   - pytest tests/integration/    # Uses real modules
#   - pytest tests/api/            # Uses real modules
SKIP_DUMMIES = any(
    arg.startswith("tests/integration") or arg.startswith("tests/api")
    for arg in sys.argv
)

# Also skip dummies if no specific test path is provided (running all tests)
# This prevents dummy models from interfering with integration tests
if not SKIP_DUMMIES:
    test_paths_in_argv = [arg for arg in sys.argv if arg.startswith("tests/")]
    # If no test paths specified, or if we're running all tests, skip dummies
    if not test_paths_in_argv or any("tests" == arg or arg == "." for arg in sys.argv):
        SKIP_DUMMIES = True


def _module_spec(name: str) -> importlib.machinery.ModuleSpec:
    return importlib.machinery.ModuleSpec(name=name, loader=None)


if "src" not in sys.modules:
    src_module = types.ModuleType("src")
    src_module.__path__ = [str(PROJECT_ROOT / "src")]
    src_module.__spec__ = _module_spec("src")
    sys.modules["src"] = src_module
else:
    src_module = sys.modules["src"]

if "src.services" not in sys.modules:
    services_module = types.ModuleType("src.services")
    services_module.__path__ = [str(PROJECT_ROOT / "src/services")]
    services_module.__spec__ = _module_spec("src.services")
    sys.modules["src.services"] = services_module
else:
    services_module = sys.modules["src.services"]

setattr(src_module, "services", services_module)

if "src.core" not in sys.modules:
    core_module = types.ModuleType("src.core")
    core_module.__path__ = [str(PROJECT_ROOT / "src/core")]
    core_module.__spec__ = _module_spec("src.core")
    sys.modules["src.core"] = core_module
else:
    core_module = sys.modules["src.core"]

setattr(src_module, "core", core_module)


def _ensure_module(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__spec__ = _module_spec(name)
    sys.modules[name] = module
    return module


# Stub OpenAI client (avoids optional dependency requirement)
if not SKIP_DUMMIES and "openai" not in sys.modules:
    openai_module = _ensure_module("openai")

    class _DummyOpenAI:
        def __init__(self, *_, **__):
            self.chat = types.SimpleNamespace(completions=_DummyCompletions())

    class _DummyCompletions:
        def create(self, *_, **__):
            message = types.SimpleNamespace(
                content='{"is_correct": false, "score": 0.0, "explanation": ""}'
            )
            return types.SimpleNamespace(
                choices=[types.SimpleNamespace(message=message)]
            )

    openai_module.OpenAI = _DummyOpenAI


# Lightweight Levenshtein distance implementation
if not SKIP_DUMMIES and "Levenshtein" not in sys.modules:
    levenshtein_module = _ensure_module("Levenshtein")

    def _distance(a: str, b: str) -> int:
        if a == b:
            return 0
        if not a:
            return len(b)
        if not b:
            return len(a)
        prev_row = list(range(len(b) + 1))
        for i, char_a in enumerate(a, start=1):
            current_row = [i]
            for j, char_b in enumerate(b, start=1):
                insert_cost = current_row[j - 1] + 1
                delete_cost = prev_row[j] + 1
                replace_cost = prev_row[j - 1] + (char_a != char_b)
                current_row.append(min(insert_cost, delete_cost, replace_cost))
            prev_row = current_row
        return prev_row[-1]

    levenshtein_module.distance = _distance


# Stub phonemizer (treats phoneme conversion as identity)
if not SKIP_DUMMIES and "phonemizer" not in sys.modules:
    phonemizer_module = _ensure_module("phonemizer")

    def _phonemize(text: str, **_):
        return text

    phonemizer_module.phonemize = _phonemize

    backend_module = _ensure_module("phonemizer.backend")

    class EspeakBackend:
        def __init__(self, language: str):
            self.language = language

    backend_module.EspeakBackend = EspeakBackend


# Minimal SQLAlchemy stub for unit tests
if not SKIP_DUMMIES and "sqlalchemy" not in sys.modules:
    sqlalchemy_module = _ensure_module("sqlalchemy")
    orm_module = _ensure_module("sqlalchemy.orm")
    exc_module = _ensure_module("sqlalchemy.exc")
    sql_module = _ensure_module("sqlalchemy.sql")

    class SQLAlchemyError(Exception):
        pass

    class IntegrityError(SQLAlchemyError):
        pass

    exc_module.SQLAlchemyError = SQLAlchemyError
    exc_module.IntegrityError = IntegrityError

    def create_engine(*_, **__):
        return object()

    def listens_for(*_, **__):
        def decorator(func):
            return func

        return decorator

    class _DummyQuery:
        def __init__(self):
            self._result = []

        def filter(self, *_, **__):
            return self

        def filter_by(self, **__):
            return self

        def all(self):
            return list(self._result)

        def first(self):
            return self._result[0] if self._result else None

        def limit(self, *_):
            return self

        def order_by(self, *_):
            return self

    class _DummySession:
        def __init__(self):
            self._query = _DummyQuery()

        def __call__(self):
            return self

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            if exc_type is not None:
                self.rollback()
            return False

        def add(self, *_):
            pass

        def commit(self):
            pass

        def rollback(self):
            pass

        def close(self):
            pass

        def flush(self):
            pass

        def refresh(self, *_):
            pass

        def expunge(self, *_):
            pass

        def query(self, *_):
            return self._query

        def expunge(self, *_):
            pass

    def sessionmaker(**_):
        def factory():
            return _DummySession()

        return factory

    def declarative_base():
        return type("Base", (), {})

    def relationship(*_, **__):
        return None

    def Column(*_, **__):
        return None

    def Index(*_, **__):
        return None

    def UniqueConstraint(*_, **__):
        return None

    def DateTime(*_, **__):
        return None

    def String(*_, **__):
        return None

    def Text(*_, **__):
        return None

    def Integer(*_, **__):
        return None

    def Float(*_, **__):
        return None

    def Boolean(*_, **__):
        return None

    class _DummyFunc:
        def now(self, *_, **__):
            return None

    func = _DummyFunc()

    sqlalchemy_module.create_engine = create_engine
    sqlalchemy_module.event = types.SimpleNamespace(listens_for=listens_for)

    def and_(*conditions):
        return conditions

    sqlalchemy_module.Column = Column
    sqlalchemy_module.DateTime = DateTime
    sqlalchemy_module.Index = Index
    sqlalchemy_module.UniqueConstraint = UniqueConstraint
    sqlalchemy_module.String = String
    sqlalchemy_module.Text = Text
    sqlalchemy_module.Integer = Integer
    sqlalchemy_module.Float = Float
    sqlalchemy_module.Boolean = Boolean
    sqlalchemy_module.and_ = and_
    sqlalchemy_module.func = func

    sql_module.func = func

    orm_module.sessionmaker = sessionmaker
    orm_module.declarative_base = declarative_base
    orm_module.relationship = relationship
    orm_module.Session = _DummySession


# Provide lightweight ORM models used in unit tests
if not SKIP_DUMMIES and "src.models" not in sys.modules:
    models_module = _ensure_module("src.models")
    # CRITICAL: Set __path__ to make this a package, not just a module
    # This allows submodule imports like "from src.models.user import User"
    models_module.__path__ = [str(PROJECT_ROOT / "src/models")]

    class _DummyModel:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)

    models_module.Lesson = _DummyModel
    models_module.Phrase = _DummyModel
    models_module.Attempt = _DummyModel
    models_module.SRSMemory = _DummyModel
    models_module.User = _DummyModel
    models_module.LessonProgress = _DummyModel
    models_module.Meta = _DummyModel
    models_module.Setting = _DummyModel
    models_module.UserSession = _DummyModel
    models_module.Badge = _DummyModel
    models_module.UserBadge = _DummyModel

# Add user_session module stub
if not SKIP_DUMMIES and "src.models.user_session" not in sys.modules:
    user_session_module = _ensure_module("src.models.user_session")
    user_session_module.UserSession = _DummyModel


# Stub Coqui TTS dependency to avoid heavy imports
tts_module = sys.modules.get("TTS")
if tts_module is None:
    tts_module = _ensure_module("TTS")

tts_api_module = types.ModuleType("TTS.api")
tts_api_module.__spec__ = _module_spec("TTS.api")


class _DummyTTS:
    def __init__(self, *_, **__):
        pass

    def tts_to_file(self, *_, **__):
        return None


tts_api_module.TTS = _DummyTTS
sys.modules["TTS.api"] = tts_api_module
setattr(tts_module, "api", tts_api_module)
