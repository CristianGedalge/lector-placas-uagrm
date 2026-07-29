# Lector de Placas UAGRM

Repositorio con acceso directo por raiz.

## Estructura

- `backend`: API FastAPI, migraciones y pipeline OCR local.
- `frontend`: cliente React/Vite.
- `.agents`: automatizacion operativa, memoria y scripts de verificacion.

## Estado actual

- El backend ya vive en `backend/`.
- El frontend React/Vite fue restaurado desde su repositorio original y vive en `frontend/`.
- Los historiales heredados se preservaron como `backend/.git-legacy-backend` y `frontend/.git-legacy-frontend` para evitar repositorios anidados.
- Los scripts `.agents/scripts/verify-project.ps1` y `.agents/scripts/smoke-local.ps1` ya apuntan al layout directo.
- La raiz tiene un repositorio Git nuevo para versionar backend y frontend juntos.
- El reconocimiento usa exclusivamente FastALPR + FastPlateOCR con ONNX local.

## Comandos utiles

Backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
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
