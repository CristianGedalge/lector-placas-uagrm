# Captura automatica y OCR local

## Arquitectura

```text
Webcam USB, RTSP o imagen
  -> OpenCV (captura, ROI y preprocesamiento)
  -> FastALPR (deteccion) + FastPlateOCR (lectura)
  -> Supervision (detecciones, filtrado, recorte y anotacion)
  -> normalizacion y validacion boliviana
  -> FastAPI
```

El motor usa un detector ONNX local de FastALPR y FastPlateOCR sobre el recorte;
no se usan servicios de inferencia externos.

La camara se ejecuta en un proceso separado. Esto evita que un driver USB o stream RTSP bloqueado detenga FastAPI. El agente solo envia JPEG a `POST /api/v1/plates/analyze`; no duplica OCR y nunca registra vehiculos automaticamente.

## Seleccion de candidatos

El pipeline no toma la primera lectura. Considera confianza del detector y OCR,
formato boliviano `0000AAA`, longitud, tamaño, proporción y límites de imagen.

Un candidato invalido o inferior a `OCR_CONFIDENCE_THRESHOLD` queda en `LOW_CONFIDENCE`, requiere revision manual y no expone `normalized_plate` al flujo automatico del frontend.

## Preprocesamiento

Puede usar escala de grises, CLAHE moderado, desenfoque Gaussiano suave, reescalado de imagen pequena y umbral Otsu opcional. OpenCV respeta orientacion segura al decodificar; no se aplican rotaciones heuristicas agresivas.

```dotenv
OCR_CONFIDENCE_THRESHOLD=0.40
OCR_UPSCALE_FACTOR=2.0
OCR_USE_GRAYSCALE=true
OCR_USE_CONTRAST=true
OCR_DENOISE=true
OCR_USE_THRESHOLD=false
```

## Region de interes

Para una camara fija se recomienda limitar el area donde aparece la placa:

```dotenv
OCR_ROI_X=
OCR_ROI_Y=
OCR_ROI_WIDTH=
OCR_ROI_HEIGHT=
```

Las cuatro variables deben estar vacias o definidas juntas. `X/Y` son la esquina superior izquierda en pixeles y `WIDTH/HEIGHT` el tamano. Una ROI incompleta, negativa o fuera de la imagen se rechaza. Sin ROI se analiza toda la imagen, con mayor riesgo de leer carteles u otros textos.

## Webcam USB y RTSP

```dotenv
CAMERA_INDEX=0
CAMERA_RTSP_URL=
CAMERA_API_URL=http://127.0.0.1:8000/api/v1/plates/analyze
CAMERA_ANALYSIS_INTERVAL_SECONDS=2.0
CAMERA_DUPLICATE_COOLDOWN_SECONDS=30.0
CAMERA_RECONNECT_DELAY_SECONDS=5.0
CAMERA_REQUEST_TIMEOUT_SECONDS=30.0
CAMERA_REQUEST_RETRIES=2
CAMERA_REQUEST_RETRY_DELAY_SECONDS=1.0
CAMERA_JPEG_QUALITY=90
```

`CAMERA_RTSP_URL` tiene prioridad sobre el indice USB y nunca se escribe en logs porque puede contener credenciales.

## Iniciar y detener

Terminal del backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python run.py
```

Terminal de la camara:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.services.camera_capture
```

Deten el agente con `Ctrl+C`. La captura se libera con `release()`. No se usa `cv2.imshow()`.

Para RTSP, define en el `.env` local una URL como `rtsp://usuario:contrasena@host:554/ruta` y ejecuta el mismo comando. Ante desconexion, el agente libera la fuente, espera y reconecta.

## Probar una imagen

Con FastAPI activo:

```powershell
curl.exe -X POST "http://127.0.0.1:8000/api/v1/plates/analyze" -F "file=@C:\ruta\placa.jpg;type=image/jpeg"
```

La respuesta incluye estado, texto, confianza, revision manual, imagen anotada y recorte en base64.

## Probar sin hardware

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas simulan FastALPR/FastPlateOCR, fotogramas,
reconexión, fallos HTTP y cooldown.

## Recomendaciones fisicas

- iluminacion uniforme y sin reflejos directos;
- camara estable y aproximadamente perpendicular;
- placa con suficiente cantidad de pixeles;
- ROI ajustada al carril;
- intervalo mayor si la CPU es limitada;
- revision de falsos positivos antes de acciones operativas.

## Limpieza realizada

Se eliminaron dataset, pesos, scripts de entrenamiento/evaluacion y configuraciones sin consumidores. La aplicacion no requiere entrenamiento ni claves de servicios externos.

## Limitaciones

- No se probo una placa ni camara fisica en esta sesion.
- OCR de imagen completa puede producir falsos positivos.
- Suciedad, movimiento, angulo, baja resolucion y reflejos reducen la confianza.
- FastALPR/FastPlateOCR requiere sus pesos ONNX locales disponibles.
- La creacion de vehiculos sigue siendo manual y validada por FastAPI.
