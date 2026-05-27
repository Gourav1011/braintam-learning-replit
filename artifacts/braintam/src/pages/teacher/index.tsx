import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import {
  BookOpen, Users, Video, FileText, Clock, Plus, CheckCircle,
  GraduationCap, ChevronRight, X, ClipboardList, Play, Square, Trash2,
  ToggleLeft, ToggleRight, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

type Tab = "dashboard" | "courses" | "homework" | "live" | "students" | "submissions" | "tests" | "attendance";

interface Course { id: number; title: string; subjectName: string; subjectId: number; grade: number; totalLessons: number; enrolledStudents: number; rating: number | null; }
interface LiveClass { id: number; title: string; teacher: string; scheduledAt: string; status: string; grade: number; duration: number; joinUrl: string | null; subjectId: number; }
interface Homework { id: number; title: string; subjectName: string; grade: number; dueDate: string; maxMarks: number; questionsJson: string | null; }
interface Submission { id: number; homeworkTitle?: string; assignmentTitle?: string; studentName: string; answer: string; status: string; marks: number | null; feedback: string | null; submittedAt: string; }
interface Subject { id: number; name: string; }
interface DashStats { teacherName: string; totalCourses: number; totalStudents: number; upcomingLiveClasses: number; pendingHomework: number; }
interface TeacherTest { id: number; title: string; subjectName: string; grade: number; scheduledAt: string; duration: number; totalQuestions: number; status: string; }
interface AttendanceRecord { studentId: number; studentName: string; present: boolean; }

type QuestionType = "mcq" | "truefalse";
interface HwQuestion {
  type: QuestionType;
  text: string;
  options: string[];
  correctOption: number;
}
interface TestQuestion {
  text: string;
  options: [string, string, string, string];
  correctOption: number;
}

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
    credentials: "include",
  });
}

function newMcqQuestion(): HwQuestion {
  return { type: "mcq", text: "", options: ["", "", "", ""], correctOption: 0 };
}
function newTfQuestion(): HwQuestion {
  return { type: "truefalse", text: "", options: ["True", "False"], correctOption: 0 };
}

export default function TeacherPage() {
  const { student, role, isLoading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  const [dash, setDash] = useState<DashStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tests, setTests] = useState<TeacherTest[]>([]);

  // Homework form
  const [showHwForm, setShowHwForm] = useState(false);
  const [hwForm, setHwForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", dueDate: "", description: "", maxMarks: "10" });
  const [hwQuestions, setHwQuestions] = useState<HwQuestion[]>([newMcqQuestion()]);
  const [hwHasQuestions, setHwHasQuestions] = useState(false);

  // Live class form
  const [showLcForm, setShowLcForm] = useState(false);
  const [lcForm, setLcForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "60", joinUrl: "" });

  // Test form
  const [showTestForm, setShowTestForm] = useState(false);
  const [testForm, setTestForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "30", liveClassId: "" });
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([
    { text: "", options: ["", "", "", ""], correctOption: 0 },
  ]);

  // Grading
  const [grading, setGrading] = useState<{ id: number; marks: string; feedback: string; type: "homework" | "assignment" } | null>(null);

  // Attendance
  const [attendanceClassId, setAttendanceClassId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!isLoading && (role === "teacher" || role === "admin")) loadAll();
  }, [isLoading, role]);

  async function loadAll() {
    const [d, c, lc, hw, sub, subj, stu, tst] = await Promise.all([
      apiFetch("/teacher/dashboard").then(r => r.ok ? r.json() : null),
      apiFetch("/teacher/courses").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/live-classes").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/homework").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/submissions/homework").then(r => r.ok ? r.json() : []),
      apiFetch("/subjects").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/students").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/tests").then(r => r.ok ? r.json() : []),
    ]);
    setDash(d); setCourses(c); setLiveClasses(lc); setHomework(hw);
    setSubmissions(sub); setSubjects(subj); setStudents(stu); setTests(tst);
  }

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F7FF" }}>
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
    </div>
  );

  // Redirect to teacher login (NOT Clerk /sign-in) if not authenticated
  if (!student) return <Redirect to="/teacher/login" />;
  if (role !== "teacher" && role !== "admin") return <Redirect to="/dashboard" />;

  // ── Homework Actions ──────────────────────────────────────────
  function addHwQuestion(type: QuestionType) {
    setHwQuestions(prev => [...prev, type === "mcq" ? newMcqQuestion() : newTfQuestion()]);
  }

  function toggleHwQuestionType(i: number) {
    setHwQuestions(prev => prev.map((q, idx) => {
      if (idx !== i) return q;
      if (q.type === "mcq") return { type: "truefalse", text: q.text, options: ["True", "False"], correctOption: 0 };
      return { type: "mcq", text: q.text, options: ["", "", "", ""], correctOption: 0 };
    }));
  }

  function updateHwQuestion(i: number, field: keyof HwQuestion, value: string | number) {
    setHwQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  function updateHwOption(qi: number, oi: number, value: string) {
    setHwQuestions(prev => prev.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q));
  }

  function removeHwQuestion(i: number) {
    setHwQuestions(prev => prev.filter((_, idx) => idx !== i));
  }

  async function createHomework() {
    setBusy(true);
    const validQs = hwHasQuestions ? hwQuestions.filter(q => q.text.trim()) : [];
    const payload = {
      ...hwForm,
      subjectId: Number(hwForm.subjectId),
      grade: Number(hwForm.grade),
      courseId: hwForm.courseId ? Number(hwForm.courseId) : null,
      maxMarks: Number(hwForm.maxMarks),
      questionsJson: validQs.length > 0 ? validQs : null,
    };
    const r = await apiFetch("/teacher/homework", { method: "POST", body: JSON.stringify(payload) });
    if (r.ok) {
      flash("Homework posted!");
      setShowHwForm(false);
      setHwForm({ title: "", subjectId: "", grade: "", courseId: "", dueDate: "", description: "", maxMarks: "10" });
      setHwQuestions([newMcqQuestion()]);
      setHwHasQuestions(false);
      loadAll();
    } else {
      const d = await r.json();
      flash(d.error ?? "Error", false);
    }
    setBusy(false);
  }

  // ── Live Class Actions ─────────────────────────────────────────
  async function createLiveClass() {
    setBusy(true);
    const r = await apiFetch("/teacher/live-classes", {
      method: "POST",
      body: JSON.stringify({
        ...lcForm,
        subjectId: Number(lcForm.subjectId),
        grade: Number(lcForm.grade),
        courseId: lcForm.courseId ? Number(lcForm.courseId) : null,
        duration: Number(lcForm.duration),
      }),
    });
    if (r.ok) {
      flash("Live class scheduled!");
      setShowLcForm(false);
      setLcForm({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "60", joinUrl: "" });
      loadAll();
    } else {
      const d = await r.json();
      flash(d.error ?? "Error", false);
    }
    setBusy(false);
  }

  async function updateClassStatus(id: number, status: string) {
    const r = await apiFetch(`/teacher/live-classes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (r.ok) { flash(`Class marked as ${status}`); loadAll(); }
    else flash("Failed to update status", false);
  }

  // ── Test Actions ───────────────────────────────────────────────
  function addTestQuestion() {
    setTestQuestions(prev => [...prev, { text: "", options: ["", "", "", ""], correctOption: 0 }]);
  }

  function updateTestQuestion(i: number, field: string, value: string | number) {
    setTestQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  function updateTestOption(qi: number, oi: number, value: string) {
    setTestQuestions(prev => prev.map((q, idx) =>
      idx === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) as [string, string, string, string] } : q
    ));
  }

  function removeTestQuestion(i: number) {
    setTestQuestions(prev => prev.filter((_, idx) => idx !== i));
  }

  // When a live class is selected for test, pre-fill subject/grade/date
  function pickLiveClassForTest(lcId: string) {
    setTestForm(p => ({ ...p, liveClassId: lcId }));
    if (lcId) {
      const lc = liveClasses.find(l => l.id === Number(lcId));
      if (lc) {
        const dt = new Date(lc.scheduledAt).toISOString().slice(0, 16);
        setTestForm(p => ({
          ...p,
          liveClassId: lcId,
          subjectId: String(lc.subjectId),
          grade: String(lc.grade),
          scheduledAt: dt,
        }));
      }
    }
  }

  async function createTest() {
    setBusy(true);
    const validQs = testQuestions.filter(q => q.text.trim() && q.options.every(o => o.trim()));
    const r = await apiFetch("/teacher/tests", {
      method: "POST",
      body: JSON.stringify({
        title: testForm.title,
        subjectId: Number(testForm.subjectId),
        grade: Number(testForm.grade),
        courseId: testForm.courseId ? Number(testForm.courseId) : null,
        scheduledAt: testForm.scheduledAt,
        duration: Number(testForm.duration),
        questions: validQs,
      }),
    });
    if (r.ok) {
      flash("Test created!");
      setShowTestForm(false);
      setTestForm({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "30", liveClassId: "" });
      setTestQuestions([{ text: "", options: ["", "", "", ""], correctOption: 0 }]);
      loadAll();
    } else {
      const d = await r.json();
      flash(d.error ?? "Error", false);
    }
    setBusy(false);
  }

  async function deleteTest(id: number) {
    await apiFetch(`/teacher/tests/${id}`, { method: "DELETE" });
    loadAll();
  }

  // ── Grading ────────────────────────────────────────────────────
  async function gradeSubmission() {
    if (!grading) return;
    setBusy(true);
    const path = grading.type === "homework"
      ? `/teacher/submissions/homework/${grading.id}/grade`
      : `/teacher/submissions/assignments/${grading.id}/grade`;
    const r = await apiFetch(path, { method: "PATCH", body: JSON.stringify({ marks: Number(grading.marks), feedback: grading.feedback || null }) });
    if (r.ok) { flash("Graded!"); setGrading(null); loadAll(); }
    else flash("Failed to grade", false);
    setBusy(false);
  }

  // ── Attendance ─────────────────────────────────────────────────
  async function loadAttendance(classId: number) {
    setAttendanceClassId(classId);
    const classStudents = students.map(s => ({ studentId: s.studentId, studentName: s.studentName, present: true }));
    const existing = await apiFetch(`/teacher/live-classes/${classId}/attendance`).then(r => r.ok ? r.json() : []);
    if (existing.length > 0) {
      const map = Object.fromEntries(existing.map((e: any) => [e.studentId, e.present]));
      setAttendanceRecords(classStudents.map(s => ({ ...s, present: map[s.studentId] ?? true })));
    } else {
      setAttendanceRecords(classStudents);
    }
  }

  async function saveAttendance() {
    if (attendanceClassId === null) return;
    setAttendanceBusy(true);
    const r = await apiFetch(`/teacher/live-classes/${attendanceClassId}/attendance`, {
      method: "POST",
      body: JSON.stringify({ records: attendanceRecords.map(r => ({ studentId: r.studentId, present: r.present })) }),
    });
    if (r.ok) { flash("Attendance saved!"); setAttendanceClassId(null); }
    else flash("Failed to save attendance", false);
    setAttendanceBusy(false);
  }

  const pendingCount = submissions.filter(s => s.status === "submitted").length;

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: DashIcon },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "homework", label: "Homework", icon: FileText },
    { id: "live", label: "Live Classes", icon: Video },
    { id: "tests", label: "Tests", icon: ClipboardList },
    { id: "students", label: "Students", icon: Users },
    { id: "submissions", label: "Grade Work", icon: CheckCircle },
    { id: "attendance", label: "Attendance", icon: Clock },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shadow-sm" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-white" />
          <span className="font-black text-white text-lg">Teacher Portal</span>
          <span className="text-white/40 text-sm hidden md:inline">— {student.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">← Site</a>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-red-500/40 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-0 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-xl text-xs font-semibold transition-all whitespace-nowrap ${tab === t.id ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
              style={{ background: tab === t.id ? ORANGE : "rgba(255,255,255,0.6)" }}>
              <Icon className="w-3.5 h-3.5" />{t.label}
              {t.id === "submissions" && pendingCount > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center leading-none">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-5 space-y-5">
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Dashboard ── */}
        {tab === "dashboard" && dash && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "My Courses", value: dash.totalCourses, color: NAVY },
                { label: "My Students", value: dash.totalStudents, color: "#22C55E" },
                { label: "Upcoming Classes", value: dash.upcomingLiveClasses, color: ORANGE },
                { label: "Homework Posted", value: dash.pendingHomework, color: "#8B5CF6" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100 text-center">
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              {[
                { label: "Post Homework", sub: "Assign MCQ or text questions", icon: FileText, action: () => { setShowHwForm(true); setTab("homework"); }, color: ORANGE },
                { label: "Schedule Live Class", sub: "Set time and join link", icon: Video, action: () => { setShowLcForm(true); setTab("live"); }, color: NAVY },
                { label: `Grade Submissions`, sub: `${pendingCount} pending`, icon: CheckCircle, action: () => setTab("submissions"), color: "#22C55E" },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={a.action} className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${a.color}18` }}>
                      <Icon className="w-5 h-5" style={{ color: a.color }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color: NAVY }}>{a.label}</div>
                      <div className="text-xs text-gray-400">{a.sub}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-orange-400 transition-colors" />
                  </button>
                );
              })}
            </div>

            {courses.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-3" style={{ color: NAVY }}>My Assigned Courses</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {courses.map(c => (
                    <div key={c.id} className="p-3 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                      <div className="font-semibold text-sm" style={{ color: NAVY }}>{c.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{c.subjectName} · Grade {c.grade}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.enrolledStudents}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.totalLessons}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Courses ── */}
        {tab === "courses" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map(c => (
              <div key={c.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="font-bold text-base mb-1" style={{ color: NAVY }}>{c.title}</div>
                <div className="text-xs text-gray-400 mb-3">{c.subjectName} · Grade {c.grade}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-orange-50 rounded-xl p-2 text-center"><div className="font-black text-lg" style={{ color: ORANGE }}>{c.enrolledStudents}</div><div className="text-gray-500">Students</div></div>
                  <div className="bg-blue-50 rounded-xl p-2 text-center"><div className="font-black text-lg text-blue-600">{c.totalLessons}</div><div className="text-gray-500">Lessons</div></div>
                </div>
                {c.rating && <div className="mt-2 text-xs text-yellow-500 font-semibold">★ {c.rating.toFixed(1)}</div>}
              </div>
            ))}
            {courses.length === 0 && (
              <div className="col-span-3 py-16 text-center">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No courses assigned</p>
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
                <Plus className="w-3.5 h-3.5" /> Post
              </Button>
            </div>

            {showHwForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-4">
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
                  <Textarea placeholder="Instructions / description" value={hwForm.description} onChange={e => setHwForm(p => ({ ...p, description: e.target.value }))} className="sm:col-span-2" rows={2} />
                </div>

                {/* MCQ Questions Toggle */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold" style={{ color: NAVY }}>Add Questions (MCQ / True–False)</span>
                      <p className="text-xs text-gray-400 mt-0.5">Optional — attach questions to auto-grade</p>
                    </div>
                    <button onClick={() => setHwHasQuestions(p => !p)} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: ORANGE }}>
                      {hwHasQuestions ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      {hwHasQuestions ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  {hwHasQuestions && (
                    <div className="space-y-3">
                      {hwQuestions.map((q, qi) => (
                        <div key={qi} className="rounded-xl border border-gray-200 p-4 space-y-2 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black w-5 flex-shrink-0" style={{ color: ORANGE }}>Q{qi + 1}</span>
                            <Input
                              placeholder="Question (1 line) *"
                              value={q.text}
                              onChange={e => updateHwQuestion(qi, "text", e.target.value)}
                              className="flex-1 bg-white"
                            />
                            {/* MCQ / T-F toggle button */}
                            <button
                              onClick={() => toggleHwQuestionType(qi)}
                              title={q.type === "mcq" ? "Switch to True/False" : "Switch to MCQ (4 options)"}
                              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${q.type === "truefalse" ? "bg-purple-50 text-purple-600 border-purple-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}>
                              {q.type === "truefalse" ? "T/F" : "MCQ"}
                            </button>
                            {hwQuestions.length > 1 && (
                              <button onClick={() => removeHwQuestion(qi)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-4 h-4" /></button>
                            )}
                          </div>

                          {q.type === "mcq" ? (
                            <div className="grid grid-cols-2 gap-2 ml-7">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-1.5">
                                  <input type="radio" name={`hw-q${qi}`} checked={q.correctOption === oi} onChange={() => updateHwQuestion(qi, "correctOption", oi)} className="w-3.5 h-3.5 accent-orange-500 flex-shrink-0" />
                                  <Input placeholder={`Option ${String.fromCharCode(65 + oi)} *`} value={opt} onChange={e => updateHwOption(qi, oi, e.target.value)} className="bg-white text-xs" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex gap-4 ml-7">
                              {["True", "False"].map((opt, oi) => (
                                <label key={oi} className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name={`hw-q${qi}`} checked={q.correctOption === oi} onChange={() => updateHwQuestion(qi, "correctOption", oi)} className="w-3.5 h-3.5 accent-orange-500" />
                                  <span className="text-sm font-medium text-gray-700">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 ml-7">Select correct answer · click <span className="font-semibold">{q.type === "mcq" ? "MCQ" : "T/F"}</span> to switch type</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => addHwQuestion("mcq")} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add MCQ</Button>
                        <Button size="sm" variant="outline" onClick={() => addHwQuestion("truefalse")} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add True/False</Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={createHomework} disabled={busy || !hwForm.title || !hwForm.subjectId || !hwForm.grade || !hwForm.dueDate} className="text-white" style={{ background: ORANGE }}>
                    {busy ? "Posting…" : "Post Homework"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowHwForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {homework.map(h => {
                let qCount = 0;
                try { if (h.questionsJson) qCount = JSON.parse(h.questionsJson).length; } catch { /**/ }
                return (
                  <div key={h.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: NAVY }}>{h.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {h.subjectName} · Grade {h.grade} · Due {new Date(h.dueDate).toLocaleDateString("en-IN")}
                        {qCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold">{qCount} Qs</span>}
                      </div>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-semibold">{h.maxMarks} marks</span>
                  </div>
                );
              })}
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
                <Plus className="w-3.5 h-3.5" /> Schedule
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
                  <Input placeholder="Duration (min)" type="number" value={lcForm.duration} onChange={e => setLcForm(p => ({ ...p, duration: e.target.value }))} />
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
                <div key={lc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}10` }}>
                        <Video className="w-5 h-5" style={{ color: NAVY }} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: NAVY }}>{lc.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(lc.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {lc.duration} min · Grade {lc.grade}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${lc.status === "live" ? "bg-red-100 text-red-600" : lc.status === "completed" ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>{lc.status}</span>
                      {lc.status === "upcoming" && (
                        <button onClick={() => updateClassStatus(lc.id, "live")} className="text-xs px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center gap-1">
                          <Play className="w-3 h-3" />Start
                        </button>
                      )}
                      {lc.status === "live" && (
                        <button onClick={() => updateClassStatus(lc.id, "completed")} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1">
                          <Square className="w-3 h-3" />End
                        </button>
                      )}
                      {lc.joinUrl && (
                        <a href={lc.joinUrl} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">Join</a>
                      )}
                      <button onClick={() => loadAttendance(lc.id)} className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50 transition-colors text-gray-500">Attend</button>
                    </div>
                  </div>
                </div>
              ))}
              {liveClasses.length === 0 && !showLcForm && (
                <div className="py-12 text-center"><Video className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No live classes yet</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Tests ── */}
        {tab === "tests" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold" style={{ color: NAVY }}>My Tests</h3>
              <Button size="sm" onClick={() => setShowTestForm(!showTestForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Create Test
              </Button>
            </div>

            {showTestForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Create New Test</h3>

                {/* Link to live class (auto-fills fields) */}
                <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700">Based on Live Class (optional)</p>
                  <p className="text-xs text-blue-500">Select a live class to auto-fill subject, grade &amp; date</p>
                  <Select value={testForm.liveClassId} onValueChange={pickLiveClassForTest}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue placeholder="Select live class…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {liveClasses.map(lc => (
                        <SelectItem key={lc.id} value={String(lc.id)}>
                          {lc.title} · {new Date(lc.scheduledAt).toLocaleDateString("en-IN")} · Grade {lc.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Test title *" value={testForm.title} onChange={e => setTestForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Select value={testForm.subjectId} onValueChange={v => setTestForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Grade *" type="number" min="1" max="10" value={testForm.grade} onChange={e => setTestForm(p => ({ ...p, grade: e.target.value }))} />
                  <Select value={testForm.courseId} onValueChange={v => setTestForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="datetime-local" value={testForm.scheduledAt} onChange={e => setTestForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                  <Input placeholder="Duration (min)" type="number" value={testForm.duration} onChange={e => setTestForm(p => ({ ...p, duration: e.target.value }))} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Questions ({testQuestions.length})</h4>
                    <Button size="sm" variant="outline" onClick={addTestQuestion} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add</Button>
                  </div>
                  {testQuestions.map((q, qi) => (
                    <div key={qi} className="rounded-xl border border-gray-200 p-4 space-y-2 bg-gray-50">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-black mt-2 w-5 flex-shrink-0" style={{ color: ORANGE }}>Q{qi + 1}</span>
                        <Input placeholder="Question text *" value={q.text} onChange={e => updateTestQuestion(qi, "text", e.target.value)} className="flex-1 bg-white" />
                        {testQuestions.length > 1 && (
                          <button onClick={() => removeTestQuestion(qi)} className="mt-1 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-7">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <input type="radio" name={`test-q${qi}`} checked={q.correctOption === oi} onChange={() => updateTestQuestion(qi, "correctOption", oi)} className="w-3.5 h-3.5 accent-orange-500 flex-shrink-0" />
                            <Input placeholder={`Option ${String.fromCharCode(65 + oi)} *`} value={opt} onChange={e => updateTestOption(qi, oi, e.target.value)} className="bg-white text-xs" />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 ml-7">Select the radio button next to the correct answer</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={createTest} disabled={busy || !testForm.title || !testForm.subjectId || !testForm.grade || !testForm.scheduledAt} className="text-white" style={{ background: ORANGE }}>
                    {busy ? "Creating…" : "Create Test"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowTestForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {tests.map(t => (
                <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm" style={{ color: NAVY }}>{t.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {t.subjectName} · Grade {t.grade} · {new Date(t.scheduledAt).toLocaleDateString("en-IN")} · {t.duration} min · {t.totalQuestions} Qs
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${t.status === "active" ? "bg-green-100 text-green-600" : t.status === "completed" ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-600"}`}>{t.status}</span>
                    <button onClick={() => deleteTest(t.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {tests.length === 0 && !showTestForm && (
                <div className="py-12 text-center"><ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No tests created yet</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Students ── */}
        {tab === "students" && (
          <div className="space-y-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Students in My Courses ({students.length})</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
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
                            <div className="font-medium text-sm" style={{ color: NAVY }}>{s.studentName}</div>
                            <div className="text-xs text-gray-400">{s.email ?? s.phone ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">Grade {s.grade}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.courseTitle}</td>
                      <td className="px-4 py-3"><span className="text-xs font-semibold" style={{ color: ORANGE }}>{s.points ?? 0} pts</span></td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No students enrolled yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Grade Submissions ── */}
        {tab === "submissions" && (
          <div className="space-y-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Submissions to Grade</h3>
            {grading && (
              <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-sm space-y-3">
                <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Grade Submission</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input type="number" placeholder="Marks *" value={grading.marks} onChange={e => setGrading(p => p ? { ...p, marks: e.target.value } : null)} />
                  <Input placeholder="Feedback (optional)" value={grading.feedback} onChange={e => setGrading(p => p ? { ...p, feedback: e.target.value } : null)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={gradeSubmission} disabled={busy || !grading.marks} className="text-white" style={{ background: ORANGE }}>Save Grade</Button>
                  <Button size="sm" variant="ghost" onClick={() => setGrading(null)}>Cancel</Button>
                </div>
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
                        {s.marks !== null && <span className="text-xs text-gray-500 font-medium">{s.marks} marks</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.homeworkTitle ?? s.assignmentTitle} · {new Date(s.submittedAt).toLocaleDateString("en-IN")}</div>
                      <div className="text-sm text-gray-600 mt-1.5 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">{s.answer}</div>
                      {s.feedback && <div className="text-xs text-blue-600 mt-1 italic">Feedback: {s.feedback}</div>}
                    </div>
                    {s.status !== "graded" && (
                      <Button size="sm" onClick={() => setGrading({ id: s.id, marks: "", feedback: "", type: "homework" })} className="text-white flex-shrink-0" style={{ background: ORANGE }}>Grade</Button>
                    )}
                  </div>
                </div>
              ))}
              {submissions.length === 0 && (
                <div className="py-12 text-center"><CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No submissions yet</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Attendance ── */}
        {tab === "attendance" && (
          <div className="space-y-4">
            <h3 className="font-bold" style={{ color: NAVY }}>Mark Attendance</h3>
            {attendanceClassId !== null ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm" style={{ color: NAVY }}>
                    {liveClasses.find(c => c.id === attendanceClassId)?.title ?? `Class #${attendanceClassId}`}
                  </h4>
                  <button onClick={() => setAttendanceClassId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No enrolled students found for this class</p>
                ) : (
                  <>
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setAttendanceRecords(prev => prev.map(r => ({ ...r, present: true })))} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 font-semibold hover:bg-green-100">Mark All Present</button>
                      <button onClick={() => setAttendanceRecords(prev => prev.map(r => ({ ...r, present: false })))} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-semibold hover:bg-red-100">Mark All Absent</button>
                    </div>
                    <div className="space-y-2">
                      {attendanceRecords.map((r, i) => (
                        <div key={r.studentId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY }}>{r.studentName[0]}</div>
                            <span className="text-sm font-medium" style={{ color: NAVY }}>{r.studentName}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setAttendanceRecords(prev => prev.map((rec, idx) => idx === i ? { ...rec, present: true } : rec))}
                              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${r.present ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>Present</button>
                            <button onClick={() => setAttendanceRecords(prev => prev.map((rec, idx) => idx === i ? { ...rec, present: false } : rec))}
                              className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${!r.present ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"}`}>Absent</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={saveAttendance} disabled={attendanceBusy} className="text-white" style={{ background: ORANGE }}>Save Attendance</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAttendanceClassId(null)}>Cancel</Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Pick a class to mark attendance:</p>
                {liveClasses.map(lc => (
                  <div key={lc.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: NAVY }}>{lc.title}</div>
                      <div className="text-xs text-gray-400">{new Date(lc.scheduledAt).toLocaleDateString("en-IN")} · Grade {lc.grade}</div>
                    </div>
                    <Button size="sm" onClick={() => loadAttendance(lc.id)} className="text-xs text-white" style={{ background: NAVY }}>Mark Attendance</Button>
                  </div>
                ))}
                {liveClasses.length === 0 && (
                  <div className="py-8 text-center"><Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No live classes yet</p></div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
