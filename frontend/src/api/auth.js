import apiClient from "./axios";
import { readSession } from "../services/storage";

function mapAuthError(error, fallbackMessage) {
  if (error?.response?.data?.detail) {
    throw new Error(error.response.data.detail);
  }

  if (!error?.response) {
    throw new Error("No se pudo conectar con el backend. Verifica que FastAPI este encendido en el puerto 8000.");
  }

  if (error?.code === "ECONNABORTED") {
    throw new Error("El servidor tardo demasiado en responder.");
  }

  if (error?.message === "Network Error") {
    throw new Error("No se pudo conectar con el backend. Verifica que FastAPI este encendido.");
  }

  throw new Error(fallbackMessage);
}

function buildMockSession(credentials) {
  const phone = credentials?.phone || credentials?.contact_info || "70000000";
  return {
    user: {
      id: 1,
      full_name: credentials?.full_name || credentials?.email?.split("@")[0] || "Administrador",
      email: credentials?.email || "admin@placas.local",
      role: credentials?.role || "STUDENT",
      catalog_role: credentials?.catalog_role || credentials?.role || "ESTUDIANTE",
      status: "ACTIVE",
      code: credentials?.code || "REG-001",
      faculty: credentials?.faculty || "",
      phone,
      contact_info: phone
    },
    token: "demo-token"
  };
}

function normalizeSession(data, credentials) {
  if (data?.user && data?.token) {
    return {
      token: data.token,
      user: {
        ...data.user,
        full_name:
          data.user.full_name ||
          data.user.name ||
          credentials?.full_name ||
          credentials?.email?.split("@")[0] ||
          "Usuario",
        role: data.user.role || credentials?.role || "STUDENT",
        catalog_role: data.user.catalog_role || credentials?.catalog_role || null,
        status: data.user.status || "ACTIVE",
        code: data.user.code || credentials?.code || "No registrado",
        faculty: data.user.faculty || credentials?.faculty || "",
        phone:
          data.user.phone ||
          data.user.contact_info ||
          credentials?.phone ||
          credentials?.contact_info ||
          "No registrado",
        contact_info:
          data.user.contact_info ||
          data.user.phone ||
          credentials?.contact_info ||
          credentials?.phone ||
          "No registrado"
      }
    };
  }

  if (data?.access) {
    return {
      token: data.access,
      refreshToken: data.refresh,
      user: data.user || {
        id: data.id || 1,
        full_name:
          data.full_name ||
          data.name ||
          credentials?.full_name ||
          credentials?.email?.split("@")[0] ||
          "Usuario",
        email: data.email || credentials?.email || "usuario@siarp.local",
        role: data.role || credentials?.role || "STUDENT",
        catalog_role: data.catalog_role || credentials?.catalog_role || null,
        status: data.status || "ACTIVE",
        code: data.code || credentials?.code || "No registrado",
        faculty: data.faculty || credentials?.faculty || "",
        phone:
          data.phone ||
          data.contact_info ||
          credentials?.phone ||
          credentials?.contact_info ||
          "No registrado",
        contact_info:
          data.contact_info ||
          data.phone ||
          credentials?.contact_info ||
          credentials?.phone ||
          "No registrado"
      }
    };
  }

  return buildMockSession(credentials);
}

export async function loginUser(credentials) {
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";

  if (useMockAuth) {
    return Promise.resolve(buildMockSession(credentials));
  }

  try {
    const { data } = await apiClient.post("/auth/login", credentials);
    return normalizeSession(data, credentials);
  } catch (error) {
    mapAuthError(error, "No se pudo iniciar sesion.");
  }
}

export async function registerUser(payload) {
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";

  if (useMockAuth) {
    return Promise.resolve(buildMockSession(payload));
  }

  try {
    const { data } = await apiClient.post("/auth/register", payload);
    return normalizeSession(data, payload);
  } catch (error) {
    mapAuthError(error, "No se pudo completar el registro.");
  }
}

export async function getProfile() {
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";
  if (useMockAuth) {
    return readSession()?.user || buildMockSession().user;
  }

  try {
    const { data } = await apiClient.get("/auth/me");
    return data;
  } catch (error) {
    mapAuthError(error, "No se pudo cargar el perfil.");
  }
}

export async function updateProfile(payload) {
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";
  if (useMockAuth) {
    return {
      ...(readSession()?.user || buildMockSession().user),
      ...payload
    };
  }

  try {
    const { data } = await apiClient.put("/auth/me", payload);
    return data;
  } catch (error) {
    mapAuthError(error, "No se pudo actualizar el perfil.");
  }
}

export async function deleteProfile() {
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === "true";
  if (useMockAuth) {
    return true;
  }

  try {
    await apiClient.delete("/auth/me");
    return true;
  } catch (error) {
    mapAuthError(error, "No se pudo eliminar el perfil.");
  }
}

export async function logoutUser() {
  return Promise.resolve(true);
}
