export function formatPlate(value = "") {
  return value.toUpperCase().trim().replace(/\s+/g, "").replace(/_/g, "-");
}

export function validatePlateForm(plate) {
  if (!plate || plate.trim().length === 0) {
    return { className: "", message: "" };
  }
  
  // Basic validation: 3-4 numbers and 2-3 letters, min 6 max 9 chars total
  const hasNumbers = /\d{3,4}/.test(plate);
  const hasLetters = /[A-Z]{2,3}/i.test(plate);
  const isValidLength = plate.length >= 6 && plate.length <= 9;
  const isFormatValid = /^[A-Z0-9-]+$/i.test(plate);

  const isValid = hasNumbers && hasLetters && isValidLength && isFormatValid;

  return isValid
    ? { className: "field-valid", message: "Formato de placa válido" }
    : { className: "field-invalid", message: "La placa debe contener 3 o 4 números y 2 o 3 letras (Ej: 1234ABC)" };
}
