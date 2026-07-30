# HEARTBEAT

## Estado vigente - 2026-07-30

- Auditoría ISO/IEC 25010:2023, OWASP ASVS 5.0 L2, NIST SSDF 1.1 e ISO/IEC
  25059:2023 documentada en `docs/`.
- Validación automatizada: 77 pruebas correctas, 2 omitidas, cobertura 63%,
  Ruff 0, Bandit 0 y pip-audit 0 vulnerabilidades conocidas.
- Frontend: build Vite correcto con React Router 7.18.2. npm audit conserva un
  advisory alto duplicado para modo RSC; este SPA no usa RSC/SSR/actions.
- Alembic: una cabeza local `c2d3e4f5a6b7`; Neon permanece en
  `b1c2d3e4f5a6` hasta un despliegue autorizado. No aplicar código sin upgrade.
- Decisión de release: NO-GO hasta rotar secretos históricos, aplicar/verificar
  migración y ejecutar E2E real de servicios, cámara y barrera.

- Foco actual: OCR local y sugerencias conservadoras de color y tipo vehicular
  para cargas estaticas y solicitudes de registro.
- OCR vigente: `yolo-v9-t-384-license-plate-end2end` +
  `cct-xs-v2-global-model`, ambos locales mediante ONNX Runtime en CPU.
- Color vigente: RF-DETR Nano COCO obtiene la caja real del vehiculo; OpenCV
  analiza primero y CLIP ViT-B/32 ONNX cuantizado actua como respaldo.
- Regla de seguridad: sin caja vehicular confiable, iluminacion util o acuerdo
  suficiente entre candidatos, devolver `DESCONOCIDO`.
- Persistencia de color: solo `color_sugerido`, `confianza_color` y
  `metodo_color` (`OPENCV`, `CLIP`, `HIBRIDO` o `DESCONOCIDO`).
- Carga estatica: `/api/v1/plates/analyze` devuelve los tres campos aunque no
  cree una solicitud, el vehiculo ya exista o el OCR quede en baja confianza,
  siempre que exista una caja de placa para asociar el vehiculo.
- Realtime: no ejecuta detector vehicular + CLIP en cada fotograma; el color se
  calcula sobre la captura estatica seleccionada.
- Tipo vigente: la misma inferencia RF-DETR se asocia a la placa por cobertura,
  distancia, confianza y tamano relativo; solo sugiere Automovil, Motocicleta,
  Bus o Camion cuando el catalogo activo tiene una coincidencia unica.
- Persistencia de tipo: `tipo_sugerido_id`, `confianza_tipo` y `metodo_tipo`.
  El nombre se obtiene por relacion y el selector confirmado queda editable.
- Frontend: muestra color, confianza y metodo tras subir una imagen; el color
  permanece editable por el operador en la bandeja de solicitudes.
- Base de datos: la nueva instancia Neon esta en Alembic `b1c2d3e4f5a6 (head)`;
  Automovil, Motocicleta, Bus y Camion estan activos y sin UUID hardcodeados.
- Validacion mas reciente: 77 pruebas correctas, 2 omitidas, build Vite y smoke
  HTTP correctos; grafo Alembic con una sola cabeza `c2d3e4f5a6b7`.
- Licencias seleccionadas: OpenCV/RF-DETR Nano Apache-2.0; Supervision,
  Open Image Models, ONNX Runtime y CLIP MIT. Conservar avisos de terceros.
- Limitaciones: las capturas reales disponibles son insuficientes para calibrar
  produccion; faltan pruebas propias de dia/noche, movimiento, reflejos y todos
  los colores con las camaras finales.
- Pendientes prioritarios: calibracion fisica OCR/color, prueba celular/USB y
  barrera completa, reglas de firewall y dataset de evaluacion propio.

## Convenciones vigentes

- La cuenta `DISPOSITIVO` y el registro fisico `Dispositivo` se asocian por
  coincidencia exacta de nombre mientras no exista una FK explicita.
- No guardar contrasenas, secretos, URLs RTSP, imagenes privadas ni URLs firmadas
  en esta memoria.
- No hacer push o merge salvo solicitud explicita.
