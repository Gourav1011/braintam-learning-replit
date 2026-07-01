import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, RefreshCw, UserX, Clock, FileX,
  ChevronUp, ChevronDown, ArrowRight, MessageSquare,
  Wifi, Monitor, Server, Database,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

interface HealthStudent {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  grade: number;
  createdAt?: string;
  lastLoginAt?: string | null;
}
interface HealthData {
  neverLoggedIn: HealthStudent[];
  inactiveStudents: HealthStudent[];
  noTestStudents: HealthStudent[];
  counts: { neverLoggedIn: number; inactiveStudents: number; noTestStudents: number };
}
interface VersionInfo {
  version: string;
  commit: string;
  buildTime: string;
  nodeVersion?: string;
  uptimeSeconds?: number;
}
interface ApiHealth {
  status: string;
  database: boolean;
  frontend: boolean;
}

const AVATAR_COLORS = [
  "#EF4444", "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
  "#EC4899", "#06B6D4", "#14B8A6", "#F97316", "#6366F1",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

function now() {
  return new Date().toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

// ── Compact student row ──────────────────────────────────────────────────────
function StudentRow({ s, sub }: { s: HealthStudent; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
        style={{ background: avatarColor(s.name) }}
      >
        {s.name[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold truncate" style={{ color: NAVY }}>{s.name}</div>
        <div className="text-[10px] text-gray-400 truncate">{s.grade > 0 ? `Grade ${s.grade}` : "—"} · {sub}</div>
      </div>
    </div>
  );
}

// ── Status dot pill ──────────────────────────────────────────────────────────
function StatusPill({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-100 shadow-sm flex-1 min-w-0">
      <div className={`w-2 h-2 rounded-full shrink-0 ${ok ? "bg-green-500" : "bg-red-500"}`} />
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-gray-400 font-medium leading-none truncate">{label}</span>
        <span className="text-[11px] font-semibold truncate" style={{ color: NAVY }}>{value}</span>
      </div>
    </div>
  );
}

// ── Accordion section ────────────────────────────────────────────────────────
function AccordionSection({
  title, count, icon: Icon, headerBg, headerColor, borderColor, students,
  loading, subText, emptyMsg, onViewAll,
}: {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  headerBg: string;
  headerColor: string;
  borderColor: string;
  students: HealthStudent[];
  loading: boolean;
  subText: (s: HealthStudent) => string;
  emptyMsg: string;
  onViewAll?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const shown = students.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col" style={{ borderColor }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-3 w-full text-left transition-colors hover:brightness-95"
        style={{ background: headerBg }}
      >
        <Icon className="w-4 h-4 shrink-0" style={{ color: headerColor }} />
        <span className="text-xs font-bold flex-1" style={{ color: headerColor }}>
          {title} ({count})
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 shrink-0" style={{ color: headerColor }} />
          : <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: headerColor }} />
        }
      </button>

      {open && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 px-1 py-1">
            {loading ? (
              <div className="py-3 px-3 space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 bg-gray-100 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : shown.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">{emptyMsg}</p>
            ) : (
              shown.map(s => (
                <StudentRow key={s.id} s={s} sub={subText(s)} />
              ))
            )}
          </div>
          {!loading && count > 0 && (
            <button
              onClick={onViewAll}
              className="flex items-center justify-center gap-1 text-[11px] font-semibold py-2.5 border-t border-gray-100 hover:bg-gray-50 transition-colors w-full"
              style={{ color: headerColor }}
            >
              View All {count} Students <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function HealthTab({ onViewStudents }: { onViewStudents?: () => void }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [frontendVer, setFrontendVer] = useState<VersionInfo | null>(null);
  const [backendVer, setBackendVer] = useState<VersionInfo | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [verLoading, setVerLoading] = useState(true);
  const [dateStr, setDateStr] = useState(now());
  const [showCommTools, setShowCommTools] = useState(false);

  const loadVersion = useCallback(async () => {
    setVerLoading(true);
    try {
      const [feRes, beRes, hRes] = await Promise.allSettled([
        fetch(`${API_BASE}/version.json`),
        apiFetch("/version"),
        apiFetch("/health"),
      ]);
      if (feRes.status === "fulfilled" && feRes.value.ok) {
        const ct = feRes.value.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          setFrontendVer(await feRes.value.json() as VersionInfo);
        }
      }
      if (beRes.status === "fulfilled" && beRes.value.ok)
        setBackendVer(await beRes.value.json() as VersionInfo);
      if (hRes.status === "fulfilled" && hRes.value.ok)
        setApiHealth(await hRes.value.json() as ApiHealth);
    } finally {
      setVerLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/admin/health");
      if (r.ok) setData(await r.json() as HealthData);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setDateStr(now());
    void loadData();
    void loadVersion();
  }, [loadData, loadVersion]);

  useEffect(() => { void loadData(); void loadVersion(); }, [loadData, loadVersion]);

  const counts = data?.counts ?? { neverLoggedIn: 0, inactiveStudents: 0, noTestStudents: 0 };
  const totalAtRisk = counts.neverLoggedIn + counts.inactiveStudents + counts.noTestStudents;
  const apiOnline = apiHealth?.status === "ok";
  const dbConnected = apiHealth?.database === true;

  const feVersion = frontendVer?.version ?? (verLoading ? "…" : "N/A");
  const beVersion = backendVer?.version ?? (verLoading ? "…" : "N/A");

  return (
    <div className="space-y-3">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-black leading-tight" style={{ color: NAVY }}>
            Learning Health Dashboard
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Identify students who need attention and take action</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={loading || verLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 bg-white transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || verLoading) ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{dateStr}</span>
        </div>
      </div>

      {/* ── Alert Bar ── */}
      {!loading && totalAtRisk > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-yellow-800">
              {totalAtRisk} students need attention across all categories.
            </span>
            <span className="text-xs text-yellow-700 ml-1">
              Review the lists below and take appropriate action.
            </span>
          </div>
          <button
            onClick={() => setShowCommTools(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-yellow-300 text-yellow-800 bg-white hover:bg-yellow-50 transition-colors shrink-0 shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            View Communication Tools
          </button>
        </div>
      )}

      {/* ── KPI Cards (4 in a row) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Never Logged In", value: counts.neverLoggedIn, icon: UserX, color: "#EF4444", bg: "#FEF2F2" },
          { label: "Inactive 7+ Days", value: counts.inactiveStudents, icon: Clock, color: ORANGE, bg: "#FFF7ED" },
          { label: "No Test Activity", value: counts.noTestStudents, icon: FileX, color: "#8B5CF6", bg: "#F5F3FF" },
          { label: "Total Attention Required", value: totalAtRisk, icon: AlertTriangle, color: NAVY, bg: "#EEF2FF" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              {loading
                ? <div className="h-5 w-10 bg-gray-100 rounded animate-pulse mb-1" />
                : <div className="text-xl font-black leading-none" style={{ color }}>{value}</div>
              }
              <div className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5 truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── System Status (single compact row) ── */}
      <div className="flex gap-2 flex-wrap">
        <StatusPill
          ok={apiOnline}
          label="API Status"
          value={verLoading ? "…" : apiOnline ? "Online" : "Offline"}
        />
        <StatusPill
          ok={!!frontendVer}
          label="Frontend"
          value={feVersion}
        />
        <StatusPill
          ok={!!backendVer}
          label="Backend"
          value={beVersion}
        />
        <StatusPill
          ok={dbConnected}
          label="Database"
          value={verLoading ? "…" : dbConnected ? "Connected" : "Disconnected"}
        />
      </div>

      {/* ── Student Category Sections (3-column accordion) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <AccordionSection
          title="Never Logged In"
          count={counts.neverLoggedIn}
          icon={UserX}
          headerBg="#FFF5F5"
          headerColor="#DC2626"
          borderColor="#FEE2E2"
          students={data?.neverLoggedIn ?? []}
          loading={loading}
          subText={s => `Grade ${s.grade > 0 ? s.grade : "—"} · Joined ${s.createdAt ? fmtDate(s.createdAt) : "—"}`}
          emptyMsg="All students have logged in."
          onViewAll={onViewStudents}
        />
        <AccordionSection
          title="Inactive 7+ Days"
          count={counts.inactiveStudents}
          icon={Clock}
          headerBg="#FFFBEB"
          headerColor="#D97706"
          borderColor="#FDE68A"
          students={data?.inactiveStudents ?? []}
          loading={loading}
          subText={s => `Grade ${s.grade > 0 ? s.grade : "—"} · Last active ${s.lastLoginAt ? fmtDate(s.lastLoginAt) : "—"}`}
          emptyMsg="All students are active."
          onViewAll={onViewStudents}
        />
        <AccordionSection
          title="No Test Activity"
          count={counts.noTestStudents}
          icon={FileX}
          headerBg="#FAF5FF"
          headerColor="#7C3AED"
          borderColor="#E9D5FF"
          students={data?.noTestStudents ?? []}
          loading={loading}
          subText={s => `Grade ${s.grade > 0 ? s.grade : "—"} · No tests yet`}
          emptyMsg="All students have taken a test."
          onViewAll={onViewStudents}
        />
      </div>

      {/* ── Communication Tools Modal ── */}
      {showCommTools && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCommTools(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5" style={{ color: NAVY }} />
              <h3 className="text-base font-black" style={{ color: NAVY }}>Communication Tools</h3>
              <button onClick={() => setShowCommTools(false)} className="ml-auto text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <div className="space-y-2">
              {[
                { label: "Send Bulk SMS", sub: "Notify never-logged-in students", icon: "📱" },
                { label: "Send Email Campaign", sub: "Reach inactive 7+ day students", icon: "✉️" },
                { label: "WhatsApp Broadcast", sub: "Quick batch message to at-risk students", icon: "💬" },
                { label: "In-App Notification", sub: "Push reminder to all flagged students", icon: "🔔" },
              ].map(({ label, sub, icon }) => (
                <button key={label} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-left transition-colors">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: NAVY }}>{label}</div>
                    <div className="text-[10px] text-gray-400">{sub}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-4">Communication integrations (SMS/WhatsApp) can be configured in Settings.</p>
          </div>
        </div>
      )}
    </div>
  );
}
