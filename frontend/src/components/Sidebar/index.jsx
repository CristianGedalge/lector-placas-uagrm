import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  const links = [];

  if (user?.role === "ADMIN") {
    links.push(
      { to: "/", label: "Dashboard" },
      { to: "/vehiculos", label: "Gestionar Vehiculos" },
      { to: "/usuarios", label: "Gestionar Usuarios" },
      { to: "/personas", label: "Gestionar Personas" },
      { to: "/accesos", label: "Control de Accesos" },
      { to: "/historial", label: "Historial" },
      { to: "/reportes", label: "Reportes" }
    );
  } else if (user?.role === "DISPOSITIVO") {
    links.push(
      { to: "/subir-placa", label: "Escanear Placas" }
    );
  } else {
    links.push(
      { to: "/subir-placa", label: "Escanear Placas" },
      { to: "/vehiculos", label: "Mis Vehiculos" },
      { to: "/accesos", label: "Control de Accesos" },
      { to: "/historial", label: "Mi Historial" }
    );
  }

  if (user?.role !== "DISPOSITIVO") {
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
    </>
  );
}

export default Sidebar;
