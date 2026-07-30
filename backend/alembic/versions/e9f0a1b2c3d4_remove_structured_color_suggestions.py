"""remove structured color suggestions"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e9f0a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "d8e9f0a1b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("solicitudes_registro_vehiculo", "colores_sugeridos")


def downgrade() -> None:
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("colores_sugeridos", sa.JSON(), nullable=True),
    )
