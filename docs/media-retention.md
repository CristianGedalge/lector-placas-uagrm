# Retencion multimedia

Las fotos relacionadas con usuario o vehiculo no expiran. Las evidencias de
entrada y salida reciben `expires_at` usando
`MEDIA_ACCESS_RETENTION_DAYS` (90 por defecto).

Dry-run:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\cleanup_expired_media.py --dry-run
```

Eliminacion:

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\cleanup_expired_media.py
```

El script es idempotente, excluye fotos permanentes, elimina el recurso del
proveedor, marca `DELETED` y conserva el acceso y sus datos de auditoria. No se
configura cron en esta fase.

Los archivos `FAILED` conservan el spool para reintento administrativo. Los
originales se eliminan solamente cuando la subida WebP queda confirmada.
