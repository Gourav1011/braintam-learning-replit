import { useState, useEffect } from "react";
import {
  Users, GraduationCap, BookOpen, Video, FileText, CheckSquare,
  Zap, TrendingUp, UserCheck, RefreshCw, UserCheck2, Shield,
  ChevronDown,
} from "lucide-react";
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

interface GradeRow { grade: number; count: number; }
interface TeacherRow { id: number; name: string; email: string | null; isActive: boolean; courseCount: number; lcCount: number; }
interface MentorRow { id: number; name: string; email: string | null; isActive: boolean; studentCount: number; }

interface DashboardKPIs {
  totalStudents: number;
  totalTeachers: number;
  totalMentors: number;
  totalAdmins: number;
  activeCourses: number;
  liveClassesThisWeek: number;
  hwSubmittedThisWeek: number;
  testsCompletedThisWeek: number;
  activeStudentsToday: number;
  studentsEarningXPToday: number;
  totalEnrollments: number;
  gradeBreakdown: GradeRow[];
  teacherBreakdown: TeacherRow[];
  mentorBreakdown: MentorRow[];
}

type ViewMode = "overview" | "teachers" | "mentors" | "grades";

function KPICard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <TrendingUp className="w-4 h-4 text-gray-200" />
      </div>
      <div className="text-3xl font-black mb-0.5" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export function DashboardTab() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await apiFetch("/admin/dashboard");
      if (r.ok) {
        setKpis(await r.json());
      } else {
        const body = await r.json().catch(() => ({}));
        setErr(body.error ?? `Server error ${r.status}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }

  useEffect(() => { void load(); }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
    { value: "overview", label: "Platform Overview" },
    { value: "grades",   label: "Class / Grade Wise" },
    { value: "teachers", label: "Teacher Wise" },
    { value: "mentors",  label: "Mentor Wise" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black" style={{ color: NAVY }}>Admin Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View dropdown */}
          <div className="relative">
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as ViewMode)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white outline-none focus:border-orange-400 cursor-pointer"
              style={{ color: NAVY }}
            >
              {VIEW_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-8 w-16 bg-gray-100 rounded-lg mb-1" />
              <div className="h-3 w-24 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : kpis ? (
        <>
          {/* ── Overview ── */}
          {viewMode === "overview" && (
            <>
              {/* Team headcount */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Team & Learners</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard label="Total Students" value={kpis.totalStudents} sub="Active learners" icon={Users} color="#22C55E" bg="#F0FDF4" />
                  <KPICard label="Total Teachers" value={kpis.totalTeachers} sub="Active educators" icon={GraduationCap} color="#3B82F6" bg="#EFF6FF" />
                  <KPICard label="Total Mentors" value={kpis.totalMentors} sub="Student success mgrs" icon={UserCheck2} color={GREEN} bg="#ECFDF5" />
                  <KPICard label="Total Admins" value={kpis.totalAdmins} sub="Portal administrators" icon={Shield} color="#8B5CF6" bg="#F5F3FF" />
                </div>
              </div>

              {/* Platform */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Platform</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <KPICard label="Active Courses" value={kpis.activeCourses} sub="Live curriculum" icon={BookOpen} color={NAVY} bg="#EEF2FF" />
                  <KPICard label="Total Enrollments" value={kpis.totalEnrollments} sub="All time" icon={TrendingUp} color="#10B981" bg="#ECFDF5" />
                  <KPICard label="Active Students Today" value={kpis.activeStudentsToday} sub="Logged in today" icon={UserCheck} color="#06B6D4" bg="#ECFEFF" />
                </div>
              </div>

              {/* This week */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">This Week's Activity</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <KPICard label="Live Classes Scheduled" value={kpis.liveClassesThisWeek} sub="Last 7 days" icon={Video} color="#8B5CF6" bg="#F5F3FF" />
                  <KPICard label="Homework Submitted" value={kpis.hwSubmittedThisWeek} sub="Last 7 days" icon={FileText} color={ORANGE} bg="#FFF7ED" />
                  <KPICard label="Tests Completed" value={kpis.testsCompletedThisWeek} sub="Last 7 days" icon={CheckSquare} color="#EC4899" bg="#FDF2F8" />
                </div>
              </div>

              {/* XP */}
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Today's Pulse</p>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 max-w-sm">
                  <KPICard label="Students Earning XP" value={kpis.studentsEarningXPToday} sub="XP activity today" icon={Zap} color="#F59E0B" bg="#FFFBEB" />
                </div>
              </div>
            </>
          )}

          {/* ── Grade / Class Wise ── */}
          {viewMode === "grades" && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Students by Class / Grade</p>
                {kpis.gradeBreakdown.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">No student data yet</div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-3 gap-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                      <div className="text-xs font-bold text-gray-500">Grade / Class</div>
                      <div className="text-xs font-bold text-gray-500 text-center">Students</div>
                      <div className="text-xs font-bold text-gray-500 text-right">Distribution</div>
                    </div>
                    {kpis.gradeBreakdown.map(row => {
                      const pct = kpis.totalStudents > 0 ? Math.round((row.count / kpis.totalStudents) * 100) : 0;
                      return (
                        <div key={row.grade} className="grid grid-cols-3 gap-0 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs"
                              style={{ background: `linear-gradient(135deg, ${NAVY}, #1e40af)` }}>
                              {row.grade}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: NAVY }}>Grade {row.grade}</span>
                          </div>
                          <div className="text-center font-black text-lg" style={{ color: ORANGE }}>{row.count}</div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="flex-1 max-w-[80px] bg-gray-100 rounded-full h-2">
                                <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: ORANGE }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-500">Total</span>
                      <span className="text-sm font-black" style={{ color: NAVY }}>{kpis.totalStudents} students</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Mentor assignments by grade — derived from mentor breakdowns */}
              {kpis.mentorBreakdown.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Mentor Coverage</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KPICard label="Active Mentors" value={kpis.mentorBreakdown.filter(m => m.isActive).length} sub="Covering students" icon={UserCheck2} color={GREEN} bg="#ECFDF5" />
                    <KPICard label="Students Assigned" value={kpis.mentorBreakdown.reduce((s, m) => s + m.studentCount, 0)} sub="Under mentor care" icon={Users} color="#3B82F6" bg="#EFF6FF" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Teacher Wise ── */}
          {viewMode === "teachers" && (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Teacher Breakdown</p>
              {kpis.teacherBreakdown.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">No teachers yet</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-4 gap-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <div className="col-span-2 text-xs font-bold text-gray-500">Teacher</div>
                    <div className="text-xs font-bold text-gray-500 text-center">Courses</div>
                    <div className="text-xs font-bold text-gray-500 text-center">Live Classes</div>
                  </div>
                  {kpis.teacherBreakdown.map(t => (
                    <div key={t.id} className="grid grid-cols-4 gap-0 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors">
                      <div className="col-span-2 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                          style={{ background: t.isActive ? `linear-gradient(135deg, #3B82F6, #1d4ed8)` : "#9CA3AF" }}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: NAVY }}>{t.name}</div>
                          <div className="text-xs text-gray-400">{t.email ?? "—"}</div>
                        </div>
                        {!t.isActive && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full ml-1">Inactive</span>}
                      </div>
                      <div className="text-center">
                        <span className="font-black text-lg" style={{ color: NAVY }}>{t.courseCount}</span>
                        <div className="text-[10px] text-gray-400">courses</div>
                      </div>
                      <div className="text-center">
                        <span className="font-black text-lg" style={{ color: ORANGE }}>{t.lcCount}</span>
                        <div className="text-[10px] text-gray-400">classes</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Mentor Wise ── */}
          {viewMode === "mentors" && (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Mentor Breakdown</p>
              {kpis.mentorBreakdown.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">No mentors yet — create one from the Mentors tab</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-3 gap-0 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                    <div className="col-span-2 text-xs font-bold text-gray-500">Mentor</div>
                    <div className="text-xs font-bold text-gray-500 text-center">Students Assigned</div>
                  </div>
                  {kpis.mentorBreakdown.map(m => {
                    const pct = kpis.totalStudents > 0 ? Math.round((m.studentCount / kpis.totalStudents) * 100) : 0;
                    return (
                      <div key={m.id} className="grid grid-cols-3 gap-0 px-4 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-2 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                            style={{ background: m.isActive ? `linear-gradient(135deg, ${GREEN}, #047857)` : "#9CA3AF" }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: NAVY }}>{m.name}</div>
                            <div className="text-xs text-gray-400">{m.email ?? "—"}</div>
                          </div>
                          {!m.isActive && <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full ml-1">Inactive</span>}
                        </div>
                        <div className="text-center">
                          <span className="font-black text-lg" style={{ color: GREEN }}>{m.studentCount}</span>
                          <div className="text-[10px] text-gray-400">students</div>
                          <div className="mx-auto mt-1 max-w-[60px] bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct * 3, 100)}%`, background: GREEN }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">Total assigned</span>
                    <span className="text-sm font-black" style={{ color: NAVY }}>
                      {kpis.mentorBreakdown.reduce((s, m) => s + m.studentCount, 0)} of {kpis.totalStudents} students
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-gray-300 text-right">Last updated: {lastRefresh.toLocaleTimeString("en-IN")}</p>
        </>
      ) : (
        <div className="py-20 text-center">
          <p className="text-red-500 text-sm font-medium mb-1">Failed to load dashboard metrics</p>
          {err && <p className="text-xs text-gray-400 mb-3">{err}</p>}
          <button onClick={load} className="text-sm underline text-orange-500">Retry</button>
        </div>
      )}
    </div>
  );
}
