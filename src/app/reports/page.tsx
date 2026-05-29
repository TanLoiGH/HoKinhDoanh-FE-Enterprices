"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";

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

    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    const dateString = `..........., ngày ${day} tháng ${month} năm ${year}`;

    const html = `
      <!doctype html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Bao cao HKD ${from} ${to}</title>
        <style>
          @page { size: A4; margin: 20mm 20mm 20mm 30mm; }
          body { font-family: "Times New Roman", Times, serif; font-size: 14pt; color: #000; line-height: 1.5; margin: 0; padding: 0; }
          .header { display: flex; justify-content: space-between; margin-bottom: 24px; text-align: center; }
          .header-left { flex: 1; }
          .header-right { flex: 1.2; }
          .header-left .org { font-weight: bold; text-transform: uppercase; font-size: 13pt; }
          .header-left .sub { font-size: 13pt; }
          .header-left .line { width: 40%; border-top: 1px solid black; margin: 5px auto; }
          .header-right .nation { font-weight: bold; text-transform: uppercase; font-size: 13pt; }
          .header-right .motto { font-weight: bold; font-size: 14pt; }
          .header-right .line { width: 50%; border-top: 1px solid black; margin: 5px auto; }
          .header-right .date { font-size: 14pt; font-style: italic; margin-top: 10px; }
          .title { text-align: center; font-weight: bold; font-size: 14pt; margin-top: 20px; text-transform: uppercase; }
          .subtitle { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20px; }
          .content { text-align: justify; }
          .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 13pt; }
          th { font-weight: bold; text-align: center; }
          .footer { display: flex; justify-content: space-between; margin-top: 30px; }
          .footer-left { flex: 1; font-size: 12pt; }
          .footer-left .title { text-align: left; font-weight: bold; font-style: italic; font-size: 12pt; margin-top: 0; text-transform: none; }
          .footer-right { flex: 1; text-align: center; }
          .footer-right .role { font-weight: bold; }
          .footer-right .sign { height: 80px; }
          .footer-right .name { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div class="org">HỘ KINH DOANH ENTERPRISE</div>
            <div class="sub">Số: 01/BC-HKD</div>
            <div class="line"></div>
          </div>
          <div class="header-right">
            <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
            <div class="line"></div>
            <div class="date">${dateString}</div>
          </div>
        </div>
        
        <div class="title">BÁO CÁO</div>
        <div class="subtitle">Về tình hình kinh doanh và dự báo nhập hàng<br/>(Từ ngày ${from} đến ngày ${to})</div>
        
        <div class="content">
          <div class="section-title">1. Tình hình tài chính</div>
          <p>Trong kỳ báo cáo từ ${from} đến ${to}, tình hình doanh thu và lợi nhuận của hộ kinh doanh được ghi nhận như sau:</p>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Chỉ tiêu</th>
                <th style="width: 50%;">Giá trị</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Doanh thu</td><td style="text-align: right;">${formatCurrency(report.revenue)}</td></tr>
              <tr><td>Giá vốn hàng bán</td><td style="text-align: right;">${formatCurrency(report.cogs)}</td></tr>
              <tr><td>Lợi nhuận gộp</td><td style="text-align: right;">${formatCurrency(report.grossProfit)}</td></tr>
              <tr><td>Chi phí vận hành</td><td style="text-align: right;">${formatCurrency(report.operatingExpense)}</td></tr>
              <tr><td><b>Lợi nhuận ròng</b></td><td style="text-align: right;"><b>${formatCurrency(report.netProfit)}</b></td></tr>
            </tbody>
          </table>

          <div class="section-title">2. Dự báo và gợi ý nhập hàng</div>
          <p>Dựa trên dữ liệu bán hàng trung bình, hệ thống đưa ra dự báo và gợi ý nhập hàng trong 14 ngày tới đối với các mặt hàng như sau:</p>
          <table>
            <thead>
              <tr>
                <th style="width: 8%;">STT</th>
                <th style="width: 32%;">Tên sản phẩm</th>
                <th style="width: 15%;">Tồn kho</th>
                <th style="width: 15%;">Bán TB/ngày</th>
                <th style="width: 15%;">Gợi ý nhập</th>
                <th style="width: 15%;">Rủi ro</th>
              </tr>
            </thead>
            <tbody>
              ${forecast.map((item, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${item.productName}</td>
                  <td style="text-align: right;">${item.currentStock}</td>
                  <td style="text-align: right;">${item.averageDailyDemand}</td>
                  <td style="text-align: right;">${item.suggestedImportQty}</td>
                  <td style="text-align: center;">${item.riskLevel === "HIGH" ? "Cao" : "Bình thường"}</td>
                </tr>
              `).join("")}
              ${forecast.length === 0 ? `<tr><td colspan="6" style="text-align: center;">Không có dữ liệu dự báo</td></tr>` : ""}
            </tbody>
          </table>
          <p>Trên đây là Báo cáo tình hình kinh doanh và dự báo nhập hàng của Hộ kinh doanh Enterprise kính trình các cơ quan chức năng hoặc lưu nội bộ.</p>
        </div>

        <div class="footer">
          <div class="footer-left">
            <div class="title">Nơi nhận:</div>
            <div>- Như trên;</div>
            <div>- Lưu: Hồ sơ.</div>
          </div>
          <div class="footer-right">
            <div class="role">ĐẠI DIỆN HỘ KINH DOANH</div>
            <div class="sign"></div>
            <div class="name"></div>
          </div>
        </div>

        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const printTaxReport = async () => {
    if (!report) return;
    
    try {
      const response = await fetch("/tax-template.docx");
      if (!response.ok) throw new Error("Could not fetch the tax template.");
      const arrayBuffer = await response.arrayBuffer();
      
      const options = {
        styleMap: [
          "p[style-name='Normal'] => p:fresh",
        ]
      };
      
      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      let htmlContent = result.value;
      
      const revenueStr = formatCurrency(report.revenue);
      
      htmlContent = htmlContent
        .replace(/\[08a\]/g, revenueStr)
        .replace(/\[11\]/g, revenueStr);
        
      const html = `
        <!doctype html>
        <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Tờ Khai Thuế</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; font-size: 13px; line-height: 1.5; color: #000; padding: 20px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            td, th { border: 1px solid #000; padding: 6px; vertical-align: top; }
            p { margin: 4px 0; }
            @media print {
              body { padding: 0; margin: 0; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
        </html>
      `;
      
      const printWindow = window.open("", "_blank", "width=1200,height=900");
      if (!printWindow) return;
      printWindow.document.write(html);
      printWindow.document.close();
      
    } catch (err) {
      console.error("Lỗi tạo tờ khai thuế:", err);
      setError("Không thể tạo tờ khai thuế. Lỗi: " + (err as Error).message);
    }
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
          <button onClick={() => void printTaxReport()} disabled={!report} className="app-button-primary border-amber-600 bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-semibold text-white">
            In Tờ Khai Thuế (PDF)
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
