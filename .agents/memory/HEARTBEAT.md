# HEARTBEAT

## Estado vigente - 2026-07-29

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
- Validacion mas reciente: 76 pruebas correctas, 2 omitidas, build Vite correcto
  y grafo Alembic con una sola cabeza `a0b1c2d3e4f5`.
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
