import { useState, useEffect, useCallback, useRef } from "react";
import {
  Phone, MessageSquare, ChevronRight, Bell, Flag, ChevronDown, X,
  Search, Filter, ArrowLeft, Copy, Check, Loader2, MoreVertical,
  CreditCard, BookOpen, BarChart2, ClipboardList,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

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

// ── Types ──────────────────────────────────────────────────────────────────
interface Lead {
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

interface Remark {
  id: number;
  note: string;
  callStatus: string | null;
  leadStatus: string | null;
  calledByName: string | null;
  nextFollowUpDate: string | null;
  createdAt: string;
}

interface Notification {
  id: number;
  color: string;
  text: string;
  time: string;
  unread: boolean;
  type: "payment" | "activity" | "message";
  leadId?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}
function leadId(id: number) { return `LDN-${String(id).padStart(4, "0")}`; }
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}
function fmtDateTime(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function fmtTime(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}
function isToday(s: string | null) {
  if (!s) return false;
  return s.slice(0, 10) === new Date().toISOString().slice(0, 10);
}
function isTomorrow(s: string | null) {
  if (!s) return false;
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  return s.slice(0, 10) === tom.toISOString().slice(0, 10);
}
function followUpLabel(at: string | null, time: string | null) {
  if (!at) return "—";
  const base = isToday(at) ? "Today" : isTomorrow(at) ? "Tomorrow" : fmtDate(at);
  return time ? `${base}, ${time}` : base;
}
function followUpColor(at: string | null) {
  if (!at) return "#9CA3AF";
  if (isToday(at)) return "#DC2626";
  if (isTomorrow(at)) return ORANGE;
  return "#3B82F6";
}
function avatarColor(name: string) {
  const colors = [NAVY, "#7C3AED", "#0284C7", "#059669", "#D97706", "#DC2626", "#DB2777"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

// ── Chip filter mapping ────────────────────────────────────────────────────
const CHIPS = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending Calls" },
  { key: "busy",      label: "Busy" },
  { key: "call-later",label: "Call Later" },
  { key: "converted", label: "Converted" },
] as const;
type Chip = typeof CHIPS[number]["key"];

function matchChip(lead: Lead, chip: Chip) {
  if (chip === "all") return lead.leadStage !== "Converted";
  if (chip === "pending") return lead.callStatus === "Need To Call" || lead.callStatus === "Pending";
  if (chip === "busy") return lead.callStatus === "Busy";
  if (chip === "call-later") return lead.callStatus === "Call Back" || lead.callStatus === "Call Later";
  if (chip === "converted") return lead.leadStage === "Converted";
  return true;
}
function chipCount(leads: Lead[], chip: Chip) {
  return leads.filter(l => matchChip(l, chip)).length;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ lead }: { lead: Lead }) {
  if (lead.leadStage === "Converted")
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#DCFCE7", color: GREEN }}>Converted</span>;
  if (lead.leadStage === "Payment Pending" || lead.callStatus === "Payment Pending")
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#FEF3C7", color: "#D97706" }}>Payment Pending</span>;
  if (lead.leadStage === "Payment Failed" || lead.callStatus === "Payment Failed")
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#FEE2E2", color: "#DC2626" }}>Payment Failed</span>;
  if (lead.repeatedCustomer)
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#FFFBEB", color: "#D97706" }}>Repeat Lead</span>;
  return null;
}

// ── Notification Panel ─────────────────────────────────────────────────────
function NotificationPanel({ notifications, onClose, onNotifClick }: {
  notifications: Notification[];
  onClose: () => void;
  onNotifClick: (n: Notification) => void;
}) {
  const today = notifications.filter(n => {
    const d = new Date(n.time);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const yesterday = notifications.filter(n => {
    const d = new Date(n.time);
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    return d.toDateString() === yest.toDateString();
  });

  function dot(color: string) {
    return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: color }} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex-1" onClick={onClose} />
      <div className="w-80 h-full bg-white shadow-2xl flex flex-col border-l border-gray-100 animate-slide-in-right"
        style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-black text-sm" style={{ color: NAVY }}>Notifications</div>
            <div className="text-[11px] text-gray-400">You have {notifications.filter(n => n.unread).length} new notifications</div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {today.length > 0 && (
            <div>
              <div className="px-5 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Today</div>
              {today.map(n => (
                <button key={n.id} onClick={() => onNotifClick(n)}
                  className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50"
                  style={{ background: n.unread ? "rgba(11,43,107,0.025)" : "white" }}>
                  {dot(n.color)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold leading-snug" style={{ color: NAVY }}>{n.text}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{fmtTime(n.time)}</div>
                  </div>
                  {n.unread && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: ORANGE }} />}
                </button>
              ))}
            </div>
          )}
          {yesterday.length > 0 && (
            <div>
              <div className="px-5 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Yesterday</div>
              {yesterday.map(n => (
                <button key={n.id} onClick={() => onNotifClick(n)}
                  className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50">
                  {dot(n.color)}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold leading-snug" style={{ color: NAVY }}>{n.text}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Yesterday, {fmtTime(n.time)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {today.length === 0 && yesterday.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Bell className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400">No notifications yet</p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100">
          <button className="text-xs font-bold" style={{ color: ORANGE }}>View All Notifications</button>
        </div>
      </div>
    </div>
  );
}

// ── Payment Link Popup ─────────────────────────────────────────────────────
function PaymentPopup({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [mode, setMode] = useState<"choose" | "partial" | "generated">("choose");
  const [amount, setAmount] = useState("5000");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  function generateLink(type: "full" | "partial") {
    setGenerating(true);
    setTimeout(() => {
      const rand = Math.random().toString(36).slice(2, 10);
      setLink(`https://rzp.io/l/${rand}`);
      setGenerating(false);
      setMode("generated");
    }, 1000);
  }

  function copyLink() {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function whatsappLink() {
    const phone = (lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "");
    const msg = encodeURIComponent(`Dear ${lead.parentName ?? "Parent"}, please complete the payment for ${lead.name}'s Braintam long-term course: ${link}`);
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={{ fontFamily: "Poppins, sans-serif" }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="font-black text-sm" style={{ color: NAVY }}>Launch Payment</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {/* Choose payment type */}
        {mode === "choose" && (
          <div className="p-5">
            <p className="text-xs text-gray-500 mb-4">Choose payment type</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => generateLink("full")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all">
                <CreditCard className="w-6 h-6" style={{ color: "#3B82F6" }} />
                <div className="font-black text-xs" style={{ color: NAVY }}>Full Payment</div>
                <div className="text-[10px] text-gray-400 text-center">Share link for complete payment</div>
              </button>
              <button onClick={() => setMode("partial")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all">
                <CreditCard className="w-6 h-6" style={{ color: "#7C3AED" }} />
                <div className="font-black text-xs" style={{ color: NAVY }}>Partial Payment</div>
                <div className="text-[10px] text-gray-400 text-center">Share link for partial payment</div>
              </button>
            </div>
          </div>
        )}

        {/* Partial amount input */}
        {mode === "partial" && (
          <div className="p-5 space-y-3">
            <div className="font-bold text-xs text-gray-600 mb-1">Partial Payment</div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Enter Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-orange-300"
                style={{ color: NAVY }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Note (Optional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Advance payment for admission"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300" />
            </div>
            <button onClick={() => generateLink("partial")} disabled={!amount}
              className="w-full py-3 rounded-xl font-black text-white text-sm"
              style={{ background: amount ? `linear-gradient(90deg,${NAVY},#1a4ba8)` : "#9CA3AF" }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Launch Payment Link"}
            </button>
          </div>
        )}

        {/* Generated link */}
        {mode === "generated" && (
          <div className="p-5 text-center space-y-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ background: "#DCFCE7" }}>
              <Check className="w-7 h-7" style={{ color: GREEN }} />
            </div>
            <div>
              <div className="font-black text-sm mb-0.5" style={{ color: NAVY }}>Payment Link Generated</div>
              <div className="text-xs text-gray-400">You can share the link with the student/parent.</div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
              <span className="text-[11px] text-blue-600 font-semibold flex-1 truncate text-left">{link}</span>
              <button onClick={copyLink}
                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                style={{ background: copied ? "#DCFCE7" : `${NAVY}15`, color: copied ? GREEN : NAVY }}>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="text-[10px] text-gray-400">This link is valid for 48 hours.</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyLink}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: `${NAVY}12`, color: NAVY }}>
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </button>
              <button onClick={whatsappLink}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: "#25D366" }}>
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Parent
              </button>
            </div>
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lead Card ──────────────────────────────────────────────────────────────
function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (id: number) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow"
      style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
        style={{ background: avatarColor(lead.name) }}>
        {initials(lead.name)}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm" style={{ color: NAVY }}>{lead.name}</span>
          <StatusBadge lead={lead} />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
          <span>Grade {lead.grade}</span>
          <span>•</span>
          <span className="font-semibold" style={{ color: "#6B7280" }}>{leadId(lead.id)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
          <Phone className="w-3 h-3" />
          <span>{lead.phone ?? lead.parentPhone ?? "—"}</span>
        </div>
      </div>

      {/* Right: Last Call + Follow-up */}
      <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[130px]">
        <div>
          <div className="text-[10px] text-gray-400">Last Call</div>
          <div className="text-xs font-semibold" style={{ color: NAVY }}>{fmtDateTime(lead.lastCallAt)}</div>
          {lead.lastCallAt && <div className="text-[10px] text-gray-400">Calls: {lead.attPct ? 1 : 0}</div>}
        </div>
        <div className="mt-1 text-right">
          <div className="text-[10px] text-gray-400">Next Follow-up</div>
          <div className="text-xs font-bold" style={{ color: followUpColor(lead.nextFollowUpAt) }}>
            {followUpLabel(lead.nextFollowUpAt, lead.nextFollowUpTime)}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
        <a href={`tel:${lead.parentPhone ?? lead.phone}`} onClick={e => e.stopPropagation()}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors">
          <Phone className="w-4 h-4" style={{ color: GREEN }} />
        </a>
        <a href={`https://wa.me/91${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
          target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors">
          <MessageSquare className="w-4 h-4" style={{ color: "#25D366" }} />
        </a>
        <button onClick={() => onOpen(lead.id)}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
          <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />
        </button>
      </div>
    </div>
  );
}

// ── My Leads View ──────────────────────────────────────────────────────────
function MyLeadsView({ leads, loading, onOpen }: {
  leads: Lead[];
  loading: boolean;
  onOpen: (id: number) => void;
}) {
  const [chip, setChip] = useState<Chip>("all");
  const [search, setSearch] = useState("");

  const filtered = leads.filter(l => {
    if (!matchChip(l, chip)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q) ||
      (l.parentPhone ?? "").includes(q) ||
      leadId(l.id).toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Title */}
      <div className="mb-4">
        <h1 className="text-xl font-black" style={{ color: NAVY }}>My Leads</h1>
        <p className="text-xs text-gray-400 mt-0.5">All leads assigned to me</p>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {CHIPS.map(c => {
          const count = chipCount(leads, c.key);
          const active = chip === c.key;
          return (
            <button key={c.key} onClick={() => setChip(c.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border"
              style={{
                background: active ? NAVY : "white",
                color: active ? "white" : "#6B7280",
                borderColor: active ? NAVY : "#E5E7EB",
                boxShadow: active ? `0 2px 8px ${NAVY}25` : "none",
              }}>
              {c.label}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                style={{ background: active ? "rgba(255,255,255,0.2)" : "#F3F4F6", color: active ? "white" : "#6B7280" }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone or lead ID..."
            className="flex-1 text-xs outline-none bg-transparent" style={{ color: NAVY }} />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-bold"
          style={{ color: NAVY }}>
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Leads list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-bold text-sm text-gray-400">No leads found</p>
          <p className="text-xs text-gray-300 mt-1">Try a different filter or search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />)}
          <div className="text-center pt-2 text-xs text-gray-400">
            Showing 1 to {filtered.length} of {filtered.length} leads
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Detail View ────────────────────────────────────────────────────
function StudentDetailView({ leadId: lid, lead, onBack }: {
  leadId: number;
  lead: Lead;
  onBack: () => void;
}) {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(true);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Call form state
  const [calledBy, setCalledBy] = useState("Mother");
  const [callStatus, setCallStatus] = useState("Call Later");
  const [nextDate, setNextDate] = useState(lead.nextFollowUpAt?.slice(0, 10) ?? "");
  const [nextTime, setNextTime] = useState(lead.nextFollowUpTime ?? "");
  const [remarkText, setRemarkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingRemarks(true);
      try {
        const r = await apiFetch(`/mentor/sales/history/${lid}`);
        if (r.ok) setRemarks(await r.json());
      } finally { setLoadingRemarks(false); }
    })();
  }, [lid]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function saveRemarks() {
    if (!remarkText.trim()) { setSaveError("Remark is required"); return; }
    setSaving(true);
    setSaveError("");
    const r = await apiFetch(`/mentor/sales/call-outcome/${lid}`, {
      method: "POST",
      body: JSON.stringify({
        callOutcome: callStatus,
        leadStatus: callStatus,
        remark: remarkText.trim(),
        nextFollowUpAt: nextDate || undefined,
        nextFollowUpTime: nextTime || undefined,
      }),
    });
    if (r.ok) {
      setSaveOk(true);
      setRemarkText("");
      setTimeout(() => setSaveOk(false), 2500);
      const r2 = await apiFetch(`/mentor/sales/history/${lid}`);
      if (r2.ok) setRemarks(await r2.json());
    } else {
      const d = await r.json().catch(() => ({}));
      setSaveError(d.error ?? "Failed to save");
    }
    setSaving(false);
  }

  const CALL_WHO = ["Mother", "Father", "Student", "Brother", "Sister", "Other"];
  const CALL_STATUSES = ["Not Connected", "Busy", "Call Later", "Interested", "Not Interested", "Payment Pending", "Payment Failed", "Payment Completed"];

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "Poppins, sans-serif" }}>
      {showPaymentPopup && <PaymentPopup lead={lead} onClose={() => setShowPaymentPopup(false)} />}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold hover:opacity-70 transition-opacity" style={{ color: NAVY }}>
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
      </div>

      {/* Student header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0"
              style={{ background: avatarColor(lead.name) }}>
              {initials(lead.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base" style={{ color: NAVY }}>{lead.name}</span>
                {lead.repeatedCustomer && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#FEF3C7", color: "#D97706" }}>Repeat Lead</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Grade {lead.grade} · {leadId(lid)}</div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Phone className="w-3 h-3" />
                <span>{lead.phone ?? lead.parentPhone ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {lead.lastCallAt && (
              <div className="text-right hidden md:block">
                <div className="text-[10px] text-gray-400">Last Call</div>
                <div className="text-xs font-semibold" style={{ color: NAVY }}>{fmtDateTime(lead.lastCallAt)}</div>
              </div>
            )}
            {lead.nextFollowUpAt && (
              <div className="text-right hidden md:block">
                <div className="text-[10px] text-gray-400">Next Follow-up</div>
                <div className="text-xs font-bold" style={{ color: followUpColor(lead.nextFollowUpAt) }}>
                  {followUpLabel(lead.nextFollowUpAt, lead.nextFollowUpTime)}
                </div>
              </div>
            )}
            <a href={`tel:${lead.parentPhone ?? lead.phone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: GREEN }}>
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <a href={`https://wa.me/91${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "#25D366" }}>
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <div className="relative" ref={moreRef}>
              <button onClick={() => setShowMore(v => !v)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50"
                style={{ color: NAVY }}>
                <MoreVertical className="w-3.5 h-3.5" /> More
              </button>
              {showMore && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <button onClick={() => { setShowPaymentPopup(true); setShowMore(false); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 font-semibold" style={{ color: NAVY }}>
                    💳 Launch Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 md:p-6">

        {/* ── LEFT PANEL ── */}
        <div className="space-y-4">

          {/* Payment Link card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${NAVY}12` }}>
                  <CreditCard className="w-5 h-5" style={{ color: NAVY }} />
                </div>
                <div>
                  <div className="font-black text-sm" style={{ color: NAVY }}>Payment Link</div>
                  <div className="text-[11px] text-gray-400">Share payment link for long-term course</div>
                </div>
              </div>
              <button onClick={() => setShowPaymentPopup(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 font-bold text-xs transition-all hover:shadow-sm"
                style={{ borderColor: ORANGE, color: ORANGE }}>
                Launch Payment <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Class Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-black text-sm" style={{ color: NAVY }}>Live Class Activity</div>
              <span className="text-[10px] text-gray-400">Last 7 Days</span>
            </div>
            {[
              { label: "Live Class 1", min: 60, att: 75 },
              { label: "Live Class 2", min: 60, att: 82 },
            ].map((cls, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-xs font-semibold" style={{ color: NAVY }}>{cls.label}</div>
                  <div className="text-[10px] text-gray-400">{cls.min} min</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold" style={{ color: cls.att >= 70 ? GREEN : "#D97706" }}>
                    Attendance {cls.att}%
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <div className="h-1 rounded-full" style={{ width: `${cls.att * 0.4}px`, background: GREEN }} />
                    <div className="h-1 rounded-full" style={{ width: `${(100 - cls.att) * 0.4}px`, background: "#DC2626" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="font-black text-sm mb-3" style={{ color: NAVY }}>Analytics <span className="text-gray-400 font-normal text-xs">(This Month)</span></div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: BookOpen, label: "Classes Held", value: "8", color: "#6366F1" },
                { icon: BarChart2, label: "Attendance", value: lead.attPct !== null ? `${lead.attPct}%` : "—", color: GREEN },
                { icon: ClipboardList, label: "Avg. Watch Time", value: "42 min", color: ORANGE },
                { icon: Check, label: "HW Completion", value: lead.hwPct !== null ? `${lead.hwPct}%` : "—", color: "#0284C7" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: `${item.color}10` }}>
                    <Icon className="w-4 h-4 mb-1" style={{ color: item.color }} />
                    <div className="text-xs text-gray-500">{item.label}</div>
                    <div className="font-black text-sm mt-0.5" style={{ color: item.color }}>{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Previous Courses / Demos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="font-black text-sm mb-3" style={{ color: NAVY }}>Previous Courses / Demos</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-semibold">Course / Demo</th>
                    <th className="text-left pb-2 font-semibold">Type</th>
                    <th className="text-left pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Maths Demo", type: "Demo", status: "Completed", color: GREEN },
                    { name: "Science Demo", type: "Demo", status: "Completed", color: GREEN },
                    { name: "English Demo", type: "Demo", status: "Dropped", color: "#DC2626" },
                  ].map((c, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-semibold" style={{ color: "#3B82F6" }}>{c.name}</td>
                      <td className="py-2 text-gray-500">{c.type}</td>
                      <td className="py-2">
                        <span className="font-bold" style={{ color: c.color }}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-gray-400 mt-2">Total Demos Taken: 3</div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-4">

          {/* Student Information */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="font-black text-sm mb-3" style={{ color: NAVY }}>Student Information</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { label: "Parent Name",   value: lead.parentName ?? "—" },
                { label: "School",        value: lead.school ?? "—" },
                { label: "Student Name",  value: lead.name },
                { label: "City",          value: lead.city ?? "—" },
                { label: "Mobile",        value: lead.phone ?? "—" },
                { label: "Lead Source",   value: "Website" },
                { label: "Alternate Mobile", value: lead.parentPhone ?? "—" },
                { label: "Weak Subject",  value: lead.weakSubject ?? "—" },
                { label: "Email",         value: "—" },
                { label: "Strong Subject",value: lead.strongSubject ?? "—" },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">{f.label}</div>
                  <div className="text-xs font-semibold mt-0.5 break-words" style={{ color: NAVY }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Call Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="font-black text-sm mb-3" style={{ color: NAVY }}>Call Details</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Who Picked the Call?</label>
                <select value={calledBy} onChange={e => setCalledBy(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none bg-white"
                  style={{ color: NAVY }}>
                  {CALL_WHO.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Call Status</label>
                <select value={callStatus} onChange={e => setCallStatus(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none bg-white"
                  style={{ color: NAVY }}>
                  {CALL_STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Next Follow-up Date</label>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                  style={{ color: NAVY }} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Next Follow-up Time</label>
                <input type="time" value={nextTime} onChange={e => setNextTime(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none"
                  style={{ color: NAVY }} />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Call Remarks</label>
              <textarea value={remarkText} onChange={e => setRemarkText(e.target.value)} rows={3}
                placeholder="Add your call remarks here..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300 resize-none"
                style={{ color: NAVY }} />
            </div>
            {saveError && <p className="text-[10px] text-red-500 mb-2">{saveError}</p>}
            {saveOk && <p className="text-[10px] text-green-600 mb-2">✓ Remarks saved successfully</p>}
            <div className="flex justify-end">
              <button onClick={saveRemarks} disabled={saving || !remarkText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all"
                style={{ background: saving || !remarkText.trim() ? "#9CA3AF" : `linear-gradient(90deg,${NAVY},#1a4ba8)` }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Remarks
              </button>
            </div>
          </div>

          {/* Previous Remarks timeline */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4"
            style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="font-black text-sm" style={{ color: NAVY }}>Previous Remarks</div>
              {remarks.length > 3 && (
                <button className="text-[10px] font-bold" style={{ color: ORANGE }}>View All</button>
              )}
            </div>
            {loadingRemarks ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
            ) : remarks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No previous remarks</p>
            ) : (
              <div className="space-y-0">
                {remarks.slice(0, 10).map((r, i) => (
                  <div key={r.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: ORANGE }} />
                      {i < remarks.slice(0, 10).length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: "#E5E7EB", minHeight: 16 }} />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-500">{fmtDate(r.createdAt)}, {fmtTime(r.createdAt)}</span>
                        {r.calledByName && <span className="text-[10px] font-bold" style={{ color: NAVY }}>{r.calledByName}</span>}
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{r.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment Status View ────────────────────────────────────────────────────
function PaymentStatusView({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const paymentLeads = leads.filter(l =>
    ["Payment Pending", "Payment Failed", "Payment Completed", "Converted"].includes(l.leadStage) ||
    ["Payment Pending", "Payment Failed"].includes(l.callStatus)
  );

  const filtered = paymentLeads.filter(l => {
    if (statusFilter !== "all" && l.leadStage !== statusFilter && l.callStatus !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || (l.phone ?? "").includes(q) || leadId(l.id).toLowerCase().includes(q);
  });

  function statusBg(stage: string) {
    if (stage === "Converted" || stage === "Payment Completed") return { bg: "#DCFCE7", color: GREEN, label: "Completed" };
    if (stage === "Payment Failed") return { bg: "#FEE2E2", color: "#DC2626", label: "Failed" };
    if (stage === "Payment Pending") return { bg: "#FEF3C7", color: "#D97706", label: "Pending" };
    return { bg: "#F3F4F6", color: "#6B7280", label: stage };
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="mb-4">
        <h1 className="text-xl font-black" style={{ color: NAVY }}>Payment Status</h1>
        <p className="text-xs text-gray-400 mt-0.5">Track payment progress for your leads</p>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-48 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone or payment ID..."
            className="flex-1 text-xs outline-none bg-transparent" style={{ color: NAVY }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold outline-none"
          style={{ color: NAVY }}>
          <option value="all">All Statuses</option>
          <option value="Payment Pending">Pending</option>
          <option value="Payment Failed">Failed</option>
          <option value="Converted">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-bold text-sm text-gray-400">No payment records found</p>
            <p className="text-xs text-gray-300 mt-1">Payment activity will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Student Name", "Lead ID", "Program", "Amount", "Status", "Action"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-bold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const st = statusBg(lead.leadStage);
                  return (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-black" style={{ color: NAVY }}>{lead.name}</div>
                        <div className="text-gray-400">Grade {lead.grade}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: "#6B7280" }}>{leadId(lead.id)}</td>
                      <td className="px-4 py-3 text-gray-600">5-Day Ignite</td>
                      <td className="px-4 py-3 font-bold" style={{ color: NAVY }}>₹39</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px]"
                          style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a href={`tel:${lead.parentPhone ?? lead.phone}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 hover:bg-green-50">
                            <Phone className="w-3 h-3" style={{ color: GREEN }} />
                          </a>
                          <a href={`https://wa.me/91${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 hover:bg-green-50">
                            <MessageSquare className="w-3 h-3" style={{ color: "#25D366" }} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Sales Mentor Portal ───────────────────────────────────────────────
export function SalesMentorPortal({ user, onLogout }: {
  user: { id: number; name: string; avatarUrl?: string | null };
  onLogout: () => void;
}) {
  const [view, setView] = useState<"my-leads" | "student-detail" | "payment-status">("my-leads");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Mock notifications
  const [notifications] = useState<Notification[]>([
    { id: 1, color: "#F59E0B", text: "Rahul created order.", time: new Date(Date.now() - 25 * 60000).toISOString(), unread: true, type: "payment" },
    { id: 2, color: "#10B981", text: "Ananya completed payment successfully.", time: new Date(Date.now() - 75 * 60000).toISOString(), unread: true, type: "payment" },
    { id: 3, color: "#EF4444", text: "Aarav payment failed.", time: new Date(Date.now() - 100 * 60000).toISOString(), unread: true, type: "payment" },
    { id: 4, color: "#8B5CF6", text: "Sumit submitted homework (Live Class 2).", time: new Date(Date.now() - 110 * 60000).toISOString(), unread: false, type: "activity" },
    { id: 5, color: "#3B82F6", text: "Kritika edited profile.", time: new Date(Date.now() - 130 * 60000).toISOString(), unread: false, type: "activity" },
    { id: 6, color: "#6B7280", text: "Preety sent you a message.", time: new Date(Date.now() - 140 * 60000).toISOString(), unread: false, type: "message" },
    { id: 7, color: "#F59E0B", text: "Diya created order.", time: new Date(Date.now() - 26 * 3600000).toISOString(), unread: false, type: "payment" },
    { id: 8, color: "#10B981", text: "Rohan completed payment successfully.", time: new Date(Date.now() - 27 * 3600000).toISOString(), unread: false, type: "payment" },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/mentor/sales/leads");
      if (r.ok) setLeads(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openStudent(id: number) {
    setSelectedId(id);
    setView("student-detail");
  }

  const selectedLead = leads.find(l => l.id === selectedId);
  const NAV_ITEMS = [
    { key: "my-leads" as const, label: "My Leads" },
    { key: "payment-status" as const, label: "Payment Status" },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onNotifClick={n => {
            setShowNotifications(false);
            if (n.leadId) openStudent(n.leadId);
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center px-4 md:px-6 gap-3 z-30">
        {/* Branding */}
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-5 rounded-full" style={{ background: ORANGE }} />
          <div>
            <div className="font-black leading-tight" style={{ fontSize: "13px", color: NAVY, letterSpacing: "0.04em" }}>
              BTL <span style={{ color: ORANGE }}>CRM</span>
            </div>
            <div className="text-[9px] text-gray-400 leading-tight">Sales Mentor Panel</div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1 ml-6">
          {NAV_ITEMS.map(item => (
            <button key={item.key}
              onClick={() => { setView(item.key); setSelectedId(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: view === item.key || (item.key === "my-leads" && view === "student-detail") ? `${NAVY}12` : "transparent",
                color: view === item.key || (item.key === "my-leads" && view === "student-detail") ? NAVY : "#6B7280",
              }}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Bell + Flag + Profile */}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNotifications(v => !v)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <Bell className="w-4.5 h-4.5" style={{ color: NAVY }} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                style={{ background: "#EF4444", minWidth: 18, height: 18, fontSize: 9 }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setShowNotifications(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200"
            style={{ color: NAVY }}>
            <Flag className="w-4 h-4" />
          </button>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: user.avatarUrl ? "transparent" : NAVY }}>
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" /> : initials(user.name)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold leading-tight" style={{ color: NAVY }}>{user.name}</div>
                <div className="text-[10px] font-semibold" style={{ color: "#D97706" }}>Sales Mentor</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1">
                <div className="px-4 py-2 border-b border-gray-50">
                  <div className="text-xs font-black" style={{ color: NAVY }}>{user.name}</div>
                  <div className="text-[10px] text-gray-400">Sales Mentor</div>
                </div>
                <button onClick={onLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "my-leads" && (
          <MyLeadsView leads={leads} loading={loading} onOpen={openStudent} />
        )}
        {view === "student-detail" && selectedLead && (
          <StudentDetailView
            leadId={selectedLead.id}
            lead={selectedLead}
            onBack={() => setView("my-leads")}
          />
        )}
        {view === "payment-status" && (
          <PaymentStatusView leads={leads} />
        )}
      </div>
    </div>
  );
}
