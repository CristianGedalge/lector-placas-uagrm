# HEARTBEAT

## Estado vigente - 2026-07-27

- **Foco**: Integración del celular como dispositivo de cámara por WiFi local y simulador visual de barrera de acceso.
- **Validado**: 44 pruebas unitarias, build Vite, migración Alembic `3aa735770818` aplicada a Neon, HTTPS en Vite con certificado auto-firmado.
- **Completado en esta sesión**:
  - `BACKEND_HOST=0.0.0.0` y CORS ajustado para IP LAN (`192.168.0.14`).
  - Vite con `host: true` y `https: true` mediante `@vitejs/plugin-basic-ssl`.
  - Columna `webhook_url` en `Dispositivo` (BD migrada).
  - `_trigger_barrier_webhook` en `plates.py` (background, silencioso).
  - Auto-resolución del `Dispositivo` por nombre del usuario `DISPOSITIVO` logueado.
  - Nuevo router `barrier.py`: `POST /trigger`, `GET /events` (SSE), `GET /simulator` (HTML animado).
  - Campo `webhook_url` en modales crear/editar de `Devices.jsx`.
  - `Permissions-Policy: camera=(*)` habilitado para cámara en red local.
- **Estado de red**:
  - Celular accede vía `https://192.168.0.14:5173` (acepta certificado auto-firmado la 1ª vez).
  - Simulador de barrera: `http://localhost:8000/api/v1/barrier/simulator`.
  - Firewall puertos 5173/8000 pendiente de ejecutar como Administrador.
- **Convención de vinculación Dispositivo ↔ Usuario**: El nombre del `Dispositivo` registrado en el panel de admin debe coincidir exactamente con el `nombre` del `Usuario` de rol `DISPOSITIVO`. El backend los empareja automáticamente en `plates.py`.
- **Bloqueos vigentes**: `CAM-004` y `OCR-PHYSICAL-001` siguen bloqueados por hardware físico. `REPO-001` pendiente de repositorio remoto vacío. Firewall requiere terminal de Administrador.
- **Próximo paso**: Registrar el dispositivo en el panel admin con `webhook_url`, crear la cuenta `DISPOSITIVO` con el mismo nombre, probar el flujo completo celular → OCR → barrera simulada.
