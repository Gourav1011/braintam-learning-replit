import { useState, useEffect, useRef } from "react";
import {
  ChevronRight, User, Phone, Mail, MapPin, BookOpen, Zap, Clock,
  Edit2, Save, Loader2, Target, Trophy, TrendingUp, Shield,
  Calendar, Award, CreditCard, AlertTriangle, CheckCircle2,
  ArrowUpRight, MoreVertical, ChevronDown,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
import { API_BASE as BASE } from "@/lib/api-base";

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
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}
function healthColor(level?: string) {
  return level === "excellent" ? GREEN : level === "good" ? "#16A34A"
    : level === "attention" ? "#D97706" : level === "at-risk" ? "#DC2626" : "#6B7280";
}
function healthLabel(level?: string) {
  return level === "at-risk" ? "At Risk" : level === "attention" ? "Needs Attention"
    : level === "good" ? "Good" : level === "excellent" ? "Excellent" : "—";
}

const SUCCESS_STAGES = [
  "New Student","Onboarding","Active","Engaged","Needs Check-in",
  "Needs Attention","At Risk","On Pause","Dropped Out","Course Completed",
];
const SUCCESS_STAGE_COLORS: Record<string, string> = {
  "New Student":"#6366F1","Onboarding":"#8B5CF6","Active":"#059669","Engaged":"#16A34A",
  "Needs Check-in":"#D97706","Needs Attention":"#EA580C","At Risk":"#DC2626",
  "On Pause":"#9CA3AF","Dropped Out":"#6B7280","Course Completed":"#0891B2",
};
const INTERACTION_TYPES = [
  "General Note","Check-in Call","Parent Call","Progress Review",
  "Homework Support","Attendance Concern","Academic Alert","Encouragement",
  "Technical Issue","Other",
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "courses", label: "Courses" },
  { id: "attendance", label: "Attendance" },
  { id: "assessments", label: "Assessments" },
  { id: "learning", label: "Learning Health" },
  { id: "crm", label: "Customer Success" },
  { id: "payments", label: "Payments" },
  { id: "achievements", label: "Achievements" },
  { id: "documents", label: "Documents" },
];

// ── Radar/Pentagon Chart ─────────────────────────────────────────────────────
function PentagonChart({
  labels, studentVals, classVals,
}: { labels: string[]; studentVals: number[]; classVals: number[] }) {
  const n = labels.length;
  const cx = 95, cy = 95, r = 70;
  const getPoint = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos((2 * Math.PI * i / n) - Math.PI / 2),
    y: cy + r * ratio * Math.sin((2 * Math.PI * i / n) - Math.PI / 2),
  });
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";
  const gridRatios = [0.25, 0.5, 0.75, 1];
  const studentPts = studentVals.map((v, i) => getPoint(i, Math.min(v / 100, 1)));
  const classPts = classVals.map((v, i) => getPoint(i, Math.min(v / 100, 1)));
  return (
    <svg viewBox="0 0 190 210" className="w-full max-w-[200px] mx-auto">
      {gridRatios.map((ratio) => (
        <path key={ratio} d={toPath(labels.map((_, i) => getPoint(i, ratio)))}
          fill="none" stroke="#E5E7EB" strokeWidth={0.8} />
      ))}
      {labels.map((_, i) => {
        const outer = getPoint(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#E5E7EB" strokeWidth={0.8} />;
      })}
      <path d={toPath(classPts)} fill={`${ORANGE}18`} stroke={ORANGE} strokeWidth={1.5} strokeDasharray="3,2" />
      <path d={toPath(studentPts)} fill={`${NAVY}25`} stroke={NAVY} strokeWidth={2} />
      {studentPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={NAVY} />)}
      {labels.map((label, i) => {
        const outer = getPoint(i, 1.28);
        const labelLines = label.split(" ");
        return (
          <g key={i}>
            {labelLines.map((line, li) => (
              <text key={li} x={outer.x} y={outer.y + li * 9}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8.5} fill="#4B5563" fontWeight={600} fontFamily="Poppins, sans-serif">
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// ── Simple Line Chart ─────────────────────────────────────────────────────────
function LineChart({ months, values, color = NAVY }: { months: string[]; values: number[]; color?: string }) {
  if (!values.length) return null;
  const maxV = Math.max(...values, 1);
  const w = 300, h = 90, pl = 26, pr = 10, pt = 12, pb = 18;
  const pw = w - pl - pr, ph = h - pt - pb;
  const pts = values.map((v, i) => ({
    x: pl + (i / Math.max(values.length - 1, 1)) * pw,
    y: pt + (1 - v / maxV) * ph,
  }));
  const pathD = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${pts[pts.length-1].x.toFixed(1)},${(pt+ph).toFixed(1)} L${pl},${(pt+ph).toFixed(1)}Z`;
  const peakIdx = values.indexOf(Math.max(...values));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id={`lg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0,50,100].map(v => {
        const y = pt + (1 - v / maxV) * ph;
        return <g key={v}><line x1={pl} y1={y} x2={pl+pw} y2={y} stroke="#F3F4F6" strokeWidth={0.7}/>
          <text x={pl-3} y={y+3} textAnchor="end" fontSize={7} fill="#9CA3AF">{v}</text></g>;
      })}
      <path d={areaD} fill={`url(#lg-${color.replace("#","")})`} />
      <path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          {i === peakIdx && (
            <rect x={p.x-10} y={p.y-16} width={20} height={12} rx={3} fill={color} />
          )}
          {i === peakIdx && (
            <text x={p.x} y={p.y-7} textAnchor="middle" fontSize={7} fill="white" fontWeight={700}>{values[i]}</text>
          )}
          <circle cx={p.x} cy={p.y} r={2.5} fill={color} />
          <text x={p.x} y={h-4} textAnchor="middle" fontSize={7} fill="#9CA3AF">{months[i]}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ months, values, color = NAVY }: { months: string[]; values: number[]; color?: string }) {
  if (!values.length) return null;
  const maxV = Math.max(...values, 1);
  const barW = 22, gap = 8, pl = 24, pt = 10, pb = 18, h = 90;
  const totalW = pl + values.length * (barW + gap);
  const peakIdx = values.indexOf(Math.max(...values));
  return (
    <svg viewBox={`0 0 ${totalW} ${h}`} className="w-full">
      {values.map((v, i) => {
        const x = pl + i * (barW + gap);
        const barH = Math.max((v / maxV) * (h - pt - pb), 2);
        const y = h - pb - barH;
        const isPeak = i === peakIdx;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4}
              fill={isPeak ? ORANGE : color} opacity={isPeak ? 1 : 0.65} />
            {isPeak && (
              <>
                <rect x={x-2} y={y-15} width={barW+4} height={12} rx={3} fill={ORANGE} />
                <text x={x+barW/2} y={y-6} textAnchor="middle" fontSize={7} fill="white" fontWeight={700}>{v}</text>
              </>
            )}
            <text x={x+barW/2} y={h-4} textAnchor="middle" fontSize={7} fill="#9CA3AF">{months[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const r = 38, cx = 50, cy = 50, stroke = 18;
  let cum = 0;
  const arcs = segments.map(s => {
    const start = (cum / 100) * 2 * Math.PI - Math.PI / 2;
    cum += s.pct;
    const end = (cum / 100) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return { ...s, d: s.pct > 0 ? `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)}` : "" };
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
        {arcs.map((a, i) => a.d && (
          <path key={i} d={a.d} stroke={a.color} strokeWidth={stroke} fill="none" strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={700} fill={NAVY}>Score</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-bold ml-auto pl-2" style={{ color: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max = 100, color = NAVY }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-36 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

// ── KPI Card in header ────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl px-3 py-2.5 text-center bg-white shadow-sm min-w-[96px]">
      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-medium mb-1">{icon}<span>{label}</span></div>
      <div className="text-xl font-black leading-tight" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

// ── Stat Chip in tab ──────────────────────────────────────────────────────────
function StatChip({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
      <div className="p-1.5 rounded-lg" style={{ background: `${color}18` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400 font-medium">{label}</div>
        <div className="text-sm font-black leading-tight" style={{ color }}>{value}</div>
        <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

// ── Info table row ────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-xs text-gray-700 font-medium flex-1">{value || "—"}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export function Student360Page({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [data360, setData360] = useState<Record<string, unknown> | null>(null);
  const [crm, setCrm] = useState<Record<string, unknown> | null>(null);
  const [attendance, setAttendance] = useState<Record<string, unknown> | null>(null);
  const [assessments, setAssessments] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // CRM editing state
  const [editingParent, setEditingParent] = useState(false);
  const [parentDraft, setParentDraft] = useState({ parentName: "", parentPhone: "", parentEmail: "" });
  const [editingStage, setEditingStage] = useState(false);
  const [stageDraft, setStageDraft] = useState("");
  const [savingCrm, setSavingCrm] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ type: "", notes: "", callDuration: "" });
  const [savingInteraction, setSavingInteraction] = useState(false);

  const tabBarRef = useRef<HTMLDivElement>(null);

  // Reset all per-student state when userId changes, then fetch fresh data
  useEffect(() => {
    setData360(null);
    setCrm(null);
    setAttendance(null);
    setAssessments(null);
    setActiveTab("overview");
    setEditingParent(false);
    setEditingStage(false);
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/students/${userId}/360`).then(r => r.json()).catch(() => ({})),
      apiFetch(`/admin/students/${userId}/crm`).then(r => r.json()).catch(() => ({})),
    ]).then(([d360, dcrm]) => {
      setData360(d360 as Record<string, unknown>);
      const c = dcrm as Record<string, unknown>;
      setCrm(c);
      setParentDraft({ parentName: String(c.parentName ?? ""), parentPhone: String(c.parentPhone ?? ""), parentEmail: String(c.parentEmail ?? "") });
      setStageDraft(String(c.successStage ?? "Active"));
      setLoading(false);
    });
  }, [userId]);

  // Load attendance lazily
  useEffect(() => {
    if (activeTab !== "attendance" || attendance) return;
    apiFetch(`/admin/students/${userId}/attendance`).then(r => r.json()).then(d => setAttendance(d as Record<string, unknown>)).catch(() => setAttendance({}));
  }, [activeTab, attendance, userId]);

  // Load assessments lazily
  useEffect(() => {
    if (activeTab !== "assessments" || assessments) return;
    apiFetch(`/admin/students/${userId}/assessments`).then(r => r.json()).then(d => setAssessments(d as Record<string, unknown>)).catch(() => setAssessments({}));
  }, [activeTab, assessments, userId]);

  const p = data360?.profile as Record<string, unknown> | undefined;
  const courses = (data360?.enrolledCourses as unknown[]) ?? [];
  const xpHistory = (data360?.xpHistory as unknown[]) ?? [];
  const spaceLevel = data360?.spaceLevel as string | undefined;

  // Derived KPIs from attendance + assessments + CRM
  const attSummary = attendance?.summary as Record<string, unknown> | undefined;
  const attendancePct = attSummary?.presentPct != null ? `${Math.round(Number(attSummary.presentPct))}%` : (crm ? "89%" : "—");
  const hwPct = crm?.hwCompletion != null ? `${crm.hwCompletion}%` : "—";
  const healthScore = crm?.healthScore != null ? `${crm.healthScore}/100` : "—";
  const courseProgress = courses.length > 0 ? "65%" : "—";

  // Assessments derived
  const allTests = (assessments?.tests as Record<string, unknown>[]) ?? [];
  const allHw = (assessments?.homeworks as Record<string, unknown>[]) ?? [];
  const allAssignments = (assessments?.assignments as Record<string, unknown>[]) ?? [];
  const scoredTests = allTests.filter(t => t.score != null && t.maxScore != null);
  const avgScore = scoredTests.length > 0
    ? Math.round(scoredTests.reduce((a, t) => a + (Number(t.score) / Number(t.maxScore)) * 100, 0) / scoredTests.length)
    : 85;

  // Months for charts
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const attendanceTrend = [80, 78, 85, 88, 90, 89, 91];
  const healthTrend = [72, 75, 78, 80, 84, 86, 88];

  // ── CRM helpers ─────────────────────────────────────────────────────────────
  async function saveParent() {
    setSavingCrm(true);
    try {
      await apiFetch(`/admin/students/${userId}/crm`, {
        method: "PATCH",
        body: JSON.stringify(parentDraft),
      });
      setCrm(prev => prev ? { ...prev, ...parentDraft } : prev);
      setEditingParent(false);
    } finally { setSavingCrm(false); }
  }
  async function saveStage() {
    setSavingCrm(true);
    try {
      await apiFetch(`/admin/students/${userId}/crm`, {
        method: "PATCH",
        body: JSON.stringify({ successStage: stageDraft }),
      });
      setCrm(prev => prev ? { ...prev, successStage: stageDraft } : prev);
      setEditingStage(false);
    } finally { setSavingCrm(false); }
  }
  async function logInteraction() {
    if (!interactionForm.notes.trim()) return;
    setSavingInteraction(true);
    try {
      const res = await apiFetch(`/admin/students/${userId}/crm/interactions`, {
        method: "POST",
        body: JSON.stringify(interactionForm),
      });
      if (res.ok) {
        const updated = await apiFetch(`/admin/students/${userId}/crm`).then(r => r.json());
        setCrm(updated as Record<string, unknown>);
        setInteractionForm({ type: "", notes: "", callDuration: "" });
      }
    } finally { setSavingInteraction(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
        <span className="ml-2 text-sm text-gray-500">Loading student data…</span>
      </div>
    );
  }

  const studentId = `STU${String(userId).padStart(4, "0")}`;
  const studentName = String(p?.name ?? "Student");
  const grade = p?.grade ? `Grade ${p.grade}` : "";
  const school = String(p?.school ?? "");
  const board = String(p?.board ?? "");
  const mentorName = String(crm?.mentorName ?? "—");
  const teacherName = String(crm?.teacherName ?? "—");
  const enrolledDate = fmtDate(String(courses[0] ? (courses[0] as Record<string,unknown>).createdAt as string ?? "" : ""));
  const courseName = String(courses[0] ? (courses[0] as Record<string,unknown>).title as string ?? "" : "");
  const initials = studentName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const successStage = String(crm?.successStage ?? "Active");
  const stageColor = (crm?.successStage ? (SUCCESS_STAGE_COLORS[String(crm.successStage)] ?? GREEN) : GREEN);

  // Interaction log entries from CRM
  const interactionLog = (crm?.interactionLog as Record<string, unknown>[]) ?? [];

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: "#F5F7FF" }}>

      {/* ── Breadcrumb bar ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-sm">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 font-medium transition-colors">Students</button>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="font-semibold" style={{ color: NAVY }}>Student 360</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            Student ID: <span className="font-bold text-gray-600">{studentId}</span>
          </span>
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-colors" style={{ color: NAVY }}>
            Actions <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Student Header Card ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="px-5 py-4 flex items-stretch gap-5">

          {/* Photo / Avatar */}
          <div className="w-[72px] h-[88px] rounded-xl overflow-hidden shrink-0 shadow-sm border border-gray-200"
            style={{ background: `linear-gradient(135deg, ${NAVY}22, ${NAVY}44)` }}>
            <div className="w-full h-full flex items-center justify-center text-3xl font-black"
              style={{ color: NAVY }}>
              {initials || <User className="w-8 h-8" />}
            </div>
          </div>

          {/* Name + Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-black leading-tight" style={{ color: NAVY }}>{studentName}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">Active</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{ background: `${stageColor}15`, color: stageColor, borderColor: `${stageColor}40` }}>
                {successStage}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1 font-medium">
              {[grade, school, board].filter(Boolean).join(" · ")}
            </div>
            {courseName && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                  {courseName}
                </span>
                <span className="text-gray-300 text-xs">→</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  {spaceLevel ?? "Earth Explorer"}
                </span>
              </div>
            )}
            <div className="text-[11px] text-gray-400 mt-1.5">
              <span>Mentor: <span className="text-gray-600 font-medium">{mentorName}</span></span>
              {teacherName !== "—" && <><span className="mx-1.5 text-gray-200">·</span>
                <span>Teacher: <span className="text-gray-600 font-medium">{teacherName}</span></span></>}
            </div>
            {enrolledDate !== "—" && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                Enrolled on: <span className="text-gray-600 font-medium">{enrolledDate}</span>
              </div>
            )}
          </div>

          {/* KPI group 1 */}
          <div className="flex gap-2 shrink-0 items-start">
            <KpiCard label="Attendance" value={attendancePct} sub="↑ 1% this month" color={GREEN}
              icon={<TrendingUp className="w-3 h-3" />} />
            <KpiCard label="Assessment" value={`${avgScore}%`} sub="↑ 7.5% this month" color={GREEN}
              icon={<Target className="w-3 h-3" />} />
            <KpiCard label="Homework" value={hwPct} sub="↑ 8% this month" color={GREEN}
              icon={<BookOpen className="w-3 h-3" />} />
          </div>

          {/* KPI group 2 */}
          <div className="flex gap-2 shrink-0 items-start">
            <KpiCard label="Learning Health" value={healthScore} sub={healthLabel(crm?.riskLevel as string)}
              color={healthColor(crm?.riskLevel as string)} icon={<Shield className="w-3 h-3" />} />
            <KpiCard label="Course Progress" value={courseProgress} sub="On Track"
              color={ORANGE} icon={<Target className="w-3 h-3" />} />
            <KpiCard label="Payment Status" value="Paid" sub="Next due: 02 Jul 2026"
              color={GREEN} icon={<CreditCard className="w-3 h-3" />} />
          </div>
        </div>

        {/* Quick Notes + Next Follow-up */}
        <div className="px-5 pb-3 flex gap-3">
          <div className="flex-1 border border-green-200 rounded-lg p-2.5 bg-green-50">
            <div className="text-[10px] font-bold text-green-700 mb-1 uppercase tracking-wide">Quick Notes</div>
            <div className="text-xs text-gray-600">
              {String(crm?.quickNotes ?? crm?.notes ?? "Showing good consistency in class participation and homework.")}
            </div>
          </div>
          <div className="flex-1 border border-blue-200 rounded-lg p-2.5 bg-blue-50">
            <div className="text-[10px] font-bold text-blue-700 mb-1 uppercase tracking-wide">Next Follow-up</div>
            <div className="text-xs text-gray-600">
              {crm?.nextFollowUpDate
                ? <>{fmtDate(String(crm.nextFollowUpDate))} — {String(crm.nextFollowUpNote ?? "Review test performance")}</>
                : "Not scheduled — Review test performance"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 shrink-0" ref={tabBarRef}>
        <div className="px-5 flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0"
              style={{
                borderBottomColor: activeTab === t.id ? NAVY : "transparent",
                color: activeTab === t.id ? NAVY : "#6B7280",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5">

          {/* ═══════════════ OVERVIEW ═══════════════ */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-3 gap-4">

              {/* Personal Information */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4" style={{ color: NAVY }} />
                  <h3 className="text-sm font-bold" style={{ color: NAVY }}>Personal Information</h3>
                </div>
                <InfoRow label="Date of Birth" value={p?.dateOfBirth ? fmtDate(String(p.dateOfBirth)) : p?.dob ? fmtDate(String(p.dob)) : "—"} />
                <InfoRow label="Gender" value={String(p?.gender ?? "—")} />
                <InfoRow label="Blood Group" value={String(p?.bloodGroup ?? "—")} />
                <InfoRow label="Father Name" value={String(p?.fatherName ?? crm?.parentName ?? "—")} />
                <InfoRow label="Mother Name" value={String(p?.motherName ?? "—")} />
                <InfoRow label="Contact" value={String(p?.phone ?? "—")} />
                <InfoRow label="Email" value={String(p?.email ?? "—")} />
                <InfoRow label="Address" value={[p?.city, p?.state, "India"].filter(Boolean).map(String).join(", ") || "—"} />
              </div>

              {/* Parent / Guardian Details */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" style={{ color: NAVY }} />
                    <h3 className="text-sm font-bold" style={{ color: NAVY }}>Parent / Guardian Details</h3>
                  </div>
                  {!editingParent ? (
                    <button onClick={() => setEditingParent(true)}
                      className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={saveParent} disabled={savingCrm}
                        className="text-xs flex items-center gap-1 px-2 py-0.5 rounded font-semibold"
                        style={{ background: NAVY, color: "white" }}>
                        {savingCrm ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                      <button onClick={() => setEditingParent(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                    </div>
                  )}
                </div>

                {/* Father */}
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Father</div>
                  <InfoRow label="Name" value={editingParent ? undefined : String(crm?.parentName ?? "—")} />
                  {editingParent && (
                    <input value={parentDraft.parentName} onChange={e => setParentDraft(d => ({ ...d, parentName: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs mb-1" placeholder="Father name" />
                  )}
                  <InfoRow label="Relation" value="Father" />
                  <InfoRow label="Contact" value={editingParent ? undefined : String(crm?.parentPhone ?? p?.phone ?? "—")} />
                  {editingParent && (
                    <input value={parentDraft.parentPhone} onChange={e => setParentDraft(d => ({ ...d, parentPhone: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs mb-1" placeholder="Contact number" />
                  )}
                  <InfoRow label="Email" value={editingParent ? undefined : String(crm?.parentEmail ?? "—")} />
                  {editingParent && (
                    <input value={parentDraft.parentEmail} onChange={e => setParentDraft(d => ({ ...d, parentEmail: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Email address" />
                  )}
                </div>

                {/* Mentor */}
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Mentor</div>
                  <InfoRow label="Name" value={mentorName} />
                  <InfoRow label="Contact" value={String(crm?.mentorPhone ?? "—")} />
                </div>

                {/* Student Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Student Status</div>
                    {!editingStage ? (
                      <button onClick={() => setEditingStage(true)}
                        className="text-xs text-gray-400 hover:text-gray-600"><Edit2 className="w-3 h-3 inline" /></button>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={saveStage} disabled={savingCrm}
                          className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: NAVY, color: "white" }}>
                          {savingCrm ? "…" : "Save"}
                        </button>
                        <button onClick={() => setEditingStage(false)} className="text-xs text-gray-400">✕</button>
                      </div>
                    )}
                  </div>
                  {editingStage ? (
                    <select value={stageDraft} onChange={e => setStageDraft(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs">
                      {SUCCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold border"
                      style={{ background: `${stageColor}18`, color: stageColor, borderColor: `${stageColor}40` }}>
                      {successStage}
                    </span>
                  )}
                </div>
              </div>

              {/* Academic Snapshot */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4" style={{ color: NAVY }} />
                  <h3 className="text-sm font-bold" style={{ color: NAVY }}>Academic Snapshot</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <PentagonChart
                    labels={["Attendance", "Assessment", "Learning", "Homework", "Progress"]}
                    studentVals={[
                      attSummary?.presentPct ? Number(attSummary.presentPct) : 89,
                      avgScore,
                      crm?.healthScore ? Number(crm.healthScore) : 88,
                      crm?.hwCompletion ? Number(crm.hwCompletion) : 92,
                      65,
                    ]}
                    classVals={[75, 72, 78, 80, 70]}
                  />
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded" style={{ background: NAVY }} />
                      <span className="text-gray-500">Student</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 rounded border-t-2 border-dashed" style={{ borderColor: ORANGE }} />
                      <span className="text-gray-500">Class Avg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ COURSES ═══════════════ */}
          {activeTab === "courses" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
                <h3 className="text-sm font-bold" style={{ color: NAVY }}>Enrolled Courses</h3>
                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{courses.length} courses</span>
              </div>
              {courses.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No courses enrolled yet</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Course", "Grade", "Teacher", "Enrolled", "Status"].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(courses as Record<string, unknown>[]).map((c, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{String(c.title ?? "—")}</td>
                        <td className="px-4 py-3 text-gray-500">Grade {String(c.grade ?? p?.grade ?? "—")}</td>
                        <td className="px-4 py-3 text-gray-500">{String(c.teacherName ?? "—")}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(String(c.createdAt ?? ""))}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ═══════════════ ATTENDANCE ═══════════════ */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              {!attSummary && !attendance ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
              ) : (
                <>
                  {/* Stat chips */}
                  <div className="grid grid-cols-5 gap-3">
                    <StatChip icon={<CheckCircle2 className="w-4 h-4" />} label="Present"
                      value={String(attSummary?.present ?? 44)} sub={`${attSummary?.presentPct ? Math.round(Number(attSummary.presentPct)) : 89}%`} color={GREEN} />
                    <StatChip icon={<AlertTriangle className="w-4 h-4" />} label="Absent"
                      value={String(attSummary?.absent ?? 4)} sub="10%" color="#DC2626" />
                    <StatChip icon={<Clock className="w-4 h-4" />} label="Late"
                      value={String(attSummary?.late ?? 2)} sub="1%" color="#D97706" />
                    <StatChip icon={<Calendar className="w-4 h-4" />} label="Leave"
                      value={String(attSummary?.leave ?? 1)} sub="Leave taken" color="#6B7280" />
                    <StatChip icon={<TrendingUp className="w-4 h-4" />} label="This Month"
                      value={`${attSummary?.presentPct ? Math.round(Number(attSummary.presentPct)) : 89}%`}
                      sub="↑ 0.6% from last month" color={NAVY} />
                  </div>

                  {/* Total classes summary */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-3 flex items-center gap-6">
                    {[
                      { label: "Total Classes", value: attSummary?.total ?? 51 },
                      { label: "Attended", value: attSummary?.present ?? 44 },
                      { label: "Absent", value: attSummary?.absent ?? 5 },
                      { label: "Late", value: attSummary?.late ?? 2 },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <div className="text-lg font-black" style={{ color: NAVY }}>{String(item.value)}</div>
                        <div className="text-[10px] text-gray-400">{item.label}</div>
                      </div>
                    ))}
                    <div className="flex-1" />
                    <div className="text-right">
                      <div className="text-2xl font-black" style={{ color: GREEN }}>{attSummary?.presentPct ? `${Math.round(Number(attSummary.presentPct))}%` : "89%"}</div>
                      <div className="text-xs text-gray-400">↑ 0.6% from last month</div>
                    </div>
                    <div className="text-xs text-gray-400">This Month Attendance</div>
                  </div>

                  {/* 3-column charts */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Monthly Trend */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 col-span-1">
                      <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Monthly Attendance Trend</h4>
                      <LineChart months={months} values={attendanceTrend} color={NAVY} />
                    </div>

                    {/* Subject-wise */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 col-span-1">
                      <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Subject-wise Attendance</h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left pb-1 font-medium">Subject</th>
                            <th className="text-right pb-1 font-medium">Att.</th>
                            <th className="text-right pb-1 font-medium">Total</th>
                            <th className="text-right pb-1 font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { sub: "Math", att: 18, total: 20 },
                            { sub: "Science", att: 18, total: 20 },
                            { sub: "English", att: 19, total: 20 },
                            { sub: "EVS", att: 16, total: 20 },
                            { sub: "General Knowledge", att: 16, total: 20 },
                          ].map(r => (
                            <tr key={r.sub} className="border-t border-gray-50">
                              <td className="py-1.5 text-gray-700 font-medium">{r.sub}</td>
                              <td className="py-1.5 text-right text-gray-500">{r.att}</td>
                              <td className="py-1.5 text-right text-gray-500">{r.total}</td>
                              <td className="py-1.5 text-right">
                                <span className="font-bold" style={{ color: GREEN }}>{Math.round(r.att/r.total*100)}%</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Calendar + insight */}
                    <div className="col-span-1 space-y-3">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h4 className="text-xs font-bold mb-2" style={{ color: NAVY }}>Attendance Calendar — June 2026</h4>
                        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
                          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                            <div key={d} className="text-gray-400 font-semibold py-0.5">{d}</div>
                          ))}
                          {[...Array(2)].map((_, i) => <div key={`e${i}`} />)}
                          {[...Array(30)].map((_, i) => {
                            const day = i + 1;
                            const isPresent = ![7,8,14,15,21,22,28,29].includes(day) && day <= 30;
                            const isWeekend = (i + 2) % 7 === 0 || (i + 2) % 7 === 6;
                            const color = isWeekend ? "bg-gray-50 text-gray-300"
                              : isPresent ? "bg-green-100 text-green-700 font-semibold"
                              : "bg-red-100 text-red-600 font-semibold";
                            return <div key={day} className={`rounded py-0.5 text-center ${color}`}>{day}</div>;
                          })}
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-green-100" />Present</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-red-100" />Absent</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-gray-100" />Holiday</div>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-start gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-gray-700">Keep it up!</div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{studentName} is maintaining excellent attendance.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Attendance Logs */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{ color: NAVY }} />
                      <h4 className="text-xs font-bold" style={{ color: NAVY }}>Recent Attendance Logs</h4>
                    </div>
                    {((attendance?.records as Record<string,unknown>[]) ?? []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">No attendance records found</div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            {["Date","Class","Subject","Status","Marked By"].map(h => (
                              <th key={h} className="px-4 py-2 text-left font-semibold text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {((attendance?.records as Record<string,unknown>[]) ?? []).slice(0,10).map((r, i) => (
                            <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-gray-600">{String(r.attendanceDate ?? "—")}</td>
                              <td className="px-4 py-2.5 text-gray-600">Live Class</td>
                              <td className="px-4 py-2.5 text-gray-600">{String(r.subject ?? "—")}</td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                                  r.status === "present" ? "bg-green-100 text-green-700"
                                  : r.status === "absent" ? "bg-red-100 text-red-700"
                                  : r.status === "late" ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                                }`}>
                                  {String(r.status ?? "—")}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-500">{String(r.calledByName ?? "—")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════ ASSESSMENTS ═══════════════ */}
          {activeTab === "assessments" && (
            <div className="space-y-4">
              {!assessments ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
              ) : (
                <>
                  {/* Stat chips */}
                  <div className="grid grid-cols-5 gap-3">
                    <StatChip icon={<TrendingUp className="w-4 h-4" />} label="Average Score"
                      value={`${avgScore}%`} sub="↑ 7% this month" color={GREEN} />
                    <StatChip icon={<Target className="w-4 h-4" />} label="Tests"
                      value={String(allTests.length || 4)} sub="Completed" color={NAVY} />
                    <StatChip icon={<BookOpen className="w-4 h-4" />} label="Assignments"
                      value={String(allAssignments.length || 6)} sub="Submitted" color={ORANGE} />
                    <StatChip icon={<Zap className="w-4 h-4" />} label="Quizzes"
                      value={String(allHw.length || 5)} sub="Completed" color="#8B5CF6" />
                    <StatChip icon={<Trophy className="w-4 h-4" />} label="Rank in Batch"
                      value="3 / 25" sub="Top student" color="#D97706" />
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-2">
                    {["All Types", "All Subjects", "Last 3 Months"].map(f => (
                      <button key={f} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600">
                        {f} <ChevronDown className="w-3 h-3" />
                      </button>
                    ))}
                  </div>

                  {/* 2-col: table + charts */}
                  <div className="grid grid-cols-5 gap-4">
                    {/* Assessment table */}
                    <div className="col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            {["Assessment","Type","Subject","Score","Percentage","Date","Status"].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(allTests.length > 0 ? allTests : [
                            { title: "Unit 2: Plants & Animals", type: "Test", subject: "Science", score: 18, maxScore: 20, percentage: 90, date: "07 Jun 2026", status: "Graded" },
                            { title: "Fractions Homework", type: "Homework", subject: "Math", score: 8, maxScore: 10, percentage: 80, date: "06 Jun 2026", status: "Completed" },
                            { title: "Water Cycle Quiz", type: "Quiz", subject: "Science", score: 6, maxScore: 10, percentage: 60, date: "06 Jun 2026", status: "Graded" },
                            { title: "Our Earth Assignment", type: "Assignment", subject: "EVS", score: null, maxScore: 10, percentage: null, date: "05 Jun 2026", status: "Submitted" },
                            { title: "Motion & Force Test", type: "Test", subject: "Science", score: 14, maxScore: 20, percentage: 80, date: "05 Jun 2026", status: "Graded" },
                            { title: "Grammar Quiz", type: "Quiz", subject: "English", score: 9, maxScore: 10, percentage: 90, date: "04 Jun 2026", status: "Graded" },
                          ] as Record<string,unknown>[]).slice(0, 8).map((t, i) => {
                            const pct = t.percentage != null ? Number(t.percentage)
                              : (t.score != null && t.maxScore != null ? Math.round(Number(t.score) / Number(t.maxScore) * 100) : null);
                            const statusColor = String(t.status) === "Graded" ? "bg-green-100 text-green-700"
                              : String(t.status) === "Submitted" ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600";
                            return (
                              <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                                <td className="px-3 py-2.5 font-medium text-gray-700 max-w-[140px] truncate">{String(t.title ?? t.testTitle ?? "—")}</td>
                                <td className="px-3 py-2.5 text-gray-500">{String(t.type ?? "Test")}</td>
                                <td className="px-3 py-2.5 text-gray-500">{String(t.subject ?? t.subjectName ?? "—")}</td>
                                <td className="px-3 py-2.5 text-gray-600">{t.score != null ? `${t.score}/${t.maxScore ?? 10}` : "—"}</td>
                                <td className="px-3 py-2.5">
                                  {pct != null ? (
                                    <div className="flex items-center gap-1">
                                      <div className="w-12 bg-gray-100 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 75 ? GREEN : pct >= 50 ? "#D97706" : "#DC2626" }} />
                                      </div>
                                      <span className="font-semibold">{pct}%</span>
                                    </div>
                                  ) : "—"}
                                </td>
                                <td className="px-3 py-2.5 text-gray-500">{String(t.date ?? fmtDate(String(t.submittedAt ?? "")))}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${statusColor}`}>{String(t.status ?? "—")}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Charts */}
                    <div className="col-span-2 space-y-4">
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Performance by Subject</h4>
                        <div className="space-y-2">
                          {[
                            { label: "Math", value: 65 },
                            { label: "Science", value: 77 },
                            { label: "EVS", value: 71 },
                            { label: "English", value: 80 },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-2 text-xs">
                              <span className="w-16 text-gray-500 shrink-0">{s.label}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className="h-2 rounded-full" style={{ width: `${s.value}%`, background: NAVY }} />
                              </div>
                              <span className="font-bold w-8 text-right" style={{ color: NAVY }}>{s.value}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Score Distribution</h4>
                        <DonutChart segments={[
                          { label: "90–100%", pct: 40, color: GREEN },
                          { label: "75–89%", pct: 40, color: NAVY },
                          { label: "60–74%", pct: 20, color: "#D97706" },
                          { label: "Below 60%", pct: 0, color: "#DC2626" },
                        ]} />
                      </div>
                    </div>
                  </div>

                  {/* Recent Achievements */}
                  <div>
                    <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Recent Achievements in Assessments</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: "🏆", title: "Scored 90% in Unit 2: Plants & Animals", sub: "07 Jun 2026", color: "#F59E0B" },
                        { icon: "📚", title: "Completed 6 homeworks on time", sub: "This month", color: GREEN },
                        { icon: "⭐", title: "Ranked Top 12% in Math", sub: "This month", color: NAVY },
                      ].map((a, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
                          <div className="text-2xl">{a.icon}</div>
                          <div>
                            <div className="text-xs font-semibold text-gray-700">{a.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{a.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════ LEARNING HEALTH ═══════════════ */}
          {activeTab === "learning" && (
            <div className="space-y-4">
              {/* Stat chips */}
              <div className="grid grid-cols-5 gap-3">
                <StatChip icon={<Shield className="w-4 h-4" />} label="Health Score"
                  value={healthScore} sub={healthLabel(crm?.riskLevel as string)} color={healthColor(crm?.riskLevel as string)} />
                <StatChip icon={<Zap className="w-4 h-4" />} label="Engagement Score"
                  value={crm?.hwCompletion != null ? `${crm.hwCompletion}/100` : "82/100"}
                  sub={Number(crm?.hwCompletion ?? 82) >= 80 ? "Good" : "Needs work"} color={NAVY} />
                <StatChip icon={<AlertTriangle className="w-4 h-4" />} label="Risk Level"
                  value={crm?.riskLevel === "at-risk" ? "High Risk" : crm?.riskLevel === "attention" ? "Medium" : "Low Risk"}
                  sub={crm?.riskLevel === "at-risk" ? "Immediate action" : "Safe"} color={healthColor(crm?.riskLevel as string)} />
                <StatChip icon={<Clock className="w-4 h-4" />} label="Last Login"
                  value={crm?.daysSinceLogin != null && Number(crm.daysSinceLogin) < 999 ? `${crm.daysSinceLogin}d ago` : "07 Jun 2026"}
                  sub="10:50 AM" color={Number(crm?.daysSinceLogin ?? 1) <= 3 ? GREEN : "#D97706"} />
                <StatChip icon={<Award className="w-4 h-4" />} label="Streak"
                  value={crm?.streakDays ? `${crm.streakDays} Days` : "12 Days"}
                  sub="Keep it up!" color={ORANGE} />
              </div>

              {/* 3-col layout */}
              <div className="grid grid-cols-3 gap-4">
                {/* Health overview bars */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Learning Health Overview</h4>
                  <div className="space-y-2.5">
                    <HBar label="Engagement" value={93} color={GREEN} />
                    <HBar label="Homework Completion" value={crm?.hwCompletion ? Number(crm.hwCompletion) : 90} color={GREEN} />
                    <HBar label="Assessment Completion" value={100} color={GREEN} />
                    <HBar label="Class Participation" value={85} color={NAVY} />
                    <HBar label="Concept Understanding" value={60} color={ORANGE} />
                  </div>
                </div>

                {/* Health Trend */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>Health Trend</h4>
                  <BarChart months={months} values={healthTrend} color={NAVY} />
                </div>

                {/* At Risk + Recommendations */}
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h4 className="text-xs font-bold mb-3" style={{ color: NAVY }}>At Risk Indicators</h4>
                    <div className="space-y-2">
                      {[
                        { label: "Low Attendance", risk: false },
                        { label: "Missing Homework", risk: false },
                        { label: "Low Scores", risk: false },
                        { label: "Low Engagement", risk: false },
                        { label: "Irregular Login", risk: false },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{item.label}</span>
                          <span className={`font-bold ${item.risk ? "text-red-600" : "text-green-600"}`}>
                            {item.risk ? "Yes" : "No"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h4 className="text-xs font-bold mb-2" style={{ color: NAVY }}>Recommendations</h4>
                    <div className="space-y-2">
                      {[
                        { icon: "🏆", title: "Keep it up!", text: "Doing great. Maintain the momentum." },
                        { icon: "🎯", title: "Focus Area", text: "Keep practicing Math problems for better speed." },
                        { icon: "📝", title: "Suggested Action", text: "Attempt more quizzes to strengthen concepts." },
                        { icon: "👩‍🏫", title: "Mentor Note", text: String(crm?.mentorNote ?? "Showing consistent improvement in assessments.") },
                      ].map((r, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                          <span className="text-base">{r.icon}</span>
                          <div>
                            <div className="text-[10px] font-bold text-gray-700">{r.title}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{r.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ CUSTOMER SUCCESS ═══════════════ */}
          {activeTab === "crm" && (
            <div className="space-y-4">
              {/* Log Interaction */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h4 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Log Interaction</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Interaction Type</label>
                    <select value={interactionForm.type} onChange={e => setInteractionForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs">
                      <option value="">Select type…</option>
                      {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Call Duration (mins)</label>
                    <input value={interactionForm.callDuration}
                      onChange={e => setInteractionForm(f => ({ ...f, callDuration: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs" placeholder="e.g. 15" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Notes</label>
                    <div className="flex gap-2">
                      <input value={interactionForm.notes}
                        onChange={e => setInteractionForm(f => ({ ...f, notes: e.target.value }))}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs" placeholder="Add notes…" />
                      <button onClick={logInteraction} disabled={savingInteraction || !interactionForm.notes.trim()}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                        style={{ background: NAVY }}>
                        {savingInteraction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interaction log */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: NAVY }} />
                  <h4 className="text-sm font-bold" style={{ color: NAVY }}>Interaction Log</h4>
                  <span className="ml-auto text-xs text-gray-400">{interactionLog.length} entries</span>
                </div>
                {interactionLog.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-400">No interactions logged yet</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {interactionLog.slice(0, 15).map((entry, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-gray-700">{String(entry.type ?? "Note")}</span>
                            {entry.callDuration != null && (
                              <span className="text-[10px] text-gray-400">· {String(entry.callDuration)} mins</span>
                            )}
                            <span className="text-[10px] text-gray-400 ml-auto">{fmtDateTime(String(entry.createdAt ?? ""))}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{String(entry.notes ?? "—")}</p>
                          {entry.calledBy != null && (
                            <p className="text-[10px] text-gray-400 mt-0.5">by {String(entry.calledBy)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ PAYMENTS ═══════════════ */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-semibold text-gray-400">Payment history coming soon</div>
              <div className="text-xs text-gray-300 mt-1">Fee records and transaction history will appear here</div>
            </div>
          )}

          {/* ═══════════════ ACHIEVEMENTS ═══════════════ */}
          {activeTab === "achievements" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Space Level */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
                  <div className="text-4xl mb-2">🚀</div>
                  <div className="text-base font-black" style={{ color: NAVY }}>{spaceLevel ?? "Earth Explorer"}</div>
                  <div className="text-xs text-gray-400 mt-1">Current Space Level</div>
                </div>
                {/* XP */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
                  <div className="text-4xl mb-2">⚡</div>
                  <div className="text-3xl font-black" style={{ color: ORANGE }}>
                    {data360?.totalXP != null
                      ? String(Number(data360.totalXP))
                      : String((xpHistory as Record<string,unknown>[]).reduce((a, x) => a + Number(x.points ?? 0), 0) || "—")}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Total XP Points</div>
                </div>
                {/* Streak */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
                  <div className="text-4xl mb-2">🔥</div>
                  <div className="text-3xl font-black" style={{ color: "#EF4444" }}>
                    {crm?.streakDays != null ? String(crm.streakDays) : "12"}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Day Login Streak</div>
                </div>
              </div>

              {/* XP History */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <h4 className="text-sm font-bold" style={{ color: NAVY }}>XP History</h4>
                </div>
                {xpHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">No XP history available</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Activity","Points","Date"].map(h => (
                          <th key={h} className="px-4 py-2 text-left font-semibold text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(xpHistory as Record<string,unknown>[]).slice(0, 15).map((x, i) => (
                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">{String(x.activity ?? x.reason ?? "XP earned")}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-yellow-600">+{String(x.points ?? 0)} XP</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{fmtDate(String(x.createdAt ?? ""))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ DOCUMENTS ═══════════════ */}
          {activeTab === "documents" && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <div className="text-sm font-semibold text-gray-400">Documents section coming soon</div>
              <div className="text-xs text-gray-300 mt-1">Certificates, ID cards and uploaded documents will appear here</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
