import React, { useEffect } from "react";

export default function PlateNotFoundModal({
  manualPlate,
  setActiveModal,
  setManualPlate,
  activeTab,
  startCamera
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveModal(null);
      setManualPlate("");
      if (activeTab === "camera") startCamera(true);
    }, 5000); // 5 segundos

    return () => clearTimeout(timer);
  }, [setActiveModal, setManualPlate, activeTab, startCamera]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "400px", textAlign: "center" }}>
        <div style={{ padding: "2.5rem 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
          </div>
          <p className="eyebrow" style={{ color: "#dc2626", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem" }}>
            Acceso denegado
          </p>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.8rem", color: "#153e75" }}>
            Placa no registrada
          </h2>
          {manualPlate && (
            <p style={{ fontFamily: "monospace", fontSize: "1.6rem", fontWeight: "bold", color: "#153e75", margin: 0 }}>
              {manualPlate}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
