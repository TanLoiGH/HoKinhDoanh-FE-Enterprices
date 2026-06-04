import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Vô hiệu hóa ở môi trường Dev để tránh cache nhầm code đang sửa
  register: true,
});

const apiRewriteTarget =
  process.env.API_REWRITE_TARGET ||
  process.env.NEXT_PUBLIC_LOCAL_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5122";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiRewriteTarget}/api/:path*`,
      },
      {
        source: "/hubs/:path*",
        destination: `${apiRewriteTarget}/hubs/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
