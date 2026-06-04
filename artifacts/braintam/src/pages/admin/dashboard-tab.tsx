import { useState, useEffect } from "react";
import {
  Users, GraduationCap, BookOpen, Video, FileText, CheckSquare,
  Zap, TrendingUp, UserCheck, RefreshCw,
} from "lucide-react";

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

interface DashboardKPIs {
  totalStudents: number;
  totalTeachers: number;
  activeCourses: number;
  liveClassesThisWeek: number;
  hwSubmittedThisWeek: number;
  testsCompletedThisWeek: number;
  activeStudentsToday: number;
  studentsEarningXPToday: number;
  totalEnrollments: number;
}

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
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/dashboard");
      if (r.ok) setKpis(await r.json());
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }

  useEffect(() => { void load(); }, []);

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black" style={{ color: NAVY }}>Admin Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-8 w-16 bg-gray-100 rounded-lg mb-1" />
              <div className="h-3 w-24 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : kpis ? (
        <>
          {/* Section: Platform Overview */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Platform Overview</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KPICard label="Total Students" value={kpis.totalStudents} sub="Registered learners" icon={Users} color="#22C55E" bg="#F0FDF4" />
              <KPICard label="Total Teachers" value={kpis.totalTeachers} sub="Active educators" icon={GraduationCap} color="#3B82F6" bg="#EFF6FF" />
              <KPICard label="Active Courses" value={kpis.activeCourses} sub="Live curriculum" icon={BookOpen} color={NAVY} bg="#EEF2FF" />
            </div>
          </div>

          {/* Section: This Week */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">This Week's Activity</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KPICard label="Live Classes Scheduled" value={kpis.liveClassesThisWeek} sub="Last 7 days" icon={Video} color="#8B5CF6" bg="#F5F3FF" />
              <KPICard label="Homework Submitted" value={kpis.hwSubmittedThisWeek} sub="Last 7 days" icon={FileText} color={ORANGE} bg="#FFF7ED" />
              <KPICard label="Tests Completed" value={kpis.testsCompletedThisWeek} sub="Last 7 days" icon={CheckSquare} color="#EC4899" bg="#FDF2F8" />
            </div>
          </div>

          {/* Section: Today's Pulse */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Today's Pulse</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KPICard label="Active Students Today" value={kpis.activeStudentsToday} sub="Logged in today" icon={UserCheck} color="#06B6D4" bg="#ECFEFF" />
              <KPICard label="Students Earning XP" value={kpis.studentsEarningXPToday} sub="XP activity today" icon={Zap} color="#F59E0B" bg="#FFFBEB" />
              <KPICard label="Total Enrollments" value={kpis.totalEnrollments} sub="All time" icon={TrendingUp} color="#10B981" bg="#ECFDF5" />
            </div>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-gray-300 text-right">
            Last updated: {lastRefresh.toLocaleTimeString("en-IN")}
          </p>
        </>
      ) : (
        <div className="py-20 text-center text-gray-400 text-sm">Failed to load dashboard metrics. <button onClick={load} className="underline text-orange-500">Retry</button></div>
      )}
    </div>
  );
}
