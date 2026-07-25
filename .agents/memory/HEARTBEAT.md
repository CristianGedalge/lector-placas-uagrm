# HEARTBEAT

## Estado vigente - 2026-07-25

- Foco: ejecucion local/Docker con PostgreSQL externo, Neon y Cloudinary.
- Validado: 44 pruebas, build Vite, HTTP/proxy/OpenAPI, Neon TLS/SELECT 1/Alembic
  y Cloudinary real local y Docker.
- Corregido: multipart Axios, `NotFound` Cloudinary, pool PostgreSQL con
  `pool_pre_ping`, Docker headless/CPU y exclusion de secretos del contexto.
- Datos: dos operadores, dos administradores, una cuenta dispositivo y los
  catalogos Toyota/Nissan/Automóvil/Motocicleta. No guardar contrasenas.
- Flujo DISPOSITIVO: login a `/subir-placa`; la cuenta no esta vinculada
  automaticamente con la entidad fisica `Dispositivo`.
- Pendientes: camara USB/RTSP real, calibracion OCR, vinculo cuenta-dispositivo,
  repositorio remoto y dos avisos moderados React Router.
- Proximo paso: modelar el vinculo de identidad del dispositivo y probar con
  hardware real.

- Foco actual: Consolidación del sistema de roles (ADMINISTRADOR, OPERADOR, DISPOSITIVO, USUARIO) y del flujo de registro de accesos vehiculares manuales y automáticos.
- Ultimo avance: Se completó la separación de flujos por rol en el frontend (Vehicles.jsx, AccessLogs.jsx, UploadPlate.jsx, Sidebar, AppRoutes). El rol DISPOSITIVO tiene acceso exclusivo a la vista de cámara en vivo, con registro automático de Ingreso/Salida inferido por el estado del campus. El endpoint `/api/v1/access-logs/auto` ahora acepta `direction` explícita del operador además de inferirla. Se corrigió el error 422 del formulario de acceso manual (endpoint incorrecto), el mensaje vacío del ConfirmModal (clave `message` vs `mensaje`) y se añadió búsqueda de placa en tiempo real en el modal de acceso manual.
- Estructura actual: backend/ y frontend/ directos en la raíz; docker-compose.yml en la raíz; submódulos en frontend/src/components/ y páginas en frontend/src/pages/.
- Inventario confirmado: Suite completa de 23 pruebas unitarias y empaquetado de producción Vite completados correctamente (100% exitoso).
- Bloqueos: `CAM-004` y `OCR-PHYSICAL-001` siguen bloqueados por hardware físico real. `REPO-001` pendiente de repositorio remoto vacío.
- Proximo paso: Integrar y calibrar con cámaras IP en el entorno físico de la universidad. Validar flujo completo DISPOSITIVO con login → vista de cámara → registro automático de acceso.
- Estado del Alpha: Roles diferenciados, pipeline OCR optimizado, accesos manuales y automáticos funcionales, Dashboard premium unificado, gestión de vehículos por admin/operador completa.
