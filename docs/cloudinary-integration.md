# Integracion Cloudinary (uso academico)

Cloudinary se usa detras de `StorageService`; la logica de negocio no importa
el SDK. Todos los recursos se suben desde FastAPI como `image`,
`authenticated` y WebP ya comprimido. React nunca recibe credenciales ni sube
directamente al proveedor.

## Variables

Copiar `backend/.env.example` a `backend/.env` y definir:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_SECURE=true
CLOUDINARY_ASSET_PREFIX=placas-academico
CLOUDINARY_DELIVERY_TYPE=authenticated
```

No se usa `CLOUDINARY_URL`. El API secret no debe llevar prefijo `VITE_`.
Las tres credenciales se obtienen en API Keys del Product Environment.

La cuenta debe usar Dynamic Folders. El backend usa `asset_folder` y genera
`public_id` UUID sin placa, carnet, nombre ni otro dato personal:

- `placas-academico/users`
- `placas-academico/vehicles`
- `placas-academico/access/entries`
- `placas-academico/access/exits`

No se necesita preset. No crear presets unsigned. El SDK realiza subidas
firmadas con las credenciales del backend.

## Flujos

Las fotos de usuario y vehiculo se validan, convierten y suben durante la
accion explicita. Un reemplazo confirma primero la nueva relacion en
PostgreSQL y elimina despues el recurso anterior.

El polling OCR solo llama `/api/v1/plates/analyze`; nunca importa ni invoca
Cloudinary. El frame ganador se adjunta a
`POST /api/v1/access-logs/auto-with-evidence`. El acceso y un archivo `PENDING`
se confirman primero. Una tarea con sesion propia procesa el spool, sube WebP y
cambia a `READY`; un fallo deja el acceso intacto y marca `FAILED`.

El original alimenta FastPlateOCR. El panorama WebP es evidencia. El recorte de
placa sigue siendo temporal y nunca crea un registro multimedia.

## Endpoints

- `POST/DELETE /api/v1/media/users/{id}/photo`
- `POST/DELETE /api/v1/media/vehicles/{id}/photo`
- `GET /api/v1/media/{media_id}/url`
- `POST /api/v1/media/{media_id}/retry` (administrador)
- `POST /api/v1/access-logs/auto-with-evidence`

Las URLs firmadas expiran y nunca se almacenan en PostgreSQL o localStorage.

Cloudinary es la opcion academica. Para volumen alto se recomienda implementar
otro adaptador `StorageService` para Cloudflare R2, S3 o MinIO.
