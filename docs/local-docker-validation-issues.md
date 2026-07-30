# Validación local y Docker

Última validación integral: 2026-07-25

Este documento registra los hallazgos como issues reproducibles. No contiene
credenciales, cadenas de conexión ni valores secretos.

## Resumen de validación

| Área | Resultado |
| --- | --- |
| Backend nativo | APROBADO |
| Frontend nativo y proxy hacia FastAPI | APROBADO |
| Suite unitaria backend | APROBADO: 44 pruebas, 2 omitidas por ser integraciones opt-in |
| Integración con Neon | APROBADO: conexión TLS, `SELECT 1`, Alembic en `head` y flujo autenticado |
| Build frontend | APROBADO |
| Integración real con Cloudinary | APROBADO: WebP autenticado, URL temporal y eliminación |
| Docker Compose | APROBADO |

## ISSUE-001 — El contexto Docker podía incluir secretos y archivos locales

- Estado: RESUELTO
- Severidad: crítica
- Componente: Docker / seguridad

### Problema

Los contextos de build no tenían `.dockerignore`. El backend podía enviar
`backend/.env` al daemon e incorporarlo accidentalmente a una capa con
`COPY . .`. También se enviaban `.venv`, cachés de pruebas, runtime y otros
artefactos locales. En esta máquina, una caché con permisos restringidos
además hacía fallar el build.

### Corrección

Se agregaron `backend/.dockerignore` y `frontend/.dockerignore`. Ambos excluyen
archivos `.env`; conservan solamente `.env.example`. También excluyen
dependencias, cachés, builds y artefactos locales.

### Criterio de aceptación

- `backend/.env` y `frontend/.env` no forman parte del contexto.
- `.env.example` sí puede versionarse.
- El contexto no intenta leer `.pytest_cache` ni copiar `.venv`.

## ISSUE-002 — La imagen backend instalaba dos distribuciones de OpenCV

- Estado: RESUELTO
- Severidad: alta
- Componente: dependencias / Docker

### Problema

`requirements.txt` instalaba simultáneamente `opencv-python` y
`opencv-python-headless`. En un servidor esto duplica artefactos y puede causar
conflictos porque ambos paquetes proporcionan el módulo `cv2`.

### Corrección

Se dejó `opencv-python-headless==4.10.0.84` como dependencia directa y se
retiró `libgl1` del Dockerfile. Como `supervision` vuelve a instalar
transitivamente la distribución gráfica, el Dockerfile la desinstala al final
y reinstala la variante headless para restaurar correctamente los archivos
compartidos del módulo `cv2`.

### Criterio de aceptación

La suite OCR y procesamiento de imágenes pasa usando la variante headless. El
contenedor debe importar `cv2` sin requerir `libxcb.so.1`.

## ISSUE-004 — Contenedor PostgreSQL huérfano contradecía la arquitectura actual

- Estado: RESUELTO
- Severidad: media
- Componente: Docker Compose / base de datos

### Problema

Existía un contenedor antiguo llamado `alpr_postgres`, aunque el Compose actual
ya trata PostgreSQL como dependencia externa y no declara un servicio `db`.

### Corrección

Se eliminó únicamente el contenedor huérfano. Su volumen de datos no fue
eliminado. El Compose actual:

- entrega `backend/.env` mediante `env_file`;
- no sobrescribe `DATABASE_URL`;
- no declara ni hace obligatorio un servicio PostgreSQL;
- permite usar Neon, PostgreSQL local u otra instancia cambiando solo `.env`.

## ISSUE-005 — Docker Desktop no podía operar porque `C:` estaba lleno

- Estado: RESUELTO EN EL ENTORNO
- Severidad: bloqueante
- Componente: host Windows / Docker Desktop

### Evidencia

- Capacidad de `C:`: 237,44 GB.
- Espacio libre de `C:`: 0 GB.
- Espacio libre de `D:`: 50,57 GB.
- Disco virtual de Docker:
  `C:\Users\Usuario\AppData\Local\Docker\wsl\disk\docker_data.vhdx`
  (aproximadamente 32,5 GiB).
- Docker falla durante exportación/desempaquetado con EOF y su log registra
  `There is not enough space on the disk`.

### Impacto original

Docker Desktop y containerd se cierran durante `docker compose up -d --build`.
Por tanto, no es posible certificar honestamente el arranque final de Compose
hasta liberar espacio o mover el almacenamiento de Docker a una unidad con
espacio.

### Resolución

El usuario liberó espacio en `C:`. Antes del build se comprobaron 38,39 GB
libres. Docker Desktop inició con su almacenamiento vacío y no fue necesario
eliminar volúmenes o datos adicionales.

### Validación aprobada

Ejecutar:

```powershell
docker compose up -d --build
docker compose ps
Invoke-RestMethod http://localhost:8000/api/v1/plates/health
Invoke-WebRequest http://localhost:5173
docker compose down
```

Los dos contenedores quedaron activos. El health devolvió `status=ok` con OCR
disponible; frontend, OpenAPI y proxy respondieron HTTP 200; el endpoint
protegido sin token respondió el HTTP 401 esperado.

## ISSUE-006 — `CLOUDINARY_CLOUD_NAME` no identificaba una cuenta válida

- Estado: RESUELTO
- Severidad: alta para funciones de medios; no bloquea OCR ni base de datos
- Componente: Cloudinary

### Problema

La prueba real llegó al proveedor, pero Cloudinary respondió
`Invalid cloud_name Root`. No se expusieron el API key ni el API secret.

### Resolución

El usuario reemplazó el valor por el **Cloud name** real del panel de
Cloudinary. Las credenciales continúan solamente en `backend/.env` y no se
expusieron en logs ni documentación.

### Validación aprobada

```powershell
$env:RUN_CLOUDINARY_INTEGRATION='1'
.\.venv\Scripts\python.exe -m unittest tests.test_cloudinary_integration -v
```

La prueba subió un WebP autenticado, obtuvo una URL temporal, comprobó la
existencia, eliminó el recurso y confirmó que dejó de existir. También fue
ejecutada correctamente desde el contenedor backend.

## ISSUE-007 — Validación nativa del proyecto

- Estado: RESUELTO / APROBADO
- Severidad: informativa
- Componente: aplicación completa

### Evidencia ejecutada

- FastAPI inició en `127.0.0.1:8000`.
- `GET /api/v1/plates/health`: `status=ok`, OCR disponible.
- `GET /openapi.json`: HTTP 200.
- `GET /api/auth/me` sin token: HTTP 401 esperado.
- Vite inició en `127.0.0.1:5173`: HTTP 200.
- El proxy de Vite hacia `/api/v1/plates/health` respondió correctamente.
- `npm run build`: 99 módulos transformados, build correcto.
- Backend: 44 pruebas ejecutadas correctamente; las dos pruebas externas son
  opt-in.
- Neon: prueba externa aprobada con TLS, `SELECT 1`, revisión de Alembic en
  `head` y flujo autenticado.

### Advertencia no bloqueante

PyTorch emite una advertencia de deprecación interna relacionada con
`torch.ao.quantization`; proviene de la dependencia OCR y no causa fallos.

## ISSUE-008 — El frontend no tenía lockfile reproducible

- Estado: RESUELTO
- Severidad: alta
- Componente: frontend / cadena de suministro

### Problema

El repositorio no tenía `package-lock.json`. Cada `npm install` podía resolver
versiones distintas y `npm audit` fallaba con `ENOLOCK`.

### Corrección

Se generó y versionó `package-lock.json`. El Dockerfile usa `npm ci`, de modo
que las instalaciones respetan exactamente el lockfile.

### Validación

El build Vite termina correctamente con 99 módulos transformados.

## ISSUE-009 — Avisos de seguridad contradictorios en React Router

- Estado: RIESGO RESIDUAL DOCUMENTADO
- Severidad: moderada
- Componente: frontend

### Problema

`npm audit` reporta dos avisos moderados para React Router 6. La actualización
a React Router 7.18 elimina esos avisos, pero el registro actual marca esa
línea con dos vulnerabilidades RSC de severidad alta y propone volver a una
versión anterior. No existe en este momento una versión propuesta por npm que
deje ambos conjuntos en cero.

### Mitigación

Se conserva React Router 6.30.4 en el lockfile. La aplicación no usa
hidratación SSR/RSC y sus destinos de navegación son rutas internas
controladas. Se corrigió además el aviso XSS de alta severidad actualizando
`@remix-run/router` a 1.23.3.

### Seguimiento

Revisar nuevamente `npm audit` cuando React Router publique una versión que
cierre los avisos sin introducir la alerta RSC. No usar destinos de navegación
construidos directamente desde entradas no confiables.

## ISSUE-010 — Cloudinary trataba un recurso eliminado como error del proveedor

- Estado: RESUELTO
- Severidad: alta
- Componente: almacenamiento Cloudinary

### Problema

Después de eliminar correctamente una imagen, el SDK responde con
`cloudinary.exceptions.NotFound` al consultar el recurso. `exists()` solo
revisaba un atributo `http_code` genérico y transformaba el resultado esperado
en `StorageError`.

### Corrección

`CloudinaryStorage.exists()` captura explícitamente `NotFound` y devuelve
`False`. Otros errores del proveedor siguen convirtiéndose en un error
neutral, sin filtrar credenciales o detalles internos.

### Cobertura y validación

- Se agregó una prueba unitaria para la excepción real del SDK.
- La suite aumentó a 44 pruebas y todas aprobaron.
- La integración real aprobó localmente y dentro de Docker.
- El recurso temporal usado por cada prueba fue eliminado.

## Resultado final de 2026-07-25

- FastAPI local y Docker: aprobado.
- Vite local y Docker: aprobado.
- Proxy frontend/backend: aprobado.
- OCR y OpenCV headless: aprobado.
- Neon con TLS, `SELECT 1` y Alembic `head`: aprobado.
- Cloudinary autenticado: aprobado.
- HTTP: health 200, OpenAPI 200, frontend 200 y endpoint protegido 401 sin token.
- Logs de arranque: sin errores.
- Riesgo residual conocido: dos avisos moderados de React Router descritos en
  ISSUE-009.

## ISSUE-011 — La foto de perfil se enviaba como JSON en lugar de multipart

- Estado: RESUELTO
- Severidad: alta
- Componente: frontend / carga de archivos

### Síntoma

`POST /api/v1/media/users/{user_id}/photo` respondía HTTP 422 aunque
`GET /api/auth/me` respondía HTTP 200. La autenticación era correcta; FastAPI
rechazaba el cuerpo antes de procesar la imagen.

### Causa

La instancia compartida de Axios fijaba globalmente
`Content-Type: application/json`. Las cargas usan `FormData` y necesitan que
el navegador/Axios genere automáticamente `multipart/form-data` junto con su
boundary.

### Corrección

Se eliminó la cabecera global. Axios sigue asignando JSON automáticamente a
los objetos normales y ahora asigna multipart correctamente a `FormData`.
Esto corrige las fotos de usuario, fotos de vehículo y evidencias de acceso.

El perfil también normaliza el arreglo `detail` de FastAPI para mostrar un
mensaje legible si una validación futura falla.

## ISSUE-012 — El pool reutilizaba conexiones Neon cerradas

- Estado: RESUELTO
- Severidad: alta
- Componente: SQLAlchemy / Neon

### Síntoma

Después de reiniciar Docker, un login podía responder HTTP 500 con
`SSL connection has been closed unexpectedly` si SQLAlchemy reutilizaba una
conexión que Neon ya había cerrado.

### Corrección

El engine usa `pool_pre_ping=True` para comprobar la conexión antes de
entregarla y `pool_recycle=300` para renovar conexiones periódicamente. La
configuración sigue siendo compatible con PostgreSQL estándar y continúa
leyendo exclusivamente `DATABASE_URL`.
