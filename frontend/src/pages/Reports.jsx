import { useEffect, useState, useCallback } from "react";
import { getDashboardSummary, getPlateScans, getAccessLogs } from "../api/plates";
import { useAuth } from "../hooks/useAuth";
import Loader from "../components/Loader";
import parseApiError from "../utils/errors";

// ---------------------------------------------------------------------------
// COR-002 / USA-001: Página de Reportes con estadísticas reales del sistema.
// Consume los mismos endpoints del dashboard y los presenta como métricas,
// gráficas SVG puras y listados de actividad reciente.
// ---------------------------------------------------------------------------

const BOLIVIAN_PLATE_RE = /^[A-Z]{1,3}-?\d{3,4}-?[A-Z]{0,2}$/;

function StatCard({ icon, label, value, sub, color = "#153e75", bg = "rgba(21,62,117,0.07)" }) {
  return (
    <div style={{
      background: "white",
      borderRadius: "16px",
      padding: "1.5rem",
      boxShadow: "0 2px 12px rgba(21,62,117,0.08)",
      display: "flex",
      alignItems: "flex-start",
      gap: "1rem",
      border: "1px solid rgba(21,62,117,0.08)",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(21,62,117,0.14)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(21,62,117,0.08)"; }}
    >
      <div style={{
        width: "52px", height: "52px", borderRadius: "14px",
        background: bg, display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "1.6rem" }}>{icon}</span>
      </div>
      <div>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>{sub}</p>}
      </div>
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, title, color = "#153e75" }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(21,62,117,0.08)", border: "1px solid rgba(21,62,117,0.08)" }}>
      <h4 style={{ margin: "0 0 1.2rem", color: "#153e75", fontSize: "0.95rem", fontWeight: 700 }}>{title}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ width: "90px", fontSize: "0.78rem", color: "#64748b", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d[labelKey]}
            </span>
            <div style={{ flex: 1, background: "rgba(21,62,117,0.07)", borderRadius: "8px", height: "22px", overflow: "hidden" }}>
              <div style={{
                width: `${(d[valueKey] / max) * 100}%`,
                minWidth: d[valueKey] > 0 ? "6px" : 0,
                height: "100%",
                background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                borderRadius: "8px",
                transition: "width 0.6s cubic-bezier(.22,.68,0,1.2)",
              }} />
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color, width: "28px", textAlign: "right", flexShrink: 0 }}>{d[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ segments, title }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let cumulative = 0;
  const r = 60;
  const cx = 75, cy = 75;

  const paths = segments.map((seg) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += seg.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = seg.value / total > 0.5 ? 1 : 0;
    const ri = 35;
    const xi1 = cx + ri * Math.cos(startAngle);
    const yi1 = cy + ri * Math.sin(startAngle);
    const xi2 = cx + ri * Math.cos(endAngle);
    const yi2 = cy + ri * Math.sin(endAngle);
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
    return { ...seg, d };
  });

  return (
    <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(21,62,117,0.08)", border: "1px solid rgba(21,62,117,0.08)" }}>
      <h4 style={{ margin: "0 0 1rem", color: "#153e75", fontSize: "0.95rem", fontWeight: 700 }}>{title}</h4>
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill={p.color} opacity="0.9" />
          ))}
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill="#153e75">{total}</text>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {segments.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                {s.label} <strong style={{ color: "#153e75" }}>{s.value}</strong>
                <span style={{ color: "#94a3b8" }}> ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScanStatusBadge({ status }) {
  const map = {
    DETECTED:       { label: "Detectado",      color: "#10b981", bg: "#d1fae5" },
    LOW_CONFIDENCE: { label: "Baja confianza", color: "#f59e0b", bg: "#fef3c7" },
    MANUAL:         { label: "Manual",         color: "#3b82f6", bg: "#dbeafe" },
    ERROR:          { label: "Error",          color: "#ef4444", bg: "#fee2e2" },
  };
  const s = map[status] ?? { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{ background: s.bg, color: s.color, padding: "0.2rem 0.6rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function Reports() {
  const { user } = useAuth();
  const [summary, setSummary]   = useState(null);
  const [scans, setScans]       = useState([]);
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAll = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setIsRefreshing(true);
    setError("");
    try {
      const [sum, sc, ac] = await Promise.all([
        getDashboardSummary(user?.role !== "ADMIN" ? user?.id : undefined),
        getPlateScans(),
        getAccessLogs(),
      ]);
      setSummary(sum);
      setScans(sc || []);
      setAccesses(ac || []);
    } catch (err) {
      setError(parseApiError(err, "No se pudieron cargar los reportes."));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => { if (user?.id) fetchAll(true); }, [user?.id]);

  if (loading) return <Loader label="Cargando reportes del sistema..." />;

  // ── Derivar datos para gráficas ──────────────────────────────────────────
  const scansByStatus = [
    { label: "Detectado",       value: scans.filter(s => s.scan_status === "DETECTED").length,       color: "#10b981" },
    { label: "Baja confianza",  value: scans.filter(s => s.scan_status === "LOW_CONFIDENCE").length,  color: "#f59e0b" },
    { label: "Manual",          value: scans.filter(s => s.scan_status === "MANUAL").length,          color: "#3b82f6" },
    { label: "Error",           value: scans.filter(s => s.scan_status === "ERROR").length,           color: "#ef4444" },
  ].filter(s => s.value > 0);

  const accessesByDir = [
    { label: "Entradas", value: accesses.filter(a => a.direction === "ENTRY").length, color: "#10b981" },
    { label: "Salidas",  value: accesses.filter(a => a.direction === "EXIT").length,  color: "#153e75" },
  ];

  // Escaneos por día (últimos 7 días)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("es-BO", { weekday: "short", day: "numeric" }),
      value: scans.filter(s => s.created_at?.slice(0, 10) === key).length,
    };
  });

  const avgConf = summary?.avg_confidence ? `${(summary.avg_confidence * 100).toFixed(1)}%` : "—";
  const today   = summary?.today_scans ?? 0;

  return (
    <section className="page-stack">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
        <div>
          <p className="eyebrow">Analítica</p>
          <h3 style={{ margin: 0 }}>Reportes del Sistema</h3>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() => fetchAll(false)}
          disabled={isRefreshing}
          style={{ padding: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
          title="Refrescar datos"
        >
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }}
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-5.67"/>
          </svg>
          {isRefreshing ? "Actualizando…" : "Refrescar"}
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <p style={{ background: "#fee2e2", border: "1px solid #ef4444", color: "#991b1b", padding: "0.5rem 1.2rem", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
            {error}
          </p>
        </div>
      )}

      {/* ── KPIs principales ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard icon="🚗" label="Vehículos registrados" value={summary?.total_vehicles ?? 0}   sub={`${summary?.active_vehicles ?? 0} activos`}        color="#153e75" />
        <StatCard icon="📷" label="Escaneos totales"     value={summary?.total_scans ?? 0}       sub={`${today} hoy`}                                     color="#7c3aed" bg="rgba(124,58,237,0.08)" />
        <StatCard icon="✅" label="Confianza promedio"   value={avgConf}                          sub="lecturas exitosas"                                  color="#10b981" bg="rgba(16,185,129,0.08)" />
        <StatCard icon="🚦" label="Accesos registrados"  value={accesses.length}                  sub={`${accessesByDir[0]?.value ?? 0} ent. / ${accessesByDir[1]?.value ?? 0} sal.`} color="#f59e0b" bg="rgba(245,158,11,0.08)" />
        {user?.role === "ADMIN" && (
          <>
            <StatCard icon="👤" label="Usuarios del sistema" value={summary?.total_users ?? 0}   color="#e11d48" bg="rgba(225,29,72,0.08)" />
            <StatCard icon="🎓" label="Personas (SIARP)"    value={summary?.total_persons ?? 0}  color="#0891b2" bg="rgba(8,145,178,0.08)" />
          </>
        )}
      </div>

      {/* ── Gráficas ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <BarChart
          data={last7}
          labelKey="label"
          valueKey="value"
          title="📅 Escaneos — últimos 7 días"
          color="#153e75"
        />
        {scansByStatus.length > 0 && (
          <DonutChart segments={scansByStatus} title="🔍 Estado de escaneos" />
        )}
        {accesses.length > 0 && (
          <DonutChart segments={accessesByDir} title="🚦 Entradas vs Salidas" />
        )}
      </div>

      {/* ── Últimas lecturas ───────────────────────────────────────────── */}
      <div className="card" style={{ overflowX: "auto" }}>
        <h4 style={{ margin: "0 0 1rem", color: "#153e75", fontSize: "0.95rem", fontWeight: 700 }}>
          🕐 Últimas lecturas de placa
        </h4>
        {scans.length === 0 ? (
          <p className="muted-text text-center">No hay escaneos registrados aún.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.87rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(21,62,117,0.1)" }}>
                {["Placa detectada", "Placa normalizada", "Confianza", "Estado", "Fecha"].map(h => (
                  <th key={h} style={{ padding: "0.6rem 0.8rem", color: "#153e75", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.slice(0, 15).map((s, i) => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(21,62,117,0.06)", background: i % 2 === 0 ? "transparent" : "rgba(21,62,117,0.02)" }}>
                  <td style={{ padding: "0.6rem 0.8rem", fontFamily: "monospace", fontWeight: 700 }}>{s.detected_plate ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.8rem", fontFamily: "monospace", color: "#153e75" }}>{s.normalized_plate ?? "—"}</td>
                  <td style={{ padding: "0.6rem 0.8rem" }}>
                    {s.confidence != null ? (
                      <span style={{
                        color: s.confidence >= 0.7 ? "#10b981" : s.confidence >= 0.4 ? "#f59e0b" : "#ef4444",
                        fontWeight: 700,
                      }}>
                        {(s.confidence * 100).toFixed(1)}%
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.8rem" }}><ScanStatusBadge status={s.scan_status} /></td>
                  <td style={{ padding: "0.6rem 0.8rem", color: "#64748b", fontSize: "0.8rem" }}>
                    {s.created_at ? new Date(s.created_at).toLocaleString("es-BO") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}

export default Reports;
