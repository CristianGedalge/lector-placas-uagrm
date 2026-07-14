# MEMORY

## 2026-07-14 - Reestructura de rutas

- Se simplifico la estructura para acceso directo por raiz: `backend/` y `frontend/`.
- El backend se movio completo a `backend/`.
- El repositorio Git anidado del backend se neutralizo sin borrarlo, renombrando `.git` a `backend/.git-legacy-backend`.
- Los scripts `.agents/scripts/verify-project.ps1` y `.agents/scripts/smoke-local.ps1` ahora resuelven rutas bajo `backend/` y `frontend/`.
- El frontend fue recuperado desde `groverchv/-analisis-y-registro-de-Placa-Frontend` y colocado directamente en `frontend/`.
- Su historial se preservo como `frontend/.git-legacy-frontend`; la raiz se reinicializo como el repositorio conjunto.
- `npm ci` instalo 91 paquetes y reporto 2 vulnerabilidades pendientes de revision (1 moderada y 1 alta), sin aplicar `npm audit fix --force`.
- Validacion posterior: `verify-project.ps1` completo correctamente, incluido el build Vite de produccion.
- Smoke posterior: backend respondio `health=degraded`, `detector=False`, `ocr=True`, expuso 12 rutas OpenAPI y libero el puerto 8010.
- Preparacion del nuevo repositorio: se excluyeron las particiones locales del dataset, que suman aproximadamente 1.67 GB; `data.yaml`, scripts y codigo permanecen versionados.

## 2026-07-14 - Ejecucion local documentada

- `LOCAL-001`: el smoke test de Supervision intentaba escribir el cache de Matplotlib en el perfil global y emitia `Permission denied`.
- Causa: el harness importaba Supervision sin preparar `MPLCONFIGDIR` y `YOLO_CONFIG_DIR`.
- Solucion: `.agents/scripts/verify-project.ps1` crea directorios bajo `.runtime` y exporta ambas variables antes de cualquier import de vision.
- Validacion requerida: ejecutar el harness estricto con el Python de `.venv` sin warnings de permisos.
- `LOCAL-002`: el primer arranque manual produjo PIDs y conteo OpenAPI ambiguos, aunque el puerto si quedo liberado.
- Solucion: se agrego `.agents/scripts/smoke-local.ps1` con puerto aislado, logs unicos, health/OpenAPI, cierre en `finally` y comprobacion final del puerto.
- `LOCAL-003`: PostgreSQL 17 esta activo en localhost:5432, pero rechazo tanto la clave de `.env` como la documentada en `.env.example`; no se cambiaron credenciales ni esquema. Queda bloqueado por configuracion externa.
- `LOCAL-004`: `/api/v1/plates/health` devolvia `ok` sin `best.pt` ni API key real. Se corrigio el reconocimiento de placeholders y health ahora informa `degraded`, detector local/cloud y OCR sin exponer secretos.
- `LOCAL-005`: importar directamente el pipeline o scripts ML intentaba usar el cache Matplotlib global. Se configuran `MPLCONFIGDIR` y `YOLO_CONFIG_DIR` bajo `.runtime` antes de importar librerias de vision.

## 2026-07-14 - Compatibilidad Supervision y automatizacion

- Se reviso el tag estable `0.29.1` de `roboflow/supervision` y su `pyproject.toml` oficial.
- Se fijo una matriz reproducible con Inference SDK 1.2.6, NumPy menor a 2.4 y OpenCV 4.10.0.84.
- Se confirmo que el pipeline usa APIs disponibles: `from_ultralytics`, `from_inference`, `crop_image`, `BoxAnnotator` y `LabelAnnotator`.
- Se agrego `.agents/scripts/verify-project.ps1` para compilar Python, comprobar APIs/versiones, inventariar dataset/modelos y construir el frontend sin red, BD ni entrenamiento.
- Se corrigio memoria obsoleta: el dataset contiene train/valid/test/data.yaml y existe `yolov8n.pt`; sigue faltando un `best.pt` entrenado.

## 2026-07-14

- Objetivo: auditar completamente el repositorio y corregir lo necesario para alinearlo con la correccion tecnica del lector de placas.
- Archivos modificados:
  - `.agents/AGENTS.md`
  - `.agents/memory/SOUL.md`
  - `.agents/memory/HEARTBEAT.md`
  - `.agents/memory/MEMORY.md`
  - `.agents/steering/backlog.md`
  - `.gitignore`
  - `backend/.gitignore`
  - `backend/.env.example`
  - `backend/app/ai/pipeline.py`
  - `backend/app/ai/validators.py`
  - `backend/app/api/v1/plates.py`
  - `backend/app/config/settings.py`
  - `backend/app/schemas/vehicle.py`
  - `backend/ml/scripts/train.py`
  - `backend/ml/scripts/validate.py`
- Decisiones tecnicas:
  - mantener Roboflow Cloud como backend activo por ausencia de `best.pt`;
  - preparar la pipeline para migracion automatica a YOLO local cuando exista el modelo;
  - endurecer validacion de placas en el backend;
  - evitar cargar trabajo sincrono pesado directamente en el event loop.
- Comandos ejecutados:
  - inspeccion recursiva con `rg --files`
  - busqueda de referencias IA con `rg -n`
  - lectura de archivos clave con `Get-Content`
  - conteo del dataset con Python
- Pruebas realizadas:
  - `compileall` sobre `backend` -> `True`
  - importacion de `app.main` -> `ok`
  - `python backend/ml/scripts/train.py` -> fallo esperado: `ultralytics no esta instalado`
  - `python backend/ml/scripts/validate.py` -> fallo esperado: `ultralytics no esta instalado`
  - conteo dataset `train/images=1693`, `train/labels=1693`, sin `valid`, `test` ni `data.yaml`
  - busqueda de modelos `.pt` -> `0` archivos encontrados
- Errores pendientes:
  - dataset incompleto para entrenamiento YOLO
  - falta validar inferencia real local por ausencia de modelo
  - dependencias de IA no instaladas en este entorno de ejecucion para correr entrenamiento/ocr real
