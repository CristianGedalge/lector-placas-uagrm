import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import { getPlateScans } from "../api/plates";
import { useAuth } from "../hooks/useAuth";

function History() {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState(user?.role === "ADMIN" ? "ALL" : "MY"); // ALL o MY

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setLoading(true);
        const data = await getPlateScans();
        setScans(data || []);
      } catch (err) {
        setError("No se pudo cargar el historial de escaneos.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) {
      fetchScans();
      if (user?.role !== "ADMIN") {
        setFilterType("MY");
      }
    }
  }, [user?.id]);

  if (loading) {
    return <Loader label="Cargando historial de escaneos..." />;
  }

  const filteredScans = scans.filter((s) => {
    if (filterType === "MY") {
      return s.scanned_by_user_id === user?.id;
    }
    return true;
  });

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">{user?.role === "ADMIN" ? "Auditoria" : "Operador"}</p>
        <h2>{user?.role === "ADMIN" ? "Historial de Escaneos" : "Mi Historial de Escaneos"}</h2>
        <p className="muted-text">
          {user?.role === "ADMIN"
            ? "Listado cronológico de las placas leídas automáticamente por las cámaras o ingresadas manualmente."
            : "Listado cronológico de las placas que has procesado y validado en las porterías."}
        </p>
      </div>

      {/* Selector de Pestañas (Solo administradores) */}
      {user?.role === "ADMIN" && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            style={{
              background: filterType === "ALL" ? "var(--color-primary)" : "rgba(21, 62, 117, 0.05)",
              color: filterType === "ALL" ? "white" : "var(--color-primary)",
              padding: "0.6rem 1.2rem",
              fontWeight: "bold",
              border: "1px solid rgba(21, 62, 117, 0.1)",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Todos los escaneos
          </button>
          <button
            type="button"
            onClick={() => setFilterType("MY")}
            style={{
              background: filterType === "MY" ? "var(--color-primary)" : "rgba(21, 62, 117, 0.05)",
              color: filterType === "MY" ? "white" : "var(--color-primary)",
              padding: "0.6rem 1.2rem",
              fontWeight: "bold",
              border: "1px solid rgba(21, 62, 117, 0.1)",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Mi historial de escaneos
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {!filteredScans.length && (
        <div className="card">
          <p className="muted-text text-center">No se encontraron escaneos bajo esta selección.</p>
        </div>
      )}

      {filteredScans.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
                <th style={{ padding: "1rem" }}>Fecha / Hora</th>
                <th style={{ padding: "1rem" }}>Placa Detectada</th>
                <th style={{ padding: "1rem" }}>Placa Normalizada</th>
                <th style={{ padding: "1rem" }}>Confianza</th>
                <th style={{ padding: "1rem" }}>Estado</th>
                <th style={{ padding: "1rem" }}>Vehículo en BD</th>
              </tr>
            </thead>
            <tbody>
              {filteredScans.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                  <td style={{ padding: "1rem", fontWeight: "600" }}>
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "1rem", fontWeight: "bold" }}>
                    {s.detected_plate || "N/A"}
                  </td>
                  <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", color: "#153e75" }}>
                    {s.normalized_plate || "N/A"}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {s.confidence ? `${(s.confidence * 100).toFixed(1)}%` : "N/A"}
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      background: s.scan_status === "DETECTED" ? "#e6ffe6" : s.scan_status === "LOW_CONFIDENCE" ? "#fff7e6" : "#ffe6e6",
                      color: s.scan_status === "DETECTED" ? "green" : s.scan_status === "LOW_CONFIDENCE" ? "#d46b08" : "#b22234"
                    }}>
                      {s.scan_status}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    {s.vehicle_id ? (
                      <span style={{ color: "green", fontWeight: "bold" }}>✓ Registrado</span>
                    ) : (
                      <span style={{ color: "#b22234", fontWeight: "bold" }}>✗ No existe (Requiere Registro)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default History;
