import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function Navbar({ onMenuToggle }) {
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

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
      <div className="topbar-actions topbar-actions-compact" style={{ position: "relative" }}>
        <button
          type="button"
          className="user-chip"
          onClick={() => setShowMenu((prev) => !prev)}
          aria-label="Abrir menú de usuario"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "12px",
            padding: "0.4rem 1rem",
            border: "none",
            background: "transparent",
            cursor: "pointer"
          }}
        >
          <span style={{ fontSize: "0.9rem", lineHeight: "1.2", display: "block", fontWeight: "bold" }}>
            {user?.nombre ? `${user.nombre} ${user.apellido_paterno}` : "Invitado"}
          </span>
          <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#153e75", marginTop: "2px", display: "block", letterSpacing: "0.5px" }}>
            {user?.rol || "USUARIO"}
          </span>
        </button>

        {showMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 0.35rem)",
              right: 0,
              background: "#fff",
              border: "1px solid #d9e2ec",
              borderRadius: "10px",
              boxShadow: "0 8px 22px rgba(0, 0, 0, 0.12)",
              minWidth: "140px",
              zIndex: 20
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                signOut();
              }}
              style={{
                width: "100%",
                border: "none",
                background: "#fef2f2",
                padding: "0.7rem 0.9rem",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "0.9rem",
                color: "#dc2626",
                fontWeight: 700,
                borderRadius: "0 0 10px 10px"
              }}
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
