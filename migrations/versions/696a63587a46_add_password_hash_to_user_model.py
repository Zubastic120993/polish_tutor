"""Add password_hash to User model

Revision ID: 696a63587a46
Revises: 4f121af30096
Create Date: 2025-11-11 15:02:06.279627

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '696a63587a46'
down_revision: Union[str, Sequence[str], None] = '4f121af30096'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add password_hash column to Users table
    op.add_column('Users', sa.Column('password_hash', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove password_hash column from Users table
    op.drop_column('Users', 'password_hash')
