"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import * as XLSX from "xlsx";

interface PnlReport {
  from: string;
  to: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpense: number;
  netProfit: number;
}

interface Forecast {
  productId: number;
  productName: string;
  currentStock: number;
  averageDailyDemand: number;
  suggestedImportQty: number;
  riskLevel: string;
}

interface EInvoiceDemoStatus {
  mode: string;
  provider: string;
  isRealIntegrationEnabled: boolean;
  message: string;
  nextSteps: string[];
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

export default function ReportsPage() {
  const [report, setReport] = useState<PnlReport | null>(null);
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [eInvoiceStatus, setEInvoiceStatus] = useState<EInvoiceDemoStatus | null>(null);

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [pnlResponse, forecastResponse, invoiceStatusResponse] = await Promise.all([
        api.get<PnlReport>("/reports/pnl", { params: { from, to } }),
        api.get<Forecast[]>("/analytics/forecast"),
        api.get<EInvoiceDemoStatus>("/einvoices/demo-status"),
      ]);
      setReport(pnlResponse.data);
      setForecast(forecastResponse.data);
      setEInvoiceStatus(invoiceStatusResponse.data);
    } catch (fetchError) {
      console.error("Lỗi tải báo cáo:", fetchError);
      setError("Không tải được báo cáo. API đã trả lỗi, vui lòng kiểm tra backend/database.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
    const intervalId = window.setInterval(() => {
      void fetchData();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (["dashboardChanged", "inventoryChanged", "cashFlowChanged", "catalogChanged"].includes(detail?.type)) {
        void fetchData();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, [fetchData]);

  const reportCards = useMemo(
    () => [
      ["Doanh thu", report?.revenue || 0, "text-green-600"],
      ["Giá vốn", report?.cogs || 0, "text-gray-900"],
      ["Lợi nhuận gộp", report?.grossProfit || 0, "text-blue-600"],
      ["Chi phí vận hành", report?.operatingExpense || 0, "text-red-600"],
      ["Lợi nhuận ròng", report?.netProfit || 0, "text-purple-600"],
    ] as const,
    [report],
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  const downloadTaxCsv = async () => {
    const params = new URLSearchParams({ from, to });
    setExporting(true);
    try {
      const response = await api.get<Blob>(`/reports/tax-export.csv?${params.toString()}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `so-thu-chi-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (exportError) {
      console.error("Lỗi xuất CSV thuế:", exportError);
      setError("Không xuất được CSV thuế. Vui lòng kiểm tra quyền đăng nhập và backend.");
    } finally {
      setExporting(false);
    }
  };

  const downloadExcel = () => {
    if (!report) return;

    const workbook = XLSX.utils.book_new();
    const summaryRows = [
      { ChiSo: "Từ ngày", GiaTri: report.from },
      { ChiSo: "Đến ngày", GiaTri: report.to },
      { ChiSo: "Doanh thu", GiaTri: report.revenue },
      { ChiSo: "Giá vốn", GiaTri: report.cogs },
      { ChiSo: "Lợi nhuận gộp", GiaTri: report.grossProfit },
      { ChiSo: "Chi phí vận hành", GiaTri: report.operatingExpense },
      { ChiSo: "Lợi nhuận ròng", GiaTri: report.netProfit },
    ];
    const forecastRows = forecast.map((item) => ({
      SanPham: item.productName,
      TonHienTai: item.currentStock,
      BanTrungBinhNgay: item.averageDailyDemand,
      GoiYNhap: item.suggestedImportQty,
      RuiRo: item.riskLevel,
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "TongHop");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(forecastRows), "Forecast");
    XLSX.writeFile(workbook, `bao-cao-hkd-${from}-${to}.xlsx`);
  };

  const printPdfView = () => {
    if (!report) return;

    const rows = forecast.map((item) => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.currentStock}</td>
        <td>${item.averageDailyDemand}</td>
        <td>${item.suggestedImportQty}</td>
        <td>${item.riskLevel}</td>
      </tr>
    `).join("");

    const html = `
      <!doctype html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Bao cao HKD ${from} ${to}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
          h1 { margin: 0 0 6px; font-size: 26px; }
          p { margin: 0 0 20px; color: #475569; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-bottom: 24px; }
          .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
          .value { font-size: 18px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #f8fafc; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>Báo cáo HKD Enterprise</h1>
        <p>Khoảng thời gian: ${from} đến ${to}</p>
        <div class="grid">
          <div class="card"><div class="label">Doanh thu</div><div class="value">${formatCurrency(report.revenue)}</div></div>
          <div class="card"><div class="label">Giá vốn</div><div class="value">${formatCurrency(report.cogs)}</div></div>
          <div class="card"><div class="label">Lợi nhuận gộp</div><div class="value">${formatCurrency(report.grossProfit)}</div></div>
          <div class="card"><div class="label">Lợi nhuận ròng</div><div class="value">${formatCurrency(report.netProfit)}</div></div>
        </div>
        <h2>Dự báo nhập hàng</h2>
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Tồn</th>
              <th>TB/ngày</th>
              <th>Gợi ý nhập</th>
              <th>Rủi ro</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5 pb-20 md:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="app-kicker mb-2">Phân tích tài chính</p>
          <h1 className="app-title text-3xl font-black tracking-tight">Báo cáo</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">
            P&amp;L, xuất dữ liệu thuế và gợi ý nhập hàng.{" "}
            <a href="/revenue-ledger" className="text-blue-600 hover:underline">Sổ doanh thu HKD →</a>
          </p>
        </div>
        <div className="app-panel grid w-full grid-cols-2 gap-2 p-3 lg:w-auto lg:flex lg:flex-wrap lg:items-center">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold" />
          <button onClick={() => void fetchData()} className="app-button-secondary px-4 py-2 text-sm font-semibold">Làm mới</button>
          <button onClick={() => void downloadTaxCsv()} disabled={exporting} className="app-button-primary px-4 py-2 text-sm font-semibold">
            {exporting ? "Đang xuất..." : "Xuất CSV thuế"}
          </button>
          <button onClick={downloadExcel} disabled={!report} className="app-button-secondary border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Xuất Excel
          </button>
          <button onClick={printPdfView} disabled={!report} className="app-button-primary px-4 py-2 text-sm font-semibold">
            In / PDF
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <div className="app-panel rounded-2xl p-4 text-sm font-semibold text-app-muted">Đang tải báo cáo...</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {reportCards.map(([label, value, color]) => (
          <div key={label} className="app-kpi-card p-4">
            <p className="text-sm font-semibold text-app-muted">{label}</p>
            <p className={`mt-2 break-words text-lg font-bold md:text-xl ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>

      <div className="app-panel-strong p-4 md:p-6">
        <p className="app-kicker mb-2">Phân tích tồn kho</p>
        <h2 className="mb-4 text-xl font-black text-app-strong">AI Analytics: Gợi ý nhập hàng 14 ngày tới</h2>
        <div className="space-y-3 md:hidden">
          {forecast.map((item) => (
            <div key={item.productId} className="app-panel-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-app-strong">{item.productName}</p>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${item.riskLevel === "HIGH" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {item.riskLevel === "HIGH" ? "Cao" : "Bình thường"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="app-panel-subtle rounded-xl p-3">
                  <p className="text-xs font-semibold text-app-muted">Tồn</p>
                  <p className="font-bold">{item.currentStock}</p>
                </div>
                <div className="app-panel-subtle rounded-xl p-3">
                  <p className="text-xs font-semibold text-app-muted">TB/ngày</p>
                  <p className="font-bold">{item.averageDailyDemand}</p>
                </div>
                <div className="app-panel-subtle rounded-xl p-3">
                  <p className="text-xs font-semibold text-app-muted">Gợi ý</p>
                  <p className="font-bold text-blue-600">{item.suggestedImportQty}</p>
                </div>
              </div>
            </div>
          ))}
          {forecast.length === 0 && <p className="py-10 text-center text-sm font-semibold text-app-muted">Chưa đủ dữ liệu bán hàng để dự báo.</p>}
        </div>
        <table className="hidden w-full text-left text-sm md:table">
          <thead className="bg-[color:var(--surface-3)] uppercase text-app-muted">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Tồn hiện tại</th>
              <th className="px-4 py-3">Bán TB/ngày</th>
              <th className="px-4 py-3">Gợi ý nhập</th>
              <th className="px-4 py-3">Rủi ro</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((item) => (
              <tr key={item.productId} className="border-t border-app">
                <td className="px-4 py-3 font-medium text-app-strong">{item.productName}</td>
                <td className="px-4 py-3 text-app-base">{item.currentStock}</td>
                <td className="px-4 py-3 text-app-base">{item.averageDailyDemand}</td>
                <td className="px-4 py-3 font-semibold text-app-strong">{item.suggestedImportQty}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.riskLevel === "HIGH" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {item.riskLevel === "HIGH" ? "Cao" : "Bình thường"}
                  </span>
                </td>
              </tr>
            ))}
            {forecast.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-app-muted">Chưa đủ dữ liệu bán hàng để dự báo.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="app-panel p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="app-kicker mb-1">Tích hợp ngoài hệ thống</p>
            <h2 className="text-xl font-black text-app-strong">Hóa đơn điện tử</h2>
            <p className="text-sm font-semibold text-app-muted">{eInvoiceStatus?.message || "Đang tải trạng thái hóa đơn điện tử..."}</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            {eInvoiceStatus?.mode || "DEMO_ONLY"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(eInvoiceStatus?.nextSteps || []).map((step) => (
            <div key={step} className="app-panel-subtle rounded-lg p-3 text-sm font-semibold text-app-base">
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
