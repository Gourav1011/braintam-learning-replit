import { useState, useEffect } from "react";
import { X, BookOpen, Star, Zap, Clock, CheckCircle, AlertCircle, Activity, User, Phone, Edit2, Save, Loader2, Target, ClipboardList, Trophy, FileText, Shield, Unlock, RotateCcw, MessageSquareOff } from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = API_BASE;
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

interface Profile {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; board: string | null; state: string | null;
  points: number; rank: number | null; streakDays: number; isActive: boolean;
  createdAt: string; lastLoginAt: string | null;
}
interface EnrolledCourse { courseId: number; title: string; grade: number; teacher: string | null; enrolledAt: string; }
interface HwItem { id: number; title: string; status: string; marks: number | null; submittedAt: string; }
interface TestItem { id: number; title: string; score: number | null; maxScore: number | null; submittedAt: string; }
interface AssignItem { id: number; title: string; status: string; marks: number | null; submittedAt: string; }
interface XPItem { amount: number; actionType: string; note: string | null; createdAt: string; }

interface Student360Data {
  profile: Profile;
  enrolledCourses: EnrolledCourse[];
  recentHw: HwItem[];
  recentTests: TestItem[];
  recentAssignments: AssignItem[];
  xpHistory: XPItem[];
  spaceLevel: string;
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
  fuStatus: "due_today" | "overdue" | "upcoming" | "completed"; daysOverdue: number;
}
interface CrmData {
  student: CrmStudent;
  assignedMentor: { mentorId: number; mentorName: string | null; mentorEmail: string | null } | null;
  timeline: CrmTimeline[];
  followUps: CrmFollowUp[];
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Daily Login", HOMEWORK_SUBMITTED: "Homework", CORRECT_ANSWER: "Test Answer",
  WRONG_ANSWER: "Wrong Answer", TEST_COMPLETED: "Test Completed",
};

const SPACE_COLORS: Record<string, string> = {
  "Universe Champion": "#8B5CF6", "Galaxy Master": "#3B82F6",
  "Saturn Explorer": "#F59E0B", "Mars Explorer": "#EF4444",
  "Moon Explorer": "#6B7280", "Earth Explorer": "#22C55E",
};

// ── Customer Success stages (not sales pipeline) ────────────────────────────
const SUCCESS_STAGES = [
  "New Student", "Onboarding", "Active", "Engaged",
  "Needs Check-in", "Needs Attention", "At Risk",
  "On Pause", "Dropped Out", "Course Completed",
];
const SUCCESS_STAGE_COLORS: Record<string, string> = {
  "New Student":      "#6366F1",
  "Onboarding":       "#8B5CF6",
  "Active":           "#059669",
  "Engaged":          "#16A34A",
  "Needs Check-in":   "#D97706",
  "Needs Attention":  "#EA580C",
  "At Risk":          "#DC2626",
  "On Pause":         "#9CA3AF",
  "Dropped Out":      "#6B7280",
  "Course Completed": "#0891B2",
};

// ── Interaction types for CS (not sales) ───────────────────────────────────
const INTERACTION_TYPES = [
  "General Note",
  "Check-in Call",
  "Parent Call",
  "Progress Review",
  "Homework Support",
  "Attendance Concern",
  "Academic Alert",
  "Encouragement",
  "Technical Issue",
  "Other",
];

function healthColor(level: string) {
  return level === "excellent" ? "#059669" : level === "good" ? "#16A34A" : level === "attention" ? "#D97706" : "#DC2626";
}
function healthBg(level: string) {
  return level === "excellent" ? "#DCFCE7" : level === "good" ? "#D1FAE5" : level === "attention" ? "#FEF3C7" : "#FEE2E2";
}
function healthLabel(level: string) {
  return level === "at-risk" ? "At Risk" : level === "attention" ? "Needs Attention" : level === "good" ? "Good" : "Excellent";
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function CheckInStatusBadge({ status, daysOverdue }: { status: string; daysOverdue: number }) {
  if (status === "completed") return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">Done</span>;
  if (status === "due_today") return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Due Today</span>;
  if (status === "overdue") return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${daysOverdue >= 3 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-600"}`}>Overdue {daysOverdue > 0 ? `${daysOverdue}d` : ""}</span>;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Upcoming</span>;
}

type InnerTab = "overview" | "courses" | "activity" | "xp" | "crm" | "assessments" | "homework-tab" | "test-results" | "rankings";

type StudentAssessments = {
  homework: { id: number; title: string; grade: number; maxMarks: number; marks: number | null; scorePct: number | null; status: string; submittedAt: string; chapterId?: number | null; topicId?: number | null; liveClassId?: number | null }[];
  assignments: { id: number; title: string; grade: number; maxMarks: number; marks: number | null; scorePct: number | null; status: string; submittedAt: string }[];
  tests: { id: number; title: string; grade: number; maxMarks: number; score: number | null; maxScore: number | null; scorePct: number | null; submittedAt: string; testType: string | null }[];
  summary: { totalSubmissions: number; avgScore: number; pendingCount: number; rank: number };
};

// ── Chat Moderation Card ────────────────────────────────────────
interface ChatModStatus {
  studentId: string; studentName: string; phone: string | null;
  chatStatus: string; chatViolationCount: number;
  chatBlockedAt: string | null; chatBlockReason: string | null;
}
function ChatModerationCard({ phone, staffName }: { phone: string; staffName: string }) {
  const [status, setStatus] = useState<ChatModStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 3000); };
  const digits = phone.replace(/\D/g, "");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/chat-moderation/by-phone/${digits}/status`)
      .then(r => r.json())
      .then((d: { status: ChatModStatus | null }) => setStatus(d.status))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [digits]);

  const unblock = async () => {
    setActing(true);
    try {
      const r = await apiFetch(`/chat-moderation/by-phone/${digits}/unblock`, {
        method: "PATCH", body: JSON.stringify({ unlockedBy: staffName }),
      });
      if (r.ok) { setStatus(s => s ? { ...s, chatStatus: "active", chatBlockedAt: null } : s); showFlash("✅ Chat unblocked"); }
      else showFlash("Failed to unblock");
    } finally { setActing(false); }
  };

  const reset = async () => {
    setActing(true);
    try {
      const r = await apiFetch(`/chat-moderation/by-phone/${digits}/reset-violations`, { method: "PATCH" });
      if (r.ok) { setStatus(s => s ? { ...s, chatStatus: "active", chatViolationCount: 0, chatBlockedAt: null, chatBlockReason: null } : s); showFlash("✅ Violations reset"); }
      else showFlash("Failed to reset");
    } finally { setActing(false); }
  };

  if (loading) return <div className="rounded-2xl border border-gray-100 p-4 text-xs text-gray-400">Loading chat status…</div>;
  if (!status) return (
    <div className="rounded-2xl border border-gray-100 p-4 flex items-center gap-2">
      <Shield className="w-4 h-4 text-gray-300" />
      <span className="text-xs text-gray-400">No chat activity recorded yet</span>
    </div>
  );

  const isBlocked = status.chatStatus === "blocked";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${isBlocked ? "border-red-200 bg-red-50/50" : "border-gray-100 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBlocked ? <MessageSquareOff className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-green-600" />}
          <span className="text-xs font-semibold" style={{ color: NAVY }}>Chat Moderation</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {isBlocked ? "🚫 Blocked" : "💬 Active"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-xl p-2.5">
          <div className="text-gray-400 text-[10px]">Violations</div>
          <div className={`font-bold text-sm ${status.chatViolationCount > 0 ? "text-orange-600" : "text-gray-700"}`}>{status.chatViolationCount} / 3</div>
        </div>
        {isBlocked && (
          <div className="bg-red-50 rounded-xl p-2.5">
            <div className="text-gray-400 text-[10px]">Blocked At</div>
            <div className="font-semibold text-red-700 text-[11px]">{status.chatBlockedAt ? new Date(status.chatBlockedAt).toLocaleDateString("en-IN") : "—"}</div>
          </div>
        )}
        {isBlocked && status.chatBlockReason && (
          <div className="bg-red-50 rounded-xl p-2.5 col-span-2">
            <div className="text-gray-400 text-[10px]">Reason</div>
            <div className="font-semibold text-red-700 text-[11px]">{status.chatBlockReason}</div>
          </div>
        )}
      </div>

      {flash && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">{flash}</div>}

      <div className="flex gap-2">
        {isBlocked && (
          <button onClick={unblock} disabled={acting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white disabled:opacity-50" style={{ background: NAVY }}>
            <Unlock className="w-3 h-3" /> Unblock Chat
          </button>
        )}
        {status.chatViolationCount > 0 && (
          <button onClick={reset} disabled={acting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50">
            <RotateCcw className="w-3 h-3" /> Reset Violations
          </button>
        )}
      </div>
    </div>
  );
}

export function Student360Modal({ userId, userName, userEmail, onClose }: { userId: number; userName: string; userEmail: string | null; onClose: () => void }) {
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<InnerTab>("overview");
  const [assessmentData, setAssessmentData] = useState<StudentAssessments | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);

  // CRM tab state
  const [crmData, setCrmData] = useState<CrmData | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState(false);
  const [stageValue, setStageValue] = useState("");
  const [editingParent, setEditingParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [crmSaving, setCrmSaving] = useState(false);
  // Interaction log form
  const [interactionType, setInteractionType] = useState("General Note");
  const [remark, setRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  function loadAcademic() {
    setLoading(true); setFetchError(null);
    apiFetch(`/admin/students/${userId}/360`)
      .then(async r => { if (r.ok) return r.json() as Promise<Student360Data>; const b = await r.json().catch(() => ({})) as { error?: string }; throw new Error(b.error ?? `Error ${r.status}`); })
      .then((d: Student360Data) => setData(d))
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  function loadCrm() {
    setCrmLoading(true); setCrmError(null);
    apiFetch(`/admin/students/${userId}/crm`)
      .then(async r => { if (r.ok) return r.json() as Promise<CrmData>; const b = await r.json().catch(() => ({})) as { error?: string }; throw new Error(b.error ?? `Error ${r.status}`); })
      .then((d: CrmData) => { setCrmData(d); setStageValue(d.student.leadStage ?? ""); setParentName(d.student.parentName ?? ""); setParentPhone(d.student.parentPhone ?? ""); })
      .catch((e: unknown) => setCrmError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setCrmLoading(false));
  }

  function loadAssessments() {
    if (assessmentLoading) return;
    setAssessmentLoading(true);
    apiFetch(`/admin/students/${userId}/assessments`)
      .then(async r => { if (r.ok) return r.json() as Promise<StudentAssessments>; throw new Error(`Error ${r.status}`); })
      .then(d => setAssessmentData(d))
      .catch(() => {})
      .finally(() => setAssessmentLoading(false));
  }

  useEffect(() => { loadAcademic(); }, [userId]);
  useEffect(() => { if (innerTab === "crm" && !crmData && !crmLoading) loadCrm(); }, [innerTab]);
  useEffect(() => { if (["assessments", "homework-tab", "test-results", "rankings"].includes(innerTab) && !assessmentData && !assessmentLoading) loadAssessments(); }, [innerTab]);

  async function saveCrmField(field: "stage" | "parent") {
    setCrmSaving(true);
    const body = field === "stage" ? { leadStage: stageValue || null } : { parentName: parentName || null, parentPhone: parentPhone || null };
    await apiFetch(`/admin/students/${userId}/crm`, { method: "PATCH", body: JSON.stringify(body) });
    if (field === "stage") setEditingStage(false); else setEditingParent(false);
    await loadCrm(); setCrmSaving(false);
  }

  async function logInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!remark.trim()) return;
    setNoteSaving(true);
    const r = await apiFetch("/admin/btl-crm/timeline", {
      method: "POST",
      body: JSON.stringify({ studentId: userId, noteType: interactionType, remark, followUpDate: followUpDate || null, actionTaken: actionTaken || null }),
    });
    if (r.ok) { setRemark(""); setFollowUpDate(""); setActionTaken(""); setNoteSuccess(true); setTimeout(() => setNoteSuccess(false), 2500); loadCrm(); }
    setNoteSaving(false);
  }

  const p = data?.profile;
  const levelColor = data ? (SPACE_COLORS[data.spaceLevel] ?? NAVY) : NAVY;

  // Unified interaction log: merge student_timeline + follow_ups newest-first
  type UnifiedEntry = {
    key: string; kind: "timeline" | "checkin";
    authorName: string; authorRole: string;
    noteType: string; text: string; createdAt: string;
    actionTaken: string | null; followUpDate: string | null;
    callStatus: string | null; fuStatus: string | null; daysOverdue: number;
  };

  const unifiedLog: UnifiedEntry[] = crmData ? [
    ...crmData.timeline.map(e => ({
      key: `tl-${e.id}`, kind: "timeline" as const,
      authorName: e.createdByName, authorRole: e.createdByRole,
      noteType: e.noteType, text: e.remark, createdAt: e.createdAt,
      actionTaken: e.actionTaken, followUpDate: e.followUpDate,
      callStatus: null, fuStatus: null, daysOverdue: 0,
    })),
    ...crmData.followUps.map(f => ({
      key: `fu-${f.id}`, kind: "checkin" as const,
      authorName: f.calledByName ?? f.mentorName ?? "Mentor", authorRole: "mentor",
      noteType: f.noteType ?? "Check-in",
      text: f.note ?? "", createdAt: f.createdAt,
      actionTaken: null, followUpDate: f.nextFollowUpDate,
      callStatus: f.callStatus, fuStatus: f.fuStatus, daysOverdue: f.daysOverdue,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxHeight: "92vh", maxWidth: innerTab === "crm" ? "900px" : "672px" }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0" style={{ background: NAVY }}>
                {(p?.name ?? userName)?.[0]?.toUpperCase() ?? "?"}
              </div>
              {loading ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="h-5 w-36 bg-gray-100 rounded-lg" />
                  <div className="h-3.5 w-48 bg-gray-100 rounded-lg" />
                </div>
              ) : p ? (
                <div>
                  <div className="font-black text-base" style={{ color: NAVY }}>{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.email ?? p.phone ?? "—"}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {p.grade > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Grade {p.grade}</span>}
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: levelColor }}>{data?.spaceLevel}</span>
                    {!p.isActive && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Inactive</span>}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-black text-base" style={{ color: NAVY }}>{userName || "Student"}</div>
                  {userEmail && <div className="text-xs text-gray-500 mt-0.5">{userEmail}</div>}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {p && innerTab !== "crm" && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                { label: "Points", value: p.points ?? 0, color: ORANGE },
                { label: "Streak", value: `${p.streakDays}d`, color: "#F59E0B" },
                { label: "Rank", value: p.rank ? `#${p.rank}` : "—", color: "#8B5CF6" },
                { label: "Courses", value: data?.enrolledCourses.length ?? 0, color: "#22C55E" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-sm font-black" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[11px] text-gray-400 font-medium">{s.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-500">Last login: {p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleDateString("en-IN") : "Never"}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-4 flex-wrap">
            {([
              { key: "overview", label: "Overview" },
              { key: "courses", label: "Courses" },
              { key: "activity", label: "Activity" },
              { key: "xp", label: "XP History" },
              { key: "assessments", label: "Assessments", icon: ClipboardList },
              { key: "homework-tab", label: "Homework", icon: BookOpen },
              { key: "test-results", label: "Test Results", icon: FileText },
              { key: "rankings", label: "Rankings", icon: Trophy },
              { key: "crm", label: "Customer Success", icon: Target },
            ] as { key: InnerTab; label: string; icon?: typeof Target }[]).map(t => {
              const Icon = t.icon;
              const isAssessmentTab = ["assessments", "homework-tab", "test-results", "rankings"].includes(t.key);
              return (
                <button key={t.key} onClick={() => setInnerTab(t.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  style={innerTab === t.key ? { background: t.key === "crm" ? ORANGE : isAssessmentTab ? "#059669" : NAVY, color: "white" } : { color: "#6B7280" }}>
                  {Icon && <Icon className="w-3 h-3" />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── CUSTOMER SUCCESS TAB ───────────────────────────────────── */}
          {innerTab === "crm" && (
            crmLoading ? (
              <div className="space-y-3 animate-pulse">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>
            ) : crmError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="text-sm font-semibold text-gray-700">Could not load success data</div>
                <div className="text-xs text-red-500">{crmError}</div>
                <button onClick={loadCrm} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Retry</button>
              </div>
            ) : crmData ? (
              <div className="flex gap-5">

                {/* Left: student success info */}
                <div className="w-52 flex-shrink-0 space-y-3">

                  {/* Engagement health */}
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Engagement Health</div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-black" style={{ color: healthColor(crmData.student.riskLevel) }}>{crmData.student.healthScore}%</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: healthBg(crmData.student.riskLevel), color: healthColor(crmData.student.riskLevel) }}>
                        {healthLabel(crmData.student.riskLevel)}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {crmData.student.daysSinceLogin < 999 ? `Last seen ${crmData.student.daysSinceLogin}d ago` : "Never logged in"}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Homework done</span>
                        <span className="font-bold text-gray-700">{crmData.student.hwCompletion}%</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Attendance</span>
                        <span className="font-bold text-gray-700">{crmData.student.attendancePct !== null ? `${crmData.student.attendancePct}%` : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Status */}
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Status</div>
                      <button onClick={() => setEditingStage(v => !v)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3 h-3" /></button>
                    </div>
                    {editingStage ? (
                      <div className="space-y-1.5">
                        <select value={stageValue} onChange={e => setStageValue(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none bg-white">
                          <option value="">— Not set —</option>
                          {SUCCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => saveCrmField("stage")} disabled={crmSaving}
                          className="w-full py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                          style={{ background: GREEN }}>
                          {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex text-[11px] font-bold px-2 py-0.5 rounded"
                        style={crmData.student.leadStage
                          ? { background: `${SUCCESS_STAGE_COLORS[crmData.student.leadStage] ?? "#6B7280"}18`, color: SUCCESS_STAGE_COLORS[crmData.student.leadStage] ?? "#6B7280" }
                          : { background: "#F3F4F6", color: "#9CA3AF" }}>
                        {crmData.student.leadStage ?? "Not set"}
                      </span>
                    )}
                  </div>

                  {/* Parent / Guardian */}
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parent / Guardian</div>
                      <button onClick={() => setEditingParent(v => !v)} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit2 className="w-3 h-3" /></button>
                    </div>
                    {editingParent ? (
                      <div className="space-y-1.5">
                        <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent name"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none focus:border-blue-400" />
                        <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="Phone"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none focus:border-blue-400" />
                        <button onClick={() => saveCrmField("parent")} disabled={crmSaving}
                          className="w-full py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                          style={{ background: GREEN }}>
                          {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-[11px] font-semibold" style={{ color: NAVY }}>{crmData.student.parentName || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-[11px] text-gray-500">{crmData.student.parentPhone || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Mentor */}
                  <div className="rounded-xl border border-gray-200 p-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Success Mentor</div>
                    {crmData.assignedMentor ? (
                      <div>
                        <div className="text-[11px] font-bold" style={{ color: NAVY }}>{crmData.assignedMentor.mentorName ?? "—"}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{crmData.assignedMentor.mentorEmail ?? ""}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 italic">No mentor assigned</div>
                    )}
                  </div>
                </div>

                {/* Right: Interaction log */}
                <div className="flex-1 min-w-0 space-y-4">

                  {/* Log interaction form */}
                  <form onSubmit={logInteraction} className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-3 space-y-2">
                    <div className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: NAVY }}>
                      <Activity className="w-3.5 h-3.5" style={{ color: ORANGE }} />
                      Log Interaction
                    </div>
                    <select value={interactionType} onChange={e => setInteractionType(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none bg-white">
                      {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <textarea value={remark} onChange={e => setRemark(e.target.value)} required rows={2}
                      placeholder="What happened? What did you observe or discuss? (required)"
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none resize-none focus:border-blue-300" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Next Check-in Date</label>
                        <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Action Taken</label>
                        <input value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="e.g. Called parent"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] outline-none" />
                      </div>
                    </div>
                    <button type="submit" disabled={noteSaving}
                      className="w-full py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1 transition-colors disabled:opacity-60"
                      style={{ background: noteSuccess ? GREEN : NAVY }}>
                      {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : noteSuccess ? <CheckCircle className="w-3 h-3" /> : null}
                      {noteSuccess ? "Logged!" : "Log Interaction"}
                    </button>
                  </form>

                  {/* ── Unified interaction log ── */}
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span>Interaction History</span>
                      {unifiedLog.length > 0 && <span className="text-gray-300">({unifiedLog.length})</span>}
                    </div>

                    {unifiedLog.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs italic">No interactions logged yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {unifiedLog.map(entry => {
                          const isCheckin = entry.kind === "checkin";
                          const authorLine = entry.authorName
                            ? `${entry.authorName}  —  ${entry.authorRole === "admin" ? "Admin" : entry.authorRole === "teacher" ? "Teacher" : "Mentor"}`
                            : "Mentor";
                          return (
                            <div key={entry.key} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                              {/* Author + timestamp header */}
                              <div className="px-3 py-2 border-b border-gray-100" style={{ background: isCheckin ? "#F5F3FF" : "#F0FDF4" }}>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                                      style={{ background: isCheckin ? "#6366F1" : GREEN }}>
                                      {entry.authorName?.charAt(0)?.toUpperCase() ?? "?"}
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-bold leading-tight" style={{ color: NAVY }}>{authorLine}</div>
                                      <div className="text-[10px] text-gray-400 leading-tight">{fmtDateTime(entry.createdAt)}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                      style={{ background: isCheckin ? "#6366F115" : `${GREEN}15`, color: isCheckin ? "#6366F1" : GREEN }}>
                                      {entry.noteType}
                                    </span>
                                    {entry.fuStatus && <CheckInStatusBadge status={entry.fuStatus} daysOverdue={entry.daysOverdue} />}
                                    {isCheckin && entry.callStatus && entry.callStatus !== "completed" && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{entry.callStatus}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Divider */}
                              <div className="border-b border-gray-100" />

                              {/* Remark body */}
                              <div className="px-3 py-2.5">
                                {entry.text ? (
                                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">No remark recorded.</p>
                                )}
                              </div>

                              {/* Footer: action taken / next check-in */}
                              {(entry.actionTaken || entry.followUpDate) && (
                                <>
                                  <div className="border-t border-gray-100" />
                                  <div className="px-3 py-1.5 flex gap-3 flex-wrap">
                                    {entry.actionTaken && (
                                      <span className="text-[10px] text-blue-600">✓ {entry.actionTaken}</span>
                                    )}
                                    {entry.followUpDate && (
                                      <span className="text-[10px] text-orange-600">📅 Next check-in: {fmtDate(entry.followUpDate)}</span>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null
          )}

          {/* ── ACADEMIC TABS ─────────────────────────────────────────── */}
          {!["crm", "assessments", "homework-tab", "test-results", "rankings"].includes(innerTab) && (
            loading ? (
              <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>
            ) : !data ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="text-sm font-semibold text-gray-700">Could not load student data</div>
                {fetchError && <div className="text-xs text-red-500 text-center max-w-xs">{fetchError}</div>}
                <button onClick={loadAcademic} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
                  <AlertCircle className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : (
              <>
                {innerTab === "overview" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        { label: "Email", value: p?.email ?? "—" },
                        { label: "Phone", value: p?.phone ?? "—" },
                        { label: "Grade", value: p?.grade ? `Grade ${p.grade}` : "—" },
                        { label: "School", value: p?.school ?? "—" },
                        { label: "Board", value: p?.board ?? "—" },
                        { label: "State", value: p?.state ?? "—" },
                        { label: "Joined", value: p?.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—" },
                        { label: "User ID", value: `#${p?.id}` },
                      ].map(f => (
                        <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                          <div className="text-gray-400 text-[10px] font-medium mb-0.5">{f.label}</div>
                          <div className="font-semibold text-gray-700 truncate">{f.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                      <p className="text-xs font-semibold text-indigo-700 mb-2">Space Journey Progress</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: levelColor + "22" }}>
                          <Star className="w-5 h-5" style={{ color: levelColor }} />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: levelColor }}>{data.spaceLevel}</div>
                          <div className="text-xs text-gray-500">{p?.points ?? 0} XP points earned</div>
                        </div>
                      </div>
                    </div>

                    {/* ── Chat Moderation ───────────────────── */}
                    {p?.phone && <ChatModerationCard phone={p.phone} staffName={userName} />}
                  </div>
                )}

                {innerTab === "courses" && (
                  <div className="space-y-2">
                    {data.enrolledCourses.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <BookOpen className="w-8 h-8 text-gray-200" /><span>No courses enrolled yet</span>
                      </div>
                    ) : data.enrolledCourses.map(c => (
                      <div key={c.courseId} className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: NAVY + "15" }}>
                          <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: NAVY }}>{c.title}</div>
                          <div className="text-xs text-gray-400">Grade {c.grade} · {c.teacher ?? "—"}</div>
                        </div>
                        <div className="text-[10px] text-gray-400 shrink-0">{new Date(c.enrolledAt).toLocaleDateString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                )}

                {innerTab === "activity" && (
                  <div className="space-y-4">
                    {data.recentHw.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Homework</p>
                        <div className="space-y-1.5">
                          {data.recentHw.map(h => (
                            <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                              {h.status === "graded" ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate" style={{ color: NAVY }}>{h.title}</div>
                                <div className="text-[10px] text-gray-400">{new Date(h.submittedAt).toLocaleDateString("en-IN")}</div>
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${h.status === "graded" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                {h.status === "graded" && h.marks != null ? `${h.marks}m` : h.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.recentTests.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Tests</p>
                        <div className="space-y-1.5">
                          {data.recentTests.map(t => {
                            const pct = t.score != null && t.maxScore ? Math.round((t.score / t.maxScore) * 100) : null;
                            return (
                              <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate" style={{ color: NAVY }}>{t.title}</div>
                                  <div className="text-[10px] text-gray-400">{new Date(t.submittedAt).toLocaleDateString("en-IN")}</div>
                                </div>
                                {pct != null && (
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${pct >= 70 ? "bg-green-100 text-green-700" : pct >= 40 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                                    {pct}%
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {data.recentAssignments.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Assignments</p>
                        <div className="space-y-1.5">
                          {data.recentAssignments.map(a => (
                            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                              <CheckCircle className={`w-4 h-4 shrink-0 ${a.status === "graded" ? "text-green-500" : "text-blue-400"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate" style={{ color: NAVY }}>{a.title}</div>
                                <div className="text-[10px] text-gray-400">{new Date(a.submittedAt).toLocaleDateString("en-IN")}</div>
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${a.status === "graded" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                {a.status === "graded" && a.marks != null ? `${a.marks}m` : a.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.recentHw.length === 0 && data.recentTests.length === 0 && data.recentAssignments.length === 0 && (
                      <div className="py-12 text-center text-gray-400 text-sm">No activity recorded yet.</div>
                    )}
                  </div>
                )}

                {innerTab === "xp" && (
                  <div className="space-y-2">
                    {data.xpHistory.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <Zap className="w-8 h-8 text-gray-200" /><span>No XP activity yet</span>
                      </div>
                    ) : data.xpHistory.map((x, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${x.amount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                          <Zap className={`w-3.5 h-3.5 ${x.amount > 0 ? "text-green-600" : "text-red-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-700">{ACTION_LABELS[x.actionType] ?? x.actionType}</div>
                          {x.note && <div className="text-[10px] text-gray-400 truncate">{x.note}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-bold ${x.amount > 0 ? "text-green-600" : "text-red-600"}`}>{x.amount > 0 ? "+" : ""}{x.amount}</span>
                          <div className="text-[10px] text-gray-400">{new Date(x.createdAt).toLocaleDateString("en-IN")}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {/* ── ASSESSMENT TABS ─────────────────────────────────────────── */}
          {["assessments", "homework-tab", "test-results", "rankings"].includes(innerTab) && (
            assessmentLoading ? (
              <div className="space-y-3 animate-pulse">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>
            ) : !assessmentData ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <ClipboardList className="w-8 h-8 text-gray-200" />
                <div className="text-sm font-semibold text-gray-700">No assessment data</div>
                <button onClick={loadAssessments} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Retry</button>
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: "Total Submissions", value: assessmentData.summary.totalSubmissions, icon: <ClipboardList className="w-4 h-4" />, color: "#0B2B6B" },
                    { label: "Avg Score", value: `${assessmentData.summary.avgScore}%`, icon: <Activity className="w-4 h-4" />, color: "#3B82F6" },
                    { label: "Pending", value: assessmentData.summary.pendingCount, icon: <Clock className="w-4 h-4" />, color: "#FF6B1A" },
                    { label: "Rank", value: assessmentData.summary.rank > 0 ? `#${assessmentData.summary.rank}` : "—", icon: <Trophy className="w-4 h-4" />, color: "#F59E0B" },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                      <div className="text-sm font-black" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[9px] text-gray-400 leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Assessments: all submissions combined */}
                {innerTab === "assessments" && (
                  <div className="space-y-2">
                    {[
                      ...assessmentData.homework.map(h => ({ ...h, type: "Homework", color: "#3B82F6" })),
                      ...assessmentData.assignments.map(a => ({ ...a, type: "Assignment", color: "#8B5CF6" })),
                      ...assessmentData.tests.map(t => ({ ...t, type: t.testType === "quiz" ? "Quiz" : "Test", color: t.testType === "quiz" ? "#FF6B1A" : "#0B2B6B", marks: t.score, scorePct: t.scorePct, status: "completed" })),
                    ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                      .map((item, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: item.color }}>
                            {item.type[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: "#0B2B6B" }}>{item.title}</div>
                            <div className="text-[10px] text-gray-400">{item.type} · {new Date(item.submittedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
                          </div>
                          <div className="text-right shrink-0">
                            {item.scorePct != null ? (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.scorePct >= 90 ? "bg-green-100 text-green-700" : item.scorePct >= 70 ? "bg-blue-100 text-blue-700" : item.scorePct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                {item.scorePct}%
                              </span>
                            ) : (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${item.status === "graded" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{item.status}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    {assessmentData.homework.length === 0 && assessmentData.assignments.length === 0 && assessmentData.tests.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-sm">No submissions yet</div>
                    )}
                  </div>
                )}

                {/* Homework tab — with chapter/topic/live class reference */}
                {innerTab === "homework-tab" && (
                  <div className="space-y-2">
                    {assessmentData.homework.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <BookOpen className="w-8 h-8 text-gray-200" /><span>No homework submitted</span>
                      </div>
                    ) : assessmentData.homework.map(h => (
                      <div key={h.id} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold" style={{ color: "#0B2B6B" }}>{h.title}</div>
                            <div className="text-[10px] text-gray-400">{new Date(h.submittedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · Max: {h.maxMarks}m</div>
                          </div>
                          <div className="shrink-0">
                            {h.scorePct != null ? (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${h.scorePct >= 90 ? "bg-green-100 text-green-700" : h.scorePct >= 70 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {h.marks}/{h.maxMarks} ({h.scorePct}%)
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{h.status}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {h.chapterId && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-medium">Ch #{h.chapterId}</span>}
                          {h.topicId && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 font-medium">Topic #{h.topicId}</span>}
                          {h.liveClassId && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">📺 Live Class #{h.liveClassId}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Test Results tab */}
                {innerTab === "test-results" && (
                  <div className="space-y-2">
                    {assessmentData.tests.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-gray-200" /><span>No test results yet</span>
                      </div>
                    ) : assessmentData.tests.map(t => {
                      const pct = t.scorePct;
                      return (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: t.testType === "quiz" ? "#FF6B1A" : "#0B2B6B" }}>
                            {t.testType === "quiz" ? "Q" : "T"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: "#0B2B6B" }}>{t.title}</div>
                            <div className="text-[10px] text-gray-400">{new Date(t.submittedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · {t.score ?? "—"}/{t.maxScore ?? t.maxMarks} questions</div>
                          </div>
                          {pct != null ? (
                            <div className="text-right shrink-0">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pct >= 90 ? "bg-green-100 text-green-700" : pct >= 70 ? "bg-blue-100 text-blue-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                {pct}%
                              </span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? "#10B981" : "#FF6B1A" }} />
                              </div>
                            </div>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rankings tab */}
                {innerTab === "rankings" && (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl text-center ${assessmentData.summary.rank <= 3 ? "bg-yellow-50 border border-yellow-100" : "bg-gray-50 border border-gray-100"}`}>
                      <div className="text-3xl mb-1">{assessmentData.summary.rank === 1 ? "🥇" : assessmentData.summary.rank === 2 ? "🥈" : assessmentData.summary.rank === 3 ? "🥉" : "🏅"}</div>
                      <div className="text-2xl font-black" style={{ color: "#0B2B6B" }}>
                        {assessmentData.summary.rank > 0 ? `Rank #${assessmentData.summary.rank}` : "Unranked"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Based on avg score across all assessments</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] mb-0.5">Avg Score</div>
                        <div className="font-black text-lg" style={{ color: "#0B2B6B" }}>{assessmentData.summary.avgScore}%</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] mb-0.5">Total Submissions</div>
                        <div className="font-black text-lg" style={{ color: "#0B2B6B" }}>{assessmentData.summary.totalSubmissions}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] mb-0.5">Homework Done</div>
                        <div className="font-black text-lg" style={{ color: "#0B2B6B" }}>{assessmentData.homework.length}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] mb-0.5">Tests Taken</div>
                        <div className="font-black text-lg" style={{ color: "#0B2B6B" }}>{assessmentData.tests.length}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Score Breakdown</div>
                      {[
                        { label: "Homework", items: assessmentData.homework, scoreKey: "scorePct" as const },
                        { label: "Assignments", items: assessmentData.assignments, scoreKey: "scorePct" as const },
                        { label: "Tests", items: assessmentData.tests.map(t => ({ ...t, marks: t.score, status: "completed" as string })), scoreKey: "scorePct" as const },
                      ].map(cat => {
                        const scored = cat.items.filter(i => i.scorePct != null);
                        const avg = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + (b.scorePct ?? 0), 0) / scored.length) : null;
                        return (
                          <div key={cat.label} className="flex items-center gap-3 py-2 border-b border-gray-50">
                            <div className="w-20 text-xs text-gray-600">{cat.label}</div>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full">
                              <div className="h-2 rounded-full transition-all" style={{ width: avg != null ? `${avg}%` : "0%", background: avg != null && avg >= 70 ? "#10B981" : "#FF6B1A" }} />
                            </div>
                            <div className="text-xs font-bold text-gray-700 w-10 text-right">{avg != null ? `${avg}%` : "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>

        <div className="shrink-0 px-6 py-3 border-t border-gray-100">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
