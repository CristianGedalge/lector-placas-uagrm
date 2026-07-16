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
from app.api.v1.university_persons import router as university_persons_router
from app.api.v1.vehicles import router as vehicles_router
from app.config.settings import settings

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _ocr_languages() -> list[str]:
    languages = [item.strip() for item in settings.OCR_LANGUAGES.split(",") if item.strip()]
    return languages or ["es", "en"]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa EasyOCR una vez y libera la referencia al apagar."""
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(plates.router, prefix="/api/v1/plates", tags=["Placas"])
app.include_router(vehicles_router, prefix="/api/v1/vehicles", tags=["Vehicles"])
app.include_router(
    university_persons_router,
    prefix="/api/v1/university-persons",
    tags=["University Persons"],
)
