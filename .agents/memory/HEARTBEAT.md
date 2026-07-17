# HEARTBEAT

- Foco actual: Implementación estricta de Reglas de Negocio y Seguridad de Datos.
- Ultimo avance: Se implementó la restricción de unicidad para el CI (`document_id`) en base de datos. Se restringió la creación de vehículos para que los operadores solo puedan registrar a su nombre, y el registro de salidas (`EXIT`) únicamente al propietario del vehículo o administradores. Se bloqueó el formulario de registro de vehículos en el frontend para operadores.
- Estructura actual: backend/ y frontend/ directos en la raíz; docker-compose.yml en la raíz para despliegue rápido.
- Inventario confirmado: Reglas de negocio enforcing en backend, frontend y nivel de base de datos (migración Alembic).
- Bloqueos: Ninguno. Todos los tests locales y revisiones de seguridad en roles son exitosos.
- Proximo paso: Calibrar e integrar el pipeline ALPR de EasyOCR/Supervision con cámaras físicas de prueba y configurar ROI definitiva.
- Estado del Alpha: Registro, control de accesos y validaciones de negocio 100% integrados y funcionales.
