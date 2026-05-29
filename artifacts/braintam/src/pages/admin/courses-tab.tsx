import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ChevronRight, Eye, EyeOff, BookOpen,
  GraduationCap, Layers, Tag, Video, FileText, ClipboardList,
  PlayCircle, RotateCcw, Edit3, ChevronDown, ChevronUp, Search, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

interface AcademicYear { id: number; name: string; isActive: boolean; }
interface CourseItem {
  id: number; title: string; grade: number; board: string | null;
  academicYearId: number | null; subjectId: number | null; subjectName: string | null;
  isPublished: boolean; teacher: string | null; description: string | null;
  thumbnailUrl: string | null;
}
interface ChapterItem {
  id: number; name: string; description: string | null; order: number;
  subjectId: number; subjectName: string; grade: number; courseId: number | null;
}
interface TopicItem { id: number; name: string; description: string | null; order: number; chapterId: number; }
interface SubjectItem { id: number; name: string; }
interface ContentCounts { liveClasses: number; homework: number; assignments: number; tests: number; recordings: number; }

const BOARDS = ["CBSE", "ICSE", "State Board", "IIT Foundation", "NEET Foundation", "Olympiad", "Other"];
const GRADES = [0, ...Array.from({ length: 10 }, (_, i) => i + 1)];
const gradeLabel = (g: number) => (g === 0 ? "Others" : `Grade ${g}`);

type CmsView = "courses" | "chapters" | "topics";

const emptyCourseFm = { title: "", grade: "", subjectId: "", board: "", academicYearId: "", description: "", teacher: "", thumbnailUrl: "" };

export function CourseManagementTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [contentCounts, setContentCounts] = useState<Record<number, ContentCounts>>({});

  const [view, setView] = useState<CmsView>("courses");
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterItem | null>(null);

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showYearPanel, setShowYearPanel] = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);

  // Edit course state
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editForm, setEditForm] = useState(emptyCourseFm);

  // Course list filters
  const [courseSearch, setCourseSearch] = useState("");
  const [courseGradeFilter, setCourseGradeFilter] = useState("all");
  const [courseYearFilter, setCourseYearFilter] = useState("all");

  const [yearName, setYearName] = useState("");
  const [courseForm, setCourseForm] = useState(emptyCourseFm);
  const [chapterForm, setChapterForm] = useState({ name: "", description: "", subjectId: "" });
  const [topicForm, setTopicForm] = useState({ name: "", description: "" });

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [yrs, subj, crs] = await Promise.all([
        apiFetch("/admin/academic-years").then(r => r.json()),
        apiFetch("/subjects").then(r => r.json()),
        apiFetch("/admin/courses").then(r => r.json()),
      ]);
      setAcademicYears(Array.isArray(yrs) ? yrs : []);
      setSubjects(Array.isArray(subj) ? subj : []);
      setCourses(Array.isArray(crs) ? crs : []);
    } catch { flash("Failed to load data", false); }
    setLoading(false);
  }, [flash]);

  useEffect(() => { loadBase(); }, [loadBase]);

  // Auto-select the only/active academic year so users don't have to pick it manually
  useEffect(() => {
    if (academicYears.length === 0) return;
    const active = academicYears.find(y => y.isActive) ?? academicYears[0];
    if (active) {
      setCourseForm(p => p.academicYearId ? p : { ...p, academicYearId: String(active.id) });
      setEditForm(p => p.academicYearId ? p : { ...p, academicYearId: String(active.id) });
    }
  }, [academicYears]);

  // ── Academic Years ──────────────────────────────────────────────
  const createYear = async () => {
    if (!yearName.trim()) return;
    setBusy(true);
    try {
      const r = await apiFetch("/admin/academic-years", { method: "POST", body: JSON.stringify({ name: yearName.trim() }) });
      if (!r.ok) { flash("Failed to create academic year", false); return; }
      setYearName("");
      const yr: AcademicYear = await r.json();
      setAcademicYears(p => [...p, yr]);
      flash(`Academic year "${yr.name}" created`, true);
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
  const createCourse = async () => {
    const { title, grade, subjectId, thumbnailUrl, board, academicYearId, description, teacher } = courseForm;
    if (!title.trim()) { flash("Course title is required", false); return; }
    if (!grade) { flash("Please select a grade", false); return; }
    if (!academicYearId) { flash("Academic Year is required — create one in the Academic Years panel above first", false); return; }
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        grade: Number(grade),
        subjectId: (subjectId && subjectId !== "none") ? Number(subjectId) : null,
        thumbnailUrl: thumbnailUrl.trim() || "https://placehold.co/400x240?text=Course",
        board: board || null,
        academicYearId: Number(academicYearId),
        description: description.trim() || null,
        teacher: teacher.trim() || null,
      };
      const r = await apiFetch("/admin/courses", { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        flash(d.error ?? "Failed to create course", false);
        return;
      }
      setCourseForm(emptyCourseFm);
      setShowAddCourse(false);
      await loadBase();
      flash("Course created", true);
    } finally { setBusy(false); }
  };

  const updateCourse = async () => {
    if (!editingCourse) return;
    const { title, grade, subjectId, thumbnailUrl, board, academicYearId, description, teacher } = editForm;
    if (!title.trim()) { flash("Course title is required", false); return; }
    if (!grade) { flash("Please select a grade", false); return; }
    if (!academicYearId) { flash("Academic Year is required", false); return; }
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        grade: Number(grade),
        subjectId: (subjectId && subjectId !== "none") ? Number(subjectId) : null,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        board: board || null,
        academicYearId: Number(academicYearId),
        description: description.trim() || null,
        teacher: teacher.trim() || null,
      };
      const r = await apiFetch(`/admin/courses/${editingCourse.id}`, { method: "PUT", body: JSON.stringify(body) });
      if (!r.ok) { flash("Failed to update course", false); return; }
      setEditingCourse(null);
      await loadBase();
      flash("Course updated!", true);
    } finally { setBusy(false); }
  };

  const togglePublish = async (course: CourseItem) => {
    await apiFetch(`/admin/courses/${course.id}`, {
      method: "PUT",
      body: JSON.stringify({ isPublished: !course.isPublished }),
    });
    setCourses(p => p.map(c => c.id === course.id ? { ...c, isPublished: !c.isPublished } : c));
    flash(`Course ${course.isPublished ? "unpublished" : "published"}`, true);
  };

  const deleteCourse = async (id: number, title: string) => {
    if (!confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/courses/${id}`, { method: "DELETE" });
      setCourses(p => p.filter(c => c.id !== id));
      flash("Course deleted", true);
    } finally { setBusy(false); }
  };

  const selectCourse = async (course: CourseItem) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/chapters?courseId=${course.id}`);
      setChapters(await r.json());
    } catch { flash("Failed to load chapters", false); }
    setLoading(false);
    setView("chapters");
  };

  // ── Chapters ────────────────────────────────────────────────────
  const createChapter = async () => {
    if (!selectedCourse || !chapterForm.name.trim()) { flash("Chapter name is required", false); return; }
    if (!chapterForm.subjectId) { flash("Please select a subject for this chapter", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/chapters", {
        method: "POST",
        body: JSON.stringify({
          subjectId: Number(chapterForm.subjectId),
          grade: selectedCourse.grade,
          courseId: selectedCourse.id,
          name: chapterForm.name.trim(),
          description: chapterForm.description.trim() || null,
          order: chapters.length,
        }),
      });
      if (!r.ok) { flash("Failed to create chapter", false); return; }
      const ch: ChapterItem = await r.json();
      setChapters(p => [...p, ch]);
      setChapterForm({ name: "", description: "", subjectId: "" });
      setShowAddChapter(false);
      flash("Chapter created", true);
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
      // Load content counts for all topics
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
          order: topics.length,
        }),
      });
      if (!r.ok) { flash("Failed to create topic", false); return; }
      const tp: TopicItem = await r.json();
      setTopics(p => [...p, tp]);
      setContentCounts(p => ({ ...p, [tp.id]: { liveClasses: 0, homework: 0, assignments: 0, tests: 0, recordings: 0 } }));
      setTopicForm({ name: "", description: "" });
      setShowAddTopic(false);
      flash("Topic created", true);
    } finally { setBusy(false); }
  };

  const deleteTopic = async (id: number, name: string) => {
    if (!confirm(`Delete topic "${name}"?`)) return;
    await apiFetch(`/admin/topics/${id}`, { method: "DELETE" });
    setTopics(p => p.filter(t => t.id !== id));
    flash("Topic deleted", true);
  };

  const goBack = () => {
    if (view === "topics") { setView("chapters"); setSelectedChapter(null); setTopics([]); setContentCounts({}); }
    else if (view === "chapters") { setView("courses"); setSelectedCourse(null); setChapters([]); }
  };

  // ── Helpers ─────────────────────────────────────────────────────
  const yearName_ = (id: number | null) => academicYears.find(y => y.id === id)?.name ?? "—";

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Breadcrumb nav */}
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <button onClick={() => { setView("courses"); setSelectedCourse(null); setSelectedChapter(null); }}
          className="hover:underline" style={{ color: NAVY }}>Courses</button>
        {selectedCourse && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <button onClick={() => { setView("chapters"); setSelectedChapter(null); }}
              className="hover:underline" style={{ color: view === "chapters" ? ORANGE : NAVY }}>{selectedCourse.title}</button>
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
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold"
            style={{ color: NAVY }}
            onClick={() => setShowYearPanel(p => !p)}
          >
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Academic Years
              <span className="text-xs font-normal text-gray-400 ml-1">({academicYears.length} years)</span>
            </span>
            {showYearPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showYearPanel && (
            <div className="px-5 pb-4 space-y-3 border-t border-gray-100">
              <div className="flex gap-2 mt-3">
                <Input placeholder="e.g. 2025-26" value={yearName} onChange={e => setYearName(e.target.value)}
                  className="flex-1 text-sm" onKeyDown={e => e.key === "Enter" && createYear()} />
                <Button size="sm" onClick={createYear} disabled={busy || !yearName.trim()}
                  className="text-white" style={{ background: ORANGE }}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {academicYears.map(yr => (
                  <div key={yr.id} className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-medium"
                    style={{ borderColor: yr.isActive ? NAVY : "#E5E7EB", color: yr.isActive ? NAVY : "#9CA3AF" }}>
                    {yr.name}
                    <button onClick={() => toggleYear(yr)} className="ml-1 opacity-60 hover:opacity-100">
                      {yr.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button onClick={() => deleteYear(yr.id)} className="ml-0.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {academicYears.length === 0 && <p className="text-gray-400 text-xs">No academic years yet. Add one above.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Courses View ─────────────────────────────────────────── */}
      {view === "courses" && (
        <div className="space-y-4">
          {academicYears.length === 0 && !loading && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4">
              <span className="text-xl mt-0.5">⚠️</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Academic Year required before adding courses</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Type a year name (e.g. <strong>2025-26</strong>) in the <strong>Academic Years</strong> panel above and click <strong>+</strong> to create one first.
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-500">
              Create courses and organize them into chapters and topics.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={loadBase} className="gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <Button size="sm" onClick={() => setShowAddCourse(p => !p)}
                className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Add Course
              </Button>
            </div>
          </div>

          {/* Search + Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search courses…"
                value={courseSearch}
                onChange={e => setCourseSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-48"
              />
            </div>
            <Select value={courseGradeFilter} onValueChange={setCourseGradeFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Grades" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {GRADES.map(g => <SelectItem key={g} value={String(g)}>{gradeLabel(g)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={courseYearFilter} onValueChange={setCourseYearFilter}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All Years" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(courseSearch || courseGradeFilter !== "all" || courseYearFilter !== "all") && (
              <button onClick={() => { setCourseSearch(""); setCourseGradeFilter("all"); setCourseYearFilter("all"); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
            )}
          </div>

          {showAddCourse && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Course</h3>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ Academic Year is <strong>required</strong>. If none appear below, expand the Academic Years panel and add one first.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Course title *" value={courseForm.title}
                  onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                <div className="space-y-1">
                  <Select value={courseForm.grade} onValueChange={v => setCourseForm(p => ({ ...p, grade: v }))}>
                    <SelectTrigger><SelectValue placeholder="Grade *" /></SelectTrigger>
                    <SelectContent>{GRADES.map(g => <SelectItem key={g} value={String(g)}>{gradeLabel(g)}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-400 pl-1">Determines which students can see and enroll in this course</p>
                </div>
                <div className="space-y-1">
                  <Select value={courseForm.subjectId} onValueChange={v => setCourseForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subject</SelectItem>
                      {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-400 pl-1">Primary subject — chapters can have their own subjects too</p>
                </div>
                <div className="space-y-1">
                  <Select value={courseForm.board} onValueChange={v => setCourseForm(p => ({ ...p, board: v }))}>
                    <SelectTrigger><SelectValue placeholder="Board (optional)" /></SelectTrigger>
                    <SelectContent>{BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[10px] text-gray-400 pl-1">Curriculum board (CBSE, ICSE, etc.)</p>
                </div>
                <div className="space-y-1">
                  <Select value={courseForm.academicYearId} onValueChange={v => setCourseForm(p => ({ ...p, academicYearId: v }))}>
                    <SelectTrigger className={!courseForm.academicYearId ? "border-red-300" : ""}><SelectValue placeholder="Academic Year * (required)" /></SelectTrigger>
                    <SelectContent>{academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {!courseForm.academicYearId && <p className="text-[10px] text-red-500">Required for tracking and reporting</p>}
                </div>
                <Input placeholder="Teacher name" value={courseForm.teacher}
                  onChange={e => setCourseForm(p => ({ ...p, teacher: e.target.value }))} />
                <Input placeholder="Thumbnail URL (optional)" value={courseForm.thumbnailUrl}
                  onChange={e => setCourseForm(p => ({ ...p, thumbnailUrl: e.target.value }))} />
                <Textarea placeholder="Description (optional)" value={courseForm.description}
                  onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="sm:col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={createCourse} disabled={busy} className="text-white" style={{ background: ORANGE }}>
                  Create Course
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddCourse(false); setCourseForm(emptyCourseFm); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Edit Course inline form */}
          {editingCourse && (
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Edit Course — {editingCourse.title}</h3>
                <button onClick={() => setEditingCourse(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder="Course title *" value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                <Select value={editForm.grade} onValueChange={v => setEditForm(p => ({ ...p, grade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Grade *" /></SelectTrigger>
                  <SelectContent>{GRADES.map(g => <SelectItem key={g} value={String(g)}>{gradeLabel(g)}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editForm.subjectId} onValueChange={v => setEditForm(p => ({ ...p, subjectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subject</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={editForm.board} onValueChange={v => setEditForm(p => ({ ...p, board: v }))}>
                  <SelectTrigger><SelectValue placeholder="Board (optional)" /></SelectTrigger>
                  <SelectContent>{BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
                <div className="space-y-1">
                  <Select value={editForm.academicYearId} onValueChange={v => setEditForm(p => ({ ...p, academicYearId: v }))}>
                    <SelectTrigger className={!editForm.academicYearId ? "border-red-300" : ""}><SelectValue placeholder="Academic Year * (required)" /></SelectTrigger>
                    <SelectContent>{academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {!editForm.academicYearId && <p className="text-[10px] text-red-500">Required</p>}
                </div>
                <Input placeholder="Teacher name" value={editForm.teacher}
                  onChange={e => setEditForm(p => ({ ...p, teacher: e.target.value }))} />
                <Input placeholder="Thumbnail URL" value={editForm.thumbnailUrl}
                  onChange={e => setEditForm(p => ({ ...p, thumbnailUrl: e.target.value }))} />
                <Textarea placeholder="Description" value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="sm:col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={updateCourse} disabled={busy} className="text-white" style={{ background: NAVY }}>
                  Save Changes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingCourse(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (() => {
            const filteredCourses = courses.filter(c => {
              if (courseGradeFilter !== "all" && String(c.grade) !== courseGradeFilter) return false;
              if (courseYearFilter !== "all" && String(c.academicYearId) !== courseYearFilter) return false;
              if (courseSearch) {
                const q = courseSearch.toLowerCase();
                return c.title.toLowerCase().includes(q) || (c.teacher ?? "").toLowerCase().includes(q);
              }
              return true;
            });
            return (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-1.5 w-full" style={{ background: c.isPublished ? NAVY : "#E5E7EB" }} />
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-snug" style={{ color: NAVY }}>{c.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${c.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.isPublished ? "LIVE" : "DRAFT"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{gradeLabel(c.grade)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{c.subjectName}</span>
                        {c.board && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{c.board}</span>}
                        {c.academicYearId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{yearName_(c.academicYearId)}</span>}
                        {!c.academicYearId && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">No Year</span>}
                      </div>
                      {c.teacher && <p className="text-xs text-gray-500">👤 {c.teacher}</p>}
                      <div className="flex gap-1.5 pt-1">
                        <button onClick={() => selectCourse(c)}
                          className="flex-1 text-xs py-1.5 rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-1"
                          style={{ background: NAVY }}>
                          <Layers className="w-3 h-3" /> Chapters
                        </button>
                        <button
                          onClick={() => { setEditingCourse(c); setEditForm({ title: c.title, grade: String(c.grade), subjectId: c.subjectId ? String(c.subjectId) : "", board: c.board ?? "", academicYearId: c.academicYearId ? String(c.academicYearId) : "", description: c.description ?? "", teacher: c.teacher ?? "", thumbnailUrl: c.thumbnailUrl ?? "" }); setShowAddCourse(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className="text-xs p-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors text-blue-500"
                          title="Edit course">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => togglePublish(c)}
                          className="text-xs p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                          title={c.isPublished ? "Unpublish" : "Publish"}>
                          {c.isPublished ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-green-500" />}
                        </button>
                        <button onClick={() => deleteCourse(c.id, c.title)}
                          className="text-xs p-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors text-red-400 hover:text-red-600">
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
            );
          })()}
        </div>
      )}

      {/* ── Chapters View ─────────────────────────────────────────── */}
      {view === "chapters" && selectedCourse && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base" style={{ color: NAVY }}>{selectedCourse.title}</h2>
                <div className="flex gap-1.5 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Grade {selectedCourse.grade}</span>
                  {selectedCourse.board && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{selectedCourse.board}</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">Subject per chapter</span>
                </div>
              </div>
              <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                ← Back
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Chapters organize content into logical sections. Each chapter has topics.</p>
            <Button size="sm" onClick={() => setShowAddChapter(p => !p)}
              className="text-white gap-1.5" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Add Chapter
            </Button>
          </div>

          {showAddChapter && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Chapter</h3>
              <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                💡 Select the subject first — students browse content by subject. Each chapter belongs to exactly one subject.
              </p>
              <div className="space-y-1">
                <Select value={chapterForm.subjectId} onValueChange={v => setChapterForm(p => ({ ...p, subjectId: v }))}>
                  <SelectTrigger className={!chapterForm.subjectId ? "border-orange-300" : ""}>
                    <SelectValue placeholder="Subject * (required)" />
                  </SelectTrigger>
                  <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {!chapterForm.subjectId
                  ? <p className="text-[10px] text-orange-500 pl-1">⚠ Select subject before saving</p>
                  : <p className="text-[10px] text-gray-400 pl-1">This chapter will appear under {subjects.find(s => String(s.id) === chapterForm.subjectId)?.name ?? "the selected subject"}</p>}
              </div>
              <div className="space-y-1">
                <Input placeholder="Chapter name *" value={chapterForm.name}
                  onChange={e => setChapterForm(p => ({ ...p, name: e.target.value }))} />
                <p className="text-[10px] text-gray-400 pl-1">Use descriptive names, e.g. "Chapter 1: Introduction to Algebra"</p>
              </div>
              <Textarea placeholder="Description (optional)" value={chapterForm.description}
                onChange={e => setChapterForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              <div className="flex gap-2">
                <Button size="sm" onClick={createChapter} disabled={busy} className="text-white" style={{ background: ORANGE }}>Create</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddChapter(false); setChapterForm({ name: "", description: "", subjectId: "" }); }}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {chapters.map((ch, idx) => (
              <div key={ch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: NAVY }}>{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: NAVY }}>{ch.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium flex-shrink-0">{ch.subjectName}</span>
                    </div>
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
                No chapters yet. Add the first chapter for this course.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Topics View ───────────────────────────────────────────── */}
      {view === "topics" && selectedChapter && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base" style={{ color: NAVY }}>{selectedChapter.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">in {selectedCourse?.title}</p>
              </div>
              <button onClick={goBack} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                ← Back
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Topics are the smallest unit. Assign live classes, homework, tests, and recordings to topics.</p>
            <Button size="sm" onClick={() => setShowAddTopic(p => !p)}
              className="text-white gap-1.5" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Add Topic
            </Button>
          </div>

          {showAddTopic && (
            <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
              <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Topic</h3>
              <p className="text-[10px] text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                💡 After creating a topic, you can assign live classes, homework, assignments, tests, and recordings to it — this is how students discover content for each lesson.
              </p>
              <div className="space-y-1">
                <Input placeholder="Topic name *" value={topicForm.name}
                  onChange={e => setTopicForm(p => ({ ...p, name: e.target.value }))} />
                <p className="text-[10px] text-gray-400 pl-1">Use clear lesson names, e.g. "Topic 1: Variables and Constants"</p>
              </div>
              <Input placeholder="Description (optional)" value={topicForm.description}
                onChange={e => setTopicForm(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-2">
                <Button size="sm" onClick={createTopic} disabled={busy} className="text-white" style={{ background: ORANGE }}>Create</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddTopic(false); setTopicForm({ name: "", description: "" }); }}>Cancel</Button>
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
                        <p className="font-semibold text-sm" style={{ color: NAVY }}>{tp.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {total} item{total !== 1 ? "s" : ""}
                          </span>
                          <button onClick={() => deleteTopic(tp.id, tp.name)}
                            className="p-1 text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {tp.description && <p className="text-xs text-gray-500 mt-0.5">{tp.description}</p>}
                      {cc && total > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {cc.liveClasses > 0 && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              <Video className="w-2.5 h-2.5" /> {cc.liveClasses} Live
                            </span>
                          )}
                          {cc.homework > 0 && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                              <BookOpen className="w-2.5 h-2.5" /> {cc.homework} HW
                            </span>
                          )}
                          {cc.assignments > 0 && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-medium">
                              <ClipboardList className="w-2.5 h-2.5" /> {cc.assignments} Asgn
                            </span>
                          )}
                          {cc.tests > 0 && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                              <FileText className="w-2.5 h-2.5" /> {cc.tests} Tests
                            </span>
                          )}
                          {cc.recordings > 0 && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                              <PlayCircle className="w-2.5 h-2.5" /> {cc.recordings} Rec
                            </span>
                          )}
                        </div>
                      )}
                      {cc && total === 0 && (
                        <p className="text-[11px] text-gray-400 mt-1 italic">
                          No content yet. When creating homework, tests, etc., select Topic ID {tp.id} to link here.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {topics.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-2xl border border-dashed border-gray-200">
                No topics yet. Add the first topic for this chapter.
              </div>
            )}
          </div>

          {topics.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 How to assign content to topics</p>
              <p className="text-xs text-blue-600">
                When creating Live Classes, Homework, Assignments, Tests, or Recordings, use the Topic ID shown below to link that content here.
                Students enrolled in this course will see the content organized under the correct chapter and topic.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {topics.map(tp => (
                  <span key={tp.id} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-semibold">
                    {tp.name}: ID {tp.id}
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
