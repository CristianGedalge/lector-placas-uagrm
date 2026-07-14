import { useEffect, useState } from "react";

import PlateCard from "../components/PlateCard";
import Loader from "../components/Loader";
import {
  deleteVehicle,
  getDashboardSummary,
  getVehicleDetail,
  updateVehicleWithPhoto
} from "../api/plates";
import { useAuth } from "../hooks/useAuth";
import { formatPlate } from "../utils/formatters";

function mapVehicleToForm(vehicle) {
  return {
    license_plate: vehicle?.license_plate || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    color: vehicle?.color || "",
    vehicle_type: vehicle?.vehicle_type || "CAR",
    year: vehicle?.year || "",
    observation: vehicle?.observation || "",
    owner: {
      code: vehicle?.owner?.code || "",
      full_name: vehicle?.owner?.full_name || "",
      document_id: vehicle?.owner?.document_id || "",
      role: vehicle?.owner?.role || "STUDENT",
      faculty: vehicle?.owner?.faculty || "",
      contact_info: vehicle?.owner?.contact_info || "",
      status: vehicle?.owner?.status || "ACTIVE",
      is_active: vehicle?.owner?.is_active ?? true
    }
  };
}

function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getDashboardSummary(user?.id);
      setDashboardData(data);
    } catch (loadError) {
      setError("No se pudo cargar la informacion del dashboard desde el backend.");
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDashboard();
    }
  }, [user?.id]);

  const handleVehicleSelect = async (vehicle) => {
    try {
      setDetailLoading(true);
      const detail = await getVehicleDetail(vehicle.id);
      setSelectedVehicle(detail);
    } catch (detailError) {
      console.error(detailError);
      setSelectedVehicle(vehicle);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = () => {
    setEditingVehicle(mapVehicleToForm(selectedVehicle));
    setEditingPhoto(null);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!selectedVehicle?.id || !editingVehicle) {
      return;
    }

    try {
      setSaving(true);
      const updated = await updateVehicleWithPhoto(
        selectedVehicle.id,
        {
          ...editingVehicle,
          license_plate: formatPlate(editingVehicle.license_plate),
          registered_by_user_id: user?.id
        },
        editingPhoto
      );
      setSelectedVehicle(updated);
      setEditingVehicle(null);
      await loadDashboard();
    } catch (saveError) {
      setError(saveError?.response?.data?.detail || "No se pudo actualizar el vehiculo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!selectedVehicle?.id) {
      return;
    }

    try {
      setSaving(true);
      await deleteVehicle(selectedVehicle.id);
      setSelectedVehicle(null);
      setEditingVehicle(null);
      await loadDashboard();
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || "No se pudo eliminar el vehiculo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Cargando dashboard..." />;
  }

  if (error && !dashboardData) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  const myVehicles = dashboardData?.my_vehicles || [];

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">Resumen</p>
        <h2>Panel principal</h2>
        <div className="details-grid summary-grid">
          <p><strong>Total registrados:</strong> {dashboardData?.total_vehicles || 0}</p>
          <p><strong>Activos:</strong> {dashboardData?.active_vehicles || 0}</p>
          <p><strong>Mis vehiculos:</strong> {myVehicles.length}</p>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Vehiculos</p>
          <h3>Mis vehiculos</h3>
        </div>
        <p className="muted-text">Puedes ver, editar o eliminar tus vehiculos registrados.</p>
      </div>

      {!myVehicles.length && (
        <div className="card">
          <p className="muted-text">Todavia no tienes vehiculos registrados en el backend.</p>
        </div>
      )}

      <div className="grid two-columns">
        {myVehicles.map((vehicle) => (
          <PlateCard
            key={vehicle.id}
            plate={vehicle}
            isActive={selectedVehicle?.id === vehicle.id}
            onClick={() => handleVehicleSelect(vehicle)}
          />
        ))}
      </div>

      {selectedVehicle && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Detalle</p>
                <h2>Vehiculo encontrado</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setSelectedVehicle(null)}>
                Cerrar
              </button>
            </div>

            {detailLoading && <Loader label="Cargando detalle..." />}

            {selectedVehicle.vehicle_photo_path && (
              <img
                className="vehicle-photo"
                src={`http://127.0.0.1:8000${selectedVehicle.vehicle_photo_path}`}
                alt={`Vehiculo ${selectedVehicle.license_plate}`}
              />
            )}

            <div className="details-grid">
              <p><strong>Placa:</strong> {selectedVehicle.license_plate}</p>
              <p><strong>Marca:</strong> {selectedVehicle.brand}</p>
              <p><strong>Modelo:</strong> {selectedVehicle.model}</p>
              <p><strong>Color:</strong> {selectedVehicle.color}</p>
              <p><strong>Tipo:</strong> {selectedVehicle.vehicle_type}</p>
              <p><strong>Anio:</strong> {selectedVehicle.year || "No registrado"}</p>
              <p><strong>Estado:</strong> {selectedVehicle.status}</p>
              <p><strong>Registrado:</strong> {String(selectedVehicle.created_at).slice(0, 10)}</p>
            </div>

            {selectedVehicle.owner && (
              <>
                <h3>Datos del dueno</h3>
                <div className="details-grid">
                  <p><strong>Nombre:</strong> {selectedVehicle.owner.full_name}</p>
                  <p><strong>Codigo:</strong> {selectedVehicle.owner.code}</p>
                  <p><strong>Documento:</strong> {selectedVehicle.owner.document_id || "No registrado"}</p>
                  <p><strong>Facultad:</strong> {selectedVehicle.owner.faculty || "No registrada"}</p>
                  <p><strong>Rol:</strong> {selectedVehicle.owner.role}</p>
                  <p><strong>Contacto:</strong> {selectedVehicle.owner.contact_info || "No registrado"}</p>
                </div>
              </>
            )}

            {selectedVehicle.observation && (
              <p><strong>Observacion:</strong> {selectedVehicle.observation}</p>
            )}

            {error && <p className="error-text">{error}</p>}

            <div className="modal-actions">
              <button type="button" onClick={handleOpenEdit}>Editar</button>
              <button type="button" className="danger-button" onClick={handleDeleteVehicle} disabled={saving}>
                {saving ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingVehicle && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleSaveEdit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Edicion</p>
                <h2>Editar mi vehiculo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setEditingVehicle(null)}>
                Cerrar
              </button>
            </div>

            <div className="form-block">
              <h4>Datos del vehiculo</h4>
              <div className="details-grid">
                <label className="field-group">
                  <span>Placa</span>
                  <input
                    type="text"
                    value={editingVehicle.license_plate}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        license_plate: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Marca</span>
                  <input
                    type="text"
                    value={editingVehicle.brand}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        brand: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Modelo</span>
                  <input
                    type="text"
                    value={editingVehicle.model}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        model: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Color</span>
                  <input
                    type="text"
                    value={editingVehicle.color}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        color: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Foto nueva</span>
                  <input type="file" accept="image/*" onChange={(event) => setEditingPhoto(event.target.files?.[0] || null)} />
                </label>
                <label className="field-group">
                  <span>Tipo</span>
                  <select
                    value={editingVehicle.vehicle_type}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        vehicle_type: event.target.value
                      }))
                    }
                  >
                    <option value="CAR">Auto</option>
                    <option value="MOTORCYCLE">Motocicleta</option>
                    <option value="VAN">Vagoneta</option>
                    <option value="TRUCK">Camioneta</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="form-block">
              <h4>Datos del dueno</h4>
              <div className="details-grid">
                <label className="field-group">
                  <span>Codigo universitario</span>
                  <input
                    type="text"
                    value={editingVehicle.owner.code}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        owner: { ...current.owner, code: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    value={editingVehicle.owner.full_name}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        owner: { ...current.owner, full_name: event.target.value }
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Documento</span>
                  <input
                    type="text"
                    value={editingVehicle.owner.document_id}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        owner: { ...current.owner, document_id: event.target.value }
                      }))
                    }
                  />
                </label>
                <label className="field-group">
                  <span>Facultad</span>
                  <input
                    type="text"
                    value={editingVehicle.owner.faculty}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        owner: { ...current.owner, faculty: event.target.value }
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="modal-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default Dashboard;
