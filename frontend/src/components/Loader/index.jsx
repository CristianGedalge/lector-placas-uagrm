function Loader({ label = "Cargando..." }) {
  return (
    <div className="loader">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export default Loader;
