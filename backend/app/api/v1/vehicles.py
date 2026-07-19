import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.models import AuthRoleEnum, RecordStatusEnum, UniversityPerson, Vehicle, AuthUser
from app.db.session import get_db
from app.schemas.vehicle import VehicleCreate, VehicleResponse
from app.api.v1.auth import get_current_user, require_admin

router = APIRouter()

UPLOADS_DIR = Path(__file__).resolve().parents[3] / "uploads" / "vehicles"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


async def resolve_owner(vehicle_in: VehicleCreate, db: AsyncSession) -> UniversityPerson:
    if vehicle_in.owner_id:
        result = await db.execute(
            select(UniversityPerson).where(UniversityPerson.id == vehicle_in.owner_id)
        )
        owner = result.scalars().first()
        if not owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La persona especificada (owner_id) no existe.",
            )
        return owner

    if not vehicle_in.owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar owner_id o los datos completos del propietario.",
        )

    owner_data = vehicle_in.owner
    result = await db.execute(
        select(UniversityPerson).where(UniversityPerson.code == owner_data.code.strip())
    )
    owner = result.scalars().first()

    # Validar unicidad de CI si se proporciona
    if owner_data.document_id and owner_data.document_id.strip():
        ci_result = await db.execute(
            select(UniversityPerson).where(
                UniversityPerson.document_id == owner_data.document_id.strip()
            )
        )
        existing_ci = ci_result.scalars().first()
        if existing_ci and (not owner or existing_ci.id != owner.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El documento de identidad (CI) ya está registrado para otra persona.",
            )

    if owner:
        owner.full_name = owner_data.full_name.strip()
        owner.role = owner_data.role
        owner.document_id = owner_data.document_id.strip() if owner_data.document_id else None
        owner.faculty = owner_data.faculty
        owner.contact_info = owner_data.contact_info
        owner.status = owner_data.status
        owner.is_active = owner_data.is_active
        return owner

    owner = UniversityPerson(
        code=owner_data.code.strip(),
        full_name=owner_data.full_name.strip(),
        role=owner_data.role,
        document_id=owner_data.document_id.strip() if owner_data.document_id else None,
        faculty=owner_data.faculty,
        contact_info=owner_data.contact_info,
        status=owner_data.status,
        is_active=owner_data.is_active,
    )
    db.add(owner)
    await db.flush()
    return owner


ALLOWED_PHOTO_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB

async def save_vehicle_photo(photo: UploadFile | None) -> str | None:
    if not photo or not photo.filename:
        return None
        
    if photo.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPEG, PNG o WebP.")
        
    content = await photo.read()
    if len(content) > MAX_PHOTO_SIZE:
        raise HTTPException(status_code=413, detail="La foto no puede superar 5MB.")
        
    extension = ALLOWED_PHOTO_TYPES[photo.content_type]
    filename = f"{uuid.uuid4()}{extension}"
    target_path = UPLOADS_DIR / filename
    target_path.write_bytes(content)
    return f"/api/v1/vehicles/photos/{filename}"


@router.get("/photos/{filename}", summary="Obtiene la foto de un vehículo (Protegido)")
async def get_vehicle_photo(
    filename: str,
    current_user: AuthUser = Depends(get_current_user)
):
    """Retorna la imagen del vehículo asegurando que el usuario esté autenticado."""
    import os
    safe_filename = os.path.basename(filename)
    file_path = UPLOADS_DIR / safe_filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Imagen no encontrada.")
    return FileResponse(file_path)


async def get_vehicle_with_owner(vehicle_id, db: AsyncSession):
    result = await db.execute(
        select(Vehicle)
        .options(selectinload(Vehicle.owner))
        .where(Vehicle.id == vehicle_id)
    )
    return result.scalars().first()


def apply_vehicle_changes(vehicle: Vehicle, vehicle_in: VehicleCreate):
    vehicle.license_plate = vehicle_in.license_plate.upper().strip()
    vehicle.brand = vehicle_in.brand.strip()
    vehicle.model = vehicle_in.model.strip()
    vehicle.color = vehicle_in.color.strip()
    vehicle.vehicle_type = vehicle_in.vehicle_type
    vehicle.year = vehicle_in.year.strip() if vehicle_in.year else None
    vehicle.observation = vehicle_in.observation.strip() if vehicle_in.observation else None
    vehicle.status = vehicle_in.status
    if vehicle_in.vehicle_photo_path is not None:
      vehicle.vehicle_photo_path = vehicle_in.vehicle_photo_path
    vehicle.registered_by_user_id = vehicle_in.registered_by_user_id


@router.get("/", response_model=list[VehicleResponse])
async def list_vehicles(
    registered_by_user_id: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Lista vehículos con paginación server-side. Admins ven todos; operadores ven los suyos."""
    query = select(Vehicle).options(selectinload(Vehicle.owner)).order_by(Vehicle.created_at.desc())
    if registered_by_user_id:
        query = query.where(Vehicle.registered_by_user_id == registered_by_user_id)
    if current_user.role not in [AuthRoleEnum.ADMIN, AuthRoleEnum.DISPOSITIVO]:
        query = query.where(Vehicle.registered_by_user_id == str(current_user.id))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/by-plate/{plate}", response_model=VehicleResponse)
async def get_vehicle_by_plate(plate: str, db: AsyncSession = Depends(get_db), current_user: AuthUser = Depends(get_current_user)):
    plate = plate.upper().strip()
    result = await db.execute(
        select(Vehicle)
        .options(selectinload(Vehicle.owner))
        .where(Vehicle.license_plate == plate)
    )
    vehicle = result.scalars().first()

    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehiculo no registrado en la facultad.",
        )
    return vehicle


@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle_detail(vehicle_id: str, db: AsyncSession = Depends(get_db), current_user: AuthUser = Depends(get_current_user)):
    vehicle = await get_vehicle_with_owner(vehicle_id, db)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehiculo no encontrado.",
        )
    # SEC-008: Operadores solo pueden ver sus propios vehículos
    if current_user.role not in [AuthRoleEnum.ADMIN, AuthRoleEnum.DISPOSITIVO]:
        if str(vehicle.registered_by_user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para ver los detalles de este vehículo.",
            )
    return vehicle


@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(vehicle_in: VehicleCreate, db: AsyncSession = Depends(get_db), current_user: AuthUser = Depends(require_admin)):
    owner = await resolve_owner(vehicle_in, db)

    if not owner.is_active or owner.status == RecordStatusEnum.INACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden registrar vehiculos a nombre de una persona inactiva.",
        )

    new_vehicle = Vehicle(owner_id=owner.id)
    apply_vehicle_changes(new_vehicle, vehicle_in)
    db.add(new_vehicle)

    try:
        await db.commit()
        await db.refresh(new_vehicle)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta placa ya se encuentra registrada en el sistema.",
        )

    return await get_vehicle_with_owner(new_vehicle.id, db)


@router.post("/with-photo", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle_with_photo(
    vehicle_data: str = Form(...),
    photo: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    try:
        payload = json.loads(vehicle_data)
        vehicle_in = VehicleCreate(**payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datos del vehiculo invalidos: {exc}",
        ) from exc

    # Si es OPERADOR, forzar que el owner_code sea el suyo propio
    if current_user.role != AuthRoleEnum.ADMIN:
        person = current_user.university_person
        if not person:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta no tiene un perfil universitario vinculado. Contacta al administrador.",
            )
        # Validar que el código sea el suyo
        if vehicle_in.owner and vehicle_in.owner.code.strip() != person.code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo puedes registrar vehículos a tu propio nombre.",
            )
        vehicle_in.registered_by_user_id = str(current_user.id)
    else:
        # Admin puede registrar a nombre de cualquiera
        if not vehicle_in.registered_by_user_id:
            vehicle_in.registered_by_user_id = str(current_user.id)

    vehicle_in.vehicle_photo_path = await save_vehicle_photo(photo)

    # Crear el vehículo directamente (sin pasar por la ruta HTTP)
    owner = await resolve_owner(vehicle_in, db)
    if not owner.is_active or owner.status == RecordStatusEnum.INACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden registrar vehiculos a nombre de una persona inactiva.",
        )
    new_vehicle = Vehicle(owner_id=owner.id)
    apply_vehicle_changes(new_vehicle, vehicle_in)
    db.add(new_vehicle)
    try:
        await db.commit()
        await db.refresh(new_vehicle)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta placa ya se encuentra registrada en el sistema.",
        )
    return await get_vehicle_with_owner(new_vehicle.id, db)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    vehicle_in: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    vehicle = await get_vehicle_with_owner(vehicle_id, db)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehiculo no encontrado.",
        )

    owner = await resolve_owner(vehicle_in, db)
    if not owner.is_active or owner.status == RecordStatusEnum.INACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden registrar vehiculos a nombre de una persona inactiva.",
        )

    vehicle.owner_id = owner.id
    apply_vehicle_changes(vehicle, vehicle_in)

    try:
        await db.commit()
        await db.refresh(vehicle)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar el vehiculo.",
        )

    return await get_vehicle_with_owner(vehicle.id, db)


@router.put("/{vehicle_id}/with-photo", response_model=VehicleResponse)
async def update_vehicle_with_photo(
    vehicle_id: str,
    vehicle_data: str = Form(...),
    photo: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    try:
        payload = json.loads(vehicle_data)
        vehicle_in = VehicleCreate(**payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datos del vehiculo invalidos: {exc}",
        ) from exc

    if photo:
        vehicle_in.vehicle_photo_path = await save_vehicle_photo(photo)

    return await update_vehicle(vehicle_id, vehicle_in, db)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(vehicle_id: str, db: AsyncSession = Depends(get_db), current_user: AuthUser = Depends(require_admin)):
    vehicle = await get_vehicle_with_owner(vehicle_id, db)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehiculo no encontrado.",
        )

    await db.delete(vehicle)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
