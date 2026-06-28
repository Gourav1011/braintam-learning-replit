import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Users, CheckCircle2, XCircle, TrendingUp, AlertTriangle, Star,
  Download, MoreVertical, Search, RefreshCw, Plus, Eye,
  X, Loader2, ChevronLeft, ChevronRight, MessageSquare, BarChart3,
  Edit3, GraduationCap, UserCheck2, Activity, Trophy, Zap,
  ArrowRightCircle, BookOpen, ClipboardList, Phone, Mail,
  CalendarCheck, CheckSquare2,
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

// ── Types ──────────────────────────────────────────────────────────────────────
interface EnrichedMentor {
  id: number; name: string; email: string; phone: string | null;
  mentorType: string; isActive: boolean; createdAt: string;
  lastLoginAt: string | null; assignedStudents: number;
  assignedDemoStudents: number; conversions: number; conversionPct: number;
  attendancePct: number | null; homeworkPct: number | null;
  followUpPct: number; healthScore: number;
  healthLabel: "Excellent" | "Good" | "Average" | "Needs Attention";
  workload: "Low" | "Medium" | "High";
  grades?: number[];
}
interface DashboardStats {
  recentActivity: { mentorName: string; studentName: string; note: string; time: string }[];
}
interface AlertsData {
  noLoginDays: { id: number; name: string }[];
  noStudents: { id: number; name: string }[];
  overloaded: { id: number; name: string }[];
  lowConversion: { id: number; name: string; convPct: number }[];
}
interface ProfileData {
  mentor: {
    id: number; name: string; email: string; phone: string | null;
    mentorType: string; isActive: boolean; createdAt: string; lastLoginAt: string | null;
  };
  stats: {
    assignedStudents: number; attendancePct: number | null; homeworkPct: number | null;
    healthScore: number; healthLabel: string; totalFollowUps: number; totalTasks: number; doneTasks: number;
  };
  assignments: {
    id: number; studentId: number; studentName: string | null;
    studentGrade: number | null; studentEmail: string | null;
    leadStage: string | null; isActive: boolean; assignedAt: string;
  }[];
  recentFollowUps: {
    id: number; studentName: string | null; note: string | null;
    noteType: string | null; callStatus: string | null; createdAt: string;
  }[];
  tasks: { id: number; title: string; status: string; dueDate: string | null }[];
}

type SortKey = "name" | "assignedStudents" | "healthScore" | "attendancePct" | "homeworkPct" | "workload";

// ── Helpers ───────────────────────────────────────────────────────────────────
function healthColor(label: string) {
  if (label === "Excellent") return { bg: "#DCFCE7", text: "#15803D", bar: "#22C55E" };
  if (label === "Good")      return { bg: "#DBEAFE", text: "#1D4ED8", bar: "#3B82F6" };
  if (label === "Average")   return { bg: "#FEF3C7", text: "#B45309", bar: "#F59E0B" };
  return { bg: "#FEE2E2", text: "#DC2626", bar: "#EF4444" };
}
function workloadPct(m: EnrichedMentor) { return Math.min(100, Math.round((m.assignedStudents / 60) * 100)); }
function workloadBarColor(pct: number) { return pct <= 50 ? "#22C55E" : pct <= 80 ? "#F59E0B" : "#EF4444"; }
function workloadLbl(pct: number) { return pct <= 50 ? "Low" : pct <= 80 ? "Medium" : "High"; }
function starRating(hs: number) { return Math.min(5, (hs / 100) * 5).toFixed(1); }
function gradesLabel(grades: number[] | undefined) {
  if (!grades || grades.length === 0) return "—";
  const s = [...grades].sort((a, b) => a - b);
  const ranges: string[] = [];
  let st = s[0]; let en = s[0];
  for (let i = 1; i < s.length; i++) {
    if (s[i] === en + 1) { en = s[i]; }
    else { ranges.push(st === en ? `G${st}` : `G${st}–G${en}`); st = en = s[i]; }
  }
  ranges.push(st === en ? `G${st}` : `G${st}–G${en}`);
  return ranges.join(", ");
}
function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function pHash(name: string) {
  const cols = ["#4F46E5","#059669","#D97706","#DC2626","#7C3AED","#0891B2","#BE185D"];
  return cols[name.charCodeAt(0) % cols.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Avatar({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  return (
    <div className="rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
      style={{ width: size, height: size, background: color ?? pHash(name), fontSize: size < 30 ? 10 : 13 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
function StarsDisplay({ rating }: { rating: string }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
      <span className="text-xs font-black text-gray-800">{rating}/5</span>
    </div>
  );
}
function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-end text-[10px] mb-0.5">
        <span className="font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}
function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <div className="w-28 h-28 rounded-full border-8 border-gray-100" />
    </div>
  );
  let offset = 0;
  const r = 52; const cx = 80; const cy = 80; const sw = 22;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circ; const gap = circ - dash;
        const rot = offset * 360 - 90; offset += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${gap}`} transform={`rotate(${rot} ${cx} ${cy})`} />
        );
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="900" fill={NAVY}>{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6B7280">Total</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6B7280">Students</text>
    </svg>
  );
}
function WlTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  const pct = Number((payload as { value: number }[])[0]?.value ?? 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-bold mb-1 text-gray-700">{String(label)}</div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full" style={{ background: workloadBarColor(pct) }} />
        <span className="text-gray-500">Workload:</span>
        <span className="font-black">{pct}%</span>
        <span className="text-gray-400 ml-1">({workloadLbl(pct)})</span>
      </div>
    </div>
  );
}

// ── Add Mentor Modal ──────────────────────────────────────────────────────────
function AddMentorModal({ onClose, onCreated, flash }: {
  onClose: () => void;
  onCreated: () => void;
  flash: (msg: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErr("Name, email and password are required.");
      return;
    }
    setSaving(true);
    const r = await apiFetch("/admin/mentors", {
      method: "POST",
      body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null, password: form.password, mentorType: "academic" }),
    });
    setSaving(false);
    if (r.ok) { flash("Academic mentor created!"); onCreated(); onClose(); }
    else { const j = await r.json().catch(() => ({})); setErr((j as { error?: string }).error ?? "Failed to create mentor."); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-black" style={{ color: NAVY }}>Add Academic Mentor</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mentor type is set to <strong>Academic</strong> (Mastery programme)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: "Full Name *", key: "name",     type: "text",     placeholder: "e.g. Priya Sharma" },
            { label: "Email *",     key: "email",    type: "email",    placeholder: "priya@braintam.com" },
            { label: "Phone",       key: "phone",    type: "tel",      placeholder: "+91 98765 43210" },
            { label: "Password *",  key: "password", type: "password", placeholder: "Set a login password" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
            </div>
          ))}
          {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-white text-sm font-black disabled:opacity-60 transition-all"
              style={{ background: ORANGE }}>
              {saving ? "Creating…" : "Create Mentor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Move to Ignite Confirm ────────────────────────────────────────────────────
function ConfirmMoveModal({ mentor, onClose, onConfirm }: {
  mentor: EnrichedMentor;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [moving, setMoving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <ArrowRightCircle className="w-6 h-6 text-orange-500" />
        </div>
        <h2 className="text-base font-black text-center" style={{ color: NAVY }}>Move to Ignite Sales?</h2>
        <p className="text-xs text-gray-500 text-center mt-2 leading-relaxed">
          <strong>{mentor.name}</strong> will be moved from Mastery (Academic) to Ignite Sales.
          {mentor.assignedStudents > 0 && (
            <> <span className="text-red-600 font-semibold">{mentor.assignedStudents} student assignment{mentor.assignedStudents > 1 ? "s" : ""} will be delinked.</span></>
          )}
        </p>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={moving} onClick={async () => { setMoving(true); await onConfirm(); setMoving(false); onClose(); }}
            className="flex-1 py-2 rounded-xl text-white text-sm font-black disabled:opacity-60"
            style={{ background: ORANGE }}>
            {moving ? "Moving…" : "Move to Ignite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Drawer ────────────────────────────────────────────────────────────
function ProfileDrawer({ mentorId, onClose }: { mentorId: number; onClose: () => void }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "students" | "followups" | "tasks">("overview");

  useEffect(() => {
    setLoading(true); setErr(false); setData(null);
    apiFetch(`/admin/mentors/${mentorId}/profile`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [mentorId]);

  const hc = data ? healthColor(data.stats.healthLabel) : null;
  const wPct = data ? Math.min(100, Math.round((data.stats.assignedStudents / 60) * 100)) : 0;
  const activeStudents = data?.assignments.filter(a => a.isActive) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/30 backdrop-blur-sm" />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Drawer header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: NAVY }}>
          <div className="flex items-center gap-3">
            {data && <Avatar name={data.mentor.name} size={40} />}
            <div>
              <h2 className="text-base font-black text-white">{data?.mentor.name ?? "Loading…"}</h2>
              <p className="text-xs text-blue-200">{data?.mentor.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-0 border-b border-gray-100 px-4 bg-gray-50">
          {([
            ["overview",  "Overview",   BookOpen],
            ["students",  "Students",   Users],
            ["followups", "Follow-ups", MessageSquare],
            ["tasks",     "Tasks",      ClipboardList],
          ] as [string, string, React.ElementType][]).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setActiveSection(key as typeof activeSection)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeSection === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>}
          {err    && <div className="text-center py-16 text-gray-400 text-sm">Failed to load profile. Try again.</div>}
          {data && !loading && (
            <>
              {activeSection === "overview" && (
                <div className="space-y-5">
                  {/* Info row */}
                  <div className="grid grid-cols-2 gap-3">
                    {data.mentor.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 p-3 rounded-xl bg-gray-50">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{data.mentor.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-600 p-3 rounded-xl bg-gray-50">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />{data.mentor.email}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 p-3 rounded-xl bg-gray-50">
                      <CalendarCheck className="w-3.5 h-3.5 text-gray-400" />
                      Joined {new Date(data.mentor.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 p-3 rounded-xl bg-gray-50">
                      <Activity className="w-3.5 h-3.5 text-gray-400" />
                      Last login: {data.mentor.lastLoginAt ? timeAgo(data.mentor.lastLoginAt) : "Never"}
                    </div>
                  </div>
                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Students",    value: data.stats.assignedStudents, color: NAVY },
                      { label: "Health",      value: `${data.stats.healthScore}%`, color: hc?.bar ?? GREEN },
                      { label: "Attendance",  value: data.stats.attendancePct !== null ? `${data.stats.attendancePct}%` : "—", color: GREEN },
                      { label: "Assessments", value: data.stats.homeworkPct !== null ? `${data.stats.homeworkPct}%` : "—", color: "#3B82F6" },
                      { label: "Tasks Done",  value: `${data.stats.doneTasks}/${data.stats.totalTasks}`, color: "#7C3AED" },
                      { label: "Follow-ups",  value: data.stats.totalFollowUps, color: ORANGE },
                    ].map((s, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Progress bars */}
                  <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                    <h4 className="text-xs font-black text-gray-600 uppercase tracking-widest mb-2">Performance Metrics</h4>
                    {[
                      { label: "Workload",    pct: wPct,                                color: workloadBarColor(wPct) },
                      { label: "Health",      pct: data.stats.healthScore,              color: hc?.bar ?? GREEN },
                      { label: "Attendance",  pct: data.stats.attendancePct ?? 0,       color: GREEN },
                      { label: "Assessments", pct: data.stats.homeworkPct ?? 0,         color: "#3B82F6" },
                    ].map((b, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-500 font-medium">{b.label}</span>
                          <span className="font-bold" style={{ color: b.color }}>{b.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: b.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Status badge */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${data.mentor.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {data.mentor.isActive ? "Active" : "Inactive"}
                    </span>
                    {hc && (
                      <span className="px-3 py-1 rounded-full text-xs font-black" style={{ background: hc.bg, color: hc.text }}>
                        {data.stats.healthLabel}
                      </span>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700">Academic Mentor</span>
                  </div>
                </div>
              )}

              {activeSection === "students" && (
                <div>
                  <p className="text-xs text-gray-400 mb-3">{activeStudents.length} active student{activeStudents.length !== 1 ? "s" : ""} assigned</p>
                  {activeStudents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No students assigned yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {activeStudents.map(s => (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all">
                          <Avatar name={s.studentName ?? "?"} size={32} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-800 truncate">{s.studentName ?? "—"}</div>
                            <div className="text-xs text-gray-400">{s.studentEmail} · Grade {s.studentGrade ?? "?"}</div>
                          </div>
                          {s.leadStage && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold shrink-0">{s.leadStage}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "followups" && (
                <div>
                  <p className="text-xs text-gray-400 mb-3">Last {data.recentFollowUps.length} follow-up entries</p>
                  {data.recentFollowUps.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No follow-ups recorded.</div>
                  ) : (
                    <div className="space-y-2">
                      {data.recentFollowUps.map(f => (
                        <div key={f.id} className="p-3 rounded-xl bg-gray-50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-700">{f.studentName ?? "Student"}</div>
                              <div className="text-xs text-gray-500 mt-0.5 leading-snug">{f.note ?? f.noteType ?? "Follow-up"}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[9px] text-gray-400">{timeAgo(f.createdAt)}</div>
                              {f.callStatus && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${f.callStatus === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                  {f.callStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "tasks" && (
                <div>
                  <p className="text-xs text-gray-400 mb-3">{data.stats.doneTasks} / {data.stats.totalTasks} tasks completed</p>
                  {data.tasks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">No tasks assigned.</div>
                  ) : (
                    <div className="space-y-2">
                      {data.tasks.map(t => (
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                          <CheckSquare2 className={`w-4 h-4 shrink-0 ${t.status === "done" ? "text-green-500" : "text-gray-300"}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${t.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{t.title}</div>
                            {t.dueDate && <div className="text-[10px] text-gray-400 mt-0.5">Due: {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${t.status === "done" ? "bg-green-100 text-green-700" : t.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                            {t.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Actions Menu ──────────────────────────────────────────────────────────────
function ActionsMenu({ mentor, onView, onToggle, onMoveToSales }: {
  mentor: EnrichedMentor;
  onView: () => void;
  onToggle: () => void;
  onMoveToSales: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-all">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-48 text-xs" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setOpen(false); onView(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
            <Eye className="w-3.5 h-3.5 text-blue-500" /> View Profile
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
            <Edit3 className="w-3.5 h-3.5 text-orange-500" /> Edit
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 font-semibold">
            <MessageSquare className="w-3.5 h-3.5 text-green-500" /> Send Message
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button onClick={() => { setOpen(false); onMoveToSales(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-orange-600 hover:bg-orange-50 font-semibold">
            <ArrowRightCircle className="w-3.5 h-3.5" /> Move to Ignite Sales
          </button>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={() => { setOpen(false); onToggle(); }}
              className={`w-full flex items-center gap-2 px-3 py-2 font-semibold ${mentor.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
              {mentor.isActive ? <><XCircle className="w-3.5 h-3.5" /> Disable Mentor</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Enable Mentor</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

// ── Main Component ─────────────────────────────────────────────────────────────
export function MentorsTab({ flash }: { flash: (msg: string, ok?: boolean) => void; users?: unknown[] }) {
  const [mentors,      setMentors]     = useState<EnrichedMentor[]>([]);
  const [stats,        setStats]       = useState<DashboardStats | null>(null);
  const [alerts,       setAlerts]      = useState<AlertsData | null>(null);
  const [loading,      setLoading]     = useState(true);
  const [activeTab,    setActiveTab]   = useState<"all" | "active" | "inactive">("all");
  const [search,       setSearch]      = useState("");
  const [gradeFilter,  setGradeFilter] = useState("all");
  const [wlFilter,     setWlFilter]    = useState("all");
  const [page,         setPage]        = useState(1);
  const [profileId,    setProfileId]   = useState<number | null>(null);
  const [showAdd,      setShowAdd]     = useState(false);
  const [moveTarget,   setMoveTarget]  = useState<EnrichedMentor | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "healthScore", dir: "desc" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, sRes, aRes, gRes] = await Promise.all([
        apiFetch("/admin/mentors/enriched"),
        apiFetch("/admin/mentors/dashboard-stats"),
        apiFetch("/admin/mentors/alerts"),
        apiFetch("/admin/mentors/grade-assignments"),
      ]);
      const [mAll, sData, aData, gData] = await Promise.all([
        mRes.ok ? mRes.json() : [],
        sRes.ok ? sRes.json() : null,
        aRes.ok ? aRes.json() : null,
        gRes.ok ? gRes.json() : [],
      ]);
      const gradeMap = new Map<number, number[]>(
        (gData as { mentorId: number; grades: number[] }[]).map(g => [g.mentorId, g.grades])
      );
      // Only academic mentors for this tab
      const enriched = (mAll as EnrichedMentor[])
        .filter(m => (m.mentorType ?? "academic") === "academic")
        .map(m => ({ ...m, grades: gradeMap.get(m.id) ?? [] }));
      setMentors(enriched);
      setStats(sData);
      setAlerts(aData);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleActive(m: EnrichedMentor) {
    const r = await apiFetch(`/admin/mentors/${m.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !m.isActive }) });
    if (r.ok) { flash(`${m.name} ${m.isActive ? "disabled" : "enabled"}!`); loadData(); }
    else flash("Failed to update mentor.", false);
  }
  async function moveToSales(m: EnrichedMentor) {
    const r = await apiFetch(`/admin/mentors/${m.id}`, { method: "PATCH", body: JSON.stringify({ mentorType: "sales" }) });
    if (r.ok) { flash(`${m.name} moved to Ignite Sales.`); loadData(); }
    else flash("Move failed.", false);
  }

  function handleSort(key: SortKey) {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  // Academic-only KPI computations
  const activeCount   = mentors.filter(m => m.isActive).length;
  const totalStudents = mentors.reduce((s, m) => s + m.assignedStudents, 0);
  const avgWorkload   = mentors.length ? Math.round(mentors.reduce((s, m) => s + workloadPct(m), 0) / mentors.length) : 0;
  const avgHealth     = mentors.length ? Math.round(mentors.reduce((s, m) => s + m.healthScore, 0) / mentors.length) : 0;
  const atRiskCount   = mentors.filter(m => m.healthLabel === "Needs Attention").length;
  const satisfaction  = mentors.length ? (mentors.reduce((s, m) => s + m.healthScore, 0) / mentors.length / 20).toFixed(1) : "—";
  const wlLabel       = avgWorkload <= 50 ? "Low" : avgWorkload <= 80 ? "Moderate" : "High";
  const hlLabel       = avgHealth >= 80 ? "Good" : avgHealth >= 60 ? "Average" : "Needs Attention";

  // Chart data — academic only
  const wlChartData = mentors.slice(0, 10).map(m => ({ name: m.name.split(" ")[0], fullName: m.name, pct: workloadPct(m) }));

  // Health donut — computed from academic mentors only (not from stats API)
  const hDist = useMemo(() => {
    const d = { excellent: 0, good: 0, average: 0, needsAttention: 0 };
    for (const m of mentors) {
      if      (m.healthLabel === "Excellent")       d.excellent++;
      else if (m.healthLabel === "Good")            d.good++;
      else if (m.healthLabel === "Average")         d.average++;
      else if (m.healthLabel === "Needs Attention") d.needsAttention++;
    }
    return d;
  }, [mentors]);
  const donutData = [
    { label: "Excellent",       value: hDist.excellent,       color: "#22C55E" },
    { label: "Good",            value: hDist.good,            color: "#3B82F6" },
    { label: "Average",         value: hDist.average,         color: "#F59E0B" },
    { label: "Needs Attention", value: hDist.needsAttention,  color: "#EF4444" },
  ];
  const donutTotal = mentors.length;

  // Top performers for quick actions
  const topMentors = [...mentors].filter(m => m.isActive).sort((a, b) => b.healthScore - a.healthScore).slice(0, 3);

  // At-risk from alerts (academic only — noStudents + overloaded)
  const atRiskItems = [
    ...(alerts?.noStudents ?? []).map(s => ({ ...s, reason: "No Students" })),
    ...(alerts?.overloaded  ?? []).map(s => ({ ...s, reason: "Overloaded" })),
  ].slice(0, 3);

  // Recent activity
  const recentActivity = stats?.recentActivity ?? [];

  // Performance insights
  const bestAtt      = [...mentors].sort((a, b) => (b.attendancePct ?? 0) - (a.attendancePct ?? 0))[0];
  const bestHw       = [...mentors].sort((a, b) => (b.homeworkPct   ?? 0) - (a.homeworkPct   ?? 0))[0];
  const mostStudents = [...mentors].sort((a, b) => b.assignedStudents - a.assignedStudents)[0];

  // Table filter + sort
  const filtered = useMemo(() => {
    let list = [...mentors];
    if (activeTab === "active")   list = list.filter(m => m.isActive);
    if (activeTab === "inactive") list = list.filter(m => !m.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phone ?? "").includes(q));
    }
    if (gradeFilter !== "all") list = list.filter(m => m.grades?.includes(Number(gradeFilter)));
    if (wlFilter !== "all") {
      list = list.filter(m => {
        const pct = workloadPct(m);
        if (wlFilter === "low")    return pct <= 50;
        if (wlFilter === "medium") return pct > 50 && pct <= 80;
        return pct > 80;
      });
    }
    list.sort((a, b) => {
      const va = sort.key === "workload" ? workloadPct(a) : (a[sort.key] ?? 0);
      const vb = sort.key === "workload" ? workloadPct(b) : (b[sort.key] ?? 0);
      if (typeof va === "string" && typeof vb === "string") return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sort.dir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return list;
  }, [mentors, activeTab, search, gradeFilter, wlFilter, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const hdr = ["Name","Email","Phone","Grades","Students","Workload%","Health Score","Attendance%","Assessments%","Status"].join(",");
    const rows = filtered.map(m =>
      [m.name, m.email, m.phone ?? "", gradesLabel(m.grades), m.assignedStudents, workloadPct(m), m.healthScore, m.attendancePct ?? "", m.homeworkPct ?? "", m.isActive ? "Active" : "Inactive"].join(",")
    );
    const blob = new Blob([[hdr, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "academic-mentors.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const TABS = [
    { key: "all"      as const, label: "All Mentors", count: mentors.length       },
    { key: "active"   as const, label: "Active",      count: activeCount           },
    { key: "inactive" as const, label: "Inactive",    count: mentors.length - activeCount },
  ];

  return (
    <div className="space-y-4">
      {/* Modals */}
      {showAdd    && <AddMentorModal onClose={() => setShowAdd(false)} onCreated={loadData} flash={flash} />}
      {moveTarget && <ConfirmMoveModal mentor={moveTarget} onClose={() => setMoveTarget(null)} onConfirm={() => moveToSales(moveTarget)} />}
      {profileId  && <ProfileDrawer mentorId={profileId} onClose={() => setProfileId(null)} />}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Mastery Mentors</h1>
          <p className="text-xs text-gray-400 mt-0.5">Academic mentors only · Separate from Ignite Sales mentors</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={loadData} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-black hover:opacity-90 shadow-sm"
            style={{ background: ORANGE }}>
            <Plus className="w-3.5 h-3.5" /> Add Academic Mentor
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {[
          { label: "Total Mentors",    value: mentors.length,  sub: "Academic only",                   icon: Users,         color: NAVY,      bg: "#EEF2FF" },
          { label: "Active Mentors",   value: activeCount,     sub: mentors.length > 0 ? `${Math.round(activeCount / mentors.length * 100)}% of total` : "—", icon: CheckCircle2, color: GREEN, bg: "#DCFCE7" },
          { label: "Students",         value: totalStudents,   sub: "Across all mentors",              icon: GraduationCap, color: "#3B82F6", bg: "#DBEAFE" },
          { label: "Avg Workload",     value: `${avgWorkload}%`, sub: wlLabel,                         icon: Activity,      color: avgWorkload <= 50 ? GREEN : avgWorkload <= 80 ? "#D97706" : "#DC2626", bg: avgWorkload <= 50 ? "#DCFCE7" : avgWorkload <= 80 ? "#FEF3C7" : "#FEE2E2" },
          { label: "Avg Health",       value: `${avgHealth}%`, sub: hlLabel,                          icon: TrendingUp,    color: avgHealth  >= 80 ? GREEN : avgHealth  >= 60 ? "#D97706" : "#DC2626", bg: avgHealth  >= 80 ? "#DCFCE7" : avgHealth  >= 60 ? "#FEF3C7" : "#FEE2E2" },
          { label: "At Risk",          value: atRiskCount,     sub: "Needs Attention",                 icon: AlertTriangle, color: ORANGE,    bg: "#FFF7ED" },
          { label: "Satisfaction",     value: `${satisfaction}/5`, sub: "Based on health score",       icon: Star,          color: "#D97706", bg: "#FFFBEB" },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col gap-1.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: k.bg }}>
              <k.icon className="w-4 h-4" style={{ color: k.color }} />
            </div>
            <div className="text-lg font-black leading-none" style={{ color: loading ? "#D1D5DB" : k.color }}>
              {loading ? "—" : k.value}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">{k.label}</div>
            <div className="text-[9px] text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Charts + Sidebar ────────────────────────────────────────────── */}
      <div className="flex gap-4 items-start">
        {/* Charts */}
        <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Workload BarChart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-black mb-3" style={{ color: NAVY }}>Mentor Workload Overview</h3>
            {loading ? (
              <div className="h-52 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : wlChartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-gray-400">No mentors yet</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={wlChartData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<WlTooltip />} />
                    <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {wlChartData.map((d, i) => <Cell key={i} fill={workloadBarColor(d.pct)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 justify-center mt-1">
                  {[{ label: "Low (0–50%)", color: "#22C55E" }, { label: "Medium (51–80%)", color: "#F59E0B" }, { label: "High (81–100%)", color: "#EF4444" }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} /> {l.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Health Donut — academic only */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-black mb-3" style={{ color: NAVY }}>Student Health Overview</h3>
            {loading ? (
              <div className="h-52 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : (
              <div className="flex items-center gap-4">
                <DonutChart data={donutData} total={donutTotal} />
                <div className="flex-1 space-y-2.5">
                  {donutData.map(d => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-gray-600 font-medium">{d.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black" style={{ color: NAVY }}>{d.value}</span>
                        <span className="text-[10px] text-gray-400 ml-1">
                          ({donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-3">
          {/* Top Performers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h4 className="text-sm font-black" style={{ color: NAVY }}>Top Performers</h4>
              </div>
              <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">This Month</span>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : topMentors.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">No active mentors yet</div>
            ) : (
              <>
                {topMentors.map((m, i) => (
                  <div key={m.id} onClick={() => setProfileId(m.id)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-all">
                    <span className="text-xs font-black w-4 shrink-0" style={{ color: NAVY }}>{i + 1}</span>
                    <Avatar name={m.name} size={28} color={["#4F46E5","#059669","#D97706"][i]} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate" style={{ color: NAVY }}>{m.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">{m.email}</div>
                    </div>
                    <StarsDisplay rating={starRating(m.healthScore)} />
                  </div>
                ))}
                <button onClick={() => setActiveTab("active")} className="mt-1 w-full text-xs font-semibold text-blue-600 hover:text-blue-700 py-1.5 text-center">
                  View All Rankings →
                </button>
              </>
            )}
          </div>

          {/* At Risk */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h4 className="text-sm font-black text-red-700">Attention Needed</h4>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : atRiskItems.length === 0 ? (
              <div className="text-xs text-green-600 text-center py-3 font-semibold">✓ All mentors healthy</div>
            ) : atRiskItems.map((s, i) => {
              const rc = [{ bg: "#FEF3C7", text: "#D97706" }, { bg: "#FEE2E2", text: "#DC2626" }, { bg: "#EDE9FE", text: "#7C3AED" }][i % 3];
              return (
                <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <Avatar name={s.name} size={26} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{s.name}</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0" style={{ background: rc.bg, color: rc.text }}>
                    {s.reason}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4" style={{ color: ORANGE }} />
              <h4 className="text-sm font-black" style={{ color: NAVY }}>Recent Activities</h4>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />)}</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-4">No recent activity</div>
            ) : recentActivity.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: ORANGE }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-600 leading-tight">{a.note}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{a.mentorName}</div>
                </div>
                <div className="text-[9px] text-gray-400 shrink-0">{timeAgo(a.time)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mentor Table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-gray-100">
          <div className="flex gap-0">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label}
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: activeTab === t.key ? "#DBEAFE" : "#F3F4F6", color: activeTab === t.key ? "#1D4ED8" : "#6B7280" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email or phone…"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white" />
          </div>
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
            <option value="all">Grade: All</option>
            {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select value={wlFilter} onChange={e => { setWlFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
            <option value="all">Workload: All</option>
            <option value="low">Low (0–50%)</option>
            <option value="medium">Medium (51–80%)</option>
            <option value="high">High (81–100%)</option>
          </select>
          {(search || gradeFilter !== "all" || wlFilter !== "all") && (
            <button onClick={() => { setSearch(""); setGradeFilter("all"); setWlFilter("all"); setPage(1); }}
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <UserCheck2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-semibold text-gray-400">No mentors found</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl text-white text-xs font-bold" style={{ background: ORANGE }}>
              Add Academic Mentor
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="border-b border-gray-100 bg-[#FAFBFF]">
                  <tr>
                    {[
                      { label: "Mentor",       key: "name"             as SortKey },
                      { label: "Grades",        key: null },
                      { label: "Students",      key: "assignedStudents" as SortKey },
                      { label: "Workload",      key: "workload"         as SortKey },
                      { label: "Health Score",  key: "healthScore"      as SortKey },
                      { label: "Attendance",    key: "attendancePct"    as SortKey },
                      { label: "Assessments",   key: "homeworkPct"      as SortKey },
                      { label: "At Risk",       key: null },
                      { label: "Performance",   key: "healthScore"      as SortKey },
                      { label: "Status",        key: null },
                      { label: "Actions",       key: null },
                    ].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                        {h.key ? (
                          <button onClick={() => handleSort(h.key!)} className="flex items-center gap-1 hover:text-gray-800 transition-colors">
                            {h.label}
                            <span className="text-gray-300 text-xs">{sort.key === h.key ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
                          </button>
                        ) : h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(m => {
                    const hc   = healthColor(m.healthLabel);
                    const wPct = workloadPct(m);
                    const wCol = workloadBarColor(wPct);
                    const atRisk = Math.max(0, Math.round((m.assignedStudents * (100 - m.healthScore)) / 100));
                    return (
                      <tr key={m.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors cursor-pointer"
                        onClick={() => setProfileId(m.id)}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name} size={32} />
                            <div>
                              <div className="font-bold text-gray-800">{m.name}</div>
                              <div className="text-[10px] text-gray-400">{m.email}</div>
                              {m.phone && <div className="text-[10px] text-gray-400">{m.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "#EEF2FF", color: NAVY }}>
                            {gradesLabel(m.grades)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-sm font-black" style={{ color: NAVY }}>{m.assignedStudents}</span>
                        </td>
                        <td className="px-3 py-2.5 min-w-[90px]">
                          <PctBar pct={wPct} color={wCol} />
                          <div className="text-[9px] mt-0.5 font-semibold" style={{ color: wCol }}>{workloadLbl(wPct)}</div>
                        </td>
                        <td className="px-3 py-2.5 min-w-[90px]">
                          <PctBar pct={m.healthScore} color={hc.bar} />
                          <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full font-bold inline-block" style={{ background: hc.bg, color: hc.text }}>
                            {m.healthLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 min-w-[80px]">
                          {m.attendancePct !== null ? (
                            <PctBar pct={m.attendancePct} color={m.attendancePct >= 75 ? GREEN : m.attendancePct >= 60 ? "#D97706" : "#EF4444"} />
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 min-w-[80px]">
                          {m.homeworkPct !== null ? (
                            <PctBar pct={m.homeworkPct} color={m.homeworkPct >= 75 ? GREEN : m.homeworkPct >= 50 ? "#D97706" : "#EF4444"} />
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-sm font-black ${atRisk > 0 ? "text-red-500" : "text-gray-300"}`}>{atRisk}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <StarsDisplay rating={starRating(m.healthScore)} />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {m.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <ActionsMenu mentor={m}
                            onView={() => setProfileId(m.id)}
                            onToggle={() => toggleActive(m)}
                            onMoveToSales={() => setMoveTarget(m)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400">
                Showing {filtered.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-xs font-bold transition-all"
                      style={p === page ? { background: NAVY, color: "white" } : { background: "white", color: "#6B7280", border: "1px solid #E5E7EB" }}>
                      {p}
                    </button>
                  );
                })}
                <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-xs text-gray-400">10 per page</span>
            </div>
          </>
        )}
      </div>

      {/* ── Performance Insights ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-black mb-4" style={{ color: NAVY }}>Mentor Performance Insights</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { icon: "📊", label: "Best Attendance",  name: bestAtt?.name      ?? "—", value: bestAtt      ? `${bestAtt.attendancePct}%`   : "—" },
            { icon: "📝", label: "Best Assessments", name: bestHw?.name       ?? "—", value: bestHw       ? `${bestHw.homeworkPct}%`      : "—" },
            { icon: "📈", label: "Most Improved",    name: topMentors[1]?.name ?? "—", value: topMentors[1] ? `${topMentors[1].healthScore}% health` : "—" },
            { icon: "👥", label: "Most Students",    name: mostStudents?.name  ?? "—", value: mostStudents ? `${mostStudents.assignedStudents} students` : "—" },
          ].map((ins, i) => (
            <div key={i} className="rounded-xl p-3 border border-gray-100 bg-[#F8FAFF]">
              <div className="text-lg mb-1">{ins.icon}</div>
              <div className="text-xs text-gray-500 font-medium">{ins.label}</div>
              <div className="text-sm font-black mt-0.5 truncate" style={{ color: NAVY }}>{ins.name}</div>
              <div className="text-xs font-black mt-0.5" style={{ color: GREEN }}>{ins.value}</div>
            </div>
          ))}
          <div className="rounded-xl p-3 border border-blue-100 bg-[#F0F7FF] cursor-pointer hover:bg-blue-50 transition-all">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-black" style={{ color: NAVY }}>Mentor Communication</span>
            <p className="text-[10px] text-gray-500 leading-snug mt-0.5">Send announcements & updates</p>
          </div>
          <div className="rounded-xl p-3 border border-purple-100 bg-[#F5F3FF] cursor-pointer hover:bg-purple-50 transition-all">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-100 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <span className="text-xs font-black" style={{ color: NAVY }}>Reports &amp; Analytics</span>
            <p className="text-[10px] text-gray-500 leading-snug mt-0.5">Detailed performance reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}
