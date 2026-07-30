"""add color suggestion method

Revision ID: f0a1b2c3d4e5
Revises: e9f0a1b2c3d4
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f0a1b2c3d4e5"
down_revision: str | Sequence[str] | None = "e9f0a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("solicitudes_registro_vehiculo", sa.Column("metodo_color", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("solicitudes_registro_vehiculo", "metodo_color")
