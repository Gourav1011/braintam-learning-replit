import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Users, UserCheck2, TrendingUp, Phone, Search, X, Eye,
  MoreVertical, ChevronUp, ChevronDown, Trophy, Zap,
  Activity, Clock, ArrowUpRight, Download, Plus, RefreshCw,
  BarChart3, BookOpen, CheckCircle2, XCircle, Loader2,
  MessageSquare, GraduationCap, Star, AlertCircle, Flame,
  ChevronLeft, ChevronRight, Shield, Mail, CalendarDays, Edit3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  const base = API_BASE;
  return fetch(`${base}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

function hashPassword(pw: string): string { return pw; }

interface EnrichedMentor {
  id: number; name: string; email: string; phone: string | null;
  mentorType: string; isActive: boolean; createdAt: string;
  lastLoginAt: string | null; assignedStudents: number;
  assignedDemoStudents: number; conversions: number; conversionPct: number;
  attendancePct: number | null; homeworkPct: number | null;
  followUpPct: number; healthScore: number;
  healthLabel: "Excellent" | "Good" | "Average" | "Needs Attention";
  workload: "Low" | "Medium" | "High";
}

interface DashboardStats {
  total: number; academic: number; sales: number; active: number; inactive: number;
  topPerformer: { id: number; name: string; convPct: number } | null;
  healthDistribution: { excellent: number; good: number; average: number; needsAttention: number };
  workloadDistribution: { low: number; medium: number; high: number };
  topSalesMentors: { id: number; name: string; convPct: number }[];
  topAcademicMentors: { id: number; name: string; healthScore: number; attPct: number | null }[];
  quickInsights: { totalDemoLeads: number; totalConversions: number; overallConversionPct: number; avgAttendancePct: number };
  recentActivity: { mentorName: string; studentName: string; note: string; time: string }[];
}

interface AlertsData {
  noLoginDays: { id: number; name: string }[];
  noStudents: { id: number; name: string }[];
  noLeads: { id: number; name: string }[];
  overloaded: { id: number; name: string }[];
  lowConversion: { id: number; name: string; convPct: number }[];
}

interface MentorProfile {
  mentor: EnrichedMentor;
  stats: { assignedStudents: number; assignedDemoStudents: number; conversions: number; conversionPct: number; attendancePct: number | null; homeworkPct: number | null; healthScore: number; healthLabel: string; totalFollowUps: number; totalTasks: number; doneTasks: number };
  assignments: { id: number; studentId: number; studentName: string | null; studentEmail: string | null; studentGrade: number | null; leadStage: string | null; callStatus: string | null; lastLoginAt: string | null; isActive: boolean; assignedAt: string }[];
  demoEnrollments: { id: number; studentId: number; studentName: string | null; batchId: number; enrollmentStatus: string; lastDayAttended: number | null; enrolledAt: string }[];
  recentFollowUps: { id: number; studentId: number; studentName: string | null; note: string | null; noteType: string | null; callStatus: string | null; leadStatus: string | null; nextFollowUpDate: string | null; createdAt: string }[];
  tasks: { id: number; title: string; status: string; dueDate: string | null; priority: string | null }[];
}

type SortKey = "name" | "mentorType" | "assignedStudents" | "assignedDemoStudents" | "conversions" | "conversionPct" | "attendancePct" | "homeworkPct" | "lastLoginAt" | "healthScore" | "workload";

function healthColor(label: string) {
  if (label === "Excellent") return { bg: "#DCFCE7", text: "#15803D", dot: "#22C55E" };
  if (label === "Good") return { bg: "#DBEAFE", text: "#1D4ED8", dot: "#3B82F6" };
  if (label === "Average") return { bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B" };
  return { bg: "#FEE2E2", text: "#DC2626", dot: "#EF4444" };
}

function workloadColor(w: string) {
  if (w === "Low") return { bg: "#DCFCE7", text: "#15803D" };
  if (w === "Medium") return { bg: "#FEF3C7", text: "#B45309" };
  return { bg: "#FEE2E2", text: "#DC2626" };
}

function workloadDisplay(w: string): string {
  if (w === "Low") return "Healthy";
  if (w === "Medium") return "Busy";
  return "Overloaded";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function StatCard({ icon, label, value, sub, color, bg }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="text-xl font-black leading-tight" style={{ color: NAVY }}>{value}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="w-28 h-28 rounded-full bg-gray-100 mx-auto" />;
  let offset = 0;
  const r = 40, cx = 50, cy = 50, strokeW = 18;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const rotation = offset * 360 - 90;
        offset += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.4s" }} />
        );
      })}
      <text x="50" y="53" textAnchor="middle" fontSize="14" fontWeight="800" fill={NAVY}>{total}</text>
    </svg>
  );
}

function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const colors = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-black text-xs flex-shrink-0`}
      style={{ background: colors[idx], width: size * 4, height: size * 4, fontSize: size < 8 ? 11 : 13 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SortHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: SortKey; currentSort: { key: SortKey; dir: "asc" | "desc" }; onSort: (k: SortKey) => void }) {
  const active = currentSort.key === sortKey;
  return (
    <button onClick={() => onSort(sortKey)}
      className="flex items-center gap-0.5 text-xs font-semibold text-gray-500 hover:text-gray-800 whitespace-nowrap transition-colors">
      {label}
      <span className="flex flex-col ml-0.5">
        <ChevronUp className={`w-2.5 h-2.5 -mb-0.5 ${active && currentSort.dir === "asc" ? "text-blue-500" : "text-gray-300"}`} />
        <ChevronDown className={`w-2.5 h-2.5 ${active && currentSort.dir === "desc" ? "text-blue-500" : "text-gray-300"}`} />
      </span>
    </button>
  );
}

function ProfileDrawer({ mentorId, onClose, flash }: { mentorId: number; onClose: () => void; flash: (msg: string, ok?: boolean) => void }) {
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileTab, setProfileTab] = useState<"overview" | "assignments" | "performance" | "timeline" | "tasks">("overview");
  const [changePw, setChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/admin/mentors/${mentorId}/profile`).then(r => r.ok ? r.json() : null).then(d => {
      setProfile(d);
      setLoading(false);
    });
  }, [mentorId]);

  async function savePassword() {
    if (!newPw || newPw.length < 6) return;
    setSavingPw(true);
    const r = await apiFetch(`/admin/mentors/${mentorId}`, { method: "PATCH", body: JSON.stringify({ password: newPw }) });
    setSavingPw(false);
    if (r.ok) { flash("Password updated!"); setChangePw(false); setNewPw(""); }
    else flash("Failed to update password", false);
  }

  async function toggleActive() {
    if (!profile) return;
    setToggling(true);
    const r = await apiFetch(`/admin/mentors/${mentorId}`, { method: "PATCH", body: JSON.stringify({ isActive: !profile.mentor.isActive }) });
    setToggling(false);
    if (r.ok) {
      flash(`Mentor ${profile.mentor.isActive ? "disabled" : "enabled"}!`);
      setProfile(prev => prev ? { ...prev, mentor: { ...prev.mentor, isActive: !prev.mentor.isActive } } : prev);
    } else flash("Failed to update", false);
  }

  const m = profile?.mentor;
  const s = profile?.stats;
  const hc = m ? healthColor(s?.healthLabel ?? "Average") : healthColor("Average");

  const PROFILE_TABS = [
    { key: "overview", label: "Overview" },
    { key: "assignments", label: m?.mentorType === "sales" ? "Demo Leads" : "Students" },
    { key: "performance", label: "Performance" },
    { key: "timeline", label: "Timeline" },
    { key: "tasks", label: "Tasks" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !profile ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Profile not found</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 p-5 border-b border-gray-100" style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a8a)` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                    style={{ background: "rgba(255,255,255,0.2)" }}>
                    {m!.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-black text-lg">{m!.name}</div>
                    <div className="text-blue-200 text-xs mt-0.5">{m!.email}</div>
                    {m!.phone && <div className="text-blue-200 text-xs">{m!.phone}</div>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: m!.mentorType === "sales" ? "#FFFBEB" : "#ECFDF5", color: m!.mentorType === "sales" ? "#D97706" : "#059669" }}>
                        {m!.mentorType === "sales" ? "💼 Sales" : "📚 Academic"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m!.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {m!.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Health score row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 rounded-xl p-3">
                  <div className="text-blue-200 text-xs mb-1">Health Score</div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-xl">{s!.healthScore}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: hc.bg, color: hc.text }}>{s!.healthLabel}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s!.healthScore}%`, background: hc.dot }} />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={toggleActive} disabled={toggling}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${m!.isActive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"} text-white disabled:opacity-60`}>
                    {toggling ? "…" : m!.isActive ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => setChangePw(p => !p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white hover:bg-white/30 transition-all">
                    🔑 Pwd
                  </button>
                </div>
              </div>
              {changePw && (
                <div className="mt-3 flex gap-2">
                  <Input type="password" placeholder="New password (min 6)" value={newPw}
                    onChange={e => setNewPw(e.target.value)} className="h-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1" />
                  <button onClick={savePassword} disabled={savingPw || newPw.length < 6}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60">
                    {savingPw ? "…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-gray-100 bg-gray-50 px-1">
              {PROFILE_TABS.map(t => (
                <button key={t.key} onClick={() => setProfileTab(t.key as typeof profileTab)}
                  className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${profileTab === t.key ? "border-blue-500 text-blue-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto p-5">
              {profileTab === "overview" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {m!.mentorType === "academic" ? (
                      <>
                        <div className="bg-blue-50 rounded-xl p-3.5">
                          <div className="text-xs text-blue-600 font-medium mb-1">Students Assigned</div>
                          <div className="text-2xl font-black" style={{ color: NAVY }}>{s!.assignedStudents}</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3.5">
                          <div className="text-xs text-purple-600 font-medium mb-1">Attendance %</div>
                          <div className="text-2xl font-black text-purple-700">{s!.attendancePct !== null ? `${s!.attendancePct}%` : "—"}</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3.5">
                          <div className="text-xs text-green-600 font-medium mb-1">Homework %</div>
                          <div className="text-2xl font-black text-green-700">{s!.homeworkPct !== null ? `${s!.homeworkPct}%` : "—"}</div>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3.5">
                          <div className="text-xs text-orange-600 font-medium mb-1">Conversions</div>
                          <div className="text-2xl font-black text-orange-700">{s!.conversions}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-orange-50 rounded-xl p-3.5">
                          <div className="text-xs text-orange-600 font-medium mb-1">Demo Leads</div>
                          <div className="text-2xl font-black text-orange-700">{s!.assignedDemoStudents}</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3.5">
                          <div className="text-xs text-green-600 font-medium mb-1">Converted</div>
                          <div className="text-2xl font-black text-green-700">{s!.conversions}</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3.5">
                          <div className="text-xs text-blue-600 font-medium mb-1">Conversion %</div>
                          <div className="text-2xl font-black" style={{ color: NAVY }}>{s!.conversionPct}%</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3.5">
                          <div className="text-xs text-purple-600 font-medium mb-1">Follow-Ups Done</div>
                          <div className="text-2xl font-black text-purple-700">{s!.totalFollowUps}</div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Member since</span><span className="font-semibold" style={{ color: NAVY }}>{new Date(m!.createdAt).toLocaleDateString("en-IN")}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Last login</span><span className="font-semibold" style={{ color: NAVY }}>{m!.lastLoginAt ? timeAgo(m!.lastLoginAt) : "—"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Tasks done</span><span className="font-semibold text-green-600">{s!.doneTasks} / {s!.totalTasks}</span></div>
                  </div>
                </div>
              )}

              {profileTab === "assignments" && (
                <div>
                  {m!.mentorType === "academic" ? (
                    profile.assignments.filter(a => a.isActive).length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No students assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {profile.assignments.filter(a => a.isActive).map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={a.studentName ?? "S"} size={7} />
                              <div>
                                <div className="text-sm font-semibold" style={{ color: NAVY }}>{a.studentName ?? `Student #${a.studentId}`}</div>
                                <div className="text-xs text-gray-400">Grade {a.studentGrade ?? "?"} · {a.studentEmail ?? "—"}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              {a.leadStage && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: a.leadStage === "Converted" ? "#DCFCE7" : "#F3F4F6", color: a.leadStage === "Converted" ? "#15803D" : "#374151" }}>
                                  {a.leadStage}
                                </span>
                              )}
                              <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(a.lastLoginAt)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    profile.demoEnrollments.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No demo leads assigned</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {profile.demoEnrollments.map(e => (
                          <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={e.studentName ?? "S"} size={7} />
                              <div>
                                <div className="text-sm font-semibold" style={{ color: NAVY }}>{e.studentName ?? `Student #${e.studentId}`}</div>
                                <div className="text-xs text-gray-400">Batch #{e.batchId} · Day {e.lastDayAttended ?? 0}</div>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              e.enrollmentStatus === "converted" ? "bg-green-100 text-green-700" :
                              e.enrollmentStatus === "dropped" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-700"
                            }`}>
                              {e.enrollmentStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {profileTab === "performance" && (
                <div className="space-y-4">
                  {m!.mentorType === "academic" ? (
                    <>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Attendance Rate</span><span className="font-bold" style={{ color: NAVY }}>{s!.attendancePct !== null ? `${s!.attendancePct}%` : "No data"}</span></div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${s!.attendancePct ?? 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Homework Completion</span><span className="font-bold" style={{ color: NAVY }}>{s!.homeworkPct !== null ? `${s!.homeworkPct}%` : "No data"}</span></div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${s!.homeworkPct ?? 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Conversion Rate</span><span className="font-bold text-orange-600">{s!.conversionPct}%</span></div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 rounded-full" style={{ width: `${s!.conversionPct}%` }} /></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Health Score</span><span className="font-bold">{s!.healthScore}/100</span></div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s!.healthScore}%`, background: hc.dot }} /></div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Conversion Rate</span><span className="font-bold text-green-600">{s!.conversionPct}%</span></div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${s!.conversionPct}%` }} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="bg-blue-50 rounded-xl p-3 text-center"><div className="text-lg font-black text-blue-700">{s!.assignedDemoStudents}</div><div className="text-[10px] text-blue-500">Demo Leads</div></div>
                        <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-lg font-black text-green-700">{s!.conversions}</div><div className="text-[10px] text-green-500">Converted</div></div>
                        <div className="bg-red-50 rounded-xl p-3 text-center"><div className="text-lg font-black text-red-700">{s!.assignedDemoStudents - s!.conversions}</div><div className="text-[10px] text-red-500">Active/Dropped</div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Health Score</span><span className="font-bold">{s!.healthScore}/100</span></div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${s!.healthScore}%`, background: hc.dot }} /></div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {profileTab === "timeline" && (
                profile.recentFollowUps.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No follow-up activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.recentFollowUps.map(f => (
                      <div key={f.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5 bg-blue-400" />
                        <div className="flex-1 bg-gray-50 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold" style={{ color: NAVY }}>{f.studentName ?? `#${f.studentId}`}</span>
                              {f.callStatus && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{f.callStatus}</span>}
                              {f.leadStatus && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">{f.leadStatus}</span>}
                            </div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(f.createdAt)}</span>
                          </div>
                          {f.note && <p className="text-xs text-gray-600 mt-1">{f.note}</p>}
                          {f.nextFollowUpDate && <p className="text-[10px] text-orange-600 mt-1 font-medium">Next: {new Date(f.nextFollowUpDate).toLocaleDateString("en-IN")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {profileTab === "tasks" && (
                profile.tasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tasks assigned</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        {t.status === "done" ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold ${t.status === "done" ? "line-through text-gray-400" : ""}`} style={t.status !== "done" ? { color: NAVY } : undefined}>{t.title}</div>
                          {t.dueDate && <div className="text-[10px] text-gray-400">Due: {new Date(t.dueDate).toLocaleDateString("en-IN")}</div>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.status === "done" ? "bg-green-100 text-green-700" : t.status === "overdue" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CreateMentorModal({ onClose, onCreated, flash }: { onClose: () => void; onCreated: () => void; flash: (msg: string, ok?: boolean) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mentorType, setMentorType] = useState<"academic" | "sales">("academic");
  const [creating, setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phone || !password) return;
    setCreating(true);
    const r = await apiFetch("/admin/mentors", { method: "POST", body: JSON.stringify({ name, email, phone, password, mentorType }) });
    setCreating(false);
    if (r.ok) { flash(`Mentor ${name} created!`); onCreated(); onClose(); }
    else { const d = await r.json().catch(() => ({})); flash(d.error ?? "Failed", false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-base" style={{ color: NAVY }}>Add New Mentor</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Full Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Email *</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mentor@braintam.com" required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Phone *</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: NAVY }}>Password *</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>Mentor Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: "academic" as const, l: "📚 Academic", c: GREEN }, { v: "sales" as const, l: "💼 Sales (SSM)", c: "#D97706" }].map(t => (
                <button key={t.v} type="button" onClick={() => setMentorType(t.v)}
                  className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all"
                  style={{ borderColor: mentorType === t.v ? t.c : "#E5E7EB", background: mentorType === t.v ? `${t.c}15` : "white", color: mentorType === t.v ? t.c : "#6B7280" }}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={creating} className="flex-1 text-white" style={{ background: GREEN }}>
              {creating ? "Creating…" : "Create Mentor"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignToBatchModal({ mentors, onClose, flash }: { mentors: EnrichedMentor[]; onClose: () => void; flash: (msg: string, ok?: boolean) => void }) {
  const [batches, setBatches] = useState<{ id: number; title: string; grade: number | null; subject: string | null }[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/admin/demo-batches").then(r => r.ok ? r.json() : []).then(setBatches);
  }, []);

  async function assign() {
    if (!selectedMentorId || !selectedBatchId) return;
    const mentor = mentors.find(m => m.id === Number(selectedMentorId));
    if (!mentor) return;
    setSaving(true);
    const r = await apiFetch(`/admin/demo-batches/${selectedBatchId}`, {
      method: "PUT",
      body: JSON.stringify({ mentorName: mentor.name, mentorId: mentor.id }),
    });
    setSaving(false);
    if (r.ok) { flash("Mentor assigned to batch!"); onClose(); }
    else flash("Failed to assign mentor", false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-base" style={{ color: NAVY }}>Assign Mentor to Batch</h3>
            <p className="text-xs text-gray-400 mt-0.5">Link a mentor to a demo batch</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">Select Mentor</label>
            <select value={selectedMentorId} onChange={e => setSelectedMentorId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-blue-400">
              <option value="">— Choose a mentor —</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.name} ({m.mentorType === "sales" ? "Sales" : "Academic"})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 block">Select Demo Batch</label>
            <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-blue-400">
              <option value="">— Choose a batch —</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.title}{b.grade ? ` (Grade ${b.grade})` : ""}{b.subject ? ` — ${b.subject}` : ""}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={assign} disabled={!selectedMentorId || !selectedBatchId || saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: NAVY }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Assign Mentor"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkUpdateModal({ mentors, onClose, onDone, flash }: { mentors: EnrichedMentor[]; onClose: () => void; onDone: () => void; flash: (msg: string, ok?: boolean) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(id: number) {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }
  function selectAll() { setSelected(new Set(mentors.map(m => m.id))); }
  function clearAll() { setSelected(new Set()); }

  async function bulkSetActive(active: boolean) {
    if (!selected.size) return;
    setSaving(true);
    await Promise.all([...selected].map(id =>
      apiFetch(`/admin/mentors/${id}`, { method: "PATCH", body: JSON.stringify({ isActive: active }) })
    ));
    setSaving(false);
    flash(`${selected.size} mentor(s) ${active ? "enabled" : "disabled"}!`);
    onDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-base" style={{ color: NAVY }}>Bulk Update Mentors</h3>
            <p className="text-xs text-gray-400 mt-0.5">{selected.size} of {mentors.length} selected</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold text-gray-600 transition-all">Select All</button>
          <button onClick={clearAll} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold text-gray-600 transition-all">Clear</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1">
          {mentors.map(m => (
            <label key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-all">
              <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="w-4 h-4 rounded accent-blue-600 flex-shrink-0" />
              <Avatar name={m.name} size={7} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate" style={{ color: NAVY }}>{m.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {m.isActive ? "Active" : "Inactive"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: m.mentorType === "sales" ? "#FFFBEB" : "#ECFDF5", color: m.mentorType === "sales" ? "#D97706" : "#059669" }}>
                {m.mentorType === "sales" ? "Sales" : "Academic"}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={() => bulkSetActive(false)} disabled={!selected.size || saving}
            className="flex-1 py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-40 transition-all">
            Disable Selected
          </button>
          <button onClick={() => bulkSetActive(true)} disabled={!selected.size || saving}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: GREEN }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Enable Selected"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;

export function MentorsTab({ flash, users }: { flash: (msg: string, ok?: boolean) => void; users: { id: number; name: string; role: string; grade: number; isActive: boolean }[] }) {
  const [mentors, setMentors] = useState<EnrichedMentor[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "academic" | "sales" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "healthScore", dir: "desc" });
  const [page, setPage] = useState(1);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mRes, sRes, aRes] = await Promise.all([
      apiFetch("/admin/mentors/enriched"),
      apiFetch("/admin/mentors/dashboard-stats"),
      apiFetch("/admin/mentors/alerts"),
    ]);
    if (mRes.ok) setMentors(await mRes.json());
    if (sRes.ok) setStats(await sRes.json());
    if (aRes.ok) setAlerts(await aRes.json());
    setLoading(false);
  }, []);

  async function convertMentorType(mentorId: number, mentorName: string, currentType: string) {
    const toSales = currentType !== "sales";
    const targetType = toSales ? "sales" : "academic";
    const label = toSales ? "Ignite (Sales)" : "Mastery (Academic)";
    if (!window.confirm(`Move ${mentorName} to ${label}?\n\nThis will change their mentor type and reassign their leads accordingly.`)) return;
    const r = await apiFetch(`/admin/mentors/${mentorId}`, {
      method: "PATCH",
      body: JSON.stringify({ mentorType: targetType }),
    });
    if (r.ok) { flash(`${mentorName} moved to ${label}!`, true); loadData(); }
    else { const d = await r.json().catch(() => ({})); flash(d.error ?? "Failed to update mentor type", false); }
  }

  useEffect(() => { loadData(); }, [loadData]);

  function handleSort(key: SortKey) {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
    setPage(1);
  }

  const filtered = useMemo(() => {
    let list = [...mentors];
    if (activeTab === "academic") list = list.filter(m => (m.mentorType ?? "academic") === "academic");
    else if (activeTab === "sales") list = list.filter(m => m.mentorType === "sales");
    else if (activeTab === "inactive") list = list.filter(m => !m.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phone ?? "").includes(q));
    }
    if (typeFilter !== "all") list = list.filter(m => m.mentorType === typeFilter);
    if (statusFilter !== "all") list = list.filter(m => statusFilter === "active" ? m.isActive : !m.isActive);
    if (workloadFilter !== "all") list = list.filter(m => m.workload.toLowerCase() === workloadFilter);
    list.sort((a, b) => {
      const va = a[sort.key] ?? 0;
      const vb = b[sort.key] ?? 0;
      if (typeof va === "string" && typeof vb === "string") {
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sort.dir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
    return list;
  }, [mentors, activeTab, search, typeFilter, workloadFilter, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hDist = stats?.healthDistribution ?? { excellent: 0, good: 0, average: 0, needsAttention: 0 };
  const hTotal = hDist.excellent + hDist.good + hDist.average + hDist.needsAttention;

  const donutData = [
    { label: "Excellent", value: hDist.excellent, color: "#22C55E" },
    { label: "Good", value: hDist.good, color: "#3B82F6" },
    { label: "Average", value: hDist.average, color: "#F59E0B" },
    { label: "Needs Attention", value: hDist.needsAttention, color: "#EF4444" },
  ];

  const wDist = stats?.workloadDistribution ?? { low: 0, medium: 0, high: 0 };

  function exportCSV() {
    const header = "Name,Email,Phone,Type,Assigned Students,Demo Students,Conversions,Conv%,Att%,HW%,Health,Workload,Status";
    const rows = filtered.map(m =>
      [m.name, m.email, m.phone ?? "", m.mentorType, m.assignedStudents, m.assignedDemoStudents, m.conversions,
       m.conversionPct, m.attendancePct ?? "", m.homeworkPct ?? "", m.healthLabel, m.workload, m.isActive ? "Active" : "Inactive"].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mentors.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const TABS = [
    { key: "all" as const, label: "All Mentors", count: mentors.length },
    { key: "academic" as const, label: "Academic Mentors", count: stats?.academic ?? 0 },
    { key: "sales" as const, label: "Sales Mentors", count: stats?.sales ?? 0 },
    { key: "inactive" as const, label: "Inactive", count: stats?.inactive ?? 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg" style={{ color: NAVY }}>Mentor Management Center</h3>
          <p className="text-xs text-gray-500">Manage academic and sales mentors · track performance, workload &amp; alerts</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <div className="relative">
            <button onClick={() => setShowBulkMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all">
              <MoreVertical className="w-3.5 h-3.5" /> Bulk Actions
            </button>
            {showBulkMenu && (
              <div className="absolute right-0 top-9 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-48">
                <button onClick={() => { setShowBulkMenu(false); setShowAssign(true); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <Users className="w-3.5 h-3.5 text-blue-500" /> Assign to Batch
                </button>
                <button onClick={() => { setShowBulkMenu(false); setShowBulk(true); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <GraduationCap className="w-3.5 h-3.5 text-orange-500" /> Enable / Disable
                </button>
                <button onClick={() => { setShowBulkMenu(false); exportCSV(); }} className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5 text-green-500" /> Export Current View
                </button>
              </div>
            )}
          </div>
          <button onClick={loadData} className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
            style={{ background: ORANGE }}>
            <Plus className="w-3.5 h-3.5" /> Add Mentor
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard icon={<Users className="w-5 h-5" />} label="Total Mentors" value={stats?.total ?? 0} sub="View all mentors" color={NAVY} bg="#EEF2FF" />
          <StatCard icon={<BookOpen className="w-5 h-5" />} label="Academic Mentors" value={stats?.academic ?? 0} sub={`${stats?.total ? Math.round(((stats.academic ?? 0) / stats.total) * 100) : 0}% of total`} color="#7C3AED" bg="#F5F3FF" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Sales Mentors" value={stats?.sales ?? 0} sub={`${stats?.total ? Math.round(((stats.sales ?? 0) / stats.total) * 100) : 0}% of total`} color="#D97706" bg="#FFFBEB" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Active Mentors" value={stats?.active ?? 0} sub={`${stats?.total ? Math.round(((stats.active ?? 0) / stats.total) * 100) : 0}% of total`} color={GREEN} bg="#ECFDF5" />
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Inactive Mentors" value={stats?.inactive ?? 0} sub={`${stats?.total ? Math.round(((stats.inactive ?? 0) / stats.total) * 100) : 0}% of total`} color="#DC2626" bg="#FEF2F2" />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FFF7ED" }}>
              <Trophy className="w-5 h-5" style={{ color: ORANGE }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 font-medium">Top Performer (Sales)</div>
              {stats?.topPerformer ? (
                <>
                  <div className="text-sm font-black leading-tight truncate" style={{ color: NAVY }}>{stats.topPerformer.name}</div>
                  <div className="text-[10px] text-orange-500 font-bold">{stats.topPerformer.convPct}% Conversion</div>
                </>
              ) : <div className="text-xs text-gray-400 mt-0.5">—</div>}
            </div>
          </div>
        </div>
      )}

      {/* Main content: table + sidebar */}
      <div className="flex gap-4 items-start">
        {/* Left: table area */}
        <div ref={tableRef} className="flex-1 min-w-0 space-y-3">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-200">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activeTab === t.key ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                {t.label} <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeTab === t.key ? "#DBEAFE" : "#F3F4F6", color: activeTab === t.key ? "#1D4ED8" : "#6B7280" }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email or phone…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400 bg-white" />
            </div>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
              <option value="all">Type: All</option>
              <option value="academic">Academic</option>
              <option value="sales">Sales (SSM)</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={workloadFilter} onChange={e => { setWorkloadFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white outline-none focus:border-blue-400">
              <option value="all">Workload: All</option>
              <option value="low">Healthy</option>
              <option value="medium">Busy</option>
              <option value="high">Overloaded</option>
            </select>
            {(search || typeFilter !== "all" || statusFilter !== "all" || workloadFilter !== "all") && (
              <button onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setWorkloadFilter("all"); setPage(1); }}
                className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 bg-white" title="Reset filters">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <UserCheck2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No mentors found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or add a new mentor</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-3"><SortHeader label="Mentor" sortKey="name" currentSort={sort} onSort={handleSort} /></th>
                        <th className="text-left px-3 py-3"><SortHeader label="Type" sortKey="mentorType" currentSort={sort} onSort={handleSort} /></th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Students / Leads</th>
                        <th className="text-center px-3 py-3"><SortHeader label="Performance" sortKey="healthScore" currentSort={sort} onSort={handleSort} /></th>
                        <th className="text-center px-3 py-3"><SortHeader label="Workload" sortKey="workload" currentSort={sort} onSort={handleSort} /></th>
                        <th className="text-center px-3 py-3"><SortHeader label="Last Login" sortKey="lastLoginAt" currentSort={sort} onSort={handleSort} /></th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map(m => {
                        const hc = healthColor(m.healthLabel);
                        const wc = workloadColor(m.workload);
                        const isSales = m.mentorType === "sales";
                        return (
                          <tr key={m.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setProfileId(m.id)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={m.name} size={8} />
                                <div>
                                  <div className="text-xs font-bold" style={{ color: NAVY }}>{m.name}</div>
                                  <div className="text-[10px] text-gray-400">{m.email}</div>
                                  {m.phone && <div className="text-[10px] text-gray-400">{m.phone}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: isSales ? "#FFFBEB" : "#ECFDF5", color: isSales ? "#D97706" : "#059669" }}>
                                {isSales ? "💼 Sales" : "📚 Academic"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="text-sm font-black" style={{ color: NAVY }}>
                                {isSales ? (m.assignedDemoStudents || "—") : (m.assignedStudents || "—")}
                              </div>
                              <div className="text-[10px] text-gray-400">{isSales ? "demo leads" : "students"}</div>
                              {isSales && m.conversions > 0 && (
                                <div className="text-[10px] text-green-600 font-bold">{m.conversions} converted</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="text-sm font-black" style={{ color: hc.text }}>{m.healthScore}%</div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: hc.bg, color: hc.text }}>{m.healthLabel}</span>
                              {isSales ? (
                                <div className="text-[10px] text-gray-400 mt-0.5">Conv: {m.conversionPct > 0 ? `${m.conversionPct}%` : "—"}</div>
                              ) : (
                                <div className="text-[10px] text-gray-400 mt-0.5">Att: {m.attendancePct !== null ? `${m.attendancePct}%` : "—"}</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: wc.bg, color: wc.text }}>
                                {workloadDisplay(m.workload)}
                              </span>
                              <div className="text-[10px] text-gray-400 mt-1">
                                {isSales ? m.assignedDemoStudents : m.assignedStudents} / 60
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-[10px] text-gray-500">{timeAgo(m.lastLoginAt)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {m.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => setProfileId(m.id)}
                                  className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all" title="View profile">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {isSales ? (
                                  <button
                                    onClick={() => convertMentorType(m.id, m.name, m.mentorType)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all hover:shadow-sm"
                                    style={{ borderColor: "#059669", color: "#059669", background: "#F0FDF4" }}
                                    title="Move to Mastery (change to Academic mentor)">
                                    <GraduationCap className="w-3 h-3" /> Ignite → Mastery
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => convertMentorType(m.id, m.name, m.mentorType)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all hover:shadow-sm"
                                    style={{ borderColor: "#D97706", color: "#D97706", background: "#FFFBEB" }}
                                    title="Move to Ignite (change to Sales mentor)">
                                    <TrendingUp className="w-3 h-3" /> Mastery → Ignite
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-500">Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} mentors</span>
                  <div className="flex items-center gap-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-all">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p = i + 1;
                      if (totalPages > 5) {
                        if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                      }
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p === page ? "text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-100"}`}
                          style={p === page ? { background: NAVY } : undefined}>{p}</button>
                      );
                    })}
                    <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select value={PAGE_SIZE} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-500 outline-none">
                    <option value={10}>10 / page</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Health Overview */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h4 className="font-black text-xs mb-3" style={{ color: NAVY }}>Mentor Health Overview</h4>
            <div className="flex items-center gap-4">
              <DonutChart data={donutData} />
              <div className="space-y-1.5 flex-1">
                {donutData.map(d => (
                  <div key={d.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[10px] text-gray-600">{d.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold" style={{ color: NAVY }}>{d.value}</span>
                      <span className="text-[10px] text-gray-400 ml-1">{hTotal > 0 ? Math.round((d.value / hTotal) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mentor Workload */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h4 className="font-black text-xs mb-3" style={{ color: NAVY }}>Mentor Workload</h4>
            <div className="space-y-2.5">
              {[
                { label: "0–50% (Low)", value: wDist.low, max: stats?.total ?? 1, color: "#22C55E" },
                { label: "51–80% (Medium)", value: wDist.medium, max: stats?.total ?? 1, color: "#F59E0B" },
                { label: "81–100% (High)", value: wDist.high, max: stats?.total ?? 1, color: "#EF4444" },
              ].map(w => (
                <div key={w.label}>
                  <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500">{w.label}</span><span className="font-bold" style={{ color: NAVY }}>{w.value}</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${w.max > 0 ? (w.value / w.max) * 100 : 0}%`, background: w.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Academic Mentors */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-xs" style={{ color: NAVY }}>🏆 Top Academic Mentors</h4>
              <span className="text-[10px] text-gray-400">by Health Score</span>
            </div>
            {(stats?.topAcademicMentors ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No academic mentors yet</p>
            ) : (
              <div className="space-y-2">
                {(stats?.topAcademicMentors ?? []).map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-all" onClick={() => setProfileId(m.id)}>
                    <span className="w-5 text-xs font-black text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <Avatar name={m.name} size={6} />
                    <span className="flex-1 text-xs font-semibold truncate" style={{ color: NAVY }}>{m.name}</span>
                    <span className="text-xs font-black" style={{ color: healthColor(m.healthScore >= 85 ? "Excellent" : m.healthScore >= 70 ? "Good" : m.healthScore >= 50 ? "Average" : "Needs Attention").text }}>{m.healthScore}%</span>
                  </div>
                ))}
                <button onClick={() => { setActiveTab("academic"); setSort({ key: "healthScore", dir: "desc" }); setPage(1); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="w-full text-center text-[10px] text-blue-500 hover:text-blue-600 font-semibold mt-1 pt-1 border-t border-gray-100 transition-colors">
                  View All Academic →
                </button>
              </div>
            )}
          </div>

          {/* Top Sales Mentors */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-black text-xs" style={{ color: NAVY }}>🏆 Top Sales Mentors</h4>
              <span className="text-[10px] text-gray-400">by Conv%</span>
            </div>
            {(stats?.topSalesMentors ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No sales mentors yet</p>
            ) : (
              <div className="space-y-2">
                {(stats?.topSalesMentors ?? []).map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1 transition-all" onClick={() => setProfileId(m.id)}>
                    <span className="w-5 text-xs font-black text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <Avatar name={m.name} size={6} />
                    <span className="flex-1 text-xs font-semibold truncate" style={{ color: NAVY }}>{m.name}</span>
                    <span className="text-xs font-black text-green-600">{m.convPct}%</span>
                  </div>
                ))}
                <button onClick={() => { setActiveTab("sales"); setSort({ key: "conversionPct", dir: "desc" }); setPage(1); tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className="w-full text-center text-[10px] text-blue-500 hover:text-blue-600 font-semibold mt-1 pt-1 border-t border-gray-100 transition-colors">
                  View All Sales →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Quick Insights */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h4 className="font-black text-xs mb-3 flex items-center gap-2" style={{ color: NAVY }}>
            <Zap className="w-3.5 h-3.5 text-orange-500" /> Mentor Quick Insights
          </h4>
          <div className="space-y-2.5">
            {[
              { label: "Total Leads (Demo)", value: stats?.quickInsights.totalDemoLeads ?? 0, color: NAVY, icon: <Users className="w-3.5 h-3.5" /> },
              { label: "Total Conversions", value: `${stats?.quickInsights.totalConversions ?? 0}  This month`, color: GREEN, icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: "Overall Conversion %", value: `${stats?.quickInsights.overallConversionPct ?? 0}%  This month`, color: ORANGE, icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { label: "Avg. Attendance (Academic)", value: `${stats?.quickInsights.avgAttendancePct ?? 0}%  Across all academic mentors`, color: "#7C3AED", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
            ].map(ins => (
              <div key={ins.label} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${ins.color}15`, color: ins.color }}>
                  {ins.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold" style={{ color: NAVY }}>{typeof ins.value === "number" ? ins.value : ins.value.split("  ")[0]}</div>
                  <div className="text-[10px] text-gray-400">{typeof ins.value === "string" ? (ins.value.split("  ")[1] ?? ins.label) : ins.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h4 className="font-black text-xs mb-3 flex items-center gap-2" style={{ color: NAVY }}>
            <Activity className="w-3.5 h-3.5 text-blue-500" /> Recent Activities
          </h4>
          {!stats?.recentActivity.length ? (
            <p className="text-xs text-gray-400 text-center py-4">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {stats.recentActivity.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-700 leading-snug">
                      <span className="font-bold" style={{ color: NAVY }}>{a.mentorName}</span> {a.note.length > 40 ? a.note.slice(0, 40) + "…" : a.note}
                    </p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{timeAgo(a.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h4 className="font-black text-xs mb-3 flex items-center gap-2" style={{ color: NAVY }}>
            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Alerts &amp; Notifications
          </h4>
          {!alerts ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                {
                  label: "No login ≥ 7 days",
                  count: alerts.noLoginDays.length,
                  names: alerts.noLoginDays.slice(0, 2).map(m => m.name),
                  color: "#DC2626", bg: "#FEF2F2",
                  icon: <CalendarDays className="w-3.5 h-3.5" />,
                  onClick: () => { setSearch(""); setPage(1); },
                },
                {
                  label: "Overloaded mentors",
                  count: alerts.overloaded.length,
                  names: alerts.overloaded.slice(0, 2).map(m => m.name),
                  color: "#D97706", bg: "#FFFBEB",
                  icon: <Flame className="w-3.5 h-3.5" />,
                  onClick: () => { setWorkloadFilter("high"); setPage(1); },
                },
                {
                  label: "Academic: no students",
                  count: alerts.noStudents.length,
                  names: alerts.noStudents.slice(0, 2).map(m => m.name),
                  color: "#7C3AED", bg: "#F5F3FF",
                  icon: <Users className="w-3.5 h-3.5" />,
                  onClick: () => { setTypeFilter("academic"); setPage(1); },
                },
                {
                  label: "Sales: low conversion (<10%)",
                  count: alerts.lowConversion.length,
                  names: alerts.lowConversion.slice(0, 2).map(m => m.name),
                  color: "#0B2B6B", bg: "#EEF2FF",
                  icon: <TrendingUp className="w-3.5 h-3.5" />,
                  onClick: () => { setTypeFilter("sales"); setSort({ key: "conversionPct", dir: "asc" }); setPage(1); },
                },
                {
                  label: "Sales: no demo leads",
                  count: alerts.noLeads.length,
                  names: alerts.noLeads.slice(0, 2).map(m => m.name),
                  color: "#0891B2", bg: "#ECFEFF",
                  icon: <Star className="w-3.5 h-3.5" />,
                  onClick: () => { setTypeFilter("sales"); setPage(1); },
                },
              ].map(alert => (
                <button key={alert.label} onClick={alert.onClick}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${alert.count > 0 ? "border-opacity-50 hover:opacity-90" : "border-gray-100 opacity-50"}`}
                  style={alert.count > 0 ? { background: alert.bg, borderColor: alert.color + "40" } : undefined}
                  disabled={alert.count === 0}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: alert.count > 0 ? alert.color + "20" : "#F3F4F6", color: alert.count > 0 ? alert.color : "#9CA3AF" }}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: alert.count > 0 ? alert.color : "#9CA3AF" }}>{alert.label}</span>
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${alert.count > 0 ? "text-white" : "bg-gray-100 text-gray-400"}`}
                        style={alert.count > 0 ? { background: alert.color } : undefined}>
                        {alert.count}
                      </span>
                    </div>
                    {alert.count > 0 && alert.names.length > 0 && (
                      <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {alert.names.join(", ")}{alert.count > 2 ? ` +${alert.count - 2} more` : ""}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Drawer */}
      {profileId !== null && (
        <ProfileDrawer mentorId={profileId} onClose={() => setProfileId(null)} flash={flash} />
      )}

      {/* Create Mentor Modal */}
      {showCreate && (
        <CreateMentorModal onClose={() => setShowCreate(false)} onCreated={loadData} flash={flash} />
      )}

      {/* Assign to Batch Modal */}
      {showAssign && (
        <AssignToBatchModal mentors={mentors} onClose={() => setShowAssign(false)} flash={flash} />
      )}

      {/* Bulk Update Modal */}
      {showBulk && (
        <BulkUpdateModal mentors={mentors} onClose={() => setShowBulk(false)} onDone={loadData} flash={flash} />
      )}
    </div>
  );
}
