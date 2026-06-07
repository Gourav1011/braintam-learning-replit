import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Users, CheckCircle, AlertTriangle, Clock, Plus,
  RefreshCw, ChevronDown, ChevronUp, Target, UserCheck2, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const LEAD_STAGES = [
  "New Lead", "Contacted", "Demo Invited", "Demo Joined", "Demo Active",
  "Interested", "Parent Follow-Up", "Converted", "Paid Student", "Inactive", "Dropped",
];

const LEAD_STAGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "New Lead":        { bg: "#F3F4F6", text: "#374151", dot: "#6B7280" },
  "Contacted":       { bg: "#EEF2FF", text: "#4338CA", dot: "#6366F1" },
  "Demo Invited":    { bg: "#F5F3FF", text: "#5B21B6", dot: "#8B5CF6" },
  "Demo Joined":     { bg: "#E0F2FE", text: "#0369A1", dot: "#0284C7" },
  "Demo Active":     { bg: "#ECFEFF", text: "#0E7490", dot: "#0891B2" },
  "Interested":      { bg: "#FFFBEB", text: "#92400E", dot: "#D97706" },
  "Parent Follow-Up":{ bg: "#FFF7ED", text: "#9A3412", dot: "#EA580C" },
  "Converted":       { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A" },
  "Paid Student":    { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  "Inactive":        { bg: "#FEF2F2", text: "#991B1B", dot: "#DC2626" },
  "Dropped":         { bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF" },
};

const NOTE_TYPES = [
  "General Note", "Call Log", "Parent Call", "Homework Issue",
  "Attendance Issue", "Fee Reminder", "Conversion Call", "Escalation", "Other",
];

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
    credentials: "include",
  });
}

interface PipelineData {
  stageCounts: Record<string, number>;
  totalAssigned: number;
  converted: number;
  dropped: number;
  unassignedToStage: number;
  active: number;
}

interface MentorPerf {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  totalStudents: number;
  converted: number;
  followUpTotal: number;
  followUpDone: number;
  followUpCompletionRate: number | null;
  overdueFollowUps: number;
  totalTasks: number;
  doneTasks: number;
  overdueTasks: number;
}

interface OverdueReminder {
  id: number;
  mentorId: number;
  mentorName: string;
  studentId: number;
  studentName: string | null;
  studentGrade: number | null;
  leadStatus: string | null;
  note: string;
  nextFollowUpDate: string | null;
  callStatus: string | null;
  daysOverdue: number;
}

interface StudentOption {
  id: number;
  name: string;
  grade: number;
}

interface UnassignedStudent {
  id: number;
  name: string;
  grade: number;
  school: string | null;
  email: string | null;
}

interface UnassignedData {
  count: number;
  students: UnassignedStudent[];
}

interface MentorOption {
  id: number;
  name: string;
  studentCount: number;
  isActive: boolean;
}

function StatCard({ icon: Icon, label, value, sub, color = NAVY, bg = "#F0F4FF" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color?: string; bg?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-black" style={{ color }}>{value}</div>
        <div className="text-xs font-semibold text-gray-500 truncate">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function PipelineSummary({ pipeline, loading }: { pipeline: PipelineData | null; loading: boolean }) {
  if (loading) return <div className="h-40 flex items-center justify-center text-sm text-gray-400">Loading pipeline…</div>;
  if (!pipeline) return null;

  const { stageCounts, totalAssigned, converted, dropped, unassignedToStage } = pipeline;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total in Pipeline" value={totalAssigned} bg="#EFF6FF" color="#2563EB" />
        <StatCard icon={CheckCircle} label="Converted / Paid" value={converted} bg="#DCFCE7" color="#16A34A" />
        <StatCard icon={AlertTriangle} label="Dropped" value={dropped} bg="#FEF2F2" color="#DC2626" />
        <StatCard icon={Target} label="No Stage Set" value={unassignedToStage} bg="#FFF7ED" color={ORANGE} />
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h4 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Lead Stage Breakdown</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {LEAD_STAGES.map(stage => {
            const count = stageCounts[stage] ?? 0;
            if (count === 0) return null;
            const colors = LEAD_STAGE_COLORS[stage] ?? { bg: "#F3F4F6", text: "#374151", dot: "#6B7280" };
            return (
              <div key={stage}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: colors.bg }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.dot }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: colors.text }}>{stage}</div>
                  <div className="text-lg font-black" style={{ color: colors.text }}>{count}</div>
                </div>
              </div>
            );
          })}
        </div>
        {totalAssigned === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No students assigned to mentors yet.</p>
        )}
      </div>
    </div>
  );
}

function MentorPerformanceTable({ mentors, loading }: { mentors: MentorPerf[]; loading: boolean }) {
  const [sortBy, setSortBy] = useState<keyof MentorPerf>("overdueFollowUps");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(field: keyof MentorPerf) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  const sorted = [...mentors].sort((a, b) => {
    const av = a[sortBy] as number | string | null;
    const bv = b[sortBy] as number | string | null;
    const cmp = (av ?? 0) > (bv ?? 0) ? 1 : (av ?? 0) < (bv ?? 0) ? -1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortBtn({ field, label }: { field: keyof MentorPerf; label: string }) {
    const active = sortBy === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide hover:opacity-70 transition-opacity"
        style={{ color: active ? NAVY : "#9CA3AF" }}
      >
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
      </button>
    );
  }

  if (loading) return <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading mentor performance…</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <UserCheck2 className="w-4 h-4" style={{ color: NAVY }} />
        <h4 className="font-bold text-sm" style={{ color: NAVY }}>Mentor Performance</h4>
        <span className="ml-auto text-[10px] text-gray-400">{mentors.length} mentor{mentors.length !== 1 ? "s" : ""}</span>
      </div>
      {mentors.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">No mentors found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-bold text-gray-500">Mentor</th>
                <th className="px-3 py-2.5 text-center"><SortBtn field="totalStudents" label="Students" /></th>
                <th className="px-3 py-2.5 text-center"><SortBtn field="converted" label="Converted" /></th>
                <th className="px-3 py-2.5 text-center"><SortBtn field="followUpCompletionRate" label="FU Rate" /></th>
                <th className="px-3 py-2.5 text-center"><SortBtn field="overdueFollowUps" label="Overdue FUs" /></th>
                <th className="px-3 py-2.5 text-center"><SortBtn field="overdueTasks" label="Overdue Tasks" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: m.isActive ? NAVY : "#9CA3AF" }}>
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold" style={{ color: NAVY }}>{m.name}</div>
                        {!m.isActive && <div className="text-[9px] text-red-400 font-semibold">INACTIVE</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold" style={{ color: NAVY }}>{m.totalStudents}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold text-emerald-600">{m.converted}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.followUpCompletionRate === null ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span className={`font-bold ${m.followUpCompletionRate >= 75 ? "text-emerald-600" : m.followUpCompletionRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                        {m.followUpCompletionRate}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.overdueFollowUps > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px]">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {m.overdueFollowUps}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-semibold">✓</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {m.overdueTasks > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-bold text-[10px]">
                        <Clock className="w-2.5 h-2.5" />
                        {m.overdueTasks}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-semibold">✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OverdueRemindersList({ reminders, loading }: { reminders: OverdueReminder[]; loading: boolean }) {
  if (loading) return <div className="h-32 flex items-center justify-center text-sm text-gray-400">Loading reminders…</div>;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <h4 className="font-bold text-sm" style={{ color: NAVY }}>Global Overdue Follow-Ups</h4>
        {reminders.length > 0 && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
            {reminders.length} overdue
          </span>
        )}
      </div>
      {reminders.length === 0 ? (
        <div className="py-10 flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-emerald-300" />
          <p className="text-sm font-semibold text-gray-400">No overdue follow-ups 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {reminders.map(r => (
            <div key={r.id} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold" style={{ color: NAVY }}>{r.studentName ?? `Student #${r.studentId}`}</span>
                  {r.studentGrade && <span className="text-[10px] text-gray-400">Gr.{r.studentGrade}</span>}
                  {r.leadStatus && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        background: LEAD_STAGE_COLORS[r.leadStatus]?.bg ?? "#F3F4F6",
                        color: LEAD_STAGE_COLORS[r.leadStatus]?.text ?? "#374151",
                      }}>
                      {r.leadStatus}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Mentor: <span className="font-semibold">{r.mentorName}</span>
                  {" · "}Due: <span className="text-red-500 font-semibold">{r.nextFollowUpDate}</span>
                  {" · "}
                  <span className="text-red-600 font-bold">{r.daysOverdue}d overdue</span>
                </div>
                {r.note && (
                  <div className="text-[10px] text-gray-400 mt-0.5 truncate italic">"{r.note}"</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnassignedStudents({
  data, mentors, loading, onAssigned, flash,
}: {
  data: UnassignedData | null;
  mentors: MentorOption[];
  loading: boolean;
  onAssigned: () => void;
  flash: (msg: string, ok?: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Record<number, string>>({});

  async function assign(studentId: number) {
    const mentorId = selectedMentor[studentId];
    if (!mentorId) return;
    setAssigning(studentId);
    const r = await apiFetch("/admin/mentor-assignments", {
      method: "POST",
      body: JSON.stringify({ mentorId: Number(mentorId), studentId }),
    });
    setAssigning(null);
    if (r.ok) {
      flash("Mentor assigned successfully!");
      onAssigned();
    } else {
      const d = await r.json();
      flash(d.error ?? "Failed to assign mentor", false);
    }
  }

  const count = data?.count ?? 0;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"
      style={{ borderColor: count > 0 ? "#FECACA" : "#F3F4F6" }}>
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: count > 0 ? "#FEF2F2" : "#F0FDF4" }}>
          <UserX className="w-5 h-5" style={{ color: count > 0 ? "#DC2626" : "#16A34A" }} />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-black text-base" style={{ color: count > 0 ? "#DC2626" : "#16A34A" }}>
              {loading ? "…" : count}
            </span>
            <span className="font-bold text-sm" style={{ color: NAVY }}>Unassigned Students</span>
            {count > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                No mentor coverage
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            Active students with no mentor assigned
          </div>
        </div>
        {!loading && count > 0 && (
          expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {expanded && data && data.students.length > 0 && (
        <div className="border-t border-red-50">
          {mentors.length === 0 && (
            <div className="px-5 py-3 text-xs text-amber-600 bg-amber-50 font-semibold">
              No mentors found — add a mentor first before assigning.
            </div>
          )}
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {data.students.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: NAVY }}>
                  {s.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: NAVY }}>{s.name}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">Gr. {s.grade}</span>
                    {s.school && (
                      <span className="text-[10px] text-gray-400 truncate max-w-[160px]">{s.school}</span>
                    )}
                  </div>
                  {s.email && <div className="text-[10px] text-gray-400 mt-0.5">{s.email}</div>}
                </div>
                {mentors.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={selectedMentor[s.id] ?? ""}
                      onValueChange={v => setSelectedMentor(prev => ({ ...prev, [s.id]: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue placeholder="Pick mentor…" />
                      </SelectTrigger>
                      <SelectContent>
                        {mentors.filter(m => m.isActive).map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.name} ({m.studentCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!selectedMentor[s.id] || assigning === s.id}
                      onClick={() => assign(s.id)}
                      className="text-white h-8 px-3 text-xs"
                      style={{ background: NAVY }}
                    >
                      {assigning === s.id ? "…" : "Assign"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {expanded && data && data.students.length === 0 && (
        <div className="border-t border-gray-50 py-8 flex flex-col items-center gap-2">
          <CheckCircle className="w-7 h-7 text-emerald-300" />
          <p className="text-sm font-semibold text-gray-400">All active students have a mentor 🎉</p>
        </div>
      )}
    </div>
  );
}

function PostTimelineForm({ students, flash }: { students: StudentOption[]; flash: (msg: string, ok?: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [noteType, setNoteType] = useState("General Note");
  const [remark, setRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !remark.trim()) return;
    setSaving(true);
    const r = await apiFetch("/admin/btl-crm/timeline", {
      method: "POST",
      body: JSON.stringify({
        studentId: Number(studentId),
        noteType,
        remark: remark.trim(),
        followUpDate: followUpDate || null,
        actionTaken: actionTaken.trim() || null,
      }),
    });
    setSaving(false);
    if (r.ok) {
      flash("Timeline entry posted!");
      setRemark(""); setFollowUpDate(""); setActionTaken(""); setStudentId(""); setSearch("");
      setOpen(false);
    } else {
      const d = await r.json();
      flash(d.error ?? "Failed to post entry", false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
          <Plus className="w-4 h-4" style={{ color: NAVY }} />
        </div>
        <div className="flex-1 text-left">
          <div className="font-bold text-sm" style={{ color: NAVY }}>Post Timeline Entry</div>
          <div className="text-[10px] text-gray-400">Add a note or remark on any student's timeline</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <form onSubmit={submit} className="px-5 pb-5 space-y-3 border-t border-gray-50">
          <div className="pt-3 space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Search Student</label>
            <Input
              placeholder="Type student name…"
              value={search}
              onChange={e => { setSearch(e.target.value); setStudentId(""); }}
              className="text-sm h-9"
            />
            {search && !studentId && (
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm max-h-44 overflow-y-auto mt-1">
                {filtered.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400">No students found</div>
                ) : filtered.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setStudentId(String(s.id)); setSearch(s.name); }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                      style={{ background: NAVY }}>{s.name[0]?.toUpperCase()}</div>
                    <span className="font-semibold">{s.name}</span>
                    <span className="text-gray-400 ml-auto">Gr. {s.grade}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Note Type</label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Remark *</label>
            <Textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="What happened / what was discussed…"
              className="text-sm resize-none"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Follow-Up Date</label>
              <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="text-sm h-9" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Action Taken</label>
              <Input value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="e.g. Sent brochure" className="text-sm h-9" />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !studentId || !remark.trim()} size="sm"
              className="text-white flex-1" style={{ background: ORANGE }}>
              {saving ? "Posting…" : "Post Entry"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function BtlCrmTab({ users }: { users: { id: number; name: string; grade: number; role: string }[] }) {
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [mentorPerf, setMentorPerf] = useState<MentorPerf[]>([]);
  const [reminders, setReminders] = useState<OverdueReminder[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedData | null>(null);
  const [mentorOptions, setMentorOptions] = useState<MentorOption[]>([]);
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingUnassigned, setLoadingUnassigned] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const students = users.filter(u => u.role === "student") as StudentOption[];

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  const loadUnassigned = useCallback(async () => {
    setLoadingUnassigned(true);
    const r = await apiFetch("/admin/btl-crm/unassigned");
    if (r.ok) setUnassigned(await r.json());
    setLoadingUnassigned(false);
  }, []);

  const loadAll = useCallback(async () => {
    setLoadingPipeline(true);
    setLoadingPerf(true);
    setLoadingReminders(true);
    setLoadingUnassigned(true);

    const [pRes, mRes, rRes, uRes, mentRes] = await Promise.all([
      apiFetch("/admin/btl-crm/pipeline"),
      apiFetch("/admin/btl-crm/mentor-performance"),
      apiFetch("/admin/btl-crm/overdue-reminders"),
      apiFetch("/admin/btl-crm/unassigned"),
      apiFetch("/admin/mentors"),
    ]);

    if (pRes.ok) setPipeline(await pRes.json());
    setLoadingPipeline(false);

    if (mRes.ok) setMentorPerf(await mRes.json());
    setLoadingPerf(false);

    if (rRes.ok) setReminders(await rRes.json());
    setLoadingReminders(false);

    if (uRes.ok) setUnassigned(await uRes.json());
    setLoadingUnassigned(false);

    if (mentRes.ok) setMentorOptions(await mentRes.json());
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-black text-base" style={{ color: NAVY }}>BTL CRM Overview</h3>
          <p className="text-xs text-gray-400 mt-0.5">Pipeline + mentor performance across all relationship managers</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadAll}
          className="flex items-center gap-1.5 text-xs border-gray-200 h-8">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Pipeline Summary */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4" style={{ color: NAVY }} />
          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Pipeline Summary</h4>
        </div>
        <PipelineSummary pipeline={pipeline} loading={loadingPipeline} />
      </section>

      {/* Two-column: Mentor table + Overdue reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MentorPerformanceTable mentors={mentorPerf} loading={loadingPerf} />
        <OverdueRemindersList reminders={reminders} loading={loadingReminders} />
      </div>

      {/* Unassigned Students */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UserX className="w-4 h-4" style={{ color: NAVY }} />
          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Coverage Gaps</h4>
        </div>
        <UnassignedStudents
          data={unassigned}
          mentors={mentorOptions}
          loading={loadingUnassigned}
          onAssigned={() => { loadUnassigned(); loadAll(); }}
          flash={flash}
        />
      </section>

      {/* Post Timeline Entry */}
      <PostTimelineForm students={students} flash={flash} />
    </div>
  );
}
