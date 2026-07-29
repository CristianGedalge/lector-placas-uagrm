"""
POR-001: Centralización de rutas del sistema de archivos.
Todas las rutas de directorios de runtime, uploads y caché deben
importarse desde aquí en lugar de calcularse de forma dispersa.
"""
from __future__ import annotations

from pathlib import Path

# Raíz del proyecto: lector-placas-uagrm/backend/
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]

# Directorio de runtime (nunca rastrear en git)
RUNTIME_DIR: Path = PROJECT_ROOT / ".runtime"


# Directorio de caché de Matplotlib (evita escrituras en HOME)
MPLCONFIG_DIR: Path = RUNTIME_DIR / "matplotlib"

# Directorio de uploads de imágenes de placas y vehículos
UPLOADS_DIR: Path = PROJECT_ROOT / "uploads"

# Asegurarse de que existan al importar este módulo
for _dir in (RUNTIME_DIR, MPLCONFIG_DIR, UPLOADS_DIR):
    _dir.mkdir(parents=True, exist_ok=True)
