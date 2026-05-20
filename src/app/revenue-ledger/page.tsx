"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import * as XLSX from "xlsx";

interface RevenueLedgerEntry {
  date: string;
  month: number;
  description: string;
  amount: number;
  paymentChannel: string;
  orderCode: string;
  paymentReference?: string;
}

interface RevenueLedgerDailySummary {
  date: string;
  month: number;
  cashAmount: number;
  transferAmount: number;
  cardAmount: number;
  totalAmount: number;
  orderCount: number;
}

interface RevenueLedgerYearSummary {
  year: number;
  totalRevenue: number;
  cashTotal: number;
  transferTotal: number;
  cardTotal: number;
  thresholdVnd: number;
  remainingBeforeThreshold: number;
  isUnderThreshold: boolean;
  utilizationPercent: number;
}

interface RevenueLedgerPeriodTotals {
  cashTotal: number;
  transferTotal: number;
  cardTotal: number;
  grandTotal: number;
  orderCount: number;
}

interface UntrackedInflow {
  date: string;
  category: string;
  amount: number;
  note?: string;
  reason: string;
}

interface RevenueLedger {
  from: string;
  to: string;
  summaryYear: number;
  periodTotals: RevenueLedgerPeriodTotals;
  yearSummary: RevenueLedgerYearSummary;
  dailySummaries: RevenueLedgerDailySummary[];
  entries: RevenueLedgerEntry[];
  untrackedInflows: UntrackedInflow[];
}

interface TaxNotification {
  year: number;
  totalRevenue: number;
  cashTotal: number;
  transferTotal: number;
  cardTotal: number;
  thresholdVnd: number;
  remainingVnd: number;
  isUnderOneBillion: boolean;
  legalNote: string;
  untrackedInflowCount: number;
  untrackedInflowTotal: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN");
};

export default function RevenueLedgerPage() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [ledger, setLedger] = useState<RevenueLedger | null>(null);
  const [taxNotice, setTaxNotice] = useState<TaxNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [ledgerRes, taxRes] = await Promise.all([
        api.get<RevenueLedger>("/reports/revenue-ledger", {
          params: { from, to, year: summaryYear },
        }),
        api.get<TaxNotification>("/reports/tax-notification", {
          params: { year: summaryYear },
        }),
      ]);
      setLedger(ledgerRes.data);
      setTaxNotice(taxRes.data);
    } catch (fetchError) {
      console.error("Lỗi tải sổ doanh thu:", fetchError);
      setError("Không tải được sổ doanh thu. Kiểm tra quyền Quản lý và backend.");
    } finally {
      setLoading(false);
    }
  }, [from, to, summaryYear]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
    const intervalId = window.setInterval(() => void fetchData(), 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (["dashboardChanged", "cashFlowChanged", "catalogChanged"].includes(detail?.type)) {
        void fetchData();
      }
    };
    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, [fetchData]);

  const yearSummary = ledger?.yearSummary;
  const utilization = yearSummary?.utilizationPercent ?? 0;

  const periodCards = useMemo(
    () => [
      ["Tiền mặt", ledger?.periodTotals.cashTotal ?? 0, "text-emerald-600"],
      ["Chuyển khoản", ledger?.periodTotals.transferTotal ?? 0, "text-blue-600"],
      ["Thẻ", ledger?.periodTotals.cardTotal ?? 0, "text-violet-600"],
      ["Tổng kỳ", ledger?.periodTotals.grandTotal ?? 0, "text-amber-600"],
    ] as const,
    [ledger],
  );

  const downloadCsv = async () => {
    const params = new URLSearchParams({ from, to, year: String(summaryYear) });
    setExporting(true);
    try {
      const response = await api.get<Blob>(`/reports/revenue-ledger.csv?${params}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `so-doanh-thu-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error(exportError);
      setError("Không xuất được CSV sổ doanh thu.");
    } finally {
      setExporting(false);
    }
  };

  const downloadExcel = () => {
    if (!ledger || !taxNotice) return;

    const workbook = XLSX.utils.book_new();

    const ledgerRows = ledger.entries.map((row) => ({
      "Cột A - Ngày": formatDate(row.date),
      "Cột A - Tháng": row.month,
      "Cột B - Diễn giải": row.description,
      "Số tiền (VNĐ)": row.amount,
      "Hình thức": row.paymentChannel,
      "Mã đơn": row.orderCode,
      "Mã tham chiếu": row.paymentReference ?? "",
    }));

    const dailyRows = ledger.dailySummaries.map((d) => ({
      Ngày: formatDate(d.date),
      Tháng: d.month,
      "Tiền mặt": d.cashAmount,
      "Chuyển khoản": d.transferAmount,
      Thẻ: d.cardAmount,
      "Tổng ngày": d.totalAmount,
      "Số đơn": d.orderCount,
    }));

    const ys = ledger.yearSummary;
    const noticeRows = [
      { Nội_dung: "Năm", Giá_trị: taxNotice.year },
      { Nội_dung: "Doanh thu năm (từ đơn POS hoàn tất)", Giá_trị: taxNotice.totalRevenue },
      { Nội_dung: "Tiền mặt", Giá_trị: taxNotice.cashTotal },
      { Nội_dung: "Chuyển khoản", Giá_trị: taxNotice.transferTotal },
      { Nội_dung: "Thẻ", Giá_trị: taxNotice.cardTotal },
      { Nội_dung: "Ngưỡng 1 tỷ/năm", Giá_trị: ys.thresholdVnd },
      { Nội_dung: "Còn lại trước ngưỡng", Giá_trị: ys.remainingBeforeThreshold },
      { Nội_dung: "Dưới 1 tỷ", Giá_trị: taxNotice.isUnderOneBillion ? "Có" : "Không" },
      { Nội_dung: "Thu không dấu vết (số dòng)", Giá_trị: taxNotice.untrackedInflowCount },
      { Nội_dung: "Thu không dấu vết (tổng tiền)", Giá_trị: taxNotice.untrackedInflowTotal },
      { Nội_dung: "Ghi chú pháp lý", Giá_trị: taxNotice.legalNote },
      {
        Nội_dung: "Hướng dẫn",
        Giá_trị:
          "Hộ KD nhỏ lẻ: ghi sổ doanh thu theo ngày; thông báo doanh thu thực tế phát sinh trong năm với cơ quan thuế. Mọi bán hàng nên qua POS.",
      },
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ledgerRows), "SoDoanhThu");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dailyRows), "TongTheoNgay");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(noticeRows), "ThongBaoDoanhThu");
    XLSX.writeFile(workbook, `so-doanh-thu-hkd-${summaryYear}-${from}-${to}.xlsx`);
  };

  return (
    <div className="space-y-5 pb-20 md:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-kicker mb-2">Sổ sách HKD · Hộ KD &lt; 1 tỷ/năm</p>
          <h1 className="app-title text-3xl font-black tracking-tight">Sổ doanh thu</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">
            Ghi theo quy định: cột A ngày/tháng, cột B diễn giải, số tiền; tách tiền mặt và chuyển khoản từ đơn POS.
          </p>
          <Link href="/reports" className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline">
            ← Báo cáo P&amp;L
          </Link>
        </div>
        <div className="app-panel grid w-full grid-cols-2 gap-2 p-3 lg:w-auto lg:grid-cols-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="app-control px-3 py-2 text-sm font-semibold" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="app-control px-3 py-2 text-sm font-semibold" />
          <input
            type="number"
            min={2020}
            max={2100}
            value={summaryYear}
            onChange={(e) => setSummaryYear(Number(e.target.value))}
            className="app-control px-3 py-2 text-sm font-semibold"
            title="Năm tổng hợp thông báo thuế"
          />
          <button type="button" onClick={() => void fetchData()} className="app-button-secondary px-4 py-2 text-sm font-semibold">
            Làm mới
          </button>
          <button type="button" onClick={() => void downloadCsv()} disabled={exporting} className="app-button-primary px-4 py-2 text-sm font-semibold">
            {exporting ? "Đang xuất..." : "CSV"}
          </button>
          <button type="button" onClick={downloadExcel} disabled={!ledger} className="app-button-secondary border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Excel (3 sheet)
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <div className="app-panel rounded-2xl p-4 text-sm font-semibold text-app-muted">Đang tải sổ doanh thu...</div>}

      {taxNotice && (
        <div className={`app-panel-strong p-4 md:p-5 ${taxNotice.isUnderOneBillion ? "border-emerald-200" : "border-amber-300"}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="app-kicker mb-1">Thông báo doanh thu năm {taxNotice.year}</p>
              <p className="text-lg font-black text-app-strong">{formatCurrency(taxNotice.totalRevenue)}</p>
              <p className="mt-2 text-sm font-semibold text-app-muted">{taxNotice.legalNote}</p>
            </div>
            <div className="text-right text-sm font-semibold text-app-muted">
              <p>Còn trước ngưỡng 1 tỷ: {formatCurrency(taxNotice.remainingVnd)}</p>
              <p className="mt-1">TM {formatCurrency(taxNotice.cashTotal)} · CK {formatCurrency(taxNotice.transferTotal)} · Thẻ {formatCurrency(taxNotice.cardTotal)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-bold text-app-muted">
              <span>Mức sử dụng ngưỡng 1 tỷ/năm</span>
              <span>{utilization.toFixed(1)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${utilization >= 90 ? "bg-red-500" : utilization >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4">
        {periodCards.map(([label, value, color]) => (
          <div key={label} className="app-kpi-card p-4">
            <p className="text-sm font-semibold text-app-muted">{label} (kỳ)</p>
            <p className={`mt-2 text-lg font-bold md:text-xl ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      {(ledger?.untrackedInflows.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-black text-amber-900">Cảnh báo: thu không dấu vết ({ledger?.untrackedInflows.length} dòng)</p>
          <p className="mt-1 text-sm font-semibold text-amber-800">
            Hạn chế nhận tiền không qua POS. Tổng: {formatCurrency(ledger?.untrackedInflows.reduce((s, u) => s + u.amount, 0) ?? 0)}
          </p>
          <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
            {ledger?.untrackedInflows.map((u, i) => (
              <li key={`${u.date}-${i}`} className="rounded-lg bg-white/80 px-3 py-2">
                <span className="font-semibold">{formatDate(u.date)}</span> — {u.category}: {formatCurrency(u.amount)}
                <span className="block text-xs text-amber-700">{u.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="app-panel-strong p-4 md:p-6">
        <p className="app-kicker mb-2">Theo dõi hàng ngày</p>
        <h2 className="mb-4 text-xl font-black text-app-strong">Tổng doanh thu theo ngày</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-[color:var(--surface-3)] uppercase text-app-muted">
            <tr>
              <th className="px-3 py-2">Ngày (A)</th>
              <th className="px-3 py-2">Tháng</th>
              <th className="px-3 py-2">Tiền mặt</th>
              <th className="px-3 py-2">Chuyển khoản</th>
              <th className="px-3 py-2">Thẻ</th>
              <th className="px-3 py-2">Tổng</th>
              <th className="px-3 py-2">Đơn</th>
            </tr>
          </thead>
          <tbody>
            {ledger?.dailySummaries.map((d) => (
              <tr key={d.date} className="border-t border-app">
                <td className="px-3 py-2 font-medium">{formatDate(d.date)}</td>
                <td className="px-3 py-2">{d.month}</td>
                <td className="px-3 py-2">{formatCurrency(d.cashAmount)}</td>
                <td className="px-3 py-2">{formatCurrency(d.transferAmount)}</td>
                <td className="px-3 py-2">{formatCurrency(d.cardAmount)}</td>
                <td className="px-3 py-2 font-bold">{formatCurrency(d.totalAmount)}</td>
                <td className="px-3 py-2">{d.orderCount}</td>
              </tr>
            ))}
            {(ledger?.dailySummaries.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-app-muted">
                  Chưa có đơn hoàn tất trong kỳ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="app-panel-strong p-4 md:p-6">
        <p className="app-kicker mb-2">Sổ chi tiết nghiệp vụ</p>
        <h2 className="mb-4 text-xl font-black text-app-strong">Cột A · B · Số tiền</h2>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-[color:var(--surface-3)] uppercase text-app-muted">
              <tr>
                <th className="px-3 py-2">Ngày (A)</th>
                <th className="px-3 py-2">Tháng</th>
                <th className="px-3 py-2">Diễn giải (B)</th>
                <th className="px-3 py-2">Số tiền</th>
                <th className="px-3 py-2">Hình thức</th>
                <th className="px-3 py-2">Mã đơn</th>
              </tr>
            </thead>
            <tbody>
              {ledger?.entries.map((row) => (
                <tr key={`${row.orderCode}-${row.date}`} className="border-t border-app">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-3 py-2">{row.month}</td>
                  <td className="px-3 py-2 text-app-base">{row.description}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(row.amount)}</td>
                  <td className="px-3 py-2">{row.paymentChannel}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.orderCode}</td>
                </tr>
              ))}
              {(ledger?.entries.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-app-muted">
                    Chưa có bút toán doanh thu trong kỳ — bán hàng qua POS để tự ghi sổ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs font-semibold text-app-muted">
          {ledger?.periodTotals.orderCount ?? 0} đơn hoàn tất · Kỳ {ledger ? `${formatDate(ledger.from)} – ${formatDate(ledger.to)}` : "—"}
        </p>
      </div>
    </div>
  );
}