import apiClient from "./axios";

export async function uploadPlateImage(formData) {
  const { data } = await apiClient.post("/v1/plates/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
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
  const { data } = await apiClient.get("/v1/vehicles", {
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

export async function createVehicle(payload) {
  const { data } = await apiClient.post("/v1/vehicles", payload);
  return data;
}

export async function createVehicleWithPhoto(payload, photoFile) {
  const formData = new FormData();
  formData.append("vehicle_data", JSON.stringify(payload));
  if (photoFile) {
    formData.append("photo", photoFile);
  }

  const { data } = await apiClient.post("/v1/vehicles/with-photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}

export async function updateVehicleWithPhoto(vehicleId, payload, photoFile) {
  const formData = new FormData();
  formData.append("vehicle_data", JSON.stringify(payload));
  if (photoFile) {
    formData.append("photo", photoFile);
  }

  const { data } = await apiClient.put(`/v1/vehicles/${vehicleId}/with-photo`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}

export async function deleteVehicle(vehicleId) {
  await apiClient.delete(`/v1/vehicles/${vehicleId}`);
}
