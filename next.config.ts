import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Vô hiệu hóa ở môi trường Dev để tránh cache nhầm code đang sửa
  register: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  turbopack: {},
};

export default withPWA(nextConfig);
