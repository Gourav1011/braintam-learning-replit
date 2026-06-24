import { useState, useEffect, useCallback } from "react";
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, BarChart3,
  BookOpen, CheckCircle2, ChevronLeft, ChevronRight,
  Download, FileText, Filter, GraduationCap, Loader2,
  Monitor, RefreshCw, Search, Shield, Smartphone, TrendingUp,
  Users, X, Zap, Lock, Globe, Clock,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = API_BASE;
  return fetch(`${base}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

const HIGH_RISK_KW = ["role_change", "change_role", "disable", "deactivate", "permission_change", "archive", "delete_user", "settings_change", "bulk_disable"];
function isHighRisk(action: string) { return HIGH_RISK_KW.some(k => action.toLowerCase().includes(k)); }

function getModule(log: AuditLog): string {
  if (log.module) return log.module;
  const map: Record<string, string> = {
    user: "Users", student: "Students", course: "Courses",
    homework: "Homework", test: "Tests", assignment: "Assignments",
    live_class: "Live Classes", attendance: "Attendance",
    enrollment: "Enrollments", teacher: "Teachers", teacher_course: "Teachers",
    mentor: "Mentors", mentor_assignment: "Mentors",
    follow_up: "CRM", lead: "CRM", demo_batch: "Demo Batches", demo_session: "Demo Batches",
    settings: "Settings", permission: "Permissions", announcement: "Announcements", checkin: "Staff Attendance",
  };
  return map[log.targetType] ?? "System";
}

function formatAction(a: string) {
  return a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatRole(r: string) {
  const m: Record<string, string> = { admin: "Admin", super_admin: "Super Admin", teacher: "Teacher", mentor: "Mentor", sales: "Sales Mentor", student: "Student" };
  return m[r] ?? r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(logs: AuditLog[]) {
  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
  const groups = new Map<string, AuditLog[]>();
  for (const log of logs) {
    const d = new Date(log.createdAt).toLocaleDateString("en-CA");
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d)!.push(log);
  }
  return [...groups.entries()].map(([d, ls]) => ({
    date: d,
    displayDate: new Date(d + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    badge: d === today ? "Today" : d === yesterday ? "Yesterday" : "",
    logs: ls,
  }));
}

function jsonToString(v: unknown): string {
  if (!v) return "—";
  if (typeof v === "string") return v.slice(0, 60);
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).slice(0, 3);
    return entries.map(([k, val]) => `${k}: ${String(val).slice(0, 20)}`).join(", ");
  }
  return String(v);
}

interface AuditLog {
  id: number;
  actorId: number | null;
  actorName: string;
  actorRole: string | null;
  actorEmail: string | null;
  action: string;
  actionLabel: string | null;
  category: string;
  module: string | null;
  targetType: string;
  targetId: number;
  targetName: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  metadata: string | null;
  createdAt: string;
}

interface Stats {
  todayTotal: number;
  yesterdayTotal: number;
  usersModified: number;
  studentsUpdated: number;
  leadsConverted: number;
  highRiskCount: number;
}

interface Filters {
  search: string;
  module: string;
  action: string;
  role: string;
  dateFrom: string;
  dateTo: string;
  highRisk: boolean;
  status: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const nDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const defaultFilters: Filters = { search: "", module: "", action: "", role: "", dateFrom: nDaysAgo(30), dateTo: todayStr(), highRisk: false, status: "" };

const MODULES = ["Users", "Students", "CRM", "Demo Batches", "Courses", "Attendance", "Homework", "Assignments", "Tests", "Teachers", "Mentors", "Settings", "Permissions"];
const ROLES = ["admin", "super_admin", "teacher", "mentor", "student"];

function AvatarBadge({ name, size = 8 }: { name: string; size?: number }) {
  const colors = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#0B2B6B"];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
      style={{ width: size * 4, height: size * 4, background: bg, fontSize: size < 8 ? 10 : 12 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StatCard({ icon, label, value, delta, deltaLabel, color, bg }: { icon: React.ReactNode; label: string; value: number; delta?: number; deltaLabel?: string; color: string; bg: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-black" style={{ color: NAVY }}>{value}</div>
      <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>
      {deltaLabel && <div className="text-[10px] text-gray-400 mt-0.5">{deltaLabel}</div>}
    </div>
  );
}

function TimelineEntry({ log }: { log: AuditLog }) {
  const hr = isHighRisk(log.action);
  const time = new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const actionLabel = log.actionLabel ?? formatAction(log.action);
  const mod = getModule(log);
  const hasDetails = log.beforeValue || log.afterValue || log.ipAddress;

  return (
    <div className="flex gap-2 pb-3">
      <div className="flex flex-col items-center mt-1.5 flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: hr ? "#EF4444" : "#3B82F6" }} />
        <div className="w-px flex-1 mt-1" style={{ background: hr ? "#FCA5A5" : "#BFDBFE" }} />
      </div>
      <div className="text-[11px] text-gray-400 w-14 flex-shrink-0 pt-0.5 leading-tight">{time}</div>
      <div className={`flex-1 bg-white rounded-xl border shadow-sm p-3.5 min-w-0 ${hr ? "border-red-200" : "border-gray-100"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarBadge name={log.actorName} size={8} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold truncate" style={{ color: NAVY }}>{log.actorName}</span>
                {log.actorRole && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: `${NAVY}15`, color: NAVY }}>
                    {formatRole(log.actorRole)}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400">{mod}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold" style={{ color: NAVY }}>{actionLabel}</div>
              <div className="text-[10px] text-gray-400">{log.targetType}: {log.targetName}</div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${hr ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
              {hr ? "High Risk" : "Success"}
            </span>
          </div>
        </div>

        <div className="sm:hidden mt-1">
          <div className="text-xs font-bold" style={{ color: NAVY }}>{actionLabel}</div>
          <div className="text-[10px] text-gray-400">{log.targetType}: {log.targetName}</div>
        </div>

        {hasDetails && (
          <div className="flex items-start gap-4 mt-2.5 pt-2.5 border-t border-gray-50 flex-wrap">
            <div className="flex-1 min-w-0 space-y-0.5">
              {log.targetName && (
                <p className="text-[11px]"><span className="font-semibold text-gray-600">Target: </span><span className="text-gray-500">{log.targetName}</span></p>
              )}
              {log.beforeValue && (
                <p className="text-[11px]"><span className="font-semibold text-gray-600">Old: </span><span className="text-gray-500">{jsonToString(log.beforeValue)}</span></p>
              )}
              {log.afterValue && (
                <p className="text-[11px]"><span className="font-semibold text-gray-600">New: </span><span className="text-gray-500">{jsonToString(log.afterValue)}</span></p>
              )}
            </div>
            <div className="text-[10px] text-gray-400 flex-shrink-0 text-right space-y-0.5">
              {log.ipAddress && <p>IP: {log.ipAddress}</p>}
              {log.device && (
                <p className="flex items-center gap-1 justify-end">
                  {log.device === "mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                  {log.browser ?? log.device}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TableRow({ log }: { log: AuditLog }) {
  const hr = isHighRisk(log.action);
  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${hr ? "bg-red-50/30" : ""}`}>
      <td className="px-4 py-2.5 text-[11px] text-gray-400 whitespace-nowrap">
        <div>{new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
        <div>{new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AvatarBadge name={log.actorName} size={6} />
          <div>
            <div className="text-xs font-bold" style={{ color: NAVY }}>{log.actorName}</div>
            {log.actorEmail && <div className="text-[10px] text-gray-400 truncate max-w-[100px]">{log.actorEmail}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        {log.actorRole && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${NAVY}15`, color: NAVY }}>{formatRole(log.actorRole)}</span>}
      </td>
      <td className="px-3 py-2.5 text-[11px] text-gray-500">{getModule(log)}</td>
      <td className="px-3 py-2.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${hr ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
          {log.actionLabel ?? formatAction(log.action)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-gray-500">
        <div className="font-semibold" style={{ color: NAVY }}>{log.targetName}</div>
        <div className="text-gray-400">{log.targetType}</div>
      </td>
      <td className="px-3 py-2.5 text-[10px] text-gray-400 max-w-[100px] truncate">{jsonToString(log.beforeValue)}</td>
      <td className="px-3 py-2.5 text-[10px] text-gray-400 max-w-[100px] truncate">{jsonToString(log.afterValue)}</td>
      <td className="px-3 py-2.5 text-[10px] text-gray-400">
        {log.ipAddress && <div>{log.ipAddress}</div>}
        {log.device && <div>{log.device}</div>}
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${hr ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
          {hr ? "High Risk" : "Success"}
        </span>
      </td>
    </tr>
  );
}

const PAGE_LIMIT = 50;

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [quickDate, setQuickDate] = useState<"today" | "yesterday" | "week" | "month" | "custom">("month");

  const [pending, setPending] = useState<Filters>(defaultFilters);
  const [applied, setApplied] = useState<Filters>(defaultFilters);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await apiFetch("/admin/audit-logs/stats");
      if (r.ok) setStats(await r.json());
    } finally { setStatsLoading(false); }
  }, []);

  const loadLogs = useCallback(async (filters: Filters, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_LIMIT) });
    if (filters.search) params.set("search", filters.search);
    if (filters.module) params.set("module", filters.module);
    if (filters.action) params.set("action", filters.action);
    if (filters.role) params.set("role", filters.role);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.highRisk) params.set("highRisk", "true");
    try {
      const r = await apiFetch(`/admin/audit-logs?${params}`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) { setLogs(d); setTotal(d.length); setPages(1); }
        else { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); }
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadLogs(applied, page); }, [applied, page, loadLogs]);

  function applyFilters() { setApplied({ ...pending }); setPage(1); }
  function clearFilters() { setPending(defaultFilters); setApplied(defaultFilters); setPage(1); setQuickDate("month"); }

  function setQuickDateRange(q: typeof quickDate) {
    const t = todayStr();
    const ranges: Record<string, { dateFrom: string; dateTo: string }> = {
      today: { dateFrom: t, dateTo: t },
      yesterday: { dateFrom: nDaysAgo(1), dateTo: nDaysAgo(1) },
      week: { dateFrom: nDaysAgo(7), dateTo: t },
      month: { dateFrom: nDaysAgo(30), dateTo: t },
    };
    const range = ranges[q] ?? { dateFrom: t, dateTo: t };
    setQuickDate(q);
    setPending(prev => ({ ...prev, ...range }));
    setApplied(prev => ({ ...prev, ...range }));
    setPage(1);
  }

  function exportCSV() {
    const header = "Time,Actor,Role,Module,Action,Target Type,Target,Old Value,New Value,IP,Device,Status";
    const rows = logs.map(l => [
      new Date(l.createdAt).toLocaleString("en-IN"),
      l.actorName, l.actorRole ?? "", getModule(l),
      l.actionLabel ?? l.action, l.targetType, l.targetName,
      jsonToString(l.beforeValue), jsonToString(l.afterValue),
      l.ipAddress ?? "", l.device ?? "", isHighRisk(l.action) ? "High Risk" : "Success",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const groups = groupByDate(logs);
  const todayDelta = stats ? (stats.yesterdayTotal > 0 ? Math.round(((stats.todayTotal - stats.yesterdayTotal) / stats.yesterdayTotal) * 100) : 0) : 0;

  const ACTION_TYPES = [
    { label: "User Management", icon: <Users className="w-4 h-4" />, color: "#4F46E5", bg: "#EEF2FF", matches: (l: AuditLog) => ["user", "student"].includes(l.targetType) || l.action.includes("login") || l.action.includes("role") },
    { label: "Student Management", icon: <GraduationCap className="w-4 h-4" />, color: GREEN, bg: "#ECFDF5", matches: (l: AuditLog) => l.targetType === "student" || l.action.includes("enroll") || l.action.includes("convert") },
    { label: "CRM", icon: <TrendingUp className="w-4 h-4" />, color: ORANGE, bg: "#FFF7ED", matches: (l: AuditLog) => ["follow_up", "lead", "demo_batch"].includes(l.targetType) },
    { label: "Attendance", icon: <CheckCircle2 className="w-4 h-4" />, color: "#7C3AED", bg: "#F5F3FF", matches: (l: AuditLog) => l.targetType === "attendance" || l.targetType === "checkin" },
    { label: "Homework", icon: <BookOpen className="w-4 h-4" />, color: "#0891B2", bg: "#ECFEFF", matches: (l: AuditLog) => ["homework", "assignment", "test"].includes(l.targetType) },
    { label: "System", icon: <Shield className="w-4 h-4" />, color: "#6B7280", bg: "#F9FAFB", matches: (l: AuditLog) => ["settings", "permission", "announcement"].includes(l.targetType) || l.category === "system" },
  ];

  const QUICK_DATES = [
    { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" }, { key: "month", label: "This Month" },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-black text-lg" style={{ color: NAVY }}>Audit Logs</h3>
          <p className="text-xs text-gray-400 mt-0.5">Track and monitor all important activities in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadStats(); loadLogs(applied, page); }}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            <Download className="w-3.5 h-3.5" /> Export Logs
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<Activity className="w-5 h-5" />} label="Today's Activities" value={stats?.todayTotal ?? 0} delta={todayDelta} deltaLabel="vs yesterday" color="#4F46E5" bg="#EEF2FF" />
          <StatCard icon={<Users className="w-5 h-5" />} label="Users Modified" value={stats?.usersModified ?? 0} deltaLabel="today" color={GREEN} bg="#ECFDF5" />
          <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Students Updated" value={stats?.studentsUpdated ?? 0} deltaLabel="today" color="#7C3AED" bg="#F5F3FF" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Leads Converted" value={stats?.leadsConverted ?? 0} deltaLabel="today" color={ORANGE} bg="#FFF7ED" />
          <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="High Risk Events" value={stats?.highRiskCount ?? 0} deltaLabel="today" color="#DC2626" bg="#FEF2F2" />
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-4 items-start">
        {/* Left: Filter Panel */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3 sticky top-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm flex items-center gap-1.5" style={{ color: NAVY }}>
              <Filter className="w-3.5 h-3.5" /> Filters
            </h4>
            <button onClick={clearFilters} className="text-xs text-blue-500 hover:text-blue-600 font-semibold transition-colors">Clear All</button>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Date Range</label>
            <div className="space-y-1.5">
              <input type="date" value={pending.dateFrom} onChange={e => { setPending(p => ({ ...p, dateFrom: e.target.value })); setQuickDate("custom"); }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400" />
              <input type="date" value={pending.dateTo} onChange={e => { setPending(p => ({ ...p, dateTo: e.target.value })); setQuickDate("custom"); }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Module */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Module</label>
            <select value={pending.module} onChange={e => setPending(p => ({ ...p, module: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
              <option value="">All Modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Action */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Action</label>
            <input value={pending.action} onChange={e => setPending(p => ({ ...p, action: e.target.value }))}
              placeholder="e.g. login, create…"
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400" />
          </div>

          {/* User/Actor */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">User / Actor</label>
            <div className="relative">
              <Search className="w-3 h-3 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={pending.search} onChange={e => setPending(p => ({ ...p, search: e.target.value }))}
                placeholder="Search user…"
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400" />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Role</label>
            <select value={pending.role} onChange={e => setPending(p => ({ ...p, role: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
              <option value="">All Roles</option>
              {ROLES.map(r => <option key={r} value={r}>{formatRole(r)}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1.5">Status</label>
            <select value={pending.highRisk ? "high_risk" : "all"} onChange={e => setPending(p => ({ ...p, highRisk: e.target.value === "high_risk" }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
              <option value="all">All Status</option>
              <option value="high_risk">High Risk Only</option>
            </select>
          </div>

          <button onClick={applyFilters}
            className="w-full py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
            style={{ background: NAVY }}>
            Apply Filters
          </button>
          <button onClick={exportCSV}
            className="w-full py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5">
            <Download className="w-3 h-3" /> Export Logs
          </button>
        </div>

        {/* Right: Timeline / Table */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View mode toggle */}
            <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
              {(["timeline", "table"] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === m ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
                  style={viewMode === m ? { background: NAVY } : {}}>
                  {m === "timeline" ? <Activity className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
                  {m === "timeline" ? "Timeline View" : "Table View"}
                </button>
              ))}
            </div>

            {/* Quick date buttons */}
            <div className="flex gap-1">
              {QUICK_DATES.map(q => (
                <button key={q.key} onClick={() => setQuickDateRange(q.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${quickDate === q.key ? "text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  style={quickDate === q.key ? { background: "#3B82F6" } : {}}>
                  {q.label}
                </button>
              ))}
            </div>

            <div className="ml-auto text-xs text-gray-400">
              {total} records
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-20 text-center">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">No audit logs found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or date range</p>
            </div>
          ) : viewMode === "timeline" ? (
            <div className="space-y-4">
              {groups.map(group => {
                const isCollapsed = collapsed.has(group.date);
                const visible = isCollapsed ? group.logs.slice(0, 5) : group.logs;
                const hidden = group.logs.length - 5;
                return (
                  <div key={group.date}>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-black text-sm" style={{ color: NAVY }}>{group.displayDate}</h4>
                      {group.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-600">{group.badge}</span>
                      )}
                      <div className="flex-1 h-px bg-gray-100 ml-1" />
                    </div>
                    <div>
                      {visible.map(log => <TimelineEntry key={log.id} log={log} />)}
                      {group.logs.length > 5 && (
                        <button onClick={() => setCollapsed(prev => {
                          const s = new Set(prev);
                          if (s.has(group.date)) s.delete(group.date);
                          else s.add(group.date);
                          return s;
                        })}
                          className="ml-5 text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition-colors">
                          {isCollapsed ? `Show ${hidden} more activities →` : "← Show less"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Time", "Actor", "Role", "Module", "Action", "Target", "Old Value", "New Value", "IP/Device", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => <TableRow key={log.id} log={log} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <span className="text-xs text-gray-500">
                Showing {((page - 1) * PAGE_LIMIT) + 1}–{Math.min(page * PAGE_LIMIT, total)} of {total} logs
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-all">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  let p = i + 1;
                  if (pages > 7) {
                    if (page <= 4) p = i + 1;
                    else if (page >= pages - 3) p = pages - 6 + i;
                    else p = page - 3 + i;
                  }
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p === page ? "text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"}`}
                      style={p === page ? { background: NAVY } : {}}>{p}</button>
                  );
                })}
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-all">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Types Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h4 className="font-black text-xs mb-3" style={{ color: NAVY }}>Action Types</h4>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {ACTION_TYPES.map(at => {
            const count = logs.filter(at.matches).length;
            return (
              <div key={at.label} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: at.bg }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: at.color, background: `${at.color}20` }}>
                  {at.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-black" style={{ color: NAVY }}>{count}</div>
                  <div className="text-[9px] text-gray-500 leading-tight">{at.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Immutable footer */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Lock className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-xs text-gray-400">All logs are immutable and cannot be edited or deleted.</p>
      </div>
    </div>
  );
}
