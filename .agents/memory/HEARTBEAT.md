# HEARTBEAT

## Estado vigente - 2026-07-27

- **Foco**: Integración del celular como dispositivo de cámara por WiFi local, simulador visual de barrera de acceso y control de flujo de vehículos desconocidos.
- **Validado**: 44 pruebas unitarias, build Vite, migración Alembic aplicada, HTTPS en Vite con certificado auto-firmado.
- **Completado en esta sesión**:
  - `BACKEND_HOST=0.0.0.0` y CORS ajustado para IP LAN (`192.168.0.14`).
  - Vite con `host: true` y `https: true` mediante `@vitejs/plugin-basic-ssl`.
  - Columna `webhook_url` en `Dispositivo` (BD migrada).
  - `_trigger_barrier_webhook` en `plates.py` (background, silencioso).
  - Auto-resolución del `Dispositivo` por nombre del usuario `DISPOSITIVO` logueado.
  - Nuevo router `barrier.py`: `POST /trigger`, `GET /events` (SSE), `GET /simulator` (HTML animado).
  - Campo `webhook_url` en modales crear/editar de `Devices.jsx`.
  - `Permissions-Policy: camera=(*)` habilitado para cámara en red local.
- **Fase 1 placas desconocidas**:
  - El análisis no-realtime de una placa válida no registrada guarda una única imagen WebP authenticated en Cloudinary, crea solicitud PENDING y expone bandeja staff con aprobación/rechazo transaccional.
  - Neon e historial de base de datos migrado correctamente.
- **Estado de red**:
  - Celular accede vía `https://192.168.0.14:5173` (acepta certificado auto-firmado la 1ª vez).
  - Simulador de barrera: `http://localhost:8000/api/v1/barrier/simulator`.
- **Convención de vinculación Dispositivo ↔ Usuario**: El nombre del `Dispositivo` registrado en el panel de admin debe coincidir exactamente con el `nombre` del `Usuario` de rol `DISPOSITIVO`. El backend los empareja automáticamente en `plates.py`.
- **Próximo paso**: Probar el flujo completo celular → OCR → solicitud de registro de placa desconocida / apertura de barrera simulada.
