import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import ConfirmModal from "../ConfirmModal";

function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const links = [];

  if (user?.rol === "ADMINISTRADOR") {
    links.push(
      { to: "/", label: "Dashboard" },
      { to: "/vehiculos", label: "Gestionar Vehiculos" },
      { to: "/usuarios", label: "Gestionar Usuarios" },
      { to: "/dispositivos", label: "Gestionar Dispositivos" },
      { to: "/accesos", label: "Control de Accesos" }
    );
  } else if (user?.rol === "OPERADOR") {
    links.push(
      { to: "/vehiculos", label: "Gestionar Vehiculos" },
      { to: "/accesos", label: "Control de Accesos" }
    );
  } else if (user?.rol === "DISPOSITIVO") {
    links.push(
      { to: "/subir-placa", label: "Escanear Placas" }
    );
  } else {
    links.push(
      { to: "/", label: "Inicio" },
      { to: "/vehiculos", label: "Mis Vehiculos" },
      { to: "/accesos", label: "Control de Accesos" }
    );
  }

  if (user?.rol !== "DISPOSITIVO") {
    links.push({ to: "/perfil", label: "Perfil" });
  }

  return (
    <>
      <aside className={isOpen ? "sidebar sidebar-open" : "sidebar"}>
        <div className="brand">Placas App</div>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-icon active" : "nav-link nav-link-icon"
              }
            >
              <span className="nav-text">{link.label}</span>
            </NavLink>
          ))}
          {user?.rol !== "DISPOSITIVO" && (
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="nav-link nav-link-icon"
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                width: "100%",
                cursor: "pointer",
                marginTop: "1.5rem",
                color: "#fca5a5"
              }}
            >
              <span className="nav-text">Cerrar Sesión</span>
            </button>
          )}
        </nav>
      </aside>
      {isOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={onClose}
          aria-label="Cerrar menu"
        />
      )}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas cerrar tu sesión en el sistema?"
        confirmColor="var(--color-danger, #ef4444)"
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          signOut();
          onClose();
        }}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
    </>
  );
}

export default Sidebar;
