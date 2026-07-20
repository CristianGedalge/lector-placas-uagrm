from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone

from app.db.models import Vehiculo, Usuario, Escaneado, EstadoCampus, UbicacionVehiculoEnum, RoleEnum
from app.db.session import get_db
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Vehículos
    query = select(Vehiculo).options(selectinload(Vehiculo.propietario)).order_by(Vehiculo.creado_el.desc())
    if current_user.rol not in [RoleEnum.ADMINISTRADOR, RoleEnum.DISPOSITIVO]:
        query = query.where(Vehiculo.propietario_usuario_id == current_user.id)

    result = await db.execute(query)
    vehicles = list(result.scalars().all())

    total_query = select(func.count(Vehiculo.id))
    if current_user.rol not in [RoleEnum.ADMINISTRADOR, RoleEnum.DISPOSITIVO]:
        total_query = total_query.where(Vehiculo.propietario_usuario_id == current_user.id)
    total_result = await db.execute(total_query)
    total_vehicles = total_result.scalar() or 0

    active_vehicles = len([v for v in vehicles if v.esta_activo])

    # Usuarios del sistema (solo cuenta si es admin, sino 0 para no exponer datos innecesarios)
    total_users = 0
    if current_user.rol == RoleEnum.ADMINISTRADOR:
        users_result = await db.execute(select(func.count(Usuario.id)))
        total_users = users_result.scalar() or 0

    # Vehículos dentro del campus (EstadoCampus == DENTRO)
    campus_result = await db.execute(select(func.count(EstadoCampus.id)).where(EstadoCampus.estado == UbicacionVehiculoEnum.DENTRO))
    vehicles_inside = campus_result.scalar() or 0

    # Escaneos de placas (Telemetría)
    scans_query = select(Escaneado).order_by(Escaneado.creado_el.desc())
    scans_result = await db.execute(scans_query)
    scans = list(scans_result.scalars().all())
    total_scans = len(scans)

    # Escaneos hoy (últimas 24h)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    today_scans = len([s for s in scans if s.creado_el >= one_day_ago])

    # Confianza promedio de lecturas exitosas
    successful_scans = [s for s in scans if s.confianza is not None]
    avg_confidence = (
        sum(s.confianza for s in successful_scans) / len(successful_scans)
        if successful_scans
        else 0.0
    )

    # Últimas 5 lecturas de placas para el feed del dashboard
    recent_scans = []
    for s in scans[:5]:
        recent_scans.append({
            "id": str(s.id),
            "placa_detectada": s.placa_detectada,
            "placa_normalizada": s.placa_normalizada,
            "confianza": s.confianza,
            "estado": s.estado.value if hasattr(s.estado, "value") else str(s.estado),
            "creado_el": s.creado_el.isoformat(),
            "has_vehicle": s.vehiculo_id is not None
        })

    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "total_users": total_users,
        "vehicles_inside": vehicles_inside,
        "total_scans": total_scans,
        "today_scans": today_scans,
        "avg_confidence": avg_confidence,
        "recent_scans": recent_scans,
        "my_vehicles": [v.id for v in vehicles],
    }
