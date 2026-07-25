"""add provider-neutral media storage

Revision ID: 9d8f2a1c4b77
Revises: 6784f2a204a1
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "9d8f2a1c4b77"
down_revision: Union[str, Sequence[str], None] = "6784f2a204a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "archivos_multimedia",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "proveedor",
            sa.Enum("CLOUDINARY", name="mediaproviderenum"),
            nullable=False,
        ),
        sa.Column(
            "tipo",
            sa.Enum(
                "USER_PROFILE",
                "VEHICLE_REGISTRATION",
                "ACCESS_ENTRY",
                "ACCESS_EXIT",
                name="mediatypeenum",
            ),
            nullable=False,
        ),
        sa.Column(
            "estado",
            sa.Enum(
                "PENDING",
                "PROCESSING",
                "READY",
                "FAILED",
                "DELETED",
                name="mediastatusenum",
            ),
            nullable=False,
        ),
        sa.Column("asset_id", sa.String(), nullable=True),
        sa.Column("public_id", sa.String(), nullable=True),
        sa.Column("resource_type", sa.String(), nullable=False),
        sa.Column("delivery_type", sa.String(), nullable=False),
        sa.Column("formato", sa.String(), nullable=True),
        sa.Column("ancho", sa.Integer(), nullable=True),
        sa.Column("alto", sa.Integer(), nullable=True),
        sa.Column("peso_bytes", sa.Integer(), nullable=True),
        sa.Column("intentos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ultimo_error", sa.Text(), nullable=True),
        sa.Column("spool_path", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("asset_id"),
        sa.UniqueConstraint("public_id"),
    )
    op.create_index(
        "ix_archivos_multimedia_estado",
        "archivos_multimedia",
        ["estado"],
    )
    op.create_index(
        "ix_archivos_multimedia_expires_at",
        "archivos_multimedia",
        ["expires_at"],
    )
    op.add_column("usuarios", sa.Column("foto_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_usuarios_foto_id_archivos_multimedia",
        "usuarios",
        "archivos_multimedia",
        ["foto_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column("vehiculos", sa.Column("foto_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_vehiculos_foto_id_archivos_multimedia",
        "vehiculos",
        "archivos_multimedia",
        ["foto_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column("accesos", sa.Column("imagen_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_accesos_imagen_id_archivos_multimedia",
        "accesos",
        "archivos_multimedia",
        ["imagen_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_accesos_imagen_id_archivos_multimedia", "accesos", type_="foreignkey"
    )
    op.drop_column("accesos", "imagen_id")
    op.drop_constraint(
        "fk_vehiculos_foto_id_archivos_multimedia",
        "vehiculos",
        type_="foreignkey",
    )
    op.drop_column("vehiculos", "foto_id")
    op.drop_constraint(
        "fk_usuarios_foto_id_archivos_multimedia", "usuarios", type_="foreignkey"
    )
    op.drop_column("usuarios", "foto_id")
    op.drop_index(
        "ix_archivos_multimedia_expires_at", table_name="archivos_multimedia"
    )
    op.drop_index("ix_archivos_multimedia_estado", table_name="archivos_multimedia")
    op.drop_table("archivos_multimedia")
    sa.Enum(name="mediastatusenum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="mediatypeenum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="mediaproviderenum").drop(op.get_bind(), checkfirst=True)
