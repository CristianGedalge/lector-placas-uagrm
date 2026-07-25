# Resultados de pruebas Cloudinary

Fecha: 2026-07-24.

## Automatizadas

- Suite Python: 41 pruebas aprobadas, 2 integraciones opt-in omitidas.
- JPG y PNG a WebP: aprobado.
- EXIF/orientacion y eliminacion de metadatos: aprobado.
- limites de bytes y dimensiones: aprobado.
- upload/delete/exists/URL temporal del adaptador con mocks: aprobado.
- polling OCR sin llamadas Cloudinary: aprobado.
- compilacion Python: aprobada.
- Vite produccion: aprobado.
- Neon `SELECT 1`, TLS y migracion: aprobado.

## Migracion

`9d8f2a1c4b77 (head)` crea `archivos_multimedia`, dos indices, tres claves
foraneas nullable y los enums de proveedor, tipo y estado.

## Prueba real

No se ejecuto porque faltan en `backend/.env`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Cuando existan:

```powershell
cd backend
$env:RUN_CLOUDINARY_TESTS="1"
.\.venv\Scripts\python.exe -m unittest tests.test_cloudinary_integration -v
```

La prueba mide bytes y tiempos, sube WebP `authenticated`, verifica metadatos y
URL firmada, elimina el recurso y confirma su ausencia.

Una medicion local reproducible con una imagen sintetica JPEG 1600x900 obtuvo:

- original: 1.371.404 bytes;
- WebP calidad 78: 773.520 bytes;
- reduccion: 43,6 %;
- conversion aproximada: 0,82 segundos.

No hay tiempo de subida real hasta disponer de credenciales.

## Auditoria frontend

`npm audit` reporto dos vulnerabilidades moderadas heredadas de React Router.
Existe correccion mediante `npm audit fix`, pero debe validarse el posible
cambio de version antes de incorporarlo.
