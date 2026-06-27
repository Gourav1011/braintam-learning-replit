import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, Download, TrendingUp, Users, DollarSign,
  Target, Calendar, UserCheck, ChevronUp, ChevronDown,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function fmt(n: number) { return new Intl.NumberFormat("en-IN").format(n); }
function rupee(n: number) { return `₹${new Intl.NumberFormat("en-IN").format(Math.round(n))}`; }

// ── Date helpers ─────────────────────────────────────────────────
function toIST(d: Date) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
type Period = "today"|"yesterday"|"thisWeek"|"lastWeek"|"thisMonth"|"lastMonth"|"custom";
function periodRange(p: Period): { from: string; to: string } {
  const now = toIST(new Date());
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const day = now.getDay() || 7; // Mon=1
  switch(p) {
    case "today":     return { from: ymd(now), to: ymd(now) };
    case "yesterday": { const y1 = new Date(y,m,d-1); return { from: ymd(toIST(y1)), to: ymd(toIST(y1)) }; }
    case "thisWeek":  { const mon = new Date(y,m,d-day+1); return { from: ymd(toIST(mon)), to: ymd(now) }; }
    case "lastWeek":  { const lmon = new Date(y,m,d-day-6); const lsun = new Date(y,m,d-day); return { from: ymd(toIST(lmon)), to: ymd(toIST(lsun)) }; }
    case "thisMonth": return { from: `${y}-${String(m+1).padStart(2,"0")}-01`, to: ymd(now) };
    case "lastMonth": { const lm = new Date(y,m-1,1); const lme = new Date(y,m,0); return { from: ymd(toIST(lm)), to: ymd(toIST(lme)) }; }
    default: return { from: ymd(now), to: ymd(now) };
  }
}

interface Summary {
  period: { from: string; to: string };
  kpis: { totalLeads:number; converted:number; demoRevenue:number; courseRevenue:number; totalRevenue:number; conversionPct:number; activeMentors:number; todayAdmissions:number };
  funnel: { stage:string; count:number }[];
  gradeWise: { grade:number; leads:number; converted:number; convPct:number; revenue:number }[];
  mentorPerformance: { mentorId:number; name:string; leads:number; converted:number; convPct:number; revenue:number }[];
  leadSource: { source:string; leads:number; converted:number; convPct:number; revenue:number }[];
  dailyTrend: { date:string; leads:number; converted:number; revenue:number }[];
  payments: {
    ignite:  { captured:number; failed:number; pending:number; revenue:number };
    mastery: { captured:number; failed:number; pending:number; revenue:number };
  };
}

type SortKey = "leads"|"converted"|"convPct"|"revenue";

export function ReportsAnalyticsTab() {
  const [period, setPeriod]               = useState<Period>("thisMonth");
  const [customFrom, setCustomFrom]       = useState("");
  const [customTo, setCustomTo]           = useState("");
  const [data, setData]                   = useState<Summary | null>(null);
  const [loading, setLoading]             = useState(false);
  const [activeSection, setActiveSection] = useState<"funnel"|"grade"|"mentor"|"source"|"daily"|"payments">("funnel");
  const [mentorSort, setMentorSort]       = useState<SortKey>("convPct");
  const [mentorAsc, setMentorAsc]         = useState(false);

  const fetch = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const params = from && to ? `?from=${from}&to=${to}` : "";
      const r = await apiFetch(`/admin/reports/summary${params}`);
      if (r.ok) setData(await r.json() as Summary);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const { from, to } = periodRange("thisMonth");
    fetch(from, to);
  }, [fetch]);

  function applyPeriod(p: Period) {
    setPeriod(p);
    if (p === "custom") return;
    const { from, to } = periodRange(p);
    fetch(from, to);
  }

  function applyCustom() {
    if (customFrom && customTo) fetch(customFrom, customTo);
  }

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Grade","Leads","Converted","Conv%","Revenue"],
      ...data.gradeWise.map(g => [g.grade, g.leads, g.converted, g.convPct+"%", rupee(g.revenue)]),
      [],
      ["Mentor","Leads","Converted","Conv%","Revenue"],
      ...data.mentorPerformance.map(m => [m.name, m.leads, m.converted, m.convPct+"%", rupee(m.revenue)]),
      [],
      ["Source","Leads","Converted","Conv%","Revenue"],
      ...data.leadSource.map(s => [s.source, s.leads, s.converted, s.convPct+"%", rupee(s.revenue)]),
      [],
      ["Date","Leads","Converted","Revenue"],
      ...data.dailyTrend.map(t => [t.date, t.leads, t.converted, rupee(t.revenue)]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `braintam-report-${data.period.from.slice(0,10)}-to-${data.period.to.slice(0,10)}.csv`;
    a.click();
  }

  const sortedMentors = data ? [...data.mentorPerformance].sort((a, b) => {
    const diff = (a[mentorSort] as number) - (b[mentorSort] as number);
    return mentorAsc ? diff : -diff;
  }) : [];

  function SortBtn({ k }: { k: SortKey }) {
    const active = mentorSort === k;
    return (
      <button onClick={() => { if (active) setMentorAsc(x => !x); else { setMentorSort(k); setMentorAsc(false); } }}
        className="ml-0.5 opacity-60 hover:opacity-100">
        {active ? (mentorAsc ? <ChevronUp className="w-3 h-3 inline"/> : <ChevronDown className="w-3 h-3 inline"/>) : <ChevronDown className="w-3 h-3 inline opacity-40"/>}
      </button>
    );
  }

  const PERIODS: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "thisWeek", label: "This Week" },
    { key: "lastWeek", label: "Last Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
    { key: "custom", label: "Custom" },
  ];

  const SECTIONS: { key: typeof activeSection; label: string }[] = [
    { key: "funnel",   label: "Lead Funnel" },
    { key: "grade",    label: "Grade-wise" },
    { key: "mentor",   label: "Mentor Performance" },
    { key: "source",   label: "Lead Source" },
    { key: "daily",    label: "Daily Trend" },
    { key: "payments", label: "Payments" },
  ];

  const kpi = data?.kpis;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 bg-white">
        <div>
          <h2 className="font-black text-base" style={{ color: NAVY }}>📊 Reports & Analytics</h2>
          {data && <p className="text-[11px] text-gray-400 mt-0.5">{data.period.from.slice(0,10)} → {data.period.to.slice(0,10)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} disabled={!data}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-40"
            style={{ borderColor: NAVY, color: NAVY }}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => { const { from, to } = period === "custom" && customFrom && customTo ? { from: customFrom, to: customTo } : periodRange(period); fetch(from, to); }}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Period filters ── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 bg-white">
        <div className="flex gap-1.5 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => applyPeriod(p.key)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all border"
              style={{
                background:  period === p.key ? NAVY : "#fff",
                color:       period === p.key ? "#fff" : "#374151",
                borderColor: period === p.key ? NAVY : "#D1D5DB",
              }}>
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2 mt-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1" />
            <button onClick={applyCustom}
              className="px-3 py-1 rounded-lg text-xs font-bold text-white"
              style={{ background: NAVY }}>
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading && !data && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
          </div>
        )}

        {kpi && (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Users,      label: "Total Leads",       value: fmt(kpi.totalLeads),       color: NAVY },
                { icon: Target,     label: "Converted",          value: fmt(kpi.converted),         color: "#22C55E" },
                { icon: TrendingUp, label: "Conversion %",       value: `${kpi.conversionPct}%`,    color: ORANGE },
                { icon: DollarSign, label: "Total Revenue",      value: rupee(kpi.totalRevenue),    color: "#8B5CF6" },
                { icon: DollarSign, label: "Demo Revenue",       value: rupee(kpi.demoRevenue),     color: "#3B82F6" },
                { icon: DollarSign, label: "Course Revenue",     value: rupee(kpi.courseRevenue),   color: "#F59E0B" },
                { icon: UserCheck,  label: "Active Mentors",     value: fmt(kpi.activeMentors),     color: NAVY },
                { icon: Calendar,   label: "Today's Admissions", value: fmt(kpi.todayAdmissions),   color: "#EC4899" },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-3"
                  style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: c.color + "18" }}>
                    <c.icon className="w-4.5 h-4.5" style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-base leading-tight" style={{ color: c.color }}>{c.value}</div>
                    <div className="text-[10px] text-gray-500 font-medium mt-0.5 truncate">{c.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Section tabs ── */}
            <div className="flex gap-1.5 flex-wrap">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setActiveSection(s.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background:  activeSection === s.key ? NAVY : "#F3F4F6",
                    color:       activeSection === s.key ? "#fff" : "#374151",
                  }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* ── Lead Funnel ── */}
            {activeSection === "funnel" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Lead Funnel</h3>
                </div>
                <div className="p-4 space-y-3">
                  {data!.funnel.map((f, i) => {
                    const top = data!.funnel[0].count || 1;
                    const pct = Math.round((f.count / top) * 100);
                    const colors = [NAVY, "#3B82F6", "#8B5CF6", ORANGE, "#22C55E", "#EF4444"];
                    return (
                      <div key={f.stage}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{f.stage}</span>
                          <span className="text-xs font-black tabular-nums" style={{ color: colors[i] }}>
                            {fmt(f.count)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[i] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Grade-wise ── */}
            {activeSection === "grade" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Grade-wise Analytics</h3>
                </div>
                {data!.gradeWise.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                          {["Grade","Leads","Converted","Conv %","Revenue"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data!.gradeWise.map((g, i) => (
                          <tr key={g.grade} className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                            style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
                            <td className="px-4 py-3 font-bold text-sm" style={{ color: NAVY }}>Grade {g.grade}</td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{fmt(g.leads)}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: "#22C55E" }}>{fmt(g.converted)}</td>
                            <td className="px-4 py-3 font-black" style={{ color: ORANGE }}>{g.convPct}%</td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{rupee(g.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Mentor Performance ── */}
            {activeSection === "mentor" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Mentor Performance</h3>
                </div>
                {sortedMentors.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No mentor data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Mentor</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Leads <SortBtn k="leads" />
                          </th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Converted <SortBtn k="converted" />
                          </th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Conv % <SortBtn k="convPct" />
                          </th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Revenue <SortBtn k="revenue" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedMentors.map((m, i) => (
                          <tr key={m.mentorId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                            style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                  style={{ background: NAVY }}>{m.name[0]?.toUpperCase()}</div>
                                <span className="font-semibold text-gray-800">{m.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{fmt(m.leads)}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: "#22C55E" }}>{fmt(m.converted)}</td>
                            <td className="px-4 py-3">
                              <span className="font-black text-sm" style={{ color: ORANGE }}>{m.convPct}%</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{rupee(m.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Lead Source ── */}
            {activeSection === "source" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Lead Source Analytics</h3>
                </div>
                {data!.leadSource.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                          {["Source","Leads","Converted","Conv %","Revenue"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data!.leadSource.map((s, i) => (
                          <tr key={s.source} className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                            style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
                            <td className="px-4 py-3 font-semibold text-gray-800">{s.source}</td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{fmt(s.leads)}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: "#22C55E" }}>{fmt(s.converted)}</td>
                            <td className="px-4 py-3 font-black text-sm" style={{ color: ORANGE }}>{s.convPct}%</td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{rupee(s.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Daily Trend ── */}
            {activeSection === "daily" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Daily Trend</h3>
                </div>
                {data!.dailyTrend.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No data for selected period</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                          {["Date","Leads","Converted","Revenue"].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data!.dailyTrend.map((t, i) => (
                          <tr key={t.date} className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                            style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {new Date(t.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{fmt(t.leads)}</td>
                            <td className="px-4 py-3 font-semibold" style={{ color: "#22C55E" }}>{fmt(t.converted)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-700">{rupee(t.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Payments ── */}
            {activeSection === "payments" && (
              <div className="space-y-4">
                {/* Ignite Revenue */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-base">🚀</span>
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>Ignite Revenue</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white ml-auto"
                      style={{ background: "#3B82F6" }}>Demo Enrollments</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Successful Payments", value: fmt(data!.payments.ignite.captured), color: "#22C55E" },
                      { label: "Failed Payments",     value: fmt(data!.payments.ignite.failed),   color: "#EF4444" },
                      { label: "Pending Payments",    value: fmt(data!.payments.ignite.pending),  color: "#F59E0B" },
                      { label: "Total Collection",    value: rupee(data!.payments.ignite.revenue),color: NAVY },
                    ].map(c => (
                      <div key={c.label} className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                        <div className="font-black text-xl" style={{ color: c.color }}>{c.value}</div>
                        <div className="text-xs text-gray-500 font-medium mt-1">{c.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mastery Course Revenue */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <span className="text-base">🎓</span>
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>Mastery Course Revenue</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white ml-auto"
                      style={{ background: ORANGE }}>Long-term Conversions</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "Successful Payments", value: fmt(data!.payments.mastery.captured), color: "#22C55E" },
                      { label: "Failed Payments",     value: fmt(data!.payments.mastery.failed),   color: "#EF4444" },
                      { label: "Pending Payments",    value: fmt(data!.payments.mastery.pending),  color: "#F59E0B" },
                      { label: "Total Collection",    value: rupee(data!.payments.mastery.revenue),color: NAVY },
                    ].map(c => (
                      <div key={c.label} className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                        <div className="font-black text-xl" style={{ color: c.color }}>{c.value}</div>
                        <div className="text-xs text-gray-500 font-medium mt-1">{c.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
