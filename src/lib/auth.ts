import axiosClient from "./axios"; // Đã sửa theo tree hiện tại
import { useCartStore } from "@/store/useCartStore";
import Cookies from "js-cookie";

export const handleLogout = () => {
  // 1. Xóa token
  Cookies.remove("accessToken", { path: "/" });
  Cookies.remove("userRoles", { path: "/" });
  // 2. Xóa token khỏi header Axios
  if (axiosClient.defaults.headers.common["Authorization"]) {
    delete axiosClient.defaults.headers.common["Authorization"];
  }

  // 3. Xóa dữ liệu giỏ hàng
  useCartStore.getState().clearCart();

  // 4. Chuyển hướng
  window.location.href = "/login";
};
