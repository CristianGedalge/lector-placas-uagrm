import { Outlet } from "react-router-dom";
import { useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
