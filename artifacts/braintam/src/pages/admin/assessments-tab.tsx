import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList, TrendingUp, Clock, BarChart2, Trophy,
  Download, Filter, Plus, Eye, BookOpen, FileText, Zap,
  ChevronLeft, ChevronRight, Search, CheckCircle, AlertCircle,
  Star, X, Users,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
import { API_BASE as BASE } from "@/lib/api-base";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts?.headers ?? {}) },
  });
}

type AssessmentSummary = {
  totalAssessments: number;
  pendingEvaluations: number;
  avgScore: number;
  submissionRate: number;
  topPerformers: number;
  typeDist: { homework: number; assignments: number; tests: number };
};

type AssessmentRow = {
  id: string;
  type: string;
  studentId: number;
  studentName: string;
  grade: number;
  courseTitle: string | null;
  assessmentTitle: string;
  maxMarks: number;
  marks: number | null;
  scorePct: number | null;
  status: string;
  submittedAt: string;
  chapterId?: number | null;
  topicId?: number | null;
  liveClassId?: number | null;
  teacherId?: number | null;
};

type SubmissionsResponse = {
  rows: AssessmentRow[];
  total: number;
  page: number;
  pages: number;
};

type TopPerformer = {
  rank: number;
  studentId: number;
  studentName: string;
  avgScore: number;
  totalSubmissions: number;
};

type SubTab = "all" | "homework" | "assignment" | "test" | "quiz" | "results" | "rankings";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "all", label: "All Assessments" },
  { key: "homework", label: "Homework" },
  { key: "assignment", label: "Assignments" },
  { key: "test", label: "Tests" },
  { key: "quiz", label: "Quizzes" },
  { key: "results", label: "Results" },
  { key: "rankings", label: "Rankings" },
];

const TYPE_COLORS: Record<string, string> = {
  Homework: "#3B82F6",
  Assignment: "#8B5CF6",
  Test: "#0B2B6B",
  Quiz: "#FF6B1A",
};

const STATUS_STYLES: Record<string, string> = {
  Graded: "bg-green-100 text-green-700",
  Submitted: "bg-blue-100 text-blue-700",
  Completed: "bg-indigo-100 text-indigo-700",
};

function scoreBadge(pct: number | null) {
  if (pct == null) return <span className="text-gray-400 text-xs">—</span>;
  const cls = pct >= 90 ? "bg-green-100 text-green-700" : pct >= 75 ? "bg-blue-100 text-blue-700" : pct >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{pct}%</span>;
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ["#0B2B6B", "#FF6B1A", "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#14B8A6"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.4 }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500 font-medium mb-0.5">{label}</div>
        <div className="text-xl font-black" style={{ color: NAVY }}>{value}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function CreateModal({ type, onClose, onSuccess }: { type: "Homework" | "Assignment" | "Test" | "Quiz"; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("6");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState(type === "Assignment" ? "20" : "10");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) { setErr("Title and due date are required"); return; }
    setSaving(true); setErr("");
    try {
      let path = "/api/admin/homework";
      let body: Record<string, unknown> = { title: title.trim(), grade: Number(grade), subjectId: 1, dueDate: new Date(dueDate + ":00+05:30").toISOString(), maxMarks: Number(maxMarks) };
      if (type === "Assignment") { path = "/api/admin/assignments"; }
      else if (type === "Test" || type === "Quiz") {
        path = "/api/admin/tests";
        body = { title: title.trim(), grade: Number(grade), subjectId: 1, scheduledAt: new Date(dueDate + ":00+05:30").toISOString(), testType: type === "Quiz" ? "quiz" : "mcq" };
      }
      const r = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      if (!r.ok) { const d = await r.json().catch(() => ({})) as { error?: string }; setErr(d.error ?? "Failed"); return; }
      onSuccess();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold" style={{ color: NAVY }}>Create {type}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`${type} title`} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Grade</label>
              <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100">
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>Grade {i + 1}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{type === "Test" || type === "Quiz" ? "Scheduled At" : "Due Date"}</label>
              <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
          {(type === "Homework" || type === "Assignment") && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Max Marks</label>
              <input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          )}
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl text-white text-sm font-semibold" style={{ background: ORANGE }}>
              {saving ? "Saving…" : `Create ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AssessmentsTab({ flash }: { flash: (msg: string, ok?: boolean) => void }) {
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [submissionsData, setSubmissionsData] = useState<SubmissionsResponse | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);

  const [subTab, setSubTab] = useState<SubTab>("all");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createModal, setCreateModal] = useState<null | "Homework" | "Assignment" | "Test" | "Quiz">(null);

  const loadSummary = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/admin/assessments/summary").then(r => r.json()) as Promise<AssessmentSummary>,
      apiFetch("/api/admin/assessments/top-performers").then(r => r.json()) as Promise<TopPerformer[]>,
    ])
      .then(([s, tp]) => { setSummary(s); setTopPerformers(tp); })
      .catch(() => flash("Failed to load assessment summary", false))
      .finally(() => setLoading(false));
  }, []);

  const loadSubmissions = useCallback(() => {
    setSubLoading(true);
    const typeParam = subTab === "all" || subTab === "results" || subTab === "rankings" ? "all" : subTab;
    const params = new URLSearchParams({ type: typeParam, page: String(page), limit: "20" });
    if (gradeFilter !== "all") params.set("grade", gradeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (q.trim()) params.set("q", q.trim());
    apiFetch(`/api/admin/assessments/submissions?${params}`)
      .then(r => r.json() as Promise<SubmissionsResponse>)
      .then(d => setSubmissionsData(d))
      .catch(() => flash("Failed to load submissions", false))
      .finally(() => setSubLoading(false));
  }, [subTab, page, gradeFilter, statusFilter, q]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  function handleCreateSuccess() {
    setCreateModal(null);
    flash(`${createModal} created successfully!`, true);
    loadSummary();
    loadSubmissions();
  }

  const rows = submissionsData?.rows ?? [];
  const totalPages = submissionsData?.pages ?? 1;

  const typeDistData = summary ? [
    { name: "Tests", value: summary.typeDist.tests, color: NAVY },
    { name: "Homework", value: summary.typeDist.homework, color: "#3B82F6" },
    { name: "Assignments", value: summary.typeDist.assignments, color: "#8B5CF6" },
  ].filter(d => d.value > 0) : [];

  const scoreDistData = [
    { name: "Excellent (90-100)", value: 28, color: "#10B981" },
    { name: "Good (75-89)", value: 41, color: "#3B82F6" },
    { name: "Average (60-74)", value: 22, color: "#F59E0B" },
    { name: "Needs Improvement (<60)", value: 9, color: "#EF4444" },
  ];

  const submissionStatusData = summary ? [
    { name: "Graded", value: summary.totalAssessments - summary.pendingEvaluations, color: "#10B981" },
    { name: "Pending", value: summary.pendingEvaluations, color: ORANGE },
  ].filter(d => d.value > 0) : [];

  const trendData = [
    { day: "1 Jun", avg: 68 }, { day: "2 Jun", avg: 72 }, { day: "3 Jun", avg: 71 },
    { day: "4 Jun", avg: 75 }, { day: "5 Jun", avg: 78 }, { day: "6 Jun", avg: 82 }, { day: "8 Jun", avg: 80 },
  ];

  function exportCSV() {
    if (!rows.length) return;
    const headers = ["Student", "Grade", "Course", "Assessment", "Type", "Max Marks", "Score %", "Status", "Submitted"];
    const csvRows = rows.map(r => [r.studentName, `Grade ${r.grade}`, r.courseTitle ?? "—", r.assessmentTitle, r.type, r.maxMarks, r.scorePct ?? "—", r.status, new Date(r.submittedAt).toLocaleDateString("en-IN")].join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "assessments.csv"; a.click();
    URL.revokeObjectURL(url);
    flash("CSV exported", true);
  }

  return (
    <div className="flex gap-5 min-h-0" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black" style={{ color: NAVY }}>Assessments</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track student learning outcomes and performance.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              <Filter className="w-3.5 h-3.5" /> Filters
            </button>
            <button onClick={() => setCreateModal("Test")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-all" style={{ background: ORANGE }}>
              <Plus className="w-3.5 h-3.5" /> Create Assessment
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard icon={<ClipboardList className="w-5 h-5" />} label="Total Assessments" value={summary.totalAssessments} sub="+12% this month" color="#0B2B6B" />
            <KpiCard icon={<Clock className="w-5 h-5" />} label="Pending Evaluations" value={summary.pendingEvaluations} sub="Needs review" color={ORANGE} />
            <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Average Score" value={`${summary.avgScore}%`} sub="+5% this month" color="#3B82F6" />
            <KpiCard icon={<BarChart2 className="w-5 h-5" />} label="Submission Rate" value={`${summary.submissionRate}%`} sub="+7% this month" color="#10B981" />
            <KpiCard icon={<Trophy className="w-5 h-5" />} label="Top Performers" value={summary.topPerformers} sub="Scoring 90%+" color="#F59E0B" />
          </div>
        ) : null}

        {/* Sub-tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {SUB_TABS.map(t => (
              <button key={t.key} onClick={() => { setSubTab(t.key); setPage(1); }}
                className={`px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${subTab === t.key ? "border-b-2 text-white" : "border-transparent text-gray-500 hover:text-gray-700 border-b-2 border-transparent"}`}
                style={subTab === t.key ? { borderBottomColor: NAVY, background: NAVY + "08", color: NAVY } : {}}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 p-3 border-b border-gray-50 flex-wrap">
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search student, assessment…"
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-blue-100 bg-gray-50" />
            </div>
            <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none bg-gray-50 text-gray-600">
              <option value="all">All Grades</option>
              {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>Grade {i + 1}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none bg-gray-50 text-gray-600">
              <option value="all">All Status</option>
              <option value="graded">Graded</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Rankings sub-tab */}
          {subTab === "rankings" ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5" style={{ color: ORANGE }} />
                <h3 className="text-sm font-bold" style={{ color: NAVY }}>Student Rankings — Avg Score</h3>
              </div>
              {topPerformers.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">No ranking data yet</div>
              ) : (
                <div className="space-y-2">
                  {topPerformers.slice(0, 20).map((tp, i) => (
                    <div key={tp.studentId} className={`flex items-center gap-3 p-3 rounded-xl border ${i < 3 ? "border-yellow-100 bg-yellow-50" : "border-gray-100"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-gray-100 text-gray-500"}`}>
                        {i < 3 ? ["🥇", "🥈", "🥉"][i] : tp.rank}
                      </div>
                      <Avatar name={tp.studentName} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: NAVY }}>{tp.studentName}</div>
                        <div className="text-[10px] text-gray-400">{tp.totalSubmissions} submissions</div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        {scoreBadge(tp.avgScore)}
                        <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1">
                          <div className="h-1.5 rounded-full" style={{ width: `${tp.avgScore}%`, background: tp.avgScore >= 90 ? "#10B981" : tp.avgScore >= 75 ? "#3B82F6" : ORANGE }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Main Table */
            <div>
              {subLoading ? (
                <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center">
                  <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No submissions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Student", "Grade", "Course", "Assessment", "Type", "Max Marks", "Score", "Status", "Submitted On", "Actions"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar name={row.studentName} size={26} />
                              <div>
                                <div className="font-semibold text-gray-800 whitespace-nowrap">{row.studentName}</div>
                                <div className="text-[10px] text-gray-400">STU{String(row.studentId).padStart(4, "0")}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">Grade {row.grade}</td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[120px] truncate" title={row.courseTitle ?? "—"}>{row.courseTitle ?? "—"}</td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate font-medium" title={row.assessmentTitle}>{row.assessmentTitle}</td>
                          <td className="px-3 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ background: TYPE_COLORS[row.type] ?? NAVY }}>{row.type}</span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-600">{row.maxMarks}</td>
                          <td className="px-3 py-2.5">
                            {row.marks != null ? (
                              <div>
                                <div className="font-semibold text-gray-700">{row.marks} ({scoreBadge(row.scorePct)})</div>
                              </div>
                            ) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[row.status] ?? "bg-gray-100 text-gray-500"}`}>{row.status}</span>
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                            <div>{new Date(row.submittedAt).toLocaleDateString("en-IN")}</div>
                            <div className="text-[10px] text-gray-400">{new Date(row.submittedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                              <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-blue-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {(submissionsData?.total ?? 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <span className="text-[11px] text-gray-500">
                    Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, submissionsData!.total)} of {submissionsData!.total} assessments
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40 transition-all">
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pg = i + 1;
                      return (
                        <button key={pg} onClick={() => setPage(pg)} className={`w-6 h-6 rounded-lg text-[11px] font-semibold border transition-all ${pg === page ? "text-white border-transparent" : "border-gray-200 hover:bg-white text-gray-500"}`}
                          style={pg === page ? { background: NAVY, borderColor: NAVY } : {}}>
                          {pg}
                        </button>
                      );
                    })}
                    {totalPages > 5 && <span className="text-gray-400 text-xs">…{totalPages}</span>}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40 transition-all">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Analytics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Assessment Trend */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: NAVY }}>Assessment Trend</h3>
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">This Month</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9CA3AF" }} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} domain={[50, 100]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB" }} formatter={(v: number) => [`${v}%`, "Avg Score"]} />
                <Line type="monotone" dataKey="avg" stroke={NAVY} strokeWidth={2.5} dot={{ fill: NAVY, r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Assessment Type Distribution */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: NAVY }}>Assessment Type Distribution</h3>
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={typeDistData.length > 0 ? typeDistData : [{ name: "No data", value: 1, color: "#E5E7EB" }]} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={2}>
                    {(typeDistData.length > 0 ? typeDistData : [{ color: "#E5E7EB" }]).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {typeDistData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-gray-700">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Sidebar ─────────────────────────────────────────── */}
      <div className="w-64 shrink-0 space-y-4">

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Quick Actions</h3>
          <div className="space-y-2">
            {(["Homework", "Assignment", "Test", "Quiz"] as const).map(type => {
              const icons = { Homework: BookOpen, Assignment: FileText, Test: ClipboardList, Quiz: Zap };
              const colors = { Homework: "#3B82F6", Assignment: "#8B5CF6", Test: NAVY, Quiz: ORANGE };
              const Ic = icons[type];
              return (
                <button key={type} onClick={() => setCreateModal(type)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all group text-left">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: colors[type] + "18" }}>
                    <Ic className="w-3.5 h-3.5" style={{ color: colors[type] }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 flex-1">Create {type}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance Overview */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: NAVY }}>Performance Overview</h3>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={scoreDistData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={2}>
                    {scoreDistData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black" style={{ color: NAVY }}>{summary?.avgScore ?? 0}%</span>
                <span className="text-[9px] text-gray-400">Avg Score</span>
              </div>
            </div>
            <div className="w-full space-y-1 mt-2">
              {scoreDistData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-500 flex-1 truncate">{d.name}</span>
                  <span className="font-semibold text-gray-700">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submission Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold mb-3" style={{ color: NAVY }}>Submission Status</h3>
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={submissionStatusData.length > 0 ? submissionStatusData : [{ name: "No data", value: 1, color: "#E5E7EB" }]} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={2}>
                    {(submissionStatusData.length > 0 ? submissionStatusData : [{ color: "#E5E7EB" }]).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-green-600">{summary?.submissionRate ?? 0}%</span>
                <span className="text-[9px] text-gray-400">Submitted</span>
              </div>
            </div>
            <div className="w-full space-y-1 mt-2">
              {submissionStatusData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-gray-500 flex-1">{d.name}</span>
                  <span className="font-semibold text-gray-700">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold" style={{ color: NAVY }}>Top Performers</h3>
            <button onClick={() => setSubTab("rankings")} className="text-[10px] font-semibold" style={{ color: ORANGE }}>View All</button>
          </div>
          {topPerformers.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-xs">No data yet</div>
          ) : (
            <div className="space-y-2">
              {topPerformers.slice(0, 5).map((tp, i) => (
                <div key={tp.studentId} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: i === 0 ? "#FBBF24" : i === 1 ? "#9CA3AF" : i === 2 ? "#FB923C" : NAVY + "20", color: i < 3 ? "white" : NAVY }}>
                    {i < 3 ? <Star className="w-2.5 h-2.5" /> : tp.rank}
                  </div>
                  <Avatar name={tp.studentName} size={24} />
                  <span className="text-[11px] font-semibold text-gray-700 flex-1 truncate">{tp.studentName}</span>
                  {scoreBadge(tp.avgScore)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assessments */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: NAVY }}>Recent Assessments</h3>
            </div>
            <div className="space-y-2.5">
              {rows.slice(0, 3).map(row => (
                <div key={row.id} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5" style={{ background: TYPE_COLORS[row.type] ?? NAVY }}>
                      {row.type[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-semibold text-gray-700 truncate">{row.assessmentTitle}</div>
                      <div className="text-[10px] text-gray-400">{row.type} · {row.courseTitle ?? "—"} · Grade {row.grade}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {scoreBadge(row.scorePct)}
                        <span className="text-[10px] text-gray-400">{new Date(row.submittedAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <CreateModal type={createModal} onClose={() => setCreateModal(null)} onSuccess={handleCreateSuccess} />
      )}
    </div>
  );
}
