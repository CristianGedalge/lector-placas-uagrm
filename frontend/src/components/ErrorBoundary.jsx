import { Component } from "react";

/**
 * REL-001: ErrorBoundary global.
 * Captura errores de render de cualquier componente hijo y
 * muestra una pantalla de recuperación en lugar de la pantalla en blanco.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg, #f0f4fa)",
          padding: "2rem",
          fontFamily: "Inter, sans-serif",
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(21,62,117,0.12)",
            padding: "3rem",
            maxWidth: "480px",
            textAlign: "center",
          }}>
            {/* Ícono de alerta */}
            <div style={{
              width: "72px", height: "72px",
              borderRadius: "50%",
              background: "rgba(225,29,72,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>

            <h2 style={{ color: "#153e75", marginBottom: "0.5rem", fontSize: "1.4rem" }}>
              Algo salió mal
            </h2>
            <p style={{ color: "#64748b", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              Se produjo un error inesperado en esta sección.
              Puedes intentar recargar la página o volver al inicio.
            </p>
            {this.state.error && (
              <code style={{
                display: "block",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.75rem",
                fontSize: "0.75rem",
                color: "#94a3b8",
                marginBottom: "1.5rem",
                wordBreak: "break-all",
                textAlign: "left",
              }}>
                {this.state.error.message}
              </code>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  border: "1px solid #153e75",
                  background: "transparent",
                  color: "#153e75",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                ← Volver
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#153e75",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
