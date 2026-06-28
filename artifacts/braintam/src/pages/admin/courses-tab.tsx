import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, ChevronRight, BookOpen, GraduationCap, Layers, Tag,
  Video, FileText, ClipboardList, PlayCircle, RotateCcw, Edit3, Search,
  Archive, CheckCircle2, Clock, ChevronDown, ChevronUp, Pencil, X,
  DollarSign, Users, Upload, ImageIcon, FileUp, AlertCircle, CheckCircle,
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
  const base = API_BASE;
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

function crsCode(id: number) { return `CRS${String(id).padStart(4, "0")}`; }
function subCode(id: number) { return `SUB${String(id).padStart(4, "0")}`; }
function chpCode(id: number) { return `CHP${String(id).padStart(4, "0")}`; }
function topCode(id: number) { return `TOP${String(id).padStart(4, "0")}`; }

interface AcademicYear { id: number; name: string; isActive: boolean; }
interface CourseItem {
  id: number; title: string; grade: number; board: string | null;
  academicYearId: number | null; subjectId: number | null;
  isPublished: boolean; status: string; teacher: string | null;
  description: string | null; thumbnailUrl: string | null;
  courseCode: string; courseType?: string | null;
  // Extended Mastery fields
  duration?: string | null;
  originalPrice?: number | null;
  scholarshipPrice?: number | null;
  registrationFee?: number | null;
  studentCapacity?: number | null;
  bannerUrl?: string | null;
  brochureUrl?: string | null;
  mentorIdsJson?: string | null;
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

type CmsView = "courses" | "subjects" | "chapters" | "topics";
type SubjectView = "subjects" | "syllabus";

const emptyCourseForm = {
  title: "", grade: "", board: "", academicYearId: "", status: "active",
  duration: "", description: "",
  // Pricing
  originalPrice: "", scholarshipPrice: "", registrationFee: "", paymentPlansJson: "",
  // Academic
  teacher: "", mentorIdsJson: "", studentCapacity: "",
  // Media
  bannerUrl: "", brochureUrl: "",
};

const emptySubjectForm = { name: "", description: "" };
const emptyChapterForm = { name: "", description: "", sequenceNo: "" };
const emptyTopicForm = { name: "", description: "", learningObjective: "", topicStatus: "active" };

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

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
      <Input placeholder={label} value={value} onChange={e => onChange(e.target.value)}
        type="number" min="0" className="pl-7 text-sm" />
    </div>
  );
}

function BannerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
        <Input placeholder="Banner image URL (paste link or upload)" value={value} onChange={e => onChange(e.target.value)} className="flex-1 text-sm" />
      </div>
      {value && (
        <div className="relative rounded-xl overflow-hidden h-28 bg-gray-100 border border-gray-200">
          <img src={value} alt="Banner preview" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <button onClick={() => onChange("")}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {!value && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center text-gray-400 text-xs gap-1">
          <ImageIcon className="w-4 h-4" /> Paste banner URL above to preview
        </div>
      )}
    </div>
  );
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  const rows: ParsedRow[] = [];
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{4}$/;

  for (const line of lines) {
    // Split by comma but handle quoted fields
    const cols = line.split(",").map(s => s.trim());
    if (cols.length < 2) continue;

    const isDate = dateRe.test(cols[0]);
    if (isDate && cols.length >= 3) {
      rows.push({ date: cols[0], chapter: cols[1], topic: cols[2], description: cols[3] });
    } else if (!isDate && cols.length >= 2) {
      rows.push({ chapter: cols[0], topic: cols[1], description: cols[2] });
    }
  }
  // Filter out header-like rows and empty
  return rows.filter(r => r.chapter && r.topic &&
    !r.chapter.toLowerCase().includes("chapter") &&
    !r.topic.toLowerCase().includes("topic"));
}

export function CourseManagementTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [courseSubjects, setCourseSubjects] = useState<CourseSubject[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [contentCounts, setContentCounts] = useState<Record<number, ContentCounts>>({});

  const [view, setView] = useState<CmsView>("courses");
  const [subjectView, setSubjectView] = useState<SubjectView>("subjects");
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CourseSubject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showYearPanel, setShowYearPanel] = useState(true);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editCourseForm, setEditCourseForm] = useState(emptyCourseForm);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CourseSubject | null>(null);
  const [editSubjectForm, setEditSubjectForm] = useState(emptySubjectForm);

  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);

  const [courseSearch, setCourseSearch] = useState("");
  const [courseGradeFilter, setCourseGradeFilter] = useState("all");
  const [courseYearFilter, setCourseYearFilter] = useState("all");
  const [courseStatusFilter, setCourseStatusFilter] = useState("all");
  const [courseTypeFilter, setCourseTypeFilter] = useState("all");

  const [yearName, setYearName] = useState("");
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [subjectForm, setSubjectForm] = useState(emptySubjectForm);
  const [chapterForm, setChapterForm] = useState(emptyChapterForm);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);

  // Syllabus import state
  const [syllabusSubjectId, setSyllabusSubjectId] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [syllabusRows, setSyllabusRows] = useState<ParsedRow[]>([]);
  const [syllabusImporting, setSyllabusImporting] = useState(false);
  const [syllabusFileName, setSyllabusFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  // ── Academic Years ──────────────────────────────────────────────
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

  // ── Courses ─────────────────────────────────────────────────────
  const buildCoursePayload = (f: typeof emptyCourseForm) => ({
    title: f.title.trim(),
    grade: Number(f.grade),
    board: f.board || null,
    academicYearId: f.academicYearId ? Number(f.academicYearId) : null,
    status: f.status || "active",
    duration: f.duration.trim() || null,
    description: f.description.trim() || null,
    originalPrice: f.originalPrice ? Number(f.originalPrice) : null,
    scholarshipPrice: f.scholarshipPrice ? Number(f.scholarshipPrice) : null,
    registrationFee: f.registrationFee ? Number(f.registrationFee) : null,
    paymentPlansJson: f.paymentPlansJson.trim() || null,
    teacher: f.teacher.trim() || null,
    mentorIdsJson: f.mentorIdsJson.trim() || null,
    studentCapacity: f.studentCapacity ? Number(f.studentCapacity) : null,
    bannerUrl: f.bannerUrl.trim() || null,
    brochureUrl: f.brochureUrl.trim() || null,
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

  const updateCourseStatus = async (course: CourseItem, status: string) => {
    await apiFetch(`/admin/courses/${course.id}`, { method: "PUT", body: JSON.stringify({ status }) });
    setCourses(p => p.map(c => c.id === course.id ? { ...c, status } : c));
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

  const selectCourse = async (course: CourseItem) => {
    setSelectedCourse(course);
    setSubjectView("subjects");
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/course-subjects?courseId=${course.id}`);
      setCourseSubjects(await r.json());
    } catch { flash("Failed to load subjects", false); }
    setLoading(false);
    setView("subjects");
  };

  // ── Course Subjects ─────────────────────────────────────────────
  const createSubject = async () => {
    if (!selectedCourse || !subjectForm.name.trim()) { flash("Subject name is required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/course-subjects", {
        method: "POST",
        body: JSON.stringify({
          courseId: selectedCourse.id,
          name: subjectForm.name.trim(),
          description: subjectForm.description.trim() || null,
        }),
      });
      if (!r.ok) { flash("Failed to create subject", false); return; }
      const sub: CourseSubject = await r.json();
      setCourseSubjects(p => [...p, sub]);
      setSubjectForm(emptySubjectForm);
      setShowAddSubject(false);
      flash("Subject created!", true);
    } finally { setBusy(false); }
  };

  const updateSubject = async () => {
    if (!editingSubject) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/course-subjects/${editingSubject.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editSubjectForm.name.trim(),
          description: editSubjectForm.description.trim() || null,
        }),
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

  // ── Chapters ────────────────────────────────────────────────────
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

  // ── Topics ──────────────────────────────────────────────────────
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

  // ── Syllabus import ─────────────────────────────────────────────
  const handleCSVFile = (file: File) => {
    setSyllabusFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setSyllabusRows(rows);
    };
    reader.readAsText(file);
  };

  const importSyllabus = async () => {
    if (!selectedCourse || syllabusRows.length === 0) {
      flash("Please upload a CSV file first", false); return;
    }
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
      setSyllabusRows([]);
      setSyllabusFileName("");
      setReplaceExisting(false);
      if (fileRef.current) fileRef.current.value = "";
    } finally { setSyllabusImporting(false); }
  };

  const goBack = () => {
    if (view === "topics") { setView("chapters"); setSelectedChapter(null); setTopics([]); setContentCounts({}); }
    else if (view === "chapters") { setView("subjects"); setSelectedSubject(null); setChapters([]); }
    else if (view === "subjects") { setView("courses"); setSelectedCourse(null); setCourseSubjects([]); }
  };

  const yearName_ = (id: number | null) => academicYears.find(y => y.id === id)?.name ?? "—";

  const filteredCourses = courses.filter(c => {
    if (courseGradeFilter !== "all" && String(c.grade) !== courseGradeFilter) return false;
    if (courseYearFilter !== "all" && String(c.academicYearId) !== courseYearFilter) return false;
    if (courseStatusFilter !== "all" && c.status !== courseStatusFilter) return false;
    if (courseTypeFilter !== "all" && (c as CourseItem & { courseType?: string }).courseType !== courseTypeFilter) return false;
    if (courseSearch) {
      const q = courseSearch.toLowerCase();
      return c.title.toLowerCase().includes(q) || (c.teacher ?? "").toLowerCase().includes(q) || (c.courseCode ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const CourseForm = ({ form, setForm, onSubmit, onCancel, submitLabel }: {
    form: typeof emptyCourseForm;
    setForm: React.Dispatch<React.SetStateAction<typeof emptyCourseForm>>;
    onSubmit: () => void;
    onCancel: () => void;
    submitLabel: string;
  }) => (
    <div className="space-y-5">
      {/* BASIC INFO */}
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
            <SelectTrigger className={`text-sm ${!form.academicYearId ? "border-red-300" : ""}`}><SelectValue placeholder="Academic Year *" /></SelectTrigger>
            <SelectContent>{academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="Duration (e.g. 1 Year · Apr–Mar)" value={form.duration}
            onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className="sm:col-span-2 text-sm" />
          <Textarea placeholder="Description (optional)" value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="sm:col-span-2 text-sm" />
        </div>
      </FormSection>

      {/* PRICING */}
      <FormSection title="Pricing" icon={DollarSign}>
        <div className="grid sm:grid-cols-2 gap-3">
          <PriceInput label="Original Price" value={form.originalPrice} onChange={v => setForm(p => ({ ...p, originalPrice: v }))} />
          <PriceInput label="Scholarship Price" value={form.scholarshipPrice} onChange={v => setForm(p => ({ ...p, scholarshipPrice: v }))} />
          <PriceInput label="Registration Fee" value={form.registrationFee} onChange={v => setForm(p => ({ ...p, registrationFee: v }))} />
          <Input placeholder="Payment plans (e.g. Monthly, Quarterly, Annual)" value={form.paymentPlansJson}
            onChange={e => setForm(p => ({ ...p, paymentPlansJson: e.target.value }))} className="text-sm" />
        </div>
      </FormSection>

      {/* ACADEMIC INFO */}
      <FormSection title="Academic Info" icon={Users}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input placeholder="Primary Teacher name" value={form.teacher}
            onChange={e => setForm(p => ({ ...p, teacher: e.target.value }))} className="text-sm" />
          <Input placeholder="Student Capacity" type="number" value={form.studentCapacity}
            onChange={e => setForm(p => ({ ...p, studentCapacity: e.target.value }))} className="text-sm" />
          <Input placeholder="Assigned Mentor IDs (comma-separated)" value={form.mentorIdsJson}
            onChange={e => setForm(p => ({ ...p, mentorIdsJson: e.target.value }))} className="sm:col-span-2 text-sm" />
        </div>
      </FormSection>

      {/* MEDIA */}
      <FormSection title="Media" icon={ImageIcon}>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Banner Image</p>
            <BannerInput value={form.bannerUrl} onChange={v => setForm(p => ({ ...p, bannerUrl: v }))} />
          </div>
          <div className="flex items-center gap-2">
            <FileUp className="w-3.5 h-3.5 text-gray-400" />
            <Input placeholder="Brochure URL (PDF link)" value={form.brochureUrl}
              onChange={e => setForm(p => ({ ...p, brochureUrl: e.target.value }))} className="flex-1 text-sm" />
          </div>
        </div>
      </FormSection>

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSubmit} disabled={busy} className="text-white" style={{ background: ORANGE }}>{submitLabel}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-sm font-medium flex-wrap">
        <button onClick={() => { setView("courses"); setSelectedCourse(null); setSelectedSubject(null); setSelectedChapter(null); }}
          className="hover:underline" style={{ color: NAVY }}>Courses</button>
        {selectedCourse && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button onClick={() => { setView("subjects"); setSelectedSubject(null); setSelectedChapter(null); }}
              className="hover:underline" style={{ color: view === "subjects" ? ORANGE : NAVY }}>
              {selectedCourse.title}
            </button>
          </>
        )}
        {selectedSubject && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button onClick={() => { setView("chapters"); setSelectedChapter(null); }}
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

      {/* ── Academic Years Panel ─────────────────────────────────── */}
      {view === "courses" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <button className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold"
            style={{ color: NAVY }} onClick={() => setShowYearPanel(p => !p)}>
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Academic Years
              <span className="text-xs font-normal text-gray-400">({academicYears.length})</span>
            </span>
            {showYearPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showYearPanel && (
            <div className="px-5 pb-4 space-y-3 border-t border-gray-100">
              <div className="flex gap-2 mt-3">
                <Input placeholder="e.g. 2025-26" value={yearName} onChange={e => setYearName(e.target.value)}
                  className="flex-1 text-sm" onKeyDown={e => e.key === "Enter" && createYear()} />
                <Button size="sm" onClick={createYear} disabled={busy || !yearName.trim()} className="text-white" style={{ background: ORANGE }}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {academicYears.map(yr => (
                  <div key={yr.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium"
                    style={{ borderColor: yr.isActive ? NAVY : "#E5E7EB", color: yr.isActive ? NAVY : "#9CA3AF" }}>
                    {yr.name}
                    <button onClick={() => toggleYear(yr)} className="ml-1 opacity-60 hover:opacity-100 text-xs">{yr.isActive ? "✓" : "○"}</button>
                    <button onClick={() => deleteYear(yr.id)} className="ml-0.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {academicYears.length === 0 && <p className="text-gray-400 text-xs">No academic years yet.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          COURSES VIEW
          ══════════════════════════════════════════════════════════ */}
      {view === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">Long-term academic programs — Courses → Subjects → Chapters → Topics.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={loadBase} className="gap-1 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <Button size="sm" onClick={() => { setShowAddCourse(p => !p); setEditingCourse(null); }} className="text-white gap-1" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Add Course
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input placeholder="Search by name or CRS0001…" value={courseSearch} onChange={e => setCourseSearch(e.target.value)} className="pl-8 h-8 text-xs w-52" />
            </div>
            <Select value={courseGradeFilter} onValueChange={setCourseGradeFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Grades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {GRADES.map(g => <SelectItem key={g} value={String(g)}>{gradeLabel(g)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={courseYearFilter} onValueChange={setCourseYearFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Years" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseTypeFilter} onValueChange={setCourseTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mastery">Mastery</SelectItem>
                <SelectItem value="ignite">Ignite</SelectItem>
              </SelectContent>
            </Select>
            {(courseSearch || courseGradeFilter !== "all" || courseYearFilter !== "all" || courseStatusFilter !== "all" || courseTypeFilter !== "all") && (
              <button onClick={() => { setCourseSearch(""); setCourseGradeFilter("all"); setCourseYearFilter("all"); setCourseStatusFilter("all"); setCourseTypeFilter("all"); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
            )}
          </div>

          {/* Add Course form */}
          {showAddCourse && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-5">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Mastery Course</h3>
              <CourseForm form={courseForm} setForm={setCourseForm}
                onSubmit={createCourse} onCancel={() => { setShowAddCourse(false); setCourseForm(emptyCourseForm); }}
                submitLabel="Create Course" />
            </div>
          )}

          {/* Edit Course form */}
          {editingCourse && (
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Edit Course — <span className="font-mono text-xs">{editingCourse.courseCode}</span></h3>
                <button onClick={() => setEditingCourse(null)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <CourseForm form={editCourseForm} setForm={setEditCourseForm}
                onSubmit={updateCourse} onCancel={() => setEditingCourse(null)}
                submitLabel="Save Changes" />
            </div>
          )}

          {/* Course grid */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-36" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map(c => (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Banner */}
                  {(c.bannerUrl || c.thumbnailUrl) ? (
                    <div className="h-24 overflow-hidden">
                      <img src={c.bannerUrl || c.thumbnailUrl || ""} alt={c.title}
                        className="w-full h-full object-cover" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                    </div>
                  ) : (
                    <div className="h-1.5 w-full" style={{ background: c.status === "active" ? NAVY : c.status === "archived" ? "#9CA3AF" : "#F59E0B" }} />
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-gray-400">{c.courseCode}</p>
                        <h3 className="font-semibold text-sm leading-snug" style={{ color: NAVY }}>{c.title}</h3>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 flex items-center gap-0.5 ${statusBadge(c.status)}`}>
                        {statusIcon(c.status)} {c.status?.toUpperCase() ?? ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{gradeLabel(c.grade)}</span>
                      {c.board && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{c.board}</span>}
                      {c.academicYearId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{yearName_(c.academicYearId)}</span>}
                      {c.duration && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{c.duration}</span>}
                    </div>
                    {(c.scholarshipPrice || c.originalPrice) && (
                      <div className="flex items-center gap-2">
                        {c.scholarshipPrice && <span className="text-sm font-bold" style={{ color: ORANGE }}>₹{c.scholarshipPrice.toLocaleString("en-IN")}</span>}
                        {c.originalPrice && c.originalPrice !== c.scholarshipPrice && (
                          <span className="text-xs text-gray-400 line-through">₹{c.originalPrice.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    )}
                    {c.teacher && <p className="text-xs text-gray-500">👤 {c.teacher}</p>}
                    <div className="flex gap-1.5 pt-1">
                      <button onClick={() => selectCourse(c)}
                        className="flex-1 text-xs py-1.5 rounded-lg font-semibold text-white flex items-center justify-center gap-1"
                        style={{ background: NAVY }}>
                        <Layers className="w-3 h-3" /> Manage
                      </button>
                      <button
                        onClick={() => {
                          setEditingCourse(c);
                          setEditCourseForm({
                            title: c.title, grade: String(c.grade), board: c.board ?? "",
                            academicYearId: c.academicYearId ? String(c.academicYearId) : "",
                            status: c.status ?? "active", duration: c.duration ?? "",
                            description: c.description ?? "",
                            originalPrice: c.originalPrice ? String(c.originalPrice) : "",
                            scholarshipPrice: c.scholarshipPrice ? String(c.scholarshipPrice) : "",
                            registrationFee: c.registrationFee ? String(c.registrationFee) : "",
                            paymentPlansJson: "",
                            teacher: c.teacher ?? "",
                            mentorIdsJson: c.mentorIdsJson ?? "",
                            studentCapacity: c.studentCapacity ? String(c.studentCapacity) : "",
                            bannerUrl: c.bannerUrl ?? c.thumbnailUrl ?? "",
                            brochureUrl: c.brochureUrl ?? "",
                          });
                          setShowAddCourse(false);
                        }}
                        className="text-xs p-1.5 rounded-lg border border-blue-200 hover:border-blue-400 text-blue-500">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {c.status !== "archived" ? (
                        <button onClick={() => updateCourseStatus(c, "archived")}
                          title="Archive" className="text-xs p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-400">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => updateCourseStatus(c, "active")}
                          title="Activate" className="text-xs p-1.5 rounded-lg border border-green-200 text-green-500">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteCourse(c.id, c.title)}
                        className="text-xs p-1.5 rounded-lg border border-gray-200 hover:border-red-200 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCourses.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-3 text-center py-12 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                  {courses.length === 0 ? "No courses yet. Click \"Add Course\" to create one." : "No courses match your filters."}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          SUBJECTS VIEW (inside a course)
          ══════════════════════════════════════════════════════════ */}
      {view === "subjects" && selectedCourse && (
        <div className="space-y-4">
          {/* Course info header */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-gray-400">{selectedCourse.courseCode} · {gradeLabel(selectedCourse.grade)}</p>
                <h2 className="font-bold text-base mt-0.5" style={{ color: NAVY }}>{selectedCourse.title}</h2>
                {selectedCourse.duration && <p className="text-xs text-gray-500 mt-0.5">📅 {selectedCourse.duration}</p>}
              </div>
              <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">← Back</button>
            </div>
          </div>

          {/* Tab toggle: Subjects | Syllabus Import */}
          <div className="flex border-b border-gray-200">
            <button onClick={() => setSubjectView("subjects")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${subjectView === "subjects" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Subjects</span>
            </button>
            <button onClick={() => setSubjectView("syllabus")}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${subjectView === "syllabus" ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> Syllabus Import</span>
            </button>
          </div>

          {/* ── Subjects sub-tab ── */}
          {subjectView === "subjects" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Add subjects inside this course (e.g. Mathematics, Science).</p>
                <Button size="sm" onClick={() => setShowAddSubject(p => !p)} className="text-white gap-1" style={{ background: ORANGE }}>
                  <Plus className="w-3.5 h-3.5" /> Add Subject
                </Button>
              </div>

              {showAddSubject && (
                <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Subject</h3>
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
                <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm" style={{ color: NAVY }}>Edit Subject — {editingSubject.subjectCode}</h3>
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
                        style={{ background: NAVY }}>
                        {sub.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] text-gray-400">{sub.subjectCode}</p>
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>{sub.name}</p>
                        {sub.description && <p className="text-xs text-gray-500 truncate">{sub.description}</p>}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => selectSubject(sub)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white flex items-center gap-1"
                          style={{ background: NAVY }}>
                          <BookOpen className="w-3 h-3" /> Chapters
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
                {courseSubjects.length === 0 && !loading && (
                  <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                    No subjects yet. Add the first subject (e.g. Mathematics, Science, English).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Syllabus Import sub-tab ── */}
          {subjectView === "syllabus" && (
            <div className="space-y-4">
              {/* Info card */}
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
                {/* Subject selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Subject</label>
                  <Select value={syllabusSubjectId} onValueChange={setSyllabusSubjectId}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select a subject (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific subject</SelectItem>
                      {courseSubjects.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {courseSubjects.length === 0 && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> No subjects added yet. Import will create chapters without a subject link.
                    </p>
                  )}
                </div>

                {/* Course & Grade info (auto-filled) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Course</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200 truncate">
                      {selectedCourse.title}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-600">Grade · Board</label>
                    <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">
                      {gradeLabel(selectedCourse.grade)}{selectedCourse.board ? ` · ${selectedCourse.board}` : ""}
                    </div>
                  </div>
                </div>

                {/* File upload */}
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

                {/* Preview */}
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
                            <th className="px-3 py-2 text-left text-gray-500 font-semibold hidden sm:table-cell">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {syllabusRows.slice(0, 50).map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">{row.date ?? "—"}</td>
                              <td className="px-3 py-1.5 font-medium text-gray-700">{row.chapter}</td>
                              <td className="px-3 py-1.5 text-gray-600">{row.topic}</td>
                              <td className="px-3 py-1.5 text-gray-400 truncate max-w-32 hidden sm:table-cell">{row.description ?? ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {syllabusRows.length > 50 && (
                        <p className="text-center text-xs text-gray-400 py-2">+{syllabusRows.length - 50} more rows</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Replace checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-orange-500" />
                  <span className="text-sm text-gray-700">Replace Existing Syllabus</span>
                  <span className="text-xs text-red-500">(deletes all existing chapters, topics & scheduled classes)</span>
                </label>

                <Button
                  onClick={importSyllabus}
                  disabled={syllabusImporting || syllabusRows.length === 0}
                  className="w-full text-white gap-2 font-semibold" style={{ background: ORANGE }}>
                  <Upload className="w-4 h-4" />
                  {syllabusImporting ? "Importing…" : `Upload & Import ${syllabusRows.length > 0 ? `(${syllabusRows.length} rows)` : ""}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CHAPTERS VIEW (inside a subject)
          ══════════════════════════════════════════════════════════ */}
      {view === "chapters" && selectedSubject && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{selectedCourse?.courseCode} · {selectedSubject.subjectCode}</p>
                <h2 className="font-bold text-base mt-0.5" style={{ color: NAVY }}>{selectedSubject.name}</h2>
                <p className="text-xs text-gray-500">in {selectedCourse?.title}</p>
              </div>
              <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">← Back</button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Chapters organize content into logical units.</p>
            <Button size="sm" onClick={() => setShowAddChapter(p => !p)} className="text-white gap-1" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Add Chapter
            </Button>
          </div>

          {showAddChapter && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Chapter in {selectedSubject.name}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Chapter name * (e.g. Fractions)" value={chapterForm.name}
                  onChange={e => setChapterForm(p => ({ ...p, name: e.target.value }))} className="sm:col-span-2" />
                <Input placeholder="Sequence No. (e.g. 1)" type="number" value={chapterForm.sequenceNo}
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
                    <p className="font-mono text-[10px] text-gray-400">{ch.chapterCode}</p>
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
                No chapters yet. Add manually or use Syllabus Import.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TOPICS VIEW (inside a chapter)
          ══════════════════════════════════════════════════════════ */}
      {view === "topics" && selectedChapter && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{selectedCourse?.courseCode} · {selectedSubject?.subjectCode} · {selectedChapter.chapterCode}</p>
                <h2 className="font-bold text-base mt-0.5" style={{ color: NAVY }}>{selectedChapter.name}</h2>
                <p className="text-xs text-gray-500">in {selectedSubject?.name} · {selectedCourse?.title}</p>
              </div>
              <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">← Back</button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Topics are the smallest unit. Assign live classes, homework, tests here.</p>
            <Button size="sm" onClick={() => setShowAddTopic(p => !p)} className="text-white gap-1" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Add Topic
            </Button>
          </div>

          {showAddTopic && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Topic in {selectedChapter.name}</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Topic name * (e.g. Introduction to Fractions)" value={topicForm.name}
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
                          <p className="font-mono text-[10px] text-gray-400">{tp.topicCode}</p>
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
                      {tp.learningObjective && (
                        <p className="text-xs text-blue-600 mt-0.5 italic">🎯 {tp.learningObjective}</p>
                      )}
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
                No topics yet. Add manually or use Syllabus Import in the course.
              </div>
            )}
          </div>

          {topics.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Assigning content to topics</p>
              <p className="text-xs text-blue-600">
                When scheduling Live Classes, Homework, Tests, or Recordings, select the Topic from the dropdown to link it here.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {topics.map(tp => (
                  <span key={tp.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-semibold">
                    {tp.topicCode}: {tp.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
