import { useState, useEffect, useCallback } from "react";
import { Trophy, RefreshCw, Loader2 } from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";

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
  rank:           number;
  mentorId:       number;
  mentorName:     string;
  assignedCount:  number;
  convertedCount: number;
  conversionRate: number;
}

interface ApiResp {
  grade:       number;
  myGrades:    number[];
  leaderboard: LeaderboardRow[];
}

const MEDALS = ["🥇", "🥈", "🥉"];
const GRADES  = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base font-black shrink-0"
      style={{ background: "#FFD700", color: "#7A5700" }}>
      🥇
    </div>
  );
  if (rank === 2) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base font-black shrink-0"
      style={{ background: "#E5E7EB", color: "#374151" }}>
      🥈
    </div>
  );
  if (rank === 3) return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base font-black shrink-0"
      style={{ background: "#DEB887", color: "#6B3A2A" }}>
      🥉
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
      style={{ background: "#F3F4F6", color: "#6B7280" }}>
      #{rank}
    </div>
  );
}

export function GradeLeaderboardTab({ myId }: { myId: number }) {
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [data, setData]                   = useState<ApiResp | null>(null);
  const [loading, setLoading]             = useState(false);
  const [initialised, setInitialised]     = useState(false);

  // On mount: fetch grade 1 first to discover myGrades, then re-fetch on the mentor's primary grade
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await apiFetch("/mentor/sales/leaderboard/grade?grade=1");
        if (!r.ok) return;
        const d = await r.json() as ApiResp;
        // Default to first grade the mentor has leads in; fall back to 1
        const primaryGrade = d.myGrades.length > 0 ? d.myGrades[0] : 1;
        if (primaryGrade !== 1) {
          // Refetch for the primary grade
          const r2 = await apiFetch(`/mentor/sales/leaderboard/grade?grade=${primaryGrade}`);
          if (r2.ok) {
            const d2 = await r2.json() as ApiResp;
            setData(d2);
            setSelectedGrade(primaryGrade);
          } else {
            setData(d);
            setSelectedGrade(1);
          }
        } else {
          setData(d);
          setSelectedGrade(1);
        }
      } finally {
        setLoading(false);
        setInitialised(true);
      }
    })();
  }, []);

  const fetchGrade = useCallback(async (grade: number) => {
    setLoading(true);
    try {
      const r = await apiFetch(`/mentor/sales/leaderboard/grade?grade=${grade}`);
      if (r.ok) setData(await r.json() as ApiResp);
    } finally {
      setLoading(false);
    }
  }, []);

  function switchGrade(g: number) {
    if (g === selectedGrade) return;
    setSelectedGrade(g);
    fetchGrade(g);
  }

  const lb        = data?.leaderboard ?? [];
  const myGrades  = data?.myGrades ?? [];
  const myRow     = lb.find(r => r.mentorId === myId);
  const iHaveLeadsThisGrade = myGrades.includes(selectedGrade ?? 0);

  // Summary bar: my stats for selected grade
  const myRank       = myRow?.rank ?? null;
  const myConvRate   = myRow?.conversionRate ?? 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Sticky grade tabs ── */}
      <div className="shrink-0 px-4 pt-4 pb-2 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: ORANGE }} />
            <span className="font-black text-sm" style={{ color: NAVY }}>Grade-wise Leaderboard</span>
          </div>
          <button
            onClick={() => selectedGrade && fetchGrade(selectedGrade)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Grade tabs — scrollable horizontal */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {GRADES.map(g => {
            const active    = g === selectedGrade;
            const hasLeads  = myGrades.includes(g);
            return (
              <button
                key={g}
                onClick={() => switchGrade(g)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  background: active ? NAVY : hasLeads ? "#EEF2FF" : "#F3F4F6",
                  color:      active ? "#fff"  : hasLeads ? NAVY     : "#9CA3AF",
                  border: `1.5px solid ${active ? NAVY : hasLeads ? `${NAVY}40` : "#E5E7EB"}`,
                }}>
                Grade {g}
                {hasLeads && !active && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block align-middle"
                    style={{ background: ORANGE }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── My stats banner ── */}
      {initialised && (
        <div className="shrink-0 mx-4 mt-3 rounded-2xl px-4 py-3 flex items-center gap-4"
          style={{ background: `linear-gradient(90deg,${NAVY},#0d3494)` }}>
          <div className="text-center">
            <div className="text-[10px] text-blue-200 font-semibold">My Rank</div>
            <div className="text-xl font-black text-white leading-tight">
              {myRank ? `#${myRank}` : "—"}
            </div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <div className="text-[10px] text-blue-200 font-semibold">My Conversion %</div>
            <div className="text-xl font-black text-white leading-tight">
              {iHaveLeadsThisGrade ? `${myConvRate}%` : "—"}
            </div>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <div className="text-[10px] text-blue-200 font-semibold">Current Grade</div>
            <div className="text-xl font-black leading-tight" style={{ color: ORANGE }}>
              Grade {selectedGrade ?? "—"}
            </div>
          </div>
          <div className="flex-1" />
          {myRow && (
            <div className="text-3xl">
              {MEDALS[(myRow.rank - 1)] ?? ""}
            </div>
          )}
        </div>
      )}

      {/* ── Leaderboard table ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: NAVY }} />
          </div>
        ) : !iHaveLeadsThisGrade && initialised && lb.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            <div className="text-3xl mb-2">📚</div>
            No leads assigned for Grade {selectedGrade} yet.
          </div>
        ) : lb.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            <div className="text-3xl mb-2">📊</div>
            No data for Grade {selectedGrade} yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid text-[11px] font-bold text-gray-400 uppercase tracking-wide px-4 py-2.5 border-b border-gray-50"
              style={{ gridTemplateColumns: "44px 1fr 90px" }}>
              <span>Rank</span>
              <span>Mentor</span>
              <span className="text-right">Conv. %</span>
            </div>

            {/* Rows */}
            {lb.map(row => {
              const isMe = row.mentorId === myId;
              const rankColor =
                row.rank === 1 ? "#B45309" :
                row.rank === 2 ? "#6B7280" :
                row.rank === 3 ? "#7C3A1E" : "#9CA3AF";

              return (
                <div
                  key={row.mentorId}
                  className="grid items-center px-4 py-3 border-b border-gray-50 last:border-0 transition-colors"
                  style={{
                    gridTemplateColumns: "44px 1fr 90px",
                    background: isMe ? "#FFF7ED" : undefined,
                  }}>

                  {/* Rank */}
                  <RankBadge rank={row.rank} />

                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0 pl-1">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ background: isMe ? ORANGE : NAVY }}>
                      {(row.mentorName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm leading-tight truncate"
                        style={{ color: isMe ? ORANGE : NAVY }}>
                        {row.mentorName}
                        {isMe && (
                          <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-black bg-orange-100 text-orange-600 align-middle">You</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {row.convertedCount}/{row.assignedCount} converted
                      </div>
                    </div>
                  </div>

                  {/* Conversion % */}
                  <div className="text-right">
                    <div className="font-black text-sm" style={{ color: row.rank <= 3 ? rankColor : GREEN }}>
                      {row.conversionRate}%
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${row.conversionRate}%`,
                          background: row.rank === 1 ? "#F59E0B" : row.rank === 2 ? "#94A3B8" : row.rank === 3 ? "#CD7F32" : GREEN,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend note */}
        {initialised && myGrades.length > 0 && (
          <p className="text-center text-[10px] text-gray-400 mt-3">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: ORANGE }} />
            Orange dot on tab = you have leads in that grade
          </p>
        )}
      </div>
    </div>
  );
}
