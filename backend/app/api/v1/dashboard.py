from datetime import datetime, timedelta, timezone

from app.api.v1.auth import get_current_user
from app.db.models import (
    Escaneado,
    EstadoCampus,
    RoleEnum,
    UbicacionVehiculoEnum,
    Usuario,
    Vehiculo,
)
from app.db.session import get_db
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    is_admin_or_device = current_user.rol in [RoleEnum.ADMINISTRADOR, RoleEnum.DISPOSITIVO]

    # ── Total de vehículos (conteo SQL puro) ──────────────────────────────
    total_q = select(func.count(Vehiculo.id))
    active_q = select(func.count(Vehiculo.id)).where(Vehiculo.esta_activo == True)
    if not is_admin_or_device:
        total_q = total_q.where(Vehiculo.propietario_usuario_id == current_user.id)
        active_q = active_q.where(Vehiculo.propietario_usuario_id == current_user.id)

    total_vehicles, active_vehicles = (
        await db.execute(total_q),
        await db.execute(active_q),
    )
    total_vehicles = total_vehicles.scalar() or 0
    active_vehicles = active_vehicles.scalar() or 0

    # ── Total de usuarios (solo admin) ────────────────────────────────────
    total_users = 0
    if current_user.rol == RoleEnum.ADMINISTRADOR:
        u_res = await db.execute(select(func.count(Usuario.id)))
        total_users = u_res.scalar() or 0

    # ── Vehículos dentro del campus ───────────────────────────────────────
    campus_res = await db.execute(
        select(func.count(EstadoCampus.id)).where(
            EstadoCampus.estado == UbicacionVehiculoEnum.DENTRO
        )
    )
    vehicles_inside = campus_res.scalar() or 0

    # ── Estadísticas de escaneos (SQL puro, sin cargar filas) ─────────────
    total_scans_res = await db.execute(select(func.count(Escaneado.id)))
    total_scans = total_scans_res.scalar() or 0

    one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    today_res = await db.execute(
        select(func.count(Escaneado.id)).where(Escaneado.creado_el >= one_day_ago)
    )
    today_scans = today_res.scalar() or 0

    avg_res = await db.execute(
        select(func.avg(Escaneado.confianza)).where(Escaneado.confianza.is_not(None))
    )
    avg_confidence = float(avg_res.scalar() or 0.0)

    # ── Últimas 5 lecturas (solo campos escalares, sin vehiculo selectinload) ──
    recent_res = await db.execute(
        select(
            Escaneado.id,
            Escaneado.placa_detectada,
            Escaneado.placa_normalizada,
            Escaneado.confianza,
            Escaneado.estado,
            Escaneado.creado_el,
            Escaneado.vehiculo_id,
            Vehiculo.foto_id,
        )
        .outerjoin(Vehiculo, Vehiculo.id == Escaneado.vehiculo_id)
        .order_by(Escaneado.creado_el.desc())
        .limit(5)
    )
    recent_scans = [
        {
            "id": str(row.id),
            "placa_detectada": row.placa_detectada,
            "placa_normalizada": row.placa_normalizada,
            "confianza": row.confianza,
            "estado": row.estado.value if hasattr(row.estado, "value") else str(row.estado),
            "creado_el": row.creado_el.isoformat(),
            "has_vehicle": row.vehiculo_id is not None,
            "vehicle_photo_id": str(row.foto_id) if row.foto_id else None,
        }
        for row in recent_res
    ]

    # ── IDs de vehículos del usuario (solo para el frontend personalizado) ─
    my_vehicles: list[str] = []
    if not is_admin_or_device:
        mv_res = await db.execute(
            select(Vehiculo.id).where(Vehiculo.propietario_usuario_id == current_user.id)
        )
        my_vehicles = [str(r) for r in mv_res.scalars().all()]

    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "total_users": total_users,
        "vehicles_inside": vehicles_inside,
        "total_scans": total_scans,
        "today_scans": today_scans,
        "avg_confidence": avg_confidence,
        "recent_scans": recent_scans,
        "my_vehicles": my_vehicles,
    }
