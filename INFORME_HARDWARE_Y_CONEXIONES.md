# Informe Técnico: Conexiones, Hardware y Red para el Lector de Placas UAGRM

Este documento detalla los requerimientos físicos, de red y de entorno necesarios para desplegar el sistema en un ambiente real en la UAGRM, garantizando la mejor tasa de acierto del motor OCR.

---

## 1. Especificaciones de la Cámara

El sistema soporta tanto cámaras web USB (para pruebas locales) como cámaras IP RTSP (para producción). Para el entorno de producción en un punto de control de vehículos:

*   **Tipo de Cámara:** Cámara IP tipo "Bala" o especializada en LPR/ANPR (License Plate Recognition).
*   **Resolución Óptima:** Entre 720p (1280x720) y 1080p (1920x1080).
    *   *Nota:* Resoluciones 4K pueden introducir latencia innecesaria y hacer el procesamiento OCR mucho más lento sin brindar un beneficio real, ya que el sistema recorta la región de interés (ROI).
*   **Tasa de Fotogramas (FPS):** Mínimo 15 FPS, recomendado 30 FPS para capturar vehículos en movimiento sin efecto fantasma (motion blur).
*   **Velocidad de Obturador (Shutter Speed):** Muy importante. Debe ser alto (ej. 1/1000s) para evitar que la placa salga borrosa si el vehículo no se detiene completamente.
*   **Iluminación:** Debe tener visión nocturna (Infrarrojo - IR) si operará de noche. Las placas de Bolivia son reflectivas, por lo que una luz IR de la cámara las hará resaltar sobre el fondo oscuro del vehículo.

## 2. Posicionamiento y Enfoque (Geometría de Captura)

La inteligencia artificial (EasyOCR) lee texto en 2D. Mientras más deformada o inclinada esté la placa, menor será la precisión.

*   **Altura de Instalación:** Entre 1.2 metros y 1.5 metros del suelo, apuntando directo a la altura del parachoques.
*   **Ángulo Horizontal:** Máximo 30° de desviación respecto al frente del vehículo. Lo ideal es de frente (0° a 15°).
*   **Ángulo Vertical:** Máximo 30° de inclinación hacia abajo.
*   **Distancia Focal / Lente:** Ajustar el zoom óptico (si la cámara es varifocal) para que **el ancho de la placa ocupe al menos un 15% a 25% del ancho total del video**. La placa no debe verse minúscula en la imagen.

## 3. Conexión de Red e Infraestructura

Dado que el procesamiento se hace localmente (Edge Computing), la latencia de red debe ser mínima.

*   **Cableado:** Cable Ethernet Cat 6 directo desde la cámara IP hacia el switch o router local donde esté el servidor. **No se recomienda usar WiFi para la cámara IP**, ya que la pérdida de paquetes corrompe el stream de video RTSP.
*   **Ancho de banda local:** El stream RTSP 1080p a 30 FPS consumirá alrededor de 4 a 8 Mbps constantes en la red local (LAN). El switch debe ser Gigabit.
*   **Direccionamiento IP:** Asignar una **IP Estática** a la cámara en el router local. Esto evita que el backend pierda la conexión si se reinicia el router (DHCP).

## 4. Hardware del Servidor (Backend)

El servidor que ejecutará el sistema (Docker + FastAPI + EasyOCR + PostgreSQL) debe tener la capacidad para procesar imágenes con redes neuronales.

*   **CPU:** Procesador moderno de al menos 4 a 8 núcleos físicos (ej. Intel Core i5/i7 de 10ma gen o Ryzen 5/7). El OCR consume bastante CPU por cada fotograma.
*   **RAM:** Mínimo 8 GB, recomendado 16 GB. EasyOCR y PostgreSQL requieren memoria para mantener los modelos y la base de datos en caché.
*   **GPU (Opcional pero muy recomendado):** Si el servidor cuenta con una tarjeta gráfica NVIDIA (ej. GTX 1650, RTX 3060), EasyOCR leerá las placas en milisegundos en lugar de segundos.
*   **Almacenamiento:** Disco SSD NVMe (para escrituras rápidas de las fotos de los vehículos y la base de datos).

## 5. Configuración del Software (Integración HW-SW)

Una vez conectada físicamente la cámara a la red y encendido el servidor, se debe enlazar el software con el hardware mediante las Variables de Entorno del backend (`.env`):

*   **Para Producción (Cámara IP):**
    Configurar la variable con la URL que provee el fabricante de la cámara.
    `CAMERA_RTSP_URL=rtsp://usuario:contraseña@IP_DE_LA_CAMARA:554/stream1`
*   **Para Pruebas (Cámara USB conectada al PC):**
    `CAMERA_RTSP_URL=0` (0 es el índice de la webcam por defecto de Windows).
*   **Frecuencia de Lectura:**
    `CAMERA_POLL_INTERVAL=2.0` (Leer un frame cada 2 segundos. Si el servidor es muy potente, se puede bajar a 1.0 o 0.5 segundos).

## 6. Diagrama Rápido de Conexión Físico

```text
[ Vehículo ] 
    | (aprox 3 a 5 metros)
[ Cámara LPR (IP Fija: 192.168.1.50) ] 
    | (Cable de red Ethernet Cat6)
[ Switch PoE (Provee datos y energía a la cámara) ]
    | (Cable de red)
[ PC / Servidor Local (IP Fija: 192.168.1.100) ]
    |-- Ejecuta: Backend FastAPI (Puerto 8000)
    |-- Ejecuta: Base de datos PostgreSQL (Puerto 5432)
    |-- Ejecuta: Frontend React/Vite (Puerto 5173 o Servido por Nginx en 80)
    |
[ Monitor / Operador ] -> Accede a http://192.168.1.100 en su navegador web.
```

---
*Este documento ha sido redactado con base en las mejores prácticas de instalación de sistemas de Visión Artificial.*
