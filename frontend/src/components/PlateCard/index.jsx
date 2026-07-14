function PlateCard({ plate, onClick, isActive = false }) {
  if (!plate) {
    return null;
  }

  const ownerName = plate.owner?.full_name || plate.owner || "No asignado";
  const plateCode = plate.license_plate || plate.number || "Sin dato";
  const createdAt = plate.created_at || plate.date || "Pendiente";
  const status = plate.status?.value || plate.status || "Registrado";

  return (
    <article
      className={isActive ? "card plate-card plate-card-active" : "card plate-card plate-card-clickable"}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          onClick?.();
        }
      }}
    >
      <div className="plate-badge">{plateCode}</div>
      <p><strong>Propietario:</strong> {ownerName}</p>
      <p><strong>Fecha:</strong> {String(createdAt).slice(0, 10)}</p>
      <p><strong>Estado:</strong> {status}</p>
    </article>
  );
}

export default PlateCard;
