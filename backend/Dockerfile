FROM python:3.11-slim

# Metadatos de la imagen
LABEL maintainer="UAGRM" \
      description="Backend del Lector de Placas Bolivianas - UAGRM"

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip uninstall --yes opencv-python && \
    pip install --no-cache-dir --no-deps --force-reinstall \
      opencv-python-headless==4.10.0.84

# Descarga los modelos ONNX durante el build para no depender de Internet al arrancar.
RUN python -c "from fast_alpr import ALPR; ALPR(detector_model='yolo-v9-t-384-license-plate-end2end', detector_providers=['CPUExecutionProvider'], ocr_model='cct-xs-v2-global-model', ocr_device='cpu', ocr_providers=['CPUExecutionProvider'])"

# Copiar el código fuente de la aplicación
COPY . .

# Puerto de la aplicación
EXPOSE 8000

# Comando de inicio con Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
