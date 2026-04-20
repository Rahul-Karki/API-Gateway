import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from "axios";

const configuredBaseURL = (
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_GATEWAY_URL || ""
).trim();
const defaultBaseURL = import.meta.env.PROD
  ? ""
  : "https://gateway-7dsr.onrender.com";

let apiCacheVersion = "0";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!value) {
    return null;
  }

  return decodeURIComponent(value.substring(name.length + 1));
}

export function getApiCacheVersion(): string {
  return apiCacheVersion;
}

function setApiCacheVersion(version: string): void {
  if (version && version !== "-") {
    apiCacheVersion = version;
  }
}

function setRequestHeader(
  config: InternalAxiosRequestConfig,
  name: string,
  value: string,
): void {
  (config.headers as AxiosHeaders).set(name, value);
}

const apiClient = axios.create({
  baseURL: configuredBaseURL || defaultBaseURL,
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

let isRefreshing = false;
type QueueItem = {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
};

let failedQueue: QueueItem[] = [];
let refreshDisabled = false;

const processQueue = (error: unknown) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

const isPublicRoute = (pathname: string) => {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/features" ||
    pathname === "/reset-password"
  );
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = (config.method || "get").toLowerCase();
  const isWrite = method === "post" || method === "put" || method === "patch" || method === "delete";
  const isProductsGet = method === "get" && String(config.url || "").includes("/api/products");

  const headers = AxiosHeaders.from(config.headers);

  if (isWrite && !headers.has("Idempotency-Key")) {
    const key = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setRequestHeader(config, "Idempotency-Key", key);
  }

  if (isWrite) {
    const csrfToken = getCookieValue("csrfToken");
    if (csrfToken) {
      setRequestHeader(config, "X-CSRF-Token", csrfToken);
    }
  }

  if (isProductsGet) {
    setRequestHeader(config, "X-Cache-Version", apiCacheVersion);

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
    const requestUrl = String(res.config?.url || "");
    const restoresSession =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/signup") ||
      requestUrl.includes("/api/auth/google-login") ||
      requestUrl.includes("/api/refresh");

    if (restoresSession) {
      refreshDisabled = false;
    }

    const responseVersion = res.headers?.["x-cache-version"];
    if (responseVersion) {
      setApiCacheVersion(String(responseVersion));
    }
    return res;
  },
  async (error) => {
    const axiosError = error as AxiosError;
    const originalRequest = axiosError.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

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
      originalRequest.url?.includes("/api/auth/forgot-password") ||
      originalRequest.url?.includes("/api/auth/reset-password") ||
      originalRequest.url?.includes("/api/auth/resend") ||
      originalRequest.url?.includes("/api/auth/google-login") ||
      originalRequest.url?.includes("/api/auth/logout")

    if (isAuthRoute) {
      return Promise.reject(error)  // just pass error to the caller, no refresh attempt
    }

    if (refreshDisabled) {
      return Promise.reject(error);
    }

    // ✅ FIX 2: Handle 401 properly
    if (axiosError.response?.status === 401 && !originalRequest._retry) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ FIX 3: Use apiClient (not axios)
        await apiClient.post("/api/refresh", {});
        refreshDisabled = false;

        processQueue(null);

        return apiClient(originalRequest);

      } catch (err) {
        refreshDisabled = true;
        processQueue(err);
        if (!isPublicRoute(window.location.pathname) && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;