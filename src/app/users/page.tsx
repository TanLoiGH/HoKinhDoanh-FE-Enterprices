"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Edit2,
  Loader2,
  Mail,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import api from "@/lib/api";
import StatePagination from "@/components/ui/StatePagination";
import toast from "react-hot-toast";

type Role = "Admin" | "Cashier" | "Warehouse";

interface UserListItem {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  branchId: number | null;
  isActive: boolean;
  branchName: string | null;
}

interface UserForm {
  id?: number;
  email: string;
  fullName: string;
  password: string;
  role: Role;
  branchId: string;
  isActive: boolean;
}

const emptyForm: UserForm = {
  email: "",
  fullName: "",
  password: "",
  role: "Cashier",
  branchId: "1",
  isActive: true,
};

const roleLabel: Record<Role, string> = {
  Admin: "Quản trị",
  Cashier: "Thu ngân",
  Warehouse: "Thủ kho",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<UserListItem[]>("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách người dùng.");
      toast.error("Không tải được danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchUsers);
  }, [fetchUsers]);

  const processedUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    let result = users;
    if (keyword) {
      result = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(keyword) ||
          u.email.toLowerCase().includes(keyword) ||
          u.role.toLowerCase().includes(keyword),
      );
    }
    return [...result].sort((a, b) => b.id - a.id);
  }, [searchTerm, users]);

  const totalPages = Math.ceil(processedUsers.length / pageSize);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedUsers.slice(startIndex, startIndex + pageSize);
  }, [processedUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      admins: users.filter((u) => u.role === "Admin").length,
    }),
    [users],
  );

  const selectUser = (user: UserListItem) => {
    setMessage("");
    setError("");
    setForm({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      password: "",
      role: user.role,
      branchId: String(user.branchId ?? 1),
      isActive: user.isActive,
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  const apiErrorMessage = (err: unknown, fallback: string) => {
    const responseError = err as { response?: { data?: string } };
    return responseError.response?.data || fallback;
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        role: form.role,
        branchId: Number(form.branchId || 1),
        isActive: form.isActive,
      };

      if (form.id) {
        await api.put(`/users/${form.id}`, payload);
        const msg = "Đã cập nhật người dùng.";
        setMessage(msg);
        toast.success(msg);
      } else {
        await api.post("/users", {
          ...payload,
          email: form.email.trim(),
          password: form.password,
        });
        const msg = "Đã tạo người dùng mới.";
        setMessage(msg);
        toast.success(msg);
        setForm(emptyForm);
      }
      await fetchUsers();
    } catch (err) {
      const errMsg = apiErrorMessage(err, "Không lưu được người dùng.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (user: UserListItem) => {
    if (!confirm(`Khóa tài khoản "${user.fullName}"?`)) return;
    setMessage("");
    setError("");
    try {
      await api.delete(`/users/${user.id}`);
      const msg = "Đã khóa tài khoản.";
      setMessage(msg);
      toast.success(msg);
      await fetchUsers();
      if (form.id === user.id) resetForm();
    } catch (err) {
      const errMsg = apiErrorMessage(err, "Không khóa được tài khoản.");
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  const toggleUserStatus = async (user: UserListItem) => {
    setMessage("");
    setError("");
    try {
      await api.put(`/users/${user.id}`, {
        fullName: user.fullName,
        role: user.role,
        branchId: user.branchId ?? 1,
        isActive: !user.isActive,
      });
      const msg = user.isActive ? "Đã khóa tài khoản." : "Đã mở lại tài khoản.";
      setMessage(msg);
      toast.success(msg);
      await fetchUsers();
    } catch (err) {
      const errMsg = apiErrorMessage(err, "Không cập nhật trạng thái tài khoản.");
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  const roleBadgeClass = (role: Role) => {
    if (role === "Admin") return "bg-purple-100 text-purple-700";
    if (role === "Warehouse") return "bg-orange-100 text-orange-700";
    return "bg-blue-100 text-blue-700";
  };

  return (
    <div className="space-y-5 pb-20 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-indigo-600">
            <ShieldCheck className="h-4 w-4" />
            Admin
          </div>
          <h1 className="app-title flex items-center gap-3 text-3xl font-black tracking-tight">
            <Users className="h-8 w-8 text-blue-600" />
            Quản lý người dùng
          </h1>
          <p className="mt-1 text-sm font-semibold text-app-muted">Tạo tài khoản, phân quyền và khóa hoặc mở nhân viên.</p>
        </div>
        <button
          onClick={resetForm}
          className="app-button-primary flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-widest"
        >
          <UserPlus className="h-4 w-4" />
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
          ["Tổng nhân viên", stats.total, Users, "bg-blue-50 text-blue-600"],
          ["Đang hoạt động", stats.active, CheckCircle2, "bg-emerald-50 text-emerald-600"],
          ["Quản trị viên", stats.admins, ShieldCheck, "bg-purple-50 text-purple-600"],
        ] as Array<[string, number, LucideIcon, string]>).map(([label, value, Icon, color]) => (
          <div key={label} className="app-kpi-card p-5">
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
              <h2 className="text-lg font-black text-app-strong">{form.id ? "Cập nhật tài khoản" : "Tạo tài khoản"}</h2>
              <p className="text-xs font-bold text-app-soft">{form.id ? "Email không thay đổi sau khi tạo." : "Mật khẩu tối thiểu 6 ký tự."}</p>
            </div>
            {form.id && (
              <button type="button" onClick={resetForm} className="app-button-ghost touch-target">
                <X className="mx-auto h-5 w-5" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Email</label>
              <input
                required
                type="email"
                value={form.email}
                disabled={!!form.id}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="app-control w-full px-4 text-sm font-bold disabled:text-app-soft"
                placeholder="user@hkd.local"
              />
            </div>
            <div>
              <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Họ tên</label>
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                className="app-control w-full px-4 text-sm font-bold"
                placeholder="Nguyễn Văn A"
              />
            </div>
            {!form.id && (
              <div>
                <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Mật khẩu</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  className="app-control w-full px-4 text-sm font-bold"
                  placeholder="Ít nhất 6 ký tự"
                />
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Vai trò</label>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                  className="app-control w-full px-4 text-sm font-bold"
                >
                  <option value="Admin">Quản trị</option>
                  <option value="Cashier">Thu ngân</option>
                  <option value="Warehouse">Thủ kho</option>
                </select>
              </div>
              <div>
                <label className="mb-1 ml-2 block text-[10px] font-black uppercase tracking-widest text-app-soft">Chi nhánh</label>
                <input
                  type="number"
                  min="1"
                  value={form.branchId}
                  onChange={(event) => setForm({ ...form, branchId: event.target.value })}
                  className="app-control w-full px-4 text-sm font-bold"
                />
              </div>
            </div>
            {form.id && (
              <label className="app-panel-subtle flex min-h-12 items-center gap-3 px-4 text-sm font-bold text-app-base">
                <input className="h-5 w-5" type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                Tài khoản đang hoạt động
              </label>
            )}
            <button disabled={saving} className="app-button-primary flex min-h-12 w-full items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {form.id ? "Lưu thay đổi" : "Tạo tài khoản"}
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
                placeholder="Tìm theo tên, email, vai trò..."
              />
            </div>
            <button onClick={() => void fetchUsers()} className="app-button-secondary px-4 text-xs font-black uppercase tracking-widest">Làm mới</button>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-3xl bg-[color:var(--surface-3)]" />)
            ) : paginatedUsers.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold uppercase tracking-widest text-app-soft">Không tìm thấy người dùng</p>
            ) : (
              paginatedUsers.map((user) => (
                <div key={user.id} className="app-list-item border border-app p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-app-strong">{user.fullName}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-app-muted">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${roleBadgeClass(user.role)}`}>{roleLabel[user.role]}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1 text-app-muted"><Building2 className="h-4 w-4" />{user.branchName || `Chi nhánh ${user.branchId ?? 1}`}</span>
                    {user.isActive ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" />Hoạt động</span> : <span className="flex items-center gap-1 text-red-500"><XCircle className="h-4 w-4" />Khóa</span>}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button onClick={() => selectUser(user)} className="min-h-11 rounded-2xl bg-blue-50 px-3 text-xs font-black text-blue-600">Sửa</button>
                    <button onClick={() => void toggleUserStatus(user)} className="app-button-secondary min-h-11 rounded-2xl text-xs font-black">{user.isActive ? "Khóa" : "Mở"}</button>
                    <button onClick={() => void deactivateUser(user)} className="min-h-11 rounded-2xl bg-red-50 px-3 text-xs font-black text-red-600">Xóa</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden max-h-[680px] overflow-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-white">
                <tr>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Người dùng</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Vai trò</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Chi nhánh</th>
                  <th className="px-6 py-4 text-xs uppercase tracking-widest">Trạng thái</th>
                  <th className="px-6 py-4 text-right text-xs uppercase tracking-widest">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--panel-border)]">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-20 text-center font-bold text-app-soft"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />Đang tải...</td></tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-20 text-center font-bold text-app-soft">Không tìm thấy người dùng</td></tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[color:var(--surface-2)]">
                      <td className="px-6 py-5">
                        <p className="font-black text-app-strong">{user.fullName}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-app-muted"><Mail className="h-3.5 w-3.5" />{user.email}</p>
                      </td>
                      <td className="px-6 py-5"><span className={`rounded-full px-3 py-1 text-xs font-black ${roleBadgeClass(user.role)}`}>{roleLabel[user.role]}</span></td>
                      <td className="px-6 py-5 text-sm font-semibold text-app-muted">{user.branchName || `Chi nhánh ${user.branchId ?? 1}`}</td>
                      <td className="px-6 py-5">{user.isActive ? <span className="flex items-center gap-1.5 font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Hoạt động</span> : <span className="flex items-center gap-1.5 font-semibold text-red-500"><XCircle className="h-4 w-4" />Khóa</span>}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => selectUser(user)} className="touch-target rounded-2xl bg-blue-50 text-blue-600" title="Sửa"><Edit2 className="mx-auto h-4 w-4" /></button>
                          <button onClick={() => void toggleUserStatus(user)} className="app-button-secondary min-h-11 rounded-2xl px-3 text-xs font-black">{user.isActive ? "Khóa" : "Mở"}</button>
                          <button onClick={() => void deactivateUser(user)} className="touch-target rounded-2xl bg-red-50 text-red-600" title="Khóa tài khoản"><Trash2 className="mx-auto h-4 w-4" /></button>
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
    </div>
  );
}
