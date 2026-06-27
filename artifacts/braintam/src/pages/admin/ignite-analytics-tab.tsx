import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Users, Video, RefreshCw, Download, Search, Filter, ChevronDown, ChevronUp, Award, Star, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

import { API_BASE as BASE } from "@/lib/api-base";
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
  });
}

interface IgniteAnalytics {
  kpis: {
    leads: { lifetime: number; thisMonth: number; thisWeek: number; lastMonth: number };
    conversions: { lifetime: number; thisMonth: number; thisWeek: number; lastMonth: number };
    classes: { lifetime: number; thisMonth: number; thisWeek: number; lastMonth: number };
    conversionPct: { overall: number; monthly: number; weekly: number };
  };
  funnel: { stage: string; count: number; color: string }[];
  gradeWise: { grade: number; leads: number; converted: number; conversionPct: number }[];
  teacherImpact: { teacher: string; classes: number; students: number; conversions: number; conversionPct: number }[];
  counselorPerf: { counselor: string; leads: number; converted: number; conversionPct: number }[];
  mentorLeaderboard: {
    mentor: string; leads: number; converted: number; conversionPct: number;
    grades: { grade: number; leads: number; converted: number; conversionPct: number }[];
  }[];
  gradeLeaderboard: {
    grade: number; leads: number; converted: number; conversionPct: number;
    topMentor: string; topMentorPct: number;
    mentors: { mentor: string; leads: number; converted: number; conversionPct: number }[];
  }[];
  trend: { month: string; leads: number; conversions: number; classes: number }[];
  leadStage: { stage: string; count: number }[];
  recentLeads: {
    id: number; studentName: string; grade: number | null; phone: string | null;
    parentPhone: string | null; enrolledAt: string | null; enrollmentStatus: string;
    lastDayAttended: number | null; assignedMentorName: string | null; leadStage: string | null;
    interestLevel: string | null; batchTitle: string; teacherName: string | null;
  }[];
}

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}

const STAGE_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#22C55E", "#EF4444", "#EC4899", "#14B8A6", "#6B7280"];
const STATUS_COLOR: Record<string, string> = {
  converted: "bg-green-100 text-green-700",
  dropped: "bg-red-100 text-red-700",
  active: "bg-blue-100 text-blue-700",
};

export function IgniteAnalyticsTab() {
  const [data, setData] = useState<IgniteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"overview" | "leads" | "funnel" | "grade" | "teacher" | "counselor" | "mentor">("overview");
  const [expandedMentor, setExpandedMentor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trendView, setTrendView] = useState<"leads" | "conversions" | "classes">("leads");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/ignite/analytics");
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading Ignite Analytics…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center py-32">
      <p className="text-sm text-red-400">Failed to load Ignite Analytics.</p>
    </div>
  );

  const { kpis, funnel, gradeWise, teacherImpact, counselorPerf, mentorLeaderboard, gradeLeaderboard, trend, leadStage, recentLeads } = data;

  // Filtered leads
  const filteredLeads = recentLeads.filter(l => {
    if (gradeFilter !== "all" && String(l.grade) !== gradeFilter) return false;
    if (statusFilter !== "all" && l.enrollmentStatus !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.studentName ?? "").toLowerCase().includes(q) ||
        (l.batchTitle ?? "").toLowerCase().includes(q) ||
        (l.assignedMentorName ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const topGrade = [...gradeWise].sort((a, b) => b.conversionPct - a.conversionPct)[0];
  const weakGrade = [...gradeWise].sort((a, b) => a.conversionPct - b.conversionPct)[0];
  const topTeacher = teacherImpact[0];
  const weakTeacher = teacherImpact[teacherImpact.length - 1];
  const topCounselor = counselorPerf[0];
  const weakCounselor = counselorPerf[counselorPerf.length - 1];

  const maxFunnel = funnel[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Ignite Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time performance overview of Ignite Program · Ignite data only</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => exportCSV("ignite-leads.csv", filteredLeads.map(l => ({
              Name: l.studentName, Grade: l.grade, Phone: l.phone, Parent: l.parentPhone,
              Batch: l.batchTitle, Teacher: l.teacherName, Counselor: l.assignedMentorName,
              Status: l.enrollmentStatus, LeadStage: l.leadStage, DaysAttended: l.lastDayAttended,
              EnrolledAt: l.enrolledAt,
            })))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: ORANGE }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {([
          { id: "overview", label: "Overview" },
          { id: "leads", label: "Leads" },
          { id: "funnel", label: "Funnel" },
          { id: "grade", label: "Grade-wise" },
          { id: "teacher", label: "Teachers" },
          { id: "counselor", label: "Counselors" },
          { id: "mentor", label: "Mentors" },
        ] as const).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeSection === s.id ? "bg-white shadow-sm text-orange-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === "overview" && (
        <div className="space-y-5">
          {/* KPI rows */}
          {[
            {
              title: "Lead KPIs", color: "#3B82F6",
              cards: [
                { label: "Total Leads (Lifetime)", value: kpis.leads.lifetime, sub: "All time" },
                { label: "Leads This Month", value: kpis.leads.thisMonth, sub: "Current month" },
                { label: "Leads This Week", value: kpis.leads.thisWeek, sub: "Last 7 days" },
                { label: "Leads Last Month", value: kpis.leads.lastMonth, sub: "Previous month" },
              ],
            },
            {
              title: "Conversion KPIs", color: "#22C55E",
              cards: [
                { label: "Converted (Lifetime)", value: kpis.conversions.lifetime, sub: `${kpis.conversionPct.overall}% conversion` },
                { label: "Converted This Month", value: kpis.conversions.thisMonth, sub: `${kpis.conversionPct.monthly}% this month` },
                { label: "Converted This Week", value: kpis.conversions.thisWeek, sub: `${kpis.conversionPct.weekly}% this week` },
                { label: "Converted Last Month", value: kpis.conversions.lastMonth, sub: "Previous month" },
              ],
            },
            {
              title: "Class KPIs", color: ORANGE,
              cards: [
                { label: "Classes Conducted (Lifetime)", value: kpis.classes.lifetime, sub: "All completed sessions" },
                { label: "Classes This Month", value: kpis.classes.thisMonth, sub: "Current month" },
                { label: "Classes This Week", value: kpis.classes.thisWeek, sub: "Last 7 days" },
                { label: "Classes Last Month", value: kpis.classes.lastMonth, sub: "Previous month" },
              ],
            },
          ].map(row => (
            <div key={row.title}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{row.title}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {row.cards.map(card => (
                  <div key={card.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="text-lg font-black mb-0.5 leading-none" style={{ color: row.color }}>{card.value.toLocaleString()}</div>
                    <div className="text-[11px] font-semibold text-gray-600 leading-tight mt-0.5">{card.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
                    <button
                      onClick={() => setActiveSection("leads")}
                      className="text-[10px] font-semibold mt-1.5 hover:underline"
                      style={{ color: row.color }}
                    >View →</button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Conversion % rings */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Overall Conversion %", value: kpis.conversionPct.overall, num: kpis.conversions.lifetime, den: kpis.leads.lifetime },
              { label: "Monthly Conversion %", value: kpis.conversionPct.monthly, num: kpis.conversions.thisMonth, den: kpis.leads.thisMonth },
              { label: "Weekly Conversion %", value: kpis.conversionPct.weekly, num: kpis.conversions.thisWeek, den: kpis.leads.thisWeek },
            ].map(ring => (
              <div key={ring.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#22C55E" strokeWidth="12"
                      strokeDasharray={`${(ring.value / 100) * 251.2} 251.2`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-green-600">{ring.value}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-600 leading-tight">{ring.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{ring.num} / {ring.den}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>12-Month Trend</h3>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                {(["leads", "conversions", "classes"] as const).map(v => (
                  <button key={v} onClick={() => setTrendView(v)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors ${trendView === v ? "bg-white shadow-sm text-orange-600" : "text-gray-400"}`}
                  >{v}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey={trendView} stroke={trendView === "leads" ? "#3B82F6" : trendView === "conversions" ? "#22C55E" : ORANGE}
                  strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lead Stage + Top Performers row */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Lead Stage Distribution</h3>
              {leadStage.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={leadStage} dataKey="count" nameKey="stage" cx="50%" cy="50%" outerRadius={70} label={({ stage, percent }) => `${stage} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {leadStage.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {leadStage.slice(0, 5).map((s, i) => (
                      <div key={s.stage} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                          <span className="text-gray-600">{s.stage}</span>
                        </div>
                        <span className="font-bold" style={{ color: NAVY }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="text-center py-8 text-sm text-gray-400">No lead stage data yet</div>}
            </div>

            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>Top Performers</h3>
              {topGrade && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-green-700">Top Grade: Grade {topGrade.grade}</div>
                    <div className="text-[10px] text-green-600">{topGrade.conversionPct}% conversion · {topGrade.converted}/{topGrade.leads}</div>
                  </div>
                </div>
              )}
              {weakGrade && weakGrade !== topGrade && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                  <div className="w-8 h-8 rounded-full bg-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-red-700">Weakest Grade: Grade {weakGrade.grade}</div>
                    <div className="text-[10px] text-red-500">{weakGrade.conversionPct}% conversion · {weakGrade.converted}/{weakGrade.leads}</div>
                  </div>
                </div>
              )}
              {topTeacher && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-700">Top Teacher: {topTeacher.teacher}</div>
                    <div className="text-[10px] text-blue-600">{topTeacher.conversionPct}% conversion · {topTeacher.classes} classes</div>
                  </div>
                </div>
              )}
              {topCounselor && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-purple-700">Top Counselor: {topCounselor.counselor}</div>
                    <div className="text-[10px] text-purple-600">{topCounselor.conversionPct}% conversion · {topCounselor.converted}/{topCounselor.leads}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LEADS ── */}
      {activeSection === "leads" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Leads (Lifetime)", value: kpis.leads.lifetime, color: "#3B82F6" },
              { label: "This Month", value: kpis.leads.thisMonth, color: "#8B5CF6" },
              { label: "This Week", value: kpis.leads.thisWeek, color: ORANGE },
              { label: "Last Month", value: kpis.leads.lastMonth, color: NAVY },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
                <div className="text-lg font-black" style={{ color: c.color }}>{c.value}</div>
                <div className="text-[11px] text-gray-500 font-medium mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Leads trend */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Monthly Leads Trend</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#3B82F6" radius={[4,4,0,0]} name="Leads" />
                <Bar dataKey="conversions" fill="#22C55E" radius={[4,4,0,0]} name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Filters + table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input placeholder="Search name, batch, counselor…" value={search} onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </div>
              <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                <option value="all">All Grades</option>
                {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="converted">Converted</option>
                <option value="dropped">Dropped</option>
              </select>
              <button onClick={() => exportCSV("ignite-leads.csv", filteredLeads.map(l => ({
                Name: l.studentName, Grade: l.grade, Phone: l.phone, Batch: l.batchTitle,
                Teacher: l.teacherName, Counselor: l.assignedMentorName, Status: l.enrollmentStatus,
                LeadStage: l.leadStage, DaysAttended: l.lastDayAttended,
              })))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: ORANGE }}
              ><Download className="w-3 h-3" /> CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold">
                    {["Student", "Grade", "Phone", "Batch", "Teacher", "Counselor", "Days Att.", "Lead Stage", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeads.slice(0, 30).map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>{l.studentName}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.grade ? `Grade ${l.grade}` : "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[140px] truncate">{l.batchTitle}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.teacherName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.assignedMentorName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{l.lastDayAttended ?? 0}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.leadStage ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLOR[l.enrollmentStatus] ?? "bg-gray-100 text-gray-600"}`}>
                          {l.enrollmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLeads.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No leads match your filters</div>}
              {filteredLeads.length > 30 && (
                <div className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
                  Showing 30 of {filteredLeads.length} leads. Export CSV for full data.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FUNNEL ── */}
      {activeSection === "funnel" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-6" style={{ color: NAVY }}>Ignite Conversion Funnel (Lifetime)</h3>
            <div className="space-y-4">
              {funnel.map((stage, i) => {
                const width = maxFunnel > 0 ? Math.max(20, (stage.count / maxFunnel) * 100) : 20;
                const dropOff = i > 0 && funnel[i - 1].count > 0
                  ? (100 - (stage.count / funnel[i - 1].count) * 100).toFixed(1) : null;
                return (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="w-36 text-right text-xs font-semibold text-gray-600">{stage.stage}</div>
                    <div className="flex-1 relative">
                      <div className="h-10 rounded-xl flex items-center px-4 text-white text-sm font-black transition-all duration-500"
                        style={{ background: stage.color, width: `${width}%`, minWidth: 80 }}>
                        {stage.count.toLocaleString()}
                      </div>
                    </div>
                    {dropOff && (
                      <div className="w-28 text-xs text-red-500 font-semibold">↓ {dropOff}% drop-off</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-8 flex-wrap">
              <div className="text-center">
                <div className="text-xl font-black text-green-600">{kpis.conversionPct.overall}%</div>
                <div className="text-xs text-gray-400">Overall Conversion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-blue-600">{funnel[1]?.count ?? 0}</div>
                <div className="text-xs text-gray-400">Attended at Least 1 Class</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-purple-600">{funnel[2]?.count ?? 0}</div>
                <div className="text-xs text-gray-400">Interested / High Intent</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-green-600">{funnel[3]?.count ?? 0}</div>
                <div className="text-xs text-gray-400">Final Conversions</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Conversion % Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, n: string) => [n === "leads" ? v : n === "conversions" ? v : v, n]} />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Leads" />
                <Line type="monotone" dataKey="conversions" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── GRADE-WISE ── */}
      {activeSection === "grade" && (
        <div className="space-y-4">
          {topGrade && weakGrade && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center"><Star className="w-4 h-4 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-green-700">🏆 Top Performing Grade</div>
                  <div className="text-lg font-black text-green-600">Grade {topGrade.grade}</div>
                  <div className="text-xs text-green-500">{topGrade.conversionPct}% conversion · {topGrade.converted}/{topGrade.leads} leads</div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-400 flex items-center justify-center"><AlertTriangle className="w-3.5 h-3.5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-red-600">⚠️ Needs Attention</div>
                  <div className="text-lg font-black text-red-500">Grade {weakGrade.grade}</div>
                  <div className="text-xs text-red-400">{weakGrade.conversionPct}% conversion · {weakGrade.converted}/{weakGrade.leads} leads</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Grade-wise Conversion</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeWise.map(g => ({ ...g, grade: `Gr ${g.grade}` }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="grade" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="leads" fill="#3B82F6" radius={[4,4,0,0]} name="Leads" />
                <Bar dataKey="converted" fill="#22C55E" radius={[4,4,0,0]} name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>Grade-wise Table</h3>
              <button onClick={() => exportCSV("ignite-grade-wise.csv", gradeWise.map(g => ({
                Grade: g.grade, Leads: g.leads, Converted: g.converted, "Conversion %": g.conversionPct
              })))} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold">
                  <th className="px-4 py-2.5 text-left">Grade</th>
                  <th className="px-4 py-2.5 text-right">Leads</th>
                  <th className="px-4 py-2.5 text-right">Converted</th>
                  <th className="px-4 py-2.5 text-right">Conversion %</th>
                  <th className="px-4 py-2.5 text-left">Bar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gradeWise.map(g => (
                  <tr key={g.grade} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>Grade {g.grade}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{g.leads}</td>
                    <td className="px-4 py-2.5 text-right text-green-600 font-semibold">{g.converted}</td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: g.conversionPct >= 20 ? "#22C55E" : g.conversionPct >= 10 ? ORANGE : "#EF4444" }}>
                      {g.conversionPct}%
                    </td>
                    <td className="px-4 py-2.5 w-40">
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 rounded-full" style={{ background: "#22C55E", width: `${g.conversionPct}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {gradeWise.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No grade data yet</div>}
          </div>
        </div>
      )}

      {/* ── TEACHER IMPACT ── */}
      {activeSection === "teacher" && (
        <div className="space-y-4">
          {topTeacher && weakTeacher && topTeacher !== weakTeacher && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center"><Star className="w-3.5 h-3.5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-blue-700">🏆 Top Conversion Teacher</div>
                  <div className="text-base font-black text-blue-600">{topTeacher.teacher}</div>
                  <div className="text-xs text-blue-500">{topTeacher.conversionPct}% · {topTeacher.conversions} conversions · {topTeacher.classes} classes</div>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-400 flex items-center justify-center"><TrendingDown className="w-3.5 h-3.5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-orange-700">⚠️ Needs Support</div>
                  <div className="text-base font-black text-orange-600">{weakTeacher.teacher}</div>
                  <div className="text-xs text-orange-500">{weakTeacher.conversionPct}% · {weakTeacher.conversions} conversions · {weakTeacher.classes} classes</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Teacher Conversion Ranking</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, teacherImpact.length * 40)}>
              <BarChart data={teacherImpact} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="teacher" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="conversionPct" fill="#3B82F6" radius={[0,4,4,0]} name="Conv %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>Teacher Impact Table</h3>
              <button onClick={() => exportCSV("ignite-teachers.csv", teacherImpact.map(t => ({
                Teacher: t.teacher, Classes: t.classes, Students: t.students, Conversions: t.conversions, "Conv %": t.conversionPct
              })))} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold">
                  {["Rank", "Teacher", "Classes Taken", "Students", "Conversions", "Conv %"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teacherImpact.map((t, i) => (
                  <tr key={t.teacher} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#6B7280" : i === 2 ? "#92400E" : NAVY }}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>{t.teacher}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.classes}</td>
                    <td className="px-4 py-2.5 text-gray-600">{t.students}</td>
                    <td className="px-4 py-2.5 text-green-600 font-semibold">{t.conversions}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: t.conversionPct >= 20 ? "#22C55E" : t.conversionPct >= 10 ? ORANGE : "#EF4444" }}>
                      {t.conversionPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {teacherImpact.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No teacher data yet</div>}
          </div>
        </div>
      )}

      {/* ── COUNSELOR PERFORMANCE ── */}
      {activeSection === "counselor" && (
        <div className="space-y-4">
          {topCounselor && weakCounselor && topCounselor !== weakCounselor && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center"><Star className="w-3.5 h-3.5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-purple-700">🏆 Best Counselor</div>
                  <div className="text-base font-black text-purple-600">{topCounselor.counselor}</div>
                  <div className="text-xs text-purple-500">{topCounselor.conversionPct}% conversion · {topCounselor.converted}/{topCounselor.leads} leads</div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-400 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-red-600">⚠️ Lowest Performing</div>
                  <div className="text-base font-black text-red-500">{weakCounselor.counselor}</div>
                  <div className="text-xs text-red-400">{weakCounselor.conversionPct}% conversion · {weakCounselor.converted}/{weakCounselor.leads} leads</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Counselor Ranking</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, counselorPerf.length * 40)}>
              <BarChart data={counselorPerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="counselor" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Bar dataKey="conversionPct" fill="#8B5CF6" radius={[0,4,4,0]} name="Conv %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>Counselor Performance Table</h3>
              <button onClick={() => exportCSV("ignite-counselors.csv", counselorPerf.map(c => ({
                Counselor: c.counselor, "Leads Assigned": c.leads, Converted: c.converted, "Conv %": c.conversionPct
              })))} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold">
                  {["Rank", "Counselor", "Leads Assigned", "Converted", "Conv %"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {counselorPerf.map((c, i) => (
                  <tr key={c.counselor} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#6B7280" : i === 2 ? "#92400E" : NAVY }}>
                        {i + 1}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>{c.counselor}</td>
                    <td className="px-4 py-2.5 text-gray-600">{c.leads}</td>
                    <td className="px-4 py-2.5 text-green-600 font-semibold">{c.converted}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: c.conversionPct >= 25 ? "#22C55E" : c.conversionPct >= 10 ? ORANGE : "#EF4444" }}>
                      {c.conversionPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {counselorPerf.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No counselor data yet</div>}
          </div>
        </div>
      )}

      {/* ── MENTOR LEADERBOARD ── */}
      {activeSection === "mentor" && (
        <div className="space-y-4">
          {/* Top / Bottom spotlight */}
          {mentorLeaderboard.length >= 2 && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><Star className="w-3.5 h-3.5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-emerald-700">🏆 Top Mentor</div>
                  <div className="text-base font-black text-emerald-600">{mentorLeaderboard[0].mentor}</div>
                  <div className="text-xs text-emerald-500">{mentorLeaderboard[0].conversionPct}% conversion · {mentorLeaderboard[0].converted}/{mentorLeaderboard[0].leads} leads</div>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-400 flex items-center justify-center"><TrendingDown className="w-3.5 h-3.5 text-white" /></div>
                <div>
                  <div className="text-xs font-bold text-red-600">⚠️ Needs Support</div>
                  <div className="text-base font-black text-red-500">{mentorLeaderboard[mentorLeaderboard.length - 1].mentor}</div>
                  <div className="text-xs text-red-400">{mentorLeaderboard[mentorLeaderboard.length - 1].conversionPct}% conversion · {mentorLeaderboard[mentorLeaderboard.length - 1].converted}/{mentorLeaderboard[mentorLeaderboard.length - 1].leads} leads</div>
                </div>
              </div>
            </div>
          )}

          {/* Bar chart */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Mentor Conversion Ranking</h3>
            <ResponsiveContainer width="100%" height={Math.max(160, mentorLeaderboard.length * 40)}>
              <BarChart data={mentorLeaderboard} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="mentor" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="conversionPct" fill="#10B981" radius={[0,4,4,0]} name="Conv %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mentor table with expandable grade breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>Mentor Performance Table</h3>
              <button onClick={() => exportCSV("ignite-mentors.csv", mentorLeaderboard.map((m, i) => ({
                Rank: i + 1, Mentor: m.mentor, Leads: m.leads, Converted: m.converted, "Conv %": m.conversionPct,
                "Best Grade": m.grades[0] ? `Grade ${m.grades[0].grade} (${m.grades[0].conversionPct}%)` : "—",
              })))} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold">
                  {["Rank", "Mentor", "Leads", "Converted", "Conv %", "Best Grade", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mentorLeaderboard.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No mentor data yet</td></tr>
                ) : mentorLeaderboard.map((m, i) => (
                  <React.Fragment key={m.mentor}>
                    <tr className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setExpandedMentor(expandedMentor === m.mentor ? null : m.mentor)}>
                      <td className="px-4 py-2.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                          style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#6B7280" : i === 2 ? "#92400E" : NAVY }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: NAVY }}>{m.mentor}</td>
                      <td className="px-4 py-2.5 text-gray-600">{m.leads}</td>
                      <td className="px-4 py-2.5 text-green-600 font-semibold">{m.converted}</td>
                      <td className="px-4 py-2.5 font-bold" style={{ color: m.conversionPct >= 25 ? "#22C55E" : m.conversionPct >= 10 ? ORANGE : "#EF4444" }}>
                        {m.conversionPct}%
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {m.grades[0] ? `Grade ${m.grades[0].grade}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {expandedMentor === m.mentor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </td>
                    </tr>
                    {expandedMentor === m.mentor && (
                      <tr key={`${m.mentor}-detail`}>
                        <td colSpan={7} className="bg-emerald-50/50 px-6 py-3">
                          <p className="text-xs font-bold text-emerald-700 mb-2">Grade Breakdown for {m.mentor}</p>
                          <div className="flex flex-wrap gap-2">
                            {m.grades.filter(g => g.grade > 0).map(g => (
                              <div key={g.grade} className="px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-xs">
                                <span className="font-bold" style={{ color: NAVY }}>Grade {g.grade}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-gray-600">{g.leads} leads</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="font-bold" style={{ color: g.conversionPct >= 25 ? "#22C55E" : g.conversionPct >= 10 ? ORANGE : "#EF4444" }}>
                                  {g.conversionPct}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grade Leaderboard */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Grade-wise Mentor Leaderboard</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ranked by conversion % · shows best mentor per grade</p>
              </div>
              <button onClick={() => exportCSV("ignite-grade-mentors.csv", gradeLeaderboard.map(g => ({
                Grade: `Grade ${g.grade}`, Leads: g.leads, Converted: g.converted, "Conv %": g.conversionPct,
                "Top Mentor": g.topMentor, "Top Mentor Conv %": g.topMentorPct,
              })))} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }}>
                <Download className="w-3 h-3" /> CSV
              </button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold">
                  {["Rank", "Grade", "Total Leads", "Converted", "Grade Conv %", "Top Mentor", "Mentor Conv %"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gradeLeaderboard.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No grade data yet</td></tr>
                ) : gradeLeaderboard.map((g, i) => (
                  <tr key={g.grade} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#6B7280" : i === 2 ? "#92400E" : NAVY }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-black" style={{ color: NAVY }}>Grade {g.grade}</td>
                    <td className="px-4 py-2.5 text-gray-600">{g.leads}</td>
                    <td className="px-4 py-2.5 text-green-600 font-semibold">{g.converted}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(g.conversionPct, 100)}%`, background: g.conversionPct >= 25 ? "#22C55E" : g.conversionPct >= 10 ? ORANGE : "#EF4444" }} />
                        </div>
                        <span className="font-bold" style={{ color: g.conversionPct >= 25 ? "#22C55E" : g.conversionPct >= 10 ? ORANGE : "#EF4444" }}>{g.conversionPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-emerald-700">{g.topMentor}</td>
                    <td className="px-4 py-2.5 font-bold" style={{ color: g.topMentorPct >= 25 ? "#22C55E" : g.topMentorPct >= 10 ? ORANGE : "#EF4444" }}>
                      {g.topMentorPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="text-center text-[10px] text-gray-400 pb-2">
        ⚡ All data shown is for Ignite Program only · Mastery and Long-Term Program data are excluded
      </div>
    </div>
  );
}
