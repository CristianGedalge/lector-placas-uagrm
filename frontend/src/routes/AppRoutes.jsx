import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import History from "../pages/History";
import Login from "../pages/Login";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import Reports from "../pages/Reports";
import UploadPlate from "../pages/UploadPlate";
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subir-placa" element={<UploadPlate />} />
        <Route path="/historial" element={<History />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
