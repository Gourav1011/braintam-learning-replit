import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import {
  Users, MessageSquare, Bell, LogOut, Home, Search, AlertTriangle, AlertCircle,
  CheckCircle2, Phone, BookOpen, Plus, RefreshCw,
  Calendar, X, Loader2, Clock, ClipboardList, ChevronDown,
  PhoneCall, PhoneOff, PhoneMissed, PhoneIncoming,
  Edit2, Save, UserCircle, FileText, Activity,
  Target, CheckSquare, History, ExternalLink, Video, Trash2,
  Zap, HelpCircle, ClipboardCheck, Trophy, TrendingUp, LayoutGrid, List, BarChart3,
} from "lucide-react";
import { GradeLeaderboardTab } from "./grade-leaderboard-tab";
import { SalesCallingQueueTab, AssignedLeadsTab, ConvertedStudentsTab, NonActiveLeadsTab } from "./sales-calling-queue";
import { SalesMentorPortal } from "./sales-mentor-portal";
import braintamLogo from "@assets/transparent_braintam_logo_1780813752895.png";
import { StaffProfileTab } from "@/components/staff-profile-tab";
import { StaffCheckin } from "@/components/staff-checkin";
import { TodayTasksTab } from "./today-tasks-tab";
import { LiveClassesObserverTab } from "./live-classes-observer-tab";
import { DoubtSessionsTab } from "./doubt-sessions-tab";
import { EodReportTab } from "./eod-report-tab";
import { MasteryNotificationBar } from "@/components/mastery-notification-bar";
import { MasteryAchievementTicker } from "@/components/mastery-achievement-ticker";

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

type Tab = "dashboard" | "today-tasks" | "attendance" | "students" | "follow-ups" | "tasks" | "live-classes" | "doubt-sessions" | "eod-report" | "settings" | "profile" | "leaderboard" | "calling-queue" | "assigned-leads" | "converted-students" | "non-active";
type ProfileTab = "timeline" | "followups" | "attendance" | "homework" | "tests";

const SUCCESS_STAGES = [
  "New Student", "Onboarding", "Active", "Engaged",
  "Needs Check-in", "Needs Attention", "At Risk",
  "On Pause", "Dropped Out", "Course Completed",
];

const SUCCESS_STAGE_COLORS: Record<string, string> = {
  "New Student": "#6B7280", "Onboarding": "#6366F1", "Active": "#059669",
  "Engaged": "#0284C7", "Needs Check-in": "#D97706", "Needs Attention": "#EA580C",
  "At Risk": "#DC2626", "On Pause": "#9CA3AF", "Dropped Out": "#7F1D1D",
  "Course Completed": "#065F46",
};

const INTERACTION_TYPES = ["Check-in Call", "Parent Call", "Progress Review", "Homework Support", "Attendance Check", "Escalation", "General Note", "Other"];
const TASK_TYPES = ["Call Parent", "Homework Reminder", "Attendance Follow-Up", "Fee Reminder", "Conversion Follow-Up", "Send Material", "Schedule Demo", "Other"];
const CALL_STATUS_OPTIONS = [
  { value: "called", label: "Called", icon: PhoneCall, color: GREEN },
  { value: "not_reachable", label: "Not Reachable", icon: PhoneOff, color: "#DC2626" },
  { value: "dnp", label: "DNP", icon: PhoneMissed, color: "#D97706" },
  { value: "busy", label: "Busy", icon: PhoneIncoming, color: "#6366F1" },
];
const CALLED_BY_OPTIONS = ["Father", "Mother", "Brother", "Sister", "Student", "Other"];

interface Student {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; lastLoginDate: string | null;
  isActive: boolean; hwCompletion: number; hwTotal: number; hwPending: number;
  testCount: number; healthScore: number; riskLevel: "excellent" | "good" | "attention" | "at-risk";
  daysSinceLogin: number; assignedAt: string; leadStage: string | null;
  parentName: string | null; parentPhone: string | null; attendancePct: number | null;
}

interface FollowUp {
  id: number; studentId: number; studentName: string | null;
  noteType: string; note: string; callStatus: string | null;
  callTime: string | null; calledBy: string | null; calledByName: string | null;
  leadStatus: string | null; nextFollowUpDate: string | null; createdAt: string;
  fuStatus?: "due_today" | "overdue" | "upcoming" | "completed";
  daysOverdue?: number;
}

interface TimelineEntry {
  id: number; studentId: number; createdById: number | null;
  createdByName: string; createdByRole: string; noteType: string;
  remark: string; followUpDate: string | null; actionTaken: string | null; createdAt: string;
}

interface Task {
  id: number; title: string; taskType: string; status: string;
  effectiveStatus: string; dueDate: string | null; note: string | null;
  studentId: number | null; studentName: string | null;
  completedAt: string | null; createdAt: string;
}

interface AttendanceRecord {
  id: number; studentId: number; studentName: string | null;
  status: string; callStatus: string | null; callTime: string | null;
  calledBy: string | null; calledByName: string | null; remark: string | null;
  liveClassId: number | null; attendanceDate: string;
}

interface LiveClass {
  id: number; title: string; grade: number;
  scheduledAt: string; duration: number; status: string;
  joinUrl: string | null; teacher: string;
}

interface FollowUpEdit {
  id: number; followUpId: number; editedById: number;
  editedByName: string; editedByRole: string;
  previousNote: string | null; editRemark: string; editedAt: string;
}

interface DashboardData {
  mentorType: string;
  totalAssigned: number; activeToday: number; needsAttention: number;
  atRisk: number; green: number; notActive3Days: number; notActive7Days: number;
  homeworkPending: number; pendingTasks: number; overdueTasks: number;
  followUpReminders: (FollowUp & { fuStatus: string; daysOverdue: number })[];
  recentFollowUps: FollowUp[];
}

interface HealthSummary {
  green: { id: number; name: string; grade: number; healthScore: number; daysSinceLogin: number; leadStage: string | null }[];
  yellow: { id: number; name: string; grade: number; healthScore: number; daysSinceLogin: number; leadStage: string | null }[];
  red: { id: number; name: string; grade: number; healthScore: number; daysSinceLogin: number; leadStage: string | null }[];
  critical: { id: number; name: string; grade: number; healthScore: number; daysSinceLogin: number; leadStage: string | null }[];
  total: number;
}

interface StudentDetail {
  student: Student;
  hwSubs: { id: number; status: string; submittedAt: string }[];
  testSubs: { id: number; score: number; maxScore: number; submittedAt: string }[];
  followUps: FollowUp[];
  attendance: { id: number; attendanceDate: string; status: string; remark: string | null }[];
  timeline: TimelineEntry[];
}

function healthColor(level: string) {
  if (level === "excellent") return "#059669";
  if (level === "good") return "#0284C7";
  if (level === "attention") return "#D97706";
  return "#DC2626";
}
function healthBg(level: string) {
  if (level === "excellent") return "#DCFCE7";
  if (level === "good") return "#E0F2FE";
  if (level === "attention") return "#FEF3C7";
  return "#FEE2E2";
}
function RiskBadge({ level, score }: { level: string; score: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: healthBg(level), color: healthColor(level) }}>{score}%</span>
  );
}
function FuStatusBadge({ status, daysOverdue }: { status: string; daysOverdue: number }) {
  if (status === "completed") return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>;
  if (status === "due_today") return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Due Today</span>;
  if (status === "overdue") {
    const severe = daysOverdue >= 3;
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${severe ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-600"}`}>
      Overdue {daysOverdue > 0 ? `${daysOverdue}d` : ""}
    </span>;
  }
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Upcoming</span>;
}
function TaskStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "#FEF3C7", color: "#D97706", label: "Pending" },
    in_progress: { bg: "#DBEAFE", color: "#2563EB", label: "In Progress" },
    completed: { bg: "#DCFCE7", color: "#059669", label: "Completed" },
    overdue: { bg: "#FEE2E2", color: "#DC2626", label: "Overdue" },
  };
  const c = cfg[status] ?? cfg.pending;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>{c.label}</span>;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
function fmtDateTime(d: string) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
function getClassState(cls: LiveClass): "upcoming" | "live" | "completed" {
  // Trust DB status for live/completed — teacher controls when live ends
  if (cls.status === "live") return "live";
  if (cls.status === "completed") return "completed";
  // For upcoming/scheduled, use time math to detect if it's started
  const now = new Date();
  const start = new Date(cls.scheduledAt);
  return now >= start ? "live" : "upcoming";
}

function LeadStageDropdown({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const color = value ? (SUCCESS_STAGE_COLORS[value] ?? "#6B7280") : "#6B7280";
  return (
    <select value={value ?? ""} onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className="text-[10px] font-bold rounded-full border-0 outline-none cursor-pointer px-1.5 py-0.5"
      style={{ background: value ? `${color}18` : "#F3F4F6", color: value ? color : "#9CA3AF" }}>
      <option value="">No Stage</option>
      {SUCCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function CallDetailsForm({ callStatus, callTime, calledBy, calledByName, onChange }: {
  callStatus: string; callTime: string; calledBy: string; calledByName: string;
  onChange: (field: string, val: string) => void;
}) {
  return (
    <div className="mt-3 p-3 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {CALL_STATUS_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = callStatus === opt.value;
          return (
            <button key={opt.value} type="button" onClick={() => onChange("callStatus", active ? "" : opt.value)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all border"
              style={{ background: active ? `${opt.color}15` : "white", color: active ? opt.color : "#6B7280", borderColor: active ? opt.color : "#E5E7EB" }}>
              <Icon className="w-3 h-3" /> {opt.label}
            </button>
          );
        })}
      </div>
      {callStatus === "called" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <input type="time" value={callTime} onChange={e => onChange("callTime", e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
            <select value={calledBy} onChange={e => onChange("calledBy", e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400 bg-white">
              <option value="">Who picked?</option>
              {CALLED_BY_OPTIONS.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
            </select>
          </div>
          {calledBy === "other" && (
            <input value={calledByName} onChange={e => onChange("calledByName", e.target.value)}
              placeholder="Name of person who picked…"
              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
          )}
        </>
      )}
    </div>
  );
}

// ── Student 360 Profile Slide-Over ───────────────────────────────────────
function Student360({ detail, onClose, onTimelineAdded, onFollowUpAdded, onLeadStageChanged, onParentSaved }: {
  detail: StudentDetail;
  onClose: () => void;
  onTimelineAdded: () => void;
  onFollowUpAdded: () => void;
  onLeadStageChanged: (studentId: number, stage: string) => void;
  onParentSaved: (studentId: number, name: string, phone: string) => void;
}) {
  const { student, timeline, followUps, attendance, hwSubs, testSubs } = detail;
  const [profileTab, setProfileTab] = useState<ProfileTab>("timeline");
  const [tlNoteType, setTlNoteType] = useState("General Note");
  const [tlRemark, setTlRemark] = useState("");
  const [tlFollowUpDate, setTlFollowUpDate] = useState("");
  const [tlActionTaken, setTlActionTaken] = useState("");
  const [tlLoading, setTlLoading] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [parentName, setParentName] = useState(student.parentName ?? "");
  const [parentPhone, setParentPhone] = useState(student.parentPhone ?? "");
  const [parentLoading, setParentLoading] = useState(false);

  // Follow-up form state
  const [fuNoteType, setFuNoteType] = useState("General Note");
  const [fuNote, setFuNote] = useState("");
  const [fuCallStatus, setFuCallStatus] = useState("");
  const [fuCallTime, setFuCallTime] = useState("");
  const [fuCalledBy, setFuCalledBy] = useState("");
  const [fuCalledByName, setFuCalledByName] = useState("");
  const [fuLeadStatus, setFuLeadStatus] = useState("");
  const [fuNextDate, setFuNextDate] = useState("");
  const [fuLoading, setFuLoading] = useState(false);

  async function addTimelineEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!tlRemark.trim()) return;
    setTlLoading(true);
    const r = await apiFetch(`/mentor/timeline/${student.id}`, {
      method: "POST",
      body: JSON.stringify({ noteType: tlNoteType, remark: tlRemark, followUpDate: tlFollowUpDate || null, actionTaken: tlActionTaken || null }),
    });
    if (r.ok) { setTlRemark(""); setTlFollowUpDate(""); setTlActionTaken(""); onTimelineAdded(); }
    setTlLoading(false);
  }

  async function addFollowUpFromSlider(e: React.FormEvent) {
    e.preventDefault();
    if (!fuNote.trim()) return;
    setFuLoading(true);
    const r = await apiFetch("/mentor/follow-ups", {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        noteType: fuNoteType,
        note: fuNote,
        callStatus: fuCallStatus || null,
        callTime: fuCallTime || null,
        calledBy: fuCalledBy || null,
        calledByName: fuCalledByName || null,
        leadStatus: fuLeadStatus || null,
        nextFollowUpDate: fuNextDate || null,
      }),
    });
    if (r.ok) {
      setFuNote("");
      setFuCallStatus("");
      setFuCallTime("");
      setFuCalledBy("");
      setFuCalledByName("");
      setFuLeadStatus("");
      setFuNextDate("");
      onFollowUpAdded();
    }
    setFuLoading(false);
  }

  async function saveParent() {
    setParentLoading(true);
    await apiFetch(`/mentor/students/${student.id}`, {
      method: "PATCH",
      body: JSON.stringify({ parentName: parentName || null, parentPhone: parentPhone || null }),
    });
    onParentSaved(student.id, parentName, parentPhone);
    setEditingParent(false);
    setParentLoading(false);
  }

  async function changeLeadStage(stage: string) {
    await apiFetch(`/mentor/students/${student.id}`, {
      method: "PATCH",
      body: JSON.stringify({ leadStage: stage || null }),
    });
    onLeadStageChanged(student.id, stage);
  }

  const profileTabs: { key: ProfileTab; label: string; icon: typeof FileText }[] = [
    { key: "timeline", label: "Timeline", icon: Activity },
    { key: "followups", label: "Follow-Ups", icon: MessageSquare },
    { key: "attendance", label: "Attendance", icon: Calendar },
    { key: "homework", label: "Homework", icon: BookOpen },
    { key: "tests", label: "Tests", icon: ClipboardList },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-4xl bg-white flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: `${GREEN}40` }}>
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-black text-white text-sm">{student.name}</div>
              <div className="text-white/60 text-xs">Grade {student.grade}{student.school ? ` · ${student.school}` : ""}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-52 flex-shrink-0 border-r border-gray-100 p-4 space-y-4 overflow-y-auto bg-gray-50/50">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Health Score</div>
              <RiskBadge level={student.riskLevel} score={student.healthScore} />
              <div className="text-[10px] text-gray-400 mt-1">
                {student.daysSinceLogin < 999 ? `${student.daysSinceLogin}d since login` : "Never logged in"}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Student Status</div>
              <LeadStageDropdown value={student.leadStage} onChange={changeLeadStage} />
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Contact</div>
              <div className="text-xs text-gray-600">{student.phone ?? student.email ?? "—"}</div>
            </div>

            <div>
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
                  <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="Phone number"
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
                  <button onClick={saveParent} disabled={parentLoading}
                    className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                    style={{ background: GREEN }}>
                    {parentLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold" style={{ color: NAVY }}>{student.parentName || "—"}</div>
                  <div className="text-xs text-gray-500">{student.parentPhone || "—"}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Stats</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs"><span className="text-gray-500">HW Done</span><span className="font-bold" style={{ color: NAVY }}>{student.hwCompletion}%</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Tests Taken</span><span className="font-bold" style={{ color: NAVY }}>{student.testCount}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">HW Pending</span><span className="font-bold" style={{ color: ORANGE }}>{student.hwPending}</span></div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto bg-white">
              {profileTabs.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key} onClick={() => setProfileTab(t.key)}
                    className="flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2"
                    style={{ borderColor: profileTab === t.key ? GREEN : "transparent", color: profileTab === t.key ? GREEN : "#9CA3AF" }}>
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Timeline tab */}
              {profileTab === "timeline" && (
                <div className="space-y-4">
                  <form onSubmit={addTimelineEntry} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <div className="text-xs font-bold" style={{ color: NAVY }}>Log Interaction</div>
                    <select value={tlNoteType} onChange={e => setTlNoteType(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                      {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <textarea value={tlRemark} onChange={e => setTlRemark(e.target.value)} required rows={2}
                      placeholder="Remark / observation… (required)"
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none resize-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Follow-Up Date</label>
                        <input type="date" value={tlFollowUpDate} onChange={e => setTlFollowUpDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Action Taken</label>
                        <input value={tlActionTaken} onChange={e => setTlActionTaken(e.target.value)} placeholder="e.g. Called parent"
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                      </div>
                    </div>
                    <button type="submit" disabled={tlLoading}
                      className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ background: GREEN }}>
                      {tlLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />} Log Interaction
                    </button>
                  </form>

                  {(() => {
                    const tlEntries = (Array.isArray(timeline) ? timeline : []).map(e => ({
                      key: `tl-${e.id}`, kind: "timeline" as const, noteType: e.noteType,
                      remark: e.remark, createdAt: e.createdAt,
                      createdByName: e.createdByName, createdByRole: e.createdByRole,
                      actionTaken: e.actionTaken ?? null, followUpDate: e.followUpDate ?? null,
                      callStatus: null as string | null,
                    }));
                    const fuEntries = (Array.isArray(followUps) ? followUps : []).map(f => ({
                      key: `fu-${f.id}`, kind: "followup" as const, noteType: f.noteType ?? "Follow-Up",
                      remark: f.note ?? "", createdAt: f.createdAt,
                      createdByName: null as string | null, createdByRole: null as string | null,
                      actionTaken: null as string | null, followUpDate: null as string | null,
                      callStatus: f.callStatus ?? null,
                    }));
                    const unified = [...tlEntries, ...fuEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    if (unified.length === 0) return <div className="text-center py-8 text-gray-400 text-xs">No interactions yet. Log the first one above.</div>;
                    return (
                      <div className="space-y-2">
                        {unified.map(entry => (
                          <div key={entry.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 flex-wrap gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {entry.createdByName && <span className="text-xs font-bold" style={{ color: NAVY }}>{entry.createdByName}</span>}
                                {entry.createdByName && entry.createdByRole && <span className="text-[10px] text-gray-400">—</span>}
                                {entry.createdByRole && <span className="text-[10px] text-gray-500 capitalize">{entry.createdByRole}</span>}
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: entry.kind === "followup" ? "#6366F115" : `${GREEN}15`, color: entry.kind === "followup" ? "#6366F1" : GREEN }}>{entry.noteType}</span>
                                {entry.kind === "followup" && entry.callStatus && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{entry.callStatus}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDateTime(entry.createdAt)}</span>
                            </div>
                            <div className="h-px bg-gray-100 mx-3" />
                            <div className="px-3 py-2">
                              <p className="text-xs text-gray-700 leading-relaxed">{entry.remark}</p>
                              {entry.actionTaken && <p className="text-[10px] text-blue-600 mt-1">Action: {entry.actionTaken}</p>}
                              {entry.followUpDate && <p className="text-[10px] text-orange-600 mt-0.5">Follow-up: {fmtDate(entry.followUpDate)}</p>}
                            </div>
                            <div className="h-px bg-gray-50" />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Follow-ups tab */}
              {profileTab === "followups" && (
                <div className="space-y-4">
                  <form onSubmit={addFollowUpFromSlider} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <div className="text-xs font-bold" style={{ color: NAVY }}>Add Follow-Up</div>
                    <select value={fuNoteType} onChange={e => setFuNoteType(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                      {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} required rows={2}
                      placeholder="Remark / note… (required)"
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none resize-none" />
                    <CallDetailsForm
                      callStatus={fuCallStatus} callTime={fuCallTime}
                      calledBy={fuCalledBy} calledByName={fuCalledByName}
                      onChange={(field, val) => {
                        if (field === "callStatus") setFuCallStatus(val);
                        else if (field === "callTime") setFuCallTime(val);
                        else if (field === "calledBy") setFuCalledBy(val);
                        else if (field === "calledByName") setFuCalledByName(val);
                      }} />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Next Follow-Up Date</label>
                        <input type="date" value={fuNextDate} onChange={e => setFuNextDate(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-0.5">Lead Status</label>
                        <select value={fuLeadStatus} onChange={e => setFuLeadStatus(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                          <option value="">— none —</option>
                          {SUCCESS_STAGES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="submit" disabled={fuLoading}
                      className="w-full py-1.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                      style={{ background: ORANGE }}>
                      {fuLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Save Follow-Up
                    </button>
                  </form>

                  <div className="space-y-2">
                    {!Array.isArray(followUps) || followUps.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs">No follow-ups recorded yet.</div>
                    ) : (Array.isArray(followUps) ? followUps : []).map(fu => (
                      <div key={fu.id} className="bg-white rounded-xl border border-gray-100 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: NAVY }}>{fu.noteType}</span>
                          <span className="text-[10px] text-gray-400">{fmtDateTime(fu.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-600">{fu.note}</p>
                        {fu.nextFollowUpDate && <p className="text-[10px] text-orange-600 mt-1">Follow-up: {fmtDate(fu.nextFollowUpDate)}</p>}
                        {fu.callStatus && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 mt-1 inline-block">{fu.callStatus}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance tab */}
              {profileTab === "attendance" && (
                <div className="space-y-2">
                  {!Array.isArray(attendance) || attendance.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">No attendance records.</div>
                  ) : (Array.isArray(attendance) ? attendance : []).map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3">
                      <span className="text-xs font-semibold" style={{ color: NAVY }}>{fmtDate(a.attendanceDate)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.status === "present" ? "bg-green-100 text-green-700" : a.status === "absent" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>{a.status}</span>
                      {a.remark && <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{a.remark}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Homework tab */}
              {profileTab === "homework" && (
                <div className="space-y-2">
                  {!Array.isArray(hwSubs) || hwSubs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">No homework submissions.</div>
                  ) : (Array.isArray(hwSubs) ? hwSubs : []).map(hw => (
                    <div key={hw.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3">
                      <span className="text-xs font-semibold" style={{ color: NAVY }}>Submission #{hw.id}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${hw.status === "graded" ? "bg-green-100 text-green-700" : hw.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>{hw.status}</span>
                      <span className="text-[10px] text-gray-400">{hw.submittedAt ? fmtDateTime(hw.submittedAt) : "—"}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tests tab */}
              {profileTab === "tests" && (
                <div className="space-y-2">
                  {!Array.isArray(testSubs) || testSubs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">No test submissions.</div>
                  ) : (Array.isArray(testSubs) ? testSubs : []).map(ts => (
                    <div key={ts.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-3">
                      <span className="text-xs font-semibold" style={{ color: NAVY }}>Test #{ts.id}</span>
                      <span className="text-xs font-bold" style={{ color: GREEN }}>{ts.score ?? 0}/{ts.maxScore ?? 0}</span>
                      <span className="text-[10px] text-gray-400">{ts.submittedAt ? fmtDateTime(ts.submittedAt) : "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main BTL CRM Component ───────────────────────────────────────────────
export default function BTLCRMPage() {
  const { student, role, isLoading, logout } = useAuth();
  const [now, setNow] = useState(new Date());
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<{ checkInTime: string | null; checkOutTime: string | null } | null | undefined>(undefined);
  const [checkingIn, setCheckingIn] = useState(false);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    apiFetch("/staff/checkin/today").then(r => r.ok ? r.json() : null).then(setTodayCheckin).catch(() => setTodayCheckin(null));
  }, []);

  async function doCheckIn() {
    setCheckingIn(true);
    try {
      const r = await apiFetch("/staff/checkin", { method: "POST" });
      if (r.ok) setTodayCheckin(await r.json());
    } finally { setCheckingIn(false); }
  }

  async function doCheckOut() {
    setCheckingIn(true);
    try {
      const r = await apiFetch("/staff/checkin/checkout", { method: "PATCH" });
      if (r.ok) setTodayCheckin(await r.json());
    } finally { setCheckingIn(false); }
  }
  const [tab, setTab] = useState<Tab>(() => {
    const stored = localStorage.getItem("braintam_mentor_portal_type");
    localStorage.removeItem("braintam_mentor_portal_type");
    return "dashboard";
  });

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Attendance
  const [attDate, setAttDate] = useState(todayStr());
  const [attStatusFilter, setAttStatusFilter] = useState<"all" | "present" | "absent" | "late" | "unmarked">("all");
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<LiveClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceRecord>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [expandedCall, setExpandedCall] = useState<number | null>(null);
  const [callDrafts, setCallDrafts] = useState<Record<number, { callStatus: string; callTime: string; calledBy: string; calledByName: string; remark: string }>>({});

  // Follow-up edit
  const [editingFollowUpId, setEditingFollowUpId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<FollowUp> & { editRemark: string }>({ editRemark: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editHistories, setEditHistories] = useState<Record<number, FollowUpEdit[]>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  // Students
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "grade" | "health" | "stage">("health");
  const [riskFilter, setRiskFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  // 360 profile
  const [profile360, setProfile360] = useState<StudentDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Follow-up form
  const [fuStudentId, setFuStudentId] = useState<number | "">("");
  const [fuNoteType, setFuNoteType] = useState("General Note");
  const [fuNote, setFuNote] = useState("");
  const [fuCallStatus, setFuCallStatus] = useState("");
  const [fuCallTime, setFuCallTime] = useState("");
  const [fuCalledBy, setFuCalledBy] = useState("");
  const [fuCalledByName, setFuCalledByName] = useState("");
  const [fuLeadStatus, setFuLeadStatus] = useState("");
  const [fuNextDate, setFuNextDate] = useState("");
  const [fuLoading, setFuLoading] = useState(false);
  const [fuFilter, setFuFilter] = useState("all");

  // Tasks
  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState("Call Parent");
  const [taskStudentId, setTaskStudentId] = useState<number | "">("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Reminder prefs
  const [reminderPrefs, setReminderPrefs] = useState<{ remindersEnabled: boolean; digestMode: boolean; digestTime: string } | null>(null);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderSaved, setReminderSaved] = useState(false);

  // Health summary + students view toggle
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [studentsView, setStudentsView] = useState<"table" | "health">("table");

  // Sales SSM dashboard metrics
  const [salesMetrics, setSalesMetrics] = useState<{ assignedLeads: number; needToCall: number; interested: number; highlyInterested: number; converted: number; repeatedCustomers: number; dropped: number } | null>(null);

  const fetchDashboard = useCallback(async () => {
    const r = await apiFetch("/mentor/dashboard");
    if (r.ok) {
      const d = await r.json();
      setDashboard({
        ...d,
        followUpReminders: Array.isArray(d.followUpReminders) ? d.followUpReminders : [],
        recentFollowUps: Array.isArray(d.recentFollowUps) ? d.recentFollowUps : [],
      });
    }
  }, []);
  const fetchStudents = useCallback(async () => {
    const r = await apiFetch("/mentor/students?limit=200");
    if (r.ok) { const d = await r.json(); setStudents(Array.isArray(d.students) ? d.students : []); }
  }, []);
  const fetchHealthSummary = useCallback(async () => {
    const r = await apiFetch("/mentor/students/health-summary");
    if (r.ok) setHealthSummary(await r.json());
  }, []);
  const fetchFollowUps = useCallback(async () => {
    const r = await apiFetch("/mentor/follow-ups");
    if (r.ok) { const d = await r.json(); setFollowUps(Array.isArray(d) ? d : []); }
  }, []);
  const fetchTasks = useCallback(async () => {
    const r = await apiFetch("/mentor/tasks");
    if (r.ok) { const d = await r.json(); setTasks(Array.isArray(d) ? d : []); }
  }, []);
  const fetchLiveClasses = useCallback(async (date: string) => {
    const r = await apiFetch(`/mentor/live-classes?date=${date}`);
    if (r.ok) { const cls = await r.json(); const arr = Array.isArray(cls) ? cls : []; setLiveClasses(arr); setSelectedClassId(arr.length > 0 ? arr[0].id : null); }
  }, []);
  const fetchUpcomingClasses = useCallback(async () => {
    const r = await apiFetch("/mentor/live-classes?upcoming=true");
    if (r.ok) { const cls = await r.json(); setUpcomingClasses(Array.isArray(cls) ? cls : []); }
  }, []);
  const fetchAttendance = useCallback(async (date: string, classId: number | null) => {
    setAttLoading(true);
    const qs = classId ? `?date=${date}&liveClassId=${classId}` : `?date=${date}`;
    const r = await apiFetch(`/mentor/attendance${qs}`);
    if (r.ok) { const rows: AttendanceRecord[] = await r.json(); setAttendanceMap(Object.fromEntries((Array.isArray(rows) ? rows : []).map(r => [r.studentId, r]))); }
    setAttLoading(false);
  }, []);
  const fetchReminderPrefs = useCallback(async () => {
    const r = await apiFetch("/mentor/reminder-prefs");
    if (r.ok) { const d = await r.json(); setReminderPrefs({ remindersEnabled: d.remindersEnabled ?? true, digestMode: d.digestMode ?? true, digestTime: d.digestTime ?? "09:00" }); }
  }, []);

  const fetchSalesMetrics = useCallback(async () => {
    const r = await apiFetch("/mentor/sales/dashboard");
    if (r.ok) setSalesMetrics(await r.json());
  }, []);

  useEffect(() => {
    if (!isLoading && ["mentor", "academic_mentor", "sales_mentor", "super_admin"].includes(role ?? "")) {
      fetchDashboard(); fetchStudents(); fetchFollowUps(); fetchTasks();
    }
  }, [isLoading, role]);

  useEffect(() => {
    if (isLoading || !["mentor", "academic_mentor", "sales_mentor", "super_admin"].includes(role ?? "")) return;
    const id = setInterval(() => { fetchFollowUps(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [isLoading, role, fetchFollowUps]);

  useEffect(() => { if (tab === "attendance") fetchLiveClasses(attDate); }, [tab, attDate]);
  useEffect(() => { if (tab === "attendance") fetchAttendance(attDate, selectedClassId); }, [tab, attDate, selectedClassId]);
  useEffect(() => { if (tab === "attendance") fetchUpcomingClasses(); }, [tab]);
  useEffect(() => { if (tab === "settings") fetchReminderPrefs(); }, [tab]);
  useEffect(() => { if (tab === "students") fetchHealthSummary(); }, [tab, fetchHealthSummary]);
  useEffect(() => { if (tab === "dashboard" && dashboard?.mentorType === "sales") fetchSalesMetrics(); }, [tab, dashboard?.mentorType, fetchSalesMetrics]);

  // These must stay above ALL early returns (Rules of Hooks)
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeRemark, setCompleteRemark] = useState("");
  const [completeError, setCompleteError] = useState("");
  const [completeLoading, setCompleteLoading] = useState(false);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} /></div>;
  if (!student || !["mentor", "academic_mentor", "sales_mentor", "super_admin"].includes(role ?? "")) return <Redirect to="/mentor/login" />;
  // Wait for dashboard so we know mentorType before rendering either portal
  if (!dashboard) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} /></div>;

  // ── Derived data ──
  const filteredStudents = students
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !search || s.name.toLowerCase().includes(q) || String(s.grade).includes(q) || (s.email ?? "").toLowerCase().includes(q);
      const matchRisk = !riskFilter || s.riskLevel === riskFilter;
      const matchStage = !stageFilter || s.leadStage === stageFilter;
      return matchSearch && matchRisk && matchStage;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "grade") return a.grade - b.grade;
      if (sortBy === "stage") return (a.leadStage ?? "").localeCompare(b.leadStage ?? "");
      return b.healthScore - a.healthScore;
    });

  const atRiskStudents = students.filter(s => s.riskLevel === "at-risk");
  const attentionStudents = students.filter(s => s.riskLevel === "attention");
  const stageCounts: Record<string, number> = {};
  for (const s of students) { if (s.leadStage) stageCounts[s.leadStage] = (stageCounts[s.leadStage] ?? 0) + 1; }

  const filteredFollowUps = followUps.filter(fu => fuFilter === "all" || fu.fuStatus === fuFilter);
  const fuCounts = { due_today: 0, overdue: 0, upcoming: 0, completed: 0 };
  for (const fu of followUps) { if (fu.fuStatus) fuCounts[fu.fuStatus as keyof typeof fuCounts] = (fuCounts[fu.fuStatus as keyof typeof fuCounts] ?? 0) + 1; }

  const taskOverdue = tasks.filter(t => t.effectiveStatus === "overdue").length;
  const taskPending = tasks.filter(t => t.effectiveStatus === "pending" || t.effectiveStatus === "in_progress").length;
  const alertCount = atRiskStudents.length + attentionStudents.length;

  // ── Attendance class state & counters ──
  const selectedClass = liveClasses.find(c => c.id === selectedClassId) ?? null;
  const classState = selectedClass ? getClassState(selectedClass) : null;
  const isClassCompleted = classState === "completed";
  const isClassUpcoming = classState === "upcoming";
  const isClassLive = classState === "live";
  const isToday = attDate === todayStr();
  const isPastDate = attDate < todayStr();
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })();
  // Completed classes remain editable for 1 extra day (call-back window)
  const canEditCompleted = attDate >= yesterdayStr;
  const attTotalStudents = students.length;
  const attPresentCount = students.filter(s => attendanceMap[s.id]?.status === "present").length;
  const attAbsentCount = students.filter(s => attendanceMap[s.id]?.status === "absent").length;
  const attLateCount = students.filter(s => attendanceMap[s.id]?.status === "late").length;
  const attMarkedCount = attPresentCount + attAbsentCount + attLateCount;
  const attCallsDone = students.filter(s => attendanceMap[s.id]?.callStatus === "called").length;
  const attCallLaterCount = students.filter(s => attendanceMap[s.id]?.callStatus === "call_later").length;
  const attRemainingCalls = students.filter(s => attendanceMap[s.id]?.status === "absent" && !attendanceMap[s.id]?.callStatus).length;
  const attPct = attTotalStudents > 0 ? Math.round((attMarkedCount / attTotalStudents) * 100) : 0;
  const callPct = attAbsentCount > 0 ? Math.round((attCallsDone / attAbsentCount) * 100) : (attMarkedCount > 0 ? 100 : 0);
  const attPresentPct = attTotalStudents > 0 ? Math.round((attPresentCount / attTotalStudents) * 100) : 0;
  const liveNowClasses = liveClasses.filter(c => getClassState(c) === "live");
  const upcomingClassesForDate = liveClasses.filter(c => getClassState(c) === "upcoming");
  const completedClassesForDate = liveClasses.filter(c => getClassState(c) === "completed");

  // ── Attendance helpers ──
  async function markAttendance(studentId: number, status: string) {
    const draft = callDrafts[studentId] ?? { callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" };
    await apiFetch("/mentor/attendance", { method: "POST", body: JSON.stringify({ studentId, attendanceDate: attDate, status, liveClassId: selectedClassId, callStatus: draft.callStatus || null, callTime: draft.callTime || null, calledBy: draft.calledBy || null, calledByName: draft.calledByName || null, remark: draft.remark || null }) });
    await fetchAttendance(attDate, selectedClassId);
  }
  async function saveCallDetails(studentId: number) {
    const draft = callDrafts[studentId] ?? { callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" };
    const current = attendanceMap[studentId];
    if (!current) return;
    await apiFetch("/mentor/attendance", { method: "POST", body: JSON.stringify({ studentId, attendanceDate: attDate, liveClassId: selectedClassId, status: current.status, callStatus: draft.callStatus || null, callTime: draft.callTime || null, calledBy: draft.calledBy || null, calledByName: draft.calledByName || null, remark: draft.remark || null }) });
    await fetchAttendance(attDate, selectedClassId);
    setExpandedCall(null);
  }
  function updateDraft(studentId: number, field: string, val: string) {
    setCallDrafts(prev => ({ ...prev, [studentId]: { ...{ callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" }, ...prev[studentId], [field]: val } }));
  }
  async function markCallStatus(studentId: number, callStatus: string) {
    const current = attendanceMap[studentId];
    if (!current) return;
    await apiFetch("/mentor/attendance", {
      method: "POST",
      body: JSON.stringify({
        studentId, attendanceDate: attDate, liveClassId: selectedClassId,
        status: current.status, callStatus: callStatus || null,
        callTime: current.callTime || null, calledBy: current.calledBy || null,
        calledByName: current.calledByName || null, remark: current.remark || null,
      }),
    });
    await fetchAttendance(attDate, selectedClassId);
  }

  // ── 360 profile ──
  async function open360(s: Student) {
    setProfileLoading(true);
    const r = await apiFetch(`/mentor/students/${s.id}`);
    if (r.ok) { const data = await r.json(); setProfile360({ ...data, student: { ...s, leadStage: s.leadStage, parentName: s.parentName, parentPhone: s.parentPhone, ...data.student } }); }
    setProfileLoading(false);
  }
  async function refreshProfile360(studentId: number) {
    const r = await apiFetch(`/mentor/students/${studentId}`);
    if (r.ok) { const data = await r.json(); setProfile360(prev => prev ? { ...data, student: { ...prev.student, ...data.student } } : null); }
  }
  function handleLeadStageChanged(studentId: number, stage: string) {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, leadStage: stage || null } : s));
    setProfile360(prev => prev ? { ...prev, student: { ...prev.student, leadStage: stage || null } } : null);
  }
  function handleParentSaved(studentId: number, name: string, phone: string) {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, parentName: name || null, parentPhone: phone || null } : s));
    setProfile360(prev => prev ? { ...prev, student: { ...prev.student, parentName: name || null, parentPhone: phone || null } } : null);
  }
  async function updateLeadStageInline(studentId: number, stage: string) {
    await apiFetch(`/mentor/students/${studentId}`, { method: "PATCH", body: JSON.stringify({ leadStage: stage || null }) });
    handleLeadStageChanged(studentId, stage);
  }
  async function open360ById(studentId: number, studentName?: string | null) {
    const found = students.find(s => s.id === studentId);
    if (found) { open360(found); return; }
    setProfileLoading(true);
    const r = await apiFetch(`/mentor/students/${studentId}`);
    if (r.ok) {
      const data = await r.json();
      setProfile360({
        ...data,
        student: {
          id: studentId, name: studentName ?? data.student?.name ?? `Student #${studentId}`,
          grade: 0, school: null, email: null, phone: null, isActive: true,
          hwCompletion: 0, hwTotal: 0, hwPending: 0, testCount: 0,
          healthScore: 0, riskLevel: "good" as const, daysSinceLogin: 0,
          assignedAt: "", leadStage: null, parentName: null, parentPhone: null, attendancePct: null,
          ...data.student,
        },
      });
    }
    setProfileLoading(false);
  }

  // ── Follow-ups ──
  async function addFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fuStudentId || !fuNote.trim()) return;
    setFuLoading(true);
    const r = await apiFetch("/mentor/follow-ups", { method: "POST", body: JSON.stringify({ studentId: fuStudentId, noteType: fuNoteType, note: fuNote, callStatus: fuCallStatus || null, callTime: fuCallTime || null, calledBy: fuCalledBy || null, calledByName: fuCalledByName || null, leadStatus: fuLeadStatus || null, nextFollowUpDate: fuNextDate || null }) });
    if (r.ok) { setFuNote(""); setFuCallStatus(""); setFuCallTime(""); setFuCalledBy(""); setFuCalledByName(""); setFuLeadStatus(""); setFuNextDate(""); await fetchFollowUps(); await fetchDashboard(); }
    setFuLoading(false);
  }
  function startComplete(id: number) { setCompletingId(id); setCompleteRemark(""); setCompleteError(""); }
  function cancelComplete() { setCompletingId(null); setCompleteRemark(""); setCompleteError(""); }
  async function submitComplete(id: number) {
    if (!completeRemark.trim()) { setCompleteError("Please enter a completion remark."); return; }
    setCompleteLoading(true);
    const r = await apiFetch(`/mentor/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ callStatus: "completed", note: completeRemark.trim() }) });
    if (r.ok) { setCompletingId(null); setCompleteRemark(""); setCompleteError(""); await fetchFollowUps(); await fetchDashboard(); }
    else { const d = await r.json().catch(() => ({})); setCompleteError(d.error ?? "Failed to complete. Please retry."); }
    setCompleteLoading(false);
  }

  // ── Edit follow-up ──
  function startEditFollowUp(fu: FollowUp) {
    setEditingFollowUpId(fu.id);
    setEditDraft({ noteType: fu.noteType, note: fu.note, callStatus: fu.callStatus ?? "", callTime: fu.callTime ?? "", calledBy: fu.calledBy ?? "", calledByName: fu.calledByName ?? "", leadStatus: fu.leadStatus ?? "", nextFollowUpDate: fu.nextFollowUpDate ?? "", editRemark: "" });
    setEditError("");
    setCompletingId(null);
  }
  function cancelEditFollowUp() { setEditingFollowUpId(null); setEditDraft({ editRemark: "" }); setEditError(""); }
  async function saveEditFollowUp(id: number) {
    if (!editDraft.editRemark?.trim()) { setEditError("Please enter a reason for this edit."); return; }
    setEditLoading(true);
    const r = await apiFetch(`/mentor/follow-ups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        noteType: editDraft.noteType, note: editDraft.note,
        callStatus: editDraft.callStatus || null, callTime: editDraft.callTime || null,
        calledBy: editDraft.calledBy || null, calledByName: editDraft.calledByName || null,
        leadStatus: editDraft.leadStatus || null, nextFollowUpDate: editDraft.nextFollowUpDate || null,
        editRemark: editDraft.editRemark,
      }),
    });
    if (r.ok) { cancelEditFollowUp(); await fetchFollowUps(); }
    else { const d = await r.json().catch(() => ({})); setEditError(d.error ?? "Failed to save. Please retry."); }
    setEditLoading(false);
  }
  async function toggleEditHistory(id: number) {
    if (expandedHistoryId === id) { setExpandedHistoryId(null); return; }
    if (!editHistories[id]) {
      setLoadingHistoryId(id);
      const r = await apiFetch(`/mentor/follow-ups/${id}/edits`);
      if (r.ok) { const edits = await r.json(); setEditHistories(prev => ({ ...prev, [id]: edits })); }
      setLoadingHistoryId(null);
    }
    setExpandedHistoryId(id);
  }

  // ── Tasks ──
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setTaskLoading(true);
    const r = await apiFetch("/mentor/tasks", { method: "POST", body: JSON.stringify({ title: taskTitle, taskType, studentId: taskStudentId || null, dueDate: taskDueDate || null, note: taskNote || null }) });
    if (r.ok) { setTaskTitle(""); setTaskType("Call Parent"); setTaskStudentId(""); setTaskDueDate(""); setTaskNote(""); setShowTaskForm(false); await fetchTasks(); }
    setTaskLoading(false);
  }
  async function updateTaskStatus(id: number, status: string) {
    await apiFetch(`/mentor/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await fetchTasks();
  }
  async function deleteTask(id: number) {
    await apiFetch(`/mentor/tasks/${id}`, { method: "DELETE" });
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const mentorType = dashboard?.mentorType ?? "academic";
  const isSales = mentorType === "sales";

  const academicTabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: "dashboard",     label: "Dashboard",     icon: Home },
    { key: "today-tasks",   label: "Today's Tasks", icon: Zap },
    { key: "students",      label: "Students",      icon: Users },
    { key: "follow-ups",    label: "Follow-Ups",    icon: MessageSquare },
    { key: "tasks",         label: "Tasks",         icon: CheckSquare },
    { key: "attendance",    label: "Attendance",    icon: Calendar },
    { key: "live-classes",  label: "Live Classes",  icon: Video },
    { key: "doubt-sessions",label: "Doubt Sessions",icon: HelpCircle },
    { key: "eod-report",    label: "EOD Report",    icon: ClipboardCheck },
    { key: "settings",      label: "Reminders",     icon: Bell },
    { key: "profile",       label: "My Profile",    icon: UserCircle },
  ];

  const salesTabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: "dashboard",          label: "Dashboard",        icon: Home },
    { key: "calling-queue",      label: "Today's Calling",  icon: Phone },
    { key: "assigned-leads",     label: "Assigned Leads",   icon: Users },
    { key: "non-active",         label: "Non-Active",       icon: AlertCircle },
    { key: "converted-students", label: "Converted",        icon: CheckCircle2 },
    { key: "leaderboard",        label: "Leaderboard",      icon: Trophy },
    { key: "profile",            label: "My Profile",       icon: UserCircle },
  ];

  const tabs = isSales ? salesTabs : academicTabs;

  async function saveReminderPrefs() {
    if (!reminderPrefs) return;
    setReminderSaving(true);
    const r = await apiFetch("/mentor/reminder-prefs", {
      method: "PUT",
      body: JSON.stringify(reminderPrefs),
    });
    if (r.ok) { const d = await r.json(); setReminderPrefs({ remindersEnabled: d.remindersEnabled, digestMode: d.digestMode, digestTime: d.digestTime }); setReminderSaved(true); setTimeout(() => setReminderSaved(false), 3000); }
    setReminderSaving(false);
  }

  // ── Sales Mentor: use redesigned portal ────────────────────────────────
  if (isSales) {
    return (
      <SalesMentorPortal
        user={{ id: student.id, name: student.name ?? "Mentor", avatarUrl: student.avatarUrl }}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>

      {profileLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
      {profile360 && !profileLoading && (
        <Student360 detail={profile360} onClose={() => setProfile360(null)}
          onTimelineAdded={() => refreshProfile360(profile360.student.id)}
          onFollowUpAdded={async () => { await refreshProfile360(profile360.student.id); await fetchFollowUps(); await fetchDashboard(); }}
          onLeadStageChanged={handleLeadStageChanged}
          onParentSaved={handleParentSaved} />
      )}

      {/* ── Global Header ── */}
      <div className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-30">
        <img src={braintamLogo} alt="Braintam" className="h-11 w-auto shrink-0" />
        <div className="flex items-center gap-1.5 pl-1">
          <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ background: ORANGE }} />
          <div>
            <div className="font-black leading-tight" style={{ fontSize: "13px", color: NAVY, letterSpacing: "0.04em" }}>BTL <span style={{ color: ORANGE }}>CRM</span></div>
            <div className="text-[9px] text-gray-400 leading-tight">Mentor Portal</div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs shrink-0">
          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="text-gray-500 whitespace-nowrap">{now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })}</span>
          <span className="font-mono font-semibold tabular-nums whitespace-nowrap" style={{ color: NAVY }}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: true })}</span>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setProfileDropOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden"
              style={{ background: student.avatarUrl ? "transparent" : NAVY }}>
              {student.avatarUrl ? <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" /> : (student.name?.[0] ?? "M")}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold leading-tight" style={{ color: NAVY }}>{student.name}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: isSales ? "#D97706" : GREEN }}>{isSales ? "Sales SSM" : "Academic Mentor"}</div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${profileDropOpen ? "rotate-180" : ""}`} />
          </button>
          {profileDropOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
              style={{ boxShadow: "0 8px 32px rgba(11,43,107,0.13)" }}>
              <div className="px-4 py-3 border-b border-gray-50" style={{ background: "#F8FAFF" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 overflow-hidden"
                    style={{ background: student.avatarUrl ? "transparent" : NAVY }}>
                    {student.avatarUrl ? <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" /> : (student.name?.[0] ?? "M")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black truncate" style={{ color: NAVY }}>{student.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: isSales ? "#D97706" : GREEN }}>{isSales ? "Sales SSM" : "Academic Mentor"}</div>
                    {student.email && <div className="text-[10px] text-gray-400 truncate">{student.email}</div>}
                  </div>
                </div>
              </div>
              {/* ── Check In / Check Out ── */}
              <div className="px-4 py-3 border-b border-gray-50">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Attendance</div>
                {todayCheckin === undefined ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                  </div>
                ) : todayCheckin?.checkInTime && !todayCheckin?.checkOutTime ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Checked in at {new Date(todayCheckin.checkInTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <button onClick={() => { doCheckOut(); }}
                      disabled={checkingIn}
                      className="w-full px-3 py-1.5 rounded-lg text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors flex items-center gap-1.5 disabled:opacity-60">
                      {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                      {checkingIn ? "Checking out…" : "Check Out"}
                    </button>
                  </div>
                ) : todayCheckin?.checkInTime && todayCheckin?.checkOutTime ? (
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
                      <CheckCircle2 className="w-3 h-3 text-green-500" /> Completed today
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {new Date(todayCheckin.checkInTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {new Date(todayCheckin.checkOutTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => doCheckIn()} disabled={checkingIn}
                    className="w-full px-3 py-1.5 rounded-lg text-[11px] font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-1.5 disabled:opacity-60">
                    {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                    {checkingIn ? "Checking in…" : "Check In"}
                  </button>
                )}
              </div>
              <div className="py-1">
                <button onClick={() => { setProfileDropOpen(false); setTab("profile"); }}
                  className="w-full px-4 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
                  <UserCircle className="w-3.5 h-3.5 text-gray-400" /> My Profile
                </button>
                <a href="/" className="block px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">← Back to Site</a>
                <div className="border-t border-gray-50 mt-1 pt-1">
                  <button onClick={() => { setProfileDropOpen(false); logout(); window.location.href = "/mentor/login"; }}
                    className="w-full px-4 py-2 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2.5 transition-colors font-semibold">
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col border-r border-gray-100 bg-white overflow-y-auto">
        {/* Mentor type badge */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: isSales ? "#FFFBEB" : "#ECFDF5",
              color: isSales ? "#D97706" : "#059669",
              border: `1px solid ${isSales ? "#FCD34D" : "#6EE7B7"}`,
            }}>
            {isSales ? "💼 Sales SSM" : "📚 Academic Mentor"}
          </span>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-2.5 px-5 py-2 text-sm text-left transition-colors"
                style={{
                  color: active ? NAVY : "#6B7280",
                  background: active ? "#EEF2FF" : "transparent",
                  fontWeight: active ? 600 : 400,
                }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs">{t.label}</span>
                {t.key === "students" && alertCount > 0 && <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>{alertCount}</span>}
                {t.key === "follow-ups" && (fuCounts.due_today + fuCounts.overdue) > 0 && <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: ORANGE }}>{fuCounts.due_today + fuCounts.overdue}</span>}
                {t.key === "tasks" && taskOverdue > 0 && <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>{taskOverdue}</span>}
                {t.key === "dashboard" && (dashboard?.followUpReminders?.length ?? 0) > 0 && <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: ORANGE }}>{dashboard!.followUpReminders.length}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 overflow-auto" style={{ background: "#F5F7FF" }}>

        {/* ════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div className="p-5 max-w-5xl mx-auto space-y-5">
            <MasteryAchievementTicker />
            <MasteryNotificationBar />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black" style={{ color: NAVY }}>BTL CRM Dashboard</h1>
                <p className="text-xs text-gray-500 mt-0.5">Welcome back, {student.name}</p>
              </div>
              {dashboard && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: isSales ? "#FEF3C7" : "#ECFDF5", color: isSales ? "#D97706" : "#059669" }}>
                  {isSales ? "💼 Sales Mentor" : "📚 Academic Mentor"}
                </span>
              )}
            </div>
            {dashboard ? (
              <>
                {/* ── Sales SSM Dashboard ── */}
                {isSales ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Assigned Leads", value: salesMetrics?.assignedLeads ?? dashboard.totalAssigned, icon: "👥", color: NAVY, tab: "assigned-leads" as Tab },
                        { label: "Need To Call", value: salesMetrics?.needToCall ?? 0, icon: "📞", color: "#DC2626", tab: "calling-queue" as Tab },
                        { label: "Interested", value: salesMetrics?.interested ?? 0, icon: "💡", color: "#0284C7", tab: "calling-queue" as Tab },
                        { label: "Highly Interested", value: salesMetrics?.highlyInterested ?? 0, icon: "🔥", color: "#D97706", tab: "calling-queue" as Tab },
                        { label: "Converted", value: salesMetrics?.converted ?? 0, icon: "🎯", color: GREEN, tab: "converted-students" as Tab },
                        { label: "Repeated Customers", value: salesMetrics?.repeatedCustomers ?? 0, icon: "🔄", color: ORANGE, tab: "assigned-leads" as Tab },
                      ].map(c => (
                        <button key={c.label} onClick={() => setTab(c.tab)}
                          className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm text-left hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base">{c.icon}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${c.color}15`, color: c.color }}>{c.label}</span>
                          </div>
                          <div className="text-lg font-black leading-none" style={{ color: NAVY }}>{c.value}</div>
                        </button>
                      ))}
                    </div>

                    {/* CTA to calling queue */}
                    <div className="rounded-2xl border-2 p-4 flex items-center justify-between" style={{ borderColor: "#DC2626", background: "#FEF2F2" }}>
                      <div>
                        <div className="font-black text-sm" style={{ color: "#DC2626" }}>📞 Today's Calling Queue</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {salesMetrics?.needToCall ?? 0} parents to call · Filter by status · Add remarks
                        </div>
                      </div>
                      <button onClick={() => setTab("calling-queue")}
                        className="text-xs font-bold px-3 py-2 rounded-xl text-white flex-shrink-0" style={{ background: "#DC2626" }}>
                        Start Calling →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {[
                        { label: "Assigned", value: dashboard.totalAssigned, icon: "👥", color: NAVY },
                        { label: "Active Today", value: dashboard.activeToday, icon: "✅", color: GREEN },
                        { label: "At Risk", value: dashboard.atRisk, icon: "🔴", color: "#DC2626" },
                        { label: "Tasks Pending", value: dashboard.pendingTasks, icon: "📋", color: "#6366F1" },
                        { label: "Tasks Overdue", value: dashboard.overdueTasks, icon: "⚠️", color: ORANGE },
                      ].map(c => (
                        <div key={c.label} className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-base">{c.icon}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${c.color}15`, color: c.color }}>{c.label}</span>
                          </div>
                          <div className="text-lg font-black leading-none" style={{ color: NAVY }}>{c.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* ── Secondary stats row (academic only) ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Green (Healthy)", value: dashboard.green, color: GREEN },
                        { label: "Needs Attention", value: dashboard.needsAttention, color: "#D97706" },
                        { label: "Inactive 3d+", value: dashboard.notActive3Days, color: "#D97706" },
                        { label: "HW Pending", value: dashboard.homeworkPending, color: ORANGE },
                      ].map(c => (
                        <div key={c.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                          <div className="text-[10px] font-bold mb-1" style={{ color: c.color }}>{c.label}</div>
                          <div className="text-base font-black" style={{ color: NAVY }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(dashboard.followUpReminders?.length ?? 0) > 0 && (
                  <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-4 h-4" style={{ color: ORANGE }} />
                      <h3 className="font-black text-sm" style={{ color: ORANGE }}>Follow-Up Reminders Due ({dashboard.followUpReminders.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {dashboard.followUpReminders.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-orange-100 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <button
                              className="font-bold text-sm hover:underline text-left"
                              style={{ color: NAVY }}
                              onClick={() => open360ById(r.studentId, r.studentName)}
                            >
                              {r.studentName ?? `Student #${r.studentId}`}
                            </button>
                            <FuStatusBadge status={r.fuStatus ?? "upcoming"} daysOverdue={r.daysOverdue ?? 0} />
                          </div>
                          <button onClick={() => { setFuStudentId(r.studentId); setTab("follow-ups"); }}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg text-white flex-shrink-0" style={{ background: ORANGE }}>
                            Follow Up
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-red-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <h3 className="font-black text-sm" style={{ color: NAVY }}>Needs Attention</h3>
                    </div>
                    {[...atRiskStudents, ...attentionStudents].slice(0, 5).length === 0 ? (
                      <div className="text-center py-4"><CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-green-400" /><p className="text-xs text-gray-500">All on track!</p></div>
                    ) : [...atRiskStudents, ...attentionStudents].slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <div className="font-semibold text-xs" style={{ color: NAVY }}>{s.name}</div>
                          <div className="text-[10px] text-gray-400">Gr.{s.grade} · {s.daysSinceLogin < 999 ? `${s.daysSinceLogin}d` : "never"}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RiskBadge level={s.riskLevel} score={s.healthScore} />
                          <button onClick={() => open360(s)} className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${NAVY}10`, color: NAVY }}>View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4" style={{ color: NAVY }} />
                      <h3 className="font-black text-sm" style={{ color: NAVY }}>Recent Follow-Ups</h3>
                    </div>
                    {(dashboard.recentFollowUps?.length ?? 0) === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-400">No recent follow-ups</div>
                    ) : (Array.isArray(dashboard.recentFollowUps) ? dashboard.recentFollowUps : []).map(fu => (
                      <div key={fu.id} className="py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs" style={{ color: NAVY }}>{fu.studentName ?? "—"}</span>
                          <span className="text-[10px] text-gray-400">{fu.createdAt ? fmtDateTime(fu.createdAt) : ""}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{fu.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>}
          </div>
        )}

        {/* ════ STUDENTS (Compact CRM Table + Health Map) ════ */}
        {tab === "students" && (
          <div className="p-4 max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black" style={{ color: NAVY }}>Students</h1>
                <p className="text-xs text-gray-400">{filteredStudents.length} of {students.length} students</p>
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                  <button onClick={() => setStudentsView("table")}
                    className={`px-3 py-1.5 flex items-center gap-1 font-semibold transition-all ${studentsView === "table" ? "text-white" : "text-gray-500"}`}
                    style={studentsView === "table" ? { background: NAVY } : {}}>
                    <List className="w-3 h-3" /> Table
                  </button>
                  <button onClick={() => setStudentsView("health")}
                    className={`px-3 py-1.5 flex items-center gap-1 font-semibold transition-all ${studentsView === "health" ? "text-white" : "text-gray-500"}`}
                    style={studentsView === "health" ? { background: "#059669" } : {}}>
                    <BarChart3 className="w-3 h-3" /> Health Map
                  </button>
                </div>
                <button onClick={() => { fetchStudents(); fetchHealthSummary(); }} className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600"><RefreshCw className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* ── Health Map View ── */}
            {studentsView === "health" && (
              <div className="space-y-4">
                {/* Summary tiles */}
                {healthSummary && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Green", key: "green" as const, color: "#059669", bg: "#DCFCE7", icon: "🟢" },
                      { label: "Yellow", key: "yellow" as const, color: "#D97706", bg: "#FEF3C7", icon: "🟡" },
                      { label: "Red", key: "red" as const, color: "#DC2626", bg: "#FEE2E2", icon: "🔴" },
                      { label: "Critical", key: "critical" as const, color: "#7F1D1D", bg: "#FEF2F2", icon: "⛔" },
                    ].map(b => (
                      <div key={b.key} className="rounded-xl border p-2.5 text-center" style={{ borderColor: b.color, background: b.bg }}>
                        <div className="text-sm mb-0.5">{b.icon}</div>
                        <div className="text-lg font-black leading-none" style={{ color: NAVY }}>{healthSummary[b.key].length}</div>
                        <div className="text-[10px] font-bold" style={{ color: b.color }}>{b.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Columns */}
                {healthSummary ? (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {[
                      { label: "🟢 Green (75+)", key: "green" as const, color: "#059669", bg: "#DCFCE7", border: "#059669" },
                      { label: "🟡 Yellow (50–74)", key: "yellow" as const, color: "#D97706", bg: "#FFFBEB", border: "#D97706" },
                      { label: "🔴 Red (25–49)", key: "red" as const, color: "#DC2626", bg: "#FEF2F2", border: "#DC2626" },
                      { label: "⛔ Critical (<25)", key: "critical" as const, color: "#7F1D1D", bg: "#FEF2F2", border: "#7F1D1D" },
                    ].map(col => (
                      <div key={col.key} className="flex-shrink-0 w-56">
                        <div className="flex items-center justify-between px-1 mb-2">
                          <span className="text-xs font-bold" style={{ color: col.color }}>{col.label}</span>
                          <span className="text-[10px] text-gray-400">{healthSummary[col.key].length}</span>
                        </div>
                        <div className="space-y-2 min-h-16">
                          {healthSummary[col.key].map(s => (
                            <div key={s.id} className="bg-white rounded-xl border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                              style={{ borderLeft: `3px solid ${col.border}` }}
                              onClick={() => open360ById(s.id, s.name)}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-semibold text-xs leading-tight" style={{ color: NAVY }}>{s.name}</div>
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: col.bg, color: col.color }}>{s.healthScore}%</span>
                              </div>
                              <div className="text-[10px] text-gray-400 mb-1.5">Gr.{s.grade} · {s.daysSinceLogin < 999 ? `${s.daysSinceLogin}d ago` : "never active"}</div>
                              {/* Health bar */}
                              <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${s.healthScore}%`, background: col.color }} />
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                <button onClick={e => { e.stopPropagation(); setFuStudentId(s.id); setTab("follow-ups"); }}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg text-white" style={{ background: ORANGE }}>
                                  Follow Up
                                </button>
                                <button onClick={e => { e.stopPropagation(); open360ById(s.id, s.name); }}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: "#EEF2FF", color: NAVY }}>
                                  View
                                </button>
                              </div>
                            </div>
                          ))}
                          {healthSummary[col.key].length === 0 && (
                            <div className="text-center py-6 text-[10px] text-gray-300">No students</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
                )}
              </div>
            )}

            {/* ── Table View ── */}
            {studentsView === "table" && (
              <div className="space-y-4">
                {Object.keys(stageCounts).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">BTL CRM Pipeline</div>
                    <div className="flex flex-wrap gap-2">
                      {SUCCESS_STAGES.filter(s => stageCounts[s]).map(s => (
                        <button key={s} onClick={() => setStageFilter(stageFilter === s ? "" : s)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all border"
                          style={{ background: stageFilter === s ? `${SUCCESS_STAGE_COLORS[s]}25` : `${SUCCESS_STAGE_COLORS[s]}10`, color: SUCCESS_STAGE_COLORS[s], borderColor: stageFilter === s ? SUCCESS_STAGE_COLORS[s] : "transparent" }}>
                          {s} <span className="font-black">{stageCounts[s]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
                  </div>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                    <option value="health">Health ↓</option>
                    <option value="name">Name A–Z</option>
                    <option value="grade">Grade</option>
                    <option value="stage">Stage</option>
                  </select>
                  <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                    <option value="">All Risk</option>
                    <option value="at-risk">At Risk</option>
                    <option value="attention">Attention</option>
                    <option value="good">Good</option>
                    <option value="excellent">Excellent</option>
                  </select>
                  {(riskFilter || stageFilter || search) && (
                    <button onClick={() => { setRiskFilter(""); setStageFilter(""); setSearch(""); }} className="text-xs text-red-500 font-semibold px-2 py-1 hover:bg-red-50 rounded-lg">Clear</button>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[860px]">
                      <thead>
                        <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                          <th className="text-left px-3 py-2.5 font-bold text-gray-500">Name</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-8">Gr</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-16">Health</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-20">Risk Level</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-12">HW%</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-12">Att%</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-20">Last On</th>
                          <th className="text-left px-2 py-2.5 font-bold text-gray-500 w-36">Student Status</th>
                          <th className="text-right px-3 py-2.5 font-bold text-gray-500 w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.length === 0 ? (
                          <tr><td colSpan={9} className="text-center py-10 text-gray-400">No students found</td></tr>
                        ) : filteredStudents.map(s => (
                          <tr key={s.id} onClick={() => open360(s)}
                            className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                  style={{ background: healthColor(s.riskLevel) }}>
                                  {s.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold leading-none" style={{ color: NAVY }}>{s.name}</div>
                                  {s.phone && <div className="text-[9px] text-gray-400">{s.phone}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 font-bold" style={{ color: NAVY }}>{s.grade}</td>
                            <td className="px-2 py-2.5"><RiskBadge level={s.riskLevel} score={s.healthScore} /></td>
                            <td className="px-2 py-2.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${healthColor(s.riskLevel)}18`, color: healthColor(s.riskLevel) }}>
                                {s.riskLevel === "at-risk" ? "At Risk" : s.riskLevel === "attention" ? "Attention" : s.riskLevel === "good" ? "Good" : "Excellent"}
                              </span>
                            </td>
                            <td className="px-2 py-2.5">
                              <span className={`font-bold ${s.hwCompletion >= 75 ? "text-green-600" : s.hwCompletion >= 50 ? "text-yellow-600" : "text-red-500"}`}>{s.hwCompletion}%</span>
                            </td>
                            <td className="px-2 py-2.5">
                              {s.attendancePct !== null && s.attendancePct !== undefined ? (() => {
                                const pct = s.attendancePct;
                                const total = 7;
                                const filled = Math.round((pct / 100) * total);
                                return (
                                  <div title={`${pct}% attendance`} className="flex flex-col gap-0.5">
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: total }).map((_, i) => (
                                        <div key={i} className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ background: i < filled ? (pct >= 75 ? "#22C55E" : pct >= 50 ? "#EAB308" : "#EF4444") : "#E5E7EB" }} />
                                      ))}
                                    </div>
                                    <span className={`text-[9px] font-bold ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-500"}`}>{pct}%</span>
                                  </div>
                                );
                              })() : <div className="flex gap-0.5">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-gray-100" />)}</div>}
                            </td>
                            <td className="px-2 py-2.5 text-gray-500 text-[11px]">{s.daysSinceLogin < 999 ? `${s.daysSinceLogin}d` : "never"}</td>
                            <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                              <LeadStageDropdown value={s.leadStage} onChange={v => updateLeadStageInline(s.id, v)} />
                            </td>
                            <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => open360(s)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all" title="Add Note">
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setFuStudentId(s.id); setTab("follow-ups"); }}
                                  className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Follow-Up">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => open360(s)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all" title="360 Profile">
                                  <UserCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ ATTENDANCE ════ */}
        {tab === "attendance" && (
          <div className="p-4 max-w-5xl mx-auto space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-lg font-black" style={{ color: NAVY }}>Attendance</h1>
                {isPastDate && canEditCompleted && <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#F97316" }}>📞 Call window open — edit attendance &amp; calls until end of day</p>}
                {isPastDate && !canEditCompleted && <p className="text-[10px] text-gray-400 mt-0.5">📋 Past record — view only</p>}
                {attDate > todayStr() && <p className="text-[10px] text-gray-400 mt-0.5">🔒 Future class — locked</p>}
              </div>
              <div className="flex items-center gap-2">
                {isToday && <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: "#DCFCE7", color: GREEN }}>📅 Today</span>}
                <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400" />
                <button onClick={() => { fetchLiveClasses(attDate); fetchAttendance(attDate, selectedClassId); }}
                  className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── TODAY SUMMARY CARDS ── */}
            {selectedClass && students.length > 0 && !attLoading && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "Total Students", value: attTotalStudents, color: NAVY },
                  { label: "Present",         value: attPresentCount,   color: "#059669" },
                  { label: "Absent",          value: attAbsentCount,    color: "#DC2626" },
                  { label: "Calls Done",      value: attCallsDone,      color: "#2563EB" },
                  { label: "Remaining Calls", value: attRemainingCalls, color: "#D97706" },
                  { label: "Call Later",      value: attCallLaterCount, color: "#F97316" },
                ].map(c => (
                  <div key={c.label} className="rounded-xl p-2.5 text-center"
                    style={{ background: `${c.color}10`, border: `1.5px solid ${c.color}22` }}>
                    <div className="text-lg font-black leading-none" style={{ color: c.color }}>{c.value}</div>
                    <div className="text-[9px] font-bold mt-1 leading-tight" style={{ color: c.color }}>{c.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Progress bars ── */}
            {selectedClass && attTotalStudents > 0 && !attLoading && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span style={{ color: NAVY }}>Attendance Marked</span>
                    <span style={{ color: attPct >= 80 ? "#059669" : attPct >= 60 ? "#D97706" : "#DC2626" }}>
                      {attPct}% ({attMarkedCount}/{attTotalStudents})
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${attPct}%`, background: attPct >= 80 ? "#059669" : attPct >= 60 ? "#D97706" : "#DC2626" }} />
                  </div>
                </div>
                {attAbsentCount > 0 && (
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1">
                      <span style={{ color: NAVY }}>Absent Students Called</span>
                      <span style={{ color: callPct >= 80 ? "#059669" : callPct >= 60 ? "#D97706" : "#DC2626" }}>
                        {callPct}% ({attCallsDone}/{attAbsentCount})
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${callPct}%`, background: callPct >= 80 ? "#059669" : callPct >= 60 ? "#D97706" : "#DC2626" }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CLASS SECTIONS ── */}
            {attLoading && liveClasses.length === 0 ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
            ) : liveClasses.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No classes scheduled for this date.</div>
            ) : (
              <div className="space-y-8">

                {/* ══ LIVE NOW ══ */}
                {liveNowClasses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      <span className="text-xs font-black tracking-wide" style={{ color: "#059669" }}>LIVE NOW</span>
                    </div>
                    <div className="space-y-4">
                      {liveNowClasses.map(cls => {
                        const isSelected = selectedClassId === cls.id;
                        const hBadge = isSelected && attMarkedCount > 0
                          ? attPresentPct >= 80 ? { label: "Healthy", bg: "#DCFCE7", color: "#059669" }
                          : attPresentPct >= 60 ? { label: "Moderate", bg: "#FEF3C7", color: "#D97706" }
                          : { label: "At Risk", bg: "#FEE2E2", color: "#DC2626" }
                          : null;
                        const filtered = students.filter(s => {
                          if (attStatusFilter === "all") return true;
                          const st = attendanceMap[s.id]?.status ?? null;
                          if (attStatusFilter === "unmarked") return !st;
                          return st === attStatusFilter;
                        });
                        return (
                          <div key={cls.id}>
                            {/* Class card — green border */}
                            <div style={{ borderLeft: "4px solid #059669", border: "1.5px solid #059669", borderRadius: "16px", background: isSelected ? "#F0FDF4" : "white" }}>
                              <button className="w-full text-left p-4" onClick={() => setSelectedClassId(cls.id)}>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-black text-sm" style={{ color: NAVY }}>{cls.title}</div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500 mt-1">
                                      {cls.teacher && <span>👩‍🏫 {cls.teacher}</span>}
                                      <span>⏰ {fmtDateTime(cls.scheduledAt)}</span>
                                      <span>⏱ {cls.duration}min</span>
                                      <span>Grade {cls.grade}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                    {hBadge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: hBadge.bg, color: hBadge.color }}>{hBadge.label}</span>}
                                    {cls.joinUrl
                                      ? <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white"
                                          style={{ background: "#059669" }}>
                                          <ExternalLink className="w-2.5 h-2.5" /> Join Class
                                        </a>
                                      : <span className="text-[10px] text-gray-400 px-3 py-1.5 rounded-xl border border-gray-200">No link</span>
                                    }
                                  </div>
                                </div>
                                {/* Footer stats */}
                                {isSelected && attTotalStudents > 0 && (
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-green-100 text-[10px] font-semibold">
                                    <span style={{ color: "#059669" }}>✅ Present: {attPresentCount}</span>
                                    <span style={{ color: "#DC2626" }}>❌ Absent: {attAbsentCount}</span>
                                    <span style={{ color: "#F97316" }}>⏰ Call Later: {attCallLaterCount}</span>
                                    <span style={{ color: "#2563EB" }}>📞 Calls Done: {attCallsDone}</span>
                                    {attRemainingCalls > 0 && <span style={{ color: "#D97706" }}>⚠️ {attRemainingCalls} calls pending</span>}
                                  </div>
                                )}
                              </button>
                            </div>

                            {/* Student list (live + editable) */}
                            {isSelected && (
                              <div className="mt-3 ml-4 space-y-2">
                                {/* Status filter tabs */}
                                <div className="flex gap-1.5 flex-wrap">
                                  {([
                                    { key: "all",      label: "All",        count: students.length },
                                    { key: "present",  label: "Present",    count: attPresentCount },
                                    { key: "absent",   label: "Absent",     count: attAbsentCount },
                                    { key: "late",     label: "Late",       count: attLateCount },
                                    { key: "unmarked", label: "Not Marked", count: students.length - attMarkedCount },
                                  ] as const).map(f => (
                                    <button key={f.key} onClick={() => setAttStatusFilter(f.key)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border"
                                      style={{
                                        background: attStatusFilter === f.key
                                          ? f.key === "present" ? "#DCFCE7" : f.key === "absent" ? "#FEE2E2" : `${NAVY}10`
                                          : "white",
                                        color: attStatusFilter === f.key
                                          ? f.key === "present" ? "#059669" : f.key === "absent" ? "#DC2626" : NAVY
                                          : "#9CA3AF",
                                        borderColor: attStatusFilter === f.key
                                          ? f.key === "present" ? "#059669" : f.key === "absent" ? "#DC2626" : NAVY
                                          : "#E5E7EB",
                                      }}>
                                      {f.label} <span className="font-black">{f.count}</span>
                                    </button>
                                  ))}
                                </div>
                                {attLoading ? (
                                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
                                ) : filtered.length === 0 ? (
                                  <div className="text-center py-4 text-gray-400 text-xs">No students match this filter.</div>
                                ) : filtered.map(s => {
                                  const att = attendanceMap[s.id];
                                  const draft = callDrafts[s.id] ?? { callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" };
                                  const isExpanded = expandedCall === s.id;
                                  const isAbsent = att?.status === "absent";
                                  const badge = att?.status === "present"
                                    ? { emoji: "🟢", label: "Present", color: "#059669", bg: "#DCFCE7" }
                                    : att?.callStatus === "called"
                                    ? { emoji: "🔵", label: "Called", color: "#2563EB", bg: "#DBEAFE" }
                                    : att?.callStatus === "call_later"
                                    ? { emoji: "🟠", label: "Call Later", color: "#F97316", bg: "#FED7AA" }
                                    : att?.status === "absent"
                                    ? { emoji: "🔴", label: "Absent", color: "#DC2626", bg: "#FEE2E2" }
                                    : att?.status === "late"
                                    ? { emoji: "🟡", label: "Late", color: "#D97706", bg: "#FEF3C7" }
                                    : null;
                                  return (
                                    <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                          style={{ background: att?.status === "present" ? "#059669" : att?.status === "absent" ? "#DC2626" : att?.status === "late" ? "#D97706" : "#9CA3AF" }}>
                                          {s.name.charAt(0)}
                                        </div>
                                        <div className="w-28 sm:w-36 flex-shrink-0">
                                          <div className="font-semibold text-xs truncate" style={{ color: NAVY }}>{s.name}</div>
                                          <div className="text-[10px] text-gray-400">Gr.{s.grade}</div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-wrap flex-1">
                                          <button onClick={() => markAttendance(s.id, "present")}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                            style={{ background: att?.status === "present" ? "#DCFCE7" : "white", color: att?.status === "present" ? "#059669" : "#9CA3AF", borderColor: att?.status === "present" ? "#059669" : "#E5E7EB" }}>
                                            Present
                                          </button>
                                          <button onClick={() => markAttendance(s.id, "absent")}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                            style={{ background: att?.status === "absent" ? "#FEE2E2" : "white", color: att?.status === "absent" ? "#DC2626" : "#9CA3AF", borderColor: att?.status === "absent" ? "#DC2626" : "#E5E7EB" }}>
                                            Absent
                                          </button>
                                          <button
                                            onClick={() => isAbsent ? setExpandedCall(isExpanded ? null : s.id) : undefined}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                            style={{ background: att?.callStatus === "called" ? "#DBEAFE" : isAbsent ? "white" : "#F9FAFB", color: att?.callStatus === "called" ? "#2563EB" : isAbsent ? "#6366F1" : "#D1D5DB", borderColor: att?.callStatus === "called" ? "#6366F1" : isAbsent ? "#E0E7FF" : "#F3F4F6", cursor: isAbsent ? "pointer" : "default" }}>
                                            📞 Call
                                          </button>
                                          <button
                                            onClick={() => isAbsent ? markCallStatus(s.id, att?.callStatus === "call_later" ? "" : "call_later") : undefined}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                            style={{ background: att?.callStatus === "call_later" ? "#FED7AA" : isAbsent ? "white" : "#F9FAFB", color: att?.callStatus === "call_later" ? "#F97316" : isAbsent ? "#9CA3AF" : "#D1D5DB", borderColor: att?.callStatus === "call_later" ? "#FB923C" : isAbsent ? "#E5E7EB" : "#F3F4F6", cursor: isAbsent ? "pointer" : "default" }}>
                                            ⏰ Call Later
                                          </button>
                                        </div>
                                        {badge && (
                                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                                            style={{ background: badge.bg, color: badge.color }}>
                                            {badge.emoji} {badge.label}
                                          </span>
                                        )}
                                      </div>
                                      {isExpanded && (
                                        <div className="mt-3 ml-10">
                                          <CallDetailsForm callStatus={draft.callStatus} callTime={draft.callTime} calledBy={draft.calledBy} calledByName={draft.calledByName}
                                            onChange={(f, v) => updateDraft(s.id, f, v)} />
                                          <input value={draft.remark} onChange={e => updateDraft(s.id, "remark", e.target.value)} placeholder="Remark…"
                                            className="w-full mt-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                                          <button onClick={() => saveCallDetails(s.id)}
                                            className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GREEN }}>
                                            Save Call Details
                                          </button>
                                        </div>
                                      )}
                                      {!isExpanded && att && att.callStatus === "called" && (
                                        <div className="mt-2 ml-10 p-2 rounded-lg text-[10px]" style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
                                          <span className="text-indigo-700 font-semibold">📞 Called{att.callTime ? ` at ${att.callTime}` : ""}{att.calledByName ? `, by ${att.calledByName}` : ""}</span>
                                          {att.remark && <span className="text-indigo-600 ml-2">· {att.remark}</span>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══ UPCOMING ══ */}
                {upcomingClassesForDate.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-black tracking-wide text-indigo-600">UPCOMING</span>
                    </div>
                    <div className="space-y-4">
                      {upcomingClassesForDate.map(cls => {
                        const isSelected = selectedClassId === cls.id;
                        return (
                          <div key={cls.id}>
                            {/* Class card — blue border */}
                            <div style={{ borderLeft: "4px solid #6366F1", border: "1.5px solid #C7D2FE", borderRadius: "16px", background: isSelected ? "#EEF2FF" : "white" }}>
                              <button className="w-full text-left p-4" onClick={() => setSelectedClassId(cls.id)}>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-black text-sm" style={{ color: NAVY }}>{cls.title}</div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500 mt-1">
                                      {cls.teacher && <span>👩‍🏫 {cls.teacher}</span>}
                                      <span>⏰ {fmtDateTime(cls.scheduledAt)}</span>
                                      <span>⏱ {cls.duration}min</span>
                                      <span>Grade {cls.grade}</span>
                                    </div>
                                  </div>
                                  <button disabled className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200 flex-shrink-0">
                                    <ExternalLink className="w-2.5 h-2.5" /> Available at class start
                                  </button>
                                </div>
                                <div className="mt-2 pt-2 border-t border-indigo-100 text-[10px] text-indigo-500 font-semibold">
                                  🔒 Attendance marking will be enabled once the class goes live
                                </div>
                              </button>
                            </div>
                            {/* Student list (locked) */}
                            {isSelected && students.length > 0 && (
                              <div className="mt-3 ml-4 space-y-2">
                                {students.map(s => (
                                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: "#C7D2FE" }}>
                                      {s.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-xs truncate" style={{ color: NAVY }}>{s.name}</div>
                                      <div className="text-[10px] text-gray-400">Gr.{s.grade}</div>
                                    </div>
                                    <span className="text-[10px] text-gray-400 border border-gray-200 rounded-lg px-2.5 py-1 flex-shrink-0">🔒 Locked</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ══ COMPLETED ══ */}
                {completedClassesForDate.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {canEditCompleted
                        ? <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F97316" }} />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      }
                      <span className="text-xs font-black tracking-wide" style={{ color: canEditCompleted ? "#F97316" : "#6B7280" }}>
                        {canEditCompleted ? "COMPLETED — CALL WINDOW OPEN" : "COMPLETED"}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {completedClassesForDate.map(cls => {
                        const isSelected = selectedClassId === cls.id;
                        const hBadge = isSelected && attMarkedCount > 0
                          ? attPresentPct >= 80 ? { label: "Healthy", bg: "#DCFCE7", color: "#059669" }
                          : attPresentPct >= 60 ? { label: "Moderate", bg: "#FEF3C7", color: "#D97706" }
                          : { label: "At Risk", bg: "#FEE2E2", color: "#DC2626" }
                          : null;
                        const borderL = canEditCompleted ? "#FB923C" : "#9CA3AF";
                        const borderFull = canEditCompleted ? "#FED7AA" : "#E5E7EB";
                        const bgSelected = canEditCompleted ? "#FFF7ED" : "#F9FAFB";
                        const filtered = students.filter(s => {
                          if (attStatusFilter === "all") return true;
                          const st = attendanceMap[s.id]?.status ?? null;
                          if (attStatusFilter === "unmarked") return !st;
                          return st === attStatusFilter;
                        });
                        return (
                          <div key={cls.id}>
                            {/* Class card */}
                            <div style={{ borderLeft: `4px solid ${borderL}`, border: `1.5px solid ${borderFull}`, borderRadius: "16px", background: isSelected ? bgSelected : "white" }}>
                              <button className="w-full text-left p-4" onClick={() => setSelectedClassId(cls.id)}>
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-black text-sm" style={{ color: canEditCompleted ? NAVY : "#4B5563" }}>{cls.title}</div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400 mt-1">
                                      {cls.teacher && <span>👩‍🏫 {cls.teacher}</span>}
                                      <span>⏰ {fmtDateTime(cls.scheduledAt)}</span>
                                      <span>⏱ {cls.duration}min</span>
                                      <span>Grade {cls.grade}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                    {hBadge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: hBadge.bg, color: hBadge.color }}>{hBadge.label}</span>}
                                    {canEditCompleted
                                      ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "#FED7AA", color: "#EA580C" }}>📞 Call window</span>
                                      : <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">✅ Completed</span>
                                    }
                                  </div>
                                </div>
                                {/* Call-window notice */}
                                {canEditCompleted && (
                                  <div className="mt-2 pt-2 border-t text-[10px] font-semibold" style={{ borderColor: "#FED7AA", color: "#EA580C" }}>
                                    📞 Call absent students and update attendance — window closes at midnight
                                  </div>
                                )}
                                {/* Summary footer */}
                                {isSelected && (
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 text-[10px] font-semibold" style={{ borderTop: `1px solid ${canEditCompleted ? "#FED7AA" : "#F3F4F6"}` }}>
                                    <span style={{ color: "#059669" }}>✅ Present: {attPresentCount}</span>
                                    <span style={{ color: "#DC2626" }}>❌ Absent: {attAbsentCount}</span>
                                    <span style={{ color: "#F97316" }}>⏰ Call Later: {attCallLaterCount}</span>
                                    <span style={{ color: "#2563EB" }}>📞 Calls Done: {attCallsDone}</span>
                                    {canEditCompleted && attRemainingCalls > 0 && <span style={{ color: "#D97706" }}>⚠️ {attRemainingCalls} calls pending</span>}
                                  </div>
                                )}
                              </button>
                            </div>
                            {/* Student list */}
                            {isSelected && (
                              <div className="mt-3 ml-4 space-y-2">
                                {/* Filter tabs */}
                                <div className="flex gap-1.5 flex-wrap">
                                  {([
                                    { key: "all",      label: "All",        count: students.length },
                                    { key: "present",  label: "Present",    count: attPresentCount },
                                    { key: "absent",   label: "Absent",     count: attAbsentCount },
                                    { key: "unmarked", label: "Not Marked", count: students.length - attMarkedCount },
                                  ] as const).map(f => (
                                    <button key={f.key} onClick={() => setAttStatusFilter(f.key)}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border"
                                      style={{ background: attStatusFilter === f.key ? `${NAVY}10` : "white", color: attStatusFilter === f.key ? NAVY : "#9CA3AF", borderColor: attStatusFilter === f.key ? NAVY : "#E5E7EB" }}>
                                      {f.label} <span className="font-black">{f.count}</span>
                                    </button>
                                  ))}
                                </div>
                                {attLoading ? (
                                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
                                ) : filtered.map(s => {
                                  const att = attendanceMap[s.id];
                                  const badge = att?.status === "present"
                                    ? { emoji: "🟢", label: "Present", color: "#059669", bg: "#DCFCE7" }
                                    : att?.callStatus === "called"
                                    ? { emoji: "🔵", label: "Called", color: "#2563EB", bg: "#DBEAFE" }
                                    : att?.callStatus === "call_later"
                                    ? { emoji: "🟠", label: "Call Later", color: "#F97316", bg: "#FED7AA" }
                                    : att?.status === "absent"
                                    ? { emoji: "🔴", label: "Absent", color: "#DC2626", bg: "#FEE2E2" }
                                    : att?.status === "late"
                                    ? { emoji: "🟡", label: "Late", color: "#D97706", bg: "#FEF3C7" }
                                    : null;

                                  /* ── EDITABLE row (today or yesterday) ── */
                                  if (canEditCompleted) {
                                    const draft = callDrafts[s.id] ?? { callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" };
                                    const isExpanded = expandedCall === s.id;
                                    const isAbsent = att?.status === "absent";
                                    return (
                                      <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                            style={{ background: att?.status === "present" ? "#059669" : att?.status === "absent" ? "#DC2626" : att?.status === "late" ? "#D97706" : "#9CA3AF" }}>
                                            {s.name.charAt(0)}
                                          </div>
                                          <div className="w-28 sm:w-36 flex-shrink-0">
                                            <div className="font-semibold text-xs truncate" style={{ color: NAVY }}>{s.name}</div>
                                            <div className="text-[10px] text-gray-400">Gr.{s.grade}</div>
                                          </div>
                                          <div className="flex items-center gap-1 flex-wrap flex-1">
                                            <button onClick={() => markAttendance(s.id, "present")}
                                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                              style={{ background: att?.status === "present" ? "#DCFCE7" : "white", color: att?.status === "present" ? "#059669" : "#9CA3AF", borderColor: att?.status === "present" ? "#059669" : "#E5E7EB" }}>
                                              Present
                                            </button>
                                            <button onClick={() => markAttendance(s.id, "absent")}
                                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                              style={{ background: att?.status === "absent" ? "#FEE2E2" : "white", color: att?.status === "absent" ? "#DC2626" : "#9CA3AF", borderColor: att?.status === "absent" ? "#DC2626" : "#E5E7EB" }}>
                                              Absent
                                            </button>
                                            <button
                                              onClick={() => isAbsent ? setExpandedCall(isExpanded ? null : s.id) : undefined}
                                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                              style={{ background: att?.callStatus === "called" ? "#DBEAFE" : isAbsent ? "white" : "#F9FAFB", color: att?.callStatus === "called" ? "#2563EB" : isAbsent ? "#6366F1" : "#D1D5DB", borderColor: att?.callStatus === "called" ? "#6366F1" : isAbsent ? "#E0E7FF" : "#F3F4F6", cursor: isAbsent ? "pointer" : "default" }}>
                                              📞 Call
                                            </button>
                                            <button
                                              onClick={() => isAbsent ? markCallStatus(s.id, att?.callStatus === "call_later" ? "" : "call_later") : undefined}
                                              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border"
                                              style={{ background: att?.callStatus === "call_later" ? "#FED7AA" : isAbsent ? "white" : "#F9FAFB", color: att?.callStatus === "call_later" ? "#F97316" : isAbsent ? "#9CA3AF" : "#D1D5DB", borderColor: att?.callStatus === "call_later" ? "#FB923C" : isAbsent ? "#E5E7EB" : "#F3F4F6", cursor: isAbsent ? "pointer" : "default" }}>
                                              ⏰ Call Later
                                            </button>
                                          </div>
                                          {badge && (
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                                              style={{ background: badge.bg, color: badge.color }}>
                                              {badge.emoji} {badge.label}
                                            </span>
                                          )}
                                        </div>
                                        {isExpanded && (
                                          <div className="mt-3 ml-10">
                                            <CallDetailsForm callStatus={draft.callStatus} callTime={draft.callTime} calledBy={draft.calledBy} calledByName={draft.calledByName}
                                              onChange={(f, v) => updateDraft(s.id, f, v)} />
                                            <input value={draft.remark} onChange={e => updateDraft(s.id, "remark", e.target.value)} placeholder="Remark…"
                                              className="w-full mt-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                                            <button onClick={() => saveCallDetails(s.id)}
                                              className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GREEN }}>
                                              Save Call Details
                                            </button>
                                          </div>
                                        )}
                                        {!isExpanded && att && att.callStatus === "called" && (
                                          <div className="mt-2 ml-10 p-2 rounded-lg text-[10px]" style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}>
                                            <span className="text-indigo-700 font-semibold">📞 Called{att.callTime ? ` at ${att.callTime}` : ""}{att.calledByName ? `, by ${att.calledByName}` : ""}</span>
                                            {att.remark && <span className="text-indigo-600 ml-2">· {att.remark}</span>}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  /* ── READ-ONLY row (2+ days old) ── */
                                  return (
                                    <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                          style={{ background: att?.status === "present" ? "#059669" : att?.status === "absent" ? "#DC2626" : "#9CA3AF" }}>
                                          {s.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-xs truncate" style={{ color: "#4B5563" }}>{s.name}</div>
                                          <div className="text-[10px] text-gray-400">Gr.{s.grade}</div>
                                        </div>
                                        {badge
                                          ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: badge.bg, color: badge.color }}>{badge.emoji} {badge.label}</span>
                                          : <span className="text-[10px] text-gray-300 font-semibold flex-shrink-0">Not marked</span>
                                        }
                                      </div>
                                      {att && (att.callStatus || att.remark) && (
                                        <div className="mt-2 ml-11 p-2 rounded-lg text-[10px] space-y-0.5" style={{ background: "#F3F4F6" }}>
                                          {att.callStatus && <div className="text-gray-500"><span className="font-bold text-gray-700">Call:</span> {att.callStatus}{att.callTime ? ` at ${att.callTime}` : ""}{att.calledByName ? `, by ${att.calledByName}` : ""}</div>}
                                          {att.remark && <div className="text-gray-500"><span className="font-bold text-gray-700">Note:</span> {att.remark}</div>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* ════ FOLLOW-UPS ════ */}
        {tab === "follow-ups" && (
          <div className="p-4 max-w-5xl mx-auto space-y-4">
            <h1 className="text-lg font-black" style={{ color: NAVY }}>Follow-Ups</h1>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-black text-sm mb-3" style={{ color: NAVY }}>Add Follow-Up</h3>
                <form onSubmit={addFollowUp} className="space-y-3">
                  <select value={fuStudentId} onChange={e => setFuStudentId(Number(e.target.value) || "")} required
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                    <option value="">Select student…</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} (Gr.{s.grade})</option>)}
                  </select>
                  <select value={fuNoteType} onChange={e => setFuNoteType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                    {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} required rows={2}
                    placeholder="Note / observation…"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none resize-none" />
                  <CallDetailsForm callStatus={fuCallStatus} callTime={fuCallTime} calledBy={fuCalledBy} calledByName={fuCalledByName}
                    onChange={(f, v) => { if (f === "callStatus") setFuCallStatus(v); else if (f === "callTime") setFuCallTime(v); else if (f === "calledBy") setFuCalledBy(v); else setFuCalledByName(v); }} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Next Follow-Up Date</label>
                      <input type="date" value={fuNextDate} onChange={e => setFuNextDate(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Lead Status</label>
                      <select value={fuLeadStatus} onChange={e => setFuLeadStatus(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                        <option value="">—</option>
                        {["low", "moderate", "high"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={fuLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, ${GREEN}, #047857)` }}>
                    {fuLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Follow-Up
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: "all", label: "All", count: followUps.length },
                    { key: "due_today", label: "Due Today", count: fuCounts.due_today },
                    { key: "overdue", label: "Overdue", count: fuCounts.overdue },
                    { key: "upcoming", label: "Upcoming", count: fuCounts.upcoming },
                    { key: "completed", label: "Completed", count: fuCounts.completed },
                  ] as const).map(f => (
                    <button key={f.key} onClick={() => setFuFilter(f.key)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all border"
                      style={{ background: fuFilter === f.key ? `${NAVY}10` : "white", color: fuFilter === f.key ? NAVY : "#9CA3AF", borderColor: fuFilter === f.key ? NAVY : "#E5E7EB" }}>
                      {f.label} {f.count > 0 && <span className="font-black">{f.count}</span>}
                    </button>
                  ))}
                </div>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                  {filteredFollowUps.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 bg-white rounded-xl border border-gray-100">No follow-ups in this category</div>
                  ) : filteredFollowUps.map(fu => (
                    <div key={fu.id} className={`bg-white rounded-xl border p-3 ${fu.fuStatus === "overdue" ? "border-red-100" : fu.fuStatus === "due_today" ? "border-orange-100" : "border-gray-100"}`}>
                      {/* Mentor avatar row */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                          style={{ background: student.avatarUrl ? "transparent" : GREEN }}>
                          {student.avatarUrl
                            ? <img src={student.avatarUrl} alt={student.name} className="w-full h-full object-cover" />
                            : (student.name?.[0] ?? "M")}
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500">{student.name}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{fu.createdAt ? new Date(fu.createdAt).toLocaleDateString("en-IN") : ""}</span>
                      </div>

                      {editingFollowUpId === fu.id ? (
                        /* ── Inline edit form ── */
                        <div className="space-y-2">
                          <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: NAVY }}>
                            <Edit2 className="w-3 h-3" /> Edit Follow-Up
                          </div>
                          <select value={editDraft.noteType ?? fu.noteType}
                            onChange={e => setEditDraft(d => ({ ...d, noteType: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                            {INTERACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <textarea value={editDraft.note ?? ""}
                            onChange={e => setEditDraft(d => ({ ...d, note: e.target.value }))} rows={2}
                            placeholder="Note…"
                            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none resize-none" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-0.5">Call Status</label>
                              <select value={editDraft.callStatus ?? ""}
                                onChange={e => setEditDraft(d => ({ ...d, callStatus: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                                <option value="">— no call —</option>
                                {["answered", "not_answered", "callback_requested", "completed"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 block mb-0.5">Lead Status</label>
                              <select value={editDraft.leadStatus ?? ""}
                                onChange={e => setEditDraft(d => ({ ...d, leadStatus: e.target.value }))}
                                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none bg-white">
                                <option value="">— unchanged —</option>
                                {SUCCESS_STAGES.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">Next Follow-Up Date</label>
                            <input type="date" value={editDraft.nextFollowUpDate ?? ""}
                              onChange={e => setEditDraft(d => ({ ...d, nextFollowUpDate: e.target.value }))}
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 block mb-0.5">Reason for edit <span className="text-red-500">*</span></label>
                            <input value={editDraft.editRemark ?? ""}
                              onChange={e => { setEditDraft(d => ({ ...d, editRemark: e.target.value })); setEditError(""); }}
                              placeholder="Why are you editing this? (required)"
                              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
                          </div>
                          {editError && <p className="text-[10px] text-red-600">{editError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => saveEditFollowUp(fu.id)} disabled={editLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                              style={{ background: NAVY }}>
                              {editLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save Changes
                            </button>
                            <button onClick={cancelEditFollowUp} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Normal view ── */
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <button
                                className="font-bold text-xs hover:underline text-left"
                                style={{ color: NAVY }}
                                onClick={() => open360ById(fu.studentId, fu.studentName)}
                              >
                                {fu.studentName ?? `Student #${fu.studentId}`}
                              </button>
                              <FuStatusBadge status={fu.fuStatus ?? "upcoming"} daysOverdue={fu.daysOverdue ?? 0} />
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{fu.noteType}</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{fu.note}</p>
                            {fu.nextFollowUpDate && <p className="text-[10px] text-orange-600 mt-1">📅 {fmtDate(fu.nextFollowUpDate)}</p>}
                            <p className="text-[10px] text-gray-400 mt-0.5">{fmtDateTime(fu.createdAt)}</p>
                          </div>
                          <div className="flex-shrink-0 flex gap-1">
                            <button onClick={() => startEditFollowUp(fu)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Edit follow-up">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {fu.fuStatus !== "completed" && (
                              <button onClick={() => startComplete(fu.id)}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-all" title="Mark completed">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {completingId === fu.id && editingFollowUpId !== fu.id && (
                        <div className="mt-2 p-3 rounded-xl border border-green-200 bg-green-50/50 space-y-2">
                          <div className="text-[10px] font-bold text-green-700">Enter completion remark (required)</div>
                          <textarea value={completeRemark} onChange={e => { setCompleteRemark(e.target.value); setCompleteError(""); }} rows={2}
                            placeholder="What was the outcome of this follow-up? (required)"
                            className="w-full px-2 py-1.5 rounded-lg border border-green-200 text-xs outline-none resize-none bg-white focus:border-green-400" />
                          {completeError && <p className="text-[10px] text-red-600">{completeError}</p>}
                          <div className="flex items-center gap-2">
                            <button onClick={() => submitComplete(fu.id)} disabled={completeLoading}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                              style={{ background: GREEN }}>
                              {completeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Confirm
                            </button>
                            <button onClick={cancelComplete} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}

                      {/* Edit history */}
                      <div className="mt-2 pt-2 border-t border-gray-50">
                        <button onClick={() => toggleEditHistory(fu.id)}
                          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                          <History className="w-3 h-3" />
                          Edit History
                          {loadingHistoryId === fu.id && <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5" />}
                          {expandedHistoryId !== fu.id && editHistories[fu.id]?.length > 0 && (
                            <span className="ml-1 px-1 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">{editHistories[fu.id].length}</span>
                          )}
                        </button>
                        {expandedHistoryId === fu.id && (
                          <div className="mt-1.5 space-y-1.5">
                            {!editHistories[fu.id] || editHistories[fu.id].length === 0 ? (
                              <p className="text-[10px] text-gray-400 pl-1">No edits recorded yet.</p>
                            ) : editHistories[fu.id].map(edit => (
                              <div key={edit.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold" style={{ color: NAVY }}>{edit.editedByName}</span>
                                  <span className="text-[10px] text-gray-400">{fmtDateTime(edit.editedAt)}</span>
                                </div>
                                <p className="text-[10px] text-blue-700 mt-0.5">Reason: {edit.editRemark}</p>
                                {edit.previousNote && (
                                  <p className="text-[10px] text-gray-400 mt-0.5 italic">Previous note: "{edit.previousNote}"</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ TASKS ════ */}
        {tab === "tasks" && (
          <div className="p-4 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-black" style={{ color: NAVY }}>Tasks</h1>
                <p className="text-xs text-gray-400">{taskPending} pending · {taskOverdue} overdue</p>
              </div>
              <button onClick={() => setShowTaskForm(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: GREEN }}>
                <Plus className="w-3.5 h-3.5" /> New Task
              </button>
            </div>

            {showTaskForm && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="font-black text-sm mb-3" style={{ color: NAVY }}>Create Task</h3>
                <form onSubmit={addTask} className="space-y-3">
                  <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required placeholder="Task title…"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={taskType} onChange={e => setTaskType(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                      {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select value={taskStudentId} onChange={e => setTaskStudentId(Number(e.target.value) || "")}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                      <option value="">No student (general)</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} (Gr.{s.grade})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Due Date</label>
                      <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Note (optional)</label>
                      <input value={taskNote} onChange={e => setTaskNote(e.target.value)} placeholder="Additional context…"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={taskLoading}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: GREEN }}>
                      {taskLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create Task
                    </button>
                    <button type="button" onClick={() => setShowTaskForm(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 border border-gray-200">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {(["overdue", "pending", "in_progress", "completed"] as const).map(group => {
              const groupTasks = tasks.filter(t => t.effectiveStatus === group);
              if (groupTasks.length === 0) return null;
              const groupLabel = { overdue: "Overdue", pending: "Pending", in_progress: "In Progress", completed: "Completed" }[group];
              return (
                <div key={group}>
                  <div className="text-[10px] font-black text-gray-400 uppercase mb-2">{groupLabel} ({groupTasks.length})</div>
                  <div className="space-y-2">
                    {groupTasks.map(t => (
                      <div key={t.id} className={`bg-white rounded-xl border p-3 ${t.effectiveStatus === "overdue" ? "border-red-100" : "border-gray-100"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-xs" style={{ color: NAVY }}>{t.title}</span>
                              <TaskStatusBadge status={t.effectiveStatus} />
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{t.taskType}</span>
                            </div>
                            {t.studentName && <div className="text-[10px] text-blue-600">👤 {t.studentName}</div>}
                            {t.note && <p className="text-[10px] text-gray-500 mt-0.5">{t.note}</p>}
                            {t.dueDate && <p className="text-[10px] text-gray-400 mt-0.5">Due: {fmtDate(t.dueDate)}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {t.effectiveStatus !== "completed" && (
                              <>
                                {t.effectiveStatus === "pending" && (
                                  <button onClick={() => updateTaskStatus(t.id, "in_progress")}
                                    className="text-[10px] font-bold px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50">Start</button>
                                )}
                                <button onClick={() => updateTaskStatus(t.id, "completed")}
                                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-all" title="Mark done">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button onClick={() => deleteTask(t.id)}
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No tasks yet</p>
                <p className="text-xs mt-1">Create your first task to stay organized</p>
              </div>
            )}
          </div>
        )}

        {/* ════ REMINDER SETTINGS ════ */}
        {tab === "settings" && (
          <div className="p-5 max-w-xl mx-auto space-y-5">
            <div>
              <h1 className="text-xl font-black" style={{ color: NAVY }}>SMS Reminder Settings</h1>
              <p className="text-xs text-gray-500 mt-0.5">Configure when and how you receive overdue follow-up reminders via SMS</p>
            </div>

            {!reminderPrefs ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
            ) : (
              <div className="space-y-4">
                {/* Enable / disable */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm" style={{ color: NAVY }}>SMS Reminders</div>
                      <p className="text-xs text-gray-500 mt-0.5">Receive an SMS when follow-ups go overdue</p>
                    </div>
                    <button
                      onClick={() => setReminderPrefs(p => p ? { ...p, remindersEnabled: !p.remindersEnabled } : p)}
                      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                      style={{ background: reminderPrefs.remindersEnabled ? GREEN : "#D1D5DB" }}>
                      <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: reminderPrefs.remindersEnabled ? "translateX(20px)" : "translateX(0)" }} />
                    </button>
                  </div>
                </div>

                {reminderPrefs.remindersEnabled && (
                  <>
                    {/* Digest vs instant */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                      <div className="font-bold text-sm" style={{ color: NAVY }}>Reminder Mode</div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setReminderPrefs(p => p ? { ...p, digestMode: true } : p)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-left"
                          style={{ borderColor: reminderPrefs.digestMode ? GREEN : "#E5E7EB", background: reminderPrefs.digestMode ? `${GREEN}10` : "white" }}>
                          <Bell className="w-5 h-5" style={{ color: reminderPrefs.digestMode ? GREEN : "#9CA3AF" }} />
                          <div className="font-bold text-xs" style={{ color: reminderPrefs.digestMode ? GREEN : NAVY }}>Daily Digest</div>
                          <p className="text-[10px] text-gray-500 text-center">One SMS per day listing all overdue follow-ups</p>
                        </button>
                        <button
                          onClick={() => setReminderPrefs(p => p ? { ...p, digestMode: false } : p)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-left"
                          style={{ borderColor: !reminderPrefs.digestMode ? ORANGE : "#E5E7EB", background: !reminderPrefs.digestMode ? `${ORANGE}10` : "white" }}>
                          <Phone className="w-5 h-5" style={{ color: !reminderPrefs.digestMode ? ORANGE : "#9CA3AF" }} />
                          <div className="font-bold text-xs" style={{ color: !reminderPrefs.digestMode ? ORANGE : NAVY }}>Instant</div>
                          <p className="text-[10px] text-gray-500 text-center">One SMS per overdue follow-up</p>
                        </button>
                      </div>
                    </div>

                    {/* Digest time */}
                    {reminderPrefs.digestMode && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                        <div className="font-bold text-sm" style={{ color: NAVY }}>Preferred Send Time</div>
                        <p className="text-xs text-gray-500">The daily digest will be sent within 30 minutes of this time (IST)</p>
                        <input
                          type="time"
                          value={reminderPrefs.digestTime}
                          onChange={e => setReminderPrefs(p => p ? { ...p, digestTime: e.target.value } : p)}
                          className="mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none font-semibold"
                          style={{ color: NAVY }} />
                      </div>
                    )}

                    {/* Phone number note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <Phone className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        SMS reminders are sent to the phone number registered on your mentor account.
                        Contact your admin if you need to update it.
                      </p>
                    </div>
                  </>
                )}

                {/* Save */}
                <button
                  onClick={saveReminderPrefs}
                  disabled={reminderSaving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: reminderSaving ? "#9CA3AF" : GREEN }}>
                  {reminderSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {reminderSaving ? "Saving…" : reminderSaved ? "Saved!" : "Save Preferences"}
                </button>

                {reminderSaved && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs font-semibold text-green-700">Preferences saved. Reminders will apply from the next scheduled check.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ MY PROFILE ════ */}
        {tab === "profile" && (
          <div className="p-5 space-y-3">
            <h1 className="text-xl font-black" style={{ color: NAVY }}>My Profile</h1>
            <StaffProfileTab
              user={{
                id: student.id,
                name: student.name ?? "",
                email: student.email ?? null,
                phone: student.phone ?? null,
                role: role ?? "mentor",
                avatarUrl: student.avatarUrl,
                school: student.school,
              }}
              apiFetch={apiFetch}
            />
          </div>
        )}

        {/* ════ TODAY'S TASKS ════ */}
        {tab === "today-tasks" && (
          <TodayTasksTab
            apiFetch={apiFetch}
            onFollowUpStudent={(sid) => { setFuStudentId(sid); setTab("follow-ups"); }}
          />
        )}

        {/* ════ LIVE CLASSES (OBSERVER) ════ */}
        {tab === "live-classes" && (
          <LiveClassesObserverTab apiFetch={apiFetch} />
        )}

        {/* ════ DOUBT SESSIONS ════ */}
        {tab === "doubt-sessions" && (
          <DoubtSessionsTab
            apiFetch={apiFetch}
            students={students.map(s => ({ id: s.id, name: s.name, grade: s.grade }))}
          />
        )}

        {/* ════ EOD REPORT ════ */}
        {tab === "eod-report" && (
          <EodReportTab apiFetch={apiFetch} />
        )}

        {/* ════ TODAY'S CALLING QUEUE (Sales SSM) ════ */}
        {tab === "calling-queue" && (
          <SalesCallingQueueTab
            onOpenStudent={(id, name) => open360ById(id, name)}
          />
        )}

        {/* ════ ASSIGNED LEADS (Sales SSM) ════ */}
        {tab === "assigned-leads" && (
          <AssignedLeadsTab
            onOpenStudent={(id, name) => open360ById(id, name)}
          />
        )}

        {/* ════ NON-ACTIVE LEADS (Sales SSM — Day 3+, no engagement) ════ */}
        {tab === "non-active" && (
          <NonActiveLeadsTab
            onOpenStudent={(id, name) => open360ById(id, name)}
          />
        )}

        {/* ════ CONVERTED STUDENTS (Sales SSM) ════ */}
        {tab === "converted-students" && (
          <ConvertedStudentsTab
            onOpenStudent={(id, name) => open360ById(id, name)}
          />
        )}

        {/* ════ LEADERBOARD ════ */}
        {tab === "leaderboard" && isSales && (
          <GradeLeaderboardTab myId={student.id} />
        )}
      </div>
      </div>
    </div>
  );
}
