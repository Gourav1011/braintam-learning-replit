import { useState, useEffect, useRef } from "react";
import {
  Phone, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  Calendar, BookOpen, Activity, Clock, ChevronRight,
  Video, MessageSquare, Users, TrendingUp, Heart, Zap,
  CheckSquare, Square,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const RED = "#DC2626";
const YELLOW = "#D97706";

interface HealthAlert { studentId: number; name: string; grade: number; healthScore: number }
interface TodayTasksData {
  followUpsToday: { id: number; studentId: number; studentName: string | null; nextFollowUpDate: string | null; note: string; callStatus: string | null; leadStatus: string | null; createdAt: string }[];
  contactPending: { studentId: number; name: string; grade: number; phone: string | null; daysSince: number; lastContact: string | null; urgency: "yellow" | "red" }[];
  homeworkAlerts: { studentId: number; name: string; grade: number; pendingCount: number }[];
  attendanceAlerts: { studentId: number; name: string; grade: number; attendancePct: number; total: number }[];
  testAlerts: { studentId: number; name: string; grade: number; avgScore: number; testCount: number }[];
  healthAlerts: HealthAlert[];
  todaySchedule: {
    liveClasses: { id: number; title: string; grade: number | null; scheduledAt: string; joinUrl: string | null; status: string | null }[];
    doubtSessions: { id: number; title: string; scheduledTime: string; meetingLink: string | null; status: string }[];
  };
  eodProgress: {
    callsCompleted: number; callsRequired: number;
    followUpsCompleted: number; followUpsRequired: number;
    parentCallsCompleted: number; parentCallsRequired: number;
    studentsContacted: number;
  };
}

interface ChecklistTask {
  id: string; label: string; subtitle: string; priority: "High" | "Medium" | "Low"; studentId?: number;
}

const OUTCOMES = ["Connected", "Not Picked", "Call Back", "Interested", "Parent Busy"] as const;
type Outcome = typeof OUTCOMES[number];

function priorityColor(p: "High" | "Medium" | "Low") {
  return p === "High" ? RED : p === "Medium" ? ORANGE : "#6B7280";
}
function priorityBg(p: "High" | "Medium" | "Low") {
  return p === "High" ? "#FEE2E2" : p === "Medium" ? "#FEF3C7" : "#F3F4F6";
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
      {initials}
    </div>
  );
}

const AVATAR_COLORS = [NAVY, ORANGE, GREEN, "#7C3AED", "#0891B2", "#DC2626", "#D97706"];
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function ProgressBar({ done, total, color = GREEN }: { done: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{done}</span>
    </div>
  );
}

function CircularProgress({ pct }: { pct: number }) {
  const r = 36, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="88" height="88" className="-rotate-90">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={GREEN} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

function StatCard({ icon: Icon, count, label, sub, color, bg, badge, badgeBg }: {
  icon: typeof Phone; count: number; label: string; sub?: string; color: string; bg: string;
  badge?: string; badgeBg?: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-3xl font-black leading-none" style={{ color }}>{count}</span>
      </div>
      <div className="text-xs font-bold text-gray-700 leading-snug">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      {badge && (
        <div className="mt-3">
          <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: badgeBg ?? bg, color }}>
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

export function TodayTasksTab({ apiFetch, onFollowUpStudent }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  onFollowUpStudent?: (studentId: number) => void;
}) {
  const [data, setData] = useState<TodayTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [activeQueueIdx, setActiveQueueIdx] = useState<number | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [savingOutcome, setSavingOutcome] = useState(false);
  const [callingActive, setCallingActive] = useState(false);
  const savingRef = useRef(false);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/mentor/today-tasks");
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
    </div>
  );
  if (!data) return (
    <div className="p-6 text-center text-sm text-gray-400">
      Failed to load. <button onClick={load} className="underline text-blue-600">Retry</button>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);

  // ── Derived data ──────────────────────────────────────────────────────────
  const overdueFollowUps = data.followUpsToday.filter(f => f.nextFollowUpDate && f.nextFollowUpDate < today);
  const notContactedRed = data.contactPending.filter(s => s.daysSince >= 7);
  const attendanceIssues = data.attendanceAlerts;
  const parentCallbackPending = data.followUpsToday.filter(f =>
    f.leadStatus?.toLowerCase().includes("parent") || f.note?.toLowerCase().includes("parent") || f.callStatus === "callback"
  );

  // ── Auto-generated checklist tasks ────────────────────────────────────────
  const checklistTasks: ChecklistTask[] = [];
  notContactedRed.slice(0, 3).forEach(s => {
    checklistTasks.push({
      id: `call-${s.studentId}`,
      label: `Call ${s.name}`,
      subtitle: s.daysSince >= 999 ? "Last Contact: Never" : `Last Contact: ${s.daysSince} days ago`,
      priority: "High", studentId: s.studentId,
    });
  });
  attendanceIssues.filter(s => s.attendancePct < 55).slice(0, 2).forEach(s => {
    checklistTasks.push({
      id: `att-${s.studentId}`,
      label: `Contact ${s.name}`,
      subtitle: `Attendance ${s.attendancePct}%`,
      priority: "High", studentId: s.studentId,
    });
  });
  parentCallbackPending.slice(0, 1).forEach(f => {
    checklistTasks.push({
      id: `pcb-${f.id}`,
      label: `Parent Callback - ${f.studentName ?? "Student"}`,
      subtitle: "Requested Yesterday",
      priority: "Medium", studentId: f.studentId,
    });
  });
  if (data.healthAlerts.length > 0) {
    checklistTasks.push({
      id: "health-review",
      label: `Review Grade ${data.healthAlerts[0].grade} Health Alerts`,
      subtitle: `${data.healthAlerts.length} student${data.healthAlerts.length !== 1 ? "s" : ""}`,
      priority: "Low",
    });
  }
  data.followUpsToday.filter(f => f.nextFollowUpDate === today).slice(0, 1).forEach(f => {
    checklistTasks.push({
      id: `fu-${f.id}`,
      label: `Follow up with ${f.studentName ?? "Student"}`,
      subtitle: f.note?.slice(0, 40) || "Due today",
      priority: "Medium", studentId: f.studentId,
    });
  });
  checklistTasks.push({ id: "eod", label: "Submit EOD Report", subtitle: "Due by 09:00 PM", priority: "Low" });

  const completedCount = checkedTasks.size;
  const totalTasks = checklistTasks.length;

  // ── Overdue tasks list (for the Overdue Tasks panel) ──────────────────────
  const overdueItems: { id: string; studentId: number; name: string; reason: string; urgency: "High" | "Medium"; phone: string | null }[] = [];
  notContactedRed.slice(0, 3).forEach(s => {
    overdueItems.push({ id: `ot-cp-${s.studentId}`, studentId: s.studentId, name: s.name, reason: s.daysSince >= 999 ? "No contact — never reached" : `No contact for ${s.daysSince} days`, urgency: "High", phone: s.phone });
  });
  overdueFollowUps.slice(0, 2).forEach(f => {
    if (!overdueItems.find(i => i.studentId === f.studentId)) {
      const daysOld = f.nextFollowUpDate ? Math.floor((new Date(today).getTime() - new Date(f.nextFollowUpDate).getTime()) / 86400000) : 1;
      overdueItems.push({ id: `ot-fu-${f.id}`, studentId: f.studentId, name: f.studentName ?? "Student", reason: `Follow-up pending for ${daysOld} day${daysOld !== 1 ? "s" : ""}`, urgency: "Medium", phone: null });
    }
  });

  // ── Students requiring attention ──────────────────────────────────────────
  const attnStudents: { studentId: number; name: string; grade: number; risk: "High" | "Medium" | "Low"; lastContact: string; phone: string | null }[] = [];
  notContactedRed.forEach(s => {
    attnStudents.push({ studentId: s.studentId, name: s.name, grade: s.grade, risk: "High", lastContact: s.daysSince >= 999 ? "Never" : `${s.daysSince} Days`, phone: s.phone });
  });
  data.contactPending.filter(s => s.urgency === "yellow" && !attnStudents.find(a => a.studentId === s.studentId)).forEach(s => {
    attnStudents.push({ studentId: s.studentId, name: s.name, grade: s.grade, risk: "Medium", lastContact: `${s.daysSince} Days`, phone: s.phone });
  });
  attendanceIssues.filter(s => !attnStudents.find(a => a.studentId === s.studentId)).slice(0, 2).forEach(s => {
    attnStudents.push({ studentId: s.studentId, name: s.name, grade: s.grade, risk: s.attendancePct < 50 ? "High" : "Medium", lastContact: "—", phone: null });
  });

  // ── EOD Progress ──────────────────────────────────────────────────────────
  const eod = data.eodProgress;
  const progressPct = Math.round(
    ((eod.callsCompleted + eod.followUpsCompleted + eod.parentCallsCompleted + completedCount) /
      Math.max(1, eod.callsRequired + eod.followUpsRequired + eod.parentCallsRequired + totalTasks)) * 100
  );

  // ── Outcome save ──────────────────────────────────────────────────────────
  async function saveOutcome() {
    if (!selectedOutcome || activeQueueIdx === null || savingRef.current) return;
    const student = data!.contactPending[activeQueueIdx];
    if (!student) return;
    savingRef.current = true;
    setSavingOutcome(true);
    const outcomeMap: Record<Outcome, string> = {
      "Connected": "called", "Not Picked": "no_answer", "Call Back": "callback",
      "Interested": "called", "Parent Busy": "callback",
    };
    await apiFetch("/mentor/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.studentId, note: `Call outcome: ${selectedOutcome}`,
        callStatus: outcomeMap[selectedOutcome], leadStatus: student.urgency === "red" ? "Needs Attention" : "Active",
      }),
    });
    savingRef.current = false;
    setSavingOutcome(false);
    setSelectedOutcome(null);
    if (activeQueueIdx < data!.contactPending.length - 1) {
      setActiveQueueIdx(activeQueueIdx + 1);
    } else {
      setActiveQueueIdx(null);
      setCallingActive(false);
    }
    void load();
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: NAVY }}>Today's Tasks</h1>
          <p className="text-xs text-gray-500 mt-0.5">Focus on these important actions for today</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white hover:bg-gray-50">
            <Activity className="w-3.5 h-3.5 text-gray-500" /> Filter
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm"
            style={{ background: NAVY }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Today's Critical Tasks ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black" style={{ color: NAVY }}>Today's Critical Tasks</h2>
          <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          <StatCard icon={Phone} count={overdueFollowUps.length + notContactedRed.length}
            label="Overdue follow-ups" color={RED} bg="#FEE2E2" badge="Action now" badgeBg="#FEE2E2" />
          <StatCard icon={Users} count={notContactedRed.length}
            label="Not contacted >7d" color={ORANGE} bg="#FEF3C7" badge="At risk" badgeBg="#FEF3C7" />
          <StatCard icon={Calendar} count={attendanceIssues.length}
            label="Attendance issues" color={YELLOW} bg="#FEF9C3" badge="Below limit" badgeBg="#FEF9C3" />
          <StatCard icon={Phone} count={parentCallbackPending.length}
            label="Parent callback" color="#7C3AED" bg="#EDE9FE" badge="Pending" badgeBg="#EDE9FE" />
          <StatCard icon={Video} count={data.todaySchedule.doubtSessions.length}
            label="Doubt sessions" color={GREEN} bg="#D1FAE5" badge="Today" badgeBg="#D1FAE5" />
        </div>
      </div>

      {/* ── Today's Progress Strip ── */}
      {(() => {
        const totalCompleted = eod.callsCompleted + eod.followUpsCompleted + eod.parentCallsCompleted + completedCount;
        const totalRequired = eod.callsRequired + eod.followUpsRequired + eod.parentCallsRequired + totalTasks;
        const stripPct = Math.min(100, totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0);
        const stripLabel = stripPct >= 80 ? "Excellent!" : stripPct >= 60 ? "Good progress!" : stripPct >= 40 ? "Keep going!" : "Just started";
        const stripLabelColor = stripPct >= 60 ? GREEN : stripPct >= 30 ? ORANGE : RED;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-6">
            {/* Big % */}
            <div className="flex-shrink-0">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Today's progress</div>
              <div className="text-4xl font-black leading-none" style={{ color: NAVY }}>{stripPct}%</div>
            </div>

            {/* Bar + label */}
            <div className="flex-1 min-w-0">
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${stripPct}%`, background: `linear-gradient(90deg, ${NAVY} 0%, #2563EB 100%)` }}
                />
              </div>
              <div className="text-[11px] text-gray-400 font-medium">
                {completedCount} of {totalTasks} tasks completed
              </div>
            </div>

            {/* 4 metric chips */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {[
                { done: eod.callsCompleted, req: eod.callsRequired, label: "Calls", color: NAVY },
                { done: eod.followUpsCompleted, req: eod.followUpsRequired, label: "Follow-ups", color: ORANGE },
                { done: eod.parentCallsCompleted, req: eod.parentCallsRequired, label: "Parent calls", color: "#7C3AED" },
                { done: completedCount, req: totalTasks, label: "Tasks", color: GREEN },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-base font-black leading-tight">
                    <span style={{ color: m.color }}>{m.done}</span>
                    <span className="text-gray-300 font-normal">/</span>
                    <span className="text-gray-500 text-sm font-bold">{m.req}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Status badge */}
            <div className="flex-shrink-0">
              <span className="text-xs font-black px-4 py-2 rounded-full border-2"
                style={{ color: stripLabelColor, borderColor: stripLabelColor, background: `${stripLabelColor}12` }}>
                {stripLabel}
              </span>
            </div>
          </div>
        );
      })()}

      {/* ── Row 2: My Tasks | Overdue Tasks | Students Requiring Attention ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* My Tasks for Today */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>My Tasks for Today</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: NAVY }}>
              {totalTasks} Tasks
            </span>
          </div>
          <div className="space-y-2 flex-1">
            {checklistTasks.map(task => {
              const done = checkedTasks.has(task.id);
              return (
                <button key={task.id} onClick={() => {
                  const s = new Set(checkedTasks);
                  done ? s.delete(task.id) : s.add(task.id);
                  setCheckedTasks(s);
                }} className="w-full flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors">
                  {done
                    ? <CheckSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GREEN }} />
                    : <Square className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-300" />}
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold ${done ? "line-through text-gray-400" : ""}`} style={done ? {} : { color: NAVY }}>
                      {task.label}
                    </div>
                    <div className="text-[10px] text-gray-400">{task.subtitle}</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: priorityBg(task.priority), color: priorityColor(task.priority) }}>
                    {task.priority}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>{completedCount} / {totalTasks} Completed</span>
              <span className="font-bold" style={{ color: GREEN }}>{Math.round((completedCount / Math.max(1, totalTasks)) * 100)}%</span>
            </div>
            <ProgressBar done={completedCount} total={totalTasks} color={GREEN} />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" style={{ color: RED }} />
              <h2 className="text-sm font-black" style={{ color: RED }}>Overdue Tasks</h2>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              {overdueItems.length} Overdue
            </span>
          </div>
          {overdueItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: GREEN }} />
                <p className="text-xs text-green-600 font-medium">All caught up!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {overdueItems.map(item => (
                <div key={item.id} className="p-2.5 rounded-xl border border-red-50 bg-red-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold" style={{ color: NAVY }}>{item.name}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: item.urgency === "High" ? "#FEE2E2" : "#FEF3C7", color: item.urgency === "High" ? RED : ORANGE }}>
                          {item.urgency}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">{item.reason}</p>
                    </div>
                    {item.phone && (
                      <a href={`tel:${item.phone}`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: RED }}>
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {!item.phone && (
                      <button onClick={() => onFollowUpStudent?.(item.studentId)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: ORANGE }}>
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {overdueItems.length > 0 && (
            <button className="mt-3 text-xs font-bold text-red-600 flex items-center gap-1 hover:underline">
              View All Overdue <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Students Requiring Attention */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>Students Requiring Attention</h2>
            <button className="text-xs font-bold text-blue-600 hover:underline">View All</button>
          </div>
          {attnStudents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-green-600 font-medium">All students doing well!</p>
            </div>
          ) : (
            <div className="space-y-0">
              <div className="flex text-[9px] font-bold text-gray-400 uppercase mb-1 px-1">
                <span className="flex-1">Student</span>
                <span className="w-12 text-center">Risk</span>
                <span className="w-16 text-center">Last Contact</span>
                <span className="w-6" />
              </div>
              {attnStudents.slice(0, 5).map((s) => (
                <div key={s.studentId} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <Avatar name={s.name} color={avatarColor(s.studentId)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: NAVY }}>{s.name}</div>
                    <div className="text-[10px] text-gray-400">Grade {s.grade}</div>
                  </div>
                  <span className="w-12 text-center text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: s.risk === "High" ? "#FEE2E2" : s.risk === "Medium" ? "#FEF3C7" : "#D1FAE5",
                      color: s.risk === "High" ? RED : s.risk === "Medium" ? ORANGE : GREEN,
                    }}>
                    {s.risk}
                  </span>
                  <span className="w-16 text-center text-[10px] text-gray-500">{s.lastContact}</span>
                  {s.phone ? (
                    <a href={`tel:${s.phone}`}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                      style={{ background: NAVY }}>
                      <Phone className="w-3 h-3" />
                    </a>
                  ) : (
                    <button onClick={() => onFollowUpStudent?.(s.studentId)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white"
                      style={{ background: ORANGE }}>
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Contact Queue | Attendance Alerts | Homework Alerts ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Contact Queue */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-black" style={{ color: NAVY }}>Contact Queue</h2>
              <p className="text-[10px] text-gray-400">Call Next</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: NAVY }}>
              {data.contactPending.length} In Queue
            </span>
          </div>

          {data.contactPending.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-green-600 font-medium">Queue empty — all contacted!</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1">
              {data.contactPending.slice(0, 5).map((s, idx) => (
                <div key={s.studentId}>
                  <div className={`flex items-center gap-2 p-2 rounded-xl transition-all ${activeQueueIdx === idx ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-50"}`}>
                    <span className="w-5 text-xs font-black text-gray-400">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate" style={{ color: NAVY }}>{s.name}</div>
                      <div className="text-[10px] text-gray-400">Grade {s.grade}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${s.urgency === "red" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {s.daysSince >= 999 ? "Never" : `${s.daysSince}d ago`}
                    </span>
                    {s.phone && (
                      <a href={`tel:${s.phone}`} onClick={() => { setActiveQueueIdx(idx); setSelectedOutcome(null); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                        style={{ background: s.urgency === "red" ? RED : ORANGE }}>
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  {activeQueueIdx === idx && (
                    <div className="mt-1.5 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-[10px] font-bold text-gray-600 mb-1.5">Call Outcome:</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {OUTCOMES.map(o => (
                          <button key={o} onClick={() => setSelectedOutcome(o)}
                            className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${selectedOutcome === o ? "text-white border-transparent" : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"}`}
                            style={selectedOutcome === o ? { background: NAVY } : {}}>
                            {o}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={saveOutcome} disabled={!selectedOutcome || savingOutcome}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50 transition-all"
                          style={{ background: GREEN }}>
                          {savingOutcome ? "Saving…" : "Save"}
                        </button>
                        <button onClick={() => { setActiveQueueIdx(null); setSelectedOutcome(null); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 bg-white border border-gray-200">
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setCallingActive(true); setActiveQueueIdx(0); setSelectedOutcome(null); }}
            className="mt-3 w-full py-2.5 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
            style={{ background: NAVY }}>
            <Phone className="w-3.5 h-3.5 inline mr-1.5" />
            {callingActive ? "Continue Calling" : "Start Calling Now"}
          </button>
        </div>

        {/* Attendance Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>Attendance Alerts</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: attendanceIssues.length > 0 ? "#FEF3C7" : "#D1FAE5", color: attendanceIssues.length > 0 ? YELLOW : GREEN }}>
              {attendanceIssues.length} Alerts
            </span>
          </div>
          {attendanceIssues.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1" style={{ color: GREEN }} />
                <p className="text-xs text-green-600 font-medium">No attendance concerns!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {attendanceIssues.slice(0, 4).map(s => (
                <div key={s.studentId} className="flex items-center gap-2 p-2 rounded-xl bg-orange-50/50 border border-orange-100">
                  <Avatar name={s.name} color={avatarColor(s.studentId)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold" style={{ color: NAVY }}>{s.name}</div>
                    <div className="text-[10px] text-gray-400">Grade {s.grade}</div>
                  </div>
                  <span className="text-sm font-black" style={{ color: s.attendancePct < 50 ? RED : ORANGE }}>
                    {s.attendancePct}%
                  </span>
                  <button onClick={() => onFollowUpStudent?.(s.studentId)}
                    className="text-[9px] font-bold px-2 py-1 rounded-lg text-white"
                    style={{ background: ORANGE }}>
                    Contact Parent
                  </button>
                </div>
              ))}
            </div>
          )}
          {attendanceIssues.length > 0 && (
            <button className="mt-2 text-xs font-bold text-orange-600 flex items-center gap-1 hover:underline">
              View All Attendance Issues <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Homework Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>Homework Alerts</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: data.homeworkAlerts.length > 0 ? "#FEE2E2" : "#D1FAE5", color: data.homeworkAlerts.length > 0 ? RED : GREEN }}>
              {data.homeworkAlerts.length} Alerts
            </span>
          </div>
          {data.homeworkAlerts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle2 className="w-7 h-7 mx-auto mb-1" style={{ color: GREEN }} />
                <p className="text-xs text-green-600 font-medium">No homework concerns!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {data.homeworkAlerts.slice(0, 4).map(s => (
                <div key={s.studentId} className="flex items-center gap-2 p-2 rounded-xl bg-red-50/50 border border-red-100">
                  <Avatar name={s.name} color={avatarColor(s.studentId)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold" style={{ color: NAVY }}>{s.name}</div>
                    <div className="text-[10px] text-gray-400">Grade {s.grade}</div>
                  </div>
                  <span className="text-sm font-black" style={{ color: RED }}>
                    {s.pendingCount} pending
                  </span>
                  <button onClick={() => onFollowUpStudent?.(s.studentId)}
                    className="text-[9px] font-bold px-2 py-1 rounded-lg text-white"
                    style={{ background: RED }}>
                    Follow Up
                  </button>
                </div>
              ))}
            </div>
          )}
          {data.homeworkAlerts.length > 0 && (
            <button className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1 hover:underline">
              View All Homework Issues <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Row 4: Upcoming Today | Health Score Alerts | Today's Progress ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Upcoming Today */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>Upcoming Today</h2>
          </div>
          <div className="space-y-2 flex-1">
            {/* Live Classes */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "#EEF2FF" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: NAVY }}>
                <Video className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: NAVY }}>Live Classes</div>
                <div className="text-[10px] text-gray-500">
                  {data.todaySchedule.liveClasses.length > 0
                    ? fmtTime(data.todaySchedule.liveClasses[0].scheduledAt)
                    : "None today"}
                </div>
              </div>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: NAVY }}>
                {data.todaySchedule.liveClasses.length}
              </span>
            </div>
            {/* Doubt Sessions */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "#F0FDF4" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: GREEN }}>
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: NAVY }}>Doubt Sessions</div>
                <div className="text-[10px] text-gray-500">
                  {data.todaySchedule.doubtSessions.length > 0
                    ? data.todaySchedule.doubtSessions[0].scheduledTime
                    : "None today"}
                </div>
              </div>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: GREEN }}>
                {data.todaySchedule.doubtSessions.length}
              </span>
            </div>
            {/* Parent Meetings */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "#FFF7ED" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ORANGE }}>
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold" style={{ color: NAVY }}>Parent Meetings</div>
                <div className="text-[10px] text-gray-500">
                  {parentCallbackPending.length > 0 ? "Callbacks pending" : "None scheduled"}
                </div>
              </div>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: ORANGE }}>
                {parentCallbackPending.length}
              </span>
            </div>
          </div>
          <button className="mt-3 text-xs font-bold flex items-center gap-1 hover:underline" style={{ color: NAVY }}>
            View Full Schedule <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Health Score Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>Health Score Alerts</h2>
            {data.healthAlerts.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {data.healthAlerts.length} Critical
              </span>
            )}
          </div>
          {data.healthAlerts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Heart className="w-7 h-7 mx-auto mb-1" style={{ color: GREEN }} />
                <p className="text-xs text-green-600 font-medium">All students healthy!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {data.healthAlerts.slice(0, 3).map(s => (
                <div key={s.studentId} className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50/50 border border-red-100">
                  <Avatar name={s.name} color={avatarColor(s.studentId)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold" style={{ color: NAVY }}>{s.name}</div>
                    <div className="text-[10px] text-gray-400">Grade {s.grade}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black" style={{ color: s.healthScore < 50 ? RED : ORANGE }}>
                      {s.healthScore}%
                    </span>
                    <button onClick={() => onFollowUpStudent?.(s.studentId)}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg text-white"
                      style={{ background: RED }}>
                      Create Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.healthAlerts.length > 0 && (
            <button className="mt-2 text-xs font-bold text-red-600 flex items-center gap-1 hover:underline">
              View All Health Alerts <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Today's Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black" style={{ color: NAVY }}>Today's Progress</h2>
            <TrendingUp className="w-4 h-4" style={{ color: GREEN }} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <CircularProgress pct={progressPct} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black" style={{ color: NAVY }}>{progressPct}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: progressPct >= 70 ? GREEN : ORANGE }}>
                {progressPct >= 80 ? "Excellent!" : progressPct >= 60 ? "Good Progress!" : progressPct >= 40 ? "Keep Going!" : "Just Started"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {progressPct >= 60 ? "Keep going! You're doing great." : "Focus on high-priority tasks first."}
              </p>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Calls Required</span>
                <span className="font-bold">{eod.callsRequired}</span>
              </div>
              <ProgressBar done={eod.callsCompleted} total={eod.callsRequired} />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Follow-Ups Required</span>
                <span className="font-bold">{eod.followUpsRequired}</span>
              </div>
              <ProgressBar done={eod.followUpsCompleted} total={eod.followUpsRequired} color={ORANGE} />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Parent Calls Required</span>
                <span className="font-bold">{eod.parentCallsRequired}</span>
              </div>
              <ProgressBar done={eod.parentCallsCompleted} total={eod.parentCallsRequired} color="#7C3AED" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                <span>Tasks Completed</span>
                <span className="font-bold">{totalTasks}</span>
              </div>
              <ProgressBar done={completedCount} total={totalTasks} color={NAVY} />
            </div>
          </div>
          <button className="mt-2 text-xs font-bold flex items-center gap-1 hover:underline" style={{ color: NAVY }}>
            View Full Report <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Mentor Tip of the Day ── */}
      <div className="rounded-2xl border border-yellow-200 p-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #FFFBEB 0%, #FEF9C3 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FEF08A" }}>
            <Zap className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <div className="text-xs font-black text-yellow-800">Mentor Tip of the Day</div>
            <p className="text-[11px] text-yellow-700 mt-0.5">
              Consistent follow-ups increase student engagement by 70%. Make 15 quality calls every day!
            </p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs font-bold text-yellow-700 border border-yellow-300 px-3 py-1.5 rounded-lg hover:bg-yellow-100 flex-shrink-0">
          View Best Practices <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
