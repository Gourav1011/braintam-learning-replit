import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Loader2, XCircle, RefreshCw, MoreVertical, Eye, Pencil, UserCheck,
  UserX, Shield, X, Check, AlertTriangle, GraduationCap,
  BookOpen, Monitor, CalendarDays, Zap, TrendingUp, UserPlus, EyeOff,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    ...opts,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeacherRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginDate: string | null;
  coursesCount: number;
  classesCount: number;
  employeeId?: string | null;
  qualification?: string | null;
  experienceYears?: number | null;
  teachingSubjects?: string[];
  teachingGrades?: number[];
  joiningDate?: string | null;
  isOnLeave?: boolean;
  leaveReason?: string | null;
  leaveUntil?: string | null;
}

interface CourseOption {
  id: number;
  title: string;
  grade: number;
  courseType: string;
}

interface CourseSubjectOption {
  id: number;
  name: string;
}

interface AssignmentRow {
  id: number;
  courseId: number;
  courseTitle: string;
  courseType: string;
  grade: number;
  courseSubjectId: number | null;
  subjectName: string | null;
  assignedAt: string;
}

interface TeacherListResponse {
  items: TeacherRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis: { totalTeachers: number; activeTeachers: number; inactiveTeachers: number; totalClasses: number; totalCourses: number; avgAttendance: number; onLeaveToday: number; teachingNow: number; availableNow: number };
}

interface ScheduleClass {
  id: number; title: string; grade: number | null; subjectName: string | null;
  program: string | null; status: string | null; startsAt: string | null; endsAt: string | null;
}

interface ScheduleTeacher {
  id: number; name: string; avatarUrl: string | null;
  isOnLeave: boolean; leaveReason: string | null;
  teachingSubjects: string[];
  classes: ScheduleClass[];
  currentStatus: "on_leave" | "teaching" | "available";
  currentClass: ScheduleClass | null;
  nextClass: ScheduleClass | null;
}

interface FindAvailableResult {
  id: number; name: string; avatarUrl: string | null;
  available: boolean; reason: string | null; isDefault: boolean;
}

interface ClassRow {
  id: number;
  title: string;
  subjectId: number | null;
  scheduledAt: string | null;
  status: string | null;
  grade: number | null;
}

// Teachers are department-neutral — assignable to any course or live class.

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-400"}`} />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function ClassStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { bg: string; text: string }> = {
    scheduled: { bg: "#DBEAFE", text: "#1E40AF" },
    live:      { bg: "#DCFCE7", text: "#166534" },
    completed: { bg: "#F1F5F9", text: "#475569" },
    cancelled: { bg: "#FEE2E2", text: "#991B1B" },
  };
  const s = map[status ?? ""] ?? { bg: "#F1F5F9", text: "#475569" };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: s.bg, color: s.text }}>{status ?? "—"}</span>;
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className="rounded-full flex items-center justify-center text-white flex-shrink-0"
      style={{ background: NAVY, fontSize: size <= 8 ? "11px" : "14px", fontWeight: 900,
        width: `${size * 4}px`, height: `${size * 4}px`, minWidth: `${size * 4}px` }}>
      {initials || "?"}
    </div>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose, loading }: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onClose: () => void; loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? "bg-red-100" : "bg-blue-50"}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? "text-red-500" : "text-blue-500"}`} />
          </div>
          <h3 className="font-black text-sm" style={{ color: NAVY }}>{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={loading} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ background: danger ? "#EF4444" : NAVY }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ teacher, onClose, onSaved, flash }: {
  teacher: TeacherRow; onClose: () => void;
  onSaved: (u: Partial<TeacherRow>) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName]       = useState(teacher.name);
  const [phone, setPhone]     = useState(teacher.phone ?? "");
  const [qualification, setQualification]     = useState(teacher.qualification ?? "");
  const [experienceYears, setExperienceYears] = useState(teacher.experienceYears != null ? String(teacher.experienceYears) : "");
  const [subjects, setSubjects] = useState((teacher.teachingSubjects ?? []).join(", "));
  const [grades, setGrades]     = useState((teacher.teachingGrades ?? []).join(", "));
  const [joiningDate, setJoiningDate] = useState(teacher.joiningDate ? teacher.joiningDate.slice(0, 10) : "");
  const [saving, setSaving]   = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/cc/teachers/${teacher.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(), phone: phone || null,
          qualification: qualification.trim() || null,
          experienceYears: experienceYears.trim() ? Number(experienceYears) : null,
          teachingSubjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
          teachingGrades: grades.split(",").map(g => Number(g.trim())).filter(g => !isNaN(g)),
          joiningDate: joiningDate || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      flash("Teacher updated", true);
      onSaved(d.teacher);
      onClose();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Edit Teacher</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email (read-only)</label>
            <input value={teacher.email ?? "—"} readOnly className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Employee ID</label>
              <input value={teacher.employeeId ?? "—"} readOnly className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Experience (yrs)</label>
              <input type="number" min={0} value={experienceYears} onChange={e => setExperienceYears(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Qualification</label>
            <input value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. M.Sc Mathematics"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Teaching Subjects <span className="text-gray-300 font-normal">(comma separated)</span></label>
            <input value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Maths, Science"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Teaching Grades <span className="text-gray-300 font-normal">(comma separated)</span></label>
            <input value={grades} onChange={e => setGrades(e.target.value)} placeholder="6, 7, 8"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Joining Date</label>
            <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Teacher Modal ─────────────────────────────────────────────────────────
function AddTeacherModal({ onClose, onCreated, flash }: {
  onClose: () => void;
  onCreated: (t: TeacherRow) => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [phone, setPhone]       = useState("");
  const [qualification, setQualification]     = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [subjects, setSubjects] = useState("");
  const [grades, setGrades]     = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving]     = useState(false);

  async function create() {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setSaving(true);
    try {
      const r = await apiFetch("/admin/cc/teachers", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          phone: phone || undefined,
          qualification: qualification.trim() || undefined,
          experienceYears: experienceYears.trim() ? Number(experienceYears) : undefined,
          teachingSubjects: subjects.split(",").map(s => s.trim()).filter(Boolean),
          teachingGrades: grades.split(",").map(g => Number(g.trim())).filter(g => !isNaN(g)),
          joiningDate: joiningDate || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to create teacher");
      flash(`Teacher "${name.trim()}" created successfully`, true);
      onCreated(d.teacher);
      onClose();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  }

  const valid = name.trim().length > 0 && email.trim().length > 0 && password.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${NAVY}15` }}>
              <UserPlus className="w-3.5 h-3.5" style={{ color: NAVY }} />
            </div>
            <h3 className="font-black text-sm" style={{ color: NAVY }}>Add Teacher</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Full Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Email <span className="text-red-400">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@braintam.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-9 text-sm focus:outline-none focus:border-blue-400" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Phone <span className="text-gray-300 font-normal">(optional)</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit mobile number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Employee ID</label>
              <input value="Auto-generated on save" readOnly className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Experience (yrs)</label>
              <input type="number" min={0} value={experienceYears} onChange={e => setExperienceYears(e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Qualification</label>
            <input value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. M.Sc Mathematics"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Teaching Subjects <span className="text-gray-300 font-normal">(comma separated)</span></label>
            <input value={subjects} onChange={e => setSubjects(e.target.value)} placeholder="Maths, Science"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Teaching Grades <span className="text-gray-300 font-normal">(comma separated)</span></label>
            <input value={grades} onChange={e => setGrades(e.target.value)} placeholder="6, 7, 8"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Joining Date <span className="text-gray-300 font-normal">(defaults to today)</span></label>
            <input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={create} disabled={saving || !valid}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5" /> Create</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Modal ─────────────────────────────────────────────────────────────
interface ProfileData {
  profile: TeacherRow;
  performance: { classesAssigned: number; coursesAssigned: number; subjects: string[]; attendancePct: number; homeworkCompletionPct: number };
  assignments: AssignmentRow[];
  upcomingClasses: { id: number; title: string; scheduledAt: string; duration: number; status: string; grade: number }[];
  permissions: { module: string; view: boolean; create: boolean; edit: boolean; del: boolean }[];
  activity: { id: number; action: string; actionLabel: string; module: string; targetName: string; createdAt: string }[];
}

function ProfileModal({ teacherId, onClose, flash }: { teacherId: number; onClose: () => void; flash: (m: string, ok?: boolean) => void }) {
  const [data, setData]         = useState<ProfileData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [classes, setClasses]   = useState<ClassRow[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [activeTab, setTab]     = useState<"overview"|"assignments"|"classes"|"permissions"|"activity">("overview");
  const [showAssign, setShowAssign] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    apiFetch(`/admin/cc/teachers/${teacherId}`)
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [teacherId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (activeTab !== "classes" || classes.length > 0) return;
    setClassesLoading(true);
    apiFetch(`/admin/cc/teachers/${teacherId}/classes?limit=50`)
      .then(r => r.json()).then(d => setClasses(d.items ?? [])).catch(() => {}).finally(() => setClassesLoading(false));
  }, [activeTab, teacherId]);

  async function removeAssignment(assignmentId: number) {
    setRemovingId(assignmentId);
    try {
      const r = await apiFetch(`/admin/cc/teachers/${teacherId}/assignments/${assignmentId}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to remove assignment");
      flash("Assignment removed", true);
      reload();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setRemovingId(null); }
  }

  if (loading && !data) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
        <span className="text-sm font-semibold text-gray-500">Loading profile…</span>
      </div>
    </div>
  );
  if (!data) return null;

  const { profile, performance, assignments, upcomingClasses, permissions, activity } = data;
  const tabs = [
    { key: "overview"    as const, label: "Overview",           icon: TrendingUp  },
    { key: "assignments" as const, label: "Course Assignments", icon: BookOpen    },
    { key: "classes"     as const, label: "Live Classes",       icon: Monitor     },
    { key: "permissions" as const, label: "Permissions",        icon: Shield      },
    { key: "activity"    as const, label: "Activity",           icon: Zap         },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size={10} />
            <div>
              <p className="font-black text-sm" style={{ color: NAVY }}>{profile.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#E0F2FE", color: "#0C4A6E" }}>
                  <GraduationCap className="inline w-2.5 h-2.5 mr-0.5" />Teacher
                </span>
                <StatusBadge isActive={profile.isActive} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>

        {/* Info strip */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 text-xs text-gray-500 flex-shrink-0">
          <span>{profile.email ?? "—"}</span>
          <span>·</span><span>{profile.phone ?? "—"}</span>
          <span>·</span><span>{profile.employeeId ?? "No Employee ID"}</span>
          <span>·</span><span>Joined {fmtDate(profile.joiningDate ?? profile.createdAt)}</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap"
                style={activeTab === t.key ? { borderColor: NAVY, color: NAVY } : { borderColor: "transparent", color: "#9CA3AF" }}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Classes Assigned",  value: performance.classesAssigned,  color: NAVY    },
                  { label: "Courses Assigned",  value: performance.coursesAssigned,  color: "#7C3AED" },
                  { label: "Experience",        value: profile.experienceYears != null ? `${profile.experienceYears} yrs` : "—", color: GREEN  },
                  { label: "Last Active",       value: timeAgo(profile.lastLoginDate), color: "#374151" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 mb-1">{s.label}</p>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">Qualification</p>
                  <p className="font-semibold text-gray-700">{profile.qualification ?? "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 mb-1">Employee ID</p>
                  <p className="font-semibold text-gray-700">{profile.employeeId ?? "—"}</p>
                </div>
              </div>
              {(profile.teachingSubjects?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />Teaching Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.teachingSubjects!.map(s => (
                      <span key={s} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(profile.teachingGrades?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Teaching Grades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.teachingGrades!.map(g => (
                      <span key={g} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">Grade {g}</span>
                    ))}
                  </div>
                </div>
              )}
              {performance.subjects.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />Assigned Course Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {performance.subjects.map(s => (
                      <span key={s} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "assignments" && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => setShowAssign(true)} disabled={!profile.isActive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: NAVY }} title={!profile.isActive ? "Activate teacher to assign courses" : ""}>
                  <UserPlus className="w-3.5 h-3.5" /> Assign Course
                </button>
              </div>
              {assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <BookOpen className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-semibold">No course assignments yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">
                          {a.courseTitle}
                          <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: a.courseType === "ignite" ? "#FFF3E0" : "#E0F2FE", color: a.courseType === "ignite" ? "#B45309" : "#0C4A6E" }}>
                            {a.courseType}
                          </span>
                        </p>
                        <p className="text-[10px] text-gray-400">Grade {a.grade} · {a.subjectName ?? "Whole course"}</p>
                      </div>
                      <button onClick={() => removeAssignment(a.id)} disabled={removingId === a.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 disabled:opacity-40">
                        {removingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "classes" && (
            <div className="space-y-4">
              {upcomingClasses.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Upcoming</p>
                  <div className="space-y-2">
                    {upcomingClasses.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{c.title}</p>
                          <p className="text-[10px] text-gray-400">Grade {c.grade ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClassStatusBadge status={c.status} />
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDateTime(c.scheduledAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">All Classes</p>
                {classesLoading ? (
                  <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
                    <span className="text-sm">Loading classes…</span>
                  </div>
                ) : classes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                    <Monitor className="w-8 h-8 text-gray-200" />
                    <p className="text-sm font-semibold">No classes assigned</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {classes.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{c.title}</p>
                          <p className="text-[10px] text-gray-400">Subject #{c.subjectId ?? "—"} · Grade {c.grade ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ClassStatusBadge status={c.status} />
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDateTime(c.scheduledAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div>
              <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Read-only view — editable in Phase D (Roles &amp; Permissions module).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Module</th>
                      {["View","Create","Edit","Delete"].map(h => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {permissions.map(p => (
                      <tr key={p.module}>
                        <td className="px-3 py-2 font-medium text-gray-700">{p.module}</td>
                        {[p.view, p.create, p.edit, p.del].map((v, i) => (
                          <td key={i} className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                              {v ? "✓" : "×"}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-2">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                  <Zap className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-semibold">No activity yet</p>
                </div>
              ) : activity.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{a.actionLabel ?? a.action}</p>
                    <p className="text-[10px] text-gray-400">{a.targetName} · {a.module}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showAssign && (
        <AssignCourseModal
          teacherId={teacherId}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); reload(); }}
          flash={flash}
        />
      )}
    </div>
  );
}

// ── Assign Course Modal (Program → Course → Subject → Teacher) ───────────────
function AssignCourseModal({ teacherId, onClose, onAssigned, flash }: {
  teacherId: number; onClose: () => void; onAssigned: () => void;
  flash: (m: string, ok?: boolean) => void;
}) {
  const [program, setProgram]   = useState<"ignite"|"mastery">("mastery");
  const [courses, setCourses]   = useState<CourseOption[]>([]);
  const [courseId, setCourseId] = useState<number | "">("");
  const [subjects, setSubjects] = useState<CourseSubjectOption[]>([]);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [wholeCourse, setWholeCourse] = useState(false);
  const [loadingCourses, setLoadingCourses]   = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    setLoadingCourses(true);
    apiFetch("/admin/courses")
      .then(r => r.json())
      .then((d: CourseOption[]) => setCourses(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, []);

  const programCourses = courses.filter(c => c.courseType === program);

  useEffect(() => {
    setCourseId(""); setSubjectId(""); setSubjects([]);
  }, [program]);

  useEffect(() => {
    if (!courseId) { setSubjects([]); setSubjectId(""); return; }
    setLoadingSubjects(true);
    apiFetch(`/admin/course-subjects?courseId=${courseId}`)
      .then(r => r.json())
      .then((d: CourseSubjectOption[]) => setSubjects(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingSubjects(false));
  }, [courseId]);

  async function assign() {
    if (!courseId) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/cc/teachers/${teacherId}/assignments`, {
        method: "POST",
        body: JSON.stringify({ courseId, courseSubjectId: wholeCourse ? null : (subjectId || null) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to assign");
      flash("Course assigned", true);
      onAssigned();
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setSaving(false); }
  }

  const valid = !!courseId && (wholeCourse || subjects.length === 0 || !!subjectId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-black text-sm" style={{ color: NAVY }}>Assign Course</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Program *</label>
            <div className="flex gap-2">
              {(["ignite","mastery"] as const).map(p => (
                <button key={p} onClick={() => setProgram(p)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold capitalize border ${program === p ? "text-white" : "text-gray-600 border-gray-200"}`}
                  style={program === p ? { background: NAVY, borderColor: NAVY } : {}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Course *</label>
            <select value={courseId} onChange={e => setCourseId(e.target.value ? Number(e.target.value) : "")}
              disabled={loadingCourses}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              <option value="">{loadingCourses ? "Loading…" : "Select a course"}</option>
              {programCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title} (Grade {c.grade})</option>
              ))}
            </select>
            {!loadingCourses && programCourses.length === 0 && (
              <p className="text-[10px] text-gray-400 mt-1">No {program} courses found.</p>
            )}
          </div>
          {courseId && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Subject</label>
              <select value={wholeCourse ? "__whole__" : subjectId} disabled={loadingSubjects}
                onChange={e => {
                  if (e.target.value === "__whole__") { setWholeCourse(true); setSubjectId(""); }
                  else { setWholeCourse(false); setSubjectId(e.target.value ? Number(e.target.value) : ""); }
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                <option value="">{loadingSubjects ? "Loading…" : "Select a subject"}</option>
                <option value="__whole__">Whole course (all subjects)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} disabled={saving} className="flex-1 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={assign} disabled={saving || !valid}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Assign</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row Actions Menu ──────────────────────────────────────────────────────────
function ActionsMenu({ teacher, onAction }: {
  teacher: TeacherRow;
  onAction: (a: "view"|"edit"|"toggle-status"|"view-classes"|"toggle-leave") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const actions = [
    { key: "view"          as const, label: "View Profile",  icon: Eye,         color: NAVY    },
    { key: "edit"          as const, label: "Edit Teacher",  icon: Pencil,      color: "#374151" },
    { key: "toggle-status" as const, label: teacher.isActive ? "Deactivate" : "Activate", icon: teacher.isActive ? UserX : UserCheck, color: teacher.isActive ? "#EF4444" : GREEN },
    { key: "view-classes"  as const, label: "View Classes",  icon: Monitor,     color: ORANGE  },
    { key: "toggle-leave"  as const, label: teacher.isOnLeave ? "End Leave" : "Mark On Leave", icon: CalendarDays, color: teacher.isOnLeave ? GREEN : "#DC2626" },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-40">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.key} onClick={() => { setOpen(false); onAction(a.key); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors"
                style={{ color: a.color }}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />{a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Schedule & Availability (Timeline) ────────────────────────────────────────
const TIMELINE_START_HOUR = 9;
const TIMELINE_END_HOUR   = 18;

function statusColor(status: "on_leave" | "teaching" | "available") {
  if (status === "on_leave") return { bg: "#FEE2E2", text: "#991B1B", label: "On Leave" };
  if (status === "teaching") return { bg: "#EDE9FE", text: "#5B21B6", label: "Teaching" };
  return { bg: "#DCFCE7", text: "#166534", label: "Available" };
}

function ScheduleAvailabilityView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [date, setDate]         = useState(() => new Date().toISOString().slice(0, 10));
  const [teachers, setTeachers] = useState<ScheduleTeacher[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  const [layout, setLayout] = useState<"timeline" | "list">("timeline");

  const [finderStart, setFinderStart] = useState("10:00");
  const [finderEnd, setFinderEnd]     = useState("11:00");
  const [finderResults, setFinderResults] = useState<FindAvailableResult[] | null>(null);
  const [finderLoading, setFinderLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    apiFetch(`/admin/cc/teachers/schedule?date=${date}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setTeachers(d.teachers ?? []))
      .catch(e => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  async function runFinder() {
    setFinderLoading(true);
    try {
      const p = new URLSearchParams({ date, startTime: finderStart, endTime: finderEnd });
      const r = await apiFetch(`/admin/cc/teachers/find-available?${p}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to search");
      setFinderResults(d.results ?? []);
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setFinderLoading(false); }
  }

  const totalHours = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
  const hourMarks = Array.from({ length: totalHours }, (_, i) => TIMELINE_START_HOUR + i);

  const subjectOptions = Array.from(new Set(teachers.flatMap(t => t.teachingSubjects))).sort();
  const programOptions = Array.from(new Set(teachers.flatMap(t => t.classes.map(c => c.program)).filter((p): p is string => !!p))).sort();
  const visibleTeachers = teachers
    .filter(t => subjectFilter === "all" || t.teachingSubjects.includes(subjectFilter))
    .filter(t => programFilter === "all" || t.classes.some(c => c.program === programFilter));

  function classInHour(t: ScheduleTeacher, hour: number) {
    return t.classes.find(c => {
      if (!c.startsAt || !c.endsAt) return false;
      const s = new Date(c.startsAt), e = new Date(c.endsAt);
      const sFrac = s.getHours() + s.getMinutes() / 60;
      const eFrac = e.getHours() + e.getMinutes() / 60;
      return sFrac < hour + 1 && eFrac > hour;
    }) ?? null;
  }
  function isClassStartHour(c: ScheduleClass, hour: number) {
    if (!c.startsAt) return false;
    return new Date(c.startsAt).getHours() === hour;
  }
  function fmtTimeRange(startsAt: string | null, endsAt: string | null) {
    if (!startsAt || !endsAt) return "";
    const f = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
    return `${f(new Date(startsAt))} - ${f(new Date(endsAt))}`;
  }

  const teachingNow = teachers.filter(t => t.currentStatus === "teaching");
  const onLeave     = teachers.filter(t => t.currentStatus === "on_leave");
  const nextUp      = teachers.filter(t => t.nextClass).sort((a, b) => new Date(a.nextClass!.startsAt ?? 0).getTime() - new Date(b.nextClass!.startsAt ?? 0).getTime()).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: NAVY }} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-400" />
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-400">
            <option value="all">All Subjects</option>
            {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={programFilter} onChange={e => setProgramFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-400">
            <option value="all">All Programs</option>
            {programOptions.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {[{ key: "timeline" as const, label: "Timeline View" }, { key: "list" as const, label: "List View" }].map(v => (
            <button key={v.key} onClick={() => setLayout(v.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={layout === v.key ? { background: NAVY, color: "white" } : { color: "#6B7280" }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {layout === "timeline" ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-black text-sm" style={{ color: NAVY }}>Daily Timeline — {fmtDate(date)}</h3>
            <div className="flex items-center gap-3 text-[10px] font-semibold flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />Available</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#2563EB" }} />Mastery Class</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#7C3AED" }} />Ignite Class</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />On Leave</span>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /><span className="text-sm">Loading schedule…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-red-500 text-sm">{error}</div>
          ) : visibleTeachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400 text-sm">No active teachers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Hour header */}
                <div className="flex border-b border-gray-100 pl-40">
                  {hourMarks.map(h => (
                    <div key={h} className="flex-1 text-center text-[10px] font-bold text-gray-400 py-2 border-l border-gray-50">
                      {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "AM" : "PM"}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {visibleTeachers.map(t => (
                  <div key={t.id} className="flex items-stretch border-b border-gray-50 hover:bg-gray-50/40">
                    <div className="w-40 flex-shrink-0 flex items-center gap-2 px-2 py-2">
                      <Avatar name={t.name} avatarUrl={t.avatarUrl} size={7} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p>
                        <p className="text-[9px] text-gray-400 truncate">{t.teachingSubjects.join(", ") || "—"}</p>
                      </div>
                    </div>
                    {t.isOnLeave ? (
                      <div className="flex-1 flex items-center justify-center m-1 rounded-md" style={{ background: "#FEE2E2" }} title={t.leaveReason ?? "On leave"}>
                        <span className="text-[10px] font-bold" style={{ color: "#991B1B" }}>On Leave{t.leaveReason ? ` — ${t.leaveReason}` : ""}</span>
                      </div>
                    ) : (
                      hourMarks.map(h => {
                        const c = classInHour(t, h);
                        if (c) {
                          if (!isClassStartHour(c, h)) return null;
                          const s = c.startsAt ? new Date(c.startsAt) : null;
                          const e = c.endsAt ? new Date(c.endsAt) : null;
                          const span = s && e ? Math.max(1, Math.ceil((e.getHours() + e.getMinutes() / 60) - (s.getHours() + s.getMinutes() / 60))) : 1;
                          const isIgnite = c.program === "ignite";
                          return (
                            <div key={h} className="flex items-center justify-center m-1 rounded-md px-1 py-1 text-center overflow-hidden"
                              style={{ flex: span, background: isIgnite ? "#EDE9FE" : "#DBEAFE" }}
                              title={`${c.title} (${c.subjectName ?? "—"})`}>
                              <div>
                                <p className="text-[9px] font-bold truncate" style={{ color: isIgnite ? "#6D28D9" : "#1D4ED8" }}>{c.title}</p>
                                <p className="text-[8px]" style={{ color: isIgnite ? "#7C3AED" : "#2563EB" }}>{fmtTimeRange(c.startsAt, c.endsAt)}</p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={h} className="flex-1 flex items-center justify-center m-1 rounded-md" style={{ background: "#DCFCE7" }}>
                            <span className="text-[9px] font-bold" style={{ color: "#166534" }}>Available</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {["Teacher", "Status", "Subjects", "Current Class", "Next Class"].map(h => (
                    <th key={h} className="px-4 py-3 font-bold text-gray-400 text-[10px] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">Loading…</td></tr>
                ) : error ? (
                  <tr><td colSpan={5} className="py-10 text-center text-red-500">{error}</td></tr>
                ) : visibleTeachers.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-gray-400">No active teachers found.</td></tr>
                ) : visibleTeachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={t.name} avatarUrl={t.avatarUrl} size={7} />
                        <span className="font-semibold text-gray-800">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: statusColor(t.currentStatus).bg, color: statusColor(t.currentStatus).text }}>
                        {statusColor(t.currentStatus).label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.teachingSubjects.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{t.currentClass ? `${t.currentClass.title} (${fmtTimeRange(t.currentClass.startsAt, t.currentClass.endsAt)})` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{t.nextClass ? `${t.nextClass.title} (${fmtTimeRange(t.nextClass.startsAt, t.nextClass.endsAt)})` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Status + Next Classes + Finder panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-xs" style={{ color: NAVY }}>Current Status (Live)</h4>
            <button onClick={load} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {teachingNow.length === 0 && onLeave.length === 0 && <p className="text-xs text-gray-400">No teachers currently teaching or on leave.</p>}
            {teachingNow.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <Avatar name={t.name} avatarUrl={t.avatarUrl} size={6} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{t.name}</p>
                  <p className="text-[10px] text-purple-600 font-semibold">Teaching Now — {t.currentClass?.title}</p>
                </div>
              </div>
            ))}
            {onLeave.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <Avatar name={t.name} avatarUrl={t.avatarUrl} size={6} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{t.name}</p>
                  <p className="text-[10px] text-red-500 font-semibold">On Leave{t.leaveReason ? ` — ${t.leaveReason}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h4 className="font-black text-xs mb-3" style={{ color: NAVY }}>Next Classes</h4>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {nextUp.length === 0 && <p className="text-xs text-gray-400">No upcoming classes scheduled today.</p>}
            {nextUp.map(t => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <Avatar name={t.name} avatarUrl={t.avatarUrl} size={6} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{t.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {t.nextClass?.title} — {t.nextClass ? fmtTimeRange(t.nextClass.startsAt, t.nextClass.endsAt) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h4 className="font-black text-xs mb-3" style={{ color: NAVY }}>Available Teachers Finder</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Start Time</label>
                <input type="time" value={finderStart} onChange={e => setFinderStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">End Time</label>
                <input type="time" value={finderEnd} onChange={e => setFinderEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <button onClick={runFinder} disabled={finderLoading}
              className="w-full px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: NAVY }}>
              {finderLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Find Available Teachers
            </button>
            {finderResults && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                {finderResults.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No teachers found.</p>}
                {finderResults.map(r => (
                  <div key={r.id} className="flex items-center gap-2 p-1.5 rounded-lg border" style={{ borderColor: r.available ? "#BBF7D0" : "#FEE2E2", background: r.available ? "#F0FDF4" : "#FEF2F2" }}>
                    <Avatar name={r.name} avatarUrl={r.avatarUrl} size={6} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-gray-800 truncate">{r.name}{r.isDefault && <span className="ml-1 text-[9px] font-bold text-blue-500">(Default)</span>}</p>
                      <p className={`text-[10px] font-semibold truncate ${r.available ? "text-green-600" : "text-red-500"}`}>{r.available ? "Available" : r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Teacher Management Component ────────────────────────────────────────
export function TeacherAnalyticsTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [data, setData]             = useState<TeacherListResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [sort, setSort]             = useState("name");
  const [order, setOrder]           = useState<"asc"|"desc">("asc");
  const [page, setPage]             = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [profileId, setProfileId]     = useState<number | null>(null);
  const [editTeacher, setEditTeacher] = useState<TeacherRow | null>(null);
  const [toggleTarget, setToggleTarget] = useState<TeacherRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toggleConfirmInfo, setToggleConfirmInfo] = useState<{ activeCourseAssignments: number; upcomingClasses: number } | null>(null);
  const [view, setView] = useState<"all" | "available" | "engaged" | "onleave" | "inactive" | "schedule">("all");

  const debouncedSearch = useDebounce(search, 300);

  const effectiveStatus = view === "inactive" ? "inactive" : (view === "available" || view === "engaged" || view === "onleave") ? "active" : statusFilter;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ search: debouncedSearch, status: effectiveStatus, sort, order, page: String(page), limit: "15" });
      const r = await apiFetch(`/admin/cc/teachers?${p}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [debouncedSearch, effectiveStatus, sort, order, page]);

  useEffect(() => { setPage(1); }, [debouncedSearch, effectiveStatus]);
  useEffect(() => { load(); }, [load]);

  const displayItems = data
    ? view === "available" ? data.items.filter(t => !t.isOnLeave)
    : view === "engaged"   ? data.items.filter(t => t.isOnLeave)
    : view === "onleave"   ? data.items.filter(t => t.isOnLeave)
    : data.items
    : [];

  function updateRow(id: number, changes: Partial<TeacherRow>) {
    setData(d => d ? { ...d, items: d.items.map(t => t.id === id ? { ...t, ...changes } : t) } : d);
  }

  async function doToggle(force?: boolean) {
    if (!toggleTarget) return;
    setActionLoading(true);
    try {
      const r = await apiFetch(`/admin/cc/teachers/${toggleTarget.id}`, {
        method: "PATCH", body: JSON.stringify({ isActive: !toggleTarget.isActive, force }),
      });
      const d = await r.json();
      if (r.status === 409 && d.requiresConfirmation) {
        setToggleConfirmInfo({ activeCourseAssignments: d.activeCourseAssignments ?? 0, upcomingClasses: d.upcomingClasses ?? 0 });
        return;
      }
      if (!r.ok) throw new Error(d.error ?? "Failed");
      updateRow(toggleTarget.id, { isActive: !toggleTarget.isActive });
      flash(`${toggleTarget.name} ${toggleTarget.isActive ? "deactivated" : "activated"}`, true);
      setToggleTarget(null);
      setToggleConfirmInfo(null);
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
    finally { setActionLoading(false); }
  }

  async function toggleLeave(t: TeacherRow) {
    const nextLeave = !t.isOnLeave;
    try {
      const r = await apiFetch(`/admin/cc/teachers/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isOnLeave: nextLeave, leaveReason: nextLeave ? "Marked on leave by admin" : undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      updateRow(t.id, { isOnLeave: nextLeave, leaveReason: d.teacher.leaveReason, leaveUntil: d.teacher.leaveUntil });
      flash(`${t.name} marked ${nextLeave ? "on leave" : "as returned"}`, true);
    } catch (e) { flash(e instanceof Error ? e.message : "Failed", false); }
  }

  function toggleSort(col: string) {
    if (sort === col) setOrder(o => o === "asc" ? "desc" : "asc");
    else { setSort(col); setOrder("asc"); }
  }

  const SortIcon = ({ col }: { col: string }) => (
    sort === col
      ? (order === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />
  );

  const kpis = data?.kpis;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Teacher Management</h2>
          <p className="text-xs text-gray-400 mt-0.5">Operational directory for all Braintam teachers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
            style={{ background: NAVY }}>
            <UserPlus className="w-3.5 h-3.5" /> Add Teacher
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total",           value: kpis?.totalTeachers ?? "—",   icon: <GraduationCap className="w-4 h-4" />, color: NAVY      },
          { label: "Active",          value: kpis?.activeTeachers ?? "—",  icon: <UserCheck className="w-4 h-4" />,    color: GREEN     },
          { label: "Available Now",   value: kpis?.availableNow ?? "—",    icon: <Check className="w-4 h-4" />,        color: "#059669" },
          { label: "Teaching Now",    value: kpis?.teachingNow ?? "—",     icon: <Monitor className="w-4 h-4" />,      color: "#7C3AED" },
          { label: "On Leave Today",  value: kpis?.onLeaveToday ?? "—",    icon: <CalendarDays className="w-4 h-4" />, color: "#DC2626" },
          { label: "Inactive",        value: kpis?.inactiveTeachers ?? "—",icon: <UserX className="w-4 h-4" />,        color: "#EF4444" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
            <div className="flex justify-center mb-1" style={{ color: k.color }}>{k.icon}</div>
            <div className="text-xl font-black" style={{ color: k.color }}>{loading ? "—" : k.value}</div>
            <div className="text-[10px] text-gray-400 font-medium mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1.5 overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        {[
          { key: "all" as const,       label: "All Teachers" },
          { key: "available" as const, label: "Available Teachers" },
          { key: "engaged" as const,   label: "Engaged Teachers" },
          { key: "onleave" as const,   label: "On Leave" },
          { key: "inactive" as const,  label: "Inactive Teachers" },
          { key: "schedule" as const,  label: "Schedule & Availability" },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
            style={view === t.key ? { background: NAVY, color: "white" } : { background: "transparent", color: "#6B7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {view === "schedule" ? (
        <ScheduleAvailabilityView flash={flash} />
      ) : (
      <>
      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
            style={showFilters ? { background: `${NAVY}10`, borderColor: NAVY, color: NAVY } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
            <Filter className="w-3.5 h-3.5" /> Filters
            {statusFilter !== "all" && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
          </button>
        </div>
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1">
            <select value={statusFilter} onChange={e => setStatus(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {statusFilter !== "all" && (
              <button onClick={() => setStatus("all")}
                className="text-xs font-semibold text-orange-500 hover:underline px-2">Clear</button>
            )}
          </div>
        )}
        <div className="flex gap-1.5 pt-1">
          {[{ key: "all", label: "All" }, { key: "active", label: "Active" }, { key: "inactive", label: "Inactive" }].map(t => (
            <button key={t.key} onClick={() => setStatus(t.key)}
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-colors"
              style={statusFilter === t.key ? { background: NAVY, color: "white" } : { background: "#F3F4F6", color: "#6B7280" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
            <span className="text-sm">Loading teachers…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <XCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <button onClick={load} className="px-4 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>Retry</button>
          </div>
        ) : !data || displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <GraduationCap className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-semibold">No teachers found</p>
            <p className="text-xs text-gray-300">{search || statusFilter !== "all" ? "Try adjusting your filters" : "No teacher accounts yet"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    { label: "Teacher",      col: "name",         sortable: true  },
                    { label: "Employee ID",  col: "employeeId",   sortable: false },
                    { label: "Courses",      col: "coursesCount", sortable: true  },
                    { label: "Classes",      col: "classesCount", sortable: true  },
                    { label: "Status",       col: "status",       sortable: false },
                    { label: "Joined",       col: "createdAt",    sortable: true  },
                    { label: "Last Active",  col: "lastActive",   sortable: true  },
                    { label: "",             col: "actions",      sortable: false },
                  ].map(h => (
                    <th key={h.col}
                      className={`text-left px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${h.sortable ? "cursor-pointer hover:text-gray-600 select-none" : ""}`}
                      onClick={() => h.sortable && toggleSort(h.col)}>
                      <span className="flex items-center gap-1">{h.label}{h.sortable && <SortIcon col={h.col} />}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayItems.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={t.name} avatarUrl={t.avatarUrl} />
                        <div>
                          <p className="font-semibold text-gray-800">{t.name}</p>
                          <p className="text-[10px] text-gray-400">{t.email ?? t.phone ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{t.employeeId ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-700">{t.coursesCount}</span>
                      <span className="text-gray-400 ml-1">courses</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-700">{t.classesCount}</span>
                      <span className="text-gray-400 ml-1">classes</span>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1.5">
                      <StatusBadge isActive={t.isActive} />
                      {t.isOnLeave && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">On Leave</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{timeAgo(t.lastLoginDate)}</td>
                    <td className="px-4 py-3">
                      <ActionsMenu teacher={t} onAction={action => {
                        if (action === "view")          setProfileId(t.id);
                        else if (action === "edit")     setEditTeacher(t);
                        else if (action === "toggle-status") setToggleTarget(t);
                        else if (action === "view-classes")  setProfileId(t.id);
                        else if (action === "toggle-leave") toggleLeave(t);
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400">
            Showing {((data.page - 1) * data.pageSize) + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-3.5 h-3.5 text-gray-500" /></button>
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const pg = data.totalPages <= 5 ? i + 1 : Math.max(1, Math.min(data.page - 2, data.totalPages - 4)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${pg === data.page ? "text-white" : "text-gray-500 hover:bg-gray-50 border border-gray-200"}`}
                  style={pg === data.page ? { background: NAVY } : {}}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={data.page >= data.totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-3.5 h-3.5 text-gray-500" /></button>
          </div>
        </div>
      )}
      </>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddTeacherModal
          onClose={() => setShowAddModal(false)}
          onCreated={t => { load(); }}
          flash={flash}
        />
      )}
      {profileId    && <ProfileModal teacherId={profileId} onClose={() => setProfileId(null)} flash={flash} />}
      {editTeacher  && <EditModal teacher={editTeacher} onClose={() => setEditTeacher(null)} onSaved={u => updateRow(editTeacher.id, u)} flash={flash} />}
      {toggleTarget && !toggleConfirmInfo && (
        <ConfirmDialog
          title={toggleTarget.isActive ? "Deactivate Teacher" : "Activate Teacher"}
          message={toggleTarget.isActive ? `${toggleTarget.name} will no longer be able to log in.` : `${toggleTarget.name} will regain access.`}
          confirmLabel={toggleTarget.isActive ? "Deactivate" : "Activate"}
          danger={toggleTarget.isActive}
          onConfirm={() => doToggle()}
          onClose={() => setToggleTarget(null)}
          loading={actionLoading}
        />
      )}
      {toggleTarget && toggleConfirmInfo && (
        <ConfirmDialog
          title="Confirm Deactivation"
          message={`${toggleTarget.name} has ${toggleConfirmInfo.activeCourseAssignments} active course assignment(s) and ${toggleConfirmInfo.upcomingClasses} upcoming class(es). Deactivating will keep these records but the teacher will lose access. Continue?`}
          confirmLabel="Deactivate Anyway"
          danger
          onConfirm={() => doToggle(true)}
          onClose={() => { setToggleTarget(null); setToggleConfirmInfo(null); }}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
