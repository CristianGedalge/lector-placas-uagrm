import { useAuth } from "../../hooks/useAuth";

function Navbar({ onMenuToggle }) {
  const { user, signOut } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-heading">
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
        <div>
          <p className="eyebrow">Sistema universitario</p>
          <h1>Analisis y registro de placas</h1>
        </div>
      </div>
      <div className="topbar-actions topbar-actions-compact">
        <div className="user-chip">
          <span>{user?.full_name || user?.name || "Invitado"}</span>
        </div>
        <button type="button" className="ghost-button logout-chip" onClick={signOut}>
          Salir
        </button>
      </div>
    </header>
  );
}

export default Navbar;
