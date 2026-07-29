import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loader from "../../components/Loader";
import { getVehicles } from "../../api/plates";
import { useAuth } from "../../hooks/useAuth";

function UserDashboard() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const vehiclesData = await getVehicles(user.id);
        setVehicles(vehiclesData || []);
      } catch (err) {
        console.error("Error cargando estadísticas del usuario:", err);
        setError("No se pudo cargar el resumen del dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user]);

  if (loading) {
    return <Loader label="Cargando tu dashboard..." />;
  }

  return (
    <div className="page-stack">
      {/* Saludo Premium con Gradiente */}
      <div 
        style={{
          background: "linear-gradient(135deg, #153e75 0%, #1e40af 100%)",
          color: "#ffffff",
          padding: "2rem",
          borderRadius: "16px",
          boxShadow: "0 10px 25px -5px rgba(30, 64, 175, 0.3)",
          position: "relative",
          overflow: "hidden",
          marginBottom: "1.5rem"
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <span 
            style={{ 
              textTransform: "uppercase", 
              fontSize: "0.8rem", 
              letterSpacing: "0.1em", 
              background: "rgba(255,255,255,0.15)", 
              padding: "0.3rem 0.8rem", 
              borderRadius: "20px",
              fontWeight: "600"
            }}
          >
            Panel del Estudiante / Docente
          </span>
          <h2 style={{ fontSize: "2.2rem", margin: "0.8rem 0 0.4rem 0", fontWeight: "700" }}>
            ¡Hola, {user?.nombre}!
          </h2>
          <p style={{ color: "rgba(255, 255, 255, 0.85)", margin: 0, fontSize: "1.05rem" }}>
            Bienvenido al Lector de Placas UAGRM. Administra tus vehículos autorizados para el ingreso al campus.
          </p>
        </div>
        <div 
          style={{
            position: "absolute",
            bottom: "-30px",
            right: "-30px",
            width: "180px",
            height: "180px",
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
            borderRadius: "50%"
          }}
        />
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fee2e2", padding: "1rem", borderRadius: "12px", color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Grid de Resumen */}
      <div className="details-grid" style={{ gap: "1.5rem", marginBottom: "2rem" }}>
        
        {/* Tarjeta de Vehículos */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", padding: "1.5rem", borderRadius: "16px", border: "1px solid rgba(21, 62, 117, 0.08)" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h4 style={{ margin: 0, color: "#64748b" }}>Vehículos Registrados</h4>
              <div style={{ background: "#e0f2fe", color: "#0284c7", padding: "0.5rem", borderRadius: "12px", display: "flex" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
              </div>
            </div>
            <div style={{ fontSize: "3rem", fontWeight: "800", color: "var(--color-primary)", lineHeight: 1 }}>
              {vehicles.length}
            </div>
            <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "0.9rem" }}>
              Vehículos autorizados vinculados a tu cuenta universitaria.
            </p>
          </div>
          <Link 
            to="/vehiculos" 
            style={{ 
              marginTop: "1.5rem", 
              display: "inline-block", 
              textAlign: "center", 
              background: "var(--color-primary)", 
              color: "#fff", 
              padding: "0.75rem", 
              borderRadius: "8px", 
              fontWeight: "600",
              textDecoration: "none",
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
          >
            Gestionar mis Vehículos
          </Link>
        </div>

        {/* Tarjeta de Instrucciones del Lector */}
        <div className="card" style={{ padding: "1.5rem", borderRadius: "16px", border: "1px solid rgba(21, 62, 117, 0.08)" }}>
          <h4 style={{ margin: "0 0 1rem 0", color: "#64748b" }}>Guía de Acceso al Campus</h4>
          <ul style={{ paddingLeft: "1.2rem", margin: 0, color: "#475569", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.95rem" }}>
            <li>
              <strong>Tu placa debe estar registrada:</strong> Asegúrate de que el vehículo que conduces está en tu lista autorizada.
            </li>
            <li>
              <strong>Aproximación lenta:</strong> Al acercarte a la cámara de la puerta, disminuye la velocidad para facilitar la detección OCR automática.
            </li>
            <li>
              <strong>Limpieza de placa:</strong> Mantén la placa física limpia y visible para evitar falsos positivos o rechazos por baja confianza.
            </li>
            <li>
              <strong>Ingreso excepcional:</strong> Si conduces un vehículo nuevo o no registrado, el operador solicitará tu código universitario activo para habilitarte el acceso manual temporal.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
