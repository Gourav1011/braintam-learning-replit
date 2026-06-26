import { useState, useEffect, useCallback, useRef } from "react";
import {
  Phone, MessageSquare, ChevronRight, Bell, Flag, ChevronDown, X,
  Search, Filter, ArrowLeft, Copy, Check, Loader2,
  CreditCard, BookOpen, BarChart2, ClipboardList, Save, AlertCircle, Upload,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";
import { StaffCheckin } from "@/components/staff-checkin";

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
  displayName: string | null;
  referenceGrade: number | null;
  altPhone: string | null;
  notes: string | null;
  email: string | null;
  leadSource: string | null;
}

interface PaymentLinkRow {
  id: number;
  studentId: number | null;
  studentName: string | null;
  studentPhone: string | null;
  amount: number;
  amountRupees: number;
  paymentType: string;
  grade: number | null;
  status: string;
  shortUrl: string | null;
  razorpayLinkUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  mentorName?: string;
  razorpayPaymentLinkId?: string | null;
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
function padLeadId(id: number) { return `LDN-${String(id).padStart(4, "0")}`; }
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" });
}
function fmtDT(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  const day = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toUpperCase();
  return `${day} ${time}`;
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
function avatarBg(name: string) {
  const cs = [NAVY, "#7C3AED", "#0284C7", "#059669", "#D97706", "#DC2626", "#DB2777"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % cs.length;
  return cs[h];
}

// ── Chip filter ────────────────────────────────────────────────────────────
const CHIPS = [
  { key: "all",        label: "All" },
  { key: "pending",    label: "Pending Calls" },
  { key: "busy",       label: "Busy" },
  { key: "call-later", label: "Call Later" },
  { key: "completed",  label: "Completed Calls" },
  { key: "converted",  label: "Converted" },
] as const;
type Chip = typeof CHIPS[number]["key"];

// "Converted" = paid long-term program only. ₹39 Ignite demo payment is NOT converted.
function isConverted(lead: Lead) {
  return lead.leadStage === "Converted";
}
// Completed Calls = call connected, counselling done, no immediate follow-up needed
const COMPLETED_STATUSES = new Set(["Interested", "Not Interested", "Payment Completed", "Payment Pending", "Payment Failed"]);
function isCompletedCall(lead: Lead) {
  return COMPLETED_STATUSES.has(lead.callStatus);
}

function matchChip(lead: Lead, chip: Chip) {
  const conv = isConverted(lead);
  if (chip === "all")        return !conv;
  if (chip === "pending")    return !conv && (lead.callStatus === "Need To Call" || lead.callStatus === "Pending" || lead.callStatus === "Not Connected");
  if (chip === "busy")       return !conv && lead.callStatus === "Busy";
  if (chip === "call-later") return !conv && (lead.callStatus === "Call Back" || lead.callStatus === "Call Later");
  if (chip === "completed")  return !conv && isCompletedCall(lead);
  if (chip === "converted")  return conv;
  return true;
}
function chipCount(leads: Lead[], chip: Chip) {
  return leads.filter(l => matchChip(l, chip)).length;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ lead }: { lead: Lead }) {
  const c = isConverted(lead)
    ? { bg: "#DCFCE7", color: GREEN, label: "✓ Converted" }
    : lead.leadStage === "Payment Pending" || lead.callStatus === "Payment Pending"
      ? { bg: "#FEF3C7", color: "#D97706", label: "Payment Pending" }
      : lead.leadStage === "Payment Failed" || lead.callStatus === "Payment Failed"
        ? { bg: "#FEE2E2", color: "#DC2626", label: "Payment Failed" }
        : lead.repeatedCustomer
          ? { bg: "#FFFBEB", color: "#D97706", label: "Repeat Lead" }
          : lead.leadStage === "Highly Interested"
            ? { bg: "#FFF7ED", color: ORANGE, label: "🔥 Hot Lead" }
            : null;
  if (!c) return null;
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-black whitespace-nowrap" style={{ background: c.bg, color: c.color }}>{c.label}</span>;
}

function CallStatusBadge({ status }: { status: string }) {
  const m: Record<string, { bg: string; color: string }> = {
    "Need To Call": { bg: "#FEE2E2", color: "#DC2626" },
    "Busy":         { bg: "#FEF3C7", color: "#D97706" },
    "Call Back":    { bg: "#EEF2FF", color: "#6366F1" },
    "Call Later":   { bg: "#EEF2FF", color: "#6366F1" },
    "Picked":       { bg: "#DCFCE7", color: GREEN },
    "Interested":   { bg: "#DBEAFE", color: "#2563EB" },
  };
  const s = m[status] ?? { bg: "#F3F4F6", color: "#6B7280" };
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" style={s}>{status}</span>;
}

// ── Notification Panel ─────────────────────────────────────────────────────
function NotificationPanel({ notifications, onClose, onNotifClick }: {
  notifications: Notification[];
  onClose: () => void;
  onNotifClick: (n: Notification) => void;
}) {
  const groups = [
    { label: "Today",     items: notifications.filter(n => { const d = new Date(n.time); const now = new Date(); return d.toDateString() === now.toDateString(); }) },
    { label: "Yesterday", items: notifications.filter(n => { const d = new Date(n.time); const y = new Date(); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex-1" onClick={onClose} />
      <div className="w-80 h-full bg-white shadow-2xl flex flex-col border-l border-gray-100"
        style={{ fontFamily: "Poppins, sans-serif", animation: "slideInRight .2s ease" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-black text-sm" style={{ color: NAVY }}>Notifications</div>
            <div className="text-[11px] text-gray-400">{notifications.filter(n => n.unread).length} unread</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.map(g => g.items.length > 0 && (
            <div key={g.label}>
              <div className="px-5 pt-3 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">{g.label}</div>
              {g.items.map(n => (
                <button key={n.id} onClick={() => onNotifClick(n)}
                  className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  style={{ background: n.unread ? "rgba(11,43,107,0.025)" : "white" }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ background: n.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold leading-snug" style={{ color: NAVY }}>{n.text}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{fmtTime(n.time)}</div>
                  </div>
                  {n.unread && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: ORANGE }} />}
                </button>
              ))}
            </div>
          ))}
          {groups.every(g => g.items.length === 0) && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Bell className="w-8 h-8 text-gray-200" />
              <p className="text-xs text-gray-400">No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Payment Link Popup ─────────────────────────────────────────────────────
function defaultExpiryDate() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function fmtExpiry(date: string, time: string) {
  if (!date) return "";
  const d = new Date(`${date}T${time || "23:59"}:00+05:30`);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

// ── Upload Payment Popup ───────────────────────────────────────────────────
function UploadPaymentPopup({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [screenshots, setScreenshots] = useState<{ dataUrl: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target?.result as string;
        setScreenshots(prev => [...prev, { dataUrl, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  }

  async function submit() {
    if (!amount || !referenceNumber) { setErr("Amount and Reference Number are required"); return; }
    if (screenshots.length === 0) { setErr("Please upload at least one payment screenshot"); return; }
    setSaving(true); setErr("");
    try {
      const screenshotsJson = JSON.stringify(screenshots.map(s => s.dataUrl));
      const r = await apiFetch("/mentor/long-term/upload-payment", {
        method: "POST",
        body: JSON.stringify({
          studentId: lead.id,
          amount: Number(amount),
          referenceNumber,
          screenshotsJson,
          type: "upi",
        }),
      });
      if (r.ok) { setDone(true); }
      else { const d = await r.json().catch(() => ({})) as { error?: string }; setErr(d.error ?? "Failed to submit"); }
    } catch { setErr("Network error"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="font-black text-sm" style={{ color: NAVY }}>Upload Payment</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "#DCFCE7" }}>
              <Check className="w-8 h-8" style={{ color: GREEN }} />
            </div>
            <div className="font-black text-base" style={{ color: NAVY }}>Submitted for Approval!</div>
            <div className="text-xs text-gray-400">Admin will verify your screenshots and approve the payment shortly.</div>
            <div className="inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold" style={{ background: "#FEF3C7", color: "#D97706" }}>⏳ Pending Admin Approval</div>
            <button onClick={onClose} className="block w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>Close</button>
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Student info — compact */}
            <div className="px-1 pb-1 border-b border-gray-100">
              <span className="text-xs font-semibold" style={{ color: NAVY }}>{lead.name}</span>
              {lead.displayName && <span className="text-[10px] font-bold ml-1" style={{ color: ORANGE }}>({lead.displayName})</span>}
              <span className="text-[10px] text-gray-400 ml-1.5">Grade {lead.grade} · {padLeadId(lead.id)}</span>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Amount Received (₹) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 15000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-base font-black outline-none focus:border-orange-300"
                style={{ color: NAVY }} />
            </div>

            {/* Unique Reference */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Unique Reference Number *</label>
              <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)}
                placeholder="UTR / Transaction ID / Cheque No."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-orange-300"
                style={{ color: NAVY }} />
              <p className="text-[9px] text-gray-400 mt-1">Must be unique — duplicate reference numbers are rejected.</p>
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1.5">Payment Screenshots *</label>

              {/* Thumbnail grid */}
              {screenshots.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {screenshots.map((sc, i) => (
                    <div key={i} className="relative group">
                      <img src={sc.dataUrl} alt={sc.name}
                        className="w-10 h-10 object-cover rounded-lg border border-gray-200" />
                      <button
                        onClick={() => setScreenshots(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors">
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleFiles(e.target.files)} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-all">
                <Upload className="w-4 h-4" />
                {screenshots.length === 0 ? "Upload Screenshot(s)" : "Add More Screenshots"}
              </button>
              <p className="text-[9px] text-gray-400 mt-1">You can upload multiple screenshots. Tap × to remove.</p>
            </div>

            {/* Pending notice */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-semibold" style={{ background: "#FEF3C7", color: "#D97706" }}>
              ⏳ Admin will review screenshots and approve the payment.
            </div>

            {err && <p className="text-[10px] text-red-500 font-semibold">{err}</p>}

            <button onClick={submit} disabled={saving}
              className="w-full py-3 rounded-xl font-black text-white text-sm transition-all"
              style={{ background: saving ? "#9CA3AF" : `linear-gradient(90deg,${NAVY},#1a4ba8)` }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit for Approval →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment Popup ──────────────────────────────────────────────────────────
function PaymentPopup({ lead, initialMode = "full", onClose }: { lead: Lead; initialMode?: "full" | "partial"; onClose: () => void }) {
  const [mode, setMode] = useState<"full" | "partial">(initialMode);
  const [partialAmount, setPartialAmount] = useState("");
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate());
  const [expiryTime, setExpiryTime] = useState("23:59");
  const [generating, setGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedAmount, setGeneratedAmount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [parentPhone, setParentPhone] = useState<string | null>(null);
  const [autoPrice, setAutoPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Load auto-price for lead's grade
  useEffect(() => {
    if (!lead.grade) return;
    setPriceLoading(true);
    apiFetch(`/mentor/long-term/pricing/${lead.grade}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.available) setAutoPrice(d.finalPriceRupees); })
      .catch(() => {})
      .finally(() => setPriceLoading(false));
  }, [lead.grade]);

  async function generate() {
    setErr(""); setGenerating(true);
    try {
      const body: Record<string, unknown> = { studentId: lead.id, paymentType: mode, expiryDate, expiryTime };
      if (mode === "partial") {
        if (!partialAmount) { setErr("Enter an amount"); setGenerating(false); return; }
        body.partialAmount = Number(partialAmount);
      }
      const r = await apiFetch("/mentor/long-term/create-payment-link", { method: "POST", body: JSON.stringify(body) });
      const d = await r.json();
      if (r.ok) {
        setGeneratedLink(d.url ?? d.shortUrl ?? "");
        setGeneratedAmount(d.amountRupees ?? null);
        setParentPhone((d.parentPhone ?? "").replace(/\D/g, ""));
      } else {
        setErr(d.error ?? "Failed to generate link");
      }
    } catch { setErr("Network error — please try again"); }
    setGenerating(false);
  }

  function buildMessage(link: string) {
    if (mode === "partial") {
      return `Hi,\n\nYou can complete your payment by clicking the link below.\n\n${link}\n\nRegards,\nBraintam Learning`;
    }
    return `Hi,\n\nCongratulations! 🎉\n\nYou can complete your child's enrollment by clicking the link below.\n\n${link}\n\nRegards,\nBraintam Learning`;
  }

  function copyLink() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const [copiedMsg, setCopiedMsg] = useState(false);
  function copyMessage() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(buildMessage(generatedLink ?? "")).catch(() => {});
    setCopiedMsg(true); setTimeout(() => setCopiedMsg(false), 2000);
  }

  function whatsappParent() {
    const ph = parentPhone ?? (lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "");
    window.open(`https://wa.me/91${ph}?text=${encodeURIComponent(buildMessage(generatedLink ?? ""))}`, "_blank");
  }

  if (generatedLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="font-black text-sm" style={{ color: NAVY }}>Payment Link Generated</div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#DCFCE7" }}>
                <Check className="w-5 h-5" style={{ color: GREEN }} />
              </div>
              <div>
                <div className="font-black text-sm" style={{ color: NAVY }}>Link Generated!</div>
                {generatedAmount && <div className="text-xs text-gray-500">Amount: ₹{generatedAmount.toLocaleString("en-IN")}</div>}
              </div>
            </div>

            {/* Message preview */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 flex items-center justify-between" style={{ background: "#F8FAFC" }}>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">WhatsApp Message</span>
                <button onClick={copyMessage}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
                  style={{ background: copiedMsg ? "#DCFCE7" : `${NAVY}12`, color: copiedMsg ? GREEN : NAVY }}>
                  {copiedMsg ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedMsg ? "Copied!" : "Copy Message"}
                </button>
              </div>
              <div className="px-3 py-3 text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap bg-white" style={{ fontFamily: "monospace" }}>
                {buildMessage(generatedLink)}
              </div>
            </div>

            {expiryDate && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold" style={{ background: "#FFF7ED", color: ORANGE }}>
                ⏰ Expires {fmtExpiry(expiryDate, expiryTime)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyLink}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                style={{ borderColor: copied ? GREEN : "#E5E7EB", color: copied ? GREEN : NAVY, background: copied ? "#DCFCE7" : "white" }}>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Link Copied" : "Copy Link"}
              </button>
              <button onClick={whatsappParent}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:shadow-md active:scale-95"
                style={{ background: "linear-gradient(135deg,#25D366,#128C7E)", boxShadow: "0 2px 8px #25D36644" }}>
                <MessageSquare className="w-3.5 h-3.5" /> Send on WhatsApp
              </button>
            </div>
            <button onClick={onClose} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="font-black text-sm" style={{ color: NAVY }}>
            {mode === "full" ? "Full Payment" : "Partial Payment"}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            {(["full", "partial"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }}
                className="flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all"
                style={{
                  background: mode === m ? NAVY : "white",
                  color: mode === m ? "white" : "#9CA3AF",
                  borderColor: mode === m ? NAVY : "#E5E7EB",
                }}>
                {m === "full" ? "Full Payment" : "Partial Payment"}
              </button>
            ))}
          </div>

          {mode === "full" && (
            <div className="p-3 rounded-xl" style={{ background: `${NAVY}08` }}>
              <div className="text-[10px] font-bold text-gray-500 mb-1">Amount</div>
              {priceLoading ? (
                <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" style={{ color: NAVY }} /><span className="text-xs text-gray-400">Loading price...</span></div>
              ) : autoPrice ? (
                <div className="text-xl font-black" style={{ color: NAVY }}>₹{autoPrice.toLocaleString("en-IN")}</div>
              ) : (
                <div className="text-xs text-red-500 font-semibold">No active pricing for Grade {lead.grade}. Contact admin.</div>
              )}
            </div>
          )}

          {mode === "partial" && (
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Enter Amount (₹)</label>
              <input type="number" value={partialAmount} onChange={e => setPartialAmount(e.target.value)} placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-orange-300"
                style={{ color: NAVY }} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Link Expiry Date</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:border-orange-300"
                style={{ color: NAVY }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 block mb-1">Link Expiry Time</label>
              <input type="time" value={expiryTime} onChange={e => setExpiryTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:border-orange-300"
                style={{ color: NAVY }} />
            </div>
          </div>

          {expiryDate && (
            <div className="text-[10px] text-orange-500 font-semibold">⏰ Expires: {fmtExpiry(expiryDate, expiryTime)}</div>
          )}

          {err && <p className="text-[10px] text-red-500">{err}</p>}

          <button onClick={generate} disabled={generating || (mode === "full" && !autoPrice)}
            className="w-full py-3 rounded-xl font-black text-white text-sm transition-all"
            style={{ background: generating || (mode === "full" && !autoPrice) ? "#9CA3AF" : `linear-gradient(90deg,${NAVY},#1a4ba8)` }}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Launch Payment Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance Dots ──────────────────────────────────────────────────────────
function AttDots({ id, attPct }: { id: number; attPct: number | null }) {
  const pct = attPct ?? 0;
  const dots = Array.from({ length: 5 }, (_, i) => {
    const hash = (id * 7 + i * 13) % 100;
    const attended = hash < pct;
    if (!attended) return "white";
    if (pct >= 75) return "green";
    if (pct >= 45) return i % 2 === 0 ? "green" : "yellow";
    if (pct >= 20) return "yellow";
    return "red";
  });
  const CLR: Record<string, string> = { green: "#059669", yellow: "#F59E0B", red: "#EF4444", white: "#E5E7EB" };
  const TIP: Record<string, string> = { green: "Full class", yellow: "Half class", red: "< 15 mins", white: "Absent" };
  return (
    <div className="flex items-center gap-1 mt-1">
      {dots.map((d, i) => (
        <span key={i} className="w-2.5 h-2.5 rounded-full inline-block border"
          style={{ background: d === "white" ? "white" : CLR[d], borderColor: CLR[d] }}
          title={TIP[d]} />
      ))}
      <span className="text-[9px] text-gray-400 ml-1">{pct > 0 ? `${pct}%` : "No data"}</span>
    </div>
  );
}

// ── Lead Card ──────────────────────────────────────────────────────────────
function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (id: number) => void }) {
  const conv = isConverted(lead);

  if (conv) {
    return (
      <div className="bg-white rounded-2xl border-l-4 px-4 py-3 flex items-center gap-3"
        style={{ borderColor: GREEN, borderTop: "1px solid #D1FAE5", borderRight: "1px solid #D1FAE5", borderBottom: "1px solid #D1FAE5", boxShadow: "0 1px 4px rgba(5,150,105,0.08)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm" style={{ color: NAVY }}>{lead.name}</span>
            {lead.displayName && <span className="text-xs font-bold" style={{ color: ORANGE }}>({lead.displayName})</span>}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#DCFCE7", color: GREEN }}>✓ Converted</span>
          </div>
          <div className="text-[11px] text-gray-500">Grade {lead.grade} · {padLeadId(lead.id)}</div>
          <AttDots id={lead.id} attPct={lead.attPct} />
        </div>
        <div className="text-right flex-shrink-0 hidden sm:block">
          <div className="text-[10px] text-gray-400">Converted</div>
          <div className="text-xs font-bold" style={{ color: GREEN }}>{fmtDate(lead.lastCallAt)}</div>
        </div>
        <button onClick={() => onOpen(lead.id)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-green-200 hover:bg-green-50 transition-colors">
          <ChevronRight className="w-4 h-4" style={{ color: GREEN }} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
      style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-sm" style={{ color: NAVY }}>{lead.name}</span>
          {lead.displayName && <span className="text-xs font-bold" style={{ color: ORANGE }}>({lead.displayName})</span>}
          <StatusBadge lead={lead} />
          {lead.callStatus && <CallStatusBadge status={lead.callStatus} />}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
          <span>Grade {lead.grade}</span>
          <span>·</span>
          <span className="font-semibold">{padLeadId(lead.id)}</span>
          <span>·</span>
          <Phone className="w-3 h-3" />
          <span>{lead.phone ?? lead.parentPhone ?? "No phone"}</span>
        </div>
        <AttDots id={lead.id} attPct={lead.attPct} />
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[110px] text-right">
        <div>
          <div className="text-[10px] text-gray-400">Last Call</div>
          <div className="text-xs font-semibold" style={{ color: NAVY }}>{fmtDateTime(lead.lastCallAt)}</div>
        </div>
        {lead.nextFollowUpAt && (
          <div className="mt-0.5">
            <div className="text-[10px] text-gray-400">Next Follow-up</div>
            <div className="text-xs font-bold" style={{ color: followUpColor(lead.nextFollowUpAt) }}>
              {followUpLabel(lead.nextFollowUpAt, lead.nextFollowUpTime)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
        <a href={`tel:${lead.parentPhone ?? lead.phone}`} onClick={e => e.stopPropagation()}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors" title="Call">
          <Phone className="w-4 h-4" style={{ color: GREEN }} />
        </a>
        <a href={`https://wa.me/91${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
          target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors" title="WhatsApp">
          <MessageSquare className="w-4 h-4" style={{ color: "#25D366" }} />
        </a>
        <button onClick={() => onOpen(lead.id)}
          className="w-8 h-8 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors" title="View Details">
          <ChevronRight className="w-4 h-4" style={{ color: NAVY }} />
        </button>
      </div>
    </div>
  );
}

// ── My Leads View ──────────────────────────────────────────────────────────
function MyLeadsView({ leads, loading, error, onOpen, onRefresh }: {
  leads: Lead[];
  loading: boolean;
  error: string;
  onOpen: (id: number) => void;
  onRefresh: () => void;
}) {
  const [chip, setChip] = useState<Chip>("all");
  const [search, setSearch] = useState("");

  const filtered = leads
    .filter(l => {
      if (!matchChip(l, chip)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.name.toLowerCase().includes(q) ||
        (l.phone ?? "").includes(q) ||
        (l.parentPhone ?? "").includes(q) ||
        padLeadId(l.id).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.attPct ?? -1) - (a.attPct ?? -1));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>My Leads</h1>
          <p className="text-xs text-gray-400 mt-0.5">{leads.length} leads assigned to you</p>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 transition-colors"
          style={{ color: NAVY }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "↻"} Refresh
        </button>
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

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} />
          <p className="text-xs text-gray-400">Loading your leads...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm font-bold text-gray-500">Could not load leads</p>
          <p className="text-xs text-gray-400">{error}</p>
          <button onClick={onRefresh}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: NAVY }}>
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-bold text-sm text-gray-400">No leads in this category</p>
          <p className="text-xs text-gray-300 mt-1">
            {search ? "Try a different search term" : "All your leads will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />)}
          <p className="text-center pt-2 text-xs text-gray-400">
            Showing {filtered.length} of {chipCount(leads, chip)} {CHIPS.find(c => c.key === chip)?.label} leads
          </p>
        </div>
      )}
    </div>
  );
}

// ── Student Detail View ────────────────────────────────────────────────────
function StudentDetailView({ lead, onBack, onLeadUpdated }: {
  lead: Lead;
  onBack: () => void;
  onLeadUpdated: (updated: Partial<Lead>) => void;
}) {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [loadingRemarks, setLoadingRemarks] = useState(true);
  const [showPaymentPopup, setShowPaymentPopup] = useState<"full" | "partial" | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);

  // Call form
  const [calledBy, setCalledBy] = useState("Mother");
  const [calledByOtherName, setCalledByOtherName] = useState("");
  const [calledByOtherRelation, setCalledByOtherRelation] = useState("");
  const [callStatus, setCallStatus] = useState(lead.callStatus ?? "Call Later");
  const [nextDate, setNextDate] = useState(lead.nextFollowUpAt?.slice(0, 10) ?? "");
  const [nextTime, setNextTime] = useState(lead.nextFollowUpTime ?? "");
  const [remarkText, setRemarkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [showPrevRemarks, setShowPrevRemarks] = useState(false);

  // Editable mentor info
  const [editDisplayName, setEditDisplayName] = useState(lead.displayName ?? "");
  const [editAltPhone, setEditAltPhone] = useState(lead.altPhone ?? lead.parentPhone ?? "");
  const [editWeak, setEditWeak] = useState(lead.weakSubject ?? "");
  const [editStrong, setEditStrong] = useState(lead.strongSubject ?? "");
  const [editInterest, setEditInterest] = useState(lead.interestLevel ?? "");
  const [editRefGrade, setEditRefGrade] = useState(lead.referenceGrade ? String(lead.referenceGrade) : "");
  const [editNotes, setEditNotes] = useState(lead.notes ?? "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaveOk, setInfoSaveOk] = useState(false);

  const conv = isConverted(lead);

  async function saveInfo() {
    setInfoSaving(true);
    try {
      const r = await apiFetch(`/mentor/students/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editDisplayName,
          altPhone: editAltPhone,
          weakSubject: editWeak,
          strongSubject: editStrong,
          interestLevel: editInterest,
          referenceGrade: editRefGrade ? Number(editRefGrade) : null,
          notes: editNotes,
        }),
      });
      if (r.ok) {
        onLeadUpdated({ displayName: editDisplayName, altPhone: editAltPhone, weakSubject: editWeak, strongSubject: editStrong, interestLevel: editInterest, referenceGrade: editRefGrade ? Number(editRefGrade) : null });
        setInfoSaveOk(true);
        setTimeout(() => setInfoSaveOk(false), 2500);
      }
    } finally {
      setInfoSaving(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoadingRemarks(true);
      try {
        const r = await apiFetch(`/mentor/sales/history/${lead.id}`);
        if (r.ok) setRemarks(await r.json());
      } finally { setLoadingRemarks(false); }
    })();
  }, [lead.id]);


  async function saveRemarks() {
    if (!remarkText.trim()) { setSaveError("Remark is required"); return; }
    setSaving(true); setSaveError("");
    // Silently save mentor-editable fields alongside the remark
    await apiFetch(`/mentor/students/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        displayName: editDisplayName,
        altPhone: editAltPhone,
        weakSubject: editWeak,
        strongSubject: editStrong,
        interestLevel: editInterest,
        referenceGrade: editRefGrade ? Number(editRefGrade) : null,
        notes: "",
      }),
    });
    onLeadUpdated({ displayName: editDisplayName, altPhone: editAltPhone, weakSubject: editWeak, strongSubject: editStrong, interestLevel: editInterest, referenceGrade: editRefGrade ? Number(editRefGrade) : null });
    const r = await apiFetch(`/mentor/sales/call-outcome/${lead.id}`, {
      method: "POST",
      body: JSON.stringify({
        callOutcome: callStatus, leadStatus: callStatus,
        remark: remarkText.trim(),
        nextFollowUpAt: nextDate || undefined,
        nextFollowUpTime: nextTime || undefined,
      }),
    });
    if (r.ok) {
      setSaveOk(true);
      setRemarkText("");
      setTimeout(() => setSaveOk(false), 2500);
      const r2 = await apiFetch(`/mentor/sales/history/${lead.id}`);
      if (r2.ok) setRemarks(await r2.json());
      onLeadUpdated({ callStatus, nextFollowUpAt: nextDate || lead.nextFollowUpAt, nextFollowUpTime: nextTime || lead.nextFollowUpTime, lastCallAt: new Date().toISOString() });
    } else {
      const d = await r.json().catch(() => ({})) as { error?: string };
      setSaveError(d.error ?? "Failed to save");
    }
    setSaving(false);
  }

  const CALL_WHO = ["Student", "Mother", "Father", "Brother", "Sister", "Other"];
  const CALL_STATUSES = ["Not Connected", "Busy", "Call Later", "Interested", "Not Interested", "Payment Pending", "Payment Failed", "Payment Completed"];
  const SUBJECTS = ["Mathematics", "Science", "English", "Hindi", "Social Studies", "Physics", "Chemistry", "Biology", "Other"];
  const INTEREST_LEVELS = ["Low", "Moderate", "High", "Very High"];

  return (
    <div className="flex-1 overflow-y-auto" style={{ fontFamily: "Poppins, sans-serif" }}>
      {showPaymentPopup && <PaymentPopup lead={lead} initialMode={showPaymentPopup} onClose={() => setShowPaymentPopup(null)} />}
      {showUploadPopup && <UploadPaymentPopup lead={lead} onClose={() => setShowUploadPopup(false)} />}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold hover:opacity-70 transition-opacity" style={{ color: NAVY }}>
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
        {conv && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#DCFCE7", color: GREEN }}>✓ Converted Student</span>
        )}
      </div>

      {/* Student header */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base" style={{ color: NAVY }}>{lead.name}</span>
                {lead.displayName && <span className="text-sm font-bold" style={{ color: ORANGE }}>({lead.displayName})</span>}
                {lead.repeatedCustomer && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: "#FEF3C7", color: "#D97706" }}>🔄 Repeat</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Grade {lead.grade} · {padLeadId(lead.id)}</div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Phone className="w-3 h-3" /> <span>{lead.phone ?? lead.parentPhone ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Call & WhatsApp row */}
            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: GREEN }}>
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
              <a href={`https://wa.me/91${(lead.parentPhone ?? lead.phone ?? "").replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: "#25D366" }}>
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
            </div>
            {/* Payment actions — styled pill buttons */}
            <div className="flex items-center gap-2 mt-1">
              {!conv && (
                <button onClick={() => setShowPaymentPopup("full")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:shadow-md active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #e85c00)`, color: "#fff", boxShadow: `0 2px 8px ${ORANGE}55` }}>
                  <CreditCard className="w-3.5 h-3.5" /> Launch Payment
                </button>
              )}
              <button onClick={() => setShowUploadPopup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:shadow-md active:scale-95 border-2"
                style={{ borderColor: GREEN, color: GREEN, background: `${GREEN}12` }}>
                <Upload className="w-3.5 h-3.5" /> Upload Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 md:p-4">

        {/* ── LEFT PANEL ── */}
        <div className="space-y-3">

          {/* 1. Live Class Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4" style={{ color: NAVY }} />
              <div className="font-black text-sm" style={{ color: NAVY }}>Live Class Activity</div>
              <span className="ml-auto text-[10px] text-gray-400">Last 7 Days</span>
            </div>
            {lead.attPct !== null ? (
              <>
                {[
                  { label: "Live Class 1 – Demo", min: 60, att: lead.attPct ?? 75, active: true },
                  { label: "Live Class 2 – Demo", min: 60, att: Math.min(100, (lead.attPct ?? 60) + 7), active: lead.attPct !== null },
                ].map((cls, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm mt-0.5">{cls.active ? "🟢" : "🔴"}</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold" style={{ color: NAVY }}>{cls.label}</div>
                      <div className="text-[10px] text-gray-400">{cls.min} mins</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ color: cls.att >= 70 ? GREEN : "#D97706" }}>Attendance {cls.att}%</div>
                      <div className="flex items-center gap-0.5 mt-0.5 justify-end">
                        <div className="h-1 rounded-full" style={{ width: `${Math.round(cls.att * 0.4)}px`, background: GREEN }} />
                        <div className="h-1 rounded-full" style={{ width: `${Math.round((100 - cls.att) * 0.4)}px`, background: "#E5E7EB" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">No Data Found</p>
            )}
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4" style={{ color: NAVY }} />
              <div className="font-black text-sm" style={{ color: NAVY }}>Analytics <span className="text-gray-400 font-normal text-xs">(5-Day Course)</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: BookOpen,     label: "Classes Held",     value: lead.attPct !== null ? "5" : "—",               color: "#6366F1" },
                { icon: BarChart2,    label: "Attendance",       value: lead.attPct !== null ? `${lead.attPct}%` : "—",    color: GREEN },
                { icon: ClipboardList,label: "Avg. Watch Time",  value: "42 min",                                           color: ORANGE },
                { icon: Check,        label: "HW Completion",    value: lead.hwPct !== null ? `${lead.hwPct}%` : "—",      color: "#0284C7" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: `${item.color}10` }}>
                    <Icon className="w-4 h-4 mb-1" style={{ color: item.color }} />
                    <div className="text-[10px] text-gray-500">{item.label}</div>
                    <div className="font-black text-sm mt-0.5" style={{ color: item.color }}>{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Previous Courses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <div className="font-black text-sm mb-3" style={{ color: NAVY }}>Previous Courses / Demos</div>
            <div className="space-y-2">
              {[
                { name: "5-Day Ignite Demo", type: "Demo", status: conv ? "Completed" : "Enrolled", color: GREEN },
                { name: "Maths Trial Class", type: "Trial", status: "Completed", color: "#0284C7" },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "#3B82F6" }}>{c.name}</div>
                    <div className="text-[10px] text-gray-400">{c.type}</div>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: c.color }}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-4">

          {/* Call Details + Mentor Editable — ONE combined card */}
          {!conv && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
              <div className="font-black text-sm mb-3" style={{ color: NAVY }}>Call Details</div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Who picked / Call Status */}
                <div className={calledBy === "Other" ? "col-span-2" : ""}>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Who Picked the Call?</label>
                  <select value={calledBy} onChange={e => setCalledBy(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none bg-white" style={{ color: NAVY }}>
                    {CALL_WHO.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {calledBy === "Other" && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input value={calledByOtherName} onChange={e => setCalledByOtherName(e.target.value)}
                        placeholder="Name" className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300" style={{ color: NAVY }} />
                      <input value={calledByOtherRelation} onChange={e => setCalledByOtherRelation(e.target.value)}
                        placeholder="Relation" className="px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300" style={{ color: NAVY }} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Call Status</label>
                  <select value={callStatus} onChange={e => setCallStatus(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none bg-white" style={{ color: NAVY }}>
                    {CALL_STATUSES.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 my-3" />

              {/* Mentor-editable fields */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Display Name</label>
                  <input value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300"
                    style={{ color: NAVY }} placeholder={lead.name} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Additional Mobile</label>
                  <input value={editAltPhone} onChange={e => setEditAltPhone(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300"
                    style={{ color: NAVY }} placeholder="Alt phone number" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Reference Grade</label>
                  <select value={editRefGrade} onChange={e => setEditRefGrade(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white" style={{ color: NAVY }}>
                    <option value="">— Select —</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Grade {g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Interest Level</label>
                  <select value={editInterest} onChange={e => setEditInterest(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white" style={{ color: NAVY }}>
                    <option value="">— Select —</option>
                    {INTEREST_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Weak Subject</label>
                  <select value={editWeak} onChange={e => setEditWeak(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white" style={{ color: NAVY }}>
                    <option value="">— Select —</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Strong Subject</label>
                  <select value={editStrong} onChange={e => setEditStrong(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none bg-white" style={{ color: NAVY }}>
                    <option value="">— Select —</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Save Information button */}
              {infoSaveOk && <p className="text-[10px] text-green-600 mb-2">✓ Information saved</p>}
              <div className="flex justify-end mb-3">
                <button onClick={saveInfo} disabled={infoSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all"
                  style={{ background: infoSaving ? "#9CA3AF" : `linear-gradient(90deg,${ORANGE},#e05a10)` }}>
                  {infoSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Save Information
                </button>
              </div>

              {/* Divider before remarks */}
              <div className="border-t border-gray-100 mb-3" />

              {/* Remarks — single textarea */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-gray-500 block mb-1">Remarks *</label>
                <textarea value={remarkText} onChange={e => setRemarkText(e.target.value)} rows={3}
                  placeholder="Add your remarks here..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-orange-300 resize-none"
                  style={{ color: NAVY }} />
              </div>

              {/* Next Follow-up — below remarks */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Next Follow-up Date</label>
                  <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none" style={{ color: NAVY }} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">Next Follow-up Time</label>
                  <input type="time" value={nextTime} onChange={e => setNextTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-xs outline-none" style={{ color: NAVY }} />
                </div>
              </div>

              {saveError && <p className="text-[10px] text-red-500 mb-2">{saveError}</p>}
              {saveOk && <p className="text-[10px] text-green-600 mb-2">✓ Saved successfully</p>}

              <div className="flex justify-end">
                <button onClick={saveRemarks} disabled={saving || !remarkText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all"
                  style={{ background: saving || !remarkText.trim() ? "#9CA3AF" : `linear-gradient(90deg,${NAVY},#1a4ba8)` }}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Remarks
                </button>
              </div>
            </div>
          )}

          {/* Previous Remarks — collapsible */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
            <button
              onClick={() => setShowPrevRemarks(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="font-black text-sm" style={{ color: NAVY }}>Previous Remarks</div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${ORANGE}18`, color: ORANGE }}>{remarks.length}</span>
              </div>
              <svg className={`w-4 h-4 transition-transform ${showPrevRemarks ? "rotate-180" : ""}`} style={{ color: "#9CA3AF" }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {showPrevRemarks && (
              <div className="px-4 pb-4">
                <div className="border-t border-gray-100 mb-3" />
                {loadingRemarks ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} /></div>
                ) : remarks.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No previous remarks yet.</p>
                ) : (
                  <div className="space-y-0">
                    {remarks.slice(0, 15).map((r, i) => (
                      <div key={r.id} className="flex gap-3">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: ORANGE }} />
                          {i < Math.min(remarks.length, 15) - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: "#E5E7EB", minHeight: 16 }} />}
                        </div>
                        <div className="pb-3 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-gray-500">{fmtDate(r.createdAt)}, {fmtTime(r.createdAt)}</span>
                            {r.calledByName && <span className="text-[10px] font-bold" style={{ color: NAVY }}>{r.calledByName}</span>}
                            {r.callStatus && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600">{r.callStatus}</span>}
                          </div>
                          <p className="text-xs text-gray-700 mt-0.5 leading-relaxed break-words">{r.note}</p>
                        </div>
                      </div>
                    ))}
                    {remarks.length > 15 && (
                      <p className="text-xs text-gray-400 text-center pt-1">+{remarks.length - 15} more remarks not shown</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment Status View ────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; border: string; color: string; label: string }> = {
  paid:      { bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A", label: "Paid" },
  created:   { bg: "#EFF6FF", border: "#93C5FD", color: "#2563EB", label: "Pending" },
  opened:    { bg: "#FFFBEB", border: "#FCD34D", color: "#B45309", label: "Opened" },
  expired:   { bg: "#fff",    border: "#D1D5DB", color: "#111827", label: "Expired" },
  failed:    { bg: "#FEF2F2", border: "#FCA5A5", color: "#DC2626", label: "Failed" },
  cancelled: { bg: "#F9FAFB", border: "#D1D5DB", color: "#9CA3AF", label: "Cancelled" },
};

function PaymentStatusView() {
  const [rows, setRows] = useState<PaymentLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true); setErr("");
    apiFetch("/mentor/long-term/payment-links")
      .then(r => r.ok ? r.json() : r.json().then((d: { error?: string }) => { throw new Error(d.error ?? "Error"); }))
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.studentName ?? "").toLowerCase().includes(q) ||
      (r.studentPhone ?? "").includes(q) ||
      String(r.studentId ?? "").includes(q) ||
      (r.razorpayPaymentLinkId ?? "").toLowerCase().includes(q);
  });

  function copyUrl(row: PaymentLinkRow) {
    navigator.clipboard.writeText(row.shortUrl ?? row.razorpayLinkUrl ?? "").catch(() => {});
    setCopiedId(row.id); setTimeout(() => setCopiedId(null), 2000);
  }

  // ── Summary buckets ──────────────────────────────────────────────────────
  const buckets = [
    { key: "all",      label: "Total",     color: NAVY,       border: "#CBD5E1", bg: "#F8FAFF" },
    { key: "paid",     label: "Paid",      color: "#16A34A",  border: "#86EFAC", bg: "#F0FDF4" },
    { key: "created",  label: "Pending",   color: "#2563EB",  border: "#93C5FD", bg: "#EFF6FF" },
    { key: "opened",   label: "Opened",    color: "#B45309",  border: "#FCD34D", bg: "#FFFBEB" },
    { key: "expired",  label: "Expired",   color: "#6B7280",  border: "#D1D5DB", bg: "#F9FAFB" },
    { key: "failed",   label: "Failed",    color: "#DC2626",  border: "#FCA5A5", bg: "#FEF2F2" },
  ] as const;

  function bucketData(key: string) {
    const subset = key === "all" ? rows : rows.filter(r => r.status === key);
    const total = subset.reduce((s, r) => s + r.amountRupees, 0);
    return { count: subset.length, total };
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Title + Refresh ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Payment Status</h1>
          <p className="text-xs text-gray-400 mt-0.5">Payment links you generated — live Razorpay tracking</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
          style={{ color: NAVY }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5 rotate-180" />}
          Refresh
        </button>
      </div>


      {/* ── Search bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white mb-4">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, student ID, or Razorpay ID..."
          className="flex-1 text-xs outline-none bg-transparent" style={{ color: NAVY }} />
        {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(11,43,107,0.06)" }}>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} /></div>
        ) : err ? (
          <div className="text-center py-12">
            <AlertCircle className="w-7 h-7 text-red-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-500">{err}</p>
            <button onClick={load} className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50" style={{ color: NAVY }}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="font-bold text-sm text-gray-400">No payment records</p>
            <p className="text-xs text-gray-300 mt-1">
              {rows.length > 0 ? "Try a different filter" : "Generate a payment link to see it here"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-100" style={{ background: "#F8FAFF" }}>
                  {[
                    "Student",
                    "Razorpay ID",
                    "Amount",
                    "Type",
                    "Status",
                    "Date / Expiry",
                    "Action",
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-black text-gray-500 whitespace-nowrap text-[11px] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const cfg = STATUS_CFG[row.status] ?? { bg: "#F9FAFB", border: "#D1D5DB", color: "#6B7280", label: row.status };
                  const isFull = row.paymentType?.includes("full");
                  const isExpired = row.expiresAt && new Date(row.expiresAt) < new Date() && row.status !== "paid";
                  return (
                    <tr key={row.id}
                      className="border-b border-gray-50 transition-colors"
                      style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFF" }}>

                      {/* Student name + lead ID + phone */}
                      <td className="px-4 py-3">
                        <div className="text-[12px] font-semibold text-gray-800">{row.studentName ?? "—"}</div>
                        {row.studentId && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{padLeadId(row.studentId)}</div>
                        )}
                        {row.studentPhone && <div className="text-[10px] text-gray-400">{row.studentPhone}</div>}
                      </td>

                      {/* Razorpay ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-gray-600 select-all">
                          {row.razorpayPaymentLinkId ?? "—"}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-[12px] font-semibold text-gray-800">
                        ₹{row.amountRupees.toLocaleString("en-IN")}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 text-[11px] text-gray-700 font-medium">
                        {isFull ? "Full" : "Partial"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-[11px] text-gray-700 font-medium">
                        {cfg.label}
                      </td>

                      {/* Created + Expiry stacked */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-[10px] text-gray-500">
                          <span className="font-semibold text-gray-400">Created</span> {fmtDT(row.createdAt)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isExpired ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                          <span className="font-semibold">Expiry</span>{" "}
                          {row.expiresAt ? fmtDT(row.expiresAt) : "—"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {(row.shortUrl ?? row.razorpayLinkUrl) && row.status !== "paid" && (
                            <button onClick={() => copyUrl(row)} title="Copy payment link"
                              className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 hover:bg-blue-50 transition-colors">
                              {copiedId === row.id
                                ? <Check className="w-3 h-3" style={{ color: GREEN }} />
                                : <Copy className="w-3 h-3" style={{ color: NAVY }} />}
                            </button>
                          )}
                          {(row.shortUrl ?? row.razorpayLinkUrl) && row.studentPhone && row.status !== "paid" && (
                            <a href={`https://wa.me/91${row.studentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi,\n\nYour payment link is ready:\n${row.shortUrl ?? row.razorpayLinkUrl}\n\nRegards,\nBraintam Learning`)}`}
                              target="_blank" rel="noopener noreferrer" title="Send via WhatsApp"
                              className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 hover:bg-green-50 transition-colors">
                              <MessageSquare className="w-3 h-3" style={{ color: "#25D366" }} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer total */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between" style={{ background: "#F8FAFF" }}>
              <span className="text-xs font-bold text-gray-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
              <span className="text-xs font-black" style={{ color: NAVY }}>
                Total: ₹{filtered.reduce((s, r) => s + r.amountRupees, 0).toLocaleString("en-IN")}
              </span>
            </div>
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
  const [error, setError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifications: Notification[] = [
    { id: 1, color: "#F59E0B", text: "Priya Gupta created order.",                    time: new Date(Date.now() - 20*60000).toISOString(), unread: true,  type: "payment" },
    { id: 2, color: "#10B981", text: "Priya Gupta completed payment successfully.",   time: new Date(Date.now() - 25*60000).toISOString(), unread: true,  type: "payment", leadId: 39 },
    { id: 3, color: "#EF4444", text: "Aarav Sharma payment failed.",                  time: new Date(Date.now() - 90*60000).toISOString(), unread: true,  type: "payment", leadId: 42 },
    { id: 4, color: "#8B5CF6", text: "Aarav Sharma submitted homework.",              time: new Date(Date.now() - 120*60000).toISOString(), unread: false, type: "activity", leadId: 42 },
    { id: 5, color: "#3B82F6", text: "Priya Gupta edited profile.",                   time: new Date(Date.now() - 26*3600000).toISOString(), unread: false, type: "activity" },
    { id: 6, color: "#6B7280", text: "You have a new follow-up due today.",           time: new Date(Date.now() - 27*3600000).toISOString(), unread: false, type: "message" },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiFetch("/mentor/sales/leads");
      if (r.ok) {
        setLeads(await r.json());
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? `Server error (${r.status})`);
      }
    } catch (e) {
      setError("Network error — please check your connection");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openStudent(id: number) { setSelectedId(id); setView("student-detail"); }

  function handleLeadUpdated(id: number, updated: Partial<Lead>) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
  }

  const selectedLead = leads.find(l => l.id === selectedId);

  const NAV = [
    { key: "my-leads"       as const, label: "My Leads" },
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
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-5 rounded-full" style={{ background: ORANGE }} />
          <div>
            <div className="font-black leading-tight" style={{ fontSize: "13px", color: NAVY, letterSpacing: "0.04em" }}>BTL <span style={{ color: ORANGE }}>CRM</span></div>
            <div className="text-[9px] text-gray-400 leading-tight">Sales Mentor Panel</div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 ml-4">
          {NAV.map(item => (
            <button key={item.key}
              onClick={() => { setView(item.key); setSelectedId(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: (view === item.key || (item.key === "my-leads" && view === "student-detail")) ? `${NAVY}12` : "transparent",
                color:      (view === item.key || (item.key === "my-leads" && view === "student-detail")) ? NAVY : "#6B7280",
              }}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowNotifications(v => !v)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <Bell className="w-4 h-4" style={{ color: NAVY }} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center text-white font-black rounded-full"
                style={{ background: "#EF4444", minWidth: 17, height: 17, fontSize: 9 }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setShowNotifications(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200">
            <Flag className="w-4 h-4" style={{ color: showNotifications ? ORANGE : NAVY }} />
          </button>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: user.avatarUrl ? "transparent" : NAVY }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  : initials(user.name)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold leading-tight" style={{ color: NAVY }}>{user.name}</div>
                <div className="text-[10px] font-semibold" style={{ color: "#D97706" }}>Sales Mentor</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1">
                <div className="px-4 py-2.5 border-b border-gray-50">
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

      {/* ── Attendance banner ── */}
      <StaffCheckin apiFetch={apiFetch} role="mentor" />

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "my-leads" && (
          <MyLeadsView leads={leads} loading={loading} error={error} onOpen={openStudent} onRefresh={fetchLeads} />
        )}
        {view === "student-detail" && selectedLead && (
          <StudentDetailView
            lead={selectedLead}
            onBack={() => setView("my-leads")}
            onLeadUpdated={updated => handleLeadUpdated(selectedLead.id, updated)}
          />
        )}
        {view === "payment-status" && (
          <PaymentStatusView />
        )}
      </div>
    </div>
  );
}
