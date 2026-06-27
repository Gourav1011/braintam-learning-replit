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
  rank: number; mentorId: number; mentorName: string;
  assigned: number; converted: number; convPct: number;
}

interface ApiResp {
  cycle: { id: number; weekLabel: string; startDate: string } | null;
  leaderboard: LeaderboardRow[];
}

const MEDAL = ["🥇", "🥈", "🥉"];

export function GradeLeaderboardTab({ myId }: { myId: number }) {
  const [data, setData]       = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/mentor/sales/leaderboard");
      if (r.ok) setData(await r.json() as ApiResp);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lb = data?.leaderboard ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
        <div>
          <span className="font-black text-base flex items-center gap-2" style={{ color: NAVY }}>
            <Trophy className="w-5 h-5" style={{ color: ORANGE }} /> Leaderboard
          </span>
          {data?.cycle ? (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {data.cycle.weekLabel} · from {new Date(data.cycle.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-0.5">Conversion ranking</p>
          )}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
          </div>
        ) : lb.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <div className="text-3xl mb-2">🏆</div>
            No leads assigned in this cycle yet.
          </div>
        ) : (
          <>
            {/* Podium — only when 3+ mentors */}
            {lb.length >= 3 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-end justify-center gap-4">
                  {([lb[1], lb[0], lb[2]] as LeaderboardRow[]).map((entry, idx) => {
                    const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                    const heights: Record<number, string> = { 1: "h-24", 2: "h-16", 3: "h-12" };
                    const bgColors: Record<number, string> = { 1: "#FEF3C7", 2: "#F3F4F6", 3: "#FEF9C3" };
                    const numColors: Record<number, string> = { 1: "#D97706", 2: "#6B7280", 3: "#92400E" };
                    const avatarBg: Record<number, string> = { 1: "#F59E0B", 2: "#9CA3AF", 3: "#CD7F32" };
                    const isMe = entry.mentorId === myId;
                    return (
                      <div key={entry.mentorId} className="flex flex-col items-center gap-2 flex-1">
                        <div className="text-2xl">{MEDAL[podiumRank - 1]}</div>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base"
                          style={{ background: avatarBg[podiumRank], outline: isMe ? `2px solid ${ORANGE}` : "none", outlineOffset: "2px" }}>
                          {(entry.mentorName[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-black" style={{ color: NAVY }}>
                            {entry.mentorName.split(" ")[0]}{isMe ? " (You)" : ""}
                          </div>
                          <div className="text-[10px] font-bold" style={{ color: ORANGE }}>{entry.convPct}%</div>
                        </div>
                        <div className={`w-full rounded-t-xl flex items-center justify-center ${heights[podiumRank]}`}
                          style={{ background: bgColors[podiumRank] }}>
                          <span className="font-black text-lg" style={{ color: numColors[podiumRank] }}>#{podiumRank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full ranked table — Rank | Name | Conv % */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white"
              style={{ boxShadow: "0 2px 16px rgba(11,43,107,0.07)" }}>
              <div className="grid items-center px-5 py-2.5 border-b border-gray-200"
                style={{ gridTemplateColumns: "48px 1fr 80px", background: "#F8FAFF" }}>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Rank</div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Name</div>
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest text-right">Conv %</div>
              </div>

              {lb.map((row, idx) => {
                const isMe = row.mentorId === myId;
                return (
                  <div key={row.mentorId} className="grid items-center px-5 py-3.5"
                    style={{
                      gridTemplateColumns: "48px 1fr 80px",
                      borderBottom: "1px solid #F1F5F9",
                      background: isMe ? "#FFFBF5" : "#fff",
                    }}>
                    <div className="font-bold text-sm" style={{ color: NAVY }}>
                      {idx < 3 ? MEDAL[idx] : `#${row.rank}`}
                    </div>
                    <div className="font-semibold text-sm text-gray-900 truncate">
                      {row.mentorName}{isMe ? " (You)" : ""}
                    </div>
                    <div className="text-right font-black text-sm tabular-nums" style={{ color: ORANGE }}>
                      {row.convPct}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cycle reset note */}
            {data?.cycle && (
              <p className="text-center text-[10px] text-gray-400">
                ↺ Resets automatically when admin starts a new deployment
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
