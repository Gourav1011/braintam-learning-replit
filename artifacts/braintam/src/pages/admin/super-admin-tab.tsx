import { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck, Plus, Trash2, Edit2, RefreshCw, Search,
  Download, ChevronDown, ChevronUp, X, Eye, RotateCcw, UserX,
  Clock, Monitor, Smartphone, Globe, AlertTriangle, CheckCircle2,
  Layers, Archive, Users, FileText, Activity, LayoutDashboard,
  HardDrive, Server, Mail, MessageSquare, Zap, Database,
  UserCheck, UserMinus, WifiOff, Power, PowerOff, KeyRound,
  TrendingUp, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCSV } from "./index";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
import { API_BASE as BASE } from "@/lib/api-base";

const ALL_MODULES = [
  "Dashboard","Analytics","Course Analytics","Teacher Analytics","Learning Health",
  "Gamification","BTL CRM","Courses","Demo Batches","Live Classes","Users","Mentors",
  "Teachers","Enrollments","Announcements","Banners","Staff Attendance",
  "Operations Center","Audit Logs","Settings",
];

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
    credentials: "include",
  });
}

// ── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: number; name: string; email: string | null; role: string;
  isActive: boolean; isArchived: boolean; createdAt: string;
  lastLoginAt?: string | null;
}
interface Permission {
  id?: number | null; userId: number; module: string;
  canView: boolean; canCreate: boolean; canEdit: boolean; canArchive: boolean;
}
interface AuditLog {
  id: number; actorId: number | null; actorName: string; actorRole: string | null;
  actorEmail: string | null; action: string; actionLabel: string | null;
  category: string | null; module: string | null; targetType: string; targetId: number;
  targetName: string; beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null; ipAddress: string | null;
  device: string | null; browser: string | null; metadata: string | null;
  createdAt: string;
}
interface RecycleBinItem {
  id: number; name: string; archivedAt: string | null; archivedBy: number | null;
  email?: string | null; role?: string;
}
interface DashboardStats {
  totalAdmins: number; activeAdmins: number; inactiveAdmins: number;
  totalUsers: number; totalStudents: number; totalTeachers: number; totalMentors: number;
  systemHealthy: boolean; lastBackup: string | null;
  recentActivity: AuditLog[];
}
interface HealthService { name: string; status: "healthy" | "warning" | "offline"; detail: string; }
interface BackupRecord {
  id: string; filename: string; createdAt: string;
  sizeBytes: number; sizeMB: number; status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const a = action.toLowerCase();
  const cls =
    a.includes("delete") || a.includes("archive") || a.includes("deactivat") ? "bg-red-100 text-red-600" :
    a.includes("create") || a.includes("restore") || a.includes("enroll") ? "bg-green-100 text-green-600" :
    a.includes("reset") || a.includes("password") || a.includes("impersonate") ? "bg-orange-100 text-orange-600" :
    a.includes("login") ? "bg-purple-100 text-purple-600" :
    a.includes("revert") ? "bg-yellow-100 text-yellow-700" :
    "bg-blue-100 text-blue-600";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>{action}</span>;
}

function DeviceIcon({ device }: { device: string | null }) {
  if (device === "mobile") return <Smartphone className="w-3 h-3 text-gray-400" />;
  return <Monitor className="w-3 h-3 text-gray-400" />;
}

function DiffView({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  if (!before && !after) return null;
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 text-[11px]">
      {keys.map(k => {
        const bv = before ? String(before[k] ?? "—") : "—";
        const av = after ? String(after[k] ?? "—") : "—";
        const changed = bv !== av;
        return (
          <div key={k} className={`grid grid-cols-3 gap-2 px-3 py-1.5 border-b border-gray-50 last:border-0 ${changed ? "bg-yellow-50" : ""}`}>
            <span className="text-gray-500 font-medium truncate">{k}</span>
            <span className="text-red-500 line-through truncate">{bv}</span>
            <span className="text-green-600 font-semibold truncate">{av}</span>
          </div>
        );
      })}
    </div>
  );
}

function HealthDot({ status }: { status: "healthy" | "warning" | "offline" }) {
  const colors = { healthy: "bg-green-500", warning: "bg-yellow-400", offline: "bg-red-500" };
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} />;
}

function fmt(dt: string) {
  return new Date(dt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
}

// ── Sub-tabs ─────────────────────────────────────────────────────────────────
type SuperTab = "dashboard" | "admins" | "audit" | "recycle" | "backup" | "health" | "activity";

// ── 1. Dashboard Panel ────────────────────────────────────────────────────────
function DashboardPanel({ flash, setSubTab }: { flash: (m: string, ok?: boolean) => void; setSubTab: (t: SuperTab) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [health, setHealth] = useState<HealthService[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [sr, br, hr] = await Promise.all([
      apiFetch("/superadmin/dashboard-stats"),
      apiFetch("/superadmin/backups"),
      apiFetch("/superadmin/system-health"),
    ]);
    if (sr.ok) setStats(await sr.json());
    if (br.ok) setBackups(await br.json());
    if (hr.ok) { const d = await hr.json(); setHealth(d.services ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalBackupSize = backups.reduce((s, b) => s + b.sizeMB, 0).toFixed(2);
  const lastBackupRecord = backups[0];
  const nextScheduled = lastBackupRecord
    ? new Date(new Date(lastBackupRecord.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  if (loading) return <div className="py-20 text-center text-xs text-gray-400">Loading dashboard…</div>;
  if (!stats) return <div className="py-20 text-center text-xs text-red-400">Failed to load dashboard data</div>;

  const summaryCards = [
    { label: "Total Admins", value: stats.totalAdmins, icon: Shield, color: "#EEF0FF", iconColor: NAVY, sub: "" },
    { label: "Active Admins", value: stats.activeAdmins, icon: UserCheck, color: "#ECFDF5", iconColor: GREEN, sub: `${stats.totalAdmins ? Math.round(stats.activeAdmins / stats.totalAdmins * 100) : 0}% of total` },
    { label: "Inactive Admins", value: stats.inactiveAdmins, icon: UserMinus, color: "#FFF7ED", iconColor: ORANGE, sub: `${stats.totalAdmins ? Math.round(stats.inactiveAdmins / stats.totalAdmins * 100) : 0}% of total` },
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "#EFF6FF", iconColor: "#3B82F6", sub: `${stats.totalStudents} students` },
    { label: "System Health", value: stats.systemHealthy ? "Healthy" : "Issues", icon: Activity, color: stats.systemHealthy ? "#ECFDF5" : "#FFF7ED", iconColor: stats.systemHealthy ? GREEN : ORANGE, sub: stats.systemHealthy ? "All systems operational" : "Check system health" },
    { label: "Last Backup", value: stats.lastBackup ? (new Date(stats.lastBackup).toDateString() === new Date().toDateString() ? "Today" : fmtDate(stats.lastBackup)) : "Never", icon: HardDrive, color: "#F0FDF4", iconColor: GREEN, sub: stats.lastBackup ? fmt(stats.lastBackup) : "No backups yet" },
  ];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.color }}>
                <card.icon className="w-4 h-4" style={{ color: card.iconColor }} />
              </div>
            </div>
            <div className="text-xl font-black leading-tight" style={{ color: NAVY }}>{card.value}</div>
            <div className="text-[11px] font-semibold text-gray-500 mt-0.5">{card.label}</div>
            {card.sub && <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Recent Activities + Backup Summary */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent Admin Activities */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h4 className="font-bold text-sm" style={{ color: NAVY }}>Recent Admin Activities</h4>
              <button onClick={() => setSubTab("activity")} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: ORANGE }}>
                View All Activities →
              </button>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-50" style={{ background: "#F8FAFF" }}>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Admin</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Action</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Module</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500 hidden md:table-cell">Details</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Time</th>
              </tr></thead>
              <tbody>
                {stats.recentActivity.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No recent activity</td></tr>
                )}
                {stats.recentActivity.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: NAVY }}>{log.actorName?.[0] ?? "?"}</div>
                        <div>
                          <div className="font-semibold truncate max-w-[90px]" style={{ color: NAVY }}>{log.actorName}</div>
                          {log.actorRole && <div className="text-[10px] text-gray-400 uppercase">{log.actorRole}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><ActionBadge action={log.actionLabel ?? log.action} /></td>
                    <td className="px-4 py-2.5 text-gray-500">{log.module ?? log.targetType}</td>
                    <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell max-w-[160px] truncate">{log.targetName}</td>
                    <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmt(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Backup Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h4 className="font-bold text-sm" style={{ color: NAVY }}>Backup Summary</h4>
              <button onClick={() => setSubTab("backup")} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: ORANGE }}>
                View All Backups →
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-gray-100">
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Total Backups</div>
                <div className="text-xl font-black" style={{ color: NAVY }}>{backups.length}</div>
                <div className="text-[10px] text-gray-400">Last 30 days</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Last Backup</div>
                <div className="text-sm font-black" style={{ color: NAVY }}>
                  {lastBackupRecord ? fmtDate(lastBackupRecord.createdAt) : "Never"}
                </div>
                <div className="text-[10px] text-gray-400">
                  {lastBackupRecord ? new Date(lastBackupRecord.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Next Scheduled</div>
                <div className="text-sm font-black" style={{ color: NAVY }}>{nextScheduled}</div>
                <div className="text-[10px] text-gray-400">Daily at 03:00 AM</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</div>
                <div className="text-sm font-black text-green-600">{backups.length > 0 ? "Success" : "No backups"}</div>
                <div className="text-[10px] text-gray-400">{totalBackupSize} MB total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: System Overview + Quick Actions */}
        <div className="space-y-5">
          {/* System Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h4 className="font-bold text-sm" style={{ color: NAVY }}>System Overview</h4>
              <button onClick={() => setSubTab("health")} className="text-[11px] font-semibold" style={{ color: ORANGE }}>
                View System Health →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {health.map(svc => (
                <div key={svc.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <HealthDot status={svc.status} />
                    <span className="text-xs font-medium text-gray-700">{svc.name}</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${svc.status === "healthy" ? "text-green-600" : svc.status === "warning" ? "text-yellow-600" : "text-red-500"}`}>
                    {svc.status === "healthy" ? "Healthy" : svc.status === "warning" ? "Warning" : "Offline"}
                  </span>
                </div>
              ))}
              {health.length === 0 && <div className="px-5 py-6 text-center text-xs text-gray-400">Loading health…</div>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h4 className="font-bold text-sm" style={{ color: NAVY }}>Quick Actions</h4>
            </div>
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              {[
                { label: "Create Admin", icon: Plus, tab: "admins" as SuperTab, color: "#EEF0FF", iconColor: NAVY },
                { label: "Create Backup", icon: HardDrive, tab: "backup" as SuperTab, color: "#ECFDF5", iconColor: GREEN },
                { label: "View Audit Logs", icon: FileText, tab: "audit" as SuperTab, color: "#EFF6FF", iconColor: "#3B82F6" },
                { label: "Recycle Bin", icon: Archive, tab: "recycle" as SuperTab, color: "#FFF7ED", iconColor: ORANGE },
                { label: "System Settings", icon: Layers, tab: "health" as SuperTab, color: "#F5F3FF", iconColor: "#7C3AED" },
                { label: "Activity Monitor", icon: Activity, tab: "activity" as SuperTab, color: "#FFF0F0", iconColor: "#DC2626" },
              ].map(qa => (
                <button key={qa.label} onClick={() => setSubTab(qa.tab)}
                  className="bg-white p-4 flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: qa.color }}>
                    <qa.icon className="w-4.5 h-4.5" style={{ color: qa.iconColor }} />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
        <span>© 2026 Braintam Learning Growth. All rights reserved.</span>
        <div className="flex items-center gap-2">
          <span>Version 2.0.0</span>
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-bold">Live</span>
        </div>
      </div>
    </div>
  );
}

// ── 2. Admin Accounts Panel ──────────────────────────────────────────────────
function AdminsPanel({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [editPermsFor, setEditPermsFor] = useState<AdminUser | null>(null);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [search, setSearch] = useState("");
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/superadmin/admins");
    if (r.ok) setAdmins(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPerms = async (admin: AdminUser) => {
    setEditPermsFor(admin);
    const r = await apiFetch(`/superadmin/admins/${admin.id}/permissions`);
    if (r.ok) setPerms(await r.json());
  };

  const savePerms = async () => {
    if (!editPermsFor) return;
    setSavingPerms(true);
    const r = await apiFetch(`/superadmin/admins/${editPermsFor.id}/permissions`, { method: "PUT", body: JSON.stringify(perms) });
    setSavingPerms(false);
    if (r.ok) { flash("Permissions saved!"); setEditPermsFor(null); }
    else flash("Failed to save permissions", false);
  };

  const togglePerm = (module: string, field: "canView" | "canCreate" | "canEdit" | "canArchive") => {
    setPerms(ps => ps.map(p => p.module === module ? { ...p, [field]: !p[field] } : p));
  };

  const archiveAdmin = async (admin: AdminUser) => {
    if (!confirm(`Archive ${admin.name}? They will lose access.`)) return;
    const r = await apiFetch(`/superadmin/admins/${admin.id}/archive`, { method: "PATCH" });
    if (r.ok) { flash(`${admin.name} archived`); load(); }
    else { const d = await r.json(); flash(d.error ?? "Failed", false); }
  };

  const toggleActive = async (admin: AdminUser) => {
    setTogglingId(admin.id);
    const r = await apiFetch(`/superadmin/admins/${admin.id}/toggle-active`, { method: "PATCH" });
    setTogglingId(null);
    if (r.ok) { const d = await r.json(); flash(`${admin.name} ${d.isActive ? "enabled" : "disabled"}`); load(); }
    else { const d = await r.json(); flash(d.error ?? "Failed", false); }
  };

  const resetPassword = async () => {
    if (!resetFor || !newPw) return;
    const r = await apiFetch(`/superadmin/admins/${resetFor.id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: newPw }) });
    if (r.ok) { flash(`Password reset for ${resetFor.name}`); setResetFor(null); setNewPw(""); }
    else { const d = await r.json(); flash(d.error ?? "Failed", false); }
  };

  const createAdmin = async () => {
    if (!form.name || !form.email || !form.password) { flash("All fields required", false); return; }
    setBusy(true);
    const r = await apiFetch("/superadmin/admins", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (r.ok) { flash("Admin created!"); setCreating(false); setForm({ name: "", email: "", password: "" }); load(); }
    else { const d = await r.json(); flash(d.error ?? "Failed", false); }
  };

  const filtered = admins.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Permissions Modal */}
      {editPermsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Permissions — {editPermsFor.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Control which modules this admin can access</p>
              </div>
              <button onClick={() => setEditPermsFor(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <div className="grid grid-cols-5 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">
                <span className="col-span-2">Module</span>
                <span className="text-center">View</span><span className="text-center">Create</span>
                <span className="text-center">Edit</span><span className="text-center">Archive</span>
              </div>
              {perms.map(p => (
                <div key={p.module} className="grid grid-cols-5 gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 items-center">
                  <span className="col-span-2 text-xs font-medium" style={{ color: NAVY }}>{p.module}</span>
                  {(["canView","canCreate","canEdit","canArchive"] as const).map(f => (
                    <div key={f} className="flex justify-center">
                      <button onClick={() => togglePerm(p.module, f)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${p[f] ? "border-transparent" : "border-gray-300 bg-white"}`}
                        style={p[f] ? { background: NAVY, borderColor: NAVY } : {}}>
                        {p[f] && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2 p-4 border-t border-gray-100">
              <Button onClick={savePerms} disabled={savingPerms} className="text-white flex-1" style={{ background: NAVY }}>
                {savingPerms ? "Saving…" : "Save Permissions"}
              </Button>
              <Button variant="ghost" onClick={() => setEditPermsFor(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>Reset Password — {resetFor.name}</h3>
              <button onClick={() => { setResetFor(null); setNewPw(""); }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <Input type="password" placeholder="New password (min 6 chars)" value={newPw}
              onChange={e => setNewPw(e.target.value)} className="text-xs h-9" />
            <div className="flex gap-2">
              <Button onClick={resetPassword} disabled={newPw.length < 6} className="text-white flex-1 text-xs h-9" style={{ background: ORANGE }}>
                Reset Password
              </Button>
              <Button variant="ghost" className="text-xs h-9" onClick={() => { setResetFor(null); setNewPw(""); }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Admin Accounts</h4>
          <p className="text-xs text-gray-400">Manage admin users, permissions, and account status</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search admins…" className="pl-8 h-8 text-xs w-44" />
          </div>
          <Button size="sm" onClick={() => setCreating(p => !p)} className="text-white gap-1.5 text-xs h-8" style={{ background: ORANGE }}>
            <Plus className="w-3.5 h-3.5" /> New Admin
          </Button>
        </div>
      </div>

      {creating && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold" style={{ color: NAVY }}>Create New Admin</p>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="text-xs h-8" />
            <Input placeholder="Email address" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" className="text-xs h-8" />
            <Input placeholder="Password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type="password" className="text-xs h-8" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={createAdmin} disabled={busy} className="text-white h-8 text-xs" style={{ background: NAVY }}>
              {busy ? "Creating…" : "Create Admin"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)} className="h-8 text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">Loading admins…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 hidden md:table-cell">Joined</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 hidden lg:table-cell">Last Login</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50 ${a.isArchived ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>
                    {a.name}
                    {a.role === "super_admin" && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold">SUPER</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{a.email ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${a.role === "super_admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>{a.role}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {a.isArchived
                      ? <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Archived</span>
                      : a.isActive
                        ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600">Active</span>
                        : <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-500">Inactive</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 hidden md:table-cell">{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2.5 text-gray-400 hidden lg:table-cell">
                    {a.lastLoginAt ? fmt(a.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      {a.role !== "super_admin" && (
                        <>
                          <button onClick={() => openPerms(a)} title="Edit permissions"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setResetFor(a); setNewPw(""); }} title="Reset password"
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors">
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {!a.isArchived && (
                            <button onClick={() => toggleActive(a)} disabled={togglingId === a.id} title={a.isActive ? "Disable admin" : "Enable admin"}
                              className={`p-1.5 rounded-lg transition-colors ${a.isActive ? "hover:bg-red-50 text-red-400" : "hover:bg-green-50 text-green-500"}`}>
                              {a.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {!a.isArchived && (
                            <button onClick={() => archiveAdmin(a)} title="Archive admin"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No admins found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 3. Audit Logs Panel ──────────────────────────────────────────────────────
function AuditLogsPanel({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionSearch, setActionSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (moduleFilter !== "all") params.set("module", moduleFilter);
    if (actionSearch) params.set("action", actionSearch);
    if (targetSearch) params.set("targetName", targetSearch);
    const r = await apiFetch(`/superadmin/audit-logs?${params}`);
    if (r.ok) {
      const data = await r.json();
      setLogs(data.logs); setTotal(data.total); setPages(data.pages); setPage(p);
    }
    setLoading(false);
  }, [dateFrom, dateTo, roleFilter, moduleFilter, actionSearch, targetSearch]);

  useEffect(() => { load(1); }, [load]);

  const revert = async (log: AuditLog) => {
    const r = await apiFetch(`/superadmin/audit-logs/${log.id}/revert`, { method: "POST" });
    if (r.ok) { flash("Change reverted!"); load(page); }
    else { const d = await r.json(); flash(d.error ?? "Cannot revert", false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold" style={{ color: NAVY }}>Filters</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div><label className="text-[10px] text-gray-400 font-medium block mb-1">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs h-8" /></div>
          <div><label className="text-[10px] text-gray-400 font-medium block mb-1">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs h-8" /></div>
          <div><label className="text-[10px] text-gray-400 font-medium block mb-1">Role</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className="text-[10px] text-gray-400 font-medium block mb-1">Module</label>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {ALL_MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-36">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input placeholder="Search action…" value={actionSearch} onChange={e => setActionSearch(e.target.value)} className="pl-7 h-8 text-xs" />
          </div>
          <div className="relative flex-1 min-w-36">
            <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input placeholder="Search target…" value={targetSearch} onChange={e => setTargetSearch(e.target.value)} className="pl-7 h-8 text-xs" />
          </div>
          <Button size="sm" onClick={() => load(1)} disabled={loading} className="text-white h-8 text-xs gap-1" style={{ background: NAVY }}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Apply
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => exportCSV("audit_logs.csv",
            ["Time","Actor","Role","Email","Action","Module","Target","IP"],
            logs.map(l => [l.createdAt, l.actorName, l.actorRole ?? "", l.actorEmail ?? "", l.action, l.module ?? "", l.targetName, l.ipAddress ?? ""]))}>
            <Download className="w-3 h-3" /> Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="font-semibold" style={{ color: NAVY }}>{total.toLocaleString()}</span> total entries
        {pages > 1 && <span>· Page {page} of {pages}</span>}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">Loading audit logs…</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No audit logs match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NAVY }} />
                <div className="flex-shrink-0 w-36">
                  <div className="text-xs font-semibold truncate" style={{ color: NAVY }}>{log.actorName}</div>
                  {log.actorRole && <div className="text-[10px] text-gray-400">{log.actorRole}</div>}
                </div>
                <div className="flex-shrink-0"><ActionBadge action={log.actionLabel ?? log.action} /></div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 truncate block">
                    {log.targetType}: <span className="font-medium text-gray-700">{log.targetName}</span>
                  </span>
                  {log.module && <span className="text-[10px] text-gray-400">{log.module}</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0">
                  <DeviceIcon device={log.device} />
                  <Clock className="w-3 h-3" />
                  <span>{fmt(log.createdAt)}</span>
                </div>
                {expanded === log.id ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>
              {expanded === log.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    <div><span className="text-gray-400 font-medium">Actor ID</span><br /><span style={{ color: NAVY }}>#{log.actorId}</span></div>
                    <div><span className="text-gray-400 font-medium">Email</span><br /><span style={{ color: NAVY }}>{log.actorEmail ?? "—"}</span></div>
                    <div><span className="text-gray-400 font-medium">IP Address</span><br /><span style={{ color: NAVY }}>{log.ipAddress ?? "—"}</span></div>
                    <div><span className="text-gray-400 font-medium">Log ID</span><br /><span style={{ color: NAVY }}>#{log.id}</span></div>
                  </div>
                  {(log.beforeValue || log.afterValue) && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">Change Diff</p>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-gray-400 px-3 mb-0.5">
                        <span>Field</span><span className="text-red-400">Before</span><span className="text-green-600">After</span>
                      </div>
                      <DiffView before={log.beforeValue} after={log.afterValue} />
                    </div>
                  )}
                  {log.beforeValue && (
                    <div className="pt-1">
                      <button onClick={() => revert(log)}
                        className="flex items-center gap-1.5 text-[11px] text-orange-600 hover:text-orange-700 font-semibold transition-colors">
                        <RotateCcw className="w-3 h-3" /> Revert this change
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => load(page - 1)} className="h-8 text-xs">← Prev</Button>
          <span className="text-xs text-gray-500">Page {page} / {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => load(page + 1)} className="h-8 text-xs">Next →</Button>
        </div>
      )}
    </div>
  );
}

// ── 4. Recycle Bin Panel ─────────────────────────────────────────────────────
type RecycleType = "user" | "course" | "announcement" | "homework" | "test" | "banner" | "live_class";

function RecycleBinPanel({ flash, isSuperAdmin }: { flash: (msg: string, ok?: boolean) => void; isSuperAdmin: boolean }) {
  const [type, setType] = useState<RecycleType>("user");
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch(`/superadmin/recycle-bin?type=${type}`);
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const restore = async (item: RecycleBinItem) => {
    setRestoring(item.id);
    const r = await apiFetch("/superadmin/recycle-bin/restore", { method: "POST", body: JSON.stringify({ type, id: item.id }) });
    setRestoring(null);
    if (r.ok) { flash(`"${item.name}" restored!`); load(); }
    else { const d = await r.json(); flash(d.error ?? "Restore failed", false); }
  };

  const permanentDelete = async (item: RecycleBinItem) => {
    if (!confirm(`⚠️ Permanently delete "${item.name}"? This CANNOT be undone.`)) return;
    setDeleting(item.id);
    const r = await apiFetch("/superadmin/recycle-bin", { method: "DELETE", body: JSON.stringify({ type, id: item.id }) });
    setDeleting(null);
    if (r.ok) { flash(`"${item.name}" permanently deleted`); load(); }
    else { const d = await r.json(); flash(d.error ?? "Delete failed", false); }
  };

  const TYPE_LABELS: Record<RecycleType, string> = {
    user: "Users", course: "Courses", announcement: "Announcements",
    homework: "Homework", test: "Tests", banner: "Banners", live_class: "Live Classes",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(TYPE_LABELS) as RecycleType[]).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${type === t ? "text-white shadow-sm" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"}`}
              style={type === t ? { background: NAVY } : {}}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-1.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isSuperAdmin && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-[11px] text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Permanent Delete is only visible to Super Admins. This action is irreversible.
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <Archive className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Recycle bin is empty for {TYPE_LABELS[type]}</p>
          <p className="text-xs text-gray-300 mt-1">Archived items appear here and can be restored</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Name</th>
              {type === "user" && <th className="text-left px-4 py-3 font-semibold text-gray-500">Email / Role</th>}
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Archived At</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium" style={{ color: NAVY }}>{item.name}</td>
                  {type === "user" && (
                    <td className="px-4 py-2.5 text-gray-500">
                      {item.email ?? "—"}{item.role && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.role}</span>}
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-gray-400">
                    {item.archivedAt ? fmt(item.archivedAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => restore(item)} disabled={restoring === item.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 font-semibold transition-colors disabled:opacity-50">
                        <RotateCcw className="w-3 h-3" />
                        {restoring === item.id ? "Restoring…" : "Restore"}
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => permanentDelete(item)} disabled={deleting === item.id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-semibold transition-colors disabled:opacity-50">
                          <Trash2 className="w-3 h-3" />
                          {deleting === item.id ? "Deleting…" : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 5. Backup Center Panel ───────────────────────────────────────────────────
function BackupPanel({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("manual");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/superadmin/backups");
    if (r.ok) setBackups(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createBackup = async () => {
    setCreating(true);
    const r = await apiFetch("/superadmin/backups", { method: "POST", body: JSON.stringify({ label }) });
    setCreating(false);
    if (r.ok) { flash("Backup created successfully!"); load(); }
    else { const d = await r.json(); flash(d.error ?? "Backup failed", false); }
  };

  const downloadBackup = (backup: BackupRecord) => {
    const token = localStorage.getItem("braintam_staff_token");
    const a = document.createElement("a");
    a.href = `${BASE}/api/superadmin/backups/${backup.id}/download`;
    a.setAttribute("download", backup.filename);
    // Set auth header via fetch then trigger download
    apiFetch(`/superadmin/backups/${backup.id}/download`).then(async r => {
      if (!r.ok) { flash("Download failed", false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.filename;
      link.click();
      URL.revokeObjectURL(url);
    });
    void token;
  };

  const totalSize = backups.reduce((s, b) => s + b.sizeMB, 0).toFixed(2);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Backups", value: backups.length, icon: HardDrive, color: "#EEF0FF", iconColor: NAVY },
          { label: "Total Size", value: `${totalSize} MB`, icon: Database, color: "#ECFDF5", iconColor: GREEN },
          { label: "Last Backup", value: backups[0] ? fmtDate(backups[0].createdAt) : "Never", icon: Clock, color: "#FFF7ED", iconColor: ORANGE },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.color }}>
              <s.icon className="w-4.5 h-4.5" style={{ color: s.iconColor }} />
            </div>
            <div>
              <div className="text-lg font-black leading-tight" style={{ color: NAVY }}>{s.value}</div>
              <div className="text-[11px] text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Backup */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h4 className="font-bold text-sm mb-3" style={{ color: NAVY }}>Create Backup</h4>
        <div className="flex items-center gap-3">
          <Input placeholder="Backup label (e.g. pre-deploy)" value={label} onChange={e => setLabel(e.target.value)} className="text-xs h-9 max-w-xs" />
          <Button onClick={createBackup} disabled={creating} className="text-white h-9 text-xs gap-1.5" style={{ background: ORANGE }}>
            {creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
            {creating ? "Creating backup…" : "Create Backup"}
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Creates a JSON snapshot with table row counts and schema metadata.</p>
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Backup History</h4>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-xs text-gray-400">Loading backups…</div>
        ) : backups.length === 0 ? (
          <div className="py-16 text-center">
            <HardDrive className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No backups yet</p>
            <p className="text-xs text-gray-300 mt-1">Create your first backup above</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Backup Name</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Created Date</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Size</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-500">Actions</th>
            </tr></thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium truncate max-w-[200px]" style={{ color: NAVY }}>{b.filename}</td>
                  <td className="px-5 py-3 text-gray-500">{fmt(b.createdAt)}</td>
                  <td className="px-5 py-3 text-gray-500">{b.sizeBytes < 1024 * 1024 ? `${b.sizeBytes} B` : `${b.sizeMB} MB`}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold">Success</span>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => downloadBackup(b)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 font-semibold transition-colors">
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── 6. System Health Panel ───────────────────────────────────────────────────
function SystemHealthPanel({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [services, setServices] = useState<HealthService[]>([]);
  const [overall, setOverall] = useState<"healthy" | "warning" | "offline">("healthy");
  const [checkedAt, setCheckedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/superadmin/system-health");
    if (r.ok) {
      const d = await r.json();
      setServices(d.services ?? []);
      setOverall(d.overall ?? "healthy");
      setCheckedAt(d.checkedAt ?? "");
    } else {
      flash("Failed to load system health", false);
    }
    setLoading(false);
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const SERVICE_ICONS: Record<string, React.ElementType> = {
    "Database": Database,
    "API Server": Server,
    "Storage": HardDrive,
    "Email Service": Mail,
    "WhatsApp / SMS": MessageSquare,
    "Background Jobs": Zap,
  };

  const overallColor = overall === "healthy" ? "text-green-600 bg-green-50 border-green-200" : overall === "warning" ? "text-yellow-600 bg-yellow-50 border-yellow-200" : "text-red-600 bg-red-50 border-red-200";
  const overallLabel = overall === "healthy" ? "All Systems Operational" : overall === "warning" ? "Some Services Need Attention" : "System Issues Detected";

  return (
    <div className="space-y-5">
      {/* Overall status banner */}
      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${overallColor}`}>
        {overall === "healthy"
          ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          : overall === "warning"
          ? <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          : <WifiOff className="w-5 h-5 flex-shrink-0" />}
        <div>
          <div className="font-bold text-sm">{overallLabel}</div>
          {checkedAt && <div className="text-xs opacity-70">Last checked: {fmt(checkedAt)}</div>}
        </div>
        <button onClick={load} disabled={loading} className="ml-auto p-2 rounded-xl hover:bg-white/60 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map(svc => {
          const Icon = SERVICE_ICONS[svc.name] ?? Activity;
          const statusColors = {
            healthy: { bg: "#ECFDF5", iconColor: GREEN, badge: "bg-green-100 text-green-600", label: "Healthy" },
            warning: { bg: "#FFFBEB", iconColor: "#D97706", badge: "bg-yellow-100 text-yellow-700", label: "Warning" },
            offline: { bg: "#FEF2F2", iconColor: "#DC2626", badge: "bg-red-100 text-red-600", label: "Offline" },
          }[svc.status];

          return (
            <div key={svc.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: statusColors.bg }}>
                  <Icon className="w-5 h-5" style={{ color: statusColors.iconColor }} />
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusColors.badge}`}>
                  {statusColors.label}
                </span>
              </div>
              <div className="font-bold text-sm mb-1" style={{ color: NAVY }}>{svc.name}</div>
              <div className="text-[11px] text-gray-500">{svc.detail}</div>
            </div>
          );
        })}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-gray-100 mb-3" />
            <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
            <div className="h-2.5 bg-gray-50 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 7. Activity Monitor Panel ────────────────────────────────────────────────
function ActivityPanel({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/superadmin/audit-logs?limit=100&page=1");
    if (r.ok) { const d = await r.json(); setLogs(d.logs ?? []); }
    else flash("Failed to load activity", false);
    setLoading(false);
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const grouped = logs.reduce<Record<string, AuditLog[]>>((acc, log) => {
    const day = new Date(log.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
    if (!acc[day]) acc[day] = [];
    acc[day].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Activity Monitor</h4>
          <p className="text-xs text-gray-400">Latest 100 platform activities across all modules</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh (15s)
          </label>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 text-xs font-semibold text-gray-500 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => exportCSV("activity_monitor.csv",
            ["Time","Actor","Role","Action","Module","Target"],
            logs.map(l => [l.createdAt, l.actorName, l.actorRole ?? "", l.actionLabel ?? l.action, l.module ?? "", l.targetName]))}>
            <Download className="w-3 h-3" /> Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="font-semibold" style={{ color: NAVY }}>{logs.length}</span> activities loaded
        {autoRefresh && <span className="flex items-center gap-1 text-green-600 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live</span>}
      </div>

      {loading && logs.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400">Loading activity…</div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
          <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([day, dayLogs]) => (
            <div key={day}>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span>{day}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 normal-case font-semibold">{dayLogs.length} events</span>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {dayLogs.map(log => (
                  <div key={log.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                      style={{ background: NAVY }}>{log.actorName?.[0] ?? "?"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: NAVY }}>{log.actorName}</span>
                        {log.actorRole && <span className="text-[10px] text-gray-400 uppercase">{log.actorRole}</span>}
                        <ActionBadge action={log.actionLabel ?? log.action} />
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        {log.module && <span className="text-gray-400">{log.module} · </span>}
                        {log.targetType}: <span className="font-medium">{log.targetName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-shrink-0">
                      <DeviceIcon device={log.device} />
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Super Admin Tab ─────────────────────────────────────────────────────
export function SuperAdminTab({ flash, role }: { flash: (msg: string, ok?: boolean) => void; role?: string }) {
  const [subTab, setSubTab] = useState<SuperTab>("dashboard");
  const isSuperAdmin = role === "super_admin";

  const SUB_TABS: { id: SuperTab; label: string; icon: React.ElementType; superOnly?: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "admins", label: "Admin Accounts", icon: Users, superOnly: true },
    { id: "audit", label: "Audit Logs", icon: FileText },
    { id: "recycle", label: "Recycle Bin", icon: Archive, superOnly: true },
    { id: "backup", label: "Backup Center", icon: HardDrive, superOnly: true },
    { id: "health", label: "System Health", icon: Activity, superOnly: true },
    { id: "activity", label: "Activity Monitor", icon: TrendingUp },
  ];

  const visibleTabs = SUB_TABS.filter(t => !t.superOnly || isSuperAdmin);

  // 403 for non-super-admin trying to access super-only tabs
  const currentTab = SUB_TABS.find(t => t.id === subTab);
  const blocked = currentTab?.superOnly && !isSuperAdmin;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF0FF" }}>
          <ShieldCheck className="w-5 h-5" style={{ color: NAVY }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base" style={{ color: NAVY }}>Super Admin Console</h3>
          <p className="text-xs text-gray-400">Manage the entire platform, admins, permissions, audit logs, backups and system settings.</p>
        </div>
        {isSuperAdmin && (
          <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">SUPER ADMIN</span>
        )}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 flex-wrap">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subTab === id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            style={subTab === id ? { background: NAVY } : {}}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 403 for restricted tabs */}
      {blocked ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-500">403 — Access Denied</p>
          <p className="text-xs text-gray-400 mt-1">This section is restricted to Super Admins only.</p>
        </div>
      ) : (
        <>
          {subTab === "dashboard" && <DashboardPanel flash={flash} setSubTab={setSubTab} />}
          {subTab === "admins" && <AdminsPanel flash={flash} />}
          {subTab === "audit" && <AuditLogsPanel flash={flash} />}
          {subTab === "recycle" && <RecycleBinPanel flash={flash} isSuperAdmin={isSuperAdmin} />}
          {subTab === "backup" && <BackupPanel flash={flash} />}
          {subTab === "health" && <SystemHealthPanel flash={flash} />}
          {subTab === "activity" && <ActivityPanel flash={flash} />}
        </>
      )}
    </div>
  );
}
