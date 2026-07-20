import apiClient from "./axios";

export async function getDevices() {
  const { data } = await apiClient.get("/v1/devices/");
  return data;
}

export async function createDevice(payload) {
  const { data } = await apiClient.post("/v1/devices/", payload);
  return data;
}

export async function updateDevice(deviceId, payload) {
  const { data } = await apiClient.put(`/v1/devices/${deviceId}`, payload);
  return data;
}

export async function deleteDevice(deviceId) {
  await apiClient.delete(`/v1/devices/${deviceId}`);
}

export async function getDeviceTypes() {
  const { data } = await apiClient.get("/v1/devices/types");
  return data;
}

export async function createDeviceType(payload) {
  const { data } = await apiClient.post("/v1/devices/types", payload);
  return data;
}

export async function updateDeviceType(typeId, payload) {
  const { data } = await apiClient.put(`/v1/devices/types/${typeId}`, payload);
  return data;
}

export async function deleteDeviceType(typeId) {
  await apiClient.delete(`/v1/devices/types/${typeId}`);
}
