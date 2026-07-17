function UploadImage({ onChange }) {
  return (
    <label className="upload-box">
      <span>Selecciona una imagen de placa (JPG o PNG)</span>
      <input type="file" accept="image/jpeg,image/png" onChange={onChange} />
    </label>
  );
}

export default UploadImage;
