import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth-provider";
import { AppLayout } from "@/components/layout";
import {
  useGetStudentProgress, getGetStudentProgressQueryKey,
  useGetLeaderboard, getGetLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { Trophy, Star, ChevronRight } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

// ── LEVELS (Space Journey) ────────────────────────────────────────────────

const LEVELS = [
  {
    planet: "🌍", name: "Earth Explorer", minXP: 0, maxXP: 100,
    reward: "🎖 Explorer Badge", rewardXP: "+50 Bonus XP",
    color: "#22c55e", glow: "rgba(34,197,94,0.4)",
    desc: "Every great journey starts on Earth. Complete your first lessons to launch into space!",
    missions: ["Complete 1 homework", "Attend 1 live class", "Score on first test"],
  },
  {
    planet: "🌙", name: "Moon Explorer", minXP: 100, maxXP: 300,
    reward: "🌙 Moon Badge", rewardXP: "+100 Bonus XP",
    color: "#94a3b8", glow: "rgba(148,163,184,0.4)",
    desc: "You've launched! The Moon is your next stop. Keep learning every day to reach it.",
    missions: ["Maintain 3-day streak", "Complete 3 homework", "Attempt 2 tests"],
  },
  {
    planet: "🔴", name: "Mars Explorer", minXP: 300, maxXP: 600,
    reward: "🔴 Mars Badge", rewardXP: "+150 Bonus XP",
    color: "#ef4444", glow: "rgba(239,68,68,0.4)",
    desc: "Mars awaits the brave. Push through challenges and master your subjects!",
    missions: ["Score 70%+ on a test", "7-day streak", "Complete 5 homework"],
  },
  {
    planet: "🪐", name: "Saturn Explorer", minXP: 600, maxXP: 1000,
    reward: "🪐 Saturn Ring", rewardXP: "+200 Bonus XP",
    color: "#f59e0b", glow: "rgba(245,158,11,0.4)",
    desc: "Saturn's rings gleam for the dedicated. You're among the top learners now!",
    missions: ["Reach top 10 on leaderboard", "Complete all weekly missions", "10-day streak"],
  },
  {
    planet: "🌌", name: "Galaxy Master", minXP: 1000, maxXP: 2000,
    reward: "🌌 Galaxy Medal", rewardXP: "+300 Bonus XP",
    color: "#8b5cf6", glow: "rgba(139,92,246,0.4)",
    desc: "You rule the galaxy! Your knowledge spans the stars. Keep climbing!",
    missions: ["Score 90%+ on any test", "Top 5 leaderboard", "30-day streak"],
  },
  {
    planet: "🚀", name: "Universe Champion", minXP: 2000, maxXP: Infinity,
    reward: "🚀 Champion Crown", rewardXP: "+500 Bonus XP",
    color: "#f59e0b", glow: "rgba(245,158,11,0.6)",
    desc: "You are the Universe Champion — the ultimate Braintam learner. Legendary!",
    missions: ["Reach #1 on leaderboard", "Complete full course", "60-day streak"],
  },
];

// ── StarField ─────────────────────────────────────────────────────────────

function StarField() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(40)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1, top: `${(i * 2.5) % 100}%`, left: `${(i * 7.3 + 13) % 100}%`, opacity: 0.3 + (i % 3) * 0.2 }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: (i * 0.15) % 3 }}
        />
      ))}
    </div>
  );
}

// ── Space Journey tab ─────────────────────────────────────────────────────

function SpaceJourneyTab() {
  const { student } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);

  const { data: progress } = useGetStudentProgress({ query: { queryKey: getGetStudentProgressQueryKey() } });

  const xp = progress?.totalPoints ?? (student as any)?.points ?? 0;
  const rank = progress?.rank ?? (student as any)?.rank ?? null;

  const currentIdx = (() => {
    const i = LEVELS.findIndex(l => xp < l.maxXP);
    return i === -1 ? LEVELS.length - 1 : i;
  })();
  const current = LEVELS[currentIdx];
  const pct = current.maxXP === Infinity ? 100 : Math.min(100, Math.round(((xp - current.minXP) / (current.maxXP - current.minXP)) * 100));
  const xpNeeded = current.maxXP === Infinity ? 0 : Math.max(0, current.maxXP - xp);

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #050e2a 0%, #0B2B6B 60%, #0f3580 100%)" }}>
        <StarField />
        <div className="relative z-10 px-5 pt-6 pb-8 max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">🚀 Braintam</p>
              <h2 className="text-2xl font-black text-white">Space Journey</h2>
              <p className="text-white/50 text-sm mt-1">Your learning adventure through the cosmos</p>
            </div>
            <div className="flex flex-col gap-2 items-end flex-shrink-0">
              <div className="px-4 py-2 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="text-white/50 text-[10px] font-bold uppercase">Total XP</div>
                <div className="text-xl font-black" style={{ color: "#FBBF24" }}>{xp.toLocaleString()}</div>
              </div>
              {rank && (
                <div className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(255,107,26,0.2)", color: "#FDBA74", border: "1px solid rgba(255,107,26,0.3)" }}>
                  Rank #{rank}
                </div>
              )}
            </div>
          </div>

          {/* Current level */}
          <div className="mt-5 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${current.glow}` }}>
            <div className="flex items-center gap-3 mb-3">
              <motion.span className="text-4xl" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5 }}>
                {current.planet}
              </motion.span>
              <div>
                <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Current Level</div>
                <div className="text-white font-black text-lg">{current.name}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-white/40 text-[10px]">Next reward</div>
                <div className="text-sm font-bold" style={{ color: "#FBBF24" }}>{current.reward}</div>
              </div>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white/50">{current.minXP} XP</span>
              <span style={{ color: ORANGE }} className="font-bold">{pct}%</span>
              {current.maxXP !== Infinity && <span className="text-white/50">{current.maxXP} XP</span>}
            </div>
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                style={{ background: `linear-gradient(90deg, ${ORANGE}, #FBBF24)` }} />
            </div>
            {xpNeeded > 0 && (
              <p className="text-white/40 text-xs text-center mt-1.5">
                <span className="text-orange-400 font-bold">{xpNeeded} XP</span> to reach {LEVELS[currentIdx + 1]?.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Journey map */}
      <div className="min-h-64" style={{ background: "linear-gradient(180deg, #050e2a 0%, #0a1628 100%)" }}>
        <StarField />
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center mb-6">— Your Journey —</p>
          <div className="space-y-4">
            {LEVELS.map((level, i) => {
              const isCompleted = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isLocked = i > currentIdx;
              return (
                <motion.div key={level.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => setSelected(selected === i ? null : i)} className="cursor-pointer">
                  <div className="relative rounded-3xl p-4 border transition-all"
                    style={{
                      background: isCurrent ? "rgba(255,255,255,0.08)" : isCompleted ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                      borderColor: isCurrent ? level.glow : isCompleted ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                      boxShadow: isCurrent ? `0 0 24px ${level.glow}` : undefined,
                    }}>
                    <div className="absolute -top-3 left-6 px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: isCurrent ? level.color : isCompleted ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: isCurrent ? "white" : isCompleted ? "white" : "rgba(255,255,255,0.3)" }}>
                      Level {i + 1}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="relative flex-shrink-0">
                        {isCurrent && (
                          <motion.div className="absolute inset-0 rounded-full" animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }} transition={{ repeat: Infinity, duration: 2 }} style={{ background: level.glow }} />
                        )}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${isLocked ? "opacity-30 grayscale" : ""}`}
                          style={{ background: isCurrent ? level.glow : "rgba(255,255,255,0.06)" }}>
                          {isLocked ? "🔒" : level.planet}
                        </div>
                        {isCompleted && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-black">✓</div>}
                        {isCurrent && (
                          <motion.div className="absolute -top-2 -right-2 text-lg" animate={{ y: [0, -3, 0], rotate: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 1.5 }}>🚀</motion.div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-black text-base ${isLocked ? "text-white/25" : "text-white"}`}>{level.name}</div>
                        <div className="text-white/30 text-xs mt-0.5">{level.maxXP === Infinity ? `${level.minXP}+ XP` : `${level.minXP} – ${level.maxXP} XP`}</div>
                        {isCurrent && (
                          <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, delay: 0.5 }} style={{ background: `linear-gradient(90deg, ${ORANGE}, #FBBF24)` }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-xs font-bold ${isLocked ? "text-white/20" : "text-yellow-400"}`}>{level.reward}</div>
                        <div className="text-white/30 text-[10px] mt-0.5">{level.rewardXP}</div>
                        <ChevronRight className={`w-4 h-4 mt-1 ml-auto transition-transform ${selected === i ? "rotate-90" : ""} ${isLocked ? "text-white/15" : "text-white/30"}`} />
                      </div>
                    </div>
                    <AnimatePresence>
                      {selected === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                            <p className={`text-sm leading-relaxed ${isLocked ? "text-white/30" : "text-white/60"}`}>{level.desc}</p>
                            <div>
                              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-2">
                                {isCompleted ? "✅ Completed" : isCurrent ? "🎯 Active Missions" : "🔒 Locked"}
                              </p>
                              <div className="space-y-1.5">
                                {level.missions.map((m, mi) => (
                                  <div key={mi} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${isCompleted ? "bg-green-500 text-white" : isCurrent && mi === 0 ? "bg-orange-500 text-white" : "bg-white/10 text-white/20"}`}>
                                      {isCompleted ? "✓" : mi + 1}
                                    </div>
                                    <span className={`text-xs ${isLocked ? "text-white/20" : isCompleted ? "text-white/50 line-through" : "text-white/60"}`}>{m}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* How to earn XP */}
          <motion.div className="mt-10 rounded-3xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">⚡ How To Earn XP</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "🎥", label: "Attend Live Class", pts: "+10 XP" },
                { icon: "📚", label: "Complete Homework", pts: "+5 XP" },
                { icon: "📝", label: "Complete Test", pts: "+10 XP" },
                { icon: "🔥", label: "Daily Streak", pts: "+5 XP" },
                { icon: "🪙", label: "Daily Login", pts: "+10 XP" },
                { icon: "🏆", label: "7-Day Streak", pts: "+20 XP" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/60 text-xs font-medium truncate">{item.label}</div>
                  </div>
                  <span className="text-xs font-black flex-shrink-0" style={{ color: "#FBBF24" }}>{item.pts}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard tab ───────────────────────────────────────────────────────

const avatarColors = [
  "from-purple-500 to-purple-700",
  "from-blue-500 to-blue-700",
  "from-green-500 to-green-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",
  "from-teal-500 to-teal-700",
];

function LeaderboardTab() {
  const { student } = useAuth();
  const studentGrade = student?.grade;
  const params = { grade: studentGrade !== undefined ? studentGrade : undefined };
  const { data: leaderboard, isLoading } = useGetLeaderboard(params, {
    query: { queryKey: getGetLeaderboardQueryKey(params) }
  });

  const entries = leaderboard ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myEntry = entries.find(e => e.studentName === student?.name);
  const medals = ["🥇", "🥈", "🥉"];
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : [];
  const podiumHeights = ["h-20", "h-32", "h-14"];
  const podiumColors = [
    { border: "border-slate-300", bg: "from-slate-300 to-slate-400" },
    { border: "border-yellow-400", bg: "from-yellow-400 to-amber-500" },
    { border: "border-amber-600", bg: "from-amber-600 to-amber-700" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* My rank card */}
      {myEntry && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 100%)`, boxShadow: "0 4px 24px rgba(11,43,107,0.25)" }}>
          <div className="text-3xl font-black" style={{ color: "#FBBF24" }}>#{myEntry.rank}</div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Your Rank</p>
            <p className="text-white/60 text-xs">Keep earning XP to climb higher!</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Points</p>
            <p className="font-black text-lg" style={{ color: "#FBBF24" }}>{myEntry.points.toLocaleString()}</p>
          </div>
        </motion.div>
      )}

      {/* Podium */}
      {!isLoading && top3.length >= 3 && (
        <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #1a4a9b 100%)` }}>
          <div className="px-6 pt-6 pb-2">
            <p className="text-center text-white/50 text-xs font-bold uppercase tracking-widest mb-6">🏆 Hall of Champions</p>
            <div className="flex items-end justify-center gap-4">
              {podiumOrder.map((entry, pos) => (
                <motion.div key={entry.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pos * 0.1 }}
                  className="flex flex-col items-center gap-2">
                  <div className="text-xl font-black text-white">{medals[pos === 1 ? 0 : pos === 0 ? 1 : 2]}</div>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${podiumColors[pos].bg} flex items-center justify-center text-white font-black text-lg border-2 ${podiumColors[pos].border}`}>
                    {entry.studentName?.charAt(0) ?? "?"}
                  </div>
                  <div className="text-center">
                    <p className="text-white text-xs font-bold leading-tight max-w-[72px] truncate">{entry.studentName}</p>
                    <p className="text-white/50 text-[10px]">Gr {entry.grade}</p>
                  </div>
                  <div className={`${podiumHeights[pos]} w-16 rounded-t-xl flex items-start justify-center pt-2`}
                    style={{ background: pos === 1 ? "rgba(245,158,11,0.3)" : pos === 0 ? "rgba(148,163,184,0.2)" : "rgba(180,83,9,0.2)" }}>
                    <span className="text-white font-black text-xs">{entry.points.toLocaleString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <motion.div key={entry.rank} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 p-3 rounded-2xl border ${entry.studentName === student?.name ? "border-orange-300 bg-orange-50" : "border-gray-100 bg-white"}`}
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" :
                i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" :
                "bg-gray-100 text-gray-500"
              }`}>
                {i < 3 ? medals[i] : entry.rank}
              </div>
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                {entry.studentName?.charAt(0) ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-800 truncate">{entry.studentName}</p>
                <p className="text-xs text-gray-400">Grade {entry.grade}</p>
              </div>
              <div className="flex items-center gap-1 font-black text-sm flex-shrink-0" style={{ color: i < 3 ? ORANGE : NAVY }}>
                <Star className="w-3.5 h-3.5 fill-current" />{entry.points.toLocaleString()}
              </div>
            </motion.div>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No leaderboard data yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Achievements tab ──────────────────────────────────────────────────────

function AchievementsTab() {
  const { student } = useAuth();
  const { data: progress } = useGetStudentProgress({ query: { queryKey: getGetStudentProgressQueryKey() } });
  const points = progress?.totalPoints ?? (student as any)?.points ?? 0;
  const rank = progress?.rank ?? (student as any)?.rank ?? null;

  const badges = [
    { icon: "🔥", label: "3-Day Streak",    desc: "Log in 3 days in a row",      unlocked: false, color: "#fff7ed", border: "#fed7aa" },
    { icon: "🔥", label: "7-Day Streak",    desc: "Log in 7 days in a row",      unlocked: false, color: "#fff7ed", border: "#fed7aa" },
    { icon: "⭐", label: "Points Collector",desc: "Earn 50+ XP",                 unlocked: points >= 50,  color: "#fefce8", border: "#fde68a" },
    { icon: "💎", label: "XP Pro",          desc: "Earn 200+ XP",                unlocked: points >= 200, color: "#f0f9ff", border: "#bae6fd" },
    { icon: "📚", label: "Homework Hero",   desc: "Complete all homework",       unlocked: false, color: "#eff6ff", border: "#bfdbfe" },
    { icon: "✅", label: "Test Ace",         desc: "Complete all tests",          unlocked: false, color: "#f0fdf4", border: "#bbf7d0" },
    { icon: "🚀", label: "Space Explorer",  desc: "Earn 100+ XP",               unlocked: points >= 100, color: "#faf5ff", border: "#e9d5ff" },
    { icon: "🌟", label: "Top 5 Learner",   desc: "Rank in top 5",              unlocked: !!rank && rank <= 5, color: "#fefce8", border: "#fde68a" },
    { icon: "⚡", label: "Speed Learner",   desc: "Complete 3 tasks in one day", unlocked: false, color: "#f0f9ff", border: "#bae6fd" },
    { icon: "🎯", label: "Perfect Score",   desc: "Score 100% on any test",      unlocked: false, color: "#fff7ed", border: "#fed7aa" },
    { icon: "🏆", label: "Class Champion",  desc: "Rank #1 on leaderboard",     unlocked: !!rank && rank === 1, color: "#fefce8", border: "#fde68a" },
    { icon: "🌈", label: "All-Rounder",     desc: "Submit hw, assignment & test",unlocked: false, color: "#f5f3ff", border: "#ddd6fe" },
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      {/* Summary */}
      <div className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 100%)`, boxShadow: "0 4px 24px rgba(11,43,107,0.2)" }}>
        <div className="text-4xl">🏅</div>
        <div className="flex-1">
          <p className="text-white font-black text-lg">{unlockedCount} / {badges.length}</p>
          <p className="text-white/60 text-xs">Badges earned — keep going!</p>
        </div>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
          <span className="text-2xl">{Math.round((unlockedCount / badges.length) * 100)}%</span>
        </div>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((badge, i) => (
          <motion.div key={badge.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl p-4 border-2 flex flex-col items-center text-center gap-2 transition-all ${badge.unlocked ? "" : "opacity-50 grayscale"}`}
            style={{ background: badge.color, borderColor: badge.border }}>
            <div className={`text-3xl ${badge.unlocked ? "" : "grayscale"}`}>
              {badge.unlocked ? badge.icon : "🔒"}
            </div>
            <div>
              <p className={`text-xs font-black leading-tight ${badge.unlocked ? "text-gray-800" : "text-gray-400"}`}>{badge.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{badge.desc}</p>
            </div>
            {badge.unlocked && (
              <span className="text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Unlocked ✓</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Tab config ────────────────────────────────────────────────────────────

type RewardTab = "journey" | "leaderboard" | "achievements";

function getInitialTab(): RewardTab {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t === "leaderboard") return "leaderboard";
  if (t === "achievements") return "achievements";
  return "journey";
}

const TAB_CONFIG: { id: RewardTab; label: string; emoji: string; color: string }[] = [
  { id: "journey",      label: "Space Journey", emoji: "🚀", color: "#7257f5" },
  { id: "leaderboard",  label: "Leaderboard",   emoji: "🏆", color: "#f6bc16" },
  { id: "achievements", label: "Achievements",  emoji: "🏅", color: "#18b96b" },
];

// ── Main page ─────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState<RewardTab>(getInitialTab);

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#f6bc16" }}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Rewards</h1>
              <p className="text-white/50 text-xs">Your progress, rank & badges</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-2">
            {TAB_CONFIG.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl text-xs font-bold transition-all"
                style={{
                  background: activeTab === tab.id ? tab.color : "rgba(255,255,255,0.08)",
                  color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.5)",
                }}
              >
                <span className="text-base">{tab.emoji}</span>
                <span className="hidden sm:block text-[10px]">{tab.label}</span>
                <span className="sm:hidden text-[10px]">{tab.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "journey" && <SpaceJourneyTab />}
          {activeTab === "leaderboard" && <LeaderboardTab />}
          {activeTab === "achievements" && <AchievementsTab />}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}
