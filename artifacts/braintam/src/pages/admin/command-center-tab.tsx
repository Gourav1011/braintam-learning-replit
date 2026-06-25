import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Users, UserCheck2, GraduationCap, ShieldCheck,
  FileText, Settings, ChevronRight, TrendingUp, Activity,
  Clock, CheckCircle2, AlertCircle, Zap,
  RefreshCw, Loader2, AlertTriangle, XCircle,
  ArrowRight,
} from "lucide-react";
import { StaffManagementView } from "./command-center-staff-tab";
import { MentorManagementView } from "./command-center-mentors-tab";
import { TeacherManagementView } from "./command-center-teachers-tab";
import { RolesPermissionsView } from "./command-center-roles-tab";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const PURPLE = "#8B5CF6";
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
type CCView =
  | "dashboard"
  | "staff-management"
  | "mentor-management"
  | "teacher-management"
  | "roles-permissions"
  | "audit-logs"
  | "settings";

interface DashboardData {
  kpis: {
    totalStaff: number;
    activeStaff: number;
    activeMentors: number;
    activeTeachers: number;
    totalStudents: number;
    activeDemoBatches: number;
    todayCheckins: number;
    paidUnassigned: number;
  };
  staffDistribution: { role: string; total: number; active: number }[];
  recentActivity: {
    id: number;
    actorName: string;
    actorRole: string | null;
    action: string;
    actionLabel: string | null;
    module: string | null;
    targetName: string;
    targetType: string;
    createdAt: string;
  }[];
  pendingActions: { label: string; count: number; priority: "high" | "medium" | "low" }[];
  systemHealth: { api: string; db: string; checkedAt: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roleLabel(role: string) {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    manager: "Manager",
    assistant_manager: "Asst. Manager",
    sales_mentor: "Sales Mentor",
    academic_mentor: "Academic Mentor",
    mentor: "Mentor",
    teacher: "Teacher",
  };
  return map[role] ?? role;
}

function roleBadgeStyle(role: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    super_admin:       { bg: "#FEF3C7", text: "#92400E" },
    admin:             { bg: "#EDE9FE", text: "#5B21B6" },
    manager:           { bg: "#DBEAFE", text: "#1E40AF" },
    assistant_manager: { bg: "#D1FAE5", text: "#065F46" },
    sales_mentor:      { bg: "#FEE2E2", text: "#991B1B" },
    academic_mentor:   { bg: "#DCFCE7", text: "#166534" },
    mentor:            { bg: "#F3E8FF", text: "#6B21A8" },
    teacher:           { bg: "#E0F2FE", text: "#0C4A6E" },
  };
  return map[role] ?? { bg: "#F1F5F9", text: "#475569" };
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, bg, sub }: {
  label: string; value: number | string; icon: string;
  color: string; bg: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="text-xl">{icon}</div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        </div>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Dashboard View ────────────────────────────────────────────────────────────
function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/admin/command-center/dashboard");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: PURPLE }} />
      <p className="text-sm text-gray-400">Loading Command Center…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <XCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm font-semibold text-red-600">Failed to load dashboard</p>
      <p className="text-xs text-gray-400">{error}</p>
      <button onClick={load} className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5" style={{ background: PURPLE }}>
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
    </div>
  );

  if (!data) return null;

  const { kpis, staffDistribution, recentActivity, pendingActions, systemHealth } = data;
  const maxRole = Math.max(...staffDistribution.map(r => r.total), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Command Center</h2>
          <p className="text-xs text-gray-400 mt-0.5">Operational overview across all Braintam modules</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-sm flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-700">System Healthy</span>
        </div>
        <div className="w-px h-3 bg-gray-200" />
        <span className="text-[10px] text-gray-400">API: {systemHealth.api.toUpperCase()}</span>
        <div className="w-px h-3 bg-gray-200" />
        <span className="text-[10px] text-gray-400">DB: {systemHealth.db.toUpperCase()}</span>
        <div className="w-px h-3 bg-gray-200" />
        <span className="text-[10px] text-gray-400">Checked: {new Date(systemHealth.checkedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: true })}</span>
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div className="space-y-2">
          {pendingActions.map((a, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-2.5 border text-sm font-medium ${a.priority === "high" ? "bg-red-50 border-red-200 text-red-700" : a.priority === "medium" ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-semibold">{a.label}</span>
              </div>
              <span className="text-xs font-black">{a.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Staff"    value={kpis.totalStaff}        icon="👥" color={NAVY}     bg={`${NAVY}15`}     sub={`${kpis.activeStaff} active`} />
        <KpiCard label="Mentors"        value={kpis.activeMentors}      icon="🎓" color={PURPLE}   bg="#8B5CF620"       sub="active now" />
        <KpiCard label="Teachers"       value={kpis.activeTeachers}     icon="📚" color="#3B82F6"  bg="#3B82F620"       sub="active now" />
        <KpiCard label="Students"       value={kpis.totalStudents}      icon="🏫" color={GREEN}    bg={`${GREEN}20`}    sub="Mastery enrolled" />
        <KpiCard label="Demo Batches"   value={kpis.activeDemoBatches}  icon="🚀" color={ORANGE}   bg={`${ORANGE}20`}   sub="active batches" />
        <KpiCard label="Today's Check-ins" value={kpis.todayCheckins}   icon="✅" color="#0EA5E9"  bg="#0EA5E920"       sub="staff checked in" />
        <KpiCard label="Unassigned Paid" value={kpis.paidUnassigned}    icon="⚡" color={kpis.paidUnassigned > 0 ? "#EF4444" : GREEN} bg={kpis.paidUnassigned > 0 ? "#FEE2E2" : "#DCFCE7"} sub="needs IC assignment" />
        <KpiCard label="System Health"  value="OK"                      icon="🟢" color={GREEN}    bg="#DCFCE7"         sub="all services up" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Staff Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: NAVY }}>
            <Users className="w-4 h-4" style={{ color: PURPLE }} /> Staff Distribution
          </h3>
          {staffDistribution.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">No staff data available</div>
          ) : (
            <div className="space-y-3">
              {staffDistribution.map(row => {
                const s = roleBadgeStyle(row.role);
                const pct = row.total === 0 ? 0 : Math.max(4, (row.total / maxRole) * 100);
                return (
                  <div key={row.role} className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full w-28 text-center flex-shrink-0" style={{ background: s.bg, color: s.text }}>
                      {roleLabel(row.role)}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: s.text }} />
                      </div>
                    </div>
                    <span className="text-xs font-black w-5 text-right flex-shrink-0" style={{ color: s.text }}>{row.total}</span>
                    <span className="text-[10px] text-gray-400 w-12 text-right flex-shrink-0">{row.active} active</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: NAVY }}>
            <Activity className="w-4 h-4" style={{ color: ORANGE }} /> Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
              <FileText className="w-6 h-6 text-gray-200" />
              <p className="text-sm">No activity logs yet</p>
              <p className="text-xs text-gray-300">Actions will appear here as staff use the system</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivity.slice(0, 8).map(log => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0 mt-0.5" style={{ background: PURPLE }}>
                    {(log.actorName?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-semibold">{log.actorName}</span>
                      {" "}
                      <span className="text-gray-500">{log.actionLabel ?? log.action}</span>
                      {" "}
                      <span className="font-medium">{log.targetName}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(log.createdAt)} · {log.module ?? log.targetType}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: NAVY }}>
          <Zap className="w-4 h-4" style={{ color: ORANGE }} /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Staff Management",    icon: Users,         desc: "View & manage all staff",         color: PURPLE, bg: "#8B5CF615" },
            { label: "Mentor Management",   icon: UserCheck2,    desc: "Mentor assignments & workload",    color: GREEN,  bg: `${GREEN}15`  },
            { label: "Teacher Management",  icon: GraduationCap, desc: "Teacher classes & schedules",     color: "#3B82F6", bg: "#3B82F615" },
            { label: "Roles & Permissions", icon: ShieldCheck,   desc: "Configure access controls",       color: ORANGE, bg: `${ORANGE}15` },
          ].map(qa => {
            const Icon = qa.icon;
            return (
              <div key={qa.label} className="rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow cursor-default" style={{ background: qa.bg }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4" style={{ color: qa.color }} />
                  <span className="text-xs font-bold" style={{ color: qa.color }}>{qa.label}</span>
                </div>
                <p className="text-[10px] text-gray-500">{qa.desc}</p>
                <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold" style={{ color: qa.color }}>
                  Coming soon <ArrowRight className="w-2.5 h-2.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Coming-Soon Module ────────────────────────────────────────────────────────
interface NavItem {
  key: CCView;
  label: string;
  icon: React.ElementType;
  description: string;
  status: "live" | "coming-soon" | "in-dev";
}

const NAV: NavItem[] = [
  { key: "dashboard",          label: "Dashboard",           icon: LayoutDashboard, description: "Operational overview across all modules",    status: "live"        },
  { key: "staff-management",   label: "Staff Management",    icon: Users,           description: "Manage all staff accounts and roles",         status: "live"        },
  { key: "mentor-management",  label: "Mentor Management",   icon: UserCheck2,      description: "IC assignments, workload, and performance",   status: "live"        },
  { key: "teacher-management", label: "Teacher Management",  icon: GraduationCap,   description: "Teacher schedules, classes, assignments",     status: "live"        },
  { key: "roles-permissions",  label: "Roles & Permissions", icon: ShieldCheck,     description: "Database-driven role and permission system",  status: "live"        },
  { key: "audit-logs",         label: "Audit Logs",          icon: FileText,        description: "Full trail of all system actions",            status: "coming-soon" },
  { key: "settings",           label: "Settings",            icon: Settings,        description: "Platform-wide configuration and preferences", status: "coming-soon" },
];

const ROADMAPS: Record<Exclude<CCView, "dashboard">, { phase: string; items: string[] }[]> = {
  "staff-management":   [{ phase: "Phase B Step 2", items: ["List all staff by role & status", "Create / edit / deactivate staff", "Assign & change roles", "Bulk actions", "Reset passwords"] }, { phase: "Phase D", items: ["Role-based permission overrides", "Activity timeline per staff member"] }],
  "mentor-management":  [{ phase: "Phase C Step 3", items: ["Mentor roster with active student count", "Assign/re-assign students", "Workload heatmap", "Performance scores", "Conversion %"] }, { phase: "Phase G", items: ["IC personal dashboard", "Follow-up pipeline per IC", "Call & WhatsApp log"] }],
  "teacher-management": [{ phase: "Phase C Step 4", items: ["Teacher roster with class load", "Subject–teacher mapping", "Attendance submission tracking", "Schedule overview"] }, { phase: "Phase C+", items: ["Teacher performance metrics", "Student feedback per teacher"] }],
  "roles-permissions":  [{ phase: "Phase D Step 5", items: ["DB-driven roles table", "Per-module action permissions (View/Create/Edit/Delete/Assign)", "Super Admin permission editor UI", "Role hierarchy enforcement"] }, { phase: "Phase D+", items: ["Permission inheritance", "Custom role creation", "Audit log of permission changes"] }],
  "audit-logs":         [{ phase: "Phase H Step 6", items: ["Who changed what and when", "Old value → new value diffs", "Filter by user, module, date", "Export to CSV"] }, { phase: "Phase H+", items: ["Real-time audit stream", "Alert on suspicious actions"] }],
  "settings":           [{ phase: "Phase B+", items: ["Platform name & branding", "Academic year configuration", "Session timeout settings", "Feature flags"] }, { phase: "Later", items: ["Email notification templates", "Maintenance mode toggle", "Integration toggles"] }],
};

function StatusBadge({ status }: { status: NavItem["status"] }) {
  if (status === "live") return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
      <CheckCircle2 className="w-2.5 h-2.5" /> Live
    </span>
  );
  if (status === "in-dev") return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
      <Zap className="w-2.5 h-2.5" /> In Dev
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
      <Clock className="w-2.5 h-2.5" /> Coming Soon
    </span>
  );
}

function ComingSoonView({ view }: { view: Exclude<CCView, "dashboard"> }) {
  const nav = NAV.find(n => n.key === view)!;
  const Icon = nav.icon;
  const roadmap = ROADMAPS[view];
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${PURPLE}15` }}>
            <Icon className="w-6 h-6" style={{ color: PURPLE }} />
          </div>
          <div>
            <h2 className="text-lg font-black" style={{ color: NAVY }}>{nav.label}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{nav.description}</p>
          </div>
        </div>
        <StatusBadge status={nav.status} />
      </div>

      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: `${NAVY}08` }}>🚧</div>
        <div className="text-center">
          <p className="font-black text-base" style={{ color: NAVY }}>Under construction</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">This module is being built in the next development sprint.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100">
          <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-purple-600">Planned for upcoming phase</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: NAVY }}>
          <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} /> Planned Features
        </h3>
        <div className="space-y-4">
          {roadmap.map((phase, pi) => (
            <div key={pi} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: pi === 0 ? PURPLE : "#CBD5E1" }}>{pi + 1}</div>
                {pi < roadmap.length - 1 && <div className="w-px flex-1 mt-1 bg-slate-200" />}
              </div>
              <div className="pb-4">
                <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: pi === 0 ? PURPLE : "#94A3B8" }}>{phase.phase}</p>
                <ul className="space-y-1">
                  {phase.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: pi === 0 ? PURPLE : "#CBD5E1" }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CommandCenterTab() {
  const [view, setView] = useState<CCView>("dashboard");
  const [flashMsg, setFlashMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function flash(text: string, ok = true) {
    setFlashMsg({ text, ok });
    setTimeout(() => setFlashMsg(null), 3500);
  }

  return (
    <div className="flex gap-4 min-h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: `${PURPLE}0D` }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: PURPLE }}>Command Center</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Administration &amp; Control</p>
          </div>
          <nav className="py-1">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${active ? "bg-purple-50" : "hover:bg-gray-50"}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? PURPLE : "#9CA3AF" }} />
                  <span className={`text-xs font-semibold flex-1 ${active ? "" : "text-gray-600"}`} style={active ? { color: PURPLE } : {}}>
                    {item.label}
                  </span>
                  {item.status === "live" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                  {active && <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: PURPLE }} />}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 relative">
        {/* Flash toast */}
        {flashMsg && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2 transition-all ${flashMsg.ok ? "bg-green-500" : "bg-red-500"}`}>
            {flashMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {flashMsg.text}
          </div>
        )}
        {view === "dashboard"        && <DashboardView />}
        {view === "staff-management"  && <StaffManagementView flash={flash} />}
        {view === "mentor-management"  && <MentorManagementView  flash={flash} />}
        {view === "teacher-management"  && <TeacherManagementView  flash={flash} />}
        {view === "roles-permissions"   && <RolesPermissionsView   flash={flash} />}
        {view !== "dashboard" && view !== "staff-management" && view !== "mentor-management" && view !== "teacher-management" && view !== "roles-permissions" && <ComingSoonView view={view} />}
      </div>
    </div>
  );
}
