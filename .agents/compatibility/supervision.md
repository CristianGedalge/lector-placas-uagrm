# Compatibilidad de Supervision

Referencia revisada: `roboflow/supervision` tag estable `0.29.1`.

## Matriz soportada

| Componente | Restriccion del proyecto | Motivo |
|---|---:|---|
| Python | `>=3.9` (Docker usa 3.11; entorno validado 3.12) | Supervision 0.29.1 declara Python 3.9 a 3.14 |
| supervision | `==0.29.1` | Version estable revisada contra las APIs usadas |
| inference-sdk | `==1.2.6` | Requiere Supervision >=0.26, NumPy >=2,<2.4 y OpenCV <=4.10.0.84 |
| numpy | `>=2.0,<2.4` | Interseccion con Inference SDK 1.2.6 |
| opencv-python | `==4.10.0.84` | Limite superior de Inference SDK |
| opencv-python-headless | `==4.10.0.84` | EasyOCR lo requiere; se iguala ABI/version con OpenCV normal |
| Pillow | `>=11,<12` | Interseccion con Inference SDK y Supervision |
| ultralytics | `>=8.3,<9` | Proveedor de resultados YOLO para `from_ultralytics` |

## APIs del proyecto verificadas

- `sv.Detections.from_ultralytics`
- `sv.Detections.from_inference`
- `sv.crop_image`
- `sv.BoxAnnotator(thickness=2)`
- `sv.LabelAnnotator(text_scale=0.5)`

## Politica de actualizacion

1. No usar rangos sin limite superior para el stack de vision.
2. Revisar primero los requisitos oficiales de Supervision e Inference SDK.
3. Actualizar esta matriz y `requirements.txt` juntos.
4. Ejecutar `.agents/scripts/verify-project.ps1` antes de aceptar el cambio.
5. Una validacion de imports no sustituye una inferencia real con imagen, modelo y credenciales controladas.

`-SkipVersionCheck` solo sirve para validar estructura, compilacion y frontend en un entorno global no sincronizado. La verificacion de entrega debe ejecutarse sin ese parametro dentro del entorno virtual del backend.
