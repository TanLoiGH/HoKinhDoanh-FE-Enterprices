import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const LOCAL_API =
  process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:5122/api";

const api = axios.create({
  baseURL: LOCAL_API,
  withCredentials: true, // Cho phép truyền và lưu cookie bảo mật cross-origin
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

// Tự động đổi baseURL khi dùng Ngrok/Mobile hoặc truy cập qua IP
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    const isIp = /^[0-9.]+$/.test(host);
    const isLocalhost = host === "localhost" || host === "127.0.0.1";

    if ((!isLocalhost && !isIp) || !port || port === "80" || port === "443") {
      config.baseURL = `${protocol}//${window.location.host}/api`;
    } else {
      try {
        const url = new URL(LOCAL_API);
        url.hostname = host;
        config.baseURL = url.toString().replace(/\/$/, "");
      } catch {
        config.baseURL = `http://${host}:5122/api`;
      }
    }
  }
  return config;
});

// Interceptor to add JWT token
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

// Interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
