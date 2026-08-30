import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, School, Crown, Sparkles, ArrowRight, Flame, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { braintamLogo } from "@/lib/brand-assets";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const medals = ["🥇", "🥈", "🥉"];
const medalColors = [
  "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
];

const MOCK_LEADERS = [
  { rank: 1, name: "Arjun Sharma", school: "Delhi Public School", grade: 8, points: 4850, city: "New Delhi", streak: 42 },
  { rank: 2, name: "Priya Patel", school: "Kendriya Vidyalaya", grade: 7, points: 4720, city: "Mumbai", streak: 38 },
  { rank: 3, name: "Rohan Verma", school: "Army Public School", grade: 9, points: 4680, city: "Bangalore", streak: 35 },
  { rank: 4, name: "Riya Gupta", school: "DAV Public School", grade: 6, points: 4510, city: "Pune", streak: 30 },
  { rank: 5, name: "Karan Singh", school: "Ryan International", grade: 10, points: 4390, city: "Chennai", streak: 27 },
  { rank: 6, name: "Ananya Roy", school: "Mother's Public School", grade: 8, points: 4280, city: "Kolkata", streak: 24 },
  { rank: 7, name: "Dev Sharma", school: "Sanskriti School", grade: 7, points: 4150, city: "Jaipur", streak: 21 },
  { rank: 8, name: "Kavya Nair", school: "Vidya Niketan", grade: 5, points: 3980, city: "Kochi", streak: 18 },
  { rank: 9, name: "Aditya Kumar", school: "BVM Global", grade: 9, points: 3820, city: "Hyderabad", streak: 15 },
  { rank: 10, name: "Sneha Reddy", school: "Chaitanya Vidyalaya", grade: 6, points: 3750, city: "Visakhapatnam", streak: 12 },
];

const avatarColors = [
  "from-amber-400 to-orange-500",
  "from-blue-400 to-indigo-600",
  "from-pink-400 to-rose-600",
  "from-green-400 to-teal-600",
  "from-purple-400 to-violet-600",
  "from-cyan-400 to-blue-500",
  "from-red-400 to-rose-500",
  "from-teal-400 to-emerald-600",
  "from-indigo-400 to-purple-600",
  "from-orange-400 to-amber-600",
];

function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(11,43,107,0.95)", backdropFilter: "blur(20px)", boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none" }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/"><img src={braintamLogo} alt="Braintam" className="h-14 object-contain cursor-pointer" /></Link>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          {([["Courses", "/courses"], ["Live Classes", "/live-classes"], ["Leaderboard", "/leaderboard"]] as [string, string][]).map(([l, href]) => (
            <Link key={l} href={href}>
              <span className={`cursor-pointer font-semibold transition-colors ${scrolled ? "text-gray-700 hover:text-orange-500" : "text-white/80 hover:text-white"}`}>{l}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><span className={`text-sm font-semibold cursor-pointer ${scrolled ? "text-gray-700" : "text-white/90"}`}>Sign In</span></Link>
          <Link href="/register">
            <button className="px-5 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}>Join Free</button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function PublicLeaderboardView() {
  const top3 = MOCK_LEADERS.slice(0, 3);
  const rest = MOCK_LEADERS.slice(3);

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFF" }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-24 pb-20 px-6 relative overflow-hidden text-center"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 60%, #0f3580 100%)` }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-8 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "#F59E0B" }} />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
        </div>

        <div className="bt-float-sm relative z-10 inline-block mb-6">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mx-auto"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <div className="bt-pulse-scale absolute -top-2 -right-2 w-6 h-6 bg-yellow-300 rounded-full" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-4"
            style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", color: "#F59E0B" }}>
            <Sparkles className="w-3.5 h-3.5" /> Braintam National Leaderboard
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">India's Brightest<br />
            <span style={{ background: "linear-gradient(135deg, #F59E0B, #FBBF24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Young Learners</span>
          </h1>
          <p className="text-white/65 text-lg max-w-xl mx-auto mb-8">
            Top students from across India — competing, learning, and growing together on Braintam.
          </p>
          <Link href="/register">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2 mx-auto"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 4px 24px rgba(255,107,26,0.45)" }}>
              Join the Leaderboard <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── Podium ── */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center mb-6">
          <h2 className="text-xl font-black" style={{ color: NAVY }}>🏆 Top 3 Champions</h2>
        </motion.div>

        <div className="flex items-end justify-center gap-3 mb-8">
          {/* 2nd place */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex-1 max-w-[140px] text-center">
            <div className="relative mb-2">
              <div className="w-12 h-12 rounded-full mx-auto bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-base font-black shadow-lg">
                {top3[1].name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow text-xs">🥈</div>
            </div>
            <p className="font-bold text-xs truncate" style={{ color: NAVY }}>{top3[1].name}</p>
            <p className="text-xs text-gray-500 truncate hidden sm:block">{top3[1].school}</p>
            <p className="text-xs font-bold text-amber-600 mt-0.5">{top3[1].points.toLocaleString()} pts</p>
            <div className="mt-2 rounded-t-xl h-16 flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom, rgba(11,43,107,0.12), rgba(11,43,107,0.06))` }}>
              <span className="text-2xl font-black text-gray-400">2</span>
            </div>
          </motion.div>

          {/* 1st place */}
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex-1 max-w-[160px] text-center">
            <div className="bt-float-sm">
              <Crown className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="relative mb-2">
                <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-xl font-black shadow-xl border-3 border-amber-300">
                  {top3[0].name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow text-sm">🥇</div>
                <div className="bt-pulse-scale absolute -top-1 -left-1 w-3 h-3 bg-yellow-300 rounded-full" />
              </div>
            </div>
            <p className="font-black text-sm truncate" style={{ color: NAVY }}>{top3[0].name}</p>
            <p className="text-xs text-gray-500 truncate hidden sm:block">{top3[0].school}</p>
            <p className="text-sm font-black mt-0.5" style={{ color: ORANGE }}>{top3[0].points.toLocaleString()} pts</p>
            <div className="mt-2 rounded-t-xl h-24 flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom, rgba(245,158,11,0.2), rgba(245,158,11,0.08))` }}>
              <span className="text-3xl font-black text-amber-400">1</span>
            </div>
          </motion.div>

          {/* 3rd place */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex-1 max-w-[140px] text-center">
            <div className="relative mb-2">
              <div className="w-12 h-12 rounded-full mx-auto bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white text-base font-black shadow-lg">
                {top3[2].name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow text-xs">🥉</div>
            </div>
            <p className="font-bold text-xs truncate" style={{ color: NAVY }}>{top3[2].name}</p>
            <p className="text-xs text-gray-500 truncate hidden sm:block">{top3[2].school}</p>
            <p className="text-xs font-bold text-amber-700 mt-0.5">{top3[2].points.toLocaleString()} pts</p>
            <div className="mt-2 rounded-t-xl h-10 flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom, rgba(180,83,9,0.12), rgba(180,83,9,0.06))` }}>
              <span className="text-2xl font-black text-amber-700/50">3</span>
            </div>
          </motion.div>
        </div>

        {/* ── Full ranked list ── */}
        <div className="space-y-2">
          <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: NAVY }}>
            <Star className="w-5 h-5" style={{ color: ORANGE }} /> Full Rankings
          </h3>
          {MOCK_LEADERS.map((entry, i) => (
            <motion.div key={entry.rank}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i + 0.4 }}
              className="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:shadow-md"
              style={{ background: i < 3 ? (i === 0 ? "linear-gradient(to right, rgba(245,158,11,0.08), rgba(255,255,255,0))" : i === 1 ? "linear-gradient(to right, rgba(148,163,184,0.08), rgba(255,255,255,0))" : "linear-gradient(to right, rgba(180,83,9,0.06), rgba(255,255,255,0))") : "white", borderColor: i < 3 ? (i === 0 ? "rgba(245,158,11,0.3)" : i === 1 ? "rgba(148,163,184,0.3)" : "rgba(180,83,9,0.2)") : "#F3F4F6" }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" : i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" : i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" : "bg-gray-100 text-gray-500"}`}>
                {i < 3 ? medals[i] : entry.rank}
              </div>
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                {entry.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm" style={{ color: NAVY }}>{entry.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><School className="w-3 h-3" />{entry.school}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.city}</span>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                style={{ background: "rgba(11,43,107,0.07)", color: NAVY }}>Gr {entry.grade}</span>
              <div className="text-xs flex items-center gap-1 text-orange-500 font-semibold flex-shrink-0">
                <Flame className="w-3.5 h-3.5" />{entry.streak}d
              </div>
              <div className="flex items-center gap-1 font-black text-sm flex-shrink-0" style={{ color: i < 3 ? ORANGE : NAVY }}>
                <Star className="w-3.5 h-3.5 fill-current" />{entry.points.toLocaleString()}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative mt-2">
          <div className="pointer-events-none h-16 rounded-2xl" style={{ background: "linear-gradient(to bottom, transparent, #F8FAFF)" }} />
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm mb-4">Sign up to track your own rank and compete with students in your grade</p>
            <Link href="/register">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2 mx-auto"
                style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)`, boxShadow: `0 4px 24px rgba(11,43,107,0.3)` }}>
                Claim your spot on the leaderboard <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How to Earn Points ── */}
      <section className="py-14 px-6" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: ORANGE }}>Gamified Learning</div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>How do students earn points?</h2>
            <p className="text-gray-500 mt-1 text-sm">Every action in Braintam builds your score. Consistent learners rise fastest.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { emoji: "🎥", action: "Attend a Live Class", pts: "+50 pts", desc: "Show up on time and stay till the end." },
              { emoji: "📝", action: "Submit Homework", pts: "+30 pts", desc: "Complete and submit daily practice sets." },
              { emoji: "🧪", action: "Pass a Chapter Test", pts: "+100 pts", desc: "Score 70%+ in any weekly test." },
              { emoji: "🔥", action: "Daily Streak", pts: "+20 pts/day", desc: "Log in and learn every day — streaks multiply rewards." },
              { emoji: "❓", action: "Solve a Doubt", pts: "+15 pts", desc: "Help a peer in the doubt community." },
              { emoji: "🏅", action: "Earn a Badge", pts: "+200 pts", desc: "Unlock achievement badges through consistent performance." },
            ].map((item, i) => (
              <motion.div key={item.action} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl p-4 flex gap-3 items-start"
                style={{ background: "#F8FAFF", border: "1.5px solid rgba(11,43,107,0.08)" }}>
                <div className="text-2xl flex-shrink-0">{item.emoji}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: NAVY }}>{item.action}</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(255,107,26,0.12)", color: ORANGE }}>{item.pts}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Badges preview */}
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-8 rounded-2xl p-5 text-center"
            style={{ background: `linear-gradient(135deg, ${NAVY}08, rgba(245,158,11,0.06))`, border: "1px solid rgba(11,43,107,0.1)" }}>
            <p className="text-sm font-bold mb-3" style={{ color: NAVY }}>🏆 Earn these badges as you grow</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: "⚡", name: "Speed Learner" }, { icon: "🔥", name: "7-Day Streak" }, { icon: "🎯", name: "Perfect Score" },
                { icon: "📚", name: "Homework Hero" }, { icon: "🌟", name: "Class Champion" }, { icon: "🚀", name: "Grade Topper" },
              ].map(b => (
                <div key={b.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "white", border: "1px solid rgba(11,43,107,0.12)", color: NAVY }}>
                  {b.icon} {b.name}
                </div>
              ))}
            </div>
            <Link href="/register">
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                className="mt-5 px-7 py-3 rounded-full font-bold text-white text-sm flex items-center gap-2 mx-auto"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 4px 20px rgba(255,107,26,0.35)" }}>
                Start earning points today <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      <div className="bg-black/90 text-white/40 text-center py-4 text-xs">
        © 2026 Braintam Learning · India's Premium EdTech Platform
      </div>
    </div>
  );
}

// ── Authenticated view ──────────────────────────────────────────────────
function AuthLeaderboardView() {
  const { student } = useAuth();

  const studentGrade = student?.grade;
  const params = { grade: studentGrade !== undefined ? studentGrade : undefined };
  const { data: leaderboard, isLoading } = useGetLeaderboard(params, {
    query: { queryKey: getGetLeaderboardQueryKey(params) }
  });

  const top3 = (leaderboard ?? []).slice(0, 3);
  const rest = (leaderboard ?? []).slice(3);
  const myEntry = (leaderboard ?? []).find(e => e.studentName === student?.name);

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : [];
  const podiumHeights = ["h-24", "h-36", "h-16"];
  const podiumPositions = [
    { medal: "🥈", color: "from-slate-300 to-slate-400", border: "border-slate-300", glow: "shadow-slate-200", label: "2nd", labelColor: "#64748b" },
    { medal: "🥇", color: "from-yellow-400 to-amber-500", border: "border-yellow-400", glow: "shadow-yellow-200", label: "1st", labelColor: "#d97706" },
    { medal: "🥉", color: "from-amber-600 to-amber-700", border: "border-amber-600", glow: "shadow-amber-200", label: "3rd", labelColor: "#92400e" },
  ];

  return (
    <AppLayout>
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 60%, #0f3580 100%)` }}>
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: "#F59E0B" }} />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-white/20"
              style={{ top: `${10 + (i * 7) % 80}%`, left: `${5 + (i * 9) % 90}%` }} />
          ))}
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">Leaderboard</h1>
                  <p className="text-white/60 text-sm mt-0.5">
                    {studentGrade ? `Grade ${studentGrade} · Top students this month` : "See how you rank"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="flex items-center gap-4 flex-wrap">
              {myEntry && (
                <div className="flex flex-col items-center px-5 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-white/60 text-xs font-semibold uppercase tracking-wide">Your Rank</span>
                  <span className="text-2xl font-black text-white">#{myEntry.rank}</span>
                </div>
              )}
              {myEntry && (
                <div className="flex flex-col items-center px-5 py-3 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  <span className="text-white/60 text-xs font-semibold uppercase tracking-wide">Your Points</span>
                  <span className="text-2xl font-black" style={{ color: "#FBBF24" }}>{myEntry.points.toLocaleString()}</span>
                </div>
              )}
              {studentGrade && (
                <div className="px-4 py-2 rounded-full font-bold text-sm"
                  style={{ background: "rgba(255,107,26,0.25)", border: "1px solid rgba(255,107,26,0.4)", color: "#FDBA74" }}>
                  Grade {studentGrade}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* ── Podium ── */}
        {!isLoading && top3.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="rounded-3xl overflow-hidden" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, #1a4a9b 100%)` }}>
              <div className="px-6 pt-8 pb-0">
                <p className="text-center text-white/50 text-xs font-bold uppercase tracking-widest mb-8">
                  🏆 &nbsp;Hall of Champions
                </p>
                <div className="flex items-end justify-center gap-4 md:gap-8">
                  {podiumOrder.map((entry, pi) => {
                    const pos = podiumPositions[pi];
                    const isFirst = pi === 1;
                    return (
                      <motion.div key={entry?.rank ?? pi}
                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + pi * 0.1 }}
                        className="flex flex-col items-center flex-1 max-w-[160px]">
                        {isFirst && (
                          <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
                            <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                          </motion.div>
                        )}
                        <div className="relative mb-3">
                          <div className={`${isFirst ? "w-20 h-20" : "w-14 h-14"} rounded-full mx-auto bg-gradient-to-br ${pos.color} flex items-center justify-center text-white font-black shadow-2xl border-4 ${pos.border} ${pos.glow}`}
                            style={{ fontSize: isFirst ? "1.5rem" : "1.1rem", boxShadow: isFirst ? "0 0 30px rgba(245,158,11,0.5)" : pi === 0 ? "0 0 20px rgba(148,163,184,0.4)" : "0 0 20px rgba(180,83,9,0.4)" }}>
                            {entry?.avatarUrl
                              ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                              : (entry?.studentName?.charAt(0) ?? "?")}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-sm">{pos.medal}</div>
                        </div>
                        <div className={`font-black text-white truncate w-full text-center ${isFirst ? "text-base" : "text-sm"}`}>
                          {entry?.studentName}
                        </div>
                        {entry?.school && (
                          <div className="text-white/40 text-xs truncate w-full text-center hidden md:block mt-0.5">{entry.school}</div>
                        )}
                        <div className={`font-black mt-1 ${isFirst ? "text-base" : "text-sm"}`} style={{ color: pos.labelColor === "#d97706" ? "#FBBF24" : "rgba(255,255,255,0.55)" }}>
                          {entry?.points?.toLocaleString()} pts
                        </div>
                        {/* Podium bar */}
                        <div className={`w-full mt-4 ${podiumHeights[pi]} rounded-t-2xl flex flex-col items-center justify-start pt-3`}
                          style={{ background: isFirst ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.07)", borderTop: isFirst ? "2px solid rgba(245,158,11,0.4)" : "2px solid rgba(255,255,255,0.12)" }}>
                          <span className="text-3xl md:text-4xl font-black" style={{ color: isFirst ? "rgba(245,158,11,0.6)" : "rgba(255,255,255,0.15)" }}>
                            {pi === 0 ? "2" : pi === 1 ? "1" : "3"}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Rankings list ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 fill-current" style={{ color: ORANGE }} />
            <h2 className="text-lg font-black" style={{ color: NAVY }}>Full Rankings</h2>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              [...Array(7)].map((_, i) => <Skeleton key={i} className="w-full h-16 rounded-2xl" />)
            ) : (leaderboard ?? []).length === 0 ? (
              <div className="text-center py-16 rounded-3xl border-2 border-dashed border-gray-200">
                <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-bold text-gray-400">No rankings yet</p>
                <p className="text-sm text-gray-300 mt-1">Complete tests and homework to earn points!</p>
              </div>
            ) : (
              (leaderboard ?? []).map((entry, i) => {
                const isCurrentUser = entry.studentName === student?.name;
                const isTop3 = i < 3;
                const rowBg = isCurrentUser
                  ? `linear-gradient(to right, rgba(255,107,26,0.08), rgba(255,107,26,0.03))`
                  : i === 0 ? `linear-gradient(to right, rgba(245,158,11,0.08), white)`
                  : i === 1 ? `linear-gradient(to right, rgba(148,163,184,0.08), white)`
                  : i === 2 ? `linear-gradient(to right, rgba(180,83,9,0.06), white)`
                  : "white";
                const borderLeft = isCurrentUser ? `4px solid ${ORANGE}` : i === 0 ? "4px solid #F59E0B" : i === 1 ? "4px solid #94A3B8" : i === 2 ? "4px solid #B45309" : "4px solid transparent";

                return (
                  <motion.div key={entry.rank}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i + 0.3 }}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl border border-gray-100 transition-all hover:shadow-md hover:-translate-y-px cursor-default"
                    style={{ background: rowBg, borderLeft }}
                    data-testid={`leaderboard-row-${entry.rank}`}>

                    {/* Rank badge */}
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${
                      i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white"
                      : i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                      : i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                      : "bg-gray-100 text-gray-500"}`}
                      style={isTop3 ? { boxShadow: i === 0 ? "0 2px 12px rgba(245,158,11,0.5)" : i === 1 ? "0 2px 12px rgba(148,163,184,0.5)" : "0 2px 12px rgba(180,83,9,0.4)" } : {}}>
                      {i < 3 ? medals[i] : entry.rank}
                    </div>

                    {/* Avatar */}
                    <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-sm bg-gradient-to-br ${avatarColors[i % avatarColors.length]} shadow-sm`}>
                      {entry.avatarUrl
                        ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        : entry.studentName?.charAt(0)}
                    </div>

                    {/* Name + school */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm md:text-base truncate" style={{ color: NAVY }}>{entry.studentName}</span>
                        {isCurrentUser && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
                            style={{ background: `rgba(255,107,26,0.12)`, color: ORANGE }}>You</span>
                        )}
                      </div>
                      {entry.school && (
                        <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <School className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{entry.school}</span>
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                      <div className="flex items-center gap-1 font-black text-sm md:text-base"
                        style={{ color: i < 3 ? (i === 0 ? "#D97706" : i === 1 ? "#64748b" : "#92400e") : NAVY }}>
                        <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                        {entry.points.toLocaleString()}
                      </div>
                      <span className="text-xs text-gray-400">points</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}

export default function LeaderboardPage() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <div className="bt-spin-fast w-8 h-8 border-4 rounded-full" style={{ borderColor: `${ORANGE} transparent transparent transparent` }} />
      </div>
    );
  }

  if (!student) return <PublicLeaderboardView />;
  return <AuthLeaderboardView />;
}
