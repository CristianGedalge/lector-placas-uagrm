import apiClient from "./axios";
import { readSession } from "../services/storage";

function mapAuthError(error, fallbackMessage) {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === "string") {
      throw new Error(detail);
    } else if (Array.isArray(detail)) {
      const msg = detail.map((d) => {
        let field = d.loc ? d.loc[d.loc.length - 1] : "campo";
        let message = d.msg || "Valor inválido";
        
        // Translate common field names
        const fieldTranslations = {
          nombre: "El nombre",
          apellido_paterno: "El apellido paterno",
          apellido_materno: "El apellido materno",
          carnet: "El carnet de identidad (CI)",
          contrasena: "La contraseña",
          rol: "El rol"
        };
        const friendlyField = fieldTranslations[field] || field;

        // Clean up and translate common Pydantic error messages
        if (message.startsWith("String should have at least")) {
          const match = message.match(/\d+/);
          const num = match ? match[0] : "8";
          return `${friendlyField} debe tener al menos ${num} caracteres.`;
        }
        if (message.startsWith("Value error, ")) {
          return message.replace("Value error, ", "");
        }
        if (message === "Field required") {
          return `${friendlyField} es obligatorio.`;
        }
        return `${friendlyField}: ${message}`;
      }).join(" ");
      throw new Error(msg);
    } else {
      throw new Error(JSON.stringify(detail));
    }
  }

  if (!error?.response) {
    throw new Error("No se pudo conectar con el backend. Verifica que FastAPI este encendido en el puerto 8000 o 8010.");
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
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000000",
      nombre: "Administrador",
      apellido_paterno: "Local",
      apellido_materno: "",
      carnet: credentials?.carnet || "1234567",
      rol: "ADMINISTRADOR",
      esta_activo: true,
      creado_el: new Date().toISOString()
    },
    token: "demo-token"
  };
}

function normalizeSession(data, credentials) {
  if (data?.user && data?.token) {
    return {
      token: data.token,
      user: data.user
    };
  }

  throw new Error("El servidor devolvió una respuesta de autenticación inválida. Contacta al administrador.");
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

export async function uploadProfilePhoto(userId, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post(`/v1/media/users/${userId}/photo`, form);
  return data;
}

export async function deleteProfilePhoto(userId) {
  await apiClient.delete(`/v1/media/users/${userId}/photo`);
}

export async function getMediaUrl(mediaId) {
  const { data } = await apiClient.get(`/v1/media/${mediaId}/url`);
  return data;
}

export async function logoutUser() {
  try {
    if (import.meta.env.VITE_USE_MOCK_AUTH !== "true") {
      await apiClient.post("/auth/logout");
    }
  } catch (error) {
    console.warn("Error al hacer logout en el backend:", error);
  }
  return true;
}

// Funciones de administración para usuarios
export async function listUsers() {
  try {
    const { data } = await apiClient.get("/auth/users");
    return data;
  } catch (error) {
    mapAuthError(error, "No se pudo cargar la lista de usuarios.");
  }
}

export async function updateUserByAdmin(userId, payload) {
  try {
    const { data } = await apiClient.put(`/auth/users/${userId}`, payload);
    return data;
  } catch (error) {
    mapAuthError(error, "No se pudo actualizar el usuario.");
  }
}

export async function deleteUserByAdmin(userId) {
  try {
    await apiClient.delete(`/auth/users/${userId}`);
    return true;
  } catch (error) {
    mapAuthError(error, "No se pudo eliminar el usuario.");
  }
}
