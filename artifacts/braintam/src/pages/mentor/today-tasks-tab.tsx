import { useState, useEffect } from "react";
import { AlertTriangle, Phone, MessageSquare, BookOpen, Calendar, Activity, RefreshCw, Loader2, CheckCircle2, Clock } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

interface TodayTasksData {
  followUpsToday: { id: number; studentId: number; studentName: string | null; nextFollowUpDate: string | null; note: string; callStatus: string | null; leadStatus: string | null; createdAt: string }[];
  contactPending: { studentId: number; name: string; grade: number; phone: string | null; daysSince: number; lastContact: string | null; urgency: "yellow" | "red" }[];
  homeworkAlerts: { studentId: number; name: string; grade: number; pendingCount: number }[];
  attendanceAlerts: { studentId: number; name: string; grade: number; attendancePct: number; total: number }[];
  testAlerts: { studentId: number; name: string; grade: number; avgScore: number; testCount: number }[];
}

function urgencyColor(u: string) { return u === "red" ? "#DC2626" : u === "yellow" ? "#D97706" : GREEN; }
function urgencyBg(u: string) { return u === "red" ? "#FEF2F2" : u === "yellow" ? "#FFFBEB" : "#F0FDF4"; }
function urgencyLabel(days: number) { return days >= 999 ? "Never contacted" : `${days} day${days !== 1 ? "s" : ""} ago`; }

function Section({ title, icon: Icon, color, count, children }: { title: string; icon: typeof AlertTriangle; color: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="font-black text-sm" style={{ color: NAVY }}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: count > 0 ? color : "#9CA3AF" }}>{count}</span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && <div className="px-4 pb-4 space-y-2 border-t border-gray-50">{children}</div>}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-3 text-xs text-green-600">
      <CheckCircle2 className="w-4 h-4" /> <span>{label}</span>
    </div>
  );
}

export function TodayTasksTab({ apiFetch, onFollowUpStudent }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  onFollowUpStudent?: (studentId: number) => void;
}) {
  const [data, setData] = useState<TodayTasksData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await apiFetch("/mentor/today-tasks");
    if (r.ok) setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} />
    </div>
  );
  if (!data) return <div className="p-5 text-center text-sm text-gray-400">Failed to load. <button onClick={load} className="underline">Retry</button></div>;

  const totalAlerts = data.followUpsToday.length + data.contactPending.length + data.homeworkAlerts.length + data.attendanceAlerts.length + data.testAlerts.length;

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Today's Tasks</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            {totalAlerts > 0 && <span className="ml-2 font-bold text-orange-600">{totalAlerts} items need attention</span>}
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> Refresh
        </button>
      </div>

      {/* A. Follow-Ups Due Today */}
      <Section title="Follow-Ups Due Today" icon={MessageSquare} color={ORANGE} count={data.followUpsToday.length}>
        {data.followUpsToday.length === 0 ? <EmptyState label="No follow-ups due today — great job!" /> :
          data.followUpsToday.map(fu => {
            const isOverdue = fu.nextFollowUpDate && fu.nextFollowUpDate < new Date().toISOString().slice(0, 10);
            return (
              <div key={fu.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: NAVY }}>{fu.studentName ?? `#${fu.studentId}`}</span>
                    {isOverdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">Overdue</span>}
                    {!isOverdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Due Today</span>}
                    {fu.leadStatus && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{fu.leadStatus}</span>}
                  </div>
                  {fu.nextFollowUpDate && <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> Scheduled: {fu.nextFollowUpDate}</div>}
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{fu.note}</p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {fu.callStatus !== "completed" && (
                    <button onClick={() => onFollowUpStudent?.(fu.studentId)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                      style={{ background: ORANGE }}>
                      <MessageSquare className="w-3 h-3" /> Follow Up
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </Section>

      {/* B. Contact Pending */}
      <Section title="Contact Frequency Alert" icon={Phone} color="#6366F1" count={data.contactPending.length}>
        {data.contactPending.length === 0 ? <EmptyState label="All students contacted recently!" /> : (
          <>
            <div className="flex gap-3 text-[10px] font-bold mt-2 mb-1">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Red: 7+ days</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Yellow: 4–7 days</span>
            </div>
            {data.contactPending.map(s => (
              <div key={s.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 rounded-lg px-2"
                style={{ background: urgencyBg(s.urgency) }}>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>{s.name}</div>
                  <div className="text-[11px] text-gray-500">Grade {s.grade}{s.phone ? ` · ${s.phone}` : ""}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: urgencyColor(s.urgency) + "20", color: urgencyColor(s.urgency) }}>
                    {urgencyLabel(s.daysSince)}
                  </span>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white" style={{ background: urgencyColor(s.urgency) }}>
                      <Phone className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </Section>

      {/* C. Homework Follow-Up */}
      <Section title="Homework Follow-Up Required" icon={BookOpen} color={NAVY} count={data.homeworkAlerts.length}>
        {data.homeworkAlerts.length === 0 ? <EmptyState label="No pending homework alerts!" /> :
          data.homeworkAlerts.map(s => (
            <div key={s.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="font-bold text-sm" style={{ color: NAVY }}>{s.name}</div>
                <div className="text-[11px] text-gray-500">Grade {s.grade}</div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                {s.pendingCount} pending
              </span>
            </div>
          ))}
      </Section>

      {/* D. Attendance Concern */}
      <Section title="Attendance Concern" icon={Calendar} color="#D97706" count={data.attendanceAlerts.length}>
        {data.attendanceAlerts.length === 0 ? <EmptyState label="No attendance concerns!" /> :
          data.attendanceAlerts.map(s => (
            <div key={s.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="font-bold text-sm" style={{ color: NAVY }}>{s.name}</div>
                <div className="text-[11px] text-gray-500">Grade {s.grade} · {s.total} classes tracked</div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.attendancePct < 50 ? "#FEE2E2" : "#FEF3C7", color: s.attendancePct < 50 ? "#DC2626" : "#D97706" }}>
                {s.attendancePct}% attendance
              </span>
            </div>
          ))}
      </Section>

      {/* E. Test Performance Concern */}
      <Section title="Test Performance Concern" icon={Activity} color="#DC2626" count={data.testAlerts.length}>
        {data.testAlerts.length === 0 ? <EmptyState label="No test performance concerns!" /> :
          data.testAlerts.map(s => (
            <div key={s.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="font-bold text-sm" style={{ color: NAVY }}>{s.name}</div>
                <div className="text-[11px] text-gray-500">Grade {s.grade} · {s.testCount} recent test{s.testCount !== 1 ? "s" : ""}</div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Avg: {s.avgScore}%
              </span>
            </div>
          ))}
      </Section>
    </div>
  );
}
