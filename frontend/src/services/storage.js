const AUTH_KEY = "lector_placas_session";

export function saveSession(session) {
  // Solo guardamos el usuario, NO el token.
  // El token viaja en cookie httpOnly (más seguro contra XSS).
  // El backend la setea en /login y la lee automáticamente.
  const safeSession = { user: session.user };
  localStorage.setItem(AUTH_KEY, JSON.stringify(safeSession));
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
