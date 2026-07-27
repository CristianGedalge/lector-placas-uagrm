# Issue 014 — Bandeja de solicitudes con formulario inconsistente

## Corrección

La bandeja ahora usa tarjetas compactas y un botón `Revisar`. La aprobación se
realiza en un modal con la misma estructura del registro manual de vehículos:
selectores legibles de propietario, marca y tipo, color, placa editable,
confianza OCR de solo lectura y evidencia Cloudinary reutilizada como foto.

Se añadieron estados de carga, errores, validación de campos y confirmación
para aprobar o rechazar. El backend acepta opcionalmente la placa corregida y
continúa recibiendo los UUID reales seleccionados por los selectores.
