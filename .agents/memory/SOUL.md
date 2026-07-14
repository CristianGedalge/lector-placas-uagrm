# SOUL

Reglas inmutables del negocio y del alpha actual.

1. Ninguna placa se registra automaticamente solo por OCR.
2. Toda placa nueva requiere confirmacion y registro manual explicito.
3. Si la placa existe, el sistema devuelve los datos del vehiculo y su propietario.
4. Si la placa no existe, se solicita codigo universitario antes de registrar.
5. El codigo debe pertenecer a un estudiante, docente o administrativo valido y activo.
6. Un codigo invalido o inactivo bloquea el registro.
7. El backend siempre vuelve a validar las reglas criticas aunque el frontend ya las haya validado.
8. La placa debe ser unica en base de datos.
9. Deteccion de baja confianza u OCR invalido implica revision manual.
