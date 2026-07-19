import { useEffect, useState, useCallback, memo } from "react";
import Loader from "../components/Loader";
import { listUsers, updateUserByAdmin, deleteUserByAdmin, registerUser } from "../api/auth";

const CAREER_OPTIONS = [
  "Ingenieria en Redes",
  "Ingenieria Informatica",
  "Ingenieria en Sistemas",
  "Ingenieria Robotica"
];

const UserRow = memo(({ user, handleRoleToggle, handleStatusToggle, handleDelete }) => (
  <tr style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
    <td style={{ padding: "1rem", fontWeight: "bold" }}>{user.full_name}</td>
    <td style={{ padding: "1rem" }}>{user.email}</td>
    <td style={{ padding: "1rem" }}>{user.code || "N/A"}</td>
    <td style={{ padding: "1rem" }}>
      <span style={{
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
        background: user.role === "ADMIN" ? "#ffe6e6" : "#e6f2ff",
        color: user.role === "ADMIN" ? "#b22234" : "#153e75"
      }}>
        {user.role === "ADMIN" ? "ADMINISTRADOR" : "OPERADOR"}
      </span>
    </td>
    <td style={{ padding: "1rem", textTransform: "capitalize" }}>
      {String(user.catalog_role || "").toLowerCase() || "N/A"}
    </td>
    <td style={{ padding: "1rem" }}>
      <span style={{
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
        background: user.is_active ? "#e6ffe6" : "#f2f2f2",
        color: user.is_active ? "green" : "#666"
      }}>
        {user.is_active ? "ACTIVO" : "INACTIVO"}
      </span>
    </td>
    <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={() => handleRoleToggle(user)}
        style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: "var(--color-primary)" }}
      >
        Cambiar Acceso
      </button>
      <button
        type="button"
        onClick={() => handleStatusToggle(user)}
        style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: user.is_active ? "#f2a104" : "green" }}
      >
        {user.is_active ? "Desactivar" : "Activar"}
      </button>
      <button
        type="button"
        className="danger-button"
        onClick={() => handleDelete(user.id)}
        style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
      >
        Eliminar
      </button>
    </td>
  </tr>
));

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Registro nuevo usuario
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
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

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listUsers();
      setUsers(data || []);
    } catch (err) {
      setError("No se pudo cargar la lista de usuarios.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleToggle = useCallback(async (user) => {
    const nextRole = user.role === "ADMIN" ? "OPERATOR" : "ADMIN";
    try {
      setError("");
      setSuccess("");
      await updateUserByAdmin(user.id, {
        role: nextRole,
        is_active: user.is_active,
        status: user.status
      });
      setSuccess(`Rol del usuario ${user.full_name} cambiado a ${nextRole === "ADMIN" ? "ADMINISTRADOR" : "OPERADOR"} con éxito.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el rol del usuario.");
    }
  }, [fetchUsers]);

  const handleStatusToggle = useCallback(async (user) => {
    const nextActive = !user.is_active;
    try {
      setError("");
      setSuccess("");
      await updateUserByAdmin(user.id, {
        role: user.role,
        is_active: nextActive,
        status: nextActive ? "ACTIVE" : "INACTIVE"
      });
      setSuccess(`Estado del usuario ${user.full_name} cambiado a ${nextActive ? "ACTIVO" : "INACTIVO"}.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el estado del usuario.");
    }
  }, [fetchUsers]);

  const handleDelete = useCallback(async (userId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente este usuario? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await deleteUserByAdmin(userId);
      setSuccess("Usuario eliminado permanentemente.");
      fetchUsers();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el usuario.");
    }
  }, [fetchUsers]);

  const handleOpenRegister = () => {
    setRegisterForm({
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
    setError("");
    setSuccess("");
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setRegisterLoading(true);
      await registerUser({
        full_name: registerForm.full_name,
        email: registerForm.email,
        code: registerForm.code,
        role: registerForm.role,
        faculty: registerForm.role === "STUDENT" ? registerForm.faculty : null,
        contact_info: registerForm.contact_info,
        phone: registerForm.contact_info,
        password: registerForm.password,
        is_admin: registerForm.is_admin
      });

      setSuccess("Usuario registrado con éxito.");
      setShowRegisterModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || "No se pudo completar el registro del usuario.");
    } finally {
      setRegisterLoading(false);
    }
  };

  if (loading) {
    return <Loader label="Cargando usuarios del sistema..." />;
  }

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">Administracion</p>
        <h2>Gestionar Usuarios</h2>
        <p className="muted-text">
          Administra las cuentas de acceso al sistema (Administradores y Operadores de Seguridad).
        </p>
      </div>

      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="eyebrow">Cuentas del sistema</p>
          <h3>Lista de Operadores y Administradores</h3>
        </div>
        <button type="button" onClick={handleOpenRegister} style={{ padding: "0.6rem 1.2rem" }}>
          Registrar Nuevo Usuario
        </button>
      </div>

      {success && <p style={{ color: "green", fontWeight: "bold", background: "#e6ffe6", padding: "0.8rem", borderRadius: "8px", border: "1px solid green" }}>{success}</p>}
      {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
              <th style={{ padding: "1rem" }}>Nombre</th>
              <th style={{ padding: "1rem" }}>Correo</th>
              <th style={{ padding: "1rem" }}>Registro</th>
              <th style={{ padding: "1rem" }}>Acceso Sistema</th>
              <th style={{ padding: "1rem" }}>Tipo Persona</th>
              <th style={{ padding: "1rem" }}>Estado</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                handleRoleToggle={handleRoleToggle}
                handleStatusToggle={handleStatusToggle}
                handleDelete={handleDelete}
              />
            ))}
            {!users.length && (
              <tr>
                <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                  No hay usuarios registrados en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showRegisterModal && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleRegisterSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Creación</p>
                <h2>Registrar Nuevo Usuario</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setShowRegisterModal(false)}>
                Cerrar
              </button>
            </div>

            <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label className="field-group">
                <span>Nombre completo</span>
                <input
                  type="text"
                  placeholder="Tatiana Flores"
                  value={registerForm.full_name}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, full_name: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Correo Electrónico</span>
                <input
                  type="email"
                  placeholder="operador@uagrm.edu.bo"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, email: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Registro / Código Universitario</span>
                <input
                  type="text"
                  placeholder="202400123"
                  value={registerForm.code}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, code: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Clasificación de Persona</span>
                <select
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, role: e.target.value, faculty: e.target.value === "STUDENT" ? curr.faculty : "" }))}
                  required
                >
                  <option value="ADMINISTRATIVE">Administrativo</option>
                  <option value="STUDENT">Estudiante</option>
                  <option value="TEACHER">Docente</option>
                </select>
              </label>

              {registerForm.role === "STUDENT" && (
                <label className="field-group">
                  <span>Carrera</span>
                  <select
                    value={registerForm.faculty}
                    onChange={(e) => setRegisterForm((curr) => ({ ...curr, faculty: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona una carrera</option>
                    {CAREER_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field-group">
                <span>Teléfono / Contacto</span>
                <input
                  type="text"
                  placeholder="70000000"
                  value={registerForm.contact_info}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, contact_info: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, password: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, confirmPassword: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <input
                  type="checkbox"
                  checked={registerForm.is_admin}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, is_admin: e.target.checked }))}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: "bold", color: "#153e75", cursor: "pointer" }}>¿Asignar privilegios de ADMINISTRADOR del sistema?</span>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" disabled={registerLoading}>
                {registerLoading ? "Creando cuenta..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default Users;
