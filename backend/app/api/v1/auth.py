from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config.settings import settings
from app.core.security import ALGORITHM, create_access_token, hash_password, verify_password
from app.db.models import AuthRoleEnum, AuthUser, RecordStatusEnum, RoleEnum, UniversityPerson, RevokedToken
from app.db.session import get_db
from app.schemas.auth import (
    AuthResponse,
    AuthUserResponse,
    UserLoginRequest,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserAdminUpdateRequest,
)

router = APIRouter()
from app.core.limiter import limiter

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)


def normalize_selected_role(raw_role: str) -> tuple[AuthRoleEnum, RoleEnum, str]:
    role = (raw_role or "").strip().upper()
    role_map = {
        "ADMIN": (AuthRoleEnum.OPERATOR, RoleEnum.ADMIN, "ADMINISTRATIVO"),
        "ADMINISTRATIVE": (AuthRoleEnum.OPERATOR, RoleEnum.ADMIN, "ADMINISTRATIVO"),
        "ADMINISTRATIVO": (AuthRoleEnum.OPERATOR, RoleEnum.ADMIN, "ADMINISTRATIVO"),
        "OPERATOR": (AuthRoleEnum.OPERATOR, RoleEnum.STUDENT, "ESTUDIANTE"),
        "STUDENT": (AuthRoleEnum.OPERATOR, RoleEnum.STUDENT, "ESTUDIANTE"),
        "ESTUDIANTE": (AuthRoleEnum.OPERATOR, RoleEnum.STUDENT, "ESTUDIANTE"),
        "TEACHER": (AuthRoleEnum.OPERATOR, RoleEnum.TEACHER, "DOCENTE"),
        "DOCENTE": (AuthRoleEnum.OPERATOR, RoleEnum.TEACHER, "DOCENTE"),
    }
    if role not in role_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rol invalido. Usa Administrativo, Estudiante o Docente.",
        )
    return role_map[role]


def normalize_faculty(role: RoleEnum, faculty: str | None) -> str | None:
    if role != RoleEnum.STUDENT:
        return None
    value = (faculty or "").strip()
    return value or None


def get_catalog_role_label(role: AuthRoleEnum) -> str:
    role_map = {
        AuthRoleEnum.ADMIN: "ADMINISTRATIVO",
        AuthRoleEnum.OPERATOR: "ESTUDIANTE",
    }
    return role_map.get(role, role.value)


def get_person_role_label(person: UniversityPerson | None, auth_role: AuthRoleEnum) -> str:
    if person and person.role == RoleEnum.TEACHER:
        return "DOCENTE"
    if person and person.role == RoleEnum.ADMIN:
        return "ADMINISTRATIVO"
    if person and person.role == RoleEnum.STUDENT:
        return "ESTUDIANTE"
    return get_catalog_role_label(auth_role)


def build_user_response(user: AuthUser) -> AuthUserResponse:
    person = user.university_person
    phone = user.phone or (person.contact_info if person else None)
    return AuthUserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=phone,
        role=user.role,
        catalog_role=get_person_role_label(person, user.role),
        status=user.status,
        is_active=user.is_active,
        university_person_id=user.university_person_id,
        code=person.code if person else None,
        document_id=person.document_id if person else None,
        faculty=person.faculty if person else None,
        contact_info=phone,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> AuthUser:
    cookie_token = request.cookies.get("session_token")
    active_token = cookie_token or token

    if not active_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Verificar si el token está revocado
    revoked_result = await db.execute(select(RevokedToken).where(RevokedToken.token == active_token))
    if revoked_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión expirada o revocada.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(active_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido.",
        )
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido.",
        )

    result = await db.execute(select(AuthUser).where(AuthUser.id == user_uuid))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no disponible.",
        )
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> AuthUser | None:
    cookie_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    active_token = cookie_token or token

    if not active_token:
        return None

    try:
        payload = jwt.decode(active_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user_uuid = UUID(user_id)
        result = await db.execute(select(AuthUser).where(AuthUser.id == user_uuid))
        user = result.scalars().first()
        if user and user.is_active:
            return user
    except Exception:
        return None
    return None


async def require_admin(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if current_user.role != AuthRoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Se requiere rol administrativo.")
    return current_user


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    token = request.cookies.get("session_token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        revoked = RevokedToken(token=token)
        db.add(revoked)
        try:
            await db.commit()
        except Exception:
            pass  # Ya estaba revocado o error menor de DB

    response.delete_cookie("session_token", samesite="lax", path="/")
    return {"message": "Sesión cerrada correctamente."}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(
    request: Request,
    user_in: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser | None = Depends(get_current_user_optional)
):
    result = await db.execute(
        select(AuthUser).where(AuthUser.email == user_in.email.lower().strip())
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo completar el registro. Verifica los datos ingresados.",
        )

    # Forzar is_admin=False si la petición de registro no viene de un Administrador autenticado
    is_requester_admin = current_user is not None and current_user.role == AuthRoleEnum.ADMIN
    is_admin_flag = user_in.is_admin if is_requester_admin else False

    auth_role, person_role, _ = normalize_selected_role(user_in.role)
    if is_admin_flag:
        auth_role = AuthRoleEnum.ADMIN
        
    faculty_value = normalize_faculty(person_role, user_in.faculty)
    phone_value = (user_in.phone or user_in.contact_info).strip()

    owner_result = await db.execute(
        select(UniversityPerson).where(UniversityPerson.code == user_in.code.strip())
    )
    university_person = owner_result.scalars().first()

    if university_person:
        university_person.full_name = user_in.full_name.strip()
        university_person.role = person_role
        university_person.faculty = faculty_value
        university_person.contact_info = phone_value
        university_person.is_active = True
        university_person.status = RecordStatusEnum.ACTIVE
    else:
        university_person = UniversityPerson(
            code=user_in.code.strip(),
            role=person_role,
            full_name=user_in.full_name.strip(),
            faculty=faculty_value,
            contact_info=phone_value,
            status=RecordStatusEnum.ACTIVE,
            is_active=True,
        )
        db.add(university_person)
        await db.flush()

    user = AuthUser(
        full_name=user_in.full_name.strip(),
        email=user_in.email.lower().strip(),
        phone=phone_value,
        password_hash=hash_password(user_in.password),
        role=auth_role,
        status=RecordStatusEnum.ACTIVE,
        is_active=True,
        university_person_id=university_person.id,
    )
    db.add(user)

    try:
        await db.commit()
        await db.refresh(user)
        await db.refresh(university_person)
        user.university_person = university_person
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo completar el registro.",
        )

    return AuthResponse(
        token=create_access_token(str(user.id)),
        user=build_user_response(user),
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
async def login_user(
    request: Request,
    credentials: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuthUser).where(AuthUser.email == credentials.email.lower().strip())
    )
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario se encuentra inactivo.",
        )

    if user.university_person_id:
        person_result = await db.execute(
            select(UniversityPerson).where(UniversityPerson.id == user.university_person_id)
        )
        user.university_person = person_result.scalars().first()

    access_token = create_access_token(subject=str(user.id))
    
    response = AuthResponse(
        token=access_token,
        user=build_user_response(user),
    )
    
    from fastapi.responses import JSONResponse
    json_response = JSONResponse(content=response.model_dump(mode="json"))
    json_response.set_cookie(
        key="session_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    
    return json_response


@router.get("/me", response_model=AuthUserResponse)
async def get_my_profile(current_user: AuthUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.university_person_id:
        person_result = await db.execute(
            select(UniversityPerson).where(UniversityPerson.id == current_user.university_person_id)
        )
        current_user.university_person = person_result.scalars().first()

    return build_user_response(current_user)


@router.put("/me", response_model=AuthUserResponse)
async def update_my_profile(
    profile_in: UserProfileUpdateRequest,
    current_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing_user_result = await db.execute(
        select(AuthUser).where(
            AuthUser.email == profile_in.email.lower().strip(),
            AuthUser.id != current_user.id,
        )
    )
    if existing_user_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ese correo ya esta siendo usado por otra cuenta.",
        )

    existing_person_result = await db.execute(
        select(UniversityPerson).where(
            UniversityPerson.code == profile_in.code.strip(),
            UniversityPerson.id != current_user.university_person_id,
        )
    )
    if existing_person_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ese registro ya pertenece a otra persona.",
        )

    auth_role, person_role, _ = normalize_selected_role(profile_in.role)
    faculty_value = normalize_faculty(person_role, profile_in.faculty)
    phone_value = (profile_in.phone or profile_in.contact_info).strip()

    # Nota: No actualizamos auth_role aquí para evitar escalamiento de privilegios por los propios usuarios.
    # Un usuario no debería poder cambiarse a ADMIN a sí mismo.
    current_user.full_name = profile_in.full_name.strip()
    current_user.email = profile_in.email.lower().strip()
    current_user.phone = phone_value
    
    if profile_in.password:
        current_user.password_hash = hash_password(profile_in.password)

    person = None
    if current_user.university_person_id:
        person_result = await db.execute(
            select(UniversityPerson).where(UniversityPerson.id == current_user.university_person_id)
        )
        person = person_result.scalars().first()

    if not person:
        person = UniversityPerson(
            code=profile_in.code.strip(),
            role=person_role,
            full_name=profile_in.full_name.strip(),
            faculty=faculty_value,
            contact_info=phone_value,
            status=RecordStatusEnum.ACTIVE,
            is_active=True,
        )
        db.add(person)
        await db.flush()
        current_user.university_person_id = person.id
    else:
        person.code = profile_in.code.strip()
        person.role = person_role
        person.full_name = profile_in.full_name.strip()
        person.faculty = faculty_value
        person.contact_info = phone_value
        person.is_active = True
        person.status = RecordStatusEnum.ACTIVE

    try:
        await db.commit()
        await db.refresh(current_user)
        await db.refresh(person)
        current_user.university_person = person
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo actualizar el perfil.",
        )

    return build_user_response(current_user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_profile(
    current_user: AuthUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.is_active = False
    current_user.status = RecordStatusEnum.INACTIVE

    if current_user.university_person_id:
        person_result = await db.execute(
            select(UniversityPerson).where(UniversityPerson.id == current_user.university_person_id)
        )
        person = person_result.scalars().first()
        if person:
            person.is_active = False
            person.status = RecordStatusEnum.INACTIVE

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users", response_model=list[AuthUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Retorna la lista completa de usuarios de acceso. Reservado a administradores."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(AuthUser).options(selectinload(AuthUser.university_person)).order_by(AuthUser.full_name)
    )
    users = result.scalars().all()
    return [build_user_response(user) for user in users]


@router.put("/users/{user_id}", response_model=AuthUserResponse)
async def update_user_by_admin(
    user_id: UUID,
    user_in: UserAdminUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Actualiza rol y estado de un usuario. Reservado a administradores."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(AuthUser).where(AuthUser.id == user_id).options(selectinload(AuthUser.university_person))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    # No permitir desactivarse a uno mismo
    if user.id == current_user.id and (not user_in.is_active or user_in.status == RecordStatusEnum.INACTIVE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivar tu propio usuario administrador.",
        )

    user.role = user_in.role
    user.is_active = user_in.is_active
    user.status = user_in.status

    await db.commit()
    await db.refresh(user)
    return build_user_response(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_by_admin(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(require_admin),
):
    """Elimina permanentemente un usuario de acceso. Reservado a administradores."""
    result = await db.execute(select(AuthUser).where(AuthUser.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propio usuario administrador.",
        )

    await db.delete(user)
    await db.commit()
    return

