"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  Star,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import StatePagination from "@/components/ui/StatePagination";
import toast from "react-hot-toast";

interface Branch {
  id: number;
  tenantId: number;
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
}

interface BranchForm {
  id?: number;
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
}

const emptyForm: BranchForm = {
  name: "",
  address: "",
  phone: "",
  isMain: false,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await api.get<Branch[]>("/branches");
      setBranches(response.data);
    } catch (err) {
      const errMsg = getApiErrorMessage(err, "Không tải được danh sách chi nhánh.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBranches();
  }, []);

  const processedBranches = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const result = keyword
      ? branches.filter((branch) =>
          branch.name.toLowerCase().includes(keyword) ||
          branch.address.toLowerCase().includes(keyword) ||
          branch.phone.toLowerCase().includes(keyword),
        )
      : branches;

    return [...result].sort((a, b) => {
      if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [branches, searchTerm]);

  const totalPages = Math.ceil(processedBranches.length / pageSize);
  const paginatedBranches = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedBranches.slice(startIndex, startIndex + pageSize);
  }, [currentPage, processedBranches]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const stats = useMemo(
    () => ({
      total: branches.length,
      main: branches.filter((branch) => branch.isMain).length,
      operational: branches.filter((branch) => !branch.isMain).length,
    }),
    [branches],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  const selectBranch = (branch: Branch) => {
    setMessage("");
    setError("");
    setForm({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isMain: branch.isMain,
    });
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      isMain: form.isMain,
    };

    try {
      if (form.id) {
        await api.put(`/branches/${form.id}`, payload);
        const msg = "Đã cập nhật chi nhánh.";
        setMessage(msg);
        toast.success(msg);
      } else {
        await api.post("/branches", payload);
        const msg = "Đã tạo chi nhánh mới.";
        setMessage(msg);
        toast.success(msg);
        setForm(emptyForm);
      }

      await fetchBranches();
    } catch (err) {
      const errMsg = getApiErrorMessage(err, "Không lưu được chi nhánh.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-20 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700">
            <Building2 className="h-4 w-4" />
            Cửa hàng chính
          </div>
          <h1 className="app-title flex items-center gap-3 text-3xl font-black tracking-tight">
            <Building2 className="h-8 w-8 text-blue-600" />
            Quản lý chi nhánh
          </h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">Tạo và cập nhật các chi nhánh thuộc cửa hàng chính hiện tại.</p>
        </div>
        <button
          onClick={resetForm}
          className="app-button-primary flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest"
        >
          <Plus className="h-4 w-4" />
          Tạo mới
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-2xl border p-4 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
        {([
          ["Tổng chi nhánh", stats.total, Building2, "bg-blue-50 text-blue-600"],
          ["Chi nhánh chính", stats.main, Star, "bg-amber-50 text-amber-600"],
          ["Chi nhánh vận hành", stats.operational, CheckCircle2, "bg-emerald-50 text-emerald-600"],
        ] as Array<[string, number, LucideIcon, string]>).map(([label, value, Icon, color]) => (
          <div key={String(label)} className="app-kpi-card p-5">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl p-3 ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-app-soft">{label}</p>
                <p className="text-2xl font-black text-app-strong">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submitForm} className="app-panel-strong p-4 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-app-strong">{form.id ? "Cập nhật chi nhánh" : "Tạo chi nhánh"}</h2>
              <p className="text-xs font-bold text-app-soft">Chi nhánh chỉ được tạo trong cửa hàng chính hiện tại.</p>
            </div>
            {form.id && (
              <button type="button" onClick={resetForm} className="app-button-ghost touch-target" aria-label="Hủy sửa">
                <X className="mx-auto h-5 w-5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Tên chi nhánh</label>
              <input
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="app-control w-full px-4 text-sm font-bold"
                placeholder="Chi nhánh Quận 1"
              />
            </div>
            <div>
              <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Số điện thoại</label>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="app-control w-full px-4 text-sm font-bold"
                placeholder="0900000000"
              />
            </div>
            <div>
              <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Địa chỉ</label>
              <textarea
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
                className="app-control min-h-24 w-full resize-none px-4 py-3 text-sm font-bold"
                placeholder="Địa chỉ vận hành của chi nhánh"
              />
            </div>
            <label className="app-panel-subtle flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-app-base">
              <input
                className="h-5 w-5"
                type="checkbox"
                checked={form.isMain}
                onChange={(event) => setForm({ ...form, isMain: event.target.checked })}
              />
              Đặt làm chi nhánh chính
            </label>
            <button disabled={saving} className="app-button-primary flex min-h-12 w-full items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {form.id ? "Lưu thay đổi" : "Tạo chi nhánh"}
            </button>
          </div>
        </form>

        <div className="app-panel-strong overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-app bg-[color:var(--surface-2)]/80 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-soft" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="app-control w-full py-3 pl-11 pr-4 text-sm font-bold"
                placeholder="Tìm theo tên, địa chỉ, số điện thoại..."
              />
            </div>
            <button onClick={() => void fetchBranches()} className="app-button-secondary px-4 text-xs font-black uppercase tracking-widest">Làm mới</button>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-[color:var(--surface-3)]" />)
            ) : paginatedBranches.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold uppercase tracking-widest text-app-soft">Không tìm thấy chi nhánh</p>
            ) : (
              paginatedBranches.map((branch) => (
                <div key={branch.id} className="app-list-item border border-app p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-app-strong">{branch.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-app-muted">
                        <MapPin className="h-3.5 w-3.5" />
                        {branch.address || "Chưa có địa chỉ"}
                      </p>
                    </div>
                    {branch.isMain && <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-amber-700">Chính</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 text-app-muted"><Phone className="h-4 w-4" />{branch.phone || "Chưa có SĐT"}</span>
                    <button onClick={() => selectBranch(branch)} className="min-h-11 rounded-2xl bg-blue-50 px-4 text-xs font-black text-blue-600">Sửa</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden max-h-[680px] overflow-auto md:block">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Chi nhánh</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Liên hệ</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Vai trò</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-widest">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--panel-border)]">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-20 text-center font-bold text-app-soft"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />Đang tải...</td></tr>
                ) : paginatedBranches.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-20 text-center font-bold text-app-soft">Không tìm thấy chi nhánh</td></tr>
                ) : (
                  paginatedBranches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-[color:var(--surface-2)]">
                      <td className="px-6 py-5">
                        <p className="font-black text-app-strong">{branch.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-app-muted"><MapPin className="h-3.5 w-3.5" />{branch.address || "Chưa có địa chỉ"}</p>
                      </td>
                      <td className="px-6 py-5 text-sm font-semibold text-app-muted">{branch.phone || "Chưa có SĐT"}</td>
                      <td className="px-6 py-5">
                        {branch.isMain ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            <Star className="h-3.5 w-3.5" />
                            Chi nhánh chính
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Vận hành
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end">
                          <button onClick={() => selectBranch(branch)} className="touch-target rounded-2xl bg-blue-50 text-blue-600" title="Sửa">
                            <Edit2 className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <StatePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
}
