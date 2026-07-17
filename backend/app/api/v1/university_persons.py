from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.db.models import UniversityPerson, AuthUser
from app.db.session import get_db
from app.schemas.person import PersonResponse, PersonCreate
from app.api.v1.auth import get_current_user, require_admin

router = APIRouter()


@router.get("/", response_model=list[PersonResponse])
async def list_university_persons(
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Retorna la lista completa de personas universitarias. Reservado a administradores."""
    result = await db.execute(select(UniversityPerson).order_by(UniversityPerson.full_name))
    return list(result.scalars().all())


@router.post("/", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_university_person(
    person_in: PersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Crea un nuevo registro de persona universitaria. Reservado a administradores."""
    # Verificar si el código ya existe
    existing = await db.execute(select(UniversityPerson).where(UniversityPerson.code == person_in.code.strip()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una persona con ese codigo universitario."
        )

    person = UniversityPerson(
        code=person_in.code.strip(),
        role=person_in.role,
        full_name=person_in.full_name.strip(),
        document_id=person_in.document_id.strip() if person_in.document_id else None,
        faculty=person_in.faculty.strip() if person_in.faculty else None,
        contact_info=person_in.contact_info.strip() if person_in.contact_info else None,
        status=person_in.status,
        is_active=person_in.is_active
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


@router.put("/{person_id}", response_model=PersonResponse)
async def update_university_person(
    person_id: UUID,
    person_in: PersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Actualiza una persona universitaria existente. Reservado a administradores."""
    result = await db.execute(select(UniversityPerson).where(UniversityPerson.id == person_id))
    person = result.scalars().first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada.")

    # Verificar que el código editado no colisione con otro
    if person.code != person_in.code.strip():
        existing = await db.execute(select(UniversityPerson).where(
            UniversityPerson.code == person_in.code.strip(),
            UniversityPerson.id != person_id
        ))
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra persona registrada con ese codigo."
            )

    person.code = person_in.code.strip()
    person.role = person_in.role
    person.full_name = person_in.full_name.strip()
    person.document_id = person_in.document_id.strip() if person_in.document_id else None
    person.faculty = person_in.faculty.strip() if person_in.faculty else None
    person.contact_info = person_in.contact_info.strip() if person_in.contact_info else None
    person.status = person_in.status
    person.is_active = person_in.is_active

    await db.commit()
    await db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_university_person(
    person_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Elimina una persona de la base de datos. Reservado a administradores."""
    result = await db.execute(select(UniversityPerson).where(UniversityPerson.id == person_id))
    person = result.scalars().first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada.")

    await db.delete(person)
    await db.commit()
    return


@router.get("/validate/{code}", response_model=PersonResponse)
async def validate_university_code(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Valida si un código universitario existe y está activo.
    (SPEC-004)
    """
    result = await db.execute(select(UniversityPerson).where(UniversityPerson.code == code))
    person = result.scalars().first()
    
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Código universitario no encontrado en la base de datos."
        )
        
    if not person.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La persona asociada a este código se encuentra inactiva."
        )
        
    return person
