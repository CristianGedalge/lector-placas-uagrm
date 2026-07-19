import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import { getPlateScans } from "../api/plates";
import { useAuth } from "../hooks/useAuth";
import Pagination from "../components/Pagination";

function History() {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState(user?.role === "ADMIN" ? "ALL" : "MY"); // ALL o MY

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentScans = filteredScans.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <section className="page-stack">
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">{user?.role === "ADMIN" ? "Auditoría Global" : "Mi Auditoría"}</p>
          <h3 style={{ margin: 0 }}>Historial de Escaneos</h3>
        </div>
        <button type="button" className="ghost-button" onClick={fetchScans} style={{ padding: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }} title="Refrescar tabla">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/></svg>
          Refrescar Historial
        </button>
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
      {error && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><p className="error-text" style={{ background: "#ffe6e6", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid red", display: "inline-block", margin: 0 }}>{error}</p></div>}
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
              {currentScans.map((s) => (
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

      {!loading && filteredScans.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredScans.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </section>
  );
}

export default History;
