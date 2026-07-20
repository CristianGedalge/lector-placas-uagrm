import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";
import { registerUser } from "../api/auth";

function Register() {
  const { user, signIn, authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    carnet: "",
    contrasena: "",
    confirmPassword: "",
    rol: "USUARIO"
  });
  const [error, setError] = useState("");

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

    if (formData.contrasena !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno || null,
        carnet: formData.carnet,
        contrasena: formData.contrasena,
        rol: formData.rol
      });
      
      setSuccess("Operador registrado con éxito. Iniciando sesión...");
      
      // Auto login user
      await signIn({
        carnet: formData.carnet,
        contrasena: formData.contrasena
      });

      setFormData({
        nombre: "",
        apellido_paterno: "",
        apellido_materno: "",
        carnet: "",
        contrasena: "",
        confirmPassword: "",
        rol: "USUARIO"
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
        <p className="eyebrow">Administración</p>
        <h2>Registrar Nuevo Usuario</h2>
        <p className="muted-text">
          Completa todos los datos para crear una nueva cuenta en el sistema.
        </p>
      </div>

      <form className="card registration-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {success && <p style={{ color: "green", fontWeight: "bold", background: "#e6ffe6", padding: "0.8rem", borderRadius: "8px", border: "1px solid green" }}>{success}</p>}
        {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

        <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="field-group">
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Tatiana"
              value={formData.nombre}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  nombre: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Apellido Paterno</span>
            <input
              type="text"
              placeholder="Flores"
              value={formData.apellido_paterno}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  apellido_paterno: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Apellido Materno (Opcional)</span>
            <input
              type="text"
              placeholder="Pérez"
              value={formData.apellido_materno}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  apellido_materno: event.target.value
                }))
              }
            />
          </label>

          <label className="field-group">
            <span>Carnet de Identidad (CI / Registro)</span>
            <input
              type="text"
              placeholder="202400123"
              value={formData.carnet}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  carnet: event.target.value
                }))
              }
              required
            />
          </label>



          <label className="field-group">
            <span>Contraseña</span>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
              value={formData.contrasena}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  contrasena: event.target.value
                }))
              }
              required
            />
          </label>

          <label className="field-group">
            <span>Confirmar Contraseña</span>
            <input
              type="password"
              placeholder="Repite la contraseña"
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
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
