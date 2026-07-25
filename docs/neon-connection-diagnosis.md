# Diagnostico de conexion PostgreSQL y Neon

## Resultado

FastAPI, SQLAlchemy, el verificador y Alembic usan ahora la misma fuente:
`DATABASE_URL`, leida desde `backend/.env` o desde el entorno del proceso.
No hay una URL alternativa en `alembic.ini` ni una sobrescritura en Compose.

La URL configurada corresponde al nuevo pooler de Neon, usa el driver
`postgresql+psycopg` y solicita `sslmode=require` y
`channel_binding=require`. La prueba real obtuvo:

- proveedor: Neon;
- base: `neondb`;
- `SELECT 1`: correcto;
- TLS informado por `libpq`: activo.

No se registraron usuario, contrasena ni URL completa.

## Causa de los fallos

Habia varias fuentes de configuracion:

1. Compose reemplazaba `DATABASE_URL` por una URL local con host `db`.
2. Alembic online reemplazaba su URL, pero el modo offline conservaba el
   placeholder de `alembic.ini`.
3. `.env.example` suponia `localhost:5432`, distinto del puerto `5433`
   descrito para la base Docker y no valido dentro de un contenedor.
4. La carga de `.env` dependia del directorio desde el cual se iniciaba Python.

Estos puntos quedaron corregidos. La seleccion de proveedor se hace cambiando
unicamente `DATABASE_URL`, sin cambios de codigo.

PostgreSQL se trata como dependencia externa: el Compose principal no declara
un servicio `db`, no contiene credenciales de PostgreSQL y el backend no tiene
una dependencia `depends_on` asociada a una base.

## Estado de migraciones

La nueva base estaba vacia. `alembic upgrade head` finalizo correctamente y
`alembic current` informa `6784f2a204a1 (head)`.

Se crearon 11 tablas (incluida `alembic_version`), 10 indices, 3 restricciones
unicas y 11 claves foraneas:

`accesos`, `accesos_visitantes`, `alembic_version`, `dispositivos`,
`escaneados`, `estado_campus`, `marcas`, `tipos_dispositivo`,
`tipos_vehiculo`, `usuarios` y `vehiculos`.

La prueba real de FastAPI comprobo health, registro temporal, login y lectura
del perfil autenticado. El usuario temporal fue eliminado al terminar.

La base Neon anterior no fue modificada. La migracion local no se repitio
porque Docker Desktop no estaba iniciado; la misma migracion y configuracion
siguen siendo compatibles con PostgreSQL local.

## Uso

Copiar el ejemplo sin versionar secretos:

```powershell
Copy-Item backend/.env.example backend/.env
```

Editar `backend/.env`:

- PostgreSQL instalado: host `localhost`, puerto de la instalacion.
- Backend en el host y PostgreSQL instalado: host `localhost`.
- Backend en Docker y PostgreSQL instalado en el host: host
  `host.docker.internal` en Docker Desktop.
- PostgreSQL externo: host y puerto entregados por el proveedor.
- Neon: host provisto por Neon y `sslmode=require`.

Comprobar conexion y TLS:

```powershell
cd backend
python -m scripts.check_database
alembic upgrade head
```

La implementacion usa SQL PostgreSQL estandar y no incorpora funciones
exclusivas de Neon.
