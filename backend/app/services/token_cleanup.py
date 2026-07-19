"""
SEC-007: Servicio de limpieza periódica de tokens revocados expirados.

Los tokens en RevokedToken se acumulan sin límite porque JWT expirados
no necesitan seguir en la lista de bloqueo: si el token ya venció, el
middleware de autenticación lo rechazará por expiración antes de llegar
a comprobar si está revocado.

Uso recomendado: llamar a cleanup_expired_tokens() desde un cron job,
un APScheduler o un endpoint admin protegido. No es necesario ejecutarlo
en el startup del servidor.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import delete, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import RevokedToken

logger = logging.getLogger(__name__)


async def cleanup_expired_tokens(db: AsyncSession) -> int:
    """
    Elimina de la tabla revoked_tokens todos los registros cuyo
    campo expires_at ya ha pasado (token caducado).

    Para tokens sin expires_at (NULL), no se eliminan porque no se
    puede verificar automáticamente si siguen siendo válidos.

    Returns:
        int: Número de filas eliminadas.
    """
    now = datetime.now(timezone.utc)

    result = await db.execute(
        delete(RevokedToken).where(
            RevokedToken.expires_at.is_not(None),
            RevokedToken.expires_at < now,
        )
    )
    deleted = result.rowcount or 0
    await db.commit()

    if deleted:
        logger.info("SEC-007: Limpieza de tokens — %d registros expirados eliminados.", deleted)
    else:
        logger.debug("SEC-007: Limpieza de tokens — sin registros expirados.")

    return deleted


async def count_revoked_tokens(db: AsyncSession) -> dict:
    """Estadísticas de la tabla revoked_tokens (útil para endpoints admin)."""
    now = datetime.now(timezone.utc)

    total_result = await db.execute(select(func.count(RevokedToken.id)))
    total = total_result.scalar() or 0

    expired_result = await db.execute(
        select(func.count(RevokedToken.id)).where(
            RevokedToken.expires_at.is_not(None),
            RevokedToken.expires_at < now,
        )
    )
    expired = expired_result.scalar() or 0

    return {
        "total_revoked_tokens": total,
        "expired_tokens_pending_cleanup": expired,
        "active_blocked_tokens": total - expired,
    }
