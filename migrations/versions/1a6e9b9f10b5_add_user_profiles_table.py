"""add_user_profiles_table

Revision ID: 1a6e9b9f10b5
Revises: 75d96fcba597
Create Date: 2025-11-20 21:29:59.580907

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1a6e9b9f10b5"
down_revision: Union[str, Sequence[str], None] = "75d96fcba597"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "UserProfiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "username", sa.String(length=50), nullable=False, server_default="Learner"
        ),
        sa.Column("avatar", sa.String(length=10), nullable=False, server_default="🙂"),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["Users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("UserProfiles")
