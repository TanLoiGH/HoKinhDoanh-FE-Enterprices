import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  const rolesCookie = request.cookies.get("userRoles")?.value;
  const pathname = request.nextUrl.pathname;

  // 1. Bảo vệ checkout nếu chạy trực tiếp qua middleware.
  // Các màn app như /orders dùng AuthGuard phía client vì token hiện được lưu trong Zustand/localStorage.
  if (pathname.startsWith("/checkout") && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Bảo vệ trang Admin (yêu cầu đăng nhập VÀ có quyền Admin)
  if (pathname.startsWith("/admin")) {
    if (!token) {
      // Chưa đăng nhập -> Đá về trang Login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Đã đăng nhập -> Kiểm tra quyền
    let isAdmin = false;
    if (rolesCookie) {
      try {
        const roles: string[] = JSON.parse(rolesCookie);
        isAdmin = roles.includes("Admin");
      } catch (error) {
        console.error("Lỗi parse role cookie", error);
      }
    }

    if (!isAdmin) {
      // Có token nhưng KHÔNG PHẢI Admin -> Đá về trang chủ
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout/:path*", "/admin/:path*"],
};
