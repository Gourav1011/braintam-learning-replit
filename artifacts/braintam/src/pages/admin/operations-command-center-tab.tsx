import { useState, useEffect, useCallback } from "react";
import {
  Loader2, RefreshCw, TrendingUp, Users, Phone, BookOpen,
  CheckCircle2, AlertTriangle, Clock, Zap, Activity,
  Monitor, Wifi, WifiOff, ChevronDown, ChevronUp, Star,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
  });
}

// ── Types ─────────────────────────────────────────────────────────────────
interface MentorRow {
  id: number; name: string | null; studentsAssigned: number;
  fuCompleted: number; fuPending: number; parentCalls: number;
  doubtSessions: number; taskTotal: number; taskDone: number;
  eodSubmitted: boolean; checkedIn: boolean; isOnline: boolean; score: number;
}
interface TeacherRow {
  id: number; name: string | null; checkedIn: boolean; isOnline: boolean;
  assigned: number; completed: number; missed: number; live: number; score: number;
}
interface DoubtRow { id: number; mentorName: string; title: string; subject: string; studentCount: number; duration: number; status: string }
interface FuRow { id: number; name: string | null; completed: number; pending: number; parentCalls: number }
interface EmpRow { id: number; name: string | null; role: string; status: "online" | "checked_out" | "offline"; checkInTime: string | null; checkOutTime: string | null }
interface TaskRow { id: number; name: string | null; total: number; done: number; pct: number }
interface ExecSummary { mentorsOnline: number; teachersOnline: number; attendanceCallsPending: number; hwFollowUpsPending: number; doubtSessionsToday: number; liveClassesCompleted: number; followUpsPending: number; studentsNeedingAttention: number }
interface LcControl { total: number; started: number; completed: number; missed: number; live: number; byTeacher: { name: string; assigned: number; completed: number; missed: number; live: number }[] }
interface DashData {
  date: string; execSummary: ExecSummary;
  mentorScoreboard: MentorRow[]; teacherScoreboard: TeacherRow[];
  doubtSessions: DoubtRow[]; doubtSubjectBreakdown: Record<string, number>;
  followUpTracker: FuRow[]; liveClassControl: LcControl; employeeStatus: EmpRow[];
  attendance: { absent: number; present: number; callsPending: number; callsCompleted: number };
  taskCompletion: TaskRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────
function scoreColor(score: number, max: number): { bg: string; color: string; label: string } {
  const pct = max ? score / max : 0;
  if (pct >= 0.65) return { bg: "#DCFCE7", color: GREEN, label: "Excellent" };
  if (pct >= 0.3) return { bg: "#FEF9C3", color: "#CA8A04", label: "Average" };
  return { bg: "#FEE2E2", color: "#DC2626", label: "Needs Attention" };
}
function roleColor(r: string) {
  if (r === "admin") return { bg: "#FEF3C7", color: "#D97706" };
  if (r === "teacher") return { bg: "#DBEAFE", color: "#2563EB" };
  if (r === "mentor") return { bg: "#DCFCE7", color: GREEN };
  return { bg: "#F3F4F6", color: "#6B7280" };
}
function fmtTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}
function pctBar(pct: number, color = NAVY) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, badge }: { title: string; icon: React.ElementType; children: React.ReactNode; badge?: string | number }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: NAVY }} />
          </div>
          <span className="font-bold text-sm" style={{ color: NAVY }}>{title}</span>
          {badge !== undefined && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: ORANGE }}>{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────
function StatPill({ label, value, color = NAVY }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-xl px-3 py-2 min-w-[60px]">
      <span className="text-lg font-black" style={{ color }}>{value}</span>
      <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">{label}</span>
    </div>
  );
}

// ── 1. Executive Summary ──────────────────────────────────────────────────
function ExecSummaryPanel({ d }: { d: ExecSummary }) {
  const items = [
    { label: "Students Need Attention", value: d.studentsNeedingAttention, color: "#DC2626", icon: AlertTriangle },
    { label: "Attendance Calls Pending", value: d.attendanceCallsPending, color: ORANGE, icon: Phone },
    { label: "Homework Follow-Ups Pending", value: d.hwFollowUpsPending, color: "#CA8A04", icon: BookOpen },
    { label: "Doubt Sessions Today", value: d.doubtSessionsToday, color: NAVY, icon: BookOpen },
    { label: "Live Classes Done", value: d.liveClassesCompleted, color: GREEN, icon: Monitor },
    { label: "Follow-Ups Pending", value: d.followUpsPending, color: "#7C3AED", icon: Clock },
    { label: "Mentors Online", value: d.mentorsOnline, color: GREEN, icon: Wifi },
    { label: "Teachers Online", value: d.teachersOnline, color: "#2563EB", icon: Users },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-2xl font-black" style={{ color }}>{value}</span>
          <span className="text-[11px] text-gray-500 font-medium leading-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── 2. Mentor Activity Scoreboard ─────────────────────────────────────────
function MentorScoreboard({ rows }: { rows: MentorRow[] }) {
  const maxScore = Math.max(...rows.map(r => r.score), 1);
  if (!rows.length) return <p className="text-xs text-gray-400 py-4 text-center">No mentors found.</p>;
  return (
    <div className="space-y-2">
      {rows.map((m, i) => {
        const { bg, color, label } = scoreColor(m.score, maxScore);
        return (
          <div key={m.id} className="rounded-xl border border-gray-100 p-3" style={{ background: bg + "60" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black w-5 text-center" style={{ color: NAVY }}>#{i + 1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY }}>
                  {(m.name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>{m.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: bg, color }}>{label}</span>
                    {m.isOnline && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">● Online</span>}
                    {m.checkedIn && !m.isOnline && <span className="text-[10px] text-gray-400">Checked Out</span>}
                    {!m.checkedIn && <span className="text-[10px] text-red-400">Not Checked In</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatPill label="Assigned" value={m.studentsAssigned} />
                <StatPill label="FU Done" value={m.fuCompleted} color={GREEN} />
                <StatPill label="FU Pending" value={m.fuPending} color={m.fuPending > 0 ? "#DC2626" : NAVY} />
                <StatPill label="Parent Calls" value={m.parentCalls} color="#7C3AED" />
                <StatPill label="Doubts" value={m.doubtSessions} color="#2563EB" />
                <StatPill label="Tasks" value={`${m.taskDone}/${m.taskTotal}`} color={m.taskTotal && m.taskDone === m.taskTotal ? GREEN : ORANGE} />
                <StatPill label="EOD" value={m.eodSubmitted ? "✓" : "✗"} color={m.eodSubmitted ? GREEN : "#DC2626"} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Teacher Performance Scoreboard ────────────────────────────────────
function TeacherScoreboard({ rows }: { rows: TeacherRow[] }) {
  const maxScore = Math.max(...rows.map(r => r.score), 1);
  if (!rows.length) return <p className="text-xs text-gray-400 py-4 text-center">No teachers found.</p>;
  return (
    <div className="space-y-2">
      {rows.map((t, i) => {
        const { bg, color, label } = scoreColor(Math.max(t.score, 0), maxScore);
        return (
          <div key={t.id} className="rounded-xl border border-gray-100 p-3" style={{ background: bg + "60" }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black w-5 text-center" style={{ color: NAVY }}>#{i + 1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#2563EB" }}>
                  {(t.name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>{t.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: bg, color }}>{label}</span>
                    {t.isOnline && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">● Online</span>}
                    {t.live > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">● LIVE</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatPill label="Assigned" value={t.assigned} />
                <StatPill label="Done" value={t.completed} color={GREEN} />
                <StatPill label="Live" value={t.live} color={ORANGE} />
                <StatPill label="Missed" value={t.missed} color={t.missed > 0 ? "#DC2626" : NAVY} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Doubt Session Monitor ──────────────────────────────────────────────
function DoubtSessionMonitor({ sessions, subjectBreakdown }: { sessions: DoubtRow[]; subjectBreakdown: Record<string, number> }) {
  const totalStudents = sessions.reduce((s, d) => s + d.studentCount, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 text-center"><div className="text-xl font-black" style={{ color: NAVY }}>{sessions.length}</div><div className="text-[10px] font-bold text-blue-600">Total Sessions</div></div>
        <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-xl font-black" style={{ color: GREEN }}>{totalStudents}</div><div className="text-[10px] font-bold text-green-600">Students Helped</div></div>
        <div className="bg-orange-50 rounded-xl p-3 text-center"><div className="text-xl font-black" style={{ color: ORANGE }}>{sessions.filter(s => s.status === "completed").length}</div><div className="text-[10px] font-bold text-orange-600">Completed</div></div>
      </div>
      {sessions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {["Mentor","Subject","Students","Duration","Status"].map(h => (
                <th key={h} className="px-3 py-2 text-left font-bold text-gray-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {sessions.map((d, i) => (
                <tr key={d.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-3 py-2 font-semibold" style={{ color: NAVY }}>{d.mentorName}</td>
                  <td className="px-3 py-2 text-gray-600">{d.subject}</td>
                  <td className="px-3 py-2 text-gray-600">{d.studentCount}</td>
                  <td className="px-3 py-2 text-gray-600">{d.duration}m</td>
                  <td className="px-3 py-2">
                    <span className={`font-bold px-1.5 py-0.5 rounded-full text-[10px] ${d.status === "completed" ? "bg-green-100 text-green-700" : d.status === "live" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {Object.keys(subjectBreakdown).length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Subject Breakdown</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(subjectBreakdown).map(([subj, cnt]) => (
              <span key={subj} className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-full">{subj}: {cnt}</span>
            ))}
          </div>
        </div>
      )}
      {sessions.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No doubt sessions scheduled today.</p>}
    </div>
  );
}

// ── 5. Follow-Up Tracker ──────────────────────────────────────────────────
function FollowUpTracker({ rows }: { rows: FuRow[] }) {
  if (!rows.length) return <p className="text-xs text-gray-400 py-4 text-center">No mentors.</p>;
  return (
    <div className="space-y-2">
      {rows.map(m => {
        const total = m.completed + m.pending;
        const pct = total ? Math.round(m.completed / total * 100) : 0;
        return (
          <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: NAVY }}>
              {(m.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs" style={{ color: NAVY }}>{m.name}</span>
                <span className="text-xs font-bold" style={{ color: pct >= 80 ? GREEN : pct >= 50 ? "#CA8A04" : "#DC2626" }}>{pct}%</span>
              </div>
              {pctBar(pct, pct >= 80 ? GREEN : pct >= 50 ? "#CA8A04" : "#DC2626")}
              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold">
                <span className="text-green-600">✓ Done: {m.completed}</span>
                <span className="text-red-500">⏳ Pending: {m.pending}</span>
                <span className="text-purple-600">📞 Calls: {m.parentCalls}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 6. Live Class Control Center ──────────────────────────────────────────
function LiveClassControl({ data }: { data: LcControl }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-blue-700">{data.total}</div><div className="text-[10px] font-bold text-blue-600">Assigned</div></div>
        <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-green-700">{data.completed}</div><div className="text-[10px] font-bold text-green-600">Completed</div></div>
        <div className="rounded-xl p-3 text-center" style={{ background: `${ORANGE}18` }}><div className="text-xl font-black" style={{ color: ORANGE }}>{data.live}</div><div className="text-[10px] font-bold" style={{ color: ORANGE }}>Live Now</div></div>
        <div className="bg-red-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-red-600">{data.missed}</div><div className="text-[10px] font-bold text-red-500">Missed</div></div>
      </div>
      {data.byTeacher.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase">Teacher Breakdown</div>
          {data.byTeacher.map(t => (
            <div key={t.name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="font-bold text-xs" style={{ color: NAVY }}>{t.name}</span>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="text-gray-500">Assigned: {t.assigned}</span>
                <span className="text-green-600">Done: {t.completed}</span>
                {t.live > 0 && <span className="text-orange-500">Live: {t.live}</span>}
                {t.missed > 0 && <span className="text-red-500">Missed: {t.missed}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.byTeacher.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No classes scheduled today.</p>}
    </div>
  );
}

// ── 7. Task Completion ────────────────────────────────────────────────────
function TaskCompletion({ rows }: { rows: TaskRow[] }) {
  const active = rows.filter(r => r.total > 0);
  if (!active.length) return <p className="text-xs text-gray-400 py-4 text-center">No tasks assigned today.</p>;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {active.map(m => (
        <div key={m.id} className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-xs" style={{ color: NAVY }}>{m.name}</span>
            <span className="text-xs font-black" style={{ color: m.pct >= 80 ? GREEN : m.pct >= 50 ? "#CA8A04" : "#DC2626" }}>{m.pct}%</span>
          </div>
          {pctBar(m.pct, m.pct >= 80 ? GREEN : m.pct >= 50 ? "#CA8A04" : "#DC2626")}
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>Done: {m.done}</span><span>Pending: {m.total - m.done}</span><span>Total: {m.total}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 8. Employee Status Board ──────────────────────────────────────────────
function EmployeeStatusBoard({ employees }: { employees: EmpRow[] }) {
  const online = employees.filter(e => e.status === "online");
  const checkedOut = employees.filter(e => e.status === "checked_out");
  const offline = employees.filter(e => e.status === "offline");
  function Group({ title, rows, icon: Icon, iconColor, bg }: { title: string; rows: EmpRow[]; icon: React.ElementType; iconColor: string; bg: string }) {
    if (!rows.length) return null;
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
          <span className="text-[10px] font-bold uppercase" style={{ color: iconColor }}>{title} ({rows.length})</span>
        </div>
        <div className="space-y-1.5">
          {rows.map(e => {
            const { bg: rbg, color } = roleColor(e.role);
            return (
              <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: bg }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: NAVY }}>
                    {(e.name ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-xs" style={{ color: NAVY }}>{e.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: rbg, color }}>{e.role}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  {e.checkInTime && <span>In: {fmtTime(e.checkInTime)}</span>}
                  {e.checkOutTime && <span>Out: {fmtTime(e.checkOutTime)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-green-700">{online.length}</div><div className="text-[10px] font-bold text-green-600">Online Now</div></div>
        <div className="bg-blue-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-blue-700">{checkedOut.length}</div><div className="text-[10px] font-bold text-blue-600">Checked Out</div></div>
        <div className="bg-red-50 rounded-xl p-3 text-center"><div className="text-xl font-black text-red-600">{offline.length}</div><div className="text-[10px] font-bold text-red-500">Not Checked In</div></div>
      </div>
      <Group title="Online" rows={online} icon={Wifi} iconColor={GREEN} bg="#F0FDF4" />
      <Group title="Checked Out" rows={checkedOut} icon={CheckCircle2} iconColor="#2563EB" bg="#EFF6FF" />
      <Group title="Not Checked In" rows={offline} icon={WifiOff} iconColor="#DC2626" bg="#FEF2F2" />
    </div>
  );
}

// ── 9. Attendance + Homework Recovery ────────────────────────────────────
function RecoveryPanel({ attendance }: { attendance: DashData["attendance"] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Attendance Recovery</div>
        <div className="bg-red-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Absent Students</span><span className="font-black text-red-600">{attendance.absent}</span></div>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Calls Completed</span><span className="font-black text-green-600">{attendance.callsCompleted}</span></div>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Calls Pending</span><span className="font-black text-orange-500">{attendance.callsPending}</span></div>
          {attendance.absent > 0 && pctBar(Math.round(attendance.callsCompleted / attendance.absent * 100), GREEN)}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Homework Recovery</div>
        <div className="bg-yellow-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Students Missing HW</span><span className="font-black text-yellow-600">—</span></div>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Contacted</span><span className="font-black text-green-600">—</span></div>
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Not Contacted</span><span className="font-black text-red-500">—</span></div>
          <p className="text-[10px] text-gray-400 italic">Tracked via mentor follow-up notes.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export function OperationsCommandCenterTab() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/admin/operations-dashboard");
    if (r.ok) { setData(await r.json()); setLastRefresh(new Date()); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Auto-refresh every 3 minutes
  useEffect(() => {
    const id = setInterval(() => void load(), 3 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-black text-lg flex items-center gap-2" style={{ color: NAVY }}>
            <Zap className="w-5 h-5" style={{ color: ORANGE }} />
            Operations Command Center
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time snapshot — {data?.date ?? "today"}
            {lastRefresh && <span className="ml-2 text-gray-400">· Refreshed {lastRefresh.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: NAVY }} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} /></div>
      ) : !data ? (
        <div className="text-center py-12 text-gray-400 text-sm">Failed to load dashboard.</div>
      ) : (
        <div className="space-y-4">
          {/* Executive Summary — always visible, no collapse */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4" style={{ color: ORANGE }} />
              <span className="font-black text-sm" style={{ color: NAVY }}>Today's Snapshot</span>
            </div>
            <ExecSummaryPanel d={data.execSummary} />
          </div>

          <Section title="Mentor Activity Scoreboard" icon={TrendingUp} badge={data.mentorScoreboard.length}>
            <MentorScoreboard rows={data.mentorScoreboard} />
          </Section>

          <Section title="Teacher Performance Scoreboard" icon={Users} badge={data.teacherScoreboard.length}>
            <TeacherScoreboard rows={data.teacherScoreboard} />
          </Section>

          <Section title="Doubt Session Monitor" icon={BookOpen} badge={data.doubtSessions.length}>
            <DoubtSessionMonitor sessions={data.doubtSessions} subjectBreakdown={data.doubtSubjectBreakdown} />
          </Section>

          <Section title="Follow-Up Tracker" icon={Phone} badge={data.followUpTracker.reduce((s, r) => s + r.pending, 0) || undefined}>
            <FollowUpTracker rows={data.followUpTracker} />
          </Section>

          <Section title="Attendance & Homework Recovery" icon={AlertTriangle} badge={data.attendance.callsPending > 0 ? data.attendance.callsPending : undefined}>
            <RecoveryPanel attendance={data.attendance} />
          </Section>

          <Section title="Live Class Control Center" icon={Monitor} badge={data.liveClassControl.live > 0 ? `${data.liveClassControl.live} LIVE` : undefined}>
            <LiveClassControl data={data.liveClassControl} />
          </Section>

          <Section title="Today's Task Completion" icon={CheckCircle2}>
            <TaskCompletion rows={data.taskCompletion} />
          </Section>

          <Section title="Employee Status Board" icon={Activity}>
            <EmployeeStatusBoard employees={data.employeeStatus} />
          </Section>
        </div>
      )}
    </div>
  );
}
