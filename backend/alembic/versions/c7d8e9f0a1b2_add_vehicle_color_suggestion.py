"""add vehicle color suggestion to registration requests"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c7d8e9f0a1b2"
down_revision: str | Sequence[str] | None = "b9c1d2e3f4a5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("color_sugerido", sa.String(), nullable=True),
    )
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("confianza_color", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("solicitudes_registro_vehiculo", "confianza_color")
    op.drop_column("solicitudes_registro_vehiculo", "color_sugerido")
