# Issues de ejecucion local - 2026-07-14

## Estado de arquitectura - 2026-07-29

- EasyOCR y PyTorch fueron retirados del runtime.
- El pipeline vigente es `FAST_ALPR_FAST_PLATE_OCR` sobre ONNX Runtime.
- Supervision conserva recortes/anotaciones; RF-DETR Nano obtiene la caja del
  vehiculo y CLIP ONNX respalda la sugerencia de color.
- Las incidencias historicas que mencionan EasyOCR se conservan como trazabilidad
  y no describen el runtime vigente.

## LOCAL-001 - Cache global de Matplotlib no escribible

- Estado: resuelto.
- Evidencia: `Permission denied` sobre `C:\Users\Usuario\.matplotlib` durante el harness.
- Solucion: runtime local preparado antes del smoke de Supervision.
- Validacion: harness estricto sin warning de permisos.

## LOCAL-002 - Smoke HTTP no reproducible

- Estado: resuelto.
- Evidencia: PIDs y conteo OpenAPI ambiguos en el primer comando manual.
- Solucion: `.agents/scripts/smoke-local.ps1` administra puerto, logs y cierre en `finally`.
- Validacion: health consultado, 12 rutas OpenAPI y puerto 8010 liberado.

## LOCAL-003 - Credenciales PostgreSQL rechazadas

- Estado: bloqueado por configuracion externa.
- Evidencia: el 2026-07-16, `python -m alembic current` volvio a recibir `password authentication failed` de PostgreSQL en localhost:5432 para el usuario `postgres`.
- Intentos seguros: claves documentadas en `.env` y `.env.example`; ambas rechazadas.
- Accion requerida: definir una `DATABASE_URL` valida. No se alteraron usuarios, contrasenas ni esquema.

## LOCAL-004 - Health ALPR daba un falso positivo

- Estado: resuelto.
- Evidencia historica: health dependia de detectores que ya no forman parte del proyecto.
- Solucion vigente: health comprueba exclusivamente EasyOCR y Supervision esenciales.
- Validacion esperada: `pipeline_mode=OCR_SUPERVISION` y estado `ok` cuando EasyOCR inicia.

## LOCAL-005 - Imports IA usan caches fuera del proyecto

- Estado: resuelto.
- Evidencia: import directo de `app.ai.pipeline` intentaba escribir el cache global.
- Solucion vigente: solo Matplotlib usa cache aislado bajo `.runtime`; los caches de entrenamiento fueron eliminados.
- Validacion: import directo y harness sin errores de cache.

## HARNESS-003 - Python relativo falla despues de cambiar de directorio

- Estado: resuelto.
- Evidencia: el verificador entraba en `backend/` y dejaba de resolver `backend/.venv/Scripts/python.exe`.
- Solucion: convertir el interprete recibido a ruta absoluta antes de ejecutar las etapas.
- Validacion: harness completo con 8 pruebas y build frontend correctos.

## CAM-004 - Captura fisica no disponible en el entorno automatizado

- Estado: bloqueado por hardware externo.
- Evidencia: no se conecto una webcam USB ni se proporciono una URL RTSP real.
- Cobertura disponible: OpenCV/JPEG, fuente RTSP, reconexion, reintentos, deduplicacion y liberacion probados con mocks.
- Accion requerida: ejecutar el agente con una camara real, ROI calibrada y placas controladas.

## OCR-001 - Anotadores por clase incompatibles con EasyOCR

- Estado: resuelto.
- Evidencia: `Detections.from_easyocr` no define `class_id` y los anotadores fallaban al resolver color por clase.
- Solucion: construir `BoxAnnotator` y `LabelAnnotator` con `ColorLookup.INDEX`.
- Validacion: imagen anotada y recorte cubiertos por pruebas unitarias.

## RUN-001 - npm bloqueado por la politica de PowerShell

- Estado: resuelto.
- Evidencia: `npm audit` intentaba ejecutar `npm.ps1` y PowerShell lo rechazo por su execution policy.
- Causa: resolucion del comando hacia el wrapper PowerShell.
- Solucion: usar `npm.cmd`, igual que el harness del proyecto.
- Validacion: audit y build ejecutados mediante `npm.cmd`.

## RUN-002 - Warnings de PyTorch durante OCR en CPU

- Estado: resuelto en la aplicacion.
- Evidencia: advertencias por cuantizacion obsoleta y `pin_memory` sin acelerador durante OCR sintetico.
- Solucion: `OCR_QUANTIZE=false` por defecto y filtro limitado al warning conocido de `pin_memory` alrededor de `readtext`.
- Validacion: OCR sintetico ejecutado tratando los `UserWarning` como errores; detecto `1234ABC` con confianza aproximada de 0.93 sin warnings propagados.

## SEC-002 - Dependencias vulnerables del frontend

- Estado: resuelto.
- Evidencia: `npm audit` encontro 1 vulnerabilidad moderada en esbuild y 1 alta en Vite.
- Solucion: actualizar Vite a 8.1.5 y `@vitejs/plugin-react` a 6.0.3, compatibles con Node 22.17.0.
- Validacion: `npm audit` sin vulnerabilidades, build y servidor Vite local correctos.
