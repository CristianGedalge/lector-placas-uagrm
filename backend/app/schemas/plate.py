from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.db.models import ScanStatusEnum

class PlateAnalysisResponse(BaseModel):
    status: str  # DETECTED | LOW_CONFIDENCE | ERROR
    detected_plate: Optional[str] = None
    normalized_plate: Optional[str] = None
    is_valid_bolivian_format: bool = False
    detection_backend: Optional[str] = None
    detection_confidence: Optional[float] = None
    ocr_confidence: Optional[float] = None
    combined_confidence: Optional[float] = None
    requires_manual_review: bool = False
    annotated_image: Optional[str] = None  # Base64
    plate_crop: Optional[str] = None       # Base64
    message: Optional[str] = None
    plate_bbox: Optional[list[float]] = None
    raw_bboxes: Optional[list[list[float]]] = None


class PlateScanResponse(BaseModel):
    id: UUID
    image_path: Optional[str] = None
    detected_plate: Optional[str] = None
    normalized_plate: Optional[str] = None
    confidence: Optional[float] = None
    scan_status: ScanStatusEnum
    manual_correction: Optional[str] = None
    vehicle_id: Optional[UUID] = None
    scanned_by_user_id: Optional[UUID] = None
    observations: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
