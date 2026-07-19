import React from 'react';

const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1.5rem',
      padding: '1rem',
      borderTop: '1px solid rgba(21, 62, 117, 0.1)'
    }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="ghost-button"
        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
      >
        Anterior
      </button>

      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} style={{ padding: '0.5rem', color: '#6b7280' }}>
              ...
            </span>
          );
        }

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: currentPage === page ? 'var(--color-primary)' : 'transparent',
              color: currentPage === page ? 'white' : 'var(--color-primary)',
              fontWeight: currentPage === page ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {page}
          </button>
        );
      })}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ghost-button"
        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
      >
        Siguiente
      </button>
    </div>
  );
};

export default Pagination;
