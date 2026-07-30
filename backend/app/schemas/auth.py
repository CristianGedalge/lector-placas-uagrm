import re
from datetime import datetime
from uuid import UUID

from app.db.models import RoleEnum
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UsuarioRegisterRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    apellido_paterno: str = Field(min_length=2, max_length=120)
    apellido_materno: str | None = Field(default=None, max_length=120)
    carnet: str = Field(min_length=5, max_length=50)
    # SEC-011: Mínimo 8 caracteres, 1 mayúscula, 1 número
    contrasena: str = Field(min_length=8, max_length=128)
    rol: RoleEnum = Field(default=RoleEnum.USUARIO)

    @field_validator("contrasena")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número.")
        return v


class UsuarioLoginRequest(BaseModel):
    carnet: str
    contrasena: str = Field(min_length=6, max_length=128)


class UsuarioResponse(BaseModel):
    id: UUID
    nombre: str
    apellido_paterno: str
    apellido_materno: str | None = None
    carnet: str
    rol: RoleEnum
    esta_activo: bool
    foto_id: UUID | None = None
    creado_el: datetime
    actualizado_el: datetime

    model_config = ConfigDict(from_attributes=True)


class UsuarioProfileUpdateRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    apellido_paterno: str = Field(min_length=2, max_length=120)
    apellido_materno: str | None = Field(default=None, max_length=120)
    carnet: str = Field(min_length=5, max_length=50)
    contrasena: str | None = Field(default=None, min_length=8, max_length=128)


class UsuarioAdminUpdateRequest(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    apellido_paterno: str = Field(min_length=2, max_length=120)
    apellido_materno: str | None = Field(default=None, max_length=120)
    carnet: str = Field(min_length=5, max_length=50)
    rol: RoleEnum
    esta_activo: bool


class AuthResponse(BaseModel):
    token: str
    user: UsuarioResponse
