"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { useAuthStore } from "@/store/useAuthStore";
import { Ban, Download, Filter, Loader2, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface OrderRow {
  id: number;
  code: string;
  createdAt: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentReference?: string | null;
  status: string;
  cashierName: string;
  customerId?: number | null;
  customerName: string;
}

interface CustomerOption {
  id: number;
  fullName: string;
  phone: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const isManager = user?.role === "Admin";
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [status, setStatus] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<OrderRow | null>(null);
  const [editPaid, setEditPaid] = useState("");
  const [editConfirmed, setEditConfirmed] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<OrderRow[]>("/orders", {
        params: {
          take: 500,
          from,
          to,
          status: status || undefined,
          customerId: customerId || undefined,
        },
      });
      setOrders(res.data);
    } finally {
      setLoading(false);
    }
  }, [from, to, status, customerId]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    void api.get<CustomerOption[]>("/customers").then((response) => setCustomers(response.data)).catch(() => setCustomers([]));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const totals = useMemo(() => {
    const completed = orders.filter((order) => order.status === "Completed");
    return {
      count: orders.length,
      revenue: completed.reduce((sum, order) => sum + order.totalAmount - order.discount, 0),
      discount: completed.reduce((sum, order) => sum + order.discount, 0),
      cancelled: orders.filter((order) => order.status === "Cancelled").length,
    };
  }, [orders]);

  const downloadCsv = async () => {
    const params = new URLSearchParams({
      from,
      to,
    });
    if (status) params.set("status", status);
    if (customerId) params.set("customerId", customerId);

    setExporting(true);
    try {
      const response = await api.get<Blob>(`/orders/export.csv?${params.toString()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lich-su-don-hang-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không xuất được CSV đơn hàng"));
    } finally {
      setExporting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await api.post(`/orders/${cancelTarget.id}/cancel`, {
        managerEmail,
        managerPassword,
        reason: cancelReason || undefined,
      });
      setCancelTarget(null);
      setManagerEmail("");
      setManagerPassword("");
      setCancelReason("");
      toast.success("Đã hủy đơn hàng thành công!");
      await fetchOrders();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Không hủy được đơn hàng"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!editTarget || !editConfirmed) return;
    const paid = Number(editPaid);
    const due = editTarget.totalAmount - editTarget.discount;
    if (paid < due) {
      toast.error("Số tiền không đủ");
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/orders/${editTarget.id}/payment`, {
        paidAmount: paid,
        cashAmountConfirmed: true,
      });
      setEditTarget(null);
      setEditPaid("");
      setEditConfirmed(false);
      toast.success("Cập nhật tiền khách đưa thành công!");
      await fetchOrders();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Không cập nhật được"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="app-kicker mb-2">Quản lý bán hàng</p>
          <h1 className="app-title text-2xl font-black">Lịch sử đơn hàng</h1>
          <p className="mt-1 text-sm text-app-muted">
            Lọc theo ngày, khách hàng, trạng thái và xuất CSV cho kế toán hoặc đối soát ca.
          </p>
        </div>
        <div className="app-panel grid gap-2 p-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[150px_150px_180px_150px_auto]">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold" />
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold">
            <option value="">Tất cả khách</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.fullName}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold">
            <option value="">Tất cả trạng thái</option>
            <option value="Completed">Hoàn tất</option>
            <option value="Pending">Chờ thanh toán</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
          <button onClick={() => void downloadCsv()} disabled={exporting} className="app-button-primary flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold">
            <Download className="h-4 w-4" />
            {exporting ? "Đang xuất" : "CSV"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="app-kpi-card p-4"><p className="text-xs font-bold text-app-muted">Số đơn</p><p className="mt-2 text-2xl font-black text-app-strong">{totals.count}</p></div>
        <div className="app-kpi-card p-4"><p className="text-xs font-bold text-app-muted">Doanh thu hoàn tất</p><p className="mt-2 text-xl font-black text-emerald-600">{fmt(totals.revenue)}</p></div>
        <div className="app-kpi-card p-4"><p className="text-xs font-bold text-app-muted">Giảm giá</p><p className="mt-2 text-xl font-black text-blue-600">{fmt(totals.discount)}</p></div>
        <div className="app-kpi-card p-4"><p className="text-xs font-bold text-app-muted">Đơn hủy</p><p className="mt-2 text-2xl font-black text-rose-600">{totals.cancelled}</p></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {orders.length === 0 && (
            <div className="app-panel-strong flex flex-col items-center gap-3 py-16 text-center">
              <Filter className="h-8 w-8 text-app-soft" />
              <p className="text-sm font-bold text-app-muted">Không có đơn hàng phù hợp bộ lọc.</p>
            </div>
          )}
          {orders.map((o) => {
            const due = o.totalAmount - o.discount;
            const change = Math.max(0, o.paidAmount - due);
            return (
              <div key={o.id} className="app-panel border border-app p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/receipt/${o.id}`} className="text-sm font-black text-blue-600 hover:underline">
                      {o.code}
                    </Link>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-app-soft">
                      {new Date(o.createdAt).toLocaleString("vi-VN")} · {o.cashierName}
                    </p>
                    <p className="mt-1 text-xs font-bold text-app-muted">
                      {o.customerName || "Khách vãng lai"}
                      {" · "}
                      {o.paymentMethod}
                      {o.paymentReference ? ` · ${o.paymentReference}` : ""}
                      {" · "}
                      <span className={o.status === "Cancelled" ? "text-rose-600" : "text-emerald-600"}>{o.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-app-strong">{fmt(due)}</p>
                    <p className="text-[10px] text-app-muted">Khách đưa {fmt(o.paidAmount)} · Thối {fmt(change)}</p>
                  </div>
                </div>
                {o.status === "Completed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(o);
                        setManagerEmail("");
                        setManagerPassword("");
                        setCancelReason("");
                      }}
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-rose-700"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Hủy đơn
                    </button>
                    {isManager && o.paymentMethod === "Cash" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget(o);
                          setEditPaid(String(o.paidAmount));
                          setEditConfirmed(false);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-blue-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa tiền mặt
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="app-panel-strong w-full max-w-md rounded-[2rem] p-6">
            <h2 className="text-lg font-black text-app-strong">Hủy đơn {cancelTarget.code}</h2>
            <p className="mt-2 text-xs font-bold text-app-muted">Yêu cầu xác thực quản lý (2 bước)</p>
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="Email quản lý"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="app-control w-full"
              />
              <input
                type="password"
                placeholder="Mật khẩu quản lý"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                className="app-control w-full"
              />
              <input
                type="text"
                placeholder="Lý do hủy (tuỳ chọn)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="app-control w-full"
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setCancelTarget(null)} className="app-button-secondary text-xs font-black uppercase">
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={submitting || !managerEmail || !managerPassword}
                className="app-button-primary text-xs font-black uppercase"
              >
                {submitting ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="app-panel-strong w-full max-w-md rounded-[2rem] p-6">
            <h2 className="text-lg font-black text-app-strong">Sửa tiền khách đưa</h2>
            <p className="mt-1 text-xs text-app-muted">{editTarget.code} — thao tác được ghi audit log</p>
            <input
              type="number"
              value={editPaid}
              onChange={(e) => setEditPaid(e.target.value)}
              className="app-control mt-4 w-full text-lg font-black"
            />
            <label className="mt-4 flex items-start gap-2 text-xs font-bold">
              <input type="checkbox" checked={editConfirmed} onChange={(e) => setEditConfirmed(e.target.checked)} className="mt-1" />
              Tôi xác nhận số tiền mới đã được kiểm tra với khách
            </label>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setEditTarget(null)} className="app-button-secondary text-xs font-black uppercase">
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleUpdatePayment}
                disabled={submitting || !editConfirmed}
                className="app-button-primary flex items-center justify-center gap-2 text-xs font-black uppercase"
              >
                <ShieldCheck className="h-4 w-4" />
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

