import axios from "axios";

const configuredBaseURL = (import.meta.env.VITE_API_BASE_URL || "").trim();
const defaultBaseURL = import.meta.env.PROD
  ? ""
  : "https://gateway-7dsr.onrender.com";

let apiCacheVersion = "0";

export function getApiCacheVersion(): string {
  return apiCacheVersion;
}

function setApiCacheVersion(version: string): void {
  if (version && version !== "-") {
    apiCacheVersion = version;
  }
}

const apiClient = axios.create({
  baseURL: configuredBaseURL || defaultBaseURL,
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

apiClient.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  const isWrite = method === "post" || method === "put" || method === "patch" || method === "delete";
  const isProductsGet = method === "get" && String(config.url || "").includes("/api/products");

  if (isWrite && !config.headers?.["Idempotency-Key"]) {
    const key = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    config.headers = {
      ...config.headers,
      "Idempotency-Key": key,
    };
  }

  if (isProductsGet) {
    config.params = {
      ...(config.params || {}),
      _cv: apiCacheVersion,
    };
  }

  return config;
});


// ✅ Handle response
apiClient.interceptors.response.use(
  (res) => {
    const responseVersion = res.headers?.["x-cache-version"];
    if (responseVersion) {
      setApiCacheVersion(String(responseVersion));
    }
    return res;
  },
  async (error) => {
    const originalRequest: any = error.config;

    // Auth bootstrap should fail quietly when no session exists.
    // Redirecting here causes a reload loop because AuthProvider calls /me on every page load.
    if (originalRequest.url?.includes("/api/auth/me")) {
      return Promise.reject(error);
    }

    // ✅ FIX 1: Correct refresh URL check
    if (originalRequest.url?.includes("/api/refresh")) {
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // ✅ ADD THIS: bail out on auth routes that are expected to return 401
    const isAuthRoute =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/signup") ||
      originalRequest.url?.includes("/api/auth/forgot-password")

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