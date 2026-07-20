import { Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isDevice = user?.rol === "DISPOSITIVO";

  return (
    <div className={isDevice ? "app-shell app-shell-device" : "app-shell"}>
      {!isDevice && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className="content-shell">
        <Navbar onMenuToggle={() => setSidebarOpen((current) => !current)} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
