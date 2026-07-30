# Modelos de terceros

## Sugerencia local de color

- **CLIP ViT-B/32**: arquitectura y pesos publicados por OpenAI bajo licencia MIT. La aplicación usa la conversión ONNX cuantizada de `Xenova/clip-vit-base-patch32`, derivada de `openai/clip-vit-base-patch32`, sin llamadas a APIs externas.
- **RF-DETR Nano COCO**: se utiliza sólo para obtener el recorte real de auto, camión, bus o motocicleta. RF-DETR publica sus pesos designados bajo Apache-2.0; `open-image-models`, que ejecuta el ONNX, usa MIT.

Referencias y avisos que deben conservarse en una distribución comercial:

- CLIP: https://github.com/openai/CLIP/blob/main/LICENSE
- Modelo CLIP: https://huggingface.co/openai/clip-vit-base-patch32
- Conversión ONNX elegida: https://huggingface.co/Xenova/clip-vit-base-patch32
- RF-DETR: https://github.com/roboflow/rf-detr
- Open Image Models: https://github.com/ankandrew/open-image-models

La licencia permite uso comercial, pero eso no equivale a una garantía de precisión. La ficha de CLIP advierte que el despliegue comercial no fue evaluado y exige pruebas sobre el dominio real. Por ello, la salida se presenta como sugerencia editable, usa catálogo cerrado y devuelve `DESCONOCIDO` cuando top-1 y top-2 no se separan lo suficiente.
