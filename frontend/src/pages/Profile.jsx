import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { deleteProfilePhoto, getMediaUrl, uploadProfilePhoto } from "../api/auth";
import ConfirmModal from "../components/ConfirmModal";

function Profile() {
  const navigate = useNavigate();
  const { user, refreshProfile, saveProfile, removeProfile, profileSaving } = useAuth();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    carnet: "",
    contrasena: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmColor: "var(--color-primary)",
    onConfirm: null
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || "",
        apellido_paterno: user.apellido_paterno || "",
        apellido_materno: user.apellido_materno || "",
        carnet: user.carnet || "",
        contrasena: ""
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user?.foto_id) {
      setPhotoUrl("");
      return;
    }
    getMediaUrl(user.foto_id)
      .then((result) => setPhotoUrl(result.url))
      .catch(() => setPhotoUrl(""));
  }, [user?.foto_id]);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    setPhotoSaving(true);
    setError("");
    setMessage("");
    try {
      await uploadProfilePhoto(user.id, file);
      await refreshProfile();
      setMessage("Foto de perfil actualizada.");
    } catch (photoError) {
      const detail = photoError?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item?.msg).filter(Boolean).join(". ")
        : detail;
      setError(message || "No se pudo actualizar la foto.");
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.id) return;
    setConfirmConfig({
      isOpen: true,
      title: "Eliminar Foto de Perfil",
      message: "¿Estás seguro de que deseas eliminar tu foto de perfil?",
      confirmColor: "var(--color-danger, #ef4444)",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setPhotoSaving(true);
          await deleteProfilePhoto(user.id);
          setPhotoUrl("");
          await refreshProfile();
          setMessage("Foto de perfil eliminada.");
        } catch (photoError) {
          setError("No se pudo eliminar la foto de perfil.");
        } finally {
          setPhotoSaving(false);
        }
      }
    });
  };

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, []);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await saveProfile({
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno,
        carnet: formData.carnet,
        contrasena: formData.contrasena || undefined
      });
      setFormData((current) => ({ ...current, contrasena: "" }));
      setMessage("Perfil actualizado correctamente.");
    } catch (submitError) {
      setError(submitError.mensaje || "No se pudo actualizar el perfil.");
    }
  };

  const handleDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Desactivar Cuenta",
      message: "Se desactivará tu cuenta y cerrará la sesión. ¿Quieres continuar?",
      confirmColor: "var(--color-danger, #ef4444)",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setError("");
          setMessage("");
          await removeProfile();
          navigate("/login", { replace: true });
        } catch (submitError) {
          setError(submitError.mensaje || "No se pudo desactivar la cuenta.");
        }
      }
    });
  };

  return (
    <div className="page-stack">
      {/* Tarjeta de Perfil Unificada */}
      <div 
        className="card" 
        style={{ 
          padding: 0, 
          overflow: "hidden", 
          borderRadius: "16px", 
          border: "1px solid rgba(21, 62, 117, 0.08)",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
        }}
      >
        {/* Banner de Cabecera con Gradiente */}
        <div 
          style={{ 
            height: "120px", 
            background: "linear-gradient(135deg, #153e75 0%, #1e40af 100%)",
            position: "relative"
          }}
        />

        {/* Contenido Principal con Layout Dividido */}
        <div 
          style={{ 
            padding: "2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2.5rem",
            position: "relative",
            marginTop: "-60px"
          }}
        >
          {/* Columna Izquierda: Foto de Perfil y Resumen */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            {/* Foto Circular con Overlay de Edición */}
            <div 
              style={{ 
                position: "relative",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "#f1f5f9",
                border: "4px solid #ffffff",
                boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                overflow: "hidden",
                cursor: "pointer",
                marginBottom: "1rem"
              }}
              title="Cambiar foto de perfil"
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Avatar" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e8f0", color: "#64748b" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              )}

              {/* Input de archivo transparente */}
              <input 
                type="file" 
                accept="image/jpeg,image/png,image/webp" 
                onChange={handlePhoto} 
                disabled={photoSaving}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                  zIndex: 3
                }}
              />
              
              {/* Overlay hover */}
              <div 
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "35%",
                  background: "rgba(0, 0, 0, 0.6)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  pointerEvents: "none"
                }}
              >
                SUBIR
              </div>
            </div>

            {/* Nombre y Rol */}
            <h3 style={{ margin: "0.25rem 0", fontSize: "1.35rem", fontWeight: "700", color: "#1e293b" }}>
              {user?.nombre} {user?.apellido_paterno}
            </h3>
            <span 
              style={{
                background: "#eff6ff",
                color: "#1e40af",
                padding: "0.3rem 0.8rem",
                borderRadius: "20px",
                fontSize: "0.8rem",
                fontWeight: "700",
                letterSpacing: "0.05em",
                marginBottom: "1.5rem",
                textTransform: "uppercase"
              }}
            >
              {user?.rol === "USUARIO" ? "Estudiante / Docente" : user?.rol}
            </span>

            {/* Botón de Borrar Foto */}
            {user?.foto_id && (
              <button 
                type="button" 
                className="ghost-button" 
                onClick={handleDeletePhoto}
                disabled={photoSaving}
                style={{ color: "#ef4444", border: "1px dashed #fecaca", padding: "0.5rem 1rem", fontSize: "0.85rem", borderRadius: "8px", width: "100%", maxWidth: "200px" }}
              >
                Eliminar foto actual
              </button>
            )}

            {/* Botón de Desactivar Cuenta */}
            {user?.rol === "ADMINISTRADOR" && (
              <div style={{ marginTop: "auto", paddingTop: "2rem", width: "100%" }}>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
                  <button 
                    type="button" 
                    className="danger-button" 
                    onClick={handleDelete}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", fontWeight: "600", fontSize: "0.9rem" }}
                  >
                    Desactivar Cuenta
                  </button>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" }}>
                    Tu cuenta será inhabilitada temporalmente en el sistema.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Columna Derecha: Formulario de Configuración */}
          <div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h4 style={{ margin: "0 0 1rem 0", color: "#64748b", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>Información Personal</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <label className="field-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Nombre</span>
                    <input value={formData.nombre} onChange={handleChange("nombre")} required style={{ borderRadius: "8px" }} />
                  </label>

                  <label className="field-group">
                    <span>Apellido Paterno</span>
                    <input value={formData.apellido_paterno} onChange={handleChange("apellido_paterno")} required style={{ borderRadius: "8px" }} />
                  </label>

                  <label className="field-group">
                    <span>Apellido Materno</span>
                    <input value={formData.apellido_materno} onChange={handleChange("apellido_materno")} style={{ borderRadius: "8px" }} />
                  </label>

                  <label className="field-group" style={{ gridColumn: "1 / -1" }}>
                    <span>Registro Universitario / Carnet de Identidad</span>
                    <input 
                      value={formData.carnet} 
                      onChange={handleChange("carnet")} 
                      required 
                      style={{ borderRadius: "8px" }} 
                      placeholder="Ej: 219213100 o 8429182"
                    />
                    <span style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px", display: "block", lineHeight: "1.3" }}>
                      Este identificador (RU o CI) sirve para validar tu pertenencia activa a la universidad y autorizar el ingreso automático de tus vehículos por las cámaras.
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h4 style={{ margin: "0 0 1rem 0", color: "#64748b", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #f1f5f9", paddingBottom: "0.5rem" }}>Seguridad</h4>
                <label className="field-group">
                  <span>Nueva Contraseña</span>
                  <input
                    type="password"
                    placeholder="Deja vacío si no deseas cambiarla"
                    value={formData.contrasena}
                    onChange={handleChange("contrasena")}
                    style={{ borderRadius: "8px" }}
                  />
                </label>
              </div>

              {message && <div style={{ background: "#e6ffe6", border: "1px solid green", color: "green", padding: "0.75rem", borderRadius: "8px", fontWeight: "bold", textAlign: "center" }}>{message}</div>}
              {error && <div style={{ background: "#ffe6e6", border: "1px solid red", color: "red", padding: "0.75rem", borderRadius: "8px", fontWeight: "bold", textAlign: "center" }}>{error}</div>}

              <button 
                type="submit" 
                disabled={profileSaving}
                style={{ 
                  width: "100%", 
                  padding: "0.85rem", 
                  borderRadius: "8px", 
                  fontWeight: "700", 
                  fontSize: "1rem", 
                  background: "var(--color-primary)",
                  color: "#ffffff"
                }}
              >
                {profileSaving ? "Guardando cambios..." : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmColor={confirmConfig.confirmColor}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  );
}

export default Profile;
