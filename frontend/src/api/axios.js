import axios from "axios";
import { readSession } from "../services/storage";

// Timeout generoso para endpoints de análisis OCR (EasyOCR en CPU puede tardar 30-60s)
const OCR_TIMEOUT = 120_000; // 2 minutos
const DEFAULT_TIMEOUT = 30_000; // 30 segundos para el resto de peticiones

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true
});

apiClient.interceptors.request.use((config) => {
  // Rutas de análisis de imagen necesitan más tiempo
  if (config.url?.includes("/plates/analyze")) {
    config.timeout = OCR_TIMEOUT;
  }
  return config;
});

export default apiClient;
