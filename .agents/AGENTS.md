# AGENTS - Lector de Placas UAGRM

## Identidad del proyecto

Backend y base de coordinacion del proyecto "Lector de Placas UAGRM". El objetivo del sistema es analizar una imagen de un vehiculo, detectar y leer una placa, consultar si ya existe en PostgreSQL y, solo si no existe, habilitar un registro manual condicionado a un codigo universitario valido.

## Stack real actual

- Backend: FastAPI
- Base de datos: PostgreSQL + SQLAlchemy + Alembic
- IA actual: OpenCV + EasyOCR + Supervision, completamente local
- Captura automatica: agente separado para webcam USB o RTSP
- Frontend separado: React 18 + JavaScript/JSX + CSS, construido con Vite

## Arquitectura real

- `backend/app/api/v1/`: endpoints HTTP
- `backend/app/ai/`: pipeline IA y validadores
- `backend/app/db/`: modelos y sesion
- `backend/app/config/`: settings
- `backend/app/services/`: servicios locales separados, incluido el agente de camara USB/RTSP
- `frontend/`: aplicacion React/Vite del cliente web
- `.agents/`: memoria operativa del proyecto

## Reglas de negocio obligatorias

1. Nunca registrar automaticamente una placa solo porque el OCR detecto texto.
2. Si la placa ya existe, devolver vehiculo y persona asociada.
3. Si la placa no existe, pedir codigo universitario antes de permitir registro.
4. El codigo debe pertenecer a una persona valida y activa.
5. Una placa nueva debe pasar validacion de formato en backend.
6. Detecciones u OCR de baja confianza requieren revision manual.

## Flujo obligatorio antes de programar

Antes de tocar codigo, cualquier agente debe leer en este orden:

1. `.agents/AGENTS.md`
2. `.agents/memory/SOUL.md`
3. `.agents/memory/HEARTBEAT.md`
4. `.agents/steering/backlog.md`

Despues de cambios en Python, dependencias o pipeline IA, ejecutar desde la raiz:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/scripts/verify-project.ps1
```

El comando es local y determinista: no usa servicios cloud ni modifica la base de datos.

Para probar el arranque HTTP en un puerto aislado y cerrarlo automaticamente:

```powershell
powershell -ExecutionPolicy Bypass -File .agents/scripts/smoke-local.ps1
```

## Protocolo de memoria

Al cerrar una sesion:

1. actualizar `.agents/memory/HEARTBEAT.md`;
2. registrar decisiones y validaciones en `.agents/memory/MEMORY.md`;
3. actualizar estados en `.agents/steering/backlog.md`.

## Reglas de IA

- EasyOCR es responsable de localizar y leer texto.
- Supervision representa, filtra, recorta y anota los resultados de EasyOCR; no es un motor OCR.
- El pipeline no usa detectores, entrenamiento, datasets ni servicios cloud.
- Preferir una ROI configurada para camaras fijas y reducir falsos positivos.
- Preferir rutas portables con `pathlib.Path`.
- Mantener la matriz documentada en `.agents/compatibility/supervision.md`.
- No ampliar versiones de Supervision, EasyOCR, NumPy u OpenCV sin ejecutar el verificador.
- La captura automatica debe ejecutarse fuera del proceso FastAPI y reutilizar `POST /api/v1/plates/analyze`.
- No usar `cv2.imshow()` ni registrar URLs RTSP, porque pueden contener credenciales.

## Prohibiciones

- No subir secretos al repositorio.
- No guardar imagenes privadas, capturas de camara ni credenciales RTSP en el repositorio.
- No marcar una funcionalidad como terminada si no se verifico.
- No introducir rutas absolutas de Windows en codigo de aplicacion.
