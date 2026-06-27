import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Trophy } from "lucide-react";
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

function denseRank(rows: LeaderboardRow[]) {
  let rank = 1;
  return rows.map((row, i) => {
    if (i > 0 && rows[i].conversionRate < rows[i - 1].conversionRate) rank = i + 1;
    return { ...row, denseRank: rank };
  });
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-2xl">🥇</span>
    </div>
  );
  if (rank === 2) return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-2xl">🥈</span>
    </div>
  );
  if (rank === 3) return (
    <div className="flex flex-col items-center leading-none">
      <span className="text-2xl">🥉</span>
    </div>
  );
  return (
    <span className="font-black text-base" style={{ color: NAVY }}>
      {rank}
    </span>
  );
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

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Title + Refresh ── */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-2">
        <span className="font-black text-base flex items-center gap-2" style={{ color: NAVY }}>
          🏆 Leaderboard
        </span>
        <button
          onClick={() => selectedGrade && fetchGrade(selectedGrade)}
          disabled={loading}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Grade tabs ── */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {GRADES.map(g => {
            const active = g === selectedGrade;
            return (
              <button
                key={g}
                onClick={() => switchGrade(g)}
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap border"
                style={{
                  background: active ? NAVY : "#fff",
                  color:      active ? "#fff" : "#374151",
                  borderColor: active ? NAVY : "#D1D5DB",
                  borderBottomWidth: active ? "2px" : "1px",
                  borderBottomColor: active ? ORANGE : "#D1D5DB",
                }}
              >
                Grade {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
          <div className="rounded-2xl overflow-hidden border border-gray-200"
            style={{ boxShadow: "0 2px 16px rgba(11,43,107,0.09)" }}>

            {/* Header */}
            <div
              className="grid items-center px-5 py-3"
              style={{ gridTemplateColumns: "64px 1fr 80px", background: NAVY }}
            >
              <div className="text-xs font-black text-white uppercase tracking-widest">S.No</div>
              <div className="text-xs font-black text-white uppercase tracking-widest text-center">Name</div>
              <div className="text-xs font-black text-white uppercase tracking-widest text-right">Conv. %</div>
            </div>

            {/* Rows */}
            {ranked.map((row, idx) => {
              const isMe  = row.mentorId === myId;
              const isTop = row.denseRank <= 3;

              return (
                <div
                  key={row.mentorId}
                  className="grid items-center px-5 py-4 transition-colors"
                  style={{
                    gridTemplateColumns: "64px 1fr 80px",
                    borderBottom: idx < ranked.length - 1 ? "1px solid #F1F5F9" : "none",
                    background: isMe ? "#FFFBF5" : "#fff",
                  }}
                >
                  {/* Rank / Medal */}
                  <div className="flex items-center">
                    <MedalIcon rank={row.denseRank} />
                  </div>

                  {/* Name */}
                  <div className="flex items-center justify-center gap-2 min-w-0">
                    <span
                      className="font-semibold text-sm truncate"
                      style={{ color: isMe ? ORANGE : NAVY }}
                    >
                      {row.mentorName}
                    </span>
                    {isMe && (
                      <span
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded-md font-bold"
                        style={{ background: ORANGE, color: "#fff" }}
                      >
                        You
                      </span>
                    )}
                  </div>

                  {/* Conv % */}
                  <div
                    className="text-right font-black text-sm tabular-nums"
                    style={{ color: ORANGE }}
                  >
                    {row.conversionRate}%
                  </div>
                </div>
              );
            })}

            {/* Footer note */}
            <div
              className="flex items-center gap-2.5 px-5 py-3 text-xs text-gray-500"
              style={{ background: "#FFF8F3", borderTop: "1px solid #F1F5F9" }}
            >
              <Trophy className="w-4 h-4 shrink-0" style={{ color: NAVY }} />
              <span>Leaderboard is based on Conversion % (Converted Leads ÷ Assigned Leads × 100)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
