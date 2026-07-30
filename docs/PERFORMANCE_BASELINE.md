# Línea base de rendimiento

Entorno local Windows, Python 3.12, Node 22, CPU; fecha 2026-07-30. Estas cifras
son de verificación técnica, no un benchmark de capacidad.

| Métrica | Antes / evidencia previa | Después |
|---|---:|---:|
| Suite backend | 76 pass, 2 skip | 77 pass, 2 skip tras prueba de esquema URL |
| Cobertura total | no consolidada en informe | 62% (2829 sentencias, 1062 sin cubrir) |
| Build frontend | 109 módulos | 109 módulos; JS 444.24 kB, gzip 117.63 kB; CSS 12.88 kB, gzip 3.45 kB |
| Ruff | 13 hallazgos pendientes en reanudación | 0 |
| Bandit (`app`, `scripts`) | 2 medios | 0 |
| pip-audit requirements | 0 conocidos | 0 conocidos |
| npm audit | versiones probadas con 2 moderadas/altas | 2 altas residuales, sólo modo RSC no utilizado |

## Coste del flujo IA

- Realtime: FastALPR/FastPlateOCR; no ejecuta RF-DETR ni CLIP y no persiste una
  solicitud.
- Captura estática: una inferencia RF-DETR por imagen; la asociación se reutiliza
  para tipo y color. OpenCV precede al fallback CLIP.
- Medios: una carga Cloudinary por evidencia creada; los accesos usan tarea de
  fondo para sacar I/O externo de la respuesta principal.

## Límites

No se midieron p50/p95, memoria máxima, concurrencia ni latencia Neon/Cloudinary
porque requieren servicios y carga controlada. Antes de producción se debe medir
por separado OCR, RF-DETR, CLIP, endpoint completo y cola/spool con al menos 1,
5 y 20 solicitudes concurrentes.
