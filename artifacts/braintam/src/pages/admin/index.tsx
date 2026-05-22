import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import { Users, BookOpen, GraduationCap, UserCheck, Plus, Trash2, Shield, ChevronRight, BarChart3, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

type Role = "admin" | "teacher" | "student";

interface User {
  id: number; name: string; email: string | null; phone: string | null;
  role: string; grade: number; school: string | null; isActive: boolean;
}
interface Course { id: number; title: string; subjectName: string; grade: number; teacher: string | null; }
interface TeacherAssignment { id: number; teacherId: number; teacherName: string; courseId: number; courseTitle: string; assignedAt: string; }
interface Enrollment { id: number; studentId: number; studentName: string; courseId: number; courseTitle: string; enrolledAt: string; }
interface Stats { totalUsers: number; totalStudents: number; totalTeachers: number; totalCourses: number; totalEnrollments: number; totalTeacherAssignments: number; }

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
    credentials: "include",
  });
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  teacher: "bg-blue-100 text-blue-700 border-blue-200",
  student: "bg-green-100 text-green-700 border-green-200",
};

export default function AdminPage() {
  const { student, role, isLoading } = useAuth();
  const [tab, setTab] = useState<"overview" | "users" | "assignments" | "enrollments">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showEnrollStudent, setShowEnrollStudent] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", password: "", role: "student" as Role, grade: "6", school: "" });
  const [assignForm, setAssignForm] = useState({ teacherId: "", courseId: "" });
  const [enrollForm, setEnrollForm] = useState({ studentId: "", courseId: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const teachers = users.filter(u => u.role === "teacher");
  const students = users.filter(u => u.role === "student");

  useEffect(() => { if (!isLoading && role === "admin") loadAll(); }, [isLoading, role]);

  async function loadAll() {
    const [s, u, c, a, e] = await Promise.all([
      apiFetch("/admin/stats").then(r => r.ok ? r.json() : null),
      apiFetch("/admin/users").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/courses").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/teacher-courses").then(r => r.ok ? r.json() : []),
      apiFetch("/admin/enrollments").then(r => r.ok ? r.json() : []),
    ]);
    setStats(s); setUsers(u); setCourses(c); setAssignments(a); setEnrollments(e);
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" /></div>;
  if (!student) return <Redirect to="/sign-in" />;
  if (role !== "admin") return <Redirect to="/dashboard" />;

  const filteredUsers = userRoleFilter === "all" ? users : users.filter(u => u.role === userRoleFilter);

  async function createUser() {
    setBusy(true); setMsg("");
    const r = await apiFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify({ ...newUser, grade: Number(newUser.grade) }),
    });
    if (r.ok) {
      setMsg("User created!"); setShowCreateUser(false);
      setNewUser({ name: "", email: "", phone: "", password: "", role: "student", grade: "6", school: "" });
      loadAll();
    } else {
      const d = await r.json(); setMsg(d.error ?? "Error");
    }
    setBusy(false);
  }

  async function deleteUser(id: number) {
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function assignTeacher() {
    setBusy(true); setMsg("");
    const r = await apiFetch("/admin/teacher-courses", {
      method: "POST",
      body: JSON.stringify({ teacherId: Number(assignForm.teacherId), courseId: Number(assignForm.courseId) }),
    });
    if (r.ok) { setMsg("Teacher assigned!"); setShowAssignTeacher(false); setAssignForm({ teacherId: "", courseId: "" }); loadAll(); }
    else { const d = await r.json(); setMsg(d.error ?? "Error"); }
    setBusy(false);
  }

  async function removeAssignment(id: number) {
    await apiFetch(`/admin/teacher-courses/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function enrollStudent() {
    setBusy(true); setMsg("");
    const r = await apiFetch("/admin/enrollments", {
      method: "POST",
      body: JSON.stringify({ studentId: Number(enrollForm.studentId), courseId: Number(enrollForm.courseId) }),
    });
    if (r.ok) { setMsg("Student enrolled!"); setShowEnrollStudent(false); setEnrollForm({ studentId: "", courseId: "" }); loadAll(); }
    else { const d = await r.json(); setMsg(d.error ?? "Error"); }
    setBusy(false);
  }

  async function removeEnrollment(id: number) {
    await apiFetch(`/admin/enrollments/${id}`, { method: "DELETE" });
    loadAll();
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "assignments", label: "Teacher Assignments", icon: LinkIcon },
    { id: "enrollments", label: "Enrollments", icon: UserCheck },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shadow-sm" style={{ background: NAVY }}>
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-white" />
          <span className="font-black text-white text-lg">Admin Panel</span>
          <span className="text-white/40 text-sm">— Braintam LMS</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">{student.name}</span>
          <a href="/" className="text-xs px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">← Site</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-0 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap ${tab === t.id ? "text-white shadow" : "text-gray-500 hover:text-gray-700"}`}
              style={{ background: tab === t.id ? ORANGE : "rgba(255,255,255,0.6)" }}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {msg && <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">{msg}</div>}

        {/* ── Overview ── */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Users", value: stats.totalUsers, icon: Users, color: NAVY },
                { label: "Students", value: stats.totalStudents, icon: GraduationCap, color: "#22C55E" },
                { label: "Teachers", value: stats.totalTeachers, icon: UserCheck, color: "#3B82F6" },
                { label: "Courses", value: stats.totalCourses, icon: BookOpen, color: ORANGE },
                { label: "Enrollments", value: stats.totalEnrollments, icon: UserCheck, color: "#8B5CF6" },
                { label: "Assignments", value: stats.totalTeacherAssignments, icon: LinkIcon, color: "#F59E0B" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl p-4 bg-white shadow-sm border border-gray-100">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: `${s.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Recent Users</h3>
                  <button onClick={() => setTab("users")} className="text-xs text-orange-500 font-semibold flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                </div>
                <div className="space-y-2">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1.5">
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>Courses</h3>
                </div>
                <div className="space-y-2">
                  {courses.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: NAVY }}>{c.title}</div>
                        <div className="text-xs text-gray-400">{c.subjectName} · Grade {c.grade}</div>
                      </div>
                      <span className="text-xs text-gray-500">{c.teacher ?? "Unassigned"}</span>
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {["all", "student", "teacher", "admin"].map(r => (
                  <button key={r} onClick={() => setUserRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${userRoleFilter === r ? "text-white shadow" : "bg-white text-gray-500 border"}`}
                    style={{ background: userRoleFilter === r ? NAVY : undefined }}>{r}</button>
                ))}
              </div>
              <Button size="sm" onClick={() => setShowCreateUser(true)} className="ml-auto text-white gap-1.5"
                style={{ background: ORANGE }}>
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
                  <Button size="sm" onClick={createUser} disabled={busy} className="text-white" style={{ background: ORANGE }}>Create User</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Grade</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: NAVY }}>{u.name[0]}</div>
                          <span className="font-semibold" style={{ color: NAVY }}>{u.name}</span>
                          {!u.isActive && <span className="text-xs text-red-400">(inactive)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.email ?? u.phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{u.grade > 0 ? `Grade ${u.grade}` : "—"}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No users found</td></tr>
                  )}
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
              <Button size="sm" onClick={() => setShowAssignTeacher(true)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Assign Teacher
              </Button>
            </div>

            {showAssignTeacher && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Assign Teacher to Course</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select value={assignForm.teacherId} onValueChange={v => setAssignForm(p => ({ ...p, teacherId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={assignForm.courseId} onValueChange={v => setAssignForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} (Gr {c.grade})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={assignTeacher} disabled={busy || !assignForm.teacherId || !assignForm.courseId} className="text-white" style={{ background: ORANGE }}>Assign</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignTeacher(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Teacher</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Course</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Assigned</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{a.teacherName}</td>
                      <td className="px-4 py-3 text-gray-600">{a.courseTitle}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(a.assignedAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeAssignment(a.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
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
              <p className="text-sm text-gray-500">Enroll students into courses to give them access to content.</p>
              <Button size="sm" onClick={() => setShowEnrollStudent(true)} className="text-white gap-1.5" style={{ background: ORANGE }}>
                <Plus className="w-3.5 h-3.5" /> Enroll Student
              </Button>
            </div>

            {showEnrollStudent && (
              <div className="bg-white rounded-2xl p-5 border border-orange-200 shadow-sm space-y-3">
                <h3 className="font-bold text-sm" style={{ color: NAVY }}>Enroll Student in Course</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Select value={enrollForm.studentId} onValueChange={v => setEnrollForm(p => ({ ...p, studentId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} (Gr {s.grade})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={enrollForm.courseId} onValueChange={v => setEnrollForm(p => ({ ...p, courseId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} (Gr {c.grade})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={enrollStudent} disabled={busy || !enrollForm.studentId || !enrollForm.courseId} className="text-white" style={{ background: ORANGE }}>Enroll</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowEnrollStudent(false)}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Student</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Course</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs">Enrolled</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium" style={{ color: NAVY }}>{e.studentName}</td>
                      <td className="px-4 py-3 text-gray-600">{e.courseTitle}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(e.enrolledAt).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => removeEnrollment(e.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">No enrollments yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
