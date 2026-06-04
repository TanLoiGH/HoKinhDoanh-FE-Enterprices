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

interface SalesSummary {
  byDay: Array<{ label: string; orderCount: number; revenue: number; discount: number }>;
  byStaff: Array<{ label: string; orderCount: number; revenue: number; discount: number }>;
  byProduct: Array<{ productId: number; productName: string; qty: number; revenue: number; grossProfit: number }>;
}

interface EInvoiceDemoStatus {
  mode: string;
  provider: string;
  isRealIntegrationEnabled: boolean;
  message: string;
  nextSteps: string[];
}

interface TknCnkdActivityRow {
  code: string;
  revenue: number;
}

interface TknCnkdReport {
  profile?: {
    taxpayerName?: string;
    taxCode?: string;
    businessAddress?: string;
  } | null;
  activityRows?: TknCnkdActivityRow[];
  totalRevenue?: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

export default function ReportsPage() {
  const [report, setReport] = useState<PnlReport | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [eInvoiceStatus, setEInvoiceStatus] = useState<EInvoiceDemoStatus | null>(null);

  // Tab control state
  const [activeTab, setActiveTab] = useState<"reports" | "settings">("reports");

  // HKD settings states (Step 8)
  const [profile, setProfile] = useState({
    branchId: 1,
    taxpayerName: "",
    taxCode: "",
    businessAddress: "",
    taxAuthority: "",
    administrativeArea: "",
    businessActivity: "Phân phối, cung cấp hàng hóa",
    representativeName: "",
    representativeTitle: "Chủ hộ kinh doanh",
    phone: "",
    email: "",
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Modal export states (Step 9)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [declarationType, setDeclarationType] = useState<"first" | "additional">("first");
  const [additionalTimes, setAdditionalTimes] = useState(0);
  const [exportProfile, setExportProfile] = useState({
    taxpayerName: "",
    taxCode: "",
    businessAddress: "",
    revenue08a: 0,
    revenue08b: 0,
    revenue08c: 0,
    revenue08d: 0,
    revenue08e: 0,
    revenue08g: 0,
    totalRevenue11: 0,
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [exportingDocx, setExportingDocx] = useState(false);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await api.get("/tax-profile");
      if (response.data && response.data.taxpayerName) {
        setProfile(response.data);
      }
    } catch (err) {
      console.error("Lỗi tải cấu hình:", err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "settings") {
      void fetchSettings();
    }
  }, [activeTab, fetchSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(false);
    setError("");
    try {
      await api.put("/tax-profile", profile);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Lỗi lưu cấu hình:", err);
      setError("Không thể lưu cấu hình hộ kinh doanh. Vui lòng kiểm tra dữ liệu.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadModalData = useCallback(async () => {
    setModalLoading(true);
    setModalError("");
    try {
      const response = await api.get<TknCnkdReport>("/reports/tkn-cnkd", { params: { year: taxYear } });
      const data = response.data;
      
      const rows = data.activityRows || [];
      const r08a = rows.find((r) => r.code === "[08a]")?.revenue || 0;
      const r08b = rows.find((r) => r.code === "[08b]")?.revenue || 0;
      const r08g = rows.find((r) => r.code === "[08g]")?.revenue || 0;
      const r11 = data.totalRevenue || 0;

      setExportProfile({
        taxpayerName: data.profile?.taxpayerName || "",
        taxCode: data.profile?.taxCode || "",
        businessAddress: data.profile?.businessAddress || "",
        revenue08a: r08a,
        revenue08b: r08b,
        revenue08c: 0,
        revenue08d: 0,
        revenue08e: 0,
        revenue08g: r08g,
        totalRevenue11: r11,
      });
    } catch (err) {
      console.error("Lỗi tải dữ liệu tờ khai:", err);
      setModalError("Không tải được dữ liệu tờ khai. Vui lòng kiểm tra backend/API rồi thử lại.");
    } finally {
      setModalLoading(false);
    }
  }, [taxYear]);

  useEffect(() => {
    if (isExportModalOpen) {
      void loadModalData();
    }
  }, [isExportModalOpen, loadModalData]);

  const handleExportTaxDeclaration = async () => {
    setExportingDocx(true);
    try {
      const response = await api.post<Blob>(
        "/reports/tax-declaration",
        {
          year: taxYear,
          branchId: 1,
          taxpayerName: exportProfile.taxpayerName,
          taxCode: exportProfile.taxCode,
          businessAddress: exportProfile.businessAddress,
          revenue08a: exportProfile.revenue08a,
          revenue08b: exportProfile.revenue08b,
          revenue08c: exportProfile.revenue08c,
          revenue08d: exportProfile.revenue08d,
          revenue08e: exportProfile.revenue08e,
          revenue08g: exportProfile.revenue08g,
          totalRevenue11: exportProfile.totalRevenue11,
        },
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `to-khai-thue-${taxYear}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err) {
      console.error("Lỗi xuất tờ khai thuế:", err);
      setError("Không thể xuất tờ khai thuế DOCX. Vui lòng kiểm tra kết nối API.");
    } finally {
      setExportingDocx(false);
    }
  };

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const [pnlResponse, forecastResponse, invoiceStatusResponse, salesSummaryResponse] = await Promise.all([
        api.get<PnlReport>("/reports/pnl", { params: { from, to } }),
        api.get<Forecast[]>("/analytics/forecast"),
        api.get<EInvoiceDemoStatus>("/einvoices/demo-status"),
        api.get<SalesSummary>("/reports/sales-summary", { params: { from, to } }),
      ]);
      setReport(pnlResponse.data);
      setForecast(forecastResponse.data);
      setEInvoiceStatus(invoiceStatusResponse.data);
      setSalesSummary(salesSummaryResponse.data);
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
    const productRows = (salesSummary?.byProduct || []).map((item) => ({
      SanPham: item.productName,
      SoLuong: item.qty,
      DoanhThu: item.revenue,
      LaiGop: item.grossProfit,
    }));
    const staffRows = (salesSummary?.byStaff || []).map((item) => ({
      NhanVien: item.label,
      SoDon: item.orderCount,
      DoanhThu: item.revenue,
      GiamGia: item.discount,
    }));
    const dayRows = (salesSummary?.byDay || []).map((item) => ({
      Ngay: item.label,
      SoDon: item.orderCount,
      DoanhThu: item.revenue,
      GiamGia: item.discount,
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "TongHop");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(forecastRows), "Forecast");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dayRows), "TheoNgay");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productRows), "TheoSanPham");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(staffRows), "TheoNhanVien");
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
          <button onClick={() => setIsExportModalOpen(true)} disabled={!report} className="app-button-primary border-amber-600 bg-amber-600 hover:bg-amber-700 px-4 py-2 text-sm font-semibold text-white">
            Xuất Báo Cáo Thuế
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      {/* Tabs Control Navigation Header */}
      <div className="flex border-b border-app mb-6 space-x-6">
        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 text-sm font-black tracking-tight transition-all relative ${
            activeTab === "reports"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-app-muted hover:text-app-strong"
          }`}
        >
          Báo cáo P&amp;L &amp; Dự báo AI
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-sm font-black tracking-tight transition-all relative ${
            activeTab === "settings"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-app-muted hover:text-app-strong"
          }`}
        >
          Cấu hình Hộ kinh doanh (Thuế)
        </button>
      </div>

      {activeTab === "settings" ? (
        <div className="app-panel-strong p-6 space-y-6">
          <div>
            <h2 className="text-xl font-black text-app-strong">Cấu hình Hộ kinh doanh</h2>
            <p className="text-sm font-semibold text-app-muted mt-1">Thiết lập các thông tin pháp lý phục vụ việc xuất sổ sách và tờ khai thuế.</p>
          </div>

          {settingsLoading ? (
            <p className="text-sm font-semibold text-app-muted">Đang tải cấu hình...</p>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {settingsSuccess && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700">
                  Lưu cấu hình thành công!
                </div>
              )}

              {/* Part 1: Legal Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-app-muted border-b border-app pb-2">Thông tin pháp lý</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Tên hộ kinh doanh</label>
                    <input
                      type="text"
                      required
                      value={profile.taxpayerName}
                      onChange={(e) => setProfile({ ...profile, taxpayerName: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                      placeholder="Ví dụ: Hộ kinh doanh Nguyễn Văn A"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Mã số thuế</label>
                    <input
                      type="text"
                      required
                      value={profile.taxCode}
                      onChange={(e) => setProfile({ ...profile, taxCode: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                      placeholder="Mã số thuế 10 số"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Họ tên chủ hộ</label>
                    <input
                      type="text"
                      required
                      value={profile.representativeName}
                      onChange={(e) => setProfile({ ...profile, representativeName: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                      placeholder="Họ tên người nộp thuế / đại diện"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Chức danh</label>
                    <input
                      type="text"
                      required
                      value={profile.representativeTitle}
                      onChange={(e) => setProfile({ ...profile, representativeTitle: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Contact & Address */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-app-muted border-b border-app pb-2">Liên hệ & Địa chỉ</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Địa chỉ kinh doanh</label>
                    <input
                      type="text"
                      required
                      value={profile.businessAddress}
                      onChange={(e) => setProfile({ ...profile, businessAddress: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Số điện thoại</label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Thư điện tử (Email)</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Cơ quan thuế quản lý</label>
                    <input
                      type="text"
                      required
                      value={profile.taxAuthority}
                      onChange={(e) => setProfile({ ...profile, taxAuthority: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                      placeholder="Ví dụ: Chi cục Thuế Quận 1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Địa bàn hành chính</label>
                    <input
                      type="text"
                      required
                      value={profile.administrativeArea}
                      onChange={(e) => setProfile({ ...profile, administrativeArea: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Ngành nghề kinh doanh chính</label>
                    <input
                      type="text"
                      required
                      value={profile.businessActivity}
                      onChange={(e) => setProfile({ ...profile, businessActivity: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Part 3: Banking Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-app-muted border-b border-app pb-2">Thông tin tài khoản ngân hàng</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Tên ngân hàng</label>
                    <input
                      type="text"
                      value={profile.bankName}
                      onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                      placeholder="Ví dụ: Vietcombank"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Số tài khoản</label>
                    <input
                      type="text"
                      value={profile.bankAccountNumber}
                      onChange={(e) => setProfile({ ...profile, bankAccountNumber: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Tên chủ tài khoản</label>
                    <input
                      type="text"
                      value={profile.bankAccountName}
                      onChange={(e) => setProfile({ ...profile, bankAccountName: e.target.value })}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-app">
                <button type="submit" disabled={settingsSaving} className="app-button-primary px-6 py-2.5 text-sm font-bold">
                  {settingsSaving ? "Đang lưu..." : "Lưu cấu hình"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <>
          {loading && <div className="app-panel rounded-2xl p-4 text-sm font-semibold text-app-muted">Đang tải báo cáo...</div>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
            {reportCards.map(([label, value, color]) => (
              <div key={label} className="app-kpi-card p-4">
                <p className="text-sm font-semibold text-app-muted">{label}</p>
                <p className={`mt-2 break-words text-lg font-bold md:text-xl ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="app-panel-strong p-4 md:p-5">
              <p className="app-kicker mb-2">Theo ngày</p>
              <h2 className="text-lg font-black text-app-strong">Doanh thu ngày</h2>
              <div className="mt-4 space-y-3">
                {(salesSummary?.byDay || []).slice(-10).map((item) => (
                  <div key={item.label} className="app-list-item flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-black text-app-strong">{item.label}</p>
                      <p className="text-[10px] font-bold text-app-muted">{item.orderCount} đơn · giảm {formatCurrency(item.discount)}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(item.revenue)}</p>
                  </div>
                ))}
                {(salesSummary?.byDay || []).length === 0 && <p className="py-8 text-center text-sm font-semibold text-app-muted">Chưa có doanh thu trong kỳ.</p>}
              </div>
            </div>

            <div className="app-panel-strong p-4 md:p-5">
              <p className="app-kicker mb-2">Theo sản phẩm</p>
              <h2 className="text-lg font-black text-app-strong">Sản phẩm bán chạy</h2>
              <div className="mt-4 space-y-3">
                {(salesSummary?.byProduct || []).slice(0, 10).map((item) => (
                  <div key={item.productId} className="app-list-item flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-app-strong">{item.productName}</p>
                      <p className="text-[10px] font-bold text-app-muted">SL {item.qty} · lãi gộp {formatCurrency(item.grossProfit)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-blue-600">{formatCurrency(item.revenue)}</p>
                  </div>
                ))}
                {(salesSummary?.byProduct || []).length === 0 && <p className="py-8 text-center text-sm font-semibold text-app-muted">Chưa có sản phẩm bán ra.</p>}
              </div>
            </div>

            <div className="app-panel-strong p-4 md:p-5">
              <p className="app-kicker mb-2">Theo nhân viên</p>
              <h2 className="text-lg font-black text-app-strong">Hiệu suất thu ngân</h2>
              <div className="mt-4 space-y-3">
                {(salesSummary?.byStaff || []).map((item) => (
                  <div key={item.label} className="app-list-item flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-black text-app-strong">{item.label}</p>
                      <p className="text-[10px] font-bold text-app-muted">{item.orderCount} đơn · giảm {formatCurrency(item.discount)}</p>
                    </div>
                    <p className="text-sm font-black text-violet-600">{formatCurrency(item.revenue)}</p>
                  </div>
                ))}
                {(salesSummary?.byStaff || []).length === 0 && <p className="py-8 text-center text-sm font-semibold text-app-muted">Chưa có dữ liệu nhân viên.</p>}
              </div>
            </div>
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
        </>
      )}

      {/* Step 9: Modal Export Tax Report */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="app-panel-strong w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 rounded-3xl shadow-2xl border border-app text-left">
            <div className="flex items-center justify-between border-b border-app pb-4">
              <div>
                <h3 className="text-xl font-black text-app-strong">Xuất tờ khai thuế (01/TKN-CNKD)</h3>
                <p className="text-xs font-semibold text-app-muted mt-1">
                  Thông tư 50/2026/TT-BTC - Áp dụng cho HKD doanh thu ≤ 1 tỷ đồng/năm
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-app-muted hover:text-app-strong p-1 rounded-full hover:bg-[color:var(--surface-3)] transition-all font-bold"
              >
                ✕
              </button>
            </div>

            {modalLoading ? (
              <div className="py-12 text-center text-sm font-semibold text-app-muted">
                Đang tải dữ liệu tờ khai thuế...
              </div>
            ) : (
              <div className="space-y-6">
                {modalError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    <div>{modalError}</div>
                    <button
                      type="button"
                      onClick={() => void loadModalData()}
                      className="mt-2 text-xs font-black uppercase text-red-800 underline"
                    >
                      Tải lại dữ liệu
                    </button>
                  </div>
                )}

                {/* Section 1: Ky ke khai */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Năm kê khai</label>
                    <input
                      type="number"
                      min={1900}
                      max={2100}
                      value={taxYear}
                      onChange={(e) => setTaxYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="app-control w-full px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Loại tờ khai</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDeclarationType("first");
                          setAdditionalTimes(0);
                        }}
                        className={`app-button-secondary py-2 text-xs font-bold ${
                          declarationType === "first" ? "border-blue-600 bg-blue-50 text-blue-700" : ""
                        }`}
                      >
                        Lần đầu
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeclarationType("additional")}
                        className={`app-button-secondary py-2 text-xs font-bold ${
                          declarationType === "additional" ? "border-blue-600 bg-blue-50 text-blue-700" : ""
                        }`}
                      >
                        Bổ sung {additionalTimes > 0 ? `(Lần ${additionalTimes})` : ""}
                      </button>
                    </div>
                  </div>
                </div>

                {declarationType === "additional" && (
                  <div>
                    <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Bổ sung lần thứ</label>
                    <input
                      type="number"
                      min={1}
                      value={additionalTimes}
                      onChange={(e) => setAdditionalTimes(parseInt(e.target.value) || 1)}
                      className="app-control w-24 px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                )}

                {/* Section 2: Thong tin HKD */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted border-b border-app pb-2">Thông tin người nộp thuế</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Tên người nộp thuế [04]</label>
                      <input
                        type="text"
                        value={exportProfile.taxpayerName}
                        onChange={(e) => setExportProfile({ ...exportProfile, taxpayerName: e.target.value })}
                        className="app-control w-full px-3 py-2 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Mã số thuế [05]</label>
                      <input
                        type="text"
                        value={exportProfile.taxCode}
                        onChange={(e) => setExportProfile({ ...exportProfile, taxCode: e.target.value })}
                        className="app-control w-full px-3 py-2 text-sm font-semibold"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Địa chỉ kinh doanh</label>
                      <input
                        type="text"
                        value={exportProfile.businessAddress}
                        onChange={(e) => setExportProfile({ ...exportProfile, businessAddress: e.target.value })}
                        className="app-control w-full px-3 py-2 text-sm font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Chi tieu Doanh thu */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-app-muted border-b border-app pb-2">Doanh thu tính thuế năm</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Phân phối, cung cấp hàng hóa [08a]</label>
                      <input
                        type="number"
                        value={exportProfile.revenue08a}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const nextProfile = { ...exportProfile, revenue08a: val };
                          nextProfile.totalRevenue11 = val + exportProfile.revenue08b + exportProfile.revenue08c + exportProfile.revenue08d + exportProfile.revenue08e + exportProfile.revenue08g;
                          setExportProfile(nextProfile);
                        }}
                        className="app-control w-full px-3 py-2 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Dịch vụ, xây dựng ko bao thầu [08b]</label>
                      <input
                        type="number"
                        value={exportProfile.revenue08b}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const nextProfile = { ...exportProfile, revenue08b: val };
                          nextProfile.totalRevenue11 = exportProfile.revenue08a + val + exportProfile.revenue08c + exportProfile.revenue08d + exportProfile.revenue08e + exportProfile.revenue08g;
                          setExportProfile(nextProfile);
                        }}
                        className="app-control w-full px-3 py-2 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Hoạt động kinh doanh khác [08g]</label>
                      <input
                        type="number"
                        value={exportProfile.revenue08g}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const nextProfile = { ...exportProfile, revenue08g: val };
                          nextProfile.totalRevenue11 = exportProfile.revenue08a + exportProfile.revenue08b + exportProfile.revenue08c + exportProfile.revenue08d + exportProfile.revenue08e + val;
                          setExportProfile(nextProfile);
                        }}
                        className="app-control w-full px-3 py-2 text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-app-strong mb-1.5 uppercase">Tổng cộng doanh thu [11]</label>
                      <input
                        type="number"
                        disabled
                        value={exportProfile.totalRevenue11}
                        className="app-control bg-[color:var(--surface-3)] w-full px-3 py-2 text-sm font-bold text-blue-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-app">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="app-button-secondary px-5 py-2.5 text-sm font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => void handleExportTaxDeclaration()}
                    disabled={exportingDocx}
                    className="app-button-primary px-6 py-2.5 text-sm font-bold bg-amber-600 border-amber-600 hover:bg-amber-700 text-white"
                  >
                    {exportingDocx ? "Đang xuất..." : "Xuất tờ khai (DOCX)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
