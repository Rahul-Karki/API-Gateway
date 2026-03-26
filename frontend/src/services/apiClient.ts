import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "../utils/storage";

const apiClient = axios.create({
  baseURL: "http://localhost:8080",
  withCredentials: true,
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

// ✅ Attach token
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ✅ Handle response
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest: any = error.config;

    // ✅ FIX 1: Correct refresh URL check
    if (originalRequest.url?.includes("/api/refresh")) {
      clearAccessToken();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // ✅ FIX 2: Handle 401 properly
    if (error.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token: any) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ FIX 3: Use apiClient (not axios)
        const res = await apiClient.post("/api/refresh");

        const newToken = res.data.accessToken;
        setAccessToken(newToken);

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);

      } catch (err) {
        processQueue(err, null);
        clearAccessToken();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;