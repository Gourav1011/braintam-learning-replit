import { useState, useEffect } from "react";
import { X, BookOpen, Star, Zap, Clock, CheckCircle, AlertCircle, Activity, MessageSquare, User, Phone, Edit2, Save, Loader2, Target } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
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

const LEAD_STAGES = [
  "New Lead", "Contacted", "Demo Invited", "Demo Joined", "Demo Active",
  "Interested", "Parent Follow-Up", "Converted", "Paid Student", "Inactive", "Dropped",
];
const LEAD_STAGE_COLORS: Record<string, string> = {
  "New Lead": "#6B7280", "Contacted": "#6366F1", "Demo Invited": "#8B5CF6",
  "Demo Joined": "#0284C7", "Demo Active": "#0891B2", "Interested": "#D97706",
  "Parent Follow-Up": "#EA580C", "Converted": "#16A34A", "Paid Student": "#059669",
  "Inactive": "#DC2626", "Dropped": "#9CA3AF",
};
const NOTE_TYPES = ["General Note", "Call Log", "Parent Call", "Homework Issue", "Attendance Issue", "Fee Reminder", "Conversion Call", "Escalation", "Other"];

function healthColor(level: string) {
  if (level === "excellent") return "#059669";
  if (level === "good") return "#16A34A";
  if (level === "attention") return "#D97706";
  return "#DC2626";
}
function healthBg(level: string) {
  if (level === "excellent") return "#DCFCE7";
  if (level === "good") return "#D1FAE5";
  if (level === "attention") return "#FEF3C7";
  return "#FEE2E2";
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function FuStatusBadge({ status, daysOverdue }: { status: string; daysOverdue: number }) {
  if (status === "completed") return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>;
  if (status === "due_today") return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Due Today</span>;
  if (status === "overdue") {
    const severe = daysOverdue >= 3;
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${severe ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-600"}`}>Overdue {daysOverdue > 0 ? `${daysOverdue}d` : ""}</span>;
  }
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Upcoming</span>;
}

type InnerTab = "overview" | "courses" | "activity" | "xp" | "crm";

export function Student360Modal({ userId, userName, userEmail, onClose }: { userId: number; userName: string; userEmail: string | null; onClose: () => void }) {
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<InnerTab>("overview");

  // CRM tab state
  const [crmData, setCrmData] = useState<CrmData | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [editingLeadStage, setEditingLeadStage] = useState(false);
  const [leadStage, setLeadStage] = useState<string>("");
  const [editingParent, setEditingParent] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [crmSaving, setCrmSaving] = useState(false);
  // Add note form
  const [noteType, setNoteType] = useState("General Note");
  const [remark, setRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  function loadAcademic() {
    setLoading(true);
    setFetchError(null);
    apiFetch(`/admin/students/${userId}/360`)
      .then(async r => {
        if (r.ok) return r.json() as Promise<Student360Data>;
        const body = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Error ${r.status}`);
      })
      .then((d: Student360Data) => setData(d))
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }

  function loadCrm() {
    setCrmLoading(true);
    setCrmError(null);
    apiFetch(`/admin/students/${userId}/crm`)
      .then(async r => {
        if (r.ok) return r.json() as Promise<CrmData>;
        const body = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Error ${r.status}`);
      })
      .then((d: CrmData) => {
        setCrmData(d);
        setLeadStage(d.student.leadStage ?? "");
        setParentName(d.student.parentName ?? "");
        setParentPhone(d.student.parentPhone ?? "");
      })
      .catch((e: unknown) => setCrmError(e instanceof Error ? e.message : "Failed to load CRM data"))
      .finally(() => setCrmLoading(false));
  }

  useEffect(() => { loadAcademic(); }, [userId]);
  useEffect(() => { if (innerTab === "crm" && !crmData && !crmLoading) loadCrm(); }, [innerTab]);

  async function saveCrmField(field: "leadStage" | "parent") {
    setCrmSaving(true);
    const body = field === "leadStage"
      ? { leadStage: leadStage || null }
      : { parentName: parentName || null, parentPhone: parentPhone || null };
    await apiFetch(`/admin/students/${userId}/crm`, { method: "PATCH", body: JSON.stringify(body) });
    if (field === "leadStage") setEditingLeadStage(false);
    else setEditingParent(false);
    await loadCrm();
    setCrmSaving(false);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!remark.trim()) return;
    setNoteSaving(true);
    const r = await apiFetch("/admin/btl-crm/timeline", {
      method: "POST",
      body: JSON.stringify({ studentId: userId, noteType, remark, followUpDate: followUpDate || null, actionTaken: actionTaken || null }),
    });
    if (r.ok) { setRemark(""); setFollowUpDate(""); setActionTaken(""); setNoteSuccess(true); setTimeout(() => setNoteSuccess(false), 2000); loadCrm(); }
    setNoteSaving(false);
  }

  const p = data?.profile;
  const levelColor = data ? (SPACE_COLORS[data.spaceLevel] ?? NAVY) : NAVY;

  // Unified timeline: merge student_timeline + follow_ups sorted by date desc
  const unifiedTimeline = crmData ? [
    ...(crmData.timeline.map(e => ({
      key: `tl-${e.id}`, kind: "timeline" as const,
      noteType: e.noteType, text: e.remark, createdAt: e.createdAt,
      createdByName: e.createdByName, createdByRole: e.createdByRole,
      actionTaken: e.actionTaken, followUpDate: e.followUpDate, callStatus: null as string | null,
      fuStatus: null as string | null, daysOverdue: 0,
    }))),
    ...(crmData.followUps.map(f => ({
      key: `fu-${f.id}`, kind: "followup" as const,
      noteType: f.noteType ?? "Follow-Up", text: f.note ?? "", createdAt: f.createdAt,
      createdByName: null as string | null, createdByRole: null as string | null,
      actionTaken: null as string | null, followUpDate: f.nextFollowUpDate,
      callStatus: f.callStatus, fuStatus: f.fuStatus, daysOverdue: f.daysOverdue,
    }))),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col" style={{ maxHeight: "92vh", maxWidth: innerTab === "crm" ? "860px" : "672px" }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0"
                style={{ background: NAVY }}>
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
                <span className="text-[11px] text-gray-500">
                  Last login: {p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
                </span>
              </div>
            </div>
          )}

          {/* Inner tabs */}
          <div className="flex gap-1 mt-4 flex-wrap">
            {([
              { key: "overview", label: "Overview" },
              { key: "courses", label: "Courses" },
              { key: "activity", label: "Activity" },
              { key: "xp", label: "XP History" },
              { key: "crm", label: "BTL CRM", icon: Target },
            ] as { key: InnerTab; label: string; icon?: typeof Target }[]).map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setInnerTab(t.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors flex items-center gap-1"
                  style={innerTab === t.key
                    ? { background: t.key === "crm" ? ORANGE : NAVY, color: "white" }
                    : { color: "#6B7280" }}>
                  {Icon && <Icon className="w-3 h-3" />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── CRM TAB ── */}
          {innerTab === "crm" && (
            crmLoading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
              </div>
            ) : crmError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="text-sm font-semibold text-gray-700">Could not load CRM data</div>
                <div className="text-xs text-red-500">{crmError}</div>
                <button onClick={loadCrm} className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Retry</button>
              </div>
            ) : crmData ? (
              <div className="flex gap-5 h-full">

                {/* Left: CRM info panel */}
                <div className="w-52 flex-shrink-0 space-y-4">

                  {/* Health score */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Health Score</div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black" style={{ color: healthColor(crmData.student.riskLevel) }}>{crmData.student.healthScore}%</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: healthBg(crmData.student.riskLevel), color: healthColor(crmData.student.riskLevel) }}>
                        {crmData.student.riskLevel === "at-risk" ? "At Risk" : crmData.student.riskLevel === "attention" ? "Attention" : crmData.student.riskLevel === "good" ? "Good" : "Excellent"}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {crmData.student.daysSinceLogin < 999 ? `${crmData.student.daysSinceLogin}d since login` : "Never logged in"}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1.5">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Stats</div>
                    {[
                      { label: "HW Done", value: `${crmData.student.hwCompletion}%` },
                      { label: "Attendance", value: crmData.student.attendancePct !== null ? `${crmData.student.attendancePct}%` : "—" },
                    ].map(s => (
                      <div key={s.label} className="flex justify-between text-xs">
                        <span className="text-gray-500">{s.label}</span>
                        <span className="font-bold" style={{ color: NAVY }}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Lead Stage */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Lead Stage</div>
                      <button onClick={() => setEditingLeadStage(v => !v)} className="text-gray-400 hover:text-blue-500 transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    {editingLeadStage ? (
                      <div className="space-y-1.5">
                        <select value={leadStage} onChange={e => setLeadStage(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                          <option value="">No Stage</option>
                          {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => saveCrmField("leadStage")} disabled={crmSaving}
                          className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                          style={{ background: GREEN }}>
                          {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={crmData.student.leadStage ? { background: `${LEAD_STAGE_COLORS[crmData.student.leadStage] ?? "#6B7280"}18`, color: LEAD_STAGE_COLORS[crmData.student.leadStage] ?? "#6B7280" } : { background: "#F3F4F6", color: "#9CA3AF" }}>
                        {crmData.student.leadStage ?? "Not Set"}
                      </span>
                    )}
                  </div>

                  {/* Parent Info */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase">Parent Info</div>
                      <button onClick={() => setEditingParent(v => !v)} className="text-gray-400 hover:text-blue-500 transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    {editingParent ? (
                      <div className="space-y-1.5">
                        <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="Parent name"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
                        <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="Phone"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
                        <button onClick={() => saveCrmField("parent")} disabled={crmSaving}
                          className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                          style={{ background: GREEN }}>
                          {crmSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold" style={{ color: NAVY }}>{crmData.student.parentName || "—"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500">{crmData.student.parentPhone || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Mentor */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Assigned Mentor</div>
                    {crmData.assignedMentor ? (
                      <div>
                        <div className="text-xs font-semibold" style={{ color: NAVY }}>{crmData.assignedMentor.mentorName ?? "—"}</div>
                        <div className="text-[10px] text-gray-400">{crmData.assignedMentor.mentorEmail ?? ""}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">No mentor assigned</div>
                    )}
                  </div>
                </div>

                {/* Right: Unified Timeline */}
                <div className="flex-1 min-w-0 space-y-4">

                  {/* Add note form */}
                  <form onSubmit={addNote} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: NAVY }}>
                      <Activity className="w-3.5 h-3.5" /> Add to Permanent Timeline
                    </div>
                    <select value={noteType} onChange={e => setNoteType(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                      {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <textarea value={remark} onChange={e => setRemark(e.target.value)} required rows={2}
                      placeholder="Remark / observation… (required)"
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Follow-Up Date</label>
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
                      className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ background: noteSuccess ? GREEN : NAVY }}>
                      {noteSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : noteSuccess ? <CheckCircle className="w-3 h-3" /> : null}
                      {noteSuccess ? "Added!" : "Add Entry (Permanent)"}
                    </button>
                  </form>

                  {/* Unified timeline */}
                  {unifiedTimeline.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">No timeline entries or follow-ups yet.</div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                      <div className="space-y-3">
                        {unifiedTimeline.map(entry => (
                          <div key={entry.key} className="flex gap-3 relative">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-white text-[10px] font-black"
                              style={{ background: entry.kind === "timeline" ? GREEN : "#6366F1" }}>
                              {entry.kind === "timeline" ? (entry.createdByName?.charAt(0) ?? "A") : "F"}
                            </div>
                            <div className={`flex-1 rounded-xl border p-3 min-w-0 ${entry.kind === "followup" ? "bg-indigo-50/40 border-indigo-100" : "bg-white border-gray-100"}`}>
                              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {entry.createdByName && <span className="text-xs font-bold" style={{ color: NAVY }}>{entry.createdByName}</span>}
                                  {entry.createdByRole && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{entry.createdByRole}</span>}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ background: entry.kind === "followup" ? "#6366F115" : `${GREEN}15`, color: entry.kind === "followup" ? "#6366F1" : GREEN }}>
                                    {entry.noteType}
                                  </span>
                                  {entry.kind === "followup" && entry.fuStatus && (
                                    <FuStatusBadge status={entry.fuStatus} daysOverdue={entry.daysOverdue} />
                                  )}
                                  {entry.kind === "followup" && entry.callStatus && entry.callStatus !== "completed" && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{entry.callStatus}</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDateTime(entry.createdAt)}</span>
                              </div>
                              {entry.text && <p className="text-xs text-gray-700 leading-relaxed">{entry.text}</p>}
                              {entry.actionTaken && <p className="text-[10px] text-blue-600 mt-1">Action: {entry.actionTaken}</p>}
                              {entry.followUpDate && <p className="text-[10px] text-orange-600 mt-0.5">Follow-up: {fmtDate(entry.followUpDate)}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null
          )}

          {/* ── ACADEMIC TABS ── */}
          {innerTab !== "crm" && (
            loading ? (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
              </div>
            ) : !data ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="text-sm font-semibold text-gray-700">Could not load student data</div>
                {fetchError && <div className="text-xs text-red-500 text-center max-w-xs">{fetchError}</div>}
                <button onClick={loadAcademic} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
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
                  </div>
                )}

                {/* Courses Tab */}
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

                {/* Activity Tab */}
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

                {/* XP Tab */}
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
                          <span className={`text-sm font-bold ${x.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {x.amount > 0 ? "+" : ""}{x.amount}
                          </span>
                          <div className="text-[10px] text-gray-400">{new Date(x.createdAt).toLocaleDateString("en-IN")}</div>
                        </div>
                      </div>
                    ))}
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
