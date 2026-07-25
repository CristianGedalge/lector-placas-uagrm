from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models import MediaStatusEnum, MediaTypeEnum


class MediaStatusResponse(BaseModel):
    id: UUID
    type: MediaTypeEnum
    status: MediaStatusEnum


class MediaUrlResponse(BaseModel):
    url: str
    expires_at: datetime


class AccessCreationResponse(BaseModel):
    access_registered: bool = True
    image_status: MediaStatusEnum | None = None
    access: dict
