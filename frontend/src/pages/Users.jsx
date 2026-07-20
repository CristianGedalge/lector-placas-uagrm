import { useEffect, useState, useCallback, memo } from "react";
import Loader from "../components/Loader";
import ConfirmModal from "../components/ConfirmModal";
import { listUsers, updateUserByAdmin, deleteUserByAdmin, registerUser } from "../api/auth";

const UserRow = memo(({ user, handleRoleToggle, handleStatusToggle, handleDelete, handleEdit }) => (
  <tr style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
    <td style={{ padding: "1rem", fontWeight: "bold" }}>
      {user.nombre} {user.apellido_paterno} {user.apellido_materno || ""}
    </td>
    <td style={{ padding: "1rem", fontFamily: "monospace", color: "#153e75", fontWeight: "bold" }}>
      {user.carnet}
    </td>
    <td style={{ padding: "1rem" }}>
      <span style={{
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
        background: user.rol === "ADMINISTRADOR" ? "#ffe6e6" : user.rol === "OPERADOR" ? "#e6f2ff" : user.rol === "DISPOSITIVO" ? "#fef3c7" : "#e2e8f0",
        color: user.rol === "ADMINISTRADOR" ? "#b22234" : user.rol === "OPERADOR" ? "#153e75" : user.rol === "DISPOSITIVO" ? "#d97706" : "#475569"
      }}>
        {user.rol}
      </span>
    </td>
    <td style={{ padding: "1rem" }}>
      <span style={{
        padding: "0.25rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: "bold",
        background: user.esta_activo ? "#e6ffe6" : "#f2f2f2",
        color: user.esta_activo ? "green" : "#666"
      }}>
        {user.esta_activo ? "ACTIVO" : "INACTIVO"}
      </span>
    </td>
    <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={() => handleEdit(user)}
        style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: "var(--color-primary)" }}
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => handleStatusToggle(user)}
        style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: user.esta_activo ? "#f2a104" : "green" }}
      >
        {user.esta_activo ? "Desactivar" : "Activar"}
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
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    carnet: "",
    contrasena: "",
    confirmPassword: "",
    rol: "OPERADOR"
  });

  // Edición usuario
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    carnet: "",
    rol: "OPERADOR",
    esta_activo: true
  });

  // Modal de confirmación
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmColor: "var(--color-primary)",
    onConfirm: null
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

  const handleRoleToggle = useCallback((user) => {
    const nextRole = user.rol === "ADMINISTRADOR" ? "OPERADOR" : "ADMINISTRADOR";
    setConfirmConfig({
      isOpen: true,
      title: "Cambiar Rol de Usuario",
      message: `¿Estás seguro de que deseas cambiar el rol del usuario ${user.nombre} a ${nextRole}?`,
      confirmColor: "var(--color-primary)",
      onConfirm: async () => {
        try {
          setError("");
          setSuccess("");
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          await updateUserByAdmin(user.id, {
            nombre: user.nombre,
            apellido_paterno: user.apellido_paterno,
            apellido_materno: user.apellido_materno,
            carnet: user.carnet,
            rol: nextRole,
            esta_activo: user.esta_activo
          });
          setSuccess(`Rol del usuario ${user.nombre} cambiado a ${nextRole} con éxito.`);
          fetchUsers();
        } catch (err) {
          setError(err.message || "No se pudo actualizar el rol del usuario.");
        }
      }
    });
  }, [fetchUsers]);

  const handleStatusToggle = useCallback((user) => {
    const nextActive = !user.esta_activo;
    setConfirmConfig({
      isOpen: true,
      title: nextActive ? "Activar Usuario" : "Desactivar Usuario",
      message: `¿Estás seguro de que deseas ${nextActive ? "ACTIVAR" : "DESACTIVAR"} al usuario ${user.nombre}?`,
      confirmColor: nextActive ? "green" : "#f2a104",
      onConfirm: async () => {
        try {
          setError("");
          setSuccess("");
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          await updateUserByAdmin(user.id, {
            nombre: user.nombre,
            apellido_paterno: user.apellido_paterno,
            apellido_materno: user.apellido_materno,
            carnet: user.carnet,
            rol: user.rol,
            esta_activo: nextActive
          });
          setSuccess(`Estado del usuario ${user.nombre} cambiado a ${nextActive ? "ACTIVO" : "INACTIVO"}.`);
          fetchUsers();
        } catch (err) {
          setError(err.message || "No se pudo actualizar el estado del usuario.");
        }
      }
    });
  }, [fetchUsers]);

  const handleDelete = useCallback((userId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Eliminar Usuario",
      message: "¿Estás seguro de que deseas eliminar permanentemente este usuario? Esta acción no se puede deshacer.",
      confirmColor: "#e11d48",
      onConfirm: async () => {
        try {
          setError("");
          setSuccess("");
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          await deleteUserByAdmin(userId);
          setSuccess("Usuario eliminado permanentemente.");
          fetchUsers();
        } catch (err) {
          setError(err.message || "No se pudo eliminar el usuario.");
        }
      }
    });
  }, [fetchUsers]);

  const handleEdit = useCallback((user) => {
    setEditingUser(user);
    setEditForm({
      nombre: user.nombre,
      apellido_paterno: user.apellido_paterno,
      apellido_materno: user.apellido_materno || "",
      carnet: user.carnet,
      rol: user.rol,
      esta_activo: user.esta_activo
    });
    setError("");
    setSuccess("");
  }, []);

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setConfirmConfig({
      isOpen: true,
      title: "Guardar Cambios de Usuario",
      message: `¿Confirmas que deseas guardar los cambios para el usuario ${editForm.nombre} ${editForm.apellido_paterno}?`,
      confirmColor: "var(--color-primary)",
      onConfirm: async () => {
        try {
          setError("");
          setSuccess("");
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          await updateUserByAdmin(editingUser.id, {
            nombre: editForm.nombre,
            apellido_paterno: editForm.apellido_paterno,
            apellido_materno: editForm.apellido_materno || null,
            carnet: editForm.carnet,
            rol: editForm.rol,
            esta_activo: editForm.esta_activo
          });
          setSuccess("Usuario actualizado con éxito.");
          setEditingUser(null);
          fetchUsers();
        } catch (err) {
          setError(err.message || "No se pudo actualizar el usuario.");
        }
      }
    });
  };

  const handleOpenRegister = () => {
    setRegisterForm({
      nombre: "",
      apellido_paterno: "",
      apellido_materno: "",
      carnet: "",
      contrasena: "",
      confirmPassword: "",
      rol: "OPERADOR"
    });
    setError("");
    setSuccess("");
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (registerForm.contrasena !== registerForm.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setRegisterLoading(true);
      await registerUser({
        nombre: registerForm.nombre,
        apellido_paterno: registerForm.apellido_paterno,
        apellido_materno: registerForm.apellido_materno || null,
        carnet: registerForm.carnet,
        contrasena: registerForm.contrasena,
        rol: registerForm.rol
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
        <p className="eyebrow">Administración</p>
        <h2>Gestionar Usuarios</h2>
        <p className="muted-text">
          Administra las cuentas de acceso al sistema (Administradores, Operadores de Seguridad, Dispositivos y Usuarios).
        </p>
      </div>

      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="eyebrow">Cuentas del sistema</p>
          <h3>Lista de Usuarios Registrados</h3>
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
              <th style={{ padding: "1rem" }}>Nombre Completo</th>
              <th style={{ padding: "1rem" }}>Carnet</th>
              <th style={{ padding: "1rem" }}>Rol en Sistema</th>
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
                handleEdit={handleEdit}
              />
            ))}
            {!users.length && (
              <tr>
                <td colSpan="5" style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                  No hay usuarios registrados en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Registro */}
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
                <span>Nombre</span>
                <input
                  type="text"
                  placeholder="Ej. Tatiana"
                  value={registerForm.nombre}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, nombre: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Apellido Paterno</span>
                <input
                  type="text"
                  placeholder="Ej. Flores"
                  value={registerForm.apellido_paterno}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, apellido_paterno: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Apellido Materno (Opcional)</span>
                <input
                  type="text"
                  placeholder="Ej. Suarez"
                  value={registerForm.apellido_materno}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, apellido_materno: e.target.value }))}
                />
              </label>

              <label className="field-group">
                <span>Carnet de Identidad / Registro</span>
                <input
                  type="text"
                  placeholder="Ej. 1234567"
                  value={registerForm.carnet}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, carnet: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Rol del Usuario</span>
                <select
                  value={registerForm.rol}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, rol: e.target.value }))}
                  required
                >
                  <option value="USUARIO">Usuario (Estudiante/Docente)</option>
                  <option value="OPERADOR">Operador de Seguridad</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="DISPOSITIVO">Dispositivo</option>
                </select>
              </label>

              <label className="field-group">
                <span>Contraseña</span>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                  value={registerForm.contrasena}
                  onChange={(e) => setRegisterForm((curr) => ({ ...curr, contrasena: e.target.value }))}
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
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" disabled={registerLoading}>
                {registerLoading ? "Creando cuenta..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Edición */}
      {editingUser && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleEditSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Edición</p>
                <h2>Editar Usuario</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setEditingUser(null)}>
                Cerrar
              </button>
            </div>

            <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label className="field-group">
                <span>Nombre</span>
                <input
                  type="text"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, nombre: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Apellido Paterno</span>
                <input
                  type="text"
                  value={editForm.apellido_paterno}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, apellido_paterno: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Apellido Materno (Opcional)</span>
                <input
                  type="text"
                  value={editForm.apellido_materno}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, apellido_materno: e.target.value }))}
                />
              </label>

              <label className="field-group">
                <span>Carnet de Identidad / Registro</span>
                <input
                  type="text"
                  value={editForm.carnet}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, carnet: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Rol del Usuario</span>
                <select
                  value={editForm.rol}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, rol: e.target.value }))}
                  required
                >
                  <option value="USUARIO">Usuario (Estudiante/Docente)</option>
                  <option value="OPERADOR">Operador de Seguridad</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="DISPOSITIVO">Dispositivo</option>
                </select>
              </label>

              <label className="field-group">
                <span>Estado de la Cuenta</span>
                <select
                  value={editForm.esta_activo ? "true" : "false"}
                  onChange={(e) => setEditForm((curr) => ({ ...curr, esta_activo: e.target.value === "true" }))}
                  required
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit">
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmColor={confirmConfig.confirmColor}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </section>
  );
}

export default Users;
