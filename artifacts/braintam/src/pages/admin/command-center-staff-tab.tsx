import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Loader2, XCircle, RefreshCw, MoreVertical, Eye, Pencil, UserCheck,
  UserX, Key, Shield, X, Check, AlertTriangle, Users, UserCheck2,
  GraduationCap, UserMinus,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    ...opts,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface StaffMember {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginDate: string | null;
}

interface StaffListResponse {
  items: StaffMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = ["super_admin","admin","manager","assistant_manager","sales_mentor","academic_mentor","teacher","mentor"] as const;
const DEPARTMENTS = ["Administration","Operations","Ignite","Mastery","Teaching","Support"] as const;

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", manager: "Manager",
  assistant_manager: "Asst. Manager", sales_mentor: "Sales Mentor",
  academic_mentor: "Academic Mentor", teacher: "Teacher", mentor: "Mentor",
};

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  super_admin:       { bg: "#FEF3C7", text: "#92400E" },
  admin:             { bg: "#EDE9FE", text: "#5B21B6" },
  manager:           { bg: "#DBEAFE", text: "#1E40AF" },
  assistant_manager: { bg: "#D1FAE5", text: "#065F46" },
  sales_mentor:      { bg: "#FEE2E2", text: "#991B1B" },
  academic_mentor:   { bg: "#DCFCE7", text: "#166534" },
  mentor:            { bg: "#F3E8FF", text: "#6B21A8" },
  teacher:           { bg: "#E0F2FE", text: "#0C4A6E" },
};

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLES[role] ?? { bg: "#F1F5F9", text: "#475569" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.text }}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-400"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 flex-shrink-0`}
      style={{ background: NAVY, fontSize: size <= 8 ? "11px" : "14px" }}>
      {initials || "?"}
    </div>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose, loading }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onClose: () => void; loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? "bg-red-100" : "bg-blue-50"}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-500" : "text-blue-500"}`} />
          </div>
          <h3 className="font-black text-sm" style={{ color: NAVY }}>{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60 ${danger ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}`}
            style={!danger ? { background: NAVY } : {}}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Modal ────────────────────────────────────────────────────────────────
function ViewModal({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Staff Profile</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <Avatar name={staff.name} avatarUrl={staff.avatarUrl} size={12} />
            <div>
              <p className="font-black text-base" style={{ color: NAVY }}>{staff.name}</p>
              <RoleBadge role={staff.role} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Basic Information</p>
            <div className="space-y-2">
              {[
                { label: "Email",      value: staff.email ?? "—" },
                { label: "Phone",      value: staff.phone ?? "—" },
                { label: "Department", value: staff.department ?? "—" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">{r.label}</span>
                  <span className="text-xs text-gray-700">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">System Information</p>
            <div className="space-y-2">
              {[
                { label: "Status",      value: <StatusBadge isActive={staff.isActive} /> },
                { label: "Joined",      value: fmtDate(staff.createdAt) },
                { label: "Last Active", value: timeAgo(staff.lastLoginDate) },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">{r.label}</span>
                  <span className="text-xs text-gray-700">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ staff, onClose, onSaved, flash }: {
  staff: StaffMember; onClose: () => void;
  onSaved: (updated: Partial<StaffMember>) => void;
  flash: (msg: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState(staff.name);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [department, setDepartment] = useState(staff.department ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/staff/${staff.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), phone: phone || null, department: department || null }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed");
      flash("Staff member updated", true);
      onSaved(data.staff);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed", false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Edit Staff Member</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email (read-only)</label>
            <input value={staff.email ?? "—"} readOnly className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">— None —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Role Modal ─────────────────────────────────────────────────────────
function ChangeRoleModal({ staff, onClose, onSaved, flash }: {
  staff: StaffMember; onClose: () => void;
  onSaved: (newRole: string) => void;
  flash: (msg: string, ok?: boolean) => void;
}) {
  const [role, setRole] = useState(staff.role);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (role === staff.role) { onClose(); return; }
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/staff/${staff.id}/change-role`, {
        method: "POST",
        body: JSON.stringify({ role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed");
      flash(`Role changed to ${ROLE_LABELS[role] ?? role}`, true);
      onSaved(role);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Role change failed", false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Change Role</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Avatar name={staff.name} avatarUrl={staff.avatarUrl} />
            <div>
              <p className="text-sm font-bold" style={{ color: NAVY }}>{staff.name}</p>
              <p className="text-xs text-gray-400">Current: <RoleBadge role={staff.role} /></p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">New Role</label>
            <div className="space-y-1">
              {ROLES.map(r => {
                const s = ROLE_STYLES[r];
                return (
                  <button key={r} onClick={() => setRole(r)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${role === r ? "border-2" : "border-gray-100 hover:bg-gray-50"}`}
                    style={role === r ? { borderColor: s.text, background: s.bg, color: s.text } : {}}>
                    <span>{ROLE_LABELS[r]}</span>
                    {role === r && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || role === staff.role}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row Actions Menu ──────────────────────────────────────────────────────────
function ActionsMenu({ staff, onAction }: {
  staff: StaffMember;
  onAction: (action: "view" | "edit" | "toggle-status" | "change-role" | "reset-password") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const actions = [
    { key: "view" as const,           label: "View Profile",    icon: Eye,        color: NAVY    },
    { key: "edit" as const,           label: "Edit Details",    icon: Pencil,     color: "#374151" },
    { key: "toggle-status" as const,  label: staff.isActive ? "Deactivate" : "Activate", icon: staff.isActive ? UserX : UserCheck, color: staff.isActive ? "#EF4444" : GREEN },
    { key: "change-role" as const,    label: "Change Role",     icon: Shield,     color: "#7C3AED" },
    { key: "reset-password" as const, label: "Reset Password",  icon: Key,        color: ORANGE  },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-44">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.key} onClick={() => { setOpen(false); onAction(a.key); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-gray-50 text-left transition-colors"
                style={{ color: a.color }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Staff Management Component ──────────────────────────────────────────
export function StaffManagementView({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [data, setData]           = useState<StaffListResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRole]     = useState("all");
  const [deptFilter, setDept]     = useState("all");
  const [statusFilter, setStatus] = useState("all");
  const [sort, setSort]           = useState("name");
  const [order, setOrder]         = useState<"asc"|"desc">("asc");
  const [page, setPage]           = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [viewStaff, setViewStaff]         = useState<StaffMember | null>(null);
  const [editStaff, setEditStaff]         = useState<StaffMember | null>(null);
  const [changeRoleStaff, setChangeRole]  = useState<StaffMember | null>(null);
  const [toggleStaff, setToggleStaff]     = useState<StaffMember | null>(null);
  const [resetStaff, setResetStaff]       = useState<StaffMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search: debouncedSearch, role: roleFilter, department: deptFilter,
        status: statusFilter, sort, order, page: String(page), limit: "15",
      });
      const r = await apiFetch(`/admin/staff?${params}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, roleFilter, deptFilter, statusFilter, sort, order, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, deptFilter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  function updateStaff(id: number, changes: Partial<StaffMember>) {
    setData(d => d ? { ...d, items: d.items.map(s => s.id === id ? { ...s, ...changes } : s) } : d);
  }

  async function doToggleStatus() {
    if (!toggleStaff) return;
    setActionLoading(true);
    try {
      const r = await apiFetch(`/admin/staff/${toggleStaff.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !toggleStaff.isActive }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      updateStaff(toggleStaff.id, { isActive: !toggleStaff.isActive });
      flash(`${toggleStaff.name} ${toggleStaff.isActive ? "deactivated" : "activated"}`, true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", false);
    } finally {
      setActionLoading(false);
      setToggleStaff(null);
    }
  }

  async function doResetPassword() {
    if (!resetStaff) return;
    setActionLoading(true);
    try {
      const r = await apiFetch(`/admin/staff/${resetStaff.id}/reset-password`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash("Password reset request logged — email integration coming soon", true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", false);
    } finally {
      setActionLoading(false);
      setResetStaff(null);
    }
  }

  function toggleSort(col: string) {
    if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc");
    else { setSort(col); setOrder("asc"); }
  }

  const SortIcon = ({ col }: { col: string }) => (
    sort === col
      ? (order === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />
  );

  const kpis = data ? [
    { label: "Total Staff",    value: data.total,                                   icon: <Users className="w-4 h-4" />,       color: NAVY    },
    { label: "Active",         value: data.items.filter(s => s.isActive).length,    icon: <UserCheck className="w-4 h-4" />,   color: GREEN   },
    { label: "Inactive",       value: data.items.filter(s => !s.isActive).length,   icon: <UserMinus className="w-4 h-4" />,   color: "#EF4444" },
    { label: "Mentors",        value: data.items.filter(s => ["mentor","academic_mentor","sales_mentor"].includes(s.role)).length, icon: <UserCheck2 className="w-4 h-4" />, color: "#7C3AED" },
    { label: "Teachers",       value: data.items.filter(s => s.role === "teacher").length,  icon: <GraduationCap className="w-4 h-4" />, color: "#0284C7" },
    { label: "Managers",       value: data.items.filter(s => ["manager","assistant_manager"].includes(s.role)).length, icon: <Shield className="w-4 h-4" />, color: ORANGE  },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Staff Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">Master directory of all Braintam staff members</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
            <div className="flex justify-center mb-1" style={{ color: k.color }}>{k.icon}</div>
            <div className="text-xl font-black" style={{ color: k.color }}>{loading ? "—" : k.value}</div>
            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
            />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${showFilters ? "bg-navy-50 border-blue-300 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            style={showFilters ? { background: `${NAVY}10`, borderColor: NAVY, color: NAVY } : {}}>
            <Filter className="w-3.5 h-3.5" /> Filters
            {(roleFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            )}
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <select value={roleFilter} onChange={e => setRole(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-400">
              <option value="all">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select value={deptFilter} onChange={e => setDept(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-400">
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-400">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {(roleFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && (
              <button onClick={() => { setRole("all"); setDept("all"); setStatus("all"); }}
                className="text-xs font-semibold text-orange-500 hover:underline px-2">Clear all</button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
            <span className="text-sm">Loading staff…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={load} className="px-4 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>Retry</button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Users className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-semibold">No staff members found</p>
            <p className="text-xs text-gray-300">{search || roleFilter !== "all" || deptFilter !== "all" ? "Try adjusting your filters" : "Add staff members to get started"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { label: "Staff Member", col: "name",       sortable: true  },
                    { label: "Role",         col: "role",       sortable: true  },
                    { label: "Department",   col: "dept",       sortable: false },
                    { label: "Status",       col: "status",     sortable: false },
                    { label: "Joined",       col: "createdAt",  sortable: true  },
                    { label: "Last Active",  col: "lastActive", sortable: true  },
                    { label: "",             col: "actions",    sortable: false },
                  ].map(h => (
                    <th key={h.col} className={`text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${h.sortable ? "cursor-pointer hover:text-gray-600 select-none" : ""}`}
                      onClick={() => h.sortable && toggleSort(h.col)}>
                      <span className="flex items-center gap-1">
                        {h.label}
                        {h.sortable && <SortIcon col={h.col} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} avatarUrl={s.avatarUrl} />
                        <div>
                          <p className="font-semibold text-gray-800">{s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.email ?? s.phone ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={s.role} /></td>
                    <td className="px-4 py-3 text-gray-500">{s.department ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={s.isActive} /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{timeAgo(s.lastLoginDate)}</td>
                    <td className="px-4 py-3">
                      <ActionsMenu staff={s} onAction={action => {
                        if (action === "view")           setViewStaff(s);
                        else if (action === "edit")      setEditStaff(s);
                        else if (action === "toggle-status") setToggleStaff(s);
                        else if (action === "change-role")   setChangeRole(s);
                        else if (action === "reset-password") setResetStaff(s);
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">
            Showing {((data.page - 1) * data.pageSize) + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const pg = data.totalPages <= 5 ? i + 1 : Math.max(1, Math.min(data.page - 2, data.totalPages - 4)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${pg === data.page ? "text-white" : "text-gray-500 hover:bg-gray-50 border border-gray-200"}`}
                  style={pg === data.page ? { background: NAVY } : {}}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={data.page >= data.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {viewStaff   && <ViewModal staff={viewStaff} onClose={() => setViewStaff(null)} />}
      {editStaff   && <EditModal staff={editStaff} onClose={() => setEditStaff(null)} onSaved={u => updateStaff(editStaff.id, u)} flash={flash} />}
      {changeRoleStaff && <ChangeRoleModal staff={changeRoleStaff} onClose={() => setChangeRole(null)} onSaved={r => updateStaff(changeRoleStaff.id, { role: r })} flash={flash} />}
      {toggleStaff && (
        <ConfirmDialog
          title={toggleStaff.isActive ? "Deactivate Staff Member" : "Activate Staff Member"}
          message={toggleStaff.isActive
            ? `${toggleStaff.name} will no longer be able to log in.`
            : `${toggleStaff.name} will regain access to the portal.`}
          confirmLabel={toggleStaff.isActive ? "Deactivate" : "Activate"}
          danger={toggleStaff.isActive}
          onConfirm={doToggleStatus}
          onClose={() => setToggleStaff(null)}
          loading={actionLoading}
        />
      )}
      {resetStaff && (
        <ConfirmDialog
          title="Reset Password"
          message={`Log a password reset request for ${resetStaff.name}? An email will be sent once email integration is configured.`}
          confirmLabel="Confirm Reset"
          onConfirm={doResetPassword}
          onClose={() => setResetStaff(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// ── useDebounce hook ──────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
