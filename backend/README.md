# Lector de Placas UAGRM - Backend

Servicio FastAPI del monorepo.

## Ubicacion

Trabaja desde `backend`.

## Requisitos

- Python 3.10 o superior
- PostgreSQL accesible mediante `DATABASE_URL`

## Instalacion local

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Variables de entorno

Usa `.env.example` como referencia minima. No se deben subir secretos reales.

## Comandos principales

Migraciones:

```powershell
cd backend
set PYTHONPATH=.
alembic upgrade head
```

Servidor:

```powershell
cd backend
uvicorn app.main:app --reload
```

## Verificacion desde la raiz del repo

```powershell
powershell -ExecutionPolicy Bypass -File .agents/scripts/verify-project.ps1 -Python backend/.venv/Scripts/python.exe
powershell -ExecutionPolicy Bypass -File .agents/scripts/smoke-local.ps1
```

## Estado conocido

- El backend arranca en local.
- El health ALPR reporta `degraded` cuando falta detector real.
- Para inferencia local entrenada sigue faltando `ml/models/best.pt`.
- La validacion completa con base de datos sigue bloqueada hasta disponer de una `DATABASE_URL` valida.
