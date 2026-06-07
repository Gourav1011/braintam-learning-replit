import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ChevronRight, ChevronLeft, Video, BookOpen, Calendar,
  Clock, Globe, GlobeLock, Users, Search, X, Phone, MessageSquare,
  Eye, BarChart3, Settings2, CheckCircle2, XCircle, RefreshCw, Loader2,
  TrendingUp, MoreHorizontal, Edit2, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

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
  dayNumber: number; scheduledAt: string; duration: number;
  joinUrl: string | null; recordingUrl: string | null; homeworkText: string | null;
  status: string; isPublished: boolean;
}

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
type StudentFilter = "all" | "day1" | "day2" | "day3" | "day4" | "day5" | "day6" | "converted" | "dropped";
type AddMode = "search" | "csv" | "paste";

const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);
const emptyBatch = { title: "", description: "", teacherName: "", mentorName: "", bannerUrl: "", joinLink: "", startDate: "", endDate: "", grade: "", subject: "", totalDays: "5", batchCode: "" };
const emptySession = { title: "", description: "", dayNumber: "1", scheduledAt: "", duration: "60", joinUrl: "", recordingUrl: "", homeworkText: "" };

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

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/demo-batches");
      if (r.ok) setBatches(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  // Load detail data when tab changes
  useEffect(() => {
    if (!selectedBatch) return;
    if (detailTab === "overview") loadOverview(selectedBatch.id);
    if (detailTab === "students") loadEnrollments(selectedBatch.id);
    if (detailTab === "sessions") loadSessions(selectedBatch.id);
    if (detailTab === "mentor-tracking") loadMentorTracking(selectedBatch.id);
    if (detailTab === "analytics") loadAnalytics(selectedBatch.id);
    if (detailTab === "settings") setSettingsForm({
      title: selectedBatch.title, description: selectedBatch.description ?? "",
      teacherName: selectedBatch.teacherName ?? "", mentorName: selectedBatch.mentorName ?? "",
      bannerUrl: selectedBatch.bannerUrl ?? "", joinLink: selectedBatch.joinLink ?? "",
      startDate: selectedBatch.startDate ? new Date(selectedBatch.startDate).toISOString().slice(0, 16) : "",
      endDate: selectedBatch.endDate ? new Date(selectedBatch.endDate).toISOString().slice(0, 16) : "",
      grade: selectedBatch.grade ? String(selectedBatch.grade) : "",
      subject: selectedBatch.subject ?? "", totalDays: String(selectedBatch.totalDays),
      batchCode: selectedBatch.batchCode ?? "",
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
    const r = await apiFetch(`/admin/demo-batches/${batchId}/analytics`);
    if (r.ok) setAnalytics(await r.json());
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
    setBusy(true);
    try {
      const r = await apiFetch("/admin/demo-batches", {
        method: "POST",
        body: JSON.stringify({
          title: batchForm.title, description: batchForm.description || undefined,
          teacherName: batchForm.teacherName || undefined, mentorName: batchForm.mentorName || undefined,
          bannerUrl: batchForm.bannerUrl || undefined, joinLink: batchForm.joinLink || undefined,
          startDate: batchForm.startDate || undefined, endDate: batchForm.endDate || undefined,
          grade: batchForm.grade ? Number(batchForm.grade) : undefined,
          subject: batchForm.subject || undefined, totalDays: Number(batchForm.totalDays) || 5,
          batchCode: batchForm.batchCode || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Demo batch created");
      setBatchForm(emptyBatch);
      setShowAddBatch(false);
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
          title: settingsForm.title, description: settingsForm.description || undefined,
          teacherName: settingsForm.teacherName || undefined, mentorName: settingsForm.mentorName || undefined,
          bannerUrl: settingsForm.bannerUrl || undefined, joinLink: settingsForm.joinLink || undefined,
          startDate: settingsForm.startDate || undefined, endDate: settingsForm.endDate || undefined,
          grade: settingsForm.grade ? Number(settingsForm.grade) : undefined,
          subject: settingsForm.subject || undefined, totalDays: Number(settingsForm.totalDays) || 5,
          batchCode: settingsForm.batchCode || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Batch updated");
      loadBatches();
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
          title: sessionForm.title, description: sessionForm.description || undefined,
          dayNumber: Number(sessionForm.dayNumber) || 1, scheduledAt: sessionForm.scheduledAt,
          duration: Number(sessionForm.duration) || 60, joinUrl: sessionForm.joinUrl || undefined,
          recordingUrl: sessionForm.recordingUrl || undefined, homeworkText: sessionForm.homeworkText || undefined,
        }),
      });
      if (!r.ok) throw new Error();
      flash("Session created"); setSessionForm(emptySession); setShowAddSession(false);
      loadSessions(selectedBatch.id);
    } catch { flash("Failed", false); }
    finally { setBusy(false); }
  }

  async function deleteSession(id: number) {
    if (!selectedBatch || !confirm("Delete session?")) return;
    await apiFetch(`/admin/demo-batches/${selectedBatch.id}/sessions/${id}`, { method: "DELETE" });
    loadSessions(selectedBatch.id); flash("Session deleted");
  }

  // ── Filtered batch list ─────────────────────────────────────
  const filteredBatches = batches.filter(b =>
    !searchQ || b.title.toLowerCase().includes(searchQ.toLowerCase()) ||
    (b.teacherName ?? "").toLowerCase().includes(searchQ.toLowerCase()) ||
    (b.subject ?? "").toLowerCase().includes(searchQ.toLowerCase())
  );

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
      mentorRows={mentorRows} mentorLoading={mentorLoading}
      analytics={analytics}
      settingsForm={settingsForm} setSettingsForm={setSettingsForm} settingsBusy={settingsBusy}
      onClose={closeBatch}
      onEnroll={enrollStudent} onRemove={removeEnrollment}
      onUpdateStatus={updateEnrollStatus} onUpdateAttendance={updateAttendanceDay}
      parseCSV={parseCSV} handleCSVFile={handleCSVFile} runBulkUpload={runBulkUpload}
      onCreateSession={createSession} onDeleteSession={deleteSession}
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
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: NAVY }}>New Demo Batch</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Batch title *" value={batchForm.title} onChange={e => setBatchForm(p => ({ ...p, title: e.target.value }))} />
            <Input placeholder="Batch code (e.g. MMSD0626)" value={batchForm.batchCode} onChange={e => setBatchForm(p => ({ ...p, batchCode: e.target.value }))} />
            <Input placeholder="Teacher name" value={batchForm.teacherName} onChange={e => setBatchForm(p => ({ ...p, teacherName: e.target.value }))} />
            <Input placeholder="Sales mentor name" value={batchForm.mentorName} onChange={e => setBatchForm(p => ({ ...p, mentorName: e.target.value }))} />
            <Input placeholder="Subject (e.g. Mathematics)" value={batchForm.subject} onChange={e => setBatchForm(p => ({ ...p, subject: e.target.value }))} />
            <Select value={batchForm.grade} onValueChange={v => setBatchForm(p => ({ ...p, grade: v }))}>
              <SelectTrigger><SelectValue placeholder="Grade (optional)" /></SelectTrigger>
              <SelectContent>{GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Total days (e.g. 5)" value={batchForm.totalDays} onChange={e => setBatchForm(p => ({ ...p, totalDays: e.target.value }))} min={1} max={30} />
            <Input placeholder="Default join link" value={batchForm.joinLink} onChange={e => setBatchForm(p => ({ ...p, joinLink: e.target.value }))} />
            <Input type="datetime-local" value={batchForm.startDate} onChange={e => setBatchForm(p => ({ ...p, startDate: e.target.value }))} />
            <Input type="datetime-local" value={batchForm.endDate} onChange={e => setBatchForm(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button onClick={createBatch} disabled={busy} style={{ background: NAVY }} className="text-white text-sm">
              {busy ? "Creating..." : "Create Batch"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowAddBatch(false); setBatchForm(emptyBatch); }} className="text-sm">Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search by batch name, course, teacher..." value={searchQ}
          onChange={e => setSearchQ(e.target.value)} className="pl-9 bg-white" />
      </div>

      {/* Summary stats */}
      {batches.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          {[
            { label: "Total Batches", value: batches.length, icon: "📦", color: NAVY },
            { label: "Total Enrolled", value: batches.reduce((s, b) => s + (b.enrolledCount ?? 0), 0), icon: "👥", color: "#0284C7" },
            { label: "Active (In Progress)", value: batches.filter(b => b.status === "active" || b.status === "in progress").length, icon: "🔴", color: GREEN },
            { label: "Converted", value: batches.reduce((s, b) => s + (b.convertedCount ?? 0), 0), icon: "🎯", color: GREEN },
            { label: "Dropped", value: batches.reduce((s, b) => s + (b.droppedCount ?? 0), 0), icon: "📉", color: "#DC2626" },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="text-lg mb-0.5">{c.icon}</div>
              <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[10px] text-gray-400 font-medium mt-0.5">{c.label}</div>
            </div>
          ))}
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
  onCreateSession: () => void; onDeleteSession: (id: number) => void;
  onSaveSettings: () => void;
  flash: (msg: string, ok?: boolean) => void;
}

function BatchDetail(p: BatchDetailProps) {
  const { batch } = p;
  const TABS: { key: DetailTab; label: string; icon: typeof Eye }[] = [
    { key: "overview", label: "Overview", icon: Eye },
    { key: "students", label: "Students", icon: Users },
    { key: "sessions", label: "Sessions", icon: Video },
    { key: "mentor-tracking", label: "Mentor Tracking", icon: Phone },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: Settings2 },
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
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {p.detailTab === "overview" && <OverviewTab batch={batch} overview={p.overview} loading={p.overviewLoading} setTab={p.setDetailTab} />}
      {p.detailTab === "students" && (
        <StudentsTab batch={batch}
          enrollments={p.enrollments} allStudents={p.allStudents}
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
          onCreate={p.onCreateSession} onDelete={p.onDeleteSession} />
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Enrolled", value: metrics.total, icon: "👥", color: NAVY, sub: "All batches" },
          { label: "Today (Day Attendance)", value: dayBreakdown.reduce((m, d) => d.count > m ? d.count : m, 0), icon: "📅", color: "#0284C7", sub: "Today's session" },
          { label: "Converted", value: metrics.converted, icon: "🎯", color: GREEN, sub: `${metrics.conversionRate}% rate` },
          { label: "Dropped", value: metrics.dropped, icon: "📉", color: "#DC2626", sub: "Left program" },
          { label: "Active", value: metrics.active, icon: "🔥", color: "#D97706", sub: "Still in program" },
          { label: "Conversion %", value: `${metrics.conversionRate}%`, icon: "📊", color: metrics.conversionRate >= 30 ? GREEN : metrics.conversionRate >= 15 ? "#D97706" : "#DC2626", sub: "Overall rate" },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{c.icon}</span>
              <span className="text-[10px] text-gray-400">{c.sub}</span>
            </div>
            <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-medium">{c.label}</div>
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
                            <option key={i + 1} value={i + 1}>Day {i + 1}</option>
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
// Sessions Tab
// ─────────────────────────────────────────────────────────────────
function SessionsTab(p: {
  batch: DemoBatch; sessions: DemoSession[]; loading: boolean;
  showAdd: boolean; setShowAdd: (v: boolean) => void;
  form: typeof emptySession; setForm: (f: typeof emptySession) => void;
  onCreate: () => void; onDelete: (id: number) => void;
}) {
  const statusColor: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    live: "bg-red-100 text-red-700",
    completed: "bg-gray-100 text-gray-600",
  };

  if (p.loading) return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading sessions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm" style={{ color: NAVY }}>{p.batch.title} — Sessions ({p.sessions.length})</h3>
        <Button onClick={() => p.setShowAdd(!p.showAdd)} style={{ background: ORANGE }} className="text-white text-xs gap-1 h-8">
          <Plus className="w-3.5 h-3.5" /> Add Session
        </Button>
      </div>

      {p.showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-sm" style={{ color: NAVY }}>New Session</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Title *" value={p.form.title} onChange={e => p.setForm({ ...p.form, title: e.target.value })} />
            <Input type="number" placeholder="Day number" value={p.form.dayNumber} onChange={e => p.setForm({ ...p.form, dayNumber: e.target.value })} min={1} />
            <Input type="datetime-local" value={p.form.scheduledAt} onChange={e => p.setForm({ ...p.form, scheduledAt: e.target.value })} />
            <Input type="number" placeholder="Duration (mins)" value={p.form.duration} onChange={e => p.setForm({ ...p.form, duration: e.target.value })} />
            <Input placeholder="Join URL" value={p.form.joinUrl} onChange={e => p.setForm({ ...p.form, joinUrl: e.target.value })} />
            <Input placeholder="Recording URL" value={p.form.recordingUrl} onChange={e => p.setForm({ ...p.form, recordingUrl: e.target.value })} />
            <Textarea placeholder="Homework text" value={p.form.homeworkText} onChange={e => p.setForm({ ...p.form, homeworkText: e.target.value })} rows={2} className="md:col-span-2" />
          </div>
          <div className="flex gap-2">
            <Button onClick={p.onCreate} style={{ background: NAVY }} className="text-white text-xs">Create Session</Button>
            <Button variant="ghost" onClick={() => p.setShowAdd(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {p.sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Video className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No sessions yet. Add your first session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {p.sessions.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0"
                    style={{ background: `${NAVY}15`, color: NAVY }}>
                    {s.dayNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">{s.title}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                      {!s.isPublished && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Hidden</span>}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                      <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(s.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      <span><Clock className="w-3 h-3 inline mr-0.5" />{s.duration} min</span>
                    </div>
                    {s.homeworkText && <p className="text-xs text-blue-600 mt-1 truncate max-w-xs"><BookOpen className="w-3 h-3 inline mr-0.5" />{s.homeworkText}</p>}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {s.joinUrl && <a href={s.joinUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded-lg text-white font-semibold" style={{ background: GREEN }}>
                        Join Live ↗
                      </a>}
                      {s.recordingUrl && <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50">
                        Recording ↗
                      </a>}
                    </div>
                  </div>
                </div>
                <button onClick={() => p.onDelete(s.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
    "Need To Call": { bg: "#EFF6FF", text: "#1D4ED8" },
    "Picked": { bg: "#F0FDF4", text: "#15803D" },
    "Busy": { bg: "#FEF3C7", text: "#92400E" },
    "Call Back": { bg: "#FFF7ED", text: "#C2410C" },
    "Not Connected": { bg: "#F3F4F6", text: "#374151" },
  };

  const INTEREST_BADGE: Record<string, string> = {
    High: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    Moderate: "text-yellow-700 bg-yellow-50 border border-yellow-200",
    Low: "text-red-700 bg-red-50 border border-red-200",
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading mentor data...</div>;

  const STATUS_FILTERS = ["all", "Need To Call", "Picked", "Busy", "Call Back", "Not Connected", "Interested", "Highly Interested", "Converted"];
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
// Settings Tab
// ─────────────────────────────────────────────────────────────────
function SettingsTab(p: {
  batch: DemoBatch;
  form: typeof emptyBatch; setForm: (f: typeof emptyBatch) => void;
  busy: boolean; onSave: () => void;
}) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-sm mb-4" style={{ color: NAVY }}>Batch Settings</h3>
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
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Total Days</label>
            <Input type="number" value={p.form.totalDays} onChange={e => p.setForm({ ...p.form, totalDays: e.target.value })} min={1} max={30} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Teacher Name</label>
            <Input value={p.form.teacherName} onChange={e => p.setForm({ ...p.form, teacherName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Sales Mentor Name</label>
            <Input value={p.form.mentorName} onChange={e => p.setForm({ ...p.form, mentorName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Subject</label>
            <Input value={p.form.subject} onChange={e => p.setForm({ ...p.form, subject: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Grade</label>
            <Select value={p.form.grade} onValueChange={v => p.setForm({ ...p.form, grade: v })}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No grade</SelectItem>
                {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date</label>
            <Input type="datetime-local" value={p.form.startDate} onChange={e => p.setForm({ ...p.form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date</label>
            <Input type="datetime-local" value={p.form.endDate} onChange={e => p.setForm({ ...p.form, endDate: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Default Join Link</label>
            <Input value={p.form.joinLink} onChange={e => p.setForm({ ...p.form, joinLink: e.target.value })} placeholder="https://meet.google.com/..." />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <Textarea value={p.form.description} onChange={e => p.setForm({ ...p.form, description: e.target.value })} rows={3} />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={p.onSave} disabled={p.busy} style={{ background: NAVY }} className="text-white text-sm">
            {p.busy ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
