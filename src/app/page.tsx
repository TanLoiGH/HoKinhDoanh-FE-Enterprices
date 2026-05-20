"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { DashboardStatsDto } from "@/lib/dtos";
import { Loader2, TrendingUp, Package, ShoppingCart, DollarSign, RefreshCw, Wallet, BarChart3, type LucideIcon } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [from, setFrom] = useState(daysAgoIso(7));
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError("");
    try {
      const response = await api.get<DashboardStatsDto>("/dashboard/stats", {
        params: { from, to, chartDays: 14 }, // Show 14 days by default in chart
      });
      setStats(response.data);
    } catch (fetchError) {
      console.error("Lỗi khi lấy dữ liệu dashboard:", fetchError);
      setError("Không tải được dashboard. Kiểm tra API hoặc database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchStats());
    const intervalId = window.setInterval(() => {
      void fetchStats();
    }, 60000); // 60s refresh — tránh xung đột với timeout 30s
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const cards: Array<{ label: string; value: string | number; color: string; Icon: LucideIcon; bgColor: string }> = [
    { label: "Doanh thu hôm nay", value: formatCurrency(stats?.todayRevenue || 0), color: "text-emerald-600", Icon: DollarSign, bgColor: "bg-emerald-50" },
    { label: "Số đơn hàng", value: stats?.todayOrders || 0, color: "text-blue-600", Icon: ShoppingCart, bgColor: "bg-blue-50" },
    { label: "Sắp hết hàng", value: stats?.lowStockProducts || 0, color: "text-rose-600", Icon: Package, bgColor: "bg-rose-50" },
    { label: "Lợi nhuận gộp", value: formatCurrency(stats?.grossProfit || 0), color: "text-violet-600", Icon: TrendingUp, bgColor: "bg-violet-50" },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:space-y-6 md:pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-kicker mb-2">Tổng quan vận hành</p>
          <h1 className="app-title text-2xl font-black tracking-tight md:text-3xl">Tổng quan</h1>
          <p className="text-sm font-semibold text-app-muted">Cập nhật lúc: {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleTimeString("vi-VN") : "Đang tải..."}</p>
        </div>
        <div className="app-panel flex flex-col items-stretch gap-2 p-1.5 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-1.5 px-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent py-1 text-sm font-bold text-app-base focus:outline-none" />
            <span className="text-[10px] font-black text-app-soft">/</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent py-1 text-sm font-bold text-app-base focus:outline-none" />
          </div>
          <button 
            onClick={() => fetchStats(true)} 
            disabled={refreshing} 
            className="app-button-primary flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Quick Actions - Mobile Only Feature */}
      <div className="lg:hidden">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Thao tác nhanh</p>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {[
            { name: 'Bán hàng', href: '/pos', icon: ShoppingCart, color: 'bg-blue-600' },
            { name: '+ Hàng', href: '/products', icon: Package, color: 'bg-emerald-600' },
            { name: 'Thu chi', href: '/cashflow', icon: Wallet, color: 'bg-violet-600' },
            { name: 'Báo cáo', href: '/reports', icon: BarChart3, color: 'bg-orange-600' },
          ].map((action) => (
            <Link 
              key={action.name} 
              href={action.href}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/5 active:scale-90 transition-transform`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-app-muted">{action.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, color, Icon, bgColor }) => (
          <div
            key={label}
            className="app-kpi-card relative overflow-hidden p-5 transition-all active:scale-95 group md:p-6"
          >
            {/* Main Content */}
            <div className="relative z-10">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] ${bgColor} ${color} shadow-lg shadow-black/5`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-app-soft">{label}</p>
              <p className={`text-xl font-black tracking-tight ${color}`}>{value}</p>
            </div>
            
            {/* Refined background decoration - Smooth Glow */}
            <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-[color:var(--brand-surface)]/50 blur-3xl transition-colors duration-500 group-hover:bg-blue-100/50" />
            <div className="absolute -left-4 -top-4 h-16 w-16 rounded-full bg-[color:var(--surface-3)]/60 blur-2xl" />
          </div>
        ))}
      </div>


      <div className="grid gap-3 lg:grid-cols-3">
        <div className="col-span-full overflow-hidden rounded-3xl border-4 border-white bg-white p-4 shadow-2xl md:p-8 lg:col-span-2 lg:rounded-[2.5rem]">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Xu hướng doanh số</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Biến động doanh thu & đơn hàng</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl">
              <div className="flex items-center gap-2 px-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-600 shadow-sm" />
                <span className="text-[10px] font-black text-slate-600 uppercase">Doanh thu</span>
              </div>
              <div className="flex items-center gap-2 px-2 border-l border-slate-200">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-400 shadow-sm" />
                <span className="text-[10px] font-black text-slate-600 uppercase">Đơn hàng</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.revenueChart || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={15} tickFormatter={(str) => { const d = new Date(str); return `${d.getDate()}/${d.getMonth()+1}`; }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${val/1000}K`} />
                <Tooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }} content={({ active, payload, label }) => { if (active && payload && payload.length) { return ( <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-200"> <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p> <div className="space-y-2"> <div className="flex items-center justify-between gap-8"> <div className="flex items-center gap-2"> <div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-[10px] font-bold text-blue-400 uppercase">Doanh thu</span> </div> <span className="text-sm font-black">{formatCurrency(payload[0].value as number)}</span> </div> <div className="flex items-center justify-between gap-8"> <div className="flex items-center gap-2"> <div className="w-2 h-2 rounded-full bg-orange-400" /> <span className="text-[10px] font-bold text-orange-400 uppercase">Số đơn</span> </div> <span className="text-sm font-black">{payload[1].value} đơn</span> </div> </div> </div> ); } return null; }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" animationDuration={2000} />
                <Area type="monotone" dataKey="orderCount" stroke="#f97316" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorOrd)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart for Product Mix */}
        <div className="flex flex-col items-center justify-center rounded-3xl border-4 border-white bg-white p-4 text-center shadow-2xl md:p-8 lg:rounded-[2.5rem]">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Cơ cấu doanh thu</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Tỉ lệ đóng góp của Top 5</p>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.topProducts || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="revenue"
                  animationDuration={1500}
                >
                  {(stats?.topProducts || []).map((_, index) => (
                    <Cell key={index} fill={['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs font-black">
                          {payload[0].name}: {formatCurrency(payload[0].value as number)}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tổng Top 5</span>
              <span className="text-sm font-black text-slate-900">
                {formatCurrency(stats?.topProducts.reduce((s, p) => s + p.revenue, 0) || 0)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {stats?.topProducts.slice(0, 3).map((p, i) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ background: ['#2563eb', '#3b82f6', '#60a5fa'][i] }} />
                <span className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[80px]">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Top Selling Details */}
        <div className="flex flex-col overflow-hidden rounded-3xl border-4 border-white bg-white p-4 shadow-2xl md:p-8 lg:col-span-3 lg:rounded-[2.5rem]">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Chi tiết bán chạy</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Xếp hạng theo sản lượng và giá trị</p>
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn hàng trung bình (AOV)</p>
              <p className="text-lg font-black text-blue-600">{formatCurrency((stats?.todayRevenue || 0) / (stats?.todayOrders || 1))}</p>
            </div>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2">
            {stats?.topProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-300">
                <Package className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Chưa có dữ liệu</p>
              </div>
            ) : (
              stats?.topProducts.map((product, index) => (
                <div key={product.name} className="group relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-black ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-slate-400' : 'text-orange-300'}`}>
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Đã bán: {product.qty}</p>
                      </div>
                    </div>
                    <div className="text-sm font-black text-slate-900 tracking-tighter">{formatCurrency(product.revenue)}</div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${index === 0 ? 'from-blue-600 to-blue-400' : index === 1 ? 'from-slate-400 to-slate-300' : 'from-orange-400 to-orange-300'} animate-in slide-in-from-left duration-1000`}
                      style={{ width: `${(product.revenue / (stats.todayRevenue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Extra Action Cards */}
        <div className="flex flex-col gap-4">
          <div className="flex-1 rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl relative overflow-hidden group">
            <TrendingUp className="w-10 h-10 mb-4 text-emerald-400" />
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Lợi nhuận gộp</h4>
            <p className="text-2xl font-black tracking-tighter">{formatCurrency(stats?.grossProfit || 0)}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Tăng 12% so với hôm qua</p>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-24 h-24" />
            </div>
          </div>
          
          <Link 
            href="/reports" 
            className="rounded-[2.5rem] border-4 border-white bg-white p-8 shadow-2xl flex items-center justify-between hover:bg-slate-50 transition-all active:scale-95 group"
          >
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Tải báo cáo</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Xuất file Excel/PDF</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <BarChart3 className="w-6 h-6" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
