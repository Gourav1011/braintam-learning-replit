import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Plus, Copy, Pencil, Eye, ChevronDown, ChevronUp,
  Loader2, XCircle, RefreshCw, X, Check, AlertTriangle, Users,
  Lock, Zap, Crown, BookOpen, GraduationCap, UserCheck2, Star,
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
interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  usersCount: number;
  permissionsCount: number;
}

interface RoleDetail {
  role: RoleRow;
  matrix: Record<string, Record<string, boolean>>;
  users: { id: number; name: string; email: string | null; isActive: boolean }[];
  activity: { id: number; action: string; actionLabel: string; actorName: string; targetName: string; createdAt: string }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MODULES = [
  "Dashboard","Students","Courses","Live Classes","Payments","Reports","Settings",
  "Command Center","Staff Management","Mentor Management","Teacher Management",
  "Ignite","Mastery","Leads","Demo Batches","Audit Logs",
];
const ACTIONS = ["view","create","edit","delete","assign","approve","export","manage"];

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin:       <Crown       className="w-4 h-4" style={{ color: "#F59E0B" }} />,
  admin:             <ShieldCheck className="w-4 h-4" style={{ color: NAVY }} />,
  manager:           <Star        className="w-4 h-4" style={{ color: ORANGE }} />,
  assistant_manager: <Users       className="w-4 h-4" style={{ color: "#7C3AED" }} />,
  sales_mentor:      <Zap         className="w-4 h-4" style={{ color: GREEN }} />,
  academic_mentor:   <BookOpen    className="w-4 h-4" style={{ color: "#0284C7" }} />,
  teacher:           <GraduationCap className="w-4 h-4" style={{ color: "#D97706" }} />,
  student:           <UserCheck2  className="w-4 h-4" style={{ color: "#6B7280" }} />,
};

function RoleIcon({ name }: { name: string }) {
  return ROLE_ICONS[name] ?? <ShieldCheck className="w-4 h-4 text-gray-400" />;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday"; if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function SystemBadge() {
  return <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />System</span>;
}
function ActiveBadge({ v }: { v: boolean }) {
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{v ? "Active" : "Inactive"}</span>;
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
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ background: danger ? "#EF4444" : NAVY }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create / Clone Modal ──────────────────────────────────────────────────────
function CreateRoleModal({ roles, onClose, onCreated, flash }: {
  roles: RoleRow[]; onClose: () => void;
  onCreated: (r: RoleRow) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName]         = useState("");
  const [desc, setDesc]         = useState("");
  const [cloneId, setCloneId]   = useState<string>("");
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), description: desc || undefined };
      if (cloneId) body.cloneFromId = parseInt(cloneId, 10);
      const r = await apiFetch("/admin/roles", { method: "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash(`Role "${d.role.name}" created`, true);
      onCreated(d.role);
      onClose();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm flex items-center gap-2" style={{ color: NAVY }}>
            <Plus className="w-4 h-4" /> Create Role
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Role Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. content_manager"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this role do?"
              rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Clone Permissions From (optional)</label>
            <select value={cloneId} onChange={e => setCloneId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">— Start empty —</option>
              {roles.map(r => <option key={r.id} value={String(r.id)}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" />Create</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Role Modal ───────────────────────────────────────────────────────────
function EditRoleModal({ role, onClose, onSaved, flash }: {
  role: RoleRow; onClose: () => void;
  onSaved: (r: RoleRow) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState(role.name);
  const [desc, setDesc] = useState(role.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/roles/${role.id}`, { method: "PATCH", body: JSON.stringify({ name, description: desc }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash("Role updated", true);
      onSaved(d.role);
      onClose();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm flex items-center gap-2" style={{ color: NAVY }}><Pencil className="w-4 h-4" />Edit Role</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Role Name {role.isSystem && <span className="text-amber-600">(system)</span>}</label>
            <input value={name} onChange={e => setName(e.target.value)} disabled={role.isSystem}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" />Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Clone Role Modal ──────────────────────────────────────────────────────────
function CloneRoleModal({ source, onClose, onCloned, flash }: {
  source: RoleRow; onClose: () => void;
  onCloned: (r: RoleRow) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName]   = useState(`${source.name}_copy`);
  const [desc, setDesc]   = useState(`Cloned from ${source.name}`);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/roles/${source.id}/clone`, { method: "POST", body: JSON.stringify({ name: name.trim(), description: desc }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash(`Role "${d.role.name}" cloned`, true);
      onCloned(d.role);
      onClose();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm flex items-center gap-2" style={{ color: NAVY }}><Copy className="w-4 h-4" />Clone Role</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500">Cloning permissions from <span className="font-bold text-gray-700">{source.name}</span>. Users will not be copied.</p>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">New Role Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Copy className="w-3.5 h-3.5" />Clone</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Permissions Matrix ────────────────────────────────────────────────────────
function PermissionsMatrix({ roleId, roleName, isSystem, initialMatrix, onSaved, flash }: {
  roleId: number; roleName: string; isSystem: boolean;
  initialMatrix: Record<string, Record<string, boolean>>;
  onSaved: () => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(initialMatrix);
  const [saving, setSaving] = useState<string | null>(null);
  const isSuperAdmin = roleName === "super_admin";

  async function toggle(mod: string, act: string) {
    if (isSuperAdmin) { flash("Super admin permissions cannot be modified", false); return; }
    const current = matrix[mod]?.[act] ?? false;
    const key = `${mod}|${act}`;
    setSaving(key);
    setMatrix(m => ({ ...m, [mod]: { ...m[mod], [act]: !current } }));
    try {
      const r = await apiFetch("/admin/permissions/update", {
        method: "POST", body: JSON.stringify({ roleId, module: mod, action: act, granted: !current }),
      });
      const d = await r.json();
      if (!r.ok) {
        setMatrix(m => ({ ...m, [mod]: { ...m[mod], [act]: current } }));
        throw new Error(d.error ?? "Failed");
      }
      onSaved();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(null); }
  }

  return (
    <div className="overflow-x-auto">
      {isSuperAdmin && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl text-xs text-amber-700 font-semibold">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          Super Admin always has full platform access. Permissions cannot be edited.
        </div>
      )}
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[140px]">Module</th>
            {ACTIONS.map(a => (
              <th key={a} className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center capitalize">{a}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {MODULES.map(mod => (
            <tr key={mod} className="hover:bg-gray-50/50">
              <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{mod}</td>
              {ACTIONS.map(act => {
                const checked = isSuperAdmin ? true : (matrix[mod]?.[act] ?? false);
                const key = `${mod}|${act}`;
                const isLoading = saving === key;
                return (
                  <td key={act} className="px-2 py-2 text-center">
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 mx-auto" />
                    ) : (
                      <button
                        onClick={() => toggle(mod, act)}
                        disabled={isSuperAdmin}
                        className={`w-5 h-5 rounded border-2 mx-auto flex items-center justify-center transition-colors disabled:cursor-not-allowed
                          ${checked
                            ? (isSuperAdmin ? "bg-amber-400 border-amber-400" : "border-blue-500 bg-blue-500")
                            : "border-gray-300 hover:border-blue-300"}`}>
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Role Detail Panel ─────────────────────────────────────────────────────────
function RoleDetailPanel({ roleId, allRoles, onClose, flash }: {
  roleId: number; allRoles: RoleRow[]; onClose: () => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [data, setData]   = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState<"matrix"|"users"|"activity">("matrix");
  const [saved, setSaved] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/roles/${roleId}`);
      setData(await r.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, [roleId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-20 gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
      <span className="text-sm">Loading role…</span>
    </div>
  );
  if (!data) return null;

  const { role, matrix, users, activity } = data;
  const tabs = [
    { key: "matrix"   as const, label: "Permissions Matrix" },
    { key: "users"    as const, label: `Users (${users.length})` },
    { key: "activity" as const, label: "Audit History" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Role header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50">
            <RoleIcon name={role.name} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm" style={{ color: NAVY }}>{role.name}</h3>
              {role.isSystem && <SystemBadge />}
              <ActiveBadge v={role.isActive} />
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{role.description ?? "No description"}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 text-xs text-gray-500">
        <span><span className="font-bold text-gray-700">{role.usersCount}</span> users</span>
        <span>·</span>
        <span><span className="font-bold text-gray-700">{role.permissionsCount}</span> permissions</span>
        <span>·</span>
        <span>Created {fmtDate(role.createdAt)}</span>
        {saved > 0 && <span className="ml-auto text-green-600 font-semibold flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
            style={tab === t.key ? { borderColor: NAVY, color: NAVY } : { borderColor: "transparent", color: "#9CA3AF" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "matrix" && (
          <PermissionsMatrix
            roleId={role.id} roleName={role.name} isSystem={role.isSystem}
            initialMatrix={matrix}
            onSaved={() => setSaved(n => n + 1)}
            flash={flash}
          />
        )}

        {tab === "users" && (
          <div className="space-y-2">
            {users.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                <Users className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-semibold">No users with this role</p>
              </div>
            ) : users.map(u => (
              <div key={u.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{u.name}</p>
                  <p className="text-[10px] text-gray-400">{u.email ?? "—"}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {u.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "activity" && (
          <div className="space-y-2">
            {activity.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-gray-400">
                <Zap className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-semibold">No activity yet</p>
              </div>
            ) : activity.map(a => (
              <div key={a.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-gray-700">{a.actionLabel ?? a.action}</p>
                  <p className="text-[10px] text-gray-400">by {a.actorName}</p>
                </div>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function RolesPermissionsView({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [roles, setRoles]       = useState<RoleRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selectedId, setSelected] = useState<number | null>(null);

  const [showCreate, setShowCreate]   = useState(false);
  const [editTarget, setEditTarget]   = useState<RoleRow | null>(null);
  const [cloneTarget, setCloneTarget] = useState<RoleRow | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<RoleRow | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await apiFetch("/admin/roles");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setRoles(d.items);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const r = await apiFetch(`/admin/roles/${deactivateTarget.id}`, {
        method: "PATCH", body: JSON.stringify({ isActive: !deactivateTarget.isActive }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setRoles(rs => rs.map(r => r.id === deactivateTarget.id ? { ...r, isActive: !deactivateTarget.isActive } : r));
      flash(`Role "${deactivateTarget.name}" ${deactivateTarget.isActive ? "deactivated" : "activated"}`, true);
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setDeactivating(false); setDeactivateTarget(null); }
  }

  const selectedRole = roles.find(r => r.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: NAVY }}>
            <ShieldCheck className="w-5 h-5" /> Roles &amp; Permissions
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Database-driven RBAC — central authorization engine for the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: NAVY }}>
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 min-h-[600px]">
        {/* Left: Roles list */}
        <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Roles ({roles.length})</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
              <span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <XCircle className="w-6 h-6 text-red-400" />
              <button onClick={load} className="text-xs font-bold text-blue-500 hover:underline">Retry</button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {roles.map(r => (
                <button key={r.id} onClick={() => setSelected(r.id === selectedId ? null : r.id)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={selectedId === r.id ? { background: `${NAVY}08`, borderLeft: `3px solid ${NAVY}` } : { borderLeft: "3px solid transparent" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RoleIcon name={r.name} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{r.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400">{r.usersCount} users</span>
                          {r.isSystem && <SystemBadge />}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${selectedId === r.id ? "rotate-180" : ""}`} />
                  </div>

                  {/* Inline actions (show on hover via group) */}
                  {selectedId === r.id && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setEditTarget(r)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold hover:bg-blue-50 text-gray-500 hover:text-blue-700">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => setCloneTarget(r)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold hover:bg-purple-50 text-gray-500 hover:text-purple-700">
                        <Copy className="w-3 h-3" /> Clone
                      </button>
                      {!r.isSystem && (
                        <button onClick={() => setDeactivateTarget(r)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${r.isActive ? "hover:bg-red-50 text-gray-500 hover:text-red-600" : "hover:bg-green-50 text-gray-500 hover:text-green-600"}`}>
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail / Matrix */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-w-0">
          {selectedRole ? (
            <RoleDetailPanel
              roleId={selectedRole.id}
              allRoles={roles}
              onClose={() => setSelected(null)}
              flash={flash}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-300">
              <ShieldCheck className="w-12 h-12" />
              <p className="text-sm font-semibold text-gray-400">Select a role to view and edit permissions</p>
              <p className="text-xs text-gray-300 text-center max-w-xs">Click any role on the left to open the permissions matrix, view assigned users, and see the audit history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Role hierarchy note */}
      <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
        <p className="text-[11px] text-blue-600 font-semibold">Role Hierarchy</p>
        <p className="text-[11px] text-blue-500 mt-0.5">
          super_admin → admin → manager → assistant_manager → sales_mentor / academic_mentor → teacher → student
        </p>
        <p className="text-[10px] text-blue-400 mt-1">
          Super admin always has full access and cannot be restricted. System roles cannot be deactivated. Future modules will use hasPermission() instead of role checks.
        </p>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateRoleModal
          roles={roles} onClose={() => setShowCreate(false)}
          onCreated={r => setRoles(rs => [...rs, { ...r, usersCount: 0, permissionsCount: 0 }])}
          flash={flash}
        />
      )}
      {editTarget && (
        <EditRoleModal
          role={editTarget} onClose={() => setEditTarget(null)}
          onSaved={updated => setRoles(rs => rs.map(r => r.id === updated.id ? { ...r, ...updated } : r))}
          flash={flash}
        />
      )}
      {cloneTarget && (
        <CloneRoleModal
          source={cloneTarget} onClose={() => setCloneTarget(null)}
          onCloned={r => setRoles(rs => [...rs, { ...r, usersCount: 0, permissionsCount: 0 }])}
          flash={flash}
        />
      )}
      {deactivateTarget && (
        <ConfirmDialog
          title={deactivateTarget.isActive ? "Deactivate Role" : "Activate Role"}
          message={deactivateTarget.isActive
            ? `"${deactivateTarget.name}" will be marked inactive. Users with this role won't lose access until Phase E enforcement is live.`
            : `"${deactivateTarget.name}" will be marked active again.`}
          confirmLabel={deactivateTarget.isActive ? "Deactivate" : "Activate"}
          danger={deactivateTarget.isActive}
          onConfirm={doDeactivate}
          onClose={() => setDeactivateTarget(null)}
          loading={deactivating}
        />
      )}
    </div>
  );
}
