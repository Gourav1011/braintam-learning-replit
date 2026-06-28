import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown,
  Calendar, Download, RefreshCw, Filter, Search, Phone, Eye,
  ChevronRight, Clock, BarChart3, Award, BookOpen,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

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

function makeCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const e = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(e), ...rows.map(r => r.map(e))].map(c => c.join(",")).join("\n");
}
function downloadCSV(csv: string, filename: string) {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

interface Overview {
  todayPct: number; weeklyPct: number; monthlyPct: number;
  below75: number; chronic: number;
  classesConducted: number; classesMissed: number;
  trend: { date: string; present: number; absent: number; rate: number }[];
  weekly: { week: string; rate: number; present: number; absent: number }[];
}
interface MentorRow {
  mentorId: number; mentorName: string; students: number;
  totalRecords: number; presentRecords: number; attendancePct: number; belowThreshold: number;
}
interface GradeRow {
  grade: number; students: number; totalRecords: number; presentRecords: number; attendancePct: number;
}
interface RiskStudent {
  masteryId: number; name: string; phone: string; grade: number;
  mentorName: string; status: string; total: number; present: number; attendancePct: number;
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-black w-9 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function RiskBadge({ pct }: { pct: number }) {
  const label = pct < 50 ? "Critical" : pct < 60 ? "Severe" : pct < 75 ? "At Risk" : "Low";
  const colors: Record<string, { bg: string; text: string }> = {
    Critical: { bg: "#FEE2E2", text: "#DC2626" },
    Severe:   { bg: "#FEF3C7", text: "#D97706" },
    "At Risk":{ bg: "#FFF7ED", text: "#EA580C" },
    Low:      { bg: "#F3F4F6", text: "#6B7280" },
  };
  const c = colors[label] ?? colors.Low;
  return (
    <span className="text-[9px] px-2 py-0.5 rounded-full font-black" style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

const DAYS_OPTIONS = [
  { label: "Today", value: "1" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
];

const CUSTOM_TOOLTIP = ({ active, payload, label }: Record<string, unknown>) => {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-bold mb-1 text-gray-600">{String(label)}</div>
      {(payload as { name: string; value: number; color: string }[]).map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold">{p.value}{p.name === "Rate" ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
};

export function MasteryAttendanceAnalyticsTab() {
  const [days, setDays] = useState("30");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeChart, setActiveChart] = useState<"daily" | "weekly">("daily");
  const [riskThreshold, setRiskThreshold] = useState(75);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mentors, setMentors] = useState<MentorRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [riskStudents, setRiskStudents] = useState<RiskStudent[]>([]);
  const [activeSection, setActiveSection] = useState<"mentor" | "grade">("mentor");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/mastery/attendance/overview?days=${days}`).then(r => r.json()),
      apiFetch(`/admin/mastery/attendance/mentor-wise?days=${days}`).then(r => r.json()),
      apiFetch(`/admin/mastery/attendance/grade-wise?days=${days}`).then(r => r.json()),
      apiFetch(`/admin/mastery/attendance/risk-students?days=${days}&threshold=${riskThreshold}`).then(r => r.json()),
    ]).then(([ov, m, g, rs]) => {
      setOverview(ov);
      setMentors(Array.isArray(m) ? m : []);
      setGrades(Array.isArray(g) ? g : []);
      setRiskStudents(Array.isArray(rs) ? rs : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [days, riskThreshold]);

  useEffect(() => { load(); }, [load]);

  // filter grade/search
  const filteredMentors = mentors.filter(m => {
    if (search.trim()) {
      return m.mentorName.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });
  const filteredGrades = gradeFilter === "all" ? grades : grades.filter(g => String(g.grade) === gradeFilter);
  const filteredRisk = riskStudents.filter(s => {
    if (gradeFilter !== "all" && String(s.grade) !== gradeFilter) return false;
    if (search.trim()) return s.name.toLowerCase().includes(search.toLowerCase()) || s.mentorName.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  // chart data
  const dailyData = (overview?.trend ?? []).slice(-14).map(d => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    Present: d.present,
    Absent: d.absent,
    Rate: d.rate,
  }));
  const weeklyData = (overview?.weekly ?? []).map(w => ({
    week: new Date(w.week).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    Rate: w.rate,
    Present: w.present,
    Absent: w.absent,
  }));

  // export helpers
  const exportMentor = () => {
    const csv = makeCSV(
      ["Mentor", "Students", "Total Classes", "Present", "Absent", "Attendance %", "Below 75%"],
      mentors.map(m => [m.mentorName, m.students, m.totalRecords, m.presentRecords, m.totalRecords - m.presentRecords, `${m.attendancePct}%`, m.belowThreshold])
    );
    downloadCSV(csv, `mastery_mentor_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const exportGrade = () => {
    const csv = makeCSV(
      ["Grade", "Students", "Total Classes", "Present", "Absent", "Attendance %"],
      grades.map(g => [g.grade, g.students, g.totalRecords, g.presentRecords, g.totalRecords - g.presentRecords, `${g.attendancePct}%`])
    );
    downloadCSV(csv, `mastery_grade_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const exportRisk = () => {
    const csv = makeCSV(
      ["Name", "Phone", "Grade", "Mentor", "Classes Attended", "Total Classes", "Attendance %"],
      riskStudents.map(s => [s.name, s.phone, s.grade, s.mentorName, s.present, s.total, `${s.attendancePct}%`])
    );
    downloadCSV(csv, `mastery_risk_students_${new Date().toISOString().slice(0, 10)}.csv`);
  };
  const exportAll = () => {
    exportMentor(); exportGrade(); exportRisk();
  };

  const kpis = [
    { label: "Today's Attendance",  value: `${overview?.todayPct ?? 0}%`,      icon: Calendar,   color: "#3B82F6", bg: "#DBEAFE", trend: null },
    { label: "Weekly Attendance",   value: `${overview?.weeklyPct ?? 0}%`,     icon: TrendingUp, color: GREEN,     bg: "#DCFCE7", trend: null },
    { label: "Monthly Attendance",  value: `${overview?.monthlyPct ?? 0}%`,    icon: BarChart3,  color: "#7C3AED", bg: "#F5F3FF", trend: null },
    { label: "Below 75%",           value: overview?.below75 ?? 0,             icon: AlertTriangle, color: ORANGE, bg: "#FFF7ED", trend: null },
    { label: "Chronic Absentees",   value: overview?.chronic ?? 0,             icon: XCircle,   color: "#EF4444", bg: "#FEE2E2", trend: null },
    { label: "Classes Conducted",   value: overview?.classesConducted ?? 0,    icon: CheckCircle, color: GREEN,   bg: "#DCFCE7", trend: null },
    { label: "Classes Missed",      value: overview?.classesMissed ?? 0,       icon: BookOpen,   color: "#6B7280", bg: "#F3F4F6", trend: null },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-black" style={{ color: NAVY }}>Attendance Analytics</h1>
          <p className="text-xs text-gray-500">Mastery student attendance tracking, risk analysis and reports</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all">
            <Download className="w-3.5 h-3.5 text-green-500" /> Export All
          </button>
          <button onClick={load}
            className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
          {DAYS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setDays(o.value)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
              style={days === o.value ? { background: NAVY, color: "white" } : { color: "#6B7280" }}>
              {o.label}
            </button>
          ))}
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
          <option value="all">Grade: All</option>
          {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>Grade {g}</option>)}
        </select>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search mentor / student…"
            className="pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 w-44" />
        </div>
        <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
          <span>Risk threshold:</span>
          <select value={riskThreshold} onChange={e => setRiskThreshold(Number(e.target.value))}
            className="px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white outline-none">
            <option value={75}>Below 75%</option>
            <option value={60}>Below 60%</option>
            <option value={50}>Below 50%</option>
          </select>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-1.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: k.bg }}>
              <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
            </div>
            <div className="text-sm font-black leading-none" style={{ color: k.color }}>
              {loading ? "—" : k.value}
            </div>
            <div className="text-[10px] text-gray-500 font-medium leading-tight">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Daily / Weekly trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black" style={{ color: NAVY }}>Attendance Trend</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Daily present vs absent</p>
            </div>
            <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5">
              {(["daily", "weekly"] as const).map(c => (
                <button key={c} onClick={() => setActiveChart(c)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all"
                  style={activeChart === c ? { background: NAVY, color: "white" } : { color: "#6B7280" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : activeChart === "daily" ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} interval={2} />
                <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="Present" fill={GREEN} radius={[2, 2, 0, 0]} maxBarSize={20} />
                <Bar dataKey="Absent" fill="#FCA5A5" radius={[2, 2, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Line dataKey="Rate" name="Rate" stroke={NAVY} strokeWidth={2} dot={{ r: 3, fill: NAVY }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          {activeChart === "daily" && (
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><div className="w-3 h-3 rounded" style={{ background: GREEN }} /> Present</div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><div className="w-3 h-3 rounded" style={{ background: "#FCA5A5" }} /> Absent</div>
            </div>
          )}
        </div>

        {/* Attendance % area chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="mb-4">
            <h3 className="text-sm font-black" style={{ color: NAVY }}>Attendance Rate Over Time</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Weekly percentage trend</p>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={NAVY} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area dataKey="Rate" name="Rate" stroke={NAVY} strokeWidth={2} fill="url(#attendGrad)" dot={{ r: 3, fill: NAVY }} />
                {/* 75% reference line indicator */}
              </AreaChart>
            </ResponsiveContainer>
          )}
          {/* Summary stat */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Today", value: `${overview?.todayPct ?? 0}%`, color: "#3B82F6" },
              { label: "This Week", value: `${overview?.weeklyPct ?? 0}%`, color: GREEN },
              { label: "This Month", value: `${overview?.monthlyPct ?? 0}%`, color: "#7C3AED" },
            ].map(s => (
              <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "#F8FAFF" }}>
                <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-gray-400 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mentor / Grade Tables ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-0 border-b border-gray-100">
          <div className="flex gap-1">
            {(["mentor", "grade"] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 capitalize transition-all ${activeSection === s ? "border-blue-600 text-blue-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                {s === "mentor" ? "👤 Mentor-wise" : "📊 Grade-wise"}
              </button>
            ))}
          </div>
          <button onClick={activeSection === "mentor" ? exportMentor : exportGrade}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 mb-1">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          {activeSection === "mentor" ? (
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                <tr>
                  {["Mentor", "Students", "Daily", "Weekly", "Monthly", "Below 75%", "Attendance Rate", "Actions"].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-300" /></td></tr>
                ) : filteredMentors.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No mentor data available</td></tr>
                ) : filteredMentors.map(m => (
                  <tr key={m.mentorId} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: NAVY }}>
                          {m.mentorName?.[0] ?? "?"}
                        </div>
                        <span className="font-bold text-gray-800">{m.mentorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{m.students}</td>
                    <td className="px-4 py-3"><PctBar pct={m.attendancePct} color="#3B82F6" /></td>
                    <td className="px-4 py-3"><PctBar pct={m.attendancePct} color={GREEN} /></td>
                    <td className="px-4 py-3"><PctBar pct={m.attendancePct} color="#7C3AED" /></td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-black ${m.belowThreshold > 0 ? "text-red-500" : "text-gray-300"}`}>
                        {m.belowThreshold}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${m.attendancePct}%`,
                            background: m.attendancePct >= 75 ? GREEN : m.attendancePct >= 60 ? ORANGE : "#EF4444"
                          }} />
                        </div>
                        <span className="font-black text-xs w-10" style={{ color: m.attendancePct >= 75 ? GREEN : m.attendancePct >= 60 ? ORANGE : "#EF4444" }}>
                          {m.attendancePct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                <tr>
                  {["Grade", "Students", "Daily Attendance", "Weekly Attendance", "Monthly Attendance", "Rate", "Actions"].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-300" /></td></tr>
                ) : filteredGrades.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No grade data available</td></tr>
                ) : filteredGrades.map(g => (
                  <tr key={g.grade} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: "#EEF2FF", color: NAVY }}>
                          G{g.grade}
                        </div>
                        <span className="font-bold text-gray-800">Grade {g.grade}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{g.students}</td>
                    <td className="px-4 py-3"><PctBar pct={g.attendancePct} color="#3B82F6" /></td>
                    <td className="px-4 py-3"><PctBar pct={g.attendancePct} color={GREEN} /></td>
                    <td className="px-4 py-3"><PctBar pct={g.attendancePct} color="#7C3AED" /></td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-black" style={{ color: g.attendancePct >= 75 ? GREEN : g.attendancePct >= 60 ? ORANGE : "#EF4444" }}>
                        {g.attendancePct}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                        <Eye className="w-3 h-3" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Risk Panel ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-red-50" style={{ background: "#FFF5F5" }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <div>
              <h3 className="text-sm font-black text-red-700">At-Risk Students</h3>
              <p className="text-[10px] text-red-400">Students below {riskThreshold}% attendance threshold</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black text-red-600" style={{ background: "#FEE2E2" }}>
              {filteredRisk.length} students
            </span>
            <button onClick={exportRisk} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Student", "Grade", "Mentor", "Classes Attended", "Attendance", "Risk Level", "Actions"].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-300" /></td></tr>
              ) : filteredRisk.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-300" />
                    <div className="text-sm font-bold text-gray-400">No at-risk students</div>
                    <div className="text-xs text-gray-300">All students are above the {riskThreshold}% threshold</div>
                  </td>
                </tr>
              ) : filteredRisk.map(s => (
                <tr key={s.masteryId} className="border-b border-gray-50 hover:bg-red-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: "#EF4444" }}>
                        {s.name?.[0] ?? "?"}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{s.name}</div>
                        <div className="text-gray-400 text-[10px]">{s.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "#EEF2FF", color: NAVY }}>G{s.grade}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.mentorName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-700">{s.present}</span>
                    <span className="text-gray-400"> / {s.total}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PctBar pct={s.attendancePct} color={s.attendancePct < 50 ? "#DC2626" : s.attendancePct < 60 ? "#D97706" : ORANGE} />
                  </td>
                  <td className="px-4 py-3"><RiskBadge pct={s.attendancePct} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-600 hover:bg-gray-50">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-200 text-[10px] font-semibold text-orange-600 hover:bg-orange-50">
                        <Phone className="w-3 h-3" /> Contact
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 text-[10px] font-semibold text-blue-600 hover:bg-blue-50">
                        <Clock className="w-3 h-3" /> Follow-up
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Download Center ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-black mb-3" style={{ color: NAVY }}>📥 Download Reports</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {[
            { label: "Daily Report",       action: () => { const d = (overview?.trend ?? []).slice(-1); downloadCSV(makeCSV(["Date","Present","Absent","Rate"], d.map(x => [x.date, x.present, x.absent, `${x.rate}%`])), "daily_attendance.csv"); } },
            { label: "Weekly Report",      action: () => { downloadCSV(makeCSV(["Week","Rate","Present","Absent"], (overview?.weekly ?? []).map(w => [w.week, `${w.rate}%`, w.present, w.absent])), "weekly_attendance.csv"); } },
            { label: "Monthly Report",     action: () => { downloadCSV(makeCSV(["Date","Present","Absent","Rate"], (overview?.trend ?? []).map(t => [t.date, t.present, t.absent, `${t.rate}%`])), "monthly_attendance.csv"); } },
            { label: "Mentor-wise Report", action: exportMentor },
            { label: "Grade-wise Report",  action: exportGrade },
            { label: "Student Risk Report",action: exportRisk },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-all text-left">
              <Download className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="leading-tight">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
