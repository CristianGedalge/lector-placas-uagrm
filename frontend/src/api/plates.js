import apiClient from "./axios";

export async function uploadPlateImage(formData, realtime = false, signal = undefined) {
  const endpoint = realtime ? "/v1/plates/analyze?realtime=true" : "/v1/plates/analyze";
  const { data } = await apiClient.post(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    },
    signal
  });

  return data;
}

export async function lookupVehicleByPlate(plate) {
  const { data } = await apiClient.get(`/v1/vehicles/by-plate/${plate}`);
  return data;
}

export async function getVehicleDetail(vehicleId) {
  const { data } = await apiClient.get(`/v1/vehicles/${vehicleId}`);
  return data;
}

export async function getMyVehicles(registeredByUserId) {
  const { data } = await apiClient.get("/v1/vehicles/", {
    params: {
      registered_by_user_id: registeredByUserId
    }
  });
  return data;
}

export async function getDashboardSummary(registeredByUserId) {
  const { data } = await apiClient.get("/v1/dashboard/summary", {
    params: {
      registered_by_user_id: registeredByUserId
    }
  });
  return data;
}

export async function getVehicles(propietarioUsuarioId) {
  const { data } = await apiClient.get("/v1/vehicles/", {
    params: {
      propietario_usuario_id: propietarioUsuarioId
    }
  });
  return data;
}

export async function createVehicle(payload) {
  const { data } = await apiClient.post("/v1/vehicles/", payload);
  return data;
}

export async function updateVehicle(vehicleId, payload) {
  const { data } = await apiClient.put(`/v1/vehicles/${vehicleId}`, payload);
  return data;
}

export async function deleteVehicle(vehicleId) {
  await apiClient.delete(`/v1/vehicles/${vehicleId}`);
}

export async function getPlateScans() {
  const { data } = await apiClient.get("/v1/plates/scans");
  return data;
}

export async function getAccessLogs() {
  const { data } = await apiClient.get("/v1/access-logs/");
  return data;
}

export async function createAccessLog(payload) {
  const { data } = await apiClient.post("/v1/access-logs/", payload);
  return data;
}

export async function createAutoAccessLog(payload) {
  const { data } = await apiClient.post("/v1/access-logs/auto", payload);
  return data;
}

export async function createAutoAccessWithEvidence(payload, image) {
  const form = new FormData();
  form.append("vehicle_id", payload.vehicle_id);
  if (payload.zone) form.append("zone", payload.zone);
  if (payload.notes) form.append("notes", payload.notes);
  if (payload.direction) form.append("direction", payload.direction);
  form.append("image", image, "access-evidence.jpg");
  const { data } = await apiClient.post("/v1/access-logs/auto-with-evidence", form);
  return data;
}

export async function uploadVehiclePhoto(vehicleId, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post(`/v1/media/vehicles/${vehicleId}/photo`, form);
  return data;
}

export async function deleteVehiclePhoto(vehicleId) {
  await apiClient.delete(`/v1/media/vehicles/${vehicleId}/photo`);
}

export async function getMediaUrl(mediaId) {
  const { data } = await apiClient.get(`/v1/media/${mediaId}/url`);
  return data;
}

export async function getBrands() {
  const { data } = await apiClient.get("/v1/vehicles/brands");
  return data;
}

export async function createBrand(payload) {
  const { data } = await apiClient.post("/v1/vehicles/brands", payload);
  return data;
}

export async function updateBrand(brandId, payload) {
  const { data } = await apiClient.put(`/v1/vehicles/brands/${brandId}`, payload);
  return data;
}

export async function deleteBrand(brandId) {
  await apiClient.delete(`/v1/vehicles/brands/${brandId}`);
}

export async function getVehicleTypes() {
  const { data } = await apiClient.get("/v1/vehicles/types");
  return data;
}

export async function createVehicleType(payload) {
  const { data } = await apiClient.post("/v1/vehicles/types", payload);
  return data;
}

export async function updateVehicleType(typeId, payload) {
  const { data } = await apiClient.put(`/v1/vehicles/types/${typeId}`, payload);
  return data;
}

export async function deleteVehicleType(typeId) {
  await apiClient.delete(`/v1/vehicles/types/${typeId}`);
}
