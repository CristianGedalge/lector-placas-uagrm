"""Punto de entrada principal de la aplicacion FastAPI."""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RUNTIME_DIR = PROJECT_ROOT / ".runtime"
MPLCONFIG_DIR = RUNTIME_DIR / "matplotlib"
UPLOADS_DIR = PROJECT_ROOT / "uploads"

for directory in (RUNTIME_DIR, MPLCONFIG_DIR, UPLOADS_DIR):
    directory.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPLCONFIG_DIR))

try:
    from fast_alpr import ALPR
except ImportError:  # pragma: no cover - depends on the installed environment
    ALPR = None

try:
    from open_image_models.detection.factory import create_detector
except ImportError:  # pragma: no cover
    create_detector = None

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import plates
from app.api.v1.access_logs import router as access_logs_router
from app.api.v1.auth import router as auth_router
from app.api.v1.barrier import router as barrier_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.devices import router as devices_router
from app.api.v1.media import router as media_router
from app.api.v1.registration_requests import router as registration_requests_router
from app.api.v1.vehicles import router as vehicles_router
from app.config.settings import settings
from app.db.session import database_target
from app.services.clip_color import CLIPColorClassifier

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa FastALPR/FastPlateOCR una sola vez."""
    target = database_target()
    logger.info(
        "Base configurada: provider=%s host=%s database=%s",
        target["provider"],
        target["host"],
        target["database"],
    )
    app.state.fast_alpr_engine = None
    app.state.vehicle_detector = None
    app.state.clip_color_classifier = None
    if ALPR is None:
        logger.error("FastALPR/FastPlateOCR no esta instalado.")
    else:
        try:
            providers = [settings.FAST_ALPR_EXECUTION_PROVIDER]
            app.state.fast_alpr_engine = ALPR(
                detector_model=settings.FAST_ALPR_DETECTOR_MODEL,
                detector_conf_thresh=settings.FAST_ALPR_DETECTOR_CONFIDENCE,
                detector_providers=providers,
                ocr_model=settings.FAST_PLATE_OCR_MODEL,
                ocr_device="cpu",
                ocr_providers=providers,
            )
            logger.info(
                "FastALPR listo: detector=%s ocr=%s provider=%s",
                settings.FAST_ALPR_DETECTOR_MODEL,
                settings.FAST_PLATE_OCR_MODEL,
                settings.FAST_ALPR_EXECUTION_PROVIDER,
            )
        except Exception:
            logger.exception("FastALPR/FastPlateOCR no pudo inicializarse")

    try:
        if create_detector is None:
            raise RuntimeError("open-image-models no esta instalado")
        app.state.vehicle_detector = create_detector(
            settings.VEHICLE_DETECTOR_MODEL,
            conf_thresh=settings.VEHICLE_DETECTOR_CONFIDENCE,
            providers=[settings.FAST_ALPR_EXECUTION_PROVIDER],
        )
        app.state.clip_color_classifier = CLIPColorClassifier()
        logger.info("Color vehicular listo: OpenCV + CLIP local, detector=%s", settings.VEHICLE_DETECTOR_MODEL)
    except Exception:
        logger.exception("Detector vehicular/CLIP no pudo inicializarse")

    app.state.ocr_engine_name = "fast_alpr" if app.state.fast_alpr_engine is not None else "unavailable"
    yield
    for state_name in ("fast_alpr_engine", "vehicle_detector", "clip_color_classifier", "ocr_engine_name"):
        if hasattr(app.state, state_name):
            delattr(app.state, state_name)


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "API para localizar y leer placas bolivianas localmente con "
        "FastALPR, FastPlateOCR y OpenCV."
    ),
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    # SEC-006: Solo los headers mínimos necesarios
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(plates.router, prefix="/api/v1/plates", tags=["Placas"])
app.include_router(vehicles_router, prefix="/api/v1/vehicles", tags=["Vehicles"])
app.include_router(devices_router, prefix="/api/v1/devices", tags=["Devices"])
app.include_router(media_router, prefix="/api/v1/media", tags=["Media"])
app.include_router(registration_requests_router, prefix="/api/v1/vehicle-registration-requests", tags=["Vehicle Registration Requests"])
app.include_router(
    access_logs_router,
    prefix="/api/v1/access-logs",
    tags=["Access Logs"],
)
app.include_router(barrier_router, prefix="/api/v1/barrier", tags=["Barrier Simulator"])

# SEC-010: Cabeceras de seguridad HTTP en todas las respuestas
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        response: StarletteResponse = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Permitir camara para el dispositivo movil en red local
        response.headers["Permissions-Policy"] = "camera=(*), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Reload trigger comment to refresh FastAPI cache with new AuthRoleEnum
