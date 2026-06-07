import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import { Student360Modal } from "@/pages/admin/student360-modal";
import {
  BookOpen, Users, Video, FileText, Clock, Plus, CheckCircle,
  GraduationCap, ChevronRight, X, ClipboardList, Play, Square, Trash2,
  LogOut, Link as LinkIcon, ExternalLink, Pencil, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

type Tab = "dashboard" | "courses" | "homework" | "live" | "submissions" | "tests" | "attendance" | "assignments" | "notes";

interface Course { id: number; title: string; subjectName: string; subjectId: number; grade: number; totalLessons: number; enrolledStudents: number; rating: number | null; }
interface LiveClass { id: number; title: string; teacher: string; scheduledAt: string; status: string; grade: number; duration: number; joinUrl: string | null; subjectId: number; courseId: number | null; chapterId: number | null; topicId: number | null; }
interface Homework { id: number; title: string; subjectId: number; subjectName: string; grade: number; courseId: number | null; liveClassId: number | null; chapterId: number | null; topicId: number | null; dueDate: string; maxMarks: number; description: string | null; questionsJson: string | null; homeworkType: string | null; driveLink: string | null; }
interface Assignment { id: number; title: string; subjectName: string; grade: number; dueDate: string; description: string | null; maxMarks: number; attachmentUrl: string | null; }
interface HwSubmission { id: number; homeworkId: number; homeworkTitle: string; homeworkType: string; maxMarks: number; questionsJson: string | null; studentId: number; studentName: string; answer: string; status: string; marks: number | null; feedback: string | null; submittedAt: string; }
interface AsgnSubmission { id: number; assignmentId: number; assignmentTitle: string; maxMarks: number; studentId: number; studentName: string; answer: string; status: string; marks: number | null; feedback: string | null; submittedAt: string; }
interface TestSubmission { id: number; testId: number; testTitle: string; subjectName: string; grade: number; totalQuestions: number; studentId: number; studentName: string; answers: string; score: number | null; maxScore: number | null; submittedAt: string; }
interface Submission { id: number; homeworkTitle?: string; assignmentTitle?: string; studentName: string; answer: string; status: string; marks: number | null; feedback: string | null; submittedAt: string; }
interface Subject { id: number; name: string; }
interface DashStats { teacherName: string; totalCourses: number; totalStudents: number; upcomingLiveClasses: number; pendingHomework: number; }
interface TeacherTest { id: number; title: string; subjectName: string; grade: number; scheduledAt: string; duration: number; totalQuestions: number; status: string; testType?: string; driveLink?: string | null; }
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
  const [hwSubmissions, setHwSubmissions] = useState<HwSubmission[]>([]);
  const [asgnSubmissions, setAsgnSubmissions] = useState<AsgnSubmission[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<TestSubmission[]>([]);
  const [gradeSubTab, setGradeSubTab] = useState<"mcq" | "written" | "tests" | "assignments">("mcq");
  const [submDate, setSubmDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [tests, setTests] = useState<TeacherTest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Homework form
  const [showHwForm, setShowHwForm] = useState(false);
  const [editingHw, setEditingHw] = useState<number | null>(null);
  const [hwType, setHwType] = useState<"mcq" | "writing">("writing");
  const [hwForm, setHwForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", chapterId: "", topicId: "", liveClassId: "", dueDate: "", description: "", maxMarks: "10", driveLink: "" });
  const [hwQuestions, setHwQuestions] = useState<HwQuestion[]>([newMcqQuestion()]);

  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "homework" | "test"; id: number; title: string } | null>(null);

  // Assignment form
  const [showAsgnForm, setShowAsgnForm] = useState(false);
  const [asgnForm, setAsgnForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", dueDate: "", description: "", maxMarks: "20", attachmentUrl: "" });

  // Live class form
  const [showLcForm, setShowLcForm] = useState(false);
  const [lcForm, setLcForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "60", joinUrl: "", chapterId: "", topicId: "" });
  const [lcChapters, setLcChapters] = useState<{ id: number; name: string }[]>([]);
  const [lcTopics, setLcTopics] = useState<{ id: number; name: string }[]>([]);

  // Test form
  const [showTestForm, setShowTestForm] = useState(false);
  const [testType, setTestType] = useState<"mcq" | "writing">("mcq");
  const [testForm, setTestForm] = useState({ title: "", subjectId: "", grade: "", courseId: "", chapterId: "", topicId: "", scheduledAt: "", duration: "30", liveClassId: "", driveLink: "" });
  const [testChapters, setTestChapters] = useState<{ id: number; name: string }[]>([]);
  const [testTopics, setTestTopics] = useState<{ id: number; name: string }[]>([]);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([
    { text: "", options: ["", "", "", ""], correctOption: 0 },
  ]);

  // Homework cascade
  const [hwChapters, setHwChapters] = useState<{ id: number; name: string }[]>([]);
  const [hwTopics, setHwTopics] = useState<{ id: number; name: string }[]>([]);

  // Notes
  interface Note { id: number; title: string; resourceType: string; url: string; description: string | null; topicId: number | null; chapterId: number | null; courseId: number | null; grade: number | null; createdAt: string; }
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", resourceType: "pdf", url: "", description: "", courseId: "", chapterId: "", topicId: "", grade: "" });
  const [noteChapters, setNoteChapters] = useState<{ id: number; name: string }[]>([]);
  const [noteTopics, setNoteTopics] = useState<{ id: number; name: string }[]>([]);

  // Grading
  const [grading, setGrading] = useState<{ id: number; marks: string; feedback: string; type: "homework" | "assignment" } | null>(null);
  const [submSearch, setSubmSearch] = useState("");
  const [submTypeFilter, setSubmTypeFilter] = useState<"all" | "pending" | "graded">("all");

  // Attendance
  const [attendanceClassId, setAttendanceClassId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [crmStudent, setCrmStudent] = useState<{ id: number; name: string } | null>(null);
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!isLoading && (role === "teacher" || role === "admin")) loadAll();
  }, [isLoading, role]);

  async function loadAll() {
    const [d, c, lc, hw, hwSub, asgnSub, testSub, subj, stu, tst, asgn, nts] = await Promise.all([
      apiFetch("/teacher/dashboard").then(r => r.ok ? r.json() : null),
      apiFetch("/teacher/courses").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/live-classes").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/homework").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/submissions/homework").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/submissions/assignments").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/submissions/tests").then(r => r.ok ? r.json() : []),
      apiFetch("/subjects").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/students").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/tests").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/assignments").then(r => r.ok ? r.json() : []),
      apiFetch("/teacher/notes").then(r => r.ok ? r.json() : []),
    ]);
    setDash(d); setCourses(c); setLiveClasses(lc); setHomework(hw);
    setSubmissions(hwSub);
    setHwSubmissions(hwSub); setAsgnSubmissions(asgnSub); setTestSubmissions(testSub);
    setSubjects(subj); setStudents(stu); setTests(tst); setAssignments(asgn); setNotes(nts);
  }

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  async function loadLcChapters(courseId: string) {
    if (!courseId) { setLcChapters([]); setLcTopics([]); return; }
    const r = await apiFetch(`/admin/chapters?courseId=${courseId}`);
    setLcChapters(r.ok ? await r.json() : []);
    setLcTopics([]);
  }

  async function loadLcTopics(chapterId: string) {
    if (!chapterId) { setLcTopics([]); return; }
    const r = await apiFetch(`/admin/topics?chapterId=${chapterId}`);
    setLcTopics(r.ok ? await r.json() : []);
  }

  async function loadHwChapters(courseId: string) {
    if (!courseId) { setHwChapters([]); setHwTopics([]); return; }
    const r = await apiFetch(`/admin/chapters?courseId=${courseId}`);
    setHwChapters(r.ok ? await r.json() : []);
    setHwTopics([]);
  }

  async function loadHwTopics(chapterId: string) {
    if (!chapterId) { setHwTopics([]); return; }
    const r = await apiFetch(`/admin/topics?chapterId=${chapterId}`);
    setHwTopics(r.ok ? await r.json() : []);
  }

  async function loadTestChapters(courseId: string) {
    if (!courseId) { setTestChapters([]); setTestTopics([]); return; }
    const r = await apiFetch(`/admin/chapters?courseId=${courseId}`);
    setTestChapters(r.ok ? await r.json() : []);
    setTestTopics([]);
  }

  async function loadTestTopics(chapterId: string) {
    if (!chapterId) { setTestTopics([]); return; }
    const r = await apiFetch(`/admin/topics?chapterId=${chapterId}`);
    setTestTopics(r.ok ? await r.json() : []);
  }

  async function loadNoteChapters(courseId: string) {
    if (!courseId) { setNoteChapters([]); setNoteTopics([]); return; }
    const r = await apiFetch(`/admin/chapters?courseId=${courseId}`);
    setNoteChapters(r.ok ? await r.json() : []);
    setNoteTopics([]);
  }

  async function loadNoteTopics(chapterId: string) {
    if (!chapterId) { setNoteTopics([]); return; }
    const r = await apiFetch(`/admin/topics?chapterId=${chapterId}`);
    setNoteTopics(r.ok ? await r.json() : []);
  }

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
    if (hwQuestions.length >= 10) return;
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
    // Auto-detect effective type: if any questions have text filled, treat as MCQ
    // regardless of toggle state — prevents writing/mcq mismatch if toggle is forgotten.
    const filledQs = hwQuestions.filter(q => q.text.trim());
    const effectiveType: "mcq" | "writing" = filledQs.length > 0 ? "mcq" : hwType;
    const validQs = effectiveType === "mcq" ? filledQs : [];
    const isEdit = editingHw !== null;

    const dueDateISO = new Date(hwForm.dueDate + ":00+05:30").toISOString();
    const payload = isEdit ? {
      title: hwForm.title,
      dueDate: dueDateISO,
      description: hwForm.description || null,
      maxMarks: Number(hwForm.maxMarks),
      homeworkType: effectiveType,
      driveLink: effectiveType === "writing" && hwForm.driveLink ? hwForm.driveLink : null,
      questionsJson: validQs.length > 0 ? validQs : null,
    } : {
      title: hwForm.title,
      subjectId: Number(hwForm.subjectId),
      grade: Number(hwForm.grade),
      courseId: hwForm.courseId ? Number(hwForm.courseId) : null,
      chapterId: hwForm.chapterId ? Number(hwForm.chapterId) : null,
      topicId: hwForm.topicId ? Number(hwForm.topicId) : null,
      liveClassId: hwForm.liveClassId ? Number(hwForm.liveClassId) : null,
      homeworkType: effectiveType,
      driveLink: effectiveType === "writing" && hwForm.driveLink ? hwForm.driveLink : null,
      dueDate: dueDateISO,
      description: hwForm.description || null,
      maxMarks: Number(hwForm.maxMarks),
      questionsJson: validQs.length > 0 ? validQs : null,
    };

    const r = await apiFetch(
      isEdit ? `/teacher/homework/${editingHw}` : "/teacher/homework",
      { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(payload) }
    );
    if (r.ok) {
      flash(isEdit ? "Homework updated!" : "Homework posted!");
      cancelHwForm();
      loadAll();
    } else {
      try { const d = await r.json(); flash(d.error ?? "Error saving homework", false); } catch { flash("Error saving homework", false); }
    }
    setBusy(false);
  }

  async function createAssignment() {
    setBusy(true);
    const r = await apiFetch("/teacher/assignments", {
      method: "POST",
      body: JSON.stringify({
        title: asgnForm.title,
        subjectId: Number(asgnForm.subjectId),
        grade: Number(asgnForm.grade),
        courseId: asgnForm.courseId ? Number(asgnForm.courseId) : null,
        dueDate: new Date(asgnForm.dueDate + ":00+05:30").toISOString(),
        description: asgnForm.description || null,
        maxMarks: Number(asgnForm.maxMarks),
        attachmentUrl: asgnForm.attachmentUrl || null,
      }),
    });
    if (r.ok) {
      flash("Assignment posted!");
      setShowAsgnForm(false);
      setAsgnForm({ title: "", subjectId: "", grade: "", courseId: "", dueDate: "", description: "", maxMarks: "20", attachmentUrl: "" });
      loadAll();
    } else {
      try { const d = await r.json(); flash(d.error ?? "Error posting assignment", false); } catch { flash("Error posting assignment", false); }
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
        scheduledAt: new Date(lcForm.scheduledAt + ":00+05:30").toISOString(),
      }),
    });
    if (r.ok) {
      flash("Live class scheduled!");
      setShowLcForm(false);
      setLcForm({ title: "", subjectId: "", grade: "", courseId: "", scheduledAt: "", duration: "60", joinUrl: "", chapterId: "", topicId: "" });
      setLcChapters([]); setLcTopics([]);
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
    if (testQuestions.length >= 30) return;
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
    if (!lcId) { setTestForm(p => ({ ...p, liveClassId: "" })); return; }
    const lc = liveClasses.find(l => l.id === Number(lcId));
    if (lc) {
      const d2 = new Date(lc.scheduledAt); const ist2 = new Date(d2.getTime() + 5.5*60*60*1000); const pp = (n: number) => String(n).padStart(2,"0"); const dt = `${ist2.getUTCFullYear()}-${pp(ist2.getUTCMonth()+1)}-${pp(ist2.getUTCDate())}T${pp(ist2.getUTCHours())}:${pp(ist2.getUTCMinutes())}`;
      setTestForm(p => ({
        ...p,
        liveClassId: lcId,
        subjectId: String(lc.subjectId),
        grade: String(lc.grade),
        scheduledAt: dt,
        courseId: lc.courseId ? String(lc.courseId) : p.courseId,
        chapterId: lc.chapterId ? String(lc.chapterId) : p.chapterId,
        topicId: lc.topicId ? String(lc.topicId) : p.topicId,
      }));
    }
  }

  async function pickLiveClassForHw(lcId: string) {
    if (!lcId) { setHwForm(p => ({ ...p, liveClassId: "" })); return; }
    const lc = liveClasses.find(l => l.id === Number(lcId));
    if (!lc) { setHwForm(p => ({ ...p, liveClassId: lcId })); return; }
    // Suggest due date = next day after the live class (in IST)
    const due = new Date(lc.scheduledAt);
    due.setUTCDate(due.getUTCDate() + 1);
    const dueIST = new Date(due.getTime() + 5.5*60*60*1000);
    const pp2 = (n: number) => String(n).padStart(2,"0");
    const dueDt = `${dueIST.getUTCFullYear()}-${pp2(dueIST.getUTCMonth()+1)}-${pp2(dueIST.getUTCDate())}T${pp2(dueIST.getUTCHours())}:${pp2(dueIST.getUTCMinutes())}`;
    setHwForm(p => ({
      ...p,
      liveClassId: lcId,
      subjectId: String(lc.subjectId),
      grade: String(lc.grade),
      courseId: lc.courseId ? String(lc.courseId) : p.courseId,
      chapterId: lc.chapterId ? String(lc.chapterId) : "",
      topicId: lc.topicId ? String(lc.topicId) : "",
      dueDate: dueDt,
    }));
    if (lc.chapterId && lc.topicId) {
      const tR = await apiFetch(`/admin/topics?chapterId=${lc.chapterId}`);
      if (tR.ok) setHwTopics(await tR.json());
    }
  }

  function openEditHw(h: Homework) {
    setEditingHw(h.id);
    // Detect type from questionsJson if present (backward-compat with rows that
    // defaulted homework_type='writing' before the column existed).
    let detectedType: "mcq" | "writing" = (h.homeworkType as "mcq" | "writing") ?? "writing";
    if (h.questionsJson) {
      try { if (JSON.parse(h.questionsJson).length > 0) detectedType = "mcq"; } catch { /* keep */ }
    }
    setHwType(detectedType);
    setHwForm({
      title: h.title,
      subjectId: String(h.subjectId),
      grade: String(h.grade),
      courseId: h.courseId ? String(h.courseId) : "",
      chapterId: h.chapterId ? String(h.chapterId) : "",
      topicId: h.topicId ? String(h.topicId) : "",
      liveClassId: h.liveClassId ? String(h.liveClassId) : "",
      dueDate: h.dueDate ? (() => { const d = new Date(h.dueDate); const ist = new Date(d.getTime() + 5.5*60*60*1000); const p = (n: number) => String(n).padStart(2,"0"); return `${ist.getUTCFullYear()}-${p(ist.getUTCMonth()+1)}-${p(ist.getUTCDate())}T${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}`; })() : "",
      description: h.description ?? "",
      maxMarks: String(h.maxMarks),
      driveLink: h.driveLink ?? "",
    });
    if (h.questionsJson) {
      try { setHwQuestions(JSON.parse(h.questionsJson)); } catch { setHwQuestions([newMcqQuestion()]); }
    } else {
      setHwQuestions([newMcqQuestion()]);
    }
    setShowHwForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelHwForm() {
    setShowHwForm(false);
    setEditingHw(null);
    setHwForm({ title: "", subjectId: "", grade: "", courseId: "", chapterId: "", topicId: "", liveClassId: "", dueDate: "", description: "", maxMarks: "10", driveLink: "" });
    setHwChapters([]); setHwTopics([]);
    setHwQuestions([newMcqQuestion()]);
    setHwType("writing");
  }

  function deleteHomework(id: number) {
    const hw = homework.find(h => h.id === id);
    setDeleteConfirm({ type: "homework", id, title: hw?.title ?? "this homework" });
  }

  async function createTest() {
    setBusy(true);
    const validQs = testType === "mcq" ? testQuestions.filter(q => q.text.trim() && q.options.every(o => o.trim())) : [];
    const r = await apiFetch("/teacher/tests", {
      method: "POST",
      body: JSON.stringify({
        title: testForm.title,
        subjectId: Number(testForm.subjectId),
        grade: Number(testForm.grade),
        courseId: testForm.courseId ? Number(testForm.courseId) : null,
        chapterId: testForm.chapterId ? Number(testForm.chapterId) : null,
        topicId: testForm.topicId ? Number(testForm.topicId) : null,
        scheduledAt: testForm.scheduledAt,
        duration: Number(testForm.duration),
        testType,
        driveLink: testType === "writing" && testForm.driveLink ? testForm.driveLink : null,
        questions: validQs,
      }),
    });
    if (r.ok) {
      flash("Test created!");
      setShowTestForm(false);
      setTestForm({ title: "", subjectId: "", grade: "", courseId: "", chapterId: "", topicId: "", scheduledAt: "", duration: "30", liveClassId: "", driveLink: "" });
      setTestChapters([]); setTestTopics([]);
      setTestQuestions([{ text: "", options: ["", "", "", ""], correctOption: 0 }]);
      setTestType("mcq");
      loadAll();
    } else {
      try { const d = await r.json(); flash(d.error ?? "Error creating test", false); } catch { flash("Error creating test", false); }
    }
    setBusy(false);
  }

  function deleteTest(id: number) {
    const t = tests.find(t => t.id === id);
    setDeleteConfirm({ type: "test", id, title: t?.title ?? "this test" });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    const url = type === "homework" ? `/teacher/homework/${id}` : `/teacher/tests/${id}`;
    const r = await apiFetch(url, { method: "DELETE" });
    if (r.ok) {
      flash(type === "homework" ? "Homework deleted" : "Test deleted");
      loadAll();
    } else {
      try { const d = await r.json(); flash(d.error ?? "Delete failed", false); } catch { flash("Delete failed", false); }
    }
    setDeleteConfirm(null);
  }

  // ── Notes / Resources ──────────────────────────────────────────
  async function createNote() {
    if (!noteForm.title || !noteForm.url) return;
    setBusy(true);
    const r = await apiFetch("/teacher/notes", {
      method: "POST",
      body: JSON.stringify({
        title: noteForm.title,
        resourceType: noteForm.resourceType,
        url: noteForm.url,
        description: noteForm.description || null,
        courseId: noteForm.courseId ? Number(noteForm.courseId) : null,
        chapterId: noteForm.chapterId ? Number(noteForm.chapterId) : null,
        topicId: noteForm.topicId ? Number(noteForm.topicId) : null,
        grade: noteForm.grade ? Number(noteForm.grade) : null,
      }),
    });
    if (r.ok) {
      flash("Resource added!");
      setShowNoteForm(false);
      setNoteForm({ title: "", resourceType: "pdf", url: "", description: "", courseId: "", chapterId: "", topicId: "", grade: "" });
      setNoteChapters([]); setNoteTopics([]);
      loadAll();
    } else flash("Error adding resource", false);
    setBusy(false);
  }

  async function deleteNote(id: number) {
    await apiFetch(`/teacher/notes/${id}`, { method: "DELETE" });
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
    if (r.ok) { flash("✅ Graded!"); setGrading(null); loadAll(); }
    else flash("Failed to grade", false);
    setBusy(false);
  }

  // Helper: filter submissions by selected date (IST)
  function matchesDate(isoTs: string, dateStr: string) {
    const d = new Date(isoTs);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    const y = ist.getUTCFullYear(), mo = String(ist.getUTCMonth() + 1).padStart(2, "0"), dy = String(ist.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${dy}` === dateStr;
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
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "notes", label: "Notes & Resources", icon: LinkIcon },
    { id: "submissions", label: "Grade Work", icon: CheckCircle },
    { id: "attendance", label: "Attendance", icon: Clock },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete {deleteConfirm?.type === "homework" ? "Homework" : "Test"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-600">
              You are about to permanently delete{" "}
              <span className="font-semibold text-gray-800">"{deleteConfirm?.title}"</span>.
              {deleteConfirm?.type === "homework"
                ? " All student submissions for this homework will also be removed."
                : " All questions and student attempts will be permanently removed."}
              {" "}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white">
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "My Courses", value: dash.totalCourses, color: NAVY },
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
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.totalLessons} lessons</span>
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
                <div className="grid grid-cols-1 gap-2 text-xs">
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
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>
                  {editingHw ? "✏️ Edit Homework" : "New Homework"}
                </h3>

                {/* Type Toggle — shown for both new and edit homework */}
                <div className="flex gap-2">
                  {(["writing", "mcq"] as const).map(t => (
                    <button key={t} onClick={() => setHwType(t)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${hwType === t ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}
                      style={hwType === t ? { background: ORANGE, borderColor: ORANGE } : {}}>
                      {t === "writing" ? "✍ Writing Work" : "📝 MCQ Quiz"}
                    </button>
                  ))}
                </div>

                {/* Step 1: Pick Live Class (primary selector for new homework) */}
                {!editingHw && (
                  <div className="rounded-xl p-3 space-y-2 sm:col-span-2" style={{ background: "#EEF3FB" }}>
                    <p className="text-xs font-bold" style={{ color: NAVY }}>📚 Based on which live class?</p>
                    <p className="text-xs text-gray-500">Select today's class — subject, grade, chapter &amp; topic will auto-fill</p>
                    <Select value={hwForm.liveClassId || "__none__"} onValueChange={v => pickLiveClassForHw(v === "__none__" ? "" : v)}>
                      <SelectTrigger className="bg-white text-xs"><SelectValue placeholder="Select live class…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No specific class</SelectItem>
                        {liveClasses.map(lc => (
                          <SelectItem key={lc.id} value={String(lc.id)}>
                            {lc.title} · {new Date(lc.scheduledAt).toLocaleDateString("en-IN")} · Grade {lc.grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hwForm.liveClassId && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {hwForm.subjectId && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">📖 {subjects.find(s => s.id === Number(hwForm.subjectId))?.name ?? "Subject"}</span>}
                        {hwForm.grade && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">🎓 Grade {hwForm.grade}</span>}
                        {hwForm.courseId && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">📘 {courses.find(c => c.id === Number(hwForm.courseId))?.title ?? "Course"}</span>}
                        {hwForm.chapterId && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">📂 Chapter linked</span>}
                        {hwForm.topicId && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">🏷 Topic linked</span>}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={hwForm.title} onChange={e => setHwForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />

                  {/* Subject + Grade — shown when no live class selected (manual), or always for edit */}
                  {(!hwForm.liveClassId || editingHw) && (
                    <>
                      <Select value={hwForm.subjectId} onValueChange={v => setHwForm(p => ({ ...p, subjectId: v }))} disabled={!!editingHw}>
                        <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input placeholder="Grade *" type="number" min="1" max="10" value={hwForm.grade} onChange={e => setHwForm(p => ({ ...p, grade: e.target.value }))} disabled={!!editingHw} />
                    </>
                  )}

                  {/* Manual Course → Chapter → Topic cascade (only when no live class auto-filled) */}
                  {!hwForm.liveClassId && !editingHw && (
                    <>
                      <Select value={hwForm.courseId || "__none__"} onValueChange={v => { const id = v === "__none__" ? "" : v; setHwForm(p => ({ ...p, courseId: id, chapterId: "", topicId: "" })); loadHwChapters(id); }}>
                        <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No course</SelectItem>
                          {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {hwChapters.length > 0 && (
                        <Select value={hwForm.chapterId || "__none__"} onValueChange={v => { const id = v === "__none__" ? "" : v; setHwForm(p => ({ ...p, chapterId: id, topicId: "" })); loadHwTopics(id); }}>
                          <SelectTrigger><SelectValue placeholder="Chapter (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No chapter</SelectItem>
                            {hwChapters.map(ch => <SelectItem key={ch.id} value={String(ch.id)}>{ch.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      {hwTopics.length > 0 && (
                        <Select value={hwForm.topicId || "__none__"} onValueChange={v => setHwForm(p => ({ ...p, topicId: v === "__none__" ? "" : v }))}>
                          <SelectTrigger><SelectValue placeholder="Topic (optional)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No topic</SelectItem>
                            {hwTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}

                  <Input type="datetime-local" value={hwForm.dueDate} onChange={e => setHwForm(p => ({ ...p, dueDate: e.target.value }))} />
                  <Input placeholder="Max marks" type="number" value={hwForm.maxMarks} onChange={e => setHwForm(p => ({ ...p, maxMarks: e.target.value }))} />
                  <Textarea placeholder="Instructions / description" value={hwForm.description} onChange={e => setHwForm(p => ({ ...p, description: e.target.value }))} className="sm:col-span-2" rows={2} />
                </div>

                {/* MCQ Questions */}
                {hwType === "mcq" && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold" style={{ color: NAVY }}>Questions
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${hwQuestions.length >= 10 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>{hwQuestions.length}/10</span>
                      </span>
                    </div>
                    {hwQuestions.map((q, qi) => (
                      <div key={qi} className="rounded-xl border border-gray-200 p-4 space-y-2 bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black w-5 flex-shrink-0" style={{ color: ORANGE }}>Q{qi + 1}</span>
                          <Input placeholder="Question *" value={q.text} onChange={e => updateHwQuestion(qi, "text", e.target.value)} className="flex-1 bg-white" />
                          <button onClick={() => toggleHwQuestionType(qi)}
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
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => addHwQuestion("mcq")} disabled={hwQuestions.length >= 10} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add MCQ</Button>
                      <Button size="sm" variant="outline" onClick={() => addHwQuestion("truefalse")} disabled={hwQuestions.length >= 10} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add True/False</Button>
                    </div>
                  </div>
                )}

                {/* Writing Type: Drive Link */}
                {hwType === "writing" && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium">📎 Attach a Google Drive link for students to reference</p>
                    <Input
                      placeholder="Google Drive link (optional)"
                      value={hwForm.driveLink}
                      onChange={e => setHwForm(p => ({ ...p, driveLink: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400 mt-1">Students will see this link and submit their written work as an image upload</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={createHomework} disabled={busy || !hwForm.title || (!editingHw && (!hwForm.subjectId || !hwForm.grade)) || !hwForm.dueDate} className="text-white" style={{ background: ORANGE }}>
                    {busy ? (editingHw ? "Saving…" : "Posting…") : (editingHw ? "Save Changes" : "Post Homework")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelHwForm}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {homework.map(h => {
                let qCount = 0;
                try { if (h.questionsJson) qCount = JSON.parse(h.questionsJson).length; } catch { /**/ }
                const linkedLc = h.liveClassId ? liveClasses.find(lc => lc.id === h.liveClassId) : null;
                return (
                  <div key={h.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: NAVY }}>{h.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {h.subjectName} · Grade {h.grade} · Due {new Date(h.dueDate).toLocaleDateString("en-IN")}
                          {qCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold">{qCount} Qs</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {h.homeworkType === "mcq" && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">📝 MCQ</span>}
                          {linkedLc && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">🎥 {linkedLc.title}</span>}
                          {h.chapterId && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-medium">📂 Chapter</span>}
                          {h.topicId && <span className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded font-medium">🏷 Topic</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-semibold">{h.maxMarks} marks</span>
                        <button onClick={() => openEditHw(h)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteHomework(h.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
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
                  <Select value={lcForm.courseId || "__none__"} onValueChange={v => {
                    const val = v === "__none__" ? "" : v;
                    setLcForm(p => ({ ...p, courseId: val, chapterId: "", topicId: "" }));
                    loadLcChapters(val);
                  }}>
                    <SelectTrigger><SelectValue placeholder="① Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {lcChapters.length > 0 ? (
                    <Select value={lcForm.chapterId || "__none__"} onValueChange={v => {
                      const val = v === "__none__" ? "" : v;
                      setLcForm(p => ({ ...p, chapterId: val, topicId: "" }));
                      loadLcTopics(val);
                    }}>
                      <SelectTrigger><SelectValue placeholder="② Chapter (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No chapter</SelectItem>
                        {lcChapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : lcForm.courseId ? (
                    <Input placeholder="② Chapter name (optional)" value={lcForm.chapterId}
                      onChange={e => setLcForm(p => ({ ...p, chapterId: e.target.value }))} />
                  ) : null}
                  {lcTopics.length > 0 ? (
                    <Select value={lcForm.topicId || "__none__"} onValueChange={v => setLcForm(p => ({ ...p, topicId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="③ Topic (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No topic</SelectItem>
                        {lcTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (lcChapters.length > 0 && lcForm.chapterId) ? (
                    <Input placeholder="③ Topic name (optional)" value={lcForm.topicId}
                      onChange={e => setLcForm(p => ({ ...p, topicId: e.target.value }))} />
                  ) : null}
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
                          {new Date(lc.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} · {lc.duration} min · Grade {lc.grade}
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

                {/* Type Toggle */}
                <div className="flex gap-2">
                  {(["mcq", "writing"] as const).map(t => (
                    <button key={t} onClick={() => setTestType(t)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${testType === t ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}
                      style={testType === t ? { background: ORANGE, borderColor: ORANGE } : {}}>
                      {t === "mcq" ? "📝 MCQ Test" : "✍ Writing Test"}
                    </button>
                  ))}
                </div>

                {/* Link to live class */}
                <div className="bg-blue-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700">Based on Live Class (optional)</p>
                  <p className="text-xs text-blue-500">Select a live class to auto-fill subject, grade &amp; date</p>
                  <Select value={testForm.liveClassId || "__none__"} onValueChange={v => pickLiveClassForTest(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="bg-white text-xs"><SelectValue placeholder="Select live class…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
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
                  <Select value={testForm.courseId || "__none__"} onValueChange={v => { const id = v === "__none__" ? "" : v; setTestForm(p => ({ ...p, courseId: id, chapterId: "", topicId: "" })); loadTestChapters(id); }}>
                    <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {testChapters.length > 0 && (
                    <Select value={testForm.chapterId || "__none__"} onValueChange={v => { const id = v === "__none__" ? "" : v; setTestForm(p => ({ ...p, chapterId: id, topicId: "" })); loadTestTopics(id); }}>
                      <SelectTrigger><SelectValue placeholder="Chapter (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No chapter</SelectItem>
                        {testChapters.map(ch => <SelectItem key={ch.id} value={String(ch.id)}>{ch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {testTopics.length > 0 && (
                    <Select value={testForm.topicId || "__none__"} onValueChange={v => setTestForm(p => ({ ...p, topicId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Topic (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No topic</SelectItem>
                        {testTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Input type="datetime-local" value={testForm.scheduledAt} onChange={e => setTestForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                  <Input placeholder="Duration (min)" type="number" value={testForm.duration} onChange={e => setTestForm(p => ({ ...p, duration: e.target.value }))} />
                </div>

                {/* MCQ Questions */}
                {testType === "mcq" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Questions
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${testQuestions.length >= 30 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600"}`}>{testQuestions.length}/30</span>
                      </h4>
                      <Button size="sm" variant="outline" onClick={addTestQuestion} disabled={testQuestions.length >= 30} className="gap-1 text-xs"><Plus className="w-3 h-3" /> Add</Button>
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
                )}

                {/* Writing Test: Drive Link */}
                {testType === "writing" && (
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <p className="text-xs font-medium text-gray-600">📎 Attach a Google Drive link with the test paper for students</p>
                    <Input
                      placeholder="Google Drive link *"
                      value={testForm.driveLink}
                      onChange={e => setTestForm(p => ({ ...p, driveLink: e.target.value }))}
                    />
                    <p className="text-xs text-gray-400">Students will see this link and upload their answer as an image</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" onClick={createTest}
                    disabled={busy || !testForm.title || !testForm.subjectId || !testForm.grade || !testForm.scheduledAt || (testType === "writing" && !testForm.driveLink)}
                    className="text-white" style={{ background: ORANGE }}>
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


        {/* ── Assignments ── */}
        {tab === "assignments" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold" style={{ color: NAVY }}>Assignments</h3>
              <Button size="sm" onClick={() => setShowAsgnForm(!showAsgnForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Post Assignment
              </Button>
            </div>

            {showAsgnForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Assignment</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={asgnForm.title} onChange={e => setAsgnForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Select value={asgnForm.subjectId} onValueChange={v => setAsgnForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Grade *" type="number" min="1" max="10" value={asgnForm.grade} onChange={e => setAsgnForm(p => ({ ...p, grade: e.target.value }))} />
                  <Select value={asgnForm.courseId || "__none__"} onValueChange={v => setAsgnForm(p => ({ ...p, courseId: v === "__none__" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="datetime-local" value={asgnForm.dueDate} onChange={e => setAsgnForm(p => ({ ...p, dueDate: e.target.value }))} />
                  <Input placeholder="Max marks" type="number" value={asgnForm.maxMarks} onChange={e => setAsgnForm(p => ({ ...p, maxMarks: e.target.value }))} />
                  <Textarea placeholder="Instructions / description" value={asgnForm.description} onChange={e => setAsgnForm(p => ({ ...p, description: e.target.value }))} className="sm:col-span-2" rows={2} />
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-600">📎 Attach a Google Drive / external resource link</p>
                  <Input
                    placeholder="Resource / Drive link (optional)"
                    value={asgnForm.attachmentUrl}
                    onChange={e => setAsgnForm(p => ({ ...p, attachmentUrl: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={createAssignment} disabled={busy || !asgnForm.title || !asgnForm.subjectId || !asgnForm.grade || !asgnForm.dueDate} className="text-white" style={{ background: ORANGE }}>
                    {busy ? "Posting…" : "Post Assignment"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAsgnForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: NAVY }}>{a.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {a.subjectName} · Grade {a.grade} · Due {new Date(a.dueDate).toLocaleDateString("en-IN")}
                    </div>
                    {a.description && <div className="text-xs text-gray-500 mt-1 line-clamp-1">{a.description}</div>}
                    {a.attachmentUrl && (
                      <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                        📎 View resource
                      </a>
                    )}
                  </div>
                  <span className="ml-3 text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-semibold flex-shrink-0">{a.maxMarks} marks</span>
                </div>
              ))}
              {assignments.length === 0 && !showAsgnForm && (
                <div className="py-12 text-center">
                  <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No assignments posted yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Notes & Resources ── */}
        {tab === "notes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold" style={{ color: NAVY }}>Notes &amp; Resources</h3>
              <Button size="sm" onClick={() => setShowNoteForm(!showNoteForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Add Resource
              </Button>
            </div>

            {showNoteForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-4">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Resource / Note</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={noteForm.title} onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />

                  {/* Resource type */}
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Resource Type</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "pdf", label: "📄 PDF Link" },
                        { id: "drive", label: "📁 Google Drive" },
                        { id: "youtube", label: "▶️ YouTube" },
                        { id: "website", label: "🌐 Website" },
                      ].map(rt => (
                        <button key={rt.id} onClick={() => setNoteForm(p => ({ ...p, resourceType: rt.id }))}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all ${noteForm.resourceType === rt.id ? "text-white border-transparent" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"}`}
                          style={noteForm.resourceType === rt.id ? { background: ORANGE, borderColor: ORANGE } : {}}>
                          {rt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input placeholder="URL / Link *" value={noteForm.url} onChange={e => setNoteForm(p => ({ ...p, url: e.target.value }))} className="sm:col-span-2" />

                  {/* Course → Chapter → Topic cascade */}
                  <Select value={noteForm.courseId || "__none__"} onValueChange={v => { const id = v === "__none__" ? "" : v; setNoteForm(p => ({ ...p, courseId: id, chapterId: "", topicId: "" })); loadNoteChapters(id); }}>
                    <SelectTrigger><SelectValue placeholder="Course (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No course</SelectItem>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Grade (optional)" type="number" min="1" max="10" value={noteForm.grade} onChange={e => setNoteForm(p => ({ ...p, grade: e.target.value }))} />

                  {noteChapters.length > 0 && (
                    <Select value={noteForm.chapterId || "__none__"} onValueChange={v => { const id = v === "__none__" ? "" : v; setNoteForm(p => ({ ...p, chapterId: id, topicId: "" })); loadNoteTopics(id); }}>
                      <SelectTrigger><SelectValue placeholder="Chapter (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No chapter</SelectItem>
                        {noteChapters.map(ch => <SelectItem key={ch.id} value={String(ch.id)}>{ch.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {noteTopics.length > 0 && (
                    <Select value={noteForm.topicId || "__none__"} onValueChange={v => setNoteForm(p => ({ ...p, topicId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Topic (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No topic</SelectItem>
                        {noteTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}

                  <Textarea placeholder="Description / notes (optional)" value={noteForm.description} onChange={e => setNoteForm(p => ({ ...p, description: e.target.value }))} className="sm:col-span-2" rows={2} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={createNote} disabled={busy || !noteForm.title || !noteForm.url} className="text-white" style={{ background: ORANGE }}>
                    {busy ? "Saving…" : "Save Resource"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowNoteForm(false); setNoteForm({ title: "", resourceType: "pdf", url: "", description: "", courseId: "", chapterId: "", topicId: "", grade: "" }); setNoteChapters([]); setNoteTopics([]); }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Resource type icons */}
            {(() => {
              const typeIcon: Record<string, string> = { pdf: "📄", drive: "📁", youtube: "▶️", website: "🌐" };
              const typeColor: Record<string, string> = { pdf: "bg-red-50 text-red-600", drive: "bg-blue-50 text-blue-600", youtube: "bg-rose-50 text-rose-600", website: "bg-green-50 text-green-600" };
              return (
                <div className="space-y-3">
                  {notes.map(n => (
                    <div key={n.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className={`flex-shrink-0 text-lg w-9 h-9 rounded-xl flex items-center justify-center ${typeColor[n.resourceType] ?? "bg-gray-100 text-gray-500"}`}>
                          {typeIcon[n.resourceType] ?? "📎"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate" style={{ color: NAVY }}>{n.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5 capitalize">{n.resourceType} resource</div>
                          {n.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{n.description}</div>}
                          <a href={n.url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs font-medium hover:underline"
                            style={{ color: ORANGE }}>
                            <ExternalLink className="w-3 h-3" /> Open Resource
                          </a>
                        </div>
                      </div>
                      <button onClick={() => deleteNote(n.id)} className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors mt-0.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {notes.length === 0 && !showNoteForm && (
                    <div className="py-12 text-center">
                      <LinkIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No resources added yet</p>
                      <p className="text-gray-300 text-xs mt-1">Add PDF, Drive, YouTube or website links for students</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Grade Submissions ── */}
        {tab === "submissions" && (() => {
          // ── helpers ────────────────────────────────────────────
          function fmtDate(iso: string) {
            return new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
          }
          function mcqBreakdown(answer: string, questionsJson: string | null): { correct: number; wrong: number; total: number; rows: { q: number; selected: number; correct: number; ok: boolean }[] } | null {
            try {
              const selected = JSON.parse(answer) as number[];
              if (!Array.isArray(selected)) return null;
              if (!questionsJson) return { correct: 0, wrong: 0, total: selected.length, rows: [] };
              const qs = JSON.parse(questionsJson) as Array<{ correctOption: number }>;
              let correct = 0;
              const rows = selected.map((sel, i) => {
                const ok = sel === qs[i]?.correctOption;
                if (ok) correct++;
                return { q: i + 1, selected: sel, correct: qs[i]?.correctOption ?? -1, ok };
              });
              return { correct, wrong: selected.length - correct, total: selected.length, rows };
            } catch { return null; }
          }
          const LETTERS = ["A", "B", "C", "D", "E"];

          // ── date-filtered slices ────────────────────────────────
          const mcqSubs   = hwSubmissions.filter(s => s.homeworkType === "mcq"     && (submDate ? matchesDate(s.submittedAt, submDate) : true));
          const writSubs  = hwSubmissions.filter(s => s.homeworkType !== "mcq"     && (submDate ? matchesDate(s.submittedAt, submDate) : true));
          const testSubs  = testSubmissions.filter(s =>                               submDate ? matchesDate(s.submittedAt, submDate) : true);
          const asgnSubs  = asgnSubmissions.filter(s =>                               submDate ? matchesDate(s.submittedAt, submDate) : true);

          const pendingWritten = writSubs.filter(s => s.status !== "graded").length;
          const pendingAsgn    = asgnSubs.filter(s => s.status !== "graded").length;
          const totalPending   = pendingWritten + pendingAsgn;

          const SUBTABS: { key: typeof gradeSubTab; label: string; count?: number }[] = [
            { key: "mcq",         label: "MCQs",        count: mcqSubs.length },
            { key: "written",     label: "Written",      count: writSubs.length },
            { key: "tests",       label: "Tests",        count: testSubs.length },
            { key: "assignments", label: "Assignments",  count: asgnSubs.length },
          ];

          return (
            <div className="space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-lg" style={{ color: NAVY }}>Grade Work</h3>
                <div className="flex items-center gap-2">
                  {totalPending > 0 && <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-600 font-semibold">{totalPending} pending</span>}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Date:</span>
                    <input
                      type="date"
                      value={submDate}
                      onChange={e => setSubmDate(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      style={{ colorScheme: "light" }}
                    />
                    {submDate && <button onClick={() => setSubmDate("")} className="text-xs text-gray-400 hover:text-gray-600">All</button>}
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 flex-wrap">
                {SUBTABS.map(st => (
                  <button key={st.key}
                    onClick={() => { setGradeSubTab(st.key); setGrading(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all flex items-center gap-1 ${gradeSubTab === st.key ? "text-white border-transparent" : "text-gray-500 border-gray-200 bg-white"}`}
                    style={gradeSubTab === st.key ? { background: NAVY, borderColor: NAVY } : {}}>
                    {st.label}
                    {st.count !== undefined && st.count > 0 && (
                      <span className={`rounded-full px-1.5 text-[10px] font-bold ${gradeSubTab === st.key ? "bg-white/20" : "bg-gray-100 text-gray-600"}`}>{st.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Grade form (written & assignments) */}
              {grading && (
                <div className="bg-white rounded-2xl p-4 border-2 shadow-sm space-y-3" style={{ borderColor: ORANGE }}>
                  <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Enter Marks</h4>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Input type="number" min="0" placeholder="Marks *" value={grading.marks} onChange={e => setGrading(p => p ? { ...p, marks: e.target.value } : null)} />
                    <Input placeholder="Feedback (optional)" value={grading.feedback} onChange={e => setGrading(p => p ? { ...p, feedback: e.target.value } : null)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={gradeSubmission} disabled={busy || !grading.marks} className="text-white" style={{ background: ORANGE }}>Save Grade</Button>
                    <Button size="sm" variant="ghost" onClick={() => setGrading(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* ── MCQ tab ── */}
              {gradeSubTab === "mcq" && (
                <div className="space-y-3">
                  {mcqSubs.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">No MCQ submissions{submDate ? " on this date" : ""}</div>}
                  {mcqSubs.map(s => {
                    const bd = mcqBreakdown(s.answer, s.questionsJson);
                    return (
                      <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <button onClick={() => setCrmStudent({ id: s.studentId, name: s.studentName })} className="font-semibold text-sm hover:underline" style={{ color: NAVY }}>{s.studentName}</button>
                            <span className="ml-2 text-xs text-gray-400">{s.homeworkTitle}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{fmtDate(s.submittedAt)}</span>
                            {s.marks !== null && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{s.marks}/{s.maxMarks} marks</span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-semibold">Auto-graded ✓</span>
                          </div>
                        </div>
                        {/* Score bar */}
                        {bd && (
                          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex gap-4 text-xs font-semibold">
                              <span className="text-green-600">✓ Correct: {bd.correct}</span>
                              <span className="text-red-500">✗ Wrong: {bd.wrong}</span>
                              <span className="text-gray-500">Total: {bd.total}</span>
                            </div>
                            {bd.rows.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {bd.rows.map(r => (
                                  <span key={r.q} className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${r.ok ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                    Q{r.q}: {LETTERS[r.selected] ?? "?"} {!r.ok && `(✓${LETTERS[r.correct] ?? "?"})`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Written tab ── */}
              {gradeSubTab === "written" && (
                <div className="space-y-3">
                  {writSubs.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">No written submissions{submDate ? " on this date" : ""}</div>}
                  {writSubs.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setCrmStudent({ id: s.studentId, name: s.studentName })} className="font-semibold text-sm hover:underline" style={{ color: NAVY }}>{s.studentName}</button>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status === "graded" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                            {s.marks !== null && <span className="text-xs text-gray-500 font-medium">{s.marks}/{s.maxMarks} marks</span>}
                          </div>
                          <div className="text-xs text-gray-400">{s.homeworkTitle} · {fmtDate(s.submittedAt)}</div>
                          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-28 overflow-y-auto">{s.answer}</div>
                          {s.feedback && <div className="text-xs text-blue-600 italic">Feedback: {s.feedback}</div>}
                        </div>
                        {s.status !== "graded" && (
                          <Button size="sm" onClick={() => setGrading({ id: s.id, marks: "", feedback: "", type: "homework" })} className="text-white flex-shrink-0" style={{ background: ORANGE }}>Grade</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Tests tab ── */}
              {gradeSubTab === "tests" && (
                <div className="space-y-3">
                  {testSubs.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">No test submissions{submDate ? " on this date" : ""}</div>}
                  {testSubs.map(s => {
                    const pct = s.maxScore && s.maxScore > 0 ? Math.round((s.score ?? 0) / s.maxScore * 100) : null;
                    return (
                      <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <button onClick={() => setCrmStudent({ id: s.studentId, name: s.studentName })} className="font-semibold text-sm hover:underline" style={{ color: NAVY }}>{s.studentName}</button>
                            <span className="ml-2 text-xs text-gray-400">{s.testTitle} · Grade {s.grade}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{fmtDate(s.submittedAt)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct !== null && pct >= 50 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                              {s.score ?? 0}/{s.maxScore ?? "?"} {pct !== null ? `(${pct}%)` : ""}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold">Auto-graded ✓</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">{s.subjectName}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Assignments tab ── */}
              {gradeSubTab === "assignments" && (
                <div className="space-y-3">
                  {asgnSubs.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">No assignment submissions{submDate ? " on this date" : ""}</div>}
                  {asgnSubs.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setCrmStudent({ id: s.studentId, name: s.studentName })} className="font-semibold text-sm hover:underline" style={{ color: NAVY }}>{s.studentName}</button>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status === "graded" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span>
                            {s.marks !== null && <span className="text-xs text-gray-500 font-medium">{s.marks}/{s.maxMarks} marks</span>}
                          </div>
                          <div className="text-xs text-gray-400">{s.assignmentTitle} · {fmtDate(s.submittedAt)}</div>
                          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-28 overflow-y-auto">{s.answer}</div>
                          {s.feedback && <div className="text-xs text-blue-600 italic">Feedback: {s.feedback}</div>}
                        </div>
                        {s.status !== "graded" && (
                          <Button size="sm" onClick={() => setGrading({ id: s.id, marks: "", feedback: "", type: "assignment" })} className="text-white flex-shrink-0" style={{ background: ORANGE }}>Grade</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

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
                            <button onClick={() => setCrmStudent({ id: r.studentId, name: r.studentName })} className="text-sm font-medium hover:underline" style={{ color: NAVY }}>{r.studentName}</button>
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

      {crmStudent !== null && (
        <Student360Modal userId={crmStudent.id} userName={crmStudent.name} userEmail={null} onClose={() => setCrmStudent(null)} />
      )}
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
