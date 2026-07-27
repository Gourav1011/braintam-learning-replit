import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardList,
  Phone, TrendingUp, ChevronDown, ChevronRight, Search, Filter,
  Download, Plus, Eye, RefreshCw, Star, Award, Zap, CheckCircle,
  XCircle, Clock, UserCheck, BarChart3, AlertTriangle, Check, X,
  Bell, CreditCard, ChevronUp, UserX, RotateCcw, History, UserCog,
  Ban, ShieldCheck, Shuffle, GitBranch, Rocket, Upload, BarChart2,
  MoreVertical, ArrowRightLeft,
} from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1780813752895.png";
import { DemoBatchesTab } from "./demo-batches-tab";
import { LeadDeploymentView } from "./lead-deployment-tab";
import { IgnitePerformanceRankingsTab } from "./ignite-performance-rankings-tab";
import { IgniteAnalyticsTab } from "./ignite-analytics-tab";

import { API_BASE as BASE } from "@/lib/api-base";
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

function fmt(d: string | null | undefined) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Export permission helpers ────────────────────────────────────────────────

type DateRange = "7" | "30" | "this-month" | "all" | "custom";

function igniteCanSeeAllTime(role: string): boolean {
  return role === "super_admin" || role === "admin";
}

function masteryExportMaxDays(role: string): number | null {
  if (role === "super_admin") return null;
  if (role === "admin") return 7;
  return 0;
}

function dateRangeCutoff(range: DateRange, customDate?: string): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "7") return new Date(now.getTime() - 7 * 86400000);
  if (range === "30") return new Date(now.getTime() - 30 * 86400000);
  if (range === "this-month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "custom" && customDate) {
    const d = new Date(customDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getTime() - 7 * 86400000);
}

function filterByDateField<T>(rows: T[], field: keyof T, cutoff: Date | null): T[] {
  if (!cutoff) return rows;
  return rows.filter(r => {
    const v = r[field] as string | null | undefined;
    return !v || new Date(v) >= cutoff;
  });
}

function makeCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const e = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(e), ...rows.map(r => r.map(e))].map(cols => cols.join(",")).join("\n");
}

function downloadCSVFile(csv: string, filename: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Date range filter chips ─────────────────────────────────────────────────

function DateRangeChips({ value, onChange, allowAll, customDate, onCustomDate, label }: {
  value: DateRange;
  onChange: (v: DateRange) => void;
  allowAll: boolean;
  customDate?: string;
  onCustomDate?: (d: string) => void;
  label?: string;
}) {
  const chips: { id: DateRange; text: string }[] = [
    { id: "7", text: "Last 7 Days" },
    { id: "30", text: "Last 30 Days" },
    { id: "this-month", text: "This Month" },
    ...(allowAll ? [{ id: "all" as DateRange, text: "All Time" }] : []),
    { id: "custom", text: "Custom Date" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="text-[11px] font-bold text-gray-400 mr-1">{label}</span>}
      {chips.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all"
          style={value === c.id
            ? { background: NAVY, color: "#fff", borderColor: NAVY }
            : { background: "#fff", color: "#6B7280", borderColor: "#E5E7EB" }}>
          {c.text}
        </button>
      ))}
      {value === "custom" && (
        <input type="date" value={customDate ?? ""}
          onChange={e => onCustomDate?.(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400" />
      )}
    </div>
  );
}

export type IgniteView =
  | "dashboard"
  | "leads"
  | "overview"
  | "demo-batches"
  | "demo-students"
  | "attendance"
  | "homework"
  | "follow-ups"
  | "conversion"
  | "sales-mentors"
  | "performance-rankings"
  | "student-outreach"
  | "ignite-reports"
  | "lead-deployment"
  | "paid-students-unassigned"
  | "paid-students-assigned"
  | "paid-students-batch-assigned"
  | "paid-students-demo-started"
  | "paid-students-demo-completed"
  | "paid-students-converted"
  | "paid-students-dropped"
  | "payments"
  | "batch-health"
  | "grade-teams";

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, bgColor,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bgColor }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="font-black text-base leading-tight" style={{ color: NAVY }}>{value}</div>
        {sub && <div className="text-[11px] font-semibold leading-tight" style={{ color }}>{sub}</div>}
        <div className="text-[11px] text-gray-500 leading-tight">{label}</div>
      </div>
    </div>
  );
}

const DURATION_OPTIONS = [
  { value: "7",   label: "This Week (7d)" },
  { value: "14",  label: "Last 2 Weeks" },
  { value: "21",  label: "Last 3 Weeks" },
  { value: "30",  label: "This Month (30d)" },
  { value: "60",  label: "Last 2 Months" },
  { value: "90",  label: "Last 3 Months" },
  { value: "365", label: "This Year" },
  { value: "0",   label: "All Time" },
];

// ── Badge ─────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: "#D1FAE5", text: "#065F46", label: "Active" },
    converted: { bg: "#DBEAFE", text: "#1D4ED8", label: "Converted" },
    dropped: { bg: "#FEE2E2", text: "#991B1B", label: "Dropped" },
    interested: { bg: "#FEF3C7", text: "#92400E", label: "Interested" },
    upcoming: { bg: "#EDE9FE", text: "#5B21B6", label: "Upcoming" },
    completed: { bg: "#F3F4F6", text: "#374151", label: "Completed" },
    "payment sent": { bg: "#ECFDF5", text: "#047857", label: "Payment Sent" },
    "payment pending": { bg: "#FFF7ED", text: "#C2410C", label: "Pmt Pending" },
  };
  const cfg = map[s] ?? { bg: "#F3F4F6", text: "#374151", label: status || "–" };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
  );
}

function InterestBadge({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-gray-400 text-xs">–</span>;
  const map: Record<string, string> = { High: "#059669", "Very High": "#0B2B6B", Moderate: "#D97706", Low: "#9CA3AF" };
  const color = map[level] ?? "#9CA3AF";
  return <span className="text-xs font-semibold" style={{ color }}>{level}</span>;
}

// ── Dashboard View ────────────────────────────────────────────────────────────

interface DashboardData {
  kpis: {
    totalBatches: number; activeBatches: number; totalStudents: number;
    activeStudents: number; interestedStudents: number; paymentSentStudents: number;
    convertedStudents: number; droppedStudents: number;
    avgAttendancePct: number; overallConversionPct: number;
  };
  topBatches: {
    id: number; title: string; teacherName: string | null; mentorName: string | null;
    grade: number | null; subject: string | null; startDate: string | null;
    status: string; isActive: boolean; totalStudents: number; convertedStudents: number;
    droppedStudents: number; activeStudents: number; attendancePct: number; conversionRate: number;
  }[];
}

function DashboardView({ setView }: { setView: (v: IgniteView) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/ignite/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!data) return <div className="text-center text-gray-400 p-8">Failed to load dashboard</div>;

  const { kpis, topBatches } = data;

  const pipeline = [
    { label: "Active Demo", count: kpis.activeStudents, color: "#3B82F6", pct: kpis.totalStudents ? Math.round((kpis.activeStudents / kpis.totalStudents) * 100) : 0 },
    { label: "Interested", count: kpis.interestedStudents, color: "#F59E0B", pct: kpis.totalStudents ? Math.round((kpis.interestedStudents / kpis.totalStudents) * 100) : 0 },
    { label: "Payment Sent", count: kpis.paymentSentStudents, color: "#8B5CF6", pct: kpis.totalStudents ? Math.round((kpis.paymentSentStudents / kpis.totalStudents) * 100) : 0 },
    { label: "Converted", count: kpis.convertedStudents, color: GREEN, pct: kpis.totalStudents ? Math.round((kpis.convertedStudents / kpis.totalStudents) * 100) : 0 },
    { label: "Dropped", count: kpis.droppedStudents, color: "#EF4444", pct: kpis.totalStudents ? Math.round((kpis.droppedStudents / kpis.totalStudents) * 100) : 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Ignite Dashboard</h1>
          <p className="text-xs text-gray-500">Sales & Admissions overview — real-time data</p>
        </div>
        <button onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Row 1 — Batches */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total Batches" value={kpis.totalBatches} icon={BookOpen} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Active Batches" value={kpis.activeBatches} icon={Zap} color={GREEN} bgColor="#D1FAE5" />
        <KpiCard label="Total Students" value={kpis.totalStudents} icon={Users} color="#3B82F6" bgColor="#DBEAFE" />
        <KpiCard label="Avg Attendance" value={`${kpis.avgAttendancePct}%`} icon={Calendar} color="#8B5CF6" bgColor="#EDE9FE" />
        <KpiCard label="Avg Conversion" value={`${kpis.overallConversionPct}%`} icon={TrendingUp} color={ORANGE} bgColor="#FFF7ED" />
      </div>

      {/* KPI Row 2 — Students */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Active Students" value={kpis.activeStudents} icon={UserCheck} color="#3B82F6" bgColor="#DBEAFE" />
        <KpiCard label="Interested" value={kpis.interestedStudents} icon={Star} color="#F59E0B" bgColor="#FEF3C7" />
        <KpiCard label="Payment Sent" value={kpis.paymentSentStudents} icon={CheckCircle} color="#8B5CF6" bgColor="#EDE9FE" />
        <KpiCard label="Converted" value={kpis.convertedStudents} icon={Award} color={GREEN} bgColor="#D1FAE5" />
        <KpiCard label="Dropped" value={kpis.droppedStudents} icon={XCircle} color="#EF4444" bgColor="#FEE2E2" />
      </div>

      {/* Pipeline + Top Batches */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Student Pipeline */}
        <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-black text-sm mb-4" style={{ color: NAVY }}>Student Pipeline</h3>
          <div className="space-y-3">
            {pipeline.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{p.label}</span>
                  <span className="text-xs font-black" style={{ color: p.color }}>{p.count} <span className="text-gray-400 font-normal">({p.pct}%)</span></span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p.pct}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setView("demo-students")}
            className="mt-4 w-full text-center text-xs font-semibold py-2 rounded-lg hover:opacity-80"
            style={{ color: NAVY, background: "#EEF2FF" }}>View All Students →</button>
        </div>

        {/* Top Performing Batches */}
        <div className="md:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm" style={{ color: NAVY }}>Top Performing Demo Batches</h3>
            <button onClick={() => setView("demo-batches")}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80"
              style={{ color: NAVY, background: "#EEF2FF" }}>View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Batch", "Teacher", "Students", "Att%", "Conv%", "Status"].map((h) => (
                    <th key={h} className="text-left py-2 pr-3 text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topBatches.slice(0, 7).map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-semibold max-w-32 truncate" style={{ color: NAVY }}>{b.title}</td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{b.teacherName ?? "–"}</td>
                    <td className="py-2 pr-3 text-gray-700 font-semibold">{b.totalStudents}</td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold" style={{ color: b.attendancePct >= 80 ? GREEN : b.attendancePct >= 60 ? "#D97706" : "#EF4444" }}>
                        {b.attendancePct}%
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-semibold" style={{ color: b.conversionRate >= 20 ? GREEN : b.conversionRate >= 10 ? "#D97706" : "#EF4444" }}>
                        {b.conversionRate}%
                      </span>
                    </td>
                    <td className="py-2"><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {topBatches.length === 0 && <div className="text-center text-gray-400 py-8 text-xs">No batches found</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Demo Batches View ─────────────────────────────────────────────────────────

interface BatchRow {
  id: number; title: string; subject: string | null; grade: number | null;
  teacherName: string | null; mentorName: string | null; startDate: string | null;
  status: string; isActive: boolean; enrolledCount: number; conversionRate: number;
  convertedCount: number; droppedCount: number;
}

function DemoBatchesView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeF, setGradeF] = useState("All Grades");
  const [statusF, setStatusF] = useState("All Status");
  const [page, setPage] = useState(1);
  const PER = 10;

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/admin/demo-batches")
      .then((r) => r.json())
      .then(setBatches)
      .catch(() => flash("Failed to load batches", false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    if (q && !b.title.toLowerCase().includes(q) && !(b.teacherName ?? "").toLowerCase().includes(q)) return false;
    if (gradeF !== "All Grades" && String(b.grade) !== gradeF.replace("Grade ", "")) return false;
    if (statusF !== "All Status" && b.status !== statusF.toLowerCase()) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  // KPIs from data
  const totalBatches = batches.length;
  const activeBatches = batches.filter((b) => b.isActive).length;
  const totalStudents = batches.reduce((s, b) => s + (b.enrolledCount ?? 0), 0);
  const avgAtt = 0; // computed from overview data — shown as dash if unavailable
  const avgConv = batches.length > 0 ? Math.round(batches.reduce((s, b) => s + b.conversionRate, 0) / batches.length) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Demo Batches</h1>
          <p className="text-xs text-gray-500">Manage all running demo batches</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"
            onClick={load}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total Batches" value={totalBatches} icon={BookOpen} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Active Batches" value={activeBatches} icon={Zap} color={GREEN} bgColor="#D1FAE5" />
        <KpiCard label="Total Students" value={totalStudents} icon={Users} color="#3B82F6" bgColor="#DBEAFE" />
        <KpiCard label="Avg. Attendance" value={avgAtt ? `${avgAtt}%` : "–"} icon={Calendar} color="#8B5CF6" bgColor="#EDE9FE" />
        <KpiCard label="Avg. Conversion" value={`${avgConv}%`} icon={TrendingUp} color={ORANGE} bgColor="#FFF7ED" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by batch name or teacher..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            {["All Grades", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            {["All Status", "active", "upcoming", "completed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {["Batch Name", "Subject", "Grade", "Teacher", "Start Date", "Students", "Attendance %", "Conversion %", "Status", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading batches...
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400 text-sm">No batches found</td></tr>
              ) : paged.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold max-w-48" style={{ color: NAVY }}>
                    <div className="truncate">{b.title}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.subject ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600">{b.grade ? `${b.grade} - ${b.grade}` : "–"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{b.teacherName ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(b.startDate)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{b.enrolledCount ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: "#8B5CF6" }}>–</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold" style={{ color: b.conversionRate >= 15 ? GREEN : b.conversionRate >= 8 ? "#D97706" : "#EF4444" }}>
                      {b.conversionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-semibold px-3 py-1 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: "#EEF2FF", color: NAVY }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1} to {Math.min(page * PER, filtered.length)} of {filtered.length} batches</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stage Badge ───────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "New Lead":       { bg: "#EEF2FF", text: "#3730A3" },
  "Contacted":      { bg: "#DBEAFE", text: "#1D4ED8" },
  "Demo Assigned":  { bg: "#EDE9FE", text: "#5B21B6" },
  "Demo Joined":    { bg: "#D1FAE5", text: "#065F46" },
  "Interested":     { bg: "#FEF3C7", text: "#92400E" },
  "Payment Sent":   { bg: "#ECFDF5", text: "#047857" },
  "Converted":      { bg: "#DBEAFE", text: "#1D4ED8" },
  "Dropped":        { bg: "#FEE2E2", text: "#991B1B" },
};

function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return <span className="text-gray-400 text-xs">–</span>;
  const cfg = STAGE_COLORS[stage] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}>{stage}</span>
  );
}

// ── Leads View ────────────────────────────────────────────────────────────────

const STAGE_ORDER: Record<string, number> = {
  "New Lead": 1, "Contacted": 2, "Demo Assigned": 3,
  "Demo Joined": 4, "Interested": 5, "Payment Sent": 6, "Converted": 7,
};

// ── Lead Profile Modal ────────────────────────────────────────────────────────

function LeadProfileModal({
  lead, onClose, flash,
}: {
  lead: StudentRow;
  onClose: () => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [movingToMastery, setMovingToMastery] = useState(false);

  useEffect(() => {
    apiFetch("/admin/ignite/follow-ups")
      .then((r) => r.json())
      .then((all: FollowUp[]) => setFollowUps(all.filter((f) => f.studentId === lead.studentId)))
      .catch(() => {});
  }, [lead.studentId]);

  const stageNum = STAGE_ORDER[lead.leadStage ?? ""] ?? 0;
  const sorted = [...followUps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const lastFU = sorted[0];
  const upcomingFU = followUps.find((f) => f.nextFollowUpDate && new Date(f.nextFollowUpDate) >= new Date());

  async function moveToMastery() {
    if (!confirm(`Move ${lead.name} to Mastery? This will create a student account and enrolment.`)) return;
    setMovingToMastery(true);
    try {
      const r = await apiFetch("/admin/ignite/move-to-mastery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: lead.studentId, enrollmentId: lead.enrollmentId }),
      });
      if (r.ok) { flash(`${lead.name} moved to Mastery!`, true); onClose(); }
      else { const err = await r.json().catch(() => ({ error: "Failed" })); flash(err.error ?? "Failed to move to Mastery", false); }
    } finally { setMovingToMastery(false); }
  }

  const PROFILE_TABS = ["Overview", "Attendance", "Follow-ups", "Calls", "Payments", "Notes", "Timeline"];

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex overflow-hidden"
        style={{ fontFamily: "Poppins, sans-serif" }}>

        {/* ── Left sidebar ── */}
        <div className="w-56 shrink-0 border-r border-gray-100 flex flex-col overflow-y-auto"
          style={{ background: "#F8FAFF" }}>
          <div className="p-5">
            <button onClick={onClose}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors">
              ← Back to Leads
            </button>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-3"
              style={{ background: NAVY }}>{lead.name?.[0] ?? "?"}</div>
            <div className="font-black text-gray-800 text-base leading-tight">{lead.name}</div>
            <div className="mt-2"><StageBadge stage={lead.leadStage} /></div>
            <div className="text-[10px] text-gray-400 mt-1.5">
              Lead ID: LDN-{String(lead.enrollmentId).padStart(6, "0")}
            </div>
          </div>

          <div className="px-5 pb-6 space-y-3 border-t border-gray-100 pt-4 text-xs">
            {[
              { label: "Mobile", value: lead.phone ?? "–" },
              { label: "Parent Mobile", value: lead.parentPhone ?? "–" },
              { label: "Grade", value: lead.grade ? `Grade ${lead.grade}` : "–" },
              { label: "City", value: lead.city ?? "–" },
              { label: "School", value: lead.school ?? "–" },
              { label: "Assigned Batch", value: lead.batchTitle },
              { label: "Sales Mentor", value: lead.assignedMentorName ?? "–" },
              { label: "Interest Level", value: lead.interestLevel ?? "–" },
              { label: "Created On", value: fmt(lead.enrolledAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
                <div className="font-semibold text-gray-700 mt-0.5 break-words">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-4 shrink-0">
            <div className="flex gap-1 overflow-x-auto">
              {PROFILE_TABS.map((tab) => {
                const key = tab.toLowerCase().replace(/[^a-z]/g, "");
                return (
                  <button key={tab} onClick={() => setActiveTab(key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                    style={activeTab === key ? { background: NAVY, color: "#fff" } : { color: "#6B7280" }}>
                    {tab}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                Edit Lead
              </button>
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-base font-bold leading-none">
                ×
              </button>
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto p-5">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Attendance</div>
                    <div className="text-2xl font-black" style={{ color: "#059669" }}>
                      {lead.lastDayAttended ?? "–"}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {lead.lastDayAttended ? "Sessions attended" : "No data yet"}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Follow-ups</div>
                    <div className="text-2xl font-black" style={{ color: NAVY }}>{followUps.length}</div>
                    <div className="text-[10px] text-gray-400">{upcomingFU ? "1 upcoming" : "None upcoming"}</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Interest Level</div>
                    <div className="text-lg font-black mt-1"
                      style={{ color: ["High", "Very High"].includes(lead.interestLevel ?? "") ? "#059669" : "#D97706" }}>
                      {lead.interestLevel ?? "–"}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Payment Status</div>
                    <div className="mt-1.5">
                      <StageBadge stage={["Payment Sent", "Converted"].includes(lead.leadStage ?? "") ? lead.leadStage : null} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1.5">
                      {lead.leadStage === "Payment Sent" ? "Waiting for payment"
                        : lead.leadStage === "Converted" ? "Confirmed ✓" : "Not yet"}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Conversion Stage</div>
                    <div className="text-sm font-black mt-1" style={{ color: NAVY }}>{lead.leadStage ?? "–"}</div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {stageNum > 0 ? `Stage ${stageNum} / 7` : "–"}
                    </div>
                  </div>
                </div>

                {/* Follow-up timeline + Quick actions */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="font-bold text-sm mb-4" style={{ color: NAVY }}>Follow-up Timeline</div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-gray-400">Last Follow-up</div>
                        <div className="font-semibold text-gray-800 text-sm mt-0.5">
                          {lastFU ? fmt(lastFU.createdAt) : "–"}
                        </div>
                        {lastFU?.note && <div className="text-xs text-gray-400 mt-0.5 truncate">{lastFU.note}</div>}
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Next Follow-up</div>
                        <div className="font-semibold text-sm mt-0.5"
                          style={{ color: upcomingFU ? ORANGE : "#9CA3AF" }}>
                          {upcomingFU ? fmt(upcomingFU.nextFollowUpDate) : "Not scheduled"}
                        </div>
                        {upcomingFU && (
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-1"
                            style={{ background: "#EDE9FE", color: "#5B21B6" }}>Upcoming</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="font-bold text-sm mb-4" style={{ color: NAVY }}>Quick Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90"
                        style={{ background: "#EEF2FF", color: NAVY }}>
                        <Phone className="w-3.5 h-3.5" /> Add Follow-up
                      </button>
                      <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90"
                        style={{ background: "#D1FAE5", color: "#065F46" }}>
                        <Phone className="w-3.5 h-3.5" /> Log Call
                      </button>
                      <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90"
                        style={{ background: "#FEF3C7", color: "#92400E" }}>
                        <Bell className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                      {lead.leadStage === "Converted" ? (
                        <button onClick={moveToMastery} disabled={movingToMastery}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                          style={{ background: NAVY, color: "#fff" }}>
                          <Award className="w-3.5 h-3.5" />
                          {movingToMastery ? "Moving…" : "Move To Mastery"}
                        </button>
                      ) : (
                        <button disabled title={`Available when stage is Converted`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold opacity-40 cursor-not-allowed"
                          style={{ background: "#F3F4F6", color: "#6B7280" }}>
                          <Award className="w-3.5 h-3.5" /> Move To Mastery
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FOLLOW-UPS TAB ── */}
            {activeTab === "followups" && (
              <div className="space-y-3">
                <div className="font-bold text-sm mb-1" style={{ color: NAVY }}>
                  Follow-up History ({followUps.length})
                </div>
                {followUps.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-gray-300">
                    <ClipboardList className="w-10 h-10 mb-3" />
                    <div className="text-sm font-semibold text-gray-400">No follow-ups yet</div>
                  </div>
                ) : sorted.map((f) => (
                  <div key={f.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={f.callStatus ?? "unknown"} />
                        <span className="text-xs text-gray-500">{f.noteType ?? "Call"}</span>
                      </div>
                      <span className="text-xs text-gray-400">{fmt(f.createdAt)}</span>
                    </div>
                    {f.note && <div className="text-xs text-gray-700 mt-1">{f.note}</div>}
                    {f.nextFollowUpDate && (
                      <div className="mt-2 text-[10px] text-gray-400">
                        Next: <span className="font-semibold" style={{ color: ORANGE }}>{fmt(f.nextFollowUpDate)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── OTHER TABS (placeholders) ── */}
            {!["overview", "followups"].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                <ClipboardList className="w-10 h-10 mb-3" />
                <div className="text-sm font-semibold text-gray-400">Coming Soon</div>
                <div className="text-xs mt-1">This section is under development</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead Row ──────────────────────────────────────────────────────────────────
interface LeadRow {
  id: number; studentCode: string | null; name: string; email: string | null; phone: string | null;
  altPhone: string | null; grade: number | null; school: string | null;
  board: string | null; city: string | null; parentName: string | null;
  parentPhone: string | null; leadStage: string | null; leadSource: string | null;
  notes: string | null; interestLevel: string | null; callStatus: string | null;
  nextFollowUpAt: string | null; lastCallAt: string | null;
  assignedMentorId: number | null; assignedMentorName: string | null;
  assignedAt: string | null; assignmentStatus: string | null;
  notesCount: number; createdAt: string;
  lostReason: string | null; lostAt: string | null;
  isActive: boolean; disabledAt: string | null; disabledReason: string | null;
  isWebsiteLead: boolean;
  utmSource: string | null; utmCampaign: string | null;
  utmAdset: string | null; utmAd: string | null;

  // Ignite lifecycle.
  igniteEnrollmentCount: number;
  igniteRepeated: boolean;
  latestIgniteEnrolledAt: string | null;
  latestIgniteCompleted: boolean;
}

function leadDisplayName(lead: LeadRow): string {
  const name = lead.name?.trim();

  const isPlaceholder =
    !name ||
    /^(?:Website Lead|Student)(?: \(Grade \d+\))?$/i.test(name);

  if (isPlaceholder && lead.studentCode) {
    return lead.studentCode;
  }

  return name || lead.studentCode || `Lead ${lead.id}`;
}

const LEAD_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new:               { bg: "#DBEAFE", text: "#1D4ED8" },
  contacted:         { bg: "#D1FAE5", text: "#059669" },
  follow_up:         { bg: "#FEF3C7", text: "#D97706" },
  interested:        { bg: "#EDE9FE", text: "#7C3AED" },
  payment_initiated: { bg: "#FFF7ED", text: "#C2410C" },
  payment_pending:   { bg: "#FEF9C3", text: "#A16207" },
  payment_failed:    { bg: "#FEE2E2", text: "#DC2626" },
  payment_abandoned: { bg: "#FEE2E2", text: "#B91C1C" },
  payment_completed: { bg: "#D1FAE5", text: "#065F46" },
  converted:         { bg: "#DCFCE7", text: "#15803D" },
  dropped:           { bg: "#F3F4F6", text: "#6B7280" },
};

function RepeatedBadge({ repeated }: { repeated: boolean }) {
  if (!repeated) return null;

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ background: "#FFF7ED", color: "#C2410C", border: "1px solid #FED7AA" }}
      title="This student has enrolled in Ignite two or more times"
    >
      Repeated
    </span>
  );
}

function LeadStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">–</span>;
  const c = LEAD_STATUS_COLORS[status] ?? { bg: "#F3F4F6", text: "#6B7280" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}>
      {status.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}
    </span>
  );
}

function AddLeadModal({ onClose, onSuccess, flash }: {
  onClose: () => void; onSuccess: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: "", parentName: "", phone: "", altPhone: "", email: "",
    grade: "", board: "", school: "", city: "", leadSource: "Manual", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError("Student name is required"); return; }
    if (!form.phone.trim()) { setError("Phone number is required"); return; }
    if (!form.grade) { setError("Grade is required"); return; }
    setSaving(true); setError("");
    try {
      const r = await apiFetch("/admin/ignite/leads", {
        method: "POST",
        body: JSON.stringify({ ...form, grade: Number(form.grade) }),
      });
      if (r.status === 409) { const d = await r.json(); setError(d.message ?? "Duplicate found"); return; }
      if (!r.ok) throw new Error("Failed");
      flash("Lead created successfully", true); onSuccess(); onClose();
    } catch { setError("Failed to create lead. Try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <div><h2 className="text-lg font-black" style={{ color: NAVY }}>Add New Lead</h2>
            <p className="text-xs text-gray-500">Fill in student details to add a new lead</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        {error && <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "name", label: "Student Name *", placeholder: "e.g. Arjun Sharma", type: "text" },
            { k: "parentName", label: "Parent Name", placeholder: "e.g. Rajesh Sharma", type: "text" },
            { k: "phone", label: "Phone Number *", placeholder: "10-digit mobile", type: "tel" },
            { k: "altPhone", label: "Alternate Phone", placeholder: "Optional", type: "tel" },
            { k: "email", label: "Email Address", placeholder: "Optional", type: "email" },
          ].map(({ k, label, placeholder, type }) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
              <input value={(form as Record<string,string>)[k]} onChange={(e) => set(k, e.target.value)}
                type={type} placeholder={placeholder}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Grade *</label>
            <select value={form.grade} onChange={(e) => set("grade", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select Grade</option>
              {[1,2,3,4,5,6,7,8,9,10].map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Board</label>
            <select value={form.board} onChange={(e) => set("board", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">Select Board</option>
              {["CBSE","ICSE","State Board","IB","IGCSE"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">School</label>
            <input value={form.school} onChange={(e) => set("school", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="School name" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="e.g. Mumbai" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Lead Source</label>
            <select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
              {["Meta Ads","Website","Instagram","Facebook","Google Ads","WhatsApp Campaign","Referral","Competition","Manual","Import"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3} placeholder="Add any notes about this lead..." />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-black disabled:opacity-50"
            style={{ background: ORANGE }}>{saving ? "Saving..." : "Add Lead"}</button>
        </div>
      </div>
    </div>
  );
}

function BulkImportModal({ onClose, onSuccess, flash }: {
  onClose: () => void; onSuccess: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
      return row;
    });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const phones = new Set<string>();
      const dupes = new Set<number>();
      parsed.forEach((row, i) => {
        const phone = (row["phone"] ?? row["Phone"] ?? "").replace(/\D/g, "").slice(-10);
        if (phone && phones.has(phone)) dupes.add(i); else phones.add(phone);
      });
      setRows(parsed); setDuplicates(dupes); setStep("preview");
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    const toImport = rows.filter((_, i) => !duplicates.has(i));
    setImporting(true);
    try {
      const r = await apiFetch("/admin/ignite/leads/bulk-import", {
        method: "POST", body: JSON.stringify({ leads: toImport }),
      });
      const data = await r.json();
      setResult(data); setStep("done");
      if (data.imported > 0) onSuccess();
    } catch { flash("Bulk import failed", false); }
    finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const csv = "name,parentName,phone,altPhone,email,grade,board,school,city,leadSource,notes\nArjun Sharma,Rajesh Sharma,9876543210,,arjun@email.com,6,CBSE,Delhi Public School,New Delhi,Manual,";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "braintam_leads_template.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div><h2 className="text-lg font-black" style={{ color: NAVY }}>Bulk Import Leads</h2>
            <p className="text-xs text-gray-500">Import multiple leads from CSV</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
        </div>
        {step === "upload" && (
          <div className="space-y-4">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> Download Sample Template
            </button>
            <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <Plus className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-semibold text-gray-600">Click to upload CSV file</span>
              <span className="text-xs text-gray-400 mt-1">Required columns: name, phone, grade</span>
              <input type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </div>
        )}
        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">
                {rows.length} rows — <span className="text-red-600">{duplicates.size} duplicates will be skipped</span>
              </div>
              <button onClick={() => setStep("upload")} className="text-xs text-gray-500 hover:text-gray-700 underline">Change file</button>
            </div>
            <div className="overflow-auto max-h-60 rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead style={{ background: "#F8FAFF" }}>
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
                    {Object.keys(rows[0] ?? {}).slice(0, 5).map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold">{h}</th>
                    ))}
                    <th className="px-3 py-2 text-left text-gray-500 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((row, i) => (
                    <tr key={i} className={duplicates.has(i) ? "bg-red-50" : "border-b border-gray-50"}>
                      <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                      {Object.values(row).slice(0, 5).map((v, j) => (
                        <td key={j} className="px-3 py-1.5 text-gray-700 max-w-24 truncate">{v || "–"}</td>
                      ))}
                      <td className="px-3 py-1.5">
                        {duplicates.has(i)
                          ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Duplicate</span>
                          : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600">Ready</span>}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 20 && <tr><td colSpan={7} className="px-3 py-2 text-center text-gray-400">…{rows.length - 20} more rows</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
              <button onClick={doImport} disabled={importing}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-black disabled:opacity-50"
                style={{ background: NAVY }}>
                {importing ? "Importing..." : `Import ${rows.length - duplicates.size} Leads`}
              </button>
            </div>
          </div>
        )}
        {step === "done" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl text-center bg-green-50">
                <div className="text-2xl font-black text-green-700">{result.imported}</div>
                <div className="text-xs font-semibold text-green-600">Imported</div>
              </div>
              <div className="p-4 rounded-2xl text-center bg-yellow-50">
                <div className="text-2xl font-black text-yellow-700">{result.skipped}</div>
                <div className="text-xs font-semibold text-yellow-600">Skipped</div>
              </div>
              <div className="p-4 rounded-2xl text-center bg-red-50">
                <div className="text-2xl font-black text-red-700">{result.failed}</div>
                <div className="text-xs font-semibold text-red-600">Failed</div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl text-white text-sm font-black"
              style={{ background: NAVY }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MarkLostModal ─────────────────────────────────────────────────────────────
const LOST_REASONS = ["Not Interested", "Wrong Number", "No Response", "Joined Competitor", "Budget Issue", "Too Young/Old", "Other"];

function MarkLostModal({ lead, onClose, onDone }: { lead: LeadRow; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState(LOST_REASONS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  async function submit() {
    setSaving(true); setErr("");
    try {
      const r = await apiFetch(`/admin/ignite/leads/${lead.id}/mark-lost`, { method: "PATCH", body: JSON.stringify({ reason }) });
      if (r.ok) { onDone(); onClose(); }
      else { const d = await r.json().catch(() => ({})) as { error?: string }; setErr(d.error ?? "Failed"); }
    } catch { setErr("Network error"); }
    setSaving(false);
  }
  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center gap-2 mb-4">
          <UserX className="w-5 h-5" style={{ color: "#DC2626" }} />
          <div className="font-black text-sm" style={{ color: NAVY }}>Mark as Lost Lead</div>
        </div>
        <div className="text-xs text-gray-500 mb-4">
          <span className="font-semibold" style={{ color: NAVY }}>{lead.name}</span> will be moved to Lost Leads. You can reopen this lead at any time.
        </div>
        <div className="mb-4">
          <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Reason *</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none" style={{ color: NAVY }}>
            {LOST_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        {err && <p className="text-[10px] text-red-500 mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
            style={{ background: "#DC2626" }}>{saving ? "Saving…" : "Mark as Lost"}</button>
        </div>
      </div>
    </div>
  );
}

// ── ReassignModal ──────────────────────────────────────────────────────────────
function ReassignModal({ lead, onClose, onDone }: { lead: LeadRow; onClose: () => void; onDone: () => void }) {
  const [mentors, setMentors] = useState<{ id: number; name: string }[]>([]);
  const [newMentorId, setNewMentorId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/admin/ignite/paid-students/assignable-mentors").then(r => r.json()).then((d: { mentors?: { id: number; name: string }[] }) => setMentors(d.mentors ?? [])).catch(() => {});
  }, []);

  async function submit() {
    if (!newMentorId) { setErr("Please select a mentor"); return; }
    setSaving(true); setErr("");
    try {
      const r = await apiFetch(`/admin/ignite/leads/${lead.id}/reassign`, { method: "POST", body: JSON.stringify({ newMentorId: Number(newMentorId), reason: reason.trim() || undefined }) });
      if (r.ok) { onDone(); onClose(); }
      else { const d = await r.json().catch(() => ({})) as { error?: string }; setErr(d.error ?? "Failed"); }
    } catch { setErr("Network error"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="w-5 h-5" style={{ color: NAVY }} />
          <div className="font-black text-sm" style={{ color: NAVY }}>Reassign Lead</div>
        </div>
        <div className="text-xs text-gray-500 mb-4">
          Reassigning <span className="font-semibold" style={{ color: NAVY }}>{lead.name}</span>
          {lead.assignedMentorName && <> from <span className="font-semibold">{lead.assignedMentorName}</span></>}
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1.5">New Mentor *</label>
            <select value={newMentorId} onChange={e => setNewMentorId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none" style={{ color: NAVY }}>
              <option value="">Select Mentor</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Reason (optional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Mentor on leave"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300" style={{ color: NAVY }} />
          </div>
        </div>
        {err && <p className="text-[10px] text-red-500 mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
            style={{ background: NAVY }}>{saving ? "Saving…" : "Reassign"}</button>
        </div>
      </div>
    </div>
  );
}

// ── LeadHistoryModal ──────────────────────────────────────────────────────────
interface StatusHistoryRow { id: number; oldStatus: string | null; newStatus: string; changedByName: string; changedByRole: string; remarks: string | null; changedAt: string; }
interface ReassignHistoryRow { id: number; previousMentorName: string | null; newMentorName: string; reassignedByName: string; reason: string | null; reassignedAt: string; }

function LeadHistoryModal({ lead, onClose }: { lead: LeadRow; onClose: () => void }) {
  const [tab, setTab] = useState<"status" | "reassign">("status");
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [reassignHistory, setReassignHistory] = useState<ReassignHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/ignite/leads/${lead.id}/status-history`).then(r => r.json()),
      apiFetch(`/admin/ignite/leads/${lead.id}/reassignment-history`).then(r => r.json()),
    ]).then(([sh, rh]) => { setStatusHistory(sh as StatusHistoryRow[]); setReassignHistory(rh as ReassignHistoryRow[]); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [lead.id]);

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-black text-sm" style={{ color: NAVY }}>Lead History — {leadDisplayName(lead)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">LDN-{String(lead.id).padStart(6, "0")}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-gray-100">
          {(["status", "reassign"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all"
              style={tab === t ? { background: NAVY, color: "#fff" } : { color: "#6B7280" }}>
              {t === "status" ? "Status History" : "Reassignment History"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : tab === "status" ? (
            statusHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No status changes recorded yet</div>
            ) : (
              <div className="space-y-3">
                {statusHistory.map((h) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: ORANGE }} />
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {h.oldStatus && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">{h.oldStatus}</span>}
                        {h.oldStatus && <span className="text-[10px] text-gray-400">→</span>}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#DCFCE7", color: "#15803D" }}>{h.newStatus}</span>
                      </div>
                      {h.remarks && <div className="text-xs text-gray-600 mb-1">"{h.remarks}"</div>}
                      <div className="text-[10px] text-gray-400">{h.changedByName} · {h.changedByRole} · {fmt(h.changedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            reassignHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No reassignments recorded yet</div>
            ) : (
              <div className="space-y-3">
                {reassignHistory.map((h) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#6366F1" }} />
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-semibold text-gray-500">{h.previousMentorName ?? "Unassigned"}</span>
                        <span className="text-[10px] text-gray-400">→</span>
                        <span className="text-[10px] font-bold" style={{ color: NAVY }}>{h.newMentorName}</span>
                      </div>
                      {h.reason && <div className="text-xs text-gray-600 mb-1">Reason: "{h.reason}"</div>}
                      <div className="text-[10px] text-gray-400">By {h.reassignedByName} · {fmt(h.reassignedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── DeployModal ────────────────────────────────────────────────────────────────
interface DeployPreviewGrade { grade: number; activeMentors: number; pendingLeads: number; mentors: { id: number; name: string }[] }
interface DeployPreview { grades: DeployPreviewGrade[]; totalPending: number; totalMentors: number }

function DeployModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [grade, setGrade] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ deployed: number; mentorsUsed: number; groups: { mentorName: string; count: number }[]; skippedGrades?: number[] } | null>(null);
  const [err, setErr] = useState("");
  // Preview from grade teams
  const [preview, setPreview] = useState<DeployPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  // Advanced / manual override
  const [manualMode, setManualMode] = useState(false);
  const [allMentors, setAllMentors] = useState<{ id: number; name: string }[]>([]);
  const [selectedMentorIds, setSelectedMentorIds] = useState<Set<number>>(new Set());
  const [mentorsLoading, setMentorsLoading] = useState(false);

  useEffect(() => {
    apiFetch("/admin/ignite/deploy-preview")
      .then(r => r.json())
      .then(setPreview)
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, []);

  useEffect(() => {
    if (!manualMode) return;
    setMentorsLoading(true);
    apiFetch("/admin/ignite/sales-mentors")
      .then(r => r.json())
      .then((ms: { id: number; name: string }[]) => { setAllMentors(ms); setSelectedMentorIds(new Set(ms.map(m => m.id))); })
      .catch(() => {})
      .finally(() => setMentorsLoading(false));
  }, [manualMode]);

  const selectedGradeData = preview && grade !== "all"
    ? (preview.grades.find(g => g.grade === Number(grade)) ?? null)
    : null;

  const totalPending = grade === "all" ? (preview?.totalPending ?? 0) : (selectedGradeData?.pendingLeads ?? 0);
  const totalMentors = grade === "all" ? (preview?.totalMentors ?? 0) : (selectedGradeData?.activeMentors ?? 0);

  function toggleMentor(id: number) {
    setSelectedMentorIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function deploy() {
    if (manualMode && selectedMentorIds.size === 0) { setErr("Select at least one mentor"); return; }
    setSaving(true); setErr("");
    try {
      const body: Record<string, unknown> = {};
      if (grade !== "all") body.grade = Number(grade);
      if (manualMode) { body.mentorIds = [...selectedMentorIds]; }
      else { body.autoMode = true; }
      const r = await apiFetch("/admin/ignite/deploy", { method: "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (!d.ok) { setErr(d.message ?? "Deployment failed"); return; }
      setResult(d); onDone();
    } catch { setErr("Network error"); } finally { setSaving(false); }
  }

  const canDeploy = !saving && totalPending > 0 && (manualMode ? selectedMentorIds.size > 0 : totalMentors > 0);

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4" style={{ color: ORANGE }} />
            <span className="font-black text-sm" style={{ color: NAVY }}>Deploy Leads</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-black text-sm">
                <CheckCircle className="w-5 h-5" /> Deployment Complete!
              </div>
              <div className="rounded-xl p-4 border border-green-100" style={{ background: "#F0FDF4" }}>
                <div className="text-sm font-black mb-3" style={{ color: "#15803D" }}>
                  {result.deployed} leads distributed across {result.mentorsUsed} mentor{result.mentorsUsed !== 1 ? "s" : ""}
                </div>
                {result.skippedGrades && result.skippedGrades.length > 0 && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-semibold">
                    ⚠ Grades {result.skippedGrades.join(", ")} skipped — no mentors assigned. Go to Grade Teams to fix.
                  </div>
                )}
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {result.groups.map((g, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-green-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: "#1D4ED8" }}>
                          {(g.mentorName?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-gray-800">{g.mentorName}</span>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#15803D" }}>{g.count} leads</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={onClose} className="w-full py-2.5 rounded-xl text-xs font-black text-white" style={{ background: NAVY }}>Done</button>
            </div>
          ) : (
            <>
              {/* Grade selector */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1.5">GRADE POOL</label>
                <select value={grade} onChange={e => { setGrade(e.target.value); setErr(""); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none" style={{ color: NAVY }}>
                  <option value="all">All Grades — deploy everything pending</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={String(g)}>Grade {g} pool only</option>)}
                </select>
              </div>

              {/* Auto-mode preview — shown when not in manual mode */}
              {!manualMode && (
                previewLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">Loading grade teams…</span>
                  </div>
                ) : grade === "all" ? (
                  <div className="rounded-xl border border-blue-100 overflow-hidden" style={{ background: "#F5F7FF" }}>
                    <div className="px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-black" style={{ color: NAVY }}>Grade-wise Distribution</span>
                    </div>
                    <div className="divide-y divide-blue-50 max-h-44 overflow-y-auto">
                      {(preview?.grades ?? []).filter(g => g.pendingLeads > 0 || g.activeMentors > 0).map(g => (
                        <div key={g.grade} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-5 flex items-center justify-center rounded text-[10px] font-black text-white" style={{ background: NAVY }}>G{g.grade}</span>
                            <span className="text-xs text-gray-500">{g.activeMentors} mentor{g.activeMentors !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black" style={{ color: g.pendingLeads > 0 ? ORANGE : "#9CA3AF" }}>{g.pendingLeads} leads</span>
                            {g.activeMentors === 0 && g.pendingLeads > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">No mentors</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {(preview?.grades ?? []).every(g => g.pendingLeads === 0) && (
                        <div className="text-center py-4 text-xs text-gray-400">No pending leads across any grade</div>
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-blue-100 flex items-center justify-between" style={{ background: "#EEF2FF" }}>
                      <span className="text-xs font-bold text-gray-600">Total</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black" style={{ color: NAVY }}>{preview?.totalMentors ?? 0} mentors</span>
                        <span className="text-xs font-black" style={{ color: ORANGE }}>{preview?.totalPending ?? 0} leads</span>
                      </div>
                    </div>
                    {totalPending > 0 && totalMentors > 0 ? (
                      <div className="px-4 py-2.5 border-t border-blue-100">
                        <p className="text-[11px] text-blue-700 font-semibold">{totalPending} leads will be distributed equally across grade teams using Grade Team assignments.</p>
                      </div>
                    ) : totalMentors === 0 && totalPending > 0 ? (
                      <div className="px-4 py-2.5 border-t border-blue-100">
                        <p className="text-[11px] text-red-600 font-semibold">⚠ No mentors assigned to any grade. Set up Grade Teams first.</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* Single grade summary */
                  <div className="rounded-xl border border-blue-100 p-4 space-y-3" style={{ background: "#F5F7FF" }}>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Active Mentors", value: selectedGradeData?.activeMentors ?? 0, color: NAVY },
                        { label: "Pending Leads",  value: selectedGradeData?.pendingLeads ?? 0,  color: ORANGE },
                        { label: "Leads / Mentor", value: selectedGradeData?.activeMentors ? Math.ceil((selectedGradeData.pendingLeads) / selectedGradeData.activeMentors) : 0, color: GREEN },
                      ].map(k => (
                        <div key={k.label} className="text-center bg-white rounded-xl p-3 border border-blue-100">
                          <div className="text-lg font-black" style={{ color: k.color }}>{k.value}</div>
                          <div className="text-[9px] text-gray-500 font-semibold">{k.label}</div>
                        </div>
                      ))}
                    </div>
                    {selectedGradeData && selectedGradeData.activeMentors > 0 && selectedGradeData.pendingLeads > 0 ? (
                      <p className="text-[11px] font-semibold rounded-lg px-3 py-2 bg-white border border-blue-100" style={{ color: "#1D4ED8" }}>
                        {selectedGradeData.pendingLeads} leads will be equally distributed among {selectedGradeData.activeMentors} active mentor{selectedGradeData.activeMentors !== 1 ? "s" : ""} of Grade {grade}.
                      </p>
                    ) : selectedGradeData?.activeMentors === 0 ? (
                      <p className="text-[11px] text-red-600 font-semibold">⚠ No mentors assigned to Grade {grade}. Go to Grade Teams to assign mentors first.</p>
                    ) : (
                      <p className="text-[11px] text-gray-400 font-semibold">No pending unassigned leads for Grade {grade}.</p>
                    )}
                    {(selectedGradeData?.mentors?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedGradeData!.mentors.map(m => (
                          <span key={m.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200 bg-white" style={{ color: NAVY }}>{m.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Advanced Options toggle */}
              <button onClick={() => setManualMode(v => !v)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${manualMode ? "rotate-180" : ""}`} />
                Advanced Options {manualMode ? <span className="text-orange-500">— manual mentor selection active</span> : ""}
              </button>

              {/* Manual override checkboxes */}
              {manualMode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-gray-500">SELECT MENTORS MANUALLY</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedMentorIds(new Set(allMentors.map(m => m.id)))} className="text-[10px] font-bold hover:underline" style={{ color: NAVY }}>All</button>
                      <span className="text-gray-300">·</span>
                      <button onClick={() => setSelectedMentorIds(new Set())} className="text-[10px] font-bold text-gray-400 hover:underline">None</button>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-36 overflow-y-auto divide-y divide-gray-50">
                    {mentorsLoading ? (
                      <div className="flex items-center justify-center py-5 gap-2 text-gray-400"><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Loading mentors…</span></div>
                    ) : allMentors.map(m => (
                      <label key={m.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded accent-blue-600" checked={selectedMentorIds.has(m.id)} onChange={() => toggleMentor(m.id)} />
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ background: "#1D4ED8" }}>{m.name[0]?.toUpperCase()}</div>
                        <span className="text-xs font-semibold text-gray-800">{m.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedMentorIds.size > 0 && (
                    <p className="text-[10px] text-gray-400 mt-1.5">Leads will be split equally across {selectedMentorIds.size} selected mentor{selectedMentorIds.size !== 1 ? "s" : ""}</p>
                  )}
                </div>
              )}

              {err && <p className="text-[10px] text-red-500 font-semibold">{err}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={deploy} disabled={!canDeploy}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: canDeploy ? ORANGE : "#9CA3AF" }}>
                  <Rocket className="w-3.5 h-3.5" />
                  {saving ? "Deploying…" : totalPending > 0 ? `Deploy ${totalPending} Leads` : "No Leads Pending"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RedistributeModal ──────────────────────────────────────────────────────────
function RedistributeModal({ leads, onClose, onDone }: { leads: LeadRow[]; onClose: () => void; onDone: () => void }) {
  const mentors = [...new Set(leads.map(l => l.assignedMentorName).filter(Boolean))] as string[];
  const [sourceMentor, setSourceMentor] = useState<string>("");
  const [targetMentorIds, setTargetMentorIds] = useState<string>("");
  const [allMentors, setAllMentors] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiFetch("/admin/ignite/sales-mentors").then(r => r.json()).then(setAllMentors).catch(() => {});
  }, []);

  const sourceLead = leads.filter(l => l.assignedMentorName === sourceMentor);

  async function submit() {
    if (!sourceMentor) { setErr("Select a source mentor"); return; }
    const targets = targetMentorIds.split(",").map(s => Number(s.trim())).filter(Boolean);
    if (!targets.length) { setErr("Select at least one target mentor"); return; }
    setSaving(true); setErr("");
    try {
      const sourceId = allMentors.find(m => m.name === sourceMentor)?.id;
      const r = await apiFetch("/admin/ignite/redistribute", {
        method: "POST",
        body: JSON.stringify({ sourceMentorId: sourceId, targetMentorIds: targets }),
      });
      const d = await r.json();
      if (!d.ok) { setErr(d.message ?? "Failed"); return; }
      onDone(); onClose();
    } catch { setErr("Network error"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" style={{ color: NAVY }} />
            <span className="font-black text-sm" style={{ color: NAVY }}>Redistribute Leads</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Move leads FROM mentor</label>
            <select value={sourceMentor} onChange={e => setSourceMentor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none" style={{ color: NAVY }}>
              <option value="">Select source mentor</option>
              {mentors.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {sourceMentor && <div className="text-[10px] text-gray-400 mt-1">{sourceLead.length} leads will be moved</div>}
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Distribute TO mentors</label>
            <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
              {allMentors.map(m => {
                const ids = targetMentorIds.split(",").map(s => s.trim()).filter(Boolean);
                const checked = ids.includes(String(m.id));
                return (
                  <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={e => {
                      const cur = targetMentorIds.split(",").map(s => s.trim()).filter(Boolean);
                      if (e.target.checked) setTargetMentorIds([...cur, String(m.id)].join(","));
                      else setTargetMentorIds(cur.filter(id => id !== String(m.id)).join(","));
                    }} className="rounded" />
                    <span className="text-xs font-semibold" style={{ color: NAVY }}>{m.name}</span>
                  </label>
                );
              })}
              {allMentors.length === 0 && <div className="text-[10px] text-gray-400 text-center py-2">Loading mentors…</div>}
            </div>
          </div>
          {err && <p className="text-[10px] text-red-500">{err}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
              style={{ background: NAVY }}>{saving ? "Moving…" : "Redistribute"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DeployHistoryModal ─────────────────────────────────────────────────────────
interface DeploymentRow { id: number; grade: number | null; createdByName: string | null; totalLeads: number; mentorCount: number; status: string; createdAt: string; groups: { mentorName: string | null; leadCount: number }[] }

function DeployHistoryModal({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<DeploymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/admin/ignite/deployments").then(r => r.json()).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" style={{ color: NAVY }} />
            <span className="font-black text-sm" style={{ color: NAVY }}>Deployment History</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>}
          {!loading && rows.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No deployments yet</div>}
          {rows.map(d => (
            <div key={d.id} className="border border-gray-100 rounded-xl overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                <div>
                  <div className="text-xs font-black" style={{ color: NAVY }}>
                    {d.grade ? `Grade ${d.grade} Pool` : "All Grades"} — {d.totalLeads} leads → {d.mentorCount} mentors
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">By {d.createdByName ?? "Admin"} · {new Date(d.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded === d.id ? "rotate-180" : ""}`} />
              </button>
              {expanded === d.id && d.groups.length > 0 && (
                <div className="border-t border-gray-50 px-4 pb-3">
                  <div className="mt-2 space-y-1">
                    {d.groups.map((g, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span className="text-gray-600">{g.mentorName ?? "—"}</span>
                        <span className="font-bold" style={{ color: NAVY }}>{g.leadCount} leads</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadsView({ flash, role = "admin" }: { flash: (m: string, ok?: boolean) => void; role?: string }) {
  const canSeeAll = igniteCanSeeAllTime(role);
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const [customDate, setCustomDate] = useState("");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("All Status");
  const [gradeF, setGradeF] = useState("All Grades");
  const [sourceF, setSourceF] = useState("All Sources");
  const [mentorF, setMentorF] = useState("All Mentors");
  const [viewMode, setViewMode] = useState<"all" | "pending" | "old" | "lost" | "converted" | "disabled" | "website">("all");
  const [page, setPage] = useState(1);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [markLostLead, setMarkLostLead] = useState<LeadRow | null>(null);
  const [reassignLead, setReassignLead] = useState<LeadRow | null>(null);
  const [historyLead, setHistoryLead] = useState<LeadRow | null>(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [showRedistribute, setShowRedistribute] = useState(false);
  const [showDeployHistory, setShowDeployHistory] = useState(false);
  const [disableLead, setDisableLead] = useState<LeadRow | null>(null);
  const [disableReason, setDisableReason] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [recentDeployments, setRecentDeployments] = useState<{ id: number; grade: number | null; totalLeads: number; mentorCount: number; createdAt: string }[]>([]);
  const PER = 12;
  const [leadsSubTab, setLeadsSubTab] = useState<"crm" | "deployment">("crm");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/ignite/leads").then(r => r.json()),
      apiFetch("/admin/ignite/deployments").then(r => r.json()).catch(() => []),
    ]).then(([ls, deps]) => {
      setLeads(ls as LeadRow[]);
      setRecentDeployments((deps as typeof recentDeployments).slice(0, 5));
    })
      .catch(() => flash("Failed to load leads", false))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const mentors = [...new Set(leads.map((l) => l.assignedMentorName).filter(Boolean))] as string[];

  const statusCounts: Record<string, number> = { "All Status": leads.length };
  leads.forEach((l) => { const s = l.leadStage ?? "new"; statusCounts[s] = (statusCounts[s] ?? 0) + 1; });

  const OLD_DAYS = 30;

  const isOldLead = (l: LeadRow) => {
    // Explicit CRM states always win.
    if (l.leadStage === "Converted" || l.leadStage === "Lost" || !l.isActive) {
      return false;
    }

    // Once a student has entered Ignite, lifecycle follows the latest
    // Ignite enrollment instead of the age of the original lead.
    //
    // Re-enrollment therefore makes an old student current again because
    // latestIgniteCompleted belongs to the newest Ignite attempt.
    if (l.igniteEnrollmentCount > 0) {
      return l.latestIgniteCompleted;
    }

    // Preserve the existing behaviour for leads that have never enrolled
    // into Ignite.
    const ageMs = Date.now() - new Date(l.createdAt).getTime();
    return ageMs > OLD_DAYS * 86400000;
  };

  const isCurrentIgniteLead = (l: LeadRow) =>
    l.igniteEnrollmentCount > 0 &&
    !l.latestIgniteCompleted &&
    l.leadStage !== "Lost" &&
    l.leadStage !== "Converted" &&
    l.isActive;

  const isPending = (l: LeadRow) =>
    l.isActive &&
    !l.assignedMentorId &&
    !isOldLead(l) &&
    l.leadStage !== "Lost" &&
    l.leadStage !== "Converted";

  const dateCutoff = dateRangeCutoff(dateRange, customDate);
  const dateLeads = filterByDateField(leads, "createdAt", dateCutoff);

  const filtered = dateLeads.filter((l) => {
    if (viewMode === "lost")      { if (l.leadStage !== "Lost") return false; }
    else if (viewMode === "old")  { if (!isOldLead(l)) return false; }
    else if (viewMode === "converted") { if (l.leadStage !== "Converted") return false; }
    else if (viewMode === "disabled")  { if (l.isActive !== false) return false; }
    else if (viewMode === "pending")   { if (!isPending(l)) return false; }
    else if (viewMode === "website")   { if (!l.isWebsiteLead) return false; }
    else {
      if (
        l.leadStage === "Lost" ||
        l.leadStage === "Converted" ||
        !l.isActive ||
        isOldLead(l)
      ) return false;
    }

    const q = search.toLowerCase();
    if (q && !leadDisplayName(l).toLowerCase().includes(q) &&
        !(l.studentCode ?? "").toLowerCase().includes(q) &&
        !(l.phone ?? "").includes(q) &&
        !(l.school ?? "").toLowerCase().includes(q) &&
        !(l.city ?? "").toLowerCase().includes(q)) return false;
    if (statusF !== "All Status" && (l.leadStage ?? "new") !== statusF) return false;
    if (gradeF !== "All Grades" && String(l.grade) !== gradeF.replace("Grade ", "")) return false;
    if (sourceF !== "All Sources" && (l.leadSource ?? "") !== sourceF) return false;
    if (mentorF !== "All Mentors" && l.assignedMentorName !== mentorF) return false;
    return true;
  });

  const lostCount      = leads.filter(l => l.leadStage === "Lost").length;
  const oldCount       = leads.filter(isOldLead).length;
  const pendingCount   = leads.filter(isPending).length;
  const convertedCount = leads.filter(l => l.leadStage === "Converted").length;
  const disabledCount  = leads.filter(l => !l.isActive).length;

  const gradePools = [1,2,3,4,5,6,7,8,9,10]
    .map(g => ({ grade: g, count: leads.filter(l => l.grade === g && isPending(l)).length }))
    .filter(g => g.count > 0).sort((a, b) => b.count - a.count);
  const maxGradeCount = gradePools[0]?.count ?? 1;

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  const exportCSV = () => {
    const rangeLabel = dateRange === "all" ? "all" : dateRange === "7" ? "7d" : dateRange === "30" ? "30d" : dateRange === "this-month" ? "thismonth" : customDate || "custom";
    const csv = makeCSV(
      ["Name","Parent Name","Phone","Alt Phone","Email","Grade","Board","School","City","Lead Source","Status","Assigned Mentor","Assignment Status","Created"],
      filtered.map(l => [leadDisplayName(l), l.parentName, l.phone, l.altPhone, l.email, l.grade, l.board, l.school, l.city, l.leadSource, l.leadStage, l.assignedMentorName, l.assignmentStatus, new Date(l.createdAt).toLocaleDateString("en-IN")])
    );
    downloadCSVFile(csv, `braintam_leads_${rangeLabel}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const SubTabBar = () => (
    <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 w-fit gap-1">
      {(["crm", "deployment"] as const).map(t => (
        <button key={t} onClick={() => setLeadsSubTab(t)}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-colors"
          style={leadsSubTab === t
            ? { background: t === "deployment" ? ORANGE : NAVY, color: "#fff" }
            : { color: "#6B7280" }}>
          {t === "crm" ? "📋 Lead CRM" : "🚀 Deployment"}
        </button>
      ))}
    </div>
  );

  if (leadsSubTab === "deployment") {
    return (
      <div className="space-y-4">
        <SubTabBar />
        <LeadDeploymentView flash={flash} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} onSuccess={load} flash={flash} />}
      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} onSuccess={load} flash={flash} />}
      {markLostLead && <MarkLostModal lead={markLostLead} onClose={() => setMarkLostLead(null)} onDone={load} />}
      {reassignLead && <ReassignModal lead={reassignLead} onClose={() => setReassignLead(null)} onDone={load} />}
      {historyLead && <LeadHistoryModal lead={historyLead} onClose={() => setHistoryLead(null)} />}
      {showDeploy && <DeployModal onClose={() => setShowDeploy(false)} onDone={load} />}
      {showRedistribute && <RedistributeModal leads={leads} onClose={() => setShowRedistribute(false)} onDone={load} />}
      {showDeployHistory && <DeployHistoryModal onClose={() => setShowDeployHistory(false)} />}

      {/* Inline Disable Lead Confirmation */}
      {disableLead && (
        <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setDisableLead(null); setDisableReason(""); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-500" />
              <span className="font-black text-sm" style={{ color: NAVY }}>Disable Lead</span>
            </div>
            <p className="text-xs text-gray-500">Disable <span className="font-bold" style={{ color: NAVY }}>{disableLead.name}</span>? They won't appear in active queues.</p>
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Reason (optional)</label>
              <input value={disableReason} onChange={e => setDisableReason(e.target.value)} placeholder="e.g. Wrong number, test lead…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setDisableLead(null); setDisableReason(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button disabled={disabling} onClick={async () => {
                setDisabling(true);
                try {
                  await apiFetch(`/admin/ignite/leads/${disableLead.id}/disable`, { method: "PATCH", body: JSON.stringify({ reason: disableReason }) });
                  flash(`${disableLead.name} disabled`, true); setDisableLead(null); setDisableReason(""); load();
                } catch { flash("Failed to disable lead", false); } finally { setDisabling(false); }
              }} className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-red-500 disabled:opacity-50">
                {disabling ? "Disabling…" : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SubTabBar />

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <DateRangeChips value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} allowAll={canSeeAll} customDate={customDate} onCustomDate={v => { setCustomDate(v); setPage(1); }} label="Period:" />
        {!canSeeAll && <span className="text-[10px] text-orange-500 font-semibold ml-auto">⚠ Export limited to 7 days</span>}
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "all",       label: "All Leads",          count: dateLeads.filter(l => l.leadStage !== "Lost" && l.leadStage !== "Converted" && l.isActive && !isOldLead(l)).length, color: NAVY,      bg: "#EEF2FF" },
          { key: "website",   label: "Website Leads",       count: leads.filter(l => l.isWebsiteLead).length, color: "#0891B2", bg: "#E0F2FE" },
          { key: "pending",   label: "Pending Deployment",  count: pendingCount,   color: "#D97706",  bg: "#FEF3C7" },
          { key: "old",       label: "Old Leads",           count: oldCount,       color: "#7C3AED",  bg: "#EDE9FE" },
          { key: "lost",      label: "Lost Leads",          count: lostCount,      color: "#DC2626",  bg: "#FEE2E2" },
          { key: "converted", label: "Converted Leads",     count: convertedCount, color: "#15803D",  bg: "#DCFCE7" },
          { key: "disabled",  label: "Disabled Leads",      count: disabledCount,  color: "#6B7280",  bg: "#F3F4F6" },
        ] as { key: "all"|"pending"|"converted"|"old"|"lost"|"disabled"|"website"; label: string; count: number; color: string; bg: string }[]).map((v) => (
          <button key={v.key} onClick={() => { setViewMode(v.key); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
            style={viewMode === v.key
              ? { background: v.color, color: "#fff" }
              : { background: v.bg, color: v.color, border: `1px solid ${v.color}22` }}>
            {v.label}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: viewMode === v.key ? "rgba(255,255,255,0.25)" : v.color + "22", color: viewMode === v.key ? "#fff" : v.color }}>
              {v.count}
            </span>
          </button>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-gray-500 font-semibold">
          <span style={{ color: NAVY }} className="font-black">{filtered.length}</span> leads
          <span className="ml-1">{{ all: "in pipeline", pending: "awaiting assignment", converted: "converted", old: "completed Ignite / inactive 30+ days", lost: "marked lost", disabled: "disabled", website: "from website / Meta Ads" }[viewMode]}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Upload className="w-3.5 h-3.5" /> Bulk Import
          </button>
          <button onClick={() => setShowDeploy(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90"
            style={{ background: NAVY }}>
            <Rocket className="w-3.5 h-3.5" /> Deploy Leads
          </button>
          <button onClick={() => setShowRedistribute(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90"
            style={{ background: ORANGE }}>
            <Shuffle className="w-3.5 h-3.5" /> Redistribute
          </button>
          <button onClick={() => setShowAddLead(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90"
            style={{ background: "#1D4ED8" }}>
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Total Leads",        count: leads.length,                                                                                                                     color: NAVY,     bg: "#EEF2FF" },
          { label: "Pending Deployment", count: pendingCount,                                                                                                                      color: "#D97706", bg: "#FEF3C7" },
          { label: "Contacted",          count: statusCounts["contacted"] ?? 0,                                                                                                   color: "#059669", bg: "#D1FAE5" },
          { label: "In Payment",         count: (statusCounts["payment_completed"] ?? 0) + (statusCounts["payment_pending"] ?? 0) + (statusCounts["payment_initiated"] ?? 0),     color: "#D97706", bg: "#FEF9C3" },
          { label: "Converted",          count: convertedCount,                                                                                                                    color: "#15803D", bg: "#DCFCE7" },
          { label: "Lost",               count: lostCount,                                                                                                                         color: "#DC2626", bg: "#FEE2E2" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-xl font-black" style={{ color: k.color }}>{k.count}</div>
            <div className="text-[10px] text-gray-500 font-semibold mt-0.5 whitespace-nowrap">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-gray-100 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, phone, city…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
        <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Status</option>
          {["new","contacted","follow_up","interested","payment_initiated","payment_pending","payment_failed","payment_abandoned","payment_completed","converted","dropped"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
        <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Grades</option>
          {[1,2,3,4,5,6,7,8,9,10].map((g) => <option key={g} value={`Grade ${g}`}>Grade {g}</option>)}
        </select>
        <select value={sourceF} onChange={(e) => { setSourceF(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Sources</option>
          {["Meta Ads","Website","Instagram","Facebook","Google Ads","WhatsApp Campaign","Referral","Competition","Manual","Import"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={mentorF} onChange={(e) => { setMentorF(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Mentors</option>
          {mentors.map((m) => <option key={m}>{m}</option>)}
        </select>
        <button onClick={load}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 shrink-0">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Split-Screen: 70% Table + 30% Insights */}
      <div className="flex gap-3 items-start">

        {/* ── LEFT: Lead Table (70%) ── */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Bulk select banner */}
          {selectedLeads.size > 0 && (
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
              <span className="text-xs font-bold text-blue-700">{selectedLeads.size} leads selected</span>
              <button onClick={() => setShowDeploy(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                style={{ background: NAVY }}>Deploy Selected</button>
              <button onClick={() => setSelectedLeads(new Set())}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
                Clear
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                <tr>
                  <th className="pl-3 pr-1 py-3 w-8">
                    <input type="checkbox"
                      className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                      checked={paged.length > 0 && paged.every(l => selectedLeads.has(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLeads(prev => new Set([...prev, ...paged.map(l => l.id)]));
                        else setSelectedLeads(prev => { const n = new Set(prev); paged.forEach(l => n.delete(l.id)); return n; });
                      }} />
                  </th>
                  {["Student / Parent","Phone","Grade","Status","Mentor","Deployment","Created","Actions"].map((h) => (
                    <th key={h} className="text-left px-3 py-3 text-[10px] font-bold text-gray-500 whitespace-nowrap uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading leads…
                  </td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12">
                    <div className="text-gray-400 text-sm">{search || statusF !== "All Status" ? "No leads match your filters" : "No leads yet — click Add Lead to get started"}</div>
                  </td></tr>
                ) : paged.map((l) => (
                  <tr key={l.id}
                    className={`border-b border-gray-50 transition-colors ${selectedLeads.has(l.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                    <td className="pl-3 pr-1 py-3 w-8">
                      <input type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                        checked={selectedLeads.has(l.id)}
                        onChange={(e) => {
                          setSelectedLeads(prev => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(l.id); else n.delete(l.id);
                            return n;
                          });
                        }} />
                    </td>
                    {/* Student / Parent */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                          style={{ background: NAVY }}>{(leadDisplayName(l)[0] ?? "?").toUpperCase()}</div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-800 text-xs whitespace-nowrap">{leadDisplayName(l)}</span>

                            {/* Permanent badge after the student's second Ignite enrollment. */}
                            {l.igniteRepeated && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap"
                                style={{ background: "#FEF3C7", color: "#92400E" }}
                                title={`${l.igniteEnrollmentCount} Ignite enrollments`}
                              >
                                Repeated
                              </span>
                            )}

                            {l.isWebsiteLead && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black whitespace-nowrap"
                                style={{ background: "#E0F2FE", color: "#0891B2" }}>
                                {["fb", "facebook"].includes((l.utmSource ?? "").toLowerCase())
                                  ? "Facebook"
                                  : ["ig", "instagram"].includes((l.utmSource ?? "").toLowerCase())
                                    ? "Instagram"
                                    : l.leadSource === "Facebook"
                                      ? "Facebook"
                                      : l.leadSource === "Instagram"
                                        ? "Instagram"
                                        : "Website"}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-400 text-[10px] whitespace-nowrap">
                            {l.isWebsiteLead
                              ? (l.utmCampaign || "–")
                              : (l.parentName ?? "–")}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Phone */}
                    <td className="px-3 py-3">
                      <div className="text-xs font-mono text-gray-700 whitespace-nowrap">{l.phone ?? "–"}</div>
                      {l.altPhone && <div className="text-[10px] font-mono text-gray-400">{l.altPhone}</div>}
                    </td>
                    {/* Grade */}
                    <td className="px-3 py-3">
                      {l.grade
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: "#EEF2FF", color: NAVY }}>Gr {l.grade}</span>
                        : <span className="text-gray-300 text-xs">–</span>}
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3 whitespace-nowrap"><LeadStatusBadge status={l.leadStage} /></td>
                    {/* Mentor */}
                    <td className="px-3 py-3">
                      {l.assignedMentorName
                        ? <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0" style={{ background: "#1D4ED8" }}>
                              {l.assignedMentorName[0].toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{l.assignedMentorName}</span>
                          </div>
                        : <span className="text-gray-400 text-xs">Unassigned</span>}
                    </td>
                    {/* Deployment Status */}
                    <td className="px-3 py-3">
                      {l.assignedMentorId
                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#DCFCE7", color: "#15803D" }}>
                            <CheckCircle className="w-2.5 h-2.5" /> Assigned
                          </span>
                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#FEF3C7", color: "#D97706" }}>
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>}
                    </td>
                    {/* Created */}
                    <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
})}</td>
                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <a href={`tel:${l.phone}`}
                          className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#D1FAE5" }} title="Call">
                          <Phone className="w-3 h-3 text-green-700" />
                        </a>
                        <button onClick={() => setHistoryLead(l)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#EEF2FF" }} title="View History">
                          <History className="w-3 h-3 text-indigo-600" />
                        </button>
                        <button onClick={() => setReassignLead(l)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#F0FDF4" }} title="Reassign">
                          <UserCog className="w-3 h-3" style={{ color: "#15803D" }} />
                        </button>
                        {l.leadStage === "Lost" ? (
                          <button onClick={async () => {
                            await apiFetch(`/admin/ignite/leads/${l.id}/reopen`, { method: "PATCH", body: JSON.stringify({}) });
                            load();
                          }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#D1FAE5" }} title="Reopen Lead">
                            <RotateCcw className="w-3 h-3 text-green-700" />
                          </button>
                        ) : (
                          <button onClick={() => setMarkLostLead(l)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#FEE2E2" }} title="Mark as Lost">
                            <UserX className="w-3 h-3 text-red-600" />
                          </button>
                        )}
                        {l.isActive ? (
                          <button onClick={() => { setDisableLead(l); setDisableReason(""); }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#FEE2E2" }} title="Disable Lead">
                            <Ban className="w-3 h-3 text-red-600" />
                          </button>
                        ) : (
                          <button onClick={async () => {
                            try {
                              await apiFetch(`/admin/ignite/leads/${l.id}/restore`, { method: "PATCH", body: JSON.stringify({}) });
                              flash(`${l.name} restored`, true); load();
                            } catch { flash("Failed to restore lead", false); }
                          }} className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 shrink-0" style={{ background: "#D1FAE5" }} title="Restore Lead">
                            <ShieldCheck className="w-3 h-3 text-green-700" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Showing {((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length} leads</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold"
                    style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
                ))}
                {totalPages > 7 && <span className="px-1">…</span>}
                {totalPages > 7 && (
                  <button onClick={() => setPage(totalPages)}
                    className="w-7 h-7 rounded-lg text-xs font-semibold"
                    style={page === totalPages ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{totalPages}</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Insights Panel (30%) ── */}
        <div className="w-64 xl:w-72 shrink-0 space-y-3" style={{ position: "sticky", top: "1rem" }}>

          {/* Grade Pools */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black" style={{ color: NAVY }}>Grade Pools</h3>
              <span className="text-[10px] text-gray-400 font-semibold">Pending Leads</span>
            </div>
            {gradePools.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-gray-400 text-xs">No pending leads</div>
              </div>
            ) : (
              <div className="space-y-2">
                {gradePools.map((g) => (
                  <div key={g.grade} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold w-14 shrink-0" style={{ color: NAVY }}>Grade {g.grade}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((g.count / maxGradeCount) * 100)}%`, background: ORANGE }} />
                    </div>
                    <span className="text-[11px] font-black text-gray-700 w-5 text-right shrink-0">{g.count}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowDeploy(true)}
              className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90"
              style={{ background: ORANGE }}>
              <Rocket className="w-3.5 h-3.5" /> Deploy Pending Leads
            </button>
          </div>

          {/* Recent Deployments */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black" style={{ color: NAVY }}>Recent Deployments</h3>
              <button onClick={() => setShowDeployHistory(true)}
                className="text-[10px] font-semibold hover:underline" style={{ color: ORANGE }}>
                View All
              </button>
            </div>
            {recentDeployments.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-xs">No deployments yet</div>
            ) : (
              <div className="space-y-0">
                {recentDeployments.map((d, idx) => (
                  <div key={d.id} className={`flex items-center justify-between py-2 ${idx < recentDeployments.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{d.grade != null ? `Grade ${d.grade}` : "All Grades"}</div>
                      <div className="text-[10px] text-gray-400">{fmt(d.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black" style={{ color: NAVY }}>{d.totalLeads} leads</div>
                      <div className="text-[10px] text-gray-400">{d.mentorCount} mentors</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4" style={{ color: NAVY }} />
              <h3 className="text-sm font-black" style={{ color: NAVY }}>Quick Statistics</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5 text-center" style={{ background: "#EEF2FF" }}>
                <div className="text-lg font-black" style={{ color: NAVY }}>{mentors.length}</div>
                <div className="text-[10px] text-gray-500 font-semibold">Active Mentors</div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "#FEF3C7" }}>
                <div className="text-lg font-black" style={{ color: "#D97706" }}>{recentDeployments.length}</div>
                <div className="text-[10px] text-gray-500 font-semibold">Deployments</div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "#DCFCE7" }}>
                <div className="text-lg font-black text-green-700">
                  {leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0}%
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">Conversion Rate</div>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: "#EDE9FE" }}>
                <div className="text-lg font-black text-purple-700">
                  {leads.filter(l => l.isActive && l.assignedMentorId).length}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold">Deployed</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Demo Students View ────────────────────────────────────────────────────────

interface StudentRow {
  enrollmentId: number; studentId: number; batchId: number;
  name: string; grade: number | null; school: string | null; city: string | null;
  phone: string | null; email: string | null; parentPhone: string | null;
  batchTitle: string; batchSubject: string | null; batchGrade: number | null;
  enrollmentStatus: string; lastDayAttended: number | null;
  assignedMentorName: string | null; callStatus: string | null;
  interestLevel: string | null; leadStage: string | null;
  nextFollowUpAt: string | null; lastCallAt: string | null; enrolledAt: string;
}

function DemoStudentsView({ flash, role = "admin" }: { flash: (m: string, ok?: boolean) => void; role?: string }) {
  const canSeeAll = igniteCanSeeAllTime(role);
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const [customDate, setCustomDate] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batchF, setBatchF] = useState("All Batches");
  const [mentorF, setMentorF] = useState("All Mentors");
  const [statusF, setStatusF] = useState("All Status");
  const [page, setPage] = useState(1);
  const PER = 12;

  useEffect(() => {
    apiFetch("/admin/ignite/demo-students")
      .then((r) => r.json())
      .then(setStudents)
      .catch(() => flash("Failed to load students", false))
      .finally(() => setLoading(false));
  }, []);

  const dateCutoff = dateRangeCutoff(dateRange, customDate);
  const dateStudents = filterByDateField(students, "enrolledAt", dateCutoff);

  const batches = [...new Set(dateStudents.map((s) => s.batchTitle))];
  const mentors = [...new Set(dateStudents.map((s) => s.assignedMentorName).filter(Boolean))] as string[];

  const filtered = dateStudents.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !(s.phone ?? "").includes(q) && !(s.school ?? "").toLowerCase().includes(q)) return false;
    if (batchF !== "All Batches" && s.batchTitle !== batchF) return false;
    if (mentorF !== "All Mentors" && s.assignedMentorName !== mentorF) return false;
    if (statusF !== "All Status" && s.enrollmentStatus !== statusF) return false;
    return true;
  });

  const exportCSV = () => {
    const rangeLabel = dateRange === "all" ? "all" : dateRange === "7" ? "7d" : dateRange === "30" ? "30d" : dateRange === "this-month" ? "thismonth" : customDate || "custom";
    const csv = makeCSV(
      ["Name","Phone","Email","Grade","School","Batch","Mentor","Status","Interest","Lead Stage","Enrolled At"],
      filtered.map(s => [s.name, s.phone, s.email, s.grade, s.school, s.batchTitle, s.assignedMentorName, s.enrollmentStatus, s.interestLevel, s.leadStage, new Date(s.enrolledAt).toLocaleDateString("en-IN")])
    );
    downloadCSVFile(csv, `braintam_demo-students_${rangeLabel}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  const total = dateStudents.length;
  const active = dateStudents.filter((s) => s.enrollmentStatus === "active").length;
  const interested = dateStudents.filter((s) => s.interestLevel === "High" || s.interestLevel === "Very High").length;
  const paymentSent = dateStudents.filter((s) => s.leadStage === "Payment Sent").length;
  const converted = dateStudents.filter((s) => s.enrollmentStatus === "converted").length;
  const dropped = dateStudents.filter((s) => s.enrollmentStatus === "dropped").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Demo Students</h1>
          <p className="text-xs text-gray-500">View and manage all demo students</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90"
            style={{ background: ORANGE }}>
            <Plus className="w-3.5 h-3.5" /> Add Demo Student
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <DateRangeChips value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} allowAll={canSeeAll} customDate={customDate} onCustomDate={v => { setCustomDate(v); setPage(1); }} label="Period:" />
        {!canSeeAll && <span className="text-[10px] text-orange-500 font-semibold ml-auto">⚠ Export limited to 7 days</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Total Demo Students" value={total} icon={Users} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Active Students" value={active} icon={UserCheck} color="#3B82F6" bgColor="#DBEAFE" />
        <KpiCard label="Interested Students" value={interested} icon={Star} color="#F59E0B" bgColor="#FEF3C7" />
        <KpiCard label="Payment Sent" value={paymentSent} icon={CheckCircle} color="#8B5CF6" bgColor="#EDE9FE" />
        <KpiCard label="Converted Students" value={converted} icon={Award} color={GREEN} bgColor="#D1FAE5" />
        <KpiCard label="Dropped Students" value={dropped} icon={XCircle} color="#EF4444" bgColor="#FEE2E2" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, phone or school..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>
          <select value={batchF} onChange={(e) => { setBatchF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            <option>All Batches</option>
            {batches.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={mentorF} onChange={(e) => { setMentorF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            <option>All Mentors</option>
            {mentors.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            <option>All Status</option>
            {["active", "converted", "dropped"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {["Student Name", "Grade", "School", "City", "Batch", "Sales Mentor", "Status", "Interest Level", "Last Contact", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading students...
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400 text-sm">No students found</td></tr>
              ) : paged.map((s) => (
                <tr key={s.enrollmentId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{s.name?.[0] ?? "?"}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{s.name}</div>
                        <div className="text-gray-400 text-xs">{s.phone ?? s.email ?? "–"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.grade ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-32 truncate">{s.school ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.city ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs max-w-32 truncate">{s.batchTitle}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{s.assignedMentorName ?? "–"}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.enrollmentStatus} /></td>
                  <td className="px-4 py-3"><InterestBadge level={s.interestLevel} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(s.lastCallAt)}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-semibold px-3 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "#EEF2FF", color: NAVY }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1} to {Math.min(page * PER, filtered.length)} of {filtered.length} students</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold transition-colors"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
              ))}
              {totalPages > 7 && <span className="px-1">…</span>}
              {totalPages > 7 && (
                <button onClick={() => setPage(totalPages)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === totalPages ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{totalPages}</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Attendance Calendar ───────────────────────────────────────────────────────

function AttendanceCalendar({ data }: { data: AttendanceData }) {
  if (data.sessions.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No sessions recorded for this batch</div>;
  }

  function toISTDate(s: string) {
    const d = new Date(new Date(s).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function dKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const sessions = data.sessions.map((s, idx) => {
    const present = data.grid.filter(e => e.days[idx]).length;
    const total = data.grid.length;
    return { ...s, idx, pct: total > 0 ? Math.round((present / total) * 100) : 0, present, total, date: toISTDate(s.scheduledAt) };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sessions.length === 0) return null;

  const sessionMap = new Map(sessions.map(s => [dKey(s.date), s]));
  const firstDate = sessions[0].date;
  const lastDate = sessions[sessions.length - 1].date;

  const startMonday = new Date(firstDate);
  const fd = firstDate.getDay();
  startMonday.setDate(firstDate.getDate() - (fd === 0 ? 6 : fd - 1));

  const endSunday = new Date(lastDate);
  const ld = lastDate.getDay();
  endSunday.setDate(lastDate.getDate() + (ld === 0 ? 0 : 7 - ld));

  const weeks: Date[][] = [];
  const cur = new Date(startMonday);
  while (cur <= endSunday) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
  }

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-gray-400 pb-1">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1.5">
          {week.map((date, di) => {
            const key = dKey(date);
            const s = sessionMap.get(key);
            const inRange = date >= firstDate && date <= endSunday;
            if (!inRange) return <div key={di} className="h-16 rounded-xl" />;
            if (!s) return (
              <div key={di} className="h-16 rounded-xl bg-gray-50 flex items-center justify-center">
                <span className="text-[11px] text-gray-200 font-semibold">{date.getDate()}</span>
              </div>
            );
            const color = s.pct >= 80 ? "#10B981" : s.pct >= 60 ? "#D97706" : "#EF4444";
            const bg    = s.pct >= 80 ? "#D1FAE5" : s.pct >= 60 ? "#FEF3C7" : "#FEE2E2";
            return (
              <div key={di} className="h-16 rounded-xl p-1.5 flex flex-col items-center justify-center gap-0.5" style={{ background: bg }}>
                <div className="text-[9px] font-semibold text-gray-500">
                  {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </div>
                <div className="text-[10px] font-bold text-gray-500">D{s.dayNumber}</div>
                <div className="text-sm font-black leading-none" style={{ color }}>{s.pct}%</div>
                <div className="text-[9px] text-gray-400">{s.present}/{s.total}</div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex items-center gap-4 justify-end pt-1">
        {[
          { color: "#10B981", bg: "#D1FAE5", label: "≥80% Present" },
          { color: "#D97706", bg: "#FEF3C7", label: "60–79%" },
          { color: "#EF4444", bg: "#FEE2E2", label: "<60%" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: l.bg, border: `1.5px solid ${l.color}` }} />
            <span className="text-[10px] text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Attendance View ───────────────────────────────────────────────────────────

interface AttendanceData {
  batch: { id: number; title: string; grade: number | null; subject: string | null; totalDays: number };
  sessions: { id: number; dayNumber: number; title: string; scheduledAt: string }[];
  grid: { enrollmentId: number; studentId: number; name: string; grade: number | null;
    enrollmentStatus: string; days: boolean[]; presentDays: number; attPct: number; assignedMentorName: string | null }[];
  kpis: { totalStudents: number; overallAttPct: number };
}

function AttendanceView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [batches, setBatches] = useState<{ id: number; title: string }[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const PER = 10;

  useEffect(() => {
    apiFetch("/admin/demo-batches")
      .then((r) => r.json())
      .then((bs: { id: number; title: string }[]) => {
        setBatches(bs);
        if (bs.length > 0) setSelectedBatch(bs[0].id);
      })
      .finally(() => setBatchesLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBatch) return;
    setLoading(true);
    apiFetch(`/admin/ignite/attendance/${selectedBatch}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => flash("Failed to load attendance", false))
      .finally(() => setLoading(false));
  }, [selectedBatch]);

  const paged = data ? data.grid.slice((page - 1) * PER, page * PER) : [];
  const totalPages = data ? Math.ceil(data.grid.length / PER) : 0;

  const totalStudents = data?.kpis.totalStudents ?? 0;
  const overallAttPct = data?.kpis.overallAttPct ?? 0;
  const totalDays = data?.batch.totalDays ?? 0;
  const avgPresent = totalStudents > 0 && totalDays > 0
    ? Math.round(data!.grid.reduce((s, e) => s + e.presentDays, 0) / totalStudents) : 0;
  const presentStudents = data ? data.grid.filter((e) => (e.presentDays ?? 0) > 0).length : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Attendance</h1>
          <p className="text-xs text-gray-500">Track demo student attendance by batch</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(v => v === "calendar" ? "table" : "calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${viewMode === "calendar" ? "border-blue-300 bg-blue-50 text-blue-700 font-semibold" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Calendar className="w-3.5 h-3.5" /> {viewMode === "calendar" ? "Table View" : "Calendar View"}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total Students" value={totalStudents} icon={Users} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Present" value={presentStudents}
          sub={totalStudents > 0 ? `${Math.round((presentStudents / totalStudents) * 100)}%` : "0%"}
          icon={CheckCircle} color={GREEN} bgColor="#D1FAE5" />
        <KpiCard label="Absent" value={Math.max(0, totalStudents - presentStudents)}
          sub={totalStudents > 0 ? `${Math.round(((totalStudents - presentStudents) / totalStudents) * 100)}%` : "0%"}
          icon={XCircle} color="#EF4444" bgColor="#FEE2E2" />
        <KpiCard label="Late / Partial" value={data ? data.grid.filter((e) => e.attPct > 0 && e.attPct < 80).length : 0}
          sub={data ? `${Math.round((data.grid.filter((e) => e.attPct > 0 && e.attPct < 80).length / Math.max(1, totalStudents)) * 100)}%` : "0%"}
          icon={Clock} color="#F59E0B" bgColor="#FEF3C7" />
        <KpiCard label="Attendance %" value={`${overallAttPct}%`} icon={BarChart3} color="#8B5CF6" bgColor="#EDE9FE" />
      </div>

      {/* Batch Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={selectedBatch ?? ""}
            onChange={(e) => { setSelectedBatch(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none min-w-48"
            disabled={batchesLoading}>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          {data && (
            <div className="text-xs text-gray-500">
              Batch: <span className="font-semibold text-gray-700">{data.batch.title}</span>
              {" · "}{data.batch.totalDays} days total
              {data.batch.subject && ` · ${data.batch.subject}`}
            </div>
          )}
        </div>
      </div>

      {/* Calendar / Table toggle */}
      {viewMode === "calendar" ? (
        data
          ? <AttendanceCalendar data={data} />
          : <div className="text-center py-12 text-gray-400 text-sm">Select a batch to view calendar</div>
      ) : (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap sticky left-0 bg-white">Student Name</th>
                {data?.sessions.map((s) => (
                  <th key={s.id} className="px-2 py-3 text-center font-semibold text-gray-500 whitespace-nowrap min-w-12">
                    <div>{new Date(s.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>
                    <div className="text-gray-400 font-normal">D{s.dayNumber}</div>
                  </th>
                ))}
                {data && data.sessions.length === 0 && Array.from({ length: data.batch.totalDays }, (_, i) => (
                  <th key={i} className="px-2 py-3 text-center font-semibold text-gray-500 min-w-12">D{i + 1}</th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-500 whitespace-nowrap">Att %</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={20} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading attendance...
                </td></tr>
              ) : !data ? (
                <tr><td colSpan={20} className="text-center py-12 text-gray-400 text-sm">Select a batch to view attendance</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={20} className="text-center py-12 text-gray-400 text-sm">No students enrolled in this batch</td></tr>
              ) : paged.map((e) => {
                const days = e.days.length > 0 ? e.days : Array.from({ length: data.batch.totalDays }, () => false);
                return (
                  <tr key={e.enrollmentId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: NAVY }}>{e.name?.[0] ?? "?"}</div>
                        <span className="font-semibold text-gray-800">{e.name}</span>
                      </div>
                    </td>
                    {days.map((present, idx) => (
                      <td key={idx} className="px-2 py-2.5 text-center">
                        {present ? (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto" style={{ background: "#D1FAE5" }}>
                            <Check className="w-3.5 h-3.5" style={{ color: GREEN }} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center mx-auto" style={{ background: "#FEE2E2" }}>
                            <X className="w-3.5 h-3.5 text-red-400" />
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-semibold" style={{ color: e.attPct >= 80 ? GREEN : e.attPct >= 60 ? "#D97706" : "#EF4444" }}>
                        {e.attPct}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button className="text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80"
                        style={{ background: "#EEF2FF", color: NAVY }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#D1FAE5" }}><Check className="w-3 h-3" style={{ color: GREEN }} /></div>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#FEE2E2" }}><X className="w-3 h-3 text-red-400" /></div>
                <span>Absent</span>
              </div>
            </div>
            <span>Showing {Math.min(1, data.grid.length)} to {Math.min(page * PER, data.grid.length)} of {data.grid.length} students</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-6 h-6 rounded text-xs font-semibold"
                    style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ── Homework View ─────────────────────────────────────────────────────────────

interface HomeworkSession {
  id: number; batchId: number; title: string; dayNumber: number;
  scheduledAt: string; homeworkText: string | null; status: string;
  batchTitle: string; batchGrade: number | null; batchSubject: string | null;
  totalStudents: number; submitted: number; pending: number; overdue: number;
}

function HomeworkView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [sessions, setSessions] = useState<HomeworkSession[]>([]);
  const [kpis, setKpis] = useState({ totalHomework: 0, totalSubmissions: 0, submittedPct: 0, totalStudentsAll: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batchF, setBatchF] = useState("All Batches");
  const [statusF, setStatusF] = useState("All Status");
  const [page, setPage] = useState(1);
  const PER = 10;

  useEffect(() => {
    apiFetch("/admin/ignite/homework")
      .then((r) => r.json())
      .then((d: { sessions: HomeworkSession[]; kpis: typeof kpis }) => {
        setSessions(d.sessions ?? []);
        setKpis(d.kpis ?? kpis);
      })
      .catch(() => flash("Failed to load homework", false))
      .finally(() => setLoading(false));
  }, []);

  const batchOptions = [...new Set(sessions.map((s) => s.batchTitle))];
  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.title.toLowerCase().includes(q) && !s.batchTitle.toLowerCase().includes(q)) return false;
    if (batchF !== "All Batches" && s.batchTitle !== batchF) return false;
    if (statusF !== "All Status" && s.status !== statusF) return false;
    return true;
  });
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  const totalPending = sessions.reduce((s, h) => s + h.pending, 0);
  const totalOverdue = sessions.reduce((s, h) => s + h.overdue, 0);
  const pendingPct = kpis.totalStudentsAll > 0 ? Math.round((totalPending / kpis.totalStudentsAll) * 100) : 0;
  const overduePct = kpis.totalStudentsAll > 0 ? Math.round((totalOverdue / kpis.totalStudentsAll) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Homework</h1>
          <p className="text-xs text-gray-500">Manage demo batch homework</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90"
          style={{ background: ORANGE }}>
          <Plus className="w-3.5 h-3.5" /> Assign Homework
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="All Homework" value={kpis.totalHomework} icon={ClipboardList} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Submitted" value={kpis.totalSubmissions} sub={`${kpis.submittedPct}%`}
          icon={CheckCircle} color={GREEN} bgColor="#D1FAE5" />
        <KpiCard label="Pending" value={totalPending} sub={`${pendingPct}%`}
          icon={Clock} color="#F59E0B" bgColor="#FEF3C7" />
        <KpiCard label="Overdue" value={totalOverdue} sub={`${overduePct}%`}
          icon={AlertTriangle} color="#EF4444" bgColor="#FEE2E2" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={batchF} onChange={(e) => { setBatchF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            <option>All Batches</option>
            {batchOptions.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
            <option>All Status</option>
            {["upcoming", "live", "completed"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search homework..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                {["Homework Title", "Batch", "Assigned Date", "Due Date", "Total Students", "Submitted", "Pending", "Overdue", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading homework...
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                  {sessions.length === 0 ? "No sessions with homework found. Add homework text to sessions." : "No homework matches filters"}
                </td></tr>
              ) : paged.map((s) => {
                const submittedPct = s.totalStudents > 0 ? Math.round((s.submitted / s.totalStudents) * 100) : 0;
                const pendingPct = s.totalStudents > 0 ? Math.round((s.pending / s.totalStudents) * 100) : 0;
                const overduePct = s.totalStudents > 0 ? Math.round((s.overdue / s.totalStudents) * 100) : 0;
                const dueDate = s.scheduledAt ? new Date(new Date(s.scheduledAt).getTime() + 2 * 24 * 60 * 60 * 1000) : null;
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold max-w-48" style={{ color: NAVY }}>
                      <div className="truncate" title={s.homeworkText ?? s.title}>{s.title}</div>
                      {s.homeworkText && <div className="text-gray-400 text-xs font-normal truncate mt-0.5">{s.homeworkText.slice(0, 50)}{s.homeworkText.length > 50 ? "…" : ""}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-40 truncate">{s.batchTitle}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmt(s.scheduledAt)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{dueDate ? fmt(dueDate.toISOString()) : "–"}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold text-xs">{s.totalStudents}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold" style={{ color: GREEN }}>{s.submitted}</span>
                      <span className="text-gray-400 ml-1">({submittedPct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold" style={{ color: "#D97706" }}>{s.pending}</span>
                      <span className="text-gray-400 ml-1">({pendingPct}%)</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold" style={{ color: "#EF4444" }}>{s.overdue}</span>
                      <span className="text-gray-400 ml-1">({overduePct}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs font-semibold px-3 py-1 rounded-lg hover:opacity-80"
                        style={{ background: "#EEF2FF", color: NAVY }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1} to {Math.min(page * PER, filtered.length)} of {filtered.length} homework</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Follow-ups View ───────────────────────────────────────────────────────────

interface FollowUp {
  id: number; mentorId: number | null; studentId: number | null;
  note: string | null; noteType: string | null; callStatus: string | null;
  leadStatus: string | null; nextFollowUpDate: string | null; createdAt: string;
  mentorName: string | null; studentName: string | null; studentPhone: string | null; studentGrade: number | null;
}

function FollowUpsView({ flash, role = "admin" }: { flash: (m: string, ok?: boolean) => void; role?: string }) {
  const canSeeAll = igniteCanSeeAllTime(role);
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const [customDate, setCustomDate] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [page, setPage] = useState(1);
  const PER = 12;

  useEffect(() => {
    apiFetch("/admin/ignite/follow-ups")
      .then((r) => r.json())
      .then(setFollowUps)
      .catch(() => flash("Failed to load follow-ups", false))
      .finally(() => setLoading(false));
  }, []);

  const dateCutoff = dateRangeCutoff(dateRange, customDate);
  const dateFollowUps = filterByDateField(followUps, "createdAt", dateCutoff);

  const todayStr = new Date().toDateString();
  const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
  const nowTs = Date.now();

  function isToday(d: string | null) { return !!d && new Date(d).toDateString() === todayStr; }
  function isTomorrow(d: string | null) { return !!d && new Date(d).toDateString() === tomorrowStr; }
  function isOverdue(f: FollowUp) { return !!f.nextFollowUpDate && new Date(f.nextFollowUpDate).getTime() < nowTs && (f.callStatus ?? "").toLowerCase() !== "completed"; }
  function isCompleted(f: FollowUp) { return (f.callStatus ?? "").toLowerCase() === "completed"; }

  const TABS = [
    { id: "All",       color: NAVY,      count: dateFollowUps.length },
    { id: "Today",     color: ORANGE,    count: dateFollowUps.filter((f) => isToday(f.nextFollowUpDate)).length },
    { id: "Tomorrow",  color: "#3B82F6", count: dateFollowUps.filter((f) => isTomorrow(f.nextFollowUpDate)).length },
    { id: "Overdue",   color: "#EF4444", count: dateFollowUps.filter(isOverdue).length },
    { id: "Completed", color: GREEN,     count: dateFollowUps.filter(isCompleted).length },
  ];

  const byTab = dateFollowUps.filter((f) => {
    if (activeTab === "Today")     return isToday(f.nextFollowUpDate);
    if (activeTab === "Tomorrow")  return isTomorrow(f.nextFollowUpDate);
    if (activeTab === "Overdue")   return isOverdue(f);
    if (activeTab === "Completed") return isCompleted(f);
    return true;
  });

  const exportCSV = () => {
    const rangeLabel = dateRange === "all" ? "all" : dateRange === "7" ? "7d" : dateRange === "30" ? "30d" : dateRange === "this-month" ? "thismonth" : customDate || "custom";
    const csv = makeCSV(
      ["Student","Mentor","Lead Status","Call Status","Next Follow-Up","Created"],
      dateFollowUps.map(f => [f.studentName, f.mentorName, f.leadStatus, f.callStatus, f.nextFollowUpDate ? new Date(f.nextFollowUpDate).toLocaleDateString("en-IN") : "", new Date(f.createdAt).toLocaleDateString("en-IN")])
    );
    downloadCSVFile(csv, `braintam_followups_${rangeLabel}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const filtered = byTab.filter((f) => {
    const q = search.toLowerCase();
    return !q || (f.studentName ?? "").toLowerCase().includes(q) || (f.mentorName ?? "").toLowerCase().includes(q);
  });
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Follow-ups</h1>
          <p className="text-xs text-gray-500">Manage mentor follow-up activity and call logs</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <DateRangeChips value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} allowAll={canSeeAll} customDate={customDate} onCustomDate={v => { setCustomDate(v); setPage(1); }} label="Period:" />
        {!canSeeAll && <span className="text-[10px] text-orange-500 font-semibold ml-auto">⚠ Export limited to 7 days</span>}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={activeTab === t.id
              ? { background: t.color, color: "#fff", borderColor: t.color }
              : { background: "#fff", color: "#6B7280", borderColor: "#E5E7EB" }}>
            {t.id}
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
              style={activeTab === t.id
                ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                : { background: t.id === "Overdue" ? "#FEE2E2" : "#F3F4F6", color: t.id === "Overdue" ? "#991B1B" : "#374151" }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by student or mentor..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <tr>
                {["Student", "Grade", "Mentor", "Type", "Status", "Note", "Next Follow-up", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading follow-ups...
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No follow-ups in this category</td></tr>
              ) : paged.map((f) => {
                const overdue = isOverdue(f);
                return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">{f.studentName ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{f.studentGrade ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{f.mentorName ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{f.noteType ?? "Call"}</td>
                  <td className="px-4 py-3 text-xs">
                    {f.callStatus ? <StatusBadge status={f.callStatus} /> : <span className="text-gray-400">–</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-48 truncate">{f.note ?? "–"}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: overdue ? "#EF4444" : "#374151" }}>
                    {fmt(f.nextFollowUpDate)}
                    {overdue && <span className="ml-1 text-[10px] font-bold text-red-500">!</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "#EEF2FF", color: NAVY }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mentors Hub View ─────────────────────────────────────────────────────────

// ── Grade Teams View ──────────────────────────────────────────────────────────

interface GradeTeamMentor {
  id: number; name: string; email: string | null;
  phone: string | null; isActive: boolean | null;
  assignedAt: string | null;
}
interface GradeTeamCard {
  grade: number; mentors: GradeTeamMentor[];
  mentorCount: number; totalLeads: number;
  conversions: number; conversionRate: number;
}
interface AllMentor {
  id: number; name: string; email: string | null;
  phone: string | null; isActive: boolean;
}

const GRADE_COLORS: Record<number, { bg: string; text: string; ring: string }> = {
  1:  { bg: "#EFF6FF", text: "#1D4ED8", ring: "#BFDBFE" },
  2:  { bg: "#F0FDF4", text: "#15803D", ring: "#BBF7D0" },
  3:  { bg: "#FFF7ED", text: "#C2410C", ring: "#FED7AA" },
  4:  { bg: "#FDF4FF", text: "#7E22CE", ring: "#E9D5FF" },
  5:  { bg: "#FFF1F2", text: "#BE123C", ring: "#FECDD3" },
  6:  { bg: "#F0FDFA", text: "#0F766E", ring: "#99F6E4" },
  7:  { bg: "#FEFCE8", text: "#A16207", ring: "#FEF08A" },
  8:  { bg: "#F8FAFC", text: "#334155", ring: "#CBD5E1" },
  9:  { bg: "#FFF7ED", text: "#EA580C", ring: "#FDBA74" },
  10: { bg: "#EEF2FF", text: "#4338CA", ring: "#C7D2FE" },
};

function ManageTeamModal({ grade, currentMentorIds, allMentors, onSave, onClose, flash }: {
  grade: number; currentMentorIds: number[]; allMentors: AllMentor[];
  onSave: () => void; onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(currentMentorIds));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = allMentors.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q)
      || (m.email ?? "").toLowerCase().includes(q)
      || (m.phone ?? "").includes(q);
  });

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/ignite/grade-teams/${grade}/mentors`, {
        method: "PUT",
        body: JSON.stringify({ mentorIds: Array.from(selected) }),
      });
      if (r.ok) { flash(`Grade ${grade} team updated — ${selected.size} mentor${selected.size !== 1 ? "s" : ""} assigned`, true); onSave(); }
      else { const d = await r.json().catch(() => ({} as Record<string,string>)); flash(d.error ?? "Failed to save", false); }
    } finally { setSaving(false); }
  };

  const colors = GRADE_COLORS[grade] ?? { bg: "#F8FAFC", text: NAVY, ring: "#E2E8F0" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background: colors.bg, color: colors.text, border: `2px solid ${colors.ring}` }}>
              G{grade}
            </div>
            <div>
              <h3 className="font-black text-base" style={{ color: NAVY }}>Manage Grade {grade} Team</h3>
              <p className="text-xs text-gray-400">Select mentors for this grade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Selected summary */}
        {selected.size > 0 && (
          <div className="px-5 py-2.5 border-b border-gray-100 bg-blue-50 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Selected ({selected.size}):</span>
              {Array.from(selected).map(id => {
                const m = allMentors.find(x => x.id === id);
                return m ? (
                  <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: colors.bg, color: colors.text }}>
                    {m.name.split(" ")[0]}
                    <button onClick={() => toggle(id)} className="ml-0.5 opacity-60 hover:opacity-100">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>
        </div>

        {/* Mentor list */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">No mentors found</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(m => {
                const checked = selected.has(m.id);
                return (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                      checked
                        ? "border border-blue-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                    style={checked ? { background: `${colors.bg}` } : {}}>
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                      checked ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
                    }`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
                      style={{ background: m.isActive ? NAVY : "#9CA3AF" }}>
                      {m.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-gray-800 flex items-center gap-1.5">
                        {m.name}
                        {!m.isActive && <span className="text-[9px] text-red-500 font-bold">(inactive)</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">{m.email ?? m.phone ?? "–"}</div>
                    </div>
                    {checked && (
                      <Check className="w-3.5 h-3.5 shrink-0" style={{ color: colors.text }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all"
            style={{ background: NAVY }}>
            {saving ? "Saving…" : `Save Changes (${selected.size} mentor${selected.size !== 1 ? "s" : ""})`}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function GradeTeamsView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [grades, setGrades] = useState<GradeTeamCard[]>([]);
  const [allMentors, setAllMentors] = useState<AllMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [managingGrade, setManagingGrade] = useState<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const r = await apiFetch("/admin/ignite/grade-teams");
      if (!r.ok) throw new Error("Failed to load grade teams");
      const d = await r.json() as { grades: GradeTeamCard[]; allMentors: AllMentor[] };
      setGrades(d.grades ?? []);
      setAllMentors(d.allMentors ?? []);
    } catch {
      flash("Failed to load grade teams", false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const totalMentors = allMentors.filter(m => m.isActive).length;
  const totalLeads = grades.reduce((s, g) => s + g.totalLeads, 0);
  const totalConversions = grades.reduce((s, g) => s + g.conversions, 0);
  const overallRate = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;

  const managingCard = grades.find(g => g.grade === managingGrade);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Grade Teams</h1>
          <p className="text-xs text-gray-500 mt-0.5">Assign multiple mentors to each grade — leads are distributed across the team</p>
        </div>
        <button onClick={() => load(true)} disabled={loading || refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${(loading || refreshing) ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: "Active Mentors",  value: totalMentors,    icon: Users,       color: NAVY,    bg: "#EEF2FF" },
          { label: "Total Leads",     value: totalLeads,      icon: Phone,       color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Conversions",     value: totalConversions,icon: CheckCircle, color: GREEN,   bg: "#DCFCE7" },
          { label: "Conversion Rate", value: `${overallRate}%`, icon: TrendingUp, color: "#8B5CF6", bg: "#EDE9FE" },
        ] as { label: string; value: string | number; icon: React.ElementType; color: string; bg: string }[]).map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: k.bg }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <div>
              <div className="text-lg font-black leading-none" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] text-gray-400 font-medium mt-0.5">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Explainer */}
      <div className="bg-white rounded-2xl border border-blue-100 p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF2FF" }}>
          <GitBranch className="w-4 h-4" style={{ color: NAVY }} />
        </div>
        <div className="text-xs text-gray-600 leading-relaxed">
          <span className="font-black" style={{ color: NAVY }}>Multi-mentor grades: </span>
          Each grade can have multiple sales mentors. Click <strong>Manage Team</strong> on any grade card to add or remove mentors. 
          This replaces the old single-mentor dropdown system.
        </div>
      </div>

      {/* Grade cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {grades.map(card => {
            const colors = GRADE_COLORS[card.grade] ?? { bg: "#F8FAFC", text: NAVY, ring: "#E2E8F0" };
            const convRate = card.conversionRate;
            return (
              <div key={card.grade}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Grade badge + stats */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg"
                    style={{ background: colors.bg, color: colors.text, border: `2px solid ${colors.ring}` }}>
                    G{card.grade}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Conv. Rate</div>
                    <div className="text-base font-black" style={{ color: convRate > 15 ? GREEN : convRate > 5 ? ORANGE : "#9CA3AF" }}>
                      {convRate}%
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <div className="font-black text-sm" style={{ color: NAVY }}>{card.mentorCount}</div>
                    <div className="text-gray-400 text-[10px]">👥 Mentors</div>
                  </div>
                  <div className="h-6 w-px bg-gray-100" />
                  <div>
                    <div className="font-black text-sm text-blue-600">{card.totalLeads}</div>
                    <div className="text-gray-400 text-[10px]">📞 Leads</div>
                  </div>
                  <div className="h-6 w-px bg-gray-100" />
                  <div>
                    <div className="font-black text-sm" style={{ color: GREEN }}>{card.conversions}</div>
                    <div className="text-gray-400 text-[10px]">🎯 Converted</div>
                  </div>
                </div>

                {/* Mentor name chips */}
                <div className="min-h-[28px]">
                  {card.mentors.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 border border-dashed border-gray-200 rounded-xl px-3 py-2">
                      <Users className="w-3 h-3" /> No mentors assigned yet
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {card.mentors.slice(0, 4).map(m => (
                        <span key={m.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.ring}` }}>
                          {m.name.split(" ")[0]}
                        </span>
                      ))}
                      {card.mentors.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                          +{card.mentors.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Manage Team button */}
                <button
                  onClick={() => setManagingGrade(card.grade)}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-bold border-2 transition-all hover:shadow-sm"
                  style={{ borderColor: colors.ring, color: colors.text, background: colors.bg }}>
                  <Users className="w-3.5 h-3.5" />
                  Manage Team
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Manage Team Modal */}
      {managingGrade !== null && managingCard && (
        <ManageTeamModal
          grade={managingGrade}
          currentMentorIds={managingCard.mentors.map(m => m.id)}
          allMentors={allMentors}
          onSave={() => { setManagingGrade(null); load(true); }}
          onClose={() => setManagingGrade(null)}
          flash={flash}
        />
      )}
    </div>
  );
}

function MentorsHubView({ flash, setView }: { flash: (m: string, ok?: boolean) => void; setView: (v: IgniteView) => void }) {
  return <SalesMentorsView flash={flash} setView={setView} />;
}

// ── Sales Mentors — Modals ────────────────────────────────────────────────────

function AddSalesMentorModal({ onSave, onClose, flash }: {
  onSave: () => void; onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { flash("Name, email and password required", false); return; }
    setSaving(true);
    try {
      const r = await apiFetch("/admin/mentors", { method: "POST", body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || null, password: password.trim(), mentorType: "sales" }) });
      if (r.ok) { flash("Sales mentor added!", true); onSave(); }
      else { const d = await r.json().catch(() => ({} as Record<string,string>)); flash(d.error ?? "Failed to add mentor", false); }
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-black text-base" style={{ color: NAVY }}>Add Sales Mentor</h3>
            <p className="text-xs text-gray-400">Create a new sales mentor account</p></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {([
            { label: "Full Name *", val: name, set: setName, ph: "e.g. Riya Sharma", type: "text" },
            { label: "Email *", val: email, set: setEmail, ph: "mentor@braintam.com", type: "email" },
            { label: "Phone", val: phone, set: setPhone, ph: "+91 XXXXX XXXXX", type: "tel" },
            { label: "Password *", val: password, set: setPassword, ph: "Set login password", type: "password" },
          ] as { label: string; val: string; set: (v: string) => void; ph: string; type: string }[]).map(f => (
            <div key={f.label}>
              <label className="text-xs font-bold mb-1 block" style={{ color: NAVY }}>{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: NAVY }}>
            {saving ? "Adding…" : "Add Mentor"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function EditSalesMentorModal({ mentor, onSave, onClose, flash }: {
  mentor: SalesMentor; onSave: () => void; onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName] = useState(mentor.name);
  const [email, setEmail] = useState(mentor.email ?? "");
  const [phone, setPhone] = useState(mentor.phone ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) { flash("Name is required", false); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), email: email.trim() || null, phone: phone.trim() || null };
      if (password.trim()) body.password = password.trim();
      const r = await apiFetch(`/admin/mentors/${mentor.id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (r.ok) { flash("Mentor updated!", true); onSave(); }
      else { const d = await r.json().catch(() => ({} as Record<string,string>)); flash(d.error ?? "Failed to update", false); }
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-black text-base" style={{ color: NAVY }}>Edit Mentor</h3>
            <p className="text-xs text-gray-400">{mentor.name}</p></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {([
            { label: "Full Name *", val: name, set: setName, ph: "Mentor name", type: "text" },
            { label: "Email", val: email, set: setEmail, ph: "mentor@braintam.com", type: "email" },
            { label: "Phone", val: phone, set: setPhone, ph: "+91 XXXXX XXXXX", type: "tel" },
            { label: "New Password (leave blank to keep)", val: password, set: setPassword, ph: "New password…", type: "password" },
          ] as { label: string; val: string; set: (v: string) => void; ph: string; type: string }[]).map(f => (
            <div key={f.label}>
              <label className="text-xs font-bold mb-1 block" style={{ color: NAVY }}>{f.label}</label>
              <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: NAVY }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ChangeGradesModal({ mentor, allGrades, allMentors, onSave, onClose, flash }: {
  mentor: SalesMentor; allGrades: GradeAssignment[]; allMentors: SalesMentor[];
  onSave: () => void; onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  // One grade per sales mentor — single-select only
  const currentGrade = mentor.gradesManaged[0] ?? null;
  const [selected, setSelected] = useState<number | null>(currentGrade);
  const [saving, setSaving] = useState(false);
  const getOwnerName = (g: number) => {
    const ga = allGrades.find(x => x.grade === g);
    if (!ga?.mentorId || ga.mentorId === mentor.id) return null;
    return ga.mentorName ?? allMentors.find(m => m.id === ga.mentorId)?.name ?? null;
  };
  const submit = async () => {
    setSaving(true);
    try {
      // Clear old grade → assign new one, leave all others untouched
      const updates = allGrades.map(ga => {
        if (ga.grade === selected) return { grade: ga.grade, mentorId: mentor.id, mentorName: mentor.name };
        if (ga.mentorId === mentor.id) return { grade: ga.grade, mentorId: null as number | null, mentorName: null as string | null };
        return ga;
      });
      const r = await apiFetch("/admin/ignite/grade-assignments", { method: "POST", body: JSON.stringify(updates) });
      if (r.ok) { flash(selected ? `G${selected} assigned to ${mentor.name.split(" ")[0]}!` : "Grade unassigned", true); onSave(); }
      else flash("Failed to update grade", false);
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-black text-base" style={{ color: NAVY }}>Assign Grade</h3>
            <p className="text-xs text-gray-400">{mentor.name} — pick exactly one grade</p></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[1,2,3,4,5,6,7,8,9,10].map(g => {
            const ownerName = getOwnerName(g);
            const isSel = selected === g;
            const isMine = currentGrade === g;
            return (
              <button key={g} onClick={() => setSelected(isSel ? null : g)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  isSel
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : ownerName
                      ? "border-orange-200 bg-orange-50/50 hover:border-orange-400"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}>
                <span className={`text-sm font-black ${isSel ? "text-blue-700" : ownerName ? "text-orange-600" : "text-gray-500"}`}>G{g}</span>
                {isSel && <Check className="w-3.5 h-3.5 text-blue-500" />}
                {!isSel && ownerName && <span className="text-[9px] text-orange-500 font-semibold leading-tight truncate w-full text-center">{ownerName.split(" ")[0]}</span>}
                {!isSel && !ownerName && <span className="text-[9px] text-gray-400">{isMine ? "Current" : "Free"}</span>}
              </button>
            );
          })}
        </div>
        {selected !== currentGrade && selected !== null && getOwnerName(selected) && (
          <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
            ⚠ G{selected} is currently owned by <strong>{getOwnerName(selected)}</strong>. Saving will reassign it to {mentor.name.split(" ")[0]}.
          </p>
        )}
        <div className="flex gap-2 mt-2">
          <button onClick={submit} disabled={saving || selected === currentGrade}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: NAVY }}>
            {saving ? "Saving…" : selected ? `Assign G${selected} to ${mentor.name.split(" ")[0]}` : "Unassign Grade"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ManageAllGradesModal({ grades, mentors, onSave, onClose, flash }: {
  grades: GradeAssignment[]; mentors: SalesMentor[];
  onSave: () => void; onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [local, setLocal] = useState<GradeAssignment[]>(grades);
  const [saving, setSaving] = useState(false);
  const setMentorForGrade = (grade: number, mentorId: number | null) => {
    const m = mentors.find(x => x.id === mentorId);
    setLocal(prev => prev.map(g => g.grade === grade ? { ...g, mentorId, mentorName: m?.name ?? null } : g));
  };
  const submit = async () => {
    setSaving(true);
    try {
      const r = await apiFetch("/admin/ignite/grade-assignments", { method: "POST", body: JSON.stringify(local) });
      if (r.ok) { flash("Grade assignments saved!", true); onSave(); }
      else flash("Failed to save assignments", false);
    } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div><h3 className="font-black text-base" style={{ color: NAVY }}>Manage Grade Assignments</h3>
            <p className="text-xs text-gray-400">Assign each grade (G1–G10) to a primary sales mentor</p></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {local.map(ga => (
            <div key={ga.grade} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-sm font-black w-8 shrink-0" style={{ color: NAVY }}>G{ga.grade}</div>
              <select value={ga.mentorId ?? ""} onChange={e => setMentorForGrade(ga.grade, Number(e.target.value) || null)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white">
                <option value="">— Unassigned —</option>
                {mentors.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={saving} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: NAVY }}>
            {saving ? "Saving…" : "Save All Assignments"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AutoBalanceModal({ mentors, flash, onClose }: {
  mentors: SalesMentor[]; flash: (m: string, ok?: boolean) => void; onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const r = await apiFetch("/admin/ignite/grade-assignments/auto-balance", { method: "POST" });
      if (r.ok) { flash("Grades auto-balanced across active mentors!", true); onClose(); }
      else flash("Auto-balance failed", false);
    } finally { setSaving(false); }
  };
  const active = mentors.filter(m => m.isActive).length;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-black text-base" style={{ color: NAVY }}>Auto Balance Grades</h3>
            <p className="text-xs text-gray-400">Distribute grades evenly across active mentors</p></div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700">
          Grades G1–G10 will be distributed in round-robin across <strong>{active} active mentor{active !== 1 ? "s" : ""}</strong>. Existing assignments will be replaced.
        </div>
        <div className="flex gap-2">
          <button onClick={submit} disabled={saving || active === 0} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50" style={{ background: NAVY }}>
            {saving ? "Balancing…" : "Auto Balance"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Mentor Lead Modals ────────────────────────────────────────────────────────

function MentorLeadsModal({ mentor, allMentors, onClose, flash }: {
  mentor: SalesMentor; allMentors: SalesMentor[];
  onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reassignId, setReassignId] = useState<number | null>(null);
  const [newMentorId, setNewMentorId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/admin/ignite/leads").then(r => r.json()).then((d: LeadRow[]) => {
      setLeads(Array.isArray(d) ? d.filter(l => l.assignedMentorId === mentor.id) : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [mentor.id]);

  const doReassign = async (lead: LeadRow) => {
    if (!newMentorId) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/ignite/leads/${lead.id}/reassign`, {
        method: "POST", body: JSON.stringify({ newMentorId: Number(newMentorId) }),
      });
      if (r.ok) {
        flash("Lead reassigned!", true);
        setLeads(prev => prev.filter(l => l.id !== lead.id));
        setReassignId(null); setNewMentorId("");
      } else flash("Failed to reassign", false);
    } finally { setSaving(false); }
  };

  const shown = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.phone ?? "").includes(search) || (l.grade?.toString() ?? "").includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-black text-base" style={{ color: NAVY }}>Assigned Leads</h3>
            <p className="text-xs text-gray-400">{mentor.name} · {leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, grade…"
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-14"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">{leads.length === 0 ? "No leads assigned to this mentor yet." : "No matching leads."}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100 sticky top-0" style={{ background: "#F8FAFF" }}>
                <tr>
                  {["Lead","Grade","Phone","Stage","Source",""].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-blue-50/20">
                    <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{l.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{l.grade ? `G${l.grade}` : "–"}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">{l.phone ?? "–"}</td>
                    <td className="px-4 py-2.5"><StageBadge stage={l.leadStage} /></td>
                    <td className="px-4 py-2.5 text-gray-400">{l.leadSource ?? "–"}</td>
                    <td className="px-4 py-2.5 relative">
                      {reassignId === l.id ? (
                        <div className="flex items-center gap-1.5">
                          <select value={newMentorId} onChange={e => setNewMentorId(e.target.value)}
                            className="text-[10px] rounded-lg border border-gray-200 px-1.5 py-1 outline-none focus:border-blue-400 bg-white max-w-[110px]">
                            <option value="">Pick mentor…</option>
                            {allMentors.filter(m => m.id !== mentor.id && m.isActive).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                          <button onClick={() => doReassign(l)} disabled={!newMentorId || saving}
                            className="text-[10px] px-2 py-1 rounded-lg text-white font-bold disabled:opacity-40" style={{ background: NAVY }}>
                            {saving ? "…" : "Go"}
                          </button>
                          <button onClick={() => { setReassignId(null); setNewMentorId(""); }}
                            className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setReassignId(l.id)}
                          className="text-[10px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 font-semibold">
                          Reassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
}

function AssignLeadModal({ mentor, onSave, onClose, flash }: {
  mentor: SalesMentor; onSave: () => void;
  onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/admin/ignite/leads").then(r => r.json()).then((d: LeadRow[]) => {
      setLeads(Array.isArray(d) ? d.filter(l => !l.assignedMentorId && l.isActive && l.leadStage !== "Lost" && l.leadStage !== "Converted") : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const doAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/ignite/leads/${selected}`, {
        method: "PUT",
        body: JSON.stringify({ assignedMentorId: mentor.id, assignmentStatus: "assigned" }),
      });
      if (r.ok) { flash(`Lead assigned to ${mentor.name.split(" ")[0]}!`, true); onSave(); }
      else flash("Failed to assign lead", false);
    } finally { setSaving(false); }
  };

  const shown = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.phone ?? "").includes(search) || (l.grade?.toString() ?? "").includes(search) ||
    (l.leadSource ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="font-black text-base" style={{ color: NAVY }}>Assign Lead</h3>
            <p className="text-xs text-gray-400">Pick an unassigned lead → assign to <strong>{mentor.name}</strong></p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-5 py-2.5 border-b border-gray-100 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, grade, source…"
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-14"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : shown.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">{leads.length === 0 ? "No unassigned leads available." : "No matching leads."}</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100 sticky top-0" style={{ background: "#F8FAFF" }}>
                <tr>
                  {["","Lead","Grade","Phone","Stage","Source"].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(l => {
                  const isSel = selected === l.id;
                  return (
                    <tr key={l.id} onClick={() => setSelected(isSel ? null : l.id)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${isSel ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                      <td className="px-3 py-2.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSel ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
                          {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{l.name}</td>
                      <td className="px-3 py-2.5 text-gray-500">{l.grade ? `G${l.grade}` : "–"}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-500">{l.phone ?? "–"}</td>
                      <td className="px-3 py-2.5"><StageBadge stage={l.leadStage} /></td>
                      <td className="px-3 py-2.5 text-gray-400">{l.leadSource ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3">
          <span className="text-[10px] text-gray-400">{shown.length} unassigned lead{shown.length !== 1 ? "s" : ""}{selected ? " · 1 selected" : ""}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
            <button onClick={doAssign} disabled={!selected || saving}
              className="px-5 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40" style={{ background: NAVY }}>
              {saving ? "Assigning…" : `Assign to ${mentor.name.split(" ")[0]}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sales Mentors CRM Module ──────────────────────────────────────────────────

interface SalesMentor {
  id: number; name: string; email: string | null; phone: string | null;
  isActive: boolean; lastLoginDate: string | null;
  assignedLeads: number; demoScheduled: number; demoPaid: number;
  converted: number; dropped: number; active: number;
  followUpsPending: number; revenue: number; conversionRate: number;
  gradesManaged: number[];
}

interface GradeAssignment { grade: number; mentorId: number | null; mentorName: string | null; }

function fmtRevenue(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return v > 0 ? `₹${v}` : "–";
}

const RANK_COLORS = ["#D97706", "#6B7280", "#B45309"];

function MentorRowMenu({
  m, togglingId, onViewLeads, onAssignLead, onReassignLeads,
  onEdit, onToggle, onChangeGrades, onReport,
}: {
  m: SalesMentor; togglingId: number | null;
  onViewLeads: () => void; onAssignLead: () => void; onReassignLeads: () => void;
  onEdit: () => void; onToggle: () => void; onChangeGrades: () => void;
  onReport: (label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler() { setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right - 4 });
    }
    setOpen(o => !o);
  }

  function close() { setOpen(false); }

  return (
    <>
      <button ref={btnRef} onClick={toggle}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && createPortal(
        <div
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 9999 }}
          className="bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-52 text-xs"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Lead Management</div>
          <button onClick={() => { close(); onViewLeads(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-blue-50">
            <Eye className="w-3.5 h-3.5 text-blue-400" /> View Assigned Leads
          </button>
          <button onClick={() => { close(); onAssignLead(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-green-50">
            <Plus className="w-3.5 h-3.5 text-green-500" /> Assign Lead
          </button>
          <button onClick={() => { close(); onReassignLeads(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-orange-50">
            <ArrowRightLeft className="w-3.5 h-3.5 text-orange-400" /> Reassign Leads
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <div className="px-3 py-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Mentor Management</div>
          <button onClick={() => { close(); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50">
            <UserCog className="w-3.5 h-3.5 text-orange-400" /> Edit Mentor
          </button>
          <button onClick={() => { close(); onToggle(); }} disabled={togglingId === m.id}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {m.isActive ? <Ban className="w-3.5 h-3.5 text-red-400" /> : <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
            {togglingId === m.id ? "Updating…" : m.isActive ? "Disable Mentor" : "Enable Mentor"}
          </button>
          <button onClick={() => { close(); onChangeGrades(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50">
            <GitBranch className="w-3.5 h-3.5 text-purple-400" /> Change Grades
          </button>
          <div className="h-px bg-gray-100 my-1" />
          <div className="px-3 py-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">Reports</div>
          {([
            { l: "Performance Report", ic: BarChart3 },
            { l: "Payment Report",     ic: CreditCard },
            { l: "Follow-up Report",   ic: Clock },
          ] as { l: string; ic: React.ElementType }[]).map(it => (
            <button key={it.l} onClick={() => { close(); onReport(it.l); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-50">
              <it.ic className="w-3.5 h-3.5 text-green-500" /> {it.l}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function SalesMentorsView({ flash, setView }: { flash: (m: string, ok?: boolean) => void; setView: (v: IgniteView) => void }) {
  const [mentors, setMentors] = useState<SalesMentor[]>([]);
  const [grades, setGrades] = useState<GradeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeTab, setGradeTab] = useState<"all" | number>("all");
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PER = 10;

  const [showAdd, setShowAdd] = useState(false);
  const [editMentor, setEditMentor] = useState<SalesMentor | null>(null);
  const [changeGradesMentor, setChangeGradesMentor] = useState<SalesMentor | null>(null);
  const [showManageGrades, setShowManageGrades] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<SalesMentor | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [viewLeadsMentor, setViewLeadsMentor] = useState<SalesMentor | null>(null);
  const [assignLeadMentor, setAssignLeadMentor] = useState<SalesMentor | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/ignite/sales-mentors").then(r => r.json()),
      apiFetch("/admin/ignite/grade-assignments").then(r => r.json()),
    ]).then(([m, g]) => { setMentors(Array.isArray(m) ? m : []); setGrades(Array.isArray(g) ? g : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const totalLeads = mentors.reduce((s, m) => s + m.assignedLeads, 0);
  const totalConverted = mentors.reduce((s, m) => s + m.converted, 0);
  const overallRate = totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 100) : 0;
  const topPerformers = [...mentors].sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 3);

  const filtered = mentors.filter(m => {
    if (statusFilter === "active" && !m.isActive) return false;
    if (statusFilter === "inactive" && m.isActive) return false;
    if (gradeTab !== "all" && !m.gradesManaged.includes(gradeTab as number)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !(m.email ?? "").toLowerCase().includes(q) && !(m.phone ?? "").includes(q)) return false;
    }
    return true;
  });
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  const handleToggleActive = async (m: SalesMentor) => {
    setTogglingId(m.id);
    try {
      const r = await apiFetch(`/admin/mentors/${m.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !m.isActive }) });
      if (r.ok) { flash(m.isActive ? "Mentor disabled" : "Mentor enabled", true); load(); }
      else flash("Failed to update mentor", false);
    } finally { setTogglingId(null); setConfirmToggle(null); }
  };

  const exportReport = () => {
    const csv = makeCSV(
      ["Rank","Mentor","Email","Phone","Grade","Leads","Converted","Conv %","Status"],
      filtered.map((m, i) => [i+1, m.name, m.email, m.phone, m.gradesManaged[0] ? `G${m.gradesManaged[0]}` : "–", m.assignedLeads, m.converted, `${m.conversionRate}%`, m.isActive ? "Active" : "Inactive"])
    );
    downloadCSVFile(csv, `sales_mentors_${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <div className="space-y-4" onClick={() => actionMenu !== null && setActionMenu(null)}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-black" style={{ color: NAVY }}>Sales Mentors</h1>
          <p className="text-xs text-gray-500">Manage sales mentors, grade assignments and conversion performance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all" style={{ background: NAVY }}>
            <Plus className="w-3.5 h-3.5" /> Add Mentor
          </button>
          <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Shuffle className="w-3.5 h-3.5 text-blue-500" /> Auto Balance
          </button>
          <button onClick={() => setView("grade-teams")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <GitBranch className="w-3.5 h-3.5 text-purple-500" /> Grade Teams
          </button>
          <button onClick={exportReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5 text-gray-500" /> Export CSV
          </button>
          <button onClick={load} className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 xl:grid-cols-5 gap-2">
        {([
          { label: "Total Mentors",  value: mentors.length,                         icon: Users,       color: NAVY,     bg: "#EEF2FF" },
          { label: "Active",         value: mentors.filter(m => m.isActive).length, icon: UserCheck,   color: GREEN,    bg: "#DCFCE7" },
          { label: "Leads Assigned", value: totalLeads,                             icon: Phone,       color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Converted",      value: totalConverted,                         icon: CheckCircle, color: GREEN,    bg: "#DCFCE7" },
          { label: "Conv %",         value: `${overallRate}%`,                      icon: BarChart3,   color: "#0891B2", bg: "#ECFEFF" },
        ] as { label: string; value: string | number; icon: React.ElementType; color: string; bg: string }[]).map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.bg }}>
              <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
            </div>
            <div className="text-sm font-black leading-none" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] text-gray-500 font-medium leading-tight">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-4 items-start">
        {/* Left: filters + table */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search + status filter */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-36">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email or phone…"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white" />
            </div>
            <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden text-[11px] font-semibold">
              {([["all","All"],["active","Active"],["inactive","Disabled"]] as [string,string][]).map(([val,lbl]) => (
                <button key={val} onClick={() => { setStatusFilter(val); setPage(1); }}
                  className={`px-3 py-1.5 transition-colors ${statusFilter === val ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                  style={statusFilter === val ? { background: val === "inactive" ? "#EF4444" : NAVY } : {}}>
                  {lbl}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-gray-400 ml-auto">{filtered.length} mentors</span>
          </div>

          {/* Grade tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {(["all" as const, 1,2,3,4,5,6,7,8,9,10]).map(g => {
              const isActive = gradeTab === g;
              const cnt = g === "all" ? mentors.length : mentors.filter(m => m.gradesManaged.includes(g)).length;
              return (
                <button key={g} onClick={() => { setGradeTab(g); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${isActive ? "text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"}`}
                  style={isActive ? { background: NAVY } : {}}>
                  {g === "all" ? `All (${mentors.length})` : `G${g}${cnt > 0 ? ` · ${cnt}` : ""}`}
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div>
              <table className="w-full text-xs">
                <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <tr>
                    {["Mentor","Email / Phone","Gr.","Leads","Conv.","Conv %","Status",""].map((h, i) => (
                      <th key={i} className="px-2 py-2 text-left text-[10px] font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="text-center py-10">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto text-gray-300" />
                    </td></tr>
                  ) : paged.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-xs">No sales mentors found.</td></tr>
                  ) : paged.map(m => {
                    const initials = m.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0"
                              style={{ background: m.isActive ? NAVY : "#9CA3AF" }}>{initials}</div>
                            <span className="font-semibold text-gray-800 text-xs leading-none">{m.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 max-w-[150px]">
                          <div className="text-[10px] text-gray-500 truncate">{m.email ?? "–"}</div>
                          <div className="text-[9px] font-mono text-gray-400">{m.phone ?? "–"}</div>
                        </td>
                        <td className="px-2 py-2">
                          {(() => { const g = m.gradesManaged[0]; return g
                            ? <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: "#EEF2FF", color: NAVY }}>G{g}</span>
                            : <span className="text-gray-300">–</span>; })()}
                        </td>
                        <td className="px-2 py-2 font-semibold text-gray-700 text-center">{m.assignedLeads || "–"}</td>
                        <td className="px-2 py-2 font-semibold text-center" style={{ color: GREEN }}>{m.converted || "–"}</td>
                        <td className="px-2 py-2">
                          <span className="font-black text-[11px]" style={{ color: m.conversionRate >= 15 ? GREEN : m.conversionRate >= 8 ? "#D97706" : "#EF4444" }}>
                            {m.conversionRate}%
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {m.isActive ? "Active" : "Off"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <MentorRowMenu
                            m={m}
                            togglingId={togglingId}
                            onViewLeads={() => setViewLeadsMentor(m)}
                            onAssignLead={() => setAssignLeadMentor(m)}
                            onReassignLeads={() => setViewLeadsMentor(m)}
                            onEdit={() => setEditMentor(m)}
                            onToggle={() => setConfirmToggle(m)}
                            onChangeGrades={() => setChangeGradesMentor(m)}
                            onReport={(label) => flash(`${label} — coming soon`, true)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/40">
                <span className="text-[10px] text-gray-400">Showing {(page-1)*PER+1}–{Math.min(page*PER, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-1">
                  <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 disabled:opacity-40 text-xs">‹</button>
                  {Array.from({length: Math.min(totalPages, 5)}, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} className="w-7 h-7 rounded-lg text-xs font-bold"
                      style={page===p ? { background: NAVY, color: "white" } : { color: "#6B7280" }}>{p}</button>
                  ))}
                  <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-2 py-1 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 disabled:opacity-40 text-xs">›</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-60 shrink-0 space-y-3">
          {/* Lead Funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-black mb-3" style={{ color: NAVY }}>Lead Funnel</h3>
            {([
              { label: "Leads Assigned", value: totalLeads,     color: NAVY,  pct: 100 },
              { label: "Converted",      value: totalConverted, color: GREEN, pct: totalLeads > 0 ? Math.round(totalConverted/totalLeads*100) : 0 },
            ] as { label: string; value: number; color: string; pct: number }[]).map(f => (
              <div key={f.label} className="mb-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-500">{f.label}</span>
                  <span className="text-[11px] font-black" style={{ color: f.color }}>{f.value}</span>
                </div>
                <div className="h-1 rounded-full bg-gray-100">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.pct}%`, background: f.color }} />
                </div>
              </div>
            ))}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400">Overall Conv.</span>
              <span className="text-sm font-black" style={{ color: overallRate >= 15 ? GREEN : "#D97706" }}>{overallRate}%</span>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black" style={{ color: NAVY }}>Top Performers</h3>
              <span className="text-[9px] text-gray-400 font-semibold">By Conv %</span>
            </div>
            {topPerformers.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-3">No data yet</p>
            ) : topPerformers.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 mb-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                  style={{ background: `${RANK_COLORS[i]}20`, color: RANK_COLORS[i] }}>{i+1}</div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0" style={{ background: NAVY }}>
                  {m.name?.[0] ?? "?"}
                </div>
                <span className="flex-1 text-[10px] font-semibold truncate" style={{ color: NAVY }}>{m.name}</span>
                <span className="text-[10px] font-black" style={{ color: m.conversionRate >= 15 ? GREEN : "#D97706" }}>{m.conversionRate}%</span>
              </div>
            ))}
          </div>

          {/* Grade Coverage */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-black mb-3" style={{ color: NAVY }}>Grade Coverage</h3>
            <div className="grid grid-cols-5 gap-1">
              {grades.map(ga => {
                const mentor = mentors.find(m => m.id === ga.mentorId);
                return (
                  <div key={ga.grade} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg"
                    style={{ background: ga.mentorId ? "#EEF2FF" : "#F9FAFB" }}>
                    <span className="text-[9px] font-black" style={{ color: NAVY }}>G{ga.grade}</span>
                    <span className="text-[8px] text-gray-500 truncate w-full text-center">{mentor?.name?.split(" ")[0] ?? "–"}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setView("grade-teams")} className="mt-3 w-full py-1.5 rounded-lg border border-dashed border-purple-300 text-[10px] text-purple-600 hover:bg-purple-50 font-semibold">
              ✏️ Manage Grade Teams
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-black mb-3" style={{ color: NAVY }}>Quick Actions</h3>
            <div className="space-y-2">
              {([
                { l: "Add Sales Mentor",    ic: Plus,     action: () => setShowAdd(true),          color: NAVY,     bg: "#EEF2FF" },
                { l: "Auto Balance Grades", ic: Shuffle,  action: () => setShowBulkModal(true),    color: "#7C3AED", bg: "#F5F3FF" },
                { l: "Grade Teams",          ic: GitBranch,action: () => setView("grade-teams"),   color: "#7C3AED", bg: "#F5F3FF" },
                { l: "Export Report",       ic: Download, action: exportReport,                    color: "#D97706", bg: "#FEF3C7" },
              ] as { l: string; ic: React.ElementType; action: () => void; color: string; bg: string }[]).map(qa => (
                <button key={qa.l} onClick={qa.action}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold hover:opacity-90 transition-all"
                  style={{ background: qa.bg, color: qa.color }}>
                  <qa.ic className="w-3.5 h-3.5" /> {qa.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Toggle */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-black text-base mb-2" style={{ color: NAVY }}>
              {confirmToggle.isActive ? "Disable" : "Enable"} Mentor
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              {confirmToggle.isActive
                ? `${confirmToggle.name} will be marked inactive and won't appear in assignment flows.`
                : `${confirmToggle.name} will be re-activated and can be assigned leads again.`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleToggleActive(confirmToggle)} disabled={togglingId === confirmToggle.id}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: confirmToggle.isActive ? "#EF4444" : GREEN }}>
                {togglingId === confirmToggle.id ? "Updating…" : confirmToggle.isActive ? "Yes, Disable" : "Yes, Enable"}
              </button>
              <button onClick={() => setConfirmToggle(null)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && <AddSalesMentorModal onSave={() => { load(); setShowAdd(false); }} onClose={() => setShowAdd(false)} flash={flash} />}
      {editMentor && <EditSalesMentorModal mentor={editMentor} onSave={() => { load(); setEditMentor(null); }} onClose={() => setEditMentor(null)} flash={flash} />}
      {changeGradesMentor && <ChangeGradesModal mentor={changeGradesMentor} allGrades={grades} allMentors={mentors} onSave={() => { load(); setChangeGradesMentor(null); }} onClose={() => setChangeGradesMentor(null)} flash={flash} />}
      {showManageGrades && <ManageAllGradesModal grades={grades} mentors={mentors} onSave={() => { load(); setShowManageGrades(false); }} onClose={() => setShowManageGrades(false)} flash={flash} />}
      {showBulkModal && <AutoBalanceModal mentors={mentors} flash={flash} onClose={() => { load(); setShowBulkModal(false); }} />}
      {viewLeadsMentor && <MentorLeadsModal mentor={viewLeadsMentor} allMentors={mentors} onClose={() => setViewLeadsMentor(null)} flash={flash} />}
      {assignLeadMentor && <AssignLeadModal mentor={assignLeadMentor} onSave={() => { load(); setAssignLeadMentor(null); }} onClose={() => setAssignLeadMentor(null)} flash={flash} />}
    </div>
  );
}


// ── Payments View ────────────────────────────────────────────────────────────

function PaymentsView({ flash, role = "admin" }: { flash: (m: string, ok?: boolean) => void; role?: string }) {
  const canSeeAll = igniteCanSeeAllTime(role);
  const [dateRange, setDateRange] = useState<DateRange>("7");
  const [customDate, setCustomDate] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusF, setStatusF] = useState("All Status");
  const [batchF, setBatchF] = useState("All Batches");
  const [page, setPage] = useState(1);
  const PER = 15;

  useEffect(() => {
    apiFetch("/admin/ignite/demo-students")
      .then((r) => r.json())
      .then(setStudents)
      .catch(() => flash("Failed to load payment data", false))
      .finally(() => setLoading(false));
  }, []);

  const dateCutoff = dateRangeCutoff(dateRange, customDate);
  const dateStudents = filterByDateField(students, "enrolledAt", dateCutoff);

  const paymentStudents = dateStudents.filter((s) =>
    ["Interested", "Payment Sent", "Converted"].includes(s.leadStage ?? "")
  );
  const batches = [...new Set(paymentStudents.map((s) => s.batchTitle))];

  const filtered = paymentStudents.filter((s) => {
    if (statusF !== "All Status" && s.leadStage !== statusF) return false;
    if (batchF !== "All Batches" && s.batchTitle !== batchF) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const cnt = (stage: string) => paymentStudents.filter((s) => s.leadStage === stage).length;

  const exportCSV = () => {
    const rangeLabel = dateRange === "all" ? "all" : dateRange === "7" ? "7d" : dateRange === "30" ? "30d" : dateRange === "this-month" ? "thismonth" : customDate || "custom";
    const csv = makeCSV(
      ["Name","Phone","Email","Grade","Batch","Mentor","Lead Stage","Enrolled At"],
      filtered.map(s => [s.name, s.phone, s.email, s.grade, s.batchTitle, s.assignedMentorName, s.leadStage, new Date(s.enrolledAt).toLocaleDateString("en-IN")])
    );
    downloadCSVFile(csv, `braintam_payments_${rangeLabel}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Payments</h1>
          <p className="text-xs text-gray-500">Track demo fee collection and payment confirmations</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
        <DateRangeChips value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} allowAll={canSeeAll} customDate={customDate} onCustomDate={v => { setCustomDate(v); setPage(1); }} label="Period:" />
        {!canSeeAll && <span className="text-[10px] text-orange-500 font-semibold ml-auto">⚠ Export limited to 7 days</span>}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Interested", sub: "Ready for collection", count: cnt("Interested"), icon: Star, color: ORANGE, bg: "#FFF7ED" },
          { label: "Payment Sent", sub: "Awaiting confirmation", count: cnt("Payment Sent"), icon: CreditCard, color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Converted", sub: "Payment confirmed", count: cnt("Converted"), icon: CheckCircle, color: GREEN, bg: "#D1FAE5" },
          { label: "Total Pipeline", sub: "In payment funnel", count: paymentStudents.length, icon: TrendingUp, color: NAVY, bg: "#EEF2FF" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <div>
              <div className="font-black text-base leading-none" style={{ color: c.color }}>{c.count}</div>
              <div className="text-[11px] font-semibold text-gray-600 mt-0.5 leading-tight">{c.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
          <option>All Status</option>
          {["Interested", "Payment Sent", "Converted"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={batchF} onChange={(e) => { setBatchF(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none">
          <option>All Batches</option>
          {batches.map((b) => <option key={b}>{b}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <tr>
                {["Student", "Mobile", "Grade", "Batch", "Sales Mentor", "Lead Stage", "Interest", "Last Contact", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading…
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No records found</td></tr>
              ) : paged.map((s) => (
                <tr key={s.enrollmentId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{s.name?.[0] ?? "?"}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{s.name}</div>
                        <div className="text-gray-400 text-[10px]">{s.email ?? "–"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">{s.phone ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.grade ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs max-w-32 truncate">{s.batchTitle}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{s.assignedMentorName ?? "–"}</td>
                  <td className="px-4 py-3"><StageBadge stage={s.leadStage} /></td>
                  <td className="px-4 py-3"><InterestBadge level={s.interestLevel} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(s.lastCallAt ?? s.nextFollowUpAt)}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs font-semibold px-3 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "#EEF2FF", color: NAVY }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sidebar Navigation ────────────────────────────────────────────────────────

interface NavItem {
  id: IgniteView;
  label: string;
  icon: React.ElementType;
  children?: { id: IgniteView; label: string }[];
}

// ── Student Outreach View ─────────────────────────────────────────────────────

interface OutreachLead {
  id: number; name: string | null; grade: number | null;
  phone: string | null; parentPhone: string | null;
  leadStage: string | null; interestLevel: string | null;
  callStatus: string | null; lastCallAt: string | null;
  nextFollowUpAt: string | null; assignedMentorName: string | null;
  city: string | null; school: string | null; createdAt: string | null;
}

const INTEREST_COLOR: Record<string, string> = {
  "Very High": "#0B2B6B", "High": "#059669", "Moderate": "#D97706", "Low": "#9CA3AF",
};

function StudentOutreachView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [leads, setLeads]         = useState<OutreachLead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [stageFilter, setStage]   = useState("all");
  const [gradeFilter, setGrade]   = useState("all");
  const [sortBy, setSort]         = useState<"interest" | "followup" | "stage">("interest");
  const [durationDays, setDurationDays] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/ignite/leads?limit=500");
      if (!r.ok) return;
      const data = await r.json() as { leads?: OutreachLead[]; data?: OutreachLead[] };
      const list: OutreachLead[] = data.leads ?? data.data ?? (Array.isArray(data) ? data as OutreachLead[] : []);
      // Filter for leads that need outreach: not yet converted/dropped
      setLeads(list.filter(l =>
        !["Converted", "converted", "dropped", "Dropped"].includes(l.leadStage ?? "")
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const durationFiltered = durationDays === "0" ? leads : leads.filter(l => {
    if (!l.createdAt) return true;
    const since = new Date(Date.now() - Number(durationDays) * 86400000);
    return new Date(l.createdAt) >= since;
  });

  const filtered = durationFiltered
    .filter(l => {
      if (stageFilter !== "all" && l.leadStage !== stageFilter) return false;
      if (gradeFilter !== "all" && String(l.grade) !== gradeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (l.name ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").includes(q) ||
          (l.parentPhone ?? "").includes(q) ||
          (l.assignedMentorName ?? "").toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "interest") {
        const order: Record<string, number> = { "Very High": 0, "High": 1, "Moderate": 2, "Low": 3 };
        return (order[a.interestLevel ?? ""] ?? 4) - (order[b.interestLevel ?? ""] ?? 4);
      }
      if (sortBy === "followup") {
        return new Date(a.nextFollowUpAt ?? "9999").getTime() - new Date(b.nextFollowUpAt ?? "9999").getTime();
      }
      return (a.leadStage ?? "").localeCompare(b.leadStage ?? "");
    });

  const stages = [...new Set(leads.map(l => l.leadStage).filter(Boolean))] as string[];

  const copyPhone = (phone: string | null) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone).then(() => flash(`Copied: ${phone}`, true));
  };

  const overdueCnt = durationFiltered.filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < new Date()).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-base font-black" style={{ color: NAVY }}>Student Outreach</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {filtered.length} of {durationFiltered.length} shown
            {overdueCnt > 0 && <span className="ml-2 text-red-500 font-semibold">· {overdueCnt} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={durationDays} onChange={e => setDurationDays(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-orange-300"
            style={{ color: NAVY }}>
            {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:border-gray-300">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Very High Interest", count: durationFiltered.filter(l => l.interestLevel === "Very High").length, color: NAVY, bg: "#EEF2FF" },
          { label: "High Interest",      count: durationFiltered.filter(l => l.interestLevel === "High").length,      color: GREEN, bg: "#D1FAE5" },
          { label: "Overdue Follow-ups", count: overdueCnt,                                                            color: "#EF4444", bg: "#FEE2E2" },
          { label: "Unassigned Leads",   count: durationFiltered.filter(l => !l.assignedMentorName).length,            color: ORANGE, bg: "#FFF7ED" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.bg }}>
              <Users className="w-3.5 h-3.5" style={{ color: c.color }} />
            </div>
            <div>
              <div className="text-base font-black leading-none" style={{ color: c.color }}>{c.count}</div>
              <div className="text-[11px] text-gray-500 font-medium mt-0.5 leading-tight">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input placeholder="Search name, phone, mentor…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl w-full focus:outline-none focus:border-orange-300" />
        </div>
        <select value={stageFilter} onChange={e => setStage(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none">
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={gradeFilter} onChange={e => setGrade(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none">
          <option value="all">All Grades</option>
          {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSort(e.target.value as typeof sortBy)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none">
          <option value="interest">Sort: Interest</option>
          <option value="followup">Sort: Follow-up Date</option>
          <option value="stage">Sort: Stage</option>
        </select>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <UserCheck className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No leads match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  {["Student", "Grade", "Phone / Parent", "Interest", "Lead Stage", "Call Status", "Next Follow-up", "Mentor"].map(h => (
                    <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((l, idx) => {
                  const isOverdue = l.nextFollowUpAt && new Date(l.nextFollowUpAt) < new Date();
                  return (
                    <tr key={l.id}
                      className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
                      style={{ background: idx % 2 === 0 ? "white" : "#FAFAFA" }}>
                      <td className="px-4 py-3">
                        <p className="font-black text-xs" style={{ color: NAVY }}>{l.name ?? "—"}</p>
                        {l.school && <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{l.school}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{l.grade ? `G${l.grade}` : "—"}</td>
                      <td className="px-4 py-3">
                        {l.phone && (
                          <button onClick={() => copyPhone(l.phone)} className="flex items-center gap-1 font-mono text-blue-600 hover:underline">
                            <Phone className="w-3 h-3" />{l.phone}
                          </button>
                        )}
                        {l.parentPhone && <p className="text-[10px] text-gray-400 mt-0.5">{l.parentPhone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {l.interestLevel
                          ? <span className="font-semibold text-xs" style={{ color: INTEREST_COLOR[l.interestLevel] ?? "#9CA3AF" }}>{l.interestLevel}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                          {l.leadStage ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{l.callStatus ?? "—"}</td>
                      <td className="px-4 py-3">
                        {l.nextFollowUpAt
                          ? <span className={`font-semibold ${isOverdue ? "text-red-500" : "text-gray-600"}`}>
                              {new Date(l.nextFollowUpAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                              {isOverdue && " ⚠️"}
                            </span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{l.assignedMentorName ?? <span className="text-red-400">Unassigned</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="text-center py-3 text-xs text-gray-400 border-t border-gray-50">
                Showing 100 of {filtered.length} leads
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Batch Pipeline Health View ────────────────────────────────────────────────

interface GradeHealth {
  grade: number;
  activeCount: number;
  upcomingCount: number;
  healthy: boolean;
  issues: string[];
}

interface PipelineBatchRow {
  id: number;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  batchCode: string | null;
  teacherName?: string | null;
  joinLink?: string | null;
  totalDays?: number | null;
  weekNumber?: number | null;
  maxStudents?: number | null;
}

interface GradePipelineDetail {
  grade: number;
  activeCount: number;
  upcomingCount: number;
  healthy: boolean;
  issues: string[];
  activeBatch: PipelineBatchRow | null;
  upcomingBatches: PipelineBatchRow[];
  undatedCount: number;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function BatchCard({ batch, label, accentColor }: { batch: PipelineBatchRow; label: string; accentColor: string }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: accentColor + "40", background: accentColor + "08" }}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: accentColor }}>{label}</span>
        {batch.batchCode && (
          <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{batch.batchCode}</span>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-snug">{batch.title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
        <div><span className="text-gray-400">Start</span> {fmtDate(batch.startDate)}</div>
        <div><span className="text-gray-400">End</span> {fmtDate(batch.endDate)}</div>
        {batch.totalDays != null && <div><span className="text-gray-400">Days</span> {batch.totalDays}</div>}
        {batch.weekNumber != null && <div><span className="text-gray-400">Week</span> {batch.weekNumber}</div>}
        {batch.maxStudents != null && <div><span className="text-gray-400">Capacity</span> {batch.maxStudents}</div>}
      </div>
      {batch.joinLink && (
        <a href={batch.joinLink} target="_blank" rel="noopener noreferrer"
          className="text-xs font-semibold underline truncate" style={{ color: accentColor }}>
          Join link ↗
        </a>
      )}
    </div>
  );
}

function EmptySlot({ label }: { label: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-1 min-h-[120px]">
      <AlertTriangle className="w-5 h-5 text-gray-300" />
      <span className="text-xs text-gray-400 font-medium">{label} — missing</span>
      <span className="text-[10px] text-gray-300">Repair will fill this slot</span>
    </div>
  );
}

function BatchPipelineHealthView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [selectedGrade, setSelectedGrade]       = useState(1);
  const [allHealth, setAllHealth]               = useState<GradeHealth[]>([]);
  const [healthLoading, setHealthLoading]       = useState(true);
  const [detail, setDetail]                     = useState<GradePipelineDetail | null>(null);
  const [detailLoading, setDetailLoading]       = useState(false);
  const [repairing, setRepairing]               = useState(false);
  const [repairingAll, setRepairingAll]         = useState(false);
  const [lastRefresh, setLastRefresh]           = useState<Date | null>(null);

  const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const loadAllHealth = async () => {
    setHealthLoading(true);
    try {
      const r = await apiFetch("/admin/ignite/batch-health");
      const d = await r.json() as GradeHealth[];
      setAllHealth(d);
      setLastRefresh(new Date());
    } catch {
      flash("Failed to load pipeline health", false);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadGradeDetail = async (grade: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await apiFetch(`/admin/ignite/batch-pipeline/${grade}`);
      const d = await r.json() as GradePipelineDetail;
      setDetail(d);
    } catch {
      flash(`Failed to load Grade ${grade} details`, false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { loadAllHealth(); }, []);

  useEffect(() => { loadGradeDetail(selectedGrade); }, [selectedGrade]);

  const handleSelectGrade = (g: number) => {
    if (g !== selectedGrade) setSelectedGrade(g);
  };

  const repairCurrentGrade = async () => {
    setRepairing(true);
    try {
      const r = await apiFetch(`/admin/ignite/ensure-pipeline/${selectedGrade}`, { method: "POST" });
      const d = await r.json() as GradeHealth;
      setAllHealth(prev => prev.map(h => h.grade === selectedGrade
        ? { grade: d.grade, activeCount: d.activeCount, upcomingCount: d.upcomingCount, healthy: d.healthy, issues: d.issues }
        : h
      ));
      await loadGradeDetail(selectedGrade);
      if (d.healthy) flash(`Grade ${selectedGrade} pipeline healthy ✓`, true);
      else flash(`Grade ${selectedGrade} repaired — some issues remain`, false);
    } catch {
      flash(`Grade ${selectedGrade} repair failed`, false);
    } finally {
      setRepairing(false);
    }
  };

  const repairAllUnhealthy = async () => {
    const unhealthy = allHealth.filter(h => !h.healthy).map(h => h.grade);
    if (unhealthy.length === 0) { flash("All grades are already healthy ✓", true); return; }
    setRepairingAll(true);
    try {
      await Promise.all(unhealthy.map(async g => {
        const r = await apiFetch(`/admin/ignite/ensure-pipeline/${g}`, { method: "POST" });
        const d = await r.json() as GradeHealth;
        setAllHealth(prev => prev.map(h => h.grade === g
          ? { grade: d.grade, activeCount: d.activeCount, upcomingCount: d.upcomingCount, healthy: d.healthy, issues: d.issues }
          : h
        ));
      }));
      await loadGradeDetail(selectedGrade);
      flash(`Repaired ${unhealthy.length} grade(s)`, true);
    } catch {
      flash("Some repairs failed", false);
    } finally {
      setRepairingAll(false);
    }
  };

  const unhealthyGrades = allHealth.filter(h => !h.healthy);
  const healthyCount    = allHealth.filter(h => h.healthy).length;
  const gradeHealthMap  = Object.fromEntries(allHealth.map(h => [h.grade, h]));
  const currentHealth   = gradeHealthMap[selectedGrade];

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>Batch Pipeline Health</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Target: <span className="font-semibold">1 Active + 2 Upcoming</span> dated batches per grade · Null-dated batches excluded
            {lastRefresh && (
              <span className="ml-2 text-gray-400">
                · Scanned {lastRefresh.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { loadAllHealth(); loadGradeDetail(selectedGrade); }}
            disabled={healthLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {unhealthyGrades.length > 0 && (
            <button
              onClick={repairAllUnhealthy}
              disabled={repairingAll || healthLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
              style={{ background: repairingAll ? "#9CA3AF" : ORANGE }}>
              <Zap className="w-3.5 h-3.5" />
              {repairingAll ? "Repairing…" : `Repair All (${unhealthyGrades.length})`}
            </button>
          )}
        </div>
      </div>

      {/* ── All-grades summary bar ── */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 flex flex-wrap items-center gap-3">
        {healthLoading ? (
          <div className="flex gap-2">
            {GRADES.map(g => <div key={g} className="w-14 h-6 rounded-full bg-gray-200 animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: NAVY }} />
              {healthyCount}/10 healthy
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map(g => {
                const h = gradeHealthMap[g];
                const isUnhealthy = h && !h.healthy;
                return (
                  <button
                    key={g}
                    onClick={() => handleSelectGrade(g)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition-colors"
                    style={isUnhealthy
                      ? { background: "#FEF2F2", borderColor: "#FECACA", color: "#DC2626" }
                      : { background: "#F0FDF4", borderColor: "#BBF7D0", color: "#15803D" }}>
                    {isUnhealthy && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
                    G{g}
                    {isUnhealthy && " ⚠"}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Grade tab strip ── */}
      <div>
        <div className="flex overflow-x-auto gap-0 border-b border-gray-200 pb-0 no-scrollbar">
          {GRADES.map(g => {
            const h = gradeHealthMap[g];
            const isUnhealthy = h && !h.healthy;
            const isActive = g === selectedGrade;
            return (
              <button
                key={g}
                onClick={() => handleSelectGrade(g)}
                className="relative flex items-center gap-1 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors shrink-0"
                style={isActive
                  ? { color: NAVY, borderBottom: `2px solid ${NAVY}`, marginBottom: -1 }
                  : { color: "#6B7280", borderBottom: "2px solid transparent", marginBottom: -1 }}>
                {isUnhealthy && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                )}
                Grade {g}
                {isUnhealthy && (
                  <span className="ml-0.5 text-[10px] text-red-500">⚠</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grade detail panel ── */}
      {detailLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 animate-pulse bg-gray-50 h-40" />
          ))}
        </div>
      ) : detail ? (
        <div className="space-y-4">
          {/* Health status strip for this grade */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {detail.healthy
                ? <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                    <CheckCircle className="w-4 h-4" /> Grade {detail.grade} — Healthy
                  </span>
                : <span className="flex items-center gap-1.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                    <AlertTriangle className="w-4 h-4" /> Grade {detail.grade} — Needs Repair
                  </span>
              }
              <span className="text-xs text-gray-400">
                Active {detail.activeCount}/1 · Upcoming {detail.upcomingCount}/2
                {detail.undatedCount > 0 && ` · ${detail.undatedCount} undated (excluded)`}
              </span>
            </div>
            <button
              onClick={repairCurrentGrade}
              disabled={repairing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors"
              style={{ background: repairing ? "#9CA3AF" : ORANGE }}>
              <Zap className="w-3.5 h-3.5" />
              {repairing ? "Repairing…" : "Repair Pipeline"}
            </button>
          </div>

          {/* Issues list */}
          {detail.issues.length > 0 && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 flex flex-wrap gap-2">
              {detail.issues.map((issue, i) => (
                <span key={i} className="text-xs text-red-700 font-medium">· {issue}</span>
              ))}
            </div>
          )}

          {/* Batch cards: 1 Active + 2 Upcoming */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Active slot */}
            {detail.activeBatch
              ? <BatchCard batch={detail.activeBatch} label="ACTIVE" accentColor="#16A34A" />
              : <EmptySlot label="Active batch" />
            }
            {/* Upcoming slots */}
            {[0, 1].map(idx => {
              const b = detail.upcomingBatches[idx];
              return b
                ? <BatchCard key={b.id} batch={b} label={`UPCOMING ${idx + 1}`} accentColor={NAVY} />
                : <EmptySlot key={idx} label={`Upcoming ${idx + 1}`} />;
            })}
          </div>
        </div>
      ) : null}

      {/* ── Info note ── */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        <strong>How it works:</strong> The pipeline auto-repairs on every payment and every Sunday midnight IST cron. Null-dated batches (legacy placeholders) are excluded from all counts. Repair runs <code className="bg-blue-100 px-1 rounded">ensureThreeWeekPipeline</code> — auto-promotes upcoming→active when activeCount=0 and startDate≤today, then generates new Monday slots.
      </div>
    </div>
  );
}

// ── Ignite Mentors View ───────────────────────────────────────────────────────

type IgniteMentor = {
  id: number; name: string; email: string; phone: string | null; isActive: boolean | null;
  totalAssigned: number; convertedCount: number; conversionRate: number;
  students: {
    id: number; studentId: number | null; name: string | null;
    grade: number | null; phone: string | null;
    assignmentStatus: string | null; assignedBatchId: number | null;
    attendancePct: number | null; homeworkPct: number | null;
  }[];
};

function IgniteMentorsView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [mentors, setMentors] = useState<IgniteMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState<{ mentorId: number; mentorName: string } | null>(null);
  const [unassigned, setUnassigned] = useState<{ id: number; name: string | null; grade: number | null; phone: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reassignFrom, setReassignFrom] = useState<{ studentIgniteId: number; studentName: string } | null>(null);
  const [reassignMentorId, setReassignMentorId] = useState<number>(0);
  const [savingMove, setSavingMove] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/admin/ignite/ignite-mentors`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("braintam_staff_token") ?? ""}` },
    }).then(r => r.json()).then(setMentors).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAssign = (mentorId: number, mentorName: string) => {
    setAssignModal({ mentorId, mentorName });
    setSelected(new Set());
    fetch(`${BASE}/admin/ignite/ignite-mentors/unassigned-students`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("braintam_staff_token") ?? ""}` },
    }).then(r => r.json()).then(setUnassigned).catch(() => {});
  };

  const doAssign = async () => {
    if (!assignModal || selected.size === 0) return;
    const r = await fetch(`${BASE}/admin/ignite/ignite-mentors/${assignModal.mentorId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("braintam_staff_token") ?? ""}`,
      },
      body: JSON.stringify({ studentIgniteIds: [...selected] }),
    });
    if (r.ok) { flash(`${selected.size} student(s) assigned to ${assignModal.mentorName}`, true); setAssignModal(null); load(); }
    else flash("Assignment failed", false);
  };

  const doReassign = async () => {
    if (!reassignFrom || !reassignMentorId) return;
    const r = await fetch(`${BASE}/admin/ignite/ignite-mentors/${reassignMentorId}/assign`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("braintam_staff_token") ?? ""}`,
      },
      body: JSON.stringify({ studentIgniteIds: [reassignFrom.studentIgniteId] }),
    });
    if (r.ok) { flash(`${reassignFrom.studentName} reassigned`, true); setReassignFrom(null); load(); }
    else flash("Reassign failed", false);
  };

  const toggleActive = async (mentor: IgniteMentor) => {
    await fetch(`${BASE}/admin/ignite/ignite-mentors/${mentor.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("braintam_staff_token") ?? ""}`,
      },
      body: JSON.stringify({ isActive: !mentor.isActive }),
    });
    flash(`${mentor.name} ${mentor.isActive ? "disabled" : "enabled"}`, true);
    load();
  };

  const moveToMastery = async (studentIgniteId: number, studentName: string) => {
    setSavingMove(studentIgniteId);
    const r = await fetch(`${BASE}/admin/ignite/move-to-mastery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("braintam_staff_token") ?? ""}`,
      },
      body: JSON.stringify({ igniteStudentId: studentIgniteId }),
    });
    setSavingMove(null);
    if (r.ok) { flash(`${studentName} moved to Mastery`, true); load(); }
    else { const e = await r.json().catch(() => ({})); flash(e.error ?? "Move failed", false); }
  };

  const statusColor: Record<string, string> = {
    unassigned: "#6B7280", assigned: "#3B82F6", batch_assigned: "#8B5CF6",
    demo_started: "#F59E0B", demo_completed: "#059669", converted: "#15803D", dropped: "#EF4444",
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading mentors…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>Ignite Mentors</h2>
          <p className="text-xs text-gray-500 mt-0.5">Academic mentors managing demo students through the Ignite programme</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ color: NAVY, borderColor: NAVY }}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Mentors",    value: mentors.length },
          { label: "Active",           value: mentors.filter(m => m.isActive !== false).length },
          { label: "Students Handled", value: mentors.reduce((a, m) => a + m.totalAssigned, 0) },
          { label: "Converted",        value: mentors.reduce((a, m) => a + m.convertedCount, 0) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl font-bold" style={{ color: NAVY }}>{k.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-medium uppercase tracking-wide">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Mentor cards */}
      {mentors.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 text-sm shadow-sm">
          No academic mentors found. Add users with role <code>academic_mentor</code> to see them here.
        </div>
      ) : (
        <div className="space-y-3">
          {mentors.map(m => {
            const expanded = expandedId === m.id;
            const inactive = m.isActive === false;
            return (
              <div key={m.id} className={`bg-white rounded-xl shadow-sm border transition-all ${inactive ? "opacity-60 border-gray-200" : "border-gray-100"}`}>
                {/* Mentor header */}
                <div className="flex items-center gap-4 px-4 py-3 cursor-pointer select-none" onClick={() => setExpandedId(expanded ? null : m.id)}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: NAVY }}>
                    {(m.name ?? "M")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: NAVY }}>{m.name ?? "—"}</span>
                      {inactive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold">Disabled</span>}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-6 text-xs shrink-0">
                    <div className="text-center">
                      <div className="font-bold text-base" style={{ color: NAVY }}>{m.totalAssigned}</div>
                      <div className="text-gray-400">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base" style={{ color: GREEN }}>{m.convertedCount}</div>
                      <div className="text-gray-400">Converted</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base" style={{ color: ORANGE }}>{m.conversionRate}%</div>
                      <div className="text-gray-400">Rate</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); openAssign(m.id, m.name ?? ""); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white" style={{ background: NAVY }}>
                      + Assign
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleActive(m); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${inactive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {inactive ? "Enable" : "Disable"}
                    </button>
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {/* Student list */}
                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    {m.students.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">No students assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-7 text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-2 pb-1">
                          <span className="col-span-2">Student</span>
                          <span>Grade</span>
                          <span>Status</span>
                          <span>Attend%</span>
                          <span>HW%</span>
                          <span>Actions</span>
                        </div>
                        {m.students.map(s => (
                          <div key={s.id} className="grid grid-cols-7 items-center text-xs px-2 py-1.5 rounded-lg hover:bg-gray-50">
                            <span className="col-span-2 font-medium text-gray-800 truncate">{s.name ?? "—"}</span>
                            <span className="text-gray-500">Gr {s.grade ?? "?"}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white w-fit" style={{ background: statusColor[s.assignmentStatus ?? ""] ?? "#6B7280" }}>
                              {(s.assignmentStatus ?? "—").replace(/_/g, " ")}
                            </span>
                            <span className="text-gray-600">{s.attendancePct != null ? `${s.attendancePct}%` : "—"}</span>
                            <span className="text-gray-600">{s.homeworkPct != null ? `${s.homeworkPct}%` : "—"}</span>
                            <div className="flex gap-1.5">
                              {s.assignmentStatus !== "converted" && (
                                <button
                                  disabled={savingMove === s.id}
                                  onClick={() => moveToMastery(s.id, s.name ?? "Student")}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold text-white disabled:opacity-50"
                                  style={{ background: ORANGE }}>
                                  {savingMove === s.id ? "…" : "→ Mastery"}
                                </button>
                              )}
                              <button
                                onClick={() => setReassignFrom({ studentIgniteId: s.id, studentName: s.name ?? "Student" })}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                                Reassign
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Students Modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base" style={{ color: NAVY }}>Assign students to {assignModal.mentorName}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Select unassigned demo students below</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
              {unassigned.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">All demo students already have an assigned mentor.</p>
              ) : unassigned.map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={e => {
                    const n = new Set(selected);
                    e.target.checked ? n.add(u.id) : n.delete(u.id);
                    setSelected(n);
                  }} className="rounded" />
                  <span className="text-sm font-medium text-gray-800">{u.name ?? "—"}</span>
                  <span className="text-xs text-gray-400">Grade {u.grade ?? "?"}</span>
                  <span className="text-xs text-gray-400">{u.phone ?? ""}</span>
                </label>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={doAssign} disabled={selected.size === 0}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: NAVY }}>
                Assign {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Modal */}
      {reassignFrom && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base" style={{ color: NAVY }}>Reassign {reassignFrom.studentName}</h3>
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transfer to mentor</label>
              <select value={reassignMentorId} onChange={e => setReassignMentorId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value={0}>— Select mentor —</option>
                {mentors.filter(m => m.isActive !== false).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setReassignFrom(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={doReassign} disabled={!reassignMentorId}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40" style={{ background: NAVY }}>
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  {
    id: "overview", label: "Demo Management", icon: Zap,
    children: [
      { id: "overview", label: "Overview" },
      { id: "demo-batches", label: "Demo Batches" },
      { id: "demo-students", label: "Demo Students" },
      { id: "attendance", label: "Attendance" },
      { id: "homework", label: "Homework" },
      { id: "follow-ups", label: "Follow-ups" },
    ],
  },
  { id: "conversion", label: "Conversion Center", icon: TrendingUp },
  {
    id: "paid-students-unassigned", label: "Paid Students", icon: CreditCard,
    children: [
      { id: "paid-students-unassigned",    label: "Unassigned"    },
      { id: "paid-students-assigned",      label: "Assigned"      },
      { id: "paid-students-batch-assigned", label: "Batch Assigned" },
      { id: "paid-students-demo-started",  label: "Demo Started"  },
      { id: "paid-students-demo-completed", label: "Demo Completed" },
      { id: "paid-students-converted",     label: "Converted"     },
      { id: "paid-students-dropped",       label: "Dropped"       },
    ],
  },
  { id: "batch-health", label: "Batch Health", icon: ShieldCheck },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "grade-teams", label: "Grade Teams", icon: GitBranch },
  { id: "sales-mentors", label: "Mentors", icon: Award },
  { id: "student-outreach", label: "Student Outreach", icon: UserCheck },
  { id: "performance-rankings", label: "Performance Rankings", icon: BarChart2 },
  { id: "ignite-reports", label: "Reports", icon: BarChart3 },
];

function IgniteSidebar({
  view, setView,
}: {
  view: IgniteView;
  setView: (v: IgniteView) => void;
}) {
  const demoManagementViews: IgniteView[] = ["overview", "demo-batches", "demo-students", "attendance", "homework", "follow-ups"];
  const paidStudentsViews: IgniteView[] = ["paid-students-unassigned", "paid-students-assigned", "paid-students-batch-assigned", "paid-students-demo-started", "paid-students-demo-completed", "paid-students-converted", "paid-students-dropped"];
  const isDemoManagement = demoManagementViews.includes(view);
  const isPaidStudents = paidStudentsViews.includes(view);
  const [demoOpen, setDemoOpen] = useState(isDemoManagement);
  const [paidOpen, setPaidOpen] = useState(isPaidStudents);

  const isActive = (id: IgniteView) => view === id;

  const getGroupOpen = (id: IgniteView) => {
    if (id === "overview") return demoOpen;
    if (id === "paid-students-unassigned") return paidOpen;
    return false;
  };
  const toggleGroup = (id: IgniteView) => {
    if (id === "overview") setDemoOpen((v) => !v);
    else if (id === "paid-students-unassigned") setPaidOpen((v) => !v);
  };

  return (
    <div className="w-52 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto z-20" style={{ height: "calc(100vh - 56px)" }}>
      {/* MAIN MENU label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Main Menu</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {NAV_ITEMS.map((item, idx) => {
          if (item.children) {
            const isParentActive = item.children.some((c) => isActive(c.id));
            const open = getGroupOpen(item.id);
            return (
              <div key={`${item.id}-${idx}`}>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-gray-50"
                  style={isParentActive ? { color: NAVY } : { color: "#6B7280" }}>
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {open && (
                  <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l-2 pl-3" style={{ borderColor: "#E5E7EB" }}>
                    {item.children.map((child) => (
                      <button key={child.id} onClick={() => setView(child.id)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        style={isActive(child.id)
                          ? { background: NAVY, color: "#fff" }
                          : { color: "#6B7280" }}>
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <button key={`${item.id}-${idx}`} onClick={() => setView(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
              style={isActive(item.id)
                ? { background: "#EEF2FF", color: NAVY }
                : { color: "#6B7280" }}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

      </nav>
    </div>
  );
}

// ── Ignite Header ─────────────────────────────────────────────────────────────

function IgniteHeader({
  userName, userRole, view,
}: {
  userName: string;
  userRole: string;
  view: IgniteView;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportCurrentView() {
    type ExportTarget = { url: string; label: string; dataKey?: string };
    const exportMap: Partial<Record<IgniteView, ExportTarget>> = {
      leads:            { url: "/admin/ignite/leads?limit=10000",           label: "leads",         dataKey: "leads" },
      "demo-students":  { url: "/admin/ignite/demo-students",               label: "demo-students" },
      "demo-batches":   { url: "/admin/demo-batches",                       label: "demo-batches" },
      "sales-mentors":  { url: "/admin/ignite/sales-mentors",               label: "sales-mentors" },
      payments:         { url: "/admin/ignite/payments/history?limit=5000", label: "payments",      dataKey: "rows" },
      conversion:       { url: "/admin/ignite/leads?limit=10000",           label: "converted",     dataKey: "leads" },
    };
    const target = exportMap[view];
    if (!target) return;
    setExporting(true);
    try {
      const r = await apiFetch(target.url);
      if (!r.ok) return;
      const data = await r.json() as Record<string, unknown>;
      const rows: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (target.dataKey ? (data[target.dataKey] as Record<string, unknown>[]) : []) ?? [];
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [headers.join(","), ...rows.map(row => headers.map(h => escape(row[h])).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `braintam-${target.label}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const fmtHeader = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-30" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src={braintamLogo} alt="Braintam" className="h-7 w-auto" />
      </div>

      {/* Workspace selector */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setWorkspaceOpen(!workspaceOpen); setProfileOpen(false); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          style={{ minWidth: "160px" }}>
          <span className="text-base">🚀</span>
          <div className="text-left min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: NAVY }}>Ignite CRM</div>
            <div className="text-[10px] text-gray-400 truncate">Sales &amp; Admissions</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto shrink-0" />
        </button>
        {workspaceOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <div className="px-3 py-2 rounded-lg mx-1 cursor-default" style={{ background: "#EEF2FF" }}>
              <div className="text-xs font-bold" style={{ color: NAVY }}>🚀 Ignite CRM</div>
              <div className="text-[10px] text-gray-500">Sales &amp; Admissions</div>
            </div>
            <div className="px-3 py-2 rounded-lg mx-1 mt-0.5 hover:bg-gray-50 cursor-pointer" onClick={() => setWorkspaceOpen(false)}>
              <div className="text-xs font-semibold text-gray-600">🎓 Mastery</div>
              <div className="text-[10px] text-gray-400">Academic Portal</div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Date range */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 shrink-0">
        <Calendar className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium whitespace-nowrap">{fmtHeader(weekAgo)} – {fmtHeader(today)}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </div>

      {/* Export Report */}
      <button onClick={exportCurrentView} disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
        style={{ background: NAVY }}>
        <Download className="w-3.5 h-3.5" />
        {exporting ? "Exporting…" : "Export CSV"}
      </button>

      {/* Notifications */}
      <button className="relative w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 shrink-0">
        <Bell className="w-4 h-4 text-gray-500" />
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold"
          style={{ background: ORANGE }}>3</span>
      </button>

      {/* User profile */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setWorkspaceOpen(false); }}
          className="flex items-center gap-2.5 hover:bg-gray-50 px-2 py-1.5 rounded-xl transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: NAVY }}>{userName?.[0] ?? "G"}</div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold" style={{ color: NAVY }}>{userName}</div>
            <div className="text-[10px] text-gray-400 capitalize">{userRole.replace("_", " ")}</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {profileOpen && (
          <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-50 mb-1">
              <div className="text-xs font-bold text-gray-800">{userName}</div>
              <div className="text-[10px] text-gray-400 capitalize">{userRole.replace("_", " ")}</div>
            </div>
            {[
              { label: "My Profile", icon: UserCheck },
              { label: "Settings", icon: Filter },
            ].map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => setProfileOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
            <div className="border-t border-gray-50 mt-1 pt-1">
              <button onClick={() => { setProfileOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
                <XCircle className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Conversion Center (placeholder) ──────────────────────────────────────────

function ConversionCenterView({ setView }: { setView: (v: IgniteView) => void }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/ignite/demo-students")
      .then((r) => r.json())
      .then(setStudents)
      .finally(() => setLoading(false));
  }, []);

  const total = students.length;

  const FUNNEL = [
    { stage: "Leads",        key: null,            color: "#3B82F6", bg: "#DBEAFE" },
    { stage: "Contacted",    key: "Contacted",      color: "#8B5CF6", bg: "#EDE9FE" },
    { stage: "Demo Joined",  key: "Demo Joined",    color: "#F59E0B", bg: "#FEF3C7" },
    { stage: "Interested",   key: "Interested",     color: "#EA580C", bg: "#FFF7ED" },
    { stage: "Payment Sent", key: "Payment Sent",   color: "#059669", bg: "#D1FAE5" },
    { stage: "Converted",    key: "Converted",      color: NAVY,      bg: "#EEF2FF" },
  ];

  const counts = FUNNEL.map((p) => ({
    ...p,
    count: p.key === null ? total : students.filter((s) => s.leadStage === p.key).length,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: NAVY }}>Conversion Center</h1>
        <p className="text-xs text-gray-500">Track conversion funnel from leads to enrolled students</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {counts.map((p) => (
          <button key={p.stage} onClick={() => setView("leads")}
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: p.bg }}>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: p.color }} />
            </div>
            <div>
              <div className="font-black text-base leading-none" style={{ color: NAVY }}>{loading ? "…" : p.count}</div>
              <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{p.stage}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Funnel table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>Pipeline Funnel</h3>
          <span className="text-xs text-gray-400">{total} total leads</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {counts.map((p) => {
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
              return (
                <div key={p.stage} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="font-semibold text-gray-700 text-xs truncate">{p.stage}</span>
                  </div>
                  <div className="font-black text-sm w-10 shrink-0 text-right" style={{ color: NAVY }}>{p.count}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full flex items-center pl-2 transition-all"
                      style={{ width: `${Math.max(pct, 2)}%`, background: p.color }}>
                      {pct >= 8 && <span className="text-white text-[10px] font-bold">{pct}%</span>}
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-gray-500 w-10 shrink-0">{pct}%</div>
                  <button onClick={() => setView("leads")}
                    className="text-xs font-semibold px-3 py-1 rounded-lg hover:opacity-80 shrink-0"
                    style={{ background: "#EEF2FF", color: NAVY }}>View</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Overview View ─────────────────────────────────────────────────────────────

function OverviewView({ setView }: { setView: (v: IgniteView) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: NAVY }}>Demo Management Overview</h1>
        <p className="text-xs text-gray-500">Quick access to all demo management sections</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: "demo-batches" as IgniteView, label: "Demo Batches", desc: "Manage all demo batch schedules, enrollment, and analytics", icon: BookOpen, color: NAVY, bg: "#EEF2FF" },
          { id: "demo-students" as IgniteView, label: "Demo Students", desc: "View and track all demo student enrollment and status", icon: Users, color: "#3B82F6", bg: "#DBEAFE" },
          { id: "attendance" as IgniteView, label: "Attendance", desc: "Track student attendance per batch per session", icon: Calendar, color: "#8B5CF6", bg: "#EDE9FE" },
          { id: "homework" as IgniteView, label: "Homework", desc: "Manage and track homework assignments across demo batches", icon: ClipboardList, color: ORANGE, bg: "#FFF7ED" },
          { id: "follow-ups" as IgniteView, label: "Follow-ups", desc: "View mentor follow-up activity and call logs", icon: Phone, color: GREEN, bg: "#D1FAE5" },
          { id: "sales-mentors" as IgniteView, label: "Sales Mentors", desc: "Sales mentor performance and conversion rankings", icon: Award, color: "#F59E0B", bg: "#FEF3C7" },
        ].map((item) => (
          <button key={item.id} onClick={() => setView(item.id)}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-left group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: item.bg }}>
              <item.icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <div className="font-bold text-sm mb-1" style={{ color: NAVY }}>{item.label}</div>
            <div className="text-xs text-gray-500">{item.desc}</div>
            <div className="mt-3 text-xs font-semibold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: item.color }}>
              Open <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Paid Students — Unassigned View ──────────────────────────────────────────

interface IgnitePaidStudentRow {
  id: number;
  studentId: number;
  paymentId: number;
  grade: number;
  phone: string;
  amountPaise: number;
  paidAt: string;
  assignmentStatus: string;
  assignedMentorId: number | null;
  assignedMentorName: string | null;
  assignedAt: string | null;
  courseType: string;
  leadSource: string | null;
  name: string;
  school: string | null;
  city: string | null;
  leadStage: string | null;
  callStatus: string | null;
  nextFollowUpAt: string | null;
  accountType: string;
  paymentStatus: string;
  razorpayPaymentId: string | null;
  // batch_assigned
  batchName: string | null;
  batchStartDate: string | null;
  teacherName: string | null;
  assignedByName: string | null;
  // demo stages
  demoStartDate: string | null;
  attendancePct: number | null;
  classesAttended: number | null;
  homeworkPct: number | null;
  // demo_completed
  completionDate: string | null;
  conversionRecommendation: string | null;
  // converted
  convertedDate: string | null;
  coursePurchased: string | null;
  courseValue: number | null;
  convertedBy: string | null;
  // dropped
  droppedDate: string | null;
  dropReason: string | null;
}

interface AssignableMentor {
  id: number;
  name: string;
  email: string;
  role: string;
  activeStudentCount: number;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    captured: { bg: "#D1FAE5", text: "#065F46", label: "Captured" },
    created:  { bg: "#FEF3C7", text: "#92400E", label: "Pending" },
    failed:   { bg: "#FEE2E2", text: "#991B1B", label: "Failed" },
    refunded: { bg: "#F3F4F6", text: "#374151", label: "Refunded" },
  };
  const cfg = map[s] ?? { bg: "#F3F4F6", text: "#374151", label: status || "–" };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
  );
}

function AssignmentStatusBadge({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const map: Record<string, { bg: string; text: string; label: string }> = {
    unassigned:     { bg: "#FFF7ED", text: "#C2410C",  label: "Unassigned"     },
    assigned:       { bg: "#DBEAFE", text: "#1D4ED8",  label: "Assigned"       },
    batch_assigned: { bg: "#EDE9FE", text: "#5B21B6",  label: "Batch Assigned" },
    demo_started:   { bg: "#FEF3C7", text: "#92400E",  label: "Demo Started"   },
    demo_completed: { bg: "#D1FAE5", text: "#065F46",  label: "Demo Completed" },
    converted:      { bg: "#BBF7D0", text: "#14532D",  label: "Converted"      },
    dropped:        { bg: "#FEE2E2", text: "#991B1B",  label: "Dropped"        },
    active:         { bg: "#D1FAE5", text: "#065F46",  label: "Active"         },
  };
  const cfg = map[s] ?? { bg: "#F3F4F6", text: "#374151", label: status || "–" };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
  );
}

function PaidStudentsUnassignedView() {
  const [rows, setRows] = useState<IgnitePaidStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeF, setGradeF] = useState("All Grades");
  const [page, setPage] = useState(1);
  const PER = 15;

  // Assign IC modal state
  const [assigningRow, setAssigningRow] = useState<IgnitePaidStudentRow | null>(null);
  const [mentors, setMentors] = useState<AssignableMentor[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/admin/ignite/paid-students/unassigned")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAssignModal = (row: IgnitePaidStudentRow) => {
    setAssigningRow(row);
    setSelectedMentorId(null);
    setAssignError("");
    setMentorsLoading(true);
    apiFetch("/admin/ignite/paid-students/assignable-mentors")
      .then((r) => r.json())
      .then((data) => setMentors(Array.isArray(data) ? data : []))
      .catch(() => setMentors([]))
      .finally(() => setMentorsLoading(false));
  };

  const confirmAssign = () => {
    if (!assigningRow || !selectedMentorId) return;
    setAssigning(true);
    setAssignError("");
    apiFetch(`/admin/ignite/paid-students/${assigningRow.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId: selectedMentorId }),
    })
      .then(async (r) => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error((d as { error?: string }).error ?? "Assignment failed"); }
        setAssigningRow(null);
        load();
      })
      .catch((e: unknown) => setAssignError(e instanceof Error ? e.message : "Assignment failed"))
      .finally(() => setAssigning(false));
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (q && !(r.name ?? "").toLowerCase().includes(q) && !(r.phone ?? "").includes(q)) return false;
    if (gradeF !== "All Grades" && String(r.grade) !== gradeF.replace("Grade ", "")) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const totalRevenue = rows.reduce((sum, r) => sum + (r.amountPaise ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-400 font-medium">Paid Students</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-xs font-semibold" style={{ color: ORANGE }}>Unassigned</span>
          </div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Unassigned Paid Students</h1>
          <p className="text-xs text-gray-500">Students who have paid for Ignite but not yet assigned to a batch or IC</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Unassigned</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFF7ED" }}>
              <Users className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: NAVY }}>{rows.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">Need IC assignment</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Revenue</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#D1FAE5" }}>
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-green-600">
            ₹{(totalRevenue / 100).toLocaleString("en-IN")}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">From unassigned students</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Grades</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
              <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: NAVY }}>
            {new Set(rows.map((r) => r.grade)).size}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Distinct grades</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Captured</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#D1FAE5" }}>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-green-600">
            {rows.filter((r) => r.paymentStatus === "captured").length}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Verified payments</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="Search name or phone…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 w-48"
            style={{ "--tw-ring-color": NAVY } as React.CSSProperties}
          />
        </div>
        <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Grades</option>
          {[1,2,3,4,5,6,7,8,9,10].map((g) => <option key={g}>Grade {g}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <tr>
                {["Student Name", "Phone", "Grade", "Amount Paid", "Payment Date", "Payment Status", "Lead Stage", "Assignment", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <div className="text-xs">Loading…</div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#FFF7ED" }}>
                      <Users className="w-7 h-7" style={{ color: ORANGE }} />
                    </div>
                    <div className="text-sm font-semibold text-gray-500">No unassigned paid students found.</div>
                    <div className="text-xs text-gray-400 mt-1">New Ignite payments will appear here.</div>
                  </td>
                </tr>
              ) : paged.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  {/* Student Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{(r.name?.[0] ?? "?").toUpperCase()}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{r.name}</div>
                        <div className="text-gray-400 text-[10px]">{r.school ?? r.city ?? "–"}</div>
                      </div>
                    </div>
                  </td>
                  {/* Phone */}
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{r.phone}</td>
                  {/* Grade */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: "#EEF2FF", color: NAVY }}>Gr {r.grade}</span>
                  </td>
                  {/* Amount Paid */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-black text-green-700">
                      ₹{(r.amountPaise / 100).toLocaleString("en-IN")}
                    </span>
                  </td>
                  {/* Payment Date */}
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(r.paidAt)}</td>
                  {/* Payment Status */}
                  <td className="px-4 py-3"><PaymentStatusBadge status={r.paymentStatus} /></td>
                  {/* Lead Stage */}
                  <td className="px-4 py-3"><StageBadge stage={r.leadStage} /></td>
                  {/* Assignment Status */}
                  <td className="px-4 py-3"><AssignmentStatusBadge status={r.assignmentStatus} /></td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => openAssignModal(r)}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                        style={{ background: "#EEF2FF", color: NAVY }}>
                        Assign IC
                      </button>
                      <a href={`tel:${r.phone}`}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{ background: "#D1FAE5" }} title="Call Parent">
                        <Phone className="w-3 h-3 text-green-700" />
                      </a>
                      <a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noreferrer"
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{ background: "#D1FAE5" }} title="WhatsApp Parent">
                        <Bell className="w-3 h-3 text-green-700" />
                      </a>
                      <button disabled
                        className="w-6 h-6 rounded-lg flex items-center justify-center opacity-40 cursor-not-allowed"
                        style={{ background: "#F3F4F6" }} title="View Details — coming soon">
                        <Eye className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Assign IC Modal ───────────────────────────────────────── */}
      {assigningRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{ background: "#F8FAFF" }}>
              <div>
                <h3 className="text-sm font-black" style={{ color: NAVY }}>Assign Ignite Counsellor</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {assigningRow.name} · Grade {assigningRow.grade} · ₹{(assigningRow.amountPaise / 100).toLocaleString("en-IN")}
                </p>
              </div>
              <button onClick={() => setAssigningRow(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-400">
                ✕
              </button>
            </div>

            {/* Mentor list */}
            <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-2">
              {mentorsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading counsellors…</span>
                </div>
              ) : mentors.length === 0 ? (
                <p className="text-center py-8 text-xs text-gray-400">No assignable counsellors found.</p>
              ) : mentors.map((m) => (
                <button key={m.id} onClick={() => setSelectedMentorId(m.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
                  style={selectedMentorId === m.id
                    ? { borderColor: NAVY, background: "#EEF2FF" }
                    : { borderColor: "#E5E7EB", background: "#fff" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: selectedMentorId === m.id ? NAVY : "#94A3B8" }}>
                      {(m.name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-semibold" style={{ color: NAVY }}>{m.name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{m.role.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{ color: m.activeStudentCount >= 20 ? "#DC2626" : "#16A34A" }}>
                      {m.activeStudentCount}
                    </div>
                    <div className="text-[10px] text-gray-400">active</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Error */}
            {assignError && (
              <div className="mx-6 mb-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs">{assignError}</div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setAssigningRow(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={confirmAssign}
                disabled={!selectedMentorId || assigning}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-40"
                style={{ background: NAVY }}>
                {assigning ? "Assigning…" : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Paid Students — shared action buttons ─────────────────────────────────────

function PaidStudentActions({ phone }: { phone: string }) {
  return (
    <div className="flex items-center gap-1">
      <a href={`tel:${phone}`}
        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{ background: "#D1FAE5" }} title="Call">
        <Phone className="w-3 h-3 text-green-700" />
      </a>
      <a href={`https://wa.me/91${phone}`} target="_blank" rel="noreferrer"
        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
        style={{ background: "#D1FAE5" }} title="WhatsApp">
        <Bell className="w-3 h-3 text-green-700" />
      </a>
      <button disabled
        className="w-6 h-6 rounded-lg flex items-center justify-center opacity-40 cursor-not-allowed"
        style={{ background: "#F3F4F6" }} title="View Details">
        <Eye className="w-3 h-3 text-gray-500" />
      </button>
    </div>
  );
}

// ── Paid Students — generic status view ───────────────────────────────────────

interface PsStatusViewConfig {
  status: string;
  label: string;
  labelColor: string;
  description: string;
  extraHeaders: string[];
  renderExtraCells: (r: IgnitePaidStudentRow) => React.ReactNode;
  kpi1Label: string;
  kpi1Value: (rows: IgnitePaidStudentRow[]) => React.ReactNode;
  kpi1Sub: string;
  kpi1Bg: string;
  kpi1IconColor: string;
}

function PaidStudentsStatusView({ cfg }: { cfg: PsStatusViewConfig }) {
  const [rows, setRows] = useState<IgnitePaidStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeF, setGradeF] = useState("All Grades");
  const [page, setPage] = useState(1);
  const PER = 15;

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    apiFetch(`/admin/ignite/paid-students?status=${cfg.status}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => { setError(true); setRows([]); })
      .finally(() => setLoading(false));
  }, [cfg.status]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (q && !(r.name ?? "").toLowerCase().includes(q) && !(r.phone ?? "").includes(q) && !(r.assignedMentorName ?? "").toLowerCase().includes(q)) return false;
    if (gradeF !== "All Grades" && String(r.grade) !== gradeF.replace("Grade ", "")) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const totalRevenue = rows.reduce((sum, r) => sum + (r.amountPaise ?? 0), 0);

  const COMMON_HEADERS = ["Student Name", "Phone", "Grade", "Amount Paid", "Payment Date", "Assigned Mentor", "Assigned Date", "Lead Stage", "Status"];
  const allHeaders = [...COMMON_HEADERS, ...cfg.extraHeaders, "Actions"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-400 font-medium">Paid Students</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-xs font-semibold" style={{ color: cfg.labelColor }}>{cfg.label}</span>
          </div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>{cfg.label} Students</h1>
          <p className="text-xs text-gray-500">{cfg.description}</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">{cfg.kpi1Label}</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.kpi1Bg }}>
              <Users className="w-4 h-4" style={{ color: cfg.kpi1IconColor }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: cfg.kpi1IconColor }}>{cfg.kpi1Value(rows)}</div>
          <div className="text-[10px] text-gray-400 mt-1">{cfg.kpi1Sub}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Revenue</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#D1FAE5" }}>
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-green-600">₹{(totalRevenue / 100).toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-gray-400 mt-1">Total paid amount</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">ICs Active</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
              <Award className="w-4 h-4" style={{ color: NAVY }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: NAVY }}>
            {new Set(rows.map((r) => r.assignedMentorId).filter(Boolean)).size}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Distinct counsellors</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Grades</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
              <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: NAVY }}>
            {new Set(rows.map((r) => r.grade)).size}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Distinct grades</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search name, phone or IC…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 w-52"
            style={{ "--tw-ring-color": NAVY } as React.CSSProperties} />
        </div>
        <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Grades</option>
          {[1,2,3,4,5,6,7,8,9,10].map((g) => <option key={g}>Grade {g}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <tr>
                {allHeaders.map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={allHeaders.length} className="text-center py-16 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <div className="text-xs">Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={allHeaders.length} className="text-center py-16">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-sm font-semibold text-gray-500">Failed to load data.</div>
                    <button onClick={load} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: NAVY, color: "#fff" }}>Retry</button>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={allHeaders.length} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: cfg.kpi1Bg }}>
                      <Users className="w-7 h-7" style={{ color: cfg.kpi1IconColor }} />
                    </div>
                    <div className="text-sm font-semibold text-gray-500">
                      {search || gradeF !== "All Grades" ? "No matching students." : `No ${cfg.label.toLowerCase()} students yet.`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{cfg.description}</div>
                  </td>
                </tr>
              ) : paged.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{(r.name?.[0] ?? "?").toUpperCase()}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{r.name}</div>
                        <div className="text-gray-400 text-[10px]">{r.school ?? r.city ?? "–"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{r.phone}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: "#EEF2FF", color: NAVY }}>Gr {r.grade}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black text-green-700">₹{(r.amountPaise / 100).toLocaleString("en-IN")}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(r.paidAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ background: "#1D4ED8" }}>
                        {(r.assignedMentorName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{r.assignedMentorName ?? "–"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.assignedAt ? fmt(r.assignedAt) : "–"}</td>
                  <td className="px-4 py-3"><StageBadge stage={r.leadStage} /></td>
                  <td className="px-4 py-3"><AssignmentStatusBadge status={r.assignmentStatus} /></td>
                  {cfg.renderExtraCells(r)}
                  <td className="px-4 py-3"><PaidStudentActions phone={r.phone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Paid Students — Batch Assigned ────────────────────────────────────────────

function PaidStudentsBatchAssignedView() {
  return (
    <PaidStudentsStatusView cfg={{
      status: "batch_assigned",
      label: "Batch Assigned",
      labelColor: "#5B21B6",
      description: "Students assigned to a demo batch, pending demo start",
      extraHeaders: ["Batch Name", "Batch Start Date", "Teacher", "Assigned By"],
      renderExtraCells: (r) => (
        <>
          <td className="px-4 py-3 text-gray-700 text-xs font-medium whitespace-nowrap">{r.batchName ?? "–"}</td>
          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.batchStartDate ? fmt(r.batchStartDate) : "–"}</td>
          <td className="px-4 py-3 text-gray-700 text-xs">{r.teacherName ?? "–"}</td>
          <td className="px-4 py-3 text-gray-700 text-xs">{r.assignedByName ?? "–"}</td>
        </>
      ),
      kpi1Label: "Batch Assigned",
      kpi1Value: (rows) => rows.length,
      kpi1Sub: "Awaiting demo start",
      kpi1Bg: "#EDE9FE",
      kpi1IconColor: "#5B21B6",
    }} />
  );
}

// ── Paid Students — Demo Started ──────────────────────────────────────────────

function PaidStudentsDemoStartedView() {
  return (
    <PaidStudentsStatusView cfg={{
      status: "demo_started",
      label: "Demo Started",
      labelColor: "#92400E",
      description: "Students whose demo classes are currently in progress",
      extraHeaders: ["Demo Start Date", "Attendance %", "Classes Attended", "Homework %"],
      renderExtraCells: (r) => (
        <>
          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.demoStartDate ? fmt(r.demoStartDate) : "–"}</td>
          <td className="px-4 py-3">
            {r.attendancePct !== null
              ? <span className="font-semibold text-xs" style={{ color: (r.attendancePct ?? 0) >= 75 ? GREEN : ORANGE }}>{r.attendancePct}%</span>
              : <span className="text-xs text-gray-400">–</span>}
          </td>
          <td className="px-4 py-3 text-gray-700 text-xs text-center">{r.classesAttended ?? "–"}</td>
          <td className="px-4 py-3">
            {r.homeworkPct !== null
              ? <span className="font-semibold text-xs" style={{ color: (r.homeworkPct ?? 0) >= 75 ? GREEN : ORANGE }}>{r.homeworkPct}%</span>
              : <span className="text-xs text-gray-400">–</span>}
          </td>
        </>
      ),
      kpi1Label: "Demo Started",
      kpi1Value: (rows) => rows.length,
      kpi1Sub: "Currently in demo",
      kpi1Bg: "#FEF3C7",
      kpi1IconColor: "#92400E",
    }} />
  );
}

// ── Paid Students — Demo Completed ────────────────────────────────────────────

function PaidStudentsDemoCompletedView() {
  return (
    <PaidStudentsStatusView cfg={{
      status: "demo_completed",
      label: "Demo Completed",
      labelColor: "#065F46",
      description: "Students who have completed their demo — pending conversion decision",
      extraHeaders: ["Completion Date", "Attendance %", "Homework %", "Conversion Recommendation"],
      renderExtraCells: (r) => (
        <>
          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.completionDate ? fmt(r.completionDate) : "–"}</td>
          <td className="px-4 py-3">
            {r.attendancePct !== null
              ? <span className="font-semibold text-xs" style={{ color: (r.attendancePct ?? 0) >= 75 ? GREEN : ORANGE }}>{r.attendancePct}%</span>
              : <span className="text-xs text-gray-400">–</span>}
          </td>
          <td className="px-4 py-3">
            {r.homeworkPct !== null
              ? <span className="font-semibold text-xs" style={{ color: (r.homeworkPct ?? 0) >= 75 ? GREEN : ORANGE }}>{r.homeworkPct}%</span>
              : <span className="text-xs text-gray-400">–</span>}
          </td>
          <td className="px-4 py-3">
            {r.conversionRecommendation
              ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: r.conversionRecommendation.toLowerCase() === "yes" ? "#BBF7D0" : "#FEE2E2",
                           color:      r.conversionRecommendation.toLowerCase() === "yes" ? "#14532D" : "#991B1B" }}>
                  {r.conversionRecommendation}
                </span>
              : <span className="text-xs text-gray-400">–</span>}
          </td>
        </>
      ),
      kpi1Label: "Demo Completed",
      kpi1Value: (rows) => rows.length,
      kpi1Sub: "Awaiting conversion",
      kpi1Bg: "#D1FAE5",
      kpi1IconColor: "#065F46",
    }} />
  );
}

// ── Paid Students — Converted ─────────────────────────────────────────────────

function PaidStudentsConvertedView() {
  return (
    <PaidStudentsStatusView cfg={{
      status: "converted",
      label: "Converted",
      labelColor: "#14532D",
      description: "Students who have converted to a paid Braintam course",
      extraHeaders: ["Converted Date", "Course Purchased", "Course Value", "Converted By"],
      renderExtraCells: (r) => (
        <>
          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.convertedDate ? fmt(r.convertedDate) : "–"}</td>
          <td className="px-4 py-3 text-gray-700 text-xs font-medium">{r.coursePurchased ?? "–"}</td>
          <td className="px-4 py-3">
            {r.courseValue
              ? <span className="text-xs font-black text-green-700">₹{(r.courseValue / 100).toLocaleString("en-IN")}</span>
              : <span className="text-xs text-gray-400">–</span>}
          </td>
          <td className="px-4 py-3 text-gray-700 text-xs">{r.convertedBy ?? "–"}</td>
        </>
      ),
      kpi1Label: "Converted",
      kpi1Value: (rows) => rows.length,
      kpi1Sub: "Successfully converted",
      kpi1Bg: "#BBF7D0",
      kpi1IconColor: "#14532D",
    }} />
  );
}

// ── Paid Students — Dropped ───────────────────────────────────────────────────

function PaidStudentsDroppedView() {
  return (
    <PaidStudentsStatusView cfg={{
      status: "dropped",
      label: "Dropped",
      labelColor: "#991B1B",
      description: "Students who did not convert after completing the demo",
      extraHeaders: ["Dropped Date", "Drop Reason", "Last Follow-up", "Assigned Mentor"],
      renderExtraCells: (r) => (
        <>
          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.droppedDate ? fmt(r.droppedDate) : "–"}</td>
          <td className="px-4 py-3 text-gray-700 text-xs max-w-[160px] truncate" title={r.dropReason ?? ""}>{r.dropReason ?? "–"}</td>
          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.nextFollowUpAt ? fmt(r.nextFollowUpAt) : "–"}</td>
          <td className="px-4 py-3">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                style={{ background: "#991B1B" }}>
                {(r.assignedMentorName?.[0] ?? "?").toUpperCase()}
              </div>
              <span className="text-xs text-gray-700">{r.assignedMentorName ?? "–"}</span>
            </div>
          </td>
        </>
      ),
      kpi1Label: "Dropped",
      kpi1Value: (rows) => rows.length,
      kpi1Sub: "Did not convert",
      kpi1Bg: "#FEE2E2",
      kpi1IconColor: "#991B1B",
    }} />
  );
}

// ── Paid Students — Assigned View ─────────────────────────────────────────────

function PaidStudentsAssignedView() {
  const [rows, setRows] = useState<IgnitePaidStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeF, setGradeF] = useState("All Grades");
  const [page, setPage] = useState(1);
  const PER = 15;

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/admin/ignite/paid-students?status=assigned")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (q && !(r.name ?? "").toLowerCase().includes(q) && !(r.phone ?? "").includes(q) && !(r.assignedMentorName ?? "").toLowerCase().includes(q)) return false;
    if (gradeF !== "All Grades" && String(r.grade) !== gradeF.replace("Grade ", "")) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const totalRevenue = rows.reduce((sum, r) => sum + (r.amountPaise ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-gray-400 font-medium">Paid Students</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-xs font-semibold" style={{ color: "#1D4ED8" }}>Assigned</span>
          </div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Assigned Paid Students</h1>
          <p className="text-xs text-gray-500">Students assigned to an Ignite Counsellor, awaiting demo batch</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Assigned</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#DBEAFE" }}>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-700">{rows.length}</div>
          <div className="text-[10px] text-gray-400 mt-1">With an IC</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Revenue</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#D1FAE5" }}>
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-green-600">₹{(totalRevenue / 100).toLocaleString("en-IN")}</div>
          <div className="text-[10px] text-gray-400 mt-1">From assigned students</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">ICs Active</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
              <Award className="w-4 h-4" style={{ color: NAVY }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: NAVY }}>
            {new Set(rows.map((r) => r.assignedMentorId).filter(Boolean)).size}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Distinct counsellors</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500">Grades</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
              <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: NAVY }}>
            {new Set(rows.map((r) => r.grade)).size}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Distinct grades</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="Search name, phone or IC…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 pr-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 w-52"
            style={{ "--tw-ring-color": NAVY } as React.CSSProperties}
          />
        </div>
        <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none">
          <option>All Grades</option>
          {[1,2,3,4,5,6,7,8,9,10].map((g) => <option key={g}>Grade {g}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <tr>
                {["Student Name", "Phone", "Grade", "Amount Paid", "Payment Date", "Assigned Mentor", "Assigned Date", "Lead Stage", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <div className="text-xs">Loading…</div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "#DBEAFE" }}>
                      <Users className="w-7 h-7 text-blue-500" />
                    </div>
                    <div className="text-sm font-semibold text-gray-500">No assigned students yet.</div>
                    <div className="text-xs text-gray-400 mt-1">Assign ICs from the Unassigned screen.</div>
                  </td>
                </tr>
              ) : paged.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  {/* Student Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{(r.name?.[0] ?? "?").toUpperCase()}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">{r.name}</div>
                        <div className="text-gray-400 text-[10px]">{r.school ?? r.city ?? "–"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono whitespace-nowrap">{r.phone}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: "#EEF2FF", color: NAVY }}>Gr {r.grade}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black text-green-700">₹{(r.amountPaise / 100).toLocaleString("en-IN")}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(r.paidAt)}</td>
                  {/* Assigned Mentor */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ background: "#1D4ED8" }}>
                        {(r.assignedMentorName?.[0] ?? "?").toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 font-medium">{r.assignedMentorName ?? "–"}</span>
                    </div>
                  </td>
                  {/* Assigned Date */}
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{r.assignedAt ? fmt(r.assignedAt) : "–"}</td>
                  <td className="px-4 py-3"><StageBadge stage={r.leadStage} /></td>
                  <td className="px-4 py-3"><AssignmentStatusBadge status={r.assignmentStatus} /></td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <a href={`tel:${r.phone}`}
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{ background: "#D1FAE5" }} title="Call Parent">
                        <Phone className="w-3 h-3 text-green-700" />
                      </a>
                      <a href={`https://wa.me/91${r.phone}`} target="_blank" rel="noreferrer"
                        className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                        style={{ background: "#D1FAE5" }} title="WhatsApp Parent">
                        <Bell className="w-3 h-3 text-green-700" />
                      </a>
                      <button disabled
                        className="w-6 h-6 rounded-lg flex items-center justify-center opacity-40 cursor-not-allowed"
                        style={{ background: "#F3F4F6" }} title="View Details — coming soon">
                        <Eye className="w-3 h-3 text-gray-500" />
                      </button>
                      <button disabled
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg opacity-40 cursor-not-allowed"
                        style={{ background: "#FFF7ED", color: ORANGE }}
                        title="Assign Demo Batch — coming soon">
                        Batch
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-lg text-xs font-semibold"
                  style={page === p ? { background: NAVY, color: "#fff" } : { background: "#F3F4F6", color: "#374151" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ignite Content Area (used by admin portal — no own header/sidebar) ────────

export function IgniteContentArea({
  view, setView, flash, role = "admin",
}: {
  view: IgniteView;
  setView: (v: IgniteView) => void;
  flash: (m: string, ok?: boolean) => void;
  role?: string;
}) {
  switch (view) {
    case "dashboard": return <DashboardView setView={setView} />;
    case "leads": return <LeadsView flash={flash} role={role} />;
    case "overview": return <OverviewView setView={setView} />;
    case "demo-batches": return <DemoBatchesTab flash={flash} />;
    case "demo-students": return <DemoStudentsView flash={flash} role={role} />;
    case "attendance": return <AttendanceView flash={flash} />;
    case "homework": return <HomeworkView flash={flash} />;
    case "follow-ups": return <FollowUpsView flash={flash} role={role} />;
    case "conversion": return <ConversionCenterView setView={setView} />;
    case "grade-teams": return <GradeTeamsView flash={flash} />;
    case "sales-mentors": return <MentorsHubView flash={flash} setView={setView} />;
    case "student-outreach": return <StudentOutreachView flash={flash} />;
    case "ignite-reports": return <IgniteAnalyticsTab />;
    case "performance-rankings": return <IgnitePerformanceRankingsTab />;
    case "lead-deployment": return <LeadDeploymentView flash={flash} />;
    case "paid-students-unassigned":    return <PaidStudentsUnassignedView />;
    case "paid-students-assigned":      return <PaidStudentsAssignedView />;
    case "paid-students-batch-assigned": return <PaidStudentsBatchAssignedView />;
    case "paid-students-demo-started":  return <PaidStudentsDemoStartedView />;
    case "paid-students-demo-completed": return <PaidStudentsDemoCompletedView />;
    case "paid-students-converted":     return <PaidStudentsConvertedView />;
    case "paid-students-dropped":       return <PaidStudentsDroppedView />;
    case "batch-health": return <BatchPipelineHealthView flash={flash} />;
    case "payments": return <PaymentsView flash={flash} role={role} />;
    default: return <DashboardView setView={setView} />;
  }
}

// ── Main Ignite Tab ───────────────────────────────────────────────────────────

export function IgniteTab({
  flash, userName = "Admin", userRole = "admin",
}: {
  flash: (m: string, ok?: boolean) => void;
  userName?: string;
  userRole?: string;
}) {
  const [view, setView] = useState<IgniteView>("dashboard");

  const renderContent = () => {
    switch (view) {
      case "dashboard": return <DashboardView setView={setView} />;
      case "leads": return <LeadsView flash={flash} />;
      case "overview": return <OverviewView setView={setView} />;
      case "demo-batches": return <DemoBatchesTab flash={flash} />;
      case "demo-students": return <DemoStudentsView flash={flash} />;
      case "attendance": return <AttendanceView flash={flash} />;
      case "homework": return <HomeworkView flash={flash} />;
      case "follow-ups": return <FollowUpsView flash={flash} />;
      case "conversion": return <ConversionCenterView setView={setView} />;
      case "grade-teams": return <GradeTeamsView flash={flash} />;
      case "sales-mentors": return <MentorsHubView flash={flash} setView={setView} />;
      case "student-outreach": return <StudentOutreachView flash={flash} />;
      case "ignite-reports": return <IgniteAnalyticsTab />;
      case "performance-rankings": return <IgnitePerformanceRankingsTab />;
      case "lead-deployment": return <LeadDeploymentView flash={flash} />;
      case "paid-students-unassigned":    return <PaidStudentsUnassignedView />;
      case "paid-students-assigned":      return <PaidStudentsAssignedView />;
      case "paid-students-batch-assigned": return <PaidStudentsBatchAssignedView />;
      case "paid-students-demo-started":  return <PaidStudentsDemoStartedView />;
      case "paid-students-demo-completed": return <PaidStudentsDemoCompletedView />;
      case "paid-students-converted":     return <PaidStudentsConvertedView />;
      case "paid-students-dropped":       return <PaidStudentsDroppedView />;
      case "batch-health": return <BatchPipelineHealthView flash={flash} />;
      case "payments": return <PaymentsView flash={flash} />;
      default: return <DashboardView setView={setView} />;
    }
  };

  return (
    <div className="flex flex-col -mx-6 -my-5" style={{ fontFamily: "Poppins, sans-serif", height: "calc(100vh - 0px)", minHeight: "600px" }}>
      {/* Top header */}
      <IgniteHeader userName={userName} userRole={userRole} view={view} />
      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <IgniteSidebar view={view} setView={setView} />
        <div className="flex-1 overflow-auto p-6 min-w-0" style={{ background: "#F5F7FF" }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
