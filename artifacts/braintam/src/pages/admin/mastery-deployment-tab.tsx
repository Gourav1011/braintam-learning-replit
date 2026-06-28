import { useState, useEffect, useCallback } from "react";
import {
  Users, UserCheck, RefreshCw, Search, X, ChevronDown, ChevronUp,
  Loader2, Plus, Play, CheckCircle2, BarChart3, GraduationCap,
  ArrowRight, ShuffleIcon, Layers, Package, Calendar,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

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

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#10B981";

interface DeploymentStats {
  newAdmissions: number;
  unassignedStudents: number;
  activeMentors: number;
  assignedStudents: number;
  totalStudents: number;
}

interface UnassignedStudent {
  id: number;
  studentName: string;
  grade: number;
  phone: string;
  board: string | null;
  admissionDate: string;
  masteryStatus: string;
}

interface Mentor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  mentorType: string | null;
  currentStudents: number;
}

interface DeploymentBatch {
  id: number;
  batchCode: string;
  grade: number | null;
  totalStudents: number;
  totalMentors: number;
  deployedByName: string | null;
  status: string;
  createdAt: string;
  distributionJson: string | null;
}

interface MentorAssignment {
  mentorId: number;
  mentorName: string;
  studentIds: number[];
}

export function MasteryDeploymentTab() {
  const [stats, setStats]               = useState<DeploymentStats | null>(null);
  const [students, setStudents]         = useState<UnassignedStudent[]>([]);
  const [mentors, setMentors]           = useState<Mentor[]>([]);
  const [teachers, setTeachers]         = useState<{ id: number; name: string; email: string | null }[]>([]);
  const [batches, setBatches]           = useState<DeploymentBatch[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeView, setActiveView]     = useState<"deploy" | "batches">("deploy");

  // Deploy wizard state
  const [gradeFilter, setGradeFilter]   = useState("");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedMentors, setSelectedMentors]   = useState<number[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(0);
  const [step, setStep]                 = useState<"students" | "mentors" | "preview" | "done">("students");
  const [distribution, setDistribution] = useState<MentorAssignment[]>([]);
  const [deploying, setDeploying]       = useState(false);
  const [lastBatch, setLastBatch]       = useState<{ batchCode: string; total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [sr, mr, br, tr] = await Promise.all([
      apiFetch("/admin/mastery/deployment/stats"),
      apiFetch("/admin/mastery/deployment/mentors"),
      apiFetch("/admin/mastery/deployment/batches"),
      apiFetch("/admin/analytics/teachers"),
    ]);
    if (sr.ok) setStats(await sr.json() as DeploymentStats);
    if (mr.ok) setMentors(await mr.json() as Mentor[]);
    if (br.ok) setBatches(await br.json() as DeploymentBatch[]);
    if (tr.ok) setTeachers(await tr.json() as { id: number; name: string; email: string | null }[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadStudents = useCallback(async () => {
    const params = gradeFilter ? `?grade=${gradeFilter}` : "";
    const r = await apiFetch(`/admin/mastery/deployment/unassigned${params}`);
    if (r.ok) setStudents(await r.json() as UnassignedStudent[]);
  }, [gradeFilter]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  function toggleStudent(id: number) {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleMentor(id: number) {
    setSelectedMentors(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  function buildEqualDistribution() {
    if (selectedMentors.length === 0 || selectedStudents.length === 0) return;
    const perMentor = Math.floor(selectedStudents.length / selectedMentors.length);
    const remainder = selectedStudents.length % selectedMentors.length;
    const shuffled  = [...selectedStudents].sort(() => Math.random() - 0.5);

    const dist: MentorAssignment[] = selectedMentors.map((mentorId, i) => {
      const mentor    = mentors.find(m => m.id === mentorId)!;
      const start     = i * perMentor + Math.min(i, remainder);
      const end       = start + perMentor + (i < remainder ? 1 : 0);
      return {
        mentorId,
        mentorName: mentor.name,
        studentIds: shuffled.slice(start, end),
      };
    });
    setDistribution(dist);
    setStep("preview");
  }

  async function deploy() {
    setDeploying(true);
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const r = await apiFetch("/admin/mastery/deployment/deploy", {
      method: "POST",
      body: JSON.stringify({
        mentorAssignments: distribution,
        grade: gradeFilter ? parseInt(gradeFilter, 10) : undefined,
        teacherId: teacher?.id,
        teacherName: teacher?.name,
      }),
    });
    if (r.ok) {
      const d = await r.json() as { batchCode: string; totalAssigned: number };
      setLastBatch({ batchCode: d.batchCode, total: d.totalAssigned });
      setStep("done");
      load();
      loadStudents();
      setSelectedStudents([]);
      setSelectedMentors([]);
    }
    setDeploying(false);
  }

  function reset() {
    setStep("students");
    setSelectedStudents([]);
    setSelectedMentors([]);
    setSelectedTeacherId(0);
    setDistribution([]);
    setLastBatch(null);
  }

  const statCards = [
    { label: "New Admissions",     value: stats?.newAdmissions ?? 0,     color: NAVY,   bg: "#EFF6FF", icon: Plus },
    { label: "Unassigned Students",value: stats?.unassignedStudents ?? 0, color: ORANGE, bg: "#FFF7ED", icon: Users },
    { label: "Active Mentors",     value: stats?.activeMentors ?? 0,      color: GREEN,  bg: "#ECFDF5", icon: UserCheck },
    { label: "Assigned Students",  value: stats?.assignedStudents ?? 0,   color: "#8B5CF6", bg: "#EDE9FE", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Student Deployment Center</h2>
          <p className="text-xs text-gray-500 mt-0.5">Assign unassigned mastery students to mentors</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setActiveView("deploy"); reset(); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeView === "deploy" ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            style={activeView === "deploy" ? { background: NAVY } : {}}>
            Deploy
          </button>
          <button onClick={() => setActiveView("batches")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeView === "batches" ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            style={activeView === "batches" ? { background: NAVY } : {}}>
            Batch History
          </button>
          <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-3">
        {statCards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: c.bg }}>
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: NAVY }}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Batch History View */}
      {activeView === "batches" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-black" style={{ color: NAVY }}>Deployment Batch History</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Batch Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Grade</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Students</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Mentors</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Deployed By</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No deployment batches yet</td></tr>
              ) : batches.map(b => {
                let dist: { mentorName: string; studentIds: number[] }[] = [];
                try { dist = JSON.parse(b.distributionJson ?? "[]"); } catch { dist = []; }
                return (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-blue-50/20">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">{b.batchCode}</td>
                    <td className="px-4 py-3 text-gray-600">{b.grade ? `Grade ${b.grade}` : "All"}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>{b.totalStudents}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{b.totalMentors}</td>
                    <td className="px-4 py-3 text-gray-600">{b.deployedByName ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {dist.map(d => `${d.mentorName} (${d.studentIds.length})`).join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deploy Wizard */}
      {activeView === "deploy" && (
        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 text-xs">
            {(["students", "mentors", "preview", "done"] as const).map((s, i) => {
              const labels = ["Select Students", "Select Mentors", "Preview & Deploy", "Done"];
              const current = step === s;
              const done = ["students", "mentors", "preview", "done"].indexOf(step) > i;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] ${current ? "text-white" : done ? "text-white" : "text-gray-400 border border-gray-200"}`}
                    style={current ? { background: NAVY } : done ? { background: GREEN } : {}}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`font-semibold ${current ? "" : "text-gray-400"}`} style={current ? { color: NAVY } : {}}>
                    {labels[i]}
                  </span>
                  {i < 3 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                </div>
              );
            })}
          </div>

          {/* Step 1: Select Students */}
          {step === "students" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black" style={{ color: NAVY }}>Select Students to Deploy</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedStudents.length} selected · {students.length} unassigned</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none">
                    <option value="">All Grades</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                  <button onClick={() => setSelectedStudents(students.map(s => s.id))}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                    Select All
                  </button>
                  <button onClick={() => setSelectedStudents([])}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="w-10 px-4 py-2"></th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-500">Student</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-500">Grade</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-500">Board</th>
                      <th className="text-left px-4 py-2 font-semibold text-gray-500">Admitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
                    ) : students.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-400">No unassigned students{gradeFilter ? ` in Grade ${gradeFilter}` : ""}</td></tr>
                    ) : students.map(s => {
                      const sel = selectedStudents.includes(s.id);
                      return (
                        <tr key={s.id} onClick={() => toggleStudent(s.id)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${sel ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                          <td className="px-4 py-2.5">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${sel ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
                              {sel && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-gray-800">{s.studentName}</td>
                          <td className="px-4 py-2.5 text-gray-600">Grade {s.grade}</td>
                          <td className="px-4 py-2.5 text-gray-500">{s.board ?? "—"}</td>
                          <td className="px-4 py-2.5 text-gray-500">{new Date(s.admissionDate).toLocaleDateString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setStep("mentors")} disabled={selectedStudents.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold disabled:opacity-50"
                  style={{ background: NAVY }}>
                  Next: Select Mentors <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Mentors */}
          {step === "mentors" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black" style={{ color: NAVY }}>Select Mentors</p>
                  <p className="text-xs text-gray-400 mt-0.5">{selectedMentors.length} mentors selected · {selectedStudents.length} students to assign</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedMentors(mentors.map(m => m.id))}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                    Select All Mentors
                  </button>
                  <button onClick={() => setSelectedMentors([])}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 p-4">
                  {mentors.map(m => {
                    const sel = selectedMentors.includes(m.id);
                    return (
                      <div key={m.id} onClick={() => toggleMentor(m.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${sel ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black ${sel ? "bg-blue-600" : "bg-gray-400"}`}>
                            {m.name[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-xs truncate ${sel ? "text-blue-800" : "text-gray-800"}`}>{m.name}</p>
                            <p className="text-[10px] text-gray-400">{m.currentStudents} current students</p>
                          </div>
                          {sel && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Teacher selection */}
              <div className="px-5 py-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Assign Teacher <span className="font-normal text-gray-400">(optional — logged in timeline)</span>
                </label>
                <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800">
                  <option value={0}>— No teacher selected —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.email ? ` (${t.email})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => setStep("students")} className="px-4 py-2.5 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={buildEqualDistribution} disabled={selectedMentors.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold disabled:opacity-50"
                  style={{ background: NAVY }}>
                  <ShuffleIcon className="w-3.5 h-3.5" /> Equal Distribution & Preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-black" style={{ color: NAVY }}>Preview Distribution</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedStudents.length} students → {selectedMentors.length} mentors · Equal Distribution
                </p>
              </div>
              <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
                {distribution.map((d, i) => {
                  const mentor = mentors.find(m => m.id === d.mentorId);
                  const studentNames = d.studentIds
                    .map(sid => students.find(s => s.id === sid)?.studentName ?? `Student #${sid}`)
                    .join(", ");
                  return (
                    <div key={d.mentorId} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
                          style={{ background: NAVY }}>
                          {d.mentorName[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{d.mentorName}</p>
                          <p className="text-[10px] text-gray-400">{d.studentIds.length} students · {mentor?.currentStudents ?? 0} existing</p>
                        </div>
                        <span className="ml-auto text-xs font-black px-2 py-1 rounded-full text-white" style={{ background: GREEN }}>
                          {d.studentIds.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{studentNames}</p>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                <button onClick={() => setStep("mentors")} className="px-4 py-2.5 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={deploy} disabled={deploying}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-semibold"
                  style={{ background: GREEN }}>
                  {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {deploying ? "Deploying…" : "Deploy Now"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && lastBatch && (
            <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-8 text-center">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: "#D1FAE5" }}>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-black mb-1" style={{ color: NAVY }}>Deployment Successful!</p>
              <p className="text-sm text-gray-500 mb-4">
                {lastBatch.total} students assigned across {selectedMentors.length} mentors
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-mono font-black text-blue-700">{lastBatch.batchCode}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Batch Code — save for reference</p>
              <div className="flex gap-3 justify-center mt-6">
                <button onClick={reset} className="px-5 py-2.5 rounded-xl text-white text-xs font-semibold" style={{ background: NAVY }}>
                  Deploy More Students
                </button>
                <button onClick={() => setActiveView("batches")} className="px-5 py-2.5 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">
                  View Batch History
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
