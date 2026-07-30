const AUTH_KEY = "lector_placas_session";

export function saveSession(session) {
  // Guardamos usuario y token para soportar Authorization: Bearer token en cross-origin
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function readSession() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}
