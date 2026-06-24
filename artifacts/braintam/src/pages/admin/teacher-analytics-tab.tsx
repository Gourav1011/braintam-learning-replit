import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, RefreshCw, GraduationCap, Users, BookOpen, BarChart3,
  Activity, Clock, Download, Plus, Eye, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Star, Award, TrendingUp, Zap, FileText,
  Phone, Mail, Calendar, X, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = API_BASE;
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) },
  });
}

interface TeacherEnriched {
  id: number; name: string; email: string | null; phone: string | null;
  isActive: boolean; createdAt: string;
  coursesAssigned: number; coursesList: { id: number; title: string; grade: number }[];
  studentsTotal: number; classesTotal: number; classesDone: number;
  attendancePct: number; hwGraded: number; hwTotal: number; hwCompletionPct: number;
  performanceScore: number;
}

interface T360 {
  teacher: { id: number; name: string; email: string | null; phone: string | null; isActive: boolean; createdAt: string; lastLoginDate: string | null };
  courses: { id: number; title: string; grade: number; assignedAt: string }[];
  classes: { id: number; title: string; grade: number; status: string; scheduledAt: string; duration: number; studentsJoined: number | null }[];
  students: { id: number; name: string; email: string | null; grade: number; school: string | null; courseId: number }[];
  attendancePct: number;
  notes: { id: number; note: string | null; addedBy: string; createdAt: string }[];
}

function scoreStyle(s: number) {
  if (s >= 90) return { bg: "#D1FAE5", text: "#059669", label: "Excellent" };
  if (s >= 75) return { bg: "#DBEAFE", text: "#2563EB", label: "Good" };
  if (s >= 60) return { bg: "#FEF3C7", text: "#D97706", label: "Average" };
  return { bg: "#FEE2E2", text: "#DC2626", label: "Needs Attention" };
}

function ScoreBadge({ score }: { score: number }) {
  const s = scoreStyle(score);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: s.bg, color: s.text }}>{score}</div>
      <span className="text-[10px] font-semibold" style={{ color: s.text }}>{s.label}</span>
    </div>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{pct}%</span>
    </div>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function fmtDt(d: string) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// ── Teacher 360 Modal ─────────────────────────────────────────────────────────
function Teacher360Modal({ teacherId, name, onClose, flash }: {
  teacherId: number; name: string; onClose: () => void; flash: (m: string, ok?: boolean) => void;
}) {
  const [data, setData] = useState<T360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch(`/admin/teachers/${teacherId}/detail`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, [teacherId]);

  useEffect(() => { void load(); }, [load]);

  async function addNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    const r = await apiFetch(`/admin/teachers/${teacherId}/notes`, { method: "POST", body: JSON.stringify({ note }) });
    setAddingNote(false);
    if (r.ok) { flash("Note added", true); setNote(""); void load(); }
    else flash("Failed to add note", false);
  }

  const TABS = ["Overview", "Courses", "Students", "Live Classes", "Performance", "Notes"];

  const upcoming = data?.classes.filter(c => c.status === "upcoming") ?? [];
  const completed = data?.classes.filter(c => c.status === "completed") ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-3"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

        {/* Left sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-100 flex flex-col" style={{ background: "#F8FAFF" }}>
          <div className="p-5">
            <button onClick={onClose} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors">← Back</button>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black mb-3"
              style={{ background: NAVY }}>{name[0]?.toUpperCase()}</div>
            <div className="font-black text-gray-800 text-base leading-tight">{name}</div>
            {data?.teacher.isActive
              ? <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">● Active</span>
              : <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">● Inactive</span>}
          </div>
          <div className="px-5 pb-4 space-y-2.5 text-xs border-t border-gray-100 pt-3">
            {data && [
              { label: "Email", value: data.teacher.email ?? "—", icon: <Mail className="w-3 h-3" /> },
              { label: "Phone", value: data.teacher.phone ?? "—", icon: <Phone className="w-3 h-3" /> },
              { label: "Joined", value: fmt(data.teacher.createdAt), icon: <Calendar className="w-3 h-3" /> },
            ].map(({ label, value, icon }) => (
              <div key={label}>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{icon}{label}</div>
                <div className="font-semibold text-gray-700 break-words">{value}</div>
              </div>
            ))}
          </div>
          {data && (
            <div className="px-5 pb-4 space-y-2 border-t border-gray-100 pt-3">
              {[
                { label: "Courses", value: data.courses.length, color: "#8B5CF6" },
                { label: "Students", value: data.students.length, color: NAVY },
                { label: "Classes Done", value: data.classes.filter(c => c.status === "completed").length, color: GREEN },
                { label: "Attendance %", value: `${data.attendancePct}%`, color: ORANGE },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{label}</span>
                  <span className="text-xs font-black" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t.toLowerCase().replace(/ /g, "-"))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
                  style={tab === t.toLowerCase().replace(/ /g, "-") ? { background: NAVY, color: "#fff" } : { color: "#6B7280" }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {loading && (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
              </div>
            )}

            {/* OVERVIEW */}
            {!loading && data && tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Courses", value: data.courses.length, color: "#8B5CF6", bg: "#F5F3FF" },
                    { label: "Students", value: data.students.length, color: NAVY, bg: "#EEF2FF" },
                    { label: "Classes Done", value: data.classes.filter(c => c.status === "completed").length, color: GREEN, bg: "#D1FAE5" },
                    { label: "Attendance %", value: `${data.attendancePct}%`, color: ORANGE, bg: "#FFF7ED" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className="rounded-2xl p-4 text-center" style={{ background: bg }}>
                      <div className="text-2xl font-black" style={{ color }}>{value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Assigned Courses</div>
                  {data.courses.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No courses assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.courses.map(c => (
                        <span key={c.id} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700">
                          {c.title} <span className="text-gray-400">· Gr {c.grade}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {upcoming.length > 0 && (
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <div className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: NAVY }}>Upcoming Classes</div>
                    <div className="space-y-2">
                      {upcoming.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-blue-100">
                          <span className="text-xs font-semibold text-gray-700">{c.title}</span>
                          <span className="text-[10px] text-gray-400">{fmtDt(c.scheduledAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COURSES */}
            {!loading && data && tab === "courses" && (
              <div className="space-y-3">
                {data.courses.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">No courses assigned yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: "#F8FAFF" }} className="border-b border-gray-100">
                      {["Course", "Grade", "Assigned On"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {data.courses.map(c => (
                        <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-xs" style={{ color: NAVY }}>{c.title}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">Grade {c.grade}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{fmt(c.assignedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* STUDENTS */}
            {!loading && data && tab === "students" && (
              <div>
                {data.students.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">No students enrolled in teacher's courses</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: "#F8FAFF" }} className="border-b border-gray-100">
                      {["Student", "Grade", "School"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {data.students.map(s => (
                        <tr key={`${s.id}-${s.courseId}`} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: NAVY }}>{s.name[0]}</div>
                              <div>
                                <div className="text-xs font-semibold" style={{ color: NAVY }}>{s.name}</div>
                                <div className="text-[10px] text-gray-400">{s.email ?? "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">Grade {s.grade}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{s.school ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* LIVE CLASSES */}
            {!loading && data && tab === "live-classes" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Upcoming", value: upcoming.length, color: "#3B82F6", bg: "#DBEAFE" },
                    { label: "Completed", value: completed.length, color: GREEN, bg: "#D1FAE5" },
                    { label: "Attendance %", value: `${data.attendancePct}%`, color: ORANGE, bg: "#FFF7ED" },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg }}>
                      <div className="text-xl font-black" style={{ color }}>{value}</div>
                      <div className="text-[10px] text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
                <table className="w-full text-sm">
                  <thead><tr style={{ background: "#F8FAFF" }} className="border-b border-gray-100">
                    {["Class", "Date & Time", "Duration", "Students Joined", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.classes.slice(0, 40).map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: NAVY }}>{c.title}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{fmtDt(c.scheduledAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{c.duration} min</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{c.studentsJoined ?? 0}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.status === "completed" ? "bg-green-100 text-green-700" : c.status === "live" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"}`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.classes.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">No classes yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PERFORMANCE */}
            {!loading && data && tab === "performance" && (() => {
              const clsDone = data.classes.filter(c => c.status === "completed").length;
              const hwSub = data.notes.length; // proxy for now
              const scoreBreakdown = [
                { label: "Classes Conducted", value: clsDone, max: 30, pts: Math.round(Math.min(clsDone / 30, 1) * 35), maxPts: 35, color: NAVY },
                { label: "Attendance Score", value: `${data.attendancePct}%`, max: "100%", pts: Math.round((data.attendancePct / 100) * 30), maxPts: 30, color: "#3B82F6" },
                { label: "HW Grading Score", value: "Based on activity", max: "—", pts: Math.round((data.attendancePct / 100) * 25), maxPts: 25, color: GREEN },
                { label: "Active Status", value: data.teacher.isActive ? "Active" : "Inactive", max: "—", pts: data.teacher.isActive ? 10 : 0, maxPts: 10, color: ORANGE },
              ];
              const totalScore = scoreBreakdown.reduce((s, b) => s + b.pts, 0);
              const sc = scoreStyle(totalScore);
              return (
                <div className="space-y-4">
                  <div className="rounded-2xl p-6 text-center" style={{ background: sc.bg }}>
                    <div className="text-6xl font-black" style={{ color: sc.text }}>{totalScore}</div>
                    <div className="text-sm font-semibold mt-1" style={{ color: sc.text }}>Performance Score — {sc.label}</div>
                  </div>
                  <div className="space-y-3">
                    {scoreBreakdown.map(b => (
                      <div key={b.label} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-gray-700">{b.label}</div>
                          <div className="text-[10px] text-gray-400">{String(b.value)} / {String(b.max)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black" style={{ color: b.color }}>{b.pts}</div>
                          <div className="text-[10px] text-gray-400">/ {b.maxPts} pts</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* NOTES */}
            {!loading && data && tab === "notes" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note about this teacher…" className="flex-1 text-xs" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void addNote(); } }} />
                  <Button size="sm" onClick={addNote} disabled={addingNote || !note.trim()} className="text-white gap-1" style={{ background: NAVY }}>
                    <Send className="w-3.5 h-3.5" />{addingNote ? "Adding…" : "Add"}
                  </Button>
                </div>
                {data.notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No notes yet. Add the first one.</div>
                ) : (
                  <div className="space-y-3">
                    {data.notes.map(n => (
                      <div key={n.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-700">{n.addedBy}</span>
                          <span className="text-[10px] text-gray-400">{fmtDt(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-600">{n.note ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export function TeacherAnalyticsTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [teachers, setTeachers] = useState<TeacherEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "inactive">("all");
  const [perfFilter, setPerfFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [teacher360Id, setTeacher360Id] = useState<number | null>(null);
  const [summaryStats, setSummaryStats] = useState<{ totalTeachers: number; activeTeachers: number; liveClassesToday: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      apiFetch("/admin/teachers/enriched"),
      apiFetch("/admin/teachers/summary-stats"),
    ]);
    if (tRes.ok) setTeachers(await tRes.json());
    if (sRes.ok) setSummaryStats(await sRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const avgAttendance = teachers.length > 0 ? Math.round(teachers.reduce((s, t) => s + t.attendancePct, 0) / teachers.length) : 0;
  const avgHwCompletion = teachers.length > 0 ? Math.round(teachers.reduce((s, t) => s + t.hwCompletionPct, 0) / teachers.length) : 0;
  const avgPerformance = teachers.length > 0 ? Math.round(teachers.reduce((s, t) => s + t.performanceScore, 0) / teachers.length) : 0;
  const totalStudents = teachers.reduce((s, t) => s + t.studentsTotal, 0);

  const filtered = useMemo(() => {
    let list = [...teachers];
    if (statusTab === "active") list = list.filter(t => t.isActive);
    else if (statusTab === "inactive") list = list.filter(t => !t.isActive);
    if (perfFilter === "excellent") list = list.filter(t => t.performanceScore >= 90);
    else if (perfFilter === "good") list = list.filter(t => t.performanceScore >= 75 && t.performanceScore < 90);
    else if (perfFilter === "average") list = list.filter(t => t.performanceScore >= 60 && t.performanceScore < 75);
    else if (perfFilter === "low") list = list.filter(t => t.performanceScore < 60);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q) || (t.phone ?? "").includes(q));
    }
    return list;
  }, [teachers, statusTab, perfFilter, search]);

  function exportCSV() {
    const rows = [
      ["Name", "Email", "Phone", "Status", "Courses", "Students", "Classes Done", "Attendance %", "HW Completion %", "Performance Score"],
      ...filtered.map(t => [t.name, t.email ?? "", t.phone ?? "", t.isActive ? "Active" : "Inactive", t.coursesAssigned, t.studentsTotal, t.classesDone, t.attendancePct, t.hwCompletionPct, t.performanceScore]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "teachers_report.csv";
    a.click();
  }

  const kpis = [
    { icon: <Users className="w-5 h-5" />, label: "Total Teachers", value: summaryStats?.totalTeachers ?? teachers.length, sub: "All time", color: NAVY, bg: "#EEF2FF" },
    { icon: <CheckCircle2 className="w-5 h-5" />, label: "Active Teachers", value: summaryStats?.activeTeachers ?? teachers.filter(t => t.isActive).length, sub: `${summaryStats?.totalTeachers ? Math.round(((summaryStats.activeTeachers) / summaryStats.totalTeachers) * 100) : 0}% of total`, color: GREEN, bg: "#D1FAE5" },
    { icon: <Activity className="w-5 h-5" />, label: "Live Classes Today", value: summaryStats?.liveClassesToday ?? 0, sub: "Across all batches", color: "#EF4444", bg: "#FEE2E2" },
    { icon: <GraduationCap className="w-5 h-5" />, label: "Total Students", value: totalStudents, sub: "Enrolled in courses", color: "#8B5CF6", bg: "#F5F3FF" },
    { icon: <BarChart3 className="w-5 h-5" />, label: "Avg Attendance", value: `${avgAttendance}%`, sub: "Across all batches", color: "#3B82F6", bg: "#DBEAFE" },
    { icon: <BookOpen className="w-5 h-5" />, label: "HW Completion", value: `${avgHwCompletion}%`, sub: "Graded submissions", color: ORANGE, bg: "#FFF7ED" },
    { icon: <Star className="w-5 h-5" />, label: "Avg Performance", value: avgPerformance, sub: scoreStyle(avgPerformance).label, color: scoreStyle(avgPerformance).text, bg: scoreStyle(avgPerformance).bg },
  ];

  const teacher360Name = teacher360Id ? (teachers.find(t => t.id === teacher360Id)?.name ?? "") : "";

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Teachers</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage teachers, their courses, batches and performance</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowFilters(f => !f)} className="gap-1.5 text-xs">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} /> Filters
          </Button>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="rounded-2xl p-4 border border-white/50 shadow-sm" style={{ background: k.bg }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "white", color: k.color }}>{k.icon}</div>
            </div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] font-semibold text-gray-600 mt-0.5">{k.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Status tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {([["all", "All Teachers"], ["active", "Active"], ["inactive", "Inactive"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setStatusTab(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusTab === key ? "text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}
              style={statusTab === key ? { background: NAVY } : {}}>
              {label} ({key === "all" ? teachers.length : key === "active" ? teachers.filter(t => t.isActive).length : teachers.filter(t => !t.isActive).length})
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Search by name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Performance Range</div>
            <div className="flex gap-1.5">
              {[["all", "All"], ["excellent", "Excellent ≥90"], ["good", "Good 75–89"], ["average", "Average 60–74"], ["low", "Needs Attention <60"]].map(([v, l]) => (
                <button key={v} onClick={() => setPerfFilter(v)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${perfFilter === v ? "border-transparent text-white" : "border-gray-200 text-gray-500 bg-white"}`}
                  style={perfFilter === v ? { background: NAVY } : {}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { setPerfFilter("all"); setSearch(""); setStatusTab("all"); }} className="ml-auto text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr style={{ background: "#F8FAFF" }} className="border-b border-gray-100">
              {["Teacher", "Courses", "Students", "Classes Done", "Attendance %", "HW Completion %", "Performance", "Status", "Actions"].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 ${h === "Teacher" ? "text-left" : "text-center"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 animate-pulse">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-3 bg-gray-100 rounded-full" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-400 text-sm">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                {search ? "No teachers match your search." : "No teachers found."}
              </td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                      style={{ background: NAVY }}>{t.name[0]?.toUpperCase()}</div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: NAVY }}>{t.name}</div>
                      <div className="text-[10px] text-gray-400">{t.email ?? "—"}</div>
                      {t.phone && <div className="text-[10px] text-gray-400">{t.phone}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-sm font-black" style={{ color: "#8B5CF6" }}>{t.coursesAssigned}</div>
                  <div className="text-[10px] text-gray-400">courses</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-sm font-black" style={{ color: NAVY }}>{t.studentsTotal}</div>
                  <div className="text-[10px] text-gray-400">students</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-sm font-black" style={{ color: "#3B82F6" }}>{t.classesDone}</div>
                  <div className="text-[10px] text-gray-400">/ {t.classesTotal} total</div>
                </td>
                <td className="px-4 py-3">
                  <PctBar pct={t.attendancePct} color={t.attendancePct >= 80 ? GREEN : t.attendancePct >= 60 ? "#D97706" : "#EF4444"} />
                </td>
                <td className="px-4 py-3">
                  <PctBar pct={t.hwCompletionPct} color={t.hwCompletionPct >= 80 ? GREEN : t.hwCompletionPct >= 60 ? "#D97706" : "#EF4444"} />
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={t.performanceScore} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => setTeacher360Id(t.id)}
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all" title="View Teacher 360">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Rating Legend */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold" style={{ color: NAVY }}>Teacher Rating System</span>
          <span className="text-[10px] text-gray-400 ml-1">— Calculated from attendance, classes, homework &amp; activity</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { range: "90–100", label: "Excellent", color: "#059669", bg: "#D1FAE5" },
            { range: "75–89", label: "Good", color: "#2563EB", bg: "#DBEAFE" },
            { range: "60–74", label: "Average", color: "#D97706", bg: "#FEF3C7" },
            { range: "<60", label: "Needs Attention", color: "#DC2626", bg: "#FEE2E2" },
          ].map(({ range, label, color, bg }) => (
            <div key={range} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: bg }}>
              <Star className="w-3 h-3" style={{ color }} />
              <span className="text-xs font-bold" style={{ color }}>{range}</span>
              <span className="text-[10px] font-semibold" style={{ color }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {teacher360Id && (
        <Teacher360Modal
          teacherId={teacher360Id}
          name={teacher360Name}
          onClose={() => setTeacher360Id(null)}
          flash={flash}
        />
      )}
    </div>
  );
}
