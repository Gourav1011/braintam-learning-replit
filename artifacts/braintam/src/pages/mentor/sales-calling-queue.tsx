import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Search, Phone, MessageSquare, User, X,
  ChevronRight, Clock, CheckCircle, AlertTriangle, Loader2, Save,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
}

export interface SalesLead {
  id: number;
  name: string;
  grade: number;
  school: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  parentName: string | null;
  parentPhone: string | null;
  leadStage: string;
  callStatus: string;
  interestLevel: string | null;
  weakSubject: string | null;
  strongSubject: string | null;
  repeatedCustomer: boolean;
  nextFollowUpAt: string | null;
  nextFollowUpTime: string | null;
  lastCallAt: string | null;
  busyReason: string | null;
  hwPct: number | null;
  attPct: number | null;
}

interface CallOutcomeHistory {
  id: number;
  note: string;
  callStatus: string | null;
  leadStatus: string | null;
  calledByName: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
}

const CALL_STATUSES = [
  { key: "Need To Call", label: "Need To Call", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  { key: "Picked", label: "Picked", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
  { key: "Busy", label: "Busy", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { key: "Call Back", label: "Call Back", color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
  { key: "Not Connected", label: "Not Connected", color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB" },
];

const LEAD_STATUSES = [
  { key: "New Lead", label: "New Lead", color: "#6B7280", bg: "#F9FAFB" },
  { key: "Demo Active", label: "Demo Active", color: "#6366F1", bg: "#EEF2FF" },
  { key: "Interested", label: "Interested", color: "#0284C7", bg: "#E0F2FE" },
  { key: "Highly Interested", label: "Highly Interested", color: "#D97706", bg: "#FFFBEB" },
  { key: "Converted", label: "Converted", color: "#059669", bg: "#ECFDF5" },
  { key: "Dropped", label: "Dropped", color: "#DC2626", bg: "#FEF2F2" },
];

const INTEREST_LEVELS = [
  { key: "Low", color: "#6B7280", bg: "#F9FAFB" },
  { key: "Moderate", color: "#D97706", bg: "#FFFBEB" },
  { key: "High", color: "#0284C7", bg: "#EFF6FF" },
  { key: "Very High", color: "#059669", bg: "#ECFDF5" },
];

const BUSY_REASONS = ["At Work", "In Meeting", "Driving", "Sleeping", "Will Call Back", "Other"];

const ALL_FILTERS = [
  ...CALL_STATUSES.map(s => ({ key: s.key, label: s.label, color: s.color, bg: s.bg, border: s.border, kind: "call" as const })),
  { key: "Interested", label: "Interested", color: "#0284C7", bg: "#E0F2FE", border: "#BAE6FD", kind: "lead" as const },
  { key: "Highly Interested", label: "Highly Interested", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", kind: "lead" as const },
  { key: "Converted", label: "Converted", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", kind: "lead" as const },
];

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}
function fmtDateTime(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function LeadStageBadge({ stage }: { stage: string }) {
  const s = LEAD_STATUSES.find(l => l.key === stage) ?? { color: "#6B7280", bg: "#F9FAFB" };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>{stage}</span>
  );
}

function CallStatusBadge({ status }: { status: string }) {
  const s = CALL_STATUSES.find(c => c.key === status) ?? { color: "#6B7280", bg: "#F9FAFB" };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>{status}</span>
  );
}

function InterestBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-[10px] text-gray-300">—</span>;
  const s = INTEREST_LEVELS.find(i => i.key === level) ?? { color: "#6B7280", bg: "#F9FAFB" };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
      style={{ background: s.bg, color: s.color }}>{level}</span>
  );
}

function PctBar({ pct, color }: { pct: number | null; color: string }) {
  if (pct === null) return <span className="text-[10px] text-gray-300">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold" style={{ color: pct >= 70 ? GREEN : pct >= 40 ? "#D97706" : "#DC2626" }}>{pct}%</span>
      <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? GREEN : pct >= 40 ? "#D97706" : "#DC2626" }} />
      </div>
    </div>
  );
}

interface CallOutcomeModalProps {
  lead: SalesLead;
  onClose: () => void;
  onSaved: (updated: Partial<SalesLead>) => void;
  onOpenProfile: (id: number, name: string) => void;
}

function CallOutcomeModal({ lead, onClose, onSaved, onOpenProfile }: CallOutcomeModalProps) {
  const [outcome, setOutcome] = useState(lead.callStatus !== "Need To Call" ? lead.callStatus : "Picked");
  const [busyReason, setBusyReason] = useState(lead.busyReason ?? "");
  const [leadStatus, setLeadStatus] = useState(lead.leadStage);
  const [interestLevel, setInterestLevel] = useState(lead.interestLevel ?? "");
  const [remark, setRemark] = useState("");
  const [nextDate, setNextDate] = useState(lead.nextFollowUpAt ?? "");
  const [nextTime, setNextTime] = useState(lead.nextFollowUpTime ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<CallOutcomeHistory[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setHistLoading(true);
      const r = await apiFetch(`/mentor/sales/history/${lead.id}`);
      if (r.ok) setHistory(await r.json());
      setHistLoading(false);
    })();
  }, [lead.id]);

  async function handleSave() {
    if (!remark.trim()) { setError("Remark is required"); return; }
    setSaving(true);
    setError("");
    const r = await apiFetch(`/mentor/sales/call-outcome/${lead.id}`, {
      method: "POST",
      body: JSON.stringify({ callOutcome: outcome, busyReason: outcome === "Busy" ? busyReason : "", leadStatus, interestLevel: interestLevel || undefined, remark: remark.trim(), nextFollowUpAt: nextDate || undefined, nextFollowUpTime: nextTime || undefined }),
    });
    if (r.ok) {
      onSaved({ callStatus: outcome, leadStage: leadStatus, interestLevel: interestLevel || lead.interestLevel, nextFollowUpAt: nextDate || lead.nextFollowUpAt, nextFollowUpTime: nextTime || lead.nextFollowUpTime, busyReason: outcome === "Busy" ? busyReason : lead.busyReason, lastCallAt: new Date().toISOString() });
      onClose();
    } else {
      const d = await r.json().catch(() => ({}));
      setError(d.error ?? "Failed to save");
    }
    setSaving(false);
  }

  const callStatusStyle = CALL_STATUSES.find(c => c.key === outcome) ?? { color: "#6B7280", bg: "#F9FAFB" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md h-full overflow-y-auto bg-white shadow-2xl flex flex-col"
        style={{ fontFamily: "Poppins, sans-serif" }}>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0"
          style={{ background: NAVY }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-base">{lead.name}</span>
              {lead.repeatedCustomer && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black" style={{ background: ORANGE, color: "white" }}>🔄 Repeated</span>
              )}
            </div>
            <div className="text-[11px] text-blue-200 mt-0.5">Grade {lead.grade} · {lead.school ?? "—"} · {lead.city ?? "—"}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <LeadStageBadge stage={lead.leadStage} />
              {lead.interestLevel && <InterestBadge level={lead.interestLevel} />}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { onClose(); onOpenProfile(lead.id, lead.name); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
              <User className="w-3 h-3" /> Profile
            </button>
            <button onClick={onClose} className="text-blue-200 hover:text-white p-1"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 p-4 pb-0">
            <a href={`tel:${lead.parentPhone ?? lead.phone}`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold"
              style={{ background: GREEN }}>
              <Phone className="w-3.5 h-3.5" /> Call Now
            </a>
            <a href={`https://wa.me/${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold"
              style={{ background: "#25D366" }}>
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>

          {/* Call Outcome Form */}
          <div className="p-4 space-y-3">
            <div className="font-black text-sm" style={{ color: NAVY }}>7. Call Outcome &amp; Remarks</div>

            {/* Outcome */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Call Outcome</label>
              <select value={outcome} onChange={e => setOutcome(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none appearance-none"
                style={{ color: callStatusStyle.color, background: callStatusStyle.bg }}>
                {CALL_STATUSES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Busy Reason (conditional) */}
            {outcome === "Busy" && (
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Busy Reason</label>
                <select value={busyReason} onChange={e => setBusyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                  <option value="">Select reason…</option>
                  {BUSY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* Lead Status */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Lead Status</label>
              <select value={leadStatus} onChange={e => setLeadStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white">
                {LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            {/* Interest Level */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Interest Level</label>
              <div className="flex gap-1.5 flex-wrap">
                {INTEREST_LEVELS.map(l => (
                  <button key={l.key} type="button" onClick={() => setInterestLevel(interestLevel === l.key ? "" : l.key)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all"
                    style={{
                      background: interestLevel === l.key ? l.bg : "white",
                      color: interestLevel === l.key ? l.color : "#9CA3AF",
                      borderColor: interestLevel === l.key ? l.color : "#E5E7EB",
                    }}>
                    {l.key}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Follow-Up */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Next Follow-Up Date</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Next Follow-Up Time</label>
                <input type="time" value={nextTime} onChange={e => setNextTime(e.target.value)}
                  className="w-full px-2 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
              </div>
            </div>

            {/* Remark */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Add Remark <span className="text-red-500">(Mandatory)</span></label>
              <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3}
                placeholder="Enter call notes, parent conversation details…"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs resize-none outline-none focus:border-blue-300" />
            </div>

            {error && <p className="text-[10px] text-red-600 font-semibold">{error}</p>}

            {/* Save */}
            <button onClick={handleSave} disabled={saving || !remark.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-black transition-all disabled:opacity-60"
              style={{ background: saving ? "#9CA3AF" : ORANGE }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving…" : "Save Outcome"}
            </button>

            {/* Important Rules */}
            <div className="rounded-xl p-3 text-[10px] space-y-1.5" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <div className="font-black text-green-700 mb-1.5">✅ IMPORTANT RULES</div>
              {[
                "Remarks once saved CANNOT be edited.",
                "Remarks once saved CANNOT be deleted.",
                "Every remark is permanent.",
                "New remark = new entry in timeline.",
              ].map(r => (
                <div key={r} className="flex items-start gap-1.5 text-green-700">
                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Remark Timeline */}
          <div className="px-4 pb-5">
            <div className="font-black text-sm mb-3" style={{ color: NAVY }}>
              Remark Timeline <span className="text-[10px] font-normal text-gray-400">(Permanent History)</span>
            </div>
            {histLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">No call history yet</div>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="rounded-xl p-3 border border-gray-100 bg-gray-50">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: ORANGE }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                          <span className="text-[10px] font-bold text-gray-500">
                            {fmtDateTime(h.createdAt)} · {h.calledByName ?? "Mentor"}
                          </span>
                          {h.leadStatus && <LeadStageBadge stage={h.leadStatus} />}
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{h.note}</p>
                        {h.nextFollowUpDate && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600">
                            <Clock className="w-2.5 h-2.5" />
                            Next Follow-Up: {fmtDate(h.nextFollowUpDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-center text-[10px] text-gray-400 italic mt-2">Only Super Admin can archive history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SalesCallingQueueTab({
  onOpenStudent,
}: {
  onOpenStudent: (id: number, name: string) => void;
}) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("Need To Call");
  const [search, setSearch] = useState("");
  const [outcomeTarget, setOutcomeTarget] = useState<SalesLead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/mentor/sales/leads");
    if (r.ok) setLeads(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function countForFilter(key: string) {
    const f = ALL_FILTERS.find(f => f.key === key);
    if (!f) return 0;
    if (f.kind === "call") return leads.filter(l => l.callStatus === key).length;
    return leads.filter(l => l.leadStage === key).length;
  }

  const activeFilterMeta = ALL_FILTERS.find(f => f.key === activeFilter);

  const filtered = leads.filter(l => {
    const f = ALL_FILTERS.find(f => f.key === activeFilter);
    if (!f) return true;
    const matchesFilter = f.kind === "call" ? l.callStatus === activeFilter : l.leadStage === activeFilter;
    if (!matchesFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || (l.school ?? "").toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q) || (l.parentPhone ?? l.phone ?? "").includes(q);
    }
    return true;
  });

  function updateLead(id: number, updates: Partial<SalesLead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }

  return (
    <div className="p-4 max-w-full space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>

      {outcomeTarget && (
        <CallOutcomeModal
          lead={outcomeTarget}
          onClose={() => setOutcomeTarget(null)}
          onSaved={(updates) => { updateLead(outcomeTarget.id, updates); }}
          onOpenProfile={onOpenStudent}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: NAVY }}>Today's Calling Queue</h1>
          <p className="text-xs text-gray-400">Click a status to filter · {filtered.length} students shown</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {ALL_FILTERS.map(f => {
            const count = countForFilter(f.key);
            const active = activeFilter === f.key;
            return (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                className="flex flex-col items-center px-3 py-2 rounded-xl text-xs font-black border-2 transition-all flex-shrink-0 min-w-[80px]"
                style={{
                  background: active ? f.bg : "white",
                  borderColor: active ? f.color : "#E5E7EB",
                  color: active ? f.color : "#9CA3AF",
                  boxShadow: active ? `0 2px 8px ${f.color}25` : "none",
                }}>
                <span className="text-lg font-black leading-none mb-0.5" style={{ color: active ? f.color : NAVY }}>{count}</span>
                <span className="text-[10px] leading-tight text-center whitespace-nowrap">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, school, phone…"
          className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
      </div>

      {/* Current filter banner */}
      {activeFilterMeta && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
          style={{ background: activeFilterMeta.bg, color: activeFilterMeta.color, border: `1px solid ${activeFilterMeta.border}` }}>
          <span>{filtered.length} students</span>
          <span>·</span>
          <span>{activeFilterMeta.label}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
          <p className="font-bold text-sm" style={{ color: NAVY }}>All clear!</p>
          <p className="text-xs text-gray-400 mt-1">No students in this category</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-3 py-3 font-bold text-gray-500 min-w-[160px]">Student Name</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-8">Gr.</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-32">School</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-20">City</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-20">Weak Sub.</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-20">Strong Sub.</th>
                  <th className="text-center px-2 py-3 font-bold text-gray-500 w-16">Att.</th>
                  <th className="text-center px-2 py-3 font-bold text-gray-500 w-16">H/W</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-28">Lead Status</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-24">Interest</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-32">Last Call</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-28">Next Follow-Up</th>
                  <th className="text-right px-3 py-3 font-bold text-gray-500 w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => onOpenStudent(lead.id, lead.name)}
                          className="font-bold hover:underline text-left leading-tight" style={{ color: NAVY }}>
                          {lead.name}
                        </button>
                        {lead.repeatedCustomer && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black whitespace-nowrap"
                            style={{ background: "#FFF3CD", color: "#D97706", border: "1px solid #FDE68A" }}>
                            🔄 Repeated
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{lead.parentPhone ?? lead.phone ?? "No phone"}</div>
                    </td>
                    <td className="px-2 py-2.5 font-bold" style={{ color: NAVY }}>{lead.grade}</td>
                    <td className="px-2 py-2.5 text-gray-600 max-w-[128px] truncate" title={lead.school ?? ""}>{lead.school ?? "—"}</td>
                    <td className="px-2 py-2.5 text-gray-600">{lead.city ?? "—"}</td>
                    <td className="px-2 py-2.5">
                      {lead.weakSubject ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-red-50 text-red-600">{lead.weakSubject}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-2.5">
                      {lead.strongSubject ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-green-50 text-green-600">{lead.strongSubject}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center"><PctBar pct={lead.attPct} color={GREEN} /></td>
                    <td className="px-2 py-2.5 text-center"><PctBar pct={lead.hwPct} color="#6366F1" /></td>
                    <td className="px-2 py-2.5"><LeadStageBadge stage={lead.leadStage} /></td>
                    <td className="px-2 py-2.5"><InterestBadge level={lead.interestLevel} /></td>
                    <td className="px-2 py-2.5 text-gray-500 text-[10px]">{fmtDateTime(lead.lastCallAt)}</td>
                    <td className="px-2 py-2.5">
                      {lead.nextFollowUpAt ? (
                        <div className="text-[10px]">
                          <div className="font-bold" style={{ color: NAVY }}>{fmtDate(lead.nextFollowUpAt)}</div>
                          {lead.nextFollowUpTime && <div className="text-gray-400">{lead.nextFollowUpTime}</div>}
                        </div>
                      ) : <span className="text-gray-300 text-[10px]">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <a href={`tel:${lead.parentPhone ?? lead.phone}`}
                          className="p-1.5 rounded-lg transition-all hover:scale-110"
                          title="Call" style={{ background: "#ECFDF5", color: GREEN }}>
                          <Phone className="w-3 h-3" />
                        </a>
                        <a href={`https://wa.me/${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg transition-all hover:scale-110"
                          title="WhatsApp" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                          <MessageSquare className="w-3 h-3" />
                        </a>
                        <button onClick={() => setOutcomeTarget(lead)}
                          className="p-1.5 rounded-lg transition-all hover:scale-110"
                          title="Add Remark" style={{ background: "#FFF7ED", color: ORANGE }}>
                          <AlertTriangle className="w-3 h-3" />
                        </button>
                        <button onClick={() => onOpenStudent(lead.id, lead.name)}
                          className="p-1.5 rounded-lg transition-all hover:scale-110"
                          title="View Profile" style={{ background: "#EEF2FF", color: "#6366F1" }}>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="px-4 py-2.5 border-t border-gray-50 flex flex-wrap items-center gap-3 text-[10px] text-gray-400">
            <span className="font-bold">Legend:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#D97706" }} />
              <span style={{ color: "#D97706", fontWeight: 700 }}>🔄 Repeated Customer</span>
            </span>
            <span>Interest: </span>
            {INTEREST_LEVELS.map(l => (
              <span key={l.key} className="px-1.5 py-0.5 rounded-full font-semibold" style={{ background: l.bg, color: l.color }}>{l.key}</span>
            ))}
            <span className="ml-2">Actions: 📞 Call &nbsp; 💬 WhatsApp &nbsp; ✏️ Add Remark &nbsp; 👤 View Profile</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssignedLeadsTab({ onOpenStudent }: { onOpenStudent: (id: number, name: string) => void }) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await apiFetch("/mentor/sales/leads");
      if (r.ok) setLeads(await r.json());
      setLoading(false);
    })();
  }, []);

  const filtered = leads.filter(l => {
    if (stageFilter && l.leadStage !== stageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.name.toLowerCase().includes(q) || (l.school ?? "").toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  const stageCounts = LEAD_STATUSES.map(s => ({ ...s, count: leads.filter(l => l.leadStage === s.key).length })).filter(s => s.count > 0);

  return (
    <div className="p-4 max-w-full space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black" style={{ color: NAVY }}>Assigned Leads</h1>
          <p className="text-xs text-gray-400">{leads.length} total assigned leads</p>
        </div>
      </div>

      {/* Stage filter pills */}
      {stageCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStageFilter("")}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all"
            style={{ background: !stageFilter ? NAVY : "white", color: !stageFilter ? "white" : "#6B7280", borderColor: !stageFilter ? NAVY : "#E5E7EB" }}>
            All ({leads.length})
          </button>
          {stageCounts.map(s => (
            <button key={s.key} onClick={() => setStageFilter(stageFilter === s.key ? "" : s.key)}
              className="px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all"
              style={{ background: stageFilter === s.key ? s.bg : "white", color: stageFilter === s.key ? s.color : "#6B7280", borderColor: stageFilter === s.key ? s.color : "#E5E7EB" }}>
              {s.label} ({s.count})
            </button>
          ))}
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-3 py-3 font-bold text-gray-500">Name</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500 w-8">Gr.</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500">School</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500">City</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500">Lead Status</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500">Call Status</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500">Interest</th>
                  <th className="text-left px-2 py-3 font-bold text-gray-500">Next Follow-Up</th>
                  <th className="text-right px-3 py-3 font-bold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No leads found</td></tr>
                ) : filtered.map(lead => (
                  <tr key={lead.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/20 cursor-pointer" onClick={() => onOpenStudent(lead.id, lead.name)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold" style={{ color: NAVY }}>{lead.name}</span>
                        {lead.repeatedCustomer && <span className="text-[8px] px-1 py-0.5 rounded-full font-black bg-yellow-100 text-yellow-700">🔄</span>}
                      </div>
                      <div className="text-[10px] text-gray-400">{lead.parentPhone ?? lead.phone ?? "—"}</div>
                    </td>
                    <td className="px-2 py-2.5 font-bold" style={{ color: NAVY }}>{lead.grade}</td>
                    <td className="px-2 py-2.5 text-gray-600 max-w-[120px] truncate">{lead.school ?? "—"}</td>
                    <td className="px-2 py-2.5 text-gray-600">{lead.city ?? "—"}</td>
                    <td className="px-2 py-2.5"><LeadStageBadge stage={lead.leadStage} /></td>
                    <td className="px-2 py-2.5"><CallStatusBadge status={lead.callStatus} /></td>
                    <td className="px-2 py-2.5"><InterestBadge level={lead.interestLevel} /></td>
                    <td className="px-2 py-2.5 text-[10px] text-gray-600">
                      {lead.nextFollowUpAt ? `${fmtDate(lead.nextFollowUpAt)}${lead.nextFollowUpTime ? ` ${lead.nextFollowUpTime}` : ""}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={e => { e.stopPropagation(); onOpenStudent(lead.id, lead.name); }}
                        className="text-[10px] px-2 py-1 rounded-lg font-bold"
                        style={{ background: `${NAVY}10`, color: NAVY }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConvertedStudentsTab({ onOpenStudent }: { onOpenStudent: (id: number, name: string) => void }) {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await apiFetch("/mentor/sales/leads");
      if (r.ok) {
        const all: SalesLead[] = await r.json();
        setLeads(all.filter(l => l.leadStage === "Converted"));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 max-w-full space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div>
        <h1 className="text-lg font-black" style={{ color: NAVY }}>Converted Students</h1>
        <p className="text-xs text-gray-400">{leads.length} students converted · Keep tracking for retention</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="font-bold text-sm text-gray-400">No converted students yet</p>
          <p className="text-xs text-gray-300 mt-1">Keep following up — conversions will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {leads.map(lead => (
            <div key={lead.id} onClick={() => onOpenStudent(lead.id, lead.name)}
              className="bg-white rounded-2xl border border-green-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
              style={{ borderLeft: `4px solid ${GREEN}` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-black text-sm" style={{ color: NAVY }}>{lead.name}</div>
                  <div className="text-[10px] text-gray-500">Grade {lead.grade} · {lead.school ?? "—"}</div>
                  {lead.city && <div className="text-[10px] text-gray-400">{lead.city}{lead.state ? `, ${lead.state}` : ""}</div>}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#ECFDF5", color: GREEN }}>✓ Converted</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                <div className="text-[10px] text-gray-500">Att: <span className="font-bold" style={{ color: lead.attPct && lead.attPct >= 70 ? GREEN : "#D97706" }}>{lead.attPct !== null ? `${lead.attPct}%` : "—"}</span></div>
                <div className="text-[10px] text-gray-500">H/W: <span className="font-bold" style={{ color: lead.hwPct && lead.hwPct >= 70 ? GREEN : "#D97706" }}>{lead.hwPct !== null ? `${lead.hwPct}%` : "—"}</span></div>
              </div>
              {lead.lastCallAt && <div className="text-[10px] text-gray-400 mt-1.5">Last contact: {fmtDate(lead.lastCallAt)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SalesLeaderboardTab({ myId }: { myId: number }) {
  const [data, setData] = useState<{ rank: number; mentorId: number; mentorName: string; assignedCount: number; convertedCount: number; conversionRate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [byClass, setByClass] = useState<{ grade: number; assignedCount: number; convertedCount: number; conversionRate: number }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await apiFetch("/mentor/sales/leaderboard");
      if (r.ok) setData(await r.json());
      setLoading(false);
    })();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const top3 = data.slice(0, 3);

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div>
        <h1 className="text-lg font-black" style={{ color: NAVY }}>Sales Leaderboard</h1>
        <p className="text-xs text-gray-400">Ranked by conversions &amp; conversion rate</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No data yet</div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3">
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((m, i) => {
                const height = i === 1 ? "h-28" : "h-20";
                const actualRank = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <div key={m!.mentorId} className="flex flex-col items-center gap-2">
                    <div className="text-2xl">{medals[actualRank - 1]}</div>
                    <div className="text-xs font-black text-center" style={{ color: NAVY }}>{m!.mentorName.split(" ")[0]}</div>
                    <div className="text-[10px] text-gray-500 font-bold">{m!.convertedCount} conv.</div>
                    <div className={`w-20 ${height} rounded-t-xl flex items-start justify-center pt-2`}
                      style={{ background: actualRank === 1 ? "#FFD700" : actualRank === 2 ? "#C0C0C0" : "#CD7F32", opacity: 0.85 }}>
                      <span className="text-white font-black text-lg">#{actualRank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Full Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-4 py-3 font-bold text-gray-500">Rank</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500">Mentor Name</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-500">Assigned</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-500">Converted</th>
                  <th className="text-center px-3 py-3 font-bold text-gray-500">Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {data.map(m => (
                  <tr key={m.mentorId}
                    className={`border-t border-gray-50 transition-colors ${m.mentorId === myId ? "bg-orange-50" : "hover:bg-gray-50"}`}>
                    <td className="px-4 py-3 font-black text-lg">{medals[m.rank - 1] ?? `#${m.rank}`}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ color: m.mentorId === myId ? ORANGE : NAVY }}>{m.mentorName}</span>
                      {m.mentorId === myId && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black bg-orange-100 text-orange-600">You</span>}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{m.assignedCount}</td>
                    <td className="px-3 py-3 text-center font-black" style={{ color: GREEN }}>{m.convertedCount}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${m.conversionRate}%`, background: GREEN }} />
                        </div>
                        <span className="font-bold" style={{ color: GREEN }}>{m.conversionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
