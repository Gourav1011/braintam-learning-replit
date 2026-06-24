import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, UserX, Clock, FileX } from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = API_BASE;
  return fetch(`${base}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

interface HealthStudent {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; createdAt?: string; lastLoginAt?: string | null;
}
interface HealthData {
  neverLoggedIn: HealthStudent[];
  inactiveStudents: HealthStudent[];
  noTestStudents: HealthStudent[];
  counts: { neverLoggedIn: number; inactiveStudents: number; noTestStudents: number };
}

function StudentList({ students, emptyMsg }: { students: HealthStudent[]; emptyMsg: string }) {
  if (students.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-4">{emptyMsg}</p>;
  }
  return (
    <div className="divide-y divide-gray-50">
      {students.map(s => (
        <div key={s.id} className="flex items-center gap-3 py-2.5 px-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: NAVY }}>{s.name[0]?.toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: NAVY }}>{s.name}</div>
            <div className="text-[10px] text-gray-400">{s.email ?? s.phone ?? "—"} · {s.grade > 0 ? `Grade ${s.grade}` : "—"}</div>
          </div>
          {s.lastLoginAt && (
            <div className="text-[10px] text-orange-400 shrink-0">{new Date(s.lastLoginAt).toLocaleDateString("en-IN")}</div>
          )}
          {s.createdAt && !s.lastLoginAt && (
            <div className="text-[10px] text-gray-300 shrink-0">Joined {new Date(s.createdAt).toLocaleDateString("en-IN")}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function HealthTab() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/health");
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const counts = data?.counts ?? { neverLoggedIn: 0, inactiveStudents: 0, noTestStudents: 0 };
  const totalAtRisk = counts.neverLoggedIn + counts.inactiveStudents + counts.noTestStudents;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Learning Health Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">Identify students who need attention</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Alert banner */}
      {!loading && totalAtRisk > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
          <span className="text-sm font-semibold text-yellow-800">
            {totalAtRisk} student{totalAtRisk !== 1 ? "s" : ""} need attention across all categories.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Never Logged In", value: counts.neverLoggedIn, icon: UserX, color: "#EF4444", bg: "#FEF2F2" },
          { label: "Inactive 7+ Days", value: counts.inactiveStudents, icon: Clock, color: ORANGE, bg: "#FFF7ED" },
          { label: "No Test Activity", value: counts.noTestStudents, icon: FileX, color: "#8B5CF6", bg: "#F5F3FF" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: s.color }}>
                {loading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : s.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Detail sections */}
      <div className="space-y-4">
        {/* Never Logged In */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-50" style={{ background: "#FFF5F5" }}>
            <UserX className="w-4 h-4 text-red-500" />
            <span className="text-sm font-bold text-red-700">Never Logged In</span>
            {!loading && <span className="ml-auto text-xs text-red-400">{counts.neverLoggedIn} students</span>}
          </div>
          <div className="px-5 py-2">
            {loading ? (
              <div className="py-4 space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
              </div>
            ) : (
              <StudentList
                students={data?.neverLoggedIn ?? []}
                emptyMsg="All students have logged in at least once."
              />
            )}
          </div>
        </div>

        {/* Inactive 7+ Days */}
        <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-orange-50" style={{ background: "#FFFBEB" }}>
            <Clock className="w-4 h-4" style={{ color: ORANGE }} />
            <span className="text-sm font-bold" style={{ color: "#92400E" }}>Inactive for 7+ Days</span>
            {!loading && <span className="ml-auto text-xs text-orange-400">{counts.inactiveStudents} students</span>}
          </div>
          <div className="px-5 py-2">
            {loading ? (
              <div className="py-4 space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
              </div>
            ) : (
              <StudentList
                students={data?.inactiveStudents ?? []}
                emptyMsg="All students have been active in the last 7 days."
              />
            )}
          </div>
        </div>

        {/* No Test Activity */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-purple-50" style={{ background: "#FAF5FF" }}>
            <FileX className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-bold text-purple-700">No Test Submissions</span>
            {!loading && <span className="ml-auto text-xs text-purple-400">{counts.noTestStudents} students</span>}
          </div>
          <div className="px-5 py-2">
            {loading ? (
              <div className="py-4 space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
              </div>
            ) : (
              <StudentList
                students={data?.noTestStudents ?? []}
                emptyMsg="All students have submitted at least one test."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
