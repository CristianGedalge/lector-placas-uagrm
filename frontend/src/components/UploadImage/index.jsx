function UploadImage({ onChange }) {
  return (
    <label className="upload-box">
      <span>Selecciona una imagen de placa</span>
      <input type="file" accept="image/*" onChange={onChange} />
    </label>
  );
}

export default UploadImage;
