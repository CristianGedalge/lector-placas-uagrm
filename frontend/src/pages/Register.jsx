import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";
import { registerUser } from "../api/auth";

const CAREER_OPTIONS = [
  "Ingenieria en Redes",
  "Ingenieria Informatica",
  "Ingenieria en Sistemas",
  "Ingenieria Robotica"
];

function Register() {
  const { user, signIn, authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    code: "",
    role: "STUDENT",
    faculty: "",
    contact_info: "",
    password: "",
    confirmPassword: "",
    is_admin: false
  });
  const [error, setError] = useState("");
  const requiresFaculty = formData.role === "STUDENT";

  if (authLoading) {
    return (
      <main className="auth-screen">
        <Loader label="Preparando registro..." />
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        full_name: formData.full_name,
        email: formData.email,
        code: formData.code,
        role: formData.role,
        faculty: requiresFaculty ? formData.faculty : null,
        contact_info: formData.contact_info,
        phone: formData.contact_info,
        password: formData.password,
        is_admin: false
      });
      
      setSuccess("Operador registrado con éxito. Iniciando sesión...");
      
      // Auto login user
      await signIn({
        email: formData.email,
        password: formData.password
      });

      setFormData({
        full_name: "",
        email: "",
        code: "",
        role: "STUDENT",
        faculty: "",
        contact_info: "",
        password: "",
        confirmPassword: "",
        is_admin: false
      });
    } catch (submitError) {
      setError(submitError.message || "No se pudo completar el registro.");
      console.error(submitError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-stack" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="hero card">
        <p className="eyebrow">Administracion</p>
        <h2>Registrar Operador</h2>
        <p className="muted-text">
          Completa todos los datos para crear una nueva cuenta de Operador.
        </p>
      </div>

      <form className="card registration-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {success && <p style={{ color: "green", fontWeight: "bold", background: "#e6ffe6", padding: "0.8rem", borderRadius: "8px", border: "1px solid green" }}>{success}</p>}
        {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

        <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="field-group">
            <span>Nombre completo</span>
            <input
              type="text"
              placeholder="Tatiana Flores"
              value={formData.full_name}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  full_name: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Correo Electronico</span>
            <input
              type="email"
              placeholder="operador@siarp.com"
              value={formData.email}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  email: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Registro / Codigo Universitario</span>
            <input
              type="text"
              placeholder="202400123"
              value={formData.code}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  code: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Tipo de Persona (Rol Catalogo)</span>
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
              <select
                value={formData.faculty}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    faculty: event.target.value
                  }))
                }
                required
              >
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
            <span>Telefono / Contacto</span>
            <input
              type="text"
              placeholder="70000000"
              value={formData.contact_info}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  contact_info: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Contrasena</span>
            <input
              type="password"
              placeholder="Minimo 6 caracteres"
              value={formData.password}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  password: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Confirmar contrasena</span>
            <input
              type="password"
              placeholder="Repite la contrasena"
              value={formData.confirmPassword}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  confirmPassword: event.target.value
                }))
              }
              required
            />
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginTop: "1rem" }}>
          <button type="submit" disabled={loading} style={{ padding: "0.8rem 2rem" }}>
            {loading ? "Creando cuenta..." : "Crear cuenta de Operador"}
          </button>
          
          <p className="helper-text" style={{ margin: 0 }}>
            ¿Ya tienes cuenta?{" "}
            <Link className="text-link" to="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </form>
    </section>
  );
}

export default Register;
