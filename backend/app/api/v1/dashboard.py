from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.db.models import Vehicle, AuthUser, UniversityPerson, PlateScan
from app.db.session import get_db
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    registered_by_user_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    # Vehículos
    query = select(Vehicle).options(selectinload(Vehicle.owner)).order_by(Vehicle.created_at.desc())
    if registered_by_user_id:
        query = query.where(Vehicle.registered_by_user_id == registered_by_user_id)

    result = await db.execute(query)
    vehicles = list(result.scalars().all())

    total_query = select(func.count(Vehicle.id))
    if registered_by_user_id:
        total_query = total_query.where(Vehicle.registered_by_user_id == registered_by_user_id)
    total_result = await db.execute(total_query)
    total_vehicles = total_result.scalar() or 0

    active_vehicles = len(
        [
            vehicle
            for vehicle in vehicles
            if getattr(vehicle.status, "value", vehicle.status) == "ACTIVE"
        ]
    )

    # Usuarios del sistema
    users_result = await db.execute(select(func.count(AuthUser.id)))
    total_users = users_result.scalar() or 0

    # Personas universitarias (SIARP)
    persons_result = await db.execute(select(func.count(UniversityPerson.id)))
    total_persons = persons_result.scalar() or 0

    # Escaneos de placas (Telemetría)
    scans_query = select(PlateScan).order_by(PlateScan.created_at.desc())
    if registered_by_user_id:
        scans_query = scans_query.where(PlateScan.scanned_by_user_id == registered_by_user_id)
    
    scans_result = await db.execute(scans_query)
    scans = list(scans_result.scalars().all())
    total_scans = len(scans)

    # Escaneos hoy (últimas 24h)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    today_scans = len([s for s in scans if s.created_at >= one_day_ago])

    # Confianza promedio de lecturas exitosas
    successful_scans = [s for s in scans if s.confidence is not None]
    avg_confidence = (
        sum(s.confidence for s in successful_scans) / len(successful_scans)
        if successful_scans
        else 0.0
    )

    # Últimas 5 lecturas de placas para el feed del dashboard
    recent_scans = []
    for s in scans[:5]:
        recent_scans.append({
            "id": str(s.id),
            "detected_plate": s.detected_plate,
            "normalized_plate": s.normalized_plate,
            "confidence": s.confidence,
            "scan_status": s.scan_status.value if hasattr(s.scan_status, "value") else str(s.scan_status),
            "created_at": s.created_at.isoformat(),
            "has_vehicle": s.vehicle_id is not None
        })

    return {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "total_users": total_users,
        "total_persons": total_persons,
        "total_scans": total_scans,
        "today_scans": today_scans,
        "avg_confidence": avg_confidence,
        "recent_scans": recent_scans,
        "my_vehicles": vehicles,
    }
