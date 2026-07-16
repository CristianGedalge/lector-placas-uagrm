# HEARTBEAT

- Foco actual: pipeline local OCR + Supervision con ROI y captura automatica.
- Ultimo avance: ejecucion local completa, OCR sintetico correcto y frontend actualizado a Vite 8 sin vulnerabilidades conocidas.
- Estructura actual: el proyecto usa `backend/` y `frontend/` directos en la raiz; los `.git` heredados se preservaron como `.git-legacy-backend` y `.git-legacy-frontend`.
- Inventario confirmado: `backend/ml/`, datasets, pesos y scripts de entrenamiento fueron retirados por no tener consumidores en la arquitectura OCR.
- Bloqueos: PostgreSQL local rechaza las credenciales configuradas; faltan pruebas con placas, webcam y RTSP fisicos.
- Proximo paso: calibrar ROI, iluminacion, distancia y umbral OCR con hardware real; luego validar `DATABASE_URL`.
- Estado del Alpha: pipeline OCR local, API, frontend y agente de camara estan integrados; la lectura fisica aun no fue validada.
