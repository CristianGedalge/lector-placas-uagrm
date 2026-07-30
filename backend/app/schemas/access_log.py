from datetime import datetime
from uuid import UUID

from app.db.models import MediaStatusEnum, TipoAccesoEnum
from pydantic import BaseModel, ConfigDict, model_validator


class AccesoCreate(BaseModel):
    tipo_acceso: TipoAccesoEnum
    ubicacion: str
    escaneado_id: UUID


class AccesoAutoCreate(BaseModel):
    vehicle_id: UUID
    zone: str | None = None
    notes: str | None = ""
    direction: str | None = None  # "ENTRY" | "EXIT" — si se omite, el backend lo infiere


class AccesoResponse(BaseModel):
    id: UUID
    tipo_acceso: TipoAccesoEnum
    ubicacion: str
    escaneado_id: UUID
    operador_usuario_id: UUID | None = None
    creado_el: datetime
    
    # Campos adicionales requeridos por el frontend React
    direction: str
    zone: str
    timestamp: datetime
    vehicle: dict | None = None
    image_id: UUID | None = None
    image_status: MediaStatusEnum | None = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def map_fields(cls, data):
        # Si es un objeto de modelo SQLAlchemy o similar
        if hasattr(data, "tipo_acceso"):
            direction_val = "ENTRY" if data.tipo_acceso == TipoAccesoEnum.ENTRADA or data.tipo_acceso == "ENTRADA" else "EXIT"
            vehicle_dict = None
            
            # Intentar extraer vehículo si el escaneo está cargado
            if hasattr(data, "escaneado") and data.escaneado and hasattr(data.escaneado, "vehiculo") and data.escaneado.vehiculo:
                veh = data.escaneado.vehiculo
                vehicle_dict = {
                    "id": veh.id,
                    "placa": veh.placa,
                    "license_plate": veh.placa, # Compatibilidad
                    "color": veh.color,
                    "marca_id": veh.marca_id,
                    "tipo_vehiculo_id": veh.tipo_vehiculo_id,
                    "propietario_usuario_id": veh.propietario_usuario_id,
                    "esta_activo": veh.esta_activo,
                    "creado_el": veh.creado_el,
                    "actualizado_el": veh.actualizado_el,
                    "marca": veh.marca.nombre if (hasattr(veh, "marca") and veh.marca) else None,
                    "model": veh.model if hasattr(veh, "model") else "", # modelo
                    "brand": veh.marca.nombre if (hasattr(veh, "marca") and veh.marca) else "",
                    "owner": {
                        "id": veh.propietario.id,
                        "full_name": f"{veh.propietario.nombre} {veh.propietario.apellido_paterno}".strip(),
                    } if (hasattr(veh, "propietario") and veh.propietario) else None
                }

            from datetime import timezone
            creado_el_utc = data.creado_el.replace(tzinfo=timezone.utc) if data.creado_el and data.creado_el.tzinfo is None else data.creado_el

            return {
                "id": data.id,
                "tipo_acceso": data.tipo_acceso,
                "ubicacion": data.ubicacion,
                "escaneado_id": data.escaneado_id,
                "operador_usuario_id": data.operador_usuario_id,
                "creado_el": creado_el_utc,
                "direction": direction_val,
                "zone": data.ubicacion,
                "timestamp": creado_el_utc,
                "vehicle": vehicle_dict,
                "image_id": data.imagen_id,
                "image_status": data.imagen.estado if getattr(data, "imagen", None) else None,
            }
        return data
