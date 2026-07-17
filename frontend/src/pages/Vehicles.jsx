import { useEffect, useState } from "react";

import PlateCard from "../components/PlateCard";
import Loader from "../components/Loader";
import {
  deleteVehicle,
  getDashboardSummary,
  getVehicleDetail,
  updateVehicleWithPhoto,
  createVehicleWithPhoto
} from "../api/plates";
import { useAuth } from "../hooks/useAuth";
import { formatPlate } from "../utils/formatters";

function Vehicles() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [creatingVehicle, setCreatingVehicle] = useState(null);
  const [creatingPhoto, setCreatingPhoto] = useState(null);
  const [filterType, setFilterType] = useState(user?.role === "ADMIN" ? "ALL" : "MY");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const filterId = user?.role === "ADMIN" ? undefined : user?.id;
      const data = await getDashboardSummary(filterId);
      setDashboardData(data);
    } catch (loadError) {
      setError("No se pudo cargar la informacion de vehiculos desde el backend.");
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadVehicles();
      if (user?.role !== "ADMIN") {
        setFilterType("MY");
      }
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

  const handleOpenCreate = () => {
    // Pre-llenar datos del dueño con el perfil del usuario logueado (Operador)
    // Admin puede dejar estos campos vacíos y llenarlos manualmente
    const isAdmin = user?.role === "ADMIN";
    setCreatingVehicle({
      license_plate: "",
      brand: "",
      model: "",
      color: "",
      vehicle_type: "CAR",
      year: new Date().getFullYear(),
      observations: "",
      owner_code:     isAdmin ? "" : (user?.code || ""),
      owner_name:     isAdmin ? "" : (user?.full_name || ""),
      owner_document: isAdmin ? "" : (user?.document_id || ""),
      owner_faculty:  isAdmin ? "" : (user?.faculty || ""),
      owner_role:     isAdmin ? "STUDENT" : (user?.catalog_role || "STUDENT"),
      owner_contact:  isAdmin ? "" : (user?.contact_info || user?.phone || ""),
      status: "ACTIVE"
    });
    setCreatingPhoto(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        license_plate: formatPlate(creatingVehicle.license_plate),
        brand: creatingVehicle.brand,
        model: creatingVehicle.model,
        color: creatingVehicle.color,
        vehicle_type: creatingVehicle.vehicle_type,
        year: parseInt(creatingVehicle.year) || null,
        observations: creatingVehicle.observations,
        owner_code: creatingVehicle.owner_code,
        owner_name: creatingVehicle.owner_name,
        owner_document: creatingVehicle.owner_document,
        owner_faculty: creatingVehicle.owner_faculty,
        owner_role: creatingVehicle.owner_role,
        owner_contact: creatingVehicle.owner_contact,
        status: creatingVehicle.status
      };

      await createVehicleWithPhoto(payload, creatingPhoto);
      setCreatingVehicle(null);
      loadVehicles();
    } catch (createErr) {
      setError(createErr.message || "No se pudo registrar el vehiculo.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = () => {
    setEditingVehicle(mapVehicleToForm(selectedVehicle));
    setEditingPhoto(null);
  };

  const mapVehicleToForm = (vehicle) => {
    return {
      id: vehicle.id,
      license_plate: vehicle.license_plate,
      brand: vehicle.brand,
      model: vehicle.model,
      color: vehicle.color,
      vehicle_type: vehicle.vehicle_type,
      year: vehicle.year || "",
      observations: vehicle.observations || "",
      owner: {
        id: vehicle.owner.id,
        code: vehicle.owner.code,
        full_name: vehicle.owner.full_name,
        document_id: vehicle.owner.document_id || "",
        faculty: vehicle.owner.faculty || "",
        role: vehicle.owner.role,
        contact_info: vehicle.owner.contact_info || ""
      },
      status: vehicle.status
    };
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingVehicle?.id) {
      return;
    }

    try {
      setSaving(true);
      const updated = await updateVehicleWithPhoto(
        editingVehicle.id,
        {
          ...editingVehicle,
          license_plate: formatPlate(editingVehicle.license_plate),
          registered_by_user_id: user?.id
        },
        editingPhoto
      );
      setSelectedVehicle(updated);
      setEditingVehicle(null);
      await loadVehicles();
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
      await loadVehicles();
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || "No se pudo eliminar el vehiculo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader label="Cargando vehículos..." />;
  }

  const vehiclesList = dashboardData?.my_vehicles || [];
  const filteredVehicles = vehiclesList.filter((v) => {
    if (filterType === "MY") {
      return v.registered_by_user_id === user?.id;
    }
    return true;
  });

  return (
    <section className="page-stack">
      <div className="hero card">
        <p className="eyebrow">{user?.role === "ADMIN" ? "Administracion" : "Operador"}</p>
        <h2>{user?.role === "ADMIN" ? "Gestión de Vehículos" : "Mis Vehículos"}</h2>
        <p className="muted-text">
          {user?.role === "ADMIN"
            ? "Registra, edita, audita o elimina los vehículos autorizados para ingresar a los campus de la universidad."
            : "Registra, edita o visualiza los vehículos que has dado de alta para el control de accesos."}
        </p>
      </div>

      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p className="eyebrow">Listado de Vehiculos</p>
          <h3>{user?.role === "ADMIN" ? "Todos los vehiculos del sistema" : "Vehículos registrados por mi cuenta"}</h3>
        </div>
        <button type="button" onClick={handleOpenCreate} style={{ padding: "0.6rem 1.2rem" }}>
          Registrar Vehiculo
        </button>
      </div>

      {/* Selector de Pestañas (Solo administradores) */}
      {user?.role === "ADMIN" && (
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setFilterType("ALL")}
            style={{
              background: filterType === "ALL" ? "var(--color-primary)" : "rgba(21, 62, 117, 0.05)",
              color: filterType === "ALL" ? "white" : "var(--color-primary)",
              padding: "0.6rem 1.2rem",
              fontWeight: "bold",
              border: "1px solid rgba(21, 62, 117, 0.1)",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Todos los vehículos
          </button>
          <button
            type="button"
            onClick={() => setFilterType("MY")}
            style={{
              background: filterType === "MY" ? "var(--color-primary)" : "rgba(21, 62, 117, 0.05)",
              color: filterType === "MY" ? "white" : "var(--color-primary)",
              padding: "0.6rem 1.2rem",
              fontWeight: "bold",
              border: "1px solid rgba(21, 62, 117, 0.1)",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Mis vehículos
          </button>
        </div>
      )}

      {error && <p className="error-text" style={{ background: "#ffe6e6", padding: "0.8rem", borderRadius: "8px", border: "1px solid red" }}>{error}</p>}

      {!filteredVehicles.length && (
        <div className="card">
          <p className="muted-text text-center">No se encontraron vehículos registrados bajo esta selección.</p>
        </div>
      )}

      {filteredVehicles.length > 0 && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
                <th style={{ padding: "1rem" }}>Placa</th>
                <th style={{ padding: "1rem" }}>Vehículo</th>
                <th style={{ padding: "1rem" }}>Propietario</th>
                <th style={{ padding: "1rem" }}>Registro</th>
                <th style={{ padding: "1rem" }}>Tipo</th>
                <th style={{ padding: "1rem" }}>Estado</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => (
                <tr key={v.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                  <td style={{ padding: "1rem" }}>
                    <span 
                      style={{ 
                        fontFamily: "monospace", 
                        fontSize: "1rem", 
                        fontWeight: "bold", 
                        background: "#e6f2ff", 
                        color: "#153e75", 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "4px" 
                      }}
                    >
                      {v.license_plate}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "bold" }}>
                    {v.brand} {v.model} <span style={{ fontWeight: "normal", color: "#666" }}>({v.color})</span>
                  </td>
                  <td style={{ padding: "1rem" }}>{v.owner?.full_name || "N/A"}</td>
                  <td style={{ padding: "1rem" }}>{v.owner?.code || "N/A"}</td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{ textTransform: "capitalize" }}>
                      {String(v.vehicle_type).toLowerCase()}
                    </span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      background: v.status === "ACTIVE" ? "#e6ffe6" : "#f2f2f2",
                      color: v.status === "ACTIVE" ? "green" : "#666"
                    }}>
                      {v.status === "ACTIVE" ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => handleVehicleSelect(v)}
                      style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: "var(--color-primary)" }}
                    >
                      Ver / Editar
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={async () => {
                        if (window.confirm(`¿Estás seguro de que deseas eliminar el vehículo con placa ${v.license_plate}?`)) {
                          try {
                            setSaving(true);
                            await deleteVehicle(v.id);
                            loadVehicles();
                          } catch (err) {
                            setError("No se pudo eliminar el vehículo.");
                          } finally {
                            setSaving(false);
                          }
                        }
                      }}
                      style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedVehicle && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Detalles del vehiculo</p>
                <h2 className="plate-badge">{formatPlate(selectedVehicle.license_plate)}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setSelectedVehicle(null)}>
                Cerrar
              </button>
            </div>

            {detailLoading ? (
              <Loader label="Cargando detalles..." />
            ) : (
              <div className="details-container">
                {selectedVehicle.photo_url && (
                  <div className="vehicle-photo-container">
                    <img
                      src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}${selectedVehicle.photo_url}`}
                      alt={`Vehiculo ${selectedVehicle.license_plate}`}
                      className="vehicle-photo-detail"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="details-grid">
                  <p><strong>Marca:</strong> {selectedVehicle.brand}</p>
                  <p><strong>Modelo:</strong> {selectedVehicle.model}</p>
                  <p><strong>Color:</strong> {selectedVehicle.color}</p>
                  <p><strong>Año:</strong> {selectedVehicle.year || "N/A"}</p>
                  <p><strong>Tipo:</strong> {selectedVehicle.vehicle_type}</p>
                  <p><strong>Estado:</strong> {selectedVehicle.status}</p>
                  {selectedVehicle.observations && (
                    <p style={{ gridColumn: "1 / -1" }}><strong>Observaciones:</strong> {selectedVehicle.observations}</p>
                  )}
                </div>

                <div className="owner-section">
                  <h3>Datos del dueno</h3>
                  <div className="details-grid">
                    <p><strong>Nombre:</strong> {selectedVehicle.owner.full_name}</p>
                    <p><strong>Codigo:</strong> {selectedVehicle.owner.code}</p>
                    <p><strong>Documento:</strong> {selectedVehicle.owner.document_id || "N/A"}</p>
                    <p><strong>Facultad:</strong> {selectedVehicle.owner.faculty || "N/A"}</p>
                    <p><strong>Rol:</strong> {selectedVehicle.owner.role}</p>
                    <p><strong>Contacto:</strong> {selectedVehicle.owner.contact_info || "N/A"}</p>
                  </div>
                </div>

                <div className="modal-actions" style={{ display: "flex", gap: "1rem" }}>
                  <button type="button" onClick={handleOpenEdit}>
                    Editar
                  </button>
                  <button type="button" className="danger-button" onClick={handleDeleteVehicle}>
                    Eliminar Vehiculo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editingVehicle && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleSaveEdit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Edicion</p>
                <h2>Editar vehiculo</h2>
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

      {creatingVehicle && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleCreateSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Registro</p>
                <h2>Registrar nuevo vehiculo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setCreatingVehicle(null)}>
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
                    placeholder="1234ABC"
                    value={creatingVehicle.license_plate}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
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
                    placeholder="Toyota"
                    value={creatingVehicle.brand}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
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
                    placeholder="Corolla"
                    value={creatingVehicle.model}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
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
                    placeholder="Rojo"
                    value={creatingVehicle.color}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
                        ...current,
                        color: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Foto del vehiculo</span>
                  <input type="file" accept="image/*" onChange={(event) => setCreatingPhoto(event.target.files?.[0] || null)} />
                </label>
                <label className="field-group">
                  <span>Tipo</span>
                  <select
                    value={creatingVehicle.vehicle_type}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
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
              <h4>Datos del propietario</h4>
              {user?.role !== "ADMIN" && (
                <div style={{
                  background: "rgba(21,62,117,0.08)", border: "1px solid rgba(21,62,117,0.25)",
                  borderRadius: "8px", padding: "0.6rem 1rem", marginBottom: "0.75rem",
                  fontSize: "0.82rem", color: "#153e75", display: "flex", alignItems: "center", gap: "0.4rem"
                }}>
                  🔒 Los datos del propietario se completan automáticamente con tu perfil. Solo un administrador puede registrar vehículos a nombre de otra persona.
                </div>
              )}
              <div className="details-grid">
                <label className="field-group">
                  <span>Codigo universitario</span>
                  <input
                    type="text"
                    placeholder="22001122"
                    value={creatingVehicle.owner_code}
                    onChange={(event) =>
                      user?.role === "ADMIN" && setCreatingVehicle((current) => ({
                        ...current,
                        owner_code: event.target.value
                      }))
                    }
                    readOnly={user?.role !== "ADMIN"}
                    style={user?.role !== "ADMIN" ? { background: "#f0f4f8", cursor: "not-allowed" } : {}}
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Nombre completo</span>
                  <input
                    type="text"
                    placeholder="Juan Perez"
                    value={creatingVehicle.owner_name}
                    onChange={(event) =>
                      user?.role === "ADMIN" && setCreatingVehicle((current) => ({
                        ...current,
                        owner_name: event.target.value
                      }))
                    }
                    readOnly={user?.role !== "ADMIN"}
                    style={user?.role !== "ADMIN" ? { background: "#f0f4f8", cursor: "not-allowed" } : {}}
                    required
                  />
                </label>
                <label className="field-group">
                  <span>Documento (CI)</span>
                  <input
                    type="text"
                    placeholder="1234567"
                    value={creatingVehicle.owner_document}
                    onChange={(event) =>
                      user?.role === "ADMIN" && setCreatingVehicle((current) => ({
                        ...current,
                        owner_document: event.target.value
                      }))
                    }
                    readOnly={user?.role !== "ADMIN"}
                    style={user?.role !== "ADMIN" ? { background: "#f0f4f8", cursor: "not-allowed" } : {}}
                  />
                </label>
                <label className="field-group">
                  <span>Facultad / Carrera</span>
                  <input
                    type="text"
                    placeholder="Facultad de Tecnologia"
                    value={creatingVehicle.owner_faculty}
                    onChange={(event) =>
                      user?.role === "ADMIN" && setCreatingVehicle((current) => ({
                        ...current,
                        owner_faculty: event.target.value
                      }))
                    }
                    readOnly={user?.role !== "ADMIN"}
                    style={user?.role !== "ADMIN" ? { background: "#f0f4f8", cursor: "not-allowed" } : {}}
                  />
                </label>
                <label className="field-group">
                  <span>Rol academico</span>
                  <select
                    value={creatingVehicle.owner_role}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
                        ...current,
                        owner_role: event.target.value
                      }))
                    }
                    disabled={user?.role !== "ADMIN"}
                    style={user?.role !== "ADMIN" ? { background: "#f0f4f8", cursor: "not-allowed" } : {}}
                  >
                    <option value="STUDENT">Estudiante</option>
                    <option value="TEACHER">Docente</option>
                    <option value="ADMIN">Administrativo</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Contacto / Telefono</span>
                  <input
                    type="text"
                    placeholder="70000000"
                    value={creatingVehicle.owner_contact}
                    onChange={(event) =>
                      user?.role === "ADMIN" && setCreatingVehicle((current) => ({
                        ...current,
                        owner_contact: event.target.value
                      }))
                    }
                    readOnly={user?.role !== "ADMIN"}
                    style={user?.role !== "ADMIN" ? { background: "#f0f4f8", cursor: "not-allowed" } : {}}
                  />
                </label>
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="modal-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Registrando..." : "Registrar Vehiculo"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default Vehicles;
