import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Loader2,
  Search, Filter, ChevronDown, X, Eye, ReceiptText, IndianRupee,
  User, Phone, CreditCard, Calendar, FileText, Copy, Check,
  ExternalLink, ShieldAlert, ArrowRight, TrendingUp,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";
const RED    = "#DC2626";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include",
    ...opts,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Payment {
  id: number;
  studentId: number;
  submittedById: number;
  type: string;
  amount: number;
  referenceNumber: string | null;
  paymentDate: string | null;
  remarks: string | null;
  screenshotsJson: string | null;
  status: "pending" | "approved" | "rejected";
  isDuplicate: boolean;
  duplicateType: string | null;
  duplicateScore: number | null;
  duplicatePaymentId: number | null;
  receiptNumber: string | null;
  installmentNumber: number | null;
  uploadedAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  studentName: string | null;
  studentPhone: string | null;
  studentGrade: number | null;
  mentorName: string | null;
  mentorEmail: string | null;
}

interface Stats {
  totalApprovedRupees: number;
  totalApprovedCount: number;
  pendingCount: number;
  approvedTodayRupees: number;
  approvedTodayCount: number;
  rejectedTodayCount: number;
  duplicateCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MODE_LABELS: Record<string, string> = {
  upi: "UPI", bank: "Bank Transfer", cash: "Cash", cheque: "Cheque",
};
const STATUS_CONFIG = {
  pending:  { label: "Pending",  bg: "bg-amber-100",  text: "text-amber-700",  icon: Clock },
  approved: { label: "Approved", bg: "bg-green-100",  text: "text-green-700",  icon: CheckCircle2 },
  rejected: { label: "Rejected", bg: "bg-red-100",    text: "text-red-700",    icon: XCircle },
};
const GRADE_LABEL: Record<number, string> = {
  1: "Grade 1", 2: "Grade 2", 3: "Grade 3", 4: "Grade 4", 5: "Grade 5",
  6: "Grade 6", 7: "Grade 7", 8: "Grade 8", 9: "Grade 9", 10: "Grade 10",
};

function fmt(rupees: number) {
  return "₹" + rupees.toLocaleString("en-IN");
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Payment["status"] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

// ── Duplicate Badge ───────────────────────────────────────────────────────────
function DupBadge({ type }: { type: string | null }) {
  if (!type) return null;
  if (type === "hard") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
      <ShieldAlert className="w-2.5 h-2.5" /> Hard Dup
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
      <AlertTriangle className="w-2.5 h-2.5" /> Soft Dup
    </span>
  );
}

// ── Stats Cards ───────────────────────────────────────────────────────────────
function StatsRow({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  const cards = [
    {
      label: "Pending Review",
      value: loading ? "—" : String(stats?.pendingCount ?? 0),
      sub: "awaiting admin action",
      color: ORANGE,
      icon: Clock,
    },
    {
      label: "Total Approved",
      value: loading ? "—" : fmt(stats?.totalApprovedRupees ?? 0),
      sub: `${stats?.totalApprovedCount ?? 0} payments`,
      color: GREEN,
      icon: CheckCircle2,
    },
    {
      label: "Approved Today",
      value: loading ? "—" : fmt(stats?.approvedTodayRupees ?? 0),
      sub: `${stats?.approvedTodayCount ?? 0} payments today`,
      color: NAVY,
      icon: TrendingUp,
    },
    {
      label: "Flagged Duplicates",
      value: loading ? "—" : String(stats?.duplicateCount ?? 0),
      sub: "need verification",
      color: RED,
      icon: ShieldAlert,
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">{card.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${card.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: card.color }} />
              </div>
            </div>
            <p className="text-xl font-black" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({
  payment,
  allPayments,
  onClose,
  onApproved,
  onRejected,
}: {
  payment: Payment;
  allPayments: Payment[];
  onClose: () => void;
  onApproved: (id: number, receiptNumber: string) => void;
  onRejected: (id: number) => void;
}) {
  const [acting, setActing] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState("");

  const screenshots: string[] = (() => {
    try { return JSON.parse(payment.screenshotsJson ?? "[]") as string[]; } catch { return []; }
  })();

  const dupPayment = allPayments.find(p => p.id === payment.duplicatePaymentId);

  const doApprove = async () => {
    setActing("approve");
    setError("");
    try {
      const res = await apiFetch(`/admin/long-term/manual-payments/${payment.id}/approve`, { method: "POST" });
      const data = await res.json() as { receiptNumber?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Approval failed"); setActing(null); return; }
      onApproved(payment.id, data.receiptNumber ?? "");
    } catch (e) {
      setError((e as Error).message);
      setActing(null);
    }
  };

  const doReject = async () => {
    if (!rejectReason.trim()) { setError("Please provide a rejection reason"); return; }
    setActing("reject");
    setError("");
    try {
      const res = await apiFetch(`/admin/long-term/manual-payments/${payment.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Rejection failed"); setActing(null); return; }
      onRejected(payment.id);
    } catch (e) {
      setError((e as Error).message);
      setActing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}10` }}>
              <ReceiptText className="w-4.5 h-4.5" style={{ color: NAVY }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: NAVY }}>Payment #{payment.id}</p>
              <p className="text-[11px] text-gray-400">
                {fmtDate(payment.uploadedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={payment.status} />
            {payment.isDuplicate && <DupBadge type={payment.duplicateType} />}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 rounded-xl p-3 flex items-center gap-2 text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Amount highlight */}
          <div className="rounded-2xl p-4 text-white" style={{ background: NAVY }}>
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="w-4 h-4 opacity-70" />
              <span className="text-xs font-semibold opacity-70">Amount Collected</span>
            </div>
            <p className="text-3xl font-black">{fmt(payment.amount)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
              <span>{MODE_LABELS[payment.type] ?? payment.type}</span>
              {payment.referenceNumber && (
                <>
                  <span>·</span>
                  <span>Ref: {payment.referenceNumber}</span>
                </>
              )}
              {payment.receiptNumber && (
                <>
                  <span>·</span>
                  <span className="font-bold text-orange-300">{payment.receiptNumber}</span>
                </>
              )}
            </div>
          </div>

          {/* Student info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Student</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-bold" style={{ color: NAVY }}>{payment.studentName ?? "—"}</span>
              {payment.studentGrade && (
                <span className="text-xs px-1.5 py-0.5 bg-white rounded-full border border-gray-200 text-gray-500">
                  {GRADE_LABEL[payment.studentGrade] ?? `Grade ${payment.studentGrade}`}
                </span>
              )}
            </div>
            {payment.studentPhone && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="w-3 h-3" /> {payment.studentPhone}
              </div>
            )}
          </div>

          {/* Mentor info */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Uploaded By</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-semibold text-gray-700">{payment.mentorName ?? "—"}</span>
              {payment.mentorEmail && (
                <span className="text-xs text-gray-400">({payment.mentorEmail})</span>
              )}
            </div>
          </div>

          {/* Payment details */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Payment Details</p>
            {[
              { label: "Mode", value: MODE_LABELS[payment.type] ?? payment.type, icon: CreditCard },
              { label: "Reference #", value: payment.referenceNumber ?? "—", icon: FileText, copy: payment.referenceNumber },
              { label: "Payment Date", value: payment.paymentDate ? fmtDate(payment.paymentDate) : "—", icon: Calendar },
              { label: "Uploaded At", value: fmtDate(payment.uploadedAt), icon: Calendar },
              { label: "Installment", value: String(payment.installmentNumber ?? 1), icon: ReceiptText },
            ].map(row => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-2 text-xs">
                  <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 w-24 flex-shrink-0">{row.label}</span>
                  <span className="font-semibold text-gray-800 flex-1">{row.value}</span>
                  {row.copy && <CopyButton text={row.copy} />}
                </div>
              );
            })}
            {payment.remarks && (
              <div className="flex items-start gap-2 text-xs pt-1">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-gray-500">Remarks</span>
                  <p className="font-semibold text-gray-800 mt-0.5">{payment.remarks}</p>
                </div>
              </div>
            )}
          </div>

          {/* Duplicate Warning Panel */}
          {payment.isDuplicate && dupPayment && (
            <div className="border-2 border-orange-200 bg-orange-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <p className="text-sm font-black text-orange-700">Duplicate Detected</p>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-orange-200 text-orange-700 rounded-full">
                  Score: {payment.duplicateScore ?? 70}/100
                </span>
              </div>
              <p className="text-xs text-orange-600">
                This payment matches another recent upload for the same student and amount within 7 days.
              </p>
              <div className="bg-white rounded-xl p-3 space-y-1.5 border border-orange-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Matching Payment</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-20">ID</span>
                  <span className="font-bold text-gray-700">#{dupPayment.id}</span>
                  <StatusBadge status={dupPayment.status} />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-20">Amount</span>
                  <span className="font-bold" style={{ color: NAVY }}>{fmt(dupPayment.amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-20">Reference</span>
                  <span className="font-semibold text-gray-700">{dupPayment.referenceNumber ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-20">Uploaded</span>
                  <span className="text-gray-600">{fmtDate(dupPayment.uploadedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-20">Mentor</span>
                  <span className="font-semibold text-gray-700">{dupPayment.mentorName ?? "—"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Payment Proof ({screenshots.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {screenshots.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="relative rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors group block aspect-video bg-gray-100">
                    <img src={url} alt={`Screenshot ${i + 1}`}
                      className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
          {screenshots.length === 0 && (
            <div className="border border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-400">
              No screenshots uploaded
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Timeline</p>
            <div className="space-y-2">
              {[
                { label: "Uploaded", time: payment.uploadedAt, color: NAVY },
                payment.status === "approved" && payment.approvedAt
                  ? { label: "Approved", time: payment.approvedAt, color: GREEN }
                  : null,
                payment.status === "rejected" && payment.approvedAt
                  ? { label: "Rejected", time: payment.approvedAt, color: RED }
                  : null,
              ].filter(Boolean).map((item, i) => item && (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="font-semibold text-gray-700">{item.label}</span>
                  <span className="text-gray-400 ml-auto">{fmtDate(item.time)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rejection reason (if rejected) */}
          {payment.status === "rejected" && payment.rejectionReason && (
            <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{payment.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Action Footer — only for pending */}
        {payment.status === "pending" && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-3">
            {error && (
              <div className="bg-red-50 rounded-xl p-2.5 flex items-center gap-2 text-red-700 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </div>
            )}
            {payment.isDuplicate && (
              <div className="bg-orange-50 rounded-xl p-2.5 flex items-center gap-1.5 text-orange-700 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                This payment is flagged as duplicate. Review carefully before approving.
              </div>
            )}

            {showRejectForm ? (
              <div className="space-y-2">
                <textarea
                  placeholder="Reason for rejection (required)…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 resize-none"
                  style={{ "--tw-ring-color": `${NAVY}40` } as React.CSSProperties}
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowRejectForm(false); setError(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={doReject} disabled={acting === "reject"}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    style={{ background: RED }}>
                    {acting === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Confirm Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setShowRejectForm(true); setError(""); }}
                  disabled={!!acting}
                  className="flex-1 py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button onClick={doApprove} disabled={!!acting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: GREEN }}>
                  {acting === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve & Generate Receipt
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main View ─────────────────────────────────────────────────────────────────
type FilterTab = "all" | "pending" | "approved" | "rejected" | "duplicate";

export function LongTermPaymentsView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [flash, setFlash] = useState<{ text: string; ok: boolean } | null>(null);

  const showFlash = (text: string, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 3500);
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/admin/long-term/manual-payments");
      if (!res.ok) throw new Error("Failed to load payments");
      const data = await res.json() as Payment[];
      setPayments(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await apiFetch("/admin/long-term/manual-payments/stats");
      if (res.ok) setStats(await res.json() as Stats);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
    void loadStats();
  }, [loadPayments, loadStats]);

  const handleApproved = (id: number, receiptNumber: string) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "approved", receiptNumber } : p));
    setStats(prev => prev ? {
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      totalApprovedCount: prev.totalApprovedCount + 1,
      approvedTodayCount: prev.approvedTodayCount + 1,
    } : prev);
    setSelected(p => p?.id === id ? { ...p, status: "approved", receiptNumber } : p);
    showFlash(`✅ Payment approved — Receipt ${receiptNumber}`);
  };

  const handleRejected = (id: number) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "rejected" } : p));
    setStats(prev => prev ? {
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      rejectedTodayCount: prev.rejectedTodayCount + 1,
    } : prev);
    setSelected(p => p?.id === id ? { ...p, status: "rejected" } : p);
    showFlash("Payment rejected", false);
  };

  // ── Filter logic ─────────────────────────────────────────────────────────────
  const filtered = payments.filter(p => {
    if (filterTab === "pending"   && p.status !== "pending")   return false;
    if (filterTab === "approved"  && p.status !== "approved")  return false;
    if (filterTab === "rejected"  && p.status !== "rejected")  return false;
    if (filterTab === "duplicate" && !p.isDuplicate)           return false;

    if (gradeFilter !== "all" && String(p.studentGrade) !== gradeFilter) return false;
    if (modeFilter  !== "all" && p.type !== modeFilter) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        p.studentName?.toLowerCase().includes(q) ||
        p.mentorName?.toLowerCase().includes(q) ||
        p.referenceNumber?.toLowerCase().includes(q) ||
        p.studentPhone?.includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  const pendingCount  = payments.filter(p => p.status === "pending").length;
  const duplicateCount = payments.filter(p => p.isDuplicate).length;

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all",       label: "All",        count: payments.length },
    { key: "pending",   label: "Pending",    count: pendingCount },
    { key: "approved",  label: "Approved" },
    { key: "rejected",  label: "Rejected" },
    { key: "duplicate", label: "⚠️ Duplicate", count: duplicateCount },
  ];

  return (
    <div className="space-y-5">
      {/* Flash */}
      {flash && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl shadow-xl text-sm font-bold text-white flex items-center gap-2 animate-in slide-in-from-top-2 ${flash.ok ? "bg-green-500" : "bg-red-500"}`}>
          {flash.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {flash.text}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <DetailDrawer
          payment={selected}
          allPayments={payments}
          onClose={() => setSelected(null)}
          onApproved={handleApproved}
          onRejected={handleRejected}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${NAVY}10` }}>
            <ReceiptText className="w-6 h-6" style={{ color: NAVY }} />
          </div>
          <div>
            <h2 className="text-lg font-black" style={{ color: NAVY }}>Long-Term Payment Uploads</h2>
            <p className="text-sm text-gray-400 mt-0.5">Review and approve UPI / bank / cash / cheque payments uploaded by mentors</p>
          </div>
        </div>
        <button onClick={() => { void loadPayments(); void loadStats(); }} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <StatsRow stats={stats} loading={statsLoading} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Status tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                filterTab === tab.key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filterTab === tab.key ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex gap-2 p-3 border-b border-gray-100 flex-wrap">
          <div className="flex-1 min-w-48 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              placeholder="Search student, mentor, reference…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 outline-none cursor-pointer">
            <option value="all">All Grades</option>
            {[1,2,3,4,5,6,7,8,9,10].map(g => (
              <option key={g} value={String(g)}>Grade {g}</option>
            ))}
          </select>

          <select value={modeFilter} onChange={e => setModeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 outline-none cursor-pointer">
            <option value="all">All Modes</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center p-10 gap-2 text-gray-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading payments…
          </div>
        ) : error ? (
          <div className="p-6 flex items-center gap-2 text-red-600 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" /> {error}
            <button onClick={() => { void loadPayments(); void loadStats(); }} className="ml-auto underline text-xs">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {search || filterTab !== "all" || gradeFilter !== "all" || modeFilter !== "all"
              ? "No payments match your filters."
              : "No payment uploads yet. Mentors will appear here as they upload payment proofs."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-bold text-gray-500">Mentor</th>
                  <th className="px-4 py-3 font-bold text-gray-500">Student</th>
                  <th className="px-4 py-3 font-bold text-gray-500">Grade</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-right">Amount</th>
                  <th className="px-4 py-3 font-bold text-gray-500">Mode</th>
                  <th className="px-4 py-3 font-bold text-gray-500">Reference #</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-center">Flags</th>
                  <th className="px-4 py-3 font-bold text-gray-500">Status</th>
                  <th className="px-4 py-3 font-bold text-gray-500">Uploaded</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}
                    className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer ${p.isDuplicate ? "bg-orange-50/30" : ""}`}
                    onClick={() => setSelected(p)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-700 truncate max-w-28">{p.mentorName ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold truncate max-w-28" style={{ color: NAVY }}>{p.studentName ?? "—"}</p>
                      {p.studentPhone && <p className="text-gray-400 text-[10px]">{p.studentPhone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.studentGrade ? `G${p.studentGrade}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-black" style={{ color: NAVY }}>
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {MODE_LABELS[p.type] ?? p.type}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-600 text-[10px]">{p.referenceNumber ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.isDuplicate
                        ? <DupBadge type={p.duplicateType} />
                        : <span className="text-gray-300 text-[10px]">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                      {p.receiptNumber && (
                        <p className="text-[9px] text-gray-400 mt-0.5 font-mono">{p.receiptNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {fmtDate(p.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelected(p)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-colors mx-auto">
                        <Eye className="w-3 h-3" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && !error && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400 font-semibold">
            Showing {filtered.length} of {payments.length} payments
          </div>
        )}
      </div>
    </div>
  );
}
