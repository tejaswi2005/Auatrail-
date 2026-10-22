import axios from "axios";
import { clearSession, getAccessToken } from "./auth";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const requestUrl = String(error.config?.url ?? "");

    // Do not redirect or clear the session for ordinary API errors.
    // A 400, 403, 404, or 500 should be handled by the relevant page.

    if (status === 401) {
      const isAuthenticationRequest =
        requestUrl.includes("/auth/login") ||
        requestUrl.includes("/auth/register");

      if (!isAuthenticationRequest) {
        clearSession();

        // Preserve the page the customer was trying to access.
        const currentPath =
          window.location.pathname +
          window.location.search +
          window.location.hash;

        if (window.location.pathname !== "/login") {
          window.location.assign(
            `/login?returnTo=${encodeURIComponent(currentPath)}`
          );
        }
      }
    }

    return Promise.reject(error);
  }
);