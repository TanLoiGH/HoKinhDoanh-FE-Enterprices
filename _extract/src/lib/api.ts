import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const LOCAL_API =
  process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://localhost:5122/api";

const api = axios.create({
  baseURL: LOCAL_API,
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

    // 1. Nếu đang dùng localhost -> dùng LOCAL_API (gọi thẳng port 5122)
    if (host === "localhost" || host === "127.0.0.1") {
      config.baseURL = LOCAL_API;
    }
    // 2. Nếu dùng Ngrok hoặc bất kỳ domain nào khác -> Dùng Next.js Rewrites (Proxy qua port 3000)
    // Điều này giúp chúng ta chỉ cần 1 cổng Ngrok duy nhất
    else {
      config.baseURL = `${protocol}//${window.location.host}/api`;
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
