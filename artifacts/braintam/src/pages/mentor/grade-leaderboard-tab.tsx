import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
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
  assignedCount: number; convertedCount: number; conversionRate: number;
}
interface ApiResp {
  grade: number; myGrades: number[]; leaderboard: LeaderboardRow[];
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Dense ranking: 1, 1, 2 (not 1, 1, 3)
function denseRank(rows: LeaderboardRow[]) {
  let rank = 1;
  return rows.map((row, i) => {
    if (i > 0 && rows[i].conversionRate < rows[i - 1].conversionRate) rank = i + 1;
    return { ...row, denseRank: rank };
  });
}

export function GradeLeaderboardTab({ myId }: { myId: number }) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [data, setData]                   = useState<ApiResp | null>(null);
  const [loading, setLoading]             = useState(false);
  const [initialised, setInitialised]     = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await apiFetch("/mentor/sales/leaderboard/grade?grade=1");
        if (!r.ok) return;
        const d = await r.json() as ApiResp;
        const primary = d.myGrades.length > 0 ? d.myGrades[0] : 1;
        if (primary !== 1) {
          const r2 = await apiFetch(`/mentor/sales/leaderboard/grade?grade=${primary}`);
          if (r2.ok) { setData(await r2.json() as ApiResp); setSelectedGrade(primary); return; }
        }
        setData(d); setSelectedGrade(1);
      } finally { setLoading(false); setInitialised(true); }
    })();
  }, []);

  const fetchGrade = useCallback(async (grade: number) => {
    setLoading(true);
    try {
      const r = await apiFetch(`/mentor/sales/leaderboard/grade?grade=${grade}`);
      if (r.ok) setData(await r.json() as ApiResp);
    } finally { setLoading(false); }
  }, []);

  function switchGrade(g: number) {
    if (g === selectedGrade) return;
    setSelectedGrade(g); fetchGrade(g);
  }

  const lb       = data?.leaderboard ?? [];
  const myGrades = data?.myGrades ?? [];
  const ranked   = denseRank(lb);
  const myRow    = ranked.find(r => r.mentorId === myId);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Grade tabs ── */}
      <div className="shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="font-black text-sm" style={{ color: NAVY }}>🏆 Leaderboard</span>
          <button onClick={() => selectedGrade && fetchGrade(selectedGrade)}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-4 py-3 scrollbar-hide">
          {GRADES.map(g => {
            const active   = g === selectedGrade;
            const hasLeads = myGrades.includes(g);
            return (
              <button key={g} onClick={() => switchGrade(g)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: active ? NAVY : hasLeads ? "#EEF2FF" : "#F3F4F6",
                  color:      active ? "#fff" : hasLeads ? NAVY : "#9CA3AF",
                  border: `1.5px solid ${active ? NAVY : hasLeads ? `${NAVY}40` : "#E5E7EB"}`,
                }}>
                Grade {g}
                {hasLeads && !active && (
                  <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle"
                    style={{ background: ORANGE }} />
                )}
              </button>
            );
          })}
        </div>
      </div>


      {/* ── List ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: NAVY }} />
          </div>
        ) : lb.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <div className="text-3xl mb-2">📚</div>
            No leads assigned for Grade {selectedGrade} yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            style={{ boxShadow: "0 2px 12px rgba(11,43,107,0.07)" }}>
            {ranked.map((row, idx) => {
              const isMe = row.mentorId === myId;
              const isTop = row.denseRank <= 3;
              const rankColor =
                row.denseRank === 1 ? "#D97706" :
                row.denseRank === 2 ? "#9CA3AF" :
                row.denseRank === 3 ? "#B45309" : "#CBD5E1";

              return (
                <div key={row.mentorId}
                  className="grid items-center px-5 py-4 transition-colors"
                  style={{
                    gridTemplateColumns: "36px 1fr 52px",
                    borderBottom: idx < ranked.length - 1 ? "1px solid #F1F5F9" : "none",
                    background: isMe ? "#FFFBF5" : "#fff",
                  }}>

                  {/* Rank */}
                  <div className="text-left">
                    <span className={`font-black leading-none ${isTop ? "text-lg" : "text-sm"}`}
                      style={{ color: isTop ? rankColor : "#CBD5E1" }}>
                      {row.denseRank}
                    </span>
                  </div>

                  {/* Name — centered */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold text-sm truncate"
                      style={{ color: isMe ? ORANGE : NAVY }}>
                      {row.mentorName}
                    </span>
                    {isMe && (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-black"
                        style={{ background: "#FED7AA", color: ORANGE }}>
                        You
                      </span>
                    )}
                  </div>

                  {/* Conversion % */}
                  <div className="text-right font-black text-sm tabular-nums"
                    style={{ color: isTop && row.conversionRate > 0 ? rankColor : row.conversionRate > 0 ? "#059669" : "#9CA3AF" }}>
                    {row.conversionRate}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
