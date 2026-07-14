# Lector de Placas UAGRM

Repositorio con acceso directo por raiz.

## Estructura

- `backend`: API FastAPI, migraciones, pipeline IA y dataset local.
- `frontend`: cliente React/Vite.
- `.agents`: automatizacion operativa, memoria y scripts de verificacion.

## Estado actual

- El backend ya vive en `backend/`.
- El frontend React/Vite fue restaurado desde su repositorio original y vive en `frontend/`.
- Los historiales heredados se preservaron como `backend/.git-legacy-backend` y `frontend/.git-legacy-frontend` para evitar repositorios anidados.
- Los scripts `.agents/scripts/verify-project.ps1` y `.agents/scripts/smoke-local.ps1` ya apuntan al layout directo.
- La raiz tiene un repositorio Git nuevo para versionar backend y frontend juntos.
- Las particiones locales del dataset (`train/`, `valid/` y `test/`) no se suben a Git por su tamano; se conserva `data.yaml` y la automatizacion necesaria para reconstruirlas.

## Comandos utiles

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Verificacion local:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/scripts/verify-project.ps1 -Python backend/.venv/Scripts/python.exe
powershell -ExecutionPolicy Bypass -File .agents/scripts/smoke-local.ps1
```
