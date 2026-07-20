import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

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
      </div>

      <form className="registration-form" onSubmit={handleSubmit}>
        <div className="details-grid">
          <label className="field-group">
            <span>Nombre</span>
            <input value={formData.nombre} onChange={handleChange("nombre")} required />
          </label>

          <label className="field-group">
            <span>Apellido Paterno</span>
            <input value={formData.apellido_paterno} onChange={handleChange("apellido_paterno")} required />
          </label>

          <label className="field-group">
            <span>Apellido Materno</span>
            <input value={formData.apellido_materno} onChange={handleChange("apellido_materno")} />
          </label>

          <label className="field-group">
            <span>Carnet</span>
            <input value={formData.carnet} onChange={handleChange("carnet")} required />
          </label>

          <label className="field-group">
            <span>Nueva contrasena</span>
            <input
              type="password"
              placeholder="Deja vacio si no deseas cambiarla"
              value={formData.contrasena}
              onChange={handleChange("contrasena")}
            />
          </label>
        </div>

        {message && <p className="success-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="danger-button" onClick={handleDelete}>
            Desactivar cuenta
          </button>
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default Profile;

