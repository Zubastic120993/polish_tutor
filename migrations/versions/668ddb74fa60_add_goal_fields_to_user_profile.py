"""add_goal_fields_to_user_profile

Revision ID: 668ddb74fa60
Revises: 1a6e9b9f10b5
Create Date: 2025-11-20 21:59:09.664154

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "668ddb74fa60"
down_revision: Union[str, Sequence[str], None] = "1a6e9b9f10b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "UserProfiles", sa.Column("goal_text", sa.String(length=200), nullable=True)
    )
    op.add_column(
        "UserProfiles",
        sa.Column("goal_created_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("UserProfiles", "goal_created_at")
    op.drop_column("UserProfiles", "goal_text")
