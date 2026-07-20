import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schemas.plate import PlateAnalysisResponse, EscaneadoResponse
from app.ai.pipeline import analyze_plate, get_pipeline_status
from app.core.limiter import limiter
from app.db.session import get_db
from app.db.models import Usuario, Escaneado, RoleEnum, Vehiculo, EstadoEscaneoEnum
from app.api.v1.auth import get_current_user

async def get_current_user_optional(request: Request, db: AsyncSession = Depends(get_db)) -> Usuario | None:
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
    dispositivo_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario | None = Depends(get_current_user_optional)
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, 
            detail="Formato de archivo no permitido. Solo se aceptan imágenes JPEG y PNG."
        )
    
    image_bytes = await file.read()
    
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413, 
            detail="El archivo es demasiado grande. El límite máximo es de 5MB."
        )
    
    ocr_reader = getattr(request.app.state, "ocr_reader", None)
    if ocr_reader is None:
        raise HTTPException(
            status_code=503,
            detail="El motor OCR no está disponible en este momento."
        )

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
                estado="ERROR",
                mensaje=result_dict.get("message", "Error desconocido durante el análisis."),
            ).model_dump(),
        )
    
    status_val = result_dict.get("status")
    if status_val in ["DETECTED", "LOW_CONFIDENCE"]:
        normalized = result_dict.get("normalized_plate")
        
        vehicle_id = None
        if normalized:
            v_res = await db.execute(select(Vehiculo).where(Vehiculo.placa == normalized))
            vehicle = v_res.scalars().first()
            if vehicle:
                vehicle_id = vehicle.id

        estado_enum = EstadoEscaneoEnum.DETECTADO if status_val == "DETECTED" else EstadoEscaneoEnum.BAJA_CONFIANZA

        disp_uuid = None
        if dispositivo_id:
            try:
                disp_uuid = uuid.UUID(dispositivo_id)
            except ValueError:
                pass

        scan = Escaneado(
            placa_detectada=result_dict.get("detected_plate"),
            placa_normalizada=normalized,
            confianza=result_dict.get("combined_confidence") or result_dict.get("ocr_confidence") or 0.0,
            estado=estado_enum,
            vehiculo_id=vehicle_id,
            dispositivo_id=disp_uuid
        )
        db.add(scan)
        try:
            await db.commit()
        except Exception:
            await db.rollback()

    # Mapeo de la respuesta
    return PlateAnalysisResponse(
        estado="DETECTADO" if result_dict.get("status") == "DETECTED" else ("BAJA_CONFIANZA" if result_dict.get("status") == "LOW_CONFIDENCE" else result_dict.get("status")),
        placa_detectada=result_dict.get("detected_plate"),
        placa_normalizada=result_dict.get("normalized_plate"),
        es_formato_valido=result_dict.get("is_valid_bolivian_format", False),
        confianza=result_dict.get("combined_confidence"),
        ruta_imagen=result_dict.get("annotated_image") or result_dict.get("plate_crop"),
        mensaje=result_dict.get("message"),
        plate_bbox=result_dict.get("plate_bbox"),
        raw_bboxes=result_dict.get("raw_bboxes")
    )


@router.get("/scans", response_model=list[EscaneadoResponse])
async def list_plate_scans(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    query = select(Escaneado).order_by(Escaneado.creado_el.desc()).offset(skip).limit(limit)
    # Por ahora todos ven todo o solo admins
    if current_user.rol != RoleEnum.ADMINISTRADOR:
        # En el futuro filtrar por dispositivos que el operador gestiona
        pass
    result = await db.execute(query)
    return [EscaneadoResponse.model_validate(x) for x in result.scalars().all()]


@router.get("/health")
async def health_check(request: Request):
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
