import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  const rolesCookie = request.cookies.get("userRoles")?.value;
  const pathname = request.nextUrl.pathname;

  // 1. Bảo vệ trang Khách hàng (yêu cầu đăng nhập)
  if (
    (pathname.startsWith("/checkout") || pathname.startsWith("/orders")) &&
    !token
  ) {
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
  // Nhớ thêm route /admin vào matcher để middleware theo dõi
  matcher: ["/checkout/:path*", "/orders/:path*", "/admin/:path*"],
};
