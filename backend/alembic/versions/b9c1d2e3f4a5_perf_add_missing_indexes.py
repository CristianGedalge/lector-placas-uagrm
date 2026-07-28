"""perf_add_missing_indexes

Revision ID: b9c1d2e3f4a5
Revises: a1b2c3d4e5f6
Create Date: 2026-07-28

Agrega indices en columnas de alta frecuencia de busqueda/join que faltaban.
Impacto esperado: elimina full-table-scans en listados de accesos, vehiculos y usuarios.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers
revision: str = "b9c1d2e3f4a5"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── usuarios ──────────────────────────────────────────────────────────
    op.create_index("ix_usuarios_rol", "usuarios", ["rol"])
    op.create_index("ix_usuarios_esta_activo", "usuarios", ["esta_activo"])

    # ── vehiculos ─────────────────────────────────────────────────────────
    op.create_index("ix_vehiculos_propietario_usuario_id", "vehiculos", ["propietario_usuario_id"])
    op.create_index("ix_vehiculos_marca_id", "vehiculos", ["marca_id"])
    op.create_index("ix_vehiculos_tipo_vehiculo_id", "vehiculos", ["tipo_vehiculo_id"])
    op.create_index("ix_vehiculos_esta_activo", "vehiculos", ["esta_activo"])
    op.create_index("ix_vehiculos_creado_el", "vehiculos", ["creado_el"])

    # ── estado_campus ─────────────────────────────────────────────────────
    op.create_index("ix_estado_campus_vehiculo_id", "estado_campus", ["vehiculo_id"])

    # ── escaneados ────────────────────────────────────────────────────────
    op.create_index("ix_escaneados_dispositivo_id", "escaneados", ["dispositivo_id"])
    op.create_index("ix_escaneados_vehiculo_id", "escaneados", ["vehiculo_id"])

    # ── accesos ───────────────────────────────────────────────────────────
    op.create_index("ix_accesos_tipo_acceso", "accesos", ["tipo_acceso"])
    op.create_index("ix_accesos_escaneado_id", "accesos", ["escaneado_id"])
    op.create_index("ix_accesos_operador_usuario_id", "accesos", ["operador_usuario_id"])


def downgrade() -> None:
    op.drop_index("ix_accesos_operador_usuario_id", table_name="accesos")
    op.drop_index("ix_accesos_escaneado_id", table_name="accesos")
    op.drop_index("ix_accesos_tipo_acceso", table_name="accesos")
    op.drop_index("ix_escaneados_vehiculo_id", table_name="escaneados")
    op.drop_index("ix_escaneados_dispositivo_id", table_name="escaneados")
    op.drop_index("ix_estado_campus_vehiculo_id", table_name="estado_campus")
    op.drop_index("ix_vehiculos_creado_el", table_name="vehiculos")
    op.drop_index("ix_vehiculos_esta_activo", table_name="vehiculos")
    op.drop_index("ix_vehiculos_tipo_vehiculo_id", table_name="vehiculos")
    op.drop_index("ix_vehiculos_marca_id", table_name="vehiculos")
    op.drop_index("ix_vehiculos_propietario_usuario_id", table_name="vehiculos")
    op.drop_index("ix_usuarios_esta_activo", table_name="usuarios")
    op.drop_index("ix_usuarios_rol", table_name="usuarios")
