import { useEffect, useState, useCallback } from "react";
import Loader from "../components/Loader";
import ConfirmModal from "../components/ConfirmModal";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getVehicleTypes,
  createVehicleType,
  updateVehicleType,
  deleteVehicleType,
  uploadVehiclePhoto,
  getMediaUrl
} from "../api/plates";
import { listUsers } from "../api/auth";
import { useAuth } from "../hooks/useAuth";
import { formatPlate, validatePlateForm } from "../utils/formatters";
import Pagination from "../components/Pagination";

function Vehicles() {
  const { user } = useAuth();
  const isAdmin = user?.rol === "ADMINISTRADOR";
  const isStaff = user?.rol === "ADMINISTRADOR" || user?.rol === "OPERADOR";

  const [activeTab, setActiveTab] = useState("vehicles"); // "vehicles" | "brands" | "types"

  // Datos
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filterType, setFilterType] = useState(isStaff ? "ALL" : "MY");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Formularios Modales
  const [creatingVehicle, setCreatingVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [viewingVehicle, setViewingVehicle] = useState(null);

  const [creatingBrand, setCreatingBrand] = useState(null); // { nombre: "" }
  const [editingBrand, setEditingBrand] = useState(null); // { id, nombre: "" }

  const [creatingType, setCreatingType] = useState(null); // { nombre: "" }
  const [editingType, setEditingType] = useState(null); // { id, nombre: "" }

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmColor: "var(--color-primary)",
    onConfirm: null
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const filterId = isStaff ? undefined : user?.id;
      const [vehiclesData, brandsData, typesData] = await Promise.all([
        getVehicles(filterId),
        getBrands(),
        getVehicleTypes()
      ]);

      setVehicles(vehiclesData || []);
      setBrands(brandsData || []);
      setTypes(typesData || []);

      if (isStaff) {
        const usersData = await listUsers();
        const normalUsers = (usersData || []).filter(u => u.rol === "USUARIO");
        setUsers(normalUsers);
      }
    } catch (err) {
      setError("No se pudo cargar la información del sistema.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user, isStaff]);

  useEffect(() => {
    if (user?.id) {
      loadData();
      if (!isStaff) {
        setFilterType("MY");
        setActiveTab("vehicles");
      }
    }
  }, [user, loadData, isStaff]);

  useEffect(() => {
    const photoIds = [...new Set(vehicles.map((vehicle) => vehicle.foto_id).filter(Boolean))];
    if (!photoIds.length) return;

    const missingPhotoIds = photoIds.filter((photoId) => !vehiclePhotoUrls[photoId]);
    if (!missingPhotoIds.length) return;

    let isMounted = true;
    Promise.all(
      missingPhotoIds.map(async (photoId) => {
        try {
          const response = await getMediaUrl(photoId);
          return [photoId, response?.url || ""];
        } catch {
          return [photoId, ""];
        }
      })
    ).then((entries) => {
      if (!isMounted) return;
      setVehiclePhotoUrls((current) => ({
        ...current,
        ...Object.fromEntries(entries)
      }));
    });

    return () => {
      isMounted = false;
    };
  }, [vehicles, vehiclePhotoUrls]);

  // ── ACCIONES: VEHÍCULOS ──────────────────────────────────────────
  const handleOpenCreateVehicle = () => {
    setCreatingVehicle({
      placa: "",
      color: "",
      marca_id: brands[0]?.id || "",
      tipo_vehiculo_id: types[0]?.id || "",
      propietario_usuario_id: isStaff ? (users[0]?.id || "") : user?.id,
      photoFile: null
    });
    setError("");
    setSuccess("");
  };

  const handleCreateVehicleSubmit = (e) => {
    e.preventDefault();
    if (!creatingVehicle.marca_id || !creatingVehicle.tipo_vehiculo_id || !creatingVehicle.propietario_usuario_id) {
      setError("Por favor, asegúrate de que existan marcas, tipos y propietarios antes de registrar.");
      return;
    }
    setError("");

    const plateVal = formatPlate(creatingVehicle.placa);

    setConfirmConfig({
      isOpen: true,
      title: "Registrar Vehículo",
      message: `¿Confirmas el registro del vehículo con placa ${plateVal}?`,
      confirmColor: "var(--color-primary)",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          const createdVehicle = await createVehicle({
            placa: plateVal,
            color: creatingVehicle.color,
            marca_id: creatingVehicle.marca_id,
            tipo_vehiculo_id: creatingVehicle.tipo_vehiculo_id,
            propietario_usuario_id: creatingVehicle.propietario_usuario_id
          });
          if (creatingVehicle.photoFile) {
            await uploadVehiclePhoto(createdVehicle.id, creatingVehicle.photoFile);
          }
          setSuccess(`Vehículo ${plateVal} registrado con éxito.`);
          setCreatingVehicle(null);
          loadData();
        } catch (err) {
          setError(err.message || "No se pudo registrar el vehículo.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleOpenVehicleDetails = (v) => {
    setViewingVehicle(v);
    setError("");
    setSuccess("");
  };

  const handleOpenEditVehicle = (v) => {
    setEditingVehicle({
      id: v.id,
      placa: v.placa,
      color: v.color,
      marca_id: v.marca_id,
      tipo_vehiculo_id: v.tipo_vehiculo_id,
      propietario_usuario_id: v.propietario_usuario_id,
      foto_id: v.foto_id || null,
      photoFile: null
    });
    setViewingVehicle(null);
    setError("");
    setSuccess("");
  };

  const handleEditVehicleSubmit = (e) => {
    e.preventDefault();
    if (!editingVehicle?.id) return;

    const plateVal = formatPlate(editingVehicle.placa);

    setConfirmConfig({
      isOpen: true,
      title: "Guardar Cambios",
      message: `¿Estás seguro de que deseas guardar los cambios para el vehículo con placa ${plateVal}?`,
      confirmColor: "var(--color-primary)",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          await updateVehicle(editingVehicle.id, {
            placa: plateVal,
            color: editingVehicle.color,
            marca_id: editingVehicle.marca_id,
            tipo_vehiculo_id: editingVehicle.tipo_vehiculo_id,
            propietario_usuario_id: editingVehicle.propietario_usuario_id
          });
          if (editingVehicle.photoFile) {
            await uploadVehiclePhoto(editingVehicle.id, editingVehicle.photoFile);
          }
          setSuccess(`Vehículo ${plateVal} actualizado con éxito.`);
          setEditingVehicle(null);
          loadData();
        } catch (err) {
          setError(err.message || "No se pudo actualizar el vehículo.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleDeleteVehicle = (v) => {
    setConfirmConfig({
      isOpen: true,
      title: "Eliminar Vehículo",
      message: `¿Estás seguro de que deseas eliminar permanentemente el vehículo con placa ${v.placa}? Esta acción es irreversible.`,
      confirmColor: "#e11d48",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          await deleteVehicle(v.id);
          setSuccess(`Vehículo con placa ${v.placa} eliminado con éxito.`);
          loadData();
        } catch (err) {
          setError(err.message || "No se pudo eliminar el vehículo.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // ── ACCIONES: MARCAS (ADMIN ONLY) ───────────────────────────────
  const handleCreateBrandSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await createBrand({ nombre: creatingBrand.nombre });
      setSuccess(`Marca "${creatingBrand.nombre}" registrada con éxito.`);
      setCreatingBrand(null);
      loadData();
    } catch (err) {
      setError(err.message || "No se pudo registrar la marca.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditBrandSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateBrand(editingBrand.id, { nombre: editingBrand.nombre });
      setSuccess(`Marca actualizada con éxito.`);
      setEditingBrand(null);
      loadData();
    } catch (err) {
      setError(err.message || "No se pudo actualizar la marca.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBrand = (b) => {
    setConfirmConfig({
      isOpen: true,
      title: "Eliminar Marca",
      message: `¿Estás seguro de que deseas eliminar la marca "${b.nombre}"? Esto afectará a los vehículos asociados.`,
      confirmColor: "#e11d48",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          await deleteBrand(b.id);
          setSuccess(`Marca "${b.nombre}" eliminada.`);
          loadData();
        } catch (err) {
          setError(err.message || "No se pudo eliminar la marca.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  // ── ACCIONES: TIPOS (ADMIN ONLY) ────────────────────────────────
  const handleCreateTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await createVehicleType({ nombre: creatingType.nombre });
      setSuccess(`Tipo "${creatingType.nombre}" registrado con éxito.`);
      setCreatingType(null);
      loadData();
    } catch (err) {
      setError(err.message || "No se pudo registrar el tipo.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTypeSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateVehicleType(editingType.id, { nombre: editingType.nombre });
      setSuccess(`Tipo de vehículo actualizado con éxito.`);
      setEditingType(null);
      loadData();
    } catch (err) {
      setError(err.message || "No se pudo actualizar el tipo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteType = (t) => {
    setConfirmConfig({
      isOpen: true,
      title: "Eliminar Tipo",
      message: `¿Estás seguro de que deseas eliminar el tipo de vehículo "${t.nombre}"? Esto afectará a los vehículos asociados.`,
      confirmColor: "#e11d48",
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setSaving(true);
          await deleteVehicleType(t.id);
          setSuccess(`Tipo "${t.nombre}" eliminado.`);
          loadData();
        } catch (err) {
          setError(err.message || "No se pudo eliminar el tipo.");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  if (loading) {
    return <Loader label="Cargando información..." />;
  }

  // Filtrado de vehículos en frontend
  const filteredVehicles = vehicles.filter((v) => {
    if (filterType === "MY") {
      return v.propietario_usuario_id === user?.id;
    }
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVehicles = filteredVehicles.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <section className="page-stack">
      {/* Cabecera Principal */}
      <div className="hero card">
        <p className="eyebrow">Gestión</p>
        <h2>Control de Vehículos y Catálogos</h2>
        <p className="muted-text">
          Registra vehículos autorizados y gestiona las marcas y categorías oficiales del campus.
        </p>
      </div>

      {/* Selector de pestañas para administradores */}
      {isAdmin && (
        <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid rgba(21, 62, 117, 0.1)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
          <button
            type="button"
            onClick={() => { setActiveTab("vehicles"); setError(""); setSuccess(""); }}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "vehicles" ? "3px solid var(--color-primary)" : "none",
              color: activeTab === "vehicles" ? "var(--color-primary)" : "#666",
              padding: "0.5rem 1rem",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Vehículos
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("brands"); setError(""); setSuccess(""); }}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "brands" ? "3px solid var(--color-primary)" : "none",
              color: activeTab === "brands" ? "var(--color-primary)" : "#666",
              padding: "0.5rem 1rem",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Gestionar Marcas
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("types"); setError(""); setSuccess(""); }}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "types" ? "3px solid var(--color-primary)" : "none",
              color: activeTab === "types" ? "var(--color-primary)" : "#666",
              padding: "0.5rem 1rem",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Gestionar Tipos de Vehículo
          </button>
        </div>
      )}

      {success && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><p style={{ color: "green", fontWeight: "bold", background: "#e6ffe6", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid green", margin: 0 }}>{success}</p></div>}
      {error && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><p className="error-text" style={{ background: "#ffe6e6", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid red", display: "inline-block", margin: 0 }}>{error}</p></div>}

      {/* ── CONTENIDO DE LA PESTAÑA: VEHÍCULOS ────────────────────────── */}
      {activeTab === "vehicles" && (
        <>
          <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
            <div>
              <p className="eyebrow">Vehículos</p>
              <h3>{isStaff ? "Todos los vehículos del sistema" : "Vehículos registrados bajo mi cuenta"}</h3>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="ghost-button" onClick={loadData} style={{ padding: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }} title="Refrescar tabla">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/></svg>
              </button>
              <button type="button" onClick={handleOpenCreateVehicle} style={{ padding: "0.6rem 1.2rem" }}>
                Registrar Vehículo
              </button>
            </div>
          </div>
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
                    <th style={{ padding: "1rem" }}>Foto</th>
                    <th style={{ padding: "1rem" }}>Placa</th>
                    <th style={{ padding: "1rem" }}>Marca</th>
                    <th style={{ padding: "1rem" }}>Color</th>
                    <th style={{ padding: "1rem" }}>Propietario</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentVehicles.map((v) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                      <td style={{ padding: "1rem" }}>
                        {v.foto_id && vehiclePhotoUrls[v.foto_id] ? (
                          <img
                            src={vehiclePhotoUrls[v.foto_id]}
                            alt={`Foto del vehículo ${v.placa}`}
                            style={{ width: "84px", height: "84px", objectFit: "cover", borderRadius: "10px", border: "1px solid rgba(21, 62, 117, 0.15)" }}
                          />
                        ) : (
                          <span className="muted-text">Sin foto</span>
                        )}
                      </td>
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
                          {v.placa}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", fontWeight: "bold" }}>
                        {v.marca?.nombre || "N/A"}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        {v.color}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        {v.propietario ? `${v.propietario.nombre} ${v.propietario.apellido_paterno}` : "N/A"}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(v)}
                          title="Editar vehículo"
                          style={{ width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-primary)", color: "white", border: "none", cursor: "pointer" }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenVehicleDetails(v)}
                          title="Ver detalles"
                          style={{ width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f766e", color: "white", border: "none", cursor: "pointer" }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>visibility</span>
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteVehicle(v)}
                          title="Eliminar vehículo"
                          style={{ width: "34px", height: "34px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "#e11d48", color: "white", border: "none", cursor: "pointer" }}
                        >
                          <span className="material-symbols-rounded" style={{ fontSize: "18px" }}>delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredVehicles.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredVehicles.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* ── CONTENIDO DE LA PESTAÑA: MARCAS ─────────────────────────── */}
      {activeTab === "brands" && isAdmin && (
        <>
          <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
            <div>
              <p className="eyebrow">Catálogos</p>
              <h3>Marcas de Vehículos</h3>
            </div>
            <button type="button" onClick={() => setCreatingBrand({ nombre: "" })} style={{ padding: "0.6rem 1.2rem" }}>
              Agregar Nueva Marca
            </button>
          </div>

          {!brands.length && (
            <div className="card">
              <p className="muted-text text-center">No hay marcas registradas en el sistema.</p>
            </div>
          )}

          {brands.length > 0 && (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
                    <th style={{ padding: "1rem" }}>Nombre de la Marca</th>
                    <th style={{ padding: "1rem" }}>ID</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                      <td style={{ padding: "1rem", fontWeight: "bold" }}>
                        {b.nombre}
                      </td>
                      <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#666" }}>
                        {b.id}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setEditingBrand({ id: b.id, nombre: b.nombre })}
                          style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: "var(--color-primary)" }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteBrand(b)}
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
        </>
      )}

      {/* ── CONTENIDO DE LA PESTAÑA: TIPOS ──────────────────────────── */}
      {activeTab === "types" && isAdmin && (
        <>
          <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
            <div>
              <p className="eyebrow">Catálogos</p>
              <h3>Tipos de Vehículos</h3>
            </div>
            <button type="button" onClick={() => setCreatingType({ nombre: "" })} style={{ padding: "0.6rem 1.2rem" }}>
              Agregar Nuevo Tipo
            </button>
          </div>

          {!types.length && (
            <div className="card">
              <p className="muted-text text-center">No hay tipos de vehículos registrados en el sistema.</p>
            </div>
          )}

          {types.length > 0 && (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(21, 62, 117, 0.1)", color: "#153e75" }}>
                    <th style={{ padding: "1rem" }}>Categoría / Tipo</th>
                    <th style={{ padding: "1rem" }}>ID</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid rgba(21, 62, 117, 0.05)" }}>
                      <td style={{ padding: "1rem", fontWeight: "bold" }}>
                        {t.nombre}
                      </td>
                      <td style={{ padding: "1rem", fontFamily: "monospace", fontSize: "0.85rem", color: "#666" }}>
                        {t.id}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setEditingType({ id: t.id, nombre: t.nombre })}
                          style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", background: "var(--color-primary)" }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteType(t)}
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
        </>
      )}

      {/* ── MODALES: VEHÍCULOS ──────────────────────────────────────── */}
      {/* Modal de Registro de Vehículo */}
      {creatingVehicle && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleCreateVehicleSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Registro</p>
                <h2>Registrar nuevo vehículo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setCreatingVehicle(null)}>
                Cerrar
              </button>
            </div>

            <div className="form-block">
              <h4>Datos del vehículo</h4>
              <div className="details-grid">
                <label className="field-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span>Placa</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Obligatorio</span>
                  </div>
                  <input
                    type="text"
                    placeholder="1234ABC"
                    className={validatePlateForm(creatingVehicle.placa).className}
                    value={creatingVehicle.placa}
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
                        ...current,
                        placa: event.target.value
                      }))
                    }
                    required
                  />
                  {validatePlateForm(creatingVehicle.placa).message && (
                    <span className={`field-hint ${validatePlateForm(creatingVehicle.placa).className === "field-valid" ? "valid" : "invalid"}`}>
                      {validatePlateForm(creatingVehicle.placa).message}
                    </span>
                  )}
                </label>

                <label className="field-group">
                  <span>Color</span>
                  <input
                    type="text"
                    placeholder="Ej. Rojo"
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
                  <span>Marca</span>
                  {brands.length > 0 ? (
                    <select
                      value={creatingVehicle.marca_id}
                      onChange={(event) =>
                        setCreatingVehicle((current) => ({
                          ...current,
                          marca_id: event.target.value
                        }))
                      }
                      required
                    >
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", color: "#e11d48", background: "#fef2f2", border: "1px solid #fee2e2", padding: "0.5rem 0.8rem", borderRadius: "6px", fontSize: "0.85rem", marginTop: "5px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span>No hay marcas registradas. Agrégalas en la pestaña "Gestionar Marcas" primero.</span>
                    </div>
                  )}
                </label>

                <label className="field-group">
                  <span>Tipo de Vehículo</span>
                  {types.length > 0 ? (
                    <select
                      value={creatingVehicle.tipo_vehiculo_id}
                      onChange={(event) =>
                        setCreatingVehicle((current) => ({
                          ...current,
                          tipo_vehiculo_id: event.target.value
                        }))
                      }
                      required
                    >
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", color: "#e11d48", background: "#fef2f2", border: "1px solid #fee2e2", padding: "0.5rem 0.8rem", borderRadius: "6px", fontSize: "0.85rem", marginTop: "5px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <span>No hay tipos de vehículos registrados. Agrégalas en la pestaña "Gestionar Tipos" primero.</span>
                    </div>
                  )}
                </label>

                {isStaff ? (
                  <label className="field-group">
                    <span>Propietario Asociado</span>
                    {users.length > 0 ? (
                       <select
                        value={creatingVehicle.propietario_usuario_id}
                        onChange={(event) =>
                          setCreatingVehicle((current) => ({
                            ...current,
                            propietario_usuario_id: event.target.value
                          }))
                        }
                        required
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre} {u.apellido_paterno} ({u.carnet})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", color: "#e11d48", background: "#fef2f2", border: "1px solid #fee2e2", padding: "0.5rem 0.8rem", borderRadius: "6px", fontSize: "0.85rem", marginTop: "5px" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span>No hay usuarios registrados en el sistema.</span>
                      </div>
                    )}
                  </label>
                ) : (
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem", alignItems: "center", background: "#f0f9ff", border: "1px solid #e0f2fe", padding: "0.6rem 1rem", borderRadius: "8px", fontSize: "0.85rem", color: "#0369a1" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span>El vehículo se registrará bajo tu propio nombre: <strong>{user?.nombre} {user?.apellido_paterno}</strong>.</span>
                  </div>
                )}
                <label className="field-group">
                  <span>Foto privada del vehículo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setCreatingVehicle((current) => ({
                        ...current,
                        photoFile: event.target.files?.[0] || null
                      }))
                    }
                  />
                  <small className="muted-text">Opcional. Se guarda de forma privada junto al registro.</small>
                </label>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" disabled={saving || !brands.length || !types.length}>
                {saving ? "Registrando..." : "Registrar Vehículo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Detalles de Vehículo */}
      {viewingVehicle && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large" style={{ maxWidth: "720px" }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Detalle</p>
                <h2>Información del vehículo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setViewingVehicle(null)}>
                Cerrar
              </button>
            </div>

            <div className="form-block">
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: "min(260px, 100%)", aspectRatio: "1 / 1", background: "#f8fafc", borderRadius: "16px", border: "1px solid rgba(21, 62, 117, 0.12)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {viewingVehicle.foto_id && vehiclePhotoUrls[viewingVehicle.foto_id] ? (
                      <img
                        src={vehiclePhotoUrls[viewingVehicle.foto_id]}
                        alt={`Foto del vehículo ${viewingVehicle.placa}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span className="muted-text">Sin foto registrada</span>
                    )}
                  </div>
                </div>

                <div className="details-grid" style={{ display: "grid", gap: "0.8rem" }}>
                  <div style={{ background: "#f8fafc", border: "1px solid rgba(21, 62, 117, 0.12)", borderRadius: "10px", padding: "0.9rem 1rem" }}>
                    <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Placa</p>
                    <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", fontFamily: "monospace" }}>{viewingVehicle.placa}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.8rem" }}>
                    <div style={{ background: "#f8fafc", border: "1px solid rgba(21, 62, 117, 0.12)", borderRadius: "10px", padding: "0.8rem 1rem" }}>
                      <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Marca</p>
                      <p style={{ margin: 0, fontWeight: "600" }}>{viewingVehicle.marca?.nombre || "N/A"}</p>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid rgba(21, 62, 117, 0.12)", borderRadius: "10px", padding: "0.8rem 1rem" }}>
                      <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Tipo</p>
                      <p style={{ margin: 0, fontWeight: "600" }}>{viewingVehicle.tipo?.nombre || "N/A"}</p>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.8rem" }}>
                    <div style={{ background: "#f8fafc", border: "1px solid rgba(21, 62, 117, 0.12)", borderRadius: "10px", padding: "0.8rem 1rem" }}>
                      <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Color</p>
                      <p style={{ margin: 0, fontWeight: "600" }}>{viewingVehicle.color || "N/A"}</p>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid rgba(21, 62, 117, 0.12)", borderRadius: "10px", padding: "0.8rem 1rem" }}>
                      <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Carnet / Registro</p>
                      <p style={{ margin: 0, fontWeight: "600" }}>{viewingVehicle.propietario?.carnet || "N/A"}</p>
                    </div>
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid rgba(21, 62, 117, 0.12)", borderRadius: "10px", padding: "0.9rem 1rem" }}>
                    <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Propietario</p>
                    <p style={{ margin: 0, fontWeight: "600" }}>
                      {viewingVehicle.propietario ? `${viewingVehicle.propietario.nombre} ${viewingVehicle.propietario.apellido_paterno}` : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Edición de Vehículo */}
      {editingVehicle && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleEditVehicleSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Edición</p>
                <h2>Editar vehículo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setEditingVehicle(null)}>
                Cerrar
              </button>
            </div>

            <div className="form-block">
              <h4>Datos del vehículo</h4>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ width: "min(220px, 100%)", aspectRatio: "1 / 1", background: "#f8fafc", borderRadius: "16px", border: "1px solid rgba(21, 62, 117, 0.12)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {editingVehicle.foto_id && vehiclePhotoUrls[editingVehicle.foto_id] ? (
                    <img
                      src={vehiclePhotoUrls[editingVehicle.foto_id]}
                      alt={`Foto actual del vehículo ${editingVehicle.placa}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span className="muted-text">Sin foto guardada</span>
                  )}
                </div>
                <div style={{ width: "100%", maxWidth: "320px" }}>
                  <label className="field-group" style={{ marginBottom: 0 }}>
                    <span>Foto privada del vehículo</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setEditingVehicle((current) => ({
                          ...current,
                          photoFile: event.target.files?.[0] || null
                        }))
                      }
                    />
                    <small className="muted-text">Puedes subir una nueva foto para reemplazar la actual.</small>
                  </label>
                </div>
              </div>
              <div className="details-grid">
                <label className="field-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span>Placa</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Obligatorio</span>
                  </div>
                  <input
                    type="text"
                    className={validatePlateForm(editingVehicle.placa).className}
                    value={editingVehicle.placa}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        placa: event.target.value
                      }))
                    }
                    required
                  />
                  {validatePlateForm(editingVehicle.placa).message && (
                    <span className={`field-hint ${validatePlateForm(editingVehicle.placa).className === "field-valid" ? "valid" : "invalid"}`}>
                      {validatePlateForm(editingVehicle.placa).message}
                    </span>
                  )}
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
                  <span>Marca</span>
                  <select
                    value={editingVehicle.marca_id}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        marca_id: event.target.value
                      }))
                    }
                    required
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Tipo de Vehículo</span>
                  <select
                    value={editingVehicle.tipo_vehiculo_id}
                    onChange={(event) =>
                      setEditingVehicle((current) => ({
                        ...current,
                        tipo_vehiculo_id: event.target.value
                      }))
                    }
                    required
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                {isStaff && (
                  <label className="field-group">
                    <span>Propietario Asociado</span>
                    <select
                      value={editingVehicle.propietario_usuario_id}
                      onChange={(event) =>
                        setEditingVehicle((current) => ({
                          ...current,
                          propietario_usuario_id: event.target.value
                        }))
                      }
                      required
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} {u.apellido_paterno} ({u.carnet})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODALES: MARCAS (ADMIN ONLY) ────────────────────────────── */}
      {creatingBrand && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleCreateBrandSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Catálogos</p>
                <h2>Agregar Nueva Marca</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setCreatingBrand(null)}>Cerrar</button>
            </div>
            <div className="form-block">
              <label className="field-group">
                <span>Nombre de la Marca</span>
                <input
                  type="text"
                  placeholder="Ej. Toyota, Suzuki"
                  value={creatingBrand.nombre}
                  onChange={(e) => setCreatingBrand({ nombre: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "1rem" }}>
              <button type="submit" disabled={saving}>
                {saving ? "Registrando..." : "Registrar Marca"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingBrand && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleEditBrandSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Catálogos</p>
                <h2>Editar Marca</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setEditingBrand(null)}>Cerrar</button>
            </div>
            <div className="form-block">
              <label className="field-group">
                <span>Nombre de la Marca</span>
                <input
                  type="text"
                  value={editingBrand.nombre}
                  onChange={(e) => setEditingBrand(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "1rem" }}>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODALES: TIPOS (ADMIN ONLY) ─────────────────────────────── */}
      {creatingType && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleCreateTypeSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Catálogos</p>
                <h2>Agregar Nuevo Tipo de Vehículo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setCreatingType(null)}>Cerrar</button>
            </div>
            <div className="form-block">
              <label className="field-group">
                <span>Nombre del Tipo / Categoría</span>
                <input
                  type="text"
                  placeholder="Ej. Vagoneta, Motocicleta, Camión"
                  value={creatingType.nombre}
                  onChange={(e) => setCreatingType({ nombre: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "1rem" }}>
              <button type="submit" disabled={saving}>
                {saving ? "Registrando..." : "Registrar Tipo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingType && (
        <div className="modal-backdrop">
          <form className="modal-card modal-large registration-form" onSubmit={handleEditTypeSubmit}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Catálogos</p>
                <h2>Editar Tipo de Vehículo</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setEditingType(null)}>Cerrar</button>
            </div>
            <div className="form-block">
              <label className="field-group">
                <span>Nombre del Tipo</span>
                <input
                  type="text"
                  value={editingType.nombre}
                  onChange={(e) => setEditingType(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "1rem" }}>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Confirmación General */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmColor={confirmConfig.confirmColor}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </section>
  );
}

export default Vehicles;
