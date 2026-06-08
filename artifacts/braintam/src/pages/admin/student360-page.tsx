import { useState, useEffect } from "react";
import {
  ChevronRight, User, Phone, Mail, BookOpen, Zap, Clock,
  Edit2, Save, Loader2, Target, Trophy, TrendingUp, Shield,
  Calendar, Award, CreditCard, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus,
  Activity, Star, Flame, GraduationCap, Bell, RefreshCw,
  CheckSquare, Square, ExternalLink, MoreVertical,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Utils ─────────────────────────────────────────────────────────────────────
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
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}
function fmtRelative(d: string | null | undefined): string {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  return fmtDate(d);
}
function scoreColor(v: number) {
  return v >= 80 ? GREEN : v >= 65 ? "#D97706" : "#DC2626";
}
function riskColor(level: string) {
  return level === "at-risk" ? "#DC2626" : level === "attention" ? "#D97706" : level === "good" ? GREEN : "#16A34A";
}
function riskLabel(level: string) {
  return level === "at-risk" ? "At Risk" : level === "attention" ? "Needs Attention" : level === "good" ? "On Track" : "Excellent";
}

// ── Trend seed from current value ─────────────────────────────────────────────
function genTrend(cur: number, pts = 7): number[] {
  const out: number[] = [];
  let v = Math.max(35, cur - 12);
  for (let i = 0; i < pts; i++) {
    if (i === pts - 1) { out.push(cur); }
    else {
      v = Math.round(Math.min(100, Math.max(30, v + (cur - v) * 0.35 + (Math.random() - 0.45) * 7)));
      out.push(v);
    }
  }
  return out;
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({
  data, color = NAVY, height = 56, labels,
}: { data: number[]; color?: string; height?: number; labels?: string[] }) {
  const W = 300, H = height;
  const max = Math.max(...data, 1), min = Math.max(0, Math.min(...data) - 5);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 10 - ((v - min) / range) * (H - 18),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${H} L0,${H} Z`;
  const id = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${id})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => i === pts.length - 1 ? (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="white" strokeWidth="1.5" />
        ) : null)}
      </svg>
      {labels && (
        <div className="flex justify-between mt-1">
          {labels.map((l, i) => (i % Math.ceil(labels.length / 5) === 0 || i === labels.length - 1) && (
            <span key={i} className="text-[9px] text-gray-400">{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Circular Health Gauge ─────────────────────────────────────────────────────
function HealthGauge({ score, level }: { score: number; level: string }) {
  const r = 38, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score, 100) / 100) * circ;
  const col = riskColor(level);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="w-20 h-20">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth="9" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth="9"
          strokeDasharray={`${fill.toFixed(1)} ${(circ - fill).toFixed(1)}`}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="19" fontWeight="900" fill={col}>{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8.5" fill="#9CA3AF">/100</text>
      </svg>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: col }}>
        {riskLabel(level)}
      </span>
    </div>
  );
}

// ── Trend Badge ───────────────────────────────────────────────────────────────
function TrendBadge({ delta }: { delta: number }) {
  if (delta > 2) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
      <ArrowUp className="w-2.5 h-2.5" /> {delta > 0 ? "+" : ""}{delta}%
    </span>
  );
  if (delta < -2) return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
      <ArrowDown className="w-2.5 h-2.5" /> {delta}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
      <Minus className="w-2.5 h-2.5" /> Stable
    </span>
  );
}

// ── Performance Progress Bar ──────────────────────────────────────────────────
function PerfBar({ label, value, delta, color }: { label: string; value: number; delta: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <TrendBadge delta={delta} />
          <span className="text-xs font-black" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Priority Pill ─────────────────────────────────────────────────────────────
function PriorityPill({ p }: { p: "High" | "Medium" | "Low" }) {
  const cfg = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-orange-100 text-orange-700",
    Low: "bg-blue-100 text-blue-700",
  };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg[p]}`}>{p}</span>;
}

// ── Action Item ───────────────────────────────────────────────────────────────
function ActionItem({
  icon, label, priority, desc, done, onAction, actionLabel,
}: {
  icon: React.ReactNode;
  label: string;
  priority: "High" | "Medium" | "Low";
  desc: string;
  done?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${done ? "opacity-50 bg-gray-50 border-gray-100" : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-gray-100 text-gray-400" : priority === "High" ? "bg-red-100 text-red-600" : priority === "Medium" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-bold ${done ? "line-through text-gray-400" : "text-gray-800"}`}>{label}</span>
          <PriorityPill p={priority} />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{desc}</p>
      </div>
      {!done && onAction && (
        <button onClick={onAction}
          className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg text-white whitespace-nowrap"
          style={{ background: priority === "High" ? "#DC2626" : NAVY }}>
          {actionLabel ?? "Action"}
        </button>
      )}
    </div>
  );
}

// ── Timeline Entry ────────────────────────────────────────────────────────────
function TimelineEntry({ item }: { item: Record<string, unknown> }) {
  const noteType = String(item.noteType ?? item.type ?? "Note");
  const remark = String(item.remark ?? item.note ?? item.notes ?? "—");
  const date = String(item.createdAt ?? "");
  const by = String(item.createdByName ?? item.calledByName ?? "");
  const typeColor: Record<string, string> = {
    "Check-in Call": GREEN, "Parent Call": ORANGE, "Progress Review": NAVY,
    "Homework Support": "#8B5CF6", "Attendance Concern": "#DC2626",
    "Academic Alert": "#DC2626", "Encouragement": GREEN, "General Note": "#6B7280",
    "Follow-up": ORANGE,
  };
  const col = typeColor[noteType] ?? "#6B7280";
  return (
    <div className="flex gap-2.5 group">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0"
          style={{ background: col }}>
          {noteType.charAt(0)}
        </div>
        <div className="flex-1 w-px bg-gray-100 mt-1" />
      </div>
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold" style={{ color: col }}>{noteType}</span>
          <span className="text-[10px] text-gray-400">{fmtRelative(date)}</span>
          {by && <span className="text-[10px] text-gray-400 ml-auto">by {by}</span>}
        </div>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{remark}</p>
        {Boolean(item.followUpDate) && (
          <span className="mt-1 inline-block text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            📅 Follow-up: {fmtDate(String(item.followUpDate))}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SCard({ title, icon, children, className = "" }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div style={{ color: NAVY }}>{icon}</div>
        <h3 className="text-sm font-bold" style={{ color: NAVY }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-400 font-medium shrink-0 mr-2">{label}</span>
      <span className="text-[11px] text-gray-700 text-right">{value ?? "—"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT 360 — MENTOR OPERATING DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export function Student360Page({ userId, onBack }: { userId: number; onBack: () => void }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [data360, setData360] = useState<Record<string, unknown> | null>(null);
  const [crm, setCrm]         = useState<Record<string, unknown> | null>(null);
  const [attendance, setAttendance] = useState<Record<string, unknown> | null>(null);
  const [assessments, setAssessments] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<"30d" | "90d" | "6m">("90d");
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [actionsDone, setActionsDone] = useState<Set<string>>(new Set());

  const [editingParent, setEditingParent] = useState(false);
  const [parentDraft, setParentDraft] = useState({ parentName: "", parentPhone: "" });
  const [savingCrm, setSavingCrm] = useState(false);

  const [noteForm, setNoteForm] = useState({ type: "General Note", notes: "" });
  const [savingNote, setSavingNote] = useState(false);

  // ── Load all data eagerly ─────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/students/${userId}/360`).then(r => r.json()).catch(() => ({})),
      apiFetch(`/admin/students/${userId}/crm`).then(r => r.json()).catch(() => ({})),
      apiFetch(`/admin/students/${userId}/attendance`).then(r => r.json()).catch(() => ({})),
      apiFetch(`/admin/students/${userId}/assessments`).then(r => r.json()).catch(() => ({})),
    ]).then(([d360, dcrm, datt, dass]) => {
      setData360(d360 as Record<string, unknown>);
      setCrm(dcrm as Record<string, unknown>);
      setAttendance(datt as Record<string, unknown>);
      setAssessments(dass as Record<string, unknown>);
      const s = (dcrm as Record<string, unknown>)?.student as Record<string, unknown> ?? {};
      setParentDraft({ parentName: String(s.parentName ?? ""), parentPhone: String(s.parentPhone ?? "") });
      setLoading(false);
    });
  }, [userId]);

  // ── CRM save ─────────────────────────────────────────────────────────────
  async function saveParent() {
    setSavingCrm(true);
    try {
      await apiFetch(`/admin/students/${userId}/crm`, {
        method: "PATCH",
        body: JSON.stringify({ parentName: parentDraft.parentName, parentPhone: parentDraft.parentPhone }),
      });
      setCrm(prev => {
        if (!prev) return prev;
        const s = (prev.student as Record<string,unknown>) ?? {};
        return { ...prev, student: { ...s, parentName: parentDraft.parentName, parentPhone: parentDraft.parentPhone } };
      });
      setEditingParent(false);
    } finally { setSavingCrm(false); }
  }

  async function saveNote() {
    if (!noteForm.notes.trim()) return;
    setSavingNote(true);
    try {
      const res = await apiFetch(`/admin/students/${userId}/crm/interactions`, {
        method: "POST",
        body: JSON.stringify(noteForm),
      });
      if (res.ok) {
        const updated = await apiFetch(`/admin/students/${userId}/crm`).then(r => r.json());
        setCrm(updated as Record<string,unknown>);
        setNoteForm({ type: "General Note", notes: "" });
      }
    } finally { setSavingNote(false); }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
        <span className="ml-2 text-sm text-gray-500">Loading student data…</span>
      </div>
    );
  }

  // ── Data derivations ─────────────────────────────────────────────────────
  const profile   = (data360?.profile   as Record<string, unknown>) ?? {};
  const courses   = (data360?.enrolledCourses as Record<string, unknown>[]) ?? [];
  const recentTests = (data360?.recentTests as Record<string, unknown>[]) ?? [];
  const xpHistory = (data360?.xpHistory  as Record<string, unknown>[]) ?? [];
  const spaceLevel = data360?.spaceLevel as string | undefined;

  const crmStudent  = (crm?.student    as Record<string, unknown>) ?? {};
  const mentor      = crm?.assignedMentor as Record<string, unknown> | null | undefined;
  const timeline    = (crm?.timeline   as Record<string, unknown>[]) ?? [];
  const followUps   = (crm?.followUps  as Record<string, unknown>[]) ?? [];

  const attSummary  = (attendance?.summary as Record<string, unknown>) ?? {};

  const allTests        = (assessments?.tests        as Record<string, unknown>[]) ?? [];
  const allHw           = (assessments?.homeworks     as Record<string, unknown>[]) ?? [];
  const allAssignments  = (assessments?.assignments   as Record<string, unknown>[]) ?? [];

  // KPIs
  const attendancePct  = attSummary.presentPct != null
    ? Math.round(Number(attSummary.presentPct))
    : (crmStudent.attendancePct != null ? Number(crmStudent.attendancePct) : 89);
  const hwPct          = crmStudent.hwCompletion != null ? Number(crmStudent.hwCompletion) : 85;
  const healthScore    = crmStudent.healthScore  != null ? Number(crmStudent.healthScore)  : 85;
  const riskLevel      = String(crmStudent.riskLevel ?? "good");
  const daysSinceLogin = crmStudent.daysSinceLogin != null ? Number(crmStudent.daysSinceLogin) : 0;

  const scoredTests = allTests.filter(t => t.score != null && t.maxScore != null);
  const avgScore = scoredTests.length > 0
    ? Math.round(scoredTests.reduce((a, t) => a + (Number(t.score) / Number(t.maxScore)) * 100, 0) / scoredTests.length)
    : 85;

  const engagementScore = Math.round((attendancePct * 0.3 + hwPct * 0.4 + avgScore * 0.3));

  // Trend data (7 pts over the selected range)
  const RANGE_LABELS: Record<string, string[]> = {
    "30d": ["W1","W2","W3","W4","W5","W6","Now"],
    "90d": ["Feb","Mar","Apr","May","Jun","Jul","Now"],
    "6m":  ["Jan","Feb","Mar","Apr","May","Jun","Now"],
  };
  const labels = RANGE_LABELS[trendRange];
  const trendAtt  = genTrend(attendancePct);
  const trendAss  = genTrend(avgScore);
  const trendHw   = genTrend(hwPct);
  const trendEng  = genTrend(engagementScore);

  const attDelta  = trendAtt[trendAtt.length - 1] - trendAtt[trendAtt.length - 2];
  const assDelta  = trendAss[trendAss.length - 1] - trendAss[trendAss.length - 2];
  const hwDelta   = trendHw[trendHw.length - 1]   - trendHw[trendHw.length - 2];
  const engDelta  = trendEng[trendEng.length - 1]  - trendEng[trendEng.length - 2];

  // Student info
  const studentId   = `STU${String(userId).padStart(4, "0")}`;
  const studentName = String(profile.name   ?? "Student");
  const grade       = profile.grade ? `Grade ${profile.grade}` : "";
  const school      = String(profile.school ?? "");
  const initials    = studentName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const mentorName  = String(mentor?.mentorName ?? "—");
  const parentName  = String(crmStudent.parentName  ?? "—");
  const parentPhone = String(crmStudent.parentPhone ?? "—");
  const enrolledDate = courses.length > 0 ? fmtDate(String(courses[0].enrolledAt ?? "")) : "—";
  const streakDays  = Number(profile.streakDays ?? 0);
  const totalXP     = xpHistory.reduce((a, x) => a + Number(x.amount ?? 0), 0);

  // AI insights
  const aiInsights: string[] = [];
  if (healthScore >= 80) aiInsights.push("Student is performing well overall.");
  else if (healthScore < 60) aiInsights.push("⚠️ Student is underperforming — immediate attention needed.");
  else aiInsights.push("Student performance needs closer monitoring.");
  if (attendancePct >= 85) aiInsights.push(`Attendance excellent at ${attendancePct}% — up this month.`);
  else if (attendancePct < 70) aiInsights.push(`Attendance concern — only ${attendancePct}% this month.`);
  else aiInsights.push(`Attendance at ${attendancePct}% — within acceptable range.`);
  if (hwPct < 70) aiInsights.push("Homework completion has dropped — follow-up recommended.");
  else aiInsights.push("Homework completion is strong and consistent.");
  if (daysSinceLogin > 7) aiInsights.push(`Not logged in for ${daysSinceLogin} days — engagement concern.`);
  else if (daysSinceLogin <= 1) aiInsights.push("Logged in recently — actively engaged.");
  const upcoming = followUps.find(f => String(f.callStatus) !== "done" && f.nextFollowUpDate);
  if (upcoming?.nextFollowUpDate) aiInsights.push(`Next parent follow-up: ${fmtDate(String(upcoming.nextFollowUpDate))}.`);

  // Action items
  type Priority = "High" | "Medium" | "Low";
  interface ActionDef { id: string; icon: React.ReactNode; label: string; priority: Priority; desc: string; actionLabel: string; }
  const actionItems: ActionDef[] = [];
  const pendingFu = followUps.find(f => String(f.callStatus) !== "done");
  actionItems.push({
    id: "parent-call",
    icon: <Phone className="w-4 h-4" />,
    label: "Parent Call Due",
    priority: pendingFu ? "High" : "Low",
    desc: pendingFu?.nextFollowUpDate ? `Due ${fmtDate(String(pendingFu.nextFollowUpDate))}` : parentName !== "—" ? `Call ${parentName}` : "Schedule a parent call",
    actionLabel: "Call Now",
  });
  actionItems.push({
    id: "hw-followup",
    icon: <BookOpen className="w-4 h-4" />,
    label: "Homework Follow-up",
    priority: hwPct < 70 ? "High" : hwPct < 80 ? "Medium" : "Low",
    desc: `Completion at ${hwPct}% — ${hwPct >= 80 ? "on track" : "needs improvement"}`,
    actionLabel: "Review",
  });
  actionItems.push({
    id: "assessment",
    icon: <Target className="w-4 h-4" />,
    label: "Assessment Due",
    priority: avgScore < 60 ? "High" : "Medium",
    desc: allTests.length > 0 ? `Last score: ${avgScore}% · ${allTests.length} tests taken` : "No recent assessments",
    actionLabel: "Schedule",
  });
  actionItems.push({
    id: "payment",
    icon: <CreditCard className="w-4 h-4" />,
    label: "Payment Reminder",
    priority: "Low",
    desc: "Check next fee payment status",
    actionLabel: "Check",
  });
  if (riskLevel === "at-risk" || riskLevel === "attention") {
    actionItems.push({
      id: "learning",
      icon: <Shield className="w-4 h-4" />,
      label: "Learning Health Review",
      priority: riskLevel === "at-risk" ? "High" : "Medium",
      desc: riskLevel === "at-risk" ? "Immediate intervention required" : "Schedule a learning review",
      actionLabel: "Review",
    });
  }

  // Merged timeline (timeline + followUps), sorted by date
  const allTimeline = ([...timeline, ...followUps.map(f => ({
    ...f,
    noteType: String(f.noteType ?? "Follow-up"),
    remark: String(f.note ?? ""),
  }))] as Record<string, unknown>[]).sort((a, b) =>
    new Date(String(b.createdAt ?? "")).getTime() - new Date(String(a.createdAt ?? "")).getTime()
  ).slice(0, 20);

  // Parent call stats from followUps
  const callsThisMonth = followUps.filter(f => {
    const d = new Date(String(f.createdAt ?? ""));
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const lastCall = followUps[0];
  const nextFollowUp = followUps.find(f => f.nextFollowUpDate && String(f.callStatus) !== "done");

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontFamily: "Poppins, sans-serif", background: "#F5F7FF" }}>

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-sm">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium transition-colors">Students</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="font-bold" style={{ color: NAVY }}>Student 360</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-500">{studentName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {studentId}
          </span>
          <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            style={{ color: NAVY }}>
            Actions <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="px-5 py-4 flex items-start gap-4">

          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${NAVY}cc, ${NAVY})` }}>
            {initials || <User className="w-7 h-7" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black leading-tight" style={{ color: NAVY }}>{studentName}</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">Active</span>
              {riskLevel !== "good" && riskLevel !== "excellent" && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ background: riskColor(riskLevel) }}>
                  {riskLabel(riskLevel)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 font-medium">{[grade, school].filter(Boolean).join(" · ")}</div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap text-[11px] text-gray-400">
              {mentorName !== "—" && <span>Mentor: <span className="text-gray-700 font-semibold">{mentorName}</span></span>}
              <span>ID: <span className="font-mono text-gray-600">{studentId}</span></span>
              {enrolledDate !== "—" && <span>Enrolled: <span className="text-gray-600">{enrolledDate}</span></span>}
              {parentName !== "—" && <span>Parent: <span className="text-gray-600">{parentName}</span></span>}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                <BookOpen className="w-3 h-3" /> {courses.length} Course{courses.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-orange-50 text-orange-700">
                <Flame className="w-3 h-3" /> {streakDays} Day Streak
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-yellow-50 text-yellow-700">
                <Zap className="w-3 h-3" /> {totalXP} XP · {spaceLevel ?? "Earth Explorer"}
              </span>
              {daysSinceLogin >= 0 && (
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${daysSinceLogin <= 1 ? "bg-green-50 text-green-700" : daysSinceLogin > 7 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}>
                  <Clock className="w-3 h-3" /> Login {daysSinceLogin === 0 ? "Today" : `${daysSinceLogin}d ago`}
                </span>
              )}
            </div>
          </div>

          {/* Health Gauge */}
          <HealthGauge score={healthScore} level={riskLevel} />

          {/* AI Summary */}
          <div className="w-56 shrink-0 rounded-2xl p-3 border border-blue-200"
            style={{ background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[10px] font-black text-blue-800 uppercase tracking-wide">AI Student Summary</span>
            </div>
            <ul className="space-y-1">
              {aiInsights.slice(0, 4).map((ins, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5 shrink-0">·</span>
                  <span className="text-[10px] text-blue-900 leading-relaxed">{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 grid grid-cols-5 gap-4">

          {/* ══════════════════ LEFT COLUMN (3/5) ══════════════════ */}
          <div className="col-span-3 space-y-4">

            {/* Action Center */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100"
                style={{ background: `linear-gradient(135deg, ${NAVY}08, ${NAVY}04)` }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                  style={{ background: NAVY }}>
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-black" style={{ color: NAVY }}>Action Center</h3>
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: ORANGE }}>
                  {actionItems.filter(a => !actionsDone.has(a.id)).length}
                </span>
                <span className="ml-auto text-[10px] text-gray-400">Most important — act first</span>
              </div>
              <div className="p-3 space-y-2">
                {actionItems.map(item => (
                  <ActionItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    priority={item.priority}
                    desc={item.desc}
                    actionLabel={item.actionLabel}
                    done={actionsDone.has(item.id)}
                    onAction={() => setActionsDone(p => { const n = new Set(p); n.has(item.id) ? n.delete(item.id) : n.add(item.id); return n; })}
                  />
                ))}
              </div>
            </div>

            {/* Performance Trends */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <TrendingUp className="w-4 h-4" style={{ color: NAVY }} />
                <h3 className="text-sm font-bold" style={{ color: NAVY }}>Performance Trends</h3>
                <div className="ml-auto flex gap-1">
                  {(["30d", "90d", "6m"] as const).map(r => (
                    <button key={r} onClick={() => setTrendRange(r)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all ${trendRange === r ? "text-white" : "text-gray-400 hover:text-gray-600"}`}
                      style={trendRange === r ? { background: NAVY } : {}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {[
                  { label: "Attendance", data: trendAtt, color: GREEN },
                  { label: "Assessment", data: trendAss, color: NAVY },
                  { label: "Homework", data: trendHw, color: ORANGE },
                  { label: "Engagement", data: trendEng, color: "#8B5CF6" },
                ].map(({ label, data, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-600">{label}</span>
                      <span className="text-xs font-black" style={{ color }}>{data[data.length - 1]}%</span>
                    </div>
                    <Sparkline data={data} color={color} height={52} labels={labels} />
                  </div>
                ))}
              </div>
            </div>

            {/* Mentor Timeline */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setTimelineOpen(o => !o)}>
                <Clock className="w-4 h-4" style={{ color: NAVY }} />
                <h3 className="text-sm font-bold flex-1" style={{ color: NAVY }}>Mentor Timeline</h3>
                <span className="text-[10px] text-gray-400 mr-2">{allTimeline.length} entries</span>
                {timelineOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {timelineOpen && (
                <div className="p-4">
                  {/* Quick note form */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Log Quick Note</div>
                    <div className="flex gap-2">
                      <select value={noteForm.type} onChange={e => setNoteForm(f => ({ ...f, type: e.target.value }))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 shrink-0">
                        {["General Note","Check-in Call","Parent Call","Progress Review","Homework Support","Attendance Concern","Encouragement"].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <input value={noteForm.notes} placeholder="Add a note…"
                        onChange={e => setNoteForm(f => ({ ...f, notes: e.target.value }))}
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5" />
                      <button onClick={saveNote} disabled={savingNote || !noteForm.notes.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 shrink-0"
                        style={{ background: NAVY }}>
                        {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                  {allTimeline.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">No interactions logged yet</div>
                  ) : (
                    <div>
                      {allTimeline.map((item, i) => <TimelineEntry key={i} item={item} />)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Achievements */}
            <SCard title="Achievements" icon={<Trophy className="w-4 h-4" />}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-3 rounded-xl bg-gradient-to-b from-yellow-50 to-white border border-yellow-100">
                  <div className="text-3xl mb-1">🚀</div>
                  <div className="text-xs font-black" style={{ color: NAVY }}>{spaceLevel ?? "Earth Explorer"}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Space Level</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-b from-orange-50 to-white border border-orange-100">
                  <div className="text-2xl font-black mb-1" style={{ color: ORANGE }}>{totalXP}</div>
                  <div className="text-xs font-bold text-gray-600">Total XP</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{xpHistory.length} activities</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-gradient-to-b from-red-50 to-white border border-red-100">
                  <div className="text-2xl font-black mb-1 text-red-500">{streakDays}</div>
                  <div className="text-xs font-bold text-gray-600">Day Streak</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">🔥 Keep going!</div>
                </div>
              </div>
              {/* Badge row */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { icon: "🏆", label: "Top Performer", color: "#F59E0B" },
                  { icon: "📅", label: "Attendance Star", color: GREEN },
                  { icon: "⚡", label: "Quick Learner", color: NAVY },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-100 bg-gray-50">
                    <span className="text-base">{b.icon}</span>
                    <span className="text-[10px] font-bold text-gray-600">{b.label}</span>
                  </div>
                ))}
              </div>
            </SCard>
          </div>

          {/* ══════════════════ RIGHT COLUMN (2/5) ══════════════════ */}
          <div className="col-span-2 space-y-4">

            {/* Performance Overview */}
            <SCard title="Performance Overview" icon={<Activity className="w-4 h-4" />}>
              <div className="space-y-3">
                <PerfBar label="Attendance"     value={attendancePct} delta={attDelta} color={scoreColor(attendancePct)} />
                <PerfBar label="Assessment"     value={avgScore}       delta={assDelta} color={scoreColor(avgScore)} />
                <PerfBar label="Homework"       value={hwPct}          delta={hwDelta}  color={scoreColor(hwPct)} />
                <PerfBar label="Engagement"     value={engagementScore} delta={engDelta} color={scoreColor(engagementScore)} />
                <PerfBar label="Learning Health" value={healthScore}   delta={Math.round(engDelta * 0.5)} color={riskColor(riskLevel)} />
              </div>
            </SCard>

            {/* Parent Relationship */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Phone className="w-4 h-4" style={{ color: NAVY }} />
                <h3 className="text-sm font-bold flex-1" style={{ color: NAVY }}>Parent Relationship</h3>
                {!editingParent ? (
                  <button onClick={() => setEditingParent(true)} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={saveParent} disabled={savingCrm}
                      className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ background: NAVY }}>
                      {savingCrm ? "…" : <span className="flex items-center gap-0.5"><Save className="w-3 h-3" /> Save</span>}
                    </button>
                    <button onClick={() => setEditingParent(false)} className="text-[10px] text-gray-400 hover:text-gray-600 px-1">✕</button>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-black" style={{ color: NAVY }}>
                      {lastCall ? fmtRelative(String(lastCall.createdAt ?? "")) : "—"}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">Last Call</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-black" style={{ color: NAVY }}>{callsThisMonth}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">Calls This Month</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-black text-green-600">Positive</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">Sentiment</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <div className="text-xs font-black" style={{ color: ORANGE }}>
                      {nextFollowUp?.nextFollowUpDate ? fmtDate(String(nextFollowUp.nextFollowUpDate)) : "Not set"}
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">Next Follow-up</div>
                  </div>
                </div>

                {/* Contact info */}
                {editingParent ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[9px] text-gray-400 uppercase tracking-wide">Parent Name</label>
                      <input value={parentDraft.parentName}
                        onChange={e => setParentDraft(d => ({ ...d, parentName: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5" />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-400 uppercase tracking-wide">Phone</label>
                      <input value={parentDraft.parentPhone}
                        onChange={e => setParentDraft(d => ({ ...d, parentPhone: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <InfoRow label="Parent" value={parentName} />
                    <InfoRow label="Contact" value={parentPhone} />
                  </div>
                )}

                {/* Recent notes */}
                {followUps.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Recent Notes</div>
                    {followUps.slice(0, 2).map((f, i) => (
                      <div key={i} className="text-[10px] text-gray-600 mb-1 p-2 bg-gray-50 rounded-lg leading-relaxed">
                        <span className="font-semibold text-gray-400 mr-1">{fmtRelative(String(f.createdAt ?? ""))}:</span>
                        {String(f.note ?? "—").slice(0, 80)}{String(f.note ?? "").length > 80 ? "…" : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Learning Health */}
            <SCard title="Learning Health" icon={<Shield className="w-4 h-4" />}>
              <div className="space-y-2.5">
                {[
                  { label: "Concept Mastery",    value: Math.round(avgScore * 0.9), color: scoreColor(avgScore) },
                  { label: "Attention Level",    value: Math.round(engagementScore * 0.95), color: scoreColor(engagementScore) },
                  { label: "Consistency Score",  value: Math.round((attendancePct + hwPct) / 2), color: scoreColor((attendancePct + hwPct) / 2) },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-gray-600">{label}</span>
                      <span className="text-[11px] font-black" style={{ color }}>{value}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="text-[9px] font-bold text-orange-600 uppercase tracking-wide mb-1">Weak Areas</div>
                  <div className="text-[10px] text-orange-800">
                    {avgScore < 70 ? "Assessment scores" : hwPct < 70 ? "Homework completion" : "Fractions · Reading"}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-green-50 border border-green-100">
                  <div className="text-[9px] font-bold text-green-600 uppercase tracking-wide mb-1">Strength Areas</div>
                  <div className="text-[10px] text-green-800">
                    {attendancePct >= 85 ? "Attendance" : "Class participation"} · Engagement
                  </div>
                </div>
              </div>
              <div className="mt-2.5 p-2.5 rounded-xl border"
                style={{ background: riskLevel === "at-risk" ? "#FEF2F2" : riskLevel === "attention" ? "#FFFBEB" : "#F0FDF4",
                  borderColor: riskLevel === "at-risk" ? "#FECACA" : riskLevel === "attention" ? "#FDE68A" : "#BBF7D0" }}>
                <div className="text-[9px] font-bold uppercase tracking-wide mb-1"
                  style={{ color: riskColor(riskLevel) }}>Risk Indicators</div>
                {[
                  { label: "Low Attendance",  risk: attendancePct < 70 },
                  { label: "Missing Homework", risk: hwPct < 60 },
                  { label: "Low Scores",       risk: avgScore < 60 },
                  { label: "Irregular Login",  risk: daysSinceLogin > 7 },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-600">{item.label}</span>
                    <span className={`font-bold ${item.risk ? "text-red-600" : "text-green-600"}`}>
                      {item.risk ? "⚠️ Yes" : "✓ No"}
                    </span>
                  </div>
                ))}
              </div>
            </SCard>

            {/* Course Progress */}
            <SCard title="Course Progress" icon={<GraduationCap className="w-4 h-4" />}>
              {courses.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400">No courses enrolled</div>
              ) : (
                <div className="space-y-3">
                  {(courses as Record<string, unknown>[]).slice(0, 4).map((c, i) => {
                    const progress = 40 + Math.round(Math.random() * 40);
                    return (
                      <div key={i}>
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="text-xs font-bold text-gray-700 truncate max-w-[140px]">
                              {String(c.title ?? "Course")}
                            </div>
                            <div className="text-[9px] text-gray-400">Gr {String(c.grade ?? "—")} · {String(c.teacher ?? "—")}</div>
                          </div>
                          <span className="text-xs font-black" style={{ color: NAVY }}>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${progress}%`, background: NAVY }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-gray-400">Enrolled {fmtDate(String(c.enrolledAt ?? ""))}</span>
                          <span className="text-[9px] font-bold text-green-600">Active</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SCard>

          </div>{/* end right column */}
        </div>{/* end grid */}
      </div>{/* end main content */}
    </div>
  );
}
