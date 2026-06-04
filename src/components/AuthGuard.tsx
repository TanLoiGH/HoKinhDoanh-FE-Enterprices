'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ROUTE_RULES: Array<{ prefix: string; roles: Array<'Admin' | 'Cashier' | 'Warehouse'> }> = [
  { prefix: '/admin', roles: ['Admin'] },
  { prefix: '/audit', roles: ['Admin'] },
  { prefix: '/branches', roles: ['Admin'] },
  { prefix: '/users', roles: ['Admin'] },
  { prefix: '/reports', roles: ['Admin'] },
  { prefix: '/revenue-ledger', roles: ['Admin'] },
  { prefix: '/inventory', roles: ['Admin', 'Warehouse'] },
  { prefix: '/cashflow', roles: ['Admin', 'Cashier'] },
  { prefix: '/pos', roles: ['Admin', 'Cashier'] },
  { prefix: '/orders', roles: ['Admin', 'Cashier'] },
  { prefix: '/shift', roles: ['Admin', 'Cashier'] },
];

const roleLabel: Record<string, string> = {
  Admin: 'Quản lý',
  Cashier: 'Nhân viên bán hàng',
  Warehouse: 'Thủ kho',
};

/**
 * Normalize role string - handles both string and numeric representations
 * DB lưu: 0=Admin, 1=Cashier, 2=Warehouse
 * API trả về: "Admin", "Cashier", "Warehouse" (nhờ JsonStringEnumConverter)
 * Nhưng phòng trường hợp vẫn nhận số, ta normalize luôn
 */
function normalizeRole(role: unknown): 'Admin' | 'Cashier' | 'Warehouse' | null {
  if (role === 'Admin' || role === 0 || role === '0') return 'Admin';
  if (role === 'Cashier' || role === 1 || role === '1') return 'Cashier';
  if (role === 'Warehouse' || role === 2 || role === '2') return 'Warehouse';
  return null;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // ── Chưa đăng nhập → về login ──
    if (!isAuthenticated && pathname !== '/login') {
      router.push(`/login?callbackUrl=${pathname}`);
      return;
    }

    // ── Đã đăng nhập, vào login → về dashboard ──
    if (isAuthenticated && pathname === '/login') {
      router.push('/');
      return;
    }

    // ── Kiểm tra quyền theo route để tránh vào trang rồi mới bị API trả 403 ──
    const routeRule = ROUTE_RULES.find((rule) => pathname.startsWith(rule.prefix));
    if (isAuthenticated && routeRule) {
      const role = normalizeRole(user?.role);
      console.log(`[AuthGuard] Path: ${pathname} | Role: ${user?.role} | Normalized: ${role}`);

      if (!role || !routeRule.roles.includes(role)) {
        const name = roleLabel[role ?? ''] ?? 'Không xác định';
        const errorTimer = window.setTimeout(() => {
          toast.error(`Tài khoản "${user?.fullName}" (${name}) không có quyền truy cập khu vực này.`);
        }, 0);
        const redirectTimer = window.setTimeout(() => router.push('/'), 3000);
        return () => {
          window.clearTimeout(errorTimer);
          window.clearTimeout(redirectTimer);
        };
      }
    }
  }, [isAuthenticated, user, pathname, router, mounted]);

  // ── Chờ mount (tránh hydration mismatch) ──
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(224 71% 4%)' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-slate-400 text-sm">Đang tải hệ thống...</p>
        </div>
      </div>
    );
  }

  // ── Đang redirect (chưa auth) ──
  if (!isAuthenticated && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(224 71% 4%)' }}>
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
