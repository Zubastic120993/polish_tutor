#!/usr/bin/env python3
"""Reset user progress to test new phrases functionality."""

import sys
import os
from pathlib import Path

# Setup paths
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))

# Minimal environment setup
os.environ.setdefault("DATABASE_URL", "sqlite:///./data/polish_tutor.db")
os.environ.setdefault("DISABLE_FILE_LOGS", "1")

# Import ALL models to avoid relationship errors
from src.core.database import get_db
from src.models import (
    User,
    Phrase,
    SRSMemory,
    Lesson,
    LessonProgress,
    Attempt,
    Setting,
    Meta,
)


def reset_user_srs(user_id: int = 1, keep_review: int = 0):
    """
    Reset user's SRS memories.

    Args:
        user_id: User ID to reset (default: 1)
        keep_review: Number of memories to keep for review (default: 0 = delete all)
    """
    db = next(get_db())

    try:
        # Get all memories for user
        all_memories = db.query(SRSMemory).filter(SRSMemory.user_id == user_id).all()

        if not all_memories:
            print(f"⚠️  No SRS memories found for user {user_id}")
            return

        print(f"📊 Found {len(all_memories)} SRS memories for user {user_id}")

        if keep_review > 0:
            # Keep first N for review
            to_delete = all_memories[keep_review:]
            print(f"✂️  Keeping {keep_review} for review, deleting {len(to_delete)}")

            for memory in to_delete:
                db.delete(memory)
        else:
            # Delete all
            print(f"🗑️  Deleting ALL {len(all_memories)} memories")
            deleted = db.query(SRSMemory).filter(SRSMemory.user_id == user_id).delete()

        db.commit()
        print(f"✅ Success! User progress reset.")

        # Show final state
        remaining = db.query(SRSMemory).filter(SRSMemory.user_id == user_id).count()
        print(f"📈 Remaining SRS memories: {remaining}")

        # Count total phrases
        total_phrases = db.query(Phrase).count()
        print(f"🆕 New phrases available: ~{total_phrases - remaining}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Reset user progress for testing")
    parser.add_argument("--user-id", type=int, default=1, help="User ID (default: 1)")
    parser.add_argument(
        "--keep", type=int, default=0, help="Number of memories to keep (default: 0)"
    )

    args = parser.parse_args()

    print("🔄 Resetting User Progress")
    print("=" * 60)
    reset_user_srs(user_id=args.user_id, keep_review=args.keep)
    print("=" * 60)
    print("\n💡 Now refresh your browser at http://localhost:5173/practice")
