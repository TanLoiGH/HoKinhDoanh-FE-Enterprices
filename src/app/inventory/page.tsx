"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import StatePagination from "@/components/ui/StatePagination";
import { Download, History, PackageMinus, PackagePlus, ScanBarcode, Search, SlidersHorizontal } from "lucide-react";
import { scanProduct } from "@/features/barcode/product-scan-api";
import type { ProductScanResult } from "@/features/barcode/types";
import { useUsbBarcodeScanner } from "@/features/barcode/useUsbBarcodeScanner";

interface Product {
  id: number;
  code: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
}

interface InventoryHistoryRow {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  changeQty: number;
  balanceQty: number;
  type: string;
  refId?: string | null;
  note?: string | null;
  createdByName: string;
  createdAt: string;
}

type StockAction = "import" | "out" | "adjust";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [targetStock, setTargetStock] = useState("");
  const [importPrice, setImportPrice] = useState("");
  const [note, setNote] = useState("");
  const [scanBarcode, setScanBarcode] = useState("");
  const [scanResult, setScanResult] = useState<ProductScanResult | null>(null);
  const [usbScanEnabled, setUsbScanEnabled] = useState(true);
  const [stockAction, setStockAction] = useState<StockAction>("import");
  const [historyRows, setHistoryRows] = useState<InventoryHistoryRow[]>([]);
  const [historyType, setHistoryType] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const isPositiveMessage = message.includes("thành công") || message.startsWith("Đã nhận diện");

  const fetchProducts = useCallback(async () => {
    const response = await api.get<Product[]>("/products");
    setProducts(response.data);
    setProductId((currentProductId) => currentProductId || (response.data[0] ? String(response.data[0].id) : ""));
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get<InventoryHistoryRow[]>("/inventory/history", {
        params: {
          take: 100,
          type: historyType || undefined,
        },
      });
      setHistoryRows(response.data);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyType]);

  useEffect(() => {
    void Promise.resolve().then(fetchProducts);
    void Promise.resolve().then(fetchHistory);
  }, [fetchProducts, fetchHistory]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "inventoryChanged" || detail?.type === "catalogChanged") {
        void fetchProducts();
        void fetchHistory();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, [fetchProducts, fetchHistory]);

  const selectedProduct = products.find((product) => product.id === Number(productId));
  const activeProductLabel = scanResult
    ? `${scanResult.productCode} - ${scanResult.productName}`
    : selectedProduct
      ? `${selectedProduct.code} - ${selectedProduct.name}`
      : "";
  const processedProducts = useMemo(() => {
    const filtered = products.filter((product) => !lowStockOnly || product.stock <= product.minStock);
    return [...filtered].sort((a, b) => b.id - a.id);
  }, [products, lowStockOnly]);

  const totalPages = Math.ceil(processedProducts.length / pageSize);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedProducts.slice(startIndex, startIndex + pageSize);
  }, [processedProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [lowStockOnly]);

  const handleImport = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const scannedBarcode = scanBarcode.trim();
      if (stockAction === "import") {
        if (scannedBarcode) {
          const response = await api.post<ProductScanResult>("/inventory/import/scan", {
            barcode: scannedBarcode,
            qty: Number(qty),
            importPrice: Number(importPrice || 0),
            note,
          });
          setScanResult(response.data);
          setProductId(String(response.data.productId));
        } else {
          await api.post("/inventory/import", {
            productId: Number(productId),
            qty: Number(qty),
            importPrice: Number(importPrice || 0),
            note,
          });
        }
        setMessage("Nhập kho thành công!");
      } else if (stockAction === "out") {
        if (scannedBarcode) {
          const response = await api.post<ProductScanResult>("/inventory/out/scan", {
            barcode: scannedBarcode,
            qty: Number(qty),
            note,
          });
          setScanResult(response.data);
          setProductId(String(response.data.productId));
        } else {
          await api.post("/inventory/out", {
            productId: Number(productId),
            qty: Number(qty),
            note,
          });
        }
        setMessage("Xuất kho thành công!");
      } else {
        if (scannedBarcode) {
          const response = await api.post<ProductScanResult>("/inventory/adjust/scan", {
            barcode: scannedBarcode,
            targetStock: Number(targetStock),
            note,
          });
          setScanResult(response.data);
          setProductId(String(response.data.productId));
        } else {
          await api.post("/inventory/adjust", {
            productId: Number(productId),
            targetStock: Number(targetStock),
            note,
          });
        }
        setMessage("Điều chỉnh tồn thành công!");
      }
      setQty("");
      setTargetStock("");
      setImportPrice("");
      setNote("");
      await fetchProducts();
      await fetchHistory();
    } catch (error: unknown) {
      const responseError = error as { isQueuedOffline?: boolean };
      setMessage(responseError.isQueuedOffline ? "Mất mạng: phiếu nhập kho đã được xếp hàng chờ đồng bộ." : getApiErrorMessage(error, "Lỗi khi nhập kho"));
    } finally {
      setLoading(false);
    }
  };

  const handleScanLookup = async (rawBarcode = scanBarcode) => {
    const scannedBarcode = rawBarcode.trim();
    if (!scannedBarcode) {
      setMessage("Nhập mã vạch hoặc mã sản phẩm để quét.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const result = await scanProduct(scannedBarcode);
      setScanBarcode(scannedBarcode);
      setScanResult(result);
      setProductId(String(result.productId));
      setMessage(`Đã nhận diện ${result.productCode} - ${result.productName}`);
    } catch (error) {
      setScanResult(null);
      setMessage(getApiErrorMessage(error, "Không tìm thấy sản phẩm theo mã quét"));
    } finally {
      setLoading(false);
    }
  };

  useUsbBarcodeScanner({
    enabled: usbScanEnabled && !loading,
    onScan: handleScanLookup,
  });

  const downloadInventoryCsv = () => {
    const header = "MaSanPham,TenSanPham,TonKho,DonVi,TonToiThieu\n";
    const rows = processedProducts.map((product) => [
      product.code,
      `"${product.name.replace(/"/g, '""')}"`,
      product.stock,
      product.unit,
      product.minStock,
    ].join(","));
    const blob = new Blob([`\uFEFF${header}${rows.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ton-kho-hien-tai.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadHistoryCsv = async () => {
    const params = new URLSearchParams();
    if (historyType) params.set("type", historyType);
    const response = await api.get<Blob>(`/inventory/history/export.csv?${params.toString()}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lich-su-kho.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5 pb-20 lg:grid-cols-[minmax(320px,420px)_1fr] lg:gap-6">
      <div className="space-y-6">
        <div>
          <p className="app-kicker mb-2">Vận hành kho</p>
          <h1 className="app-title text-3xl font-black tracking-tight">Kho hàng</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">Nhập hàng nhanh trên thiết bị cảm ứng và theo dõi ngưỡng tồn tối thiểu.</p>
          <label className="mt-3 inline-flex min-h-10 items-center gap-3 rounded-xl bg-[color:var(--surface-3)] px-3 text-xs font-black uppercase tracking-wider text-app-base">
            <ScanBarcode className="h-4 w-4 text-blue-600" />
            USB scanner
            <input
              type="checkbox"
              checked={usbScanEnabled}
              onChange={(event) => setUsbScanEnabled(event.target.checked)}
              className="h-4 w-4"
            />
          </label>
        </div>

        <div className="app-panel-strong p-4 md:p-6">
          {message && (
            <div className={`mb-4 rounded-2xl p-4 text-sm font-semibold ${isPositiveMessage ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-[color:var(--surface-3)] p-1">
            {[
              { key: "import", label: "Nhập", Icon: PackagePlus },
              { key: "out", label: "Xuất", Icon: PackageMinus },
              { key: "adjust", label: "Kiểm kê", Icon: SlidersHorizontal },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStockAction(key as StockAction)}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs font-black uppercase transition-all ${
                  stockAction === key ? "bg-app-surface text-blue-600 shadow-sm" : "text-app-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={handleImport} className="space-y-4">
            <div className="app-panel-subtle p-3">
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Mã quét</label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-soft" />
                  <input
                    value={scanBarcode}
                    onChange={(event) => {
                      setScanBarcode(event.target.value);
                      setScanResult(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && scanBarcode.trim()) {
                        event.preventDefault();
                        void handleScanLookup();
                      }
                    }}
                    className="app-control w-full py-2 pl-9 pr-3 font-semibold"
                    placeholder="Quét barcode hoặc nhập mã hàng"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleScanLookup()}
                  disabled={loading || !scanBarcode.trim()}
                  className="app-button-secondary flex min-h-10 items-center justify-center gap-2 px-3 text-sm font-semibold"
                  title="Tìm sản phẩm theo mã quét"
                >
                  <Search className="h-4 w-4" />
                  Tìm
                </button>
              </div>
              {scanResult && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Đã quét: {scanResult.productCode} - {scanResult.productName} · tồn {scanResult.stock} {scanResult.unit}
                </p>
              )}
              {!scanResult && activeProductLabel && (
                <p className="mt-2 text-xs font-semibold text-app-muted">Đang chọn: {activeProductLabel}</p>
              )}
            </div>
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Sản phẩm</label>
              <select
                required={!scanBarcode.trim()}
                value={productId}
                onChange={(event) => {
                  setProductId(event.target.value);
                  setScanResult(null);
                }}
                className="app-control w-full px-3 py-2 font-semibold"
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="mt-2 text-xs font-semibold text-app-muted">Tồn hiện tại: {selectedProduct.stock} {selectedProduct.unit}</p>
              )}
            </div>
            {stockAction !== "adjust" ? (
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">
                {stockAction === "import" ? "Số lượng nhập" : "Số lượng xuất"}
              </label>
              <input type="number" required min="1" value={qty} onChange={(event) => setQty(event.target.value)} className="app-control w-full px-3 py-2 font-semibold" placeholder="100" />
            </div>
            ) : (
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Tồn thực tế sau kiểm kê</label>
              <input type="number" required min="0" value={targetStock} onChange={(event) => setTargetStock(event.target.value)} className="app-control w-full px-3 py-2 font-semibold" placeholder="100" />
            </div>
            )}
            {stockAction === "import" && (
              <div>
                <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Giá nhập / đơn vị</label>
                <input type="number" min="0" value={importPrice} onChange={(event) => setImportPrice(event.target.value)} className="app-control w-full px-3 py-2 font-semibold" placeholder="Bỏ trống nếu giữ giá vốn hiện tại" />
              </div>
            )}
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Ghi chú</label>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="app-control min-h-24 w-full px-3 py-2" placeholder="Lô hàng nhập tháng 5..." />
            </div>
            <button type="submit" disabled={loading || products.length === 0} className="app-button-primary w-full py-2 font-semibold">
              {loading ? "Đang xử lý..." : stockAction === "import" ? "Xác nhận nhập kho" : stockAction === "out" ? "Xác nhận xuất kho" : "Lưu kiểm kê"}
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-5">
      <div className="app-panel-strong p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="app-kicker mb-1">Theo dõi tồn</p>
            <h2 className="text-xl font-black text-app-strong">Tồn kho hiện tại</h2>
          </div>
          <label className="app-panel-subtle flex min-h-12 items-center gap-3 px-4 text-sm font-semibold text-app-base">
            <input className="h-5 w-5" type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} />
            Chỉ hàng sắp hết
          </label>
          <button type="button" onClick={downloadInventoryCsv} className="app-button-secondary flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-semibold">
            <Download className="h-4 w-4" />
            CSV tồn kho
          </button>
        </div>
        <div className="space-y-3">
          {paginatedProducts.map((product) => (
            <div key={product.id} className="app-list-item flex min-h-20 items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold text-app-strong">{product.name}</p>
                <p className="text-xs font-semibold text-app-muted">{product.code} · tối thiểu {product.minStock} {product.unit}</p>
              </div>
              <span className={`rounded-full px-3.5 py-1.5 text-sm font-black ${product.stock <= product.minStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {product.stock} {product.unit}
              </span>
            </div>
          ))}
          {paginatedProducts.length === 0 && <p className="py-10 text-center text-sm font-semibold text-app-muted">Không có sản phẩm phù hợp.</p>}
        </div>
        <StatePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <div className="app-panel-strong p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="app-kicker mb-1">Audit kho</p>
            <h2 className="text-xl font-black text-app-strong">Lịch sử nhập xuất</h2>
          </div>
          <div className="flex gap-2">
            <select value={historyType} onChange={(event) => setHistoryType(event.target.value)} className="app-control px-3 py-2 text-sm font-semibold">
              <option value="">Tất cả</option>
              <option value="IN">Nhập</option>
              <option value="OUT">Xuất</option>
              <option value="ADJUST">Kiểm kê</option>
            </select>
            <button type="button" onClick={() => void downloadHistoryCsv()} className="app-button-primary flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              <Download className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {historyLoading ? (
            <p className="py-10 text-center text-sm font-semibold text-app-muted">Đang tải lịch sử kho...</p>
          ) : historyRows.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-app-muted">
              <History className="mx-auto mb-3 h-8 w-8 text-app-soft" />
              Chưa có giao dịch kho phù hợp.
            </div>
          ) : (
            historyRows.map((row) => (
              <div key={row.id} className="app-list-item flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-black text-app-strong">{row.productName || row.productCode}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-app-soft">
                    {new Date(row.createdAt).toLocaleString("vi-VN")} · {row.createdByName}
                  </p>
                  {row.note && <p className="mt-2 text-xs font-semibold text-app-muted">{row.note}</p>}
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${row.changeQty >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {row.changeQty > 0 ? "+" : ""}{row.changeQty}
                  </span>
                  <p className="mt-2 text-xs font-bold text-app-muted">Tồn {row.balanceQty}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
