# Checklist de release

## Bloqueantes

- [ ] Rotar secretos que estuvieron en historia Git.
- [ ] Backup de Neon y `alembic upgrade head` hasta `c2d3e4f5a6b7`.
- [ ] `alembic current` y `alembic check` limpios contra el destino actualizado.
- [ ] E2E real: login por los cuatro roles, placa conocida/desconocida, aprobación
      manual, acceso entrada/salida, evidencia privada, cámara y barrera.
- [ ] Verificar Cloudinary autenticado, URL firmada y retención/purga.
- [ ] Dataset propio aprobado y métricas OCR/color/tipo por cámara y condición.

## Automatizados

- [x] `compileall`.
- [x] `pytest` completo y cobertura (63%).
- [x] Alembic `heads` (una cabeza: `c2d3e4f5a6b7`).
- [x] Ruff sin hallazgos.
- [x] Bandit sin hallazgos en código propio.
- [x] pip-audit sin vulnerabilidades conocidas.
- [x] Build Vite.
- [x] `verify-project.ps1` con entorno local.
- [x] `smoke-local.ps1`: analyze 200, health `ok`, 34 rutas y puerto liberado.
- [ ] npm audit sin avisos: quedan 2 entradas por el mismo advisory RSC no aplicable
      al SPA; revaluar al publicarse una versión corregida.

## Decisión

**NO-GO para producción** hasta completar todos los bloqueantes. El estado es apto
para continuar pruebas locales/preproducción controlada, no para despliegue final.
