import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Search, Check, Ban, Flag, Copy, Eye, X,
  AlertTriangle, Clock, CheckCircle2, XCircle, Loader2,
  ShieldCheck, ChevronDown, ChevronUp, GraduationCap,
  TrendingUp, Users, IndianRupee, CalendarDays,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

// ── Constants ─────────────────────────────────────────────────────────────────
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#10B981";
const RED = "#EF4444";
const AMBER = "#F59E0B";
const PURPLE = "#8B5CF6";
const BLUE = "#3B82F6";

// ── Helpers ───────────────────────────────────────────────────────────────────
function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
}
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const fmtK = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : fmt(n);
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Kolkata" });
const AVATAR_COLORS = ["#EF4444","#3B82F6","#8B5CF6","#10B981","#F59E0B","#EC4899","#06B6D4","#F97316"];
const avatarColor = (name: string) => { let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h); return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; };

// ── Types ─────────────────────────────────────────────────────────────────────
interface Payment {
  id: number; masteryStudentId: number | null; studentName: string | null; studentGrade: number | null;
  submittedById: number | null; submittedByName: string | null; amount: number; paymentMethod: string;
  utrNumber: string | null; razorpayPaymentId: string | null; status: string; isDuplicate: boolean;
  razorpayVerified: boolean | null; uploadedAt: string; approvedAt: string | null;
  rejectedAt: string | null; rejectionReason: string | null; approvedByName: string | null; refundedAt: string | null;
}
interface MentorStat { id: number; name: string; total: number; today: number; yesterday: number; week: number; month: number; }
interface CollStats { pendingVerification: number; approvedToday: number; rejectedToday: number; duplicateSuspected: number; verificationFailed: number; totalThisMonth: number; }
interface RevSummary {
  totalStudents: number; totalRevenue: number; totalPending: number;
  today: { students: number; revenue: number }; yesterday: { students: number; revenue: number };
  week: { students: number; revenue: number }; month: { students: number; revenue: number }; year: { students: number; revenue: number };
}
interface GradeRow   { grade: number; students: number; revenue: number; pending: number; }
interface MentorRow  { mentorId: number | null; mentorName: string; students: number; revenue: number; pending: number; }
interface MasteryStudent {
  id: number; studentName: string; grade: number; amountPaid: number; amountPending: number;
  paymentStatus: string; mentorName: string | null; academicYear: string | null;
  admissionDate: string; masteryStatus: string;
}

// ── Status config ─────────────────────────────────────────────────────────────
const SC: Record<string, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  pending_verification: { label: "Pending",   color: AMBER,  bg: "#FEF3C7", Icon: Clock },
  approved:             { label: "Approved",  color: GREEN,  bg: "#D1FAE5", Icon: CheckCircle2 },
  rejected:             { label: "Rejected",  color: RED,    bg: "#FEE2E2", Icon: XCircle },
  duplicate_suspected:  { label: "Duplicate", color: PURPLE, bg: "#EDE9FE", Icon: Flag },
  verification_failed:  { label: "Failed",    color: RED,    bg: "#FEE2E2", Icon: AlertTriangle },
};
const sc = (s: string) => SC[s] ?? { label: s, color: AMBER, bg: "#FEF3C7", Icon: Clock };

// ── Compact stat pill ─────────────────────────────────────────────────────────
function Pill({ label, value, color, active, onClick }: { label: string; value: number; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap"
      style={active ? { background: color, color: "white", borderColor: color } : { background: "white", color, borderColor: color + "55" }}>
      <span className="font-black">{value}</span> <span className={active ? "text-white/80" : "text-gray-500"}>{label}</span>
    </button>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({ name }: { name: string }) {
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
      style={{ background: avatarColor(name) }}>{name[0].toUpperCase()}</div>
  );
}

// ── Date chip helpers ─────────────────────────────────────────────────────────
type Period = "Today" | "Yesterday" | "Week" | "Month" | "Year" | "Custom";
const PERIODS: Period[] = ["Today", "Yesterday", "Week", "Month", "Year", "Custom"];

function periodToRange(p: Period, from: string, to: string): { dateFrom: string | null; dateTo: string | null } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt2 = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const y = new Date(t); y.setDate(y.getDate() - 1);
  const w = new Date(t); w.setDate(w.getDate() - 6);
  const m = new Date(t); m.setDate(m.getDate() - 29);
  const yr = new Date(t); yr.setFullYear(yr.getFullYear() - 1);
  if (p === "Today")     return { dateFrom: fmt2(t),  dateTo: fmt2(t) };
  if (p === "Yesterday") return { dateFrom: fmt2(y),  dateTo: fmt2(y) };
  if (p === "Week")      return { dateFrom: fmt2(w),  dateTo: fmt2(t) };
  if (p === "Month")     return { dateFrom: fmt2(m),  dateTo: fmt2(t) };
  if (p === "Year")      return { dateFrom: fmt2(yr), dateTo: fmt2(t) };
  return { dateFrom: from || null, dateTo: to || null };
}

// ── Detail Panel (Collection) ─────────────────────────────────────────────────
function DetailPanel({ p, onClose, onRefresh }: { p: Payment; onClose: () => void; onRefresh: () => void }) {
  const { label, color, bg, Icon } = sc(p.status);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [vResult, setVResult] = useState<{ found: boolean; status?: string; amount?: number } | null>(null);

  const act = async (path: string, body?: object) => {
    setBusy(true);
    try { await apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }); onRefresh(); onClose(); }
    finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try { const r = await apiFetch(`/admin/mastery/payments/${p.id}/verify-razorpay`, { method: "POST" }); if (r.ok) setVResult(await r.json()); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full sm:w-96 h-full sm:h-auto sm:max-h-[88vh] rounded-none sm:rounded-2xl shadow-2xl overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color }}><Icon className="w-3 h-3"/>{label}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-4 space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <Av name={p.studentName ?? "?"} />
            <div><p className="text-sm font-black" style={{ color: NAVY }}>{p.studentName || "Unknown"}</p>
              <p className="text-[11px] text-gray-400">{p.studentGrade ? `Grade ${p.studentGrade}` : "—"} · by {p.submittedByName || "—"} · {fmtShort(p.uploadedAt)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400">Amount</p><p className="font-black text-base" style={{ color: NAVY }}>{fmt(p.amount)}</p></div>
            <div className="bg-gray-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-400">Method</p><p className="font-semibold capitalize">{p.paymentMethod}</p></div>
          </div>
          {p.utrNumber && (
            <div className="bg-gray-50 rounded-lg p-2.5 text-xs">
              <p className="text-[10px] text-gray-400 mb-0.5">UTR Number</p>
              <div className="flex items-center gap-1.5"><code className="flex-1 font-mono text-gray-800 break-all">{p.utrNumber}</code>
                <button onClick={() => navigator.clipboard.writeText(p.utrNumber!)} className="text-gray-400 hover:text-gray-700"><Copy className="w-3 h-3"/></button></div>
            </div>
          )}
          {p.razorpayPaymentId && (
            <div className="bg-gray-50 rounded-lg p-2.5 text-xs">
              <p className="text-[10px] text-gray-400 mb-0.5">Razorpay ID</p>
              <div className="flex items-center gap-1.5"><code className="flex-1 font-mono text-gray-800 break-all">{p.razorpayPaymentId}</code>
                <button onClick={() => navigator.clipboard.writeText(p.razorpayPaymentId!)} className="text-gray-400 hover:text-gray-700"><Copy className="w-3 h-3"/></button></div>
            </div>
          )}
          {(p.paymentMethod === "razorpay" || p.razorpayPaymentId) && (
            <div>
              <button onClick={verify} disabled={busy} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 w-full justify-center">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ShieldCheck className="w-3.5 h-3.5"/>} Verify via Razorpay
              </button>
              {vResult && <div className={`mt-1.5 rounded-lg px-3 py-2 text-xs font-medium ${vResult.found ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                {vResult.found ? `✓ Found — ${vResult.status} · ₹${(vResult.amount ?? 0) / 100}` : "✗ Not found on Razorpay"}
              </div>}
            </div>
          )}
          {p.rejectionReason && <div className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700"><strong>Rejected:</strong> {p.rejectionReason}</div>}
          {!["approved","refunded"].includes(p.status) && !rejectOpen && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => act(`/admin/mastery/payments/${p.id}/approve`)} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-white text-xs font-semibold" style={{ background: GREEN }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>} Approve
              </button>
              <button onClick={() => setRejectOpen(true)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-white text-xs font-semibold" style={{ background: RED }}>
                <Ban className="w-3.5 h-3.5"/> Reject
              </button>
              <button onClick={() => act(`/admin/mastery/payments/${p.id}/flag-duplicate`)} disabled={busy}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-white text-xs font-semibold" style={{ background: PURPLE }}>
                <Flag className="w-3.5 h-3.5"/> Flag
              </button>
            </div>
          )}
          {rejectOpen && (
            <div className="space-y-2">
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Rejection reason…" rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-red-400"/>
              <div className="flex gap-2">
                <button onClick={() => act(`/admin/mastery/payments/${p.id}/reject`, { reason })} disabled={!reason.trim() || busy}
                  className="flex-1 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50" style={{ background: RED }}>Confirm</button>
                <button onClick={() => setRejectOpen(false)} className="flex-1 py-2 rounded-lg text-xs border border-gray-200 text-gray-600">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// COLLECTION sub-tab (upload/approve workflow)
// ──────────────────────────────────────────────────────────────────────────────
function CollectionView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats]       = useState<CollStats>({ pendingVerification:0,approvedToday:0,rejectedToday:0,duplicateSuspected:0,verificationFailed:0,totalThisMonth:0 });
  const [mentors, setMentors]   = useState<MentorStat[]>([]);
  const [loading, setLoading]   = useState(true);
  const [statusF, setStatusF]   = useState("all");
  const [gradeF, setGradeF]     = useState("all");
  const [mentorF, setMentorF]   = useState<number | null>(null);
  const [period, setPeriod]     = useState<Period | "All">("All");
  const [customFrom, setCFrom]  = useState("");
  const [customTo, setCTo]      = useState("");
  const [search, setSearch]     = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch("/admin/mastery/payments");
    if (r.ok) { const d = await r.json(); setPayments(d.payments ?? []); setStats(d.stats); setMentors(d.mentors ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selMentor = mentors.find(m => m.id === mentorF) ?? null;

  const filtered = useMemo(() => {
    let list = [...payments];
    if (statusF !== "all") list = list.filter(p => p.status === statusF);
    if (gradeF !== "all")  list = list.filter(p => String(p.studentGrade) === gradeF);
    if (mentorF !== null)  list = list.filter(p => p.submittedById === mentorF);
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.studentName?.toLowerCase().includes(q) || p.submittedByName?.toLowerCase().includes(q) || p.utrNumber?.toLowerCase().includes(q) || p.razorpayPaymentId?.toLowerCase().includes(q)); }
    if (period !== "All") {
      const { dateFrom, dateTo } = periodToRange(period as Period, customFrom, customTo);
      if (dateFrom) list = list.filter(p => new Date(p.uploadedAt) >= new Date(dateFrom + "T00:00:00+05:30"));
      if (dateTo)   list = list.filter(p => new Date(p.uploadedAt) <= new Date(dateTo   + "T23:59:59+05:30"));
    }
    list.sort((a, b) => { const d = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(); return sortDesc ? d : -d; });
    return list;
  }, [payments, statusF, gradeF, mentorF, search, period, customFrom, customTo, sortDesc]);

  const totalAmt = filtered.reduce((s, p) => s + p.amount, 0);

  const quickApprove = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/admin/mastery/payments/${id}/approve`, { method: "POST" });
    void load();
  };

  return (
    <div className="space-y-3">
      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Pending",       value: stats.pendingVerification, color: AMBER,  filter: "pending_verification" },
          { label: "Approved Today",value: stats.approvedToday,       color: GREEN,  filter: "approved" },
          { label: "Rejected",      value: stats.rejectedToday,       color: RED,    filter: "rejected" },
          { label: "Duplicate",     value: stats.duplicateSuspected,  color: PURPLE, filter: "duplicate_suspected" },
          { label: "Failed",        value: stats.verificationFailed,  color: RED,    filter: "verification_failed" },
          { label: "This Month",    value: stats.totalThisMonth,      color: NAVY,   filter: "" },
        ].map(x => (
          <Pill key={x.label} label={x.label} value={x.value} color={x.color}
            active={!!x.filter && statusF === x.filter}
            onClick={x.filter ? () => setStatusF(s => s === x.filter ? "all" : x.filter) : undefined} />
        ))}
        <button onClick={() => void load()} className="ml-auto p-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}/>
        </button>
      </div>

      {/* Mentor stats strip */}
      {selMentor && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Av name={selMentor.name}/>
            <span className="font-black" style={{ color: NAVY }}>{selMentor.name}</span>
          </div>
          {[["Today", selMentor.today],["Yest", selMentor.yesterday],["Week", selMentor.week],["Month", selMentor.month],["Total", selMentor.total]].map(([l,v]) => (
            <div key={l} className="text-center"><p className="font-black text-sm" style={{ color: NAVY }}>{v}</p><p className="text-[10px] text-gray-400">{l}</p></div>
          ))}
          <button onClick={() => setMentorF(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, mentor, UTR…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-300"/>
          </div>
          <select value={gradeF} onChange={e => setGradeF(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none">
            <option value="all">All Grades</option>
            {Array.from({length:10},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}
          </select>
          <select value={mentorF ?? "all"} onChange={e => setMentorF(e.target.value === "all" ? null : parseInt(e.target.value,10))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none max-w-36">
            <option value="all">All Mentors</option>
            {mentors.map(m=><option key={m.id} value={m.id}>{m.name} ({m.total})</option>)}
          </select>
        </div>
        {/* Period chips */}
        <div className="flex flex-wrap gap-1 items-center">
          {(["All", ...PERIODS] as const).map(chip => (
            <button key={chip} onClick={() => setPeriod(chip as typeof period)}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={period === chip ? { background: NAVY, color:"white", borderColor: NAVY } : { background:"white", color:"#6B7280", borderColor:"#E5E7EB" }}>
              {chip}
            </button>
          ))}
          {period === "Custom" && (
            <div className="flex items-center gap-1">
              <input type="date" value={customFrom} onChange={e=>setCFrom(e.target.value)} className="text-[11px] border border-gray-200 rounded px-2 py-0.5"/>
              <span className="text-xs text-gray-400">–</span>
              <input type="date" value={customTo} onChange={e=>setCTo(e.target.value)} className="text-[11px] border border-gray-200 rounded px-2 py-0.5"/>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5">
          <span><strong className="text-gray-800">{filtered.length}</strong> records · <strong style={{color:NAVY}}>{fmtK(totalAmt)}</strong></span>
          <button onClick={()=>setSortDesc(d=>!d)} className="flex items-center gap-1 hover:text-gray-800">
            Date {sortDesc ? <ChevronDown className="w-3 h-3"/> : <ChevronUp className="w-3 h-3"/>}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-xs min-w-[780px]">
          <thead><tr className="border-b border-gray-100 bg-gray-50/60 text-gray-400 font-semibold">
            <th className="text-left px-3 py-2.5">Student</th>
            <th className="text-left px-3 py-2.5">Grade</th>
            <th className="text-left px-3 py-2.5">By</th>
            <th className="text-right px-3 py-2.5">Amount</th>
            <th className="text-left px-3 py-2.5">UTR / Razorpay</th>
            <th className="text-left px-3 py-2.5">Date</th>
            <th className="text-left px-3 py-2.5">Status</th>
            <th className="text-center px-3 py-2.5">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-xs">No payments found</td></tr>
            ) : filtered.map(p => {
              const { label, color, bg, Icon } = sc(p.status);
              return (
                <tr key={p.id} onClick={() => setSelected(p)} className="border-b border-gray-50 hover:bg-blue-50/20 cursor-pointer transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5"><Av name={p.studentName??'?'}/><span className="font-semibold text-gray-800">{p.studentName||"—"}</span></div>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{p.studentGrade ? `G${p.studentGrade}` : "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{p.submittedByName||"—"}</td>
                  <td className="px-3 py-2 text-right font-black" style={{color:NAVY}}>{fmt(p.amount)}</td>
                  <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                    {p.utrNumber ? (
                      <span className="group flex items-center gap-1">
                        <code className="font-mono text-gray-700 text-[10px]">{p.utrNumber.slice(0,14)}{p.utrNumber.length>14?"…":""}</code>
                        <button onClick={()=>navigator.clipboard.writeText(p.utrNumber!)} className="opacity-0 group-hover:opacity-100 text-gray-400"><Copy className="w-3 h-3"/></button>
                      </span>
                    ) : p.razorpayPaymentId ? (
                      <span className="group flex items-center gap-1">
                        <code className="font-mono text-gray-700 text-[10px]">{p.razorpayPaymentId.slice(0,14)}{p.razorpayPaymentId.length>14?"…":""}</code>
                        <button onClick={()=>navigator.clipboard.writeText(p.razorpayPaymentId!)} className="opacity-0 group-hover:opacity-100 text-gray-400"><Copy className="w-3 h-3"/></button>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-[11px]">{fmtShort(p.uploadedAt)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:bg,color}}>
                      <Icon className="w-2.5 h-2.5"/>{label}
                    </span>
                  </td>
                  <td className="px-3 py-2" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-0.5">
                      {!["approved","refunded"].includes(p.status) && (
                        <button onClick={e=>quickApprove(p.id,e)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Approve"><Check className="w-3.5 h-3.5"/></button>
                      )}
                      <button onClick={()=>setSelected(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-500" title="View"><Eye className="w-3.5 h-3.5"/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && <DetailPanel p={selected} onClose={()=>setSelected(null)} onRefresh={()=>{void load();setSelected(null);}}/>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// REVENUE sub-tab (mastery enrollment revenue)
// ──────────────────────────────────────────────────────────────────────────────
interface RevData { summary: RevSummary; byGrade: GradeRow[]; byMentor: MentorRow[]; students: MasteryStudent[]; academicYears: string[]; }

function RevenueView() {
  const [data, setData]         = useState<RevData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState<Period | "AY" | "All">("All");
  const [ay, setAy]             = useState("");
  const [customFrom, setCFrom]  = useState("");
  const [customTo, setCTo]      = useState("");
  const [gradeF, setGradeF]     = useState("all");
  const [mentorF, setMentorF]   = useState("all");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [showStudents, setShowStudents] = useState(false);
  const PER = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gradeF !== "all")  params.set("grade", gradeF);
    if (mentorF !== "all") params.set("mentorId", mentorF);
    if (period === "AY" && ay) params.set("academicYear", ay);
    if (period === "Custom") { if (customFrom) params.set("dateFrom", customFrom); if (customTo) params.set("dateTo", customTo); }
    if (!["AY","Custom","All"].includes(period)) {
      const { dateFrom, dateTo } = periodToRange(period as Period, "", "");
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo)   params.set("dateTo",   dateTo);
    }
    const r = await apiFetch(`/admin/mastery/revenue?${params}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, [period, ay, customFrom, customTo, gradeF, mentorF]);

  useEffect(() => { void load(); }, [load]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    let list = data.students;
    if (search) { const q = search.toLowerCase(); list = list.filter(s => s.studentName.toLowerCase().includes(q) || s.mentorName?.toLowerCase().includes(q)); }
    return list;
  }, [data?.students, search]);

  const paged = filteredStudents.slice((page-1)*PER, page*PER);
  const totalPages = Math.ceil(filteredStudents.length / PER);
  const s = data?.summary;

  const periodKpis = s ? [
    { label: "Today",     students: s.today.students,     rev: s.today.revenue },
    { label: "Yesterday", students: s.yesterday.students, rev: s.yesterday.revenue },
    { label: "This Week", students: s.week.students,      rev: s.week.revenue },
    { label: "This Month",students: s.month.students,     rev: s.month.revenue },
    { label: "This Year", students: s.year.students,      rev: s.year.revenue },
  ] : [];

  const maxGradeRev = data ? Math.max(...data.byGrade.map(g => g.revenue), 1) : 1;

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          {(["All", ...PERIODS, "AY"] as const).map(chip => (
            <button key={chip} onClick={() => { setPeriod(chip as typeof period); setPage(1); }}
              className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={period === chip ? { background: ORANGE, color:"white", borderColor: ORANGE } : { background:"white", color:"#6B7280", borderColor:"#E5E7EB" }}>
              {chip === "AY" ? "Academic Year" : chip}
            </button>
          ))}
          <button onClick={() => void load()} className="ml-auto p-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>
          </button>
        </div>
        {period === "AY" && data?.academicYears && (
          <select value={ay} onChange={e => { setAy(e.target.value); setPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none w-fit">
            <option value="">All Academic Years</option>
            {data.academicYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {period === "Custom" && (
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400"/>
            <input type="date" value={customFrom} onChange={e=>setCFrom(e.target.value)} className="text-[11px] border border-gray-200 rounded px-2 py-1"/>
            <span className="text-xs text-gray-400">–</span>
            <input type="date" value={customTo} onChange={e=>setCTo(e.target.value)} className="text-[11px] border border-gray-200 rounded px-2 py-1"/>
          </div>
        )}
        {/* Grade + Mentor filters */}
        <div className="flex flex-wrap gap-2">
          <select value={gradeF} onChange={e=>{setGradeF(e.target.value);setPage(1);}}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none">
            <option value="all">All Grades</option>
            {Array.from({length:10},(_,i)=>i+1).map(g=><option key={g} value={g}>Grade {g}</option>)}
          </select>
          {data?.byMentor && (
            <select value={mentorF} onChange={e=>{setMentorF(e.target.value);setPage(1);}}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none max-w-40">
              <option value="all">All Mentors</option>
              {data.byMentor.map(m=><option key={m.mentorName} value={String(m.mentorId??m.mentorName)}>{m.mentorName}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Total KPIs */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400"/></div>
      ) : s && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Total Students", value: s.totalStudents.toString(), icon: Users,         color: NAVY,   bg: "#EEF2FF" },
              { label: "Total Revenue",  value: fmtK(s.totalRevenue),        icon: IndianRupee,  color: GREEN,  bg: "#D1FAE5" },
              { label: "Avg per Student",value: s.totalStudents > 0 ? fmtK(Math.round(s.totalRevenue / s.totalStudents)) : "—", icon: TrendingUp, color: BLUE, bg: "#EFF6FF" },
              { label: "Total Pending",  value: fmtK(s.totalPending),        icon: Clock,        color: AMBER,  bg: "#FEF3C7" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center gap-2.5 shadow-sm">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                  <Icon className="w-4 h-4" style={{ color }}/>
                </div>
                <div><p className="text-sm font-black" style={{ color: NAVY }}>{value}</p>
                  <p className="text-[10px] text-gray-400">{label}</p></div>
              </div>
            ))}
          </div>

          {/* Period breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 overflow-x-auto">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Period Breakdown</p>
            <div className="flex gap-4 min-w-max">
              {periodKpis.map(({ label, students, rev }) => (
                <div key={label} className="text-center px-3 py-1.5 rounded-lg bg-gray-50 min-w-20">
                  <p className="text-xs font-black" style={{color:NAVY}}>{students}</p>
                  <p className="text-[10px] font-semibold" style={{color:GREEN}}>{fmtK(rev)}</p>
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Grade breakdown */}
          {data.byGrade.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2.5">Grade-wise Revenue</p>
              <div className="space-y-1.5">
                {data.byGrade.map(g => (
                  <div key={g.grade} className="flex items-center gap-2 text-xs">
                    <span className="w-14 shrink-0 font-semibold text-gray-600">Grade {g.grade}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(g.revenue/maxGradeRev)*100}%`, background: NAVY }}/>
                    </div>
                    <span className="w-16 text-right font-bold" style={{color:NAVY}}>{fmtK(g.revenue)}</span>
                    <span className="w-10 text-right text-gray-400">{g.students} stu</span>
                    {g.pending > 0 && <span className="text-[10px]" style={{color:AMBER}}>+{fmtK(g.pending)} due</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mentor breakdown */}
          {data.byMentor.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Mentor-wise Revenue</p>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50/60 text-gray-400">
                  <th className="text-left px-3 py-2 font-semibold">Mentor</th>
                  <th className="text-right px-3 py-2 font-semibold">Students</th>
                  <th className="text-right px-3 py-2 font-semibold">Collected</th>
                  <th className="text-right px-3 py-2 font-semibold">Pending</th>
                </tr></thead>
                <tbody>
                  {data.byMentor.map(m => (
                    <tr key={m.mentorName} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5"><Av name={m.mentorName}/><span className="font-semibold text-gray-800">{m.mentorName}</span></div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{m.students}</td>
                      <td className="px-3 py-2 text-right font-black" style={{color:GREEN}}>{fmtK(m.revenue)}</td>
                      <td className="px-3 py-2 text-right" style={{color: m.pending>0 ? AMBER : "#9CA3AF"}}>{fmtK(m.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Student list toggle */}
          <button onClick={() => setShowStudents(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <span>Student List ({filteredStudents.length})</span>
            {showStudents ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
          </button>

          {showStudents && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                  <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search student or mentor…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none"/>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead><tr className="bg-gray-50/60 text-gray-400 font-semibold">
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">Grade</th>
                    <th className="text-left px-3 py-2">Mentor</th>
                    <th className="text-right px-3 py-2">Paid</th>
                    <th className="text-right px-3 py-2">Pending</th>
                    <th className="text-left px-3 py-2">AY</th>
                    <th className="text-left px-3 py-2">Admission</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {paged.map(st => (
                      <tr key={st.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5"><Av name={st.studentName}/><span className="font-semibold text-gray-800">{st.studentName}</span></div>
                        </td>
                        <td className="px-3 py-2 text-gray-500">G{st.grade}</td>
                        <td className="px-3 py-2 text-gray-600">{st.mentorName||"—"}</td>
                        <td className="px-3 py-2 text-right font-bold" style={{color:GREEN}}>{fmtK(st.amountPaid)}</td>
                        <td className="px-3 py-2 text-right" style={{color: st.amountPending>0 ? AMBER : "#9CA3AF"}}>{st.amountPending>0 ? fmtK(st.amountPending) : "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{st.academicYear||"—"}</td>
                        <td className="px-3 py-2 text-gray-400 text-[11px]">{fmtShort(st.admissionDate)}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                            style={st.masteryStatus==="Active" ? {background:"#D1FAE5",color:GREEN} : {background:"#F3F4F6",color:"#6B7280"}}>
                            {st.masteryStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40">‹</button>
                  <span>{page}/{totalPages}</span>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40">›</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PaymentsTab() {
  const [subTab, setSubTab] = useState<"collection" | "revenue">("collection");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-black" style={{ color: NAVY }}>Payments</h2>
          <p className="text-[11px] text-gray-400">Collection approvals · Mastery enrollment revenue</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([
            { id: "collection", label: "💳 Collection" },
            { id: "revenue",    label: "📊 Mastery Revenue" },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={subTab === t.id ? { background: "white", color: NAVY, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#6B7280" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {subTab === "collection" ? <CollectionView/> : <RevenueView/>}
    </div>
  );
}
