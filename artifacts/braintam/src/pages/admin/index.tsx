import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import {
  Users, BookOpen, GraduationCap, UserCheck, Plus, Trash2, Shield,
  ChevronRight, BarChart3, Link as LinkIcon, Bell, Image, Edit2, X,
  TrendingUp, Award, Calendar, Activity, Video, Clock, ExternalLink,
  Eye, EyeOff, Copy, RefreshCw, Search, Filter, Download, Upload,
  CheckSquare, Square, AlertTriangle, UserX, UserCheck2, Key, FileText,
  DollarSign, LayoutDashboard, Lock, ChevronDown, ChevronUp, LogOut,
  MoreVertical, RotateCcw, CreditCard, Layers, Cpu, GraduationCap as GradCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CourseManagementTab } from "./courses-tab";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

type Role = "admin" | "teacher" | "student";
type Tab =
  | "analytics"
  | "overview"
  | "courses"
  | "users"
  | "assignments"
  | "enrollments"
  | "liveclasses"
  | "announcements"
  | "banners"
  | "fees"
  | "audit"
  | "payments"
  | "crm"
  | "certificates"
  | "settings";

type UserSubTab = "active" | "deactivated" | "all";
type SortField = "name" | "role" | "grade" | "school" | "id";
type SortDir = "asc" | "desc";

interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  grade: number;
  school: string | null;
  isActive: boolean;
  createdAt?: string;
}
interface Course { id: number; title: string; subjectName: string; grade: number; teacher: string | null; }
interface TeacherAssignment { id: number; teacherId: number; teacherName: string; courseId: number; courseTitle: string; assignedAt: string; }
interface Enrollment { id: number; studentId: number; studentName: string; courseId: number; courseTitle: string; enrolledAt: string; }
interface Stats { totalUsers: number; totalStudents: number; totalTeachers: number; totalCourses: number; totalEnrollments: number; totalTeacherAssignments: number; }
interface Analytics {
  totals: { users: number; students: number; teachers: number; courses: number; enrollments: number };
  submissions: { homework: number; assignments: number; tests: number; gradedHomework: number };
  liveClasses: { upcoming: number; live: number };
  topStudents: { id: number; name: string; points: number; grade: number; school: string | null }[];
  recentEnrollments: { studentName: string; courseTitle: string; enrolledAt: string }[];
}
interface Announcement { id: number; title: string; body: string; grade: number | null; targetRole: string; isActive: boolean; createdAt: string; }
interface Banner { id: number; title: string; imageUrl: string; link: string | null; isActive: boolean; displayOrder: number; }
interface LiveClassItem { id: number; title: string; subjectId: number; subjectName: string; grade: number; teacher: string; teacherId: number | null; scheduledAt: string; duration: number; status: string; joinUrl: string | null; studentsJoined: number; courseId: number | null; }
interface AuditLog { id: number; actorId: number; actorName: string; action: string; targetType: string; targetId: number; targetName: string; metadata: string | null; createdAt: string; }

interface ConfirmDialog {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
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

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  teacher: "bg-blue-100 text-blue-700 border-blue-200",
  student: "bg-green-100 text-green-700 border-green-200",
};

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 3) return { score, label: "Fair", color: "#F59E0B" };
  if (score === 4) return { score, label: "Good", color: "#3B82F6" };
  return { score, label: "Strong", color: "#22C55E" };
}

function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────
function ConfirmModal({ dialog, onClose }: { dialog: ConfirmDialog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${dialog.danger ? "bg-red-100" : "bg-orange-100"}`}>
            <AlertTriangle className={`w-5 h-5 ${dialog.danger ? "text-red-500" : "text-orange-500"}`} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>{dialog.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{dialog.message}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => { dialog.onConfirm(); onClose(); }}
            className={`text-white flex-1 ${dialog.danger ? "bg-red-500 hover:bg-red-600" : ""}`}
            style={dialog.danger ? {} : { background: ORANGE }}>
            {dialog.confirmLabel ?? "Confirm"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Modal ───────────────────────────────────────────────────────────
function ProfileModal({ user, onClose, onDeactivate, onReactivate, onResetPassword, onEnroll }: {
  user: User;
  onClose: () => void;
  onDeactivate: (id: number) => void;
  onReactivate: (id: number) => void;
  onResetPassword: (user: User) => void;
  onEnroll: (user: User) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{ background: NAVY }}>{user.name[0]?.toUpperCase()}</div>
            <div>
              <div className="font-black text-base" style={{ color: NAVY }}>{user.name}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[user.role] ?? ""}`}>{user.role}</span>
              {!user.isActive && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">Inactive</span>}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Email", value: user.email ?? "—" },
            { label: "Phone", value: user.phone ?? "—" },
            { label: "Grade", value: user.grade > 0 ? `Grade ${user.grade}` : "—" },
            { label: "School", value: user.school ?? "—" },
            { label: "User ID", value: `#${user.id}` },
            { label: "Joined", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—" },
          ].map(f => (
            <div key={f.label} className="bg-gray-50 rounded-xl p-2.5">
              <div className="text-gray-400 font-medium">{f.label}</div>
              <div className="font-semibold text-gray-700 mt-0.5 truncate">{f.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button size="sm" onClick={() => { onResetPassword(user); onClose(); }} variant="outline" className="gap-1.5 text-xs">
            <Key className="w-3.5 h-3.5" /> Reset Password
          </Button>
          {user.role === "student" && (
            <Button size="sm" onClick={() => { onEnroll(user); onClose(); }} variant="outline" className="gap-1.5 text-xs">
              <GradCap className="w-3.5 h-3.5" /> Enroll Course
            </Button>
          )}
          {user.isActive ? (
            <Button size="sm" onClick={() => { onDeactivate(user.id); onClose(); }}
              className="gap-1.5 text-xs text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100" variant="outline">
              <UserX className="w-3.5 h-3.5" /> Deactivate
            </Button>
          ) : (
            <Button size="sm" onClick={() => { onReactivate(user.id); onClose(); }}
              className="gap-1.5 text-xs text-green-600 border-green-200 bg-green-50 hover:bg-green-100" variant="outline">
              <UserCheck2 className="w-3.5 h-3.5" /> Reactivate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Password Reset Modal ─────────────────────────────────────────────────────
function PasswordResetModal({ user, onClose, flash }: {
  user: User;
  onClose: () => void;
  flash: (msg: string, ok?: boolean) => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = passwordStrength(pw);
  const match = pw === confirm;

  async function doReset() {
    if (!pw || !match) return;
    setBusy(true);
    const r = await apiFetch(`/admin/users/${user.id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (r.ok) { flash(`Password reset for ${user.name}!`); onClose(); }
    else { const d = await r.json(); flash(d.error ?? "Failed", false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Reset Password</h3>
            <p className="text-xs text-gray-400 mt-0.5">For: <span className="font-semibold">{user.name}</span></p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="New password *"
              value={pw}
              onChange={e => setPw(e.target.value)}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button type="button" onClick={() => setShowPw(p => !p)} className="text-gray-400 hover:text-gray-600 p-1">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {pw && (
                <button type="button" onClick={() => { navigator.clipboard.writeText(pw); flash("Copied!"); }} className="text-gray-400 hover:text-gray-600 p-1">
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {pw && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Strength</span>
                <span className="font-semibold" style={{ color: strength.color }}>{strength.label}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full transition-all" style={{ background: strength.color, width: `${(strength.score / 5) * 100}%` }} />
              </div>
            </div>
          )}

          <Input
            type={showPw ? "text" : "password"}
            placeholder="Confirm password *"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={confirm && !match ? "border-red-300 focus:ring-red-400" : ""}
          />
          {confirm && !match && <p className="text-xs text-red-500">Passwords do not match</p>}

          <button
            type="button"
            onClick={() => { const p = generatePassword(); setPw(p); setConfirm(p); }}
            className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-700 font-medium">
            <RefreshCw className="w-3.5 h-3.5" /> Auto-generate strong password
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={doReset} disabled={busy || !pw || !match || pw.length < 6}
            className="text-white flex-1" style={{ background: ORANGE }}>
            {busy ? "Resetting…" : "Reset Password"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[1, 2, 3, 4, 5].map(i => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-full bg-gray-100 animate-pulse" style={{ width: `${[60, 80, 40, 30, 20][i - 1]}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Placeholder Tab ──────────────────────────────────────────────────────────
function PlaceholderTab({ icon: Icon, title, description, features }: {
  icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: `${NAVY}15` }}>
        <Icon className="w-8 h-8" style={{ color: NAVY }} />
      </div>
      <div className="text-center">
        <h3 className="font-black text-base" style={{ color: NAVY }}>{title}</h3>
        <p className="text-sm text-gray-400 mt-1 max-w-sm">{description}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 max-w-sm w-full">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Coming Features</p>
        <ul className="space-y-2">
          {features.map(f => (
            <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ORANGE }} />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <span className="text-xs px-3 py-1 rounded-full font-semibold bg-orange-100 text-orange-600">Coming Soon</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { student, role, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("analytics");

  // Data
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [liveClassItems, setLiveClassItems] = useState<LiveClassItem[]>([]);
  const [subjectsList, setSubjectsList] = useState<{ id: number; name: string }[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // UI state
  const [userSubTab, setUserSubTab] = useState<UserSubTab>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modals
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // Forms
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showEnrollStudent, setShowEnrollStudent] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showLcForm, setShowLcForm] = useState(false);
  const [editingLc, setEditingLc] = useState<LiveClassItem | null>(null);

  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "student" as Role, grade: "6", school: "" });
  const [showNewPw, setShowNewPw] = useState(false);
  const [assignForm, setAssignForm] = useState({ teacherId: "", courseId: "" });
  const [enrollForm, setEnrollForm] = useState({ studentId: "", courseId: "" });
  const [annForm, setAnnForm] = useState({ title: "", body: "", grade: "", targetRole: "all" });
  const [bannerForm, setBannerForm] = useState({ title: "", imageUrl: "", link: "", displayOrder: "0" });
  const [lcForm, setLcForm] = useState({ title: "", subjectId: "", grade: "", teacherId: "", teacher: "", scheduledAt: "", duration: "60", joinUrl: "" });

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const teachers = useMemo(() => users.filter(u => u.role === "teacher"), [users]);
  const students = useMemo(() => users.filter(u => u.role === "student"), [users]);

  useEffect(() => { if (!isLoading && role === "admin") loadAll(); }, [isLoading, role]);

  async function loadAll() {
    setDataLoading(true);
    const [s, u, c, a, e, anns, bans, ana, lcs, subjs, audit] = await Promise.all([
      apiFetch("/admin/stats").then(r => r.ok ? r.json() : null),
      apiFetch("/admin/users").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/courses").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/teacher-courses").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/enrollments").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/announcements").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/banners").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/analytics").then(r => r.ok ? r.json() : null),
      apiFetch("/admin/live-classes").then(r => r.ok ? r.json() : []),
      apiFetch("/subjects").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/audit-logs").then(r => r.ok ? r.json() : []),
    ]);
    setStats(s); setUsers(u); setCourses(c); setAssignments(a); setEnrollments(e);
    setAnnouncements(anns); setBanners(bans); setAnalytics(ana); setLiveClassItems(lcs);
    setSubjectsList(subjs); setAuditLogs(audit);
    setDataLoading(false);
  }

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  function confirm(dialog: ConfirmDialog) { setConfirmDialog(dialog); }

  // ── Filtered + Sorted Users ─────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let list = users;

    if (userSubTab === "active") list = list.filter(u => u.isActive);
    else if (userSubTab === "deactivated") list = list.filter(u => !u.isActive);

    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (gradeFilter !== "all") list = list.filter(u => String(u.grade) === gradeFilter);

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.phone ?? "").includes(q) ||
        String(u.id).includes(q) ||
        (u.school ?? "").toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let va: string | number = a[sortField] ?? "";
      let vb: string | number = b[sortField] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [users, userSubTab, roleFilter, gradeFilter, debouncedSearch, sortField, sortDir]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />;
  }

  // Bulk helpers
  const allPageSelected = pagedUsers.length > 0 && pagedUsers.every(u => selectedIds.has(u.id));
  function toggleSelectAll() {
    const newSet = new Set(selectedIds);
    if (allPageSelected) pagedUsers.forEach(u => newSet.delete(u.id));
    else pagedUsers.forEach(u => newSet.add(u.id));
    setSelectedIds(newSet);
  }
  function toggleSelect(id: number) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F5F7FF" }}>
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
    </div>
  );
  if (!student) return <Redirect to="/sign-in" />;
  if (role !== "admin") return <Redirect to="/dashboard" />;

  // ── Actions ──────────────────────────────────────────────────────────────
  async function createUser() {
    if (newUser.password !== newUser.confirmPassword) { flash("Passwords do not match", false); return; }
    setBusy(true);
    const { confirmPassword: _, ...payload } = newUser;
    const r = await apiFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify({ ...payload, grade: Number(newUser.grade) }),
    });
    if (r.ok) {
      flash("User created!");
      setShowCreateUser(false);
      setNewUser({ name: "", email: "", phone: "", password: "", confirmPassword: "", role: "student", grade: "6", school: "" });
      loadAll();
    } else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function deactivateUser(id: number) {
    await apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) });
    flash("User deactivated"); loadAll();
  }

  async function reactivateUser(id: number) {
    await apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: true }) });
    flash("User reactivated"); loadAll();
  }

  async function permanentDeleteUser(id: number) {
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    flash("User permanently deleted"); loadAll();
  }

  async function bulkDeactivate() {
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => apiFetch(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: false }) })));
    flash(`${ids.length} users deactivated`); setSelectedIds(new Set()); loadAll();
  }

  function exportUsersCSV() {
    exportCSV("braintam_users.csv",
      ["ID", "Name", "Email", "Phone", "Role", "Grade", "School", "Active"],
      filteredUsers.map(u => [u.id, u.name, u.email, u.phone, u.role, u.grade, u.school, u.isActive ? "Yes" : "No"])
    );
  }

  function exportEnrollmentsCSV() {
    exportCSV("braintam_enrollments.csv",
      ["ID", "Student", "Course", "Enrolled At"],
      enrollments.map(e => [e.id, e.studentName, e.courseTitle, e.enrolledAt])
    );
  }

  async function assignTeacher() {
    setBusy(true);
    const r = await apiFetch("/admin/teacher-courses", {
      method: "POST",
      body: JSON.stringify({ teacherId: Number(assignForm.teacherId), courseId: Number(assignForm.courseId) }),
    });
    if (r.ok) { flash("Teacher assigned!"); setShowAssignTeacher(false); setAssignForm({ teacherId: "", courseId: "" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function removeAssignment(id: number) { await apiFetch(`/admin/teacher-courses/${id}`, { method: "DELETE" }); loadAll(); }

  async function enrollStudent() {
    setBusy(true);
    const r = await apiFetch("/admin/enrollments", {
      method: "POST",
      body: JSON.stringify({ studentId: Number(enrollForm.studentId), courseId: Number(enrollForm.courseId) }),
    });
    if (r.ok) { flash("Student enrolled!"); setShowEnrollStudent(false); setEnrollForm({ studentId: "", courseId: "" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function removeEnrollment(id: number) { await apiFetch(`/admin/enrollments/${id}`, { method: "DELETE" }); loadAll(); }

  async function createAnnouncement() {
    setBusy(true);
    const r = await apiFetch("/admin/announcements", {
      method: "POST",
      body: JSON.stringify({ title: annForm.title, body: annForm.body, grade: annForm.grade ? Number(annForm.grade) : null, targetRole: annForm.targetRole }),
    });
    if (r.ok) { flash("Announcement published!"); setShowAnnForm(false); setAnnForm({ title: "", body: "", grade: "", targetRole: "all" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function deleteAnnouncement(id: number) { await apiFetch(`/admin/announcements/${id}`, { method: "DELETE" }); loadAll(); }
  async function toggleAnnouncement(ann: Announcement) { await apiFetch(`/admin/announcements/${ann.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !ann.isActive }) }); loadAll(); }

  async function createBanner() {
    setBusy(true);
    const r = await apiFetch("/admin/banners", {
      method: "POST",
      body: JSON.stringify({ title: bannerForm.title, imageUrl: bannerForm.imageUrl, link: bannerForm.link || null, displayOrder: Number(bannerForm.displayOrder) }),
    });
    if (r.ok) { flash("Banner created!"); setShowBannerForm(false); setBannerForm({ title: "", imageUrl: "", link: "", displayOrder: "0" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function deleteBanner(id: number) { await apiFetch(`/admin/banners/${id}`, { method: "DELETE" }); loadAll(); }
  async function toggleBanner(banner: Banner) { await apiFetch(`/admin/banners/${banner.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !banner.isActive }) }); loadAll(); }

  async function createLiveClass() {
    setBusy(true);
    const hasTeacher = lcForm.teacherId && lcForm.teacherId !== "none";
    const teacherName = hasTeacher
      ? (teachers.find(t => String(t.id) === lcForm.teacherId)?.name ?? lcForm.teacher)
      : lcForm.teacher;
    const r = await apiFetch("/admin/live-classes", {
      method: "POST",
      body: JSON.stringify({
        title: lcForm.title, subjectId: Number(lcForm.subjectId), grade: Number(lcForm.grade),
        teacherId: hasTeacher ? Number(lcForm.teacherId) : null, teacher: teacherName,
        scheduledAt: lcForm.scheduledAt, duration: Number(lcForm.duration), joinUrl: lcForm.joinUrl || null,
      }),
    });
    if (r.ok) {
      flash("Live class scheduled!");
      setShowLcForm(false);
      setLcForm({ title: "", subjectId: "", grade: "", teacherId: "", teacher: "", scheduledAt: "", duration: "60", joinUrl: "" });
      loadAll();
    } else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function updateLiveClassStatus(id: number, status: string) {
    await apiFetch(`/admin/live-classes/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); loadAll();
  }

  async function updateLiveClassJoinUrl(id: number, joinUrl: string) {
    const r = await apiFetch(`/admin/live-classes/${id}`, { method: "PATCH", body: JSON.stringify({ joinUrl }) });
    if (r.ok) { flash("Join link updated!"); setEditingLc(null); loadAll(); }
    else flash("Failed to update link", false);
  }

  async function deleteLiveClass(id: number) { await apiFetch(`/admin/live-classes/${id}`, { method: "DELETE" }); loadAll(); }

  const TABS: { id: Tab; label: string; icon: React.ElementType; placeholder?: boolean }[] = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "overview", label: "Overview", icon: Activity },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "users", label: "Users", icon: Users },
    { id: "liveclasses", label: "Live Classes", icon: Video },
    { id: "assignments", label: "Teachers", icon: LinkIcon },
    { id: "enrollments", label: "Enrollments", icon: UserCheck },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "banners", label: "Banners", icon: Image },
    { id: "fees", label: "Fees", icon: DollarSign, placeholder: true },
    { id: "audit", label: "Audit Logs", icon: FileText },
    { id: "payments", label: "Payments", icon: CreditCard, placeholder: true },
    { id: "certificates", label: "Certificates", icon: Award, placeholder: true },
    { id: "settings", label: "Settings", icon: Lock },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {/* Confirm Dialog */}
      {confirmDialog && <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />}
      {/* Profile Modal */}
      {profileUser && (
        <ProfileModal
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onDeactivate={id => confirm({ title: "Deactivate User", message: `Deactivate ${profileUser.name}? They will lose access.`, confirmLabel: "Deactivate", danger: false, onConfirm: () => deactivateUser(id) })}
          onReactivate={id => reactivateUser(id)}
          onResetPassword={u => setResetPasswordUser(u)}
          onEnroll={u => { setEnrollForm(p => ({ ...p, studentId: String(u.id) })); setTab("enrollments"); setShowEnrollStudent(true); }}
        />
      )}
      {/* Password Reset Modal */}
      {resetPasswordUser && <PasswordResetModal user={resetPasswordUser} onClose={() => setResetPasswordUser(null)} flash={flash} />}

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-white" />
          <span className="font-black text-white text-lg">Admin Panel</span>
          <span className="text-white/40 text-sm hidden md:inline">— Braintam ERP</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="text-white/60 hover:text-white transition-colors p-1" title="Refresh">
            <RotateCcw className={`w-4 h-4 ${dataLoading ? "animate-spin" : ""}`} />
          </button>
          <span className="text-white/70 text-sm hidden sm:inline">{student.name}</span>
          <button
            onClick={() => setTab("settings")}
            className="text-white/60 hover:text-white transition-colors p-1"
            title="Settings"
          >
            <Lock className="w-4 h-4" />
          </button>
          <a href="/" className="text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">← Site</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-4 pb-0 overflow-x-auto scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-xl text-xs font-semibold transition-all whitespace-nowrap ${isActive ? "text-white" : "text-gray-500 hover:text-gray-700"}`}
              style={{ background: isActive ? ORANGE : "rgba(255,255,255,0.6)" }}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.placeholder && <span className="text-[9px] px-1 py-0.5 rounded bg-white/30 text-inherit font-bold ml-0.5">BETA</span>}
            </button>
          );
        })}
      </div>

      <div className="p-5 space-y-5">
        {/* Toast */}
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Analytics ───────────────────────────────────────────────── */}
        {tab === "analytics" && analytics && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total Users", value: analytics.totals.users, color: NAVY },
                { label: "Students", value: analytics.totals.students, color: "#22C55E" },
                { label: "Teachers", value: analytics.totals.teachers, color: "#3B82F6" },
                { label: "Courses", value: analytics.totals.courses, color: ORANGE },
                { label: "Enrollments", value: analytics.totals.enrollments, color: "#8B5CF6" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100 text-center">
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: NAVY }}>
                  <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} /> Submissions
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Homework Submitted", value: analytics.submissions.homework, color: "#3B82F6" },
                    { label: "Assignments Submitted", value: analytics.submissions.assignments, color: "#8B5CF6" },
                    { label: "Tests Taken", value: analytics.submissions.tests, color: ORANGE },
                    { label: "Homework Graded", value: analytics.submissions.gradedHomework, color: "#22C55E" },
                  ].map((s, _, arr) => {
                    const maxVal = Math.max(...arr.map(x => x.value), 1);
                    return (
                      <div key={s.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 font-medium">{s.label}</span>
                          <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full transition-all" style={{ background: s.color, width: `${Math.min(100, (s.value / maxVal) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-xl font-black text-green-500">{analytics.liveClasses.upcoming}</div>
                    <div className="text-xs text-gray-400">Upcoming Classes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-red-500">{analytics.liveClasses.live}</div>
                    <div className="text-xs text-gray-400">Live Now</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: NAVY }}>
                    <Award className="w-4 h-4" style={{ color: ORANGE }} /> Top Students
                  </h3>
                  <div className="space-y-2">
                    {analytics.topStudents.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#6B7280" : i === 2 ? "#92400E" : NAVY }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: NAVY }}>{s.name}</div>
                          <div className="text-xs text-gray-400">Grade {s.grade} · {s.school ?? "—"}</div>
                        </div>
                        <span className="text-xs font-bold" style={{ color: ORANGE }}>{s.points}pts</span>
                      </div>
                    ))}
                    {analytics.topStudents.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No students yet</p>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: NAVY }}>
                    <Calendar className="w-4 h-4" style={{ color: ORANGE }} /> Recent Enrollments
                  </h3>
                  <div className="space-y-1.5">
                    {analytics.recentEnrollments.slice(0, 5).map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">{e.studentName}</span>
                        <span className="text-gray-400 truncate ml-2">{e.courseTitle}</span>
                      </div>
                    ))}
                    {analytics.recentEnrollments.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No enrollments yet</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Courses CMS ──────────────────────────────────────────────── */}
        {tab === "courses" && (
          <CourseManagementTab flash={flash} />
        )}

        {/* ── Overview ─────────────────────────────────────────────────── */}
        {tab === "overview" && stats && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Total Users", value: stats.totalUsers, color: NAVY },
                { label: "Students", value: stats.totalStudents, color: "#22C55E" },
                { label: "Teachers", value: stats.totalTeachers, color: "#3B82F6" },
                { label: "Courses", value: stats.totalCourses, color: ORANGE },
                { label: "Enrollments", value: stats.totalEnrollments, color: "#8B5CF6" },
                { label: "Assignments", value: stats.totalTeacherAssignments, color: "#F59E0B" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100 text-center">
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-3" style={{ color: NAVY }}>Recent Users</h3>
                <div className="space-y-2">
                  {users.slice(0, 6).map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: NAVY }}>{u.name[0]}</div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: NAVY }}>{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email ?? u.phone ?? "—"}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-3" style={{ color: NAVY }}>Courses</h3>
                <div className="space-y-2">
                  {courses.slice(0, 6).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>{c.title}</div>
                        <div className="text-xs text-gray-400">{c.subjectName} · Grade {c.grade}</div>
                      </div>
                      <span className="text-xs text-gray-500">{c.teacher ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Users ────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* Sub-tabs: Active / Deactivated / All */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1">
                {(["active", "deactivated", "all"] as UserSubTab[]).map(st => (
                  <button key={st} onClick={() => { setUserSubTab(st); setPage(1); setSelectedIds(new Set()); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${userSubTab === st ? "text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"}`}
                    style={userSubTab === st ? { background: NAVY } : {}}>
                    {st === "active" ? `Active (${users.filter(u => u.isActive).length})` : st === "deactivated" ? `Deactivated (${users.filter(u => !u.isActive).length})` : `All (${users.length})`}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="outline" onClick={exportUsersCSV} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button size="sm" onClick={() => setShowCreateUser(true)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                  <Plus className="w-3.5 h-3.5" /> Add User
                </Button>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search by name, email, phone, ID, school…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowFilters(f => !f)} className="gap-1.5 text-xs whitespace-nowrap">
                  <Filter className="w-3.5 h-3.5" /> Filters {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>

              {showFilters && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm grid sm:grid-cols-3 gap-3">
                  <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1); }}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="teacher">Teachers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={gradeFilter} onValueChange={v => { setGradeFilter(v); setPage(1); }}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => { setRoleFilter("all"); setGradeFilter("all"); setSearchQuery(""); setPage(1); }} className="text-xs text-gray-400">
                    <X className="w-3.5 h-3.5 mr-1" /> Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold text-orange-700">{selectedIds.size} user(s) selected</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportCSV("selected_users.csv",
                    ["ID", "Name", "Email", "Role", "Grade"],
                    users.filter(u => selectedIds.has(u.id)).map(u => [u.id, u.name, u.email, u.role, u.grade])
                  )} className="text-xs gap-1">
                    <Download className="w-3 h-3" /> Export
                  </Button>
                  <Button size="sm" onClick={() => confirm({
                    title: "Bulk Deactivate",
                    message: `Deactivate ${selectedIds.size} selected users?`,
                    confirmLabel: "Deactivate All",
                    danger: false,
                    onConfirm: bulkDeactivate,
                  })} className="text-xs gap-1 text-orange-600 border-orange-300 bg-white hover:bg-orange-50" variant="outline">
                    <UserX className="w-3 h-3" /> Deactivate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-xs">Clear</Button>
                </div>
              </div>
            )}

            {/* Create User Form */}
            {showCreateUser && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Create New User</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Full name *" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Phone" value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} />
                  <div className="relative">
                    <Input type={showNewPw ? "text" : "password"} placeholder="Password *" value={newUser.password}
                      onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} className="pr-16" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button type="button" onClick={() => setShowNewPw(p => !p)} className="text-gray-400 hover:text-gray-600 p-0.5">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => { const p = generatePassword(); setNewUser(u => ({ ...u, password: p, confirmPassword: p })); }} className="text-gray-400 hover:text-gray-600 p-0.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <Input type={showNewPw ? "text" : "password"} placeholder="Confirm password *" value={newUser.confirmPassword}
                    onChange={e => setNewUser(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={newUser.confirmPassword && newUser.password !== newUser.confirmPassword ? "border-red-300" : ""} />
                  {newUser.password && (
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full transition-all" style={{ background: passwordStrength(newUser.password).color, width: `${(passwordStrength(newUser.password).score / 5) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: passwordStrength(newUser.password).color }}>{passwordStrength(newUser.password).label}</span>
                    </div>
                  )}
                  <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v as Role }))}>
                    <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {newUser.role === "student" && (
                    <Input placeholder="Grade (1-10)" type="number" min="1" max="10" value={newUser.grade} onChange={e => setNewUser(p => ({ ...p, grade: e.target.value }))} />
                  )}
                  <Input placeholder="School" value={newUser.school} onChange={e => setNewUser(p => ({ ...p, school: e.target.value }))} className="sm:col-span-2" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={createUser} disabled={busy || !newUser.name || !newUser.password || newUser.password !== newUser.confirmPassword}
                    className="text-white" style={{ background: ORANGE }}>
                    {busy ? "Creating…" : "Create User"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                    <th className="px-4 py-3 w-8">
                      <button onClick={toggleSelectAll}>
                        {allPageSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-gray-300" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      <span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs cursor-pointer select-none" onClick={() => toggleSort("role")}>
                      <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs cursor-pointer select-none" onClick={() => toggleSort("grade")}>
                      <span className="flex items-center gap-1">Gr <SortIcon field="grade" /></span>
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-500 text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading && [1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                  {!dataLoading && pagedUsers.map(u => (
                    <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!u.isActive ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(u.id)}>
                          {selectedIds.has(u.id) ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-gray-300" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setProfileUser(u)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-80 transition-opacity"
                            style={{ background: NAVY }}>{u.name[0]?.toUpperCase()}</button>
                          <div>
                            <button onClick={() => setProfileUser(u)} className="font-semibold hover:underline text-left" style={{ color: NAVY }}>{u.name}</button>
                            {!u.isActive && <span className="ml-1 text-xs text-red-400">(inactive)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        <div>{u.email ?? "—"}</div>
                        {u.phone && <div className="text-gray-400">{u.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.grade > 0 ? `Gr ${u.grade}` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setProfileUser(u)} className="p-1 text-gray-400 hover:text-blue-500 transition-colors" title="View Profile">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setResetPasswordUser(u)} className="p-1 text-gray-400 hover:text-orange-500 transition-colors" title="Reset Password">
                            <Key className="w-4 h-4" />
                          </button>
                          {u.isActive ? (
                            <button onClick={() => confirm({
                              title: "Deactivate User",
                              message: `Deactivate ${u.name}? They will lose access immediately.`,
                              confirmLabel: "Deactivate",
                              onConfirm: () => deactivateUser(u.id),
                            })} className="p-1 text-gray-400 hover:text-orange-500 transition-colors" title="Deactivate">
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => reactivateUser(u.id)} className="p-1 text-gray-400 hover:text-green-500 transition-colors" title="Reactivate">
                              <UserCheck2 className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => confirm({
                            title: "Permanently Delete",
                            message: `This will permanently remove ${u.name} from the database. This cannot be undone.`,
                            confirmLabel: "Delete Forever",
                            danger: true,
                            onConfirm: () => permanentDeleteUser(u.id),
                          })} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Permanent Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!dataLoading && pagedUsers.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs">Prev</Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                    return (
                      <Button key={p} size="sm" onClick={() => setPage(p)}
                        className={`text-xs w-8 h-8 p-0 ${p === page ? "text-white" : "variant-outline"}`}
                        style={p === page ? { background: ORANGE } : {}} variant={p === page ? "default" : "outline"}>
                        {p}
                      </Button>
                    );
                  })}
                  <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs">Next</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Teacher Assignments ───────────────────────────────────────── */}
        {tab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Assign teachers to courses so they can manage content.</p>
              <Button size="sm" onClick={() => setShowAssignTeacher(true)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Assign
              </Button>
            </div>
            {showAssignTeacher && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Assign Teacher to Course</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select value={assignForm.teacherId} onValueChange={v => setAssignForm(p => ({ ...p, teacherId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                    <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={assignForm.courseId} onValueChange={v => setAssignForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} (Gr {c.grade})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={assignTeacher} disabled={busy || !assignForm.teacherId || !assignForm.courseId} className="text-white" style={{ background: ORANGE }}>Assign</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignTeacher(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Teacher</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Course</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Assigned</th>
                  <th className="px-4 py-3" />
                </tr></thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{a.teacherName}</td>
                      <td className="px-4 py-3 text-gray-600">{a.courseTitle}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.assignedAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => confirm({ title: "Remove Assignment", message: `Remove ${a.teacherName} from ${a.courseTitle}?`, confirmLabel: "Remove", danger: true, onConfirm: () => removeAssignment(a.id) })}
                          className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No assignments yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Enrollments ───────────────────────────────────────────────── */}
        {tab === "enrollments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Enroll students into courses.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportEnrollmentsCSV} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button size="sm" onClick={() => setShowEnrollStudent(true)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                  <Plus className="w-3.5 h-3.5" /> Enroll
                </Button>
              </div>
            </div>
            {showEnrollStudent && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Enroll Student in Course</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select value={enrollForm.studentId} onValueChange={v => setEnrollForm(p => ({ ...p, studentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                    <SelectContent>{students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} (Gr {s.grade})</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={enrollForm.courseId} onValueChange={v => setEnrollForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} (Gr {c.grade})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={enrollStudent} disabled={busy || !enrollForm.studentId || !enrollForm.courseId} className="text-white" style={{ background: ORANGE }}>Enroll</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowEnrollStudent(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Course</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Enrolled</th>
                  <th className="px-4 py-3" />
                </tr></thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{e.studentName}</td>
                      <td className="px-4 py-3 text-gray-600">{e.courseTitle}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.enrolledAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => confirm({ title: "Remove Enrollment", message: `Remove ${e.studentName} from ${e.courseTitle}?`, confirmLabel: "Remove", danger: true, onConfirm: () => removeEnrollment(e.id) })}
                          className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No enrollments yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Announcements ─────────────────────────────────────────────── */}
        {tab === "announcements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Broadcast messages to students or teachers.</p>
              <Button size="sm" onClick={() => setShowAnnForm(!showAnnForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> New Announcement
              </Button>
            </div>

            {showAnnForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Create Announcement</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={annForm.title} onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Textarea placeholder="Body *" value={annForm.body} onChange={e => setAnnForm(p => ({ ...p, body: e.target.value }))} rows={3} className="sm:col-span-2" />
                  <Select value={annForm.targetRole} onValueChange={v => setAnnForm(p => ({ ...p, targetRole: v }))}>
                    <SelectTrigger><SelectValue placeholder="Target audience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      <SelectItem value="student">Students</SelectItem>
                      <SelectItem value="teacher">Teachers</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Grade filter (optional)" type="number" min="1" max="10" value={annForm.grade} onChange={e => setAnnForm(p => ({ ...p, grade: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createAnnouncement} disabled={busy || !annForm.title || !annForm.body} className="text-white" style={{ background: ORANGE }}>Publish</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAnnForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${a.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: NAVY }}>{a.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>{a.isActive ? "Active" : "Inactive"}</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{a.targetRole}</span>
                        {a.grade && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Grade {a.grade}</span>}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => toggleAnnouncement(a)} className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50 transition-colors text-gray-500">{a.isActive ? "Hide" : "Show"}</button>
                      <button onClick={() => confirm({ title: "Delete Announcement", message: `Delete "${a.title}"?`, confirmLabel: "Delete", danger: true, onConfirm: () => deleteAnnouncement(a.id) })}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && !showAnnForm && (
                <div className="py-12 text-center"><Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No announcements yet</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Live Classes ──────────────────────────────────────────────── */}
        {tab === "liveclasses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base" style={{ color: NAVY }}>Live Class Schedule</h3>
                <p className="text-xs text-gray-400 mt-0.5">Schedule classes, assign teachers, and set join links</p>
              </div>
              <Button size="sm" onClick={() => setShowLcForm(!showLcForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Schedule Class
              </Button>
            </div>

            {showLcForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Live Class</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Class title *" value={lcForm.title} onChange={e => setLcForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Select value={lcForm.subjectId} onValueChange={v => setLcForm(p => ({ ...p, subjectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Subject *" /></SelectTrigger>
                    <SelectContent>{subjectsList.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Grade (1-10) *" type="number" min="1" max="10" value={lcForm.grade} onChange={e => setLcForm(p => ({ ...p, grade: e.target.value }))} />
                  <Select value={lcForm.teacherId} onValueChange={v => setLcForm(p => ({ ...p, teacherId: v, teacher: teachers.find(t => String(t.id) === v)?.name ?? "" }))}>
                    <SelectTrigger><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific teacher</SelectItem>
                      {teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Teacher name (if not above)" value={lcForm.teacher} onChange={e => setLcForm(p => ({ ...p, teacher: e.target.value }))} />
                  <Input type="datetime-local" value={lcForm.scheduledAt} onChange={e => setLcForm(p => ({ ...p, scheduledAt: e.target.value }))} />
                  <Input placeholder="Duration (minutes)" type="number" min="15" value={lcForm.duration} onChange={e => setLcForm(p => ({ ...p, duration: e.target.value }))} />
                  <Input placeholder="Join link (Google Meet / Zoom)" value={lcForm.joinUrl} onChange={e => setLcForm(p => ({ ...p, joinUrl: e.target.value }))} className="sm:col-span-2" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={createLiveClass} disabled={busy || !lcForm.title || !lcForm.subjectId || !lcForm.grade || !lcForm.scheduledAt || (!lcForm.teacher && !lcForm.teacherId)}
                    className="text-white" style={{ background: ORANGE }}>Schedule</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowLcForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: liveClassItems.length, color: NAVY },
                { label: "Live Now", value: liveClassItems.filter(l => l.status === "live").length, color: "#EF4444" },
                { label: "Upcoming", value: liveClassItems.filter(l => l.status === "upcoming").length, color: "#22C55E" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {liveClassItems.map(lc => (
                <div key={lc.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: lc.status === "live" ? "#FEE2E2" : lc.status === "upcoming" ? "#DCFCE7" : "#F3F4F6" }}>
                        <Video className="w-5 h-5" style={{ color: lc.status === "live" ? "#EF4444" : lc.status === "upcoming" ? "#22C55E" : "#9CA3AF" }} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: NAVY }}>{lc.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{lc.subjectName} · Grade {lc.grade} · {lc.teacher}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(lc.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lc.duration} min</span>
                        </div>
                        {editingLc?.id === lc.id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Input className="h-7 text-xs" placeholder="Paste join URL…" defaultValue={lc.joinUrl ?? ""} id={`join-url-${lc.id}`} />
                            <Button size="sm" className="h-7 text-xs text-white px-3" style={{ background: NAVY }}
                              onClick={() => { const el = document.getElementById(`join-url-${lc.id}`) as HTMLInputElement; updateLiveClassJoinUrl(lc.id, el.value); }}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingLc(null)}>✕</Button>
                          </div>
                        ) : lc.joinUrl ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <a href={lc.joinUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-700 truncate max-w-xs">
                              <ExternalLink className="w-3 h-3 flex-shrink-0" /><span className="truncate">{lc.joinUrl}</span>
                            </a>
                            <button onClick={() => setEditingLc(lc)} className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"><Edit2 className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingLc(lc)} className="mt-1.5 text-xs text-orange-500 hover:text-orange-700 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Add join link
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${lc.status === "live" ? "bg-red-100 text-red-600" : lc.status === "upcoming" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                        {lc.status === "live" ? "🔴 Live" : lc.status === "upcoming" ? "🟢 Upcoming" : "⚫ Ended"}
                      </span>
                      <Select value={lc.status} onValueChange={v => updateLiveClassStatus(lc.id, v)}>
                        <SelectTrigger className="h-8 text-xs w-28 border-gray-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="live">Go Live</SelectItem>
                          <SelectItem value="ended">End Class</SelectItem>
                        </SelectContent>
                      </Select>
                      <button onClick={() => confirm({ title: "Delete Live Class", message: `Delete "${lc.title}"?`, confirmLabel: "Delete", danger: true, onConfirm: () => deleteLiveClass(lc.id) })}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {liveClassItems.length === 0 && !showLcForm && (
                <div className="py-16 text-center">
                  <Video className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No live classes scheduled</p>
                  <p className="text-xs text-gray-300 mt-1">Click "Schedule Class" to create your first session</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Banners ───────────────────────────────────────────────────── */}
        {tab === "banners" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Manage promotional banners shown on the dashboard.</p>
              <Button size="sm" onClick={() => setShowBannerForm(!showBannerForm)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Add Banner
              </Button>
            </div>

            {showBannerForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>New Banner</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={bannerForm.title} onChange={e => setBannerForm(p => ({ ...p, title: e.target.value }))} />
                  <Input placeholder="Image URL *" value={bannerForm.imageUrl} onChange={e => setBannerForm(p => ({ ...p, imageUrl: e.target.value }))} />
                  <Input placeholder="Link (optional)" value={bannerForm.link} onChange={e => setBannerForm(p => ({ ...p, link: e.target.value }))} />
                  <Input placeholder="Display order" type="number" value={bannerForm.displayOrder} onChange={e => setBannerForm(p => ({ ...p, displayOrder: e.target.value }))} />
                </div>
                {bannerForm.imageUrl && (
                  <img src={bannerForm.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-gray-200" onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={createBanner} disabled={busy || !bannerForm.title || !bannerForm.imageUrl} className="text-white" style={{ background: ORANGE }}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowBannerForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map(b => (
                <div key={b.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${!b.isActive ? "opacity-60" : "border-gray-100"}`}>
                  <img src={b.imageUrl} alt={b.title} className="w-full h-36 object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = `https://placehold.co/400x200/0B2B6B/white?text=${encodeURIComponent(b.title)}`; }} />
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm" style={{ color: NAVY }}>{b.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>{b.isActive ? "Live" : "Off"}</span>
                    </div>
                    {b.link && <p className="text-xs text-gray-400 mt-0.5 truncate">{b.link}</p>}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => toggleBanner(b)} className="flex-1 text-xs py-1.5 rounded-lg border hover:bg-gray-50 transition-colors text-gray-500">
                        {b.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => confirm({ title: "Delete Banner", message: `Delete "${b.title}"?`, confirmLabel: "Delete", danger: true, onConfirm: () => deleteBanner(b.id) })}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {banners.length === 0 && !showBannerForm && (
                <div className="col-span-3 py-12 text-center"><Image className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-gray-400 text-sm">No banners yet</p></div>
              )}
            </div>
          </div>
        )}

        {/* ── Audit Logs ─────────────────────────────────────────────────── */}
        {tab === "audit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base" style={{ color: NAVY }}>Audit Log</h3>
                <p className="text-xs text-gray-400 mt-0.5">Track all admin actions: edits, deletes, password resets, enrollments</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => exportCSV("audit_log.csv",
                ["Time", "Actor", "Action", "Target Type", "Target"],
                auditLogs.map(l => [l.createdAt, l.actorName, l.action, l.targetType, l.targetName])
              )} className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </div>

            {auditLogs.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Time</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Actor</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Action</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Target</th>
                  </tr></thead>
                  <tbody>
                    {auditLogs.slice(0, 100).map(l => (
                      <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 font-medium text-xs" style={{ color: NAVY }}>{l.actorName}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            l.action.includes("delete") || l.action.includes("deactivate") ? "bg-red-100 text-red-600" :
                            l.action.includes("create") || l.action.includes("enroll") ? "bg-green-100 text-green-600" :
                            l.action.includes("reset") ? "bg-orange-100 text-orange-600" :
                            "bg-blue-100 text-blue-600"
                          }`}>{l.action}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{l.targetType}: <span className="font-medium">{l.targetName}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No audit logs yet</p>
                <p className="text-xs text-gray-300 mt-1">Actions will be tracked once the audit_logs table is set up on the backend</p>
              </div>
            )}
          </div>
        )}

        {/* ── Fees (Placeholder) ────────────────────────────────────────── */}
        {tab === "fees" && (
          <PlaceholderTab
            icon={DollarSign}
            title="Fee Management"
            description="Track student fee payments, installments, overdue amounts, and integrate with Razorpay for seamless collections."
            features={[
              "Total fees collected vs pending",
              "Per-student installment tracking",
              "Overdue student alerts",
              "Payment history per course",
              "Razorpay auto-reconciliation",
              "Fee analytics by grade / course",
              "Export receipts as PDF",
            ]}
          />
        )}

        {/* ── Payments (Placeholder) ────────────────────────────────────── */}
        {tab === "payments" && (
          <PlaceholderTab
            icon={CreditCard}
            title="Payment Gateway"
            description="Centralized payment dashboard with Razorpay webhooks, refund management, and revenue reporting."
            features={[
              "Razorpay order & webhook integration",
              "Refund management",
              "Revenue by course / teacher",
              "Transaction history export",
              "Subscription plan tracking",
            ]}
          />
        )}

        {/* ── Certificates (Placeholder) ────────────────────────────────── */}
        {tab === "certificates" && (
          <PlaceholderTab
            icon={Award}
            title="Certificates"
            description="Auto-generate and issue course completion certificates with custom branding."
            features={[
              "Auto-generate on course completion",
              "Custom certificate templates",
              "Bulk issue by grade / course",
              "QR code verification",
              "Student self-download portal",
            ]}
          />
        )}

        {/* ── Settings ─────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="space-y-4 max-w-lg">
            <h3 className="font-bold text-base" style={{ color: NAVY }}>Account Settings</h3>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{student?.name}</div>
                  <div className="text-xs text-gray-400">{student?.email ?? "No email"} · {student?.role}</div>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <ChangePasswordForm flash={flash} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Change Password Form ───────────────────────────────────────────────────
function ChangePasswordForm({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!currentPw || !newPw || newPw !== confirmPw) {
      flash("Please fill all fields and confirm password", false);
      return;
    }
    if (newPw.length < 8) { flash("New password must be at least 8 characters", false); return; }
    setBusy(true);
    const r = await apiFetch("/admin/me/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    setBusy(false);
    if (r.ok) {
      flash("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } else {
      const d = await r.json();
      flash(d.error ?? "Failed to change password", false);
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm" style={{ color: NAVY }}>Change Password</h4>
      <div className="relative">
        <Input type={showCurrent ? "text" : "password"} placeholder="Current password" value={currentPw}
          onChange={e => setCurrentPw(e.target.value)} className="pr-10" />
        <button onClick={() => setShowCurrent(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Eye className="w-4 h-4" /></button>
      </div>
      <div className="relative">
        <Input type={showNew ? "text" : "password"} placeholder="New password (min 8 chars)" value={newPw}
          onChange={e => setNewPw(e.target.value)} className="pr-10" />
        <button onClick={() => setShowNew(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><Eye className="w-4 h-4" /></button>
      </div>
      <Input type="password" placeholder="Confirm new password" value={confirmPw}
        onChange={e => setConfirmPw(e.target.value)} className={confirmPw && newPw !== confirmPw ? "border-red-300" : ""} />
      <Button size="sm" className="text-white" style={{ background: ORANGE }}
        disabled={busy || !currentPw || !newPw || newPw !== confirmPw} onClick={submit}>
        {busy ? "Updating…" : "Update Password"}
      </Button>
    </div>
  );
}
