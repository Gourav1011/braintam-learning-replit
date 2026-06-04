import { useState, useEffect } from "react";
import { Search, RefreshCw, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return fetch(`${base}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

interface TeacherStats {
  id: number; name: string; email: string | null;
  coursesAssigned: number; classesTotal: number; hwGraded: number;
}

export function TeacherAnalyticsTab() {
  const [teachers, setTeachers] = useState<TeacherStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/analytics/teachers");
      if (r.ok) setTeachers(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q);
  });

  const totalClasses = filtered.reduce((s, t) => s + t.classesTotal, 0);
  const totalGraded = filtered.reduce((s, t) => s + t.hwGraded, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Teacher Analytics</h2>
          <p className="text-xs text-gray-400 mt-0.5">Performance overview per teacher</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Teachers", value: filtered.length, color: "#3B82F6" },
            { label: "Classes Taught", value: totalClasses, color: NAVY },
            { label: "HW Graded", value: totalGraded, color: "#22C55E" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input placeholder="Search teacher by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead>
            <tr style={{ background: "#F8FAFF" }} className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Teacher</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Courses</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Classes Taken</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">HW Graded</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 animate-pulse">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded-full" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-xs">
                <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                {search ? "No teachers match your search." : "No teachers found."}
              </td></tr>
            ) : filtered.map(t => {
              const total = t.coursesAssigned + t.classesTotal + t.hwGraded;
              const score = total === 0 ? 0 : Math.min(100, Math.round(
                (t.coursesAssigned * 10 + t.classesTotal * 5 + t.hwGraded * 2) / Math.max(1, t.coursesAssigned) / 1.5
              ));
              return (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: NAVY }}>{t.name[0]?.toUpperCase()}</div>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: NAVY }}>{t.name}</div>
                        <div className="text-[10px] text-gray-400">{t.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold" style={{ color: "#8B5CF6" }}>{t.coursesAssigned}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold" style={{ color: NAVY }}>{t.classesTotal}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-green-600">{t.hwGraded}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-12 rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: ORANGE }} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: ORANGE }}>{score}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
