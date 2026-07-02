import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Loader2, XCircle, RefreshCw, MoreVertical, Eye, Pencil, UserCheck,
  UserX, Shield, X, Check, AlertTriangle, Users, ArrowLeft,
  TrendingUp, BookOpen, Zap, GraduationCap, UserCheck2, Plus,
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
interface MentorRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  mentorType: string | null;
  normType: string;
  department: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginDate: string | null;
  assignedStudents: number;
  convertedStudents: number;
  conversionPct: number;
}

interface MentorListResponse {
  items: MentorRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis: { totalMentors: number; activeMentors: number; salesMentors: number; academicMentors: number; totalAssigned: number; overallConvPct: number };
}

interface StudentRow {
  id: number;
  name: string;
  phone: string | null;
  grade: number;
  isActive: boolean;
  assignedAt: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MENTOR_TYPES = ["sales_mentor", "academic_mentor"] as const;
const DEPARTMENTS  = ["Administration","Operations","Ignite","Mastery","Teaching","Support"] as const;

const TYPE_META: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  sales_mentor:    { label: "Sales Mentor",    bg: "#FEE2E2", text: "#991B1B", icon: TrendingUp },
  academic_mentor: { label: "Academic Mentor", bg: "#DCFCE7", text: "#166534", icon: BookOpen  },
  mentor:          { label: "Mentor",          bg: "#F3E8FF", text: "#6B21A8", icon: Users     },
};

function MentorTypeBadge({ type }: { type: string }) {
  const m = TYPE_META[type] ?? TYPE_META["mentor"];
  const Icon = m.icon;
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: m.bg, color: m.text }}>
      <Icon className="w-2.5 h-2.5" /> {m.label}
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
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white flex-shrink-0`}
      style={{ background: NAVY, fontSize: size <= 8 ? "11px" : "14px", fontWeight: 900, minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}>
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

function ConvBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 50 ? GREEN : pct >= 25 ? ORANGE : "#EF4444" }} />
      </div>
      <span className="text-xs font-bold" style={{ color: pct >= 50 ? GREEN : pct >= 25 ? ORANGE : "#EF4444" }}>{pct}%</span>
    </div>
  );
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
            className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60`}
            style={{ background: danger ? "#EF4444" : NAVY }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Mentor Modal (CC) ──────────────────────────────────────────────────────
function AddMentorModal({ onClose, onCreated, flash }: {
  onClose: () => void;
  onCreated: () => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", mentorType: "academic" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr("Name, email and password are required.");
      return;
    }
    setSaving(true);
    const r = await apiFetch("/admin/mentors", {
      method: "POST",
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, password: form.password, mentorType: form.mentorType }),
    });
    setSaving(false);
    if (r.ok) { flash(`${form.mentorType === "sales" ? "Sales" : "Academic"} mentor created!`, true); onCreated(); onClose(); }
    else { const j = await r.json().catch(() => ({})); setErr((j as { error?: string }).error ?? "Failed to create mentor."); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-black" style={{ color: NAVY }}>Add Mentor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Create a new Sales (Ignite) or Academic (Mastery) mentor</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {/* Mentor type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mentor Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "sales", label: "⚡ Sales (Ignite)", desc: "Handles demo/enrollment calls" },
                { value: "academic", label: "🎓 Academic (Mastery)", desc: "Handles enrolled students" },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(p => ({ ...p, mentorType: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${form.mentorType === opt.value ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <p className="text-xs font-black" style={{ color: form.mentorType === opt.value ? "#FF6B1A" : "#374151" }}>{opt.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {[
            { label: "Full Name *", key: "name",     type: "text",     placeholder: "e.g. Priya Sharma" },
            { label: "Email *",     key: "email",    type: "email",    placeholder: "priya@braintam.com" },
            { label: "Phone",       key: "phone",    type: "tel",      placeholder: "+91 98765 43210" },
            { label: "Password *",  key: "password", type: "password", placeholder: "Set a login password" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
            </div>
          ))}
          {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-white text-sm font-black disabled:opacity-60 transition-all"
              style={{ background: "#FF6B1A" }}>
              {saving ? "Creating…" : "Create Mentor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ mentor, onClose, onSaved, flash }: {
  mentor: MentorRow; onClose: () => void;
  onSaved: (u: Partial<MentorRow>) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName]           = useState(mentor.name);
  const [email, setEmail]         = useState(mentor.email ?? "");
  const [phone, setPhone]         = useState(mentor.phone ?? "");
  const [department, setDept]     = useState(mentor.department ?? "");
  const [saving, setSaving]       = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/cc/mentors/${mentor.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, phone: phone || null, department: department || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash("Mentor updated", true);
      onSaved(d.mentor);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Update failed", false);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Edit Mentor</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          {[{ label: "Full Name *", val: name, set: setName, placeholder: "Full name", type: "text" },
            { label: "Email",       val: email, set: setEmail, placeholder: "Email address", type: "email" },
            { label: "Phone",       val: phone, set: setPhone, placeholder: "Phone number", type: "tel" }].map(f => (
            <div key={f.label}>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} type={f.type}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Department</label>
            <select value={department} onChange={e => setDept(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">— None —</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Type Modal ─────────────────────────────────────────────────────────
function ChangeTypeModal({ mentor, onClose, onSaved, flash }: {
  mentor: MentorRow; onClose: () => void;
  onSaved: (t: string) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [type, setType] = useState<string>(mentor.normType === "mentor" ? "sales_mentor" : mentor.normType);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/cc/mentors/${mentor.id}/change-type`, {
        method: "POST",
        body: JSON.stringify({ type }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash(`Mentor type changed to ${TYPE_META[type]?.label ?? type}`, true);
      onSaved(type);
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", false);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Change Mentor Type</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Avatar name={mentor.name} avatarUrl={mentor.avatarUrl} />
            <div>
              <p className="text-sm font-bold" style={{ color: NAVY }}>{mentor.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">Current: <MentorTypeBadge type={mentor.normType} /></p>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">New Type</label>
            <div className="space-y-2">
              {MENTOR_TYPES.map(t => {
                const m = TYPE_META[t];
                const Icon = m.icon;
                return (
                  <button key={t} onClick={() => setType(t)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl border transition-colors ${type === t ? "border-2" : "border-gray-100 hover:bg-gray-50"}`}
                    style={type === t ? { borderColor: m.text, background: m.bg, color: m.text } : {}}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold">{m.label}</span>
                    </div>
                    {type === t && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || type === mentor.normType}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mentor Profile Modal ──────────────────────────────────────────────────────
interface ProfileData {
  profile: MentorRow & { normType: string };
  performance: { assignedStudents: number; convertedStudents: number | null; conversionPct: number | null; attendancePct: number | null; homeworkCompletionPct: number | null };
  permissions: { module: string; view: boolean; create: boolean; edit: boolean; del: boolean }[];
  activity: { id: number; action: string; actionLabel: string; module: string; targetName: string; createdAt: string }[];
}

function ProfileModal({ mentorId, onClose }: { mentorId: number; onClose: () => void }) {
  const [data, setData]             = useState<ProfileData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [studentsView, setStudentsView] = useState(false);
  const [students, setStudents]     = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeTab, setActiveTab]   = useState<"performance"|"students"|"permissions"|"activity">("performance");

  useEffect(() => {
    apiFetch(`/admin/cc/mentors/${mentorId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mentorId]);

  useEffect(() => {
    if (activeTab !== "students" || students.length > 0) return;
    setStudentsLoading(true);
    apiFetch(`/admin/cc/mentors/${mentorId}/students?limit=50`)
      .then(r => r.json())
      .then(d => setStudents(d.items ?? []))
      .catch(() => {})
      .finally(() => setStudentsLoading(false));
  }, [activeTab, mentorId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
        <span className="text-sm font-semibold text-gray-500">Loading profile…</span>
      </div>
    </div>
  );
  if (!data) return null;

  const { profile, performance, permissions, activity } = data;
  const tabs = [
    { key: "performance" as const, label: "Performance", icon: TrendingUp },
    { key: "students"   as const, label: "Students",     icon: Users      },
    { key: "permissions"as const, label: "Permissions",  icon: Shield     },
    { key: "activity"   as const, label: "Activity",     icon: Zap        },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size={10} />
            <div>
              <p className="font-black text-sm" style={{ color: NAVY }}>{profile.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <MentorTypeBadge type={profile.normType} />
                <StatusBadge isActive={profile.isActive} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Info strip */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500 flex-shrink-0">
          <span>{profile.email ?? "—"}</span>
          <span>·</span>
          <span>{profile.phone ?? "—"}</span>
          <span>·</span>
          <span>{profile.department ?? "No Dept"}</span>
          <span>·</span>
          <span>Joined {fmtDate(profile.createdAt)}</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === t.key ? "border-navy-600 text-navy-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                style={activeTab === t.key ? { borderColor: NAVY, color: NAVY } : {}}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "performance" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Assigned Students",  value: performance.assignedStudents,              show: true,                              color: NAVY    },
                { label: "Converted Students", value: performance.convertedStudents ?? "—",      show: true,                              color: "#7C3AED" },
                { label: "Conversion %",       value: performance.conversionPct !== null ? `${performance.conversionPct}%` : "—",          show: true,     color: GREEN  },
                { label: "Attendance %",       value: performance.attendancePct !== null ? `${performance.attendancePct}%` : "N/A",         show: true,     color: ORANGE },
                { label: "Homework Completion",value: performance.homeworkCompletionPct !== null ? `${performance.homeworkCompletionPct}%` : "N/A", show: true, color: "#0284C7" },
                { label: "Last Active",        value: timeAgo(profile.lastLoginDate),            show: true,                              color: "#374151" },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-1">{stat.label}</p>
                  <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "students" && (
            <div>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
                  <span className="text-sm">Loading students…</span>
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <Users className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-semibold">No students assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} avatarUrl={null} size={7} />
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.phone ?? "—"} · Grade {s.grade}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge isActive={s.isActive} />
                        <span className="text-[10px] text-gray-400">{fmtDate(s.assignedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "permissions" && (
            <div>
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Read-only view. Permissions will be editable in Phase D (Roles &amp; Permissions module).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Module</th>
                      {["View","Create","Edit","Delete"].map(h => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {permissions.map(p => (
                      <tr key={p.module}>
                        <td className="px-3 py-2 font-medium text-gray-700">{p.module}</td>
                        {[p.view, p.create, p.edit, p.del].map((v, i) => (
                          <td key={i} className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                              {v ? "✓" : "×"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-2">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <Zap className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-semibold">No activity yet</p>
                </div>
              ) : activity.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{a.actionLabel ?? a.action}</p>
                    <p className="text-[10px] text-gray-400">{a.targetName} · {a.module}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Row Actions Menu ──────────────────────────────────────────────────────────
function ActionsMenu({ mentor, onAction }: {
  mentor: MentorRow;
  onAction: (a: "view"|"edit"|"toggle-status"|"change-type"|"permissions") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const actions = [
    { key: "view"          as const, label: "View Profile",    icon: Eye,         color: NAVY    },
    { key: "edit"          as const, label: "Edit Mentor",     icon: Pencil,      color: "#374151" },
    { key: "toggle-status" as const, label: mentor.isActive ? "Deactivate" : "Activate", icon: mentor.isActive ? UserX : UserCheck, color: mentor.isActive ? "#EF4444" : GREEN },
    { key: "change-type"   as const, label: "Change Mentor Type", icon: GraduationCap, color: "#7C3AED" },
    { key: "permissions"   as const, label: "View Permissions", icon: Shield,     color: ORANGE  },
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
                <Icon className="w-3.5 h-3.5 flex-shrink-0" /> {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Mentor Management Component ─────────────────────────────────────────
export function MentorManagementView({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [data, setData]             = useState<MentorListResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatus]   = useState("all");
  const [sort, setSort]             = useState("name");
  const [order, setOrder]           = useState<"asc"|"desc">("asc");
  const [page, setPage]             = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [profileId, setProfileId]     = useState<number | null>(null);
  const [editMentor, setEditMentor]   = useState<MentorRow | null>(null);
  const [typeModal, setTypeModal]     = useState<MentorRow | null>(null);
  const [toggleTarget, setToggleTarget] = useState<MentorRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddMentor, setShowAddMentor] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ search: debouncedSearch, type: typeFilter, department: deptFilter, status: statusFilter, sort, order, page: String(page), limit: "15" });
      const r = await apiFetch(`/admin/cc/mentors?${p}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, [debouncedSearch, typeFilter, deptFilter, statusFilter, sort, order, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter, deptFilter, statusFilter]);
  useEffect(() => { load(); }, [load]);

  function updateRow(id: number, changes: Partial<MentorRow>) {
    setData(d => d ? { ...d, items: d.items.map(m => m.id === id ? { ...m, ...changes } : m) } : d);
  }

  async function doToggle() {
    if (!toggleTarget) return;
    setActionLoading(true);
    try {
      const r = await apiFetch(`/admin/cc/mentors/${toggleTarget.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !toggleTarget.isActive }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      updateRow(toggleTarget.id, { isActive: !toggleTarget.isActive });
      flash(`${toggleTarget.name} ${toggleTarget.isActive ? "deactivated" : "activated"}`, true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed", false);
    } finally { setActionLoading(false); setToggleTarget(null); }
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

  const kpis = data?.kpis;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Mentor Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">Operational control centre for all Sales and Academic Mentors</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddMentor(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
            style={{ background: "#FF6B1A" }}>
            <Plus className="w-3.5 h-3.5" /> Add Mentor
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total Mentors",  value: kpis?.totalMentors ?? "—",    icon: <Users className="w-4 h-4" />,       color: NAVY    },
          { label: "Active",         value: kpis?.activeMentors ?? "—",   icon: <UserCheck className="w-4 h-4" />,   color: GREEN   },
          { label: "Sales Mentors",  value: kpis?.salesMentors ?? "—",    icon: <TrendingUp className="w-4 h-4" />,  color: "#EF4444" },
          { label: "Academic",       value: kpis?.academicMentors ?? "—", icon: <BookOpen className="w-4 h-4" />,    color: "#166534" },
          { label: "Assigned",       value: kpis?.totalAssigned ?? "—",   icon: <UserCheck2 className="w-4 h-4" />,  color: "#7C3AED" },
          { label: "Conv. Rate",     value: kpis ? `${kpis.overallConvPct}%` : "—", icon: <Zap className="w-4 h-4" />, color: ORANGE },
        ].map(k => (
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
            style={showFilters ? { background: `${NAVY}10`, borderColor: NAVY, color: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
            <Filter className="w-3.5 h-3.5" /> Filters
            {(typeFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-blue-400">
              <option value="all">All Types</option>
              {MENTOR_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
            </select>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
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
            {(typeFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && (
              <button onClick={() => { setTypeFilter("all"); setDeptFilter("all"); setStatus("all"); }}
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
            <span className="text-sm">Loading mentors…</span>
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
            <p className="text-sm font-semibold">No mentors found</p>
            <p className="text-xs text-gray-300">{search || typeFilter !== "all" || deptFilter !== "all" ? "Try adjusting your filters" : "No mentor accounts yet"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { label: "Mentor",           col: "name",            sortable: true  },
                    { label: "Type",             col: "type",            sortable: false },
                    { label: "Department",       col: "dept",            sortable: false },
                    { label: "Status",           col: "status",          sortable: false },
                    { label: "Assigned",         col: "assignedStudents",sortable: true  },
                    { label: "Conversion",       col: "conversionPct",   sortable: true  },
                    { label: "Joined",           col: "createdAt",       sortable: true  },
                    { label: "Last Active",      col: "lastActive",      sortable: true  },
                    { label: "",                 col: "actions",         sortable: false },
                  ].map(h => (
                    <th key={h.col} className={`text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${h.sortable ? "cursor-pointer hover:text-gray-600 select-none" : ""}`}
                      onClick={() => h.sortable && toggleSort(h.col)}>
                      <span className="flex items-center gap-1">{h.label}{h.sortable && <SortIcon col={h.col} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.name} avatarUrl={m.avatarUrl} />
                        <div>
                          <p className="font-semibold text-gray-800">{m.name}</p>
                          <p className="text-[10px] text-gray-400">{m.email ?? m.phone ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><MentorTypeBadge type={m.normType} /></td>
                    <td className="px-4 py-3 text-gray-500">{m.department ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><StatusBadge isActive={m.isActive} /></td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-700">{m.assignedStudents}</span>
                    </td>
                    <td className="px-4 py-3">
                      {m.normType === "sales_mentor" ? <ConvBar pct={m.conversionPct} /> : <span className="text-gray-300 text-[10px]">N/A</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{timeAgo(m.lastLoginDate)}</td>
                    <td className="px-4 py-3">
                      <ActionsMenu mentor={m} onAction={action => {
                        if (action === "view")          setProfileId(m.id);
                        else if (action === "edit")     setEditMentor(m);
                        else if (action === "toggle-status") setToggleTarget(m);
                        else if (action === "change-type")   setTypeModal(m);
                        else if (action === "permissions")   setProfileId(m.id);
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
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-3.5 h-3.5 text-gray-500" /></button>
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
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-3.5 h-3.5 text-gray-500" /></button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddMentor && <AddMentorModal onClose={() => setShowAddMentor(false)} onCreated={load} flash={flash} />}
      {profileId    && <ProfileModal mentorId={profileId} onClose={() => setProfileId(null)} />}
      {editMentor   && <EditModal mentor={editMentor} onClose={() => setEditMentor(null)} onSaved={u => updateRow(editMentor.id, u)} flash={flash} />}
      {typeModal    && <ChangeTypeModal mentor={typeModal} onClose={() => setTypeModal(null)} onSaved={t => { updateRow(typeModal.id, { normType: t, role: t }); }} flash={flash} />}
      {toggleTarget && (
        <ConfirmDialog
          title={toggleTarget.isActive ? "Deactivate Mentor" : "Activate Mentor"}
          message={toggleTarget.isActive ? `${toggleTarget.name} will no longer be able to log in.` : `${toggleTarget.name} will regain access.`}
          confirmLabel={toggleTarget.isActive ? "Deactivate" : "Activate"}
          danger={toggleTarget.isActive}
          onConfirm={doToggle}
          onClose={() => setToggleTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
