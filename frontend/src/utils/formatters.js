export function formatPlate(value = "") {
  return value.toUpperCase().trim().replace(/\s+/g, "").replace(/_/g, "-");
}
