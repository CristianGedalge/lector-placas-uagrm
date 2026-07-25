# Arquitectura de almacenamiento multimedia

## Componentes

- `ImageProcessingService`: valida bytes y contenido, limita pixeles, aplica
  orientacion EXIF, retira metadatos, redimensiona y produce WebP.
- `StorageService`: contrato `upload`, `delete`, `replace`, `exists` y
  `get_temporary_url`.
- `CloudinaryStorage`: adaptador firmado y `authenticated`.
- `ArchivoMultimedia`: metadatos y estado; nunca contiene blobs ni base64.
- `media_tasks.process_media_record`: tarea de evidencia con sesion SQLAlchemy
  propia.

## Procesamiento

| Tipo | Dimension | Calidad |
|---|---:|---:|
| USER_PROFILE | recorte central 512x512 | 82 |
| VEHICLE_REGISTRATION | lado mayor 1600 | 82 |
| ACCESS_ENTRY | lado mayor 1600 | 78 |
| ACCESS_EXIT | lado mayor 1600 | 78 |

Se valida el limite de 5 MiB antes de decodificar. Pillow verifica el contenido
real y protege contra decompression bombs. WebP se genera con `method=6`, sin
EXIF, GPS ni perfil ICC.

## Modelo

`archivos_multimedia` contiene proveedor, tipo, estado, identificadores del
proveedor, dimensiones, formato, bytes, intentos, error sanitizado, spool,
expiracion y timestamps.

Relaciones nullable:

- `usuarios.foto_id`
- `vehiculos.foto_id`
- `accesos.imagen_id`

Cada acceso representa entrada o salida y tiene como maximo una evidencia.

Estados: `PENDING → PROCESSING → READY`; un error produce `FAILED`, y una
eliminacion logica produce `DELETED`.

Para cambiar de proveedor se implementa un nuevo `StorageService`; los modelos,
permisos y procesamiento no necesitan conocer el SDK.
