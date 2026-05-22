import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import {
  Users, BookOpen, GraduationCap, UserCheck, Plus, Trash2, Shield,
  ChevronRight, BarChart3, Link as LinkIcon, Bell, Image, Edit2, X,
  TrendingUp, Award, Calendar, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

type Role = "admin" | "teacher" | "student";
type Tab = "analytics" | "overview" | "users" | "assignments" | "enrollments" | "announcements" | "banners";

interface User { id: number; name: string; email: string | null; phone: string | null; role: string; grade: number; school: string | null; isActive: boolean; }
interface Course { id: number; title: string; subjectName: string; grade: number; teacher: string | null; }
interface TeacherAssignment { id: number; teacherId: number; teacherName: string; courseId: number; courseTitle: string; assignedAt: string; }
interface Enrollment { id: number; studentId: number; studentName: string; courseId: number; courseTitle: string; enrolledAt: string; }
interface Stats { totalUsers: number; totalStudents: number; totalTeachers: number; totalCourses: number; totalEnrollments: number; totalTeacherAssignments: number; }
interface Analytics { totals: { users: number; students: number; teachers: number; courses: number; enrollments: number }; submissions: { homework: number; assignments: number; tests: number; gradedHomework: number }; liveClasses: { upcoming: number; live: number }; topStudents: { id: number; name: string; points: number; grade: number; school: string | null }[]; recentEnrollments: { studentName: string; courseTitle: string; enrolledAt: string }[]; }
interface Announcement { id: number; title: string; body: string; grade: number | null; targetRole: string; isActive: boolean; createdAt: string; }
interface Banner { id: number; title: string; imageUrl: string; link: string | null; isActive: boolean; displayOrder: number; }

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api${path}`, { ...opts, headers: { "Content-Type": "application/json", ...opts?.headers }, credentials: "include" });
}

const ROLE_COLORS: Record<string, string> = { admin: "bg-red-100 text-red-700 border-red-200", teacher: "bg-blue-100 text-blue-700 border-blue-200", student: "bg-green-100 text-green-700 border-green-200" };

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

  // UI
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showEnrollStudent, setShowEnrollStudent] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", password: "", role: "student" as Role, grade: "6", school: "" });
  const [assignForm, setAssignForm] = useState({ teacherId: "", courseId: "" });
  const [enrollForm, setEnrollForm] = useState({ studentId: "", courseId: "" });
  const [annForm, setAnnForm] = useState({ title: "", body: "", grade: "", targetRole: "all" });
  const [bannerForm, setBannerForm] = useState({ title: "", imageUrl: "", link: "", displayOrder: "0" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const teachers = users.filter(u => u.role === "teacher");
  const students = users.filter(u => u.role === "student");

  useEffect(() => { if (!isLoading && role === "admin") loadAll(); }, [isLoading, role]);

  async function loadAll() {
    const [s, u, c, a, e, anns, bans, ana] = await Promise.all([
      apiFetch("/admin/stats").then(r => r.ok ? r.json() : null),
      apiFetch("/admin/users").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/courses").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/teacher-courses").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/enrollments").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/announcements").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/banners").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/analytics").then(r => r.ok ? r.json() : null),
    ]);
    setStats(s); setUsers(u); setCourses(c); setAssignments(a); setEnrollments(e);
    setAnnouncements(anns); setBanners(bans); setAnalytics(ana);
  }

  function flash(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" /></div>;
  if (!student) return <Redirect to="/sign-in" />;
  if (role !== "admin") return <Redirect to="/dashboard" />;

  const filteredUsers = userRoleFilter === "all" ? users : users.filter(u => u.role === userRoleFilter);

  // ── Actions ──────────────────────────────────────────────────
  async function createUser() {
    setBusy(true);
    const r = await apiFetch("/admin/users", { method: "POST", body: JSON.stringify({ ...newUser, grade: Number(newUser.grade) }) });
    if (r.ok) { flash("User created!"); setShowCreateUser(false); setNewUser({ name: "", email: "", phone: "", password: "", role: "student", grade: "6", school: "" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function deleteUser(id: number) {
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" }); loadAll();
  }

  async function assignTeacher() {
    setBusy(true);
    const r = await apiFetch("/admin/teacher-courses", { method: "POST", body: JSON.stringify({ teacherId: Number(assignForm.teacherId), courseId: Number(assignForm.courseId) }) });
    if (r.ok) { flash("Teacher assigned!"); setShowAssignTeacher(false); setAssignForm({ teacherId: "", courseId: "" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function removeAssignment(id: number) { await apiFetch(`/admin/teacher-courses/${id}`, { method: "DELETE" }); loadAll(); }

  async function enrollStudent() {
    setBusy(true);
    const r = await apiFetch("/admin/enrollments", { method: "POST", body: JSON.stringify({ studentId: Number(enrollForm.studentId), courseId: Number(enrollForm.courseId) }) });
    if (r.ok) { flash("Student enrolled!"); setShowEnrollStudent(false); setEnrollForm({ studentId: "", courseId: "" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function removeEnrollment(id: number) { await apiFetch(`/admin/enrollments/${id}`, { method: "DELETE" }); loadAll(); }

  async function createAnnouncement() {
    setBusy(true);
    const r = await apiFetch("/admin/announcements", { method: "POST", body: JSON.stringify({ title: annForm.title, body: annForm.body, grade: annForm.grade ? Number(annForm.grade) : null, targetRole: annForm.targetRole }) });
    if (r.ok) { flash("Announcement created!"); setShowAnnForm(false); setAnnForm({ title: "", body: "", grade: "", targetRole: "all" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function deleteAnnouncement(id: number) { await apiFetch(`/admin/announcements/${id}`, { method: "DELETE" }); loadAll(); }

  async function toggleAnnouncement(ann: Announcement) {
    await apiFetch(`/admin/announcements/${ann.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !ann.isActive }) }); loadAll();
  }

  async function createBanner() {
    setBusy(true);
    const r = await apiFetch("/admin/banners", { method: "POST", body: JSON.stringify({ title: bannerForm.title, imageUrl: bannerForm.imageUrl, link: bannerForm.link || null, displayOrder: Number(bannerForm.displayOrder) }) });
    if (r.ok) { flash("Banner created!"); setShowBannerForm(false); setBannerForm({ title: "", imageUrl: "", link: "", displayOrder: "0" }); loadAll(); }
    else { const d = await r.json(); flash(d.error ?? "Error", false); }
    setBusy(false);
  }

  async function deleteBanner(id: number) { await apiFetch(`/admin/banners/${id}`, { method: "DELETE" }); loadAll(); }
  async function toggleBanner(banner: Banner) { await apiFetch(`/admin/banners/${banner.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !banner.isActive }) }); loadAll(); }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "Users", icon: Users },
    { id: "assignments", label: "Teacher Assign", icon: LinkIcon },
    { id: "enrollments", label: "Enrollments", icon: UserCheck },
    { id: "announcements", label: "Announcements", icon: Bell },
    { id: "banners", label: "Banners", icon: Image },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shadow-sm" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-white" />
          <span className="font-black text-white text-lg">Admin Panel</span>
          <span className="text-white/40 text-sm hidden md:inline">— Braintam LMS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm hidden sm:inline">{student.name}</span>
          <a href="/" className="text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">← Site</a>
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
            </button>
          );
        })}
      </div>

      <div className="p-5 space-y-5">
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between ${msg.ok ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            <span>{msg.text}</span><button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Analytics ── */}
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
                    { label: "Homework Submitted", value: analytics.submissions.homework, max: Math.max(analytics.submissions.homework, 1), color: "#3B82F6" },
                    { label: "Assignments Submitted", value: analytics.submissions.assignments, max: Math.max(analytics.submissions.homework, 1), color: "#8B5CF6" },
                    { label: "Tests Taken", value: analytics.submissions.tests, max: Math.max(analytics.submissions.homework, 1), color: ORANGE },
                    { label: "Homework Graded", value: analytics.submissions.gradedHomework, max: Math.max(analytics.submissions.homework, 1), color: "#22C55E" },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 font-medium">{s.label}</span>
                        <span className="font-bold" style={{ color: s.color }}>{s.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full transition-all" style={{ background: s.color, width: `${Math.min(100, (s.value / s.max) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
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

        {/* ── Overview ── */}
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

        {/* ── Users ── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {["all", "student", "teacher", "admin"].map(r => (
                  <button key={r} onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${userRoleFilter === r ? "text-white" : "bg-white text-gray-500 border"}`}
                    style={{ background: userRoleFilter === r ? NAVY : undefined }}>{r}</button>
                ))}
              </div>
              <Button size="sm" onClick={() => setShowCreateUser(true)} className="ml-auto text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Add User
              </Button>
            </div>

            {showCreateUser && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Create New User</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Full name *" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                  <Input placeholder="Phone" value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} />
                  <Input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                  <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v as Role }))}>
                    <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent><SelectItem value="student">Student</SelectItem><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                  </Select>
                  {newUser.role === "student" && <Input placeholder="Grade (1-10)" type="number" min="1" max="10" value={newUser.grade} onChange={e => setNewUser(p => ({ ...p, grade: e.target.value }))} />}
                  <Input placeholder="School" value={newUser.school} onChange={e => setNewUser(p => ({ ...p, school: e.target.value }))} className="sm:col-span-2" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={createUser} disabled={busy || !newUser.name} className="text-white" style={{ background: ORANGE }}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Grade</th>
                  <th className="px-4 py-3" />
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: NAVY }}>{u.name[0]}</div>
                        <span className="font-semibold" style={{ color: NAVY }}>{u.name}</span>
                        {!u.isActive && <span className="text-xs text-red-400">(inactive)</span>}
                      </div></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email ?? u.phone ?? "—"}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.grade > 0 ? `Gr ${u.grade}` : "—"}</td>
                      <td className="px-4 py-3"><button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Teacher Assignments ── */}
        {tab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Assign teachers to courses so they can manage content.</p>
              <Button size="sm" onClick={() => setShowAssignTeacher(true)} className="text-white gap-1.5" style={{ background: ORANGE }}><Plus className="w-3.5 h-3.5" /> Assign</Button>
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
                      <td className="px-4 py-3"><button onClick={() => removeAssignment(a.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                  {assignments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No assignments yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Enrollments ── */}
        {tab === "enrollments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Enroll students into courses.</p>
              <Button size="sm" onClick={() => setShowEnrollStudent(true)} className="text-white gap-1.5" style={{ background: ORANGE }}><Plus className="w-3.5 h-3.5" /> Enroll</Button>
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
                      <td className="px-4 py-3"><button onClick={() => removeEnrollment(e.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No enrollments yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Announcements ── */}
        {tab === "announcements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Broadcast messages to students or teachers.</p>
              <Button size="sm" onClick={() => setShowAnnForm(!showAnnForm)} className="text-white gap-1.5" style={{ background: ORANGE }}><Plus className="w-3.5 h-3.5" /> New Announcement</Button>
            </div>

            {showAnnForm && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Create Announcement</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input placeholder="Title *" value={annForm.title} onChange={e => setAnnForm(p => ({ ...p, title: e.target.value }))} className="sm:col-span-2" />
                  <Textarea placeholder="Body *" value={annForm.body} onChange={e => setAnnForm(p => ({ ...p, body: e.target.value }))} rows={3} className="sm:col-span-2" />
                  <Select value={annForm.targetRole} onValueChange={v => setAnnForm(p => ({ ...p, targetRole: v }))}>
                    <SelectTrigger><SelectValue placeholder="Target audience" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Everyone</SelectItem><SelectItem value="student">Students</SelectItem><SelectItem value="teacher">Teachers</SelectItem></SelectContent>
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
                      <button onClick={() => deleteAnnouncement(a.id)} className="text-red-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
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

        {/* ── Banners ── */}
        {tab === "banners" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Manage promotional banners shown on the dashboard.</p>
              <Button size="sm" onClick={() => setShowBannerForm(!showBannerForm)} className="text-white gap-1.5" style={{ background: ORANGE }}><Plus className="w-3.5 h-3.5" /> Add Banner</Button>
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
                  <img src={b.imageUrl} alt={b.title} className="w-full h-36 object-cover" onError={e => { (e.currentTarget as HTMLImageElement).src = `https://placehold.co/400x200/0B2B6B/white?text=${encodeURIComponent(b.title)}`; }} />
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm" style={{ color: NAVY }}>{b.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>{b.isActive ? "Live" : "Off"}</span>
                    </div>
                    {b.link && <p className="text-xs text-gray-400 mt-0.5 truncate">{b.link}</p>}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => toggleBanner(b)} className="flex-1 text-xs py-1.5 rounded-lg border hover:bg-gray-50 transition-colors text-gray-500">{b.isActive ? "Disable" : "Enable"}</button>
                      <button onClick={() => deleteBanner(b.id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
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
      </div>
    </div>
  );
}
