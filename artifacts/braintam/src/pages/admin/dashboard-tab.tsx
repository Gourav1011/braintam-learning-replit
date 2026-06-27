import { useState, useEffect } from "react";
import {
  Users, GraduationCap, BookOpen, Video, FileText, CheckSquare,
  Zap, TrendingUp, UserCheck, RefreshCw, UserCheck2, Shield, ChevronDown,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

interface GradeRow   { grade: number; count: number; }
interface TeacherRow { id: number; name: string; email: string | null; isActive: boolean; courseCount: number; lcCount: number; }
interface MentorRow  { id: number; name: string; email: string | null; isActive: boolean; studentCount: number; }

interface DashboardKPIs {
  totalStudents: number; totalTeachers: number; totalMentors: number; totalAdmins: number;
  activeCourses: number; liveClassesThisWeek: number; hwSubmittedThisWeek: number;
  testsCompletedThisWeek: number; activeStudentsToday: number; studentsEarningXPToday: number;
  totalEnrollments: number; gradeBreakdown: GradeRow[]; teacherBreakdown: TeacherRow[]; mentorBreakdown: MentorRow[];
}

type ViewMode = "overview" | "teachers" | "mentors" | "grades";

function Stat({ label, value, icon: Icon, color, bg }: {
  label: string; value: number | string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm flex items-center gap-2.5 min-w-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-black leading-none" style={{ color }}>{value}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">{label}</div>
      </div>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded-full">{label}</span>
  );
}

export function DashboardTab() {
  const [kpis, setKpis]       = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  async function load() {
    setLoading(true); setErr(null);
    try {
      const r = await apiFetch("/admin/dashboard");
      if (r.ok) setKpis(await r.json());
      else { const b = await r.json().catch(() => ({})); setErr((b as { error?: string }).error ?? `Error ${r.status}`); }
    } catch (e) { setErr(e instanceof Error ? e.message : "Network error"); }
    finally { setLoading(false); setLastRefresh(new Date()); }
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
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Admin Dashboard</h2>
          <p className="text-[10px] text-gray-400">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={viewMode} onChange={e => setViewMode(e.target.value as ViewMode)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold bg-white outline-none focus:border-orange-400 cursor-pointer"
              style={{ color: NAVY }}>
              {VIEW_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !kpis ? (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 h-12 animate-pulse" />
          ))}
        </div>
      ) : kpis ? (
        <>
          {viewMode === "overview" && (
            <div className="space-y-3">
              {/* Row 1: Team headcount */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><Tag label="Team & Learners" /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label="Students"   value={kpis.totalStudents}  icon={Users}       color="#22C55E"  bg="#F0FDF4" />
                  <Stat label="Teachers"   value={kpis.totalTeachers}  icon={GraduationCap} color="#3B82F6" bg="#EFF6FF" />
                  <Stat label="Mentors"    value={kpis.totalMentors}   icon={UserCheck2}  color={GREEN}    bg="#ECFDF5" />
                  <Stat label="Admins"     value={kpis.totalAdmins}    icon={Shield}      color="#8B5CF6"  bg="#F5F3FF" />
                </div>
              </div>

              {/* Row 2: Platform stats */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><Tag label="Platform" /></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat label="Active Courses"      value={kpis.activeCourses}       icon={BookOpen}   color={NAVY}     bg="#EEF2FF" />
                  <Stat label="Total Enrollments"   value={kpis.totalEnrollments}    icon={TrendingUp} color="#10B981"  bg="#ECFDF5" />
                  <Stat label="Active Today"        value={kpis.activeStudentsToday} icon={UserCheck}  color="#06B6D4"  bg="#ECFEFF" />
                </div>
              </div>

              {/* Row 3: This week + pulse in one row */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><Tag label="This Week" /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Stat label="Live Classes"   value={kpis.liveClassesThisWeek}   icon={Video}       color="#8B5CF6"  bg="#F5F3FF" />
                  <Stat label="HW Submitted"   value={kpis.hwSubmittedThisWeek}   icon={FileText}    color={ORANGE}   bg="#FFF7ED" />
                  <Stat label="Tests Done"     value={kpis.testsCompletedThisWeek} icon={CheckSquare} color="#EC4899"  bg="#FDF2F8" />
                  <Stat label="Earning XP Today" value={kpis.studentsEarningXPToday} icon={Zap}      color="#F59E0B"  bg="#FFFBEB" />
                </div>
              </div>
            </div>
          )}

          {viewMode === "grades" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1"><Tag label="Students by Grade" /></div>
              {kpis.gradeBreakdown.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-100 text-gray-400 text-sm">No student data yet</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Grade</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide text-center">Students</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide text-right">Share</div>
                  </div>
                  {kpis.gradeBreakdown.map(row => {
                    const pct = kpis.totalStudents > 0 ? Math.round((row.count / kpis.totalStudents) * 100) : 0;
                    return (
                      <div key={row.grade} className="grid grid-cols-3 px-4 py-2 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white font-black text-[10px]"
                            style={{ background: `linear-gradient(135deg, ${NAVY}, #1e40af)` }}>{row.grade}</div>
                          <span className="font-semibold" style={{ color: NAVY }}>Grade {row.grade}</span>
                        </div>
                        <div className="text-center font-black text-sm" style={{ color: ORANGE }}>{row.count}</div>
                        <div className="flex items-center gap-2 justify-end">
                          <div className="flex-1 max-w-[60px] bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: ORANGE }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-7 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-gray-500">Total</span>
                    <span className="text-xs font-black" style={{ color: NAVY }}>{kpis.totalStudents} students</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === "teachers" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1"><Tag label="Teacher Breakdown" /></div>
              {kpis.teacherBreakdown.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-100 text-gray-400 text-sm">No teachers yet</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <div className="col-span-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Teacher</div>
                    <div className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-wide">Courses</div>
                    <div className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-wide">Classes</div>
                  </div>
                  {kpis.teacherBreakdown.map(t => (
                    <div key={t.id} className="grid grid-cols-4 px-4 py-2.5 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50">
                      <div className="col-span-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                          style={{ background: t.isActive ? `linear-gradient(135deg, #3B82F6, #1d4ed8)` : "#9CA3AF" }}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: NAVY }}>{t.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">{t.email ?? "—"}</div>
                        </div>
                        {!t.isActive && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">Inactive</span>}
                      </div>
                      <div className="text-center">
                        <span className="font-black text-sm" style={{ color: NAVY }}>{t.courseCount}</span>
                        <div className="text-[9px] text-gray-400">courses</div>
                      </div>
                      <div className="text-center">
                        <span className="font-black text-sm" style={{ color: ORANGE }}>{t.lcCount}</span>
                        <div className="text-[9px] text-gray-400">classes</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === "mentors" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1"><Tag label="Mentor Breakdown" /></div>
              {kpis.mentorBreakdown.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-gray-100 text-gray-400 text-sm">No mentors yet</div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <div className="col-span-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide">Mentor</div>
                    <div className="text-[10px] font-bold text-gray-500 text-center uppercase tracking-wide">Students</div>
                  </div>
                  {kpis.mentorBreakdown.map(m => {
                    const pct = kpis.totalStudents > 0 ? Math.round((m.studentCount / kpis.totalStudents) * 100) : 0;
                    return (
                      <div key={m.id} className="grid grid-cols-3 px-4 py-2.5 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50">
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0"
                            style={{ background: m.isActive ? `linear-gradient(135deg, ${GREEN}, #047857)` : "#9CA3AF" }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: NAVY }}>{m.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{m.email ?? "—"}</div>
                          </div>
                          {!m.isActive && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">Inactive</span>}
                        </div>
                        <div className="text-center">
                          <span className="font-black text-sm" style={{ color: GREEN }}>{m.studentCount}</span>
                          <div className="mx-auto mt-1 max-w-[50px] bg-gray-100 rounded-full h-1">
                            <div className="h-1 rounded-full" style={{ width: `${Math.min(pct * 3, 100)}%`, background: GREEN }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-gray-500">Total assigned</span>
                    <span className="text-xs font-black" style={{ color: NAVY }}>
                      {kpis.mentorBreakdown.reduce((s, m) => s + m.studentCount, 0)} / {kpis.totalStudents}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-[9px] text-gray-300 text-right">Updated: {lastRefresh.toLocaleTimeString("en-IN")}</p>
        </>
      ) : (
        <div className="py-16 text-center">
          <p className="text-red-500 text-sm font-medium mb-1">Failed to load dashboard</p>
          {err && <p className="text-xs text-gray-400 mb-3">{err}</p>}
          <button onClick={load} className="text-sm underline text-orange-500">Retry</button>
        </div>
      )}
    </div>
  );
}
