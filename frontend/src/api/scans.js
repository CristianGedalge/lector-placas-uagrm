import apiClient from "./axios";

export async function getRecentScans() {
  const { data } = await apiClient.get("/plates");
  return data;
}
