import axios from "axios";

// Empty in development: Vite proxies /api and /uploads to the backend (see vite.config.js).
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Sends the httpOnly session cookie with every request.
export const api = axios.create({ baseURL: API_URL, withCredentials: true });

/** Absolute URL for an uploaded vehicle image, or null when the vehicle has none. */
export function imageUrl(fileName) {
  return fileName ? `${API_URL}/uploads/${fileName}` : null;
}

/** Best human-readable message from an API or network error. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.errors?.[0]?.msg) return error.response.data.errors[0].msg;
  if (error?.request && !error?.response) return "Can't reach the server. Check your connection and try again.";
  return fallback;
}
