"""EFI-003 + SEC-007: Add composite indexes and revoked token cleanup

Revision ID: a1b2c3d4e5f6
Revises: 0e3cb86073ba
Create Date: 2026-07-19 05:00:00.000000

EFI-003: Composite indexes on plate_scans and access_logs for faster
         chronological queries filtered by user/vehicle.
SEC-007: Add expiry column to revoked_tokens so expired tokens can
         be pruned automatically by a periodic cleanup task.
"""
from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'df3072f8b6b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """EFI-003: Composite indexes for frequent query patterns."""

    # plate_scans: historial cronológico por usuario
    op.create_index(
        'ix_plate_scans_user_created',
        'plate_scans',
        ['scanned_by_user_id', 'created_at'],
        unique=False,
    )

    # plate_scans: historial cronológico global (admin view)
    op.create_index(
        'ix_plate_scans_created',
        'plate_scans',
        ['created_at'],
        unique=False,
    )

    # access_logs: historial cronológico por vehículo
    op.create_index(
        'ix_access_logs_vehicle_timestamp',
        'access_logs',
        ['vehicle_id', 'timestamp'],
        unique=False,
    )

    # access_logs: historial cronológico global
    op.create_index(
        'ix_access_logs_timestamp',
        'access_logs',
        ['timestamp'],
        unique=False,
    )

    # SEC-007: Agregar columna expires_at a revoked_tokens para poder
    # limpiar tokens vencidos sin necesidad de descodificar el JWT.
    op.add_column(
        'revoked_tokens',
        sa.Column(
            'expires_at',
            sa.DateTime(),
            nullable=True,
            comment='UTC expiry time of the original JWT. NULL = no expiry tracked.',
        ),
    )

    # Index para facilitar la purga periódica de tokens expirados
    op.create_index(
        'ix_revoked_tokens_expires_at',
        'revoked_tokens',
        ['expires_at'],
        unique=False,
    )


def downgrade() -> None:
    """Revert indexes and expires_at column."""
    op.drop_index('ix_revoked_tokens_expires_at', table_name='revoked_tokens')
    op.drop_column('revoked_tokens', 'expires_at')
    op.drop_index('ix_access_logs_timestamp', table_name='access_logs')
    op.drop_index('ix_access_logs_vehicle_timestamp', table_name='access_logs')
    op.drop_index('ix_plate_scans_created', table_name='plate_scans')
    op.drop_index('ix_plate_scans_user_created', table_name='plate_scans')
