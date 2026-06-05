import { useState, useEffect } from "react";
import { X, BookOpen, Star, Zap, Clock, CheckCircle, AlertCircle } from "lucide-react";

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

interface Profile {
  id: number; name: string; email: string | null; phone: string | null;
  grade: number; school: string | null; board: string | null; state: string | null;
  points: number; rank: number | null; streakDays: number; isActive: boolean;
  createdAt: string; lastLoginAt: string | null;
}
interface EnrolledCourse { courseId: number; title: string; grade: number; teacher: string | null; enrolledAt: string; }
interface HwItem { id: number; title: string; status: string; marks: number | null; submittedAt: string; }
interface TestItem { id: number; title: string; score: number | null; maxScore: number | null; submittedAt: string; }
interface AssignItem { id: number; title: string; status: string; marks: number | null; submittedAt: string; }
interface XPItem { amount: number; actionType: string; note: string | null; createdAt: string; }

interface Student360Data {
  profile: Profile;
  enrolledCourses: EnrolledCourse[];
  recentHw: HwItem[];
  recentTests: TestItem[];
  recentAssignments: AssignItem[];
  xpHistory: XPItem[];
  spaceLevel: string;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Daily Login", HOMEWORK_SUBMITTED: "Homework", CORRECT_ANSWER: "Test Answer",
  WRONG_ANSWER: "Wrong Answer", TEST_COMPLETED: "Test Completed",
};

const SPACE_COLORS: Record<string, string> = {
  "Universe Champion": "#8B5CF6", "Galaxy Master": "#3B82F6",
  "Saturn Explorer": "#F59E0B", "Mars Explorer": "#EF4444",
  "Moon Explorer": "#6B7280", "Earth Explorer": "#22C55E",
};

type InnerTab = "overview" | "courses" | "activity" | "xp";

export function Student360Modal({ userId, userName, userEmail, onClose }: { userId: number; userName: string; userEmail: string | null; onClose: () => void }) {
  const [data, setData] = useState<Student360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<InnerTab>("overview");

  function load() {
    setLoading(true);
    setFetchError(null);
    apiFetch(`/admin/students/${userId}/360`)
      .then(async r => {
        if (r.ok) return r.json() as Promise<Student360Data>;
        const body = await r.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Error ${r.status}`);
      })
      .then((d: Student360Data) => { setData(d); })
      .catch((e: unknown) => { setFetchError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [userId]);

  const p = data?.profile;
  const levelColor = data ? (SPACE_COLORS[data.spaceLevel] ?? NAVY) : NAVY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shrink-0"
                style={{ background: NAVY }}>
                {(p?.name ?? userName)?.[0]?.toUpperCase() ?? "?"}
              </div>
              {loading ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="h-5 w-36 bg-gray-100 rounded-lg" />
                  <div className="h-3.5 w-48 bg-gray-100 rounded-lg" />
                  <div className="h-3.5 w-28 bg-gray-100 rounded-lg" />
                </div>
              ) : p ? (
                <div>
                  <div className="font-black text-base" style={{ color: NAVY }}>{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.email ?? p.phone ?? "—"}</div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {p.grade > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Grade {p.grade}</span>
                    )}
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-white" style={{ background: levelColor }}>
                      {data?.spaceLevel}
                    </span>
                    {!p.isActive && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Inactive</span>}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-black text-base" style={{ color: NAVY }}>{userName || "Student"}</div>
                  {userEmail && <div className="text-xs text-gray-500 mt-0.5">{userEmail}</div>}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stat chips */}
          {p && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {[
                { label: "Points", value: p.points ?? 0, color: ORANGE },
                { label: "Streak", value: `${p.streakDays}d`, color: "#F59E0B" },
                { label: "Rank", value: p.rank ? `#${p.rank}` : "—", color: "#8B5CF6" },
                { label: "Courses", value: data?.enrolledCourses.length ?? 0, color: "#22C55E" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50">
                  <span className="text-sm font-black" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[11px] text-gray-400 font-medium">{s.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] text-gray-500">
                  Last login: {p.lastLoginAt ? new Date(p.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
                </span>
              </div>
            </div>
          )}

          {/* Inner tabs */}
          <div className="flex gap-1 mt-4">
            {(["overview", "courses", "activity", "xp"] as InnerTab[]).map(t => (
              <button key={t} onClick={() => setInnerTab(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors"
                style={innerTab === t ? { background: NAVY, color: "white" } : { color: "#6B7280" }}>
                {t === "xp" ? "XP History" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="text-sm font-semibold text-gray-700">Could not load student data</div>
              {fetchError && <div className="text-xs text-red-500 text-center max-w-xs">{fetchError}</div>}
              <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {innerTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "Email", value: p?.email ?? "—" },
                      { label: "Phone", value: p?.phone ?? "—" },
                      { label: "Grade", value: p?.grade ? `Grade ${p.grade}` : "—" },
                      { label: "School", value: p?.school ?? "—" },
                      { label: "Board", value: p?.board ?? "—" },
                      { label: "State", value: p?.state ?? "—" },
                      { label: "Joined", value: p?.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—" },
                      { label: "User ID", value: `#${p?.id}` },
                    ].map(f => (
                      <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 text-[10px] font-medium mb-0.5">{f.label}</div>
                        <div className="font-semibold text-gray-700 truncate">{f.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-700 mb-2">Space Journey Progress</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: levelColor + "22" }}>
                        <Star className="w-5 h-5" style={{ color: levelColor }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: levelColor }}>{data.spaceLevel}</div>
                        <div className="text-xs text-gray-500">{p?.points ?? 0} XP points earned</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Courses Tab */}
              {innerTab === "courses" && (
                <div className="space-y-2">
                  {data.enrolledCourses.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                      <BookOpen className="w-8 h-8 text-gray-200" />
                      <span>No courses enrolled yet</span>
                    </div>
                  ) : data.enrolledCourses.map(c => (
                    <div key={c.courseId} className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: NAVY + "15" }}>
                        <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: NAVY }}>{c.title}</div>
                        <div className="text-xs text-gray-400">Grade {c.grade} · {c.teacher ?? "—"}</div>
                      </div>
                      <div className="text-[10px] text-gray-400 shrink-0">{new Date(c.enrolledAt).toLocaleDateString("en-IN")}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Activity Tab */}
              {innerTab === "activity" && (
                <div className="space-y-4">
                  {/* Homework */}
                  {data.recentHw.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Homework</p>
                      <div className="space-y-1.5">
                        {data.recentHw.map(h => (
                          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                            {h.status === "graded" ? (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: NAVY }}>{h.title}</div>
                              <div className="text-[10px] text-gray-400">{new Date(h.submittedAt).toLocaleDateString("en-IN")}</div>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${h.status === "graded" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                              {h.status === "graded" && h.marks != null ? `${h.marks}m` : h.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tests */}
                  {data.recentTests.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Tests</p>
                      <div className="space-y-1.5">
                        {data.recentTests.map(t => {
                          const pct = t.score != null && t.maxScore ? Math.round((t.score / t.maxScore) * 100) : null;
                          return (
                            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                              <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate" style={{ color: NAVY }}>{t.title}</div>
                                <div className="text-[10px] text-gray-400">{new Date(t.submittedAt).toLocaleDateString("en-IN")}</div>
                              </div>
                              {pct != null && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${pct >= 70 ? "bg-green-100 text-green-700" : pct >= 40 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                                  {pct}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Assignments */}
                  {data.recentAssignments.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Assignments</p>
                      <div className="space-y-1.5">
                        {data.recentAssignments.map(a => (
                          <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                            <CheckCircle className={`w-4 h-4 shrink-0 ${a.status === "graded" ? "text-green-500" : "text-blue-400"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate" style={{ color: NAVY }}>{a.title}</div>
                              <div className="text-[10px] text-gray-400">{new Date(a.submittedAt).toLocaleDateString("en-IN")}</div>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${a.status === "graded" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                              {a.status === "graded" && a.marks != null ? `${a.marks}m` : a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.recentHw.length === 0 && data.recentTests.length === 0 && data.recentAssignments.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">No activity recorded yet.</div>
                  )}
                </div>
              )}

              {/* XP Tab */}
              {innerTab === "xp" && (
                <div className="space-y-2">
                  {data.xpHistory.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                      <Zap className="w-8 h-8 text-gray-200" />
                      <span>No XP activity yet</span>
                    </div>
                  ) : data.xpHistory.map((x, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${x.amount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <Zap className={`w-3.5 h-3.5 ${x.amount > 0 ? "text-green-600" : "text-red-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700">{ACTION_LABELS[x.actionType] ?? x.actionType}</div>
                        {x.note && <div className="text-[10px] text-gray-400 truncate">{x.note}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-sm font-bold ${x.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {x.amount > 0 ? "+" : ""}{x.amount}
                        </span>
                        <div className="text-[10px] text-gray-400">{new Date(x.createdAt).toLocaleDateString("en-IN")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 px-6 py-3 border-t border-gray-100">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
