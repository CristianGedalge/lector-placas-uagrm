import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import {
  listUniversityPersons,
  createUniversityPerson,
  updateUniversityPerson,
  deleteUniversityPerson
} from "../api/auth";

function UniversityPersons() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    role: "STUDENT",
    full_name: "",
    document_id: "",
    faculty: "",
    contact_info: "",
    status: "ACTIVE",
    is_active: true
  });

  const fetchPersons = async () => {
    try {
      setLoading(true);
      const data = await listUniversityPersons();
      setPersons(data || []);
    } catch (err) {
      setError("No se pudo cargar la lista de personas universitarias.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  const handleOpenCreate = () => {
    setEditingPerson({ isNew: true });
    setFormData({
      code: "",
      role: "STUDENT",
      full_name: "",
      document_id: "",
      faculty: "",
      contact_info: "",
      status: "ACTIVE",
      is_active: true
    });
  };

  const handleOpenEdit = (person) => {
    setEditingPerson(person);
    setFormData({
      code: person.code,
      role: person.role,
      full_name: person.full_name,
      document_id: person.document_id || "",
      faculty: person.faculty || "",
      contact_info: person.contact_info || "",
      status: person.status,
      is_active: person.is_active
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editingPerson.isNew) {
        await createUniversityPerson(formData);
        setSuccess("Registro de persona universitaria creado con éxito.");
      } else {
        await updateUniversityPerson(editingPerson.id, formData);
        setSuccess("Registro de persona universitaria actualizado con éxito.");
      }
      setEditingPerson(null);
      fetchPersons();
    } catch (err) {
      setError(err.message || "Error al procesar la operación.");
    }
  };

  const handleDelete = async (personId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente a esta persona del registro?")) {
      return;
    }
    try {
      setError("");
      setSuccess("");
      await deleteUniversityPerson(personId);
      setSuccess("Registro universitario eliminado con éxito.");
      fetchPersons();
    } catch (err) {
      setError(err.message || "No se pudo eliminar el registro.");
    }
  };

  if (loading) {
    return <Loader label="Cargando registros universitarios..." />;
  }

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">Administracion</p>
        <h2>Gestionar Personas (SIARP)</h2>
        <p className="muted-text">
          Controla los registros oficiales de Estudiantes, Docentes y Administrativos autorizados para asociar placas.
        </p>
        <button type="button" onClick={handleOpenCreate} style={{ marginTop: "1rem", alignSelf: "flex-start" }}>
          Agregar Nueva Persona
        </button>
      </div>

      {success && <p style={{ color: "green", fontWeight: "bold", background: "#e6ffe6", padding: "0.8rem", borderRadius: "8px", border: "1px solid green" }}>{success}</p>}
      {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
              <th style={{ padding: "1rem" }}>Codigo</th>
              <th style={{ padding: "1rem" }}>Nombre completo</th>
              <th style={{ padding: "1rem" }}>Rol</th>
              <th style={{ padding: "1rem" }}>Facultad / Carrera</th>
              <th style={{ padding: "1rem" }}>Documento Identidad</th>
              <th style={{ padding: "1rem" }}>Contacto</th>
              <th style={{ padding: "1rem" }}>Estado</th>
              <th style={{ padding: "1rem", textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                <td style={{ padding: "1rem", fontWeight: "bold", color: "#153e75" }}>{p.code}</td>
                <td style={{ padding: "1rem", fontWeight: "600" }}>{p.full_name}</td>
                <td style={{ padding: "1rem" }}>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    background: p.role === "ADMIN" ? "#f2f2f2" : p.role === "TEACHER" ? "#e6f7ff" : "#fff7e6",
                    color: p.role === "ADMIN" ? "#333" : p.role === "TEACHER" ? "#0050b3" : "#d46b08"
                  }}>
                    {p.role === "ADMIN" ? "ADMINISTRATIVO" : p.role === "TEACHER" ? "DOCENTE" : "ESTUDIANTE"}
                  </span>
                </td>
                <td style={{ padding: "1rem" }}>{p.faculty || "N/A"}</td>
                <td style={{ padding: "1rem" }}>{p.document_id || "N/A"}</td>
                <td style={{ padding: "1rem" }}>{p.contact_info || "N/A"}</td>
                <td style={{ padding: "1rem" }}>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    background: p.is_active ? "#e6ffe6" : "#f2f2f2",
                    color: p.is_active ? "green" : "#666"
                  }}>
                    {p.is_active ? "ACTIVO" : "INACTIVO"}
                  </span>
                </td>
                <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: "var(--color-primary)" }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDelete(p.id)}
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!persons.length && (
              <tr>
                <td colSpan="8" style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                  No hay registros de personas universitarias.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingPerson && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{editingPerson.isNew ? "Crear" : "Editar"}</p>
                <h2>{editingPerson.isNew ? "Nueva Persona Universitaria" : "Editar Persona Universitaria"}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setEditingPerson(null)}>
                Cerrar
              </button>
            </div>

            <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label className="field-group">
                <span>Codigo Universitario</span>
                <input
                  type="text"
                  placeholder="202400123"
                  value={formData.code}
                  onChange={(e) => setFormData((curr) => ({ ...curr, code: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Nombre Completo</span>
                <input
                  type="text"
                  placeholder="Tatiana Flores"
                  value={formData.full_name}
                  onChange={(e) => setFormData((curr) => ({ ...curr, full_name: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Rol Academico</span>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((curr) => ({ ...curr, role: e.target.value }))}
                  required
                >
                  <option value="STUDENT">Estudiante</option>
                  <option value="TEACHER">Docente</option>
                  <option value="ADMIN">Administrativo</option>
                </select>
              </label>

              <label className="field-group">
                <span>Facultad / Carrera</span>
                <input
                  type="text"
                  placeholder="Ingeniería en Sistemas"
                  value={formData.faculty}
                  onChange={(e) => setFormData((curr) => ({ ...curr, faculty: e.target.value }))}
                />
              </label>

              <label className="field-group">
                <span>Documento Identidad (CI)</span>
                <input
                  type="text"
                  placeholder="9234567"
                  value={formData.document_id}
                  onChange={(e) => setFormData((curr) => ({ ...curr, document_id: e.target.value }))}
                />
              </label>

              <label className="field-group">
                <span>Telefono / Contacto</span>
                <input
                  type="text"
                  placeholder="70000000"
                  value={formData.contact_info}
                  onChange={(e) => setFormData((curr) => ({ ...curr, contact_info: e.target.value }))}
                />
              </label>

              <label className="field-group" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((curr) => ({ ...curr, is_active: e.target.checked, status: e.target.checked ? "ACTIVE" : "INACTIVE" }))}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: "bold", color: "#153e75", cursor: "pointer" }}>¿Registro activo y habilitado?</span>
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit">Guardar Registro</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default UniversityPersons;
