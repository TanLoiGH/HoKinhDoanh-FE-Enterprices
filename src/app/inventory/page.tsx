"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import StatePagination from "@/components/ui/StatePagination";

interface Product {
  id: number;
  code: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchProducts = useCallback(async () => {
    const response = await api.get<Product[]>("/products");
    setProducts(response.data);
    setProductId((currentProductId) => currentProductId || (response.data[0] ? String(response.data[0].id) : ""));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchProducts);
  }, [fetchProducts]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "inventoryChanged" || detail?.type === "catalogChanged") {
        void fetchProducts();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, [fetchProducts]);

  const selectedProduct = products.find((product) => product.id === Number(productId));
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
      await api.post("/inventory/import", {
        productId: Number(productId),
        qty: Number(qty),
        note,
      });
      setMessage("Nhập kho thành công!");
      setQty("");
      setNote("");
      await fetchProducts();
    } catch (error: unknown) {
      const responseError = error as { response?: { data?: string }; isQueuedOffline?: boolean };
      setMessage(responseError.isQueuedOffline ? "Mất mạng: phiếu nhập kho đã được xếp hàng chờ đồng bộ." : (responseError.response?.data || "Lỗi khi nhập kho"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 pb-20 lg:grid-cols-[minmax(320px,420px)_1fr] lg:gap-6">
      <div className="space-y-6">
        <div>
          <p className="app-kicker mb-2">Vận hành kho</p>
          <h1 className="app-title text-3xl font-black tracking-tight">Kho hàng</h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">Nhập hàng nhanh trên thiết bị cảm ứng và theo dõi ngưỡng tồn tối thiểu.</p>
        </div>

        <div className="app-panel-strong p-4 md:p-6">
          {message && (
            <div className={`mb-4 rounded-2xl p-4 text-sm font-semibold ${message.includes("thành công") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Sản phẩm</label>
              <select required value={productId} onChange={(event) => setProductId(event.target.value)} className="app-control w-full px-3 py-2 font-semibold">
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
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Số lượng nhập</label>
              <input type="number" required min="1" value={qty} onChange={(event) => setQty(event.target.value)} className="app-control w-full px-3 py-2 font-semibold" placeholder="100" />
            </div>
            <div>
              <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-app-soft">Ghi chú</label>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="app-control min-h-24 w-full px-3 py-2" placeholder="Lô hàng nhập tháng 5..." />
            </div>
            <button type="submit" disabled={loading || products.length === 0} className="app-button-primary w-full py-2 font-semibold">
              {loading ? "Đang xử lý..." : "Xác nhận nhập kho"}
            </button>
          </form>
        </div>
      </div>

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
    </div>
  );
}
