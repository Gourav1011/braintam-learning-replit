import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { Redirect } from "wouter";
import {
  Users, BarChart2, MessageSquare, Bell, LogOut, Home,
  Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, Phone, Mail, BookOpen, Trophy, Activity, Plus, Trash2,
  RefreshCw, UserCheck, TrendingUp, X, Loader2,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

type Tab = "dashboard" | "students" | "follow-ups" | "alerts";

interface Student {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; lastLoginDate: string | null;
  isActive: boolean; assignedAt: string; hwCompletion: number; hwTotal: number;
  testCount: number; healthScore: number; riskLevel: "excellent" | "good" | "attention" | "at-risk";
  daysSinceLogin: number;
}

interface FollowUp {
  id: number; studentId: number; studentName: string | null;
  noteType: string; note: string; createdAt: string;
}

interface DashboardData {
  totalAssigned: number; activeToday: number; needsAttention: number;
  atRisk: number; homeworkPending: number;
  recentFollowUps: FollowUp[];
}

const NOTE_TYPES = [
  "Called Parent", "Parent Not Reachable", "Student Sick",
  "Homework Reminder Given", "Issue Resolved", "Follow-Up Scheduled",
  "General Note",
];

function healthColor(level: string) {
  if (level === "excellent") return "#059669";
  if (level === "good") return "#0284C7";
  if (level === "attention") return "#D97706";
  return "#DC2626";
}

function healthBg(level: string) {
  if (level === "excellent") return "#DCFCE7";
  if (level === "good") return "#E0F2FE";
  if (level === "attention") return "#FEF3C7";
  return "#FEE2E2";
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ background: healthBg(level), color: healthColor(level) }}>
      {score}%
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <div className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{label}</div>
      </div>
      <div className="text-3xl font-black" style={{ color: NAVY }}>{value}</div>
    </div>
  );
}

export default function MentorPage() {
  const { student, role, isLoading, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Follow-up form
  const [fuStudentId, setFuStudentId] = useState<number | "">("");
  const [fuNoteType, setFuNoteType] = useState(NOTE_TYPES[0]);
  const [fuNote, setFuNote] = useState("");
  const [fuLoading, setFuLoading] = useState(false);

  // Selected student detail
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchDashboard = useCallback(async () => {
    const r = await apiFetch("/mentor/dashboard");
    if (r.ok) setDashboard(await r.json());
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/mentor/students?limit=100");
    if (r.ok) {
      const d = await r.json();
      setStudents(d.students ?? []);
    }
    setLoading(false);
  }, []);

  const fetchFollowUps = useCallback(async () => {
    const r = await apiFetch("/mentor/follow-ups");
    if (r.ok) setFollowUps(await r.json());
  }, []);

  useEffect(() => {
    if (!isLoading && role === "mentor" || role === "admin") {
      fetchDashboard();
      fetchStudents();
      fetchFollowUps();
    }
  }, [isLoading, role]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (!student || (role !== "mentor" && role !== "admin")) {
    return <Redirect to="/mentor/login" />;
  }

  const filteredStudents = students.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    String(s.grade).includes(search),
  );

  const atRiskStudents = students.filter(s => s.riskLevel === "at-risk");
  const attentionStudents = students.filter(s => s.riskLevel === "attention");

  async function addFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fuStudentId || !fuNote.trim()) return;
    setFuLoading(true);
    const r = await apiFetch("/mentor/follow-ups", {
      method: "POST",
      body: JSON.stringify({ studentId: fuStudentId, noteType: fuNoteType, note: fuNote }),
    });
    if (r.ok) {
      setFuNote("");
      setFuStudentId("");
      await fetchFollowUps();
      await fetchDashboard();
    }
    setFuLoading(false);
  }

  async function deleteFollowUp(id: number) {
    await apiFetch(`/mentor/follow-ups/${id}`, { method: "DELETE" });
    setFollowUps(prev => prev.filter(f => f.id !== id));
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "students",  label: "My Students", icon: Users },
    { key: "follow-ups", label: "Follow-Ups", icon: MessageSquare },
    { key: "alerts",    label: "Alerts", icon: Bell },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFF", fontFamily: "Poppins, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col border-r border-gray-100 bg-white"
        style={{ position: "sticky", top: 0, height: "100vh" }}>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: GREEN }}>M</div>
            <div>
              <div className="font-black text-sm" style={{ color: NAVY }}>Mentor Portal</div>
              <div className="text-xs text-gray-400 truncate max-w-[100px]">{student.name}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? `${GREEN}15` : "transparent",
                  color: active ? GREEN : "#6B7280",
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {t.label}
                {t.key === "alerts" && (atRiskStudents.length + attentionStudents.length) > 0 && (
                  <span className="ml-auto text-xs font-black px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: "#DC2626" }}>{atRiskStudents.length + attentionStudents.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={() => { logout(); window.location.href = "/mentor/login"; }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-auto">

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100">
          <div className="font-black text-lg" style={{ color: NAVY }}>Mentor Portal</div>
          <div className="flex gap-1">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="p-2 rounded-lg transition-all"
                  style={{ background: tab === t.key ? `${GREEN}15` : "transparent", color: tab === t.key ? GREEN : "#9CA3AF" }}>
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
            <button onClick={() => { logout(); window.location.href = "/mentor/login"; }}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 transition-all">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black" style={{ color: NAVY }}>Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">Welcome back, {student.name}. Here's your student success overview.</p>
            </div>

            {dashboard ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <StatCard label="Assigned" value={dashboard.totalAssigned} icon="👥" color={NAVY} />
                  <StatCard label="Active Today" value={dashboard.activeToday} icon="✅" color={GREEN} />
                  <StatCard label="Needs Attention" value={dashboard.needsAttention} icon="⚠️" color="#D97706" />
                  <StatCard label="At Risk" value={dashboard.atRisk} icon="🔴" color="#DC2626" />
                  <StatCard label="HW Pending" value={dashboard.homeworkPending} icon="📝" color={ORANGE} />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  {/* At-risk students quick view */}
                  <div className="bg-white rounded-2xl border border-red-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <h3 className="font-black text-sm" style={{ color: NAVY }}>Students Needing Attention</h3>
                    </div>
                    {[...atRiskStudents, ...attentionStudents].slice(0, 5).length === 0 ? (
                      <div className="text-center py-6">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                        <p className="text-sm text-gray-500">All students are on track! 🎉</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...atRiskStudents, ...attentionStudents].slice(0, 5).map(s => (
                          <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <div>
                              <div className="font-semibold text-sm" style={{ color: NAVY }}>{s.name}</div>
                              <div className="text-xs text-gray-400">Grade {s.grade} · {s.daysSinceLogin}d since login</div>
                            </div>
                            <RiskBadge level={s.riskLevel} score={s.healthScore} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent follow-ups */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="w-4 h-4" style={{ color: GREEN }} />
                      <h3 className="font-black text-sm" style={{ color: NAVY }}>Recent Follow-Ups</h3>
                    </div>
                    {dashboard.recentFollowUps.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No follow-ups yet. Add your first one!</p>
                    ) : (
                      <div className="space-y-3">
                        {dashboard.recentFollowUps.map(fu => (
                          <div key={fu.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-xs" style={{ color: NAVY }}>{fu.studentName}</span>
                              <span className="text-xs text-gray-400">{new Date(fu.createdAt).toLocaleDateString("en-IN")}</span>
                            </div>
                            <div className="text-xs font-bold mb-0.5" style={{ color: GREEN }}>{fu.noteType}</div>
                            <div className="text-xs text-gray-600 line-clamp-2">{fu.note}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} />
              </div>
            )}
          </div>
        )}

        {/* ── MY STUDENTS TAB ── */}
        {tab === "students" && (
          <div className="p-6 max-w-6xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black" style={{ color: NAVY }}>My Students</h1>
                <p className="text-sm text-gray-500">{students.length} student{students.length !== 1 ? "s" : ""} assigned to you</p>
              </div>
              <button onClick={fetchStudents} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or grade…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 transition-all"
              />
            </div>

            {selectedStudent ? (
              <StudentDetailPanel student={selectedStudent} onClose={() => setSelectedStudent(null)}
                onAddFollowUp={() => { setFuStudentId(selectedStudent.id); setTab("follow-ups"); }} />
            ) : (
              <div className="grid gap-3">
                {loading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} /></div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-semibold">No students found</p>
                    <p className="text-xs text-gray-400 mt-1">Ask your admin to assign students to you</p>
                  </div>
                ) : (
                  filteredStudents.map(s => (
                    <StudentCard key={s.id} student={s} onClick={() => setSelectedStudent(s)} />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ── FOLLOW-UPS TAB ── */}
        {tab === "follow-ups" && (
          <div className="p-6 max-w-3xl mx-auto space-y-5">
            <h1 className="text-2xl font-black" style={{ color: NAVY }}>Follow-Up Center</h1>

            {/* Add follow-up form */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="font-black text-sm mb-4" style={{ color: NAVY }}>Add Follow-Up Note</h3>
              <form onSubmit={addFollowUp} className="space-y-3">
                <select value={fuStudentId} onChange={e => setFuStudentId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 transition-all bg-white" required>
                  <option value="">Select student…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (Grade {s.grade})</option>
                  ))}
                </select>
                <select value={fuNoteType} onChange={e => setFuNoteType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 transition-all bg-white">
                  {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <textarea value={fuNote} onChange={e => setFuNote(e.target.value)} required
                  placeholder="Describe the follow-up…"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-500 transition-all resize-none"
                />
                <button type="submit" disabled={fuLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${GREEN}, #047857)` }}>
                  {fuLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Plus className="w-4 h-4" /> Add Note
                </button>
              </form>
            </div>

            {/* Follow-up list */}
            <div className="space-y-3">
              {followUps.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-semibold">No follow-ups yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add your first note above</p>
                </div>
              ) : followUps.map(fu => (
                <div key={fu.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-sm" style={{ color: NAVY }}>{fu.studentName ?? `Student #${fu.studentId}`}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>{fu.noteType}</span>
                      </div>
                      <p className="text-sm text-gray-600">{fu.note}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(fu.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button onClick={() => deleteFollowUp(fu.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ALERTS TAB ── */}
        {tab === "alerts" && (
          <div className="p-6 max-w-3xl mx-auto space-y-5">
            <h1 className="text-2xl font-black" style={{ color: NAVY }}>Alert Center</h1>
            <p className="text-sm text-gray-500">Students who need immediate attention based on their activity and submission patterns.</p>

            {atRiskStudents.length + attentionStudents.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-green-700 font-black">All Students On Track!</p>
                <p className="text-sm text-gray-400 mt-1">No alerts at this time. Keep up the great work!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {atRiskStudents.map(s => (
                  <AlertCard key={s.id} student={s} level="at-risk"
                    onFollowUp={() => { setFuStudentId(s.id); setTab("follow-ups"); }} />
                ))}
                {attentionStudents.map(s => (
                  <AlertCard key={s.id} student={s} level="attention"
                    onFollowUp={() => { setFuStudentId(s.id); setTab("follow-ups"); }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentCard({ student, onClick }: { student: Student; onClick: () => void }) {
  const color = healthColor(student.riskLevel);
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm"
            style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)` }}>
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-black text-sm" style={{ color: "#0B2B6B" }}>{student.name}</div>
            <div className="text-xs text-gray-400">Grade {student.grade}{student.school ? ` · ${student.school}` : ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={student.riskLevel} score={student.healthScore} />
          <ChevronDown className="w-4 h-4 text-gray-300" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-xl" style={{ background: "#F8FAFF" }}>
          <div className="font-black text-sm" style={{ color: "#0B2B6B" }}>{student.hwCompletion}%</div>
          <div className="text-xs text-gray-400">Homework</div>
        </div>
        <div className="text-center p-2 rounded-xl" style={{ background: "#F8FAFF" }}>
          <div className="font-black text-sm" style={{ color: "#0B2B6B" }}>{student.testCount}</div>
          <div className="text-xs text-gray-400">Tests</div>
        </div>
        <div className="text-center p-2 rounded-xl" style={{ background: "#F8FAFF" }}>
          <div className="font-black text-sm" style={{ color: student.daysSinceLogin > 7 ? "#DC2626" : "#0B2B6B" }}>
            {student.daysSinceLogin > 100 ? "Never" : `${student.daysSinceLogin}d`}
          </div>
          <div className="text-xs text-gray-400">Last Login</div>
        </div>
      </div>
    </button>
  );
}

function StudentDetailPanel({ student, onClose, onAddFollowUp }: { student: Student; onClose: () => void; onAddFollowUp: () => void }) {
  const GREEN = "#059669";
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-md">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg"
            style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)` }}>
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-black text-lg" style={{ color: NAVY }}>{student.name}</div>
            <div className="text-sm text-gray-500">Grade {student.grade}{student.school ? ` · ${student.school}` : ""}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={student.riskLevel} score={student.healthScore} />
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      <div className="p-5 grid md:grid-cols-3 gap-4">
        <InfoBlock label="Email" value={student.email ?? "—"} />
        <InfoBlock label="Phone" value={student.phone ?? "—"} />
        <InfoBlock label="Last Login" value={student.lastLoginDate ? new Date(student.lastLoginDate).toLocaleDateString("en-IN") : "Never"} />
        <InfoBlock label="HW Completion" value={`${student.hwCompletion}%`} />
        <InfoBlock label="Tests Taken" value={String(student.testCount)} />
        <InfoBlock label="Assigned On" value={new Date(student.assignedAt).toLocaleDateString("en-IN")} />
      </div>
      <div className="px-5 pb-5">
        <button onClick={onAddFollowUp}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${GREEN}, #047857)` }}>
          <Plus className="w-4 h-4" /> Add Follow-Up Note
        </button>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: "#F8FAFF" }}>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="font-bold text-sm" style={{ color: NAVY }}>{value}</div>
    </div>
  );
}

function AlertCard({ student, level, onFollowUp }: { student: Student; level: "at-risk" | "attention"; onFollowUp: () => void }) {
  const isAtRisk = level === "at-risk";
  const alerts: string[] = [];
  if (student.daysSinceLogin > 7) alerts.push(`🔴 No login for ${student.daysSinceLogin} days`);
  if (student.hwCompletion < 50) alerts.push(`🔴 Homework completion only ${student.hwCompletion}%`);
  if (student.testCount === 0) alerts.push("🔴 No tests attempted");
  if (alerts.length === 0) alerts.push(isAtRisk ? "🔴 Student at risk — needs immediate attention" : "⚠️ Student needs attention");

  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm"
      style={{ borderColor: isAtRisk ? "#FCA5A5" : "#FDE68A" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isAtRisk ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
              {isAtRisk ? "AT RISK" : "NEEDS ATTENTION"}
            </span>
            <span className="font-black text-sm" style={{ color: NAVY }}>{student.name}</span>
            <span className="text-xs text-gray-400">Grade {student.grade}</span>
          </div>
          <div className="space-y-1">
            {alerts.map((a, i) => (
              <p key={i} className="text-xs text-gray-600">{a}</p>
            ))}
          </div>
        </div>
        <button onClick={onFollowUp}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold transition-all hover:opacity-90"
          style={{ background: "#059669" }}>
          <MessageSquare className="w-3 h-3" /> Follow Up
        </button>
      </div>
    </div>
  );
}
