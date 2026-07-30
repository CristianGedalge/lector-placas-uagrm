"""add structured vehicle color suggestions"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: str | Sequence[str] | None = "c7d8e9f0a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("colores_sugeridos", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("solicitudes_registro_vehiculo", "colores_sugeridos")
