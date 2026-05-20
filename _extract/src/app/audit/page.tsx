"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, History, Search, ShieldCheck } from "lucide-react";
import api from "@/lib/axios";
import StatePagination from "@/components/ui/StatePagination";

interface AuditLogItem {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  userId: number;
  userName: string;
  userEmail: string;
  createdAt: string;
}

interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

const tableOptions = ["", "Product", "Order", "CashFlow", "User"];
const actionOptions = ["", "CREATE", "UPDATE", "DELETE", "DEACTIVATE", "IMPORT"];

export default function AuditPage() {
  const [data, setData] = useState<AuditLogPage>({ items: [], total: 0, page: 1, pageSize: 10 });
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [tableName, setTableName] = useState("");
  const [action, setAction] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo(
    () => ({
      from,
      to,
      tableName: tableName || undefined,
      action: action || undefined,
      keyword: keyword.trim() || undefined,
      page,
      pageSize: 10,
    }),
    [action, from, keyword, page, tableName, to],
  );

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<AuditLogPage>("/auditlogs", { params });
      setData(response.data);
    } catch (auditError) {
      console.error("Lỗi tải audit log:", auditError);
      setError("Không tải được audit log. Vui lòng kiểm tra quyền Admin và backend.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void Promise.resolve().then(fetchAuditLogs);
  }, [fetchAuditLogs]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const resetToFirstPage = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const exportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await api.get<Blob>("/auditlogs/export.csv", {
        params: { ...params, page: undefined, pageSize: undefined },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Lỗi xuất audit log:", exportError);
      setError("Không xuất được audit log CSV.");
    } finally {
      setExporting(false);
    }
  };

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));

  const actionClass = (value: string) => {
    if (value === "DELETE" || value === "DEACTIVATE") return "bg-red-100 text-red-700";
    if (value === "UPDATE") return "bg-blue-100 text-blue-700";
    if (value === "IMPORT") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  return (
    <div className="space-y-5 pb-20 md:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-600">
            <ShieldCheck className="h-4 w-4" />
            Admin
          </div>
          <h1 className="app-title text-3xl font-black tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">Theo dõi thao tác nhạy cảm để phục vụ kiểm tra và truy vết dữ liệu.</p>
        </div>
        <button
          onClick={() => void exportCsv()}
          disabled={exporting || data.total === 0}
          className="app-button-primary flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Đang xuất..." : "Xuất CSV"}
        </button>
      </div>

      <div className="app-panel-strong grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-6">
        <input type="date" value={from} onChange={(event) => resetToFirstPage(setFrom, event.target.value)} className="app-control px-4 text-sm font-bold" />
        <input type="date" value={to} onChange={(event) => resetToFirstPage(setTo, event.target.value)} className="app-control px-4 text-sm font-bold" />
        <select value={tableName} onChange={(event) => resetToFirstPage(setTableName, event.target.value)} className="app-control px-4 text-sm font-bold">
          {tableOptions.map((option) => (
            <option key={option || "all"} value={option}>{option || "Tất cả bảng"}</option>
          ))}
        </select>
        <select value={action} onChange={(event) => resetToFirstPage(setAction, event.target.value)} className="app-control px-4 text-sm font-bold">
          {actionOptions.map((option) => (
            <option key={option || "all"} value={option}>{option || "Tất cả hành động"}</option>
          ))}
        </select>
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-soft" />
          <input
            value={keyword}
            onChange={(event) => resetToFirstPage(setKeyword, event.target.value)}
            placeholder="Tìm mã, bảng, người thao tác..."
            className="app-control w-full py-3 pl-11 pr-4 text-sm font-bold"
          />
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-[color:var(--surface-3)]" />)
        ) : data.items.length === 0 ? (
          <div className="app-panel p-10 text-center text-sm font-bold uppercase tracking-widest text-app-soft">Chưa có audit log</div>
        ) : (
          data.items.map((item) => (
            <div key={item.id} className="app-list-item border border-app p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-app-soft">{formatTime(item.createdAt)}</p>
                  <p className="mt-1 text-base font-black text-app-strong">{item.tableName} #{item.recordId}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-app-muted">{item.userName} · {item.userEmail}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${actionClass(item.action)}`}>{item.action}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {item.oldValue && <p className="line-clamp-2 rounded-2xl bg-[color:var(--surface-3)] p-3 text-app-muted">Cũ: {item.oldValue}</p>}
                {item.newValue && <p className="line-clamp-2 rounded-2xl bg-blue-50 p-3 text-blue-700">Mới: {item.newValue}</p>}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="app-panel-strong hidden overflow-hidden md:block">
        <div className="flex items-center justify-between border-b border-app bg-[color:var(--surface-2)]/80 p-4">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-app-muted">
            <History className="h-4 w-4" />
            {data.total} bản ghi
          </div>
          <span className="text-xs font-bold text-app-soft">Trang {data.page}/{totalPages}</span>
        </div>
        <div className="max-h-[620px] overflow-auto touch-scroll">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-3 text-xs uppercase tracking-widest">Thời gian</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest">Bảng</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest">Hành động</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest">Người thao tác</th>
                <th className="px-4 py-3 text-xs uppercase tracking-widest">Giá trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center font-bold text-app-soft">Đang tải audit log...</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center font-bold text-app-soft">Chưa có audit log</td></tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[color:var(--surface-2)]">
                    <td className="px-4 py-4 font-bold text-app-muted">{formatTime(item.createdAt)}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-app-strong">{item.tableName}</p>
                      <p className="text-xs font-bold text-app-soft">#{item.recordId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${actionClass(item.action)}`}>{item.action}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-app-strong">{item.userName}</p>
                      <p className="text-xs text-app-soft">{item.userEmail}</p>
                    </td>
                    <td className="max-w-xl px-4 py-4">
                      <p className="line-clamp-1 text-app-soft">{item.oldValue ? `Cũ: ${item.oldValue}` : ""}</p>
                      <p className="line-clamp-1 font-semibold text-app-base">{item.newValue ? `Mới: ${item.newValue}` : ""}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StatePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
