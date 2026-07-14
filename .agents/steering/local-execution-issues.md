# Issues de ejecucion local - 2026-07-14

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
- Evidencia: PostgreSQL 17 responde en localhost:5432 con `password authentication failed`.
- Intentos seguros: claves documentadas en `.env` y `.env.example`; ambas rechazadas.
- Accion requerida: definir una `DATABASE_URL` valida. No se alteraron usuarios, contrasenas ni esquema.

## LOCAL-004 - Health ALPR daba un falso positivo

- Estado: resuelto.
- Evidencia: health devolvia `ok` sin `best.pt` ni API key real.
- Solucion: placeholders no crean cliente Cloud; health informa detector local, Cloud y OCR.
- Validacion: `health=degraded; detector=False; ocr=True`.

## LOCAL-005 - Imports IA usan caches fuera del proyecto

- Estado: resuelto.
- Evidencia: import directo de `app.ai.pipeline` intentaba escribir el cache global.
- Solucion: pipeline, train, validate e infer configuran caches bajo `.runtime` antes de importar vision.
- Validacion: import directo y harness sin errores de cache.
