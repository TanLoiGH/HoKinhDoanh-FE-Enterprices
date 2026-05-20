"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Search,
  Calendar,
  FileText,
  TrendingUp,
  ChevronRight
} from "lucide-react";
import StatePagination from "@/components/ui/StatePagination";

interface CashFlow {
  id: number;
  type: "IN" | "OUT";
  amount: number;
  category: string;
  note?: string;
  refOrderId?: string;
  date: string;
}

export default function CashFlowPage() {
  const [items, setItems] = useState<CashFlow[]>([]);
  const [type, setType] = useState<0 | 1>(1); // 0: IN, 1: OUT
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [fetching, setFetching] = useState(true);

  // Sorting & Pagination States
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchCashFlow = async () => {
    setFetching(true);
    try {
      const response = await api.get<CashFlow[]>("/cashflow");
      setItems(response.data);
    } finally {
      setFetching(false);
    }
  };

  // Filtered and Sorted Items
  const processedItems = useMemo(() => {
    let result = [...items];

    // Filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.category.toLowerCase().includes(s) || 
        i.note?.toLowerCase().includes(s) ||
        i.refOrderId?.toLowerCase().includes(s)
      );
    }

    // Sort
    result.sort((a, b) => {
      const valA = sortConfig.key === 'date' ? new Date(a.date).getTime() : a.amount;
      const valB = sortConfig.key === 'date' ? new Date(b.date).getTime() : b.amount;
      
      if (sortConfig.direction === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return result;
  }, [items, searchTerm, sortConfig]);

  // Paginated Items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedItems.slice(start, start + itemsPerPage);
  }, [processedItems, currentPage]);

  const totalPages = Math.ceil(processedItems.length / itemsPerPage);

  const summary = useMemo(
    () => ({
      income: items.filter((item) => item.type === "IN").reduce((sum, item) => sum + item.amount, 0),
      expense: items.filter((item) => item.type === "OUT").reduce((sum, item) => sum + item.amount, 0),
    }),
    [items],
  );

  useEffect(() => {
    void Promise.resolve().then(fetchCashFlow);
  }, []);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "cashFlowChanged" || detail?.type === "dashboardChanged") {
        void fetchCashFlow();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!amount || !category) return;
    
    try {
      await api.post("/cashflow", {
        type: type === 0 ? "IN" : "OUT",
        amount: Number(amount),
        category,
        note,
      });
      setAmount("");
      setCategory("");
      setNote("");
      fetchCashFlow();
    } catch (error) {
      const responseError = error as { isQueuedOffline?: boolean };
      if (responseError.isQueuedOffline) {
        alert("Mất mạng: phiếu thu/chi đã được xếp hàng chờ đồng bộ.");
      } else {
        console.error(error);
      }
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  const [isExpanded, setIsExpanded] = useState(false);

  const stats = [
    { label: "Dòng tiền", value: summary.income - summary.expense, icon: Wallet, color: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "Tổng thu", value: summary.income, icon: ArrowUpCircle, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { label: "Tổng chi", value: summary.expense, icon: ArrowDownCircle, color: "text-rose-600", bgColor: "bg-rose-50" },
  ];

  return (
    <div className="space-y-5 pb-20 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="app-kicker mb-2">Điều hành tiền mặt</p>
          <h1 className="app-title text-3xl font-black uppercase tracking-tight">Thu chi</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">Quản lý dòng tiền và chi phí vận hành trên cùng một nhịp thao tác.</p>
        </div>
        <div className="app-pill self-start md:self-auto">
          <Calendar className="ml-1 h-4 w-4 text-app-soft" />
          <span className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-app-muted">Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Interactive Stacked Summary Cards */}
      <div 
        className={`relative transition-all duration-500 ease-in-out cursor-pointer ${isExpanded ? 'h-auto' : 'h-40 md:h-44'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={`grid gap-4 ${isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'relative h-full'}`}>
          {stats.map((s, idx) => {
            // Logic for stacking on mobile when collapsed
            const isStacked = !isExpanded;
            const stackStyle = isStacked ? {
              position: 'absolute' as const,
              top: `${idx * 16}px`,
              left: `${idx * 4}px`,
              right: `${idx * 4}px`,
              zIndex: 30 - idx,
              transform: `scale(${1 - idx * 0.04})`,
              opacity: 1 - idx * 0.3,
            } : {};

            return (
              <div 
                key={s.label} 
                className={`app-kpi-card relative overflow-hidden p-6 transition-all duration-500 group ${isStacked ? 'hover:translate-y-[-4px]' : 'hover:scale-[1.02]'}`}
                style={stackStyle}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.bgColor} ${s.color} shadow-sm`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{s.label}</p>
                    <p className={`text-xl font-black tracking-tight ${s.color}`}>{formatCurrency(s.value)}</p>
                  </div>
                  {!isExpanded && idx === 0 && (
                    <div className="app-panel-subtle p-2 text-app-soft">
                      <ChevronRight className={`w-4 h-4 transition-transform duration-500 ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  )}
                </div>
                <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-[color:var(--brand-surface)]/40 blur-3xl" />
              </div>
            );
          })}
        </div>
        
        {/* Toggle Hint */}
        {!isExpanded && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg z-40 animate-bounce">
            Chạm để xem chi tiết
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Compact Entry Form */}
        <div className="space-y-4">
          <div className="app-panel-strong relative overflow-hidden p-4 md:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-tight text-app-strong">Tạo phiếu nhanh</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div className="app-segment">
                <button
                  type="button"
                  onClick={() => setType(0)}
                  data-active={type === 0}
                  className={`app-segment-button ${type === 0 ? 'text-emerald-600' : ''}`}
                >
                  THU
                </button>
                <button
                  type="button"
                  onClick={() => setType(1)}
                  data-active={type === 1}
                  className={`app-segment-button ${type === 1 ? 'text-rose-600' : ''}`}
                >
                  CHI
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="relative">
                  <input
                    required
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Số tiền (VND)"
                    className="app-control w-full px-4 py-3 text-sm font-black"
                  />
                </div>

                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-soft" />
                  <input
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Danh mục..."
                    className="app-control w-full py-3 pl-10 pr-4 text-xs font-bold"
                  />
                </div>

                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 h-3.5 w-3.5 text-app-soft" />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    rows={2}
                    className="app-control min-h-24 w-full resize-none py-3 pl-10 pr-4 text-xs font-bold"
                  />
                </div>
              </div>

              <button className="app-button-primary w-full py-3.5 text-[11px] font-black uppercase tracking-widest">
                LƯU PHIẾU
              </button>
            </form>
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[color:var(--brand-surface)]/60 blur-2xl" />
          </div>
        </div>

        {/* Independent Scroll List with Sorting & Pagination */}
        <div className="flex h-[calc(100dvh-12rem)] min-h-[560px] flex-col space-y-3 lg:h-[750px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-app-strong">Lịch sử giao dịch</h3>
            
            <div className="flex items-center gap-2">
              {/* Search Mini */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-app-soft" />
                <input 
                  type="text" 
                  placeholder="Tìm nhanh..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="app-control min-h-10 w-36 rounded-full py-1.5 pl-8 pr-3 text-[10px] font-bold md:w-48"
                />
              </div>

              {/* Sort Toggle */}
              <button 
                onClick={() => setSortConfig(prev => ({ key: prev.key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                className="app-button-secondary flex h-10 min-h-10 w-10 items-center justify-center self-center rounded-full p-0 text-app-soft hover:text-blue-600"
                title="Đổi chiều sắp xếp"
              >
                <TrendingUp className={`h-3.5 w-3.5 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
              </button>

              <select 
                value={sortConfig.key}
                onChange={e => setSortConfig({ key: e.target.value as 'date' | 'amount', direction: sortConfig.direction })}
                className="app-control min-h-10 cursor-pointer rounded-full px-3 py-1.5 text-[9px] font-black uppercase text-app-muted"
              >
                <option value="date">Ngày</option>
                <option value="amount">Số tiền</option>
              </select>
            </div>
          </div>

          <div className="app-panel-strong flex flex-1 flex-col overflow-hidden">
            <div className="overflow-y-auto flex-1 no-scrollbar p-2 space-y-2">
              {fetching ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-[color:var(--surface-3)] animate-pulse" />
                ))
              ) : paginatedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <FileText className="mb-3 h-12 w-12 text-app-soft" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-app-soft">Không tìm thấy</p>
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="app-list-item group flex min-h-20 items-center justify-between p-4 active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === "IN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600 shadow-sm shadow-rose-500/5"}`}>
                        {item.type === "IN" ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px] md:max-w-none">
                          {item.category}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {new Date(item.date).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-sm font-black tracking-tighter ${item.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                        {item.type === "IN" ? "+" : "-"}{formatCurrency(item.amount)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 truncate max-w-[100px] ml-auto">
                        {item.note || item.refOrderId || "..."}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            <StatePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
