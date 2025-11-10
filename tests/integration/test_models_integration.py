"""Integration helper to execute real model modules for coverage."""
import os
import subprocess
import sys
from pathlib import Path


def _write_helper_script(project_root: Path) -> Path:
    script = """
import importlib
import sys
import types
from pathlib import Path

if "sqlalchemy" not in sys.modules:
    sqlalchemy = types.ModuleType("sqlalchemy")
    sys.modules["sqlalchemy"] = sqlalchemy
    orm = types.ModuleType("sqlalchemy.orm")
    sys.modules["sqlalchemy.orm"] = orm
    exc = types.ModuleType("sqlalchemy.exc")
    sys.modules["sqlalchemy.exc"] = exc

    class SQLAlchemyError(Exception):
        pass

    exc.SQLAlchemyError = SQLAlchemyError

    def _factory(*_, **__):
        return None

    for name in [
        "Column",
        "Integer",
        "String",
        "Text",
        "Float",
        "Boolean",
        "DateTime",
        "ForeignKey",
        "Index",
        "UniqueConstraint",
    ]:
        setattr(sqlalchemy, name, _factory)

    sqlalchemy.create_engine = lambda *_, **__: None
    sqlalchemy.event = types.SimpleNamespace(listens_for=lambda *a, **k: (lambda f: f))
    sqlalchemy.func = types.SimpleNamespace(now=lambda: None)

    orm.relationship = lambda *_, **__: None
    orm.declarative_base = lambda: type("Base", (), {"metadata": types.SimpleNamespace()})
    orm.sessionmaker = lambda **_: lambda: types.SimpleNamespace()
    orm.Session = type("Session", (), {})

project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root / "src"))

modules = {}
for name in ["user", "lesson", "phrase", "lesson_progress", "attempt", "srs_memory", "setting", "meta"]:
    modules[name] = importlib.import_module(f"src.models.{name}")

for name, module in modules.items():
    cls_name = { "user": "User", "lesson": "Lesson", "phrase": "Phrase",
                 "lesson_progress": "LessonProgress", "attempt": "Attempt",
                 "srs_memory": "SRSMemory", "setting": "Setting", "meta": "Meta" }[name]
    cls = getattr(module, cls_name)
    assert hasattr(cls, "__tablename__")

print("Model modules imported successfully.")
"""

    temp_path = project_root / "temp_model_helper.py"
    temp_path.write_text(script)
    return temp_path


def test_models_coverage():
    """Run the helper script under coverage to count model definitions."""
    project_root = Path(__file__).resolve().parents[2]
    helper_path = _write_helper_script(project_root)

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = str(project_root / "src")
        venv_python = project_root / "venv" / "bin" / "python"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        result = subprocess.run(
            [
                python_exe,
                "-m",
                "coverage",
                "run",
                "--source=src/models",
                str(helper_path),
            ],
            cwd=project_root,
            env=env,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(result.stdout)
            print(result.stderr)
        assert result.returncode == 0, "Model helper script failed"
    finally:
        helper_path.unlink(missing_ok=True)
