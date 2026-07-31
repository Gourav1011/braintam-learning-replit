import { useState, useEffect, useCallback } from "react";
import {
  Rocket, Users, CheckCircle, XCircle, TrendingUp, ChevronDown,
  RefreshCw, History, Clock, Phone, Award, X, Check,
  Inbox, UserCheck,
} from "lucide-react";

import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeployStats {
  undeployedLeads: number;
  activeMentors:   number;
  assignedLeads:   number;
  convertedLeads:  number;
  lostLeads:       number;
}

interface DeployMentor {
  id:              number;
  name:            string;
  email:           string;
  isActive:        boolean;
  status:          string;   // Active | On Leave | Inactive
  currentLeads:    number;
  todaysFollowUps: number;
  conversionRate:  number;
}

interface IgniteV2Batch {
  id: number;
  title: string | null;
  grade: number | null;
  batchCode: string | null;
  weekNumber: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

interface DeploymentGroup {
  mentorName: string | null;
  leadCount:  number;
}

interface DeploymentRow {
  id:                 number;
  batchCode:          string | null;
  grade:              number | null;
  totalLeads:         number;
  mentorCount:        number;
  distributionMethod: string;
  createdByName:      string | null;
  createdAt:          string;
  status:             string;
  groups:             DeploymentGroup[];
}

// ── Equal distribution helper ─────────────────────────────────────────────────

function equalDistribution(total: number, mentors: DeployMentor[]): { mentor: DeployMentor; leads: number }[] {
  const m = mentors.length;
  if (m === 0) return [];
  const base = Math.floor(total / m);
  const rem  = total % m;
  return mentors.map((mentor, i) => ({ mentor, leads: base + (i < rem ? 1 : 0) }));
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: number | string; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="font-black text-xl leading-tight" style={{ color: NAVY }}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ── Mentor status badge ────────────────────────────────────────────────────────

function MentorBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    "Active":   { bg: "#D1FAE5", color: "#065F46" },
    "On Leave": { bg: "#FEF3C7", color: "#92400E" },
    "Inactive": { bg: "#F3F4F6", color: "#6B7280" },
  };
  const s = map[status] ?? map["Inactive"];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  grade, undeployed, selectedMentors, onClose, onDeploy, deploying,
}: {
  grade: number | null;
  undeployed: number;
  selectedMentors: DeployMentor[];
  onClose: () => void;
  onDeploy: () => void;
  deploying: boolean;
}) {
  const distribution = equalDistribution(undeployed, selectedMentors);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-black text-base" style={{ color: NAVY }}>
            🚀 Deployment Preview
          </span>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Summary */}
        <div className="p-5 space-y-4">
          <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "#F5F7FF" }}>
            <div className="flex justify-between"><span className="text-gray-500">Grade:</span> <span className="font-bold" style={{ color: NAVY }}>{grade ? `Grade ${grade}` : "All Grades"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Undeployed Leads:</span> <span className="font-bold" style={{ color: ORANGE }}>{undeployed}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Selected Mentors:</span> <span className="font-bold" style={{ color: NAVY }}>{selectedMentors.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Distribution Method:</span> <span className="font-bold text-green-600">Equal Distribution</span></div>
          </div>

          {/* Per-mentor distribution */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Lead Distribution</p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {distribution.map(({ mentor, leads }) => (
                <div key={mentor.id} className="flex items-center justify-between py-2 px-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
                      style={{ background: NAVY }}>{mentor.name[0]}</div>
                    <span className="text-sm font-semibold text-gray-800">{mentor.name}</span>
                  </div>
                  <span className="font-black text-sm" style={{ color: ORANGE }}>→ {leads} Leads</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} disabled={deploying}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onDeploy} disabled={deploying || undeployed === 0}
            className="flex-1 py-3 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2"
            style={{
              background: deploying || undeployed === 0 ? "#94a3b8" : `linear-gradient(90deg,${NAVY},#0a3d8c)`,
              boxShadow: deploying || undeployed === 0 ? "none" : "0 6px 20px rgba(11,43,107,0.35)",
            }}>
            {deploying ? <><RefreshCw className="w-4 h-4 animate-spin" /> Deploying…</> : <><Rocket className="w-4 h-4" /> Deploy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Batch Detail Drawer ────────────────────────────────────────────────────────

function BatchDetailDrawer({ batch, onClose }: { batch: DeploymentRow; onClose: () => void }) {
  const fmtDate = (d: string) => new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white w-full max-w-sm h-full shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <span className="font-black text-base" style={{ color: NAVY }}>Batch Details</span>
            {batch.batchCode && <div className="text-xs font-bold mt-0.5" style={{ color: ORANGE }}>{batch.batchCode}</div>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "#F5F7FF" }}>
            <div className="flex justify-between"><span className="text-gray-500">Grade:</span> <span className="font-bold" style={{ color: NAVY }}>{batch.grade ? `Grade ${batch.grade}` : "All Grades"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Leads:</span> <span className="font-bold" style={{ color: ORANGE }}>{batch.totalLeads}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mentors:</span> <span className="font-bold" style={{ color: NAVY }}>{batch.mentorCount}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Method:</span> <span className="font-bold text-green-600 capitalize">{batch.distributionMethod}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created By:</span> <span className="font-bold" style={{ color: NAVY }}>{batch.createdByName ?? "Admin"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created At:</span> <span className="font-semibold text-gray-700">{fmtDate(batch.createdAt)}</span></div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Distribution</p>
            <div className="space-y-1.5">
              {batch.groups.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
                      style={{ background: NAVY }}>{(g.mentorName ?? "?")[0]}</div>
                    <span className="text-sm font-semibold text-gray-800">{g.mentorName ?? "Unknown"}</span>
                  </div>
                  <span className="font-black text-sm" style={{ color: ORANGE }}>→ {g.leadCount} Leads</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main: Lead Deployment View ────────────────────────────────────────────────

export function LeadDeploymentView({ flash }: { flash: (m: string, ok?: boolean) => void }) {
  const [subView, setSubView] = useState<"deploy" | "history">("deploy");

  // Stats
  const [stats, setStats]   = useState<DeployStats>({ undeployedLeads: 0, activeMentors: 0, assignedLeads: 0, convertedLeads: 0, lostLeads: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Grade selection
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  // Mentors
  const [mentors, setMentors]     = useState<DeployMentor[]>([]);
  const [mentorsLoading, setMentorsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Deploy
  const [showPreview, setShowPreview] = useState(false);
  const [deploying, setDeploying]     = useState(false);

  // History
  const [history, setHistory]         = useState<DeploymentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [detailBatch, setDetailBatch] = useState<DeploymentRow | null>(null);

  // Deployment Cycle
  type Cycle = { id: number; weekLabel: string; startDate: string; status: string; createdByName: string | null; createdAt: string };
  const [cycle, setCycle]             = useState<Cycle | null>(null);
  const [cycleLoading, setCycleLoading] = useState(true);
  const [startingNewWeek, setStartingNewWeek] = useState(false);
  const [v2Batch, setV2Batch] = useState<IgniteV2Batch | null>(null);
  const [v2DeploymentId, setV2DeploymentId] = useState<number | null>(null);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [undoingDeployment, setUndoingDeployment] = useState(false);
  const [startingBatch, setStartingBatch] = useState(false);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const q = selectedGrade ? `?grade=${selectedGrade}` : "";
      const r = await apiFetch(`/admin/ignite/deploy/stats${q}`);
      if (r.ok) setStats(await r.json() as DeployStats);
    } finally { setStatsLoading(false); }
  }, [selectedGrade]);

  // Load mentors
  const loadMentors = useCallback(async () => {
    setMentorsLoading(true);
    try {
      const r = await apiFetch("/admin/ignite/deploy/mentors");
      if (r.ok) {
        const data = await r.json() as DeployMentor[];
        setMentors(data);
        const active = new Set(data.filter(m => m.isActive && m.status === "Active").map(m => m.id));
        setSelectedIds(active);
      }
    } finally { setMentorsLoading(false); }
  }, []);

  // Load history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await apiFetch("/admin/ignite/deployments");
      if (r.ok) setHistory(await r.json() as DeploymentRow[]);
    } finally { setHistoryLoading(false); }
  }, []);

  // Load current deployment cycle
  const loadCycle = useCallback(async () => {
    setCycleLoading(true);
    try {
      const r = await apiFetch("/admin/mentor/cycles");
      if (r.ok) {
        const cycles = await r.json() as Cycle[];
        setCycle(cycles.find(c => c.status === "active") ?? null);
      }
    } finally { setCycleLoading(false); }
  }, []);

  async function doStartNewWeek() {
    if (!window.confirm("Start a new deployment week? The current cycle will be archived. Existing lead assignments are preserved.")) return;
    setStartingNewWeek(true);
    try {
      const r = await apiFetch("/admin/mentor/cycles/start-new-week", { method: "POST", body: JSON.stringify({}) });
      const d = await r.json() as { ok?: boolean; cycle?: Cycle; error?: string };
      if (d.ok && d.cycle) {
        flash(`✅ New week started: ${d.cycle.weekLabel}`, true);
        setCycle(d.cycle);
      } else {
        flash(d.error ?? "Failed to start new week", false);
      }
    } catch { flash("Network error", false); }
    finally { setStartingNewWeek(false); }
  }


  async function createV2Batch() {
    if (!selectedGrade) {
      flash("Select one grade first.", false);
      return;
    }

    setCreatingBatch(true);

    try {
      const r = await apiFetch("/admin/ignite/v2/batches/create-next", {
        method: "POST",
        body: JSON.stringify({ grade: selectedGrade }),
      });

      const d = await r.json() as {
        ok?: boolean;
        batch?: IgniteV2Batch;
        error?: string;
        detail?: string;
      };

      if (!r.ok || !d.batch) {
        flash(d.error ?? d.detail ?? "Could not create weekly batch", false);
        return;
      }

      setV2Batch(d.batch);
      setV2DeploymentId(null);

      flash(
        `✅ ${d.batch.title ?? `Grade ${selectedGrade}`} created (${d.batch.batchCode ?? "new batch"})`,
        true,
      );
    } catch {
      flash("Network error while creating weekly batch", false);
    } finally {
      setCreatingBatch(false);
    }
  }

  async function attachV2Deployment(batchId: number, deploymentId: number) {
    const r = await apiFetch(
      `/admin/ignite/v2/batches/${batchId}/attach-deployment`,
      {
        method: "POST",
        body: JSON.stringify({ deploymentId }),
      },
    );

    const d = await r.json() as {
      ok?: boolean;
      status?: string;
      students?: number;
      error?: string;
    };

    if (!r.ok || !d.ok) {
      throw new Error(d.error ?? "Deployment created but could not attach to weekly batch");
    }

    setV2Batch(prev => prev ? { ...prev, status: d.status ?? "deployed" } : prev);
    setV2DeploymentId(deploymentId);
  }

  async function undoV2Deployment() {
    if (!v2Batch) return;

    if (!window.confirm(
      `Undo deployment for ${v2Batch.batchCode ?? v2Batch.title ?? "this batch"}? Leads will return to the undeployed pool.`,
    )) return;

    setUndoingDeployment(true);

    try {
      const r = await apiFetch(
        `/admin/ignite/v2/batches/${v2Batch.id}/undo-deployment`,
        { method: "POST", body: JSON.stringify({}) },
      );

      const d = await r.json() as {
        ok?: boolean;
        status?: string;
        releasedStudents?: number;
        error?: string;
      };

      if (!r.ok || !d.ok) {
        flash(d.error ?? "Undo failed", false);
        return;
      }

      setV2Batch(prev => prev ? { ...prev, status: d.status ?? "upcoming" } : prev);
      setV2DeploymentId(null);

      await loadStats();

      flash(`↩️ Deployment undone. ${d.releasedStudents ?? 0} leads released.`, true);
    } catch {
      flash("Network error while undoing deployment", false);
    } finally {
      setUndoingDeployment(false);
    }
  }

  async function startV2Batch() {
    if (!v2Batch) return;

    if (!window.confirm(
      `Start ${v2Batch.batchCode ?? v2Batch.title ?? "this batch"}? The previous running batch for Grade ${v2Batch.grade} will close.`,
    )) return;

    setStartingBatch(true);

    try {
      const r = await apiFetch(
        `/admin/ignite/v2/batches/${v2Batch.id}/start`,
        { method: "POST", body: JSON.stringify({}) },
      );

      const d = await r.json() as {
        ok?: boolean;
        status?: string;
        nextDraft?: IgniteV2Batch | null;
        error?: string;
      };

      if (!r.ok || !d.ok) {
        flash(d.error ?? "Could not start batch", false);
        return;
      }

      setV2Batch(prev => prev ? { ...prev, status: "active" } : prev);

      const next = d.nextDraft?.batchCode
        ? ` Next draft: ${d.nextDraft.batchCode}.`
        : "";

      flash(`✅ Batch started.${next}`, true);
    } catch {
      flash("Network error while starting batch", false);
    } finally {
      setStartingBatch(false);
    }
  }

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadMentors(); }, [loadMentors]);
  useEffect(() => { if (subView === "history") loadHistory(); }, [subView, loadHistory]);
  useEffect(() => { loadCycle(); }, [loadCycle]);

  // Select all toggle
  const eligibleMentors = mentors.filter(m => m.isActive && m.status === "Active");
  const allSelected = eligibleMentors.length > 0 && eligibleMentors.every(m => selectedIds.has(m.id));
  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleMentors.map(m => m.id)));
    }
  }
  function toggleMentor(id: number) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  // Deploy
  async function doDeploy() {
    if (!selectedGrade) {
      flash("Select one grade before deployment.", false);
      return;
    }

    if (!v2Batch) {
      flash("Create the weekly batch first.", false);
      return;
    }

    if (v2Batch.status !== "upcoming") {
      flash(`Batch is already ${v2Batch.status}.`, false);
      return;
    }

    if (selectedIds.size === 0) {
      flash("Please select at least one mentor.", false);
      return;
    }

    setDeploying(true);

    try {
      const r = await apiFetch("/admin/ignite/deploy", {
        method: "POST",
        body: JSON.stringify({
          grade: selectedGrade,
          mentorIds: Array.from(selectedIds),
        }),
      });

      const d = await r.json() as {
        ok?: boolean;
        deployed?: number;
        deploymentId?: number;
        batchCode?: string;
        message?: string;
        error?: string;
      };

      if (!r.ok || !d.ok) {
        flash(d.message ?? d.error ?? "Deployment failed", false);
        return;
      }

      if (!d.deploymentId) {
        flash(
          "Leads were deployed, but the server did not return deploymentId. Do not Start this batch yet.",
          false,
        );
        return;
      }

      await attachV2Deployment(v2Batch.id, d.deploymentId);

      flash(
        `✅ ${d.deployed ?? 0} leads deployed to ${v2Batch.batchCode ?? v2Batch.title}. Review before Start.`,
        true,
      );

      setShowPreview(false);
      await loadStats();
      await loadHistory();

    } catch (error) {
      flash(
        error instanceof Error ? error.message : "Network error during deployment",
        false,
      );
    } finally {
      setDeploying(false);
    }
  }

  const selectedMentorList = mentors.filter(m => selectedIds.has(m.id));
  const canPreview =
    selectedGrade !== null &&
    v2Batch !== null &&
    v2Batch.status === "upcoming" &&
    selectedIds.size > 0 &&
    stats.undeployedLeads > 0;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  return (
    <div className="flex flex-col gap-4">

      {/* ── Page title ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Lead Deployment</h1>
          <p className="text-xs text-gray-400 mt-0.5">Distribute undeployed leads to active sales mentors</p>
        </div>
        <button onClick={() => { loadStats(); loadMentors(); loadCycle(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* ── Weekly Deployment Cycle Banner ── */}
      {!cycleLoading && (
        <div className="flex items-center justify-between p-3 rounded-xl border"
          style={{ background: cycle ? "#EFF6FF" : "#FFF7ED", borderColor: cycle ? "#BFDBFE" : "#FED7AA" }}>
          <div className="min-w-0">
            <div className="text-xs font-black" style={{ color: cycle ? "#1D4ED8" : ORANGE }}>
              {cycle ? `📅 Active Week: ${cycle.weekLabel}` : "⚠️ No active deployment week"}
            </div>
            <div className="text-[10px] mt-0.5 text-gray-500">
              {cycle
                ? `Started ${new Date(cycle.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · Mentors see only this week's leads in their queue`
                : "Start a new week so deployed leads are tracked in a cycle and mentors see only this week's queue"}
            </div>
          </div>
          <button onClick={doStartNewWeek} disabled={startingNewWeek}
            className="ml-4 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
            style={{ background: cycle ? NAVY : ORANGE }}>
            {startingNewWeek ? "Starting…" : cycle ? "Start New Week" : "Start First Week"}
          </button>
        </div>
      )}

      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Undeployed Leads" value={statsLoading ? "…" : stats.undeployedLeads} icon={Inbox}      color="#D97706" bg="#FEF3C7" />
        <KpiCard label="Active Mentors"   value={statsLoading ? "…" : stats.activeMentors}   icon={Users}      color={GREEN}   bg="#D1FAE5" />
        <KpiCard label="Assigned Leads"   value={statsLoading ? "…" : stats.assignedLeads}   icon={UserCheck}  color={NAVY}    bg="#EEF2FF" />
        <KpiCard label="Converted Leads"  value={statsLoading ? "…" : stats.convertedLeads}  icon={TrendingUp} color={GREEN}   bg="#D1FAE5" />
        <KpiCard label="Lost Leads"       value={statsLoading ? "…" : stats.lostLeads}       icon={XCircle}    color="#DC2626" bg="#FEE2E2" />
      </div>

      {/* ── Sub-view tabs ── */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm self-start">
        {(["deploy", "history"] as const).map(v => (
          <button key={v} onClick={() => setSubView(v)}
            className="px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all"
            style={subView === v ? { background: NAVY, color: "#fff" } : { color: "#6B7280" }}>
            {v === "deploy" ? "🚀 Deploy Leads" : "📋 History"}
          </button>
        ))}
      </div>

      {/* ── Deploy panel ── */}
      {subView === "deploy" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left column: Step 1 + Step 3 */}
          <div className="space-y-4">
            {/* Step 1 — Grade */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center" style={{ background: NAVY }}>1</div>
                <span className="font-extrabold text-sm" style={{ color: NAVY }}>Select Grade</span>
              </div>
              <div className="relative">
                <select
                  value={selectedGrade ?? ""}
                  onChange={e => {
                    setSelectedGrade(e.target.value ? Number(e.target.value) : null);
                    setV2Batch(null);
                    setV2DeploymentId(null);
                  }}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold bg-white outline-none focus:border-blue-400 cursor-pointer"
                  style={{ color: NAVY }}>
                  <option value="">Select Grade</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {!statsLoading && (
                <div className="mt-3 rounded-xl p-3 space-y-1.5" style={{ background: "#F5F7FF" }}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Undeployed Leads:</span>
                    <span className="font-black" style={{ color: ORANGE }}>{stats.undeployedLeads}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Active Mentors:</span>
                    <span className="font-bold" style={{ color: GREEN }}>{stats.activeMentors}</span>
                  </div>
                </div>
              )}
            </div>


            {/* Step 2 — Weekly Ignite Batch */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
                  style={{ background: NAVY }}
                >
                  2
                </div>
                <span className="font-extrabold text-sm" style={{ color: NAVY }}>
                  Ignite Booster Course
                </span>
              </div>

              {!selectedGrade ? (
                <div className="text-xs text-gray-500 rounded-xl p-3 bg-gray-50">
                  Select a grade to prepare its weekly batch.
                </div>
              ) : !v2Batch ? (
                <>
                  <div className="text-xs text-gray-500 mb-3">
                    Prepare the next weekly batch for Grade {selectedGrade}.
                    Existing running batches are not changed.
                  </div>

                  <button
                    onClick={createV2Batch}
                    disabled={creatingBatch}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: NAVY }}
                  >
                    {creatingBatch
                      ? "Creating…"
                      : `Create Next Week — Grade ${selectedGrade}`}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "#F5F7FF" }}
                  >
                    <div className="font-black text-sm" style={{ color: NAVY }}>
                      {v2Batch.title ?? `Grade ${selectedGrade}`}
                    </div>

                    <div
                      className="text-xs font-bold mt-0.5"
                      style={{ color: ORANGE }}
                    >
                      {v2Batch.batchCode}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-500">Status</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{
                          background:
                            v2Batch.status === "active"
                              ? "#D1FAE5"
                              : v2Batch.status === "deployed"
                                ? "#DBEAFE"
                                : "#FEF3C7",
                          color:
                            v2Batch.status === "active"
                              ? "#065F46"
                              : v2Batch.status === "deployed"
                                ? "#1D4ED8"
                                : "#92400E",
                        }}
                      >
                        {v2Batch.status === "upcoming"
                          ? "Draft"
                          : v2Batch.status}
                      </span>
                    </div>
                  </div>

                  {v2Batch.status === "deployed" && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-gray-500">
                        Deployment complete. Review mentor assignments before
                        starting the batch.
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={undoV2Deployment}
                          disabled={undoingDeployment || startingBatch}
                          className="py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 disabled:opacity-50"
                        >
                          {undoingDeployment ? "Undoing…" : "Undo Deployment"}
                        </button>

                        <button
                          onClick={startV2Batch}
                          disabled={undoingDeployment || startingBatch}
                          className="py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: GREEN }}
                        >
                          {startingBatch ? "Starting…" : "Start Batch"}
                        </button>
                      </div>
                    </div>
                  )}

                  {v2Batch.status === "active" && (
                    <div className="text-xs font-bold text-green-700 rounded-xl p-3 bg-green-50">
                      ✓ Batch is running.
                    </div>
                  )}

                  {v2DeploymentId && (
                    <div className="text-[10px] text-gray-400">
                      Deployment #{v2DeploymentId}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3 — Distribution Method */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center" style={{ background: NAVY }}>3</div>
                <span className="font-extrabold text-sm" style={{ color: NAVY }}>Distribution Method</span>
              </div>
              <div className="space-y-2">
                {[
                  { value: "equal", label: "Equal Distribution", desc: "Max 1 lead difference between mentors", enabled: true },
                  { value: "capacity", label: "Capacity Based", desc: "Coming soon", enabled: false },
                  { value: "manual",  label: "Manual Distribution", desc: "Coming soon", enabled: false },
                ].map(opt => (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${opt.enabled ? "hover:border-blue-300" : "opacity-40 cursor-not-allowed"}`}
                    style={{ borderColor: opt.value === "equal" ? NAVY : "#E5E7EB", background: opt.value === "equal" ? "#EEF2FF" : "#fff" }}>
                    <input type="radio" name="distribMethod" value={opt.value} defaultChecked={opt.value === "equal"} disabled={!opt.enabled} className="mt-0.5" />
                    <div>
                      <div className="text-xs font-bold" style={{ color: opt.enabled ? NAVY : "#9CA3AF" }}>{opt.label}</div>
                      <div className="text-[10px] text-gray-400">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview + Deploy CTA */}
            <button
              onClick={() => {
                if (!selectedGrade) { flash("Select a grade first.", false); return; }
                if (!v2Batch) { flash("Create the weekly batch first.", false); return; }
                if (v2Batch.status !== "upcoming") { flash(`Batch is already ${v2Batch.status}.`, false); return; }
                if (selectedIds.size === 0) { flash("Please select at least one mentor.", false); return; }
                if (stats.undeployedLeads === 0) { flash("No undeployed leads for this grade.", false); return; }
                setShowPreview(true);
              }}
              disabled={!canPreview}
              className="w-full py-3.5 rounded-xl font-extrabold text-white text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: canPreview ? `linear-gradient(90deg,${ORANGE},#e85d12)` : "#94a3b8",
                boxShadow: canPreview ? "0 6px 20px rgba(255,107,26,0.4)" : "none",
                cursor: canPreview ? "pointer" : "not-allowed",
              }}>
              <Rocket className="w-4 h-4" />
              Preview Distribution
            </button>
          </div>

          {/* Right columns: Step 2 — Mentor Checklist */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center" style={{ background: NAVY }}>4</div>
                <span className="font-extrabold text-sm" style={{ color: NAVY }}>Select Mentors</span>
                <span className="text-xs text-gray-400 ml-1">({selectedIds.size} selected)</span>
              </div>
              {/* Select All */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={toggleSelectAll}
                  className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer"
                  style={{ borderColor: allSelected ? NAVY : "#D1D5DB", background: allSelected ? NAVY : "#fff" }}>
                  {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs font-semibold" style={{ color: NAVY }}>Select All</span>
              </label>
            </div>

            {mentorsLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading mentors…</div>
            ) : mentors.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No sales mentors found. Add mentors first.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mentors.map(m => {
                  const eligible = m.isActive && m.status === "Active";
                  const checked  = selectedIds.has(m.id);
                  return (
                    <div key={m.id}
                      onClick={() => eligible && toggleMentor(m.id)}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${eligible ? "cursor-pointer hover:bg-blue-50/40" : "opacity-50 cursor-not-allowed"}`}
                      style={checked ? { background: "#EEF2FF" } : {}}>

                      {/* Checkbox */}
                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ borderColor: checked ? NAVY : "#D1D5DB", background: checked ? NAVY : "#fff" }}>
                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                        style={{ background: eligible ? NAVY : "#9CA3AF" }}>
                        {m.name[0]}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm" style={{ color: NAVY }}>{m.name}</span>
                          <MentorBadge status={m.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {m.currentLeads} leads</span>
                          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {m.conversionRate}% conv.</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {m.todaysFollowUps} today</span>
                        </div>
                      </div>

                      {/* Will receive (preview) */}
                      {checked && stats.undeployedLeads > 0 && selectedIds.size > 0 && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] text-gray-400">Will receive</div>
                          <div className="font-black text-sm" style={{ color: ORANGE }}>
                            ~{Math.floor(stats.undeployedLeads / selectedIds.size) + (
                              (Array.from(selectedIds).indexOf(m.id) < (stats.undeployedLeads % selectedIds.size)) ? 1 : 0
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History panel ── */}
      {subView === "history" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-extrabold text-sm" style={{ color: NAVY }}>Deployment History</span>
            <button onClick={loadHistory}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading history…</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No deployments yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Batch Code", "Grade", "Leads", "Mentors", "Created By", "Created At", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: ORANGE }}>{row.batchCode ?? `#${row.id}`}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: NAVY }}>{row.grade ? `Grade ${row.grade}` : "All"}</td>
                      <td className="px-4 py-3 font-black" style={{ color: NAVY }}>{row.totalLeads}</td>
                      <td className="px-4 py-3 text-gray-700">{row.mentorCount}</td>
                      <td className="px-4 py-3 text-gray-700">{row.createdByName ?? "Admin"}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: "#D1FAE5", color: "#065F46" }}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailBatch(row)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
                          style={{ color: NAVY }}>
                          <History className="w-3 h-3" /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {showPreview && (
        <PreviewModal
          grade={selectedGrade}
          undeployed={stats.undeployedLeads}
          selectedMentors={selectedMentorList}
          onClose={() => setShowPreview(false)}
          onDeploy={doDeploy}
          deploying={deploying}
        />
      )}

      {/* ── Batch Detail Drawer ── */}
      {detailBatch && (
        <BatchDetailDrawer batch={detailBatch} onClose={() => setDetailBatch(null)} />
      )}
    </div>
  );
}
