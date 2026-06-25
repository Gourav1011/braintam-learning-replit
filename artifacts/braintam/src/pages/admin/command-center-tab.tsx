import { useState } from "react";
import {
  LayoutDashboard, Users, UserCheck2, GraduationCap, ShieldCheck,
  FileText, Settings, ChevronRight, TrendingUp, Activity, BarChart3,
  Lock, Clock, CheckCircle2, AlertCircle, Zap,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const PURPLE = "#8B5CF6";

type CCView =
  | "dashboard"
  | "staff-management"
  | "mentor-management"
  | "teacher-management"
  | "roles-permissions"
  | "audit-logs"
  | "settings";

interface NavItem {
  key: CCView;
  label: string;
  icon: React.ElementType;
  description: string;
  status: "live" | "coming-soon" | "in-dev";
}

const NAV: NavItem[] = [
  { key: "dashboard",         label: "Dashboard",          icon: LayoutDashboard, description: "Operational overview across all modules",     status: "coming-soon" },
  { key: "staff-management",  label: "Staff Management",   icon: Users,           description: "Manage all staff accounts and roles",          status: "coming-soon" },
  { key: "mentor-management", label: "Mentor Management",  icon: UserCheck2,      description: "IC assignments, workload, and performance",    status: "coming-soon" },
  { key: "teacher-management",label: "Teacher Management", icon: GraduationCap,   description: "Teacher schedules, classes, and assignments",  status: "coming-soon" },
  { key: "roles-permissions", label: "Roles & Permissions",icon: ShieldCheck,     description: "Database-driven role and permission system",   status: "in-dev" },
  { key: "audit-logs",        label: "Audit Logs",         icon: FileText,        description: "Full trail of all system actions",             status: "coming-soon" },
  { key: "settings",          label: "Settings",           icon: Settings,        description: "Platform-wide configuration and preferences",  status: "coming-soon" },
];

const ROADMAPS: Record<CCView, { phase: string; items: string[] }[]> = {
  "dashboard": [
    { phase: "Phase B", items: ["Live operational metrics", "Staff online/offline status", "Today's class & batch summary", "Pending action items feed"] },
    { phase: "Phase C+", items: ["Revenue snapshot widget", "Conversion funnel overview", "Alert & escalation center"] },
  ],
  "staff-management": [
    { phase: "Phase B", items: ["List all staff with role + status", "Create / edit / deactivate staff", "Assign & change roles", "Reset passwords"] },
    { phase: "Phase D", items: ["Role-based permission overrides", "Custom permission sets per user", "Activity timeline per staff member"] },
  ],
  "mentor-management": [
    { phase: "Phase C", items: ["IC profile cards with active student count", "Assign/re-assign students to ICs", "Workload heatmap", "Performance scores"] },
    { phase: "Phase G", items: ["IC dashboard with personal student list", "Follow-up pipeline per IC", "Call & WhatsApp log per IC"] },
  ],
  "teacher-management": [
    { phase: "Phase C", items: ["Teacher roster with class load", "Subject–teacher mapping", "Class schedule overview", "Attendance submission tracking"] },
    { phase: "Phase C+", items: ["Teacher performance metrics", "Student feedback per teacher", "Recording library per teacher"] },
  ],
  "roles-permissions": [
    { phase: "Phase D", items: ["DB-driven roles table", "Per-module action permissions (View / Create / Edit / Delete / Assign)", "Super Admin permission editor UI", "Role hierarchy enforcement"] },
    { phase: "Phase D+", items: ["Permission inheritance", "Custom role creation", "Audit log of permission changes"] },
  ],
  "audit-logs": [
    { phase: "Phase H", items: ["Who changed what and when", "Old value → new value diffs", "Filter by user, module, date", "Export to CSV"] },
    { phase: "Phase H+", items: ["Real-time audit stream", "Alert on suspicious actions", "Compliance report exports"] },
  ],
  "settings": [
    { phase: "Phase B", items: ["Platform name & branding", "Academic year configuration", "SMS / WhatsApp integration toggle", "Session timeout settings"] },
    { phase: "Phase B+", items: ["Email notification templates", "Feature flags", "Maintenance mode toggle"] },
  ],
};

const KPI_CARDS: Record<CCView, { label: string; value: string; icon: string; color: string }[]> = {
  "dashboard":          [{ label: "Staff Online", value: "—", icon: "🟢", color: "#22C55E" }, { label: "Pending Actions", value: "—", icon: "⚡", color: ORANGE }, { label: "Today's Classes", value: "—", icon: "📅", color: NAVY }],
  "staff-management":   [{ label: "Total Staff", value: "—", icon: "👥", color: PURPLE }, { label: "Active", value: "—", icon: "✅", color: "#22C55E" }, { label: "Deactivated", value: "—", icon: "🚫", color: "#EF4444" }],
  "mentor-management":  [{ label: "Total Mentors", value: "—", icon: "👤", color: PURPLE }, { label: "Assigned Students", value: "—", icon: "🎓", color: "#22C55E" }, { label: "Avg Load", value: "—", icon: "📊", color: ORANGE }],
  "teacher-management": [{ label: "Teachers", value: "—", icon: "🎓", color: "#3B82F6" }, { label: "Active Classes", value: "—", icon: "📹", color: "#22C55E" }, { label: "Avg Classes/Week", value: "—", icon: "📅", color: ORANGE }],
  "roles-permissions":  [{ label: "Roles", value: "8", icon: "🛡️", color: PURPLE }, { label: "Modules", value: "10", icon: "🗂️", color: NAVY }, { label: "Permissions", value: "80+", icon: "🔐", color: ORANGE }],
  "audit-logs":         [{ label: "Events Today", value: "—", icon: "📋", color: NAVY }, { label: "Assignments", value: "—", icon: "👤", color: PURPLE }, { label: "Role Changes", value: "—", icon: "🔄", color: ORANGE }],
  "settings":           [{ label: "Config Keys", value: "—", icon: "⚙️", color: NAVY }, { label: "Active Flags", value: "—", icon: "🚩", color: "#22C55E" }, { label: "Integrations", value: "—", icon: "🔌", color: ORANGE }],
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

function ModuleComingSoon({ view }: { view: CCView }) {
  const nav = NAV.find(n => n.key === view)!;
  const Icon = nav.icon;
  const roadmap = ROADMAPS[view];
  const kpis = KPI_CARDS[view];
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${PURPLE}18` }}>
              <Icon className="w-6 h-6" style={{ color: PURPLE }} />
            </div>
            <div>
              <h2 className="text-lg font-black" style={{ color: NAVY }}>{nav.label}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{nav.description}</p>
            </div>
          </div>
          <StatusBadge status={nav.status} />
        </div>
      </div>

      {/* KPI cards — placeholder */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="text-xl font-black text-gray-300">{k.value}</div>
            <div className="text-xs text-gray-400 font-medium mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Coming soon illustration */}
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: `${PURPLE}12` }}>
          🚧
        </div>
        <div className="text-center">
          <p className="font-black text-base" style={{ color: NAVY }}>This module is under construction</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            {nav.label} will be available in an upcoming phase. The architecture and data model are already being prepared.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 border border-purple-100">
          <AlertCircle className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-purple-600">Planned for next development sprint</span>
        </div>
      </div>

      {/* Roadmap */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: NAVY }}>
          <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} /> Roadmap
        </h3>
        <div className="space-y-4">
          {roadmap.map((phase, pi) => (
            <div key={pi} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: pi === 0 ? PURPLE : "#CBD5E1" }}>
                  {pi + 1}
                </div>
                {pi < roadmap.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: "#E2E8F0" }} />}
              </div>
              <div className="pb-4">
                <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: pi === 0 ? PURPLE : "#94A3B8" }}>{phase.phase}</p>
                <ul className="space-y-1">
                  {phase.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
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

export function CommandCenterTab() {
  const [view, setView] = useState<CCView>("dashboard");
  const current = NAV.find(n => n.key === view)!;

  return (
    <div className="flex gap-4 min-h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: `${PURPLE}0D` }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: PURPLE }}>Command Center</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Administration & Control</p>
          </div>
          <nav className="py-1">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group ${active ? "bg-purple-50" : "hover:bg-gray-50"}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: active ? PURPLE : "#9CA3AF" }} />
                  <span className={`text-xs font-semibold flex-1 ${active ? "" : "text-gray-600"}`} style={active ? { color: PURPLE } : {}}>
                    {item.label}
                  </span>
                  {active && <ChevronRight className="w-3 h-3" style={{ color: PURPLE }} />}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <ModuleComingSoon view={view} />
      </div>
    </div>
  );
}
