"""Add UserSessions table

Revision ID: 05a98c646b5d
Revises: 9e7f1cf751cb
Create Date: 2025-11-20 17:03:41.956461

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "05a98c646b5d"
down_revision: Union[str, Sequence[str], None] = "9e7f1cf751cb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "UserSessions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("xp_phrases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_session_bonus", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_streak_bonus", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("streak_before", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("streak_after", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["user_id"], ["Users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_user_sessions_user", "UserSessions", ["user_id"], unique=False)
    op.create_index(
        "idx_user_sessions_started", "UserSessions", ["started_at"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_user_sessions_started", table_name="UserSessions")
    op.drop_index("idx_user_sessions_user", table_name="UserSessions")
    op.drop_table("UserSessions")
