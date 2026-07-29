"""Punto de entrada principal de la aplicacion FastAPI."""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RUNTIME_DIR = PROJECT_ROOT / ".runtime"
EASYOCR_DIR = RUNTIME_DIR / "easyocr"
MPLCONFIG_DIR = RUNTIME_DIR / "matplotlib"
UPLOADS_DIR = PROJECT_ROOT / "uploads"

for directory in (RUNTIME_DIR, EASYOCR_DIR, MPLCONFIG_DIR, UPLOADS_DIR):
    directory.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(MPLCONFIG_DIR))

try:
    import easyocr
except ImportError:  # pragma: no cover - depends on the installed environment
    easyocr = None

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import plates
from app.api.v1.auth import router as auth_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.vehicles import router as vehicles_router
from app.api.v1.access_logs import router as access_logs_router
from app.api.v1.devices import router as devices_router
from app.api.v1.media import router as media_router
from app.api.v1.barrier import router as barrier_router
from app.api.v1.registration_requests import router as registration_requests_router
from app.config.settings import settings
from app.db.session import database_target

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _ocr_languages() -> list[str]:
    languages = [item.strip() for item in settings.OCR_LANGUAGES.split(",") if item.strip()]
    return languages or ["es", "en"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa EasyOCR una vez y libera la referencia al apagar."""
    target = database_target()
    logger.info(
        "Base configurada: provider=%s host=%s database=%s",
        target["provider"],
        target["host"],
        target["database"],
    )
    if easyocr is None:
        logger.warning("EasyOCR no esta instalado; el pipeline OCR estara deshabilitado.")
        app.state.ocr_reader = None
    else:
        try:
            app.state.ocr_reader = easyocr.Reader(
                _ocr_languages(),
                gpu=settings.OCR_GPU,
                quantize=settings.OCR_QUANTIZE,
                verbose=False,
                model_storage_directory=str(EASYOCR_DIR),
                user_network_directory=str(EASYOCR_DIR),
            )
        except Exception as exc:
            logger.warning("EasyOCR no pudo inicializarse durante el arranque: %s", exc)
            app.state.ocr_reader = None
    yield
    if hasattr(app.state, "ocr_reader"):
        del app.state.ocr_reader


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "API para localizar y leer placas bolivianas localmente con "
        "OpenCV, EasyOCR y Supervision."
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
