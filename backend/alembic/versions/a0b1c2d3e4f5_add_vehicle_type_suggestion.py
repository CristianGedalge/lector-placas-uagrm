"""add vehicle type suggestion

Revision ID: a0b1c2d3e4f5
Revises: f0a1b2c3d4e5
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, Sequence[str], None] = "f0a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tipos_vehiculo",
        sa.Column("esta_activo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_tipos_vehiculo_esta_activo", "tipos_vehiculo", ["esta_activo"])
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("tipo_sugerido_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("confianza_tipo", sa.Float(), nullable=True),
    )
    op.add_column(
        "solicitudes_registro_vehiculo",
        sa.Column("metodo_tipo", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_solicitud_tipo_sugerido",
        "solicitudes_registro_vehiculo",
        "tipos_vehiculo",
        ["tipo_sugerido_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_solicitud_tipo_sugerido", "solicitudes_registro_vehiculo", type_="foreignkey")
    op.drop_column("solicitudes_registro_vehiculo", "metodo_tipo")
    op.drop_column("solicitudes_registro_vehiculo", "confianza_tipo")
    op.drop_column("solicitudes_registro_vehiculo", "tipo_sugerido_id")
    op.drop_index("ix_tipos_vehiculo_esta_activo", table_name="tipos_vehiculo")
    op.drop_column("tipos_vehiculo", "esta_activo")
