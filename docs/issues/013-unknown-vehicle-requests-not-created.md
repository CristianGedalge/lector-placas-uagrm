# Issue 013 — Solicitudes de placas desconocidas no aparecían

## Síntoma

El flujo mostraba “Acceso denegado” y la bandeja de operador/administrador no tenía solicitudes.

## Causa

Neon tenía registrada la revisión Alembic `3aa735770818`, pero esa revisión no estaba incluida en el checkout. La tabla `solicitudes_registro_vehiculo` no existía, por lo que la fase 1 no podía persistir solicitudes.

## Corrección

Se añadió un ancla Alembic no-op para la revisión ya desplegada y se enlazó la migración de solicitudes a esa revisión. La corrección no modifica tablas existentes.

También se corrigió el frontend para reutilizar la evidencia después del polling y mostrar el mensaje de solicitud enviada.

## Validación

```powershell
cd backend
alembic upgrade head
```

Usar una cuenta `DISPOSITIVO` para escanear y una cuenta `OPERADOR` o `ADMINISTRADOR` para abrir `/solicitudes-vehiculos`.
