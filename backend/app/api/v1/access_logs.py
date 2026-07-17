from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.db.models import AccessLog, Vehicle, AuthUser, AuthRoleEnum, AccessDirectionEnum
from app.db.session import get_db
from app.schemas.access_log import AccessLogCreate, AccessLogResponse, AccessLogAutoCreate
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=AccessLogResponse, status_code=status.HTTP_201_CREATED)
async def create_access_log(
    payload: AccessLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    # Verificar que el vehículo exista
    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == payload.vehicle_id))
    vehicle = vehicle_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El vehículo no está registrado en el sistema."
        )

    log = AccessLog(
        vehicle_id=payload.vehicle_id,
        direction=payload.direction,
        zone=payload.zone,
        plate_scan_id=payload.plate_scan_id,
        notes=payload.notes,
        operator_id=current_user.id,
    )

    db.add(log)
    await db.commit()
    await db.refresh(log)

    # Cargar relaciones para la respuesta
    stmt = select(AccessLog).options(
        selectinload(AccessLog.vehicle).selectinload(Vehicle.owner)
    ).where(AccessLog.id == log.id)
    res = await db.execute(stmt)
    full_log = res.scalar_one()

    return full_log


@router.post("/auto", response_model=AccessLogResponse, status_code=status.HTTP_201_CREATED)
async def auto_create_access_log(
    payload: AccessLogAutoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    # Verificar que el vehículo exista
    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == payload.vehicle_id))
    vehicle = vehicle_result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El vehículo no está registrado en el sistema."
        )

    # Buscar el último registro de acceso para inferir la dirección
    last_log_result = await db.execute(
        select(AccessLog)
        .where(AccessLog.vehicle_id == payload.vehicle_id)
        .order_by(AccessLog.timestamp.desc())
        .limit(1)
    )
    last_log = last_log_result.scalar_one_or_none()

    new_direction = AccessDirectionEnum.ENTRY
    if last_log and last_log.direction == AccessDirectionEnum.ENTRY:
        new_direction = AccessDirectionEnum.EXIT

    # Regla de negocio: solo el propietario del vehículo o un Admin puede registrar la SALIDA
    if new_direction == AccessDirectionEnum.EXIT:
        is_owner = str(vehicle.registered_by_user_id) == str(current_user.id)
        is_admin = current_user.role == AuthRoleEnum.ADMIN
        if not is_owner and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el propietario del vehículo o un administrador puede registrar la salida.",
            )

    log = AccessLog(
        vehicle_id=payload.vehicle_id,
        direction=new_direction,
        zone=payload.zone,
        plate_scan_id=payload.plate_scan_id,
        notes=payload.notes,
        operator_id=current_user.id,
    )

    db.add(log)
    await db.commit()
    await db.refresh(log)

    # Cargar relaciones para la respuesta
    stmt = select(AccessLog).options(
        selectinload(AccessLog.vehicle).selectinload(Vehicle.owner)
    ).where(AccessLog.id == log.id)
    res = await db.execute(stmt)
    full_log = res.scalar_one()

    return full_log


@router.get("/", response_model=list[AccessLogResponse])
async def list_access_logs(
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    stmt = select(AccessLog).options(
        selectinload(AccessLog.vehicle).selectinload(Vehicle.owner)
    ).order_by(AccessLog.timestamp.desc())

    if current_user.role != AuthRoleEnum.ADMIN:
        # El operador solo puede ver ingresos de sus propios vehículos
        stmt = stmt.join(Vehicle).where(Vehicle.registered_by_user_id == current_user.id)

    result = await db.execute(stmt)
    logs = result.scalars().all()
    return logs
