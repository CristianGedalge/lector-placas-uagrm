import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

const CAREER_OPTIONS = [
  "Ingenieria en Redes",
  "Ingenieria Informatica",
  "Ingenieria en Sistemas",
  "Ingenieria Robotica"
];

function mapRoleToFormValue(user) {
  const rawRole = user?.catalog_role || user?.role || "ESTUDIANTE";
  if (rawRole === "ADMINISTRATIVO" || rawRole === "ADMIN") {
    return "ADMINISTRATIVE";
  }
  if (rawRole === "DOCENTE" || rawRole === "TEACHER") {
    return "TEACHER";
  }
  return "STUDENT";
}

function Profile() {
  const navigate = useNavigate();
  const { user, refreshProfile, saveProfile, removeProfile, profileSaving } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    code: "",
    role: "STUDENT",
    faculty: "",
    phone: "",
    password: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requiresFaculty = formData.role === "STUDENT";

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || user.name || "",
        email: user.email || "",
        code: user.code || "",
        role: mapRoleToFormValue(user),
        faculty: user.faculty || "",
        phone: user.phone || user.contact_info || "",
        password: ""
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
        full_name: formData.full_name,
        email: formData.email,
        code: formData.code,
        role: formData.role,
        faculty: requiresFaculty ? formData.faculty : null,
        phone: formData.phone,
        contact_info: formData.phone,
        password: formData.password || undefined
      });
      setFormData((current) => ({ ...current, password: "" }));
      setMessage("Perfil actualizado correctamente.");
    } catch (submitError) {
      setError(submitError.message || "No se pudo actualizar el perfil.");
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
      setError(submitError.message || "No se pudo eliminar el perfil.");
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
            <span>Nombre completo</span>
            <input value={formData.full_name} onChange={handleChange("full_name")} required />
          </label>

          <label className="field-group">
            <span>Correo</span>
            <input
              type="email"
              value={formData.email}
              onChange={handleChange("email")}
              required
            />
          </label>

          <label className="field-group">
            <span>Registro</span>
            <input value={formData.code} onChange={handleChange("code")} required />
          </label>

          <label className="field-group">
            <span>Rol</span>
            <select
              value={formData.role}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  role: event.target.value,
                  faculty: event.target.value === "STUDENT" ? current.faculty : ""
                }))
              }
              required
            >
              <option value="ADMINISTRATIVE">Administrativo</option>
              <option value="STUDENT">Estudiante</option>
              <option value="TEACHER">Docente</option>
            </select>
          </label>

          {requiresFaculty && (
            <label className="field-group">
              <span>Carrera</span>
              <select value={formData.faculty} onChange={handleChange("faculty")} required>
                <option value="">Selecciona una carrera</option>
                {CAREER_OPTIONS.map((career) => (
                  <option key={career} value={career}>
                    {career}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field-group">
            <span>Telefono</span>
            <input value={formData.phone} onChange={handleChange("phone")} required />
          </label>

          <label className="field-group">
            <span>Nueva contrasena</span>
            <input
              type="password"
              placeholder="Deja vacio si no deseas cambiarla"
              value={formData.password}
              onChange={handleChange("password")}
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
