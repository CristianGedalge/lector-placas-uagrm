# HEARTBEAT

## Estado vigente - 2026-07-30

- **Foco**: Preparación y automatización del despliegue en producción.
- **Validado**: 82/82 pruebas unitarias/integración OK, smoke test HTTP OK, build Vite OK.
- **Completado en esta sesión**:
  - Cambiado localmente a la rama `main` y sincronizado con `origin/main` (22 commits nuevos).
  - Actualizadas las dependencias locales en el entorno virtual (`fast-alpr`, `fast-plate-ocr`, etc.).
  - app/main.py: implementada la ejecución automática de migraciones de Alembic y bootstrap del administrador inicial (cargado de variables de entorno) y catálogo de marcas por defecto al iniciar en `lifespan`.
  - netlify.toml: creado en la raíz para habilitar redirecciones de React Router y build automático en Netlify.
  - backend/Dockerfile: se corrigió el home del usuario `app` a `--home /app` para evitar fallos de permisos al crear cachés de modelos durante la compilación en Railway.
- **ACCIÓN REQUERIDA**: Desplegar la aplicación; ahora realiza migraciones y puesta a punto de forma automática y transparente en el arranque.

## Convenciones vigentes

- La cuenta `DISPOSITIVO` y el registro fisico `Dispositivo` se asocian por coincidencia exacta de nombre mientras no exista una FK explicita.
- No guardar contrasenas, secretos, URLs RTSP, imagenes privadas ni URLs firmadas en esta memoria.
- No hacer push o merge salvo solicitud explicita.
