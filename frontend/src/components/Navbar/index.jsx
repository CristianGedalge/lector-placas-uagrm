import { useAuth } from "../../hooks/useAuth";

function Navbar({ onMenuToggle }) {
  const { user, signOut } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-heading">
        {user?.role !== "DISPOSITIVO" && (
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
        <div className="user-chip" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: "12px", padding: "0.4rem 1rem" }}>
          <span style={{ fontSize: "0.9rem", lineHeight: "1.2", display: "block", fontWeight: "bold" }}>{user?.full_name || user?.name || "Invitado"}</span>
          {user?.role !== "DISPOSITIVO" && (
            <span style={{ fontSize: "0.75rem", color: "#666", marginTop: "1px", display: "block", textTransform: "capitalize" }}>
              {String(user?.catalog_role || "").toLowerCase()}
            </span>
          )}
          <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#153e75", marginTop: "2px", display: "block", letterSpacing: "0.5px" }}>
            {user?.role === "ADMIN" ? "ADMINISTRADOR" : user?.role === "DISPOSITIVO" ? "DISPOSITIVO" : "OPERADOR"}
          </span>
        </div>
        <button type="button" className="ghost-button logout-chip" onClick={signOut}>
          Salir
        </button>
      </div>
    </header>
  );
}

export default Navbar;
