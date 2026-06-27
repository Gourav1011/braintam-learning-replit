import { useState, useEffect, useCallback } from "react";
import { Trophy, RefreshCw, Loader2 } from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

interface LeaderboardRow {
  rank: number;
  mentorId: number;
  mentorName: string;
  assigned: number;
  converted: number;
  convPct: number;
}

interface ApiResp {
  cycle: { id: number; weekLabel: string; startDate: string } | null;
  leaderboard: LeaderboardRow[];
}

const MEDAL = ["🥇", "🥈", "🥉"];
const GRADE_TABS = [
  { key: 0,  label: "All" },
  ...Array.from({ length: 10 }, (_, i) => ({ key: i + 1, label: `Gr ${i + 1}` })),
];

export function GradeLeaderboardTab({ myId }: { myId: number }) {
  const [data, setData]       = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade]     = useState(0); // 0 = All

  const load = useCallback(async (g: number) => {
    setLoading(true);
    try {
      const url = g === 0
        ? "/mentor/sales/leaderboard"
        : `/mentor/sales/leaderboard?grade=${g}`;
      const r = await apiFetch(url);
      if (r.ok) setData(await r.json() as ApiResp);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(grade); }, [load, grade]);

  const lb = data?.leaderboard ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
        <div>
          <span className="font-black text-base flex items-center gap-2" style={{ color: NAVY }}>
            <Trophy className="w-5 h-5" style={{ color: ORANGE }} /> Leaderboard
          </span>
          {data?.cycle ? (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {data.cycle.weekLabel} · from {new Date(data.cycle.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">Current cycle only</p>
          )}
        </div>
        <button onClick={() => load(grade)} disabled={loading}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Grade tabs */}
      <div className="shrink-0 px-4 pb-3 overflow-x-auto">
        <div className="flex gap-1.5 w-max">
          {GRADE_TABS.map(tab => {
            const active = grade === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setGrade(tab.key)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap"
                style={{
                  background: active ? NAVY : "white",
                  color: active ? "white" : "#6B7280",
                  borderColor: active ? NAVY : "#E5E7EB",
                  boxShadow: active ? `0 2px 8px ${NAVY}25` : "none",
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
          </div>
        ) : lb.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <div className="text-3xl mb-2">🏆</div>
            {data?.cycle
              ? "No leads assigned in this cycle yet."}
          </div>
        ) : (
          <>
            {/* Simple ranked table — no podium */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white"
              style={{ boxShadow: "0 2px 16px rgba(11,43,107,0.07)" }}>
              {/* Header row */}
              <div className="grid items-center px-5 py-2.5 border-b border-gray-200"
                style={{ gridTemplateColumns: "52px 1fr 72px", background: "#F8FAFF" }}>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center">Rank</div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center">Name</div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Conv %</div>
              </div>

              {lb.map((row, idx) => {
                const isMe = row.mentorId === myId;
                return (
                  <div key={row.mentorId}
                    className="grid items-center px-5 py-3.5"
                    style={{
                      gridTemplateColumns: "52px 1fr 72px",
                      borderBottom: "1px solid #F1F5F9",
                      background: isMe ? "#FFFBF5" : "#fff",
                    }}>
                    <div className="text-base text-center">
                      {idx < 3 ? MEDAL[idx] : <span className="font-bold text-sm" style={{ color: NAVY }}>#{row.rank}</span>}
                    </div>
                    <div className="font-semibold text-sm text-gray-900 text-center truncate">
                      {row.mentorName}{isMe ? <span className="text-[10px] font-bold ml-1" style={{ color: ORANGE }}>(You)</span> : ""}
                    </div>
                    <div className="text-right font-black text-sm tabular-nums" style={{ color: ORANGE }}>
                      {row.convPct}%
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[10px] text-gray-400">
              ↺ Resets when admin starts a new deployment
            </p>
          </>
        )}
      </div>
    </div>
  );
}
