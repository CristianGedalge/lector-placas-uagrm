import React from "react";

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  placeholder = "Buscar...",
  onRefresh = null,
  isRefreshing = false,
  refreshTitle = "Refrescar"
}) {
  return (
    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center", width: "100%" }}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
        style={{
          flex: 1,
          padding: "0.75rem 1.25rem",
          borderRadius: "10px",
          border: "1px solid rgba(21, 62, 117, 0.2)",
          background: "white",
          fontSize: "0.95rem"
        }}
      />
      {onRefresh && (
        <button
          type="button"
          onClick={() => onRefresh(true)}
          disabled={isRefreshing}
          className="refresh-button"
          style={{
            padding: "0.75rem 1.25rem",
            borderRadius: "10px",
            border: "1px solid rgba(21, 62, 117, 0.25)",
            background: "white",
            fontWeight: "bold",
            cursor: isRefreshing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--color-primary)",
            opacity: isRefreshing ? 0.6 : 1
          }}
          title={refreshTitle}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          {isRefreshing ? "Actualizando…" : refreshTitle}
        </button>
      )}
    </div>
  );
}
