"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Tag, Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import StatePagination from "@/components/ui/StatePagination";

interface Category {
  id: number;
  name: string;
  description: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: 0, name: "", description: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await api.get<Category[]>("/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Lỗi tải danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/categories/${form.id}`, form);
        toast.success("Cập nhật danh mục thành công!");
      } else {
        await api.post("/categories", form);
        toast.success("Thêm danh mục thành công!");
      }
      setForm({ id: 0, name: "", description: "" });
      fetchCategories();
    } catch (error) {
      console.error("Lỗi lưu danh mục:", error);
      const err = error as { response?: { data?: string } };
      toast.error(err.response?.data || "Lỗi khi lưu danh mục!");
    } finally {
      setSaving(false);
    }
  };

  const processedCategories = useMemo(() => {
    let result = categories;
    if (search) {
      result = result.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }
    return [...result].sort((a, b) => b.id - a.id);
  }, [categories, search]);

  const totalPages = Math.ceil(processedCategories.length / pageSize);

  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedCategories.slice(startIndex, startIndex + pageSize);
  }, [processedCategories, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="app-kicker mb-2">Cấu trúc phân loại</p>
        <h1 className="app-title text-3xl font-black uppercase">Danh mục</h1>
        <p className="text-sm font-semibold text-app-muted">Quản lý các nhóm hàng hóa để tối ưu hóa báo cáo và tìm kiếm.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* Form */}
        <div className="app-panel-strong p-6 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black uppercase">{form.id ? "Sửa danh mục" : "Thêm danh mục mới"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">Tên danh mục</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="vd: Cà phê, Trà sữa..."
                className="app-control w-full px-4 py-3 text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">Mô tả</label>
              <textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Mô tả ngắn..."
                rows={3}
                className="app-control w-full px-4 py-3 text-xs font-bold resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              {form.id > 0 && (
                <button 
                  type="button"
                  onClick={() => setForm({ id: 0, name: "", description: "" })}
                  className="app-button-secondary flex-1 py-3 text-[10px] font-black uppercase"
                >
                  Hủy
                </button>
              )}
              <button 
                disabled={saving}
                className="app-button-primary flex-[2] py-3 text-[10px] font-black uppercase tracking-widest"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (form.id ? "CẬP NHẬT" : "LƯU DANH MỤC")}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-app-soft group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Tìm danh mục..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="app-control w-full py-3.5 pl-11 pr-4 text-sm font-bold"
            />
          </div>

          <div className="app-panel-strong overflow-hidden">
            <div className="divide-y divide-app">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-6 animate-pulse space-y-2">
                    <div className="h-4 w-32 bg-app-surface rounded-md" />
                    <div className="h-3 w-48 bg-app-surface rounded-md" />
                  </div>
                ))
              ) : paginatedCategories.length === 0 ? (
                <div className="p-12 text-center text-app-soft uppercase text-xs font-black tracking-widest">
                  Không tìm thấy danh mục nào
                </div>
              ) : (
                paginatedCategories.map(cat => (
                  <div key={cat.id} className="p-4 md:p-6 flex items-center justify-between group hover:bg-app-surface/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-app-strong">{cat.name}</h3>
                        <p className="text-xs text-app-muted font-medium">{cat.description || "Không có mô tả"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setForm(cat)}
                        className="p-2 text-app-soft hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <StatePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
