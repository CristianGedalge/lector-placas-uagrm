import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import { getAccessLogs, createAccessLog, getMyVehicles } from "../api/plates";
import { useAuth } from "../hooks/useAuth";

function AccessLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    direction: "ENTRY",
    zone: "Portería Principal",
    notes: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsData, vehiclesData] = await Promise.all([
        getAccessLogs(),
        getMyVehicles()
      ]);
      setLogs(logsData || []);
      setVehicles(vehiclesData || []);
    } catch (err) {
      setError("No se pudo cargar la información de accesos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const handleOpenModal = () => {
    setFormData({
      vehicle_id: vehicles[0]?.id || "",
      direction: "ENTRY",
      zone: "Portería Principal",
      notes: ""
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_id) {
      setError("Debes seleccionar un vehículo.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await createAccessLog({
        vehicle_id: formData.vehicle_id,
        direction: formData.direction,
        zone: formData.zone,
        notes: formData.notes
      });
      setSuccess("Acceso registrado correctamente.");
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || "No se pudo registrar el acceso.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Cargando bitácora de accesos..." />;
  }

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">{user?.role === "ADMIN" ? "Auditoría" : "Operador"}</p>
        <h2>Control de Accesos</h2>
        <p className="muted-text">
          {user?.role === "ADMIN"
            ? "Historial completo de ingresos y salidas del campus universitario."
            : "Historial de ingresos y salidas de los vehículos registrados bajo tu cuenta."}
        </p>
      </div>

      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="eyebrow">Telemetría</p>
          <h3>Registros de Entrada y Salida</h3>
        </div>
        <button type="button" onClick={handleOpenModal} style={{ padding: "0.6rem 1.2rem" }}>
          Registrar Acceso Manual
        </button>
      </div>

      {success && <p style={{ color: "green", fontWeight: "bold", background: "#e6ffe6", padding: "0.8rem", borderRadius: "8px", border: "1px solid green" }}>{success}</p>}
      {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
              <th style={{ padding: "1rem" }}>Fecha / Hora</th>
              <th style={{ padding: "1rem" }}>Placa</th>
              <th style={{ padding: "1rem" }}>Dirección</th>
              <th style={{ padding: "1rem" }}>Zona / Portería</th>
              <th style={{ padding: "1rem" }}>Vehículo</th>
              <th style={{ padding: "1rem" }}>Propietario</th>
              <th style={{ padding: "1rem" }}>Notas</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                <td style={{ padding: "1rem", fontWeight: "bold" }}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", color: "#153e75" }}>
                  {log.vehicle?.license_plate}
                </td>
                <td style={{ padding: "1rem" }}>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    background: log.direction === "ENTRY" ? "#e6ffe6" : "#fff2e6",
                    color: log.direction === "ENTRY" ? "green" : "#d46b08"
                  }}>
                    {log.direction === "ENTRY" ? "INGRESO" : "SALIDA"}
                  </span>
                </td>
                <td style={{ padding: "1rem" }}>{log.zone}</td>
                <td style={{ padding: "1rem" }}>
                  {log.vehicle?.brand} {log.vehicle?.model} ({log.vehicle?.color})
                </td>
                <td style={{ padding: "1rem" }}>
                  {log.vehicle?.owner?.full_name || "Sin propietario"}
                </td>
                <td style={{ padding: "1rem", color: "#666", fontSize: "0.9rem" }}>
                  {log.notes || "-"}
                </td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td colSpan="7" style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                  No se registran movimientos en la bitácora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>Registrar Acceso Vehicular</h2>
              <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>
                Cerrar
              </button>
            </div>

            <div className="form-block" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label className="field-group">
                <span>Seleccionar Vehículo</span>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData((curr) => ({ ...curr, vehicle_id: e.target.value }))}
                  required
                >
                  <option value="">-- Selecciona un Vehículo Autorizado --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.license_plate} - {v.brand} {v.model} ({v.owner?.full_name})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span>Movimiento</span>
                <select
                  value={formData.direction}
                  onChange={(e) => setFormData((curr) => ({ ...curr, direction: e.target.value }))}
                  required
                >
                  <option value="ENTRY">Ingreso</option>
                  <option value="EXIT">Salida</option>
                </select>
              </label>

              <label className="field-group">
                <span>Zona / Portería de Control</span>
                <input
                  type="text"
                  placeholder="Portería Principal / Parqueo de Tecnología"
                  value={formData.zone}
                  onChange={(e) => setFormData((curr) => ({ ...curr, zone: e.target.value }))}
                  required
                />
              </label>

              <label className="field-group">
                <span>Observaciones</span>
                <textarea
                  placeholder="Ej. Ingreso de visita, portón auxiliar..."
                  value={formData.notes}
                  onChange={(e) => setFormData((curr) => ({ ...curr, notes: e.target.value }))}
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" disabled={saving}>
                {saving ? "Registrando..." : "Confirmar Movimiento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default AccessLogs;
