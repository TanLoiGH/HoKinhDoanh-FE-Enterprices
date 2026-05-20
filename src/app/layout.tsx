'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';
import PwaRegister from '@/components/PwaRegister';
import AuthGuard from '@/components/AuthGuard';
import RealtimeBridge from '@/components/RealtimeBridge';
import OfflineSync from '@/components/OfflineSync';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  Wallet, 
  BarChart3, 
  History,
  Users,
  Tag,
  Calculator,
  BookOpen,
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import './globals.css';
import { useEffect, useMemo, useRef, useState } from 'react';

const ThemeToggle = dynamic(() => import('@/components/ThemeToggle'), { ssr: false });

type AppRole = 'Admin' | 'Cashier' | 'Warehouse';

function canAccess(userRole: AppRole | undefined, roles?: AppRole[]) {
  return !roles || (!!userRole && roles.includes(userRole));
}

const SIDEBAR_SWIPE_ZONE_START = 32;
const SIDEBAR_SWIPE_ZONE_WIDTH_RATIO = 0.6;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isReceiptPage = pathname.startsWith('/receipt/');
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const role = user?.role as AppRole | undefined;
  const touchStartRef = useRef<{ x: number; y: number; edge: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    const swipeZoneEnd = window.innerWidth * SIDEBAR_SWIPE_ZONE_WIDTH_RATIO;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      edge: touch.clientX >= SIDEBAR_SWIPE_ZONE_START && touch.clientX <= swipeZoneEnd,
    };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(deltaX) > 72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4;

    if (!isHorizontalSwipe) return;

    if (!isSidebarOpen && start.edge && deltaX > 0) {
      setIsSidebarOpen(true);
    }

    if (isSidebarOpen && deltaX < 0) {
      setIsSidebarOpen(false);
    }
  };

  const navGroups = [
    {
      label: 'Tổng quan',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
      ]
    },
    {
      label: 'Nghiệp vụ',
      items: [
        { name: 'Bán hàng (POS)', href: '/pos', icon: ShoppingCart, highlight: true, roles: ['Admin', 'Cashier'] as AppRole[], color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
        { name: 'Hàng hóa', href: '/products', icon: Package, color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
        { name: 'Kho hàng', href: '/inventory', icon: Warehouse, roles: ['Admin', 'Warehouse'] as AppRole[], color: 'text-rose-400', bgColor: 'bg-rose-400/10' },
        { name: 'Danh mục', href: '/categories', icon: Tag, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
        { name: 'Thu chi', href: '/cashflow', icon: Wallet, roles: ['Admin', 'Cashier'] as AppRole[], color: 'text-violet-400', bgColor: 'bg-violet-400/10' },
        { name: 'Đơn hàng', href: '/orders', icon: History, roles: ['Admin', 'Cashier'] as AppRole[], color: 'text-sky-400', bgColor: 'bg-sky-400/10' },
        { name: 'Chốt ca', href: '/shift', icon: Calculator, roles: ['Admin', 'Cashier'] as AppRole[], color: 'text-lime-400', bgColor: 'bg-lime-400/10' },
      ]
    },
    {
      label: 'Phân tích',
      items: [
        { name: 'Báo cáo', href: '/reports', icon: BarChart3, roles: ['Admin'] as AppRole[], color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
        { name: 'Sổ doanh thu', href: '/revenue-ledger', icon: BookOpen, roles: ['Admin'] as AppRole[], color: 'text-teal-400', bgColor: 'bg-teal-400/10' },
        ...(user?.role === 'Admin' ? [{ name: 'Audit Log', href: '/audit', icon: History, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' }] : []),
        { name: 'Khách hàng', href: '/customers', icon: Users, color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
        ...(user?.role === 'Admin' ? [{ name: 'Người dùng', href: '/users', icon: Users, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10' }] : []),
      ]
    }
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.roles)),
  }));

  const activeNavItem = useMemo(
    () => navGroups.flatMap((group) => group.items).find((item) => pathname === item.href),
    [navGroups, pathname],
  );

  const roleLabel: Record<string, string> = {
    Admin: 'Quản lý',
    Cashier: 'Nhân viên bán hàng',
    Warehouse: 'Thủ kho',
  };

  const avatarColors: Record<string, string> = {
    Admin: 'from-violet-500 to-indigo-600',
    Cashier: 'from-emerald-500 to-teal-600',
    Warehouse: 'from-orange-500 to-amber-600',
  };

  const sidebarContent = (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-app px-5 py-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-black text-white shadow-lg shadow-blue-600/20"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
          >
            HK
          </div>
          <div>
            <p className="text-sm font-black leading-tight uppercase tracking-tight text-app-strong">HKD Enterprise</p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Business Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <ThemeToggle compact />
          </div>
          <button className="app-button-ghost touch-target lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Đóng menu">
          <X className="w-5 h-5" />
        </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-8 overflow-y-auto px-4 py-6 no-scrollbar">
        {navGroups.map((group) => (
          group.items.length > 0 && (
            <div key={group.label}>
              <p className="mb-3 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-app-soft">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const itemColorClass = item.color.replace('-400', '-600');
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`group relative flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
                        isActive ? 'app-panel-subtle shadow-sm' : 'hover:bg-[color:var(--surface-2)]'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                      )}
                      
                      <div className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-300 ${isActive ? 'bg-app-surface shadow-sm scale-105' : 'bg-transparent opacity-75 group-hover:opacity-100'}`}>
                        <item.icon className={`h-4 w-4 ${isActive ? itemColorClass : 'text-app-soft group-hover:' + itemColorClass}`} />
                      </div>
                      
                      <span className={`flex-1 text-sm font-bold tracking-tight transition-colors ${isActive ? 'text-app-strong' : 'text-app-muted group-hover:text-app-strong'}`}>
                        {item.name}
                      </span>
                      
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-app-soft" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </nav>

      {/* User Info Footer */}
      <div className="border-t border-app bg-[color:var(--surface-2)]/80 p-4">
        <div className="app-panel-subtle mb-2 flex items-center gap-3 p-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br text-xs font-black text-white shadow-sm ${avatarColors[user?.role ?? ''] ?? 'from-slate-500 to-slate-700'}`}
          >
            {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-tight text-app-strong">{user?.fullName}</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-app-soft">
              {roleLabel[user?.role ?? ''] ?? user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all duration-150 hover:bg-rose-50/80"
        >
          <LogOut className="w-3.5 h-3.5" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <title>HKD Enterprise</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <meta name="description" content="Hệ thống quản lý doanh nghiệp HKD" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HKD POS" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#2563eb" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const stored = window.localStorage.getItem('hkd-theme');
                const theme = stored === 'dark' || stored === 'light'
                  ? stored
                  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme;
              } catch (_) {}
            })();`,
          }}
        />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {mounted && (
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'color-mix(in srgb, var(--surface-1) 88%, transparent)',
                color: 'var(--text-strong)',
                border: '1px solid var(--panel-border)',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-medium)',
                fontSize: '13px',
                fontWeight: 700,
                padding: '12px 18px',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        )}
        <PwaRegister />
        <RealtimeBridge />
        <OfflineSync />
        <AuthGuard>
          {isLoginPage || isReceiptPage ? (
            children
          ) : (
            <div
              className="app-shell flex h-dvh min-h-dvh overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* ─── Mobile Sidebar Overlay ─── */}
              {isSidebarOpen && (
                <div 
                  className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm transition-opacity"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              {/* ─── Sidebar ─── */}
              <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0 ${
                  isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{ flexShrink: 0 }}
              >
                <div className="app-sidebar flex h-full flex-col">{sidebarContent}</div>
              </aside>

              {/* ─── Main Area ─── */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="app-header sticky top-0 z-30 flex items-center justify-between px-4 py-3 pt-safe lg:hidden">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="app-button-ghost touch-target -ml-2"
                      aria-label="Mở menu"
                    >
                      <Menu className="h-6 w-6 text-app-base" />
                    </button>
                    <div>
                      <span className="block text-sm font-black text-app-strong">HKD Enterprise</span>
                      <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">
                        {activeNavItem?.name ?? "Điều hành"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ThemeToggle compact />
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white ${avatarColors[user?.role ?? '']}`}>
                      {user?.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                  </div>
                </header>

                {/* ─── Main Content ─── */}
                <main className="bg-app-page flex-1 overflow-auto touch-scroll pb-28 lg:pb-0">
                  <div className="app-header sticky top-0 z-20 hidden items-center justify-between px-6 py-4 lg:flex">
                    <div>
                      <p className="app-kicker mb-1">Điều hành</p>
                      <h2 className="text-lg font-black text-app-strong">{activeNavItem?.name ?? "Dashboard"}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <ThemeToggle />
                      <div className="app-pill">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white ${avatarColors[user?.role ?? '']}`}>
                          {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-app-strong">{user?.fullName}</p>
                          <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">
                            {roleLabel[user?.role ?? ''] ?? user?.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mx-auto w-full max-w-[1600px] animate-fade-in px-3 py-3 sm:px-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
                    {children}
                  </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="app-header fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-3 py-2 pb-safe lg:hidden">
                  {[
                    { name: 'Home', href: '/', icon: LayoutDashboard },
                    { name: 'POS', href: '/pos', icon: ShoppingCart, roles: ['Admin', 'Cashier'] as AppRole[] },
                    { name: 'Hàng', href: '/products', icon: Package },
                    ...(role === 'Admin' ? [{ name: 'Báo cáo', href: '/reports', icon: BarChart3 }] : []),
                  ].filter((item) => canAccess(role, item.roles)).map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <div key={item.name} className="flex flex-col items-center gap-1">
                        <Link
                          href={item.href}
                          className={`touch-target flex items-center justify-center rounded-2xl transition-all ${isActive ? 'bg-[color:var(--brand-surface)] text-blue-600 shadow-sm' : 'text-app-muted'}`}
                        >
                          <item.icon className="w-6 h-6" />
                        </Link>
                        <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-app-soft'}`}>
                          {item.name}
                        </span>
                      </div>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}
        </AuthGuard>
      </body>
    </html>
  );
}
