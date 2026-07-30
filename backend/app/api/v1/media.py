from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import get_current_user, require_admin
from app.config.settings import settings
from app.db.models import (
    Acceso,
    ArchivoMultimedia,
    Escaneado,
    MediaProviderEnum,
    MediaStatusEnum,
    MediaTypeEnum,
    RoleEnum,
    Usuario,
    Vehiculo,
)
from app.db.session import get_db
from app.schemas.media import MediaStatusResponse, MediaUrlResponse
from app.services.cloudinary_storage import CloudinaryStorage
from app.services.image_processing import ImageProcessingError, ImageProcessingService
from app.services.media_tasks import process_media_record
from app.services.storage import StorageError

router = APIRouter()


async def _read_upload(file: UploadFile) -> bytes:
    content = await file.read(settings.MEDIA_MAX_UPLOAD_BYTES + 1)
    if len(content) > settings.MEDIA_MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="La imagen excede el tamano permitido")
    return content


async def _process_and_upload(file: UploadFile, media_type: MediaTypeEnum):
    try:
        content = await _read_upload(file)
        processed = await asyncio.to_thread(
            ImageProcessingService().process, content, media_type.value
        )
        uploaded = await asyncio.to_thread(
            CloudinaryStorage().upload, processed.content, media_type.value
        )
        return processed, uploaded
    except ImageProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except StorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _media_from_upload(media_type, processed, uploaded) -> ArchivoMultimedia:
    return ArchivoMultimedia(
        proveedor=MediaProviderEnum.CLOUDINARY,
        tipo=media_type,
        estado=MediaStatusEnum.READY,
        asset_id=uploaded.asset_id,
        public_id=uploaded.public_id,
        resource_type=uploaded.resource_type,
        delivery_type=uploaded.delivery_type,
        formato=uploaded.format,
        ancho=uploaded.width,
        alto=uploaded.height,
        peso_bytes=uploaded.bytes,
        intentos=1,
    )


async def _delete_old_after_commit(
    old_media: ArchivoMultimedia | None, db: AsyncSession
) -> None:
    if not old_media or not old_media.public_id:
        return
    try:
        await asyncio.to_thread(CloudinaryStorage().delete, old_media.public_id)
        old_media.estado = MediaStatusEnum.DELETED
        old_media.deleted_at = datetime.now(timezone.utc)
        await db.commit()
    except StorageError:
        old_media.ultimo_error = "No se pudo eliminar la version anterior"
        await db.commit()


@router.post("/users/{user_id}/photo", response_model=MediaStatusResponse)
async def upload_user_photo(
    user_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.rol != RoleEnum.ADMINISTRADOR:
        raise HTTPException(status_code=403, detail="No autorizado")
    user = await db.get(Usuario, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    old_media = await db.get(ArchivoMultimedia, user.foto_id) if user.foto_id else None
    processed, uploaded = await _process_and_upload(file, MediaTypeEnum.USER_PROFILE)
    media = _media_from_upload(MediaTypeEnum.USER_PROFILE, processed, uploaded)
    db.add(media)
    await db.flush()
    user.foto_id = media.id
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        await asyncio.to_thread(CloudinaryStorage().delete, uploaded.public_id)
        raise
    await _delete_old_after_commit(old_media, db)
    return MediaStatusResponse(id=media.id, type=media.tipo, status=media.estado)


@router.delete("/users/{user_id}/photo", status_code=204)
async def delete_user_photo(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.rol != RoleEnum.ADMINISTRADOR:
        raise HTTPException(status_code=403, detail="No autorizado")
    user = await db.get(Usuario, user_id)
    if not user or not user.foto_id:
        return
    media = await db.get(ArchivoMultimedia, user.foto_id)
    if media and media.public_id:
        await asyncio.to_thread(CloudinaryStorage().delete, media.public_id)
        media.estado = MediaStatusEnum.DELETED
        media.deleted_at = datetime.now(timezone.utc)
    user.foto_id = None
    await db.commit()


async def _vehicle_for_mutation(
    vehicle_id: UUID, db: AsyncSession, current_user: Usuario
) -> Vehiculo:
    vehicle = await db.get(Vehiculo, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    allowed = (
        current_user.rol in {RoleEnum.ADMINISTRADOR, RoleEnum.OPERADOR}
        or vehicle.propietario_usuario_id == current_user.id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="No autorizado")
    return vehicle


@router.post("/vehicles/{vehicle_id}/photo", response_model=MediaStatusResponse)
async def upload_vehicle_photo(
    vehicle_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    vehicle = await _vehicle_for_mutation(vehicle_id, db, current_user)
    old_media = (
        await db.get(ArchivoMultimedia, vehicle.foto_id) if vehicle.foto_id else None
    )
    processed, uploaded = await _process_and_upload(
        file, MediaTypeEnum.VEHICLE_REGISTRATION
    )
    media = _media_from_upload(MediaTypeEnum.VEHICLE_REGISTRATION, processed, uploaded)
    db.add(media)
    await db.flush()
    vehicle.foto_id = media.id
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        await asyncio.to_thread(CloudinaryStorage().delete, uploaded.public_id)
        raise
    await _delete_old_after_commit(old_media, db)
    return MediaStatusResponse(id=media.id, type=media.tipo, status=media.estado)


@router.delete("/vehicles/{vehicle_id}/photo", status_code=204)
async def delete_vehicle_photo(
    vehicle_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    vehicle = await _vehicle_for_mutation(vehicle_id, db, current_user)
    if not vehicle.foto_id:
        return
    media = await db.get(ArchivoMultimedia, vehicle.foto_id)
    if media and media.public_id:
        await asyncio.to_thread(CloudinaryStorage().delete, media.public_id)
        media.estado = MediaStatusEnum.DELETED
        media.deleted_at = datetime.now(timezone.utc)
    vehicle.foto_id = None
    await db.commit()


async def _authorize_media(
    media: ArchivoMultimedia,
    db: AsyncSession,
    current_user: Usuario,
) -> None:
    if current_user.rol == RoleEnum.DISPOSITIVO:
        raise HTTPException(status_code=403, detail="No autorizado")
    if current_user.rol in {RoleEnum.ADMINISTRADOR, RoleEnum.OPERADOR}:
        return
    if media.tipo == MediaTypeEnum.USER_PROFILE:
        owner = await db.scalar(select(Usuario).where(Usuario.foto_id == media.id))
        allowed = owner and owner.id == current_user.id
    elif media.tipo == MediaTypeEnum.VEHICLE_REGISTRATION:
        vehicle = await db.scalar(select(Vehiculo).where(Vehiculo.foto_id == media.id))
        allowed = vehicle and vehicle.propietario_usuario_id == current_user.id
    else:
        access = await db.scalar(select(Acceso).where(Acceso.imagen_id == media.id))
        scan = await db.get(Escaneado, access.escaneado_id) if access else None
        vehicle = await db.get(Vehiculo, scan.vehiculo_id) if scan and scan.vehiculo_id else None
        allowed = vehicle and vehicle.propietario_usuario_id == current_user.id
    if not allowed:
        raise HTTPException(status_code=403, detail="No autorizado")


@router.get("/{media_id}/url", response_model=MediaUrlResponse)
async def get_media_url(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    media = await db.get(ArchivoMultimedia, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    await _authorize_media(media, db, current_user)
    if media.estado != MediaStatusEnum.READY or not media.public_id or not media.formato:
        raise HTTPException(status_code=409, detail="La imagen no esta disponible")
    temporary = await asyncio.to_thread(
        CloudinaryStorage().get_temporary_url, media.public_id, media.formato
    )
    return MediaUrlResponse(url=temporary.url, expires_at=temporary.expires_at)


@router.post("/{media_id}/retry", response_model=MediaStatusResponse)
async def retry_media(
    media_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    media = await db.get(ArchivoMultimedia, media_id)
    if not media or media.estado != MediaStatusEnum.FAILED or not media.spool_path:
        raise HTTPException(status_code=409, detail="La evidencia no admite reintento")
    media.estado = MediaStatusEnum.PENDING
    await db.commit()
    await process_media_record(media.id)
    await db.refresh(media)
    return MediaStatusResponse(id=media.id, type=media.tipo, status=media.estado)
