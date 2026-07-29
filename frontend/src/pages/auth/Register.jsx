import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import Loader from "../../components/Loader";
import { useAuth } from "../../hooks/useAuth";
import { registerUser } from "../../api/auth";

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
  const [errors, setErrors] = useState({});
  const [backendError, setBackendError] = useState("");

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

  const validateField = (name, value) => {
    let msg = "";
    if (name === "nombre") {
      if (!value.trim()) {
        msg = "El nombre es obligatorio.";
      } else if (value.trim().length < 2) {
        msg = "El nombre debe tener al menos 2 caracteres.";
      } else if (value.length > 120) {
        msg = "El nombre no puede exceder los 120 caracteres.";
      }
    } else if (name === "apellido_paterno") {
      if (!value.trim()) {
        msg = "El apellido de paterno es obligatorio.";
      } else if (value.trim().length < 2) {
        msg = "El apellido paterno debe tener al menos 2 caracteres.";
      } else if (value.length > 120) {
        msg = "El apellido paterno no puede exceder los 120 caracteres.";
      }
    } else if (name === "apellido_materno") {
      if (value && value.length > 120) {
        msg = "El apellido materno no puede exceder los 120 caracteres.";
      }
    } else if (name === "carnet") {
      if (!value.trim()) {
        msg = "El carnet de identidad (CI / Registro) es obligatorio.";
      } else if (value.trim().length < 5) {
        msg = "El carnet de identidad (CI / Registro) debe tener al menos 5 caracteres.";
      } else if (value.length > 50) {
        msg = "El carnet de identidad (CI / Registro) no puede exceder los 50 caracteres.";
      }
    } else if (name === "contrasena") {
      if (!value) {
        msg = "La contraseña es obligatoria.";
      } else if (value.length < 8) {
        msg = "La contraseña debe tener al menos 8 caracteres.";
      } else if (!/[A-Z]/.test(value)) {
        msg = "La contraseña debe contener al menos una letra mayúscula.";
      } else if (!/\d/.test(value)) {
        msg = "La contraseña debe contener al menos un número.";
      }
    } else if (name === "confirmPassword") {
      if (value !== formData.contrasena) {
        msg = "Las contraseñas no coinciden.";
      }
    }
    return msg;
  };

  const handleInputChange = (name, value) => {
    setFormData((current) => ({
      ...current,
      [name]: value
    }));

    const fieldError = validateField(name, value);
    setErrors((current) => ({
      ...current,
      [name]: fieldError
    }));

    // If password changed, re-validate confirm password
    if (name === "contrasena") {
      const confirmError = value === formData.confirmPassword ? "" : "Las contraseñas no coinciden.";
      setErrors((current) => ({
        ...current,
        confirmPassword: confirmError
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBackendError("");
    setSuccess("");

    // Validate all fields
    const formErrors = {};
    Object.keys(formData).forEach((key) => {
      const errorMsg = validateField(key, formData[key]);
      if (errorMsg) {
        formErrors[key] = errorMsg;
      }
    });

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setBackendError("Por favor, corrige los errores en el formulario antes de continuar.");
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
      setErrors({});
    } catch (submitError) {
      setBackendError(submitError.message || "No se pudo completar el registro.");
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
        {backendError && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{backendError}</p>}

        <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="field-group">
            <span>Nombre</span>
            <input
              type="text"
              placeholder="Tatiana"
              value={formData.nombre}
              onChange={(event) => handleInputChange("nombre", event.target.value)}
              className={errors.nombre ? "input-error" : ""}
              required
            />
            {errors.nombre && <span style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>{errors.nombre}</span>}
          </label>

          <label className="field-group">
            <span>Apellido Paterno</span>
            <input
              type="text"
              placeholder="Flores"
              value={formData.apellido_paterno}
              onChange={(event) => handleInputChange("apellido_paterno", event.target.value)}
              className={errors.apellido_paterno ? "input-error" : ""}
              required
            />
            {errors.apellido_paterno && <span style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>{errors.apellido_paterno}</span>}
          </label>

          <label className="field-group">
            <span>Apellido Materno (Opcional)</span>
            <input
              type="text"
              placeholder="Pérez"
              value={formData.apellido_materno}
              onChange={(event) => handleInputChange("apellido_materno", event.target.value)}
              className={errors.apellido_materno ? "input-error" : ""}
            />
            {errors.apellido_materno && <span style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>{errors.apellido_materno}</span>}
          </label>

          <label className="field-group">
            <span>Carnet de Identidad (CI / Registro)</span>
            <input
              type="text"
              placeholder="202400123"
              value={formData.carnet}
              onChange={(event) => handleInputChange("carnet", event.target.value)}
              className={errors.carnet ? "input-error" : ""}
              required
            />
            {errors.carnet && <span style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>{errors.carnet}</span>}
          </label>

          <label className="field-group">
            <span>Contraseña</span>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
              value={formData.contrasena}
              onChange={(event) => handleInputChange("contrasena", event.target.value)}
              className={errors.contrasena ? "input-error" : ""}
              required
            />
            {errors.contrasena && <span style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>{errors.contrasena}</span>}
          </label>

          <label className="field-group">
            <span>Confirmar Contraseña</span>
            <input
              type="password"
              placeholder="Repite la contraseña"
              value={formData.confirmPassword}
              onChange={(event) => handleInputChange("confirmPassword", event.target.value)}
              className={errors.confirmPassword ? "input-error" : ""}
              required
            />
            {errors.confirmPassword && <span style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>{errors.confirmPassword}</span>}
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", marginTop: "1rem" }}>
          <button type="submit" disabled={loading || Object.values(errors).some(e => e)} style={{ padding: "0.8rem 2rem" }}>
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

