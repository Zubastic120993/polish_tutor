"""add_perfect_day_to_user_sessions

Revision ID: 75d96fcba597
Revises: 474997dc6e24
Create Date: 2025-11-20 19:31:26.766184

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "75d96fcba597"
down_revision: Union[str, Sequence[str], None] = "474997dc6e24"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add perfect_day column to UserSessions table with default False
    # SQLite doesn't support ALTER COLUMN, so we add with nullable=True and server_default
    op.add_column(
        "UserSessions",
        sa.Column("perfect_day", sa.Boolean(), server_default="0", nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Remove perfect_day column from UserSessions table
    op.drop_column("UserSessions", "perfect_day")
