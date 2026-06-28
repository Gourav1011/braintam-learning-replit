import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Users, CheckCircle2, XCircle, TrendingUp, AlertTriangle, Star,
  Download, MoreVertical, Search, RefreshCw, Plus, Eye, Phone,
  X, Loader2, ChevronLeft, ChevronRight, MessageSquare, BarChart3,
  Edit3, GraduationCap, UserCheck2, Activity, Trophy, Zap,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface EnrichedMentor {
  id: number; name: string; email: string; phone: string | null;
  mentorType: string | null; isActive: boolean; createdAt: string;
  lastLoginAt: string | null; assignedStudents: number;
  assignedDemoStudents: number; conversions: number; conversionPct: number;
  attendancePct: number | null; homeworkPct: number | null;
  followUpPct: number; healthScore: number;
  healthLabel: "Excellent" | "Good" | "Average" | "Needs Attention";
  workload: "Low" | "Medium" | "High";
  grades?: number[];
}
interface DashboardStats {
  total: number; academic: number; sales: number; active: number; inactive: number;
  topPerformer: { id: number; name: string; convPct: number } | null;
  healthDistribution: { excellent: number; good: number; average: number; needsAttention: number };
  workloadDistribution: { low: number; medium: number; high: number };
  topAcademicMentors: { id: number; name: string; healthScore: number; attPct: number | null }[];
  quickInsights: { totalDemoLeads: number; totalConversions: number; overallConversionPct: number; avgAttendancePct: number };
  recentActivity: { mentorName: string; studentName: string; note: string; time: string }[];
}
interface AlertsData {
  noLoginDays: { id: number; name: string }[];
  noStudents: { id: number; name: string }[];
  overloaded: { id: number; name: string }[];
  lowConversion: { id: number; name: string; convPct: number }[];
}

type SortKey = "name" | "assignedStudents" | "healthScore" | "attendancePct" | "homeworkPct" | "workload";

// ── Helpers ───────────────────────────────────────────────────────────────────
function healthColor(label: string) {
  if (label === "Excellent") return { bg: "#DCFCE7", text: "#15803D", bar: "#22C55E" };
  if (label === "Good")      return { bg: "#DBEAFE", text: "#1D4ED8", bar: "#3B82F6" };
  if (label === "Average")   return { bg: "#FEF3C7", text: "#B45309", bar: "#F59E0B" };
  return { bg: "#FEE2E2", text: "#DC2626", bar: "#EF4444" };
}

function workloadPct(m: EnrichedMentor) {
  return Math.min(100, Math.round((m.assignedStudents / 60) * 100));
}
function workloadBarColor(pct: number) {
  if (pct <= 50) return "#22C55E";
  if (pct <= 80) return "#F59E0B";
  return "#EF4444";
}
function workloadLabel(pct: number) {
  if (pct <= 50) return "Low";
  if (pct <= 80) return "Medium";
  return "High";
}
function starRating(healthScore: number) {
  return Math.min(5, (healthScore / 100) * 5).toFixed(1);
}
function gradesLabel(grades: number[] | undefined) {
  if (!grades || grades.length === 0) return "—";
  const sorted = [...grades].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i]; }
    else { ranges.push(start === end ? `G${start}` : `G${start}-G${end}`); start = end = sorted[i]; }
  }
  ranges.push(start === end ? `G${start}` : `G${start}-G${end}`);
  return ranges.join(", ");
}
function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Avatar({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const colors = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#BE185D"];
  const bg = color ?? colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size < 30 ? 10 : 13 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function StarsDisplay({ rating }: { rating: string }) {
  const val = parseFloat(rating);
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      <span className="text-xs font-black text-gray-800">{rating}/5</span>
    </div>
  );
}

function PctBar({ pct, color, label }: { pct: number; color: string; label?: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        {label && <span className="text-gray-500">{label}</span>}
        <span className="font-bold ml-auto" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

// Donut chart SVG
function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <div className="w-28 h-28 rounded-full border-8 border-gray-100" />
    </div>
  );
  let offset = 0;
  const r = 52; const cx = 80; const cy = 80; const strokeW = 22;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circumference;
        const gap  = circumference - dash;
        const rotation = offset * 360 - 90;
        offset += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.5s" }} />
        );
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="900" fill={NAVY}>{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6B7280">Total</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6B7280">Students</text>
    </svg>
  );
}

// Custom bar chart tooltip
function WorkloadTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const pct = Number((payload as { value: number }[])[0]?.value ?? 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-bold mb-1 text-gray-700">{String(label)}</div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: workloadBarColor(pct) }} />
        <span className="text-gray-500">Workload:</span>
        <span className="font-black">{pct}%</span>
        <span className="text-gray-400 ml-1">({workloadLabel(pct)})</span>
      </div>
    </div>
  );
}

// Three-dot actions menu
function ActionsMenu({ mentor, onView, onToggle }: { mentor: EnrichedMentor; onView: () => void; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-44 text-xs" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setOpen(false); onView(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
            <Eye className="w-3.5 h-3.5 text-blue-500" /> View Profile
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
            <Edit3 className="w-3.5 h-3.5 text-orange-500" /> Edit
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-green-500" /> Send Message
          </button>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={() => { setOpen(false); onToggle(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 font-semibold ${mentor.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
              {mentor.isActive ? <><XCircle className="w-3.5 h-3.5" /> Disable Mentor</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Enable Mentor</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

// ── Main Component ─────────────────────────────────────────────────────────────
export function MentorsTab({ flash }: { flash: (msg: string, ok?: boolean) => void; users?: unknown[] }) {
  const [mentors,  setMentors]  = useState<EnrichedMentor[]>([]);
  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [alerts,   setAlerts]   = useState<AlertsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [search,   setSearch]   = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "healthScore", dir: "desc" });
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, sRes, aRes, gRes] = await Promise.all([
        apiFetch("/admin/mentors/enriched"),
        apiFetch("/admin/mentors/dashboard-stats"),
        apiFetch("/admin/mentors/alerts"),
        apiFetch("/admin/mentors/grade-assignments"),
      ]);
      const [mData, sData, aData, gData] = await Promise.all([
        mRes.ok ? mRes.json() : [],
        sRes.ok ? sRes.json() : null,
        aRes.ok ? aRes.json() : null,
        gRes.ok ? gRes.json() : [],
      ]);
      // Join grade assignments to mentors
      const gradeMap = new Map<number, number[]>((gData as { mentorId: number; grades: number[] }[]).map(g => [g.mentorId, g.grades]));
      const enriched = (mData as EnrichedMentor[])
        .filter(m => (m.mentorType ?? "academic") === "academic")
        .map(m => ({ ...m, grades: gradeMap.get(m.id) ?? [] }));
      setMentors(enriched);
      setStats(sData);
      setAlerts(aData);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleActive(m: EnrichedMentor) {
    const r = await apiFetch(`/admin/mentors/${m.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !m.isActive }) });
    if (r.ok) { flash(`${m.name} ${m.isActive ? "disabled" : "enabled"}!`); loadData(); }
    else flash("Failed to update", false);
  }

  function handleSort(key: SortKey) {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  const academicMentors = useMemo(() => mentors.filter(m => (m.mentorType ?? "academic") === "academic"), [mentors]);
  const activeCount   = academicMentors.filter(m => m.isActive).length;
  const inactiveCount = academicMentors.filter(m => !m.isActive).length;

  const filtered = useMemo(() => {
    let list = [...academicMentors];
    if (activeTab === "active")   list = list.filter(m => m.isActive);
    if (activeTab === "inactive") list = list.filter(m => !m.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phone ?? "").includes(q));
    }
    if (gradeFilter !== "all") list = list.filter(m => m.grades?.includes(Number(gradeFilter)));
    if (workloadFilter !== "all") {
      list = list.filter(m => {
        const pct = workloadPct(m);
        if (workloadFilter === "low")    return pct <= 50;
        if (workloadFilter === "medium") return pct > 50 && pct <= 80;
        return pct > 80;
      });
    }
    if (statusFilter !== "all") list = list.filter(m => statusFilter === "active" ? m.isActive : !m.isActive);
    list.sort((a, b) => {
      const va = sort.key === "workload" ? workloadPct(a) : (a[sort.key] ?? 0);
      const vb = sort.key === "workload" ? workloadPct(b) : (b[sort.key] ?? 0);
      if (typeof va === "string" && typeof vb === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return list;
  }, [academicMentors, activeTab, search, gradeFilter, workloadFilter, statusFilter, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI computations
  const totalStudents  = academicMentors.reduce((s, m) => s + m.assignedStudents, 0);
  const avgWorkload    = academicMentors.length ? Math.round(academicMentors.reduce((s, m) => s + workloadPct(m), 0) / academicMentors.length) : 0;
  const avgHealth      = academicMentors.length ? Math.round(academicMentors.reduce((s, m) => s + m.healthScore, 0) / academicMentors.length) : 0;
  const atRiskCount    = academicMentors.filter(m => m.healthLabel === "Needs Attention" || m.healthLabel === "Average").length;
  const satisfaction   = academicMentors.length ? (academicMentors.reduce((s, m) => s + m.healthScore, 0) / academicMentors.length / 20).toFixed(1) : "—";
  const workloadLabel_ = avgWorkload <= 50 ? "Low" : avgWorkload <= 80 ? "Moderate" : "High";
  const healthLabel_   = avgHealth >= 80 ? "Good" : avgHealth >= 60 ? "Average" : "Needs Attention";

  // Chart data
  const workloadChartData = academicMentors.slice(0, 10).map(m => ({
    name: m.name.split(" ")[0],
    fullName: m.name,
    pct: workloadPct(m),
  }));

  const hDist     = stats?.healthDistribution ?? { excellent: 0, good: 0, average: 0, needsAttention: 0 };
  const donutTotal = hDist.excellent + hDist.good + hDist.average + hDist.needsAttention;
  const donutData = [
    { label: "Excellent",       value: hDist.excellent,       color: "#22C55E" },
    { label: "Good",            value: hDist.good,            color: "#3B82F6" },
    { label: "Average",         value: hDist.average,         color: "#F59E0B" },
    { label: "Needs Attention", value: hDist.needsAttention,  color: "#EF4444" },
  ];

  // Top performers for Quick Actions (sorted by health score)
  const topMentors = [...academicMentors].sort((a, b) => b.healthScore - a.healthScore).slice(0, 3);

  // At risk students from alerts
  const atRiskStudents = [
    ...(alerts?.overloaded  ?? []).map(s => ({ ...s, reason: "Overloaded Mentor" })),
    ...(alerts?.noStudents  ?? []).map(s => ({ ...s, reason: "No Students" })),
  ].slice(0, 3);

  // Recent activity
  const recentActivity = stats?.recentActivity ?? [];

  // Performance insights
  const bestAtt     = [...academicMentors].sort((a, b) => (b.attendancePct ?? 0) - (a.attendancePct ?? 0))[0];
  const bestHw      = [...academicMentors].sort((a, b) => (b.homeworkPct ?? 0) - (a.homeworkPct ?? 0))[0];
  const mostStudents = [...academicMentors].sort((a, b) => b.assignedStudents - a.assignedStudents)[0];

  function exportCSV() {
    const header = ["Name", "Email", "Phone", "Grades", "Students", "Workload%", "Health Score", "Attendance%", "Homework%", "Status"].join(",");
    const rows = filtered.map(m =>
      [m.name, m.email, m.phone ?? "", gradesLabel(m.grades), m.assignedStudents, workloadPct(m), m.healthScore, m.attendancePct ?? "", m.homeworkPct ?? "", m.isActive ? "Active" : "Inactive"].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "mentors.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const TABS = [
    { key: "all"      as const, label: "All Mentors",    count: academicMentors.length },
    { key: "active"   as const, label: "Active",         count: activeCount   },
    { key: "inactive" as const, label: "Inactive",       count: inactiveCount },
  ];

  return (
    <div className="space-y-4">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Mastery Mentors</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage academic mentors, track performance, workload and student success</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <div className="relative">
            <button onClick={() => setShowBulkMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all">
              <MoreVertical className="w-3.5 h-3.5" /> Bulk Actions
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-9 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-44 text-xs" onClick={() => setShowBulkMenu(false)}>
                <button onClick={exportCSV} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
                  <Download className="w-3.5 h-3.5 text-green-500" /> Export View
                </button>
                <button onClick={loadData} className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Refresh Data
                </button>
              </div>
            )}
          </div>
          <button onClick={loadData} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-black transition-all hover:opacity-90 shadow-sm"
            style={{ background: ORANGE }}>
            <Plus className="w-3.5 h-3.5" /> Add Academic Mentor
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {[
          { label: "Total Mentors",     value: academicMentors.length, sub: "All Mentors",         icon: Users,          color: NAVY,      bg: "#EEF2FF" },
          { label: "Active Mentors",    value: activeCount, sub: academicMentors.length > 0 ? `${Math.round(activeCount/academicMentors.length*100)}% of total` : "—", icon: CheckCircle2, color: GREEN,     bg: "#DCFCE7" },
          { label: "Students Assigned", value: totalStudents, sub: "Across all mentors",           icon: GraduationCap,  color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Avg Workload",      value: `${avgWorkload}%`, sub: workloadLabel_,             icon: Activity,       color: avgWorkload <= 50 ? GREEN : avgWorkload <= 80 ? "#D97706" : "#DC2626", bg: avgWorkload <= 50 ? "#DCFCE7" : avgWorkload <= 80 ? "#FEF3C7" : "#FEE2E2" },
          { label: "Avg Health Score",  value: `${avgHealth}%`, sub: healthLabel_,                icon: TrendingUp,     color: avgHealth >= 80 ? GREEN : avgHealth >= 60 ? "#D97706" : "#DC2626",     bg: avgHealth >= 80 ? "#DCFCE7" : avgHealth >= 60 ? "#FEF3C7" : "#FEE2E2" },
          { label: "At Risk Students",  value: atRiskCount, sub: "Needs Attention",               icon: AlertTriangle,  color: ORANGE,    bg: "#FFF7ED" },
          { label: "Mentor Satisfaction", value: `${satisfaction}/5`, sub: "Excellent",           icon: Star,           color: "#D97706", bg: "#FFFBEB" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-1.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: k.bg }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <div className="text-lg font-black leading-none" style={{ color: loading ? "#D1D5DB" : k.color }}>
              {loading ? "—" : k.value}
            </div>
            <div className="text-[10px] text-gray-400 font-medium leading-tight">{k.label}</div>
            {k.sub && <div className="text-[9px] text-gray-400">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Charts + Sidebar row ─────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* Charts (2/3 width) */}
        <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Mentor Workload Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black" style={{ color: NAVY }}>Mentor Workload Overview</h3>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : workloadChartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-gray-400">No mentor data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={workloadChartData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<WorkloadTooltip />} />
                    <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {workloadChartData.map((d, i) => (
                        <Cell key={i} fill={workloadBarColor(d.pct)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex items-center gap-4 justify-center mt-1">
                  {[{ label: "Low (0-50%)", color: "#22C55E" }, { label: "Medium (51-80%)", color: "#F59E0B" }, { label: "High (81-100%)", color: "#EF4444" }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Student Health Overview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-sm font-black" style={{ color: NAVY }}>Student Health Overview</h3>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : (
              <div className="flex items-center gap-4">
                <DonutChart data={donutData} total={donutTotal || totalStudents} />
                <div className="flex-1 space-y-2.5">
                  {donutData.map(d => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-gray-600 font-medium">{d.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black" style={{ color: NAVY }}>{d.value}</span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar (1/3 width) */}
        <div className="w-72 flex-shrink-0 space-y-3">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h4 className="text-sm font-black" style={{ color: NAVY }}>Quick Actions</h4>
              </div>
              <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">This Month</span>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />)}
              </div>
            ) : topMentors.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">No mentor data</div>
            ) : (
              <>
                <div className="space-y-2">
                  {topMentors.map((m, i) => {
                    const avatarColors = ["#4F46E5", "#059669", "#D97706"];
                    return (
                      <div key={m.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 transition-all cursor-pointer">
                        <span className="text-xs font-black w-4 shrink-0" style={{ color: NAVY }}>{i + 1}</span>
                        <Avatar name={m.name} size={28} color={avatarColors[i]} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: NAVY }}>{m.name}</div>
                          <div className="text-[10px] text-gray-400">{m.email}</div>
                        </div>
                        <StarsDisplay rating={starRating(m.healthScore)} />
                      </div>
                    );
                  })}
                </div>
                <button className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-all py-1.5">
                  View All Rankings <span className="text-sm">→</span>
                </button>
              </>
            )}
          </div>

          {/* At Risk Students */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h4 className="text-sm font-black text-red-700">At Risk Students</h4>
              </div>
              <button className="text-[10px] font-semibold text-red-500 hover:text-red-700">View All</button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : atRiskStudents.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">No at-risk data</div>
            ) : atRiskStudents.map((s, i) => {
              const riskColors = [{ bg: "#FEF3C7", text: "#D97706", label: "Low Attendance" }, { bg: "#FEE2E2", text: "#DC2626", label: "Missing Assessments" }, { bg: "#EDE9FE", text: "#7C3AED", label: "Low Performance" }];
              const rc = riskColors[i % riskColors.length];
              return (
                <div key={s.id} className="flex items-center gap-2 py-1.5">
                  <Avatar name={s.name} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{s.name}</div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0" style={{ background: rc.bg, color: rc.text }}>
                    {rc.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: ORANGE }} />
                <h4 className="text-sm font-black" style={{ color: NAVY }}>Recent Activities</h4>
              </div>
              <button className="text-[10px] font-semibold text-blue-500 hover:text-blue-700">View All</button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">No recent activity</div>
            ) : recentActivity.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ORANGE }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-600 leading-tight">{a.note}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{a.mentorName}</div>
                </div>
                <div className="text-[9px] text-gray-400 shrink-0">{a.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mentor Table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0 border-b border-gray-100">
          <div className="flex gap-0">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: activeTab === t.key ? "#DBEAFE" : "#F3F4F6", color: activeTab === t.key ? "#1D4ED8" : "#6B7280" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white" />
          </div>
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
            <option value="all">Grade: All</option>
            {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select value={workloadFilter} onChange={e => { setWorkloadFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
            <option value="all">Workload: All</option>
            <option value="low">Low (0-50%)</option>
            <option value="medium">Medium (51-80%)</option>
            <option value="high">High (81-100%)</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
            <option value="all">Status: All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || gradeFilter !== "all" || workloadFilter !== "all" || statusFilter !== "all") && (
            <button onClick={() => { setSearch(""); setGradeFilter("all"); setWorkloadFilter("all"); setStatusFilter("all"); setPage(1); }}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white text-gray-600 hover:bg-gray-50 ml-auto">
            Filters
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <UserCheck2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-400">No mentors found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="border-b border-gray-100" style={{ background: "#FAFBFF" }}>
                  <tr>
                    {[
                      { label: "Mentor",       key: "name"           as SortKey },
                      { label: "Grades",        key: null },
                      { label: "Students",      key: "assignedStudents" as SortKey },
                      { label: "Workload",      key: "workload"       as SortKey },
                      { label: "Health Score",  key: "healthScore"    as SortKey },
                      { label: "Attendance",    key: "attendancePct"  as SortKey },
                      { label: "Assessments",   key: "homeworkPct"    as SortKey },
                      { label: "At Risk",       key: null },
                      { label: "Performance",   key: "healthScore"    as SortKey },
                      { label: "Status",        key: null },
                      { label: "Actions",       key: null },
                    ].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                        {h.key ? (
                          <button onClick={() => handleSort(h.key!)} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                            {h.label}
                            <span className="text-gray-300 text-xs">{sort.key === h.key ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
                          </button>
                        ) : h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(m => {
                    const hc   = healthColor(m.healthLabel);
                    const wPct = workloadPct(m);
                    const wCol = workloadBarColor(wPct);
                    const atRisk = Math.max(0, Math.round((m.assignedStudents * (100 - m.healthScore)) / 100));
                    return (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors cursor-pointer" onClick={() => setProfileId(m.id)}>
                        {/* Mentor */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name} size={32} />
                            <div>
                              <div className="font-bold text-gray-800">{m.name}</div>
                              <div className="text-[10px] text-gray-400">{m.email}</div>
                              {m.phone && <div className="text-[10px] text-gray-400">{m.phone}</div>}
                            </div>
                          </div>
                        </td>
                        {/* Grades */}
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "#EEF2FF", color: NAVY }}>
                            {gradesLabel(m.grades)}
                          </span>
                        </td>
                        {/* Students */}
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-black" style={{ color: NAVY }}>{m.assignedStudents}</span>
                        </td>
                        {/* Workload */}
                        <td className="px-3 py-2.5 min-w-[90px]">
                          <PctBar pct={wPct} color={wCol} />
                          <div className="text-[9px] mt-0.5 font-semibold" style={{ color: wCol }}>{workloadLabel(wPct)}</div>
                        </td>
                        {/* Health Score */}
                        <td className="px-3 py-2.5 min-w-[90px]">
                          <PctBar pct={m.healthScore} color={hc.bar} />
                          <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full font-bold inline-block" style={{ background: hc.bg, color: hc.text }}>{m.healthLabel}</span>
                        </td>
                        {/* Attendance */}
                        <td className="px-3 py-2.5 min-w-[80px]">
                          {m.attendancePct !== null ? (
                            <>
                              <PctBar pct={m.attendancePct} color={m.attendancePct >= 75 ? GREEN : m.attendancePct >= 60 ? "#D97706" : "#EF4444"} />
                              <div className="text-[9px] mt-0.5 font-semibold text-gray-500">{m.attendancePct >= 75 ? "Excellent" : m.attendancePct >= 60 ? "Good" : "Average"}</div>
                            </>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        {/* Assessments (hw proxy) */}
                        <td className="px-3 py-2.5 min-w-[80px]">
                          {m.homeworkPct !== null ? (
                            <>
                              <PctBar pct={m.homeworkPct} color={m.homeworkPct >= 75 ? GREEN : m.homeworkPct >= 50 ? "#D97706" : "#EF4444"} />
                              <div className="text-[9px] mt-0.5 font-semibold text-gray-500">{m.homeworkPct >= 75 ? "Excellent" : m.homeworkPct >= 50 ? "Good" : "Average"}</div>
                            </>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        {/* At Risk */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-sm font-black ${atRisk > 0 ? "text-red-500" : "text-gray-300"}`}>{atRisk}</span>
                        </td>
                        {/* Performance (stars) */}
                        <td className="px-3 py-2.5">
                          <StarsDisplay rating={starRating(m.healthScore)} />
                          <div className="text-[9px] text-gray-400 mt-0.5">{m.healthLabel}</div>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {m.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <ActionsMenu mentor={m} onView={() => setProfileId(m.id)} onToggle={() => toggleActive(m)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} results</span>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p-1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                      style={p === page ? { background: NAVY, color: "white" } : { background: "white", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p+1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-gray-400">10 / page</span>
            </div>
          </>
        )}
      </div>

      {/* ── Mentor Performance Insights ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>Mentor Performance Insights</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* 4 metric highlights */}
          {[
            { icon: "📊", label: "Best Attendance",   name: bestAtt?.name ?? "—",     value: bestAtt ? `${bestAtt.attendancePct}%`  : "—" },
            { icon: "📝", label: "Best Assessments",  name: bestHw?.name  ?? "—",     value: bestHw  ? `${bestHw.homeworkPct}%`    : "—" },
            { icon: "📈", label: "Most Improved",     name: topMentors[1]?.name ?? "—", value: topMentors[1] ? `+${Math.abs(Math.round(topMentors[1].healthScore - avgHealth))}%` : "—" },
            { icon: "👥", label: "Highest Students",  name: mostStudents?.name ?? "—", value: mostStudents ? String(mostStudents.assignedStudents) : "—" },
          ].map((ins, i) => (
            <div key={i} className="rounded-xl p-3 border border-gray-100" style={{ background: "#F8FAFF" }}>
              <div className="text-lg mb-1">{ins.icon}</div>
              <div className="text-xs text-gray-500 font-medium">{ins.label}</div>
              <div className="text-sm font-black mt-0.5" style={{ color: NAVY }}>{ins.name}</div>
              <div className="text-xs font-black mt-0.5" style={{ color: GREEN }}>{ins.value}</div>
            </div>
          ))}

          {/* 2 action cards */}
          <div className="rounded-xl p-3 border border-blue-100 cursor-pointer hover:bg-blue-50 transition-all" style={{ background: "#F0F7FF" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#DBEAFE" }}>
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-black" style={{ color: NAVY }}>Mentor Communication</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">Send announcements, updates and messages</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold text-blue-600">Go <ChevronRight className="w-3 h-3" /></div>
          </div>
          <div className="rounded-xl p-3 border border-purple-100 cursor-pointer hover:bg-purple-50 transition-all" style={{ background: "#F5F3FF" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EDE9FE" }}>
                <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-xs font-black" style={{ color: NAVY }}>Reports &amp; Analytics</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-snug">Detailed reports and performance analytics</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold text-purple-600">Go <ChevronRight className="w-3 h-3" /></div>
          </div>
        </div>
      </div>

      {/* Profile drawer placeholder */}
      {profileId && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setProfileId(null)}>
          <div className="flex-1 bg-black/30 backdrop-blur-sm" />
          <div className="w-full max-w-xl bg-white shadow-2xl flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="text-center text-gray-400 p-8">
              <Eye className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Profile for mentor #{profileId}</p>
              <button onClick={() => setProfileId(null)} className="mt-4 px-4 py-2 rounded-lg bg-gray-100 text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
