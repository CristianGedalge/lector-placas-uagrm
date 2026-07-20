from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    Acceso, Escaneado, RoleEnum, TipoAccesoEnum, EstadoCampus,
    UbicacionVehiculoEnum, Dispositivo, Vehiculo, EstadoEscaneoEnum
)
from app.db.session import get_db
from app.schemas.access_log import AccesoCreate, AccesoResponse, AccesoAutoCreate
from app.api.v1.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=AccesoResponse, status_code=status.HTTP_201_CREATED)
async def create_access_log(
    payload: AccesoCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    scan_result = await db.execute(select(Escaneado).where(Escaneado.id == payload.escaneado_id))
    escaneado = scan_result.scalar_one_or_none()
    if not escaneado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El escaneo no existe."
        )

    # Solo admins, operadores o dispositivos pueden registrar accesos
    if current_user.rol not in [RoleEnum.ADMINISTRADOR, RoleEnum.OPERADOR, RoleEnum.DISPOSITIVO]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar accesos.",
        )

    log = Acceso(
        tipo_acceso=payload.tipo_acceso,
        ubicacion=payload.ubicacion,
        escaneado_id=payload.escaneado_id,
        operador_usuario_id=current_user.id if current_user.rol != RoleEnum.DISPOSITIVO else None,
    )
    db.add(log)
    await db.flush()

    if escaneado.vehiculo_id:
        estado_result = await db.execute(select(EstadoCampus).where(EstadoCampus.vehiculo_id == escaneado.vehiculo_id))
        estado_campus = estado_result.scalar_one_or_none()
        
        nuevo_estado = UbicacionVehiculoEnum.DENTRO if payload.tipo_acceso == TipoAccesoEnum.ENTRADA else UbicacionVehiculoEnum.FUERA

        if estado_campus:
            estado_campus.estado = nuevo_estado
            estado_campus.ultimo_acceso_id = log.id
        else:
            estado_campus = EstadoCampus(
                vehiculo_id=escaneado.vehiculo_id,
                estado=nuevo_estado,
                ultimo_acceso_id=log.id
            )
            db.add(estado_campus)

    await db.commit()
    
    # Recargar con relaciones para la serialización del frontend
    stmt_reload = (
        select(Acceso)
        .options(
            selectinload(Acceso.escaneado)
            .selectinload(Escaneado.vehiculo)
            .selectinload(Vehiculo.propietario),
            selectinload(Acceso.escaneado)
            .selectinload(Escaneado.vehiculo)
            .selectinload(Vehiculo.marca)
        )
        .where(Acceso.id == log.id)
    )
    res_reload = await db.execute(stmt_reload)
    log_loaded = res_reload.scalar_one()
    return AccesoResponse.model_validate(log_loaded)


@router.post("/auto", response_model=AccesoResponse, status_code=status.HTTP_201_CREATED)
async def create_auto_access_log(
    payload: AccesoAutoCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.rol not in [RoleEnum.ADMINISTRADOR, RoleEnum.OPERADOR, RoleEnum.DISPOSITIVO]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para registrar accesos.",
        )

    v_res = await db.execute(select(Vehiculo).where(Vehiculo.id == payload.vehicle_id))
    vehiculo = v_res.scalar_one_or_none()
    if not vehiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehículo no encontrado."
        )

    device_location = payload.zone or "Portería Principal"
    inferred_tipo_acceso = None

    if current_user.rol == RoleEnum.DISPOSITIVO:
        dev_res = await db.execute(
            select(Dispositivo).where(
                Dispositivo.nombre == current_user.nombre,
                Dispositivo.esta_activo == True
            )
        )
        device = dev_res.scalar_one_or_none()
        if device:
            device_location = device.ubicacion
            name_lower = device.nombre.lower()
            if "entrada" in name_lower or "ingreso" in name_lower:
                inferred_tipo_acceso = TipoAccesoEnum.ENTRADA
            elif "salida" in name_lower or "egreso" in name_lower:
                inferred_tipo_acceso = TipoAccesoEnum.SALIDA

    # Si el operador/admin especificó la dirección manualmente, respetarla
    if inferred_tipo_acceso is None and payload.direction is not None:
        inferred_tipo_acceso = TipoAccesoEnum.ENTRADA if payload.direction == "ENTRY" else TipoAccesoEnum.SALIDA

    if inferred_tipo_acceso is None:
        estado_result = await db.execute(select(EstadoCampus).where(EstadoCampus.vehiculo_id == vehiculo.id))
        estado_campus = estado_result.scalar_one_or_none()
        if estado_campus and estado_campus.estado == UbicacionVehiculoEnum.DENTRO:
            inferred_tipo_acceso = TipoAccesoEnum.SALIDA
        else:
            inferred_tipo_acceso = TipoAccesoEnum.ENTRADA

    scan_res = await db.execute(
        select(Escaneado)
        .where(Escaneado.vehiculo_id == vehiculo.id)
        .order_by(Escaneado.creado_el.desc())
        .limit(1)
    )
    last_scan = scan_res.scalar_one_or_none()

    if not last_scan:
        last_scan = Escaneado(
            placa_detectada=vehiculo.placa,
            placa_normalizada=vehiculo.placa,
            confianza=1.0,
            estado=EstadoEscaneoEnum.DETECTADO,
            vehiculo_id=vehiculo.id
        )
        db.add(last_scan)
        await db.flush()

    log = Acceso(
        tipo_acceso=inferred_tipo_acceso,
        ubicacion=device_location,
        escaneado_id=last_scan.id,
        operador_usuario_id=current_user.id if current_user.rol != RoleEnum.DISPOSITIVO else None,
    )
    db.add(log)
    await db.flush()

    nuevo_estado = UbicacionVehiculoEnum.DENTRO if inferred_tipo_acceso == TipoAccesoEnum.ENTRADA else UbicacionVehiculoEnum.FUERA
    estado_result = await db.execute(select(EstadoCampus).where(EstadoCampus.vehiculo_id == vehiculo.id))
    estado_campus = estado_result.scalar_one_or_none()

    if estado_campus:
        estado_campus.estado = nuevo_estado
        estado_campus.ultimo_acceso_id = log.id
    else:
        estado_campus = EstadoCampus(
            vehiculo_id=vehiculo.id,
            estado=nuevo_estado,
            ultimo_acceso_id=log.id
        )
        db.add(estado_campus)

    await db.commit()
    
    # Recargar con relaciones para la serialización del frontend
    stmt_reload = (
        select(Acceso)
        .options(
            selectinload(Acceso.escaneado)
            .selectinload(Escaneado.vehiculo)
            .selectinload(Vehiculo.propietario),
            selectinload(Acceso.escaneado)
            .selectinload(Escaneado.vehiculo)
            .selectinload(Vehiculo.marca)
        )
        .where(Acceso.id == log.id)
    )
    res_reload = await db.execute(stmt_reload)
    log_loaded = res_reload.scalar_one()
    return AccesoResponse.model_validate(log_loaded)


@router.get("/", response_model=list[AccesoResponse])
async def list_access_logs(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    stmt = (
        select(Acceso)
        .options(
            selectinload(Acceso.escaneado)
            .selectinload(Escaneado.vehiculo)
            .selectinload(Vehiculo.propietario),
            selectinload(Acceso.escaneado)
            .selectinload(Escaneado.vehiculo)
            .selectinload(Vehiculo.marca)
        )
        .order_by(Acceso.creado_el.desc())
        .offset(skip)
        .limit(limit)
    )

    # Dependiendo de permisos, filtrar. Por ahora todos
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return [AccesoResponse.model_validate(x) for x in logs]
