import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";

const CAREER_OPTIONS = [
  "Ingenieria en Redes",
  "Ingenieria Informatica",
  "Ingenieria en Sistemas",
  "Ingenieria Robotica"
];

function Register() {
  const { user, authLoading, signUpLoading, signUp } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    code: "",
    role: "STUDENT",
    faculty: "",
    contact_info: "",
    password: "",
    confirmPassword: ""
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

    if (formData.password !== formData.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      await signUp({
        full_name: formData.full_name,
        email: formData.email,
        code: formData.code,
        role: formData.role,
        faculty: requiresFaculty ? formData.faculty : null,
        contact_info: formData.contact_info,
        phone: formData.contact_info,
        password: formData.password
      });
    } catch (submitError) {
      setError(submitError.message || "No se pudo completar el registro.");
      console.error(submitError);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-layout">
        <div className="auth-panel auth-copy">
          <p className="eyebrow">SIARP</p>
          <h1>Crea tu cuenta para empezar a operar en la plataforma</h1>
          <p className="auth-description">
            Registra usuarios administrativos para gestionar accesos, analizar
            placas y consultar reportes desde el dashboard.
          </p>
          <div className="auth-highlights">
            <div className="highlight-card">
              <strong>Acceso centralizado</strong>
              <span>Autenticacion unificada para login, historial y reportes.</span>
            </div>
            <div className="highlight-card">
              <strong>Preparado para JWT</strong>
              <span>Flujo listo para trabajar con backend real en FastAPI.</span>
            </div>
          </div>
        </div>

        <form className="card auth-panel auth-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Nuevo usuario</p>
            <h2>Crear cuenta</h2>
            <p className="muted-text">
              Completa todos los datos para crear un acceso dentro de la plataforma.
            </p>
          </div>

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
            <span>Correo</span>
            <input
              type="email"
              placeholder="admin@siarp.com"
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
            <span>Registro</span>
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
            <span>Telefono</span>
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
              placeholder="Repite tu contrasena"
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

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={signUpLoading}>
            {signUpLoading ? "Creando cuenta..." : "Registrarme"}
          </button>

          <p className="helper-text">
            Ya tienes cuenta?{" "}
            <Link className="text-link" to="/login">
              Inicia sesion
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Register;
