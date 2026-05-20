import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../store/useAuthStore";
import { enqueueOfflineMutation, isEligibleOfflineMutation } from "./offlineQueue";

const LOCAL_API =
  process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:5122/api";

export function resolveApiBaseUrl() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    if (host === "localhost" || host === "127.0.0.1") {
      return LOCAL_API;
    }

    return `${protocol}//${window.location.host}/api`;
  }

  return LOCAL_API;
}

export function resolveHubBaseUrl() {
  const apiBaseUrl = resolveApiBaseUrl();
  return apiBaseUrl.replace(/\/api$/, "");
}

const api = axios.create({
  baseURL: LOCAL_API, // Mặc định cho localhost/SSR
  timeout: 30000, // 30s để backend có đủ thời gian khởi động
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// ─── Interceptor: Tự động đổi baseURL sang IP nội bộ khi dùng Ngrok/Mobile ──
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.baseURL = resolveApiBaseUrl();
  }
  return config;
});

// REQUEST INTERCEPTOR: Lấy token từ Zustand store (localStorage)
api.interceptors.request.use(
  (config) => {
    const user = useAuthStore.getState().user;
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── REFRESH TOKEN LOGIC ──────────────────────────────────────────────────────
// Lock + Queue: nếu nhiều request cùng bị 401, chỉ gọi refresh 1 lần
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: InternalAxiosRequestConfig) => void;
  reject: (reason: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function processQueue(error: unknown, newToken: string | null = null) {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else if (newToken) {
      config.headers.Authorization = `Bearer ${newToken}`;
      resolve(config);
    }
  });
  failedQueue = [];
}

// RESPONSE INTERCEPTOR: Tự động Refresh Token khi 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Nếu request không có config hoặc không phải 401 → bỏ qua
    if (!originalRequest || error.response?.status !== 401) {
      // Offline queue handling
      if (!error.response && isEligibleOfflineMutation(error.config)) {
        const mutation = enqueueOfflineMutation(error.config!);
        (error as AxiosError & { isQueuedOffline?: boolean; offlineMutationId?: string }).isQueuedOffline = true;
        (error as AxiosError & { offlineMutationId?: string }).offlineMutationId = mutation.id;
      }
      return Promise.reject(error);
    }

    // Nếu request refresh chính nó bị 401 → logout luôn (tránh loop)
    if (originalRequest.url?.includes("/auth/refresh")) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login?callbackUrl=" + window.location.pathname;
      }
      return Promise.reject(error);
    }

    // Nếu đã retry rồi → logout
    if (originalRequest._retry) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login?callbackUrl=" + window.location.pathname;
      }
      return Promise.reject(error);
    }

    // Nếu đang refresh → xếp hàng chờ
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject, config: originalRequest });
      }).then((config) => api(config as InternalAxiosRequestConfig));
    }

    // Bắt đầu refresh
    originalRequest._retry = true;
    isRefreshing = true;

    const user = useAuthStore.getState().user;
    if (!user?.token || !user?.refreshToken) {
      isRefreshing = false;
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login?callbackUrl=" + window.location.pathname;
      }
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${resolveApiBaseUrl()}/auth/refresh`, {
        accessToken: user.token,
        refreshToken: user.refreshToken,
      });

      const newToken = data.token as string;
      const newRefreshToken = data.refreshToken as string;

      // Cập nhật store
      useAuthStore.getState().updateTokens(newToken, newRefreshToken);

      // Replay tất cả request đang chờ
      processQueue(null, newToken);

      // Replay request gốc
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login?callbackUrl=" + window.location.pathname;
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;

