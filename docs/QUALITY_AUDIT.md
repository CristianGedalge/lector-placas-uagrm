# Auditoría de calidad técnica

Fecha de corte: 2026-07-30. Alcance: backend FastAPI, frontend React/Vite,
pipeline OCR/color/tipo, persistencia PostgreSQL/Alembic, Cloudinary, scripts y
dependencias. Referencia principal: ISO/IEC 25010:2023. La auditoría inicial fue
de lectura; las correcciones se registran por separado.

## Hallazgos

| ID | Hallazgo | Sev. | Evidencia / archivo | Riesgo | Corrección propuesta | Riesgo de corregir |
|---|---|---:|---|---|---|---|
| Q-01 | Un secreto de entorno estuvo versionado históricamente. | P0 | Historial Git de `backend/.env`; el archivo ya no aparece en `git ls-files`. | Credenciales recuperables desde clones o historia. | Retirar del índice, ignorar y rotar todos los valores expuestos; reescribir historia sólo mediante procedimiento coordinado. | Rotación puede interrumpir Neon/Cloudinary si despliegues no se actualizan juntos. |
| Q-02 | El cierre transaccional del análisis mezclaba BD, spool y Cloudinary; un fallo externo puede dejar un asset huérfano. | P1 | `backend/app/api/v1/plates.py`, bloque de creación de solicitud. | Inconsistencia entre Cloudinary y PostgreSQL. | Mantener rollback y error controlado; añadir reconciliación/compensación antes de producción. | Borrar el asset equivocado si la compensación no usa `public_id` exacto. |
| Q-03 | Existía deriva entre metadata ORM y Neon. | P1 | `alembic check`: tipos `TIMESTAMP` frente a `DateTime(timezone=True)` y representación duplicada de unicidad/índice en `estado_campus.vehiculo_id`. | Autogeneraciones peligrosas y timestamps ambiguos. | Representar explícitamente constraint/índice y añadir migración nueva UTC; no editar migraciones aplicadas. | Conversión horaria incorrecta si los valores históricos no eran UTC. |
| Q-04 | La descarga CLIP no fijaba revisión. | P1 | Bandit B615 en `backend/app/services/clip_color.py`. | Cambio no controlado o compromiso de artefactos IA. | Fijar el mismo repositorio a un commit SHA. | El pin requiere actualización deliberada para recibir mejoras. |
| Q-05 | El agente aceptaba esquemas arbitrarios en `CAMERA_API_URL`. | P1 | Bandit B310 en `backend/app/services/camera_capture.py`. | Lecturas locales o comportamiento inesperado con `urlopen`. | Admitir sólo HTTP/HTTPS con host válido y probar rechazo. | Configuraciones con esquemas personalizados dejan de funcionar. |
| Q-06 | El intento previo de remediar React Router lo bajó a 7.11.0, aún afectado por avisos. | P1 | `frontend/package.json`, lockfile y `npm audit`. | XSS/open redirect/SSR según modo afectado. | Usar 7.18.2; documentar el aviso residual de RSC, modo que este SPA no usa. | Cambio mayor desde v6; requiere build y E2E. |
| Q-07 | El verificador usaba Python global por defecto aunque existe `backend/.venv`. | P2 | `.agents/scripts/verify-project.ps1`; fallo `ModuleNotFoundError: fast_alpr`. | Falsos negativos y resultados no reproducibles. | Resolver primero el intérprete del entorno del proyecto. | Entornos sin `.venv` siguen dependiendo de `python` del PATH. |
| Q-08 | Cobertura desigual en API y tareas de medios. | P2 | Cobertura total 62%; `access_logs` 20%, `media_tasks` 22%, `vehicles` 22%. | Regresiones de autorización/transacción no detectadas. | Añadir pruebas de integración con PostgreSQL/Cloudinary simulados. | Mayor tiempo de CI y mantenimiento de fixtures. |
| Q-09 | `alembic current` está en `b1c2d3e4f5a6`; el código corregido añade una migración posterior. | P2 | Neon respondió `b1c2d3e4f5a6 (head)` antes de crear `c2d3e4f5a6b7`. | Desplegar código sin `upgrade` deja esquema desalineado. | Ejecutar backup y `alembic upgrade head` durante el despliegue. | Bloqueo breve y conversión de tres columnas. |
| Q-10 | No hay dataset representativo ni E2E físico de cámara/barrera. | P2 | `.agents/memory/HEARTBEAT.md`; 2 pruebas omitidas. | Métricas IA y flujo físico no validados para producción. | Dataset propio día/noche/movimiento y prueba celular/USB/RTSP/barrera. | Uso de PII/imágenes exige consentimiento y retención controlada. |
| Q-11 | La caché de usuario autenticado es local al proceso. | P3 | `backend/app/api/v1/auth.py`, `TTLCache`. | Revocación/desactivación tarda hasta 30 s y difiere entre workers. | Mantener TTL bajo o usar caché distribuida/invalidez central. | Infraestructura adicional y nuevas fallas de red. |

## Comprobaciones de arquitectura IA

- RF-DETR se invoca una vez por imagen estática en `plates.py`; la asociación se
  reutiliza para tipo y color.
- `realtime=true` omite RF-DETR y CLIP, y no crea solicitudes.
- CLIP sólo recibe el recorte asociado de la captura estática.
- Las sugerencias de color/tipo quedan en una solicitud `PENDING`; crear el
  vehículo exige aprobación explícita del endpoint de revisión.
- La evidencia de acceso usa spool + una tarea de Cloudinary; la evidencia de
  solicitud usa una sola carga directa. No se observó doble carga del mismo
  registro.

## Decisión de calidad

No listo para producción. El código automatizado está estable, pero falta aplicar
y verificar la nueva migración, rotar secretos históricos, ejecutar E2E con
servicios/hardware reales y elevar cobertura en autorización/transacciones.
