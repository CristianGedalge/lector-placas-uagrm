/**
 * USA-002: Parseador centralizado de errores de la API.
 * Transforma los mensajes técnicos de FastAPI en mensajes
 * comprensibles para el usuario final.
 */

const KNOWN_MESSAGES = {
  // Autenticación
  "Incorrect username or password": "Correo electrónico o contraseña incorrectos.",
  "Could not validate credentials": "Tu sesión ha expirado. Por favor inicia sesión de nuevo.",
  "Not authenticated": "Debes iniciar sesión para continuar.",
  "Inactive user": "Tu cuenta está desactivada. Contacta al administrador.",
  // Vehículos
  "Esta placa ya se encuentra registrada en el sistema.": "Esa placa ya existe en el sistema.",
  "El documento de identidad (CI) ya está registrado para otra persona.": "Ese número de CI ya pertenece a otra persona.",
  "Vehiculo no encontrado.": "El vehículo no fue encontrado.",
  "No se pueden registrar vehiculos a nombre de una persona inactiva.": "No puedes registrar vehículos para personas inactivas.",
  // Accesos
  "El vehículo no está registrado en el sistema.": "El vehículo no está registrado.",
  "Solo puedes registrar accesos de vehículos bajo tu cuenta.": "Solo puedes registrar accesos de tus propios vehículos.",
  "Solo un administrador puede registrar salidas manualmente.": "Solo el administrador puede registrar salidas manualmente.",
  "Solo el propietario del vehículo o un administrador puede registrar la salida.": "Solo el propietario o un administrador puede registrar la salida.",
  // OCR
  "El motor OCR no está disponible en este momento. Intenta nuevamente en unos instantes.": "El sistema de lectura de placas no está disponible. Intenta en un momento.",
  // Rate limit
  "Too Many Requests": "Demasiadas solicitudes. Espera un momento antes de continuar.",
  // Permisos
  "No tienes permiso para ver los detalles de este vehículo.": "No tienes acceso a ese vehículo.",
  "Solo puedes registrar vehículos a tu propio nombre.": "Solo puedes registrar vehículos a tu nombre.",
};

/**
 * Extrae el mensaje legible de un error de axios/fetch.
 * @param {unknown} err - El error capturado en un bloque catch
 * @param {string} fallback - Mensaje por defecto si no se puede identificar
 * @returns {string} Mensaje humanizado para mostrar al usuario
 */
export function parseApiError(err, fallback = "Ocurrió un error inesperado. Intenta de nuevo.") {
  if (!err) return fallback;

  // Axios: err.response.data.detail (FastAPI standard)
  const detail = err?.response?.data?.detail;

  if (detail) {
    // FastAPI puede retornar el detail como array de validation errors
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
    }
    // String directo
    if (typeof detail === "string") {
      return KNOWN_MESSAGES[detail] ?? detail;
    }
  }

  // Error de red o timeout
  if (err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
    return "Sin conexión con el servidor. Verifica tu red e intenta de nuevo.";
  }

  // Error message genérico
  if (err?.message && typeof err.message === "string") {
    return KNOWN_MESSAGES[err.message] ?? err.message;
  }

  return fallback;
}

export default parseApiError;
