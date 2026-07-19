import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.db.models import AuthRoleEnum, RecordStatusEnum


class UserRegisterRequest(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    # SEC-011: Mínimo 8 caracteres, 1 mayúscula, 1 número
    password: str = Field(min_length=8, max_length=128)
    code: str = Field(min_length=3, max_length=50)
    faculty: str | None = Field(default=None, max_length=255)
    contact_info: str = Field(min_length=5, max_length=255)
    phone: str | None = Field(default=None, min_length=5, max_length=255)
    role: str = Field(min_length=3, max_length=40, default="STUDENT")
    is_admin: bool = Field(default=False)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número.")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class AuthUserResponse(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    phone: str | None = None
    role: AuthRoleEnum
    catalog_role: str | None = None
    status: RecordStatusEnum
    is_active: bool
    university_person_id: UUID | None = None
    code: str | None = None
    document_id: str | None = None
    faculty: str | None = None
    contact_info: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    email: EmailStr
    code: str = Field(min_length=3, max_length=50)
    faculty: str | None = Field(default=None, max_length=255)
    contact_info: str = Field(min_length=5, max_length=255)
    phone: str | None = Field(default=None, min_length=5, max_length=255)
    role: str = Field(min_length=3, max_length=40, default="STUDENT")
    password: str | None = Field(default=None, min_length=6, max_length=128)


class UserAdminUpdateRequest(BaseModel):
    role: AuthRoleEnum
    is_active: bool
    status: RecordStatusEnum


class AuthResponse(BaseModel):
    token: str
    user: AuthUserResponse
