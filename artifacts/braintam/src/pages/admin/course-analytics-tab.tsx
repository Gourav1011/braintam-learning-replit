import { useState, useEffect } from "react";
import { Search, RefreshCw, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
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

interface CourseStats {
  id: number; title: string; grade: number; teacher: string | null;
  enrolled: number; hwTotal: number; hwSubmitted: number; hwRate: number;
  testTotal: number; testSubmitted: number; testRate: number; avgScore: number | null;
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-9 text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export function CourseAnalyticsTab() {
  const [courses, setCourses] = useState<CourseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/analytics/courses");
      if (r.ok) setCourses(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.title.toLowerCase().includes(q) || (c.teacher ?? "").toLowerCase().includes(q);
    const matchGrade = gradeFilter === "all" || String(c.grade) === gradeFilter;
    return matchSearch && matchGrade;
  });

  const totalEnrolled = filtered.reduce((s, c) => s + c.enrolled, 0);
  const avgHwRate = filtered.length ? Math.round(filtered.reduce((s, c) => s + c.hwRate, 0) / filtered.length) : 0;
  const avgTestRate = filtered.length ? Math.round(filtered.reduce((s, c) => s + c.testRate, 0) / filtered.length) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Course Analytics</h2>
          <p className="text-xs text-gray-400 mt-0.5">Completion rates and engagement per course</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Courses", value: filtered.length, color: NAVY },
            { label: "Total Enrolled", value: totalEnrolled, color: "#22C55E" },
            { label: "Avg HW Rate", value: `${avgHwRate}%`, color: ORANGE },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input placeholder="Search courses or teacher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
          className="h-8 text-xs px-2 rounded-lg border border-gray-200 bg-white text-gray-600">
          <option value="all">All Grades</option>
          {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr style={{ background: "#F8FAFF" }} className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Course</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-16">Grade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Teacher</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">Enrolled</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-40">HW Completion</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-40">Test Completion</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-24">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 animate-pulse">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded-full" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-xs">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                {search ? "No courses match your search." : "No courses found."}
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-xs" style={{ color: NAVY }}>{c.title}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">Gr {c.grade}</td>
                <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-24">{c.teacher ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold" style={{ color: NAVY }}>{c.enrolled}</span>
                </td>
                <td className="px-4 py-3">
                  <RateBar value={c.hwRate} color="#3B82F6" />
                  <div className="text-[10px] text-gray-400 mt-0.5">{c.hwSubmitted}/{c.hwTotal} submitted</div>
                </td>
                <td className="px-4 py-3">
                  <RateBar value={c.testRate} color={ORANGE} />
                  <div className="text-[10px] text-gray-400 mt-0.5">{c.testSubmitted}/{c.testTotal} taken</div>
                </td>
                <td className="px-4 py-3">
                  {c.avgScore != null ? (
                    <span className={`text-sm font-bold ${c.avgScore >= 70 ? "text-green-600" : c.avgScore >= 40 ? "text-orange-500" : "text-red-500"}`}>
                      {c.avgScore}%
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-50 text-right">
            <span className="text-[10px] text-gray-400">
              {filtered.length} course{filtered.length !== 1 ? "s" : ""} · Avg Test Rate: {avgTestRate}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
