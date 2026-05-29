"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "@/lib/axios";
import toast from "react-hot-toast";
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchNextCode = async () => {
    try {
      const response = await api.get<{ nextCode: string }>("/products/next-code");
      const code = response.data.nextCode;
      setForm((prev) => {
        if (!prev.id) {
          return { ...prev, code };
        }
        return prev;
      });
    } catch (error) {
      console.error("Lỗi khi tải mã gợi ý:", error);
    }
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Product[]>("/products", {
        params: { deletedOnly: activeTab === "trash" }
      });
      setProducts(response.data);
      setSelectedIds([]); // Reset bulk selection on data reload
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

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
    void fetchNextCode();
  }, [fetchProducts]);

  // Tự động cập nhật mã gợi ý khi danh sách thay đổi (chỉ khi đang ở chế độ thêm mới)
  useEffect(() => {
    if (!form.id) {
      void fetchNextCode();
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
  }, [fetchProducts]);

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
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        await api.post("/products", form);
        toast.success("Thêm sản phẩm thành công!");
      }
      // Reset form, mã sẽ được tự cập nhật bởi fetchNextCode
      setForm(emptyForm);
      await fetchProducts();
      await fetchNextCode();
    } catch (error) {
      console.error("Lỗi lưu sản phẩm:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi lưu sản phẩm!");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa mềm sản phẩm này? Dữ liệu giao dịch cũ vẫn được giữ."))
      return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Xóa sản phẩm thành công!");
      await fetchProducts();
    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi xóa sản phẩm!");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/products/${id}/restore`);
      toast.success("Khôi phục sản phẩm thành công!");
      await fetchProducts();
      await fetchNextCode();
    } catch (error) {
      console.error("Lỗi khôi phục sản phẩm:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi khôi phục sản phẩm!");
    }
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Khôi phục ${selectedIds.length} sản phẩm đã chọn?`)) return;
    try {
      await api.post("/products/bulk-restore", selectedIds);
      toast.success("Khôi phục các sản phẩm thành công!");
      setSelectedIds([]);
      await fetchProducts();
      await fetchNextCode();
    } catch (error) {
      console.error("Lỗi khôi phục hàng loạt sản phẩm:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi khôi phục hàng loạt!");
    }
  };

  const handleDeletePermanently = async (id: number) => {
    if (!confirm("CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN sản phẩm này ra khỏi cơ sở dữ liệu. Bạn có chắc chắn muốn tiếp tục?"))
      return;
    try {
      await api.delete(`/products/${id}/permanent`);
      toast.success("Xóa vĩnh viễn sản phẩm thành công!");
      await fetchProducts();
      await fetchNextCode();
    } catch (error) {
      console.error("Lỗi xóa vĩnh viễn sản phẩm:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi xóa vĩnh viễn sản phẩm!");
    }
  };

  const handleBulkDeletePermanently = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`CẢNH BÁO: Bạn đang chọn XÓA VĨNH VIỄN ${selectedIds.length} sản phẩm. Hành động này không thể hoàn tác. Tiếp tục?`))
      return;
    try {
      await api.post("/products/bulk-delete-permanent", selectedIds);
      toast.success("Xóa vĩnh viễn các sản phẩm thành công!");
      setSelectedIds([]);
      await fetchProducts();
      await fetchNextCode();
    } catch (error) {
      console.error("Lỗi xóa vĩnh viễn hàng loạt sản phẩm:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi xóa vĩnh viễn hàng loạt!");
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredIds: number[]) => {
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const unique = new Set([...prev, ...filteredIds]);
        return Array.from(unique);
      });
    }
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
        {/* Cột: Mã + Tên sản phẩm */}
        <div className="md:col-span-1 lg:col-span-4 space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] pl-2 font-black uppercase tracking-widest text-app-soft">
                Mã sản phẩm
              </label>
              <div className="relative">
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
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-500">
                    Auto
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] pl-2 font-black uppercase tracking-widest text-app-soft">
                Tên sản phẩm
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tên sản phẩm..."
                className="app-control w-full px-4 py-3 text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* Cột: Phân loại + Đơn vị */}
        <div className="md:col-span-1 lg:col-span-4 space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] pl-2 font-black uppercase tracking-widest text-app-soft">
                Phân loại
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="app-control w-full px-4 py-3 text-sm font-bold"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] pl-2 font-black uppercase tracking-widest text-app-soft">
                Đơn vị tính
              </label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="VD: kg, gói, chai..."
                className="app-control w-full px-3 py-3 text-center text-sm font-bold md:px-4 md:text-left"
              />
            </div>
          </div>
        </div>

        {/* Cột: Giá vốn & Giá bán (giữ nguyên như cũ) */}
        <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] pl-2 font-black uppercase tracking-widest text-app-soft">
              Giá vốn
            </label>
            <input
              type="number"
              min="0"
              value={form.costPrice || ""}
              onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
              placeholder="0"
              className="app-control w-full px-4 py-3 text-sm font-bold [appearance:textfield]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] pl-2 font-black uppercase tracking-widest text-app-soft">
              Giá bán
            </label>
            <input
              type="number"
              min="0"
              value={form.sellPrice || ""}
              onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
              placeholder="0"
              className="app-control w-full px-4 py-3 text-sm font-bold [appearance:textfield]"
            />
          </div>
        </div>

        {/* Nút submit */}
        <div className="md:col-span-2 lg:col-span-12 flex flex-col md:flex-row justify-end gap-2 mt-2">
          {form.id && (
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                void fetchNextCode();
              }}
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
        {/* Tab switch & Bulk actions */}
        <div className="flex flex-wrap items-center justify-between border-b border-[color:var(--panel-border)] bg-[color:var(--surface-2)]/30 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("active");
                setSelectedIds([]);
              }}
              className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "active"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-app-muted hover:bg-[color:var(--surface-3)] hover:text-app-strong"
                }`}
            >
              Đang hoạt động
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("trash");
                setSelectedIds([]);
              }}
              className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-200 ${activeTab === "trash"
                ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                : "text-app-muted hover:bg-[color:var(--surface-3)] hover:text-app-strong"
                }`}
            >
              Thùng rác (Xóa mềm)
            </button>
          </div>
          {activeTab === "trash" && selectedIds.length > 0 && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBulkRestore}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Khôi phục ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={handleBulkDeletePermanently}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Xóa vĩnh viễn ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 bg-[color:var(--surface-2)]/80 p-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:p-6">
          <div className="relative flex-1 max-w-2xl">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={activeTab === "trash" ? "Tìm kiếm trong thùng rác..." : "Tìm theo tên, mã, loại..."}
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
            paginatedProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => {
                    if (activeTab === "trash") {
                      handleToggleSelect(product.id);
                    } else {
                      setForm(product);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      if (activeTab === "trash") {
                        handleToggleSelect(product.id);
                      } else {
                        setForm(product);
                      }
                    }
                  }}
                  className={`app-list-item w-full border-2 p-4 text-left transition-all active:scale-[0.99] ${activeTab === "trash"
                    ? isSelected
                      ? "border-emerald-500 bg-emerald-50/10 shadow-md"
                      : "border-transparent shadow-sm"
                    : form.id === product.id
                      ? "border-blue-200 bg-[color:var(--brand-surface)]"
                      : "border-transparent shadow-sm"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {activeTab === "trash" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(product.id);
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-app-soft">{product.code}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-black text-app-strong">{product.name}</p>
                        <p className="mt-2 text-xs font-bold text-app-muted">{product.categoryName || "Chưa phân loại"}</p>
                      </div>
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
                    {activeTab === "trash" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRestore(product.id);
                          }}
                          className="touch-target rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          title="Khôi phục sản phẩm"
                        >
                          <svg
                            className="mx-auto h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeletePermanently(product.id);
                          }}
                          className="touch-target rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 className="mx-auto h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(product.id);
                        }}
                        className="touch-target rounded-2xl bg-red-50 text-red-500 hover:bg-red-100"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="mx-auto h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Independent Scrollable Table Container */}
        <div className="hidden max-h-[60vh] overflow-x-auto overflow-y-auto md:block lg:max-h-[600px]">
          <table className="w-full min-w-[800px] md:min-w-full text-left text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white">
              <tr>
                {activeTab === "trash" && (
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={
                        processedProducts.length > 0 &&
                        processedProducts.every((p) => selectedIds.includes(p.id))
                      }
                      onChange={() => handleSelectAll(processedProducts.map((p) => p.id))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                  </th>
                )}
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
                    colSpan={activeTab === "trash" ? 7 : 6}
                    className="px-6 py-20 text-center font-bold text-app-soft animate-pulse"
                  >
                    ĐANG TẢI DỮ LIỆU...
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "trash" ? 7 : 6}
                    className="px-6 py-20 text-center font-bold uppercase tracking-widest text-app-soft"
                  >
                    Chưa có sản phẩm nào
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <tr
                      key={product.id}
                      onClick={() => {
                        if (activeTab === "trash") {
                          handleToggleSelect(product.id);
                        } else {
                          setForm(product);
                        }
                      }}
                      className={`group cursor-pointer transition-all hover:bg-[color:var(--brand-surface)] ${activeTab === "trash"
                        ? isSelected
                          ? "bg-emerald-50/10 hover:bg-emerald-50/20"
                          : ""
                        : form.id === product.id
                          ? "bg-[color:var(--brand-surface)]"
                          : ""
                        }`}
                    >
                      {activeTab === "trash" && (
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(product.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                        </td>
                      )}
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
                          {activeTab === "trash" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleRestore(product.id);
                                }}
                                className="rounded-xl p-2 text-emerald-600 transition-all hover:bg-emerald-50 hover:text-emerald-700"
                                title="Khôi phục sản phẩm"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeletePermanently(product.id);
                                }}
                                className="rounded-xl p-2 text-red-500 transition-all hover:bg-red-50 hover:text-red-700"
                                title="Xóa vĩnh viễn"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
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
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
