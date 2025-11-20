"""add_badges_and_user_badges_tables

Revision ID: 474997dc6e24
Revises: 05a98c646b5d
Create Date: 2025-11-20 18:07:08.922922

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "474997dc6e24"
down_revision: Union[str, Sequence[str], None] = "05a98c646b5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create Badges table
    op.create_table(
        "Badges",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("idx_badges_code", "Badges", ["code"], unique=False)

    # Create UserBadges table
    op.create_table(
        "UserBadges",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("badge_id", sa.Integer(), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["Users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["badge_id"], ["Badges.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
    op.create_index("idx_user_badges_user", "UserBadges", ["user_id"], unique=False)
    op.create_index("idx_user_badges_badge", "UserBadges", ["badge_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop UserBadges table
    op.drop_index("idx_user_badges_badge", table_name="UserBadges")
    op.drop_index("idx_user_badges_user", table_name="UserBadges")
    op.drop_table("UserBadges")

    # Drop Badges table
    op.drop_index("idx_badges_code", table_name="Badges")
    op.drop_table("Badges")
