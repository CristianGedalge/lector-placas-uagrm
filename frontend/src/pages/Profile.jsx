import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { deleteProfilePhoto, getMediaUrl, uploadProfilePhoto } from "../api/auth";

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
  const [isEditing, setIsEditing] = useState(false);

  const syncFormWithUser = (sourceUser = user) => {
    if (sourceUser) {
      setFormData({
        nombre: sourceUser.nombre || "",
        apellido_paterno: sourceUser.apellido_paterno || "",
        apellido_materno: sourceUser.apellido_materno || "",
        carnet: sourceUser.carnet || "",
        contrasena: ""
      });
    }
  };

  useEffect(() => {
    syncFormWithUser(user);
  }, [user]);

  useEffect(() => {
    if (!user?.foto_id) {
      setPhotoUrl("");
      return;
    }
    getMediaUrl(user.foto_id).then((result) => setPhotoUrl(result.url)).catch(() => setPhotoUrl(""));
  }, [user?.foto_id]);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    setPhotoSaving(true);
    setError("");
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
    await deleteProfilePhoto(user.id);
    setPhotoUrl("");
    await refreshProfile();
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

  const handleCancel = () => {
    setError("");
    setMessage("");
    syncFormWithUser();
    setIsEditing(false);
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
      setIsEditing(false);
    } catch (submitError) {
      setError(submitError.mensaje || "No se pudo actualizar el perfil.");
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Se desactivara tu cuenta y cerrara la sesion. Quieres continuar?"
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await removeProfile();
      navigate("/login", { replace: true });
    } catch (submitError) {
      setError(submitError.mensaje || "No se pudo eliminar el perfil.");
    }
  };

  return (
    <section className="card page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h3>Perfil</h3>
        </div>
        {!isEditing && (
          <button type="button" className="ghost-button" onClick={() => setIsEditing(true)} aria-label="Editar perfil">
            Editar
          </button>
        )}
      </div>

      <form className="registration-form" onSubmit={handleSubmit}>
        <div className="form-block">
          <h4>Foto privada</h4>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {photoUrl ? (
              <img
                className="vehicle-photo"
                src={photoUrl}
                alt={`Foto de perfil de ${user?.nombre || "usuario"}`}
                style={{ width: "128px", height: "128px", maxWidth: "128px", marginBottom: 0, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                aria-label="Sin foto de perfil"
                style={{ width: "128px", height: "128px", borderRadius: "50%", display: "grid", placeItems: "center", background: "#e8eef7", color: "#153e75", fontSize: "2.5rem", fontWeight: 700 }}
              >
                {(user?.nombre || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <p className="muted-text" style={{ margin: 0 }}>
              {isEditing
                ? "Puedes actualizar tu foto y tus datos personales."
                : "Aquí puedes ver tus datos actuales. Activa la edición para modificarlos."}
            </p>
          </div>
          {isEditing && (
            <>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} disabled={photoSaving} />
              {user?.foto_id && <button type="button" className="ghost-button" onClick={handleDeletePhoto}>Eliminar foto</button>}
            </>
          )}
        </div>
        <div className="details-grid">
          <label className="field-group">
            <span>Nombre</span>
            {isEditing ? (
              <input value={formData.nombre} onChange={handleChange("nombre")} required />
            ) : (
              <div className="muted-text" style={{ paddingTop: "0.25rem" }}>{formData.nombre || "Sin información"}</div>
            )}
          </label>

          <label className="field-group">
            <span>Apellido Paterno</span>
            {isEditing ? (
              <input value={formData.apellido_paterno} onChange={handleChange("apellido_paterno")} required />
            ) : (
              <div className="muted-text" style={{ paddingTop: "0.25rem" }}>{formData.apellido_paterno || "Sin información"}</div>
            )}
          </label>

          <label className="field-group">
            <span>Apellido Materno</span>
            {isEditing ? (
              <input value={formData.apellido_materno} onChange={handleChange("apellido_materno")} />
            ) : (
              <div className="muted-text" style={{ paddingTop: "0.25rem" }}>{formData.apellido_materno || "Sin información"}</div>
            )}
          </label>

          <label className="field-group">
            <span>Carnet</span>
            {isEditing ? (
              <input value={formData.carnet} onChange={handleChange("carnet")} required />
            ) : (
              <div className="muted-text" style={{ paddingTop: "0.25rem" }}>{formData.carnet || "Sin información"}</div>
            )}
          </label>

          {isEditing && (
            <label className="field-group">
              <span>Nueva contrasena</span>
              <input
                type="password"
                placeholder="Deja vacio si no deseas cambiarla"
                value={formData.contrasena}
                onChange={handleChange("contrasena")}
              />
            </label>
          )}
        </div>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="danger-button" onClick={handleDelete}>
            Desactivar cuenta
          </button>
          {isEditing ? (
            <>
              <button type="button" className="ghost-button" onClick={handleCancel}>
                Cancelar
              </button>
              <button type="submit" disabled={profileSaving}>
                {profileSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          ) : null}
        </div>
      </form>
    </section>
  );
}

export default Profile;

