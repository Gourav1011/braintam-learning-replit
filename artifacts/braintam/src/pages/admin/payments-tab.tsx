import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard, RefreshCw, Search, ChevronDown, ChevronUp,
  Check, Ban, Flag, Copy, Eye, X, AlertTriangle, Clock,
  CheckCircle2, XCircle, ShieldCheck, Download, User,
  TrendingUp, Calendar, GraduationCap, Loader2,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#10B981";
const RED    = "#EF4444";
const AMBER  = "#F59E0B";
const PURPLE = "#8B5CF6";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", timeZone: "Asia/Kolkata",
  });
}

const AVATAR_COLORS = ["#EF4444","#3B82F6","#8B5CF6","#10B981","#F59E0B","#EC4899","#06B6D4","#F97316"];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = name.charCodeAt(0) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Payment {
  id: number;
  masteryStudentId: number | null;
  studentName: string | null;
  studentGrade: number | null;
  submittedById: number | null;
  submittedByName: string | null;
  amount: number;
  paymentMethod: string;
  utrNumber: string | null;
  razorpayPaymentId: string | null;
  screenshotsJson: string | null;
  status: string;
  isDuplicate: boolean;
  razorpayVerified: boolean | null;
  verificationNotes: string | null;
  uploadedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  approvedByName: string | null;
  refundedAt: string | null;
}
interface MentorStat {
  id: number; name: string;
  total: number; today: number; yesterday: number; week: number; month: number;
}
interface Stats {
  pendingVerification: number; approvedToday: number; rejectedToday: number;
  duplicateSuspected: number; verificationFailed: number; totalThisMonth: number;
}
interface IgniteStudent {
  enrollmentId: number; studentId: number;
  name: string | null; email: string | null; phone: string | null;
  grade: number | null; leadStage: string | null;
  assignedMentorName: string | null; enrolledAt: string; batchTitle: string;
}

// ── Status config ─────────────────────────────────────────────────────────────
function statusCfg(status: string) {
  switch (status) {
    case "pending_verification":  return { label: "Pending",     color: AMBER,  bg: "#FEF3C7", icon: Clock };
    case "approved":              return { label: "Approved",    color: GREEN,  bg: "#D1FAE5", icon: CheckCircle2 };
    case "rejected":              return { label: "Rejected",    color: RED,    bg: "#FEE2E2", icon: XCircle };
    case "duplicate_suspected":   return { label: "Duplicate",   color: PURPLE, bg: "#EDE9FE", icon: Flag };
    case "verification_failed":   return { label: "Failed",      color: RED,    bg: "#FEE2E2", icon: AlertTriangle };
    default:                      return { label: status,        color: AMBER,  bg: "#FEF3C7", icon: Clock };
  }
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, bg, active, onClick }:
  { label: string; value: number; icon: React.ElementType; color: string; bg: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-xl p-3 text-left transition-all border-2 w-full"
      style={{ background: active ? color : "white", borderColor: active ? color : "#E5E7EB" }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5"
        style={{ background: active ? "rgba(255,255,255,0.25)" : bg }}>
        <Icon className="w-3.5 h-3.5" style={{ color: active ? "white" : color }} />
      </div>
      <p className={`text-xl font-black leading-none ${active ? "text-white" : ""}`}
        style={active ? {} : { color: NAVY }}>{value}</p>
      <p className={`text-[10px] font-medium mt-1 leading-tight ${active ? "text-white/80" : "text-gray-500"}`}>{label}</p>
    </button>
  );
}

// ── Mentor Stats Card ─────────────────────────────────────────────────────────
function MentorStatsCard({ mentor, onClear }: { mentor: MentorStat; onClear: () => void }) {
  const stats = [
    { label: "Today",     value: mentor.today },
    { label: "Yesterday", value: mentor.yesterday },
    { label: "This Week", value: mentor.week },
    { label: "This Month",value: mentor.month },
    { label: "All Time",  value: mentor.total },
  ];
  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 px-4 py-3 flex flex-wrap items-center gap-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ background: avatarColor(mentor.name) }}>{mentor.name[0].toUpperCase()}</div>
        <div>
          <p className="text-sm font-black" style={{ color: NAVY }}>{mentor.name}</p>
          <p className="text-[10px] text-gray-400">Payment uploads by this mentor</p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-1 flex-wrap ml-2">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-black leading-none" style={{ color: NAVY }}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Mastery detail panel ──────────────────────────────────────────────────────
function DetailPanel({ payment, onClose, onRefresh }: {
  payment: Payment; onClose: () => void; onRefresh: () => void;
}) {
  const cfg = statusCfg(payment.status);
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [verifyResult, setVerifyResult] = useState<null | { found: boolean; status?: string; amount?: number; method?: string }>(null);

  async function doAction(path: string, body?: object) {
    setLoading(true);
    try {
      await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      onRefresh(); onClose();
    } finally { setLoading(false); }
  }
  async function doVerify() {
    setLoading(true);
    try {
      const r = await apiFetch(`/admin/mastery/payments/${payment.id}/verify-razorpay`, { method: "POST" });
      if (r.ok) setVerifyResult(await r.json());
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full sm:w-[420px] h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
              style={{ background: cfg.bg, color: cfg.color }}>
              <cfg.icon className="w-3 h-3" />{cfg.label}
            </span>
            <span className="text-xs text-gray-400">#{payment.id}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Student */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Student</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: avatarColor(payment.studentName ?? "?") }}>
                {(payment.studentName ?? "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: NAVY }}>{payment.studentName || "Unknown"}</p>
                <p className="text-xs text-gray-400">{payment.studentGrade ? `Grade ${payment.studentGrade}` : "—"}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Uploaded by <span className="font-semibold">{payment.submittedByName || "—"}</span> · {fmtShort(payment.uploadedAt)}</p>
          </div>

          {/* Payment details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400">Amount</p>
              <p className="text-lg font-black" style={{ color: NAVY }}>{fmt(payment.amount)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400">Method</p>
              <p className="text-sm font-semibold text-gray-700 capitalize">{payment.paymentMethod}</p>
            </div>
          </div>

          {/* IDs */}
          {[
            { label: "UTR Number", value: payment.utrNumber },
            { label: "Razorpay Payment ID", value: payment.razorpayPaymentId },
          ].map(({ label, value }) => value && (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-1">{label}</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-800 flex-1 break-all">{value}</code>
                <button onClick={() => navigator.clipboard.writeText(value)}
                  className="shrink-0 text-gray-400 hover:text-gray-700"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}

          {/* Razorpay verify */}
          {(payment.paymentMethod === "razorpay" || payment.razorpayPaymentId) && (
            <div>
              <button onClick={doVerify} disabled={loading}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 w-full justify-center">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                Verify via Razorpay API
              </button>
              {verifyResult && (
                <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${verifyResult.found ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                  {verifyResult.found
                    ? `✓ Found on Razorpay — ${verifyResult.status} · ${verifyResult.method} · ₹${(verifyResult.amount ?? 0) / 100}`
                    : "✗ Not found on Razorpay"}
                </div>
              )}
            </div>
          )}

          {/* Rejection reason */}
          {payment.rejectionReason && (
            <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700">
              <strong>Rejection reason:</strong> {payment.rejectionReason}
            </div>
          )}

          {/* Actions */}
          {!["approved", "refunded"].includes(payment.status) && (
            <div className="space-y-2 pt-1">
              {!rejectOpen ? (
                <div className="flex gap-2">
                  <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/approve`)} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold" style={{ background: GREEN }}>
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                  </button>
                  <button onClick={() => setRejectOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold" style={{ background: RED }}>
                    <Ban className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/flag-duplicate`)} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold" style={{ background: PURPLE }}>
                    <Flag className="w-3.5 h-3.5" /> Flag Dup
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Rejection reason (required)…"
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-red-400" rows={3} />
                  <div className="flex gap-2">
                    <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/reject`, { reason })}
                      disabled={!reason.trim() || loading}
                      className="flex-1 py-2 rounded-xl text-white text-xs font-semibold disabled:opacity-50" style={{ background: RED }}>
                      Confirm Reject
                    </button>
                    <button onClick={() => setRejectOpen(false)} className="flex-1 py-2 rounded-xl text-xs border border-gray-200 text-gray-600">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {payment.status === "approved" && !payment.refundedAt && (
            <button onClick={() => doAction(`/admin/mastery/payments/${payment.id}/refund`)} disabled={loading}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Mark Refunded
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Date range helpers ────────────────────────────────────────────────────────
const DATE_CHIPS = ["Today", "Yesterday", "This Week", "This Month", "All Time"] as const;
type DateChip = typeof DATE_CHIPS[number];

function getDateRange(chip: DateChip): { from: string | null; to: string | null } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt2 = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(today); monthStart.setDate(monthStart.getDate() - 29);
  switch (chip) {
    case "Today":      return { from: fmt2(today),      to: fmt2(today) };
    case "Yesterday":  return { from: fmt2(yesterday),  to: fmt2(yesterday) };
    case "This Week":  return { from: fmt2(weekStart),  to: fmt2(today) };
    case "This Month": return { from: fmt2(monthStart), to: fmt2(today) };
    default:           return { from: null,             to: null };
  }
}

// ── Mastery sub-tab ───────────────────────────────────────────────────────────
function MasteryView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats]       = useState<Stats>({ pendingVerification: 0, approvedToday: 0, rejectedToday: 0, duplicateSuspected: 0, verificationFailed: 0, totalThisMonth: 0 });
  const [mentors, setMentors]   = useState<MentorStat[]>([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [gradeFilter, setGradeFilter]   = useState("all");
  const [mentorFilter, setMentorFilter] = useState<number | null>(null);
  const [dateChip, setDateChip]         = useState<DateChip | "Custom">("All Time");
  const [customFrom, setCustomFrom]     = useState("");
  const [customTo, setCustomTo]         = useState("");
  const [search, setSearch]             = useState("");
  const [sortDir, setSortDir]           = useState<"asc" | "desc">("desc");
  const [selected, setSelected]         = useState<Payment | null>(null);

  const selectedMentor = mentors.find(m => m.id === mentorFilter) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/admin/mastery/payments");
    if (r.ok) {
      const d = await r.json() as { payments: Payment[]; stats: Stats; mentors: MentorStat[] };
      setPayments(d.payments ?? []);
      setStats(d.stats);
      setMentors(d.mentors ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    if (gradeFilter !== "all")  list = list.filter(p => String(p.studentGrade) === gradeFilter);
    if (mentorFilter !== null)  list = list.filter(p => p.submittedById === mentorFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.studentName?.toLowerCase().includes(q) ||
        p.submittedByName?.toLowerCase().includes(q) ||
        p.utrNumber?.toLowerCase().includes(q) ||
        p.razorpayPaymentId?.toLowerCase().includes(q)
      );
    }
    // Date filter
    const { from, to } = dateChip === "Custom"
      ? { from: customFrom || null, to: customTo || null }
      : getDateRange(dateChip as DateChip);
    if (from) list = list.filter(p => new Date(p.uploadedAt) >= new Date(from + "T00:00:00+05:30"));
    if (to)   list = list.filter(p => new Date(p.uploadedAt) <= new Date(to   + "T23:59:59+05:30"));
    list.sort((a, b) => {
      const d = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      return sortDir === "desc" ? d : -d;
    });
    return list;
  }, [payments, statusFilter, gradeFilter, mentorFilter, search, dateChip, customFrom, customTo, sortDir]);

  const totalFiltered = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Pending",       value: stats.pendingVerification, icon: Clock,         color: AMBER,  bg: "#FEF3C7", filter: "pending_verification" },
          { label: "Approved Today",value: stats.approvedToday,       icon: CheckCircle2,  color: GREEN,  bg: "#D1FAE5", filter: "approved" },
          { label: "Rejected Today",value: stats.rejectedToday,       icon: XCircle,       color: RED,    bg: "#FEE2E2", filter: "rejected" },
          { label: "Duplicate",     value: stats.duplicateSuspected,  icon: Flag,          color: PURPLE, bg: "#EDE9FE", filter: "duplicate_suspected" },
          { label: "Failed Verify", value: stats.verificationFailed,  icon: AlertTriangle, color: RED,    bg: "#FEE2E2", filter: "verification_failed" },
          { label: "This Month",    value: stats.totalThisMonth,      icon: TrendingUp,    color: NAVY,   bg: "#EEF2FF", filter: "" },
        ].map(card => (
          <KpiCard key={card.label} label={card.label} value={card.value}
            icon={card.icon} color={card.color} bg={card.bg}
            active={card.filter ? statusFilter === card.filter : false}
            onClick={() => card.filter ? setStatusFilter(p => p === card.filter ? "all" : card.filter) : undefined}
          />
        ))}
      </div>

      {/* Mentor stats card */}
      {selectedMentor && <MentorStatsCard mentor={selectedMentor} onClear={() => setMentorFilter(null)} />}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student, mentor, UTR, Razorpay ID…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300" />
          </div>
          {/* Grade */}
          <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300 bg-white">
            <option value="all">All Grades</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
          {/* Mentor */}
          <select value={mentorFilter ?? "all"} onChange={e => setMentorFilter(e.target.value === "all" ? null : parseInt(e.target.value, 10))}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300 bg-white max-w-40">
            <option value="all">All Mentors</option>
            {mentors.map(m => <option key={m.id} value={m.id}>{m.name} ({m.total})</option>)}
          </select>
          {/* Refresh */}
          <button onClick={() => void load()} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Date chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-gray-400 font-semibold mr-1">DATE:</span>
          {([...DATE_CHIPS, "Custom"] as const).map(chip => (
            <button key={chip} onClick={() => setDateChip(chip as typeof dateChip)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border"
              style={dateChip === chip
                ? { background: NAVY, color: "white", borderColor: NAVY }
                : { background: "white", color: "#6B7280", borderColor: "#E5E7EB" }}>
              {chip}
            </button>
          ))}
          {dateChip === "Custom" && (
            <div className="flex items-center gap-1 ml-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" />
              <span className="text-xs text-gray-400">–</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      {/* Results summary */}
      {!loading && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span><strong className="text-gray-800">{filtered.length}</strong> payment{filtered.length !== 1 ? "s" : ""} · Total: <strong style={{ color: NAVY }}>{fmt(totalFiltered)}</strong></span>
          <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            className="flex items-center gap-1 hover:text-gray-800 transition-colors">
            Date {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Student</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Grade</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Uploaded By</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">UTR Number</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Razorpay ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Status</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-gray-400">No payments found</td></tr>
            ) : filtered.map(p => {
              const cfg = statusCfg(p.status);
              return (
                <tr key={p.id} onClick={() => setSelected(p)}
                  className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: avatarColor(p.studentName ?? "?") }}>
                        {(p.studentName ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800">{p.studentName || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.studentGrade ? `Grade ${p.studentGrade}` : "—"}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{p.submittedByName || "—"}</td>
                  <td className="px-4 py-3 text-right font-black" style={{ color: NAVY }}>{fmt(p.amount)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {p.utrNumber ? (
                      <span className="group flex items-center gap-1">
                        <code className="font-mono text-gray-700">{p.utrNumber.length > 14 ? p.utrNumber.slice(0,14)+"…" : p.utrNumber}</code>
                        <button onClick={() => navigator.clipboard.writeText(p.utrNumber!)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"><Copy className="w-3 h-3" /></button>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {p.razorpayPaymentId ? (
                      <span className="group flex items-center gap-1">
                        <code className="font-mono text-gray-700">{p.razorpayPaymentId.length > 14 ? p.razorpayPaymentId.slice(0,14)+"…" : p.razorpayPaymentId}</code>
                        <button onClick={() => navigator.clipboard.writeText(p.razorpayPaymentId!)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 transition-opacity"><Copy className="w-3 h-3" /></button>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtShort(p.uploadedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      <cfg.icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {!["approved","refunded"].includes(p.status) && (
                        <>
                          <button onClick={async () => { await apiFetch(`/admin/mastery/payments/${p.id}/approve`,{method:"POST"}); void load(); }}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setSelected(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reject"><Ban className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => { await apiFetch(`/admin/mastery/payments/${p.id}/flag-duplicate`,{method:"POST"}); void load(); }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600" title="Flag Duplicate"><Flag className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      <button onClick={() => setSelected(p)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="View"><Eye className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <DetailPanel payment={selected} onClose={() => setSelected(null)} onRefresh={() => { void load(); setSelected(null); }} />
      )}
    </div>
  );
}

// ── Ignite sub-tab ────────────────────────────────────────────────────────────
function IgniteView() {
  const [students, setStudents] = useState<IgniteStudent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [gradeFilter, setGradeFilter]   = useState("all");
  const [mentorFilter, setMentorFilter] = useState("all");
  const [stageFilter, setStageFilter]   = useState("all");
  const [dateChip, setDateChip]         = useState<DateChip | "Custom" | "All Time">("All Time");
  const [customFrom, setCustomFrom]     = useState("");
  const [customTo, setCustomTo]         = useState("");
  const [search, setSearch]             = useState("");
  const [page, setPage]                 = useState(1);
  const PER = 20;

  useEffect(() => {
    apiFetch("/admin/ignite/demo-students")
      .then(r => r.json())
      .then(setStudents)
      .finally(() => setLoading(false));
  }, []);

  // Payment-relevant stages only
  const paymentStudents = students.filter(s =>
    ["Interested", "Payment Sent", "Converted"].includes(s.leadStage ?? "")
  );

  const mentorNames = useMemo(() =>
    [...new Set(paymentStudents.map(s => s.assignedMentorName).filter(Boolean))].sort() as string[], [paymentStudents]);

  const filtered = useMemo(() => {
    let list = [...paymentStudents];
    if (stageFilter !== "all")  list = list.filter(s => s.leadStage === stageFilter);
    if (gradeFilter !== "all")  list = list.filter(s => String(s.grade) === gradeFilter);
    if (mentorFilter !== "all") list = list.filter(s => s.assignedMentorName === mentorFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q));
    }
    const { from, to } = dateChip === "Custom"
      ? { from: customFrom || null, to: customTo || null }
      : (dateChip as string) === "All Time" ? { from: null, to: null }
      : getDateRange(dateChip as DateChip);
    if (from) list = list.filter(s => new Date(s.enrolledAt) >= new Date(from + "T00:00:00+05:30"));
    if (to)   list = list.filter(s => new Date(s.enrolledAt) <= new Date(to   + "T23:59:59+05:30"));
    return list;
  }, [paymentStudents, stageFilter, gradeFilter, mentorFilter, search, dateChip, customFrom, customTo]);

  const paged = filtered.slice((page - 1) * PER, page * PER);
  const totalPages = Math.ceil(filtered.length / PER);
  const cnt = (stage: string) => paymentStudents.filter(s => s.leadStage === stage).length;

  const stageColor: Record<string, string> = {
    "Interested":    "#F59E0B",
    "Payment Sent":  "#3B82F6",
    "Converted":     "#10B981",
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total Pipeline",  value: paymentStudents.length, color: NAVY,   bg: "#EEF2FF", icon: CreditCard },
          { label: "Interested",      value: cnt("Interested"),       color: AMBER,  bg: "#FEF3C7", icon: User },
          { label: "Payment Sent",    value: cnt("Payment Sent"),     color: "#3B82F6", bg: "#EFF6FF", icon: TrendingUp },
          { label: "Converted",       value: cnt("Converted"),        color: GREEN,  bg: "#D1FAE5", icon: CheckCircle2 },
        ].map(c => <KpiCard key={c.label} {...c} />)}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name or phone…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none" />
          </div>
          <select value={stageFilter} onChange={e => { setStageFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            <option value="all">All Stages</option>
            <option>Interested</option>
            <option>Payment Sent</option>
            <option>Converted</option>
          </select>
          <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
            <option value="all">All Grades</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select value={mentorFilter} onChange={e => { setMentorFilter(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none max-w-40">
            <option value="all">All Mentors</option>
            {mentorNames.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-gray-400 font-semibold mr-1">DATE:</span>
          {(["All Time", ...DATE_CHIPS, "Custom"] as const).map(chip => (
            <button key={chip} onClick={() => { setDateChip(chip as typeof dateChip); setPage(1); }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border"
              style={dateChip === chip
                ? { background: ORANGE, color: "white", borderColor: ORANGE }
                : { background: "white", color: "#6B7280", borderColor: "#E5E7EB" }}>
              {chip}
            </button>
          ))}
          {dateChip === "Custom" && (
            <div className="flex items-center gap-1 ml-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" />
              <span className="text-xs text-gray-400">–</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span><strong className="text-gray-800">{filtered.length}</strong> students in payment pipeline</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-40">‹</button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="px-2 py-1 rounded-lg border border-gray-200 disabled:opacity-40">›</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Student</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Grade</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Mentor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Batch</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Lead Stage</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No students in payment pipeline</td></tr>
            ) : paged.map(s => (
              <tr key={s.enrollmentId} className="border-b border-gray-50 hover:bg-orange-50/20">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: avatarColor(s.name ?? "?") }}>
                      {(s.name ?? "?")[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800">{s.name || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{s.phone || "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{s.grade ? `Grade ${s.grade}` : "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{s.assignedMentorName || "—"}</td>
                <td className="px-4 py-2.5 text-gray-500">{s.batchTitle}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: (stageColor[s.leadStage ?? ""] ?? "#E5E7EB") + "33", color: stageColor[s.leadStage ?? ""] ?? "#6B7280" }}>
                    {s.leadStage}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-400">{fmtShort(s.enrolledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PaymentsTab() {
  const [subTab, setSubTab] = useState<"ignite" | "mastery">("mastery");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Payments</h2>
          <p className="text-xs text-gray-400 mt-0.5">Unified view — Ignite pipeline and Mastery verifications</p>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { id: "mastery", label: "📚 Mastery Payments" },
          { id: "ignite",  label: "🚀 Ignite Pipeline" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={subTab === t.id
              ? { background: "white", color: NAVY, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }
              : { color: "#6B7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "mastery" ? <MasteryView /> : <IgniteView />}
    </div>
  );
}
