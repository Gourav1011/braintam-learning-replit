import { useState, useEffect, useCallback } from "react";
import {
  Users, UserCheck, RefreshCw, Search, X, ChevronDown, ChevronUp,
  Phone, Mail, GraduationCap, Calendar, BookOpen, CreditCard,
  User, Clock, CheckCircle, AlertCircle, RotateCcw, TrendingUp,
  Edit2, Save, XCircle, Download,
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

const NAVY  = "#0B2B6B";
const ORANGE = "#FF6B1A";

// ── Types ──────────────────────────────────────────────────────────────────

interface MasteryStudent {
  id: number;
  igniteLeadId: number | null;
  studentId: number | null;
  studentName: string;
  parentName: string | null;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  grade: number;
  board: string | null;
  coursePlan: string | null;
  courseDuration: string | null;
  amountPaid: number;
  amountPending: number;
  paymentStatus: string;
  mentorId: number | null;
  mentorName: string | null;
  academicYear: string | null;
  admissionDate: string;
  source: string;
  masteryStatus: string;
  isNewAdmission: boolean;
  renewalDueDate: string | null;
  renewedAt: string | null;
  promotedGrade: number | null;
  notes: string | null;
  computedStatus: string;
}

interface Stats {
  total: number;
  newAdmissions: number;
  existing: number;
  active: number;
  retentionDue: number;
  renewed: number;
}

interface TimelineEvent {
  id: number;
  masteryStudentId: number;
  eventType: string;
  eventLabel: string;
  eventData: string | null;
  actorName: string | null;
  createdAt: string;
}

interface StudentDetail {
  student: MasteryStudent;
  timeline: TimelineEvent[];
  igniteHistory: { date: string; status: string; notes: string | null }[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function rupee(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "–";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

function fmtDatetime(s: string | null | undefined) {
  if (!s) return "–";
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

// ── Status Badge ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; emoji: string; bg: string; color: string }> = {
  new_admission:  { label: "New Admission",   emoji: "🟢", bg: "#D1FAE5", color: "#065F46" },
  existing:       { label: "Existing Student", emoji: "🟡", bg: "#FEF3C7", color: "#92400E" },
  retention_due:  { label: "Retention Due",   emoji: "🔵", bg: "#DBEAFE", color: "#1E40AF" },
  renewed:        { label: "Renewed",          emoji: "🟣", bg: "#EDE9FE", color: "#5B21B6" },
};

const TIMELINE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  student_created:        { icon: User,        color: "#3B82F6" },
  converted_from_ignite:  { icon: TrendingUp,  color: ORANGE },
  mentor_assigned:        { icon: UserCheck,   color: "#8B5CF6" },
  payment_approved:       { icon: CreditCard,  color: "#22C55E" },
  retention_started:      { icon: Clock,       color: "#F59E0B" },
  renewed:                { icon: RotateCcw,   color: "#10B981" },
  promoted:               { icon: GraduationCap, color: NAVY },
  default:                { icon: CheckCircle, color: "#6B7280" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, emoji: "⚪", bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const cfgs: Record<string, { bg: string; color: string }> = {
    paid:    { bg: "#D1FAE5", color: "#065F46" },
    partial: { bg: "#FEF3C7", color: "#92400E" },
    pending: { bg: "#FEE2E2", color: "#991B1B" },
  };
  const c = cfgs[status] ?? { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={c}>
      {status}
    </span>
  );
}

// ── Top Stat Card ──────────────────────────────────────────────────────────

function StatCard({ label, value, color, active, onClick }: {
  label: string; value: number; color: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-0 rounded-2xl p-4 text-left border transition-all"
      style={{
        background: active ? color + "18" : "white",
        borderColor: active ? color : "#E5E7EB",
        boxShadow: "0 1px 6px rgba(11,43,107,0.05)",
      }}>
      <div className="font-black text-2xl" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 font-medium mt-0.5 leading-tight">{label}</div>
    </button>
  );
}

// ── Profile Drawer ─────────────────────────────────────────────────────────

type DrawerTab = "personal" | "payments" | "academic" | "mentor" | "timeline" | "retention";

function ProfileDrawer({
  studentId, onClose, flash,
}: { studentId: number; onClose: () => void; flash: (msg: string, ok?: boolean) => void }) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("personal");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<MasteryStudent>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/admin/mastery/students/${studentId}`)
      .then((r: Response) => r.json())
      .then((d: StudentDetail) => { setDetail(d); setForm(d.student); })
      .catch(() => flash("Failed to load student", false))
      .finally(() => setLoading(false));
  }, [studentId, flash]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const r = await apiFetch(`/admin/mastery/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) { flash("Saved!"); setEditing(false); load(); }
      else { const e = await r.json(); flash(e.error ?? "Failed", false); }
    } finally { setSaving(false); }
  }

  const s = detail?.student;

  const DRAWER_TABS: { id: DrawerTab; label: string; icon: React.ElementType }[] = [
    { id: "personal",  label: "Personal Info",      icon: User },
    { id: "payments",  label: "Payment History",    icon: CreditCard },
    { id: "academic",  label: "Academic History",   icon: BookOpen },
    { id: "mentor",    label: "Mentor History",     icon: UserCheck },
    { id: "timeline",  label: "Timeline",           icon: Clock },
    { id: "retention", label: "Retention Info",     icon: RotateCcw },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex overflow-hidden"
        style={{ fontFamily: "Poppins, sans-serif" }}>

        {/* Left sidebar */}
        <div className="w-48 shrink-0 border-r border-gray-100 flex flex-col" style={{ background: "#F8FAFF" }}>
          <div className="p-4 border-b border-gray-100">
            <button onClick={onClose} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 mb-3">
              <X className="w-3 h-3 text-gray-600" />
            </button>
            {s && (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black mb-2"
                  style={{ background: NAVY }}>{s.studentName[0].toUpperCase()}</div>
                <div className="font-bold text-xs" style={{ color: NAVY }}>{s.studentName}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Grade {s.grade} • {s.board ?? "–"}</div>
                <div className="mt-2">
                  <StatusBadge status={s.computedStatus} />
                </div>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {DRAWER_TABS.map(t => (
              <button key={t.id}
                onClick={() => setDrawerTab(t.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs font-semibold mb-0.5 transition-all"
                style={{
                  background: drawerTab === t.id ? NAVY : "transparent",
                  color: drawerTab === t.id ? "white" : "#6B7280",
                }}>
                <t.icon className="w-3.5 h-3.5 shrink-0" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
            <div>
              <div className="font-bold text-sm" style={{ color: NAVY }}>
                {DRAWER_TABS.find(t => t.id === drawerTab)?.label}
              </div>
              {s && <div className="text-[10px] text-gray-400">Mastery ID #{s.id} • Joined {fmtDate(s.admissionDate)}</div>}
            </div>
            <div className="flex-1" />
            {drawerTab === "personal" && !editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border"
                style={{ borderColor: NAVY, color: NAVY }}>
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
            {editing && (
              <>
                <button onClick={() => { setEditing(false); setForm(s ?? {}); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500">
                  Cancel
                </button>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: NAVY }}>
                  <Save className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
            ) : !detail ? (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Failed to load</div>
            ) : drawerTab === "personal" ? (
              <div className="grid grid-cols-2 gap-4">
                {editing ? (
                  <>
                    <Field label="Student Name" value={form.studentName ?? ""} onChange={v => setForm(p => ({ ...p, studentName: v }))} />
                    <Field label="Parent Name" value={form.parentName ?? ""} onChange={v => setForm(p => ({ ...p, parentName: v }))} />
                    <Field label="Phone" value={form.phone ?? ""} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                    <Field label="Alternate Phone" value={form.alternatePhone ?? ""} onChange={v => setForm(p => ({ ...p, alternatePhone: v }))} />
                    <Field label="Email" value={form.email ?? ""} onChange={v => setForm(p => ({ ...p, email: v }))} />
                    <Field label="Grade" type="number" value={String(form.grade ?? "")} onChange={v => setForm(p => ({ ...p, grade: Number(v) }))} />
                    <Field label="Board" value={form.board ?? ""} onChange={v => setForm(p => ({ ...p, board: v }))} />
                    <Field label="Course Plan" value={form.coursePlan ?? ""} onChange={v => setForm(p => ({ ...p, coursePlan: v }))} />
                    <Field label="Course Duration" value={form.courseDuration ?? ""} onChange={v => setForm(p => ({ ...p, courseDuration: v }))} />
                    <Field label="Academic Year" value={form.academicYear ?? ""} onChange={v => setForm(p => ({ ...p, academicYear: v }))} />
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Notes</label>
                      <textarea rows={3} value={form.notes ?? ""}
                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-blue-400" />
                    </div>
                  </>
                ) : (
                  <>
                    <InfoRow label="Student Name" value={s!.studentName} />
                    <InfoRow label="Parent Name" value={s!.parentName} />
                    <InfoRow label="Phone" value={s!.phone} icon={Phone} />
                    <InfoRow label="Alternate Phone" value={s!.alternatePhone} icon={Phone} />
                    <InfoRow label="Email" value={s!.email} icon={Mail} />
                    <InfoRow label="Grade" value={s!.grade ? `Grade ${s!.grade}` : null} icon={GraduationCap} />
                    <InfoRow label="Board" value={s!.board} />
                    <InfoRow label="Course Plan" value={s!.coursePlan} icon={BookOpen} />
                    <InfoRow label="Course Duration" value={s!.courseDuration} />
                    <InfoRow label="Academic Year" value={s!.academicYear} icon={Calendar} />
                    <InfoRow label="Admission Date" value={fmtDate(s!.admissionDate)} icon={Calendar} />
                    <InfoRow label="Source" value={s!.source} />
                    <InfoRow label="Status" value={<StatusBadge status={s!.computedStatus} />} />
                    {s!.notes && <div className="col-span-2 p-3 rounded-xl bg-gray-50 text-xs text-gray-600">{s!.notes}</div>}
                  </>
                )}
              </div>

            ) : drawerTab === "payments" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                    <div className="font-black text-xl text-green-700">{rupee(s!.amountPaid)}</div>
                    <div className="text-xs text-gray-500 mt-1">Amount Paid</div>
                  </div>
                  <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                    <div className="font-black text-xl text-red-600">{rupee(s!.amountPending)}</div>
                    <div className="text-xs text-gray-500 mt-1">Amount Pending</div>
                  </div>
                  <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                    <div className="font-black text-xl" style={{ color: NAVY }}><PaymentBadge status={s!.paymentStatus} /></div>
                    <div className="text-xs text-gray-500 mt-1">Payment Status</div>
                  </div>
                </div>
                {editing && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Field label="Amount Paid (₹)" type="number" value={String(form.amountPaid ?? "")} onChange={v => setForm(p => ({ ...p, amountPaid: Number(v) }))} />
                    <Field label="Amount Pending (₹)" type="number" value={String(form.amountPending ?? "")} onChange={v => setForm(p => ({ ...p, amountPending: Number(v) }))} />
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Payment Status</label>
                      <select value={form.paymentStatus ?? ""}
                        onChange={e => setForm(p => ({ ...p, paymentStatus: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none">
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                )}
                {/* Payment timeline events */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Payment Events</div>
                  {detail.timeline.filter(t => t.eventType === "payment_approved").length === 0 ? (
                    <div className="text-xs text-gray-400">No payment events recorded</div>
                  ) : (
                    detail.timeline.filter(t => t.eventType === "payment_approved").map(e => (
                      <div key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                          <CreditCard className="w-3 h-3 text-green-700" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700">{e.eventLabel}</div>
                          <div className="text-[10px] text-gray-400">{fmtDatetime(e.createdAt)} {e.actorName ? `· by ${e.actorName}` : ""}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            ) : drawerTab === "academic" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Grade" value={s!.grade ? `Grade ${s!.grade}` : null} />
                  <InfoRow label="Board" value={s!.board} />
                  <InfoRow label="Course Plan" value={s!.coursePlan} />
                  <InfoRow label="Course Duration" value={s!.courseDuration} />
                  <InfoRow label="Academic Year" value={s!.academicYear} />
                  {s!.promotedGrade && <InfoRow label="Promoted to Grade" value={`Grade ${s!.promotedGrade}`} />}
                </div>
                {detail.igniteHistory.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">Ignite History</div>
                    <div className="space-y-2">
                      {detail.igniteHistory.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                          <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: ORANGE }} />
                          <div>
                            <div className="text-xs font-semibold text-gray-700">{h.status}</div>
                            <div className="text-[10px] text-gray-400">{fmtDate(h.date)}</div>
                            {h.notes && <div className="text-[10px] text-gray-500 mt-0.5">{h.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {editing && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <Field label="Grade" type="number" value={String(form.grade ?? "")} onChange={v => setForm(p => ({ ...p, grade: Number(v) }))} />
                    <Field label="Board" value={form.board ?? ""} onChange={v => setForm(p => ({ ...p, board: v }))} />
                    <Field label="Course Plan" value={form.coursePlan ?? ""} onChange={v => setForm(p => ({ ...p, coursePlan: v }))} />
                    <Field label="Academic Year" value={form.academicYear ?? ""} onChange={v => setForm(p => ({ ...p, academicYear: v }))} />
                    <Field label="Promoted Grade" type="number" value={String(form.promotedGrade ?? "")} onChange={v => setForm(p => ({ ...p, promotedGrade: Number(v) || null }))} />
                  </div>
                )}
              </div>

            ) : drawerTab === "mentor" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Current Mentor" value={s!.mentorName} />
                  <InfoRow label="Mentor ID" value={s!.mentorId ? `#${s!.mentorId}` : null} />
                </div>
                {editing && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <Field label="Mentor Name" value={form.mentorName ?? ""} onChange={v => setForm(p => ({ ...p, mentorName: v }))} />
                    <Field label="Mentor ID" type="number" value={String(form.mentorId ?? "")} onChange={v => setForm(p => ({ ...p, mentorId: Number(v) || null }))} />
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2">Mentor Assignment History</div>
                  {detail.timeline.filter(t => t.eventType === "mentor_assigned").length === 0 ? (
                    <div className="text-xs text-gray-400">No mentor assignments recorded</div>
                  ) : (
                    detail.timeline.filter(t => t.eventType === "mentor_assigned").map(e => (
                      <div key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                          <UserCheck className="w-3 h-3 text-purple-700" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700">{e.eventLabel}</div>
                          <div className="text-[10px] text-gray-400">{fmtDatetime(e.createdAt)} {e.actorName ? `· by ${e.actorName}` : ""}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            ) : drawerTab === "timeline" ? (
              <div className="relative">
                {detail.timeline.length === 0 ? (
                  <div className="text-xs text-gray-400">No timeline events yet</div>
                ) : (
                  <div className="space-y-0">
                    {detail.timeline.map((e, i) => {
                      const cfg = TIMELINE_ICONS[e.eventType] ?? TIMELINE_ICONS.default;
                      const Icon = cfg.icon;
                      return (
                        <div key={e.id} className="flex gap-3 pb-5 relative">
                          {i < detail.timeline.length - 1 && (
                            <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-100" />
                          )}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                            style={{ background: cfg.color + "20" }}>
                            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="text-xs font-bold text-gray-800">{e.eventLabel}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {fmtDatetime(e.createdAt)} {e.actorName ? `· by ${e.actorName}` : ""}
                            </div>
                            {e.eventData && (() => {
                              try {
                                const d = JSON.parse(e.eventData);
                                const entries = Object.entries(d).filter(([, v]) => v != null && v !== "");
                                return entries.length > 0 ? (
                                  <div className="mt-1 text-[10px] text-gray-500 bg-gray-50 rounded-lg p-2">
                                    {entries.map(([k, v]) => (
                                      <span key={k} className="mr-2 capitalize">{k.replace(/([A-Z])/g, " $1")}: <b>{String(v)}</b></span>
                                    ))}
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            ) : drawerTab === "retention" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Renewal Due Date" value={fmtDate(s!.renewalDueDate)} />
                  <InfoRow label="Renewed At" value={fmtDate(s!.renewedAt)} />
                  <InfoRow label="Mastery Status" value={s!.masteryStatus} />
                </div>
                {editing && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Renewal Due Date</label>
                      <input type="date" value={form.renewalDueDate ? form.renewalDueDate.substring(0, 10) : ""}
                        onChange={e => setForm(p => ({ ...p, renewalDueDate: e.target.value ? e.target.value + "T00:00:00+05:30" : null }))}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Renewed At</label>
                      <input type="date" value={form.renewedAt ? form.renewedAt.substring(0, 10) : ""}
                        onChange={e => setForm(p => ({ ...p, renewedAt: e.target.value ? e.target.value + "T00:00:00+05:30" : null }))}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Mastery Status</label>
                      <select value={form.masteryStatus ?? "Active"}
                        onChange={e => setForm(p => ({ ...p, masteryStatus: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Dropped">Dropped</option>
                      </select>
                    </div>
                  </div>
                )}
                {/* Retention timeline */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2">Retention Events</div>
                  {detail.timeline.filter(t => ["retention_started","renewed"].includes(t.eventType)).length === 0 ? (
                    <div className="text-xs text-gray-400">No retention events recorded</div>
                  ) : (
                    detail.timeline.filter(t => ["retention_started","renewed"].includes(t.eventType)).map(e => (
                      <div key={e.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                          <RotateCcw className="w-3 h-3 text-blue-700" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700">{e.eventLabel}</div>
                          <div className="text-[10px] text-gray-400">{fmtDatetime(e.createdAt)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small field helper ─────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 mb-1">{label}</label>
      <input type={type} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: {
  label: string; value: string | number | React.ReactNode | null | undefined; icon?: React.ElementType;
}) {
  return (
    <div className="p-3 rounded-xl border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-1 mb-1">
        {Icon && <Icon className="w-3 h-3 text-gray-400" />}
        <div className="text-[10px] text-gray-400 font-medium">{label}</div>
      </div>
      <div className="text-xs font-semibold text-gray-800">
        {value ?? <span className="text-gray-300">–</span>}
      </div>
    </div>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────

type FilterStatus = "" | "new_admission" | "existing" | "retention_due" | "renewed";

export function MasteryStudentsTab({ flash, role = "admin" }: { flash: (msg: string, ok?: boolean) => void; role?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<MasteryStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<"admissionDate" | "studentName" | "grade">("admissionDate");
  const [sortAsc, setSortAsc] = useState(false);

  const masteryMaxDays = role === "super_admin" ? null : role === "admin" ? 7 : 0;
  const canExportMastery = masteryMaxDays !== 0;

  const exportCSV = (allStudents: MasteryStudent[]) => {
    let rows = [...allStudents];
    if (masteryMaxDays !== null) {
      const cutoff = new Date(Date.now() - masteryMaxDays * 86400000);
      rows = rows.filter(s => new Date(s.admissionDate) >= cutoff);
    }
    const headers = ["Name","Parent","Phone","Alt Phone","Email","Grade","Board","Course Plan","Amount Paid","Amount Pending","Payment Status","Mentor","Acad Year","Admission Date","Status","Source"];
    const csvRows = rows.map(s => [
      s.studentName, s.parentName, s.phone, s.alternatePhone, s.email,
      s.grade, s.board, s.coursePlan, s.amountPaid, s.amountPending,
      s.paymentStatus, s.mentorName, s.academicYear,
      new Date(s.admissionDate).toLocaleDateString("en-IN"), s.masteryStatus, s.source,
    ]);
    const e = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.map(e), ...csvRows.map(r => r.map(e))].map(c => c.join(",")).join("\n");
    const rangeLabel = masteryMaxDays === null ? "all" : `${masteryMaxDays}d`;
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `braintam_mastery-students_${rangeLabel}_${new Date().toISOString().slice(0,10)}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (q.trim()) params.set("q", q.trim());
    apiFetch(`/admin/mastery/students?${params}`)
      .then((r: Response) => r.json())
      .then((d: { stats: Stats; students: MasteryStudent[] }) => {
        setStats(d.stats);
        setStudents(d.students);
      })
      .catch(() => flash("Failed to load students", false))
      .finally(() => setLoading(false));
  }, [filterStatus, q, flash]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...students].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "admissionDate") cmp = a.admissionDate < b.admissionDate ? -1 : 1;
    else if (sortKey === "studentName") cmp = a.studentName.localeCompare(b.studentName);
    else if (sortKey === "grade") cmp = a.grade - b.grade;
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: typeof sortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  }

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* Top Cards */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Total Students"  value={stats.total}         color={NAVY}     active={filterStatus === ""} onClick={() => setFilterStatus("")} />
          <StatCard label="New Admissions"  value={stats.newAdmissions} color="#22C55E"  active={filterStatus === "new_admission"} onClick={() => setFilterStatus("new_admission")} />
          <StatCard label="Existing"        value={stats.existing}      color="#F59E0B"  active={filterStatus === "existing"} onClick={() => setFilterStatus("existing")} />
          <StatCard label="Active"          value={stats.active}        color="#3B82F6"  active={false} onClick={() => {}} />
          <StatCard label="Retention Due"   value={stats.retentionDue}  color="#EF4444"  active={filterStatus === "retention_due"} onClick={() => setFilterStatus("retention_due")} />
          <StatCard label="Renewed"         value={stats.renewed}       color="#8B5CF6"  active={filterStatus === "renewed"} onClick={() => setFilterStatus("renewed")} />
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3"
        style={{ boxShadow: "0 1px 6px rgba(11,43,107,0.05)" }}>
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          placeholder="Search by name or phone…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="flex-1 text-xs outline-none placeholder-gray-400 bg-transparent" />
        {q && <button onClick={() => setQ("")}><X className="w-4 h-4 text-gray-400" /></button>}
        {canExportMastery && (
          <button onClick={() => exportCSV(students)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Download className="w-3 h-3" />
            Export CSV{masteryMaxDays !== null ? ` (last ${masteryMaxDays}d)` : ""}
          </button>
        )}
        <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 8px rgba(11,43,107,0.06)" }}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>Mastery Students</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white ml-1"
            style={{ background: NAVY }}>{sorted.length}</span>
          <div className="flex-1" />
          {filterStatus && (
            <button onClick={() => setFilterStatus("")}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-500 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Clear filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading students…</div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <div className="text-sm font-semibold">No students found</div>
            <div className="text-xs mt-1">Students are auto-created when Ignite leads are converted.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 cursor-pointer"
                    onClick={() => toggleSort("studentName")}>
                    Student <SortIcon col="studentName" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 cursor-pointer"
                    onClick={() => toggleSort("grade")}>
                    Grade <SortIcon col="grade" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Board</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Mentor</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 cursor-pointer"
                    onClick={() => toggleSort("admissionDate")}>
                    Admission <SortIcon col="admissionDate" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Acad. Year</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: NAVY }}>{s.studentName[0].toUpperCase()}</div>
                        <div>
                          <div className="font-semibold text-gray-800">{s.studentName}</div>
                          {s.parentName && <div className="text-[10px] text-gray-400">{s.parentName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{s.phone}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "#EEF2FF", color: NAVY }}>Gr {s.grade}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.board ?? "–"}</td>
                    <td className="px-4 py-3 text-gray-600">{s.mentorName ?? <span className="text-gray-300">–</span>}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(s.admissionDate)}</td>
                    <td className="px-4 py-3 text-gray-500">{s.academicYear ?? "–"}</td>
                    <td className="px-4 py-3"><PaymentBadge status={s.paymentStatus} /></td>
                    <td className="px-4 py-3"><StatusBadge status={s.computedStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Drawer */}
      {selectedId !== null && (
        <ProfileDrawer
          studentId={selectedId}
          onClose={() => { setSelectedId(null); load(); }}
          flash={flash}
        />
      )}
    </div>
  );
}
