# Auditoría de seguridad

Referencias: OWASP ASVS 5.0 nivel 2 y NIST SSDF 1.1. ISO/IEC 25059:2023 se usó
sólo para reproducibilidad, procedencia y límites de los componentes IA.

## Resultado

- Secretos: `.env` ya no está versionado y está ignorado. Sigue pendiente la
  rotación de todo secreto que haya aparecido en la historia Git (P0).
- Sesión: cookie `HttpOnly`, `Secure` configurable y `SameSite`; el backend no
  depende de validación frontend para autorización o reglas críticas.
- Autorización: endpoints administrativos/staff usan dependencias de rol; medios
  verifican propietario o rol autorizado; el análisis anónimo no expone PII.
- Entrada: imágenes tienen límites y procesamiento backend; placas se normalizan
  y validan nuevamente en servidor.
- Errores/logs: no se devuelven excepciones internas ni se registran URLs RTSP,
  credenciales o respuestas sensibles.
- Suministro: `pip-audit -r requirements.txt` reporta 0 vulnerabilidades conocidas.
  Bandit sobre `app` y `scripts` reporta 0 hallazgos después de restringir URL y
  fijar el SHA del modelo CLIP.
- Frontend: `npm audit` reporta 2 entradas altas que representan el mismo aviso
  transitivo de React Router para modo RSC. La aplicación es un SPA Vite, no usa
  RSC, SSR ni acciones de React Router; se conserva 7.18.2 por eliminar los avisos
  aplicables de open redirect/SSR presentes en ramas anteriores. Riesgo residual
  aceptable sólo mientras siga sin habilitarse RSC.

## Trazabilidad ASVS/SSDF

| Control | Estado | Evidencia |
|---|---|---|
| ASVS V2/V3 sesión | Parcial | Cookies seguras; falta E2E de expiración/revocación multi-worker. |
| ASVS V4 acceso | Parcial | Dependencias por rol y filtros de propietario; cobertura API baja. |
| ASVS V5 validación | Conforme en flujos revisados | Schemas Pydantic y validadores backend de placa/archivos. |
| ASVS V7 errores/log | Conforme | Respuestas genéricas y logging sin secretos. |
| ASVS V12 archivos | Parcial | Límites, WebP y Cloudinary autenticado; falta prueba real de retención. |
| ASVS V14 configuración | Parcial | `.env.example`, pins críticos; falta gestor externo de secretos. |
| SSDF PO/PS | Parcial | Reglas `.agents`, auditorías SAST/SCA; falta automatización CI obligatoria. |
| SSDF PW/RV | Parcial | Pruebas, Ruff, Bandit, audits; falta revisión independiente y plan formal de respuesta. |
| ISO 25059 IA | Parcial | Modelos locales y revisión CLIP fijada; falta dataset y métricas por cámara. |

## Acciones obligatorias antes de producción

1. Rotar `SECRET_KEY`, Neon y Cloudinary; invalidar credenciales históricas.
2. Aplicar la migración pendiente con backup y verificar `alembic current/check`.
3. Ejecutar E2E de roles, carga privada, retención, cámara y barrera.
4. Configurar SCA/SAST recurrente y bloquear releases con P0/P1 aplicables.

## Revisión de endurecimiento - 2026-07-30

- Se bloqueó el registro público de roles privilegiados y se protegieron OCR,
  barrera, dispositivos, dashboard, vehículos y logs por rol o propiedad.
- Se añadieron defensas CSRF, orígenes explícitos, cabeceras defensivas, límites
  de carga y validación de webhooks.
- PBKDF2-SHA256 usa 600.000 iteraciones y actualiza hashes antiguos tras un login
  válido. Los JWT nuevos expiran por defecto en 15 minutos.
- Se retiró `token_cleanup.py`: no tenía referencias y dependía del modelo
  inexistente `RevokedToken`. El logout aún no revoca JWT en servidor; corregirlo
  exige una migración coordinada y sigue pendiente.
- Una verificación local expandió credenciales del `.env` en la salida de Docker
  Compose. Deben considerarse expuestas y rotarse antes de desplegar.
- Resultado: 82 pruebas pasan, 2 se omiten, cobertura 64%, Ruff/Bandit limpios,
  pip-audit sin vulnerabilidades conocidas y build Vite correcto.
