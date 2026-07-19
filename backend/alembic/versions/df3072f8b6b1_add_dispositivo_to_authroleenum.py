"""add dispositivo to authroleenum

Revision ID: df3072f8b6b1
Revises: 58773c46f6cd
Create Date: 2026-07-18 21:40:44.078251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df3072f8b6b1'
down_revision: Union[str, Sequence[str], None] = '58773c46f6cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE authroleenum ADD VALUE 'DISPOSITIVO'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
