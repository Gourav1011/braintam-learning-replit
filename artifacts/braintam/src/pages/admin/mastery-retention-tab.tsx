import { useState, useEffect, useCallback } from "react";
import {
  Phone, MessageSquare, FileText, Calendar, CheckCircle2, XCircle,
  RefreshCw, Search, ChevronDown, ChevronUp, Loader2, X, RotateCcw,
  AlertTriangle, Trophy, TrendingUp, Clock, ArrowRight, Star, Users,
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
const RED    = "#EF4444";
const AMBER  = "#F59E0B";
const PURPLE = "#8B5CF6";

interface RetentionStudent {
  id: number;
  studentName: string;
  parentName: string | null;
  phone: string;
  grade: number;
  board: string | null;
  mentorName: string | null;
  masteryStatus: string;
  retentionStatus: string | null;
  retentionContactedAt: string | null;
  retentionFollowupAt: string | null;
  retentionNotes: string | null;
  renewalDueDate: string | null;
  renewedAt: string | null;
  academicYear: string | null;
  amountPaid: number;
}

interface RetentionStats {
  retentionDue: number;
  contacted: number;
  interested: number;
  followUp: number;
  renewed: number;
  lost: number;
}

interface LeaderboardEntry {
  mentorId: number;
  mentorName: string;
  totalStudents: number;
  retentionDue: number;
  renewed: number;
  retentionPct: number;
  rank: number;
}

const PIPELINE_STAGES = [
  { key: "Retention Due",  label: "Retention Due",  color: AMBER,  bg: "#FEF3C7", icon: AlertTriangle },
  { key: "Contacted",      label: "Contacted",       color: "#3B82F6", bg: "#EFF6FF", icon: Phone },
  { key: "Interested",     label: "Interested",      color: "#8B5CF6", bg: "#EDE9FE", icon: Star },
  { key: "Follow-up",      label: "Follow-up",       color: ORANGE, bg: "#FFF7ED", icon: Calendar },
  { key: "Renewed",        label: "Renewed",         color: GREEN,  bg: "#D1FAE5", icon: CheckCircle2 },
  { key: "Lost",           label: "Lost",            color: RED,    bg: "#FEE2E2", icon: XCircle },
];

function statusStage(s: RetentionStudent) {
  const rs = s.retentionStatus;
  if (rs === "Renewed") return "Renewed";
  if (rs === "Lost") return "Lost";
  if (rs === "Follow-up") return "Follow-up";
  if (rs === "Interested") return "Interested";
  if (rs === "Contacted") return "Contacted";
  return "Retention Due";
}

// ── Action Modals ─────────────────────────────────────────────────────────────
function AddNoteModal({ student, onClose, onDone }: { student: RetentionStudent; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState(student.retentionNotes ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    await apiFetch(`/admin/mastery/retention/${student.id}/status`, {
      method: "PATCH", body: JSON.stringify({ notes: note }),
    });
    setSaving(false);
    onDone();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-black" style={{ color: NAVY }}>Add Note — {student.studentName}</span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5">
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Retention notes, call summary, parent feedback…"
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-300 resize-none" />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-semibold" style={{ background: NAVY }}>
            {saving ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleFollowupModal({ student, onClose, onDone }: { student: RetentionStudent; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!date) return;
    setSaving(true);
    await apiFetch(`/admin/mastery/retention/${student.id}/status`, {
      method: "PATCH", body: JSON.stringify({ retentionStatus: "Follow-up", followupAt: date }),
    });
    setSaving(false);
    onDone();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-black" style={{ color: NAVY }}>Schedule Follow-up</span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-600">Schedule a follow-up call for <strong>{student.studentName}</strong>.</p>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-300" />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !date} className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-semibold" style={{ background: ORANGE }}>
            {saving ? "Saving…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RenewModal({ student, onClose, onDone }: { student: RetentionStudent; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount]     = useState(String(student.amountPaid));
  const [coursePlan, setCourse] = useState(student.board ?? "");
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [done, setDone]         = useState(false);
  const [newGrade, setNewGrade] = useState(0);

  async function save() {
    setSaving(true);
    const r = await apiFetch(`/admin/mastery/retention/${student.id}/renew`, {
      method: "POST",
      body: JSON.stringify({
        amountPaid:    amount ? parseInt(amount, 10) : undefined,
        coursePlan:    coursePlan || undefined,
        renewalNotes:  notes || undefined,
      }),
    });
    if (r.ok) {
      const d = await r.json() as { newGrade: number };
      setNewGrade(d.newGrade);
      setDone(true);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-black text-green-700">🎉 Renew Student</span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "#D1FAE5" }}>
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="font-black" style={{ color: NAVY }}>{student.studentName} Renewed!</p>
            <p className="text-sm text-gray-500">Promoted to Grade {newGrade} · New academic year created</p>
            <button onClick={onDone} className="w-full px-4 py-2.5 rounded-xl text-white text-xs font-semibold" style={{ background: GREEN }}>Done</button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-600">
                Renewing <strong>{student.studentName}</strong> (Grade {student.grade} → Grade {student.grade + 1}).
                Previous academic history will be preserved.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Renewal Amount (₹)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Course Plan</label>
                <input value={coursePlan} onChange={e => setCourse(e.target.value)}
                  placeholder="e.g. Annual plan"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-300" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-green-300 resize-none" />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-semibold" style={{ background: GREEN }}>
                {saving ? "Renewing…" : "Confirm Renewal"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Student Row Actions ───────────────────────────────────────────────────────
function StudentActions({
  student, onStatusChange, onRefresh,
}: { student: RetentionStudent; onStatusChange: (s: RetentionStudent) => void; onRefresh: () => void }) {
  const [showNote, setShowNote]         = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showRenew, setShowRenew]       = useState(false);
  const [loading, setLoading]           = useState<string | null>(null);

  async function setStatus(status: string) {
    setLoading(status);
    await apiFetch(`/admin/mastery/retention/${student.id}/status`, {
      method: "PATCH", body: JSON.stringify({ retentionStatus: status }),
    });
    setLoading(null);
    onRefresh();
  }

  async function markLost() {
    setLoading("lost");
    await apiFetch(`/admin/mastery/retention/${student.id}/lost`, { method: "POST" });
    setLoading(null);
    onRefresh();
  }

  const whatsappMsg = encodeURIComponent(
    `Hi ${student.parentName ?? student.studentName}! This is Braintam. We wanted to discuss ${student.studentName}'s renewal for Grade ${student.grade + 1}. Please let us know a good time to talk. 🎓`
  );

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        <a href={`tel:${student.phone}`}
          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100" title="Call">
          <Phone className="w-3 h-3" />
        </a>
        <a href={`https://wa.me/91${student.phone}?text=${whatsappMsg}`} target="_blank" rel="noreferrer"
          className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100" title="WhatsApp">
          <MessageSquare className="w-3 h-3" />
        </a>
        <button onClick={() => setShowNote(true)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="Add Note">
          <FileText className="w-3 h-3" />
        </button>
        <button onClick={() => setShowFollowup(true)} className="p-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100" title="Schedule Follow-up">
          <Calendar className="w-3 h-3" />
        </button>
        {statusStage(student) !== "Renewed" && statusStage(student) !== "Lost" && (
          <>
            {statusStage(student) === "Retention Due" && (
              <button onClick={() => setStatus("Contacted")} disabled={loading === "Contacted"}
                className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-semibold">
                {loading === "Contacted" ? "…" : "Contacted"}
              </button>
            )}
            {statusStage(student) === "Contacted" && (
              <button onClick={() => setStatus("Interested")} disabled={loading === "Interested"}
                className="px-2 py-1 rounded-lg text-white text-[10px] font-semibold" style={{ background: PURPLE }}>
                {loading === "Interested" ? "…" : "Interested"}
              </button>
            )}
            <button onClick={() => setShowRenew(true)} className="px-2 py-1 rounded-lg text-white text-[10px] font-semibold" style={{ background: GREEN }}>
              Renew
            </button>
            <button onClick={markLost} disabled={loading === "lost"} className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-semibold border border-red-100">
              {loading === "lost" ? "…" : "Lost"}
            </button>
          </>
        )}
      </div>

      {showNote     && <AddNoteModal      student={student} onClose={() => setShowNote(false)}     onDone={() => { setShowNote(false); onRefresh(); }} />}
      {showFollowup && <ScheduleFollowupModal student={student} onClose={() => setShowFollowup(false)} onDone={() => { setShowFollowup(false); onRefresh(); }} />}
      {showRenew    && <RenewModal        student={student} onClose={() => setShowRenew(false)}    onDone={() => { setShowRenew(false); onRefresh(); }} />}
    </>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export function MasteryRetentionTab() {
  const [students, setStudents]     = useState<RetentionStudent[]>([]);
  const [stats, setStats]           = useState<RetentionStats>({ retentionDue: 0, contacted: 0, interested: 0, followUp: 0, renewed: 0, lost: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<"pipeline" | "leaderboard">("pipeline");
  const [filterStage, setFilterStage] = useState("all");
  const [search, setSearch]         = useState("");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [rr, lr] = await Promise.all([
      apiFetch("/admin/mastery/retention"),
      apiFetch("/admin/mastery/retention/leaderboard"),
    ]);
    if (rr.ok) {
      const d = await rr.json() as { students: RetentionStudent[]; stats: RetentionStats };
      setStudents(d.students ?? []);
      setStats(d.stats ?? { retentionDue: 0, contacted: 0, interested: 0, followUp: 0, renewed: 0, lost: 0 });
    }
    if (lr.ok) setLeaderboard(await lr.json() as LeaderboardEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function triggerDec1() {
    setTriggerLoading(true);
    const r = await apiFetch("/admin/mastery/retention/trigger-dec1", { method: "POST" });
    const d = await r.json() as { updated?: number; message?: string };
    setTriggerMsg(`${d.message ?? "Done"} — ${d.updated ?? 0} students moved to Retention Due`);
    setTriggerLoading(false);
    load();
  }

  const filtered = students.filter(s => {
    if (filterStage !== "all" && statusStage(s) !== filterStage) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.studentName.toLowerCase().includes(q) || s.phone.includes(q) || s.mentorName?.toLowerCase().includes(q);
    }
    return true;
  });

  const pipelineCards = [
    { stage: "Retention Due", count: stats.retentionDue, color: AMBER,     bg: "#FEF3C7", icon: AlertTriangle },
    { stage: "Contacted",     count: stats.contacted,    color: "#3B82F6",  bg: "#EFF6FF", icon: Phone },
    { stage: "Interested",    count: stats.interested,   color: PURPLE,     bg: "#EDE9FE", icon: Star },
    { stage: "Follow-up",     count: stats.followUp,     color: ORANGE,     bg: "#FFF7ED", icon: Calendar },
    { stage: "Renewed",       count: stats.renewed,      color: GREEN,      bg: "#D1FAE5", icon: CheckCircle2 },
    { stage: "Lost",          count: stats.lost,         color: RED,        bg: "#FEE2E2", icon: XCircle },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Mastery Retention Engine</h2>
          <p className="text-xs text-gray-500 mt-0.5">Track, contact, and renew students before they lapse</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === "pipeline" ? "leaderboard" : "pipeline")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">
            {view === "pipeline" ? <><Trophy className="w-3.5 h-3.5" /> Leaderboard</> : <><Users className="w-3.5 h-3.5" /> Pipeline</>}
          </button>
          <button onClick={triggerDec1} disabled={triggerLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold"
            style={{ background: AMBER }}>
            {triggerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Trigger Dec 1 (Active → Retention Due)
          </button>
          <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {triggerMsg && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
          <span>{triggerMsg}</span>
          <button onClick={() => setTriggerMsg("")}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Pipeline Cards */}
      <div className="grid grid-cols-6 gap-3">
        {pipelineCards.map(c => {
          const active = filterStage === c.stage;
          return (
            <button key={c.stage} onClick={() => setFilterStage(active ? "all" : c.stage)}
              className="rounded-2xl p-3 text-left transition-all border-2"
              style={{
                background: active ? c.color : "white",
                borderColor: active ? c.color : "#E5E7EB",
                boxShadow: active ? `0 4px 12px ${c.color}40` : "none",
              }}>
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mb-2"
                style={{ background: active ? "rgba(255,255,255,0.25)" : c.bg }}>
                <c.icon className="w-3.5 h-3.5" style={{ color: active ? "white" : c.color }} />
              </div>
              <p className="text-xl font-black" style={{ color: active ? "white" : NAVY }}>{c.count}</p>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: active ? "rgba(255,255,255,0.8)" : "#6B7280" }}>{c.stage}</p>
            </button>
          );
        })}
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="hidden md:flex items-center gap-2 text-[10px] text-gray-400 justify-center">
        {["Retention Due", "→", "Contacted", "→", "Interested", "→", "Follow-up", "→", "Renewed"].map((s, i) => (
          <span key={i} className={s === "→" ? "text-gray-200" : "px-2 py-1 rounded-full border border-gray-200 text-gray-500 font-semibold"}>{s}</span>
        ))}
        <span className="text-gray-300 mx-2">|</span>
        <span className="px-2 py-1 rounded-full border border-red-100 text-red-400 font-semibold">Lost</span>
      </div>

      {view === "leaderboard" ? (
        /* Retention Leaderboard */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-black" style={{ color: NAVY }}>Retention Leaderboard</p>
            <p className="text-xs text-gray-400 mt-0.5">Renewed ÷ Retention Due × 100</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-center px-4 py-3 font-semibold text-gray-500 w-16">Rank</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Mentor</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Retention Due</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Renewed</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-500 w-40">Retention %</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : leaderboard.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No retention data yet</td></tr>
              ) : leaderboard.map(m => (
                <tr key={m.mentorId} className="border-b border-gray-50 hover:bg-blue-50/20">
                  <td className="px-4 py-3 text-center">
                    {m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : m.rank === 3 ? "🥉" : (
                      <span className="font-bold text-gray-500">{m.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{m.mentorName}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{m.retentionDue}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{m.renewed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${m.retentionPct}%`,
                          background: m.retentionPct >= 80 ? GREEN : m.retentionPct >= 50 ? AMBER : RED,
                        }} />
                      </div>
                      <span className="font-black w-9 text-right" style={{
                        color: m.retentionPct >= 80 ? GREEN : m.retentionPct >= 50 ? AMBER : RED,
                      }}>{m.retentionPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Pipeline Table */
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search student, phone, mentor…"
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
            </div>
            <span className="text-xs text-gray-500">{filtered.length} students</span>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Grade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Mentor</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Follow-up</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Notes</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No students in retention pipeline yet</td></tr>
                ) : filtered.map(s => {
                  const stage = statusStage(s);
                  const stageCfg = PIPELINE_STAGES.find(p => p.key === stage) ?? PIPELINE_STAGES[0];
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">{s.studentName}</p>
                          <p className="text-gray-400">{s.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">Grade {s.grade}</td>
                      <td className="px-4 py-3 text-gray-600">{s.mentorName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: stageCfg.bg, color: stageCfg.color }}>
                          <stageCfg.icon className="w-2.5 h-2.5" />
                          {stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {s.retentionFollowupAt
                          ? new Date(s.retentionFollowupAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[150px]">
                        <p className="truncate">{s.retentionNotes ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StudentActions student={s} onStatusChange={() => {}} onRefresh={load} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
