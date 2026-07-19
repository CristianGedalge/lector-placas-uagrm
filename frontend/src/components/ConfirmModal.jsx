import React from 'react';

const ConfirmModal = ({ isOpen, title, message, confirmText = "Confirmar", cancelText = "Cancelar", onConfirm, onCancel, confirmColor = "#e11d48", loading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 1000 }}>
      <div className="modal-card" style={{ maxWidth: '400px', width: '90%' }}>
        <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(21, 62, 117, 0.1)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>{title}</h2>
        </div>
        <div style={{ padding: '1.5rem 0' }}>
          <p style={{ margin: 0, color: '#4b5563', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(21, 62, 117, 0.1)' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="ghost-button"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              backgroundColor: confirmColor,
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
