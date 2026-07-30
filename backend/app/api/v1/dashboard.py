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
    can_view_global = current_user.rol in {RoleEnum.ADMINISTRADOR, RoleEnum.OPERADOR}

    # ── Total de vehículos (conteo SQL puro) ──────────────────────────────
    total_q = select(func.count(Vehiculo.id))
    active_q = select(func.count(Vehiculo.id)).where(Vehiculo.esta_activo == True)
    if not can_view_global:
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
    campus_q = select(func.count(EstadoCampus.id)).where(
        EstadoCampus.estado == UbicacionVehiculoEnum.DENTRO
    )
    if not can_view_global:
        campus_q = campus_q.join(Vehiculo).where(
            Vehiculo.propietario_usuario_id == current_user.id
        )
    campus_res = await db.execute(campus_q)
    vehicles_inside = campus_res.scalar() or 0

    # ── Estadísticas de escaneos (SQL puro, sin cargar filas) ─────────────
    scans_filter = []
    if not can_view_global:
        scans_filter.append(Vehiculo.propietario_usuario_id == current_user.id)
    total_scans_q = select(func.count(Escaneado.id))
    if scans_filter:
        total_scans_q = total_scans_q.join(Vehiculo).where(*scans_filter)
    total_scans_res = await db.execute(total_scans_q)
    total_scans = total_scans_res.scalar() or 0

    one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
    today_q = select(func.count(Escaneado.id)).where(Escaneado.creado_el >= one_day_ago)
    if scans_filter:
        today_q = today_q.join(Vehiculo).where(*scans_filter)
    today_res = await db.execute(today_q)
    today_scans = today_res.scalar() or 0

    avg_q = select(func.avg(Escaneado.confianza)).where(Escaneado.confianza.is_not(None))
    if scans_filter:
        avg_q = avg_q.join(Vehiculo).where(*scans_filter)
    avg_res = await db.execute(avg_q)
    avg_confidence = float(avg_res.scalar() or 0.0)

    # ── Últimas 5 lecturas (solo campos escalares, sin vehiculo selectinload) ──
    recent_q = (
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
    if scans_filter:
        recent_q = recent_q.where(*scans_filter)
    recent_res = await db.execute(recent_q)
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
    if not can_view_global:
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
