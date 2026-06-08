import { useState, useEffect } from "react";
import {
  ArrowLeft, ChevronRight, ChevronDown, User, Phone, Mail, MapPin,
  BookOpen, Star, Zap, Clock, CheckCircle, AlertCircle, Activity,
  Edit2, Save, Loader2, Target, ClipboardList, Trophy, FileText,
  TrendingUp, Heart, Shield, Calendar, Award, FolderOpen,
  CreditCard, BarChart2, AlertTriangle, CheckCircle2,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  return new Date(d.includes("T") ? d : d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
function healthColor(level: string) {
  return level === "excellent" ? GREEN : level === "good" ? "#16A34A" : level === "attention" ? "#D97706" : "#DC2626";
}
function healthBg(level: string) {
  return level === "excellent" ? "#DCFCE7" : level === "good" ? "#D1FAE5" : level === "attention" ? "#FEF3C7" : "#FEE2E2";
}
function healthLabel(level: string) {
  return level === "at-risk" ? "At Risk" : level === "attention" ? "Needs Attention" : level === "good" ? "Good" : "Excellent";
}
const SPACE_COLORS: Record<string, string> = {
  "Universe Champion": "#8B5CF6", "Galaxy Master": "#3B82F6",
  "Saturn Explorer": "#F59E0B", "Mars Explorer": "#EF4444",
  "Moon Explorer": "#6B7280", "Earth Explorer": "#22C55E",
};
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

interface Profile360 {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; board: string | null; state: string | null;
  city: string | null; points: number; rank: number | null; streakDays: number;
  isActive: boolean; createdAt: string; lastLoginAt: string | null;
}
interface EnrolledCourse { courseId: number; title: string; grade: number; teacher: string | null; enrolledAt: string; }
interface XPItem { amount: number; actionType: string; note: string | null; createdAt: string; }
interface Data360 {
  profile: Profile360; enrolledCourses: EnrolledCourse[];
  recentHw: { id: number; title: string; status: string; marks: number | null; submittedAt: string }[];
  recentTests: { id: number; title: string; score: number | null; maxScore: number | null; submittedAt: string }[];
  recentAssignments: { id: number; title: string; status: string; marks: number | null; submittedAt: string }[];
  xpHistory: XPItem[]; spaceLevel: string;
}
interface CrmStudent {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; lastLoginDate: string | null; isActive: boolean;
  leadStage: string | null; parentName: string | null; parentPhone: string | null;
  healthScore: number; riskLevel: "excellent" | "good" | "attention" | "at-risk";
  daysSinceLogin: number; hwCompletion: number; attendancePct: number | null;
}
interface CrmTimeline {
  id: number; noteType: string; remark: string; followUpDate: string | null;
  actionTaken: string | null; createdAt: string; createdByName: string; createdByRole: string;
}
interface CrmFollowUp {
  id: number; noteType: string | null; note: string | null; callStatus: string | null;
  nextFollowUpDate: string | null; createdAt: string; leadStatus: string | null;
  calledByName: string | null; mentorName: string | null;
  fuStatus: string; daysOverdue: number;
}
interface CrmData {
  student: CrmStudent;
  assignedMentor: { mentorId: number; mentorName: string | null; mentorEmail: string | null } | null;
  timeline: CrmTimeline[];
  followUps: CrmFollowUp[];
}
interface AttendanceRecord {
  id: number; attendanceDate: string; status: string; remark: string | null;
  calledByName: string | null; createdAt: string;
}
interface AttendanceData {
  records: AttendanceRecord[];
  summary: { total: number; present: number; absent: number; late: number; leave: number; presentPct: number };
}
interface StudentAssessments {
  homework: { id: number; title: string; grade: number; maxMarks: number; marks: number | null; scorePct: number | null; status: string; submittedAt: string }[];
  assignments: { id: number; title: string; grade: number; maxMarks: number; marks: number | null; scorePct: number | null; status: string; submittedAt: string }[];
  tests: { id: number; title: string; grade: number; maxMarks: number; score: number | null; maxScore: number | null; scorePct: number | null; submittedAt: string; testType: string | null }[];
  summary: { totalSubmissions: number; avgScore: number; pendingCount: number; rank: number };
}

type Tab360 = "overview" | "courses" | "attendance" | "assessments" | "learning-health" | "customer-success" | "payments" | "achievements" | "documents";

const TABS: { key: Tab360; label: string; icon: typeof BookOpen }[] = [
  { key: "overview", label: "Overview", icon: User },
  { key: "courses", label: "Courses", icon: BookOpen },
  { key: "attendance", label: "Attendance", icon: Calendar },
  { key: "assessments", label: "Assessments", icon: ClipboardList },
  { key: "learning-health", label: "Learning Health", icon: Heart },
  { key: "customer-success", label: "Customer Success", icon: Target },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "achievements", label: "Achievements", icon: Award },
  { key: "documents", label: "Documents", icon: FolderOpen },
];

function ProgressBar({ pct, color = NAVY }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

function DonutRing({ pct, color = GREEN, size = 80 }: { pct: number; color?: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

function MonthlyBar({ month, pct, max }: { month: string; pct: number; max: number }) {
  const h = max > 0 ? Math.round((pct / max) * 60) : 0;
  const color = pct >= 90 ? GREEN : pct >= 75 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] text-gray-400 font-medium">{pct}%</span>
      <div className="w-5 rounded-t-sm" style={{ height: `${Math.max(4, h)}px`, background: color }} />
      <span className="text-[9px] text-gray-400">{month}</span>
    </div>
  );
}

export function Student360Page({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab360>("overview");
  const [data360, setData360] = useState<Data360 | null>(null);
  const [crmData, setCrmData] = useState<CrmData | null>(null);
  const [assessmentData, setAssessmentData] = useState<StudentAssessments | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  // CRM form state
  const [editingStage, setEditingStage] = useState(false);
  const [stageValue, setStageValue] = useState("");
  const [editingParent, setEditingParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [crmSaving, setCrmSaving] = useState(false);
  const [interactionType, setInteractionType] = useState("General Note");
  const [remark, setRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/admin/students/${userId}/360`).then(r => r.json() as Promise<Data360>),
      apiFetch(`/admin/students/${userId}/crm`).then(r => r.json() as Promise<CrmData>),
    ]).then(([d360, crm]) => {
      setData360(d360);
      setCrmData(crm);
      setStageValue(crm.student.leadStage ?? "");
      setParentName(crm.student.parentName ?? "");
      setParentPhone(crm.student.parentPhone ?? "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (activeTab === "assessments" && !assessmentData) {
      apiFetch(`/admin/students/${userId}/assessments`).then(r => r.json()).then(setAssessmentData).catch(() => {});
    }
    if (activeTab === "attendance" && !attendanceData) {
      apiFetch(`/admin/students/${userId}/attendance`).then(r => r.json()).then(setAttendanceData).catch(() => {});
    }
  }, [activeTab]);

  async function saveCrmField(field: "stage" | "parent") {
    setCrmSaving(true);
    const body = field === "stage" ? { leadStage: stageValue || null } : { parentName: parentName || null, parentPhone: parentPhone || null };
    await apiFetch(`/admin/students/${userId}/crm`, { method: "PATCH", body: JSON.stringify(body) });
    if (field === "stage") setEditingStage(false); else setEditingParent(false);
    const freshCrm = await apiFetch(`/admin/students/${userId}/crm`).then(r => r.json() as Promise<CrmData>);
    setCrmData(freshCrm);
    setCrmSaving(false);
  }

  async function logInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!remark.trim()) return;
    setNoteSaving(true);
    const r = await apiFetch("/admin/btl-crm/timeline", {
      method: "POST",
      body: JSON.stringify({ studentId: userId, noteType: interactionType, remark, followUpDate: followUpDate || null, actionTaken: actionTaken || null }),
    });
    if (r.ok) {
      setRemark(""); setFollowUpDate(""); setActionTaken(""); setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 2500);
      const freshCrm = await apiFetch(`/admin/students/${userId}/crm`).then(r2 => r2.json() as Promise<CrmData>);
      setCrmData(freshCrm);
    }
    setNoteSaving(false);
  }

  const p = data360?.profile;
  const crm = crmData?.student;
  const levelColor = data360 ? (SPACE_COLORS[data360.spaceLevel] ?? NAVY) : NAVY;

  // KPI cards data
  const kpis = [
    { label: "Attendance", value: crm?.attendancePct != null ? `${crm.attendancePct}%` : "—", sub: crm?.attendancePct != null ? (crm.attendancePct >= 85 ? "↑ Good" : "↓ Low") : "No data", color: crm?.attendancePct != null && crm.attendancePct >= 85 ? GREEN : "#EF4444", icon: Calendar },
    { label: "Assessment", value: assessmentData ? `${assessmentData.summary.avgScore}%` : (crm?.healthScore != null ? `${crm.healthScore}%` : "—"), sub: "Avg score", color: "#3B82F6", icon: ClipboardList },
    { label: "Homework", value: crm?.hwCompletion != null ? `${crm.hwCompletion}%` : "—", sub: crm?.hwCompletion != null ? (crm.hwCompletion >= 80 ? "↑ Good" : "↓ Needs work") : "No data", color: ORANGE, icon: BookOpen },
    { label: "Health Score", value: crm?.healthScore != null ? `${crm.healthScore}/100` : "—", sub: crm ? healthLabel(crm.riskLevel) : "", color: crm ? healthColor(crm.riskLevel) : NAVY, icon: Heart },
    { label: "Course Progress", value: data360?.enrolledCourses.length ? `${data360.enrolledCourses.length} active` : "—", sub: "Enrolled courses", color: "#8B5CF6", icon: TrendingUp },
    { label: "Status", value: crm?.leadStage ?? (p?.isActive ? "Active" : "Inactive"), sub: p?.isActive ? "Account active" : "Account inactive", color: p?.isActive ? GREEN : "#6B7280", icon: Shield },
  ];

  // Unified interaction log
  type UnifiedEntry = { key: string; kind: "timeline" | "checkin"; authorName: string; authorRole: string; noteType: string; text: string; createdAt: string; actionTaken: string | null; followUpDate: string | null; callStatus: string | null; fuStatus: string | null; daysOverdue: number; };
  const unifiedLog: UnifiedEntry[] = crmData ? [
    ...crmData.timeline.map(e => ({ key: `tl-${e.id}`, kind: "timeline" as const, authorName: e.createdByName, authorRole: e.createdByRole, noteType: e.noteType, text: e.remark, createdAt: e.createdAt, actionTaken: e.actionTaken, followUpDate: e.followUpDate, callStatus: null, fuStatus: null, daysOverdue: 0 })),
    ...crmData.followUps.map(f => ({ key: `fu-${f.id}`, kind: "checkin" as const, authorName: f.calledByName ?? f.mentorName ?? "Mentor", authorRole: "mentor", noteType: f.noteType ?? "Check-in", text: f.note ?? "", createdAt: f.createdAt, actionTaken: null, followUpDate: f.nextFollowUpDate, callStatus: f.callStatus, fuStatus: f.fuStatus, daysOverdue: f.daysOverdue })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  // Attendance monthly trend (last 6 months)
  const monthlyAttendance = (() => {
    if (!attendanceData) return [];
    const now = new Date();
    const months: { key: string; label: string; present: number; total: number; pct: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const recs = attendanceData.records.filter(r => r.attendanceDate.startsWith(key));
      const present = recs.filter(r => r.status === "present").length;
      const total = recs.length;
      months.push({ key, label, present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 });
    }
    return months;
  })();
  const maxAttPct = Math.max(...monthlyAttendance.map(m => m.pct), 1);

  // Assessment performance by type
  const perfByType = assessmentData ? [
    { label: "Homework", count: assessmentData.homework.length, avg: assessmentData.homework.length ? Math.round(assessmentData.homework.filter(h => h.scorePct != null).reduce((a, h) => a + (h.scorePct ?? 0), 0) / Math.max(1, assessmentData.homework.filter(h => h.scorePct != null).length)) : 0, color: "#3B82F6" },
    { label: "Assignments", count: assessmentData.assignments.length, avg: assessmentData.assignments.length ? Math.round(assessmentData.assignments.filter(a => a.scorePct != null).reduce((s, a) => s + (a.scorePct ?? 0), 0) / Math.max(1, assessmentData.assignments.filter(a => a.scorePct != null).length)) : 0, color: "#8B5CF6" },
    { label: "Tests", count: assessmentData.tests.filter(t => t.testType !== "quiz").length, avg: assessmentData.tests.filter(t => t.testType !== "quiz" && t.scorePct != null).length ? Math.round(assessmentData.tests.filter(t => t.testType !== "quiz" && t.scorePct != null).reduce((s, t) => s + (t.scorePct ?? 0), 0) / assessmentData.tests.filter(t => t.testType !== "quiz" && t.scorePct != null).length) : 0, color: NAVY },
    { label: "Quizzes", count: assessmentData.tests.filter(t => t.testType === "quiz").length, avg: assessmentData.tests.filter(t => t.testType === "quiz" && t.scorePct != null).length ? Math.round(assessmentData.tests.filter(t => t.testType === "quiz" && t.scorePct != null).reduce((s, t) => s + (t.scorePct ?? 0), 0) / assessmentData.tests.filter(t => t.testType === "quiz" && t.scorePct != null).length) : 0, color: ORANGE },
  ] : [];

  // Score distribution
  const scoreDist = assessmentData ? (() => {
    const all = [
      ...assessmentData.homework.map(h => h.scorePct), ...assessmentData.assignments.map(a => a.scorePct),
      ...assessmentData.tests.map(t => t.scorePct),
    ].filter((v): v is number => v != null);
    const total = all.length || 1;
    return [
      { label: "90–100%", count: all.filter(v => v >= 90).length, color: "#059669" },
      { label: "75–89%", count: all.filter(v => v >= 75 && v < 90).length, color: "#3B82F6" },
      { label: "60–74%", count: all.filter(v => v >= 60 && v < 75).length, color: "#F59E0B" },
      { label: "Below 60%", count: all.filter(v => v < 60).length, color: "#EF4444" },
    ].map(b => ({ ...b, pct: Math.round((b.count / total) * 100) }));
  })() : [];

  // At-risk indicators
  const riskIndicators = crm ? [
    { label: "Low Attendance", at_risk: crm.attendancePct != null && crm.attendancePct < 75 },
    { label: "Missing Homework", at_risk: crm.hwCompletion < 70 },
    { label: "Inactive Login", at_risk: crm.daysSinceLogin > 7 },
    { label: "Low Health Score", at_risk: crm.healthScore < 50 },
    { label: "Irregular Engagement", at_risk: crm.riskLevel === "at-risk" || crm.riskLevel === "attention" },
  ] : [];

  const nextFollowUp = crmData?.followUps.find(f => f.fuStatus === "due_today" || f.fuStatus === "upcoming" || f.fuStatus === "overdue");
  const latestNote = crmData?.timeline[0];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-gray-100 border-t-blue-500 animate-spin" style={{ borderWidth: 3 }} />
          <div className="text-sm text-gray-500">Loading Student 360…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="h-12 shrink-0 bg-white border-b border-gray-200 flex items-center px-5 gap-2 z-10">
        <button onClick={onBack} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors text-xs font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
          Students
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        <span className="text-xs font-bold" style={{ color: NAVY }}>Student 360</span>
        <div className="flex-1" />
        <span className="text-xs text-gray-400">Student ID:</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50" style={{ color: NAVY }}>
          STU{String(userId).padStart(4, "0")}
        </span>
        <div className="relative ml-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors" style={{ background: NAVY }}>
            Actions <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Student Header ──────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100 px-6 pt-5 pb-4">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg" style={{ background: NAVY }}>
              {p?.name?.[0]?.toUpperCase() ?? "?"}
            </div>

            {/* Core info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-black" style={{ color: NAVY }}>{p?.name ?? "—"}</h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${p?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {p?.isActive ? "Active" : "Inactive"}
                </span>
                {crm?.leadStage && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${SUCCESS_STAGE_COLORS[crm.leadStage] ?? "#6B7280"}18`, color: SUCCESS_STAGE_COLORS[crm.leadStage] ?? "#6B7280" }}>
                    {crm.leadStage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                {(p?.grade ?? 0) > 0 && <span className="font-semibold text-blue-600">Grade {p?.grade}</span>}
                {p?.school && <><span className="text-gray-300">·</span><span>{p.school}</span></>}
                {p?.board && <><span className="text-gray-300">·</span><span>{p.board}</span></>}
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
                {crmData?.assignedMentor?.mentorName && (
                  <span className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" /> Mentor: <b className="text-gray-700">{crmData.assignedMentor.mentorName}</b></span>
                )}
                {data360?.enrolledCourses[0]?.teacher && (
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-gray-400" /> Teacher: <b className="text-gray-700">{data360.enrolledCourses[0].teacher}</b></span>
                )}
                {p?.createdAt && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gray-400" /> Enrolled on: {fmtDate(p.createdAt)}</span>
                )}
                {data360?.spaceLevel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: levelColor }}>
                    <Star className="w-2.5 h-2.5" /> {data360.spaceLevel}
                  </span>
                )}
              </div>

              {/* Quick Notes + Next Follow-up */}
              {(latestNote || nextFollowUp) && (
                <div className="flex gap-3 mt-3 flex-wrap">
                  {latestNote && (
                    <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-3 py-2 text-xs max-w-xs">
                      <Activity className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Quick Notes</div>
                        <p className="text-gray-600 line-clamp-2">{latestNote.remark}</p>
                      </div>
                    </div>
                  )}
                  {nextFollowUp?.nextFollowUpDate && (
                    <div className="flex items-start gap-2 bg-orange-50 rounded-xl px-3 py-2 text-xs max-w-xs">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-0.5">Next Follow-up</div>
                        <p className="text-gray-600">{fmtDate(nextFollowUp.nextFollowUpDate)} · {nextFollowUp.note?.slice(0, 40) ?? "No note"}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
            {kpis.map(k => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/80">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${k.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: k.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black leading-tight" style={{ color: k.color }}>{k.value}</div>
                    <div className="text-[10px] text-gray-400 leading-tight truncate">{k.label}</div>
                    {k.sub && <div className="text-[9px] text-gray-400 leading-tight">{k.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100 px-6 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
                  style={isActive
                    ? { borderBottomColor: NAVY, color: NAVY }
                    : { borderBottomColor: "transparent", color: "#9CA3AF" }}>
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab Content ─────────────────────────────────────────── */}
        <div className="p-6">

          {/* ═══════════════ OVERVIEW ═══════════════ */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Personal Information */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}10` }}>
                    <User className="w-3.5 h-3.5" style={{ color: NAVY }} />
                  </div>
                  <h3 className="text-sm font-black" style={{ color: NAVY }}>Personal Information</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Full Name", value: p?.name },
                    { label: "Email", value: p?.email, icon: <Mail className="w-3 h-3 text-gray-400" /> },
                    { label: "Phone", value: p?.phone, icon: <Phone className="w-3 h-3 text-gray-400" /> },
                    { label: "Grade", value: p?.grade ? `Grade ${p.grade}` : null },
                    { label: "School", value: p?.school },
                    { label: "Board", value: p?.board },
                    { label: "State", value: p?.state },
                    { label: "City", value: p?.city },
                    { label: "Joined", value: p?.createdAt ? fmtDate(p.createdAt) : null },
                    { label: "User ID", value: p?.id ? `#${p.id}` : null },
                    { label: "Last Login", value: p?.lastLoginAt ? fmtDate(p.lastLoginAt) : "Never" },
                  ].map(f => (
                    <div key={f.label} className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-gray-400 font-medium shrink-0">{f.label}</span>
                      <span className="text-[11px] font-semibold text-gray-700 text-right">{f.value ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parent / Guardian Details */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${GREEN}10` }}>
                      <Phone className="w-3.5 h-3.5" style={{ color: GREEN }} />
                    </div>
                    <h3 className="text-sm font-black" style={{ color: NAVY }}>Parent / Guardian</h3>
                  </div>
                  <button onClick={() => setEditingParent(v => !v)} className="text-gray-300 hover:text-blue-500 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {editingParent ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-medium">Parent Name</label>
                      <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent name"
                        className="w-full mt-0.5 px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-300" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-medium">Phone</label>
                      <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="+91 XXXXXXXXXX"
                        className="w-full mt-0.5 px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-300" />
                    </div>
                    <button onClick={() => saveCrmField("parent")} disabled={crmSaving}
                      className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60 mt-2"
                      style={{ background: GREEN }}>
                      {crmSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {[
                        { label: "Name", value: crm?.parentName },
                        { label: "Relation", value: "Parent" },
                        { label: "Contact", value: crm?.parentPhone },
                        { label: "Email", value: p?.email },
                      ].map(f => (
                        <div key={f.label} className="flex items-start justify-between gap-2">
                          <span className="text-[11px] text-gray-400 font-medium shrink-0">{f.label}</span>
                          <span className="text-[11px] font-semibold text-gray-700 text-right">{f.value ?? "—"}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Success Mentor</div>
                      {crmData?.assignedMentor ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "#8B5CF6" }}>
                            {crmData.assignedMentor.mentorName?.[0] ?? "M"}
                          </div>
                          <div>
                            <div className="text-xs font-bold" style={{ color: NAVY }}>{crmData.assignedMentor.mentorName ?? "—"}</div>
                            <div className="text-[10px] text-gray-400">{crmData.assignedMentor.mentorEmail ?? ""}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">No mentor assigned</div>
                      )}
                    </div>

                    {/* Student Status */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Status</div>
                        <button onClick={() => setEditingStage(v => !v)} className="text-gray-300 hover:text-blue-500 transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                      {editingStage ? (
                        <div className="space-y-2">
                          <select value={stageValue} onChange={e => setStageValue(e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                            <option value="">— Not set —</option>
                            {SUCCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => saveCrmField("stage")} disabled={crmSaving}
                            className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                            style={{ background: GREEN }}>
                            {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={crm?.leadStage
                            ? { background: `${SUCCESS_STAGE_COLORS[crm.leadStage] ?? "#6B7280"}18`, color: SUCCESS_STAGE_COLORS[crm.leadStage] ?? "#6B7280" }
                            : { background: "#F3F4F6", color: "#9CA3AF" }}>
                          {crm?.leadStage ?? "Not set"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Academic Snapshot */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${ORANGE}10` }}>
                    <BarChart2 className="w-3.5 h-3.5" style={{ color: ORANGE }} />
                  </div>
                  <h3 className="text-sm font-black" style={{ color: NAVY }}>Academic Snapshot</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Attendance", value: crm?.attendancePct ?? 0, color: GREEN },
                    { label: "Assessment Score", value: assessmentData?.summary?.avgScore ?? crm?.healthScore ?? 0, color: "#3B82F6" },
                    { label: "Homework", value: crm?.hwCompletion ?? 0, color: ORANGE },
                    { label: "Health Score", value: crm?.healthScore ?? 0, color: crm ? healthColor(crm.riskLevel) : NAVY },
                    { label: "Course Enrolled", value: Math.min(100, (data360?.enrolledCourses.length ?? 0) * 20), color: "#8B5CF6" },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-500 font-medium">{m.label}</span>
                        <span className="font-bold text-gray-700">{m.value}%</span>
                      </div>
                      <ProgressBar pct={m.value} color={m.color} />
                    </div>
                  ))}
                </div>

                {/* Points & XP */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "XP Points", value: p?.points ?? 0, color: ORANGE },
                      { label: "Streak", value: `${p?.streakDays ?? 0}d`, color: "#F59E0B" },
                      { label: "Rank", value: p?.rank ? `#${p.rank}` : "—", color: "#8B5CF6" },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-50 rounded-xl p-2">
                        <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[9px] text-gray-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ COURSES ═══════════════ */}
          {activeTab === "courses" && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-black" style={{ color: NAVY }}>Enrolled Courses</h3>
                <span className="text-xs text-gray-400">{data360?.enrolledCourses.length ?? 0} courses</span>
              </div>
              {!data360?.enrolledCourses.length ? (
                <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
                  <BookOpen className="w-10 h-10 text-gray-200" />
                  <span className="text-sm font-medium">No courses enrolled yet</span>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {["Course Name", "Grade", "Teacher", "Enrolled On", "Status"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data360.enrolledCourses.map((c, i) => (
                      <tr key={c.courseId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${NAVY}10` }}>
                              <BookOpen className="w-3.5 h-3.5" style={{ color: NAVY }} />
                            </div>
                            <span className="font-semibold" style={{ color: NAVY }}>{c.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">Grade {c.grade}</td>
                        <td className="px-5 py-3.5 text-gray-600">{c.teacher ?? "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{fmtDate(c.enrolledAt)}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Active</span>
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
            <div className="space-y-5">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Present", value: attendanceData?.summary.present ?? "—", color: GREEN, bg: "#DCFCE7" },
                  { label: "Absent", value: attendanceData?.summary.absent ?? "—", color: "#EF4444", bg: "#FEE2E2" },
                  { label: "Late", value: attendanceData?.summary.late ?? "—", color: "#F59E0B", bg: "#FEF3C7" },
                  { label: "Leave", value: attendanceData?.summary.leave ?? "—", color: "#6B7280", bg: "#F3F4F6" },
                  { label: "This Month", value: attendanceData?.summary.presentPct != null ? `${attendanceData.summary.presentPct}%` : "—", color: NAVY, bg: "#EFF6FF" },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: s.bg }}>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Monthly Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4" style={{ color: NAVY }} />
                    <h3 className="text-sm font-black" style={{ color: NAVY }}>Monthly Attendance Trend</h3>
                  </div>
                  {monthlyAttendance.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">No attendance data</div>
                  ) : (
                    <div className="flex items-end gap-3 h-24 justify-center">
                      {monthlyAttendance.map(m => (
                        <MonthlyBar key={m.key} month={m.label} pct={m.pct} max={maxAttPct} />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 mt-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: GREEN }} />≥90%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#F59E0B" }} />75–89%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#EF4444" }} />&lt;75%</span>
                  </div>
                </div>

                {/* Attendance summary donut */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4" style={{ color: NAVY }} />
                    <h3 className="text-sm font-black" style={{ color: NAVY }}>Overall Summary</h3>
                  </div>
                  {attendanceData ? (
                    <div className="flex items-center gap-6">
                      <div className="relative shrink-0">
                        <DonutRing pct={attendanceData.summary.presentPct} color={attendanceData.summary.presentPct >= 85 ? GREEN : "#EF4444"} size={88} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-black" style={{ color: NAVY }}>{attendanceData.summary.presentPct}%</span>
                          <span className="text-[9px] text-gray-400">Present</span>
                        </div>
                      </div>
                      <div className="space-y-2 flex-1">
                        {[
                          { label: "Present", count: attendanceData.summary.present, color: GREEN },
                          { label: "Absent", count: attendanceData.summary.absent, color: "#EF4444" },
                          { label: "Late", count: attendanceData.summary.late, color: "#F59E0B" },
                          { label: "Total Sessions", count: attendanceData.summary.total, color: NAVY },
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-gray-500">
                              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            <span className="font-bold" style={{ color: s.color }}>{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Attendance Logs */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-black" style={{ color: NAVY }}>Recent Attendance Logs</h3>
                </div>
                {!attendanceData ? (
                  <div className="py-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : attendanceData.records.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">No attendance records</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        {["Date", "Status", "Remark", "Marked By"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.records.slice(0, 20).map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-5 py-3 font-medium text-gray-700">{fmtDate(r.attendanceDate)}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                              ${r.status === "present" ? "bg-green-100 text-green-700"
                              : r.status === "absent" ? "bg-red-100 text-red-700"
                              : r.status === "late" ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"}`}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{r.remark ?? "—"}</td>
                          <td className="px-5 py-3 text-gray-600">{r.calledByName ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ ASSESSMENTS ═══════════════ */}
          {activeTab === "assessments" && (
            <div className="space-y-5">
              {/* Summary KPIs */}
              {!assessmentData ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { label: "Average Score", value: `${assessmentData.summary.avgScore}%`, icon: <Activity className="w-4 h-4" />, color: GREEN, sub: "↑ 7% this month" },
                      { label: "Tests", value: assessmentData.tests.filter(t => t.testType !== "quiz").length, icon: <FileText className="w-4 h-4" />, color: NAVY, sub: "Completed" },
                      { label: "Assignments", value: assessmentData.assignments.length, icon: <ClipboardList className="w-4 h-4" />, color: "#8B5CF6", sub: "Submitted" },
                      { label: "Quizzes", value: assessmentData.tests.filter(t => t.testType === "quiz").length, icon: <Zap className="w-4 h-4" />, color: ORANGE, sub: "Completed" },
                      { label: "Rank in Batch", value: assessmentData.summary.rank > 0 ? `${assessmentData.summary.rank} / 25` : "—", icon: <Trophy className="w-4 h-4" />, color: "#F59E0B", sub: "Overall position" },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                        <div className="flex justify-center mb-1.5" style={{ color: s.color }}>{s.icon}</div>
                        <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[10px] text-gray-500 font-medium mt-0.5">{s.label}</div>
                        <div className="text-[9px] text-gray-400">{s.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Assessment List */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-black" style={{ color: NAVY }}>All Assessments</h3>
                        <span className="text-xs text-gray-400">{assessmentData.summary.totalSubmissions} total</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              {["Assessment", "Type", "Score", "%", "Date", "Status"].map(h => (
                                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ...assessmentData.homework.map(h => ({ id: h.id, title: h.title, type: "Homework", typeColor: "#3B82F6", score: h.marks != null ? `${h.marks}/${h.maxMarks}` : "—", pct: h.scorePct, date: h.submittedAt, status: h.status })),
                              ...assessmentData.assignments.map(a => ({ id: a.id, title: a.title, type: "Assignment", typeColor: "#8B5CF6", score: a.marks != null ? `${a.marks}/${a.maxMarks}` : "—", pct: a.scorePct, date: a.submittedAt, status: a.status })),
                              ...assessmentData.tests.map(t => ({ id: t.id, title: t.title, type: t.testType === "quiz" ? "Quiz" : "Test", typeColor: t.testType === "quiz" ? ORANGE : NAVY, score: t.score != null ? `${t.score}/${t.maxScore ?? t.maxMarks}` : "—", pct: t.scorePct, date: t.submittedAt, status: "completed" })),
                            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 15)
                              .map((item, i) => (
                              <tr key={`${item.type}-${item.id}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                                <td className="px-4 py-2.5 font-medium text-gray-700 max-w-[160px] truncate">{item.title}</td>
                                <td className="px-4 py-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: item.typeColor }}>{item.type[0]}</span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-600">{item.score}</td>
                                <td className="px-4 py-2.5">
                                  {item.pct != null ? (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.pct >= 90 ? "bg-green-100 text-green-700" : item.pct >= 70 ? "bg-blue-100 text-blue-700" : item.pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                      {item.pct}%
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-gray-400">{fmtDate(item.date)}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === "graded" || item.status === "completed" ? "bg-green-100 text-green-700" : item.status === "pending" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Performance + Distribution */}
                    <div className="space-y-5">
                      {/* Performance by Type */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>Performance by Type</h3>
                        <div className="space-y-3">
                          {perfByType.filter(t => t.count > 0).map(t => (
                            <div key={t.label}>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-gray-500 font-medium">{t.label}</span>
                                <span className="font-bold text-gray-700">{t.avg}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <ProgressBar pct={t.avg} color={t.color} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Score Distribution */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-5">
                        <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>Score Distribution</h3>
                        {scoreDist.every(s => s.count === 0) ? (
                          <div className="text-xs text-gray-400 text-center py-4">No scored data</div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <div className="w-20 h-20 rounded-full" style={{
                                background: `conic-gradient(
                                  ${scoreDist[0].color} 0% ${scoreDist[0].pct}%,
                                  ${scoreDist[1].color} ${scoreDist[0].pct}% ${scoreDist[0].pct + scoreDist[1].pct}%,
                                  ${scoreDist[2].color} ${scoreDist[0].pct + scoreDist[1].pct}% ${scoreDist[0].pct + scoreDist[1].pct + scoreDist[2].pct}%,
                                  ${scoreDist[3].color} ${scoreDist[0].pct + scoreDist[1].pct + scoreDist[2].pct}% 100%
                                )`
                              }} />
                              <div className="absolute inset-2 rounded-full bg-white" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                              {scoreDist.map(s => (
                                <div key={s.label} className="flex items-center justify-between text-[10px]">
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} /> {s.label}
                                  </span>
                                  <span className="font-bold text-gray-700">{s.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════ LEARNING HEALTH ═══════════════ */}
          {activeTab === "learning-health" && (
            <div className="space-y-5">
              {/* Top KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Health Score", value: crm?.healthScore != null ? `${crm.healthScore}/100` : "—", sub: crm ? healthLabel(crm.riskLevel) : "", color: crm ? healthColor(crm.riskLevel) : NAVY },
                  { label: "Engagement Score", value: crm?.hwCompletion != null ? `${crm.hwCompletion}/100` : "—", sub: (crm?.hwCompletion ?? 0) >= 80 ? "Good" : "Needs work", color: "#3B82F6" },
                  { label: "Risk Level", value: crm ? healthLabel(crm.riskLevel) : "—", sub: "Current status", color: crm ? healthColor(crm.riskLevel) : NAVY },
                  { label: "Last Login", value: crm?.daysSinceLogin != null && crm.daysSinceLogin < 999 ? `${crm.daysSinceLogin}d ago` : "Never", sub: p?.lastLoginAt ? fmtDate(p.lastLoginAt) : "No data", color: crm?.daysSinceLogin != null && crm.daysSinceLogin <= 3 ? GREEN : "#F59E0B" },
                  { label: "Streak", value: p?.streakDays != null ? `${p.streakDays} Days` : "—", sub: "Login streak", color: ORANGE },
                ].map(k => (
                  <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <div className="text-xl font-black leading-tight" style={{ color: k.color }}>{k.value}</div>
                    <div className="text-[10px] text-gray-500 font-semibold mt-1">{k.label}</div>
                    <div className="text-[9px] text-gray-400">{k.sub}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Learning Health Overview */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>Learning Health Overview</h3>
                  <div className="space-y-3.5">
                    {[
                      { label: "Engagement", value: crm?.hwCompletion ?? 0, color: "#22C55E" },
                      { label: "Homework Completion", value: crm?.hwCompletion ?? 0, color: "#3B82F6" },
                      { label: "Assessment Completion", value: assessmentData ? Math.round(((assessmentData.summary.totalSubmissions - assessmentData.summary.pendingCount) / Math.max(1, assessmentData.summary.totalSubmissions)) * 100) : 80, color: GREEN },
                      { label: "Class Participation", value: crm?.attendancePct ?? 0, color: "#F59E0B" },
                      { label: "Concept Understanding", value: assessmentData?.summary?.avgScore ?? crm?.healthScore ?? 0, color: "#8B5CF6" },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-500 font-medium">{m.label}</span>
                          <span className="font-bold text-gray-700">{m.value}%</span>
                        </div>
                        <ProgressBar pct={m.value} color={m.color} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>Health Trend</h3>
                  {monthlyAttendance.length > 0 ? (
                    <div className="flex items-end gap-3 h-28 justify-center">
                      {monthlyAttendance.map(m => {
                        const healthPct = crm ? Math.min(100, Math.round((m.pct * 0.4) + (crm.hwCompletion * 0.4) + (crm.healthScore * 0.2))) : m.pct;
                        return <MonthlyBar key={m.key} month={m.label} pct={healthPct} max={100} />;
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-400 text-xs">No trend data available</div>
                  )}
                </div>

                {/* At Risk Indicators + Recommendations */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>At Risk Indicators</h3>
                    <div className="space-y-2.5">
                      {riskIndicators.map(r => (
                        <div key={r.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{r.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.at_risk ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                            {r.at_risk ? "Yes" : "No"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="text-sm font-black mb-3" style={{ color: NAVY }}>Recommendations</h3>
                    <div className="space-y-2.5">
                      {crm && [
                        crm.riskLevel === "excellent" || crm.riskLevel === "good"
                          ? { icon: "🌟", title: "Keep it up!", text: "Student is performing well. Maintain the momentum.", color: "#DCFCE7", textColor: GREEN }
                          : { icon: "⚠️", title: "Focus Area", text: "Student needs extra attention and support.", color: "#FEF3C7", textColor: "#D97706" },
                        crm.hwCompletion < 70
                          ? { icon: "📝", title: "Homework Gap", text: "Encourage regular homework submission.", color: "#FEE2E2", textColor: "#DC2626" }
                          : { icon: "✅", title: "Homework OK", text: "Consistent homework submission. Keep it going!", color: "#DCFCE7", textColor: GREEN },
                        { icon: "👩‍🏫", title: "Mentor Note", text: latestNote?.remark?.slice(0, 60) ?? "No recent mentor note.", color: "#EFF6FF", textColor: NAVY },
                      ].map((rec, i) => (
                        <div key={i} className="rounded-xl p-2.5" style={{ background: rec.color }}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{rec.icon}</span>
                            <span className="text-[11px] font-bold" style={{ color: rec.textColor }}>{rec.title}</span>
                          </div>
                          <p className="text-[10px] leading-relaxed" style={{ color: rec.textColor }}>{rec.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ CUSTOMER SUCCESS ═══════════════ */}
          {activeTab === "customer-success" && (
            <div className="flex gap-5">
              {/* Left panel */}
              <div className="w-56 shrink-0 space-y-4">
                {/* Engagement Health */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Engagement Health</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-2xl font-black" style={{ color: crm ? healthColor(crm.riskLevel) : NAVY }}>{crm?.healthScore ?? "—"}%</span>
                    {crm && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: healthBg(crm.riskLevel), color: healthColor(crm.riskLevel) }}>
                        {healthLabel(crm.riskLevel)}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 mb-3">
                    {crm?.daysSinceLogin != null && crm.daysSinceLogin < 999 ? `Last seen ${crm.daysSinceLogin}d ago` : "Never logged in"}
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Homework done", value: crm?.hwCompletion != null ? `${crm.hwCompletion}%` : "—" },
                      { label: "Attendance", value: crm?.attendancePct != null ? `${crm.attendancePct}%` : "—" },
                    ].map(s => (
                      <div key={s.label} className="flex justify-between text-[10px]">
                        <span className="text-gray-500">{s.label}</span>
                        <span className="font-bold text-gray-700">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student Status */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Status</div>
                    <button onClick={() => setEditingStage(v => !v)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3 h-3" /></button>
                  </div>
                  {editingStage ? (
                    <div className="space-y-2">
                      <select value={stageValue} onChange={e => setStageValue(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                        <option value="">— Not set —</option>
                        {SUCCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => saveCrmField("stage")} disabled={crmSaving}
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                        style={{ background: GREEN }}>
                        {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={crm?.leadStage
                        ? { background: `${SUCCESS_STAGE_COLORS[crm.leadStage] ?? "#6B7280"}18`, color: SUCCESS_STAGE_COLORS[crm.leadStage] ?? "#6B7280" }
                        : { background: "#F3F4F6", color: "#9CA3AF" }}>
                      {crm?.leadStage ?? "Not set"}
                    </span>
                  )}
                </div>

                {/* Parent */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parent / Guardian</div>
                    <button onClick={() => setEditingParent(v => !v)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3 h-3" /></button>
                  </div>
                  {editingParent ? (
                    <div className="space-y-2">
                      <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent name"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
                      <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="Phone"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
                      <button onClick={() => saveCrmField("parent")} disabled={crmSaving}
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                        style={{ background: GREEN }}>
                        {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-gray-400" /><span className="text-xs font-semibold" style={{ color: NAVY }}>{crm?.parentName || "—"}</span></div>
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-500">{crm?.parentPhone || "—"}</span></div>
                    </div>
                  )}
                </div>

                {/* Assigned Mentor */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Success Mentor</div>
                  {crmData?.assignedMentor ? (
                    <div>
                      <div className="text-xs font-bold" style={{ color: NAVY }}>{crmData.assignedMentor.mentorName ?? "—"}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{crmData.assignedMentor.mentorEmail ?? ""}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">No mentor assigned</div>
                  )}
                </div>
              </div>

              {/* Right: Interaction log */}
              <div className="flex-1 min-w-0 space-y-4">
                <form onSubmit={logInteraction} className="bg-white rounded-2xl border border-dashed border-gray-300 p-4 space-y-2.5">
                  <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: NAVY }}>
                    <Activity className="w-4 h-4" style={{ color: ORANGE }} /> Log Interaction
                  </div>
                  <select value={interactionType} onChange={e => setInteractionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                    {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <textarea value={remark} onChange={e => setRemark(e.target.value)} required rows={2}
                    placeholder="What happened? What did you observe or discuss? (required)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none resize-none focus:border-blue-300" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Next Check-in Date</label>
                      <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Action Taken</label>
                      <input value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="e.g. Called parent"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={noteSaving}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-60"
                    style={{ background: noteSuccess ? GREEN : NAVY }}>
                    {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : noteSuccess ? <CheckCircle className="w-3 h-3" /> : null}
                    {noteSuccess ? "Logged!" : "Log Interaction"}
                  </button>
                </form>

                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    Interaction History {unifiedLog.length > 0 && <span className="text-gray-300">({unifiedLog.length})</span>}
                  </div>
                  {unifiedLog.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center text-gray-400 text-xs italic">No interactions logged yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {unifiedLog.map(entry => {
                        const isCheckin = entry.kind === "checkin";
                        return (
                          <div key={entry.key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: isCheckin ? "#F5F3FF" : "#F0FDF4" }}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                                    style={{ background: isCheckin ? "#6366F1" : GREEN }}>
                                    {entry.authorName?.charAt(0)?.toUpperCase() ?? "?"}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold" style={{ color: NAVY }}>{entry.authorName} — {entry.authorRole === "admin" ? "Admin" : entry.authorRole === "teacher" ? "Teacher" : "Mentor"}</div>
                                    <div className="text-[10px] text-gray-400">{fmtDateTime(entry.createdAt)}</div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                                  style={{ background: isCheckin ? "#6366F115" : `${GREEN}15`, color: isCheckin ? "#6366F1" : GREEN }}>
                                  {entry.noteType}
                                </span>
                              </div>
                            </div>
                            <div className="px-4 py-2.5">
                              {entry.text ? <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.text}</p> : <p className="text-xs text-gray-400 italic">No remark recorded.</p>}
                            </div>
                            {(entry.actionTaken || entry.followUpDate) && (
                              <div className="border-t border-gray-100 px-4 py-1.5 flex gap-3 flex-wrap">
                                {entry.actionTaken && <span className="text-[10px] text-blue-600">✓ {entry.actionTaken}</span>}
                                {entry.followUpDate && <span className="text-[10px] text-orange-600">📅 Next: {fmtDate(entry.followUpDate)}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ PAYMENTS ═══════════════ */}
          {activeTab === "payments" && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${NAVY}10` }}>
                <CreditCard className="w-8 h-8" style={{ color: NAVY }} />
              </div>
              <h3 className="text-lg font-black" style={{ color: NAVY }}>Payments & Billing</h3>
              <p className="text-sm text-gray-400 text-center max-w-sm">Payment history and billing details will appear here. This section is coming soon.</p>
              <div className="flex gap-2 mt-2">
                {["Total Paid", "Due Amount", "Plan", "Next Renewal"].map(l => (
                  <div key={l} className="px-4 py-2 bg-gray-100 rounded-xl text-xs text-gray-400 font-medium">{l}</div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════ ACHIEVEMENTS ═══════════════ */}
          {activeTab === "achievements" && (
            <div className="space-y-5">
              {/* Space Level + Points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${levelColor}20` }}>
                    <Star className="w-7 h-7" style={{ color: levelColor }} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">Space Level</div>
                    <div className="text-lg font-black" style={{ color: levelColor }}>{data360?.spaceLevel ?? "—"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p?.points ?? 0} XP earned</div>
                  </div>
                </div>
                {[
                  { label: "Total XP Points", value: p?.points ?? 0, icon: <Zap className="w-5 h-5" />, color: ORANGE },
                  { label: "Login Streak", value: `${p?.streakDays ?? 0} days`, icon: <TrendingUp className="w-5 h-5" />, color: "#22C55E" },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                      <div style={{ color: s.color }}>{s.icon}</div>
                    </div>
                    <div>
                      <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* XP History */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-black" style={{ color: NAVY }}>XP History</h3>
                </div>
                {!data360?.xpHistory.length ? (
                  <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                    <Zap className="w-8 h-8 text-gray-200" /> No XP activity yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {data360.xpHistory.map((x, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${x.amount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                          <Zap className={`w-3.5 h-3.5 ${x.amount > 0 ? "text-green-600" : "text-red-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-700">{x.actionType.replace(/_/g, " ")}</div>
                          {x.note && <div className="text-[10px] text-gray-400 truncate">{x.note}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-sm font-black ${x.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {x.amount > 0 ? "+" : ""}{x.amount}
                          </div>
                          <div className="text-[10px] text-gray-400">{fmtDate(x.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ DOCUMENTS ═══════════════ */}
          {activeTab === "documents" && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${NAVY}10` }}>
                <FolderOpen className="w-8 h-8" style={{ color: NAVY }} />
              </div>
              <h3 className="text-lg font-black" style={{ color: NAVY }}>Documents & Files</h3>
              <p className="text-sm text-gray-400 text-center max-w-sm">Student documents, ID proofs, certificates, and uploaded files will appear here. This section is coming soon.</p>
              <div className="flex gap-2 mt-2">
                {["ID Proof", "Certificates", "Reports", "Consent Forms"].map(l => (
                  <div key={l} className="px-4 py-2 bg-gray-100 rounded-xl text-xs text-gray-400 font-medium">{l}</div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
