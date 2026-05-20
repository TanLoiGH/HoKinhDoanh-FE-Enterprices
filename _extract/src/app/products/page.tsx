"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "@/lib/axios";
import StatePagination from "@/components/ui/StatePagination";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  categoryName: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
}

type ProductForm = Omit<Product, "id" | "stock" | "categoryName"> & { id?: number };

const emptyForm: ProductForm = {
  code: "",
  name: "",
  categoryId: 1, // Mặc định là danh mục 1 (Chưa phân loại)
  unit: "",
  costPrice: 0,
  sellPrice: 0,
  minStock: 5,
};

// Sinh mã sản phẩm tiếp theo dựa trên danh sách hiện tại
// Ví dụ: [SP001, SP003, SP005] → SP006
function generateNextCode(products: Product[]): string {
  const prefix = "SP";
  let maxNum = 0;
  for (const p of products) {
    const upper = p.code.toUpperCase();
    if (upper.startsWith(prefix)) {
      const num = parseInt(upper.slice(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchProducts = async () => {
    try {
      const response = await api.get<Product[]>("/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get<Category[]>("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
    }
  };

  useEffect(() => {
    void fetchProducts();
    void fetchCategories();
  }, []);

  // Tự động cập nhật mã gợi ý khi danh sách thay đổi (chỉ khi đang ở chế độ thêm mới)
  useEffect(() => {
    if (!form.id) {
      setForm((prev) => ({ ...prev, code: generateNextCode(products) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string }>).detail;
      if (detail?.type === "catalogChanged" || detail?.type === "inventoryChanged") {
        void fetchProducts();
      }
    };

    window.addEventListener("hkd:realtime", handleRealtime as EventListener);
    return () => window.removeEventListener("hkd:realtime", handleRealtime as EventListener);
  }, []);

  // Tối ưu Time Complexity: Sử dụng debounce để giảm số lần tính toán lại khi gõ phím
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const processedProducts = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();
    let result = products;

    if (keyword) {
      result = products.filter(
        (p) =>
          p.code.toLowerCase().includes(keyword) ||
          p.name.toLowerCase().includes(keyword) ||
          (p.categoryName || "").toLowerCase().includes(keyword),
      );
    }

    // Tối ưu: Sắp xếp theo ID giảm dần để hiện hàng mới nhất lên đầu
    return [...result].sort((a, b) => b.id - a.id);
  }, [products, debouncedSearch]);

  const totalPages = Math.ceil(processedProducts.length / pageSize);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedProducts.slice(startIndex, startIndex + pageSize);
  }, [processedProducts, currentPage]);

  // Reset về trang 1 khi tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/products/${form.id}`, { ...form, id: form.id });
      } else {
        await api.post("/products", form);
      }
      // Reset form, mã sẽ được tự cập nhật bởi useEffect theo products
      setForm({ ...emptyForm, code: generateNextCode(products) });
      await fetchProducts();
    } catch (error) {
      console.error("Lỗi lưu sản phẩm:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa mềm sản phẩm này? Dữ liệu giao dịch cũ vẫn được giữ."))
      return;
    await api.delete(`/products/${id}`);
    await fetchProducts();
  };

  // Tối ưu Space Complexity: Tránh định nghĩa lại hàm formatCurrency ở mỗi lượt render
  const formatCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount),
    [],
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 pb-20 sm:space-y-5 md:space-y-6 md:px-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="app-kicker mb-2">Danh mục bán hàng</p>
          <h1 className="app-title text-2xl font-black tracking-tight uppercase md:text-3xl">
            Kho hàng hóa
          </h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">
            Danh mục, giá vốn, giá bán và ngưỡng tồn tối thiểu.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="app-panel-strong grid animate-in grid-cols-1 gap-4 slide-in-from-top-10 p-4 sm:p-5 md:grid-cols-2 md:p-6 lg:grid-cols-12"
      >
        {/* Mã & Tên sản phẩm */}
        <div className="md:col-span-1 lg:col-span-4 space-y-1">
          <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">
            Mã & Tên sản phẩm
          </label>
          <div className="flex gap-2">
            <div className="relative w-1/3 min-w-[86px]">
              <input
                id="product-code"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SP001"
                className="app-control w-full px-3 py-3 text-sm font-bold uppercase md:px-4"
                title={form.id ? "Mã sản phẩm" : "Mã được gợi ý tự động, bạn có thể tự chỉnh"}
              />
              {!form.id && (
                <span
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-500"
                >
                  Auto
                </span>
              )}
            </div>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tên sản phẩm..."
              className="app-control flex-1 px-4 py-3 text-sm font-bold"
            />
          </div>
        </div>

        {/* Phân loại & Đơn vị (Đã tách riêng layout flex linh hoạt) */}
        <div className="md:col-span-1 lg:col-span-4 space-y-1">
          <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">
            Phân loại & Đơn vị
          </label>
          <div className="flex flex-row gap-2">
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
              className="app-control min-w-0 flex-[2] px-4 py-3 text-sm font-bold"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="ĐVT (vd: kg, gói, chai...)"
              className="app-control min-w-[86px] flex-[1] px-3 py-3 text-center text-sm font-bold md:px-4 md:text-left"
            />
          </div>
        </div>

        {/* Giá vốn & Giá bán */}
        <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">
              Giá vốn
            </label>
            <input
              type="number"
              min="0"
              value={form.costPrice || ""}
              onChange={(e) =>
                setForm({ ...form, costPrice: Number(e.target.value) })
              }
              placeholder="0"
              className="app-control w-full px-4 py-3 text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-1">
            <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">
              Giá bán
            </label>
            <input
              type="number"
              min="0"
              value={form.sellPrice || ""}
              onChange={(e) =>
                setForm({ ...form, sellPrice: Number(e.target.value) })
              }
              placeholder="0"
              className="app-control w-full px-4 py-3 text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Nút Submit */}
        <div className="md:col-span-2 lg:col-span-12 flex flex-col md:flex-row justify-end gap-2 mt-2">
          {form.id && (
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="app-button-secondary w-full border-2 py-3 text-[10px] font-black uppercase tracking-widest md:w-32"
            >
              Hủy
            </button>
          )}
          <button
            disabled={saving}
            className="app-button-primary min-h-12 w-full py-3 text-xs font-black uppercase tracking-widest md:w-48"
          >
            {saving ? "..." : form.id ? "Cập nhật" : "Thêm mới"}
          </button>
        </div>
      </form>

      <div className="app-panel-strong overflow-hidden animate-in fade-in duration-500 md:rounded-[2rem]">
        <div className="flex flex-col gap-4 bg-[color:var(--surface-2)]/80 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
          <div className="relative flex-1 max-w-2xl">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, mã, loại..."
              className="app-control w-full py-3 pl-4 pr-10 text-sm font-bold"
            />
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-app-soft">
            Tổng: {processedProducts.length} mặt hàng
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-3xl bg-[color:var(--surface-3)]" />
            ))
          ) : paginatedProducts.length === 0 ? (
            <p className="py-14 text-center text-sm font-bold uppercase tracking-widest text-app-soft">Chưa có sản phẩm nào</p>
          ) : (
            paginatedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setForm(product)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setForm(product);
                }}
                className={`app-list-item w-full border-2 p-4 text-left transition-all active:scale-[0.99] ${form.id === product.id ? "border-blue-200 bg-[color:var(--brand-surface)]" : "border-transparent shadow-sm"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-app-soft">{product.code}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-black text-app-strong">{product.name}</p>
                    <p className="mt-2 text-xs font-bold text-app-muted">{product.categoryName || "Chưa phân loại"}</p>
                  </div>
                  <span className={`shrink-0 rounded-2xl px-3 py-1.5 text-[10px] font-black uppercase ${product.stock <= product.minStock ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {product.stock} {product.unit}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-app-soft">Giá bán</p>
                    <p className="text-base font-black text-blue-600">{formatCurrency(product.sellPrice)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(product.id);
                    }}
                    className="touch-target rounded-2xl bg-red-50 text-red-500"
                    title="Xóa sản phẩm"
                  >
                    <Trash2 className="mx-auto h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Independent Scrollable Table Container */}
        <div className="hidden max-h-[60vh] overflow-x-auto overflow-y-auto md:block lg:max-h-[600px]">
          <table className="w-full min-w-[800px] md:min-w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                  Sản phẩm
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest hidden md:table-cell">
                  Danh mục
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                  Giá bán
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest hidden lg:table-cell">
                  Giá vốn
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                  Tồn kho
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)] bg-app-surface">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center font-bold text-app-soft animate-pulse"
                  >
                    ĐANG TẢI DỮ LIỆU...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center font-bold uppercase tracking-widest text-app-soft"
                  >
                    Chưa có sản phẩm nào
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => setForm(product)}
                    className={`group cursor-pointer transition-all hover:bg-[color:var(--brand-surface)] ${form.id === product.id ? "bg-[color:var(--brand-surface)]" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-app-soft">
                          {product.code}
                        </span>
                        <span className="text-sm font-black text-app-strong transition-colors group-hover:text-blue-600">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="rounded-lg bg-[color:var(--surface-3)] px-2 py-1 text-xs font-bold text-app-muted">
                        {product.categoryName || "Chưa phân loại"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-blue-600 tracking-tight">
                        {formatCurrency(product.sellPrice)}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden font-bold italic text-app-soft lg:table-cell">
                      {formatCurrency(product.costPrice)}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${product.stock <= product.minStock ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${product.stock <= product.minStock ? "bg-red-500" : "bg-emerald-500"}`}
                        />
                        {product.stock} {product.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product.id);
                          }}
                          className="rounded-xl p-2 text-app-soft transition-all hover:bg-red-50 hover:text-red-500"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
