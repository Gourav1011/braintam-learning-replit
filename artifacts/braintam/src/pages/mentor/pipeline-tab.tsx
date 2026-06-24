import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Phone, ChevronRight, ArrowRight, Search, Clock, AlertTriangle } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
import { API_BASE as BASE } from "@/lib/api-base";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
}

const LEAD_STAGES = [
  { id: "New Lead",           label: "New Lead",        color: "#6B7280", bg: "#F9FAFB" },
  { id: "Demo Scheduled",     label: "Demo Scheduled",  color: "#6366F1", bg: "#EEF2FF" },
  { id: "Demo Done",          label: "Demo Done",       color: "#0284C7", bg: "#E0F2FE" },
  { id: "Follow-up Pending",  label: "Follow-up",       color: "#D97706", bg: "#FFFBEB" },
  { id: "Converted",          label: "Converted",       color: "#059669", bg: "#ECFDF5" },
  { id: "Lost",               label: "Lost",            color: "#DC2626", bg: "#FEF2F2" },
];

interface PipelineStudent {
  id: number;
  name: string;
  grade: number;
  phone: string | null;
  parentPhone: string | null;
  leadStage: string | null;
  lastContact: string | null;
  nextFollowUpDate: string | null;
  daysOverdue: number;
  lastNote: string | null;
  accountType: string | null;
}

function StageTag({ stage }: { stage: string | null }) {
  const s = LEAD_STAGES.find(l => l.id === stage) ?? { color: "#6B7280", bg: "#F9FAFB", label: stage ?? "Unknown" };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  return (
    <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
      <AlertTriangle className="w-2.5 h-2.5" />{days}d overdue
    </span>
  );
}

export function PipelineTab({ onOpenStudent }: { onOpenStudent: (id: number, name: string) => void }) {
  const [students, setStudents] = useState<PipelineStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/mentor/my-pipeline");
    if (r.ok) setStudents(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = students.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !(s.phone ?? "").includes(search)) return false;
    if (activeStage && s.leadStage !== activeStage) return false;
    return true;
  });

  // Group by stage for kanban
  const byStage = LEAD_STAGES.map(stage => ({
    ...stage,
    students: filtered.filter(s => (s.leadStage ?? "New Lead") === stage.id),
  }));

  const stageCounts = Object.fromEntries(
    LEAD_STAGES.map(s => [s.id, students.filter(st => (st.leadStage ?? "New Lead") === s.id).length])
  );

  const totalOverdue = students.filter(s => s.daysOverdue > 0).length;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-black" style={{ color: NAVY }}>Sales Pipeline</h1>
          <p className="text-xs text-gray-400">{students.length} leads · {totalOverdue > 0 ? <span className="text-red-500 font-semibold">{totalOverdue} overdue follow-ups</span> : "all up to date"}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {(["kanban","list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 font-semibold transition-all ${view === v ? "text-white" : "text-gray-500"}`}
                style={view === v ? { background: NAVY } : {}}>
                {v === "kanban" ? "Kanban" : "List"}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 bg-white">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Pipeline summary pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setActiveStage(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!activeStage ? "text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500"}`}
          style={!activeStage ? { background: NAVY } : {}}>
          All ({students.length})
        </button>
        {LEAD_STAGES.map(s => stageCounts[s.id] > 0 && (
          <button key={s.id} onClick={() => setActiveStage(activeStage === s.id ? null : s.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeStage === s.id ? "shadow-sm" : "bg-white border border-gray-200"}`}
            style={activeStage === s.id ? { background: s.bg, color: s.color, borderColor: s.color } : { color: s.color }}>
            {s.label} ({stageCounts[s.id]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-blue-300" />
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading pipeline…</div>
      ) : view === "kanban" ? (
        /* ── Kanban View ── */
        <div className="flex gap-3 overflow-x-auto pb-2">
          {byStage.filter(s => s.students.length > 0 || !activeStage).map(stage => (
            <div key={stage.id} className="flex-shrink-0 w-60">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.label}</span>
                <span className="text-[10px] text-gray-400 ml-auto">{stage.students.length}</span>
              </div>
              <div className="space-y-2 min-h-16">
                {stage.students.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onOpenStudent(s.id, s.name)}>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="font-semibold text-xs leading-tight" style={{ color: NAVY }}>{s.name}</div>
                      {s.daysOverdue > 0 && <OverdueBadge days={s.daysOverdue} />}
                    </div>
                    <div className="text-[10px] text-gray-400 mb-1.5">Gr.{s.grade}{s.phone ? ` · ${s.phone}` : ""}</div>
                    {s.lastNote && (
                      <p className="text-[10px] text-gray-500 italic truncate mb-1.5">"{s.lastNote}"</p>
                    )}
                    <div className="flex items-center justify-between">
                      {s.nextFollowUpDate ? (
                        <div className={`flex items-center gap-0.5 text-[10px] ${s.nextFollowUpDate <= today ? "text-red-500" : "text-gray-400"}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {s.nextFollowUpDate === today ? "Due today" : s.nextFollowUpDate < today ? `Overdue` : s.nextFollowUpDate}
                        </div>
                      ) : <span />}
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                    </div>
                  </div>
                ))}
                {stage.students.length === 0 && (
                  <div className="text-center py-4 text-[10px] text-gray-300">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── List View ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Student</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Stage</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Next Follow-up</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Last Note</th>
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onOpenStudent(s.id, s.name)}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold" style={{ color: NAVY }}>{s.name}</div>
                    <div className="text-[10px] text-gray-400">Grade {s.grade}</div>
                  </td>
                  <td className="px-4 py-2.5"><StageTag stage={s.leadStage} /></td>
                  <td className="px-4 py-2.5 text-gray-500">{s.phone ?? s.parentPhone ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    {s.nextFollowUpDate ? (
                      <div className="flex items-center gap-1">
                        <span className={s.daysOverdue > 0 ? "text-red-500 font-semibold" : "text-gray-500"}>{s.nextFollowUpDate}</span>
                        {s.daysOverdue > 0 && <OverdueBadge days={s.daysOverdue} />}
                      </div>
                    ) : <span className="text-gray-300">Not set</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 max-w-[180px] truncate">{s.lastNote ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No leads match your filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
