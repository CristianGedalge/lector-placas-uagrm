"""add unknown vehicle registration requests"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "3aa735770818"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "solicitudes_registro_vehiculo",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("escaneado_id", sa.Uuid(), nullable=False),
        sa.Column("imagen_id", sa.Uuid(), nullable=False),
        sa.Column("placa_sugerida", sa.String(), nullable=False),
        sa.Column("confianza_placa", sa.Float(), nullable=False),
        sa.Column("estado", sa.Enum("PENDING", "APPROVED", "REJECTED", name="solicitudregistroestadoenum"), nullable=False),
        sa.Column("creado_por_usuario_id", sa.Uuid(), nullable=False),
        sa.Column("revisado_por_usuario_id", sa.Uuid(), nullable=True),
        sa.Column("vehiculo_creado_id", sa.Uuid(), nullable=True),
        sa.Column("creado_el", sa.DateTime(), nullable=False),
        sa.Column("revisado_el", sa.DateTime(), nullable=True),
        sa.Column("actualizado_el", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["escaneado_id"], ["escaneados.id"]),
        sa.ForeignKeyConstraint(["imagen_id"], ["archivos_multimedia.id"]),
        sa.ForeignKeyConstraint(["creado_por_usuario_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["revisado_por_usuario_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["vehiculo_creado_id"], ["vehiculos.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("escaneado_id"),
    )
    op.create_index("ix_solicitudes_registro_vehiculo_estado", "solicitudes_registro_vehiculo", ["estado"])
    op.create_index("ix_solicitudes_registro_vehiculo_placa_sugerida", "solicitudes_registro_vehiculo", ["placa_sugerida"])

def downgrade() -> None:
    op.drop_table("solicitudes_registro_vehiculo")
    op.execute("DROP TYPE IF EXISTS solicitudregistroestadoenum")
