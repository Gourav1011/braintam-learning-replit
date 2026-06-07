import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardList,
  Phone, TrendingUp, ChevronDown, ChevronRight, Search, Filter,
  Download, Plus, Eye, RefreshCw, Star, Award, Zap, CheckCircle,
  XCircle, Clock, UserCheck, BarChart3, AlertTriangle, Check, X,
} from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1780813752895.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
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

type IgniteView =
  | "dashboard"
  | "leads"
  | "overview"
  | "demo-batches"
  | "demo-students"
  | "attendance"
  | "homework"
  | "follow-ups"
  | "conversion"
  | "sales-mentors";

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, bgColor,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 min-w-0">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bgColor }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="font-black text-xl leading-tight" style={{ color: NAVY }}>{value}</div>
        {sub && <div className="text-xs font-semibold" style={{ color }}>{sub}</div>}
        <div className="text-xs text-gray-500 truncate">{label}</div>
      </div>
    </div>
  );
}

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
  }, [flash]);

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

function DemoStudentsView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
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
  }, [flash]);

  const batches = [...new Set(students.map((s) => s.batchTitle))];
  const mentors = [...new Set(students.map((s) => s.assignedMentorName).filter(Boolean))] as string[];

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !(s.phone ?? "").includes(q) && !(s.school ?? "").toLowerCase().includes(q)) return false;
    if (batchF !== "All Batches" && s.batchTitle !== batchF) return false;
    if (mentorF !== "All Mentors" && s.assignedMentorName !== mentorF) return false;
    if (statusF !== "All Status" && s.enrollmentStatus !== statusF) return false;
    return true;
  });

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  const total = students.length;
  const active = students.filter((s) => s.enrollmentStatus === "active").length;
  const interested = students.filter((s) => s.interestLevel === "High" || s.interestLevel === "Very High").length;
  const paymentSent = students.filter((s) => s.leadStage === "Payment Sent").length;
  const converted = students.filter((s) => s.enrollmentStatus === "converted").length;
  const dropped = students.filter((s) => s.enrollmentStatus === "dropped").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Demo Students</h1>
          <p className="text-xs text-gray-500">View and manage all demo students</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold hover:opacity-90"
            style={{ background: ORANGE }}>
            <Plus className="w-3.5 h-3.5" /> Add Demo Student
          </button>
        </div>
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
  }, [selectedBatch, flash]);

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
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
            <Calendar className="w-3.5 h-3.5" /> Calendar View
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

      {/* Attendance Grid */}
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
  }, [flash]);

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

function FollowUpsView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER = 12;

  useEffect(() => {
    apiFetch("/admin/ignite/follow-ups")
      .then((r) => r.json())
      .then(setFollowUps)
      .catch(() => flash("Failed to load follow-ups", false))
      .finally(() => setLoading(false));
  }, [flash]);

  const filtered = followUps.filter((f) => {
    const q = search.toLowerCase();
    return !q || (f.studentName ?? "").toLowerCase().includes(q) || (f.mentorName ?? "").toLowerCase().includes(q);
  });
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Follow-ups</h1>
          <p className="text-xs text-gray-500">Mentor follow-up activity and call logs</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Follow-ups" value={followUps.length} icon={Phone} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Today" value={followUps.filter((f) => f.createdAt && new Date(f.createdAt).toDateString() === new Date().toDateString()).length}
          icon={Calendar} color={ORANGE} bgColor="#FFF7ED" />
        <KpiCard label="Overdue" value={followUps.filter((f) => f.nextFollowUpDate && new Date(f.nextFollowUpDate) < new Date()).length}
          icon={AlertTriangle} color="#EF4444" bgColor="#FEE2E2" />
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
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
            <thead className="border-b border-gray-100">
              <tr>
                {["Student", "Grade", "Mentor", "Call Status", "Lead Status", "Note", "Next Follow-up", "Date", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading follow-ups...
                </td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No follow-ups found</td></tr>
              ) : paged.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800 text-xs whitespace-nowrap">{f.studentName ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{f.studentGrade ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{f.mentorName ?? "–"}</td>
                  <td className="px-4 py-3 text-xs">
                    {f.callStatus ? <StatusBadge status={f.callStatus} /> : <span className="text-gray-400">–</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {f.leadStatus ? <StatusBadge status={f.leadStatus} /> : <span className="text-gray-400">–</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-48 truncate">{f.note ?? "–"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fmt(f.nextFollowUpDate)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(f.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80"
                      style={{ background: "#EEF2FF", color: NAVY }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {((page - 1) * PER) + 1} to {Math.min(page * PER, filtered.length)} of {filtered.length}</span>
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

// ── Sales Mentors View ────────────────────────────────────────────────────────

interface SalesMentor {
  id: number; name: string; email: string | null; phone: string | null;
  isActive: boolean; lastLoginDate: string | null;
  assignedLeads: number; converted: number; dropped: number; active: number; conversionRate: number;
}

function SalesMentorsView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [mentors, setMentors] = useState<SalesMentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/ignite/sales-mentors")
      .then((r) => r.json())
      .then(setMentors)
      .catch(() => flash("Failed to load sales mentors", false))
      .finally(() => setLoading(false));
  }, [flash]);

  const totalAssigned = mentors.reduce((s, m) => s + m.assignedLeads, 0);
  const totalConverted = mentors.reduce((s, m) => s + m.converted, 0);
  const overallRate = totalAssigned > 0 ? Math.round((totalConverted / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Sales Mentors</h1>
          <p className="text-xs text-gray-500">Sales mentor performance and conversion tracking</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Sales Mentors" value={mentors.length} icon={Users} color={NAVY} bgColor="#EEF2FF" />
        <KpiCard label="Total Leads Assigned" value={totalAssigned} icon={UserCheck} color="#3B82F6" bgColor="#DBEAFE" />
        <KpiCard label="Overall Conversion" value={`${overallRate}%`} icon={TrendingUp} color={GREEN} bgColor="#D1FAE5" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Rank</th>
                {["Mentor", "Email", "Assigned Leads", "Converted", "Active", "Dropped", "Conversion %", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading mentors...
                </td></tr>
              ) : mentors.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                  No sales mentors found. Add mentors with mentorType="sales" to see them here.
                </td></tr>
              ) : mentors.map((m, i) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: i === 0 ? "#FEF3C7" : i === 1 ? "#F3F4F6" : i === 2 ? "#FEF3C7" : "#F9FAFB",
                        color: i === 0 ? "#D97706" : i === 1 ? "#6B7280" : i === 2 ? "#B45309" : "#9CA3AF" }}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{m.name?.[0] ?? "?"}</div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{m.name}</div>
                        <div className="text-gray-400 text-xs">{m.phone ?? "–"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{m.email ?? "–"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{m.assignedLeads}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: GREEN }}>{m.converted}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#3B82F6" }}>{m.active}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#EF4444" }}>{m.dropped}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm" style={{ color: m.conversionRate >= 20 ? GREEN : m.conversionRate >= 10 ? "#D97706" : "#EF4444" }}>
                        {m.conversionRate}%
                      </span>
                      <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(m.conversionRate, 100)}%`, background: m.conversionRate >= 20 ? GREEN : m.conversionRate >= 10 ? "#D97706" : "#EF4444" }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={m.isActive ? "active" : "dropped"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  { id: "sales-mentors", label: "Sales Mentors", icon: Award },
];

function IgniteSidebar({
  view, setView, userName, userRole,
}: {
  view: IgniteView;
  setView: (v: IgniteView) => void;
  userName: string;
  userRole: string;
}) {
  const demoManagementViews: IgniteView[] = ["overview", "demo-batches", "demo-students", "attendance", "homework", "follow-ups"];
  const isDemoManagement = demoManagementViews.includes(view);
  const [demoOpen, setDemoOpen] = useState(isDemoManagement);

  const isActive = (id: IgniteView) => view === id;

  return (
    <div className="w-52 shrink-0 min-h-screen bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen overflow-y-auto z-20">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-100">
        <img src={braintamLogo} alt="Braintam" className="h-7 w-auto mb-3" />
        <div className="px-2 py-1.5 rounded-lg" style={{ background: "#FFF7ED" }}>
          <div className="text-xs font-black tracking-wide" style={{ color: ORANGE }}>🚀 IGNITE</div>
          <div className="text-xs text-gray-500 font-medium">Sales & Admissions</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            const isParentActive = item.children.some((c) => isActive(c.id));
            return (
              <div key={item.id}>
                <button
                  onClick={() => setDemoOpen(!demoOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
                  style={isParentActive ? { color: NAVY } : { color: "#6B7280" }}>
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {demoOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {demoOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 pl-3" style={{ borderColor: "#E5E7EB" }}>
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
            <button key={item.id} onClick={() => setView(item.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
              style={isActive(item.id)
                ? { background: "#EEF2FF", color: NAVY }
                : { color: "#6B7280" }}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Reports & Analytics (coming soon) */}
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-50">
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>Reports & Analytics</span>
        </button>
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gray-50">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: NAVY }}>{userName?.[0] ?? "?"}</div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-800 truncate">{userName}</div>
            <div className="text-xs text-gray-400 capitalize">{userRole.replace("_", " ")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Conversion Center (placeholder) ──────────────────────────────────────────

function ConversionCenterView({ setView }: { setView: (v: IgniteView) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: NAVY }}>Conversion Center</h1>
        <p className="text-xs text-gray-500">Lead-to-student conversion pipeline</p>
      </div>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="font-bold text-gray-600 mb-1">Conversion Pipeline</h3>
        <p className="text-sm text-gray-400 mb-4">Track and manage your lead-to-conversion funnel. Full pipeline view, Razorpay integration, and WhatsApp automation coming soon.</p>
        <button onClick={() => setView("demo-students")}
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90"
          style={{ background: ORANGE }}>View Demo Students →</button>
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
      case "leads": return <DemoStudentsView flash={flash} />;
      case "overview": return <OverviewView setView={setView} />;
      case "demo-batches": return <DemoBatchesView flash={flash} />;
      case "demo-students": return <DemoStudentsView flash={flash} />;
      case "attendance": return <AttendanceView flash={flash} />;
      case "homework": return <HomeworkView flash={flash} />;
      case "follow-ups": return <FollowUpsView flash={flash} />;
      case "conversion": return <ConversionCenterView setView={setView} />;
      case "sales-mentors": return <SalesMentorsView flash={flash} />;
      default: return <DashboardView setView={setView} />;
    }
  };

  return (
    <div className="flex min-h-full -mx-6 -my-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      <IgniteSidebar view={view} setView={setView} userName={userName} userRole={userRole} />
      <div className="flex-1 overflow-auto p-6 min-w-0" style={{ background: "#F5F7FF" }}>
        {renderContent()}
      </div>
    </div>
  );
}
