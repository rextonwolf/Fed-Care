/**
 * Shared axios client for authenticated FastAPI requests.
 * Attaches JWT from localStorage on every request (same key as auth.ts).
 */
import axios, { AxiosError } from "axios";
import { API_BASE } from "./api";
import { getToken } from "./auth";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getApiErrorMessage(
  err: unknown,
  fallback = "Request failed."
): string {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{
      detail?: string | { message?: string; detail?: string };
    }>;
    if (axErr.response?.status === 401) {
      return "Session expired or unauthorized. Please log in again.";
    }
    if (axErr.response?.status === 503) {
      const detail = axErr.response?.data?.detail;
      if (detail && typeof detail === "object" && "message" in detail) {
        return String(detail.message);
      }
    }
    const detail = axErr.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
    return axErr.message || fallback;
  }
  return fallback;
}
