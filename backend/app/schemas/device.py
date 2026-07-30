from datetime import datetime
from ipaddress import ip_address
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validated_webhook_url(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    normalized = value.strip()
    parsed = urlsplit(normalized)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        raise ValueError("El webhook debe ser una URL HTTP(S) sin credenciales ni fragmento.")
    try:
        address = ip_address(parsed.hostname)
    except ValueError:
        address = None
    if address and (
        address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    ):
        raise ValueError("El webhook apunta a una direccion de red no permitida.")
    return normalized


class TipoDispositivoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)

class TipoDispositivoCreate(TipoDispositivoBase):
    pass

class TipoDispositivoResponse(TipoDispositivoBase):
    id: UUID
    creado_el: datetime

    model_config = ConfigDict(from_attributes=True)


class DispositivoBase(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    ubicacion: str = Field(min_length=1, max_length=200)
    tipo_dispositivo_id: UUID
    esta_activo: bool | None = True
    webhook_url: str | None = Field(default=None, max_length=2048)

    @field_validator("webhook_url")
    @classmethod
    def validate_webhook_url(cls, value: str | None) -> str | None:
        return _validated_webhook_url(value)

class DispositivoCreate(DispositivoBase):
    pass

class DispositivoUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    ubicacion: str | None = Field(None, min_length=1, max_length=200)
    tipo_dispositivo_id: UUID | None = None
    esta_activo: bool | None = None
    webhook_url: str | None = Field(default=None, max_length=2048)

    @field_validator("webhook_url")
    @classmethod
    def validate_webhook_url(cls, value: str | None) -> str | None:
        return _validated_webhook_url(value)

class DispositivoResponse(DispositivoBase):
    id: UUID
    creado_el: datetime
    actualizado_el: datetime
    tipo: TipoDispositivoResponse | None = None

    model_config = ConfigDict(from_attributes=True)
