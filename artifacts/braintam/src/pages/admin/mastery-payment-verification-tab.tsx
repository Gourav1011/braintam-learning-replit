import { useState, useEffect, useCallback, useRef } from "react";
import {
  CreditCard, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  Search, Filter, Eye, X, ChevronDown, ChevronUp, AlertCircle,
  ShieldCheck, ShieldX, Shield, Upload, Download, Loader2,
  MoreVertical, Check, Ban, Flag, RotateCcw, ExternalLink,
  User, GraduationCap, Calendar, Banknote, Copy,
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

// ── Types ──────────────────────────────────────────────────────────────────
interface Payment {
  id: number;
  masteryStudentId: number | null;
  studentId: number | null;
  studentName: string | null;
  studentGrade: number | null;
  submittedByName: string | null;
  amount: number;
  paymentMethod: string;
  utrNumber: string | null;
  razorpayPaymentId: string | null;
  screenshotsJson: string | null;
  status: string;
  isDuplicate: boolean;
  duplicateInfo: string | null;
  fraudCheckResult: string | null;
  razorpayVerified: boolean | null;
  verificationNotes: string | null;
  uploadedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  approvedByName: string | null;
  refundedAt: string | null;
}

interface Stats {
  pendingVerification: number;
  approvedToday: number;
  rejectedToday: number;
  duplicateSuspected: number;
  verificationFailed: number;
}

interface DuplicateEntry {
  id: number;
  studentName: string | null;
  studentGrade: number | null;
  amount: number;
  uploadedAt: string;
  status: string;
  utrNumber: string | null;
  razorpayPaymentId: string | null;
}

// ── Status config ──────────────────────────────────────────────────────────
function statusConfig(status: string) {
  switch (status) {
    case "pending_verification": return { label: "Pending Verification", color: AMBER,  bg: "#FEF3C7", icon: Clock };
    case "approved":             return { label: "Approved",             color: GREEN,  bg: "#D1FAE5", icon: CheckCircle2 };
    case "rejected":             return { label: "Rejected",             color: RED,    bg: "#FEE2E2", icon: XCircle };
    case "duplicate_suspected":  return { label: "Duplicate Suspected",  color: PURPLE, bg: "#EDE9FE", icon: Flag };
    case "verification_failed":  return { label: "Verification Failed",  color: RED,    bg: "#FEE2E2", icon: ShieldX };
    case "refunded":             return { label: "Refunded",             color: "#6B7280", bg: "#F3F4F6", icon: RotateCcw };
    default:                     return { label: status,                 color: "#6B7280", bg: "#F3F4F6", icon: Clock };
  }
}

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// ── Upload Payment Modal ───────────────────────────────────────────────────
function UploadPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [utrNumber, setUtrNumber] = useState("");
  const [razorpayPaymentId, setRazorpayPaymentId] = useState("");
  const [screenshots, setScreenshots] = useState<Array<{ dataUrl: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
    if (!amount || !studentName) { setErr("Student name and amount are required"); return; }
    if (!utrNumber && !razorpayPaymentId) { setErr("Enter UTR number or Razorpay Payment ID"); return; }
    setSaving(true); setErr("");
    try {
      const r = await apiFetch("/admin/mastery/payments", {
        method: "POST",
        body: JSON.stringify({
          studentName,
          studentGrade: studentGrade ? parseInt(studentGrade, 10) : null,
          amount: parseInt(amount, 10),
          paymentMethod,
          utrNumber: utrNumber || null,
          razorpayPaymentId: razorpayPaymentId || null,
          screenshotsJson: screenshots.length > 0 ? JSON.stringify(screenshots.map(s => s.dataUrl)) : null,
        }),
      });
      if (r.ok) { onSuccess(); }
      else { const d = await r.json().catch(() => ({})) as { error?: string }; setErr(d.error ?? "Failed"); }
    } catch { setErr("Network error"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="font-black text-sm" style={{ color: NAVY }}>Upload Payment</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {err && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Student Name *</label>
              <input value={studentName} onChange={e => setStudentName(e.target.value)}
                placeholder="Arjun Sharma"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Grade</label>
              <select value={studentGrade} onChange={e => setStudentGrade(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400">
                <option value="">—</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount (₹) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="15000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400">
                <option value="upi">UPI</option>
                <option value="razorpay">Razorpay</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">UTR Number</label>
            <input value={utrNumber} onChange={e => setUtrNumber(e.target.value)}
              placeholder="123456789012"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Razorpay Payment ID</label>
            <input value={razorpayPaymentId} onChange={e => setRazorpayPaymentId(e.target.value)}
              placeholder="pay_XXXXXXXXXX"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-400" />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Screenshots</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition-colors">
              <Upload className="w-5 h-5 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Click to upload payment screenshots</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            </label>
            {screenshots.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {screenshots.map((s, i) => (
                  <div key={i} className="relative">
                    <img src={s.dataUrl} alt={s.name} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <button onClick={() => setScreenshots(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
            {saving ? "Uploading…" : "Submit Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Screenshot Viewer ──────────────────────────────────────────────────────
function ScreenshotViewer({ screenshotsJson, onClose }: { screenshotsJson: string; onClose: () => void }) {
  let urls: string[] = [];
  try { urls = JSON.parse(screenshotsJson); } catch { urls = []; }
  const [idx, setIdx] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-black" style={{ color: NAVY }}>Payment Screenshot ({idx + 1}/{urls.length})</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-4">
          {urls[idx] ? (
            <img src={urls[idx]} alt="Screenshot" className="w-full max-h-[60vh] object-contain rounded-xl" />
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">No screenshot available</div>
          )}
          {urls.length > 1 && (
            <div className="flex gap-2 justify-center mt-3">
              {urls.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === idx ? "bg-blue-500" : "bg-gray-300"}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reject Modal ───────────────────────────────────────────────────────────
function RejectModal({ payment, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await apiFetch(`/admin/mastery/payments/${payment.id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-black text-red-600">Reject Payment</span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-600">Rejecting payment from <strong>{payment.studentName}</strong> for {fmt(payment.amount)}.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-300 resize-none" />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-gray-600 text-xs font-semibold border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl text-white text-xs font-semibold"
            style={{ background: RED }}>
            {saving ? "Rejecting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Drawer ──────────────────────────────────────────────────────────
function PaymentDetailDrawer({
  payment, onClose, onRefresh,
}: {
  payment: Payment; onClose: () => void; onRefresh: () => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [dupChecking, setDupChecking] = useState(false);
  const [dupResult, setDupResult] = useState<{ isDuplicate: boolean; duplicates: DuplicateEntry[] } | null>(null);
  const [fraudResult, setFraudResult] = useState<Record<string, unknown> | null>(null);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const cfg = statusConfig(payment.status);

  useEffect(() => {
    if (payment.fraudCheckResult) {
      try { setFraudResult(JSON.parse(payment.fraudCheckResult)); } catch { /* ignore */ }
    }
  }, [payment.fraudCheckResult]);

  async function doAction(path: string, key: string, body?: Record<string, unknown>) {
    setActionLoading(key);
    const r = await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({})) as { error?: string };
    if (!r.ok) { setMsg(d.error ?? "Error"); }
    else { onRefresh(); setMsg(""); }
    setActionLoading(null);
  }

  async function verifyRazorpay() {
    setVerifying(true);
    const r = await apiFetch(`/admin/mastery/payments/${payment.id}/verify-razorpay`, { method: "POST" });
    const d = await r.json().catch(() => ({})) as { fraudCheckResult?: Record<string, unknown>; error?: string };
    if (r.ok && d.fraudCheckResult) setFraudResult(d.fraudCheckResult);
    onRefresh();
    setVerifying(false);
  }

  async function checkDuplicate() {
    setDupChecking(true);
    const r = await apiFetch(`/admin/mastery/payments/${payment.id}/check-duplicate`);
    const d = await r.json().catch(() => ({})) as { isDuplicate?: boolean; duplicates?: DuplicateEntry[] };
    setDupResult({ isDuplicate: d.isDuplicate ?? false, duplicates: d.duplicates ?? [] });
    setDupChecking(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ fontFamily: "Poppins, sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Payment #{payment.id}</p>
            <p className="text-base font-black" style={{ color: NAVY }}>{payment.studentName || "Unknown Student"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {msg && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{msg}</div>}

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}>
              <cfg.icon className="w-3 h-3" />
              {cfg.label}
            </span>
            {payment.razorpayVerified === true && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                <ShieldCheck className="w-3 h-3" /> Razorpay Verified
              </span>
            )}
            {payment.razorpayVerified === false && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                <ShieldX className="w-3 h-3" /> Razorpay Check Failed
              </span>
            )}
          </div>

          {/* Payment Info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Payment Details</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Amount</p><p className="font-black text-base" style={{ color: NAVY }}>{fmt(payment.amount)}</p></div>
              <div><p className="text-xs text-gray-400">Method</p><p className="font-semibold capitalize text-gray-700">{payment.paymentMethod}</p></div>
              <div><p className="text-xs text-gray-400">Student</p><p className="font-semibold text-gray-700">{payment.studentName || "—"}</p></div>
              <div><p className="text-xs text-gray-400">Grade</p><p className="font-semibold text-gray-700">{payment.studentGrade ? `Grade ${payment.studentGrade}` : "—"}</p></div>
              {payment.utrNumber && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">UTR Number</p>
                  <p className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 mt-0.5 flex items-center gap-2">
                    {payment.utrNumber}
                    <button onClick={() => navigator.clipboard.writeText(payment.utrNumber!)}
                      className="text-gray-400 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                  </p>
                </div>
              )}
              {payment.razorpayPaymentId && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400">Razorpay Payment ID</p>
                  <p className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 mt-0.5 flex items-center gap-2">
                    {payment.razorpayPaymentId}
                    <button onClick={() => navigator.clipboard.writeText(payment.razorpayPaymentId!)}
                      className="text-gray-400 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                  </p>
                </div>
              )}
              <div><p className="text-xs text-gray-400">Uploaded</p><p className="text-xs text-gray-600">{fmtDate(payment.uploadedAt)}</p></div>
              <div><p className="text-xs text-gray-400">Submitted By</p><p className="text-xs text-gray-600">{payment.submittedByName || "—"}</p></div>
              {payment.approvedAt && (
                <div><p className="text-xs text-gray-400">Approved</p><p className="text-xs text-gray-600">{fmtDate(payment.approvedAt)} by {payment.approvedByName}</p></div>
              )}
              {payment.rejectionReason && (
                <div className="col-span-2"><p className="text-xs text-gray-400">Rejection Reason</p><p className="text-xs text-red-600">{payment.rejectionReason}</p></div>
              )}
            </div>
          </div>

          {/* Screenshots */}
          {payment.screenshotsJson && (
            <button onClick={() => setShowScreenshots(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">View Payment Screenshots</p>
                <p className="text-xs text-gray-400">{(() => { try { return JSON.parse(payment.screenshotsJson!).length; } catch { return 0; } })()} screenshot(s) attached</p>
              </div>
            </button>
          )}

          {/* Duplicate Check Section */}
          <div className="bg-amber-50 rounded-2xl p-4 space-y-3 border border-amber-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Duplicate Detection
              </p>
              <button onClick={checkDuplicate} disabled={dupChecking}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-amber-800 border border-amber-200 hover:bg-amber-100 flex items-center gap-1">
                {dupChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                {dupChecking ? "Checking…" : "Check Now"}
              </button>
            </div>
            {dupResult === null && <p className="text-xs text-amber-700">Click "Check Now" to scan for duplicate UTR/Razorpay ID across all records.</p>}
            {dupResult !== null && !dupResult.isDuplicate && (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-semibold">No duplicates found</span>
              </div>
            )}
            {dupResult?.isDuplicate && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-black">⚠ Duplicate Payment Found</span>
                </div>
                {dupResult.duplicates.map(d => (
                  <div key={d.id} className="bg-white rounded-xl p-3 border border-red-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">{d.studentName || "Unknown"}</span>
                      <span className="font-black" style={{ color: RED }}>{fmt(d.amount)}</span>
                    </div>
                    <div className="text-gray-500">
                      Grade {d.studentGrade} · {fmtDate(d.uploadedAt)} · <span className="font-semibold">{statusConfig(d.status).label}</span>
                    </div>
                    {d.utrNumber && <div className="font-mono">UTR: {d.utrNumber}</div>}
                    {d.razorpayPaymentId && <div className="font-mono">Razorpay: {d.razorpayPaymentId}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Razorpay Verification Section */}
          {(payment.paymentMethod === "razorpay" || payment.razorpayPaymentId) && (
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Razorpay Verification
                </p>
                <button onClick={verifyRazorpay} disabled={verifying}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-800 border border-blue-200 hover:bg-blue-100 flex items-center gap-1">
                  {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  {verifying ? "Verifying…" : "Verify via API"}
                </button>
              </div>
              {!fraudResult && <p className="text-xs text-blue-700">Click "Verify via API" to check this Razorpay Payment ID with Razorpay's servers.</p>}
              {fraudResult && (
                <div className="space-y-2">
                  {fraudResult["found"] === true ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-black">Record found on Razorpay</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-white rounded-xl p-3 border border-green-200 text-xs">
                        <div><p className="text-gray-400">Status</p><p className="font-semibold capitalize">{String(fraudResult["status"] ?? "—")}</p></div>
                        <div><p className="text-gray-400">Amount</p><p className="font-semibold">₹{Math.round(Number(fraudResult["amount"]) / 100).toLocaleString("en-IN")}</p></div>
                        <div><p className="text-gray-400">Method</p><p className="font-semibold capitalize">{String(fraudResult["method"] ?? "—")}</p></div>
                        <div><p className="text-gray-400">Checked At</p><p className="font-semibold">{fmtDate(String(fraudResult["checkedAt"] ?? ""))}</p></div>
                      </div>
                      {Boolean(fraudResult["amountMismatch"]) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                          <p className="font-black">⚠ Amount Mismatch</p>
                          <p>Razorpay: ₹{Number(fraudResult["razorpayAmountRupees"]).toLocaleString("en-IN")} · Recorded: ₹{Number(fraudResult["recordedAmountRupees"]).toLocaleString("en-IN")}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-red-700">
                        <ShieldX className="w-4 h-4" />
                        <span className="text-xs font-black">❌ No Record Found on Razorpay</span>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                        <p className="font-semibold">Possible fake payment</p>
                        <p className="text-red-500 mt-0.5">{String(fraudResult["error"] ?? "Payment ID not found")}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Timeline</p>
            <div className="space-y-2">
              {[
                { label: "Payment Uploaded", date: payment.uploadedAt, icon: Upload, color: NAVY },
                { label: `Approved by ${payment.approvedByName || "Admin"}`, date: payment.approvedAt, icon: CheckCircle2, color: GREEN },
                { label: "Rejected", date: payment.rejectedAt, icon: XCircle, color: RED },
                { label: "Refunded", date: payment.refundedAt, icon: RotateCcw, color: AMBER },
              ].filter(e => e.date).map((e, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: e.color + "20" }}>
                    <e.icon className="w-3 h-3" style={{ color: e.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">{e.label}</p>
                    <p className="text-gray-400">{fmtDate(e.date!)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!["approved", "refunded"].includes(payment.status) && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-2">
            <div className="flex gap-2">
              {payment.status !== "approved" && (
                <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/approve`, "approve")}
                  disabled={actionLoading === "approve"}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-semibold"
                  style={{ background: GREEN }}>
                  {actionLoading === "approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Approve
                </button>
              )}
              {payment.status !== "rejected" && (
                <button onClick={() => setShowReject(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-semibold"
                  style={{ background: RED }}>
                  <Ban className="w-3 h-3" /> Reject
                </button>
              )}
              <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/flag-duplicate`, "dup")}
                disabled={actionLoading === "dup"}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-semibold"
                style={{ background: PURPLE }}>
                {actionLoading === "dup" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />}
                Flag Duplicate
              </button>
            </div>
            {payment.status === "approved" && (
              <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/refund`, "refund")}
                disabled={actionLoading === "refund"}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50">
                {actionLoading === "refund" ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Mark Refunded
              </button>
            )}
          </div>
        )}
      </div>

      {showScreenshots && payment.screenshotsJson && (
        <ScreenshotViewer screenshotsJson={payment.screenshotsJson} onClose={() => setShowScreenshots(false)} />
      )}
      {showReject && (
        <RejectModal payment={payment} onClose={() => setShowReject(false)} onDone={() => { setShowReject(false); onRefresh(); }} />
      )}
    </>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────
export function MasteryPaymentVerificationTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats]     = useState<Stats>({ pendingVerification: 0, approvedToday: 0, rejectedToday: 0, duplicateSuspected: 0, verificationFailed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [sortField, setSortField] = useState<"uploadedAt" | "amount">("uploadedAt");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    const r = await apiFetch(`/admin/mastery/payments?${params}`);
    if (r.ok) {
      const d = await r.json() as { payments: Payment[]; stats: Stats };
      setPayments(d.payments ?? []);
      setStats(d.stats ?? { pendingVerification: 0, approvedToday: 0, rejectedToday: 0, duplicateSuspected: 0, verificationFailed: 0 });
    }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const sorted = [...payments].sort((a, b) => {
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "amount") return (a.amount - b.amount) * mul;
    return (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()) * mul;
  });

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  const statCards = [
    { label: "Pending Verification", value: stats.pendingVerification, icon: Clock,         color: AMBER,  bg: "#FEF3C7", filter: "pending_verification" },
    { label: "Approved Today",       value: stats.approvedToday,       icon: CheckCircle2,  color: GREEN,  bg: "#D1FAE5", filter: "approved" },
    { label: "Rejected Today",       value: stats.rejectedToday,       icon: XCircle,       color: RED,    bg: "#FEE2E2", filter: "rejected" },
    { label: "Duplicate Suspected",  value: stats.duplicateSuspected,  icon: Flag,          color: PURPLE, bg: "#EDE9FE", filter: "duplicate_suspected" },
    { label: "Verification Failed",  value: stats.verificationFailed,  icon: ShieldX,       color: RED,    bg: "#FEE2E2", filter: "verification_failed" },
  ];

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: NAVY }}>Payment Verification Center</h2>
          <p className="text-xs text-gray-500 mt-0.5">Review, approve, and fraud-check mastery student payments</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm"
          style={{ background: NAVY }}>
          <Upload className="w-3.5 h-3.5" /> Upload Payment
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-3">
        {statCards.map(card => {
          const active = statusFilter === card.filter;
          return (
            <button key={card.filter} onClick={() => setStatusFilter(active ? "all" : card.filter)}
              className="rounded-2xl p-4 text-left transition-all border-2"
              style={{
                background: active ? card.color : "white",
                borderColor: active ? card.color : "#E5E7EB",
                boxShadow: active ? `0 4px 14px ${card.color}40` : "none",
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                style={{ background: active ? "rgba(255,255,255,0.25)" : card.bg }}>
                <card.icon className="w-4 h-4" style={{ color: active ? "white" : card.color }} />
              </div>
              <p className={`text-2xl font-black ${active ? "text-white" : ""}`}
                style={active ? {} : { color: NAVY }}>{card.value}</p>
              <p className={`text-xs mt-0.5 ${active ? "text-white/80" : "text-gray-500"}`}>{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name, UTR, Razorpay ID…"
            className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
        </div>
        <button onClick={fetchPayments}
          className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Student</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Grade</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 cursor-pointer select-none"
                onClick={() => toggleSort("amount")}>
                <span className="flex items-center justify-end gap-1">
                  Amount {sortField === "amount" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Method</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">UTR / Razorpay ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 cursor-pointer select-none"
                onClick={() => toggleSort("uploadedAt")}>
                <span className="flex items-center gap-1">
                  Uploaded {sortField === "uploadedAt" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No payments found</td></tr>
            ) : sorted.map(p => {
              const cfg = statusConfig(p.status);
              return (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(p)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
                        style={{ background: NAVY }}>
                        {(p.studentName || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{p.studentName || "Unknown"}</p>
                        <p className="text-gray-400">#{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.studentGrade ? `Grade ${p.studentGrade}` : "—"}</td>
                  <td className="px-4 py-3 text-right font-black" style={{ color: NAVY }}>{fmt(p.amount)}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{p.paymentMethod}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {p.utrNumber || p.razorpayPaymentId
                      ? (p.utrNumber || p.razorpayPaymentId)!.length > 18
                        ? (p.utrNumber || p.razorpayPaymentId)!.slice(0, 18) + "…"
                        : (p.utrNumber || p.razorpayPaymentId)
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.uploadedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {p.screenshotsJson && (
                        <button onClick={() => { setSelected(p); }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="View Screenshot">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!["approved", "refunded"].includes(p.status) && (
                        <>
                          <button onClick={async () => {
                            await apiFetch(`/admin/mastery/payments/${p.id}/approve`, { method: "POST" });
                            fetchPayments();
                          }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setSelected(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject">
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={async () => {
                            await apiFetch(`/admin/mastery/payments/${p.id}/flag-duplicate`, { method: "POST" });
                            fetchPayments();
                          }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Flag Duplicate">
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <PaymentDetailDrawer
          payment={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { fetchPayments(); setSelected(null); }}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadPaymentModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchPayments(); }}
        />
      )}
    </div>
  );
}
