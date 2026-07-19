from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.plate import PlateAnalysisResponse, PlateScanResponse
from app.ai.pipeline import analyze_plate, get_pipeline_status
from app.core.limiter import limiter
from app.db.session import get_db
from app.db.models import AuthUser, PlateScan, AuthRoleEnum
from app.api.v1.auth import get_current_user, require_admin

async def get_current_user_optional(request: Request, db: AsyncSession = Depends(get_db)) -> AuthUser | None:
    try:
        return await get_current_user(request, db=db)
    except Exception:
        return None


router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png"]

@router.post("/analyze", response_model=PlateAnalysisResponse)
@limiter.limit("60/minute")
async def analyze_plate_endpoint(
    request: Request, 
    file: UploadFile = File(...), 
    realtime: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser | None = Depends(get_current_user_optional)
):
    """
    Recibe una imagen, valida tamaño/formato, y ejecuta el pipeline ALPR.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, 
            detail="Formato de archivo no permitido. Solo se aceptan imágenes JPEG y PNG."
        )
    
    # Leer el archivo a memoria
    image_bytes = await file.read()
    
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail="El archivo es demasiado grande. El límite máximo es de 5MB."
        )
    
    # REL-003: Verificar que el motor OCR esté disponible antes de procesar
    ocr_reader = getattr(request.app.state, "ocr_reader", None)
    if ocr_reader is None:
        raise HTTPException(
            status_code=503,
            detail="El motor OCR no está disponible en este momento. Intenta nuevamente en unos instantes."
        )

    # Ejecutar pipeline AI
    result_dict = await run_in_threadpool(
        analyze_plate,
        image_bytes,
        ocr_reader,
        realtime,
    )

    if result_dict.get("status") == "ERROR":
        return JSONResponse(
            status_code=int(result_dict.get("http_status", 422)),
            content=PlateAnalysisResponse(
                status="ERROR",
                message=result_dict.get("message", "Error desconocido durante el análisis."),
            ).model_dump(),
        )
    
    # Guardar en base de datos el escaneo de placa si se detectó texto
    status_val = result_dict.get("status")
    if status_val in ["DETECTED", "LOW_CONFIDENCE"]:
        from app.db.models import Vehicle, ScanStatusEnum
        normalized = result_dict.get("normalized_plate")
        
        # Buscar si el vehículo ya existe
        vehicle_id = None
        if normalized:
            v_res = await db.execute(select(Vehicle).where(Vehicle.license_plate == normalized))
            vehicle = v_res.scalars().first()
            if vehicle:
                vehicle_id = vehicle.id

        scan = PlateScan(
            detected_plate=result_dict.get("detected_plate"),
            normalized_plate=normalized,
            confidence=result_dict.get("combined_confidence") or result_dict.get("ocr_confidence") or 0.0,
            scan_status=ScanStatusEnum.DETECTED if status_val == "DETECTED" else ScanStatusEnum.LOW_CONFIDENCE,
            vehicle_id=vehicle_id,
            scanned_by_user_id=current_user.id if current_user else None
        )
        db.add(scan)
        try:
            await db.commit()
        except Exception:
            await db.rollback()

    return PlateAnalysisResponse(**result_dict)


@router.get("/scans", response_model=list[PlateScanResponse])
async def list_plate_scans(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user),
):
    """Retorna el historial de lecturas de placas. Administradores ven todo; Operadores ven lo suyo."""
    query = select(PlateScan).order_by(PlateScan.created_at.desc()).offset(skip).limit(limit)
    if current_user.role != AuthRoleEnum.ADMIN:
        query = query.where(PlateScan.scanned_by_user_id == current_user.id)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/health")
async def health_check(request: Request):
    """
    Endpoint simple para verificar que la API está funcionando.
    """
    ocr_available = getattr(request.app.state, "ocr_reader", None) is not None
    pipeline = get_pipeline_status()
    ready = bool(ocr_available and pipeline["supervision_available"])
    return {
        "status": "ok" if ready else "degraded",
        "message": (
            "API de ALPR lista para inferencia."
            if ready
            else "API disponible, pero EasyOCR no esta inicializado."
        ),
        "ocr_available": ocr_available,
        **pipeline,
    }
