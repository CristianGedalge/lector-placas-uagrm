import { useEffect, useRef, useState } from "react";
import UploadImage from "../components/UploadImage";
import {
  createVehicleWithPhoto,
  lookupVehicleByPlate,
  uploadPlateImage,
  createAccessLog,
  createAutoAccessLog
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
  const modelRef = useRef(null);
  const requestRef = useRef(null);
  // Mapa de votos: texto_normalizado -> { count, bbox, score, text, lastFrameTs }
  const voteMapRef = useRef(new Map());
  const VOTES_NEEDED = 3; // Frames consecutivos con el mismo texto para confirmar

  const [modelLoading, setModelLoading] = useState(false);
  const [trackingBoxes, setTrackingBoxes] = useState([]);
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
  const [accessZone, setAccessZone] = useState("Portería Principal");
  const [accessNotes, setAccessNotes] = useState("");
  const [accessSuccess, setAccessSuccess] = useState("");
  const [accessError, setAccessError] = useState("");
  const [autoAccessLog, setAutoAccessLog] = useState(null);
  const [registeringAccess, setRegisteringAccess] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [analysisPreview, setAnalysisPreview] = useState(null);
  const [scanError, setScanError] = useState("");

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
    setAutoAccessLog(null);
  };

  const openFoundModal = (result) => {
    setLookupResult(result);
    setShowFoundModal(true);
    setShowRegistrationModal(false);
    setAccessSuccess("");
    setAccessError("");
    setAccessNotes("");
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
      
      // Auto register access log
      try {
        const autoLog = await createAutoAccessLog({
          vehicle_id: result.id,
          zone: accessZone,
          notes: ""
        });
        setAutoAccessLog(autoLog);
        
        // Auto-close modal after 4 seconds to speed up flow
        setTimeout(() => {
          setShowFoundModal(false);
          setAutoAccessLog(null);
        }, 4000);
      } catch (autoErr) {
        setAccessError(autoErr.response?.data?.detail || autoErr.message || "No se pudo auto-registrar el acceso.");
      }

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

    const ALLOWED_TYPES = ["image/jpeg", "image/png"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLookupError("Formato no permitido. Por favor selecciona una imagen JPG o PNG.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLookupLoading(true);
      resetLookupState();
      const analysis = await uploadPlateImage(formData);
      setAnalysisPreview(analysis);

      if (analysis?.normalized_plate) {
        // OCR exitoso con formato boliviano confirmado
        setManualPlate(analysis.normalized_plate);
        await handleLookupPlate(analysis.normalized_plate);
      } else if (analysis?.detected_plate) {
        // OCR detectó texto pero no cumple el formato: rellenar campo para corrección manual
        const rawClean = analysis.detected_plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
        setManualPlate(rawClean);
        setLookupError(
          `OCR detecto: "${analysis.detected_plate}" — ${analysis.message || "Verifica y corrige el numero de placa si es necesario."}`
        );
      } else {
        setLookupError(analysis?.message || "No se pudo detectar una placa en la imagen.");
      }
    } catch (error) {
      setLookupError(error?.response?.data?.detail || "No se pudo analizar la imagen.");
    } finally {
      setLookupLoading(false);
    }
  };

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    if (requestRef.current === "processing") return;

    requestRef.current = "processing";
    const canvas = canvasRef.current;

    // Resolución equilibrada: 640px, suficiente para leer texto de placa con precisión
    const MAX_DETECTION_DIM = 640;
    let videoW = videoRef.current.videoWidth || 640;
    let videoH = videoRef.current.videoHeight || 480;

    if (videoW === 0) {
      requestRef.current = null;
      if (streamRef.current) setTimeout(detectFrame, 1000);
      return;
    }

    if (videoW > MAX_DETECTION_DIM || videoH > MAX_DETECTION_DIM) {
      if (videoW > videoH) {
        videoH = Math.round((videoH * MAX_DETECTION_DIM) / videoW);
        videoW = MAX_DETECTION_DIM;
      } else {
        videoW = Math.round((videoW * MAX_DETECTION_DIM) / videoH);
        videoH = MAX_DETECTION_DIM;
      }
    }

    canvas.width = videoW;
    canvas.height = videoH;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let nextInterval = 1000; // Throttle base: 1s (estable, sin detección)

    try {
      // JPEG 80%: balance entre tamaño de archivo y calidad para OCR
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.80));
      if (blob) {
        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");
        const analysis = await uploadPlateImage(formData, true, controller.signal);

        const normalizedText = analysis.detected_plate
          ? analysis.detected_plate.replace(/[^A-Z0-9]/gi, "").toUpperCase()
          : null;

        // --- Sistema de votación por consenso ---
        // Un texto solo se confirma cuando aparece N veces seguidas
        const voteMap = voteMapRef.current;
        const now = Date.now();

        if (normalizedText && normalizedText.length >= 4) {
          // Texto detectado: sumar voto
          const existing = voteMap.get(normalizedText);
          const newCount = existing ? existing.count + 1 : 1;
          voteMap.set(normalizedText, {
            count: newCount,
            bbox: analysis.plate_bbox,
            score: analysis.ocr_confidence,
            text: analysis.detected_plate,
            isValidFormat: analysis.is_valid_bolivian_format,
            lastFrameTs: now,
          });

          // Limpiar textos que no han aparecido en los últimos 4 frames (~4s)
          for (const [key, val] of voteMap.entries()) {
            if (key !== normalizedText && now - val.lastFrameTs > 4000) {
              voteMap.delete(key);
            }
          }

          // Verificar si algún texto alcanzó el umbral de votos
          const winner = [...voteMap.entries()].find(
            ([, v]) => v.count >= VOTES_NEEDED && v.isValidFormat
          );

          if (winner) {
            // Confirmado por consenso → auto-captura
            const [, winnerData] = winner;
            voteMap.clear();
            stopCamera();
            setAnalysisPreview(analysis);
            setManualPlate(normalizedText);
            handleLookupPlate(normalizedText);
            return;
          }

          // Mostrar caja con contador de votos
          let newBoxes = [];
          if (analysis.raw_bboxes && analysis.raw_bboxes.length > 0) {
            newBoxes = analysis.raw_bboxes.map(bbox => {
              const [x1, y1, x2, y2] = bbox;
              return { bbox: [x1, y1, x2 - x1, y2 - y1], type: 'raw' };
            });
          }
          if (analysis.plate_bbox) {
            const [x1, y1, x2, y2] = analysis.plate_bbox;
            const entry = voteMap.get(normalizedText);
            newBoxes.push({
              bbox: [x1, y1, x2 - x1, y2 - y1],
              score: analysis.ocr_confidence,
              text: analysis.detected_plate,
              votes: entry ? entry.count : 1,
              votesNeeded: VOTES_NEEDED,
              type: 'plate-voting',
            });
          }
          setScanError("");
          setTrackingBoxes(newBoxes);

          // Throttle adaptativo: si hay texto parcial, analizar más seguido
          nextInterval = 600;

        } else {
          // Sin texto válido: limpiar votos viejos y reducir frecuencia
          for (const [key, val] of voteMap.entries()) {
            if (now - val.lastFrameTs > 3000) voteMap.delete(key);
          }
          setScanError("");
          setTrackingBoxes([]);
          nextInterval = 1000;
        }
      }
    } catch (e) {
      if (e.name !== "AbortError" && e.code !== "ERR_CANCELED") {
        console.error("Error en detectFrame:", e);
        setScanError(e.response?.data?.detail || e.message || String(e));
        setTrackingBoxes([]);
      }
    } finally {
      clearTimeout(timeoutId);
    }
    requestRef.current = null;
    if (streamRef.current) {
      setTimeout(detectFrame, nextInterval);
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
      
      // Iniciar bucle con throttle (no requestAnimationFrame)
      setTimeout(detectFrame, 300);
      
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
    setTrackingBoxes([]);
    requestRef.current = null;
    voteMapRef.current.clear(); // Limpiar votos acumulados al cerrar
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
      setShowFoundModal(true);
      setAccessSuccess("");
      setAccessError("");
      setAccessNotes("");
    } catch (error) {
      setRegisterError(error.message || "Error al guardar el vehiculo.");
    }
  };

  const handleRegisterAccess = async (direction) => {
    if (!lookupResult?.id) return;
    try {
      setRegisteringAccess(true);
      setAccessError("");
      setAccessSuccess("");
      await createAccessLog({
        vehicle_id: lookupResult.id,
        direction: direction,
        zone: accessZone,
        notes: accessNotes
      });
      setAccessSuccess(`Movimiento de ${direction === "ENTRY" ? "INGRESO" : "SALIDA"} registrado con éxito.`);
      setTimeout(() => {
        setShowFoundModal(false);
      }, 1500);
    } catch (err) {
      setAccessError(err.message || "No se pudo registrar el acceso.");
    } finally {
      setRegisteringAccess(false);
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

        {/* Resultados del análisis OCR — visibles incluso en LOW_CONFIDENCE */}
        {analysisPreview && (analysisPreview.annotated_image || analysisPreview.plate_crop) && (
          <div className="analysis-preview">
            <p className="eyebrow">
              {analysisPreview.status === "DETECTED" ? "✅ Placa detectada" : "⚠️ Revisión manual"}
            </p>
            <div className="analysis-images">
              {analysisPreview.annotated_image && (
                <div>
                  <p className="muted-text">Imagen analizada</p>
                  <img
                    className="vehicle-photo"
                    src={analysisPreview.annotated_image}
                    alt="Imagen anotada por OCR"
                  />
                </div>
              )}
              {analysisPreview.plate_crop && (
                <div>
                  <p className="muted-text">Recorte de placa</p>
                  <img
                    className="plate-crop-preview"
                    src={analysisPreview.plate_crop}
                    alt="Recorte de placa detectada"
                  />
                </div>
              )}
            </div>
            {analysisPreview.detected_plate && (
              <p className="muted-text">
                Texto OCR: <strong>{analysisPreview.detected_plate}</strong>
                {" "}(confianza: {Math.round((analysisPreview.ocr_confidence || 0) * 100)}%)
              </p>
            )}
          </div>
        )}
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

            <div className="camera-container" style={{ position: "relative" }}>
              {scanError && (
                <div style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  right: "10px",
                  background: "rgba(220, 38, 38, 0.95)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  zIndex: 30,
                  fontSize: "13px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                }}>
                  ⚠️ Error del servidor: {scanError}
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline className="camera-preview" />
              {trackingBoxes.map((box, i) => {
                const [x, y, width, height] = box.bbox;
                const videoW = videoRef.current ? videoRef.current.videoWidth : 640;
                const videoH = videoRef.current ? videoRef.current.videoHeight : 480;
                const pctX = (x / videoW) * 100;
                const pctY = (y / videoH) * 100;
                const pctW = (width / videoW) * 100;
                const pctH = (height / videoH) * 100;

                if (box.type === 'raw') {
                  return (
                    <div key={i} style={{
                      position: "absolute",
                      left: `${pctX}%`,
                      top: `${pctY}%`,
                      width: `${pctW}%`,
                      height: `${pctH}%`,
                      border: "2px solid rgba(255, 204, 0, 0.35)",
                      backgroundColor: "rgba(255, 204, 0, 0.04)",
                      zIndex: 5,
                      pointerEvents: "none",
                      borderRadius: "4px"
                    }} />
                  );
                }

                if (box.type === 'plate-voting') {
                  // Color progresivo: amarillo (1/3) → naranja (2/3) → verde (3/3)
                  const progress = (box.votes || 1) / (box.votesNeeded || VOTES_NEEDED);
                  const colors = [
                    "#eab308", // 1/3 — amarillo
                    "#f97316", // 2/3 — naranja
                    "#22c55e", // 3/3 — verde
                  ];
                  const colorIdx = Math.min(Math.floor(progress * 3), 2);
                  const borderColor = colors[colorIdx];
                  const dotsTotal = box.votesNeeded || VOTES_NEEDED;
                  const dotsFilled = box.votes || 1;
                  const dots = Array.from({ length: dotsTotal }, (_, di) =>
                    di < dotsFilled ? "●" : "○"
                  ).join(" ");

                  return (
                    <div key={i} style={{
                      position: "absolute",
                      left: `${pctX}%`,
                      top: `${pctY}%`,
                      width: `${pctW}%`,
                      height: `${pctH}%`,
                      border: `3px solid ${borderColor}`,
                      backgroundColor: `${borderColor}18`,
                      zIndex: 10,
                      pointerEvents: "none",
                      borderRadius: "6px",
                      boxShadow: `0 0 10px ${borderColor}60`,
                      transition: "border-color 0.3s, box-shadow 0.3s",
                    }}>
                      <span style={{
                        backgroundColor: borderColor,
                        color: "white",
                        padding: "2px 10px",
                        fontSize: "12px",
                        position: "absolute",
                        top: "-22px",
                        left: "-3px",
                        fontWeight: "bold",
                        borderRadius: "3px",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.5px",
                      }}>
                        {box.text} &nbsp; {dots}
                      </span>
                    </div>
                  );
                }
              })}

              {/* Láser de escaneo — visible solo cuando no hay nada detectado */}
              {trackingBoxes.length === 0 && (
                <div style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  backgroundColor: "rgba(239, 68, 68, 0.8)",
                  boxShadow: "0 0 10px 2px rgba(239, 68, 68, 0.8)",
                  animation: "scan-fullscreen 2s infinite linear"
                }}></div>
              )}

              <div style={{ position: "absolute", bottom: "20px", left: "0", right: "0", textAlign: "center", zIndex: 20 }}>
                <p className="camera-instruction" style={{ display: "inline-block", background: "rgba(0,0,0,0.75)", color: "white", padding: "8px 18px", borderRadius: "20px", margin: 0 }}>
                  {trackingBoxes.some(b => b.type === 'plate-voting')
                    ? `Leyendo placa — mantén la cámara firme`
                    : "Buscando placa... apunta al vehículo"}
                </p>
              </div>
            </div>
            <canvas ref={canvasRef} hidden />
            {cameraError && <p className="error-text">{cameraError}</p>}
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
                src={lookupResult.vehicle_photo_path}
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

            {/* Registro de Acceso Automático */}
            <div style={{ marginTop: "1.5rem", borderTop: "2px solid rgba(21, 62, 117, 0.1)", paddingTop: "1rem" }}>
              {autoAccessLog ? (
                <div style={{
                  background: autoAccessLog.direction === "ENTRY" ? "#e6ffe6" : "#fff0e6",
                  border: `2px solid ${autoAccessLog.direction === "ENTRY" ? "green" : "#d46b08"}`,
                  padding: "1rem",
                  borderRadius: "8px",
                  textAlign: "center"
                }}>
                  <h2 style={{ color: autoAccessLog.direction === "ENTRY" ? "green" : "#d46b08", margin: "0 0 0.5rem 0" }}>
                    ✅ {autoAccessLog.direction === "ENTRY" ? "INGRESO REGISTRADO" : "SALIDA REGISTRADA"}
                  </h2>
                  <p style={{ margin: 0, fontWeight: "bold" }}>
                    {autoAccessLog.zone} - {new Date(autoAccessLog.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ) : accessError ? (
                <p className="error-text" style={{ background: "#ffe6e6", padding: "0.6rem", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}>
                  ⚠️ {accessError}
                </p>
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>Registrando acceso automáticamente...</p>
              )}
            </div>
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
                    <span>Foto del vehiculo (JPG o PNG)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
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
