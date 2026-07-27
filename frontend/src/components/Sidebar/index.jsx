import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();

  const links = [];

  if (user?.rol === "ADMINISTRADOR") {
    links.push(
      { to: "/", label: "Dashboard" },
      { to: "/vehiculos", label: "Gestionar Vehiculos" },
      { to: "/usuarios", label: "Gestionar Usuarios" },
      { to: "/dispositivos", label: "Gestionar Dispositivos" },
      { to: "/accesos", label: "Control de Accesos" }
      ,{ to: "/solicitudes-vehiculos", label: "Solicitudes de Vehiculos" }
    );
  } else if (user?.rol === "OPERADOR") {
    links.push(
      { to: "/vehiculos", label: "Gestionar Vehiculos" },
      { to: "/accesos", label: "Control de Accesos" }
      ,{ to: "/solicitudes-vehiculos", label: "Solicitudes de Vehiculos" }
    );
  } else if (user?.rol === "DISPOSITIVO") {
    links.push(
      { to: "/subir-placa", label: "Escanear Placas" }
    );
  } else {
    links.push(
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
