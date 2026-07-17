import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import History from "../pages/History";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import Reports from "../pages/Reports";
import UploadPlate from "../pages/UploadPlate";
import Users from "../pages/Users";
import UniversityPersons from "../pages/UniversityPersons";
import Vehicles from "../pages/Vehicles";
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

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function HomeRoute() {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <Loader label="Cargando..." />;
  }

  if (user?.role !== "ADMIN") {
    return <Navigate to="/subir-placa" replace />;
  }

  return <Dashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/subir-placa" element={<UploadPlate />} />
        <Route path="/historial" element={<History />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/usuarios" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="/personas" element={<AdminRoute><UniversityPersons /></AdminRoute>} />
        <Route path="/vehiculos" element={<Vehicles />} />
        <Route path="/accesos" element={<AccessLogs />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
