"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Users, Plus, Edit2, Search, Loader2, Phone, MapPin, TrendingUp } from "lucide-react";
import StatePagination from "@/components/ui/StatePagination";

interface Customer {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  totalSpent: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id: 0, fullName: "", phone: "", address: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get<Customer[]>("/customers");
      setCustomers(response.data);
    } catch (error) {
      console.error("Lỗi tải khách hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone) return;
    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/customers/${form.id}`, form);
      } else {
        await api.post("/customers", form);
      }
      setForm({ id: 0, fullName: "", phone: "", address: "" });
      fetchCustomers();
    } catch (error) {
      console.error("Lỗi lưu khách hàng:", error);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

  const processedCustomers = useMemo(() => {
    let result = customers;
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter(c => 
        c.fullName.toLowerCase().includes(keyword) || 
        c.phone.includes(search)
      );
    }
    return [...result].sort((a, b) => b.id - a.id);
  }, [customers, search]);

  const totalPages = Math.ceil(processedCustomers.length / pageSize);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedCustomers.slice(startIndex, startIndex + pageSize);
  }, [processedCustomers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="app-kicker mb-2">Quản lý quan hệ</p>
          <h1 className="app-title text-3xl font-black uppercase tracking-tight">Khách hàng</h1>
          <p className="text-sm font-semibold text-app-muted">Lưu trữ thông tin và theo dõi mức độ thân thiết của khách hàng.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Form */}
        <div className="app-panel-strong p-6 h-fit lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-black uppercase">{form.id ? "Sửa thông tin" : "Thêm khách hàng"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">Họ và tên</label>
              <input
                required
                value={form.fullName}
                onChange={e => setForm({...form, fullName: e.target.value})}
                placeholder="vd: Nguyễn Văn A..."
                className="app-control w-full px-4 py-3 text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">Số điện thoại</label>
              <input
                required
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="090..."
                className="app-control w-full px-4 py-3 text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-widest text-app-soft">Địa chỉ</label>
              <textarea
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Địa chỉ giao hàng..."
                rows={2}
                className="app-control w-full px-4 py-3 text-xs font-bold resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              {form.id > 0 && (
                <button 
                  type="button"
                  onClick={() => setForm({ id: 0, fullName: "", phone: "", address: "" })}
                  className="app-button-secondary flex-1 py-3 text-[10px] font-black uppercase"
                >
                  Hủy
                </button>
              )}
              <button 
                disabled={saving}
                className="app-button-primary flex-[2] py-3 text-[10px] font-black uppercase tracking-widest"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (form.id ? "CẬP NHẬT" : "LƯU KHÁCH HÀNG")}
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
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="app-control w-full py-4 pl-11 pr-4 text-sm font-bold"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 app-panel-strong animate-pulse" />
              ))
            ) : paginatedCustomers.length === 0 ? (
              <div className="sm:col-span-2 p-12 text-center text-app-soft uppercase text-xs font-black tracking-widest">
                Chưa có dữ liệu khách hàng
              </div>
            ) : (
              paginatedCustomers.map(cust => (
                <div key={cust.id} className="app-panel-strong group p-5 hover:border-blue-200 transition-all cursor-pointer" onClick={() => setForm(cust)}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center font-black text-lg">
                        {cust.fullName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-app-strong">{cust.fullName}</h3>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                          <Phone className="w-2.5 h-2.5" /> {cust.phone}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-app-soft uppercase tracking-widest mb-1">Tổng chi tiêu</p>
                      <div className="flex items-center justify-end gap-1 text-sm font-black text-emerald-600">
                        <TrendingUp className="w-3.5 h-3.5" /> {fmt(cust.totalSpent)}
                      </div>
                    </div>
                  </div>
                  {cust.address && (
                    <div className="flex items-start gap-2 pt-3 border-t border-app text-[10px] font-bold text-app-muted">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="line-clamp-1">{cust.address}</span>
                    </div>
                  )}
                </div>
              ))
            )}
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
