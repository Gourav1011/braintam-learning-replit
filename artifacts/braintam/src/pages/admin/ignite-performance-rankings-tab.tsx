import { useState, useEffect, useCallback } from "react";
import {
  Trophy, TrendingUp, Users, CreditCard, UserX, ChevronDown,
  RefreshCw, Download, Save, X, BarChart3, Medal, Star, Zap,
  ArrowUpRight, ArrowDownRight, Phone, Calendar,
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface MentorRanking {
  mentorId:           number;
  mentorName:         string;
  mentorEmail:        string | null;
  isActive:           string;
  assignedLeads:      number;
  successfulCalls:    number;
  pendingCalls:       number;
  noResponseLeads:    number;
  demoAttendancePct:  number;
  successfulPayments: number;
  conversionPct:      number;
  nonActiveLeads:     number;
  rank:               number;
}

interface TopCards {
  topPerformer:    MentorRanking | null;
  topConversion:   MentorRanking | null;
  topPayments:     MentorRanking | null;
  lowestNonActive: MentorRanking | null;
  mostImproved:    { mentorId: number; mentorName: string; delta: number } | null;
}

interface LiveData {
  periodType:  string;
  periodKey:   string;
  periodLabel: string;
  startDate:   string | null;
  endDate:     string | null;
  rankings:    MentorRanking[];
  cards:       TopCards;
}

interface SnapshotPeriod { periodType: string; periodKey: string; periodLabel: string | null; }

interface MentorSnapshot {
  id: number;
  periodType: string; periodKey: string; periodLabel: string | null;
  mentorId: number; mentorName: string; isActive: string;
  assignedLeads: number; successfulCalls: number;
  demoAttendancePct: number; successfulPayments: number;
  conversionPct: number; nonActiveLeads: number; rank: number;
}

interface MentorDetail {
  mentor:    { id: number; name: string; email: string | null; isActive: boolean };
  live:      MentorRanking | null;
  snapshots: MentorSnapshot[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getISOWeek(d: Date) {
  const dt = new Date(d);
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const w1 = new Date(dt.getFullYear(), 0, 4);
  return 1 + Math.round(((dt.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

function currentPeriodKey(type: string) {
  const now = new Date();
  if (type === "weekly")  return `${now.getFullYear()}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  if (type === "monthly") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return String(now.getFullYear());
}

function periodLabel(type: string, key: string) {
  if (type === "weekly") { const m = key.match(/^(\d{4})-W(\d+)$/); return m ? `Week ${m[2]}, ${m[1]}` : key; }
  if (type === "monthly") { const m = key.match(/^(\d{4})-(\d{2})$/); if (m) { const d = new Date(+m[1]!, +m[2]! - 1, 1); return d.toLocaleString("en-IN", { month: "long", year: "numeric" }); } return key; }
  return `Year ${key}`;
}

function generateWeekOptions() {
  const now  = new Date();
  const year = now.getFullYear();
  const week = getISOWeek(now);
  const opts: { value: string; label: string }[] = [];
  for (let w = week; w >= 1; w--) opts.push({ value: `${year}-W${String(w).padStart(2, "0")}`, label: `Week ${w}, ${year}` });
  const py = year - 1;
  for (let w = 52; w >= 1; w--) opts.push({ value: `${py}-W${String(w).padStart(2, "0")}`, label: `Week ${w}, ${py}` });
  return opts;
}

function generateMonthOptions() {
  const now   = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    const maxM = y === now.getFullYear() ? now.getMonth() + 1 : 12;
    for (let m = maxM; m >= 1; m--) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      opts.push({ value: key, label: periodLabel("monthly", key) });
    }
  }
  return opts;
}

function generateYearOptions() {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({ value: String(y - i), label: `Year ${y - i}` }));
}

// ── Rank medal ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black" style={{ background: "#FEF3C7", color: "#92400E" }}>🥇</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black" style={{ background: "#F3F4F6", color: "#4B5563" }}>🥈</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black" style={{ background: "#FEF3C7", color: "#B45309" }}>🥉</span>;
  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-black bg-gray-100 text-gray-600">#{rank}</span>;
}

// ── Top Card ──────────────────────────────────────────────────────────────────

function TopCard({ title, name, value, sub, icon: Icon, color, bg }: {
  title: string; name: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs text-gray-500 font-semibold">{title}</span>
      </div>
      <p className="text-sm font-black truncate" style={{ color: NAVY }}>{name || "—"}</p>
      <p className="text-lg font-black mt-0.5" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Sparkline (simple SVG) ────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-xs text-gray-400">No history</span>;
  const max = Math.max(...values, 1);
  const w = 120, h = 36;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

// ── Mentor Drawer ─────────────────────────────────────────────────────────────

function MentorDrawer({ mentorId, onClose }: { mentorId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<MentorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/admin/ignite/performance-rankings/mentor/${mentorId}`)
      .then(r => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [mentorId]);

  const weeklySnaps = detail?.snapshots.filter(s => s.periodType === "weekly") ?? [];
  const convTrend   = weeklySnaps.slice(-8).map(s => s.conversionPct);
  const pmtTrend    = weeklySnaps.slice(-8).map(s => s.successfulPayments);
  const leadTrend   = weeklySnaps.slice(-8).map(s => s.assignedLeads);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col" style={{ height: "100vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: NAVY }}>
          <div>
            <p className="text-xs text-blue-200 font-semibold">Mentor Report</p>
            <h2 className="text-lg font-black text-white">{detail?.mentor.name ?? "Loading…"}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Failed to load</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${detail.mentor.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {detail.mentor.isActive ? "Active" : "Inactive"}
              </span>
              {detail.mentor.email && <span className="text-xs text-gray-400">{detail.mentor.email}</span>}
            </div>

            {/* All-time stats grid */}
            {detail.live && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">All-Time Stats</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Assigned Leads",     value: detail.live.assignedLeads,      color: NAVY },
                    { label: "Successful Calls",    value: detail.live.successfulCalls,    color: GREEN },
                    { label: "Pending Calls",       value: detail.live.pendingCalls,       color: ORANGE },
                    { label: "No Response",         value: detail.live.noResponseLeads,    color: "#EF4444" },
                    { label: "Demo Attend %",       value: `${detail.live.demoAttendancePct}%`, color: "#8B5CF6" },
                    { label: "Successful Payments", value: detail.live.successfulPayments, color: GREEN },
                    { label: "Conversion %",        value: `${detail.live.conversionPct}%`, color: ORANGE },
                    { label: "Non-Active Leads",    value: detail.live.nonActiveLeads,     color: "#EF4444" },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-black" style={{ color: item.color }}>{item.value}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend charts */}
            {weeklySnaps.length >= 2 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Weekly Trends (last 8 weeks)</p>
                <div className="space-y-4">
                  {[
                    { label: "Conversion Trend", data: convTrend, color: ORANGE, suffix: "%" },
                    { label: "Payment Trend",    data: pmtTrend,  color: GREEN  },
                    { label: "Lead Engagement",  data: leadTrend, color: NAVY   },
                  ].map(({ label, data, color, suffix }) => (
                    <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600">{label}</p>
                        {data.length >= 2 && (
                          <p className="text-xs mt-0.5" style={{ color: data[data.length-1]! >= data[data.length-2]! ? GREEN : "#EF4444" }}>
                            {data[data.length-1]! >= data[data.length-2]!
                              ? <ArrowUpRight className="inline w-3 h-3" />
                              : <ArrowDownRight className="inline w-3 h-3" />}
                            {data[data.length-1]}{suffix}
                          </p>
                        )}
                      </div>
                      <Sparkline values={data} color={color} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical snapshots */}
            {detail.snapshots.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Historical Rankings</p>
                <div className="space-y-2">
                  {[...detail.snapshots].reverse().slice(0, 20).map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                      <div>
                        <p className="text-xs font-black" style={{ color: NAVY }}>{s.periodLabel ?? s.periodKey}</p>
                        <p className="text-[10px] text-gray-400">{s.assignedLeads} leads · {s.successfulCalls} calls</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black" style={{ color: ORANGE }}>{s.conversionPct}% conv</p>
                        <p className="text-[10px] text-gray-400">Rank #{s.rank} · {s.successfulPayments} pmts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type ViewSource = "live" | "snapshot";
type PeriodType = "weekly" | "monthly" | "yearly" | "custom";

export function IgnitePerformanceRankingsTab() {
  const [source,     setSource]     = useState<ViewSource>("live");
  const [periodType, setPeriodType] = useState<PeriodType>("weekly");
  const [periodKey,  setPeriodKey]  = useState(currentPeriodKey("weekly"));
  const [customStart,setCustomStart]= useState("");
  const [customEnd,  setCustomEnd]  = useState("");
  const [data,       setData]       = useState<LiveData | null>(null);
  const [snapRows,   setSnapRows]   = useState<MentorSnapshot[]>([]);
  const [periods,    setPeriods]    = useState<SnapshotPeriod[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [drawerMentor, setDrawerMentor] = useState<number | null>(null);
  const [flash,      setFlash]      = useState<{ msg: string; ok: boolean } | null>(null);

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 3500);
  };

  // Load snapshot periods once
  useEffect(() => {
    apiFetch("/admin/ignite/performance-rankings/snapshot-periods")
      .then(r => r.json())
      .then(setPeriods)
      .catch(() => null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (source === "live") {
        let url = `/admin/ignite/performance-rankings/live?periodType=${periodType}`;
        if (periodType === "custom" && customStart && customEnd) {
          url += `&startDate=${customStart}&endDate=${customEnd}`;
        } else if (periodType !== "custom") {
          url += `&periodKey=${periodKey}`;
        }
        const r = await apiFetch(url);
        setData(await r.json());
      } else {
        const url = `/admin/ignite/performance-rankings/snapshots?periodType=${periodType}&periodKey=${periodKey}`;
        const r = await apiFetch(url);
        setSnapRows(await r.json());
      }
    } finally {
      setLoading(false);
    }
  }, [source, periodType, periodKey, customStart, customEnd]);

  useEffect(() => { load(); }, [load]);

  // When periodType changes, reset periodKey to current
  useEffect(() => {
    if (periodType !== "custom") setPeriodKey(currentPeriodKey(periodType));
  }, [periodType]);

  const saveSnapshot = async () => {
    setSaving(true);
    try {
      const r = await apiFetch("/admin/ignite/performance-rankings/snapshots", {
        method: "POST",
        body:   JSON.stringify({ periodType, periodKey }),
      });
      if (!r.ok) throw new Error();
      showFlash(`Snapshot saved for ${periodLabel(periodType, periodKey)}!`);
      // Reload periods
      apiFetch("/admin/ignite/performance-rankings/snapshot-periods").then(r => r.json()).then(setPeriods).catch(() => null);
    } catch {
      showFlash("Failed to save snapshot", false);
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const token = localStorage.getItem("braintam_staff_token");
    const src   = source === "snapshot" ? "snapshot" : "live";
    const url   = `${BASE}/api/admin/ignite/performance-rankings/export.csv?periodType=${periodType}&periodKey=${periodKey}&source=${src}`;
    const a     = document.createElement("a");
    a.href      = `${url}&token=${token ?? ""}`;
    a.download  = `ignite-rankings-${periodKey}.csv`;
    a.click();
  };

  const weekOptions  = generateWeekOptions();
  const monthOptions = generateMonthOptions();
  const yearOptions  = generateYearOptions();

  const rankings = source === "live"
    ? (data?.rankings ?? [])
    : snapRows.map(s => ({ ...s, mentorEmail: null, homeworkCompletionPct: 0, pendingCalls: 0, noResponseLeads: 0 } as MentorRanking));

  const cards = data?.cards ?? null;

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Flash */}
      {flash && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${flash.ok ? "bg-green-600" : "bg-red-500"}`}>
          {flash.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Performance Rankings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Ignite mentor leaderboard — historical snapshots &amp; live data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveSnapshot}
            disabled={saving || source !== "live"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: NAVY }}
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Snapshot
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: GREEN }}
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Source toggle */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Data Source</p>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {(["live", "snapshot"] as const).map(s => (
                <button key={s} onClick={() => setSource(s)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize ${source === s ? "text-white" : "text-gray-500 bg-white"}`}
                  style={source === s ? { background: NAVY } : {}}
                >
                  {s === "live" ? "Live" : "Saved Snapshot"}
                </button>
              ))}
            </div>
          </div>

          {/* Period type */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Time View</p>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {(["weekly", "monthly", "yearly", "custom"] as const).map(t => (
                <button key={t} onClick={() => setPeriodType(t)}
                  className={`px-3 py-1.5 text-xs font-semibold capitalize ${periodType === t ? "text-white" : "text-gray-500 bg-white"}`}
                  style={periodType === t ? { background: ORANGE } : {}}
                >
                  {t === "custom" ? "Custom" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Period selector */}
          {periodType === "weekly" && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Week</p>
              <select
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-blue-400"
              >
                {(source === "snapshot" ? periods.filter(p => p.periodType === "weekly") : weekOptions).map(o => (
                  <option key={"value" in o ? o.value : o.periodKey} value={"value" in o ? o.value : o.periodKey}>
                    {"label" in o ? o.label : (o.periodLabel ?? o.periodKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {periodType === "monthly" && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Month</p>
              <select
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-blue-400"
              >
                {(source === "snapshot" ? periods.filter(p => p.periodType === "monthly") : monthOptions).map(o => (
                  <option key={"value" in o ? o.value : o.periodKey} value={"value" in o ? o.value : o.periodKey}>
                    {"label" in o ? o.label : (o.periodLabel ?? o.periodKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {periodType === "yearly" && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Year</p>
              <select
                value={periodKey}
                onChange={e => setPeriodKey(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-blue-400"
              >
                {(source === "snapshot" ? periods.filter(p => p.periodType === "yearly") : yearOptions).map(o => (
                  <option key={"value" in o ? o.value : o.periodKey} value={"value" in o ? o.value : o.periodKey}>
                    {"label" in o ? o.label : (o.periodLabel ?? o.periodKey)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {periodType === "custom" && (
            <div className="flex gap-2">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">From</p>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">To</p>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-blue-400" />
              </div>
            </div>
          )}

          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {data && source === "live" && (
          <p className="text-[10px] text-gray-400 mt-2">
            Showing: {data.periodLabel}
            {data.startDate && data.endDate && ` · ${new Date(data.startDate).toLocaleDateString("en-IN")} – ${new Date(data.endDate).toLocaleDateString("en-IN")}`}
          </p>
        )}
      </div>

      {/* Top Cards (live only) */}
      {source === "live" && cards && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <TopCard
            title="Top Performer"
            name={cards.topPerformer?.mentorName ?? "—"}
            value={`#1 · ${cards.topPerformer?.conversionPct ?? 0}%`}
            sub={`${cards.topPerformer?.successfulPayments ?? 0} payments`}
            icon={Trophy} color="#92400E" bg="#FEF3C7"
          />
          <TopCard
            title="Highest Conversion"
            name={cards.topConversion?.mentorName ?? "—"}
            value={`${cards.topConversion?.conversionPct ?? 0}%`}
            sub={`${cards.topConversion?.assignedLeads ?? 0} leads`}
            icon={TrendingUp} color={GREEN} bg="#D1FAE5"
          />
          <TopCard
            title="Most Payments"
            name={cards.topPayments?.mentorName ?? "—"}
            value={`${cards.topPayments?.successfulPayments ?? 0}`}
            sub="successful payments"
            icon={CreditCard} color={ORANGE} bg="#FFF7ED"
          />
          <TopCard
            title="Lowest Non-Active"
            name={cards.lowestNonActive?.mentorName ?? "—"}
            value={`${cards.lowestNonActive?.nonActiveLeads ?? 0}`}
            sub="non-active leads"
            icon={UserX} color={NAVY} bg="#EEF2FF"
          />
          <TopCard
            title="Most Improved"
            name={cards.mostImproved?.mentorName ?? "—"}
            value={cards.mostImproved ? `+${cards.mostImproved.delta.toFixed(1)}%` : "—"}
            sub="vs previous period"
            icon={Zap} color="#8B5CF6" bg="#EDE9FE"
          />
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4" style={{ color: ORANGE }} />
            <span className="text-sm font-black" style={{ color: NAVY }}>
              Leaderboard
              {source === "live" && data && ` — ${data.periodLabel}`}
              {source === "snapshot" && ` — Snapshot`}
            </span>
          </div>
          <span className="text-xs text-gray-400">Sorted: Conversion % → Payments → Non-Active</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No data for this period</p>
            <p className="text-xs mt-1">
              {source === "snapshot" ? "No snapshot saved for this period yet." : "No mentors with assigned leads found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Mentor</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Leads</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Calls</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Attend %</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Payments</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Conv %</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Non-Active</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, idx) => {
                  const rowBg =
                    r.rank === 1 ? "#FFFBEB" :
                    r.rank === 2 ? "#F9FAFB" :
                    r.rank === 3 ? "#FFF7ED" :
                    idx % 2 === 0 ? "white" : "#FAFAFA";
                  return (
                    <tr
                      key={r.mentorId}
                      className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
                      style={{ background: rowBg }}
                      onClick={() => setDrawerMentor(r.mentorId)}
                    >
                      <td className="px-4 py-3"><RankBadge rank={r.rank} /></td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-black text-sm" style={{ color: NAVY }}>{r.mentorName}</p>
                          {r.isActive === "inactive" && (
                            <span className="text-[10px] text-red-500 font-semibold">Inactive</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{r.assignedLeads}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: GREEN }}>{r.successfulCalls}</td>
                      <td className="px-4 py-3 text-right font-semibold text-purple-600">{r.demoAttendancePct}%</td>
                      <td className="px-4 py-3 text-right font-black" style={{ color: ORANGE }}>{r.successfulPayments}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-0.5 rounded-full text-xs font-black"
                          style={{
                            background: r.conversionPct >= 20 ? "#D1FAE5" : r.conversionPct >= 10 ? "#FEF3C7" : "#FEE2E2",
                            color:      r.conversionPct >= 20 ? "#065F46" : r.conversionPct >= 10 ? "#92400E" : "#991B1B",
                          }}
                        >
                          {r.conversionPct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: r.nonActiveLeads > 10 ? "#EF4444" : "#6B7280" }}>
                        {r.nonActiveLeads}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawerMentor !== null && (
        <MentorDrawer mentorId={drawerMentor} onClose={() => setDrawerMentor(null)} />
      )}
    </div>
  );
}
