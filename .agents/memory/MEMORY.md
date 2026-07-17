# MEMORY

## 2026-07-17 - Control de Accesos (Ingreso y Salida de Vehículos)

- **Persistencia en PostgreSQL**: Creada la tabla `access_logs` mapeando registros de ingresos (`ENTRY`) y salidas (`EXIT`) vinculados a vehículos y operadores en campus, incluyendo marcas de tiempo y zonas/porterías de control. Aplicadas las migraciones exitosamente con Alembic.
- **Filtrado por Rol**: El endpoint `GET /access-logs` filtra automáticamente según el rol del usuario actual. Los Operadores únicamente tienen visibilidad de los logs de accesos relacionados con vehículos que ellos mismos registraron (`Vehicle.registered_by_user_id == current_user.id`), mientras que los Administradores auditan el histórico global de la universidad.
- **Acceso Rápido desde la Cámara**: Se modificó la pantalla de escaneo (`UploadPlate.jsx`) para que los operadores puedan registrar entradas y salidas rápidas directamente desde el modal del vehículo encontrado tras la lectura exitosa del OCR.
- **Página de Bitácora de Accesos**: Creado el componente frontend `AccessLogs.jsx` que permite consultar la bitácora con marcas de tiempo, porterías, datos de vehículos y propietarios, además de registrar ingresos/salidas de forma manual.

## 2026-07-17 - Dashboard KPI Enriquecido y Flujo de Operador/Administrador Consolidado

- **Filtros de Propiedad por Rol**: Implementados filtros condicionales en "Mis Vehículos" y "Mi Historial" en `Vehicles.jsx` y `History.jsx` respectivamente. Para Operadores, el sistema fuerza la vista de su propia bitácora (`s.scanned_by_user_id === user.id`) e inhabilita las pestañas de selección de filtro que solo corresponden al Administrador.
- **Consolidación de Creación de Usuarios**: Integrado el formulario de registro de nuevos operadores/administradores directamente dentro de un modal en la vista de administración "Gestionar Usuarios". Esto permitió inhabilitar la ruta `/registro` y remover el enlace redundante "Registrar Operador" del menú lateral (`Sidebar/index.jsx`).
- **Dashboard Telemetría de 6 KPIs y Feed en vivo**: Modificado el endpoint `/api/v1/dashboard/summary` y rediseñada la vista principal `Dashboard.jsx`. Ahora provee un resumen rico y completo que contiene:
  1. Total Vehículos Registrados
  2. Vehículos Activos para ingreso
  3. Lecturas hoy (24 horas)
  4. Escaneos Históricos
  5. Confianza Promedio del motor OCR
  6. Operadores UAGRM del sistema
  Adicionalmente se despliega una bitácora en vivo con los últimos 5 escaneos reales persistidos en la base de datos (con su hora, placas, porcentaje de confianza, estado y validación en la BD).

## 2026-07-17 - Panel de Gestión Completa del Administrador (Fase 5)

- **Gestión de Usuarios (auth_users)**: Añadidos endpoints backend (`GET /users`, `PUT /users/{user_id}`, `DELETE /users/{user_id}`) e interfaz frontend (`Users.jsx`) que permite al Administrador promover o degradar permisos del sistema (ADMIN / OPERATOR), activar/desactivar cuentas y eliminarlas permanentemente.
- **Gestión de Personas SIARP (university_persons)**: Añadido soporte CRUD completo en backend y frontend (`UniversityPersons.jsx`) para que el Administrador registre, edite y elimine de forma directa códigos universitarios autorizados, asociando nombres completos, CI y tipos de personas (Administrativo, Docente, Estudiante).
- **Bitácora de Escaneos (plate_scans)**: Conectado el endpoint `/analyze` para que registre automáticamente cada detección de placa con formato válido o de baja confianza en la tabla `plate_scans`. Implementado el endpoint `GET /scans` y la interfaz de auditoría real en `History.jsx` para visualizar el historial cronológico de todas las porterías.
- **Segregación de Roles**: Modificado el `Sidebar` y la protección de rutas (`AdminRoute`) para que las secciones de gestión (`Registrar Operador`, `Gestionar Usuarios`, `Gestionar Personas`, `Historial`, `Reportes`) solo sean renderizadas y accedidas por cuentas autorizadas de Administradores, manteniendo para los Operadores un flujo limpio limitado al escáner y su perfil.


- **Fase 1 (Limpieza de Secretos)**: Se configuró una `SECRET_KEY` segura generada de 64 bytes. Se parametrizó la clave de Postgres en `docker-compose.yml` (`${POSTGRES_PASSWORD}`) y se inhabilitó `DEBUG=true` para ocultar trazas de stack de los errores 500.
- **Fase 2 (Control de Acceso y Límites)**: Se implementó la librería `slowapi` limitando `/login` (10/min), `/register` (5/min) y `/analyze` (60/min). Se restringió severamente la carga de imágenes limitando a 5MB y formatos JPEG/PNG/WebP explícitos.
- **Fase 3 (Sesiones y Cookies JWT)**: Se mitigó la inyección de XSS eliminando el JWT de `localStorage` y transitando hacia una cookie `HttpOnly` y `SameSite=lax`. Se ocultó el directorio estático de uploads, pasando a servir imágenes autenticadas mediante `/api/v1/vehicles/photos/{filename}`.
- **Fase 3 (Lista de Revocación JWT)**: Se integró un esquema de revocación estricto. Al llamar `/logout`, el token se añade a la tabla `revoked_tokens` bloqueando inmediatamente la sesión aunque no haya expirado de forma natural.
- **Fase 4 (Parches Críticos)**: Se descubrió y reparó una vulnerabilidad de **Mass Assignment** (Escalamiento de Privilegios) donde un usuario podía enviarse `role: "ADMIN"` en `/register` o `/me`.
- **Fase 4 (Cierre de Registro Público)**: Dado que el rol de Guardia/Operador expone las listas globales de estudiantes y vehículos para permitir comparativas cruzadas con la cámara, se protegió `/register` con `require_admin`. Esto cancela el registro público, evitando la Fuga de Datos (IDOR).
- **Fase 4 (LFI Mitigado)**: Se corrigió una vulnerabilidad de Path Traversal grave asegurando el UUID generado de fotos solicitadas con `os.path.basename` para bloquear secuencias `../../../`.


## 2026-07-17 - Mejoras UI y Seguimiento en Vivo de Placas

- **Validación Posicional OCR**: Se añadió `Q -> D` al diccionario del corrector en `validators.py` para arreglar falsos positivos donde la letra D en placas bolivianas es confundida con Q.
- **Preprocesamiento OCR**: Se añadieron parámetros `mag_ratio=1.5`, `adjust_contrast=0.5` a EasyOCR y una variante morfológica extra (`morph_erode`) para engrosar trazos y mejorar la lectura.
- **Bug UI de React**: Se solucionó un bug en `UploadPlate.jsx` (pantalla negra) asegurando mediante `useEffect` que la cámara reciba el stream cuando el modal ya esté montado.
- **Rastreo de Placa (Polling)**: Tras analizar la inviabilidad de detectores reales de placa en navegador (como YOLO o TFJS, que solo detecta autos), se implementó un bucle que envía una imagen al backend cada 1.5s.
- **Recuadro de Precisión**: Se modificó `pipeline.py` para devolver el `plate_bbox` y `UploadPlate.jsx` ahora dibuja el recuadro dinámico morado persiguiendo a la placa con base en el OCR real.

## 2026-07-17 - Dockerizacion y dinamizacion de variables

- **Dockerización completa**: Creado `frontend/Dockerfile` sobre Node 20 y `docker-compose.yml` en la raíz que orquesta Postgres 17 (DB `Placas`), Backend y Frontend de forma integrada.
- **OpenGL en Docker**: Corregido fallo de compilación del backend en Docker reemplazando `libgl1-mesa-glx` (obsoleto en Debian nuevo) con `libgl1`, solucionando la dependencia gráfica de OpenCV.
- **Base de datos Postgres**: Ejecutadas y aplicadas con éxito todas las migraciones de Alembic dentro de la base de datos Postgres orquestada en Docker.
- **Variables dinámicas**: Modificado `run.py` y `settings.py` del backend para leer dinámicamente host y puerto desde las variables de entorno (`BACKEND_HOST`, `BACKEND_PORT`) vía `os.environ` (obligatorio) sin tener valores por defecto de desarrollo local hardcodeados en el código de Python.
- **Pydantic ignore extra variables**: Configurada la clase `Settings` con `extra="ignore"` para evitar fallos de validación por variables adicionales definidas en el `.env` (como configuraciones de la cámara y del host).

## 2026-07-16 - Ejecucion local posterior a migracion OCR

- Backend y frontend arrancaron en puertos aislados y liberaron recursos correctamente.
- EasyOCR real reconocio `1234ABC` en una imagen sintetica generada en memoria con confianza aproximada de 0.69; esto no sustituye una prueba fisica.
- Se desactivo la cuantizacion EasyOCR por defecto y se filtro solo el warning CPU conocido de `pin_memory`.
- `npm audit` detecto dos vulnerabilidades en Vite/esbuild; se actualizaron Vite 8.1.5 y plugin React 6.0.3, quedando el audit en cero.
- PostgreSQL sigue rechazando la credencial local; no se modificaron usuarios ni contrasenas externas.

## 2026-07-16 - Migracion a OCR local puro

- Decision vigente: se abandono la deteccion entrenada y cualquier inferencia cloud; EasyOCR localiza y lee texto, mientras Supervision representa, filtra, recorta y anota resultados.
- Se elimino `backend/ml/` completo (dataset, `data.yaml`, pesos y scripts) tras confirmar que ningun flujo vigente lo consumia.
- Se retiraron las dependencias y variables de entorno de la arquitectura anterior; el verificador falla si reaparecen paquetes obsoletos.
- El pipeline analiza imagen completa o ROI, aplica preprocesamiento moderado, combina fragmentos cercanos y puntua formato, confianza, longitud, tamano y proporcion.
- Riesgo vigente: analizar imagen completa aumenta falsos positivos; para una entrada fija se recomienda configurar ROI.
- Se conserva el agente de camara separado, que solo envia JPEG al endpoint y no duplica OCR.
- Cobertura automatizada: imagen vacia/invalida, OCR ausente/sin resultados, candidatos validos/multiples/fragmentados, baja confianza, ROI, anotacion, recorte, health, esquema, endpoint, reconexion y cooldown.
- Pendiente: validar placas y camaras fisicas, ajustar ROI/umbral y validar PostgreSQL.
- Validacion final: 23 pruebas correctas; harness completo y build Vite correctos; smoke con `health=ok`, `pipeline=OCR_SUPERVISION`, OCR/Supervision disponibles, `/analyze` en `LOW_CONFIDENCE` para imagen sintetica vacia y puerto liberado.

## 2026-07-16 - Agente local de camara

- Se confirmo que Supervision procesa detecciones pero no reemplaza al detector; el flujo sigue siendo detector local/Cloud, Supervision, recorte, EasyOCR y validacion.
- Se mantuvo la arquitectura hibrida porque Roboflow Cloud no pudo probarse sin API key y no existe `best.pt`; por ello no se eliminaron dataset, scripts ni Ultralytics.
- Se agrego `app.services.camera_capture` como proceso separado de FastAPI para webcam USB o RTSP. Envia JPEG al endpoint existente y no duplica el pipeline IA.
- El agente implementa intervalo configurable, timeout, reintentos HTTP, espera de reconexion, cooldown por placa, cierre por senal y logs que no exponen la URL RTSP.
- Se corrigio el harness para aceptar instalaciones sin particiones locales del dataset y para resolver el Python virtual antes de cambiar de directorio.
- Pruebas: 8 unit tests con frames/camaras simuladas; verificador completo correcto; build Vite correcto.
- Smoke: health `degraded`, detector no disponible, OCR disponible, 12 rutas OpenAPI, `/analyze` accesible con respuesta esperada `503/ERROR` y puerto 8010 liberado.
- Limitaciones verificadas: no hubo inferencia real por falta de detector y no se probo hardware USB/RTSP fisico.

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
