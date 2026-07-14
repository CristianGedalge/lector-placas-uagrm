# HEARTBEAT

- Foco actual: ejecucion local reproducible del backend, frontend y pipeline IA.
- Ultimo avance: se restauro el frontend original desde GitHub, se instalaron sus dependencias con `npm ci`, el build Vite y el smoke backend pasaron, y se recupero el repositorio Git conjunto en la raiz.
- Estructura actual: el proyecto usa `backend/` y `frontend/` directos en la raiz; los `.git` heredados se preservaron como `.git-legacy-backend` y `.git-legacy-frontend`.
- Inventario confirmado: existen `train/`, `valid/`, `test/`, `data.yaml` y `ml/models/yolov8n.pt`; no existe `ml/models/best.pt` entrenado para el proyecto.
- Bloqueos: PostgreSQL local rechaza las credenciales configuradas; inferencia requiere `best.pt` verificable o API key real de Roboflow.
- Proximo paso: validar `DATABASE_URL` y aplicar `alembic upgrade head`; luego proveer detector y ejecutar una inferencia real controlada.
- Estado del Alpha: backend y frontend estan nuevamente presentes; el backend informa correctamente estado degradado mientras falte detector.
