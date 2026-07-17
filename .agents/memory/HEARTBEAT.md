# HEARTBEAT

- Foco actual: Optimización de la experiencia de usuario (tracking en tiempo real) y preprocesamiento OCR para placas bolivianas.
- Ultimo avance: Se implementó un bucle de escaneo silencioso en el frontend (React) que sondea el backend (EasyOCR) para dibujar un recuadro de seguimiento preciso sobre la placa en tiempo real. Todas las pruebas unitarias pasaron satisfactoriamente verificando la tolerancia al preprocesamiento OCR.
- Estructura actual: el proyecto usa `backend/` y `frontend/` directos en la raiz; docker-compose.yml en la raiz para despliegue rapido.
- Inventario confirmado: backend Dockerfile actualizado para usar `libgl1`; frontend Dockerfile creado sobre Node 20.
- Bloqueos: Ninguno. Todos los test de verificación pasaron en local (23 pruebas backend OK).
- Proximo paso: conectar hardware físico (cámara) y probar detección de placa en el mundo real utilizando el reporte de hardware generado.
- Estado del Alpha: pipeline OCR local, API, frontend, base de datos Postgres y dockerizacion orquestados y probados.

