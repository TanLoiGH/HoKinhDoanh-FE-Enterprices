"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { DashboardStatsDto } from "@/lib/dtos";
import { useAuthStore } from "@/store/useAuthStore";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DollarSign,
  History,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AppRole = "Admin" | "Cashier" | "Warehouse";
type DashboardMode = "management" | "cashier" | "warehouse";

const QUICK_RANGES = [
  { label: "Hôm nay", days: 1 },
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
] as const;

const PRODUCT_COLORS = ["#2563eb", "#059669", "#f97316", "#7c3aed", "#e11d48"];

const KPI_ACCENT_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  slate: "bg-slate-50 text-slate-600",
  violet: "bg-violet-50 text-violet-600",
};

const QUICK_ACTION_CLASSES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  teal: "bg-teal-50 text-teal-600",
  violet: "bg-violet-50 text-violet-600",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatTime = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const formatChartLabel = (value: string) => {
  if (!value) return "";
  if (value.includes("/")) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const compactCurrencyTick = (value: number) => {
  if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value}`;
};

const getDashboardMode = (role?: AppRole): DashboardMode => {
  if (role === "Cashier") return "cashier";
  if (role === "Warehouse") return "warehouse";
  return "management";
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role as AppRole | undefined;
  const mode = getDashboardMode(role);

  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [from, setFrom] = useState(daysAgoIso(7));
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchStats = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      setError("");

      try {
        const response = await api.get<DashboardStatsDto>("/dashboard/stats", {
          params: { from, to, chartDays: 14 },
        });
        setStats(response.data);
      } catch (fetchError) {
        console.error("Lỗi khi lấy dữ liệu dashboard:", fetchError);
        setError("Không tải được dashboard. Kiểm tra API hoặc database.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [from, to],
  );

  useEffect(() => {
    void fetchStats();
    const intervalId = window.setInterval(() => void fetchStats(), 60000);
    return () => window.clearInterval(intervalId);
  }, [fetchStats]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (["dashboardChanged", "inventoryChanged", "cashFlowChanged", "catalogChanged"].includes(detail?.type)) {
        void fetchStats();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, [fetchStats]);

  const revenueChart = useMemo(
    () =>
      (stats?.revenueChart ?? []).map((point) => ({
        ...point,
        label: formatChartLabel(point.date),
      })),
    [stats?.revenueChart],
  );

  const chartHasActivity = revenueChart.some((point) => point.revenue > 0 || point.orderCount > 0);
  const topProducts = stats?.topProducts ?? [];
  const totalTopRevenue = topProducts.reduce((sum, product) => sum + product.revenue, 0);
  const hasTopProducts = topProducts.length > 0 && totalTopRevenue > 0;

  const openAlerts = [
    stats && stats.lowStockProducts > 0
      ? {
          title: "Hàng sắp hết",
          detail: `${stats.lowStockProducts} sản phẩm cần kiểm tra tồn kho.`,
          href: "/inventory",
          Icon: Warehouse,
          tone: "danger",
        }
      : null,
    !chartHasActivity
      ? {
          title: "Chưa có doanh thu trong kỳ",
          detail: "Bán hàng qua POS để dashboard ghi nhận doanh thu và đơn hàng.",
          href: "/pos",
          Icon: ShoppingCart,
          tone: "neutral",
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    detail: string;
    href: string;
    Icon: LucideIcon;
    tone: "danger" | "neutral";
  }>;

  const primaryKpis = [
    {
      label: mode === "warehouse" ? "Sản phẩm sắp hết" : "Doanh thu hôm nay",
      value: mode === "warehouse" ? stats?.lowStockProducts ?? 0 : formatCurrency(stats?.todayRevenue ?? 0),
      helper: mode === "warehouse" ? "Cần kiểm kho" : "Đơn hoàn tất trong ngày",
      Icon: mode === "warehouse" ? Package : DollarSign,
      accent: "emerald",
    },
    {
      label: mode === "cashier" ? "Đơn hôm nay" : "Số đơn hàng",
      value: stats?.todayOrders ?? 0,
      helper: mode === "cashier" ? "Ca bán hiện tại" : "Đã ghi nhận hôm nay",
      Icon: ShoppingCart,
      accent: "blue",
    },
    {
      label: "Lợi nhuận gộp",
      value: formatCurrency(stats?.grossProfit ?? 0),
      helper: "Từ dữ liệu bán hàng thật",
      Icon: TrendingUp,
      accent: "violet",
    },
    {
      label: "Cập nhật",
      value: formatTime(stats?.lastUpdated),
      helper: "Tự làm mới mỗi 60 giây",
      Icon: Clock3,
      accent: "slate",
    },
  ];

  const quickActions = {
    management: [
      { label: "Bán hàng", href: "/pos", Icon: ShoppingCart, tone: "blue" },
      { label: "Đơn hàng", href: "/orders", Icon: History, tone: "sky" },
      { label: "Thu chi", href: "/cashflow", Icon: Wallet, tone: "violet" },
      { label: "Báo cáo", href: "/reports", Icon: BarChart3, tone: "orange" },
      { label: "Sổ doanh thu", href: "/revenue-ledger", Icon: BookOpen, tone: "teal" },
    ],
    cashier: [
      { label: "Bán hàng", href: "/pos", Icon: ShoppingCart, tone: "blue" },
      { label: "Đơn hàng", href: "/orders", Icon: History, tone: "sky" },
      { label: "Thu chi", href: "/cashflow", Icon: Wallet, tone: "violet" },
      { label: "Chốt ca", href: "/shift", Icon: CheckCircle2, tone: "emerald" },
    ],
    warehouse: [
      { label: "Kho hàng", href: "/inventory", Icon: Warehouse, tone: "rose" },
      { label: "Hàng hóa", href: "/products", Icon: Package, tone: "orange" },
      { label: "Danh mục", href: "/categories", Icon: BookOpen, tone: "teal" },
    ],
  } satisfies Record<DashboardMode, Array<{ label: string; href: string; Icon: LucideIcon; tone: string }>>;

  const applyQuickRange = (days: number) => {
    setFrom(daysAgoIso(days));
    setTo(todayIso());
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-20 md:pb-10">
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="app-kpi-card h-36 animate-pulse bg-slate-100/70" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="app-panel-strong h-80 animate-pulse lg:col-span-2" />
          <div className="app-panel-strong h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:space-y-5 md:pb-10">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="app-panel-strong overflow-hidden p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-kicker mb-2">Trung tâm vận hành</p>
              <h1 className="app-title text-2xl font-black leading-tight md:text-4xl">
                Tổng quan hôm nay
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-app-muted">
                Theo dõi doanh thu, đơn hàng, cảnh báo tồn kho và các thao tác cần xử lý trong ngày.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {QUICK_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => applyQuickRange(range.days)}
                  className="rounded-2xl border border-app bg-[color:var(--surface-2)] px-3 py-2 text-[11px] font-black text-app-muted transition hover:text-app-strong"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="app-panel-subtle flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
              <div className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl px-3">
                <CalendarDays className="h-4 w-4 text-app-soft" />
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-app-base focus:outline-none"
                />
                <span className="text-app-soft">/</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-black text-app-base focus:outline-none"
                />
              </div>
              <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                className="app-button-primary flex min-h-11 items-center justify-center gap-2 px-4 text-xs font-black"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Tải lại
              </button>
            </div>

            <div className="app-panel-subtle flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-app-soft">Trạng thái</p>
                <p className="text-sm font-black text-app-strong">Cập nhật {formatTime(stats?.lastUpdated)}</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="app-panel-strong p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="app-kicker mb-1">Cần chú ý</p>
              <h2 className="text-lg font-black text-app-strong">Cảnh báo vận hành</h2>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>

          <div className="space-y-3">
            {openAlerts.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                Chưa có cảnh báo nổi bật trong kỳ đang xem.
              </div>
            ) : (
              openAlerts.map((alert) => (
                <Link
                  key={alert.title}
                  href={alert.href}
                  className="group flex items-start gap-3 rounded-2xl border border-app bg-[color:var(--surface-2)] p-3 transition hover:bg-[color:var(--surface-3)]"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
                      alert.tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <alert.Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-app-strong">{alert.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-app-muted">{alert.detail}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </aside>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {primaryKpis.map(({ label, value, helper, Icon, accent }) => (
          <article key={label} className="app-kpi-card p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${KPI_ACCENT_CLASSES[accent]}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-app-soft">{label}</p>
            <p className="mt-1 break-words text-2xl font-black leading-tight text-app-strong tabular-nums md:text-3xl">
              {value}
            </p>
            <p className="mt-2 text-xs font-semibold text-app-muted">{helper}</p>
          </article>
        ))}
      </section>

      <section className="app-panel-strong p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="app-kicker mb-1">Thao tác nhanh</p>
            <h2 className="text-lg font-black text-app-strong">
              {mode === "cashier" ? "Màn hình thu ngân" : mode === "warehouse" ? "Màn hình kho" : "Đi tới nghiệp vụ"}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions[mode].map(({ label, href, Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-24 flex-col justify-between rounded-2xl border border-app bg-[color:var(--surface-2)] p-4 transition hover:-translate-y-0.5 hover:bg-[color:var(--surface-3)]"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${QUICK_ACTION_CLASSES[tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-black text-app-strong">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <article className="app-panel-strong overflow-hidden p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-kicker mb-1">Xu hướng</p>
              <h2 className="text-xl font-black text-app-strong">Doanh thu và đơn hàng</h2>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[color:var(--surface-2)] px-3 py-2">
              <span className="flex items-center gap-2 text-[10px] font-black text-app-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                Doanh thu
              </span>
              <span className="flex items-center gap-2 text-[10px] font-black text-app-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                Đơn hàng
              </span>
            </div>
          </div>

          {chartHasActivity ? (
            <div className="h-[280px] md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="orderFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--panel-border)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 800, fill: "var(--text-soft)" }}
                    dy={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 800, fill: "var(--text-soft)" }}
                    tickFormatter={compactCurrencyTick}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--panel-border)", strokeWidth: 2, strokeDasharray: "5 5" }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const revenue = Number(payload.find((item) => item.dataKey === "revenue")?.value ?? 0);
                      const orders = Number(payload.find((item) => item.dataKey === "orderCount")?.value ?? 0);

                      return (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-white shadow-2xl">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                          <p className="text-sm font-black">{formatCurrency(revenue)}</p>
                          <p className="mt-1 text-xs font-bold text-orange-300">{orders} đơn</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fill="url(#revenueFill)" />
                  <Area type="monotone" dataKey="orderCount" stroke="#f97316" strokeWidth={2} fill="url(#orderFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel
              Icon={BarChart3}
              title="Chưa có dữ liệu xu hướng"
              detail="Khi có đơn hoàn tất trong kỳ, biểu đồ doanh thu và số đơn sẽ hiển thị tại đây."
            />
          )}
        </article>

        <article className="app-panel-strong p-4 md:p-6">
          <div className="mb-5">
            <p className="app-kicker mb-1">Cơ cấu</p>
            <h2 className="text-xl font-black text-app-strong">Top sản phẩm</h2>
          </div>

          {hasTopProducts ? (
            <>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={4}
                      dataKey="revenue"
                      nameKey="name"
                    >
                      {topProducts.map((product, index) => (
                        <Cell key={product.name} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-xl bg-slate-950 p-3 text-xs font-black text-white shadow-xl">
                            {payload[0].name}: {formatCurrency(Number(payload[0].value ?? 0))}
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-app-soft">Top sản phẩm</span>
                  <span className="text-sm font-black text-app-strong">{formatCurrency(totalTopRevenue)}</span>
                </div>
              </div>
            </>
          ) : (
            <EmptyPanel
              Icon={Package}
              title="Chưa có sản phẩm bán chạy"
              detail="Danh sách sẽ xuất hiện khi trong kỳ có đơn hàng hoàn tất."
            />
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <article className="app-panel-strong p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="app-kicker mb-1">Chi tiết</p>
              <h2 className="text-xl font-black text-app-strong">Bán chạy trong kỳ</h2>
            </div>
            <p className="hidden text-right text-xs font-bold text-app-muted sm:block">
              Tổng top: <span className="text-app-strong">{formatCurrency(totalTopRevenue)}</span>
            </p>
          </div>

          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((product, index) => {
                const percent = totalTopRevenue > 0 ? Math.min(100, (product.revenue / totalTopRevenue) * 100) : 0;

                return (
                  <div key={product.name} className="rounded-2xl bg-[color:var(--surface-2)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-app-strong">
                          #{index + 1} {product.name}
                        </p>
                        <p className="mt-1 text-xs font-bold text-app-muted">Đã bán {product.qty} sản phẩm</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-app-strong tabular-nums">{formatCurrency(product.revenue)}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyPanel
              Icon={Package}
              title="Chưa có dữ liệu bán chạy"
              detail="Bán hàng qua POS hoặc kiểm tra kỳ báo cáo khác để xem xếp hạng sản phẩm."
            />
          )}
        </article>

        <aside className="space-y-4">
          <div className="app-panel-strong bg-slate-950 p-5 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Điều hành nhanh</p>
            <h3 className="mt-2 text-lg font-black">Mở nghiệp vụ đúng vai trò</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
              Dashboard ưu tiên thao tác thường dùng cho {role === "Cashier" ? "thu ngân" : role === "Warehouse" ? "thủ kho" : "quản lý"}.
            </p>
          </div>

          <Link
            href={mode === "warehouse" ? "/inventory" : mode === "cashier" ? "/shift" : "/reports"}
            className="app-panel-strong flex items-center justify-between gap-4 p-5 transition hover:bg-[color:var(--surface-2)]"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-app-soft">Tiếp theo</p>
              <h3 className="mt-1 text-base font-black text-app-strong">
                {mode === "warehouse" ? "Kiểm tra kho" : mode === "cashier" ? "Xem ca bán" : "Xem báo cáo"}
              </h3>
            </div>
            <BarChart3 className="h-6 w-6 text-blue-600" />
          </Link>
        </aside>
      </section>
    </div>
  );
}

function EmptyPanel({
  Icon,
  title,
  detail,
}: {
  Icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-app bg-[color:var(--surface-2)] p-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-black text-app-strong">{title}</p>
      <p className="mt-2 max-w-sm text-xs font-semibold leading-5 text-app-muted">{detail}</p>
    </div>
  );
}
