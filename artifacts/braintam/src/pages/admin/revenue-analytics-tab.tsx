import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, Users, DollarSign, RefreshCw, Download,
  Loader2, AlertTriangle, ChevronDown, Lightbulb,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY  = "#0B2B6B";
const ORANGE = "#FF6B1A";

const GRADE_PALETTE = [
  "#6366F1","#3B82F6","#10B981","#F59E0B","#EF4444",
  "#8B5CF6","#EC4899","#14B8A6","#F97316","#84CC16",
];

// ── helpers ──────────────────────────────────────────────────────────────────
function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });
}

function rs(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function rsShort(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
}
function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Kpis = {
  totalRevenue: number; igniteRevenue: number; masteryRevenue: number;
  totalAdmissions: number; demoPaidStudents: number; masteryConversions: number;
  conversionRate: number; avgRevenuePerAdmission: number;
};
type FunnelStage = { stage: string; count: number; pct: number };
type TrendPoint = { month: string; fullMonth: string; revenue: number; admissions: number; leads: number; demoPaid: number; converted: number };
type GradeRow = { grade: number; leads: number; demoPaid: number; demoAttended: number; converted: number; admissions: number; revenue: number; conversionPct: number };
type MentorRow = { mentor: string; assignedLeads: number; demoPaid: number; converted: number; admissions: number; revenue: number; conversionRate: number };
type CourseRow = { course: string; grade: number; admissions: number; students: number; revenue: number; conversionPct: number };
type RevBreakdown = { grade: number; revenue: number; pct: number };
type Conversion = { id: number; studentName: string; grade: number; mentorName: string | null; coursePlan: string | null; amount: number; date: string; source: string };
type Data = {
  kpis: Kpis; funnel: FunnelStage[]; trendData: TrendPoint[];
  gradePerformance: GradeRow[]; mentorPerformance: MentorRow[];
  coursePerformance: CourseRow[]; revenueBreakdown: RevBreakdown[];
  recentConversions: Conversion[]; insights: string[];
  period: { from: string; to: string };
};

// ── Date presets ──────────────────────────────────────────────────────────────
type Preset = { label: string; from: Date; to: Date };
function presets(): Preset[] {
  const today = new Date();
  const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c; };
  const mon = new Date(today); mon.setDate(today.getDate() - today.getDay() + 1); mon.setHours(0,0,0,0);
  return [
    { label: "Today",      from: startOfDay(today), to: today },
    { label: "This Week",  from: mon, to: today },
    { label: "This Month", from: new Date(today.getFullYear(), today.getMonth(), 1), to: today },
    { label: "This Year",  from: new Date(today.getFullYear(), 0, 1), to: today },
    { label: "All Time",   from: new Date(2024, 0, 1), to: today },
  ];
}

// ── Main component ────────────────────────────────────────────────────────────
export function RevenueAnalyticsTab() {
  const ps = presets();
  const [activePreset, setActivePreset] = useState(2); // This Month
  const [from, setFrom] = useState(toInputDate(ps[2].from));
  const [to,   setTo]   = useState(toInputDate(ps[2].to));
  const [showCustom, setShowCustom] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    apiFetch(`/admin/admissions-analytics?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function applyPreset(idx: number) {
    const p = ps[idx];
    setActivePreset(idx);
    setFrom(toInputDate(p.from));
    setTo(toInputDate(p.to));
    setShowCustom(false);
  }

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-5">
      <SkeletonHeader />
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_,i) => <SkeletonCard key={i}/>)}</div>
      <div className="grid md:grid-cols-2 gap-4">{[...Array(2)].map((_,i) => <SkeletonChart key={i}/>)}</div>
      <div className="grid md:grid-cols-2 gap-4">{[...Array(2)].map((_,i) => <SkeletonTable key={i}/>)}</div>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-500">{error ?? "Failed to load analytics"}</p>
      <button onClick={load} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>Retry</button>
    </div>
  );

  const { kpis, funnel, trendData, gradePerformance, mentorPerformance, coursePerformance, revenueBreakdown, recentConversions, insights } = data;
  const funnelMax = funnel[0]?.count || 1;

  // Donut chart label
  const RADIAN = Math.PI / 180;
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; pct: number; [k: string]: number }) => {
    if (pct < 5) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 10, fontWeight: 700 }}>{pct}%</text>;
  };

  function exportCSV() {
    const rows = [
      ["Student","Grade","Mentor","Course","Amount","Date"],
      ...recentConversions.map(c => [c.studentName, `Grade ${c.grade}`, c.mentorName??"-", c.coursePlan??"-", String(c.amount), fmtDate(c.date)]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `admissions-analytics-${from}-${to}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Revenue &amp; Admissions Analytics</h2>
          <p className="text-xs text-gray-500">Track admissions performance, conversions, and revenue insights across all grades and courses.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date presets */}
          <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {ps.filter((_,i) => i < 4).map((p, i) => (
              <button key={p.label} onClick={() => applyPreset(i)}
                className={`px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap border-r border-gray-200 last:border-0 transition-colors ${activePreset === i ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                style={activePreset === i ? { background: NAVY } : {}}>
                {p.label}
              </button>
            ))}
            <button onClick={() => { setShowCustom(v => !v); setActivePreset(-1); }}
              className={`px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 transition-colors ${activePreset === -1 ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
              style={activePreset === -1 ? { background: NAVY } : {}}>
              Custom <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {showCustom && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-[11px] outline-none" />
              <span className="text-gray-400 text-[11px]">→</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-[11px] outline-none" />
            </div>
          )}
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white shadow-sm" style={{ background: NAVY }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Revenue",          value: rsShort(kpis.totalRevenue),           sub: `Ignite + Mastery`, icon: DollarSign,    bg: "#DBEAFE", clr: "#2563EB" },
          { label: "Total Admissions",        value: kpis.totalAdmissions,                 sub: `+${kpis.totalAdmissions} this period`, icon: Users, bg: "#D1FAE5", clr: "#059669" },
          { label: "Demo Paid Students",      value: kpis.demoPaidStudents,                sub: "Paid for demo",   icon: TrendingUp,    bg: "#FEF3C7", clr: "#D97706" },
          { label: "Mastery Conversions",     value: kpis.masteryConversions,              sub: "Ignite → Mastery",icon: ArrowUpRight,  bg: "#EDE9FE", clr: "#7C3AED" },
          { label: "Conversion Rate",         value: `${kpis.conversionRate}%`,            sub: "Demo → Mastery",  icon: TrendingUp,    bg: "#FFE4E6", clr: "#E11D48" },
          { label: "Avg Revenue / Admission", value: kpis.avgRevenuePerAdmission > 0 ? rsShort(kpis.avgRevenuePerAdmission) : "—", sub: "Per student", icon: DollarSign, bg: "#FEF9C3", clr: "#CA8A04" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: k.bg }}>
                <k.icon className="w-4 h-4" style={{ color: k.clr }} />
              </div>
            </div>
            <div className="text-xl font-black leading-tight truncate" style={{ color: NAVY }}>{k.value}</div>
            <div className="text-[10px] font-semibold text-gray-500 mt-0.5 truncate leading-tight">{k.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Admissions Funnel + Quick Insights ── */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* Funnel */}
        <div className="md:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownRight className="w-4 h-4" style={{ color: ORANGE }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Admissions Funnel</h3>
            <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Conversion</span>
            <span className="text-[10px] text-gray-400">Drop-off</span>
          </div>
          {funnel.every(f => f.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">No admissions data for this period.</div>
          ) : (
            <div className="space-y-2.5">
              {funnel.map((f, i) => {
                const barW = Math.max(funnelMax > 0 ? (f.count / funnelMax) * 100 : 0, 2);
                const dropOff = i < funnel.length - 1 && funnel[i].count > 0
                  ? Math.round(((funnel[i].count - funnel[i + 1].count) / funnel[i].count) * 100)
                  : null;
                const stageColors = ["#3B82F6","#6366F1","#8B5CF6","#F59E0B","#10B981"];
                return (
                  <div key={f.stage} className="flex items-center gap-3">
                    <div className="w-24 text-[11px] font-semibold text-gray-600 shrink-0 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stageColors[i] }} />
                      {f.stage}
                    </div>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden bg-gray-100 relative">
                      <div className="h-full rounded-lg flex items-center px-2 transition-all"
                        style={{ width: `${barW}%`, background: stageColors[i] }}>
                        <span className="text-white text-[10px] font-bold truncate">{f.count.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    <div className="w-12 text-right shrink-0 text-[10px] font-semibold" style={{ color: stageColors[i] }}>{f.pct}%</div>
                    <div className="w-10 text-right shrink-0 text-[10px] text-gray-400">
                      {dropOff !== null ? <span className="text-red-400">{dropOff}%</span> : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Insights */}
        <div className="md:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4" style={{ color: ORANGE }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Quick Insights</h3>
            <span className="ml-auto text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold border border-orange-100">Live Data</span>
          </div>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                  style={{ background: [NAVY, ORANGE, "#7C3AED", "#059669", "#D97706"][i % 5] }}>
                  {i + 1}
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
          {/* Summary footer */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-black" style={{ color: NAVY }}>{rsShort(kpis.totalRevenue)}</div>
              <div className="text-[9px] text-gray-400">Total Revenue</div>
              <div className="text-[9px] text-green-600 font-semibold flex items-center justify-center gap-0.5">
                <TrendingUp className="w-2.5 h-2.5" /> {kpis.conversionRate}%
              </div>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="text-lg font-black" style={{ color: NAVY }}>{kpis.totalAdmissions}</div>
              <div className="text-[9px] text-gray-400">Total Admissions</div>
              <div className="text-[9px] text-blue-600 font-semibold">+{kpis.totalAdmissions} admitted</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-black" style={{ color: NAVY }}>{funnel[0]?.count.toLocaleString("en-IN") ?? 0}</div>
              <div className="text-[9px] text-gray-400">Total Leads</div>
              <div className="text-[9px] text-purple-600 font-semibold">{kpis.demoPaidStudents} Demo Paid</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Revenue Trend + Admissions Trend ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Revenue Trend</h3>
            <span className="text-[10px] text-gray-400 ml-auto">₹ in Lakhs</span>
          </div>
          {trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">No data available for selected period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ORANGE} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(0)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} width={36} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(v: number, name: string) => [name === "revenue" ? rs(v) : v, name === "revenue" ? "Revenue (₹)" : "Admissions"]}
                  labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullMonth ?? ""} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke={ORANGE} strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="admissions" name="Admissions" stroke="#6366F1" strokeWidth={2} fill="url(#admGrad)" dot={{ r: 3, fill: "#6366F1", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Admissions Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4" style={{ color: "#6366F1" }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Admissions Trend</h3>
            <span className="text-[10px] text-gray-400 ml-auto">Monthly</span>
          </div>
          {trendData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">No data available for selected period.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke={NAVY} strokeWidth={2} dot={{ r: 3, fill: NAVY }} />
                <Line type="monotone" dataKey="demoPaid" name="Demo Paid" stroke={ORANGE} strokeWidth={2} dot={{ r: 3, fill: ORANGE }} />
                <Line type="monotone" dataKey="converted" name="Converted" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Grade Performance + Mentor Performance ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Grade Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Grade Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2 text-right">Leads</th>
                  <th className="px-3 py-2 text-right">Demo Paid</th>
                  <th className="px-3 py-2 text-right">Attended</th>
                  <th className="px-3 py-2 text-right">Converted</th>
                  <th className="px-3 py-2 text-right">Revenue (₹)</th>
                  <th className="px-3 py-2 text-right">Conv %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gradePerformance.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No admissions data available.</td></tr>
                ) : gradePerformance.map(g => (
                  <tr key={g.grade} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: GRADE_PALETTE[(g.grade - 1) % GRADE_PALETTE.length] }} />
                        <span className="font-semibold" style={{ color: NAVY }}>Grade {g.grade}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{g.leads.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{g.demoPaid.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{g.demoAttended.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{g.converted.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: NAVY }}>{rsShort(g.revenue)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${g.conversionPct >= 20 ? "bg-green-50 text-green-700" : g.conversionPct >= 10 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                        {g.conversionPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {gradePerformance.length > 0 && (
            <div className="px-5 py-2 border-t border-gray-100 text-[10px] text-gray-400">
              Showing all {gradePerformance.length} grade{gradePerformance.length !== 1 ? "s" : ""} →
            </div>
          )}
        </div>

        {/* Mentor Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Mentor Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Mentor</th>
                  <th className="px-3 py-2 text-right">Leads</th>
                  <th className="px-3 py-2 text-right">Demo Paid</th>
                  <th className="px-3 py-2 text-right">Converted</th>
                  <th className="px-3 py-2 text-right">Revenue (₹)</th>
                  <th className="px-3 py-2 text-right">Conv %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mentorPerformance.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No mentor conversions yet.</td></tr>
                ) : mentorPerformance.map((m, i) => (
                  <tr key={m.mentor} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ background: GRADE_PALETTE[i % GRADE_PALETTE.length] }}>
                          {m.mentor.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-700 truncate max-w-[90px]">{m.mentor}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.assignedLeads}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.demoPaid}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{m.converted}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: NAVY }}>{rsShort(m.revenue)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${m.conversionRate >= 15 ? "bg-green-50 text-green-700" : m.conversionRate >= 8 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                        {m.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mentorPerformance.length > 0 && (
            <div className="px-5 py-2 border-t border-gray-100 text-[10px] text-gray-400">
              View all mentors →
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Course Performance + Revenue Breakdown ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Course Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Course Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase font-semibold text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">Course</th>
                  <th className="px-3 py-2 text-right">Grade</th>
                  <th className="px-3 py-2 text-right">Admissions</th>
                  <th className="px-3 py-2 text-right">Students</th>
                  <th className="px-3 py-2 text-right">Revenue (₹)</th>
                  <th className="px-3 py-2 text-right">Conv %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coursePerformance.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No course data available.</td></tr>
                ) : coursePerformance.map((c, i) => (
                  <tr key={`${c.course}-${c.grade}-${i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-semibold text-gray-700 max-w-[120px] truncate" title={c.course}>{c.course}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">G{c.grade}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{c.admissions}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{c.students}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: NAVY }}>{rsShort(c.revenue)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${c.conversionPct >= 25 ? "bg-green-50 text-green-700" : c.conversionPct >= 10 ? "bg-yellow-50 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.conversionPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {coursePerformance.length > 0 && (
            <div className="px-5 py-2 border-t border-gray-100 text-[10px] text-gray-400">
              View all courses →
            </div>
          )}
        </div>

        {/* Revenue Breakdown donut */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" style={{ color: "#6366F1" }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Revenue Breakdown</h3>
            <span className="ml-auto text-[10px] text-gray-400">By Grade</span>
          </div>
          {revenueBreakdown.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">Revenue data will appear after payments are approved.</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <PieChart width={170} height={170}>
                  <Pie
                    data={revenueBreakdown}
                    cx={80} cy={80}
                    innerRadius={48} outerRadius={78}
                    dataKey="revenue"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {revenueBreakdown.map((_, i) => (
                      <Cell key={i} fill={GRADE_PALETTE[i % GRADE_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v: number, _n, p) => [rs(v), `Grade ${p.payload.grade}`]} />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-sm font-black" style={{ color: NAVY }}>{rsShort(kpis.totalRevenue)}</div>
                  <div className="text-[9px] text-gray-400">Total Revenue</div>
                </div>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                {revenueBreakdown.map((r, i) => (
                  <div key={r.grade} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: GRADE_PALETTE[i % GRADE_PALETTE.length] }} />
                    <span className="text-[10px] text-gray-600 shrink-0">Grade {r.grade}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: GRADE_PALETTE[i % GRADE_PALETTE.length] }} />
                    </div>
                    <span className="text-[10px] font-semibold shrink-0" style={{ color: NAVY }}>{rsShort(r.revenue)}</span>
                    <span className="text-[9px] text-gray-400 shrink-0">({r.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Recent Conversions ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
          <Users className="w-4 h-4" style={{ color: NAVY }} />
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>Recent Conversions</h3>
          <span className="ml-auto text-[10px] text-gray-400">Last {recentConversions.length} admissions in period</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-left">Grade</th>
                <th className="px-4 py-2 text-left">Mentor</th>
                <th className="px-4 py-2 text-left">Course</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentConversions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No recent conversions.</td></tr>
              ) : recentConversions.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ background: GRADE_PALETTE[(c.grade - 1) % GRADE_PALETTE.length] }}>
                        {c.studentName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-700">{c.studentName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">G{c.grade}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{c.mentorName ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[120px] truncate" title={c.coursePlan ?? ""}>{c.coursePlan ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right font-bold" style={{ color: NAVY }}>
                    {c.amount > 0 ? rs(c.amount) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(c.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2 border-t border-gray-100 text-[10px] text-gray-400">
          All data is real-time and updated on refresh. Last updated: {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton components ────────────────────────────────────────────────────────
function SkeletonHeader() {
  return (
    <div className="flex justify-between items-start gap-3 animate-pulse">
      <div className="space-y-2"><div className="h-5 w-64 bg-gray-200 rounded" /><div className="h-3 w-80 bg-gray-100 rounded" /></div>
      <div className="flex gap-2"><div className="h-8 w-64 bg-gray-200 rounded-xl" /><div className="h-8 w-20 bg-gray-200 rounded-xl" /></div>
    </div>
  );
}
function SkeletonCard() {
  return <div className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse h-24 space-y-2"><div className="h-8 w-8 bg-gray-200 rounded-xl" /><div className="h-5 w-16 bg-gray-200 rounded" /><div className="h-3 w-20 bg-gray-100 rounded" /></div>;
}
function SkeletonChart() {
  return <div className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse h-52"><div className="h-4 w-40 bg-gray-200 rounded mb-4" /><div className="h-36 bg-gray-100 rounded-xl" /></div>;
}
function SkeletonTable() {
  return <div className="bg-white rounded-2xl border border-gray-100 animate-pulse overflow-hidden"><div className="h-12 bg-gray-50 border-b border-gray-100" />{[...Array(5)].map((_,i) => <div key={i} className="h-10 border-b border-gray-50 mx-4 my-1 bg-gray-100 rounded" />)}</div>;
}
