import axios from "axios";
import { showToast } from "@/utils/toastNotifier";

const apiClient = axios.create({
  baseURL: "https://gateway-7dsr.onrender.com",
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};


// ✅ Handle response
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest: any = error.config;

    // ✅ FIX 1: Correct refresh URL check
    if (originalRequest.url?.includes("/api/refresh")) {
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // ✅ ADD THIS: bail out on auth routes that are expected to return 401
    const isAuthRoute =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/signup") ||
      originalRequest.url?.includes("/api/auth/forgot-password") ||
      originalRequest.url?.includes("/api/auth/me")  // Don't refresh on /me endpoint

    if (isAuthRoute) {
      return Promise.reject(error)  // just pass error to the caller, no refresh attempt
    }

    // ✅ FIX 2: Handle 401 properly
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token: any) => {
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ FIX 3: Use apiClient (not axios)
        const res = await apiClient.post("/api/refresh");

        processQueue(null);

        return apiClient(originalRequest);

      } catch (err) {
        processQueue(err, null);
        showToast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ✅ Show toast for network/other errors
    if (error.response?.status === 429) {
      showToast.warning("Rate limited. Please try again shortly.");
    } else if (error.code === "ECONNABORTED") {
      showToast.error("Request timeout. Please check your connection.");
    } else if (!error.response) {
      showToast.error("Network error. Please check your connection.");
    }

    return Promise.reject(error);
  }
);

export default apiClient;