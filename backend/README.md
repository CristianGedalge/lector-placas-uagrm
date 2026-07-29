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

PostgreSQL es una dependencia externa. `DATABASE_URL` es la unica fuente de
conexion usada por FastAPI, SQLAlchemy, scripts y Alembic. Copia `.env.example`
a `.env` y elige la URL correspondiente:

- Backend en el host y PostgreSQL instalado: `localhost` y su puerto local.
- Backend en Docker y PostgreSQL instalado en el host: `host.docker.internal`
  en Docker Desktop.
- Otra instancia PostgreSQL: el host y puerto publicados por el proveedor.
- Neon: el host entregado por Neon y `?sslmode=require`.

Compose no contiene PostgreSQL, no presupone un host de base de datos y no
sobrescribe `DATABASE_URL`: el contenedor backend recibe `backend/.env`
mediante `env_file`. Cambiar de base requiere editar solamente ese archivo.

## Comandos principales

Migraciones:

```powershell
cd backend
set PYTHONPATH=.
alembic upgrade head
```

Prueba segura de conexion (`SELECT 1`; en Neon tambien exige SSL activo):

```powershell
cd backend
python -m scripts.check_database
```

## Multimedia academica

Cloudinary es opcional y se configura exclusivamente en `backend/.env`.
Consulta `docs/cloudinary-integration.md`. Sin credenciales la API principal y
las pruebas unitarias funcionan, pero las operaciones multimedia responden con
un error de configuracion sanitizado.

Pruebas:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -t . -v
$env:RUN_CLOUDINARY_TESTS="1"
.\.venv\Scripts\python.exe -m unittest tests.test_cloudinary_integration -v
```

Retencion:

```powershell
.\.venv\Scripts\python.exe scripts\cleanup_expired_media.py --dry-run
```

Servidor:

```powershell
cd backend
python run.py
```

## Verificacion desde la raiz del repo

```powershell
powershell -ExecutionPolicy Bypass -File .agents/scripts/verify-project.ps1 -Python backend/.venv/Scripts/python.exe
powershell -ExecutionPolicy Bypass -File .agents/scripts/smoke-local.ps1
```

## Estado conocido

- El backend arranca en local.
- FastALPR detecta la placa y FastPlateOCR reconoce el recorte con ONNX local.
- FastALPR + FastPlateOCR es el unico motor de reconocimiento.
- El health reporta la disponibilidad del motor ONNX.
- Una ROI opcional reduce falsos positivos en camaras fijas.
- La validacion completa con base de datos sigue bloqueada hasta disponer de una `DATABASE_URL` valida.

## Captura automatica de camara

La webcam USB y RTSP se ejecutan mediante un agente local separado. Consulta [CAMERA_CAPTURE.md](CAMERA_CAPTURE.md) para arquitectura, OCR, ROI, configuracion, pruebas y limitaciones.
