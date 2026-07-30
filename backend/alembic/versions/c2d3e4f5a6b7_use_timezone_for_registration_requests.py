"""use timezone-aware timestamps for registration requests"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | Sequence[str] | None = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for column_name in ("creado_el", "revisado_el", "actualizado_el"):
        op.alter_column(
            "solicitudes_registro_vehiculo",
            column_name,
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
            existing_nullable=column_name == "revisado_el",
        )


def downgrade() -> None:
    for column_name in ("creado_el", "revisado_el", "actualizado_el"):
        op.alter_column(
            "solicitudes_registro_vehiculo",
            column_name,
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
            existing_nullable=column_name == "revisado_el",
        )
