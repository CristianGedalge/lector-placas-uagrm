import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { getMediaUrl } from "../../api/auth";

function Navbar({ onMenuToggle }) {
  const { user } = useAuth();
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    if (!user?.foto_id) {
      setPhotoUrl("");
      return;
    }
    getMediaUrl(user.foto_id)
      .then((result) => setPhotoUrl(result.url))
      .catch(() => setPhotoUrl(""));
  }, [user?.foto_id]);

  return (
    <header className="topbar">
      <div className="topbar-heading">
        {user?.rol !== "DISPOSITIVO" && (
          <button
            type="button"
            className="menu-toggle icon-button"
            onClick={onMenuToggle}
            aria-label="Abrir menu"
          >
            <span />
            <span />
            <span />
          </button>
        )}
        <div>
          <p className="eyebrow">Sistema universitario</p>
          <h1>Analisis y registro de placas</h1>
        </div>
      </div>
      <div className="topbar-actions topbar-actions-compact">
        {user?.rol !== "DISPOSITIVO" && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className="navbar-user-details" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#1e293b" }}>
                {user?.nombre ? `${user.nombre} ${user.apellido_paterno}` : "Invitado"}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Reg: {user?.carnet || "N/A"}
              </span>
              <span 
                style={{ 
                  fontSize: "0.65rem", 
                  fontWeight: "700", 
                  background: user?.rol === "ADMINISTRADOR" ? "#e8f5e9" : user?.rol === "OPERADOR" ? "#fff3e0" : "#e3f2fd", 
                  color: user?.rol === "ADMINISTRADOR" ? "#2e7d32" : user?.rol === "OPERADOR" ? "#ef6c00" : "#1565c0",
                  padding: "0.15rem 0.5rem", 
                  borderRadius: "12px", 
                  marginTop: "3px",
                  display: "inline-block",
                  letterSpacing: "0.5px"
                }}
              >
                {user?.rol === "USUARIO" ? "ESTUDIANTE / DOCENTE" : user?.rol}
              </span>
            </div>
            <div 
              style={{ 
                width: "42px", 
                height: "42px", 
                borderRadius: "50%", 
                overflow: "hidden", 
                background: "#e2e8f0", 
                border: "2px solid #ffffff", 
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              {photoUrl ? (
                <img src={photoUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#64748b" }}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
