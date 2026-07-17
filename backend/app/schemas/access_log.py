from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.db.models import AccessDirectionEnum
from app.schemas.vehicle import VehicleResponse


class AccessLogBase(BaseModel):
    vehicle_id: UUID
    direction: AccessDirectionEnum
    zone: str
    plate_scan_id: UUID | None = None
    notes: str | None = None


class AccessLogCreate(AccessLogBase):
    pass


class AccessLogAutoCreate(BaseModel):
    vehicle_id: UUID
    zone: str
    plate_scan_id: UUID | None = None
    notes: str | None = None


class AccessLogResponse(AccessLogBase):
    id: UUID
    operator_id: UUID
    timestamp: datetime
    vehicle: VehicleResponse | None = None

    model_config = ConfigDict(from_attributes=True)
