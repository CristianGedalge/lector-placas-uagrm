# HEARTBEAT

- Foco actual: Auditoría de arquitectura frontend y backend bajo estándares de calidad ISO/IEC 25010 (Correctitud, Fiabilidad, Facilidad de uso, Eficiencia, Seguridad, Mantenibilidad, Portabilidad).
- Ultimo avance: Se implementaron optimizaciones clave:
  1. UI/UX: Validación visual de placa en tiempo real en frontend, spinners individuales en refrescos de tablas y paginación compacta.
  2. Eficiencia/BD: Índices compuestos en historiales de accesos y escaneos de placas, además de límite de resolución estática (`MAX_STATIC_DIM = 1280`) en EasyOCR backend para evitar picos de memoria.
  3. Mantenibilidad: Desacoplamiento de `UploadPlate.jsx` extrayendo modales de flujo a componentes modulares. Memoización de tablas con `React.memo` y `useCallback` en `Users.jsx`.
  4. Seguridad/Portabilidad: Script periódico de purga de tokens expirados en BD y centralización de tareas comunes en un Makefile portable.
- Estructura actual: backend/ y frontend/ directos en la raíz; docker-compose.yml en la raíz para despliegue rápido; submódulos en frontend/src/components/UploadPlate/ y scripts en backend/app/services/.
- Inventario confirmado: La suite completa de 23 pruebas de verificación y build del frontend compila y pasa al 100%.
- Bloqueos: Ninguno.
- Proximo paso: Integración del sistema con sensores o cámaras reales y monitoreo de producción.
- Estado del Alpha: Pipeline OCR local optimizado, control de accesos segregado por rol, y suite frontend totalmente robusta y memoizada.
