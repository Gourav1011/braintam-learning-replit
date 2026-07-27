import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Video, BookOpen, Calendar,
  Clock, Globe, GlobeLock, Users, Search, X, Phone, MessageSquare,
  Eye, BarChart3, Settings2, CheckCircle2, XCircle, RefreshCw, Loader2,
  TrendingUp, MoreHorizontal, Edit2, User, Save, Link, Pencil, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

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

interface DemoBatch {
  id: number; title: string; description: string | null;
  teacherName: string | null; mentorName: string | null; mentorId: number | null;
  bannerUrl: string | null; joinLink: string | null;
  startDate: string | null; endDate: string | null; status: string;
  isActive: boolean; isPublic: boolean; grade: number | null;
  subject: string | null; totalDays: number; batchCode: string | null;
  enrolledCount?: number; convertedCount?: number; droppedCount?: number; conversionRate?: number;
}

interface DemoSession {
  id: number; batchId: number; title: string; description: string | null;
  dayNumber: number; subject: string | null; teacherName: string | null;
  scheduledAt: string; duration: number;
  joinUrl: string | null; recordingUrl: string | null;
  homeworkText: string | null; homeworkLink: string | null;
  status: string; isPublished: boolean;
}

interface Teacher { id: number; name: string; email: string; }

interface DemoEnrollment {
  enrollmentId: number; studentId: number; enrolledAt: string;
  enrollmentStatus: string; lastDayAttended: number | null;
  assignedMentorName: string | null;
  name: string; email: string | null; phone: string | null;
  grade: number | null; school: string | null; repeatedCustomer: boolean | null;
}

interface AdminUser {
  id: number; name: string; email: string | null; phone: string | null;
  role: string; grade: number | null; school: string | null;
}

interface ActiveIgniteStudent {
  enrollmentId: number;
  studentId: number;
  name: string;
  phone: string | null;
  email: string | null;
  grade: number | null;
  studentGrade: number | null;
  batchGrade: number | null;

  batchId: number;
  batchTitle: string;
  batchCode: string | null;
  batchStatus: string;
  batchStartDate: string | null;
  batchEndDate: string | null;

  mentorName: string | null;
  mentorGroupId: number | null;
  mentorGroupName: string | null;
}

interface ActiveIgniteBatchOption {
  id: number;
  title: string;
  batchCode: string | null;
  grade: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

interface ActiveIgniteData {
  weekStart: string;
  weekEnd: string;
  total: number;
  gradeCounts: Record<string, number>;
  students: ActiveIgniteStudent[];
  availableBatches: ActiveIgniteBatchOption[];
}

interface MentorTrackingRow {
  enrollmentId: number; studentId: number; name: string; grade: number | null;
  school: string | null; city: string | null; phone: string | null;
  enrollmentStatus: string; lastDayAttended: number | null;
  attPct: number; callStatus: string | null; interestLevel: string | null;
  leadStage: string | null; nextFollowUpAt: string | null; nextFollowUpTime: string | null;
  lastCallAt: string | null; assignedMentorName: string | null; repeatedCustomer: boolean | null;
}

interface OverviewData {
  batch: DemoBatch;
  sessions: DemoSession[];
  metrics: { total: number; converted: number; dropped: number; active: number; conversionRate: number };
  dayBreakdown: { day: number; count: number }[];
  mentorStats: { name: string; assigned: number; converted: number; pending: number; conversionRate: number }[];
}

interface AnalyticsData {
  byGrade: { grade: number; total: number; converted: number; pct: number }[];
  byMentor: { mentor: string; total: number; converted: number; pct: number }[];
  byInterest: { level: string; total: number; converted: number; pct: number }[];
  total: number;
}

type DetailTab = "overview" | "students" | "sessions" | "mentor-tracking" | "analytics" | "settings";
type StudentFilter = "all" | "converted" | "dropped" | (string & {});
type AddMode = "search" | "csv" | "paste";

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const SUBJECTS = ["Maths", "Science", "English", "Hindi", "General"];
const emptyBatch = { title: "", batchCode: "", grade: "none", startDate: "", endDate: "", joinLink: "", status: "upcoming" };
const emptySession = { title: "", subject: "", teacherName: "", dayNumber: "1", scheduledAt: "", duration: "60", joinUrl: "", recordingUrl: "", homeworkText: "", homeworkLink: "" };
const emptyEditSessionForm = { title: "", subject: "", teacherName: "", date: "", startTime: "", endTime: "", joinUrl: "", homeworkLink: "", recordingUrl: "", status: "scheduled" };

function sessionToIst(scheduledAt: string) {
  const d = new Date(scheduledAt);
  const istStr = d.toLocaleString("en-CA", { timeZone: "Asia/Kolkata", hour12: false });
  const [datePart, timePart] = istStr.split(", ");
  return { date: datePart, time: timePart?.slice(0, 5) ?? "17:00" };
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  "in progress": "bg-emerald-100 text-emerald-700",
  completed: "bg-gray-100 text-gray-600",
};

const ENROLL_STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "#EFF6FF", text: "#1D4ED8", label: "Active" },
  converted: { bg: "#F0FDF4", text: "#15803D", label: "Converted ✓" },
  dropped: { bg: "#FEF2F2", text: "#B91C1C", label: "Dropped" },
};

const INTEREST_COLORS: Record<string, string> = {
  High: "text-emerald-700 bg-emerald-50",
  Moderate: "text-yellow-700 bg-yellow-50",
  Low: "text-red-700 bg-red-50",
};

export function DemoBatchesTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [batches, setBatches] = useState<DemoBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatch);
  const [searchQ, setSearchQ] = useState("");

  // Current-week active Ignite students
  const [activeStudents, setActiveStudents] = useState<ActiveIgniteData | null>(null);
  const [activeStudentsLoading, setActiveStudentsLoading] = useState(false);
  const [showActiveStudents, setShowActiveStudents] = useState(false);
  const [activeGrade, setActiveGrade] = useState<number | null>(null);
  const [activeStudentSearch, setActiveStudentSearch] = useState("");

  // Active-student class management.
  const [selectedActiveStudents, setSelectedActiveStudents] = useState<Set<number>>(new Set());
  const [changeCourseStudent, setChangeCourseStudent] = useState<ActiveIgniteStudent | null>(null);
  const [destinationBatchId, setDestinationBatchId] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [showMergeClass, setShowMergeClass] = useState(false);
  const [mergeSourceBatchId, setMergeSourceBatchId] = useState("");
  const [mergeDestinationBatchId, setMergeDestinationBatchId] = useState("");

  async function changeStudentCourse() {
    if (!changeCourseStudent || !destinationBatchId) return;

    setTransferBusy(true);
    try {
      const response = await apiFetch(
        `/admin/ignite/active-students/${changeCourseStudent.enrollmentId}/change-course`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationBatchId: Number(destinationBatchId),
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        flash(data.error ?? "Unable to change Ignite class", false);
        return;
      }

      flash("Student moved to the new Ignite class.");
      setChangeCourseStudent(null);
      setDestinationBatchId("");
      setSelectedActiveStudents(new Set());
      await loadActiveStudents();
      await loadBatches();
    } finally {
      setTransferBusy(false);
    }
  }

  async function mergeIgniteClass() {
    if (!mergeSourceBatchId || !mergeDestinationBatchId) return;

    const selectedIds = [...selectedActiveStudents];

    setTransferBusy(true);
    try {
      const response = await apiFetch("/admin/ignite/active-students/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceBatchId: Number(mergeSourceBatchId),
          destinationBatchId: Number(mergeDestinationBatchId),
          studentIds: selectedIds.length > 0 ? selectedIds : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        flash(data.error ?? "Unable to merge Ignite class", false);
        return;
      }

      flash(
        `Moved ${data.moved ?? 0} student${data.moved === 1 ? "" : "s"}` +
        `${data.skipped ? ` · ${data.skipped} skipped` : ""}.`,
      );

      setShowMergeClass(false);
      setMergeSourceBatchId("");
      setMergeDestinationBatchId("");
      setSelectedActiveStudents(new Set());
      await loadActiveStudents();
      await loadBatches();
    } finally {
      setTransferBusy(false);
    }
  }

  const loadActiveStudents = useCallback(async () => {
    setActiveStudentsLoading(true);
    try {
      const response = await apiFetch("/admin/ignite/active-students");
      if (!response.ok) throw new Error("Failed to load active students");
      const data = await response.json() as ActiveIgniteData;
      setActiveStudents(data);
    } catch {
      setActiveStudents(null);
    } finally {
      setActiveStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActiveStudents();
  }, [loadActiveStudents]);

  // Detail panel
  const [selectedBatch, setSelectedBatch] = useState<DemoBatch | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  // Overview
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Students tab
  const [enrollments, setEnrollments] = useState<DemoEnrollment[]>([]);
  const [studentFilter, setStudentFilter] = useState<StudentFilter>("all");
  const [allStudents, setAllStudents] = useState<AdminUser[]>([]);
  const [studSearchQ, setStudSearchQ] = useState("");
  const [addMode, setAddMode] = useState<AddMode>("search");
  const [csvRows, setCsvRows] = useState<{ name: string; email: string; phone: string; grade: string }[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; enrolled: number; errors: string[] } | null>(null);

  // Sessions tab
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionForm, setSessionForm] = useState(emptySession);

  // Mentor tracking tab
  const [mentorRows, setMentorRows] = useState<MentorTrackingRow[]>([]);
  const [mentorLoading, setMentorLoading] = useState(false);

  // Analytics tab
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // Settings tab (edit form)
  const [settingsForm, setSettingsForm] = useState(emptyBatch);
  const [settingsBusy, setSettingsBusy] = useState(false);

  // Edit session modal
  const [editingSession, setEditingSession] = useState<DemoSession | null>(null);
  const [editSessionForm, setEditSessionForm] = useState(emptyEditSessionForm);
  const [savingSession, setSavingSession] = useState(false);

  // Grade filter
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);

  // Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSuggestions, setTeacherSuggestions] = useState<Record<string, string>>({});

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/demo-batches");
      if (r.ok) setBatches(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  useEffect(() => {
    apiFetch("/admin/ignite/teachers").then(async r => {
      if (r.ok) {
        const data = await r.json();
        setTeachers(data.teachers ?? []);
        setTeacherSuggestions(data.suggestions ?? {});
      }
    });
  }, []);

  // Load detail data when tab changes
  useEffect(() => {
    if (!selectedBatch) return;
    if (detailTab === "overview") loadOverview(selectedBatch.id);
    if (detailTab === "students") loadEnrollments(selectedBatch.id);
    if (detailTab === "sessions") loadSessions(selectedBatch.id);
    if (detailTab === "mentor-tracking") loadMentorTracking(selectedBatch.id);
    if (detailTab === "analytics") loadAnalytics(selectedBatch.id);
    if (detailTab === "settings") setSettingsForm({
      title: selectedBatch.title,
      batchCode: selectedBatch.batchCode ?? "",
      grade: selectedBatch.grade ? String(selectedBatch.grade) : "none",
      startDate: selectedBatch.startDate ? new Date(selectedBatch.startDate).toISOString().slice(0, 16) : "",
      endDate: selectedBatch.endDate ? new Date(selectedBatch.endDate).toISOString().slice(0, 16) : "",
      joinLink: selectedBatch.joinLink ?? "",
      status: selectedBatch.status ?? "upcoming",
    });
  }, [detailTab, selectedBatch?.id]);

  async function loadOverview(batchId: number) {
    setOverviewLoading(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${batchId}/overview`);
      if (r.ok) setOverview(await r.json());
    } finally { setOverviewLoading(false); }
  }

  async function loadEnrollments(batchId: number) {
    const [enrRes, usersRes] = await Promise.all([
      apiFetch(`/admin/demo-batches/${batchId}/enrollments`),
      apiFetch("/admin/users"),
    ]);
    if (enrRes.ok) setEnrollments(await enrRes.json());
    if (usersRes.ok) {
      const all: AdminUser[] = await usersRes.json();
      setAllStudents(all.filter(u => u.role === "student" || u.role === "demo_student"));
    }
  }

  async function loadSessions(batchId: number) {
    setSessionsLoading(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${batchId}/sessions`);
      if (r.ok) setSessions(await r.json());
    } finally { setSessionsLoading(false); }
  }

  async function loadMentorTracking(batchId: number) {
    setMentorLoading(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${batchId}/mentor-tracking`);
      if (r.ok) setMentorRows(await r.json());
    } finally { setMentorLoading(false); }
  }

  async function loadAnalytics(batchId: number) {
    setAnalytics(null);
    try {
      const r = await apiFetch(`/admin/demo-batches/${batchId}/analytics`);
      if (r.ok) setAnalytics(await r.json());
      else setAnalytics({ byGrade: [], byMentor: [], byInterest: [], total: 0 });
    } catch {
      setAnalytics({ byGrade: [], byMentor: [], byInterest: [], total: 0 });
    }
  }

  function openBatch(batch: DemoBatch) {
    setSelectedBatch(batch);
    setDetailTab("overview");
  }

  function closeBatch() {
    setSelectedBatch(null);
    setOverview(null);
    setEnrollments([]);
    setSessions([]);
    setMentorRows([]);
    setAnalytics(null);
  }

  // ── Batch CRUD ──────────────────────────────────────────────
  async function createBatch() {
    if (!batchForm.title.trim()) { flash("Title required", false); return; }
    if (!batchForm.grade || batchForm.grade === "none") { flash("Grade is required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch("/admin/demo-batches", {
        method: "POST",
        body: JSON.stringify({
          title: batchForm.title,
          batchCode: batchForm.batchCode || undefined,
          grade: Number(batchForm.grade),
          startDate: batchForm.startDate || undefined,
          endDate: batchForm.endDate || undefined,
          joinLink: batchForm.joinLink || undefined,
          status: batchForm.status || "upcoming",
        }),
      });
      if (!r.ok) throw new Error();
      const created = await r.json() as DemoBatch & { sessions: DemoSession[] };
      flash("Demo batch created — 5 sessions auto-generated");
      setBatchForm(emptyBatch);
      setShowAddBatch(false);
      setSessions(created.sessions ?? []);
      // Open the batch on Sessions tab
      const { sessions: _s, ...batchOnly } = created;
      setSelectedBatch(batchOnly as DemoBatch);
      setDetailTab("sessions");
      loadBatches();
    } catch { flash("Failed to create batch", false); }
    finally { setBusy(false); }
  }

  async function deleteBatch(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this batch and all its sessions and enrollments?")) return;
    await apiFetch(`/admin/demo-batches/${id}`, { method: "DELETE" });
    if (selectedBatch?.id === id) closeBatch();
    loadBatches();
    flash("Batch deleted");
  }

  async function togglePublish(batch: DemoBatch, e: React.MouseEvent) {
    e.stopPropagation();
    await apiFetch(`/admin/demo-batches/${batch.id}`, {
      method: "PUT", body: JSON.stringify({ isPublic: !batch.isPublic }),
    });
    loadBatches();
    flash(batch.isPublic ? "Batch hidden" : "Batch published");
  }

  async function saveSettings() {
    if (!selectedBatch) return;
    setSettingsBusy(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${selectedBatch.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: settingsForm.title,
          batchCode: settingsForm.batchCode || undefined,
          grade: settingsForm.grade && settingsForm.grade !== "none" ? Number(settingsForm.grade) : undefined,
          startDate: settingsForm.startDate || undefined,
          endDate: settingsForm.endDate || undefined,
          joinLink: settingsForm.joinLink || undefined,
          status: settingsForm.status || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Batch updated — session dates cascaded automatically");
      loadBatches();
      loadSessions(selectedBatch.id);
      const updated = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/overview`);
      if (updated.ok) { const d = await updated.json(); setSelectedBatch(d.batch); }
    } catch { flash("Failed to update", false); }
    finally { setSettingsBusy(false); }
  }

  // ── Enrollment actions ──────────────────────────────────────
  async function enrollStudent(studentId: number) {
    if (!selectedBatch) return;
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/enrollments`, {
        method: "POST", body: JSON.stringify({ studentId }),
      });
      if (r.ok) { flash("Student enrolled"); loadEnrollments(selectedBatch.id); }
      else {
        const body = await r.json().catch(() => ({})) as { error?: string };
        flash(body.error ?? "Failed to enroll", false);
      }
    } finally { setBusy(false); }
  }

  async function removeEnrollment(enrollmentId: number) {
    if (!selectedBatch) return;
    await apiFetch(`/admin/demo-batches/${selectedBatch.id}/enrollments/${enrollmentId}`, { method: "DELETE" });
    flash("Student removed");
    loadEnrollments(selectedBatch.id);
  }

  async function updateEnrollStatus(batchId: number, enrollmentId: number, status: string) {
    const r = await apiFetch(`/admin/demo-batches/${batchId}/enrollments/${enrollmentId}/status`, {
      method: "PUT", body: JSON.stringify({ status }),
    });
    if (r.ok) {
      flash(`Status updated to ${status}`);
      loadEnrollments(batchId);
      loadOverview(batchId);
    } else flash("Update failed", false);
  }

  async function updateAttendanceDay(batchId: number, enrollmentId: number, day: number) {
    await apiFetch(`/admin/demo-batches/${batchId}/enrollments/${enrollmentId}/attendance`, {
      method: "PUT", body: JSON.stringify({ lastDayAttended: day }),
    });
    loadEnrollments(batchId);
    loadOverview(batchId);
  }

  // ── Bulk upload ─────────────────────────────────────────────
  function parseCSV(text: string) {
    return text.trim().split("\n")
      .map(l => l.trim()).filter(Boolean)
      .filter(l => !/^(name|names)/i.test(l))
      .map(l => {
        const cols = l.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        return { name: cols[0] ?? "", email: cols[1] ?? "", phone: cols[2] ?? "", grade: cols[3] ?? "" };
      }).filter(r => r.name);
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setCsvRows(parseCSV(String(ev.target?.result ?? ""))); setBulkResult(null); };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function runBulkUpload() {
    if (!selectedBatch || csvRows.length === 0) return;
    setBulkBusy(true); setBulkResult(null);
    try {
      const res = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/enrollments/bulk`, {
        method: "POST",
        body: JSON.stringify({ rows: csvRows.map(r => ({ name: r.name, email: r.email || undefined, phone: r.phone || undefined, grade: r.grade ? parseInt(r.grade.replace(/\D/g, ""), 10) || 0 : 0 })) }),
      });
      if (res.ok) {
        const result = await res.json() as { created: number; skipped: number; enrolled: number; errors: string[] };
        setBulkResult(result); setCsvRows([]); setPasteText("");
        flash(`Done — ${result.created} new, ${result.enrolled} enrolled`);
        loadEnrollments(selectedBatch.id);
      } else flash("Bulk upload failed", false);
    } finally { setBulkBusy(false); }
  }

  // ── Session CRUD ────────────────────────────────────────────
  async function createSession() {
    if (!selectedBatch) return;
    if (!sessionForm.title.trim()) { flash("Title required", false); return; }
    if (!sessionForm.scheduledAt) { flash("Scheduled time required", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          title: sessionForm.title, subject: sessionForm.subject || undefined,
          teacherName: sessionForm.teacherName || undefined,
          dayNumber: Number(sessionForm.dayNumber) || 1, scheduledAt: sessionForm.scheduledAt,
          duration: Number(sessionForm.duration) || 60, joinUrl: sessionForm.joinUrl || undefined,
          recordingUrl: sessionForm.recordingUrl || undefined,
          homeworkText: sessionForm.homeworkText || undefined,
          homeworkLink: sessionForm.homeworkLink || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Session created"); setSessionForm(emptySession); setShowAddSession(false);
      loadSessions(selectedBatch.id);
      loadBatches(); // refresh totalDays
    } catch { flash("Failed", false); }
    finally { setBusy(false); }
  }

  async function deleteSession(id: number) {
    if (!selectedBatch) return;
    await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions/${id}`, { method: "DELETE" });
    flash("Session deleted");
    loadSessions(selectedBatch.id);
    loadBatches(); // refresh totalDays
  }

  async function generateSessions() {
    if (!selectedBatch) return;
    if (!selectedBatch.startDate) { flash("Set a start date in Batch Details first", false); return; }
    setBusy(true);
    try {
      const r = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/generate-sessions`, { method: "POST" });
      if (!r.ok) { flash("Failed — batch needs a start date", false); return; }
      const newSessions = await r.json() as DemoSession[];
      setSessions(newSessions);
      flash(`${newSessions.length} sessions generated`);
      loadBatches();
    } catch { flash("Failed to generate sessions", false); }
    finally { setBusy(false); }
  }

  function openEditSession(s: DemoSession) {
    const { date, time: startTime } = sessionToIst(s.scheduledAt);
    const endMs = new Date(s.scheduledAt).getTime() + s.duration * 60 * 1000;
    const { time: endTime } = sessionToIst(new Date(endMs).toISOString());
    setEditingSession(s);
    setEditSessionForm({
      title: s.title, subject: s.subject ?? "", teacherName: s.teacherName ?? "",
      date, startTime, endTime,
      joinUrl: s.joinUrl ?? "", homeworkLink: s.homeworkLink ?? "",
      recordingUrl: s.recordingUrl ?? "", status: s.status,
    });
  }

  async function updateSession() {
    if (!selectedBatch || !editingSession) return;
    setSavingSession(true);
    try {
      const { date, startTime, endTime } = editSessionForm;
      const scheduledAt = `${date}T${startTime}:00+05:30`;
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const duration = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
      const r = await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions/${editingSession.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editSessionForm.title, subject: editSessionForm.subject || undefined,
          teacherName: editSessionForm.teacherName || undefined,
          scheduledAt, duration,
          joinUrl: editSessionForm.joinUrl || undefined,
          homeworkLink: editSessionForm.homeworkLink || undefined,
          recordingUrl: editSessionForm.recordingUrl || undefined,
          status: editSessionForm.status,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Session updated");
      setEditingSession(null);
      loadSessions(selectedBatch.id);
    } catch { flash("Failed to update session", false); }
    finally { setSavingSession(false); }
  }

  // ── Filtered batch list ─────────────────────────────────────
  const gradeCounts: Record<number, number> = {};
  for (const b of batches) {
    if (b.grade) gradeCounts[b.grade] = (gradeCounts[b.grade] ?? 0) + 1;
  }

  const filteredBatches = batches.filter(b => {
    if (gradeFilter !== null && b.grade !== gradeFilter) return false;
    if (!searchQ) return true;
    return b.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      (b.teacherName ?? "").toLowerCase().includes(searchQ.toLowerCase()) ||
      (b.subject ?? "").toLowerCase().includes(searchQ.toLowerCase());
  });

  // ── Render ──────────────────────────────────────────────────
  if (selectedBatch) {
    return <BatchDetail
      batch={selectedBatch}
      detailTab={detailTab} setDetailTab={setDetailTab}
      overview={overview} overviewLoading={overviewLoading}
      enrollments={enrollments} allStudents={allStudents}
      studentFilter={studentFilter} setStudentFilter={setStudentFilter}
      studSearchQ={studSearchQ} setStudSearchQ={setStudSearchQ}
      addMode={addMode} setAddMode={setAddMode}
      csvRows={csvRows} setCsvRows={setCsvRows}
      pasteText={pasteText} setPasteText={setPasteText}
      bulkBusy={bulkBusy} bulkResult={bulkResult}
      sessions={sessions} sessionsLoading={sessionsLoading}
      showAddSession={showAddSession} setShowAddSession={setShowAddSession}
      sessionForm={sessionForm} setSessionForm={setSessionForm}
      editingSession={editingSession} editSessionForm={editSessionForm}
      setEditSessionForm={setEditSessionForm} savingSession={savingSession}
      onOpenEditSession={openEditSession} onUpdateSession={updateSession}
      onCloseEditSession={() => setEditingSession(null)}
      teachers={teachers} teacherSuggestions={teacherSuggestions}
      mentorRows={mentorRows} mentorLoading={mentorLoading}
      analytics={analytics}
      settingsForm={settingsForm} setSettingsForm={setSettingsForm} settingsBusy={settingsBusy}
      onClose={closeBatch}
      onEnroll={enrollStudent} onRemove={removeEnrollment}
      onUpdateStatus={updateEnrollStatus} onUpdateAttendance={updateAttendanceDay}
      parseCSV={parseCSV} handleCSVFile={handleCSVFile} runBulkUpload={runBulkUpload}
      onCreateSession={createSession} onDeleteSession={deleteSession} onGenerateSessions={generateSessions}
      onSaveSettings={saveSettings}
      flash={flash}
    />;
  }

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: NAVY }}>Demo Batches</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage 5-day workshops, webinars, and demo classes</p>
        </div>
        <Button onClick={() => setShowAddBatch(!showAddBatch)} style={{ background: ORANGE }}
          className="text-white hover:opacity-90 gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> New Batch
        </Button>
      </div>

      {/* Create Form */}
      {showAddBatch && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4 space-y-4">
          <div>
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Demo Batch</h3>
            <p className="text-xs text-gray-500 mt-0.5">5 sessions will be auto-generated at 5 PM IST after creation</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Batch Title *</label>
              <Input placeholder="e.g. Ignite Maths Grade 6 – June 2026" value={batchForm.title}
                onChange={e => setBatchForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Batch Code</label>
              <Input placeholder="e.g. MMSD0626" value={batchForm.batchCode}
                onChange={e => setBatchForm(p => ({ ...p, batchCode: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Grade *</label>
              <Select value={batchForm.grade || "none"} onValueChange={v => setBatchForm(p => ({ ...p, grade: v }))}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select grade</SelectItem>
                  {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date (IST)</label>
              <Input type="datetime-local" value={batchForm.startDate}
                onChange={e => setBatchForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date (IST)</label>
              <Input type="datetime-local" value={batchForm.endDate}
                onChange={e => setBatchForm(p => ({ ...p, endDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Default Join Link</label>
              <Input placeholder="https://meet.google.com/..." value={batchForm.joinLink}
                onChange={e => setBatchForm(p => ({ ...p, joinLink: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
              <Select value={batchForm.status} onValueChange={v => setBatchForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active / In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={createBatch} disabled={busy} style={{ background: NAVY }} className="text-white text-sm gap-1.5">
              <Plus className="w-4 h-4" /> {busy ? "Creating..." : "Create Batch + Auto-Sessions"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowAddBatch(false); setBatchForm(emptyBatch); }} className="text-sm">Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search by batch name, course, teacher..." value={searchQ}
          onChange={e => setSearchQ(e.target.value)} className="pl-9 bg-white" />
      </div>

      {/* Grade filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
        <button
          onClick={() => setGradeFilter(null)}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${gradeFilter === null ? "border-transparent text-white shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
          style={gradeFilter === null ? { background: NAVY } : {}}>
          All
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${gradeFilter === null ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
            {batches.length}
          </span>
        </button>
        {GRADES.map(g => {
          const count = gradeCounts[g] ?? 0;
          if (count === 0) return null;
          const active = gradeFilter === g;
          return (
            <button key={g}
              onClick={() => setGradeFilter(active ? null : g)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${active ? "border-transparent text-white shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
              style={active ? { background: ORANGE } : {}}>
              G{g}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact summary stats */}
      {batches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 mb-3">
          {[
            { label: "Total Batches", value: batches.length, icon: "📦", color: NAVY },
            { label: "Total Enrolled", value: batches.reduce((s, b) => s + (b.enrolledCount ?? 0), 0), icon: "👥", color: "#0284C7" },
            { label: "Active Batches", value: batches.filter(b => b.status === "active" || b.status === "in progress").length, icon: "🔴", color: GREEN },
            { label: "Converted", value: batches.reduce((s, b) => s + (b.convertedCount ?? 0), 0), icon: "🎯", color: GREEN },
            { label: "Dropped", value: batches.reduce((s, b) => s + (b.droppedCount ?? 0), 0), icon: "📉", color: "#DC2626" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xl font-black leading-none" style={{ color: c.color }}>{c.value}</div>
                  <div className="text-[9px] text-gray-400 font-semibold mt-1">{c.label}</div>
                </div>
                <div className="text-base">{c.icon}</div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              setShowActiveStudents(true);
              setActiveGrade(null);
              setActiveStudentSearch("");
              void loadActiveStudents();
            }}
            className="bg-white rounded-xl border shadow-sm px-3 py-2 text-left hover:shadow-md hover:border-blue-300 transition-all"
            style={{ borderColor: `${NAVY}30` }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xl font-black leading-none" style={{ color: NAVY }}>
                  {activeStudentsLoading ? "…" : activeStudents?.total ?? 0}
                </div>
                <div className="text-[9px] font-bold mt-1" style={{ color: NAVY }}>
                  Active Students
                </div>
              </div>
              <Users className="w-5 h-5" style={{ color: NAVY }} />
            </div>
          </button>
        </div>
      )}

      {/* Current-week Active Students management panel */}
      {showActiveStudents && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${NAVY}12` }}
                  >
                    <Users className="w-4 h-4" style={{ color: NAVY }} />
                  </div>
                  <div>
                    <div className="font-black text-gray-900">
                      Active Students
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Current week · manage class attendance without changing student grade
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedActiveStudents.size > 0 && (
                  <span className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                    {selectedActiveStudents.size} selected
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMergeClass(true);
                    setMergeSourceBatchId("");
                    setMergeDestinationBatchId("");
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-white shadow-sm"
                  style={{ background: ORANGE }}
                >
                  Merge Class
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowActiveStudents(false);
                    setSelectedActiveStudents(new Set());
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Grade chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveGrade(null);
                  setSelectedActiveStudents(new Set());
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${
                  activeGrade === null
                    ? "text-white border-transparent"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
                style={activeGrade === null ? { background: NAVY } : {}}
              >
                All {activeStudents?.total ?? 0}
              </button>

              {GRADES.map((grade) => {
                const count = activeStudents?.gradeCounts[String(grade)] ?? 0;
                if (!count) return null;

                const selected = activeGrade === grade;

                return (
                  <button
                    type="button"
                    key={grade}
                    onClick={() => {
                      setActiveGrade(selected ? null : grade);
                      setSelectedActiveStudents(new Set());
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${
                      selected
                        ? "text-white border-transparent"
                        : "bg-white border-gray-200 text-gray-600"
                    }`}
                    style={selected ? { background: ORANGE } : {}}
                  >
                    G{grade} · {count}
                  </button>
                );
              })}
            </div>

            {/* Search + context */}
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={activeStudentSearch}
                  onChange={(e) => setActiveStudentSearch(e.target.value)}
                  placeholder="Search name, phone, batch, mentor or group..."
                  className="pl-9"
                />
              </div>

              <div className="px-3 py-2 rounded-lg bg-gray-50 text-[10px] text-gray-500 flex items-center">
                Profile grade never changes when moving classes.
              </div>
            </div>

            {activeStudentsLoading ? (
              <div className="py-10 flex items-center justify-center text-sm text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading active students...
              </div>
            ) : (() => {
              const query = activeStudentSearch.trim().toLowerCase();

              const visibleStudents = (activeStudents?.students ?? []).filter((student) => {
                if (activeGrade !== null && student.grade !== activeGrade) return false;

                if (!query) return true;

                return [
                  student.name,
                  student.phone,
                  student.email,
                  student.batchTitle,
                  student.batchCode,
                  student.mentorName,
                  student.mentorGroupName,
                  student.studentGrade != null ? String(student.studentGrade) : null,
                  student.batchGrade != null ? String(student.batchGrade) : null,
                ].some((value) => value?.toLowerCase().includes(query));
              });

              const allVisibleSelected =
                visibleStudents.length > 0 &&
                visibleStudents.every((student) =>
                  selectedActiveStudents.has(student.studentId)
                );

              return visibleStudents.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No active Ignite students match this grade/search.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2 w-8">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={(e) => {
                              setSelectedActiveStudents((previous) => {
                                const next = new Set(previous);

                                for (const student of visibleStudents) {
                                  if (e.target.checked) next.add(student.studentId);
                                  else next.delete(student.studentId);
                                }

                                return next;
                              });
                            }}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                        </th>

                        {[
                          "Student",
                          "Phone",
                          "Student Grade",
                          "Attending Class",
                          "Mentor",
                          "Mentor Group",
                          "Actions",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-3 py-2 text-[10px] uppercase tracking-wide font-bold text-gray-500 whitespace-nowrap"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {visibleStudents.map((student) => {
                        const selected = selectedActiveStudents.has(student.studentId);
                        const crossGrade =
                          student.studentGrade != null &&
                          student.batchGrade != null &&
                          student.studentGrade !== student.batchGrade;

                        return (
                          <tr
                            key={student.enrollmentId}
                            className={`border-t border-gray-50 transition-colors ${
                              selected ? "bg-blue-50/60" : "hover:bg-gray-50"
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  setSelectedActiveStudents((previous) => {
                                    const next = new Set(previous);
                                    if (e.target.checked) next.add(student.studentId);
                                    else next.delete(student.studentId);
                                    return next;
                                  });
                                }}
                                className="w-3.5 h-3.5 accent-blue-600"
                              />
                            </td>

                            <td className="px-3 py-2">
                              <div className="text-xs font-bold text-gray-800 whitespace-nowrap">
                                {student.name}
                              </div>
                              {student.email && (
                                <div className="text-[10px] text-gray-400 max-w-[180px] truncate">
                                  {student.email}
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-2 text-xs font-mono text-gray-700 whitespace-nowrap">
                              {student.phone ?? "–"}
                            </td>

                            <td className="px-3 py-2">
                              <span
                                className="px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap"
                                style={{ background: "#EEF2FF", color: NAVY }}
                              >
                                {student.studentGrade != null
                                  ? `Grade ${student.studentGrade}`
                                  : "–"}
                              </span>
                            </td>

                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                <div>
                                  <div className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                                    {student.batchTitle}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {student.batchGrade != null && (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          crossGrade
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-gray-100 text-gray-500"
                                        }`}
                                      >
                                        G{student.batchGrade}
                                      </span>
                                    )}

                                    {crossGrade && (
                                      <span className="text-[9px] font-bold text-amber-700">
                                        Cross-grade
                                      </span>
                                    )}

                                    {student.batchCode && (
                                      <span className="text-[9px] font-mono text-gray-400">
                                        {student.batchCode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                              {student.mentorName ?? (
                                <span className="text-amber-600 font-semibold">
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                              {student.mentorGroupName ?? "–"}
                            </td>

                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setChangeCourseStudent(student);
                                  setDestinationBatchId("");
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 hover:border-blue-300 hover:text-blue-700 whitespace-nowrap"
                              >
                                Change Course
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Individual Change Course dialog */}
      {changeCourseStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-black text-gray-900">Change Course</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {changeCourseStudent.name} · Profile Grade {changeCourseStudent.studentGrade ?? "–"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setChangeCourseStudent(null);
                  setDestinationBatchId("");
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4">
                <div className="text-[10px] uppercase font-bold text-gray-400">
                  Currently attending
                </div>
                <div className="text-sm font-bold text-gray-800 mt-1">
                  {changeCourseStudent.batchTitle}
                  {changeCourseStudent.batchGrade != null
                    ? ` · Grade ${changeCourseStudent.batchGrade}`
                    : ""}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Moving this student will not change their profile grade.
                </div>
              </div>

              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Destination Ignite Class
              </label>

              <select
                value={destinationBatchId}
                onChange={(e) => setDestinationBatchId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              >
                <option value="">Select destination class</option>

                {(activeStudents?.availableBatches ?? [])
                  .filter((batch) => batch.id !== changeCourseStudent.batchId)
                  .map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.grade != null ? `Grade ${batch.grade} · ` : ""}
                      {batch.title}
                      {batch.batchCode ? ` · ${batch.batchCode}` : ""}
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  disabled={transferBusy}
                  onClick={() => {
                    setChangeCourseStudent(null);
                    setDestinationBatchId("");
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!destinationBatchId || transferBusy}
                  onClick={() => void changeStudentCourse()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: NAVY }}
                >
                  {transferBusy ? "Moving..." : "Move Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Merge Class dialog */}
      {showMergeClass && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-black text-gray-900">Merge Class</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Move a full class or selected students into another Ignite class
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMergeClass(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedActiveStudents.size > 0 && (
                <div className="rounded-xl bg-blue-50 text-blue-800 px-3 py-2 text-xs font-semibold">
                  {selectedActiveStudents.size} selected student
                  {selectedActiveStudents.size === 1 ? "" : "s"} will be moved.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Source Class
                </label>

                <select
                  value={mergeSourceBatchId}
                  onChange={(e) => setMergeSourceBatchId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Select source class</option>

                  {(activeStudents?.availableBatches ?? []).map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.grade != null ? `Grade ${batch.grade} · ` : ""}
                      {batch.title}
                      {batch.batchCode ? ` · ${batch.batchCode}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Destination Class
                </label>

                <select
                  value={mergeDestinationBatchId}
                  onChange={(e) => setMergeDestinationBatchId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Select destination class</option>

                  {(activeStudents?.availableBatches ?? [])
                    .filter((batch) => String(batch.id) !== mergeSourceBatchId)
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.grade != null ? `Grade ${batch.grade} · ` : ""}
                        {batch.title}
                        {batch.batchCode ? ` · ${batch.batchCode}` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-[11px] text-amber-800">
                {selectedActiveStudents.size > 0
                  ? "Only the selected students from the source class will move."
                  : "No students are selected, so every active student in the source class will move."}
                {" "}Student profile grades remain unchanged.
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={transferBusy}
                  onClick={() => setShowMergeClass(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    !mergeSourceBatchId ||
                    !mergeDestinationBatchId ||
                    transferBusy
                  }
                  onClick={() => void mergeIgniteClass()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: ORANGE }}
                >
                  {transferBusy
                    ? "Moving..."
                    : selectedActiveStudents.size > 0
                      ? `Move ${selectedActiveStudents.size} Students`
                      : "Merge Entire Class"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Video className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">{searchQ ? "No batches match your search." : "No demo batches yet. Create one to get started."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map(batch => {
            const enrolled = batch.enrolledCount ?? 0;
            const converted = batch.convertedCount ?? 0;
            const dropped = batch.droppedCount ?? 0;
            const convRate = batch.conversionRate ?? 0;
            return (
              <div key={batch.id} onClick={() => openBatch(batch)}
                className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-200">
                <div className="flex items-start gap-4">
                  {/* Date badge */}
                  {batch.startDate && (
                    <div className="flex-shrink-0 text-center rounded-xl p-2 min-w-[48px]" style={{ background: `${NAVY}10` }}>
                      <div className="text-[10px] font-bold uppercase" style={{ color: NAVY }}>
                        {new Date(batch.startDate).toLocaleDateString("en-IN", { month: "short" })}
                      </div>
                      <div className="text-xl font-black" style={{ color: NAVY }}>
                        {new Date(batch.startDate).getDate()}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900">{batch.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[batch.status.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
                        {batch.status === "active" ? "In Progress" : batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                      </span>
                      {!batch.isPublic && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Draft</span>}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mb-3">
                      {batch.teacherName && <span>by <strong>{batch.teacherName}</strong></span>}
                      {batch.subject && <span>· {batch.subject}</span>}
                      {batch.grade && <span>· Grade {batch.grade}</span>}
                      <span>· <Clock className="w-3 h-3 inline mr-0.5" />{batch.totalDays}-Day Batch</span>
                      {batch.batchCode && <span className="font-mono text-gray-400">· {batch.batchCode}</span>}
                      {batch.endDate && batch.startDate && (
                        <span>· {new Date(batch.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – {new Date(batch.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      )}
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {[
                        { label: "Enrolled", value: enrolled, color: "#374151" },
                        { label: "Converted", value: converted, color: GREEN },
                        { label: "Dropped", value: dropped, color: "#DC2626" },
                        { label: "Conv.%", value: `${convRate}%`, color: convRate >= 30 ? GREEN : convRate >= 15 ? "#D97706" : "#DC2626" },
                      ].map(m => (
                        <div key={m.label} className="text-center">
                          <div className="font-black text-base" style={{ color: m.color }}>{m.value}</div>
                          <div className="text-[10px] text-gray-400">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { openBatch(batch); setDetailTab("students"); }}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                      <Users className="w-3 h-3" /> Students
                    </button>
                    <button onClick={() => { openBatch(batch); setDetailTab("sessions"); }}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                      <Video className="w-3 h-3" /> Sessions
                    </button>
                    <button onClick={() => { openBatch(batch); setDetailTab("mentor-tracking"); }}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                      <Phone className="w-3 h-3" /> Tracking
                    </button>
                    <button onClick={(e) => deleteBatch(batch.id, e)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">Showing {filteredBatches.length} of {batches.length} batches</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BatchDetail — full 6-tab dashboard for a single batch
// ─────────────────────────────────────────────────────────────────
interface BatchDetailProps {
  batch: DemoBatch;
  detailTab: DetailTab; setDetailTab: (t: DetailTab) => void;
  overview: OverviewData | null; overviewLoading: boolean;
  enrollments: DemoEnrollment[]; allStudents: AdminUser[];
  studentFilter: StudentFilter; setStudentFilter: (f: StudentFilter) => void;
  studSearchQ: string; setStudSearchQ: (q: string) => void;
  addMode: AddMode; setAddMode: (m: AddMode) => void;
  csvRows: { name: string; email: string; phone: string; grade: string }[];
  setCsvRows: (r: { name: string; email: string; phone: string; grade: string }[]) => void;
  pasteText: string; setPasteText: (t: string) => void;
  bulkBusy: boolean;
  bulkResult: { created: number; skipped: number; enrolled: number; errors: string[] } | null;
  sessions: DemoSession[]; sessionsLoading: boolean;
  showAddSession: boolean; setShowAddSession: (v: boolean) => void;
  sessionForm: typeof emptySession; setSessionForm: (f: typeof emptySession) => void;
  editingSession: DemoSession | null;
  editSessionForm: typeof emptyEditSessionForm;
  setEditSessionForm: (f: typeof emptyEditSessionForm) => void;
  savingSession: boolean;
  onOpenEditSession: (s: DemoSession) => void;
  onUpdateSession: () => void;
  onCloseEditSession: () => void;
  teachers: Teacher[]; teacherSuggestions: Record<string, string>;
  mentorRows: MentorTrackingRow[]; mentorLoading: boolean;
  analytics: AnalyticsData | null;
  settingsForm: typeof emptyBatch; setSettingsForm: (f: typeof emptyBatch) => void; settingsBusy: boolean;
  onClose: () => void;
  onEnroll: (sid: number) => void; onRemove: (eid: number) => void;
  onUpdateStatus: (batchId: number, eid: number, status: string) => void;
  onUpdateAttendance: (batchId: number, eid: number, day: number) => void;
  parseCSV: (t: string) => { name: string; email: string; phone: string; grade: string }[];
  handleCSVFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  runBulkUpload: () => void;
  onCreateSession: () => void; onDeleteSession: (id: number) => void; onGenerateSessions: () => void;
  onSaveSettings: () => void;
  flash: (msg: string, ok?: boolean) => void;
}

function BatchDetail(p: BatchDetailProps) {
  const { batch } = p;
  const TABS: { key: DetailTab; label: string; icon: typeof Eye; badge?: number; sub?: string }[] = [
    { key: "overview", label: "Overview", icon: Eye, sub: batch.status === "active" ? "Live" : batch.status === "completed" ? "Done" : "Upcoming" },
    { key: "students", label: "Students", icon: Users, badge: p.enrollments.length, sub: `${batch.enrolledCount ?? 0} enrolled` },
    { key: "sessions", label: "Sessions", icon: Video, badge: p.sessions.length || (batch.totalDays ?? 0), sub: `${batch.totalDays ?? 5} days` },
    { key: "mentor-tracking", label: "Tracking", icon: Phone, sub: "Mentor" },
    { key: "analytics", label: "Analytics", icon: BarChart3, sub: `${batch.conversionRate ?? 0}% conv.` },
    { key: "settings", label: "Details", icon: Settings2, sub: "Edit batch" },
  ];

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={p.onClose} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Demo Batches
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300" />
        <span className="text-sm font-bold" style={{ color: NAVY }}>{batch.title}</span>
        {batch.batchCode && <span className="text-xs text-gray-400 font-mono">· {batch.batchCode}</span>}
      </div>

      {/* Batch header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>{batch.title}</h2>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[batch.status.toLowerCase()] ?? "bg-gray-100 text-gray-600"}`}>
                {batch.status === "active" ? "In Progress" : batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {batch.startDate && batch.endDate && (
                <span><Calendar className="w-3 h-3 inline mr-0.5" />
                  {new Date(batch.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – {new Date(batch.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {batch.teacherName && <span>· Teacher: <strong>{batch.teacherName}</strong></span>}
              {batch.grade && <span>· Grade {batch.grade}</span>}
              {batch.subject && <span>· {batch.subject}</span>}
              {batch.mentorName && <span>· Mentor: <strong style={{ color: ORANGE }}>{batch.mentorName}</strong></span>}
            </div>
          </div>
          <button onClick={p.onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200 mb-4 overflow-x-auto pb-px">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = p.detailTab === t.key;
          return (
            <button key={t.key} onClick={() => p.setDetailTab(t.key)}
              className={`flex flex-col items-center gap-0 px-2.5 py-1.5 min-w-[60px] whitespace-nowrap border-b-2 transition-all ${active ? "border-blue-600" : "border-transparent hover:border-gray-200"}`}>
              <div className={`flex items-center gap-1 text-[11px] font-bold ${active ? "text-blue-600" : "text-gray-600"}`}>
                <Icon className="w-3 h-3" />
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={`text-[9px] font-black px-1 py-px rounded-full leading-none ${active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.badge}
                  </span>
                )}
              </div>
              {t.sub && (
                <span className={`text-[9px] font-medium leading-none mt-0.5 ${active ? "text-blue-400" : "text-gray-400"}`}>
                  {t.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {p.detailTab === "overview" && <OverviewTab batch={batch} overview={p.overview} loading={p.overviewLoading} setTab={p.setDetailTab} />}
      {p.detailTab === "students" && (
        <StudentsTab batch={batch}
          enrollments={p.enrollments} allStudents={p.allStudents}
          sessions={p.sessions}
          filter={p.studentFilter} setFilter={p.setStudentFilter}
          searchQ={p.studSearchQ} setSearchQ={p.setStudSearchQ}
          addMode={p.addMode} setAddMode={p.setAddMode}
          csvRows={p.csvRows} setCsvRows={p.setCsvRows}
          pasteText={p.pasteText} setPasteText={p.setPasteText}
          bulkBusy={p.bulkBusy} bulkResult={p.bulkResult}
          onEnroll={p.onEnroll} onRemove={p.onRemove}
          onUpdateStatus={p.onUpdateStatus} onUpdateAttendance={p.onUpdateAttendance}
          parseCSV={p.parseCSV} handleCSVFile={p.handleCSVFile} runBulkUpload={p.runBulkUpload}
        />
      )}
      {p.detailTab === "sessions" && (
        <SessionsTab batch={batch} sessions={p.sessions} loading={p.sessionsLoading}
          showAdd={p.showAddSession} setShowAdd={p.setShowAddSession}
          form={p.sessionForm} setForm={p.setSessionForm}
          editingSession={p.editingSession} editSessionForm={p.editSessionForm}
          setEditSessionForm={p.setEditSessionForm} savingSession={p.savingSession}
          onOpenEdit={p.onOpenEditSession} onUpdateSession={p.onUpdateSession}
          onCloseEdit={p.onCloseEditSession}
          onCreate={p.onCreateSession} onDelete={p.onDeleteSession} onGenerate={p.onGenerateSessions}
          teachers={p.teachers} teacherSuggestions={p.teacherSuggestions} />
      )}
      {p.detailTab === "mentor-tracking" && <MentorTrackingTab rows={p.mentorRows} loading={p.mentorLoading} flash={p.flash} />}
      {p.detailTab === "analytics" && <AnalyticsTab analytics={p.analytics} />}
      {p.detailTab === "settings" && (
        <SettingsTab batch={batch} form={p.settingsForm} setForm={p.setSettingsForm}
          busy={p.settingsBusy} onSave={p.onSaveSettings} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────────────────────────
function OverviewTab({ batch, overview, loading, setTab }: {
  batch: DemoBatch; overview: OverviewData | null; loading: boolean; setTab: (t: DetailTab) => void;
}) {
  if (loading) return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading overview...</div>;
  if (!overview) return null;

  const { metrics, dayBreakdown, mentorStats } = overview;

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Enrolled", value: metrics.total, icon: "👥", color: NAVY, sub: "Total" },
          { label: "Today", value: dayBreakdown.reduce((m, d) => d.count > m ? d.count : m, 0), icon: "📅", color: "#0284C7", sub: "Attendance" },
          { label: "Converted", value: metrics.converted, icon: "🎯", color: GREEN, sub: `${metrics.conversionRate}%` },
          { label: "Dropped", value: metrics.dropped, icon: "📉", color: "#DC2626", sub: "Left" },
          { label: "Active", value: metrics.active, icon: "🔥", color: "#D97706", sub: "In program" },
          { label: "Conv. %", value: `${metrics.conversionRate}%`, icon: "📊", color: metrics.conversionRate >= 30 ? GREEN : metrics.conversionRate >= 15 ? "#D97706" : "#DC2626", sub: "Rate" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-sm">{c.icon}</span>
              <span className="text-[9px] text-gray-400">{c.sub}</span>
            </div>
            <div className="text-lg font-black leading-none" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[9px] text-gray-500 font-medium">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Day-by-day progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-sm mb-3" style={{ color: NAVY }}>{batch.totalDays}-Day Progress</div>
        <div className="flex items-end gap-2 flex-wrap">
          {dayBreakdown.map((d, i) => {
            const pct = metrics.total > 0 ? (d.count / metrics.total) * 100 : 0;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[50px]">
                <span className="text-xs font-black text-gray-700">{d.count}</span>
                <div className="w-full rounded-t-lg transition-all" style={{
                  height: `${Math.max(pct * 0.8, 4)}px`, minHeight: 4,
                  background: i === dayBreakdown.length - 1 && pct < 60 ? "#DC2626" : i === 0 ? NAVY : `${NAVY}${Math.round(70 - i * 10)}`,
                }} />
                <span className="text-[10px] text-gray-500">Day {d.day}</span>
              </div>
            );
          })}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-[50px]">
            <span className="text-xs font-black" style={{ color: GREEN }}>{metrics.converted}</span>
            <div className="w-full rounded-t-lg" style={{
              height: `${Math.max(metrics.total > 0 ? (metrics.converted / metrics.total) * 80 : 0, 4)}px`,
              minHeight: 4, background: GREEN,
            }} />
            <span className="text-[10px] text-gray-500">Converted</span>
          </div>
          <div className="flex flex-col items-center gap-1 flex-1 min-w-[50px]">
            <span className="text-xs font-black text-red-500">{metrics.dropped}</span>
            <div className="w-full rounded-t-lg bg-red-400" style={{
              height: `${Math.max(metrics.total > 0 ? (metrics.dropped / metrics.total) * 80 : 0, 4)}px`, minHeight: 4,
            }} />
            <span className="text-[10px] text-gray-500">Dropped</span>
          </div>
        </div>
      </div>

      {/* Assigned Mentors */}
      {mentorStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="font-bold text-sm mb-3" style={{ color: NAVY }}>Assigned Mentors</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Mentor", "Assigned", "Converted", "Pending", "Conv. %"].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-gray-400 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mentorStats.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-semibold text-gray-800">{m.name}</td>
                    <td className="py-2 pr-4">{m.assigned}</td>
                    <td className="py-2 pr-4 font-bold" style={{ color: GREEN }}>{m.converted}</td>
                    <td className="py-2 pr-4 text-gray-500">{m.pending}</td>
                    <td className="py-2 pr-4">
                      <span className="font-bold" style={{ color: m.conversionRate >= 30 ? GREEN : m.conversionRate >= 15 ? "#D97706" : "#DC2626" }}>
                        {m.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "View All Students", tab: "students" as DetailTab, icon: Users, color: NAVY },
          { label: "Mentor Tracking", tab: "mentor-tracking" as DetailTab, icon: Phone, color: ORANGE },
          { label: "Analytics", tab: "analytics" as DetailTab, icon: BarChart3, color: GREEN },
          { label: "Sessions", tab: "sessions" as DetailTab, icon: Video, color: "#6366F1" },
        ].map(n => {
          const Icon = n.icon;
          return (
            <button key={n.label} onClick={() => setTab(n.tab)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all text-sm font-semibold"
              style={{ color: n.color }}>
              <Icon className="w-4 h-4" /> {n.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Students Tab
// ─────────────────────────────────────────────────────────────────
function StudentsTab(p: {
  batch: DemoBatch;
  enrollments: DemoEnrollment[]; allStudents: AdminUser[];
  sessions: DemoSession[];
  filter: StudentFilter; setFilter: (f: StudentFilter) => void;
  searchQ: string; setSearchQ: (q: string) => void;
  addMode: AddMode; setAddMode: (m: AddMode) => void;
  csvRows: { name: string; email: string; phone: string; grade: string }[];
  setCsvRows: (r: { name: string; email: string; phone: string; grade: string }[]) => void;
  pasteText: string; setPasteText: (t: string) => void;
  bulkBusy: boolean;
  bulkResult: { created: number; skipped: number; enrolled: number; errors: string[] } | null;
  onEnroll: (sid: number) => void; onRemove: (eid: number) => void;
  onUpdateStatus: (batchId: number, eid: number, status: string) => void;
  onUpdateAttendance: (batchId: number, eid: number, day: number) => void;
  parseCSV: (t: string) => { name: string; email: string; phone: string; grade: string }[];
  handleCSVFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  runBulkUpload: () => void;
}) {
  const sessionByDay = Object.fromEntries(p.sessions.map(s => [s.dayNumber, s.title]));
  const filters: { key: StudentFilter; label: string }[] = [
    { key: "all", label: `All (${p.enrollments.length})` },
    ...Array.from({ length: p.batch.totalDays }, (_, i) => ({ key: `day${i + 1}` as StudentFilter, label: `Day ${i + 1}` })),
    { key: "converted", label: `Converted (${p.enrollments.filter(e => e.enrollmentStatus === "converted").length})` },
    { key: "dropped", label: `Dropped (${p.enrollments.filter(e => e.enrollmentStatus === "dropped").length})` },
  ];

  const filtered = p.enrollments.filter(e => {
    if (p.filter === "all") return true;
    if (p.filter === "converted") return e.enrollmentStatus === "converted";
    if (p.filter === "dropped") return e.enrollmentStatus === "dropped";
    if (p.filter.startsWith("day")) {
      const day = parseInt(p.filter.replace("day", ""));
      return (e.lastDayAttended ?? 0) >= day;
    }
    return true;
  });

  const enrolledIds = new Set(p.enrollments.map(e => e.studentId));
  const q = p.searchQ.toLowerCase();
  const searchResults = p.allStudents.filter(u =>
    !enrolledIds.has(u.id) &&
    (!q || u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.phone ?? "").includes(q))
  );

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map(f => (
          <button key={f.key} onClick={() => p.setFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={p.filter === f.key
              ? { background: NAVY, color: "white" }
              : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Enrolled students table */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: `${NAVY}08` }}>
                <tr>
                  {["Student", "Grade", "School", "Day Reached", "Status", "Mentor", "Actions"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const sc = ENROLL_STATUS_COLORS[e.enrollmentStatus] ?? ENROLL_STATUS_COLORS.active;
                  return (
                    <tr key={e.enrollmentId} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-800">{e.name}</div>
                        {e.phone && <div className="text-gray-400">{e.phone}</div>}
                        {e.repeatedCustomer && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">🔁 Repeated</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{e.grade ? `G${e.grade}` : "—"}</td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[120px] truncate">{e.school ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={e.lastDayAttended ?? 0}
                          onChange={ev => p.onUpdateAttendance(p.batch.id, e.enrollmentId, Number(ev.target.value))}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                          onClick={ev => ev.stopPropagation()}>
                          <option value={0}>Not started</option>
                          {Array.from({ length: p.batch.totalDays }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {sessionByDay[i + 1] ? `Day ${i + 1} — ${sessionByDay[i + 1]}` : `Day ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={e.enrollmentStatus}
                          onChange={ev => p.onUpdateStatus(p.batch.id, e.enrollmentId, ev.target.value)}
                          className="text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer"
                          style={{ background: sc.bg, color: sc.text }}
                          onClick={ev => ev.stopPropagation()}>
                          <option value="active">Active</option>
                          <option value="converted">Converted ✓</option>
                          <option value="dropped">Dropped</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{e.assignedMentorName ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => p.onRemove(e.enrollmentId)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No students match this filter.</div>}

      {/* Add Students Panel */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <div className="font-semibold text-sm mb-3" style={{ color: NAVY }}>Add Students</div>
        <div className="flex gap-1.5 mb-4">
          {(["search", "csv", "paste"] as const).map(mode => (
            <button key={mode} onClick={() => { p.setAddMode(mode); p.setCsvRows([]); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={p.addMode === mode ? { background: NAVY, color: "white" } : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              {mode === "search" ? "🔍 Search Existing" : mode === "csv" ? "📄 Upload CSV" : "📋 Paste List"}
            </button>
          ))}
        </div>

        {p.addMode === "search" && (
          <>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Search by name, email or phone..." value={p.searchQ}
                onChange={e => p.setSearchQ(e.target.value)} className="pl-8 h-9 text-sm bg-white" />
            </div>
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">
                {p.searchQ ? "No matching students found" : "All registered students are already enrolled or no students exist"}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {searchResults.slice(0, 20).map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.email ?? u.phone ?? ""} {u.grade ? `· Grade ${u.grade}` : ""}</div>
                    </div>
                    <Button size="sm" onClick={() => p.onEnroll(u.id)} style={{ background: NAVY }}
                      className="text-white text-xs h-7 px-3">Enroll</Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {p.addMode === "csv" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Upload a CSV file with columns: Name, Email, Phone, Grade</p>
            <Input type="file" accept=".csv,.txt" onChange={p.handleCSVFile} className="text-sm" />
            {p.csvRows.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-2">{p.csvRows.length} rows ready to import</p>
                <Button onClick={p.runBulkUpload} disabled={p.bulkBusy} style={{ background: NAVY }} className="text-white text-xs">
                  {p.bulkBusy ? "Uploading..." : `Upload ${p.csvRows.length} Students`}
                </Button>
              </div>
            )}
          </div>
        )}

        {p.addMode === "paste" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Paste comma-separated rows: Name, Email, Phone, Grade (one per line)</p>
            <Textarea placeholder="Arjun Sharma, arjun@gmail.com, 9876543210, 6" value={p.pasteText}
              onChange={e => p.setPasteText(e.target.value)} rows={5} className="text-sm bg-white" />
            <div className="flex gap-2">
              <Button onClick={() => p.setCsvRows(p.parseCSV(p.pasteText))} variant="outline" className="text-xs">Parse</Button>
              {p.csvRows.length > 0 && (
                <Button onClick={p.runBulkUpload} disabled={p.bulkBusy} style={{ background: NAVY }} className="text-white text-xs">
                  {p.bulkBusy ? "Uploading..." : `Upload ${p.csvRows.length} Students`}
                </Button>
              )}
            </div>
          </div>
        )}

        {p.bulkResult && (
          <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <div className="font-bold" style={{ color: GREEN }}>✓ Upload complete</div>
            <div className="text-gray-600 mt-1">
              {p.bulkResult.created} new accounts created · {p.bulkResult.skipped} existing · {p.bulkResult.enrolled} enrolled
            </div>
            {p.bulkResult.errors.length > 0 && (
              <div className="mt-1 text-red-600">{p.bulkResult.errors.slice(0, 3).join(", ")}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sessions Tab — table layout + Edit Session Modal
// ─────────────────────────────────────────────────────────────────
const SESSION_STATUS_CHIP: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  live: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-yellow-100 text-yellow-700",
};

function SessionsTab(p: {
  batch: DemoBatch; sessions: DemoSession[]; loading: boolean;
  showAdd: boolean; setShowAdd: (v: boolean) => void;
  form: typeof emptySession; setForm: (f: typeof emptySession) => void;
  editingSession: DemoSession | null;
  editSessionForm: typeof emptyEditSessionForm;
  setEditSessionForm: (f: typeof emptyEditSessionForm) => void;
  savingSession: boolean;
  onOpenEdit: (s: DemoSession) => void;
  onUpdateSession: () => void;
  onCloseEdit: () => void;
  onCreate: () => void; onDelete: (id: number) => void; onGenerate: () => void;
  teachers: Teacher[]; teacherSuggestions: Record<string, string>;
}) {
  if (p.loading) return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sessions...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>Sessions ({p.sessions.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">Sessions at 5 PM IST · Edit each to customise</p>
        </div>
        <Button onClick={() => p.setShowAdd(!p.showAdd)} style={{ background: ORANGE }} className="text-white text-xs gap-1 h-8">
          <Plus className="w-3.5 h-3.5" /> Add Session
        </Button>
      </div>

      {/* Add Session Form */}
      {p.showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-sm" style={{ color: NAVY }}>New Session</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Title *</label>
              <Input placeholder="e.g. Day 6 – Revision" value={p.form.title} onChange={e => p.setForm({ ...p.form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Day #</label>
              <Input type="number" value={p.form.dayNumber} onChange={e => p.setForm({ ...p.form, dayNumber: e.target.value })} min={1} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Subject</label>
              <Select value={p.form.subject || "none"} onValueChange={v => {
                const subj = v === "none" ? "" : v;
                const suggested = subj ? (p.teacherSuggestions[subj] ?? "") : "";
                p.setForm({ ...p.form, subject: subj, teacherName: suggested });
              }}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Teacher</label>
              <Select value={p.form.teacherName || "none"} onValueChange={v => p.setForm({ ...p.form, teacherName: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No teacher —</SelectItem>
                  {p.teachers.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Scheduled At (IST)</label>
              <Input type="datetime-local" value={p.form.scheduledAt} onChange={e => p.setForm({ ...p.form, scheduledAt: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Live Link</label>
              <Input placeholder="https://meet.google.com/..." value={p.form.joinUrl} onChange={e => p.setForm({ ...p.form, joinUrl: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Homework Link</label>
              <Input placeholder="https://..." value={p.form.homeworkLink} onChange={e => p.setForm({ ...p.form, homeworkLink: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={p.onCreate} style={{ background: NAVY }} className="text-white text-xs">Create Session</Button>
            <Button variant="ghost" onClick={() => p.setShowAdd(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Sessions Table (desktop) / Cards (mobile) */}
      {p.sessions.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-semibold text-gray-500 mb-1">No sessions yet</p>
          {p.batch.startDate ? (
            <>
              <p className="text-xs text-gray-400 mb-4">Auto-generate 5 sessions (Day 1–5 at 5 PM IST) based on the batch start date</p>
              <Button onClick={p.onGenerate} style={{ background: NAVY }} className="text-white text-sm gap-1.5 mx-auto">
                <Wand2 className="w-4 h-4" /> Generate 5 Sessions
              </Button>
            </>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Set a start date in <strong>Batch Details</strong> tab first, then come back to auto-generate sessions.</p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: `${NAVY}08` }}>
                  {["Day", "Subject", "Date", "Time", "Teacher", "Live Link", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-3 py-3 font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.sessions.map(s => {
                  const { date, time } = sessionToIst(s.scheduledAt);
                  const endMs = new Date(s.scheduledAt).getTime() + s.duration * 60 * 1000;
                  const { time: endTime } = sessionToIst(new Date(endMs).toISOString());
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: `${NAVY}15`, color: NAVY }}>{s.dayNumber}</span>
                      </td>
                      <td className="px-3 py-3">
                        {s.subject ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{s.subject}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-700 font-medium">{date}</td>
                      <td className="px-3 py-3 text-gray-600">{time} – {endTime}</td>
                      <td className="px-3 py-3 text-gray-700">{s.teacherName ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-3">
                        {s.joinUrl ? (
                          <a href={s.joinUrl} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                            <Link className="w-3 h-3" /> Join ↗
                          </a>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${SESSION_STATUS_CHIP[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => p.onOpenEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Edit session">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => p.onDelete(s.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Delete session">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {p.sessions.map(s => {
              const { date, time } = sessionToIst(s.scheduledAt);
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
                        style={{ background: `${NAVY}15`, color: NAVY }}>{s.dayNumber}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{s.title}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SESSION_STATUS_CHIP[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {s.subject && <div className="text-purple-600 font-semibold">{s.subject}</div>}
                          <div>{date} · {time} ({s.duration} min)</div>
                          {s.teacherName && <div>Teacher: {s.teacherName}</div>}
                        </div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {s.joinUrl && <a href={s.joinUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-lg text-white font-semibold" style={{ background: GREEN }}>Join ↗</a>}
                          {s.recordingUrl && <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600">Recording ↗</a>}
                          {s.homeworkLink && <a href={s.homeworkLink} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-600">HW ↗</a>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => p.onOpenEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => p.onDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Session Modal */}
      {p.editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) p.onCloseEdit(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Edit Session — Day {p.editingSession.dayNumber}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{p.editingSession.title}</p>
              </div>
              <button onClick={p.onCloseEdit} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Session Title</label>
                <Input value={p.editSessionForm.title} onChange={e => p.setEditSessionForm({ ...p.editSessionForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Subject</label>
                  <Select value={p.editSessionForm.subject || "none"} onValueChange={v => p.setEditSessionForm({ ...p.editSessionForm, subject: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Teacher</label>
                  <Select value={p.editSessionForm.teacherName || "none"} onValueChange={v => p.setEditSessionForm({ ...p.editSessionForm, teacherName: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No teacher —</SelectItem>
                      {p.teachers.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Date (IST)</label>
                  <Input type="date" value={p.editSessionForm.date}
                    onChange={e => p.setEditSessionForm({ ...p.editSessionForm, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Time</label>
                  <Input type="time" value={p.editSessionForm.startTime}
                    onChange={e => p.setEditSessionForm({ ...p.editSessionForm, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">End Time</label>
                  <Input type="time" value={p.editSessionForm.endTime}
                    onChange={e => p.setEditSessionForm({ ...p.editSessionForm, endTime: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Live Class Link</label>
                <Input placeholder="https://meet.google.com/..." value={p.editSessionForm.joinUrl}
                  onChange={e => p.setEditSessionForm({ ...p.editSessionForm, joinUrl: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Homework Link <span className="text-gray-300 font-normal">(optional)</span></label>
                <Input placeholder="https://..." value={p.editSessionForm.homeworkLink}
                  onChange={e => p.setEditSessionForm({ ...p.editSessionForm, homeworkLink: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Recording Link <span className="text-gray-300 font-normal">(optional)</span></label>
                <Input placeholder="https://..." value={p.editSessionForm.recordingUrl}
                  onChange={e => p.setEditSessionForm({ ...p.editSessionForm, recordingUrl: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Session Status</label>
                <Select value={p.editSessionForm.status} onValueChange={v => p.setEditSessionForm({ ...p.editSessionForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <Button onClick={p.onUpdateSession} disabled={p.savingSession} style={{ background: NAVY }} className="text-white text-sm gap-1.5 flex-1">
                <Save className="w-4 h-4" /> {p.savingSession ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={p.onCloseEdit} className="text-sm">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Mentor Tracking Tab
// ─────────────────────────────────────────────────────────────────
function MentorTrackingTab({ rows, loading, flash }: { rows: MentorTrackingRow[]; loading: boolean; flash: (m: string, ok?: boolean) => void }) {
  const [filterStatus, setFilterStatus] = useState("all");

  const CALL_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    "Need To Call":   { bg: "#EFF6FF", text: "#1D4ED8" },
    "Pending":        { bg: "#EFF6FF", text: "#1D4ED8" },
    "Picked":         { bg: "#F0FDF4", text: "#15803D" },
    "Call Connected": { bg: "#F0FDF4", text: "#15803D" },
    "Busy":           { bg: "#FEF3C7", text: "#92400E" },
    "Call Back":      { bg: "#FFF7ED", text: "#C2410C" },
    "Call Back Later":{ bg: "#EEF2FF", text: "#4338CA" },
    "Not Connected":  { bg: "#F3F4F6", text: "#374151" },
    "No Response":    { bg: "#F3F4F6", text: "#374151" },
    "Switched Off":   { bg: "#F5F3FF", text: "#5B21B6" },
    "Wrong Number":   { bg: "#ECFEFF", text: "#0E7490" },
  };

  const INTEREST_BADGE: Record<string, string> = {
    High: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    Moderate: "text-yellow-700 bg-yellow-50 border border-yellow-200",
    Low: "text-red-700 bg-red-50 border border-red-200",
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading mentor data...</div>;

  const STATUS_FILTERS = ["all", "Pending", "Need To Call", "Call Connected", "Picked", "Busy", "Call Back Later", "Call Back", "No Response", "Not Connected", "Switched Off", "Wrong Number", "Interested", "Highly Interested", "Converted"];
  const filtered = filterStatus === "all" ? rows : rows.filter(r =>
    (filterStatus === "Interested" && r.interestLevel === "Moderate") ||
    (filterStatus === "Highly Interested" && r.interestLevel === "High") ||
    (filterStatus === "Converted" && r.enrollmentStatus === "converted") ||
    r.callStatus === filterStatus
  );

  function callStudent(phone: string | null) {
    if (!phone) { flash("No phone number", false); return; }
    window.open(`tel:${phone}`);
  }

  function whatsappStudent(phone: string | null, name: string) {
    if (!phone) { flash("No phone number", false); return; }
    const msg = encodeURIComponent(`Hi, this is Braintam calling regarding ${name}'s Ignite program progress.`);
    window.open(`https://wa.me/91${phone.replace(/\D/g, "")}?text=${msg}`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(s => {
          const cnt = s === "all" ? rows.length
            : s === "Interested" ? rows.filter(r => r.interestLevel === "Moderate").length
            : s === "Highly Interested" ? rows.filter(r => r.interestLevel === "High").length
            : s === "Converted" ? rows.filter(r => r.enrollmentStatus === "converted").length
            : rows.filter(r => r.callStatus === s).length;
          return (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              style={filterStatus === s ? { background: NAVY, color: "white" } : { background: "white", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              {s === "all" ? `All (${cnt})` : `${s} (${cnt})`}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No students match this filter.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead style={{ background: `${NAVY}08` }}>
                <tr>
                  {["Student Name", "Grade", "Att.%", "HW%", "Last Call", "Interest Level", "Current Status", "Next Follow-up", "Mentor", "Quick Actions"].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cs = CALL_STATUS_COLORS[r.callStatus ?? ""] ?? { bg: "#F3F4F6", text: "#374151" };
                  const ib = INTEREST_BADGE[r.interestLevel ?? ""] ?? "text-gray-500 bg-gray-50 border border-gray-200";
                  return (
                    <tr key={r.enrollmentId} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-gray-800">{r.name}</div>
                        {r.phone && <div className="text-gray-400">{r.phone}</div>}
                        {r.repeatedCustomer && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1 py-0.5 rounded-full">🔁 Repeated</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{r.grade ? `G${r.grade}` : "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.attPct}%`, background: r.attPct >= 70 ? GREEN : r.attPct >= 40 ? "#D97706" : "#DC2626" }} />
                          </div>
                          <span className="font-bold" style={{ color: r.attPct >= 70 ? GREEN : r.attPct >= 40 ? "#D97706" : "#DC2626" }}>{r.attPct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">—</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {r.lastCallAt ? new Date(r.lastCallAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.interestLevel ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ib}`}>{r.interestLevel}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.callStatus ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cs.bg, color: cs.text }}>
                            {r.callStatus}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {r.nextFollowUpAt ? new Date(r.nextFollowUpAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }) : "—"}
                        {r.nextFollowUpTime && <span className="text-gray-400"> · {r.nextFollowUpTime}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{r.assignedMentorName ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => callStudent(r.phone)}
                            title="Call" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => whatsappStudent(r.phone, r.name)}
                            title="WhatsApp" className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Analytics Tab
// ─────────────────────────────────────────────────────────────────
function AnalyticsTab({ analytics }: { analytics: AnalyticsData | null }) {
  if (!analytics) return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics...</div>;

  const maxGradePct = Math.max(...analytics.byGrade.map(g => g.pct), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Conversion by Grade */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="font-bold text-sm mb-3" style={{ color: NAVY }}>Conversion by Grade</div>
          {analytics.byGrade.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
          ) : (
            <div className="space-y-2">
              {analytics.byGrade.map(g => (
                <div key={g.grade} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-600 w-12 flex-shrink-0">Grade {g.grade}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${(g.pct / maxGradePct) * 100}%`, background: g.pct >= 30 ? GREEN : g.pct >= 15 ? "#D97706" : "#DC2626" }}>
                      <span className="text-[10px] font-black text-white">{g.pct}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{g.converted}/{g.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversion by Mentor */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="font-bold text-sm mb-3" style={{ color: NAVY }}>Conversion by Mentor</div>
          {analytics.byMentor.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Mentor", "Total", "Converted", "%"].map(h => (
                      <th key={h} className="text-left py-2 pr-3 text-gray-400 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.byMentor.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 pr-3 font-semibold text-gray-800">{m.mentor}</td>
                      <td className="py-2 pr-3">{m.total}</td>
                      <td className="py-2 pr-3 font-bold" style={{ color: GREEN }}>{m.converted}</td>
                      <td className="py-2">
                        <span className="font-bold" style={{ color: m.pct >= 30 ? GREEN : m.pct >= 15 ? "#D97706" : "#DC2626" }}>
                          {m.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* By Interest Level */}
      {analytics.byInterest.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="font-bold text-sm mb-3" style={{ color: NAVY }}>Conversion by Interest Level</div>
          <div className="flex gap-4 flex-wrap">
            {analytics.byInterest.map(item => (
              <div key={item.level} className="flex-1 min-w-[120px] bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-lg font-black" style={{ color: item.pct >= 50 ? GREEN : "#D97706" }}>{item.pct}%</div>
                <div className="text-xs font-semibold text-gray-600">{item.level}</div>
                <div className="text-xs text-gray-400">{item.converted}/{item.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Lifecycle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-sm mb-3" style={{ color: NAVY }}>Student Lifecycle Flow</div>
        <div className="flex items-center gap-2 flex-wrap justify-center py-2">
          {[
            { label: "Lead", sub: "New inquiry / lead captured", icon: "👤", color: "#6366F1" },
            { label: "Demo Student", sub: "Added to a demo batch", icon: "📚", color: "#0284C7" },
            { label: "Active Demo", sub: "Attending 5-day demo", icon: "🎓", color: NAVY },
            { label: "Converted", sub: "Payment completed", icon: "✅", color: GREEN },
            { label: "Student", sub: "Moved to regular students", icon: "⭐", color: ORANGE },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center text-center" style={{ minWidth: 80 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 border-2"
                  style={{ borderColor: s.color, background: `${s.color}10` }}>
                  {s.icon}
                </div>
                <div className="text-xs font-bold" style={{ color: s.color }}>{s.label}</div>
                <div className="text-[9px] text-gray-400 max-w-[80px]">{s.sub}</div>
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          When payment is successful, student is automatically moved from Demo Students to Students.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Settings Tab (Batch Details)
// ─────────────────────────────────────────────────────────────────
function SettingsTab(p: {
  batch: DemoBatch;
  form: typeof emptyBatch; setForm: (f: typeof emptyBatch) => void;
  busy: boolean; onSave: () => void;
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="mb-4">
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>Batch Details</h3>
          <p className="text-xs text-gray-400 mt-0.5">Changing Start Date will automatically shift all session dates by the same offset.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Batch Title *</label>
            <Input value={p.form.title} onChange={e => p.setForm({ ...p.form, title: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Batch Code</label>
            <Input placeholder="e.g. MMSD0626" value={p.form.batchCode} onChange={e => p.setForm({ ...p.form, batchCode: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Grade</label>
            <Select value={p.form.grade || "none"} onValueChange={v => p.setForm({ ...p.form, grade: v })}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grade</SelectItem>
                {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date (IST) ⚡ cascades sessions</label>
            <Input type="datetime-local" value={p.form.startDate} onChange={e => p.setForm({ ...p.form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date (IST)</label>
            <Input type="datetime-local" value={p.form.endDate} onChange={e => p.setForm({ ...p.form, endDate: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Default Join Link</label>
            <Input value={p.form.joinLink} onChange={e => p.setForm({ ...p.form, joinLink: e.target.value })} placeholder="https://meet.google.com/..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
            <Select value={p.form.status} onValueChange={v => p.setForm({ ...p.form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="active">Active / In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <Button onClick={p.onSave} disabled={p.busy} style={{ background: NAVY }} className="text-white text-sm gap-1.5">
            <Save className="w-4 h-4" /> {p.busy ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-800 space-y-1">
        <div className="font-semibold mb-1">💡 Session Management Tips</div>
        <div>• Total sessions (Days) is auto-calculated from the Sessions tab — no manual entry needed.</div>
        <div>• Teacher and subject are set per-session in the Sessions tab → Edit modal.</div>
        <div>• Changing Start Date here will shift all session dates automatically.</div>
      </div>
    </div>
  );
}
