from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

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
    esta_activo: Optional[bool] = True

class DispositivoCreate(DispositivoBase):
    pass

class DispositivoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    ubicacion: Optional[str] = Field(None, min_length=1, max_length=200)
    tipo_dispositivo_id: Optional[UUID] = None
    esta_activo: Optional[bool] = None

class DispositivoResponse(DispositivoBase):
    id: UUID
    creado_el: datetime
    actualizado_el: datetime
    tipo: Optional[TipoDispositivoResponse] = None

    model_config = ConfigDict(from_attributes=True)
