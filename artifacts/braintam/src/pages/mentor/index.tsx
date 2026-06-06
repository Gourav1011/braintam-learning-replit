import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import {
  Users, MessageSquare, Bell, LogOut, Home, Search, AlertTriangle,
  CheckCircle2, Phone, BookOpen, Trophy, Plus, Trash2, RefreshCw,
  Calendar, ChevronDown, ChevronUp, X, Loader2, Clock, ClipboardList,
  PhoneCall, PhoneOff, PhoneMissed, PhoneIncoming, UserCheck,
  TrendingUp, TrendingDown, Activity, GraduationCap,
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

type Tab = "dashboard" | "attendance" | "students" | "follow-ups" | "alerts";

interface Student {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; lastLoginDate: string | null;
  isActive: boolean; hwCompletion: number; hwTotal: number; hwPending: number;
  testCount: number; healthScore: number; riskLevel: "excellent" | "good" | "attention" | "at-risk";
  daysSinceLogin: number; assignedAt: string;
}

interface FollowUp {
  id: number; studentId: number; studentName: string | null;
  noteType: string; note: string; callStatus: string | null; callTime: string | null;
  calledBy: string | null; calledByName: string | null; leadStatus: string | null;
  nextFollowUpDate: string | null; createdAt: string;
}

interface AttendanceRecord {
  id: number; studentId: number; studentName: string | null;
  status: string; callStatus: string | null; callTime: string | null;
  calledBy: string | null; calledByName: string | null; remark: string | null;
  liveClassId: number | null; attendanceDate: string;
}

interface LiveClass {
  id: number; title: string; grade: number; teacher: string;
  scheduledAt: string; duration: number; status: string;
}

interface DashboardData {
  totalAssigned: number; activeToday: number; needsAttention: number;
  atRisk: number; green: number; notActive3Days: number; notActive7Days: number;
  homeworkPending: number;
  followUpReminders: { id: number; studentId: number; studentName: string | null; nextFollowUpDate: string | null; note: string; leadStatus: string | null }[];
  recentFollowUps: FollowUp[];
}

const CALL_STATUS_OPTIONS = [
  { value: "called", label: "Called", icon: PhoneCall, color: GREEN },
  { value: "not_reachable", label: "Not Reachable", icon: PhoneOff, color: "#DC2626" },
  { value: "dnp", label: "DNP", icon: PhoneMissed, color: "#D97706" },
  { value: "busy", label: "Busy", icon: PhoneIncoming, color: "#6366F1" },
];

const CALLED_BY_OPTIONS = ["Father", "Mother", "Brother", "Sister", "Student", "Other"];
const LEAD_STATUS_OPTIONS = [
  { value: "low", label: "Low", color: "#6B7280" },
  { value: "moderate", label: "Moderate", color: "#D97706" },
  { value: "high", label: "High", color: "#DC2626" },
];

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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: healthBg(level), color: healthColor(level) }}>{score}%</span>
  );
}
function LeadBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const opt = LEAD_STATUS_OPTIONS.find(o => o.value === status);
  if (!opt) return null;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${opt.color}18`, color: opt.color }}>{opt.label}</span>;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }

// ── Call Details Inline Form ────────────────────────────────────────────
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
              placeholder="Call time" className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
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

// ── Main Component ──────────────────────────────────────────────────────
export default function MentorPage() {
  const { student, role, isLoading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  // Data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  // Attendance
  const [attDate, setAttDate] = useState(todayStr());
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, AttendanceRecord>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [expandedCall, setExpandedCall] = useState<number | null>(null);
  const [callDrafts, setCallDrafts] = useState<Record<number, { callStatus: string; callTime: string; calledBy: string; calledByName: string; remark: string }>>({});

  // Students
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetail, setStudentDetail] = useState<{ hwSubs: unknown[]; testSubs: unknown[]; followUps: FollowUp[]; attendance: { attendanceDate: string; status: string; remark: string | null }[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
  const [fuSearch, setFuSearch] = useState("");

  const fetchDashboard = useCallback(async () => {
    const r = await apiFetch("/mentor/dashboard");
    if (r.ok) setDashboard(await r.json());
  }, []);

  const fetchStudents = useCallback(async () => {
    const r = await apiFetch("/mentor/students?limit=200");
    if (r.ok) { const d = await r.json(); setStudents(d.students ?? []); }
  }, []);

  const fetchFollowUps = useCallback(async () => {
    const r = await apiFetch("/mentor/follow-ups");
    if (r.ok) setFollowUps(await r.json());
  }, []);

  const fetchLiveClasses = useCallback(async (date: string) => {
    const r = await apiFetch(`/mentor/live-classes?date=${date}`);
    if (r.ok) { const cls = await r.json(); setLiveClasses(cls); if (cls.length > 0) setSelectedClassId(cls[0].id); else setSelectedClassId(null); }
  }, []);

  const fetchAttendance = useCallback(async (date: string, classId: number | null) => {
    setAttLoading(true);
    const qs = classId ? `?date=${date}&liveClassId=${classId}` : `?date=${date}`;
    const r = await apiFetch(`/mentor/attendance${qs}`);
    if (r.ok) {
      const rows: AttendanceRecord[] = await r.json();
      setAttendanceMap(Object.fromEntries(rows.map(r => [r.studentId, r])));
    }
    setAttLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && (role === "mentor" || role === "admin")) {
      fetchDashboard(); fetchStudents(); fetchFollowUps();
    }
  }, [isLoading, role]);

  useEffect(() => {
    if (tab === "attendance") { fetchLiveClasses(attDate); }
  }, [tab, attDate]);

  useEffect(() => {
    if (tab === "attendance") { fetchAttendance(attDate, selectedClassId); }
  }, [tab, attDate, selectedClassId]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} /></div>;
  if (!student || (role !== "mentor" && role !== "admin")) return <Redirect to="/mentor/login" />;

  const filteredStudents = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    String(s.grade).includes(search) || (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const atRiskStudents = students.filter(s => s.riskLevel === "at-risk");
  const attentionStudents = students.filter(s => s.riskLevel === "attention");
  const goodStudents = students.filter(s => s.riskLevel === "good" || s.riskLevel === "excellent");

  // ── Attendance helpers ──
  async function markAttendance(studentId: number, status: string) {
    const draft = callDrafts[studentId] ?? { callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" };
    await apiFetch("/mentor/attendance", {
      method: "POST",
      body: JSON.stringify({
        studentId, attendanceDate: attDate, status,
        liveClassId: selectedClassId,
        callStatus: draft.callStatus || null,
        callTime: draft.callTime || null,
        calledBy: draft.calledBy || null,
        calledByName: draft.calledByName || null,
        remark: draft.remark || null,
      }),
    });
    await fetchAttendance(attDate, selectedClassId);
  }

  async function saveCallDetails(studentId: number) {
    const draft = callDrafts[studentId] ?? { callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" };
    const current = attendanceMap[studentId];
    if (!current) return;
    await apiFetch("/mentor/attendance", {
      method: "POST",
      body: JSON.stringify({
        studentId, attendanceDate: attDate, liveClassId: selectedClassId,
        status: current.status,
        callStatus: draft.callStatus || null,
        callTime: draft.callTime || null,
        calledBy: draft.calledBy || null,
        calledByName: draft.calledByName || null,
        remark: draft.remark || null,
      }),
    });
    await fetchAttendance(attDate, selectedClassId);
    setExpandedCall(null);
  }

  function updateDraft(studentId: number, field: string, val: string) {
    setCallDrafts(prev => ({ ...prev, [studentId]: { ...{ callStatus: "", callTime: "", calledBy: "", calledByName: "", remark: "" }, ...prev[studentId], [field]: val } }));
  }

  // ── Student detail ──
  async function openStudentDetail(s: Student) {
    setSelectedStudent(s);
    setDetailLoading(true);
    const r = await apiFetch(`/mentor/students/${s.id}`);
    if (r.ok) setStudentDetail(await r.json());
    setDetailLoading(false);
  }

  // ── Follow-up submit ──
  async function addFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fuStudentId || !fuNote.trim()) return;
    setFuLoading(true);
    const r = await apiFetch("/mentor/follow-ups", {
      method: "POST",
      body: JSON.stringify({
        studentId: fuStudentId, noteType: fuNoteType, note: fuNote,
        callStatus: fuCallStatus || null, callTime: fuCallTime || null,
        calledBy: fuCalledBy || null, calledByName: fuCalledByName || null,
        leadStatus: fuLeadStatus || null, nextFollowUpDate: fuNextDate || null,
      }),
    });
    if (r.ok) {
      setFuNote(""); setFuCallStatus(""); setFuCallTime(""); setFuCalledBy("");
      setFuCalledByName(""); setFuLeadStatus(""); setFuNextDate("");
      await fetchFollowUps(); await fetchDashboard();
    }
    setFuLoading(false);
  }

  // ── Sidebar tabs ──
  const tabs: { key: Tab; label: string; icon: typeof Home }[] = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "attendance", label: "Attendance", icon: Calendar },
    { key: "students", label: "Students", icon: Users },
    { key: "follow-ups", label: "Follow-Ups", icon: MessageSquare },
    { key: "alerts", label: "Alerts", icon: Bell },
  ];

  const alertCount = atRiskStudents.length + attentionStudents.length;

  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFF", fontFamily: "Poppins, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-48 flex-shrink-0 hidden md:flex flex-col border-r border-gray-100 bg-white" style={{ position: "sticky", top: 0, height: "100vh" }}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ background: GREEN }}>M</div>
            <div>
              <div className="font-black text-xs" style={{ color: NAVY }}>Mentor Portal</div>
              <div className="text-[10px] text-gray-400 truncate max-w-[90px]">{student.name}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: active ? `${GREEN}15` : "transparent", color: active ? GREEN : "#6B7280" }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {t.label}
                {t.key === "alerts" && alertCount > 0 && (
                  <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>{alertCount}</span>
                )}
                {t.key === "dashboard" && (dashboard?.followUpReminders?.length ?? 0) > 0 && (
                  <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: ORANGE }}>{dashboard!.followUpReminders.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-2 border-t border-gray-100">
          <button onClick={() => { logout(); window.location.href = "/mentor/login"; }}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm">
        <div className="font-black text-sm" style={{ color: NAVY }}>Mentor Portal</div>
        <div className="flex gap-0.5">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="p-1.5 rounded-lg transition-all relative"
                style={{ background: tab === t.key ? `${GREEN}15` : "transparent", color: tab === t.key ? GREEN : "#9CA3AF" }}>
                <Icon className="w-4 h-4" />
                {t.key === "alerts" && alertCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-white text-[8px] flex items-center justify-center font-black" style={{ background: "#DC2626" }}>{alertCount}</span>}
              </button>
            );
          })}
          <button onClick={() => { logout(); window.location.href = "/mentor/login"; }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto md:pt-0 pt-14">

        {/* ════════════════════════════════════════ DASHBOARD ════ */}
        {tab === "dashboard" && (
          <div className="p-5 max-w-5xl mx-auto space-y-5">
            <div>
              <h1 className="text-xl font-black" style={{ color: NAVY }}>Dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">Welcome back, {student.name}</p>
            </div>

            {dashboard ? (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Assigned", value: dashboard.totalAssigned, icon: "👥", color: NAVY },
                    { label: "Active Today", value: dashboard.activeToday, icon: "✅", color: GREEN },
                    { label: "Green", value: dashboard.green, icon: "🟢", color: "#059669" },
                    { label: "Needs Attention", value: dashboard.needsAttention, icon: "🟡", color: "#D97706" },
                    { label: "At Risk", value: dashboard.atRisk, icon: "🔴", color: "#DC2626" },
                    { label: "Inactive 3d+", value: dashboard.notActive3Days, icon: "😴", color: "#D97706" },
                    { label: "Inactive 7d+", value: dashboard.notActive7Days, icon: "💤", color: "#DC2626" },
                    { label: "HW Pending", value: dashboard.homeworkPending, icon: "📝", color: ORANGE },
                  ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-lg">{c.icon}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${c.color}15`, color: c.color }}>{c.label}</span>
                      </div>
                      <div className="text-2xl font-black" style={{ color: NAVY }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Follow-up reminders */}
                {dashboard.followUpReminders.length > 0 && (
                  <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-4 h-4" style={{ color: ORANGE }} />
                      <h3 className="font-black text-sm" style={{ color: ORANGE }}>Follow-Up Reminders ({dashboard.followUpReminders.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {dashboard.followUpReminders.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-orange-100">
                          <div>
                            <span className="font-bold text-sm" style={{ color: NAVY }}>{r.studentName ?? `Student #${r.studentId}`}</span>
                            <span className="text-xs text-gray-400 ml-2">{r.nextFollowUpDate ? fmtDate(r.nextFollowUpDate) : ""}</span>
                            {r.leadStatus && <LeadBadge status={r.leadStatus} />}
                          </div>
                          <button onClick={() => { setFuStudentId(r.studentId); setTab("follow-ups"); }}
                            className="text-xs font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: ORANGE }}>
                            Follow Up
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {/* At-risk quick view */}
                  <div className="bg-white rounded-2xl border border-red-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <h3 className="font-black text-sm" style={{ color: NAVY }}>Students Needing Attention</h3>
                    </div>
                    {[...atRiskStudents, ...attentionStudents].slice(0, 5).length === 0 ? (
                      <div className="text-center py-4"><CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-green-400" /><p className="text-xs text-gray-500">All students on track!</p></div>
                    ) : [...atRiskStudents, ...attentionStudents].slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <div className="font-semibold text-xs" style={{ color: NAVY }}>{s.name}</div>
                          <div className="text-[10px] text-gray-400">Grade {s.grade} · {s.daysSinceLogin}d since login</div>
                        </div>
                        <RiskBadge level={s.riskLevel} score={s.healthScore} />
                      </div>
                    ))}
                  </div>
                  {/* Recent follow-ups */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4" style={{ color: GREEN }} />
                      <h3 className="font-black text-sm" style={{ color: NAVY }}>Recent Follow-Ups</h3>
                    </div>
                    {dashboard.recentFollowUps.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No follow-ups yet</p>
                    ) : dashboard.recentFollowUps.map(fu => (
                      <div key={fu.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-xs" style={{ color: NAVY }}>{fu.studentName}</span>
                          <span className="text-[10px] text-gray-400">{new Date(fu.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>{fu.noteType}</span>
                          {fu.callStatus && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{fu.callStatus.replace("_", " ")}</span>}
                          {fu.leadStatus && <LeadBadge status={fu.leadStatus} />}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{fu.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════ ATTENDANCE ════ */}
        {tab === "attendance" && (
          <div className="p-5 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black" style={{ color: NAVY }}>Attendance</h1>
              <button onClick={() => fetchAttendance(attDate, selectedClassId)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5 text-gray-500" /></button>
            </div>

            {/* Date + class picker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: NAVY }}>Date</label>
                  <input type="date" value={attDate} max={todayStr()}
                    onChange={e => { setAttDate(e.target.value); setAttendanceMap({}); setExpandedCall(null); setCallDrafts({}); }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" />
                </div>
                {liveClasses.length > 0 && (
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold mb-1" style={{ color: NAVY }}>Live Class</label>
                    <select value={selectedClassId ?? ""} onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
                      <option value="">All classes (date-wise)</option>
                      {liveClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.title} — {new Date(c.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} (Gr {c.grade})</option>
                      ))}
                    </select>
                  </div>
                )}
                {liveClasses.length === 0 && (
                  <p className="text-xs text-gray-400 italic mt-5">No live classes scheduled for this date for your students' grades.</p>
                )}
              </div>
            </div>

            {/* Summary strip */}
            {!attLoading && students.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Present", count: Object.values(attendanceMap).filter(a => a.status === "present").length, color: GREEN },
                  { label: "Absent", count: Object.values(attendanceMap).filter(a => a.status === "absent").length, color: "#DC2626" },
                  { label: "Not Marked", count: students.length - Object.keys(attendanceMap).length, color: "#9CA3AF" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: `${s.color}12`, color: s.color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />{s.label}: {s.count}
                  </div>
                ))}
              </div>
            )}

            {/* Student attendance list */}
            {attLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: GREEN }} /></div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p className="text-gray-500 text-sm">No students assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map(s => {
                  const att = attendanceMap[s.id];
                  const draft = callDrafts[s.id] ?? { callStatus: att?.callStatus ?? "", callTime: att?.callTime ?? "", calledBy: att?.calledBy ?? "", calledByName: att?.calledByName ?? "", remark: att?.remark ?? "" };
                  const isExpanded = expandedCall === s.id;
                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)` }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm" style={{ color: NAVY }}>{s.name}</div>
                          <div className="text-xs text-gray-400">Grade {s.grade}</div>
                        </div>
                        {/* Present / Absent buttons */}
                        <div className="flex gap-1.5">
                          <button onClick={() => markAttendance(s.id, "present")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                            style={{ background: att?.status === "present" ? "#DCFCE7" : "white", color: att?.status === "present" ? GREEN : "#9CA3AF", borderColor: att?.status === "present" ? GREEN : "#E5E7EB" }}>
                            ✓ Present
                          </button>
                          <button onClick={() => markAttendance(s.id, "absent")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
                            style={{ background: att?.status === "absent" ? "#FEE2E2" : "white", color: att?.status === "absent" ? "#DC2626" : "#9CA3AF", borderColor: att?.status === "absent" ? "#DC2626" : "#E5E7EB" }}>
                            ✗ Absent
                          </button>
                          {att && (
                            <button onClick={() => setExpandedCall(isExpanded ? null : s.id)}
                              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all border"
                              style={{ background: isExpanded ? "#EEF2FF" : "white", color: NAVY, borderColor: "#E5E7EB" }}>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded call panel */}
                      {isExpanded && att && (
                        <div className="px-4 pb-4 border-t border-gray-50">
                          <p className="text-xs font-bold mt-2 mb-1.5" style={{ color: NAVY }}>Call Details</p>
                          <CallDetailsForm
                            callStatus={draft.callStatus} callTime={draft.callTime}
                            calledBy={draft.calledBy} calledByName={draft.calledByName}
                            onChange={(field, val) => updateDraft(s.id, field, val)}
                          />
                          <div className="mt-2">
                            <input value={draft.remark} onChange={e => updateDraft(s.id, "remark", e.target.value)}
                              placeholder="Remark (optional)…"
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-green-400" />
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button onClick={() => saveCallDetails(s.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GREEN }}>
                              Save
                            </button>
                            <button onClick={() => setExpandedCall(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                          </div>
                          {/* Existing call info */}
                          {att.callStatus && (
                            <div className="mt-2 text-[10px] text-gray-500">
                              Last saved: <span className="font-bold">{att.callStatus.replace("_", " ")}</span>
                              {att.callTime && ` at ${att.callTime}`}
                              {att.calledBy && ` · ${att.calledBy}`}
                              {att.calledByName && ` (${att.calledByName})`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════ STUDENTS ════ */}
        {tab === "students" && (
          <div className="p-5 max-w-5xl mx-auto space-y-4">
            {selectedStudent ? (
              <StudentDetailView
                student={selectedStudent} detail={studentDetail} loading={detailLoading}
                onClose={() => { setSelectedStudent(null); setStudentDetail(null); }}
                onFollowUp={() => { setFuStudentId(selectedStudent.id); setTab("follow-ups"); }}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-black" style={{ color: NAVY }}>My Students</h1>
                  <button onClick={fetchStudents} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5 text-gray-500" /></button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, grade, or email…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 transition-all" />
                </div>
                <div className="grid gap-2.5">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p className="text-gray-500 text-sm">No students found</p>
                    </div>
                  ) : filteredStudents.map(s => <StudentCard key={s.id} student={s} onClick={() => openStudentDetail(s)} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════ FOLLOW-UPS ════ */}
        {tab === "follow-ups" && (
          <div className="p-5 max-w-4xl mx-auto space-y-5">
            <h1 className="text-xl font-black" style={{ color: NAVY }}>Follow-Up Center</h1>

            {/* Add form */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-black text-sm mb-3" style={{ color: NAVY }}>Add Follow-Up</h3>
              <form onSubmit={addFollowUp} className="space-y-2.5">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <select value={fuStudentId} onChange={e => setFuStudentId(e.target.value ? Number(e.target.value) : "")} required
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
                    <option value="">Select student *</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} (Gr {s.grade})</option>)}
                  </select>
                  <select value={fuNoteType} onChange={e => setFuNoteType(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
                    {["General Note", "Called Parent", "Parent Not Reachable", "Student Sick", "Homework Reminder Given", "Issue Resolved", "Follow-Up Scheduled"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Call status buttons */}
                <div>
                  <p className="text-xs font-bold mb-1.5" style={{ color: NAVY }}>Call Status</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {CALL_STATUS_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const active = fuCallStatus === opt.value;
                      return (
                        <button key={opt.value} type="button" onClick={() => setFuCallStatus(active ? "" : opt.value)}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all border"
                          style={{ background: active ? `${opt.color}15` : "white", color: active ? opt.color : "#6B7280", borderColor: active ? opt.color : "#E5E7EB" }}>
                          <Icon className="w-3 h-3" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {fuCallStatus === "called" && (
                  <div className="grid sm:grid-cols-3 gap-2">
                    <input type="time" value={fuCallTime} onChange={e => setFuCallTime(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" />
                    <select value={fuCalledBy} onChange={e => setFuCalledBy(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 bg-white">
                      <option value="">Who picked?</option>
                      {CALLED_BY_OPTIONS.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                    </select>
                    {fuCalledBy === "other" && (
                      <input value={fuCalledByName} onChange={e => setFuCalledByName(e.target.value)}
                        placeholder="Name…" className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" />
                    )}
                  </div>
                )}

                {/* Lead status */}
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold flex-shrink-0" style={{ color: NAVY }}>Lead Status:</p>
                  <div className="flex gap-1.5">
                    {LEAD_STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setFuLeadStatus(fuLeadStatus === opt.value ? "" : opt.value)}
                        className="px-2.5 py-1 rounded-full text-xs font-bold transition-all border"
                        style={{ background: fuLeadStatus === opt.value ? `${opt.color}18` : "white", color: fuLeadStatus === opt.value ? opt.color : "#9CA3AF", borderColor: fuLeadStatus === opt.value ? opt.color : "#E5E7EB" }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} required placeholder="Remark / note *" rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 resize-none" />

                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: NAVY }}>Next Follow-Up Date</label>
                    <input type="date" value={fuNextDate} onChange={e => setFuNextDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" />
                  </div>
                  <button type="submit" disabled={fuLoading} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-all hover:opacity-90 mt-5" style={{ background: `linear-gradient(135deg, ${GREEN}, #047857)` }}>
                    {fuLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Add
                  </button>
                </div>
              </form>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={fuSearch} onChange={e => setFuSearch(e.target.value)} placeholder="Search follow-ups by student name…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500" />
            </div>

            {/* Date-wise grouped list */}
            {(() => {
              const filtered = followUps.filter(fu => !fuSearch.trim() || (fu.studentName ?? "").toLowerCase().includes(fuSearch.toLowerCase()));
              const grouped: Record<string, FollowUp[]> = {};
              for (const fu of filtered) {
                const day = fu.createdAt.slice(0, 10);
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(fu);
              }
              const days = Object.keys(grouped).sort().reverse();
              if (days.length === 0) return (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-500 text-sm">{fuSearch ? "No matching follow-ups" : "No follow-ups yet"}</p>
                </div>
              );
              return (
                <div className="space-y-4">
                  {days.map(day => (
                    <div key={day}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: NAVY }}>{fmtDate(day)}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[10px] text-gray-400">{grouped[day].length} note{grouped[day].length !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="space-y-2">
                        {grouped[day].map(fu => (
                          <FollowUpCard key={fu.id} fu={fu} onDelete={async (id) => { await apiFetch(`/mentor/follow-ups/${id}`, { method: "DELETE" }); setFollowUps(prev => prev.filter(f => f.id !== id)); }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ════════════════════════════════════════ ALERTS ════ */}
        {tab === "alerts" && (
          <div className="p-5 max-w-3xl mx-auto space-y-4">
            <h1 className="text-xl font-black" style={{ color: NAVY }}>Alert Center</h1>

            {atRiskStudents.length + attentionStudents.length + goodStudents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p className="text-gray-500 text-sm">No students assigned</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-black text-red-600">{atRiskStudents.length}</div>
                    <div className="text-xs font-bold text-red-500 mt-0.5">🔴 At Risk</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-black text-amber-600">{attentionStudents.length}</div>
                    <div className="text-xs font-bold text-amber-500 mt-0.5">🟡 Needs Attention</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                    <div className="text-xl font-black text-green-600">{goodStudents.length}</div>
                    <div className="text-xs font-bold text-green-500 mt-0.5">🟢 On Track</div>
                  </div>
                </div>

                {atRiskStudents.length === 0 && attentionStudents.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
                    <p className="text-green-700 font-black text-sm">All Students On Track!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...atRiskStudents, ...attentionStudents].map(s => (
                      <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${healthColor(s.riskLevel)}CC, ${healthColor(s.riskLevel)})` }}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-sm" style={{ color: NAVY }}>{s.name}</div>
                              <div className="text-xs text-gray-400">Grade {s.grade} · {s.daysSinceLogin}d since login</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <RiskBadge level={s.riskLevel} score={s.healthScore} />
                            <button onClick={() => { setFuStudentId(s.id); setTab("follow-ups"); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: GREEN }}>
                              <Phone className="w-3 h-3" /> Follow Up
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                          <div className="p-1.5 rounded-lg bg-gray-50">
                            <div className="text-xs font-black" style={{ color: NAVY }}>{s.hwCompletion}%</div>
                            <div className="text-[10px] text-gray-400">Homework</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-gray-50">
                            <div className="text-xs font-black" style={{ color: NAVY }}>{s.testCount}</div>
                            <div className="text-[10px] text-gray-400">Tests</div>
                          </div>
                          <div className="p-1.5 rounded-lg bg-gray-50">
                            <div className="text-xs font-black" style={{ color: NAVY }}>{s.daysSinceLogin}d</div>
                            <div className="text-[10px] text-gray-400">Last Active</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student Card ────────────────────────────────────────────────────────
function StudentCard({ student, onClick }: { student: Student; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-all text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)` }}>
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-black text-sm" style={{ color: NAVY }}>{student.name}</div>
            <div className="text-xs text-gray-400">Grade {student.grade}{student.school ? ` · ${student.school}` : ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={student.riskLevel} score={student.healthScore} />
          <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {[
          { label: "HW Done", value: `${student.hwCompletion}%` },
          { label: "Tests", value: student.testCount },
          { label: "Last Active", value: student.daysSinceLogin > 100 ? "Never" : `${student.daysSinceLogin}d` },
        ].map(c => (
          <div key={c.label} className="text-center p-2 rounded-lg" style={{ background: "#F8FAFF" }}>
            <div className="font-black text-xs" style={{ color: NAVY }}>{c.value}</div>
            <div className="text-[10px] text-gray-400">{c.label}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

// ── Student Detail View ─────────────────────────────────────────────────
function StudentDetailView({ student, detail, loading, onClose, onFollowUp }: {
  student: Student; detail: { hwSubs: unknown[]; testSubs: unknown[]; followUps: FollowUp[]; attendance: { attendanceDate: string; status: string; remark: string | null }[] } | null;
  loading: boolean; onClose: () => void; onFollowUp: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
        <h1 className="text-xl font-black" style={{ color: NAVY }}>{student.name}</h1>
        <RiskBadge level={student.riskLevel} score={student.healthScore} />
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Grade", value: student.grade },
            { label: "Last Active", value: student.daysSinceLogin > 100 ? "Never" : `${student.daysSinceLogin}d ago` },
            { label: "HW Completion", value: `${student.hwCompletion}%` },
            { label: "Tests Taken", value: student.testCount },
          ].map(c => (
            <div key={c.label} className="text-center p-2.5 rounded-xl" style={{ background: "#F8FAFF" }}>
              <div className="font-black text-sm" style={{ color: NAVY }}>{c.value}</div>
              <div className="text-[10px] text-gray-400">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {student.email && <span className="text-xs text-gray-500 flex items-center gap-1">✉️ {student.email}</span>}
          {student.phone && <span className="text-xs text-gray-500 flex items-center gap-1">📞 {student.phone}</span>}
          {student.school && <span className="text-xs text-gray-500 flex items-center gap-1">🏫 {student.school}</span>}
        </div>
        <button onClick={onFollowUp} className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)` }}>
          <Phone className="w-3 h-3" /> Add Follow-Up
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#059669" }} /></div>
      ) : detail && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent follow-ups */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-black text-sm mb-3" style={{ color: NAVY }}>Follow-Up History</h3>
            {detail.followUps.length === 0 ? <p className="text-xs text-gray-400">No follow-ups yet</p> : detail.followUps.slice(0, 5).map(fu => (
              <div key={fu.id} className="py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `#05966915`, color: "#059669" }}>{fu.noteType}</span>
                  <span className="text-[10px] text-gray-400">{new Date(fu.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{fu.note}</p>
                {fu.callStatus && <span className="text-[10px] text-blue-500 font-semibold">{fu.callStatus.replace("_", " ")} {fu.callTime ? `at ${fu.callTime}` : ""}</span>}
              </div>
            ))}
          </div>
          {/* Attendance history */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h3 className="font-black text-sm mb-3" style={{ color: NAVY }}>Recent Attendance</h3>
            {detail.attendance.length === 0 ? <p className="text-xs text-gray-400">No attendance records yet</p> : detail.attendance.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{fmtDate(a.attendanceDate)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === "present" ? "bg-green-100 text-green-700" : a.status === "absent" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                  {a.status === "present" ? "Present" : a.status === "absent" ? "Absent" : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Follow-Up Card ──────────────────────────────────────────────────────
function FollowUpCard({ fu, onDelete }: { fu: FollowUp; onDelete: (id: number) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-1.5 mb-1">
            <span className="font-black text-xs" style={{ color: NAVY }}>{fu.studentName ?? `Student #${fu.studentId}`}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `#05966915`, color: "#059669" }}>{fu.noteType}</span>
            {fu.callStatus && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">{fu.callStatus.replace("_", " ")}</span>
            )}
            {fu.leadStatus && <LeadBadge status={fu.leadStatus} />}
          </div>
          <p className="text-xs text-gray-600">{fu.note}</p>
          {fu.callStatus === "called" && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {fu.callTime && `Called at ${fu.callTime}`}
              {fu.calledBy && ` · Picked by ${fu.calledBy}`}
              {fu.calledByName && ` (${fu.calledByName})`}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-gray-400">{new Date(fu.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            {fu.nextFollowUpDate && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FFF7ED", color: ORANGE }}>
                📅 Next: {fmtDate(fu.nextFollowUpDate)}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(fu.id)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
