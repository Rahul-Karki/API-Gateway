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
  timeout: 30000, // 30 second timeout (increased for cold starts)
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

const shouldRedirectToLogin = (pathname: string): boolean => {
  return pathname === "/api-tester" || pathname === "/home";
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


// ✅ Handle response and errors with retry logic for 401 and 403
apiClient.interceptors.response.use(
  (res) => {
    // Update cache version from response header
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
    const originalRequest = axiosError.config as (InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Don't retry on auth bootstrap - let it fail quietly
    if (originalRequest.url?.includes("/api/auth/me")) {
      return Promise.reject(error);
    }

    // If refresh itself fails, redirect only when user is on the protected api-tester page.
    if (originalRequest.url?.includes("/api/refresh")) {
      if (shouldRedirectToLogin(window.location.pathname)) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Don't retry on auth routes - let them fail with their original errors
    const isAuthRoute =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/signup") ||
      originalRequest.url?.includes("/api/auth/forgot-password") ||
      originalRequest.url?.includes("/api/auth/reset-password") ||
      originalRequest.url?.includes("/api/auth/resend") ||
      originalRequest.url?.includes("/api/auth/google-login") ||
      originalRequest.url?.includes("/api/auth/logout");

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    // If refresh is disabled globally (session lost), reject immediately
    if (refreshDisabled) {
      return Promise.reject(error);
    }

    // ===== Handle 401 (Unauthorized - Token Expired) =====
    if (axiosError.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest)).catch((err) => Promise.reject(err));
      }

      // Mark as retry to prevent infinite loops
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint to get new access token and CSRF token
        const refreshResponse = await apiClient.post("/api/refresh", {});
        
        // Reset refresh state on success
        refreshDisabled = false;
        processQueue(null);

        // Retry original request with new tokens
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // Refresh failed - session is invalid
        refreshDisabled = true;
        processQueue(refreshErr);

        if (shouldRedirectToLogin(window.location.pathname)) {
          window.location.href = "/login";
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ===== Handle 403 (CSRF Token Invalid) =====
    if (axiosError.response?.status === 403 && !originalRequest._csrfRetry) {
      // Check if this is a CSRF error by looking at response
      const responseData = axiosError.response?.data as { message?: string };
      const isCsrfError = responseData?.message?.includes("CSRF");

      if (isCsrfError) {
        // Mark as CSRF retry to prevent infinite loops
        originalRequest._csrfRetry = true;

        // If already refreshing for CSRF, queue this request
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => apiClient(originalRequest)).catch((err) => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          // Call refresh endpoint to get new CSRF token
          await apiClient.post("/api/refresh", {});
          refreshDisabled = false;
          processQueue(null);

          // Retry original request with new CSRF token
          return apiClient(originalRequest);
        } catch (refreshErr) {
          // Refresh failed
          refreshDisabled = true;
          processQueue(refreshErr);

          if (shouldRedirectToLogin(window.location.pathname)) {
            window.location.href = "/login";
          }

          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;