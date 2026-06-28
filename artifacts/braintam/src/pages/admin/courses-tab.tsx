import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, ChevronRight, BookOpen, GraduationCap, Layers, Tag,
  Video, FileText, ClipboardList, PlayCircle, RotateCcw, Edit3, Search,
  Archive, CheckCircle2, Clock, ChevronDown, ChevronUp, Pencil, X,
  Users, Upload, ImageIcon, FileUp, AlertCircle, CheckCircle,
  BarChart3, Calendar, DollarSign, UserCheck, ArrowLeft,
  BookMarked, TrendingUp, Send, Zap, Shield,
  Eye, LayoutGrid, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

function crsCode(id: number) { return `CRS${String(id).padStart(4, "0")}`; }
function chpCode(id: number) { return `CHP${String(id).padStart(4, "0")}`; }
function topCode(id: number) { return `TOP${String(id).padStart(4, "0")}`; }
function fmtINR(n: number | null | undefined) {
  if (!n) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  } catch { return d; }
}

// ── Interfaces ──────────────────────────────────────────────────────────────

interface AcademicYear { id: number; name: string; isActive: boolean; }
interface CourseItem {
  id: number; title: string; grade: number; board: string | null;
  academicYearId: number | null; subjectId: number | null;
  isPublished: boolean; status: string; teacher: string | null;
  description: string | null; thumbnailUrl: string | null;
  courseCode: string; courseType?: string | null;
  duration?: string | null;
  originalPrice?: number | null;
  registrationFee?: number | null;
  studentCapacity?: number | null;
  bannerUrl?: string | null;
  brochureUrl?: string | null;
  instanceName?: string | null;
  admissionStatus?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  enrolledCount?: number | null;
  subjectsCount?: number | null;
}
interface CourseSubject {
  id: number; courseId: number; name: string; description: string | null;
  thumbnailUrl: string | null; subjectCode: string;
}
interface ChapterItem {
  id: number; name: string; description: string | null; order: number;
  sequenceNo: number | null; courseId: number | null; courseSubjectId: number | null;
  chapterCode: string;
}
interface TopicItem {
  id: number; name: string; description: string | null; order: number;
  learningObjective: string | null; topicStatus: string; chapterId: number;
  topicCode: string;
}
interface ContentCounts { liveClasses: number; homework: number; assignments: number; tests: number; recordings: number; }
interface ParsedRow { date?: string; chapter: string; topic: string; description?: string; }
interface CourseStats {
  studentsEnrolled: number; teachersAssigned: number; subjects: number;
  topics: number; liveClasses: number; status: string;
}
interface LiveClassItem {
  id: number; title: string; scheduledAt: string; teacher: string | null;
  teacherId: number | null; courseId: number | null; courseSubjectId: number | null;
  status: string; isPublished: boolean; grade: number; subjectName: string | null;
}
interface TeacherCourseItem {
  id: number; teacherId: number; teacherName: string; courseId: number; assignedAt: string;
}
interface MasteryStudentItem {
  id: number; studentName: string; grade: number; phone: string;
  masteryStatus: string; paymentStatus: string;
  assignedCourseId: number | null; assignedCourseName: string | null;
  computedStatus: string; admissionDate: string;
}
interface TeacherUser { id: number; name: string; email: string | null; }

// ── Constants ───────────────────────────────────────────────────────────────

const BOARDS = ["CBSE", "ICSE", "State Board", "IIT Foundation", "NEET Foundation", "Olympiad", "Other"];
const GRADES = [0, ...Array.from({ length: 10 }, (_, i) => i + 1)];
const gradeLabel = (g: number) => (g === 0 ? "Others" : `Grade ${g}`);
const STATUS_OPTIONS = ["active", "draft", "archived"] as const;

const statusBadge = (s: string) => {
  if (s === "active") return "bg-green-100 text-green-700";
  if (s === "archived") return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
};
const statusIcon = (s: string) => {
  if (s === "active") return <CheckCircle2 className="w-3 h-3" />;
  if (s === "archived") return <Archive className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
};

type CmsView = "courses" | "dashboard" | "chapters" | "topics";
type SubjectTab = "subjects" | "syllabus";
type CourseTab = "overview" | "basicinfo" | "curriculum" | "liveclasses" | "teachers" | "students" | "documents" | "reports";

const COURSE_TABS: { id: CourseTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",     label: "Overview",           icon: BarChart3 },
  { id: "basicinfo",    label: "Basic Information",   icon: FileText },
  { id: "curriculum",   label: "Curriculum",          icon: BookOpen },
  { id: "liveclasses",  label: "Live Classes",        icon: Video },
  { id: "teachers",     label: "Teachers",            icon: Users },
  { id: "students",     label: "Students",            icon: GraduationCap },
  { id: "documents",    label: "Documents",           icon: FileUp },
  { id: "reports",      label: "Reports & Analytics", icon: TrendingUp },
];

const emptyCourseForm = {
  title: "", grade: "", board: "", academicYearId: "", status: "active",
  description: "",
  annualFee: "", registrationFee: "", studentCapacity: "",
  startDate: "", endDate: "",
  bannerUrl: "", brochureUrl: "",
  courseType: "mastery",
};

const emptySubjectForm = { name: "", description: "" };
const emptyChapterForm = { name: "", description: "", sequenceNo: "" };
const emptyTopicForm = { name: "", description: "", learningObjective: "", topicStatus: "active" };

// ── Helper components ───────────────────────────────────────────────────────

function FormSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
        <Icon className="w-3.5 h-3.5" style={{ color: ORANGE }} />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, sub, color }: {
  label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color ?? "#EFF6FF" }}>
        <Icon className="w-5 h-5" style={{ color: color ? "white" : NAVY }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none" style={{ color: NAVY }}>{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 w-32 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1">{value}</span>
    </div>
  );
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  const rows: ParsedRow[] = [];
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  for (const line of lines) {
    const cols = line.split(",").map(s => s.trim());
    if (cols.length < 2) continue;
    const isDate = dateRe.test(cols[0]);
    if (isDate && cols.length >= 3) {
      rows.push({ date: cols[0], chapter: cols[1], topic: cols[2], description: cols[3] });
    } else if (!isDate && cols.length >= 2) {
      rows.push({ chapter: cols[0], topic: cols[1], description: cols[2] });
    }
  }
  return rows.filter(r => r.chapter && r.topic &&
    !r.chapter.toLowerCase().includes("chapter") &&
    !r.topic.toLowerCase().includes("topic"));
}

// ── Course Form (create / edit) ─────────────────────────────────────────────

function CourseForm({ form, setForm, onSubmit, onCancel, submitLabel, busy, academicYears }: {
  form: typeof emptyCourseForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyCourseForm>>;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  busy: boolean;
  academicYears: AcademicYear[];
}) {
  return (
    <div className="space-y-5">
      <FormSection title="Basic Info" icon={BookOpen}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Course name *" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2 text-sm" />
          <Select value={form.grade} onValueChange={v => setForm(p => ({ ...p, grade: v }))}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Grade *" /></SelectTrigger>
            <SelectContent>{GRADES.map(g => <SelectItem key={g} value={String(g)}>{gradeLabel(g)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.board} onValueChange={v => setForm(p => ({ ...p, board: v }))}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Board" /></SelectTrigger>
            <SelectContent>{BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.academicYearId} onValueChange={v => setForm(p => ({ ...p, academicYearId: v }))}>
            <SelectTrigger className={`text-sm ${!form.academicYearId ? "border-red-300" : ""}`}>
              <SelectValue placeholder="Academic Year *" />
            </SelectTrigger>
            <SelectContent>{academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.courseType} onValueChange={v => setForm(p => ({ ...p, courseType: v }))}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Course Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mastery">Mastery</SelectItem>
              <SelectItem value="ignite">Ignite</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Description (optional)" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="sm:col-span-2 text-sm" />
        </div>
      </FormSection>

      <FormSection title="Schedule" icon={Calendar}>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">Start Date</label>
            <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-medium">End Date</label>
            <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="text-sm" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Fees & Capacity" icon={DollarSign}>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
            <Input placeholder="Annual Fee" value={form.annualFee} onChange={e => setForm(p => ({ ...p, annualFee: e.target.value }))}
              type="number" min="0" className="pl-7 text-sm" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
            <Input placeholder="Registration Fee" value={form.registrationFee} onChange={e => setForm(p => ({ ...p, registrationFee: e.target.value }))}
              type="number" min="0" className="pl-7 text-sm" />
          </div>
          <Input placeholder="Student Capacity" type="number" value={form.studentCapacity}
            onChange={e => setForm(p => ({ ...p, studentCapacity: e.target.value }))} className="text-sm" />
        </div>
      </FormSection>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSubmit} disabled={busy} className="text-white" style={{ background: ORANGE }}>{submitLabel}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function CourseManagementTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  // ── Base data ──
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);

  // ── Curriculum drill-down data ──
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [contentCounts, setContentCounts] = useState<Record<number, ContentCounts>>({});

  // ── Dashboard data ──
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null);
  const [courseLiveClasses, setCourseLiveClasses] = useState<LiveClassItem[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<TeacherCourseItem[]>([]);
  const [courseMasteryStudents, setCourseMasteryStudents] = useState<MasteryStudentItem[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherUser[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  // ── Navigation state ──
  const [view, setView] = useState<CmsView>("courses");
  const [courseTab, setCourseTab] = useState<CourseTab>("overview");
  const [subjectTab, setSubjectTab] = useState<SubjectTab>("subjects");
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CourseSubject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  // ── UI state ──
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showYearPanel, setShowYearPanel] = useState(true);

  // ── Course list state ──
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editCourseForm, setEditCourseForm] = useState(emptyCourseForm);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseGradeFilter, setCourseGradeFilter] = useState("all");
  const [courseYearFilter, setCourseYearFilter] = useState("all");
  const [courseStatusFilter, setCourseStatusFilter] = useState("all");
  const [courseTypeFilter, setCourseTypeFilter] = useState("all");
  const [yearName, setYearName] = useState("");
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [admissionTabFilter, setAdmissionTabFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [boardFilter, setBoardFilter] = useState("all");

  // ── Dashboard inline edit ──
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState(emptyCourseForm);

  // ── Subjects CRUD state ──
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CourseSubject | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState(emptySubjectForm);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);

  // ── Chapters / Topics CRUD state ──
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);

  // ── Syllabus import state ──
  const [syllabusSubjectId, setSyllabusSubjectId] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [syllabusRows, setSyllabusRows] = useState<ParsedRow[]>([]);
  const [syllabusImporting, setSyllabusImporting] = useState(false);
  const [syllabusFileName, setSyllabusFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Teachers tab state ──
  const [addTeacherIdStr, setAddTeacherIdStr] = useState("");

  // ── Load base ───────────────────────────────────────────────────
  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [yrs, crs] = await Promise.all([
        apiFetch("/admin/academic-years").then(r => r.json()),
        apiFetch("/admin/courses").then(r => r.json()),
      ]);
      setAcademicYears(Array.isArray(yrs) ? yrs : []);
      setCourses(Array.isArray(crs) ? crs : []);
    } catch { flash("Failed to load data", false); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (academicYears.length === 0) return;
    const active = academicYears.find(y => y.isActive) ?? academicYears[0];
    if (active) {
      setCourseForm(p => p.academicYearId ? p : { ...p, academicYearId: String(active.id) });
      setEditCourseForm(p => p.academicYearId ? p : { ...p, academicYearId: String(active.id) });
    }
  }, [academicYears]);

  // ── Academic Years ───────────────────────────────────────────────
  const createYear = async () => {
    if (!yearName.trim()) return;
    setBusy(true);
    try {
      const r = await apiFetch("/admin/academic-years", { method: "POST", body: JSON.stringify({ name: yearName.trim() }) });
      if (!r.ok) { flash("Failed to create year", false); return; }
      setYearName("");
      const yr: AcademicYear = await r.json();
      setAcademicYears(p => [...p, yr]);
      flash(`Year "${yr.name}" created`, true);
    } finally { setBusy(false); }
  };
  const toggleYear = async (yr: AcademicYear) => {
    await apiFetch(`/admin/academic-years/${yr.id}`, { method: "PUT", body: JSON.stringify({ isActive: !yr.isActive }) });
    setAcademicYears(p => p.map(y => y.id === yr.id ? { ...y, isActive: !y.isActive } : y));
  };
  const deleteYear = async (id: number) => {
    await apiFetch(`/admin/academic-years/${id}`, { method: "DELETE" });
    setAcademicYears(p => p.filter(y => y.id !== id));
    flash("Academic year deleted", true);
  };

  // ── Course payload builder ───────────────────────────────────────
  const buildCoursePayload = (f: typeof emptyCourseForm) => ({
    title: f.title.trim(),
    grade: Number(f.grade),
    board: f.board || null,
    academicYearId: f.academicYearId ? Number(f.academicYearId) : null,
    status: f.status || "active",
    courseType: f.courseType || "mastery",
    description: f.description.trim() || null,
    originalPrice: f.annualFee ? Number(f.annualFee) : null,
    registrationFee: f.registrationFee ? Number(f.registrationFee) : null,
    studentCapacity: f.studentCapacity ? Number(f.studentCapacity) : null,
    bannerUrl: f.bannerUrl.trim() || null,
    brochureUrl: f.brochureUrl.trim() || null,
    startDate: f.startDate || null,
    endDate: f.endDate || null,
  });

  const createCourse = async () => {
    if (!courseForm.title.trim()) { flash("Course title is required", false); return; }
    if (!courseForm.grade) { flash("Please select a grade", false); return; }
    if (!courseForm.academicYearId) { flash("Academic Year is required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/courses", { method: "POST", body: JSON.stringify(buildCoursePayload(courseForm)) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); flash(d.error ?? "Failed", false); return; }
      setCourseForm(emptyCourseForm);
      setShowAddCourse(false);
      await loadBase();
      flash("Course created!", true);
    } finally { setBusy(false); }
  };

  const updateCourse = async () => {
    if (!editingCourse) return;
    if (!editCourseForm.title.trim()) { flash("Title required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/courses/${editingCourse.id}`, {
        method: "PUT", body: JSON.stringify(buildCoursePayload(editCourseForm)),
      });
      if (!r.ok) { flash("Failed to update", false); return; }
      setEditingCourse(null);
      await loadBase();
      flash("Course updated!", true);
    } finally { setBusy(false); }
  };

  const saveBasicInfo = async () => {
    if (!selectedCourse) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/courses/${selectedCourse.id}`, {
        method: "PUT", body: JSON.stringify(buildCoursePayload(basicInfoForm)),
      });
      if (!r.ok) { flash("Failed to save", false); return; }
      const updated: CourseItem = await r.json();
      setSelectedCourse(updated);
      setCourses(p => p.map(c => c.id === updated.id ? updated : c));
      setEditingBasicInfo(false);
      flash("Saved!", true);
    } finally { setBusy(false); }
  };

  const updateCourseStatus = async (course: CourseItem, status: string) => {
    await apiFetch(`/admin/courses/${course.id}`, { method: "PUT", body: JSON.stringify({ status }) });
    setCourses(p => p.map(c => c.id === course.id ? { ...c, status } : c));
    if (selectedCourse?.id === course.id) setSelectedCourse(p => p ? { ...p, status } : p);
    flash(`Course ${status === "active" ? "activated" : status === "archived" ? "archived" : "set to draft"}`, true);
  };

  const deleteCourse = async (id: number, title: string) => {
    if (!confirm(`Delete course "${title}"? All subjects, chapters, and topics inside will also be deleted.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/courses/${id}`, { method: "DELETE" });
      setCourses(p => p.filter(c => c.id !== id));
      flash("Course deleted", true);
    } finally { setBusy(false); }
  };

  const activateAdmissions = async (course: CourseItem) => {
    if (!confirm(`Activate admissions for "${course.title}"?\n\nThis will close admissions on all other Mastery courses for Grade ${course.grade}. Existing enrolled students will NOT be moved.`)) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/courses/${course.id}/activate-admissions`, { method: "PATCH" });
      if (!r.ok) { const d = await r.json().catch(() => ({})); flash(d.error ?? "Failed", false); return; }
      await loadBase();
      if (selectedCourse?.id === course.id) {
        setSelectedCourse(p => p ? { ...p, admissionStatus: "active" } : p);
        setCourseStats(p => p ? { ...p, status: "active" } : p);
      }
      flash(`Admissions activated for ${course.title}`, true);
    } finally { setBusy(false); }
  };

  const loadMasteryStudents = async (courseId: number) => {
    try {
      const r = await apiFetch(`/admin/mastery/students?assignedCourseId=${courseId}`);
      const d = await r.json();
      setCourseMasteryStudents(d.students ?? []);
    } catch { /* silent */ }
  };

  const loadAllTeachers = async () => {
    if (allTeachers.length > 0) return;
    try {
      const r = await apiFetch("/admin/teachers/enriched");
      const d = await r.json();
      setAllTeachers(Array.isArray(d) ? d.map((t: {id: number; name: string; email: string}) => ({ id: t.id, name: t.name, email: t.email })) : []);
    } catch { /* silent */ }
  };

  const selectCourseFixed = async (course: CourseItem) => {
    setSelectedCourse(course);
    setCourseTab("overview");
    setSubjectTab("subjects");
    setView("dashboard");
    setDashLoading(true);
    setShowAddSubject(false);
    setEditingSubject(null);

    try {
      const [subjectsRes, statsRes, liveRes, teachersRes] = await Promise.all([
        apiFetch(`/admin/course-subjects?courseId=${course.id}`).then(r => r.json()),
        apiFetch(`/admin/courses/${course.id}/stats`).then(r => r.json()),
        apiFetch(`/admin/live-classes`).then(r => r.json()),
        apiFetch(`/admin/teacher-courses`).then(r => r.json()),
      ]);
      setCourseSubjects(Array.isArray(subjectsRes) ? subjectsRes : []);
      setCourseStats(statsRes);
      setCourseLiveClasses(
        (Array.isArray(liveRes) ? liveRes : []).filter((lc: LiveClassItem) => lc.courseId === course.id)
      );
      setCourseTeachers(
        (Array.isArray(teachersRes) ? teachersRes : []).filter((t: TeacherCourseItem) => t.courseId === course.id)
      );
    } catch { flash("Failed to load course data", false); }
    setDashLoading(false);
  };

  // ── Course Subjects CRUD ─────────────────────────────────────────
  const createSubject = async () => {
    if (!selectedCourse || !subjectForm.name.trim()) { flash("Subject name is required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/course-subjects", {
        method: "POST",
        body: JSON.stringify({ courseId: selectedCourse.id, name: subjectForm.name.trim(), description: subjectForm.description.trim() || null }),
      });
      if (!r.ok) { flash("Failed to create subject", false); return; }
      const sub: CourseSubject = await r.json();
      setCourseSubjects(p => [...p, sub]);
      setSubjectForm(emptySubjectForm);
      setShowAddSubject(false);
      setCourseStats(p => p ? { ...p, subjects: p.subjects + 1 } : p);
      flash("Subject created!", true);
    } finally { setBusy(false); }
  };

  const updateSubject = async () => {
    if (!editingSubject) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/course-subjects/${editingSubject.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editSubjectForm.name.trim(), description: editSubjectForm.description.trim() || null }),
      });
      if (!r.ok) { flash("Failed to update", false); return; }
      const updated: CourseSubject = await r.json();
      setCourseSubjects(p => p.map(s => s.id === updated.id ? updated : s));
      setEditingSubject(null);
      flash("Subject updated!", true);
    } finally { setBusy(false); }
  };

  const deleteSubject = async (id: number, name: string) => {
    if (!confirm(`Delete subject "${name}" and all its chapters and topics?`)) return;
    await apiFetch(`/admin/course-subjects/${id}`, { method: "DELETE" });
    setCourseSubjects(p => p.filter(s => s.id !== id));
    setCourseStats(p => p ? { ...p, subjects: Math.max(0, p.subjects - 1) } : p);
    flash("Subject deleted", true);
  };

  const selectSubject = async (subject: CourseSubject) => {
    setSelectedSubject(subject);
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/chapters?courseSubjectId=${subject.id}`);
      setChapters(await r.json());
    } catch { flash("Failed to load chapters", false); }
    setLoading(false);
    setView("chapters");
  };

  // ── Chapters CRUD ────────────────────────────────────────────────
  const createChapter = async () => {
    if (!selectedSubject || !chapterForm.name.trim()) { flash("Chapter name is required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/chapters", {
        method: "POST",
        body: JSON.stringify({
          courseSubjectId: selectedSubject.id,
          courseId: selectedCourse!.id,
          name: chapterForm.name.trim(),
          description: chapterForm.description.trim() || null,
          sequenceNo: chapterForm.sequenceNo ? Number(chapterForm.sequenceNo) : null,
          order: chapters.length,
        }),
      });
      if (!r.ok) { flash("Failed to create chapter", false); return; }
      const ch: ChapterItem = await r.json();
      setChapters(p => [...p, ch]);
      setChapterForm(emptyChapterForm);
      setShowAddChapter(false);
      flash("Chapter created!", true);
    } finally { setBusy(false); }
  };

  const deleteChapter = async (id: number, name: string) => {
    if (!confirm(`Delete chapter "${name}" and all its topics?`)) return;
    await apiFetch(`/admin/chapters/${id}`, { method: "DELETE" });
    setChapters(p => p.filter(c => c.id !== id));
    flash("Chapter deleted", true);
  };

  const selectChapter = async (chapter: ChapterItem) => {
    setSelectedChapter(chapter);
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/topics?chapterId=${chapter.id}`);
      const tps: TopicItem[] = await r.json();
      setTopics(tps);
      const counts: Record<number, ContentCounts> = {};
      await Promise.all(tps.map(async t => {
        const cr = await apiFetch(`/admin/topic-content/${t.id}`);
        if (cr.ok) counts[t.id] = await cr.json();
      }));
      setContentCounts(counts);
    } catch { flash("Failed to load topics", false); }
    setLoading(false);
    setView("topics");
  };

  // ── Topics CRUD ──────────────────────────────────────────────────
  const createTopic = async () => {
    if (!selectedChapter || !topicForm.name.trim()) { flash("Topic name is required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/topics", {
        method: "POST",
        body: JSON.stringify({
          chapterId: selectedChapter.id,
          name: topicForm.name.trim(),
          description: topicForm.description.trim() || null,
          learningObjective: topicForm.learningObjective.trim() || null,
          topicStatus: topicForm.topicStatus || "active",
          order: topics.length,
        }),
      });
      if (!r.ok) { flash("Failed to create topic", false); return; }
      const tp: TopicItem = await r.json();
      setTopics(p => [...p, tp]);
      setContentCounts(p => ({ ...p, [tp.id]: { liveClasses: 0, homework: 0, assignments: 0, tests: 0, recordings: 0 } }));
      setTopicForm(emptyTopicForm);
      setShowAddTopic(false);
      flash("Topic created!", true);
    } finally { setBusy(false); }
  };

  const deleteTopic = async (id: number, name: string) => {
    if (!confirm(`Delete topic "${name}"?`)) return;
    await apiFetch(`/admin/topics/${id}`, { method: "DELETE" });
    setTopics(p => p.filter(t => t.id !== id));
    flash("Topic deleted", true);
  };

  // ── Syllabus import ──────────────────────────────────────────────
  const handleCSVFile = (file: File) => {
    setSyllabusFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setSyllabusRows(parseCSV(text));
    };
    reader.readAsText(file);
  };

  const importSyllabus = async () => {
    if (!selectedCourse || syllabusRows.length === 0) { flash("Please upload a CSV file first", false); return; }
    setSyllabusImporting(true);
    try {
      const r = await apiFetch(`/admin/courses/${selectedCourse.id}/syllabus-import`, {
        method: "POST",
        body: JSON.stringify({
          courseSubjectId: syllabusSubjectId ? Number(syllabusSubjectId) : null,
          replaceExisting,
          rows: syllabusRows,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); flash(d.error ?? "Import failed", false); return; }
      const d = await r.json();
      flash(`✅ Imported: ${d.createdChapters} chapters, ${d.createdTopics} topics, ${d.createdClasses} live classes`, true);
      setSyllabusRows([]); setSyllabusFileName(""); setReplaceExisting(false);
      if (fileRef.current) fileRef.current.value = "";
      // Refresh stats
      const statsRes = await apiFetch(`/admin/courses/${selectedCourse.id}/stats`).then(r2 => r2.json()).catch(() => null);
      if (statsRes) setCourseStats(statsRes);
    } finally { setSyllabusImporting(false); }
  };

  // ── Teacher assignment ───────────────────────────────────────────
  const assignTeacher = async () => {
    if (!selectedCourse || !addTeacherIdStr) { flash("Select a teacher", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/teacher-courses", {
        method: "POST",
        body: JSON.stringify({ teacherId: Number(addTeacherIdStr), courseId: selectedCourse.id }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); flash(d.error ?? "Failed", false); return; }
      const row: TeacherCourseItem = await r.json();
      if (row.id) {
        setCourseTeachers(p => [...p, row]);
        setCourseStats(p => p ? { ...p, teachersAssigned: p.teachersAssigned + 1 } : p);
      }
      setAddTeacherIdStr("");
      flash("Teacher assigned!", true);
    } finally { setBusy(false); }
  };

  const removeTeacher = async (id: number, name: string) => {
    if (!confirm(`Remove ${name} from this course?`)) return;
    await apiFetch(`/admin/teacher-courses/${id}`, { method: "DELETE" });
    setCourseTeachers(p => p.filter(t => t.id !== id));
    setCourseStats(p => p ? { ...p, teachersAssigned: Math.max(0, p.teachersAssigned - 1) } : p);
    flash("Teacher removed", true);
  };

  // ── Navigation ───────────────────────────────────────────────────
  const goBack = () => {
    if (view === "topics") {
      setView("chapters"); setSelectedChapter(null); setTopics([]); setContentCounts({});
    } else if (view === "chapters") {
      setView("dashboard"); setCourseTab("curriculum");
      setSelectedSubject(null); setChapters([]);
    }
  };

  const yearName_ = (id: number | null) => academicYears.find(y => y.id === id)?.name ?? "—";

  const now = new Date();
  const filteredCourses = courses.filter(c => {
    if (courseGradeFilter !== "all" && String(c.grade) !== courseGradeFilter) return false;
    if (courseYearFilter !== "all" && String(c.academicYearId) !== courseYearFilter) return false;
    if (courseStatusFilter !== "all" && c.status !== courseStatusFilter) return false;
    if (courseTypeFilter !== "all" && c.courseType !== courseTypeFilter) return false;
    if (boardFilter !== "all" && c.board !== boardFilter) return false;
    if (admissionTabFilter === "admissions_active" && c.admissionStatus !== "active") return false;
    if (admissionTabFilter === "admissions_closed" && c.admissionStatus === "active") return false;
    if (admissionTabFilter === "upcoming" && !(c.startDate && new Date(c.startDate) > now)) return false;
    if (admissionTabFilter === "completed" && !(c.endDate && new Date(c.endDate) < now)) return false;
    if (admissionTabFilter === "archived" && c.status !== "archived") return false;
    if (courseSearch) {
      const q = courseSearch.toLowerCase();
      return c.title.toLowerCase().includes(q) || (c.teacher ?? "").toLowerCase().includes(q) || (c.courseCode ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  // Upcoming live classes (next 5 sorted by scheduledAt)
  const upcomingClasses = [...courseLiveClasses]
    .filter(lc => new Date(lc.scheduledAt) >= new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 6);

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-sm font-medium flex-wrap">
        <button onClick={() => { setView("courses"); setSelectedCourse(null); setSelectedSubject(null); setSelectedChapter(null); setCourseSubjects([]); }}
          className="hover:underline" style={{ color: NAVY }}>Mastery Courses</button>
        {selectedCourse && view !== "courses" && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button onClick={() => { setView("dashboard"); setCourseTab("overview"); setSelectedSubject(null); setSelectedChapter(null); setChapters([]); }}
              className="hover:underline" style={{ color: view === "dashboard" && !selectedSubject ? ORANGE : NAVY }}>
              {gradeLabel(selectedCourse.grade)} — {selectedCourse.instanceName ?? selectedCourse.title}
            </button>
          </>
        )}
        {selectedSubject && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button onClick={() => { setView("chapters"); setSelectedChapter(null); setTopics([]); setContentCounts({}); }}
              className="hover:underline" style={{ color: view === "chapters" ? ORANGE : NAVY }}>
              {selectedSubject.name}
            </button>
          </>
        )}
        {selectedChapter && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span style={{ color: ORANGE }}>{selectedChapter.name}</span>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          COURSES LIST VIEW
          ════════════════════════════════════════════════════════ */}
      {view === "courses" && (
        <div className="space-y-5">

          {/* ── PAGE HEADER ── */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: NAVY }}>Mastery Courses</h1>
              <p className="text-sm text-gray-500 mt-0.5">Create and manage long-term mastery programs for all grades.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline"
                className="gap-1.5 text-xs font-semibold border-gray-300">
                <FileUp className="w-3.5 h-3.5" /> Import Syllabus
              </Button>
              <Button size="sm" onClick={() => { setShowAddCourse(p => !p); setEditingCourse(null); }}
                className="gap-1.5 text-xs text-white font-semibold" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Create Course
              </Button>
            </div>
          </div>

          {/* ── SUMMARY STAT CARDS ── */}
          {(() => {
            const mc = courses.filter(c => !c.courseType || c.courseType === "mastery");
            const totalStudents = mc.reduce((s, c) => s + (c.enrolledCount ?? 0), 0);
            const totalSubjects = mc.reduce((s, c) => s + (c.subjectsCount ?? 0), 0);
            const totalRevenue  = mc.reduce((s, c) => s + (c.enrolledCount ?? 0) * (c.originalPrice ?? 0), 0);
            const activeAdm = mc.filter(c => c.admissionStatus === "active").length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {([
                  { label: "Total Courses",      value: mc.length,                                                    sub: "All grades",         icon: GraduationCap,  bg: "#EFF6FF", clr: NAVY      },
                  { label: "Active Admissions",  value: activeAdm,                                                    sub: "Open for enrolment", icon: CheckCircle2,   bg: "#F0FDF4", clr: "#16A34A" },
                  { label: "Total Students",     value: totalStudents.toLocaleString("en-IN"),                        sub: "Enrolled",           icon: Users,          bg: "#F5F3FF", clr: "#7C3AED" },
                  { label: "Subjects",           value: totalSubjects,                                                sub: "Across courses",     icon: BookOpen,       bg: "#FFF7ED", clr: ORANGE    },
                  { label: "Live Classes",       value: "—",                                                          sub: "Scheduled",          icon: Video,          bg: "#FEF2F2", clr: "#DC2626" },
                  { label: "Revenue (YTD)",      value: totalRevenue > 0 ? `₹${(totalRevenue/100000).toFixed(1)}L` : "—", sub: "Total collected", icon: TrendingUp,  bg: "#ECFDF5", clr: "#059669" },
                ] as { label: string; value: string|number; sub: string; icon: React.ElementType; bg: string; clr: string }[]).map(({ label, value, sub, icon: Icon, bg, clr }) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 min-w-0 hover:shadow-md transition-shadow">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                      <Icon className="w-4 h-4" style={{ color: clr }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-extrabold leading-none truncate" style={{ color: NAVY }}>{value}</p>
                      <p className="text-xs font-semibold text-gray-700 mt-0.5 leading-tight">{label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── ACADEMIC YEARS ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <button className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold"
              style={{ color: NAVY }} onClick={() => setShowYearPanel(p => !p)}>
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Academic Years
                <span className="text-xs font-normal text-gray-400">({academicYears.length})</span>
              </span>
              {showYearPanel ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {showYearPanel && (
              <div className="px-5 pb-4 space-y-3 border-t border-gray-100">
                <div className="flex gap-2 mt-3">
                  <Input placeholder="e.g. 2026-27" value={yearName} onChange={e => setYearName(e.target.value)}
                    className="flex-1 text-sm h-8" onKeyDown={e => e.key === "Enter" && createYear()} />
                  <Button size="sm" onClick={createYear} disabled={busy || !yearName.trim()} className="text-white h-8" style={{ background: ORANGE }}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {academicYears.map(yr => (
                    <div key={yr.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium"
                      style={{ borderColor: yr.isActive ? NAVY : "#E5E7EB", color: yr.isActive ? NAVY : "#9CA3AF" }}>
                      {yr.name}
                      <button onClick={() => toggleYear(yr)} className="ml-1 opacity-60 hover:opacity-100">{yr.isActive ? "✓" : "○"}</button>
                      <button onClick={() => deleteYear(yr.id)} className="ml-0.5 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  {academicYears.length === 0 && <p className="text-xs text-gray-400">No academic years yet.</p>}
                </div>
              </div>
            )}
          </div>

          {/* ── FILTERS + VIEW TOGGLE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input placeholder="Search by course name or code…" value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)} className="pl-9 h-9 text-xs" />
              </div>
              <Select value={courseGradeFilter} onValueChange={setCourseGradeFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue placeholder="All Grades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {GRADES.map(g => <SelectItem key={g} value={String(g)}>{gradeLabel(g)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={boardFilter} onValueChange={setBoardFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue placeholder="All Boards" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boards</SelectItem>
                  {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={courseYearFilter} onValueChange={setCourseYearFilter}>
                <SelectTrigger className="h-9 text-xs w-32"><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                <Button size="sm" variant="outline" onClick={loadBase} className="h-9 gap-1.5 text-xs font-medium">
                  <RotateCcw className="w-3.5 h-3.5" /> Refresh
                </Button>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden ml-1">
                  <button onClick={() => setViewMode("card")}
                    className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === "card" ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    style={{ background: viewMode === "card" ? NAVY : undefined }}>
                    <LayoutGrid className="w-3.5 h-3.5" /> Card View
                  </button>
                  <button onClick={() => setViewMode("table")}
                    className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-l border-gray-200 transition-colors ${viewMode === "table" ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                    style={{ background: viewMode === "table" ? NAVY : undefined }}>
                    <List className="w-3.5 h-3.5" /> Table View
                  </button>
                </div>
              </div>
              {(courseSearch || courseGradeFilter !== "all" || boardFilter !== "all" || courseYearFilter !== "all" || courseStatusFilter !== "all" || admissionTabFilter !== "all") && (
                <button onClick={() => { setCourseSearch(""); setCourseGradeFilter("all"); setBoardFilter("all"); setCourseYearFilter("all"); setCourseStatusFilter("all"); setAdmissionTabFilter("all"); }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline">Clear all</button>
              )}
            </div>
          </div>

          {/* ── STATUS TABS ── */}
          {(() => {
            const mc = courses.filter(c => !c.courseType || c.courseType === "mastery");
            const nowTs = new Date();
            const TABS = [
              { id: "all",               label: "All Courses",         count: mc.length },
              { id: "admissions_active", label: "Admissions Active",   count: mc.filter(c => c.admissionStatus === "active").length },
              { id: "admissions_closed", label: "Admissions Closed",   count: mc.filter(c => c.admissionStatus !== "active").length },
              { id: "upcoming",          label: "Upcoming",            count: mc.filter(c => c.startDate && new Date(c.startDate) > nowTs).length },
              { id: "completed",         label: "Completed",           count: mc.filter(c => c.endDate && new Date(c.endDate) < nowTs).length },
              { id: "archived",          label: "Archived",            count: mc.filter(c => c.status === "archived").length },
            ];
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
                <div className="flex border-b border-gray-100 min-w-max">
                  {TABS.map(tab => {
                    const isActive = admissionTabFilter === tab.id;
                    return (
                      <button key={tab.id}
                        onClick={() => setAdmissionTabFilter(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${isActive ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {tab.label}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── ADD / EDIT COURSE FORMS ── */}
          {showAddCourse && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Course</h3>
                <button onClick={() => { setShowAddCourse(false); setCourseForm(emptyCourseForm); }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <CourseForm form={courseForm} setForm={setCourseForm} academicYears={academicYears}
                onSubmit={createCourse} onCancel={() => { setShowAddCourse(false); setCourseForm(emptyCourseForm); }}
                submitLabel="Create Course" busy={busy} />
            </div>
          )}
          {editingCourse && (
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Edit — <span className="font-mono text-xs">{editingCourse.courseCode}</span></h3>
                <button onClick={() => setEditingCourse(null)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <CourseForm form={editCourseForm} setForm={setEditCourseForm} academicYears={academicYears}
                onSubmit={updateCourse} onCancel={() => setEditingCourse(null)}
                submitLabel="Save Changes" busy={busy} />
            </div>
          )}

          {/* ── CARD VIEW ── */}
          {viewMode === "card" && (
            loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />)}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                {courses.length === 0 ? "No courses yet. Click \"Create Course\" to get started." : "No courses match your filters."}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredCourses.map(c => {
                  const admActive = c.admissionStatus === "active";
                  const isUpcoming = !admActive && c.startDate && new Date(c.startDate) > new Date();
                  return (
                    <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                      <div className="h-1 w-full" style={{ background: admActive ? "#16A34A" : isUpcoming ? "#3B82F6" : c.status === "archived" ? "#9CA3AF" : NAVY }} />
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        {/* Admission badge + student count */}
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${admActive ? "bg-green-50 text-green-600" : isUpcoming ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                            {admActive ? <><Zap className="w-2.5 h-2.5 mr-0.5" />Admissions Active</> : isUpcoming ? <><Clock className="w-2.5 h-2.5 mr-0.5" />Upcoming</> : "Admissions Closed"}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-500 flex-shrink-0">
                            <Users className="w-3 h-3" /> {(c.enrolledCount ?? 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        {/* Course name */}
                        <div>
                          <p className="font-mono text-[10px] text-gray-400">{c.courseCode}</p>
                          <h3 className="font-bold text-sm leading-tight mt-0.5" style={{ color: NAVY }}>{c.title}</h3>
                        </div>
                        {/* Meta badges */}
                        <div className="flex flex-wrap gap-1">
                          {c.board && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{c.board}</span>}
                          {c.academicYearId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{yearName_(c.academicYearId)}</span>}
                          {c.instanceName && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "#FFF3E6", color: ORANGE }}>{c.instanceName}</span>}
                        </div>
                        {/* Subjects + fee */}
                        <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-2">
                          <span className="flex items-center gap-1 text-gray-500">
                            <BookOpen className="w-3 h-3" /> {c.subjectsCount ?? 0} Subjects
                          </span>
                          {c.originalPrice ? (
                            <span className="font-bold text-xs" style={{ color: ORANGE }}>₹{c.originalPrice.toLocaleString("en-IN")}/yr</span>
                          ) : null}
                        </div>
                        {/* Start date + teacher */}
                        <div className="text-xs">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span>{c.startDate ? fmtDate(c.startDate) : "Start date not set"}</span>
                          </div>
                          {c.teacher && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                                style={{ background: NAVY }}>{c.teacher.charAt(0)}</div>
                              <span className="text-[10px] text-gray-500 truncate">{c.teacher}</span>
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1.5 mt-auto pt-1">
                          <button onClick={() => selectCourseFixed(c)}
                            className="flex-1 text-xs py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                            style={{ background: NAVY }}>
                            <Layers className="w-3 h-3" /> Manage
                          </button>
                          <button onClick={() => selectCourseFixed(c)} title="View Students"
                            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {c.courseType === "mastery" && !admActive && (
                            <button onClick={() => activateAdmissions(c)} title="Activate Admissions"
                              className="p-2 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button title="Edit" onClick={() => {
                            setEditingCourse(c);
                            setEditCourseForm({
                              title: c.title, grade: String(c.grade), board: c.board ?? "",
                              academicYearId: c.academicYearId ? String(c.academicYearId) : "",
                              status: c.status ?? "active", courseType: c.courseType ?? "mastery",
                              description: c.description ?? "",
                              annualFee: c.originalPrice ? String(c.originalPrice) : "",
                              registrationFee: c.registrationFee ? String(c.registrationFee) : "",
                              studentCapacity: c.studentCapacity ? String(c.studentCapacity) : "",
                              startDate: c.startDate ?? "", endDate: c.endDate ?? "",
                              bannerUrl: c.bannerUrl ?? c.thumbnailUrl ?? "",
                              brochureUrl: c.brochureUrl ?? "",
                            });
                            setShowAddCourse(false);
                          }} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── TABLE VIEW ── */}
          {viewMode === "table" && (
            loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Course Code</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500">Course Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500">Grade</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500">Board</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500">Instance</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Admission Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-center">Students</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Start Date</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.map((c, idx) => (
                        <tr key={c.id}
                          className={`border-b border-gray-50 hover:bg-blue-50/20 transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-gray-50/30"}`}
                          onClick={() => selectCourseFixed(c)}>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <span className="font-mono text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{c.courseCode}</span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="font-semibold text-gray-800 truncate">{c.title}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium whitespace-nowrap">{gradeLabel(c.grade)}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.board ?? "—"}</td>
                          <td className="px-4 py-3">
                            {c.instanceName
                              ? <span className="text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ background: "#FFF3E6", color: ORANGE }}>{c.instanceName}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${c.admissionStatus === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                              {c.admissionStatus === "active" ? "● Active" : "● Closed"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusBadge(c.status)}`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800 text-center">{(c.enrolledCount ?? 0).toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.startDate ? fmtDate(c.startDate) : "—"}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button onClick={() => selectCourseFixed(c)} title="Manage"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button title="Edit" onClick={() => {
                                setEditingCourse(c);
                                setEditCourseForm({
                                  title: c.title, grade: String(c.grade), board: c.board ?? "",
                                  academicYearId: c.academicYearId ? String(c.academicYearId) : "",
                                  status: c.status ?? "active", courseType: c.courseType ?? "mastery",
                                  description: c.description ?? "",
                                  annualFee: c.originalPrice ? String(c.originalPrice) : "",
                                  registrationFee: c.registrationFee ? String(c.registrationFee) : "",
                                  studentCapacity: c.studentCapacity ? String(c.studentCapacity) : "",
                                  startDate: c.startDate ?? "", endDate: c.endDate ?? "",
                                  bannerUrl: c.bannerUrl ?? c.thumbnailUrl ?? "",
                                  brochureUrl: c.brochureUrl ?? "",
                                });
                                setShowAddCourse(false);
                              }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteCourse(c.id, c.title)} title="Delete"
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredCourses.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                          {courses.length === 0 ? "No courses yet. Click \"Create Course\" to get started." : "No courses match your filters."}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredCourses.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Showing 1–{filteredCourses.length} of {filteredCourses.length} courses</span>
                    <span>Rows per page: 10</span>
                  </div>
                )}
              </div>
            )
          )}

          {/* ── BOTTOM QUICK ACTIONS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { icon: FileUp,    label: "Upload Syllabus",        sub: "Upload PDF/Doc or Excel",        bg: "#EFF6FF", clr: NAVY      },
                { icon: BookOpen,  label: "Generate Curriculum",    sub: "Auto create topics & modules",   bg: "#FFF7ED", clr: ORANGE    },
                { icon: Video,     label: "Schedule Live Classes",  sub: "Auto generate class schedule",   bg: "#F0FDF4", clr: "#16A34A" },
                { icon: UserCheck, label: "Assign Teachers",        sub: "Assign teachers to subjects",    bg: "#F5F3FF", clr: "#7C3AED" },
              ] as { icon: React.ElementType; label: string; sub: string; bg: string; clr: string }[]).map(({ icon: Icon, label, sub, bg, clr }) => (
                <button key={label}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color: clr }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
      {/* ════════════════════════════════════════════════════════
          COURSE DASHBOARD VIEW
          ════════════════════════════════════════════════════════ */}
      {view === "dashboard" && selectedCourse && (
        <div className="space-y-5">

          {/* ── Dashboard Header ─────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0"
                  style={{ background: NAVY }}>
                  {selectedCourse.grade === 0 ? "X" : selectedCourse.grade}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-extrabold text-lg" style={{ color: NAVY }}>
                      {selectedCourse.title}
                    </h1>
                    {selectedCourse.instanceName && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: "#FFF3E6", color: ORANGE }}>
                        {selectedCourse.instanceName}
                      </span>
                    )}
                    {selectedCourse.admissionStatus === "active" ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-600 border border-green-200">
                        Admissions Active
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-gray-100 text-gray-500">
                        Admissions Closed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {gradeLabel(selectedCourse.grade)}
                    {selectedCourse.board ? ` · ${selectedCourse.board}` : ""}
                    {selectedCourse.academicYearId ? ` · ${yearName_(selectedCourse.academicYearId)}` : ""}
                    {` · ID: ${selectedCourse.courseCode}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs"
                  onClick={() => { setCourseTab("students"); loadMasteryStudents(selectedCourse.id); }}>
                  <Users className="w-3.5 h-3.5" /> View Students
                </Button>
                {selectedCourse.admissionStatus !== "active" ? (
                  <Button size="sm" onClick={() => activateAdmissions(selectedCourse)} disabled={busy}
                    className="gap-1 text-xs text-white" style={{ background: "#16A34A" }}>
                    <Shield className="w-3.5 h-3.5" /> Activate Admissions
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1 text-xs text-green-600 border-green-200" disabled>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Admissions Active
                  </Button>
                )}
                <Button size="sm" onClick={() => {
                  setCourseTab("basicinfo");
                  setBasicInfoForm({
                    title: selectedCourse.title, grade: String(selectedCourse.grade), board: selectedCourse.board ?? "",
                    academicYearId: selectedCourse.academicYearId ? String(selectedCourse.academicYearId) : "",
                    status: selectedCourse.status ?? "active", courseType: selectedCourse.courseType ?? "mastery",
                    description: selectedCourse.description ?? "",
                    annualFee: selectedCourse.originalPrice ? String(selectedCourse.originalPrice) : "",
                    registrationFee: selectedCourse.registrationFee ? String(selectedCourse.registrationFee) : "",
                    studentCapacity: selectedCourse.studentCapacity ? String(selectedCourse.studentCapacity) : "",
                    startDate: selectedCourse.startDate ?? "", endDate: selectedCourse.endDate ?? "",
                    bannerUrl: selectedCourse.bannerUrl ?? "", brochureUrl: selectedCourse.brochureUrl ?? "",
                  });
                  setEditingBasicInfo(true);
                }} className="gap-1 text-xs text-white" style={{ background: NAVY }}>
                  <Pencil className="w-3.5 h-3.5" /> Edit Course
                </Button>
              </div>
            </div>
          </div>

          {/* ── Stat Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Students Enrolled" value={dashLoading ? "…" : (courseStats?.studentsEnrolled ?? 0)}
              icon={Users} sub={courseStats?.studentsEnrolled ? "+this week" : undefined} />
            <StatCard label="Teachers Assigned" value={dashLoading ? "…" : (courseStats?.teachersAssigned ?? 0)} icon={UserCheck} />
            <StatCard label="Subjects" value={dashLoading ? "…" : (courseStats?.subjects ?? 0)} icon={BookOpen} />
            <StatCard label="Curriculum Topics" value={dashLoading ? "…" : (courseStats?.topics ?? 0)} icon={Tag} />
            <StatCard label="Live Classes" value={dashLoading ? "…" : (courseStats?.liveClasses ?? 0)} icon={Video} />
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selectedCourse.status === "active" ? "#DCFCE7" : "#F3F4F6" }}>
                <div className={`w-3 h-3 rounded-full ${selectedCourse.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
              </div>
              <div>
                <p className="text-lg font-extrabold leading-none capitalize" style={{ color: NAVY }}>{selectedCourse.status}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">Status</p>
              </div>
            </div>
          </div>

          {/* ── Tab Bar ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <div className="flex border-b border-gray-100 min-w-max">
              {COURSE_TABS.map(tab => {
                const Icon = tab.icon;
                const active = courseTab === tab.id;
                return (
                  <button key={tab.id}
                    onClick={() => {
                      setCourseTab(tab.id);
                      if (tab.id === "students") loadMasteryStudents(selectedCourse.id);
                      if (tab.id === "teachers") loadAllTeachers();
                    }}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ── TAB: OVERVIEW ─────────────────────────────── */}
            {courseTab === "overview" && (
              <div className="p-5 space-y-5">
                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Course Overview card */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm" style={{ color: NAVY }}>Course Overview</h3>
                      <span className="text-xs text-gray-400">Complete summary of your mastery course</span>
                    </div>
                    <InfoRow label="Course Instance" value={
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#FFF3E6", color: ORANGE }}>
                        {selectedCourse.instanceName ?? "—"}
                      </span>
                    } />
                    <InfoRow label="Admissions Status" value={
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedCourse.admissionStatus === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                        {selectedCourse.admissionStatus === "active" ? "Active" : "Closed"}
                      </span>
                    } />
                    <InfoRow label="Academic Year" value={yearName_(selectedCourse.academicYearId)} />
                    <InfoRow label="Board" value={selectedCourse.board ?? "—"} />
                    <InfoRow label="Start Date" value={fmtDate(selectedCourse.startDate)} />
                    <InfoRow label="End Date" value={fmtDate(selectedCourse.endDate)} />
                    <InfoRow label="Annual Fee" value={<span className="font-semibold" style={{ color: NAVY }}>{fmtINR(selectedCourse.originalPrice)}</span>} />
                    <InfoRow label="Registration Fee" value={fmtINR(selectedCourse.registrationFee)} />
                    <InfoRow label="Student Capacity" value={selectedCourse.studentCapacity ? selectedCourse.studentCapacity.toLocaleString("en-IN") : "—"} />
                    {selectedCourse.description && (
                      <InfoRow label="Description" value={<span className="text-xs text-gray-600">{selectedCourse.description}</span>} />
                    )}
                  </div>

                  {/* Curriculum Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm" style={{ color: NAVY }}>Curriculum Preview</h3>
                      <button onClick={() => setCourseTab("curriculum")}
                        className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600">
                        View Full Curriculum →
                      </button>
                    </div>
                    {courseStats && <p className="text-xs text-gray-400 mb-3">{courseStats.topics} Topics · {courseStats.subjects} Subjects</p>}
                    <div className="space-y-2">
                      {courseSubjects.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
                          No subjects yet. Go to Curriculum tab to add subjects.
                        </div>
                      ) : courseSubjects.map(sub => (
                        <button key={sub.id} onClick={() => selectSubject(sub)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all text-left">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: NAVY }}>{sub.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-800">{sub.name}</p>
                            {sub.description && <p className="text-xs text-gray-400 truncate">{sub.description}</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming Live Classes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm" style={{ color: NAVY }}>Upcoming Live Classes</h3>
                      <button onClick={() => setCourseTab("liveclasses")}
                        className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600">
                        View Full Schedule →
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Next {upcomingClasses.length} Classes</p>
                    {upcomingClasses.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
                        No upcoming classes yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {upcomingClasses.map(lc => (
                          <div key={lc.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                            <div className="w-10 h-10 rounded-xl text-center flex flex-col items-center justify-center flex-shrink-0"
                              style={{ background: "#EFF6FF" }}>
                              <span className="text-[10px] font-semibold text-blue-500 uppercase">
                                {new Date(lc.scheduledAt).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}
                              </span>
                              <span className="text-base font-extrabold leading-none" style={{ color: NAVY }}>
                                {new Date(lc.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" })}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-xs text-gray-800 truncate">{lc.title}</p>
                              <p className="text-[10px] text-gray-500">{lc.teacher ?? "No teacher"}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {new Date(lc.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom row */}
                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Assigned Teachers */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm" style={{ color: NAVY }}>Assigned Teachers</h3>
                      <button onClick={() => { setCourseTab("teachers"); loadAllTeachers(); }}
                        className="text-xs font-semibold text-gray-500 hover:text-orange-600">
                        Manage Teachers →
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{courseTeachers.length} Teachers Assigned</p>
                    {courseTeachers.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-xl">No teachers assigned yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {courseTeachers.slice(0, 4).map(tc => (
                          <div key={tc.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100">
                            <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                              style={{ background: NAVY }}>
                              {tc.teacherName.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">{tc.teacherName}</span>
                          </div>
                        ))}
                        {courseTeachers.length > 4 && (
                          <p className="text-xs text-gray-400 text-center">+{courseTeachers.length - 4} more</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Student Progress Snapshot */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-sm" style={{ color: NAVY }}>Student Overview</h3>
                      <button onClick={() => { setCourseTab("students"); loadMasteryStudents(selectedCourse.id); }}
                        className="text-xs font-semibold text-gray-500 hover:text-orange-600">
                        View Reports →
                      </button>
                    </div>
                    <div className="flex items-center justify-center py-4">
                      <div className="text-center">
                        <p className="text-5xl font-extrabold" style={{ color: NAVY }}>{courseStats?.studentsEnrolled ?? 0}</p>
                        <p className="text-sm text-gray-500 mt-1">Students Enrolled</p>
                        {selectedCourse.studentCapacity && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Capacity</span>
                              <span>{Math.round(((courseStats?.studentsEnrolled ?? 0) / selectedCourse.studentCapacity) * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 w-40">
                              <div className="h-2 rounded-full transition-all" style={{
                                background: NAVY,
                                width: `${Math.min(100, Math.round(((courseStats?.studentsEnrolled ?? 0) / selectedCourse.studentCapacity) * 100))}%`,
                              }} />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">of {selectedCourse.studentCapacity.toLocaleString("en-IN")} seats</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="font-bold text-sm mb-3" style={{ color: NAVY }}>Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Upload, label: "Upload Syllabus", sub: "Import or upload a syllabus file", action: () => { setCourseTab("curriculum"); setSubjectTab("syllabus"); } },
                        { icon: BookMarked, label: "View Curriculum", sub: "Browse subjects and topics", action: () => setCourseTab("curriculum") },
                        { icon: Video, label: "Live Classes", sub: "View schedule", action: () => setCourseTab("liveclasses") },
                        { icon: UserCheck, label: "Assign Teachers", sub: "Assign teachers to subjects", action: () => { setCourseTab("teachers"); loadAllTeachers(); } },
                        { icon: FileText, label: "Documents", sub: "Upload and manage materials", action: () => setCourseTab("documents") },
                        { icon: Send, label: "Send Announcement", sub: "Notify students and parents", action: () => flash("Announcement feature coming soon", false) },
                      ].map(({ icon: Icon, label, sub, action }) => (
                        <button key={label} onClick={action}
                          className="flex flex-col items-start gap-1 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/20 transition-all text-left">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: NAVY }} />
                          </div>
                          <p className="text-xs font-semibold text-gray-800">{label}</p>
                          <p className="text-[10px] text-gray-400">{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tip */}
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>Tip:</strong> Upload a syllabus CSV to automatically generate curriculum, live classes, and assignments.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB: BASIC INFORMATION ────────────────────── */}
            {courseTab === "basicinfo" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Basic Information</h3>
                  {!editingBasicInfo && (
                    <Button size="sm" onClick={() => {
                      setBasicInfoForm({
                        title: selectedCourse.title, grade: String(selectedCourse.grade), board: selectedCourse.board ?? "",
                        academicYearId: selectedCourse.academicYearId ? String(selectedCourse.academicYearId) : "",
                        status: selectedCourse.status ?? "active", courseType: selectedCourse.courseType ?? "mastery",
                        description: selectedCourse.description ?? "",
                        annualFee: selectedCourse.originalPrice ? String(selectedCourse.originalPrice) : "",
                        registrationFee: selectedCourse.registrationFee ? String(selectedCourse.registrationFee) : "",
                        studentCapacity: selectedCourse.studentCapacity ? String(selectedCourse.studentCapacity) : "",
                        startDate: selectedCourse.startDate ?? "", endDate: selectedCourse.endDate ?? "",
                        bannerUrl: selectedCourse.bannerUrl ?? "", brochureUrl: selectedCourse.brochureUrl ?? "",
                      });
                      setEditingBasicInfo(true);
                    }} className="gap-1 text-xs text-white" style={{ background: NAVY }}>
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </Button>
                  )}
                </div>

                {!editingBasicInfo ? (
                  <div className="grid sm:grid-cols-2 gap-x-8">
                    <InfoRow label="Course Name" value={selectedCourse.title} />
                    <InfoRow label="Grade" value={gradeLabel(selectedCourse.grade)} />
                    <InfoRow label="Board" value={selectedCourse.board ?? "—"} />
                    <InfoRow label="Academic Year" value={yearName_(selectedCourse.academicYearId)} />
                    <InfoRow label="Status" value={
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${statusBadge(selectedCourse.status)}`}>
                        {statusIcon(selectedCourse.status)} {selectedCourse.status}
                      </span>
                    } />
                    <InfoRow label="Course Type" value={<span className="capitalize">{selectedCourse.courseType ?? "mastery"}</span>} />
                    <InfoRow label="Start Date" value={fmtDate(selectedCourse.startDate)} />
                    <InfoRow label="End Date" value={fmtDate(selectedCourse.endDate)} />
                    <InfoRow label="Annual Fee" value={<span className="font-semibold text-base" style={{ color: NAVY }}>{fmtINR(selectedCourse.originalPrice)}</span>} />
                    <InfoRow label="Registration Fee" value={fmtINR(selectedCourse.registrationFee)} />
                    <InfoRow label="Student Capacity" value={selectedCourse.studentCapacity?.toLocaleString("en-IN") ?? "—"} />
                    <InfoRow label="Instance Name" value={
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#FFF3E6", color: ORANGE }}>
                        {selectedCourse.instanceName ?? "—"}
                      </span>
                    } />
                    {selectedCourse.description && (
                      <div className="sm:col-span-2">
                        <InfoRow label="Description" value={<span className="text-sm text-gray-600">{selectedCourse.description}</span>} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5 max-w-2xl">
                    <CourseForm form={basicInfoForm} setForm={setBasicInfoForm} academicYears={academicYears}
                      onSubmit={saveBasicInfo} onCancel={() => setEditingBasicInfo(false)}
                      submitLabel="Save Changes" busy={busy} />
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: CURRICULUM ───────────────────────────── */}
            {courseTab === "curriculum" && (
              <div className="p-5 space-y-5">
                {/* Sub-tabs: Subjects | Syllabus Import */}
                <div className="flex border-b border-gray-200">
                  <button onClick={() => setSubjectTab("subjects")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${subjectTab === "subjects" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Subjects & Chapters</span>
                  </button>
                  <button onClick={() => setSubjectTab("syllabus")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${subjectTab === "syllabus" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Syllabus Import</span>
                  </button>
                </div>

                {/* Subjects sub-tab */}
                {subjectTab === "subjects" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Add subjects (e.g. Mathematics, Science). Click a subject to manage chapters and topics.</p>
                      <Button size="sm" onClick={() => setShowAddSubject(p => !p)} className="text-white gap-1" style={{ background: ORANGE }}>
                        <Plus className="w-3.5 h-3.5" /> Add Subject
                      </Button>
                    </div>

                    {showAddSubject && (
                      <div className="bg-white rounded-2xl p-4 border border-orange-200 shadow-sm space-y-3">
                        <h4 className="font-bold text-sm" style={{ color: NAVY }}>New Subject</h4>
                        <Input placeholder="Subject name * (e.g. Mathematics)" value={subjectForm.name}
                          onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))} />
                        <Textarea placeholder="Description (optional)" value={subjectForm.description}
                          onChange={e => setSubjectForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={createSubject} disabled={busy} className="text-white" style={{ background: ORANGE }}>Create Subject</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowAddSubject(false); setSubjectForm(emptySubjectForm); }}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {editingSubject && (
                      <div className="bg-white rounded-2xl p-4 border-2 border-blue-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm" style={{ color: NAVY }}>Edit Subject — {editingSubject.subjectCode}</h4>
                          <button onClick={() => setEditingSubject(null)}><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <Input placeholder="Subject name *" value={editSubjectForm.name}
                          onChange={e => setEditSubjectForm(p => ({ ...p, name: e.target.value }))} />
                        <Textarea placeholder="Description" value={editSubjectForm.description}
                          onChange={e => setEditSubjectForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={updateSubject} disabled={busy} className="text-white" style={{ background: NAVY }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSubject(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {courseSubjects.map(sub => (
                        <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3 p-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: NAVY }}>{sub.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-[10px] text-gray-400">{sub.subjectCode}</p>
                              <p className="font-semibold text-sm" style={{ color: NAVY }}>{sub.name}</p>
                              {sub.description && <p className="text-xs text-gray-500 truncate">{sub.description}</p>}
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => selectSubject(sub)}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1"
                                style={{ background: NAVY }}>
                                <Tag className="w-3 h-3" /> Chapters
                              </button>
                              <button onClick={() => { setEditingSubject(sub); setEditSubjectForm({ name: sub.name, description: sub.description ?? "" }); setShowAddSubject(false); }}
                                className="p-1.5 rounded-lg border border-blue-200 text-blue-500">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteSubject(sub.id, sub.name)}
                                className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {courseSubjects.length === 0 && (
                        <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                          No subjects yet. Add the first subject or use Syllabus Import to auto-create.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Syllabus Import sub-tab */}
                {subjectTab === "syllabus" && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 space-y-1">
                      <p className="font-semibold">📋 CSV Format</p>
                      <p className="text-xs font-mono bg-white border border-blue-100 rounded-lg px-3 py-2 mt-1">
                        Date (DD/MM/YYYY), Chapter, Topic, Description<br />
                        11/07/2026,Numbers,Place Value,Understanding place values<br />
                        Numbers,Comparing Numbers,Compare greater and smaller
                      </p>
                      <p className="text-xs text-blue-600 mt-1">Date column is optional. Each topic will get a scheduled live class automatically.</p>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">Subject (optional)</label>
                        <Select value={syllabusSubjectId} onValueChange={setSyllabusSubjectId}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No specific subject</SelectItem>
                            {courseSubjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-600">Course</label>
                          <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200 truncate">{selectedCourse.title}</div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-600">Grade · Board</label>
                          <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                            {gradeLabel(selectedCourse.grade)}{selectedCourse.board ? ` · ${selectedCourse.board}` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600">Upload CSV</label>
                        <div
                          onClick={() => fileRef.current?.click()}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleCSVFile(f); }}
                          className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-all">
                          <FileUp className="w-7 h-7 text-gray-400" />
                          {syllabusFileName ? (
                            <p className="text-sm font-medium text-gray-700">{syllabusFileName}</p>
                          ) : (
                            <p className="text-sm text-gray-500">Click or drag & drop your CSV file here</p>
                          )}
                          {syllabusRows.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> {syllabusRows.length} rows parsed
                            </span>
                          )}
                          <input ref={fileRef} type="file" accept=".csv" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }} />
                        </div>
                      </div>

                      {syllabusRows.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-600">Preview ({syllabusRows.length} rows)</p>
                          <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Date</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Chapter</th>
                                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Topic</th>
                                </tr>
                              </thead>
                              <tbody>
                                {syllabusRows.slice(0, 50).map((row, i) => (
                                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{row.date ?? "—"}</td>
                                    <td className="px-3 py-1.5 font-medium text-gray-700">{row.chapter}</td>
                                    <td className="px-3 py-1.5 text-gray-600">{row.topic}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {syllabusRows.length > 50 && <p className="text-center text-xs text-gray-400 py-2">+{syllabusRows.length - 50} more rows</p>}
                          </div>
                        </div>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 accent-orange-500" />
                        <span className="text-sm text-gray-700">Replace Existing Syllabus</span>
                        <span className="text-xs text-red-500">(deletes all existing chapters, topics & classes)</span>
                      </label>

                      <Button onClick={importSyllabus} disabled={syllabusImporting || syllabusRows.length === 0}
                        className="w-full text-white gap-2 font-semibold" style={{ background: ORANGE }}>
                        <Upload className="w-4 h-4" />
                        {syllabusImporting ? "Importing…" : `Upload & Import${syllabusRows.length > 0 ? ` (${syllabusRows.length} rows)` : ""}`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: LIVE CLASSES ─────────────────────────── */}
            {courseTab === "liveclasses" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>Live Classes Schedule</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{courseLiveClasses.length} classes scheduled for this course</p>
                  </div>
                  <a href="/admin#liveclasses"
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 font-medium">
                    Manage All Live Classes →
                  </a>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total", val: courseLiveClasses.length, color: "bg-blue-50 text-blue-600" },
                    { label: "Upcoming", val: courseLiveClasses.filter(lc => lc.status === "upcoming" || new Date(lc.scheduledAt) >= new Date()).length, color: "bg-green-50 text-green-600" },
                    { label: "Completed", val: courseLiveClasses.filter(lc => lc.status === "completed").length, color: "bg-gray-100 text-gray-600" },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`rounded-xl px-3 py-2 text-center ${color}`}>
                      <p className="text-2xl font-extrabold">{val}</p>
                      <p className="text-xs font-medium">{label}</p>
                    </div>
                  ))}
                </div>

                {courseLiveClasses.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
                    No live classes scheduled for this course yet.<br />
                    <span className="text-xs">Upload a syllabus to auto-generate classes, or go to Live Classes to create manually.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...courseLiveClasses].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map(lc => (
                      <div key={lc.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                        <div className="w-10 text-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-blue-500 uppercase block">
                            {new Date(lc.scheduledAt).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}
                          </span>
                          <span className="text-lg font-extrabold leading-none block" style={{ color: NAVY }}>
                            {new Date(lc.scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", timeZone: "Asia/Kolkata" })}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{lc.title}</p>
                          <p className="text-xs text-gray-500">{lc.teacher ?? "No teacher"}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-600 font-medium">
                            {new Date(lc.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            lc.status === "live" ? "bg-red-100 text-red-600" :
                            lc.status === "completed" ? "bg-gray-100 text-gray-500" : "bg-green-50 text-green-600"
                          }`}>{lc.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: TEACHERS ─────────────────────────────── */}
            {courseTab === "teachers" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>Teacher Assignment</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{courseTeachers.length} teachers assigned to this course</p>
                  </div>
                </div>

                {/* Assign teacher form */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 space-y-3">
                  <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Assign a Teacher</h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      {allTeachers.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs text-gray-400">
                          <AlertCircle className="w-3.5 h-3.5" /> Loading teachers…
                        </div>
                      ) : (
                        <Select value={addTeacherIdStr} onValueChange={setAddTeacherIdStr}>
                          <SelectTrigger className="text-sm bg-white"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                          <SelectContent>
                            {allTeachers.filter(t => !courseTeachers.find(ct => ct.teacherId === t.id)).map(t => (
                              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button size="sm" onClick={assignTeacher} disabled={busy || !addTeacherIdStr}
                      className="text-white gap-1" style={{ background: ORANGE }}>
                      <Plus className="w-3.5 h-3.5" /> Assign
                    </Button>
                  </div>
                </div>

                {/* Assigned teachers list */}
                {courseTeachers.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
                    No teachers assigned yet. Use the form above to assign teachers.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {courseTeachers.map(tc => (
                      <div key={tc.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
                          style={{ background: NAVY }}>{tc.teacherName.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800">{tc.teacherName}</p>
                          <p className="text-xs text-gray-400">Assigned {new Date(tc.assignedAt).toLocaleDateString("en-IN")}</p>
                        </div>
                        <button onClick={() => removeTeacher(tc.id, tc.teacherName)}
                          className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600 hover:border-red-200">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: STUDENTS ─────────────────────────────── */}
            {courseTab === "students" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>Enrolled Students</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{courseMasteryStudents.length > 0 ? `${courseMasteryStudents.length} students` : "Loading…"}</p>
                  </div>
                  <a href="/admin#mastery-students"
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-600 font-medium">
                    Manage All Students →
                  </a>
                </div>

                {courseMasteryStudents.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 rounded-2xl">
                    No students enrolled in this course instance yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Student</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Grade</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Payment</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Admitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {courseMasteryStudents.map((s, idx) => (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="px-4 py-2.5">
                              <p className="font-semibold text-gray-800">{s.studentName}</p>
                              <p className="text-xs text-gray-400">{s.phone}</p>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{gradeLabel(s.grade)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                s.masteryStatus === "Active" ? "bg-green-50 text-green-600" :
                                s.masteryStatus === "Inactive" ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-600"
                              }`}>{s.masteryStatus}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                s.paymentStatus === "paid" ? "bg-green-50 text-green-600" :
                                s.paymentStatus === "pending" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                              }`}>{s.paymentStatus}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-400">{fmtDate(s.admissionDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: DOCUMENTS ────────────────────────────── */}
            {courseTab === "documents" && (
              <div className="p-5 space-y-5">
                <div>
                  <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Course Documents</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Banner */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" style={{ color: ORANGE }} />
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>Banner Image</p>
                      </div>
                      {selectedCourse.bannerUrl || selectedCourse.thumbnailUrl ? (
                        <div className="rounded-xl overflow-hidden h-32 bg-gray-100">
                          <img src={selectedCourse.bannerUrl || selectedCourse.thumbnailUrl || ""} alt="Banner"
                            className="w-full h-full object-cover"
                            onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                        </div>
                      ) : (
                        <div className="rounded-xl h-24 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                          No banner image
                        </div>
                      )}
                      <Input placeholder="Banner image URL" value={basicInfoForm.bannerUrl || selectedCourse.bannerUrl || ""}
                        onChange={e => setBasicInfoForm(p => ({ ...p, bannerUrl: e.target.value }))}
                        className="text-xs" />
                      <Button size="sm" className="w-full text-white gap-1 text-xs" style={{ background: NAVY }}
                        onClick={async () => {
                          if (!basicInfoForm.bannerUrl) return;
                          await apiFetch(`/admin/courses/${selectedCourse.id}`, { method: "PUT", body: JSON.stringify({ bannerUrl: basicInfoForm.bannerUrl }) });
                          setSelectedCourse(p => p ? { ...p, bannerUrl: basicInfoForm.bannerUrl } : p);
                          flash("Banner saved!", true);
                        }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save Banner URL
                      </Button>
                    </div>

                    {/* Brochure */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: ORANGE }} />
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>Course Brochure</p>
                      </div>
                      {selectedCourse.brochureUrl ? (
                        <a href={selectedCourse.brochureUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm hover:bg-blue-100">
                          <FileText className="w-4 h-4" /> View Brochure PDF
                        </a>
                      ) : (
                        <div className="rounded-xl h-16 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                          No brochure uploaded
                        </div>
                      )}
                      <Input placeholder="Brochure PDF URL" value={basicInfoForm.brochureUrl || selectedCourse.brochureUrl || ""}
                        onChange={e => setBasicInfoForm(p => ({ ...p, brochureUrl: e.target.value }))}
                        className="text-xs" />
                      <Button size="sm" className="w-full text-white gap-1 text-xs" style={{ background: NAVY }}
                        onClick={async () => {
                          if (!basicInfoForm.brochureUrl) return;
                          await apiFetch(`/admin/courses/${selectedCourse.id}`, { method: "PUT", body: JSON.stringify({ brochureUrl: basicInfoForm.brochureUrl }) });
                          setSelectedCourse(p => p ? { ...p, brochureUrl: basicInfoForm.brochureUrl } : p);
                          flash("Brochure saved!", true);
                        }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save Brochure URL
                      </Button>
                    </div>

                    {/* Worksheets */}
                    <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4 space-y-2">
                      <div className="flex items-center gap-2 opacity-60">
                        <ClipboardList className="w-4 h-4 text-gray-400" />
                        <p className="font-semibold text-sm text-gray-500">Worksheets</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-400">Upload subject-wise worksheets and practice papers.</p>
                    </div>

                    {/* Study Material */}
                    <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-4 space-y-2">
                      <div className="flex items-center gap-2 opacity-60">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <p className="font-semibold text-sm text-gray-500">Study Material</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold">Coming Soon</span>
                      </div>
                      <p className="text-xs text-gray-400">Manage and distribute study materials for students.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: REPORTS & ANALYTICS ──────────────────── */}
            {courseTab === "reports" && (
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Reports & Analytics</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {courseStats && [
                    { label: "Students Enrolled", val: courseStats.studentsEnrolled, icon: Users, color: "#EFF6FF" },
                    { label: "Teachers Assigned", val: courseStats.teachersAssigned, icon: UserCheck, color: "#FFF7ED" },
                    { label: "Total Subjects", val: courseStats.subjects, icon: BookOpen, color: "#F0FDF4" },
                    { label: "Curriculum Topics", val: courseStats.topics, icon: Tag, color: "#FDF4FF" },
                    { label: "Live Classes", val: courseStats.liveClasses, icon: Video, color: "#FEF3C7" },
                    { label: "Upcoming Classes", val: upcomingClasses.length, icon: Calendar, color: "#EFF6FF" },
                  ].map(({ label, val, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                        <Icon className="w-5 h-5" style={{ color: NAVY }} />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold" style={{ color: NAVY }}>{val}</p>
                        <p className="text-xs text-gray-500">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Detailed analytics coming soon</p>
                  <p className="text-xs mt-1">Student performance charts, attendance rates, and progress reports will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          CHAPTERS VIEW (inside a subject)
          ════════════════════════════════════════════════════════ */}
      {view === "chapters" && selectedSubject && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{selectedCourse?.courseCode} · {selectedSubject.subjectCode}</p>
                <h2 className="font-bold text-base mt-0.5" style={{ color: NAVY }}>{selectedSubject.name}</h2>
                <p className="text-xs text-gray-500">in {selectedCourse?.title}</p>
              </div>
              <button onClick={goBack} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Course
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Chapters organize topics into logical units.</p>
            <Button size="sm" onClick={() => setShowAddChapter(p => !p)} className="text-white gap-1" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Add Chapter
            </Button>
          </div>

          {showAddChapter && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Chapter in {selectedSubject.name}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Chapter name *" value={chapterForm.name}
                  onChange={e => setChapterForm(p => ({ ...p, name: e.target.value }))} className="sm:col-span-2" />
                <Input placeholder="Sequence No." type="number" value={chapterForm.sequenceNo}
                  onChange={e => setChapterForm(p => ({ ...p, sequenceNo: e.target.value }))} />
                <Textarea placeholder="Description (optional)" value={chapterForm.description}
                  onChange={e => setChapterForm(p => ({ ...p, description: e.target.value }))} rows={2} className="sm:col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createChapter} disabled={busy} className="text-white" style={{ background: ORANGE }}>Create Chapter</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddChapter(false); setChapterForm(emptyChapterForm); }}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {chapters.map((ch, idx) => (
              <div key={ch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: NAVY }}>{ch.sequenceNo ?? (idx + 1)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-gray-400">{chpCode(ch.id)}</p>
                    <p className="font-semibold text-sm" style={{ color: NAVY }}>{ch.name}</p>
                    {ch.description && <p className="text-xs text-gray-500 truncate">{ch.description}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => selectChapter(ch)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1"
                      style={{ background: NAVY }}>
                      <Tag className="w-3 h-3" /> Topics
                    </button>
                    <button onClick={() => deleteChapter(ch.id, ch.name)}
                      className="p-1.5 rounded-lg border border-gray-200 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {chapters.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                No chapters yet. Add manually or use Syllabus Import in the Curriculum tab.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          TOPICS VIEW (inside a chapter)
          ════════════════════════════════════════════════════════ */}
      {view === "topics" && selectedChapter && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{selectedCourse?.courseCode} · {selectedSubject?.subjectCode} · {chpCode(selectedChapter.id)}</p>
                <h2 className="font-bold text-base mt-0.5" style={{ color: NAVY }}>{selectedChapter.name}</h2>
                <p className="text-xs text-gray-500">in {selectedSubject?.name} · {selectedCourse?.title}</p>
              </div>
              <button onClick={goBack} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Chapters
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Topics are the smallest unit. Assign live classes, homework, and tests here.</p>
            <Button size="sm" onClick={() => setShowAddTopic(p => !p)} className="text-white gap-1" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Add Topic
            </Button>
          </div>

          {showAddTopic && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Topic in {selectedChapter.name}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Topic name *" value={topicForm.name}
                  onChange={e => setTopicForm(p => ({ ...p, name: e.target.value }))} className="sm:col-span-2" />
                <Select value={topicForm.topicStatus} onValueChange={v => setTopicForm(p => ({ ...p, topicStatus: v }))}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Description (optional)" value={topicForm.description}
                  onChange={e => setTopicForm(p => ({ ...p, description: e.target.value }))} />
                <Textarea placeholder="Learning Objective (optional)" value={topicForm.learningObjective}
                  onChange={e => setTopicForm(p => ({ ...p, learningObjective: e.target.value }))} rows={2} className="sm:col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createTopic} disabled={busy} className="text-white" style={{ background: ORANGE }}>Create Topic</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddTopic(false); setTopicForm(emptyTopicForm); }}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {topics.map((tp, idx) => {
              const cc = contentCounts[tp.id];
              const total = cc ? Object.values(cc).reduce((a, b) => a + b, 0) : 0;
              return (
                <div key={tp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ background: ORANGE }}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-[10px] text-gray-400">{topCode(tp.id)}</p>
                          <p className="font-semibold text-sm" style={{ color: NAVY }}>{tp.name}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tp.topicStatus === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {tp.topicStatus}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {total} item{total !== 1 ? "s" : ""}
                          </span>
                          <button onClick={() => deleteTopic(tp.id, tp.name)} className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {tp.description && <p className="text-xs text-gray-500 mt-0.5">{tp.description}</p>}
                      {tp.learningObjective && <p className="text-xs text-blue-600 mt-0.5 italic">🎯 {tp.learningObjective}</p>}
                      {cc && total > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {cc.liveClasses > 0 && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium"><Video className="w-2.5 h-2.5" /> {cc.liveClasses} Live</span>}
                          {cc.homework > 0 && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium"><BookOpen className="w-2.5 h-2.5" /> {cc.homework} HW</span>}
                          {cc.assignments > 0 && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-medium"><ClipboardList className="w-2.5 h-2.5" /> {cc.assignments} Asgn</span>}
                          {cc.tests > 0 && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium"><FileText className="w-2.5 h-2.5" /> {cc.tests} Tests</span>}
                          {cc.recordings > 0 && <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium"><PlayCircle className="w-2.5 h-2.5" /> {cc.recordings} Rec</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {topics.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                No topics yet. Add manually or use Syllabus Import in the Curriculum tab.
              </div>
            )}
          </div>

          {topics.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Assigning content to topics</p>
              <p className="text-xs text-blue-600">When scheduling Live Classes, Homework, Tests, or Recordings, select the Topic from the dropdown to link it here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
