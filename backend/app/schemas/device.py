from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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
    webhook_url: str | None = None  # URL del actuador de barrera o simulador

class DispositivoCreate(DispositivoBase):
    pass

class DispositivoUpdate(BaseModel):
    nombre: str | None = Field(None, min_length=1, max_length=100)
    ubicacion: str | None = Field(None, min_length=1, max_length=200)
    tipo_dispositivo_id: UUID | None = None
    esta_activo: bool | None = None
    webhook_url: str | None = None  # Permite actualizar o limpiar el webhook

class DispositivoResponse(DispositivoBase):
    id: UUID
    creado_el: datetime
    actualizado_el: datetime
    tipo: TipoDispositivoResponse | None = None

    model_config = ConfigDict(from_attributes=True)
