"""Database initialization script."""

import os
import sys

from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from alembic.config import Config
from alembic import command

from src.core.database import engine, Base
from src.models import *  # noqa: F401, F403


def init_database():
    """Initialize database by running migrations."""
    # Load environment variables
    load_dotenv()

    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)

    # Run Alembic migrations
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")

    print("✅ Database initialized successfully!")
    print(
        f"📁 Database location: {os.getenv('DATABASE_URL', 'sqlite:///./data/polish_tutor.db')}"
    )


if __name__ == "__main__":
    init_database()
