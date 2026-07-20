import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import UploadPlate from "../pages/UploadPlate";
import Users from "../pages/Users";
import Vehicles from "../pages/Vehicles";
import Devices from "../pages/Devices";
import AccessLogs from "../pages/AccessLogs";
import Loader from "../components/Loader";
import { useAuth } from "../hooks/useAuth";

function ProtectedLayout() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loader label="Validando acceso..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
}

function AdminRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loader label="Validando rol..." />;
  }

  if (user?.rol !== "ADMINISTRADOR") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function DispositivoRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loader label="Validando rol..." />;
  }

  if (user?.rol !== "DISPOSITIVO") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function HomeRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loader label="Cargando..." />;
  }

  if (user?.rol === "ADMINISTRADOR") {
    return <Dashboard />;
  }

  if (user?.rol === "DISPOSITIVO") {
    return <Navigate to="/subir-placa" replace />;
  }

  return <Navigate to="/vehiculos" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/subir-placa" element={<DispositivoRoute><UploadPlate /></DispositivoRoute>} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/usuarios" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="/dispositivos" element={<AdminRoute><Devices /></AdminRoute>} />
        <Route path="/vehiculos" element={<Vehicles />} />
        <Route path="/accesos" element={<AccessLogs />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
