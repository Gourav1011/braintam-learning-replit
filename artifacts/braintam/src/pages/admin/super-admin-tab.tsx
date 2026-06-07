import { useState, useEffect, useCallback } from "react";
import {
  Shield, ShieldCheck, Plus, Trash2, Edit2, RefreshCw, Search,
  Download, ChevronDown, ChevronUp, X, Eye, RotateCcw, UserX,
  Clock, Monitor, Smartphone, Globe, AlertTriangle, CheckCircle2,
  Layers, Archive, Users, FileText, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCSV } from "./index";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  if (device === "tablet") return <Monitor className="w-3 h-3 text-gray-400" />;
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

// ── Sub-tabs ─────────────────────────────────────────────────────────────────
type SuperTab = "admins" | "audit" | "recycle";

// ── Admin List + Permissions ─────────────────────────────────────────────────
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
    const r = await apiFetch(`/superadmin/admins/${editPermsFor.id}/permissions`, {
      method: "PUT",
      body: JSON.stringify(perms),
    });
    setSavingPerms(false);
    if (r.ok) { flash("Permissions saved!"); setEditPermsFor(null); }
    else flash("Failed to save permissions", false);
  };

  const togglePerm = (module: string, field: "canView" | "canCreate" | "canEdit" | "canArchive") => {
    setPerms(ps => ps.map(p => p.module === module ? { ...p, [field]: !p[field] } : p));
  };

  const archiveAdmin = async (admin: AdminUser) => {
    const r = await apiFetch(`/superadmin/admins/${admin.id}/archive`, { method: "PATCH" });
    if (r.ok) { flash(`${admin.name} archived`); load(); }
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
                <span className="text-center">View</span>
                <span className="text-center">Create</span>
                <span className="text-center">Edit</span>
                <span className="text-center">Archive</span>
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

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Admin Accounts</h4>
          <p className="text-xs text-gray-400">Manage admin users and their module permissions</p>
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

      {/* Create Form */}
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

      {/* Table */}
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
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Joined</th>
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
                  <td className="px-4 py-2.5 text-gray-400">{new Date(a.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      {a.role !== "super_admin" && (
                        <>
                          <button onClick={() => openPerms(a)} title="Edit permissions"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                            <Shield className="w-3.5 h-3.5" />
                          </button>
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
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No admins found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Rich Audit Logs Panel ────────────────────────────────────────────────────
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionSearch, setActionSearch] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (moduleFilter !== "all") params.set("module", moduleFilter);
    if (actionSearch) params.set("action", actionSearch);
    if (targetSearch) params.set("targetName", targetSearch);

    const r = await apiFetch(`/superadmin/audit-logs?${params}`);
    if (r.ok) {
      const data = await r.json();
      setLogs(data.logs); setTotal(data.total); setPages(data.pages); setPage(p);
    }
    setLoading(false);
  }, [dateFrom, dateTo, roleFilter, categoryFilter, moduleFilter, actionSearch, targetSearch]);

  useEffect(() => { load(1); }, [load]);

  const revert = async (log: AuditLog) => {
    const r = await apiFetch(`/superadmin/audit-logs/${log.id}/revert`, { method: "POST" });
    if (r.ok) { flash("Change reverted!"); load(page); }
    else { const d = await r.json(); flash(d.error ?? "Cannot revert", false); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold" style={{ color: NAVY }}>Filters</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-1">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs h-8" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-1">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs h-8" />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-1">Role</label>
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
          <div>
            <label className="text-[10px] text-gray-400 font-medium block mb-1">Module</label>
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
            ["Time","Actor","Role","Email","Action","Module","Target","IP","Device","Browser"],
            logs.map(l => [l.createdAt, l.actorName, l.actorRole ?? "", l.actorEmail ?? "", l.action, l.module ?? "", l.targetName, l.ipAddress ?? "", l.device ?? "", l.browser ?? ""])
          )}>
            <Download className="w-3 h-3" /> Export
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="font-semibold" style={{ color: NAVY }}>{total.toLocaleString()}</span> total entries
        {pages > 1 && <span>· Page {page} of {pages}</span>}
      </div>

      {/* Timeline */}
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
              <button
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                {/* Timeline dot */}
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: NAVY }} />

                {/* Actor */}
                <div className="flex-shrink-0 w-36">
                  <div className="text-xs font-semibold truncate" style={{ color: NAVY }}>{log.actorName}</div>
                  {log.actorRole && <div className="text-[10px] text-gray-400">{log.actorRole}</div>}
                </div>

                {/* Action badge */}
                <div className="flex-shrink-0">
                  <ActionBadge action={log.actionLabel ?? log.action} />
                </div>

                {/* Target */}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 truncate block">
                    {log.targetType}: <span className="font-medium text-gray-700">{log.targetName}</span>
                  </span>
                  {log.module && <span className="text-[10px] text-gray-400">{log.module}</span>}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-shrink-0">
                  <DeviceIcon device={log.device} />
                  <span>{log.browser}</span>
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                </div>

                {/* Expand */}
                {expanded === log.id
                  ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>

              {expanded === log.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                    <div><span className="text-gray-400 font-medium">Actor ID</span><br /><span style={{ color: NAVY }}>#{log.actorId}</span></div>
                    <div><span className="text-gray-400 font-medium">Email</span><br /><span style={{ color: NAVY }}>{log.actorEmail ?? "—"}</span></div>
                    <div><span className="text-gray-400 font-medium">IP Address</span><br /><span style={{ color: NAVY }}>{log.ipAddress ?? "—"}</span></div>
                    <div><span className="text-gray-400 font-medium">Log ID</span><br /><span style={{ color: NAVY }}>#{log.id}</span></div>
                  </div>

                  {/* Before/After diff */}
                  {(log.beforeValue || log.afterValue) && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 mb-1">Change Diff</p>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-gray-400 px-3 mb-0.5">
                        <span className="col-span-1">Field</span>
                        <span className="text-red-400">Before</span>
                        <span className="text-green-600">After</span>
                      </div>
                      <DiffView before={log.beforeValue} after={log.afterValue} />
                    </div>
                  )}

                  {/* Revert button */}
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

      {/* Pagination */}
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

// ── Recycle Bin ──────────────────────────────────────────────────────────────
type RecycleType = "user" | "course" | "announcement" | "homework" | "test" | "banner" | "live_class";

function RecycleBinPanel({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [type, setType] = useState<RecycleType>("user");
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch(`/superadmin/recycle-bin?type=${type}`);
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const restore = async (item: RecycleBinItem) => {
    setRestoring(item.id);
    const r = await apiFetch("/superadmin/recycle-bin/restore", {
      method: "POST",
      body: JSON.stringify({ type, id: item.id }),
    });
    setRestoring(null);
    if (r.ok) { flash(`"${item.name}" restored!`); load(); }
    else { const d = await r.json(); flash(d.error ?? "Restore failed", false); }
  };

  const TYPE_LABELS: Record<RecycleType, string> = {
    user: "Users", course: "Courses", announcement: "Announcements",
    homework: "Homework", test: "Tests", banner: "Banners", live_class: "Live Classes",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(TYPE_LABELS) as RecycleType[]).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${type === t ? "text-white shadow-sm" : "text-gray-500 bg-white border border-gray-200 hover:border-gray-300"}`}
            style={type === t ? { background: NAVY } : {}}>
            {TYPE_LABELS[t]}
          </button>
        ))}
        <button onClick={load} className="p-1.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors ml-auto">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

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
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Action</th>
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
                    {item.archivedAt ? new Date(item.archivedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => restore(item)} disabled={restoring === item.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-green-600 bg-green-50 hover:bg-green-100 font-semibold transition-colors disabled:opacity-50">
                      <RotateCcw className="w-3 h-3" />
                      {restoring === item.id ? "Restoring…" : "Restore"}
                    </button>
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

// ── Main Super Admin Tab ─────────────────────────────────────────────────────
export function SuperAdminTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [subTab, setSubTab] = useState<SuperTab>("admins");

  const SUB_TABS: { id: SuperTab; label: string; icon: React.ElementType }[] = [
    { id: "admins", label: "Admin Accounts", icon: Users },
    { id: "audit", label: "Audit Logs", icon: Activity },
    { id: "recycle", label: "Recycle Bin", icon: Archive },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#EEF0FF" }}>
          <ShieldCheck className="w-5 h-5" style={{ color: NAVY }} />
        </div>
        <div>
          <h3 className="font-bold text-base" style={{ color: NAVY }}>Super Admin Console</h3>
          <p className="text-xs text-gray-400">Manage admin accounts, permissions, audit trail, and recycle bin. Only visible to super admins.</p>
        </div>
      </div>

      {/* Sub-tab pills */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 w-fit">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${subTab === id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            style={subTab === id ? { background: NAVY } : {}}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {subTab === "admins" && <AdminsPanel flash={flash} />}
      {subTab === "audit" && <AuditLogsPanel flash={flash} />}
      {subTab === "recycle" && <RecycleBinPanel flash={flash} />}
    </div>
  );
}
