import React from "react";

export default function PlateNotFoundModal({
  manualPlate,
  setActiveModal,
  setManualPlate,
  activeTab,
  startCamera
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "480px", textAlign: "center" }}>
        <div style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
            </svg>
          </div>
          <p className="eyebrow">Acceso denegado</p>
          <h2 style={{ marginBottom: "0.75rem" }}>Placa no registrada</h2>
          {manualPlate && (
            <p style={{ fontFamily: "monospace", fontSize: "1.4rem", fontWeight: "bold", color: "var(--color-primary)", margin: "0.5rem 0 1rem" }}>
              {manualPlate}
            </p>
          )}
          <p className="muted-text" style={{ fontSize: "1rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
            Este vehículo no está registrado en el sistema universitario.
            Para ingresar o salir debe registrar su vehículo desde su cuenta de usuario.
          </p>
          <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "1rem", border: "1px solid rgba(21,62,117,0.1)", marginBottom: "1.5rem", textAlign: "left" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold", color: "var(--color-primary)" }}>¿Cómo registrar mi vehículo?</p>
            <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "#4b5563", lineHeight: "1.8" }}>
              <li>Inicia sesión en tu cuenta universitaria</li>
              <li>Ve a la sección <strong>Mis Vehículos</strong></li>
              <li>Registra tu placa con tus datos</li>
              <li>Vuelve al escáner para registrar tu acceso</li>
            </ol>
          </div>
          <button
            type="button"
            onClick={() => { 
              setActiveModal(null); 
              setManualPlate(""); 
              if (activeTab === "camera") startCamera(true);
            }}
            style={{
              padding: "0.85rem 2rem",
              borderRadius: "10px",
              border: "none",
              background: "var(--color-primary)",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: "pointer"
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
