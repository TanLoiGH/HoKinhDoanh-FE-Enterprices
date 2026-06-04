"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { Calculator, Loader2, PlayCircle, StopCircle } from "lucide-react";
import toast from "react-hot-toast";

interface ShiftSummary {
  sessionId?: number;
  isOpen: boolean;
  openedAt?: string;
  openingFloat: number;
  cashSalesTotal: number;
  cashOrderCount: number;
  transferSalesTotal: number;
  transferOrderCount: number;
  cardSalesTotal: number;
  cardOrderCount: number;
  discountTotal: number;
  netSalesTotal: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  cancelledOrderTotal: number;
  expectedInDrawer: number;
  countedCash?: number;
  variance?: number;
  openedByName: string;
}

export default function ShiftPage() {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingFloat, setOpeningFloat] = useState("0");
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastClose, setLastClose] = useState<ShiftSummary | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ShiftSummary>("/shifts/active");
      setSummary(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openShift = async () => {
    setSubmitting(true);
    try {
      await api.post("/shifts/open", { openingFloat: Number(openingFloat || 0) });
      toast.success("Mở ca làm việc thành công!");
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Không mở được ca"));
    } finally {
      setSubmitting(false);
    }
  };

  const closeShift = async () => {
    const counted = Number(countedCash);
    if (Number.isNaN(counted)) {
      toast.error("Nhập số tiền mặt thực tế trong két");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<ShiftSummary>("/shifts/close", {
        countedCash: counted,
        notes: closeNotes || undefined,
      });
      setLastClose(res.data);
      setCountedCash("");
      setCloseNotes("");
      toast.success("Chốt ca và đối chiếu thành công!");
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Không chốt được ca"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="app-kicker mb-2">Kiểm kê cuối ca</p>
        <h1 className="app-title text-2xl font-black">Đối chiếu tiền mặt</h1>
        <p className="mt-1 text-sm text-app-muted">
          Đếm tiền thực tế trong két và so với báo cáo bán hàng tiền mặt từ phần mềm.
        </p>
      </div>

      {!summary.isOpen ? (
        <div className="app-panel space-y-4 p-6">
          <div className="flex items-center gap-3">
            <PlayCircle className="h-8 w-8 text-emerald-600" />
            <div>
              <h2 className="font-black text-app-strong">Mở ca làm việc</h2>
              <p className="text-xs text-app-muted">Nhập tiền mặt đầu ca trong két (float)</p>
            </div>
          </div>
          <input
            type="number"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(e.target.value)}
            className="app-control w-full text-lg font-black"
            placeholder="Tiền đầu ca"
          />
          <button
            type="button"
            onClick={openShift}
            disabled={submitting}
            className="app-button-primary w-full py-4 text-xs font-black uppercase tracking-widest"
          >
            Mở ca
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="app-panel p-6">
            <div className="mb-4 flex items-center gap-3">
              <Calculator className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="font-black text-app-strong">Ca đang mở</h2>
                <p className="text-xs text-app-muted">
                  Từ {summary.openedAt ? new Date(summary.openedAt).toLocaleString("vi-VN") : "—"} · {summary.openedByName}
                </p>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-app-muted">Tiền đầu ca</span>
                <strong>{fmt(summary.openingFloat)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted">Doanh thu tiền mặt ({summary.cashOrderCount} đơn)</span>
                <strong>{fmt(summary.cashSalesTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted">Chuyển khoản ({summary.transferOrderCount} đơn)</span>
                <strong>{fmt(summary.transferSalesTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted">Thẻ ({summary.cardOrderCount} đơn)</span>
                <strong>{fmt(summary.cardSalesTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted">Giảm giá trong ca</span>
                <strong>{fmt(summary.discountTotal)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-app-muted">Đơn hủy ({summary.cancelledOrderCount} đơn)</span>
                <strong>{fmt(summary.cancelledOrderTotal)}</strong>
              </div>
              <div className="flex justify-between border-t border-app pt-3">
                <span className="font-black">Tổng doanh thu ròng ({summary.completedOrderCount} đơn)</span>
                <strong>{fmt(summary.netSalesTotal)}</strong>
              </div>
              <div className="flex justify-between border-t border-app pt-3 text-base">
                <span className="font-black">Dự kiến trong két</span>
                <span className="font-black text-blue-600">{fmt(summary.expectedInDrawer)}</span>
              </div>
            </div>
          </div>

          <div className="app-panel space-y-4 p-6">
            <div className="flex items-center gap-3">
              <StopCircle className="h-8 w-8 text-rose-600" />
              <h2 className="font-black text-app-strong">Chốt ca — kiểm kê thực tế</h2>
            </div>
            <input
              type="number"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="app-control w-full text-2xl font-black"
              placeholder="Tiền mặt đếm được"
            />
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="app-control min-h-20 w-full"
              placeholder="Ghi chú chênh lệch (nếu có)"
            />
            <button
              type="button"
              onClick={closeShift}
              disabled={submitting}
              className="app-button-primary w-full py-4 text-xs font-black uppercase tracking-widest"
            >
              Chốt ca và đối chiếu
            </button>
          </div>
        </div>
      )}

      {lastClose && (
        <div
          className={`app-panel p-6 ${(lastClose.variance ?? 0) === 0 ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"}`}
        >
          <h3 className="text-sm font-black uppercase tracking-widest text-app-strong">Kết quả chốt ca</h3>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Doanh thu ròng</span>
              <strong>{fmt(lastClose.netSalesTotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Tiền mặt</span>
              <strong>{fmt(lastClose.cashSalesTotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Chuyển khoản / thẻ</span>
              <strong>{fmt(lastClose.transferSalesTotal + lastClose.cardSalesTotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Đơn hủy</span>
              <strong>{fmt(lastClose.cancelledOrderTotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Dự kiến</span>
              <strong>{fmt(lastClose.expectedInDrawer)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Đếm thực tế</span>
              <strong>{fmt(lastClose.countedCash ?? 0)}</strong>
            </div>
            <div className="flex justify-between font-black">
              <span>Chênh lệch</span>
              <span className={(lastClose.variance ?? 0) === 0 ? "text-emerald-600" : "text-amber-700"}>
                {fmt(lastClose.variance ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
