const AUTH_KEY = "lector_placas_session";

export function saveSession(session) {
  // Guardamos el usuario y el token de sesión
  const safeSession = { user: session.user, token: session.token };
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
