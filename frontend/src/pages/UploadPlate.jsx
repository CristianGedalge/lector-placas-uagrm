import { useEffect, useRef, useState } from "react";

import UploadImage from "../components/UploadImage";
import {
  createVehicleWithPhoto,
  lookupVehicleByPlate,
  uploadPlateImage
} from "../api/plates";
import { useAuth } from "../hooks/useAuth";
import { formatPlate } from "../utils/formatters";

const ownerInitialState = {
  code: "",
  full_name: "",
  document_id: "",
  role: "STUDENT",
  faculty: "",
  contact_info: "",
  status: "ACTIVE",
  is_active: true
};

const vehicleInitialState = {
  license_plate: "",
  brand: "",
  model: "",
  color: "",
  vehicle_type: "CAR",
  year: "",
  observation: ""
};

function UploadPlate() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRATIVE" || user?.role === "ADMIN";
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [manualPlate, setManualPlate] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registeringForAnotherPerson, setRegisteringForAnotherPerson] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [vehicleForm, setVehicleForm] = useState(vehicleInitialState);
  const [ownerForm, setOwnerForm] = useState(ownerInitialState);
  const [vehiclePhoto, setVehiclePhoto] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [analysisPreview, setAnalysisPreview] = useState(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const resetLookupState = () => {
    setLookupError("");
    setLookupResult(null);
    setRegisterSuccess("");
    setRegisterError("");
    setAnalysisPreview(null);
    setShowFoundModal(false);
  };

  const openFoundModal = (result) => {
    setLookupResult(result);
    setShowFoundModal(true);
    setShowRegistrationModal(false);
  };

  const openRegistrationModal = (plateValue) => {
    setShowRegistrationModal(true);
    setShowFoundModal(false);
    setVehicleForm((current) => ({
      ...current,
      license_plate: plateValue || current.license_plate
    }));
  };

  const handleLookupPlate = async (plateValue) => {
    resetLookupState();
    setLookupLoading(true);

    try {
      const result = await lookupVehicleByPlate(plateValue);
      openFoundModal(result);
    } catch (error) {
      setLookupError(
        error?.response?.data?.detail ||
          "La placa no esta registrada. Puedes continuar con el alta del vehiculo."
      );
      openRegistrationModal(plateValue);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    const normalizedPlate = formatPlate(manualPlate);
    await handleLookupPlate(normalizedPlate);
  };

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0];
    setFileName(file ? file.name : "");
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLookupLoading(true);
      const analysis = await uploadPlateImage(formData);
      setAnalysisPreview(analysis);
      if (analysis?.normalized_plate) {
        setManualPlate(analysis.normalized_plate);
        await handleLookupPlate(analysis.normalized_plate);
      } else {
        setLookupError(analysis?.message || "No se pudo detectar una placa en la imagen.");
      }
    } catch (error) {
      setLookupError(error?.response?.data?.detail || "No se pudo analizar la imagen.");
    } finally {
      setLookupLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      setCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setCameraError("No se pudo abrir la camara del dispositivo.");
      console.error(error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCameraError("No se pudo capturar la imagen desde la camara.");
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "captura-placa.jpg");

    try {
      setLookupLoading(true);
      const analysis = await uploadPlateImage(formData);
      setAnalysisPreview(analysis);
      if (analysis?.normalized_plate) {
        setManualPlate(analysis.normalized_plate);
        await handleLookupPlate(analysis.normalized_plate);
      } else {
        setLookupError(analysis?.message || "No se pudo detectar una placa desde la camara.");
      }
    } catch (error) {
      setLookupError(error?.response?.data?.detail || "No se pudo analizar la captura.");
    } finally {
      setLookupLoading(false);
      stopCamera();
    }
  };

  const handleVehicleSubmit = async (event) => {
    event.preventDefault();
    setRegisterError("");
    setRegisterSuccess("");

    try {
      const payload = {
        ...vehicleForm,
        license_plate: formatPlate(vehicleForm.license_plate),
        registered_by_user_id: user?.id,
        owner: ownerForm
      };

      const createdVehicle = await createVehicleWithPhoto(payload, vehiclePhoto);
      setLookupResult(createdVehicle);
      setRegisterSuccess("Vehiculo registrado correctamente.");
      setVehicleForm(vehicleInitialState);
      setOwnerForm(ownerInitialState);
      setVehiclePhoto(null);
      setManualPlate(createdVehicle.license_plate);
      setShowRegistrationModal(false);
      openFoundModal(createdVehicle);
    } catch (error) {
      setRegisterError(
        error?.response?.data?.detail || "No se pudo registrar el vehiculo."
      );
    }
  };

  const registrationTitle = isAdmin && registeringForAnotherPerson
    ? "Registrar vehiculo de otra persona"
    : "Registrar mi vehiculo";

  return (
    <section className="page-stack">
      <div className="card">
        <p className="eyebrow">Validacion</p>
        <h2>Subir placa</h2>
        <p className="muted-text">
          Analiza una placa desde imagen, camara o ingreso manual.
        </p>
        <UploadImage onChange={handleImageSelected} />
        {fileName && <p>Archivo seleccionado: {fileName}</p>}

        <div className="camera-actions">
          <button type="button" onClick={startCamera}>
            Abrir camara
          </button>
        </div>
      </div>

      <div className="card">
        <p className="eyebrow">Consulta manual</p>
        <h2>Buscar placa</h2>
        <form className="manual-plate-form" onSubmit={handleLookup}>
          <label className="field-group">
            <span>Numero de placa</span>
            <input
              type="text"
              placeholder="Ejemplo: 1234-ABC"
              value={manualPlate}
              onChange={(event) => setManualPlate(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={lookupLoading}>
            {lookupLoading ? "Validando..." : "Validar vehiculo"}
          </button>
        </form>

        {lookupError && <p className="error-text">{lookupError}</p>}
        {registerSuccess && <p className="success-text">{registerSuccess}</p>}
      </div>

      {cameraOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Camara</p>
                <h2>Capturar placa</h2>
              </div>
              <button type="button" className="ghost-button" onClick={stopCamera}>
                Cerrar
              </button>
            </div>

            <video ref={videoRef} autoPlay playsInline className="camera-preview" />
            <canvas ref={canvasRef} hidden />
            {cameraError && <p className="error-text">{cameraError}</p>}

            <div className="modal-actions">
              <button type="button" onClick={captureFromCamera}>
                Capturar y analizar
              </button>
            </div>
          </div>
        </div>
      )}

      {showFoundModal && lookupResult && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Resultado</p>
                <h2>Vehiculo encontrado</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setShowFoundModal(false)}>
                Cerrar
              </button>
            </div>

            {lookupResult.vehicle_photo_path && (
              <img
                className="vehicle-photo"
                src={`http://127.0.0.1:8000${lookupResult.vehicle_photo_path}`}
                alt={`Vehiculo ${lookupResult.license_plate}`}
              />
            )}

            {analysisPreview?.annotated_image && (
              <img
                className="vehicle-photo"
                src={analysisPreview.annotated_image}
                alt="Deteccion de placa"
              />
            )}

            <div className="details-grid">
              <p><strong>Placa:</strong> {lookupResult.license_plate}</p>
              <p><strong>Marca:</strong> {lookupResult.brand}</p>
              <p><strong>Modelo:</strong> {lookupResult.model}</p>
              <p><strong>Color:</strong> {lookupResult.color}</p>
              <p><strong>Tipo:</strong> {lookupResult.vehicle_type}</p>
              <p><strong>Estado:</strong> {lookupResult.status}</p>
            </div>

            {lookupResult.owner && (
              <>
                <h3>Datos del dueno</h3>
                <div className="details-grid">
                  <p><strong>Nombre:</strong> {lookupResult.owner.full_name}</p>
                  <p><strong>Codigo:</strong> {lookupResult.owner.code}</p>
                  <p><strong>Documento:</strong> {lookupResult.owner.document_id || "No registrado"}</p>
                  <p><strong>Facultad:</strong> {lookupResult.owner.faculty || "No registrada"}</p>
                  <p><strong>Rol:</strong> {lookupResult.owner.role}</p>
                  <p><strong>Contacto:</strong> {lookupResult.owner.contact_info || "No registrado"}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showRegistrationModal && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Registro</p>
                <h2>{registrationTitle}</h2>
              </div>
              <button type="button" className="ghost-button" onClick={() => setShowRegistrationModal(false)}>
                Cerrar
              </button>
            </div>

            {isAdmin && (
              <label className="inline-toggle">
                <input
                  type="checkbox"
                  checked={registeringForAnotherPerson}
                  onChange={(event) => setRegisteringForAnotherPerson(event.target.checked)}
                />
                <span>Registrar vehiculo de otra persona</span>
              </label>
            )}

            <form className="registration-form" onSubmit={handleVehicleSubmit}>
              <div className="form-block">
                <h4>Datos del vehiculo</h4>
                <div className="details-grid">
                  <label className="field-group">
                    <span>Placa</span>
                    <input
                      type="text"
                      value={vehicleForm.license_plate}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
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
                      value={vehicleForm.brand}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
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
                      value={vehicleForm.model}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
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
                      value={vehicleForm.color}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
                          ...current,
                          color: event.target.value
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="field-group">
                    <span>Foto del vehiculo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setVehiclePhoto(event.target.files?.[0] || null)}
                    />
                  </label>
                  <label className="field-group">
                    <span>Tipo de vehiculo</span>
                    <select
                      value={vehicleForm.vehicle_type}
                      onChange={(event) =>
                        setVehicleForm((current) => ({
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

                <label className="field-group">
                  <span>Observacion</span>
                  <textarea
                    value={vehicleForm.observation}
                    onChange={(event) =>
                      setVehicleForm((current) => ({
                        ...current,
                        observation: event.target.value
                      }))
                    }
                    rows={4}
                  />
                </label>
              </div>

              <div className="form-block">
                <h4>Datos del propietario</h4>
                <div className="details-grid">
                  <label className="field-group">
                    <span>Registro universitario</span>
                    <input
                      type="text"
                      value={ownerForm.code}
                      onChange={(event) =>
                        setOwnerForm((current) => ({
                          ...current,
                          code: event.target.value
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="field-group">
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      value={ownerForm.full_name}
                      onChange={(event) =>
                        setOwnerForm((current) => ({
                          ...current,
                          full_name: event.target.value
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="field-group">
                    <span>Documento de identidad</span>
                    <input
                      type="text"
                      value={ownerForm.document_id}
                      onChange={(event) =>
                        setOwnerForm((current) => ({
                          ...current,
                          document_id: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label className="field-group">
                    <span>Tipo de persona</span>
                    <select
                      value={ownerForm.role}
                      onChange={(event) =>
                        setOwnerForm((current) => ({
                          ...current,
                          role: event.target.value
                        }))
                      }
                    >
                      <option value="STUDENT">Estudiante</option>
                      <option value="TEACHER">Docente</option>
                      <option value="ADMIN">Administrativo</option>
                    </select>
                  </label>
                  <label className="field-group">
                    <span>Carrera</span>
                    <input
                      type="text"
                      value={ownerForm.faculty}
                      onChange={(event) =>
                        setOwnerForm((current) => ({
                          ...current,
                          faculty: event.target.value
                        }))
                      }
                    />
                  </label>
                  <label className="field-group">
                    <span>Telefono</span>
                    <input
                      type="text"
                      value={ownerForm.contact_info}
                      onChange={(event) =>
                        setOwnerForm((current) => ({
                          ...current,
                          contact_info: event.target.value
                        }))
                      }
                    />
                  </label>
                </div>
              </div>

              {registerError && <p className="error-text">{registerError}</p>}

              <div className="modal-actions">
                <button type="submit">Registrar vehiculo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default UploadPlate;
