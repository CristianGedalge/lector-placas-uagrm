import { useEffect, useState } from "react";
import Loader from "../components/Loader";
import { getDashboardSummary } from "../api/plates";
import { useAuth } from "../hooks/useAuth";

function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const filterId = user?.role === "ADMIN" ? undefined : user?.id;
      const data = await getDashboardSummary(filterId);
      setDashboardData(data);
    } catch (loadError) {
      setError("No se pudo cargar el resumen del dashboard.");
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  if (loading) {
    return <Loader label="Cargando resumen de telemetría..." />;
  }

  const recentScans = dashboardData?.recent_scans || [];

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">Resumen de Telemetría</p>
        <h2>Panel de Control ({user?.role === "ADMIN" ? "Administrador" : "Operador"})</h2>
        <p className="muted-text">
          Estadísticas y bitácora en tiempo real de los accesos vehiculares controlados por Inteligencia Artificial local.
        </p>
      </div>

      {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

      {/* Grid de KPIs Premium */}
      <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
        
        {/* KPI 1: Vehículos Registrados */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "4px solid var(--color-primary)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Vehículos Registrados</p>
          <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "var(--color-primary)" }}>
            {dashboardData?.total_vehicles || 0}
          </span>
          <p className="muted-text" style={{ fontSize: "0.85rem", margin: 0 }}>
            {user?.role === "ADMIN" ? "Total en base de datos global" : "Tus vehículos registrados"}
          </p>
        </div>

        {/* KPI 2: Vehículos Activos */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "4px solid green" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Vehículos Activos</p>
          <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "green" }}>
            {dashboardData?.active_vehicles || 0}
          </span>
          <p className="muted-text" style={{ fontSize: "0.85rem", margin: 0 }}>
            Habilitados con ingreso automático
          </p>
        </div>

        {/* KPI 3: Lecturas Hoy */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "4px solid #f2a104" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Lecturas (Últimas 24h)</p>
          <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#f2a104" }}>
            {dashboardData?.today_scans || 0}
          </span>
          <p className="muted-text" style={{ fontSize: "0.85rem", margin: 0 }}>
            Placas escaneadas hoy en campus
          </p>
        </div>

        {/* KPI 4: Total Lecturas */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "4px solid #722ed1" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Escaneos Históricos</p>
          <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#722ed1" }}>
            {dashboardData?.total_scans || 0}
          </span>
          <p className="muted-text" style={{ fontSize: "0.85rem", margin: 0 }}>
            Total acumulado registrado
          </p>
        </div>

        {/* KPI 5: Confianza Promedio */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "4px solid #13c2c2" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Confianza OCR Promedio</p>
          <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#13c2c2" }}>
            {dashboardData?.avg_confidence ? `${(dashboardData.avg_confidence * 100).toFixed(1)}%` : "0.0%"}
          </span>
          <p className="muted-text" style={{ fontSize: "0.85rem", margin: 0 }}>
            Fiabilidad del motor de lectura
          </p>
        </div>

        {/* KPI 6: Cuentas del Sistema */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderLeft: "4px solid #fa8c16" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Operadores UAGRM</p>
          <span style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#fa8c16" }}>
            {dashboardData?.total_users || 0}
          </span>
          <p className="muted-text" style={{ fontSize: "0.85rem", margin: 0 }}>
            Guardias y administradores
          </p>
        </div>

      </div>

      {/* Feed de Detecciones Recientes */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <div className="section-heading" style={{ margin: 0, paddingBottom: "1rem" }}>
          <div>
            <p className="eyebrow">Bitácora en vivo</p>
            <h3 style={{ color: "#153e75" }}>Últimos Escaneos Detectados</h3>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
                <th style={{ padding: "0.8rem" }}>Hora / Fecha</th>
                <th style={{ padding: "0.8rem" }}>Placa Detectada</th>
                <th style={{ padding: "0.8rem" }}>Placa Normalizada</th>
                <th style={{ padding: "0.8rem" }}>Confianza</th>
                <th style={{ padding: "0.8rem" }}>Estado</th>
                <th style={{ padding: "0.8rem" }}>BD Vehículo</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                  <td style={{ padding: "0.8rem", fontSize: "0.9rem" }}>
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.8rem", fontFamily: "monospace", fontWeight: "bold" }}>
                    {s.detected_plate || "N/A"}
                  </td>
                  <td style={{ padding: "0.8rem", fontFamily: "monospace", color: "#153e75", fontWeight: "bold" }}>
                    {s.normalized_plate || "N/A"}
                  </td>
                  <td style={{ padding: "0.8rem", fontSize: "0.9rem" }}>
                    {s.confidence ? `${(s.confidence * 100).toFixed(1)}%` : "N/A"}
                  </td>
                  <td style={{ padding: "0.8rem" }}>
                    <span style={{
                      padding: "0.2rem 0.4rem",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      fontWeight: "bold",
                      background: s.scan_status === "DETECTED" ? "#e6ffe6" : s.scan_status === "LOW_CONFIDENCE" ? "#fff7e6" : "#ffe6e6",
                      color: s.scan_status === "DETECTED" ? "green" : s.scan_status === "LOW_CONFIDENCE" ? "#d46b08" : "#b22234"
                    }}>
                      {s.scan_status}
                    </span>
                  </td>
                  <td style={{ padding: "0.8rem", fontSize: "0.9rem" }}>
                    {s.has_vehicle ? (
                      <span style={{ color: "green", fontWeight: "bold" }}>✓ En Regla</span>
                    ) : (
                      <span style={{ color: "#b22234", fontWeight: "bold" }}>✗ Desconocido</span>
                    )}
                  </td>
                </tr>
              ))}
              {!recentScans.length && (
                <tr>
                  <td colSpan="6" style={{ padding: "1.5rem", textAlign: "center", color: "#666" }}>
                    No hay escaneos recientes en la bitácora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ color: "#153e75", marginBottom: "1rem" }}>Accesos Rápidos</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <a href="/subir-placa" className="button" style={{ display: "inline-block", textDecoration: "none", color: "white", padding: "0.6rem 1.2rem", borderRadius: "4px", background: "var(--color-primary)" }}>
            Escanear Placa
          </a>
          <a href="/vehiculos" className="button" style={{ display: "inline-block", textDecoration: "none", color: "white", padding: "0.6rem 1.2rem", borderRadius: "4px", background: "var(--color-primary)" }}>
            Mis Vehículos
          </a>
          <a href="/historial" className="button" style={{ display: "inline-block", textDecoration: "none", color: "white", padding: "0.6rem 1.2rem", borderRadius: "4px", background: "var(--color-primary)" }}>
            Mi Historial
          </a>
          {user?.role === "ADMIN" && (
            <>
              <a href="/usuarios" className="button" style={{ display: "inline-block", textDecoration: "none", color: "white", padding: "0.6rem 1.2rem", borderRadius: "4px", background: "var(--color-primary)" }}>
                Gestionar Usuarios
              </a>
              <a href="/personas" className="button" style={{ display: "inline-block", textDecoration: "none", color: "white", padding: "0.6rem 1.2rem", borderRadius: "4px", background: "var(--color-primary)" }}>
                Gestionar Personas (SIARP)
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
