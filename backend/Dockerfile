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

# Preinstala tambien el detector vehicular y CLIP para operar sin red al arrancar.
RUN python -c "from open_image_models.detection.factory import create_detector; create_detector('rf-detr-nano-384-coco', conf_thresh=.45, providers=['CPUExecutionProvider'])" && \
    python -c "from huggingface_hub import hf_hub_download; files=['onnx/model_quantized.onnx','tokenizer.json','tokenizer_config.json','special_tokens_map.json','preprocessor_config.json','config.json']; [hf_hub_download(repo_id='Xenova/clip-vit-base-patch32', filename=f, local_dir='/app/.runtime/models/clip-vit-b-32') for f in files]"

# Copiar el código fuente de la aplicación
COPY . .

# Puerto de la aplicación
EXPOSE 8000

# Comando de inicio con Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
