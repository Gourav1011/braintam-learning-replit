import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import { BookOpen, Users, Video, FileText, Clock, Plus, CheckCircle, AlertCircle, GraduationCap, Award, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

interface Course { id: number; title: string; subjectName: string; grade: number; totalLessons: number; enrolledStudents: number; rating: number | null; }
interface LiveClass { id: number; title: string; teacher: string; scheduledAt: string; status: string; grade: number; duration: number; }
interface Homework { id: number; title: string; subjectName: string; grade: number; dueDate: string; maxMarks: number; }
interface Submission { id: number; homeworkTitle?: string; assignmentTitle?: string; studentName: string; answer: string; status: string; marks: number | null; submittedAt: string; }
interface Subject { id: number; name: string; }
interface DashStats { teacherName: string; totalCourses: number; totalStudents: number; upcomingLiveClasses: number; pendingHomework: number; }

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
    credentials: "include",
  });
}

export default function TeacherPage() {
  const { student, role, isLoading } = useAuth();
  const [tab, setTab] = useState<"dashboard" | "courses" | "homework" | "live" | "students" | "submissions">("dashboard");
  const [dash, setDash] = useState<DashStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showHwForm, setShowHwForm] = useState(false);
  const [showLcForm, setShowLcForm] = useState(false);
  const [hwForm, setHwForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", dueDate: "", description: "", maxMarks: "10" });
  const [lcForm, setLcForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "60", joinUrl: "" });
  const [grading, setGrading] = useState<{ id: number; marks: string; type: "homework" | "assignment" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isLoading && (role === "teacher" || role === "admin")) loadAll();
  }, [isLoading, role]);

  async function loadAll() {
    const [d, c, lc, hw, sub, subj, stu] = await Promise.all([
      apiFetch("/teacher/dashboard").then(r => r.ok ? r.json() : null),
      apiFetch("/teacher/courses").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/live-classes").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/homework").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/submissions/homework").then(r => r.ok ? r.json() : []),
      apiFetch("/subjects").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/students").then(r => r.ok ? r.json() : []),
    ]);
    setDash(d); setCourses(c); setLiveClasses(lc); setHomework(hw);
    setSubmissions(sub); setSubjects(subj); setStudents(stu);
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" /></div>;
  if (!student) return <Redirect to="/sign-in" />;
  if (role !== "teacher" && role !== "admin") return <Redirect to="/dashboard" />;

  async function createHomework() {
    setBusy(true); setMsg("");
    const r = await apiFetch("/teacher/homework", {
      method: "POST",
      body: JSON.stringify({ ...hwForm, subjectId: Number(hwForm.subjectId), grade: Number(hwForm.grade), courseId: hwForm.courseId ? Number(hwForm.courseId) : null, maxMarks: Number(hwForm.maxMarks) }),
    });
    if (r.ok) { setMsg("Homework created!"); setShowHwForm(false); setHwForm({ title: "", subjectId: "", grade: "", courseId: "", dueDate: "", description: "", maxMarks: "10" }); loadAll(); }
    else { const d = await r.json(); setMsg(d.error ?? "Error"); }
    setBusy(false);
  }

  async function createLiveClass() {
    setBusy(true); setMsg("");
    const r = await apiFetch("/teacher/live-classes", {
      method: "POST",
      body: JSON.stringify({ ...lcForm, subjectId: Number(lcForm.subjectId), grade: Number(lcForm.grade), courseId: lcForm.courseId ? Number(lcForm.courseId) : null, duration: Number(lcForm.duration) }),
    });
    if (r.ok) { setMsg("Live class scheduled!"); setShowLcForm(false); setLcForm({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "60", joinUrl: "" }); loadAll(); }
    else { const d = await r.json(); setMsg(d.error ?? "Error"); }
    setBusy(false);
  }

  async function gradeSubmission() {
    if (!grading) return;
    setBusy(true);
    const path = grading.type === "homework"
      ? `/teacher/submissions/homework/${grading.id}/grade`
      : `/teacher/submissions/assignments/${grading.id}/grade`;
    await apiFetch(path, { method: "PATCH", body: JSON.stringify({ marks: Number(grading.marks) }) });
    setGrading(null); loadAll();
    setBusy(false);
  }

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3Stub },
    { id: "courses", label: "My Courses", icon: BookOpen },
    { id: "homework", label: "Homework", icon: FileText },
    { id: "live", label: "Live Classes", icon: Video },
    { id: "students", label: "Students", icon: Users },
    { id: "submissions", label: "Grade Work", icon: CheckCircle },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shadow-sm" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-white" />
          <span className="font-black text-white text-lg">Teacher Portal</span>
          <span className="text-white/40 text-sm">— {student.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">← Site</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-0 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t.id ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
              style={{ background: tab === t.id ? ORANGE : "rgba(255,255,255,0.6)" }}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {msg && <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium flex items-center justify-between">
          <span>{msg}</span><button onClick={() => setMsg("")}><X className="w-4 h-4" /></button>
        </div>}

        {/* ── Dashboard ── */}
        {tab === "dashboard" && dash && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "My Courses", value: dash.totalCourses, icon: BookOpen, color: NAVY },
                { label: "My Students", value: dash.totalStudents, icon: Users, color: "#22C55E" },
                { label: "Upcoming Classes", value: dash.upcomingLiveClasses, icon: Video, color: ORANGE },
                { label: "Homework Posted", value: dash.pendingHomework, icon: FileText, color: "#8B5CF6" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <button onClick={() => { setShowHwForm(true); setTab("homework"); }} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}18` }}>
                  <Plus className="w-5 h-5" style={{ color: ORANGE }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>Post Homework</div>
                  <div className="text-xs text-gray-400">Assign to your students</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-orange-400 transition-colors" />
              </button>
              <button onClick={() => { setShowLcForm(true); setTab("live"); }} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}18` }}>
                  <Video className="w-5 h-5" style={{ color: NAVY }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>Schedule Live Class</div>
                  <div className="text-xs text-gray-400">Set time and join link</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-orange-400 transition-colors" />
              </button>
              <button onClick={() => setTab("submissions")} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY }}>Grade Submissions</div>
                  <div className="text-xs text-gray-400">{submissions.filter(s => s.status === "submitted").length} pending</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-orange-400 transition-colors" />
              </button>
            </div>

            {courses.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>My Assigned Courses</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {courses.map(c => (
                    <div key={c.id} className="p-3 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div className="font-semibold text-sm" style={{ color: NAVY }}>{c.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{c.subjectName} · Grade {c.grade}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{c.enrolledStudents} students</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.totalLessons} lessons</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── My Courses ── */}
        {tab === "courses" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="font-bold text-base mb-1" style={{ color: NAVY }}>{c.title}</div>
                <div className="text-xs text-gray-400 mb-3">{c.subjectName} · Grade {c.grade}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-orange-50 rounded-xl p-2 text-center">
                    <div className="font-black text-lg" style={{ color: ORANGE }}>{c.enrolledStudents}</div>
                    <div className="text-gray-500">Students</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2 text-center">
                    <div className="font-black text-lg text-blue-600">{c.totalLessons}</div>
                    <div className="text-gray-500">Lessons</div>
                  </div>
                </div>
                {c.rating && <div className="mt-2 text-xs text-yellow-500 font-semibold">★ {c.rating.toFixed(1)}</div>}
              </div>
            ))}
            {courses.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No courses assigned yet</p>
                <p className="text-xs text-gray-300 mt-1">Ask your admin to assign you to a course</p>
              </div>
            )}
          </div>
        )}

        {/* ── Homework ── */}
        {tab === "homework" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold" style={{ color: NAVY }}>Posted Homework</h3>
              <Button size="sm" onClick={() => setShowHwForm(!showHwForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Post Homework
              </Button>
            </div>

            {showHwForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Homework</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={hwForm.title} onChange={e => setHwForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Select value={hwForm.subjectId} onValueChange={v => setHwForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Grade *" type="number" min="1" max="10" value={hwForm.grade} onChange={e => setHwForm(p => ({ ...p, grade: e.target.value }))} />
                  <Select value={hwForm.courseId} onValueChange={v => setHwForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="datetime-local" value={hwForm.dueDate} onChange={e => setHwForm(p => ({ ...p, dueDate: e.target.value }))} />
                  <Input placeholder="Max marks" type="number" value={hwForm.maxMarks} onChange={e => setHwForm(p => ({ ...p, maxMarks: e.target.value }))} />
                  <Textarea placeholder="Description" value={hwForm.description} onChange={e => setHwForm(p => ({ ...p, description: e.target.value }))} className="sm:col-span-2" rows={3} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createHomework} disabled={busy || !hwForm.title || !hwForm.subjectId || !hwForm.grade || !hwForm.dueDate} className="text-white" style={{ background: ORANGE }}>Post</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowHwForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {homework.map(h => (
                <div key={h.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: NAVY }}>{h.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{h.subjectName} · Grade {h.grade} · Due {new Date(h.dueDate).toLocaleDateString("en-IN")}</div>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-semibold">{h.maxMarks} marks</span>
                </div>
              ))}
              {homework.length === 0 && !showHwForm && (
                <div className="py-12 text-center">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No homework posted yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Live Classes ── */}
        {tab === "live" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold" style={{ color: NAVY }}>My Live Classes</h3>
              <Button size="sm" onClick={() => setShowLcForm(!showLcForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Schedule Class
              </Button>
            </div>

            {showLcForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Schedule Live Class</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Class title *" value={lcForm.title} onChange={e => setLcForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Select value={lcForm.subjectId} onValueChange={v => setLcForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Grade *" type="number" min="1" max="10" value={lcForm.grade} onChange={e => setLcForm(p => ({ ...p, grade: e.target.value }))} />
                  <Select value={lcForm.courseId} onValueChange={v => setLcForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="datetime-local" value={lcForm.scheduledAt} onChange={e => setLcForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                  <Input placeholder="Duration (minutes)" type="number" value={lcForm.duration} onChange={e => setLcForm(p => ({ ...p, duration: e.target.value }))} />
                  <Input placeholder="Join URL (Meet / Zoom)" value={lcForm.joinUrl} onChange={e => setLcForm(p => ({ ...p, joinUrl: e.target.value }))} className="sm:col-span-2" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createLiveClass} disabled={busy || !lcForm.title || !lcForm.subjectId || !lcForm.grade || !lcForm.scheduledAt} className="text-white" style={{ background: ORANGE }}>Schedule</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowLcForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {liveClasses.map(lc => (
                <div key={lc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}10` }}>
                      <Video className="w-5 h-5" style={{ color: NAVY }} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: NAVY }}>{lc.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Grade {lc.grade} · {new Date(lc.scheduledAt).toLocaleString("en-IN")} · {lc.duration} min</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${lc.status === "live" ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-600"}`}>{lc.status}</span>
                </div>
              ))}
              {liveClasses.length === 0 && !showLcForm && (
                <div className="py-12 text-center">
                  <Video className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No live classes scheduled yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Students ── */}
        {tab === "students" && (
          <div className="space-y-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Students in My Courses ({students.length})</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Student</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Grade</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Course</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY }}>{s.studentName?.[0]}</div>
                          <div>
                            <div className="font-medium" style={{ color: NAVY }}>{s.studentName}</div>
                            <div className="text-xs text-gray-400">{s.email ?? s.phone ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">Grade {s.grade}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{s.courseTitle}</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold" style={{ color: ORANGE }}>{s.points ?? 0} pts</span></td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No students enrolled in your courses yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Grade Submissions ── */}
        {tab === "submissions" && (
          <div className="space-y-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Homework Submissions</h3>
            {grading && (
              <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-sm flex items-center gap-3">
                <Input type="number" placeholder="Marks" value={grading.marks} onChange={e => setGrading(p => p ? { ...p, marks: e.target.value } : null)} className="w-32" />
                <Button size="sm" onClick={gradeSubmission} disabled={busy} className="text-white" style={{ background: ORANGE }}>Save Grade</Button>
                <Button size="sm" variant="ghost" onClick={() => setGrading(null)}>Cancel</Button>
              </div>
            )}
            <div className="space-y-3">
              {submissions.map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: NAVY }}>{s.studentName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status === "graded" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>{s.status}</span>
                        {s.marks !== null && <span className="text-xs text-gray-500">{s.marks} marks</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.homeworkTitle ?? s.assignmentTitle} · {new Date(s.submittedAt).toLocaleDateString("en-IN")}</div>
                      <div className="text-sm text-gray-600 mt-2 line-clamp-2">{s.answer}</div>
                    </div>
                    {s.status !== "graded" && (
                      <Button size="sm" onClick={() => setGrading({ id: s.id, marks: "", type: "homework" })}
                        className="text-white flex-shrink-0" style={{ background: ORANGE }}>Grade</Button>
                    )}
                  </div>
                </div>
              ))}
              {submissions.length === 0 && (
                <div className="py-12 text-center">
                  <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No submissions yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarChart3Stub({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
