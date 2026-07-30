# Compatibilidad del stack local de vision

Matriz vigente revisada contra `backend/requirements.txt` y el entorno Python
3.12. Docker usa Python 3.11.

## Matriz soportada

| Componente | Restriccion del proyecto | Funcion |
|---|---:|---|
| Python | `3.11-3.12` validado | Backend y herramientas locales |
| supervision | `==0.29.1` | Cajas, recortes y anotaciones |
| fast-alpr | `==0.4.0` con extra ONNX | Deteccion de placas y orquestacion OCR |
| fast-plate-ocr | `==1.1.0` con extra ONNX | Reconocimiento de caracteres |
| open-image-models | transitiva de FastALPR | YOLOv9 de placa y RF-DETR Nano COCO |
| onnxruntime | transitiva de extras ONNX | Inferencia CPU local |
| numpy | `>=2.0,<2.4` | Matrices, geometria y puntuacion |
| opencv-python-headless | `==4.10.0.84` | Decodificacion, HSV/LAB, mascaras y K-Means |
| Pillow | `>=11,<12` | Compatibilidad de imagen |
| tokenizers | `>=0.21,<1.0` | Tokenizacion de prompts CLIP |
| huggingface-hub | `>=0.34,<2.0` | Descarga controlada de artefactos CLIP |
| CLIP ViT-B/32 ONNX | `Xenova/clip-vit-base-patch32`, INT8 | Respaldo zero-shot de color |
| RF-DETR Nano COCO | `rf-detr-nano-384-coco` | Caja real del vehiculo |

EasyOCR, PyTorch y `opencv-python` con GUI no forman parte del runtime vigente.

## APIs verificadas

- `sv.Detections(...)`
- `sv.crop_image(...)`
- `sv.BoxAnnotator(..., color_lookup=sv.ColorLookup.INDEX)`
- `sv.LabelAnnotator(..., color_lookup=sv.ColorLookup.INDEX)`
- `fast_alpr.ALPR(...)`
- `open_image_models.detection.factory.create_detector(...)`
- `onnxruntime.InferenceSession(...)`

## Politica de actualizacion

1. Revisar licencia del framework, repositorio de pesos y modelo exacto.
2. Mantener inferencia local y sin costo por imagen.
3. Actualizar esta matriz y `requirements.txt` juntos.
4. Ejecutar `.agents/scripts/verify-project.ps1` sin `-SkipVersionCheck`.
5. Ejecutar pruebas fisicas; mocks y capturas de catalogo no sustituyen camaras
   reales bajo dia, noche, reflejos y movimiento.

`-SkipVersionCheck` solo valida estructura, compilacion, pruebas y frontend en un
entorno no sincronizado; no sirve como verificacion de entrega.
