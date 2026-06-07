import { useState, useEffect } from "react";
import { Plus, Loader2, Video, X, Edit2, Trash2, CheckCircle2, ExternalLink, RefreshCw } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

const PLATFORMS = ["Google Meet", "Zoom", "Microsoft Teams", "Custom Link"];
const STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "#2563EB", bg: "#DBEAFE" },
  { value: "completed", label: "Completed", color: GREEN, bg: "#DCFCE7" },
  { value: "cancelled", label: "Cancelled", color: "#6B7280", bg: "#F3F4F6" },
  { value: "no_show", label: "No Show", color: "#DC2626", bg: "#FEE2E2" },
];

interface DoubtSession {
  id: number; title: string; studentIds: string; studentNames: string;
  scheduledDate: string; scheduledTime: string; duration: number;
  platform: string; meetingLink: string | null; topic: string | null;
  remarks: string | null; status: string; createdAt: string;
}
interface Stats { total: number; completed: number; cancelled: number; noShow: number; scheduled: number; completionRate: number }
interface StudentOption { id: number; name: string; grade: number }

const EMPTY_FORM = { title: "", studentIds: [] as number[], studentNames: [] as string[], scheduledDate: "", scheduledTime: "", duration: "60", platform: "Google Meet", meetingLink: "", topic: "", remarks: "", status: "scheduled" };

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(x => x.value === status) ?? STATUSES[0];
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
      <div className="text-xl font-black" style={{ color: NAVY }}>{value}</div>
      <div className="text-[10px] font-bold mt-0.5" style={{ color }}>{label}</div>
    </div>
  );
}

export function DoubtSessionsTab({ apiFetch, students }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  students: StudentOption[];
}) {
  const [sessions, setSessions] = useState<DoubtSession[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  async function load() {
    setLoading(true);
    const [sessRes, statsRes] = await Promise.all([
      apiFetch("/mentor/doubt-sessions"),
      apiFetch("/mentor/doubt-sessions/stats"),
    ]);
    if (sessRes.ok) setSessions(await sessRes.json());
    if (statsRes.ok) setStats(await statsRes.json());
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function openCreate() { setEditingId(null); setForm({ ...EMPTY_FORM }); setError(""); setStudentSearch(""); setShowForm(true); }
  function openEdit(s: DoubtSession) {
    setEditingId(s.id);
    const ids = JSON.parse(s.studentIds) as number[];
    const names = JSON.parse(s.studentNames) as string[];
    setForm({ title: s.title, studentIds: ids, studentNames: names, scheduledDate: s.scheduledDate, scheduledTime: s.scheduledTime, duration: String(s.duration), platform: s.platform, meetingLink: s.meetingLink ?? "", topic: s.topic ?? "", remarks: s.remarks ?? "", status: s.status });
    setError(""); setStudentSearch(""); setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditingId(null); setError(""); }

  function addStudent(id: number, name: string) {
    if (form.studentIds.includes(id)) return;
    setForm(f => ({ ...f, studentIds: [...f.studentIds, id], studentNames: [...f.studentNames, name] }));
    setStudentSearch("");
  }
  function removeStudent(id: number) {
    const idx = form.studentIds.indexOf(id);
    setForm(f => ({ ...f, studentIds: f.studentIds.filter((_, i) => i !== idx), studentNames: f.studentNames.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!form.title.trim() || !form.scheduledDate || !form.scheduledTime) { setError("Title, date and time are required"); return; }
    setSaving(true);
    const body = JSON.stringify({ ...form, duration: Number(form.duration), meetingLink: form.meetingLink || null, topic: form.topic || null, remarks: form.remarks || null });
    const r = editingId
      ? await apiFetch(`/mentor/doubt-sessions/${editingId}`, { method: "PATCH", body })
      : await apiFetch("/mentor/doubt-sessions", { method: "POST", body });
    if (r.ok) { closeForm(); await load(); }
    else { const d = await r.json().catch(() => ({})); setError(d.error ?? "Save failed"); }
    setSaving(false);
  }

  async function updateStatus(id: number, status: string) {
    setStatusUpdatingId(id);
    await apiFetch(`/mentor/doubt-sessions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
    setStatusUpdatingId(null);
  }

  async function deleteSession(id: number) {
    if (!confirm("Delete this doubt session?")) return;
    await apiFetch(`/mentor/doubt-sessions/${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (stats) setStats(prev => prev ? { ...prev, total: prev.total - 1 } : prev);
  }

  const filteredStudents = students.filter(s =>
    studentSearch.trim() && s.name.toLowerCase().includes(studentSearch.toLowerCase()) && !form.studentIds.includes(s.id)
  ).slice(0, 8);

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Doubt Sessions</h1>
          <p className="text-xs text-gray-500 mt-0.5">Schedule and manage student support sessions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>
            <Plus className="w-3.5 h-3.5" /> Schedule Session
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} color={NAVY} />
          <StatCard label="Scheduled" value={stats.scheduled} color="#2563EB" />
          <StatCard label="Completed" value={stats.completed} color={GREEN} />
          <StatCard label="Cancelled" value={stats.cancelled} color="#6B7280" />
          <StatCard label="Completion %" value={`${stats.completionRate}%`} color={GREEN} />
        </div>
      )}

      {/* Session Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={closeForm}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: NAVY }}>
              <span className="font-black text-white text-sm">{editingId ? "Edit Session" : "Schedule Doubt Session"}</span>
              <button onClick={closeForm} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {error && <div className="text-xs text-red-600 font-semibold p-2 bg-red-50 rounded-lg">{error}</div>}

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Session Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                  placeholder="e.g. Algebra Doubt Clearing" />
              </div>

              {/* Student selector */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Students</label>
                <div className="mt-1 relative">
                  <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                    placeholder="Search student name…" />
                  {filteredStudents.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                      {filteredStudents.map(s => (
                        <button key={s.id} onClick={() => addStudent(s.id, s.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-xs">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: NAVY }}>{s.name[0]}</div>
                          <span className="font-semibold">{s.name}</span><span className="text-gray-400">Gr.{s.grade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.studentIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.studentIds.map((id, i) => (
                      <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {form.studentNames[i]}
                        <button onClick={() => removeStudent(id)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Date *</label>
                  <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Time *</label>
                  <input type="time" value={form.scheduledTime} onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Duration (min)</label>
                  <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} min={15} max={180}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Meeting Link</label>
                <input value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                  placeholder="https://meet.google.com/…" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Topic / Subject</label>
                <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
                  placeholder="e.g. Quadratic Equations" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
                  placeholder="Any notes…" />
              </div>
              {editingId && (
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 bg-white">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}
              <button onClick={save} disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: saving ? "#9CA3AF" : NAVY }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? "Saving…" : editingId ? "Update Session" : "Schedule Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Video className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-400">No doubt sessions yet</p>
          <button onClick={openCreate} className="mt-3 px-4 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>Schedule First Session</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const studentNamesArr: string[] = JSON.parse(s.studentNames);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm" style={{ color: NAVY }}>{s.title}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                      <span>📅 {s.scheduledDate} at {s.scheduledTime}</span>
                      <span>⏱ {s.duration} min</span>
                      <span>📱 {s.platform}</span>
                    </div>
                    {studentNamesArr.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {studentNamesArr.map(n => (
                          <span key={n} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{n}</span>
                        ))}
                      </div>
                    )}
                    {s.topic && <div className="text-[11px] text-gray-500 mt-1">📚 {s.topic}</div>}
                    {s.remarks && <div className="text-[11px] text-gray-400 mt-0.5 italic">{s.remarks}</div>}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {s.meetingLink && (
                      <a href={s.meetingLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white" style={{ background: GREEN }}>
                        <ExternalLink className="w-3 h-3" /> Join
                      </a>
                    )}
                    {s.status === "scheduled" && (
                      <button onClick={() => updateStatus(s.id, "completed")} disabled={statusUpdatingId === s.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white" style={{ background: GREEN }}>
                        {statusUpdatingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Done
                      </button>
                    )}
                    <button onClick={() => openEdit(s)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border border-gray-200 hover:bg-gray-50">
                      <Edit2 className="w-3 h-3 text-gray-500" />
                    </button>
                    <button onClick={() => deleteSession(s.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border border-red-200 hover:bg-red-50 text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
