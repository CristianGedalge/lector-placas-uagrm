import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const { user, authLoading, signInLoading, signIn } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <main className="auth-screen">
        <Loader label="Verificando sesion..." />
      </main>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await signIn(formData);
    } catch (submitError) {
      setError(submitError.message || "No se pudo iniciar sesion.");
      console.error(submitError);
    }
  };

  return (
    <main className="auth-screen auth-screen-simple">
      <form className="card auth-card auth-card-compact" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">SIARP</p>
          <h2>Iniciar sesion</h2>
          <p className="muted-text">
            Usa tus credenciales para entrar al panel administrativo.
          </p>
        </div>

        <label className="field-group">
          <span>Correo institucional</span>
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
          <span>Contrasena</span>
          <input
            type="password"
            placeholder="Ingresa tu contrasena"
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

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={signInLoading}>
          {signInLoading ? "Ingresando..." : "Entrar al sistema"}
        </button>

        <p className="helper-text">
          No tienes cuenta?{" "}
          <Link className="text-link" to="/registro">
            Crear cuenta
          </Link>
        </p>
      </form>
    </main>
  );
}

export default Login;
