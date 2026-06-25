import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Loader2, XCircle, RefreshCw, X, Eye, List, Activity,
  Shield, Users, GraduationCap, BookOpen, Zap, AlertTriangle,
  CalendarDays, Clock,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    ...opts,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LogRow {
  id: number;
  actorId: number | null;
  actorName: string;
  actorRole: string | null;
  action: string;
  actionLabel: string | null;
  category: string;
  module: string | null;
  targetType: string;
  targetId: number;
  targetName: string;
  createdAt: string;
}

interface LogDetail extends LogRow {
  beforeValue: unknown;
  afterValue: unknown;
  ipAddress: string | null;
  actorEmail: string | null;
}

interface AuditListResponse {
  items: LogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis: {
    totalEvents: number;
    todayEvents: number;
    roleChanges: number;
    permChanges: number;
    staffChanges: number;
    systemEvents: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const KNOWN_ACTIONS = [
  "staff_updated","staff_activated","staff_deactivated",
  "mentor_updated","mentor_activated","mentor_deactivated","mentor_type_changed",
  "teacher_updated","teacher_activated","teacher_deactivated",
  "role_created","role_updated","role_cloned","permission_updated",
];
const KNOWN_MODULES = [
  "staff","mentor","teacher","roles","system","student","payment","ignite",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)  return "Just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function actionColor(action: string): string {
  if (action.includes("created") || action.includes("activated")) return "#059669";
  if (action.includes("deactivated") || action.includes("deleted")) return "#EF4444";
  if (action.includes("cloned"))   return "#7C3AED";
  if (action.includes("updated"))  return "#D97706";
  if (action.includes("permission")) return NAVY;
  return "#6B7280";
}

function ActionBadge({ action, label }: { action: string; label: string | null }) {
  const color = actionColor(action);
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: `${color}18`, color }}>
      {label ?? action}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-gray-300 text-xs">—</span>;
  const map: Record<string, string> = {
    super_admin: "#F59E0B", admin: NAVY, manager: ORANGE,
    teacher: "#D97706", mentor: "#0284C7", student: "#6B7280",
  };
  const color = map[role] ?? "#6B7280";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ background: `${color}15`, color }}>
      {role.replace(/_/g, " ")}
    </span>
  );
}

function ModuleBadge({ module }: { module: string | null }) {
  if (!module) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">
      {module}
    </span>
  );
}

// ── JSON Viewer ───────────────────────────────────────────────────────────────
function JsonViewer({ value, label }: { value: unknown; label: string }) {
  const [expanded, setExpanded] = useState(false);
  if (value === null || value === undefined) {
    return (
      <div>
        <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{label}</p>
        <span className="text-xs text-gray-300 italic">null</span>
      </div>
    );
  }
  const preview = JSON.stringify(value);
  const isShort = preview.length <= 60;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {!isShort && (
          <button onClick={() => setExpanded(e => !e)} className="text-[10px] font-semibold text-blue-500 hover:underline">
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      <pre className={`text-[11px] bg-gray-900 text-green-400 rounded-xl p-3 overflow-x-auto ${!isShort && !expanded ? "max-h-16 overflow-hidden" : ""}`}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ logId, onClose }: { logId: number; onClose: () => void }) {
  const [event, setEvent]   = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/admin/cc/audit-logs/${logId}`)
      .then(r => r.json())
      .then(d => setEvent(d.event))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [logId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-black text-sm flex items-center gap-2" style={{ color: NAVY }}>
            <Eye className="w-4 h-4" /> Audit Event Details
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
            <span className="text-sm">Loading event…</span>
          </div>
        ) : !event ? (
          <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
            <XCircle className="w-6 h-6 text-red-400" />
            <span className="text-sm">Event not found</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Event info */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Event Information</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400">Event ID</p>
                  <p className="text-xs font-bold text-gray-700">#{event.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Timestamp (IST)</p>
                  <p className="text-xs font-semibold text-gray-700">{fmtDateTime(event.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Action</p>
                  <ActionBadge action={event.action} label={event.actionLabel} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Module</p>
                  <ModuleBadge module={event.module} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Category</p>
                  <p className="text-xs font-semibold text-gray-600 capitalize">{event.category}</p>
                </div>
              </div>
            </div>

            {/* Actor info */}
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Actor</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-blue-400">Name</p>
                  <p className="text-xs font-bold text-blue-800">{event.actorName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-blue-400">Role</p>
                  <RoleBadge role={event.actorRole} />
                </div>
                {event.actorEmail && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-blue-400">Email</p>
                    <p className="text-xs text-blue-700">{event.actorEmail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Target info */}
            <div className="bg-orange-50 rounded-xl p-3 space-y-2">
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2">Target</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-orange-400">Name</p>
                  <p className="text-xs font-bold text-orange-800">{event.targetName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-orange-400">Type</p>
                  <p className="text-xs font-semibold text-orange-700 capitalize">{event.targetType}</p>
                </div>
                <div>
                  <p className="text-[10px] text-orange-400">ID</p>
                  <p className="text-xs font-semibold text-orange-700">#{event.targetId}</p>
                </div>
              </div>
            </div>

            {/* Before / After */}
            <JsonViewer value={event.beforeValue} label="Old Value (Before)" />
            <JsonViewer value={event.afterValue}  label="New Value (After)" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline View ─────────────────────────────────────────────────────────────
function TimelineView({ items, onViewDetail }: { items: LogRow[]; onViewDetail: (id: number) => void }) {
  if (items.length === 0) return null;

  // Group by date
  const groups: Record<string, LogRow[]> = {};
  for (const item of items) {
    const d = fmtDate(item.createdAt);
    (groups[d] ??= []).push(item);
  }

  return (
    <div className="space-y-6 py-2">
      {Object.entries(groups).map(([date, events]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <div className="px-3 py-1 rounded-full text-[11px] font-bold text-white" style={{ background: NAVY }}>{date}</div>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[10px] text-gray-400">{events.length} events</span>
          </div>
          <div className="relative ml-4">
            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-100" />
            <div className="space-y-3">
              {events.map(e => (
                <div key={e.id} className="flex items-start gap-3 pl-8 relative">
                  <div className="absolute left-0 top-2.5 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                    style={{ background: actionColor(e.action) }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-gray-100 px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ActionBadge action={e.action} label={e.actionLabel} />
                          <ModuleBadge module={e.module} />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-semibold">{e.actorName}</span>
                          {" → "}
                          <span className="text-gray-500">{e.targetName}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(e.createdAt)}</span>
                        <button onClick={() => onViewDetail(e.id)}
                          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AuditLogsView({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [data, setData]          = useState<AuditListResponse | null>(null);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState<string | null>(null);
  const [search, setSearch]      = useState("");
  const [roleFilter, setRole]    = useState("all");
  const [actionFilter, setAction] = useState("all");
  const [moduleFilter, setModule] = useState("all");
  const [dateFrom, setDateFrom]  = useState("");
  const [dateTo, setDateTo]      = useState("");
  const [sort, setSort]          = useState("createdAt");
  const [order, setOrder]        = useState<"asc"|"desc">("desc");
  const [page, setPage]          = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode]  = useState<"table"|"timeline">("table");
  const [detailId, setDetailId]  = useState<number | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({
        search: debouncedSearch, role: roleFilter, action: actionFilter,
        module: moduleFilter, dateFrom, dateTo, sort, order,
        page: String(page), limit: "25",
      });
      const r = await apiFetch(`/admin/cc/audit-logs?${p}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [debouncedSearch, roleFilter, actionFilter, moduleFilter, dateFrom, dateTo, sort, order, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, roleFilter, actionFilter, moduleFilter, dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  function toggleSort(col: string) {
    if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc");
    else { setSort(col); setOrder("desc"); }
  }

  const SortIcon = ({ col }: { col: string }) => (
    sort === col
      ? (order === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />
  );

  const hasActiveFilters = roleFilter !== "all" || actionFilter !== "all" || moduleFilter !== "all" || dateFrom || dateTo;
  const kpis = data?.kpis;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: NAVY }}>
            <Activity className="w-5 h-5" /> Audit Logs
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Complete activity trail for every admin action on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 bg-gray-100 rounded-xl p-0.5">
            <button onClick={() => setViewMode("table")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={viewMode === "table" ? { background: "white", color: NAVY, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#9CA3AF" }}>
              <List className="w-3.5 h-3.5" /> Table
            </button>
            <button onClick={() => setViewMode("timeline")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={viewMode === "timeline" ? { background: "white", color: NAVY, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#9CA3AF" }}>
              <Activity className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total Events",  value: kpis?.totalEvents   ?? "—", icon: <Activity className="w-4 h-4" />,    color: NAVY    },
          { label: "Today",         value: kpis?.todayEvents   ?? "—", icon: <CalendarDays className="w-4 h-4" />, color: "#059669" },
          { label: "Role Changes",  value: kpis?.roleChanges   ?? "—", icon: <Shield className="w-4 h-4" />,      color: "#7C3AED" },
          { label: "Perm Changes",  value: kpis?.permChanges   ?? "—", icon: <Zap className="w-4 h-4" />,         color: ORANGE  },
          { label: "Staff Changes", value: kpis?.staffChanges  ?? "—", icon: <Users className="w-4 h-4" />,       color: "#0284C7" },
          { label: "System Events", value: kpis?.systemEvents  ?? "—", icon: <AlertTriangle className="w-4 h-4" />, color: "#EF4444" },
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
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search actor, target, action…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
            style={showFilters ? { background: `${NAVY}10`, borderColor: NAVY, color: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
            <Filter className="w-3.5 h-3.5" /> Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <select value={roleFilter} onChange={e => setRole(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none">
              <option value="all">All Roles</option>
              {["super_admin","admin","manager","assistant_manager","sales_mentor","academic_mentor","teacher","student"].map(r =>
                <option key={r} value={r}>{r.replace(/_/g," ")}</option>
              )}
            </select>
            <select value={actionFilter} onChange={e => setAction(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none">
              <option value="all">All Actions</option>
              {KNOWN_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={moduleFilter} onChange={e => setModule(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none">
              <option value="all">All Modules</option>
              {KNOWN_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
              placeholder="From" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none"
              placeholder="To" />
            {hasActiveFilters && (
              <button onClick={() => { setRole("all"); setAction("all"); setModule("all"); setDateFrom(""); setDateTo(""); }}
                className="text-xs font-semibold text-orange-500 hover:underline px-2">Clear all</button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
            <span className="text-sm">Loading audit logs…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={load} className="px-4 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>Retry</button>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Activity className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-semibold">No audit events found</p>
            <p className="text-xs text-gray-300">{hasActiveFilters || search ? "Try adjusting your filters" : "No activity has been recorded yet"}</p>
          </div>
        ) : viewMode === "timeline" ? (
          <div className="p-4">
            <TimelineView items={data.items} onViewDetail={setDetailId} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { label: "Date & Time", col: "createdAt", sortable: true  },
                    { label: "Actor",       col: "actor",     sortable: true  },
                    { label: "Role",        col: "role",      sortable: false },
                    { label: "Action",      col: "action",    sortable: true  },
                    { label: "Module",      col: "module",    sortable: true  },
                    { label: "Target",      col: "target",    sortable: false },
                    { label: "",            col: "actions",   sortable: false },
                  ].map(h => (
                    <th key={h.col}
                      className={`text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${h.sortable ? "cursor-pointer hover:text-gray-600 select-none" : ""}`}
                      onClick={() => h.sortable && toggleSort(h.col)}>
                      <span className="flex items-center gap-1">{h.label}{h.sortable && <SortIcon col={h.col} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-gray-700">{fmtDateTime(item.createdAt)}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{item.actorName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={item.actorRole} />
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={item.action} label={item.actionLabel} />
                    </td>
                    <td className="px-4 py-3">
                      <ModuleBadge module={item.module} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">{item.targetName}</p>
                      <p className="text-[10px] text-gray-400 capitalize">{item.targetType} #{item.targetId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailId(item.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
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
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
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
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailId !== null && <DetailModal logId={detailId} onClose={() => setDetailId(null)} />}
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
