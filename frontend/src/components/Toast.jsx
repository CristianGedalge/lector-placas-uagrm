import { useEffect, useState } from "react";

/**
 * MNT-001 / COR-001: Componente Toast reutilizable.
 * Muestra mensajes de éxito o error que se auto-limpian tras 5 segundos.
 * Reemplaza los bloques inline {success && <div>...} en todas las páginas.
 *
 * Uso:
 *   const { toast, showToast } = useToast();
 *   showToast("Operación exitosa", "success");
 *   showToast("Error al guardar", "error");
 *   ...
 *   <Toast toast={toast} />
 */

const TOAST_DURATION = 5000; // ms

const STYLES = {
  success: {
    background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
    border: "1px solid #10b981",
    color: "#065f46",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  },
  error: {
    background: "linear-gradient(135deg, #fee2e2, #fecaca)",
    border: "1px solid #ef4444",
    color: "#991b1b",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  info: {
    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
    border: "1px solid #3b82f6",
    color: "#1e3a8a",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  },
};

export function useToast() {
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const clearToast = () => setToast(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  return { toast, showToast, clearToast };
}

function Toast({ toast }) {
  if (!toast) return null;

  const style = STYLES[toast.type] ?? STYLES.info;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom: "1rem",
        animation: "fadeInDown 0.3s ease",
      }}
    >
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.6rem 1.2rem",
        borderRadius: "10px",
        fontWeight: "600",
        fontSize: "0.9rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        maxWidth: "560px",
        ...style,
      }}>
        {style.icon}
        <span>{toast.message}</span>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Toast;
