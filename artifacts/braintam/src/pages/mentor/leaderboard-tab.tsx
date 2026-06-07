import { useState, useEffect, useCallback } from "react";
import { Trophy, Medal, RefreshCw, Phone, MessageSquare, Users, BookOpen, TrendingUp } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
}

interface LeaderboardEntry {
  id: number;
  name: string;
  mentorType: string | null;
  callsThisWeek: number;
  followUpsThisWeek: number;
  doubtSessionsThisWeek: number;
  studentsEngaged: number;
  studentsAssigned: number;
  score: number;
  rank: number;
}

const MEDAL = ["🥇", "🥈", "🥉"];
const PERIOD_LABELS = { week: "This Week", month: "This Month", all: "All Time" };

export function LeaderboardTab({ myId }: { myId: number }) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch(`/mentor/leaderboard?period=${period}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const myEntry = data.find(e => e.id === myId);
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black flex items-center gap-2" style={{ color: NAVY }}>
            <Trophy className="w-5 h-5" style={{ color: ORANGE }} /> Mentor Leaderboard
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Rankings based on calls, follow-ups, doubt sessions, and student engagement</p>
        </div>
        <div className="flex items-center gap-1">
          {(["week", "month", "all"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period === p ? "text-white" : "text-gray-500 bg-white border border-gray-200"}`}
              style={period === p ? { background: NAVY } : {}}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
          <button onClick={load} className="p-1.5 rounded-lg bg-white border border-gray-200 ml-1">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* My rank banner */}
      {myEntry && myEntry.rank > 3 && (
        <div className="rounded-2xl border-2 p-3 flex items-center justify-between" style={{ borderColor: ORANGE, background: `${ORANGE}08` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: ORANGE }}>
              #{myEntry.rank}
            </div>
            <div>
              <div className="font-black text-sm" style={{ color: NAVY }}>Your Rank: #{myEntry.rank}</div>
              <div className="text-[10px] text-gray-500">Score: {myEntry.score} pts · {PERIOD_LABELS[period]}</div>
            </div>
          </div>
          <div className="flex gap-3 text-xs text-gray-600">
            <div className="text-center"><div className="font-black" style={{ color: NAVY }}>{myEntry.callsThisWeek}</div><div className="text-[10px] text-gray-400">Calls</div></div>
            <div className="text-center"><div className="font-black" style={{ color: NAVY }}>{myEntry.followUpsThisWeek}</div><div className="text-[10px] text-gray-400">FU</div></div>
            <div className="text-center"><div className="font-black" style={{ color: NAVY }}>{myEntry.doubtSessionsThisWeek}</div><div className="text-[10px] text-gray-400">DS</div></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Loading leaderboard…</div>
      ) : data.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
          <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400">No activity data yet for this period</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {top3.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-end justify-center gap-4">
                {/* Reorder: 2nd, 1st, 3rd */}
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, idx) => {
                  const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
                  const isMe = entry.id === myId;
                  return (
                    <div key={entry.id} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-2xl">{MEDAL[podiumRank - 1]}</div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg ${isMe ? "ring-2 ring-offset-2" : ""}`}
                        style={{ background: podiumRank === 1 ? "#F59E0B" : podiumRank === 2 ? "#9CA3AF" : "#CD7F32", ...(isMe ? { outline: `2px solid ${ORANGE}`, outlineOffset: "2px" } : {}) }}>
                        {entry.name[0]}
                      </div>
                      <div className="text-center">
                        <div className={`text-xs font-black ${isMe ? "" : ""}`} style={{ color: NAVY }}>{entry.name.split(" ")[0]}{isMe ? " (You)" : ""}</div>
                        <div className="text-[10px] text-gray-400">{entry.score} pts</div>
                        {entry.mentorType && (
                          <div className="text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-semibold" style={{ background: entry.mentorType === "sales" ? "#FEF3C7" : "#ECFDF5", color: entry.mentorType === "sales" ? "#D97706" : "#059669" }}>
                            {entry.mentorType}
                          </div>
                        )}
                      </div>
                      <div className={`w-full rounded-t-xl flex items-center justify-center ${heights[podiumRank as 1|2|3]}`}
                        style={{ background: podiumRank === 1 ? "#FEF3C7" : podiumRank === 2 ? "#F3F4F6" : "#FEF9C3" }}>
                        <span className="font-black text-lg" style={{ color: podiumRank === 1 ? "#D97706" : "#6B7280" }}>#{podiumRank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full ranked list */}
          {rest.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-gray-100" style={{ background: "#F8FAFF" }}>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500">Mentor</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500"><Phone className="w-3 h-3 inline" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500"><MessageSquare className="w-3 h-3 inline" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500"><BookOpen className="w-3 h-3 inline" /></th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-500"><Users className="w-3 h-3 inline" /></th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500">Score</th>
                </tr></thead>
                <tbody>
                  {rest.map(entry => {
                    const isMe = entry.id === myId;
                    return (
                      <tr key={entry.id} className={`border-b border-gray-50 ${isMe ? "" : "hover:bg-gray-50"}`}
                        style={isMe ? { background: `${ORANGE}08`, outline: `1px solid ${ORANGE}` } : {}}>
                        <td className="px-4 py-2.5 font-bold" style={{ color: NAVY }}>#{entry.rank}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                              style={{ background: isMe ? ORANGE : NAVY }}>{entry.name[0]}</div>
                            <div>
                              <div className="font-semibold" style={{ color: NAVY }}>{entry.name}{isMe ? " (You)" : ""}</div>
                              {entry.mentorType && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: entry.mentorType === "sales" ? "#FEF3C7" : "#ECFDF5", color: entry.mentorType === "sales" ? "#D97706" : "#059669" }}>
                                  {entry.mentorType}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold" style={{ color: GREEN }}>{entry.callsThisWeek}</td>
                        <td className="px-3 py-2.5 text-center font-semibold" style={{ color: NAVY }}>{entry.followUpsThisWeek}</td>
                        <td className="px-3 py-2.5 text-center font-semibold" style={{ color: "#6366F1" }}>{entry.doubtSessionsThisWeek}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500">{entry.studentsAssigned}</td>
                        <td className="px-4 py-2.5 text-right font-black" style={{ color: isMe ? ORANGE : NAVY }}>{entry.score}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Scoring guide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">How points are scored</p>
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
              {[["Call logged", "3 pts"], ["Follow-up done", "2 pts"], ["Doubt session", "4 pts"], ["EOD report", "5 pts"], ["Parent call", "2 pts"]].map(([label, pts]) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="font-semibold" style={{ color: NAVY }}>{pts}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
