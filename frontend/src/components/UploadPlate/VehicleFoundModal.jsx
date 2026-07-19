import React from "react";

export default function VehicleFoundModal({
  lookupResult,
  setActiveModal,
  setLookupResult,
  accessZone,
  setAccessZone,
  accessError,
  setAccessError,
  registeringAccess,
  handleRegisterAccess
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: "520px" }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Acceso vehicular</p>
            <h2>Vehículo encontrado</h2>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => { setActiveModal(null); setLookupResult(null); setAccessError(""); }}
          >
            Cerrar
          </button>
        </div>

        {/* Datos del vehículo */}
        <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "1rem 1.25rem", marginTop: "1rem", border: "1px solid rgba(21,62,117,0.1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1.5rem" }}>
            <p style={{ margin: 0 }}><strong>Placa:</strong> <span style={{ fontFamily: "monospace", fontSize: "1.1rem", color: "var(--color-primary)" }}>{lookupResult.license_plate}</span></p>
            <p style={{ margin: 0 }}><strong>Tipo:</strong> {lookupResult.vehicle_type}</p>
            <p style={{ margin: 0 }}><strong>Marca:</strong> {lookupResult.brand}</p>
            <p style={{ margin: 0 }}><strong>Modelo:</strong> {lookupResult.model}</p>
            <p style={{ margin: 0 }}><strong>Color:</strong> {lookupResult.color}</p>
          </div>
          {lookupResult.owner && (
            <p style={{ margin: "0.75rem 0 0 0", paddingTop: "0.75rem", borderTop: "1px solid rgba(21,62,117,0.1)" }}>
              <strong>Propietario:</strong> {lookupResult.owner.full_name}
              {lookupResult.owner.code ? ` — Cód. ${lookupResult.owner.code}` : ""}
            </p>
          )}
        </div>

        {/* Zona */}
        <div style={{ marginTop: "1rem" }}>
          <label className="field-group">
            <span>Zona de acceso</span>
            <input
              type="text"
              value={accessZone}
              onChange={(e) => setAccessZone(e.target.value)}
              placeholder="Ej: Entrada Principal"
              style={{ background: "white" }}
            />
          </label>
        </div>

        {accessError && (
          <p className="error-text" style={{ marginTop: "0.75rem", padding: "0.6rem", background: "#fff0f0", borderRadius: "8px", textAlign: "center" }}>
            ⚠️ {accessError}
          </p>
        )}

        {/* Botones de acción */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
          <button
            type="button"
            disabled={registeringAccess}
            onClick={() => handleRegisterAccess("ENTRY")}
            style={{
              padding: "1.1rem",
              fontSize: "1.1rem",
              fontWeight: "bold",
              borderRadius: "12px",
              border: "2px solid #15803d",
              background: registeringAccess ? "#e5e7eb" : "#dcfce7",
              color: "#15803d",
              cursor: registeringAccess ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.4rem"
            }}
            onMouseEnter={(e) => { if (!registeringAccess) e.currentTarget.style.background = "#bbf7d0"; }}
            onMouseLeave={(e) => { if (!registeringAccess) e.currentTarget.style.background = "#dcfce7"; }}
          >
            <span style={{ fontSize: "2rem" }}>🟢</span>
            {registeringAccess ? "Registrando..." : "Registrar Ingreso"}
          </button>

          <button
            type="button"
            disabled={registeringAccess}
            onClick={() => handleRegisterAccess("EXIT")}
            style={{
              padding: "1.1rem",
              fontSize: "1.1rem",
              fontWeight: "bold",
              borderRadius: "12px",
              border: "2px solid #b91c1c",
              background: registeringAccess ? "#e5e7eb" : "#fee2e2",
              color: "#b91c1c",
              cursor: registeringAccess ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.4rem"
            }}
            onMouseEnter={(e) => { if (!registeringAccess) e.currentTarget.style.background = "#fecaca"; }}
            onMouseLeave={(e) => { if (!registeringAccess) e.currentTarget.style.background = "#fee2e2"; }}
          >
            <span style={{ fontSize: "2rem" }}>🔴</span>
            {registeringAccess ? "Registrando..." : "Registrar Salida"}
          </button>
        </div>
      </div>
    </div>
  );
}
