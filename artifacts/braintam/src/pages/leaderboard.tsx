import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Star, School, Crown, Sparkles, ArrowRight, Flame, MapPin } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

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
        <Link href="/"><img src={braintamLogo} alt="Braintam" className="h-10 object-contain cursor-pointer" /></Link>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          {([["Courses", "/courses"], ["Live Classes", "/live-classes"], ["Leaderboard", "/leaderboard"]] as [string, string][]).map(([l, href]) => (
            <Link key={l} href={href}>
              <span className={`cursor-pointer font-semibold transition-colors ${scrolled ? "text-gray-700 hover:text-orange-500" : "text-white/80 hover:text-white"}`}>{l}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in"><span className={`text-sm font-semibold cursor-pointer ${scrolled ? "text-gray-700" : "text-white/90"}`}>Sign In</span></Link>
          <Link href="/sign-up">
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

        {/* Animated trophy */}
        <motion.div animate={{ y: [0, -12, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 inline-block mb-6">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mx-auto"
            style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-300 rounded-full" />
        </motion.div>

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
          <Link href="/sign-up">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2 mx-auto"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 4px 24px rgba(255,107,26,0.45)" }}>
              Join the Leaderboard <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ── Podium ── */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-center mb-8">
          <h2 className="text-2xl font-black" style={{ color: NAVY }}>🏆 Top 3 Champions</h2>
        </motion.div>

        {/* Podium display */}
        <div className="flex items-end justify-center gap-4 mb-10">
          {/* 2nd place */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="flex-1 max-w-[180px] text-center">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xl font-black shadow-lg">
                {top3[1].name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow text-sm">🥈</div>
            </div>
            <p className="font-bold text-sm truncate" style={{ color: NAVY }}>{top3[1].name}</p>
            <p className="text-xs text-gray-500 truncate">{top3[1].school}</p>
            <p className="text-xs font-bold text-amber-600 mt-1">{top3[1].points.toLocaleString()} pts</p>
            <div className="mt-3 rounded-t-2xl h-24 flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom, rgba(11,43,107,0.12), rgba(11,43,107,0.06))` }}>
              <span className="text-3xl font-black text-gray-400">2</span>
            </div>
          </motion.div>

          {/* 1st place */}
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex-1 max-w-[200px] text-center">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
              <Crown className="w-6 h-6 text-amber-400 mx-auto mb-1" />
              <div className="relative mb-3">
                <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-2xl font-black shadow-xl border-4 border-amber-300">
                  {top3[0].name.charAt(0)}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow text-base">🥇</div>
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-300 rounded-full" />
              </div>
            </motion.div>
            <p className="font-black text-base truncate" style={{ color: NAVY }}>{top3[0].name}</p>
            <p className="text-xs text-gray-500 truncate">{top3[0].school}</p>
            <p className="text-sm font-black mt-1" style={{ color: ORANGE }}>{top3[0].points.toLocaleString()} pts</p>
            <div className="mt-3 rounded-t-2xl h-36 flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom, rgba(245,158,11,0.2), rgba(245,158,11,0.08))` }}>
              <span className="text-4xl font-black text-amber-400">1</span>
            </div>
          </motion.div>

          {/* 3rd place */}
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="flex-1 max-w-[180px] text-center">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white text-xl font-black shadow-lg">
                {top3[2].name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow text-sm">🥉</div>
            </div>
            <p className="font-bold text-sm truncate" style={{ color: NAVY }}>{top3[2].name}</p>
            <p className="text-xs text-gray-500 truncate">{top3[2].school}</p>
            <p className="text-xs font-bold text-amber-700 mt-1">{top3[2].points.toLocaleString()} pts</p>
            <div className="mt-3 rounded-t-2xl h-16 flex items-center justify-center"
              style={{ background: `linear-gradient(to bottom, rgba(180,83,9,0.12), rgba(180,83,9,0.06))` }}>
              <span className="text-3xl font-black text-amber-700/50">3</span>
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
              {/* Rank badge */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${i === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-white" : i === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" : i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" : "bg-gray-100 text-gray-500"}`}>
                {i < 3 ? medals[i] : entry.rank}
              </div>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                {entry.name.charAt(0)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm" style={{ color: NAVY }}>{entry.name}</div>
                <div className="text-xs text-gray-500 flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><School className="w-3 h-3" />{entry.school}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{entry.city}</span>
                </div>
              </div>
              {/* Grade */}
              <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                style={{ background: "rgba(11,43,107,0.07)", color: NAVY }}>Gr {entry.grade}</span>
              {/* Streak */}
              <div className="text-xs flex items-center gap-1 text-orange-500 font-semibold flex-shrink-0">
                <Flame className="w-3.5 h-3.5" />{entry.streak}d
              </div>
              {/* Points */}
              <div className="flex items-center gap-1 font-black text-sm flex-shrink-0" style={{ color: i < 3 ? ORANGE : NAVY }}>
                <Star className="w-3.5 h-3.5 fill-current" />{entry.points.toLocaleString()}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Blur CTA — more students below */}
        <div className="relative mt-2">
          <div className="pointer-events-none h-16 rounded-2xl" style={{ background: "linear-gradient(to bottom, transparent, #F8FAFF)" }} />
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm mb-4">+ 9,990 more students competing right now</p>
            <Link href="/sign-up">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2 mx-auto"
                style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)`, boxShadow: `0 4px 24px rgba(11,43,107,0.3)` }}>
                Claim your spot on the leaderboard <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-black/90 text-white/40 text-center py-4 text-xs">
        © 2026 Braintam · India's Premium EdTech Platform
      </div>
    </div>
  );
}

// ── Authenticated view ──────────────────────────────────────────────────
function AuthLeaderboardView() {
  const [grade, setGrade] = useState<string>("all");
  const { student } = useAuth();

  const params = { grade: grade !== "all" ? Number(grade) : undefined };
  const { data: leaderboard, isLoading } = useGetLeaderboard(params, {
    query: { queryKey: getGetLeaderboardQueryKey(params) }
  });

  const top3 = (leaderboard ?? []).slice(0, 3);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">See how you rank against other students</p>
        </motion.div>

        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="w-40" data-testid="grade-filter"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
          </SelectContent>
        </Select>

        {!isLoading && top3.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-white border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-end justify-center gap-4">
                  <div className="text-center flex-1">
                    <Avatar className="w-16 h-16 mx-auto border-4 border-white/30">
                      <AvatarFallback className={`${medalColors[1]} text-lg font-bold`}>{top3[1]?.studentName?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="mt-2 font-bold text-sm truncate">{top3[1]?.studentName}</div>
                    <div className="text-xs text-white/70">{top3[1]?.points} pts</div>
                    <div className="mt-2 bg-white/20 rounded-t-xl h-16 flex items-center justify-center text-2xl">{medals[1]}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="relative">
                      <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                      <Avatar className="w-20 h-20 mx-auto border-4 border-yellow-400">
                        <AvatarFallback className={`${medalColors[0]} text-2xl font-bold`}>{top3[0]?.studentName?.charAt(0) ?? "?"}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="mt-2 font-bold text-base truncate">{top3[0]?.studentName}</div>
                    <div className="text-xs text-white/70">{top3[0]?.points} pts</div>
                    <div className="mt-2 bg-white/20 rounded-t-xl h-24 flex items-center justify-center text-2xl">{medals[0]}</div>
                  </div>
                  <div className="text-center flex-1">
                    <Avatar className="w-16 h-16 mx-auto border-4 border-white/30">
                      <AvatarFallback className={`${medalColors[2]} text-lg font-bold`}>{top3[2]?.studentName?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="mt-2 font-bold text-sm truncate">{top3[2]?.studentName}</div>
                    <div className="text-xs text-white/70">{top3[2]?.points} pts</div>
                    <div className="mt-2 bg-white/20 rounded-t-xl h-10 flex items-center justify-center text-2xl">{medals[2]}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Rankings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(7)].map((_, i) => <Skeleton key={i} className="w-full h-16" />)
            ) : (
              (leaderboard ?? []).map((entry, i) => {
                const isCurrentUser = entry.studentName === student?.name;
                return (
                  <motion.div key={entry.rank} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-colors ${isCurrentUser ? "border-primary bg-primary/5" : i < 3 ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-muted/40"}`}
                    data-testid={`leaderboard-row-${entry.rank}`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? medalColors[0] : i === 1 ? medalColors[1] : i === 2 ? medalColors[2] : "bg-muted text-muted-foreground"}`}>{entry.rank}</div>
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-secondary/10 text-secondary font-bold">{entry.studentName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">{entry.studentName}{isCurrentUser && <Badge className="text-xs py-0">You</Badge>}</div>
                      {entry.school && <div className="text-xs text-muted-foreground flex items-center gap-1"><School className="w-3 h-3" />{entry.school}</div>}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-sm flex-shrink-0">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />{entry.points.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function LeaderboardPage() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: `${ORANGE} transparent transparent transparent` }} />
      </div>
    );
  }

  if (!student) return <PublicLeaderboardView />;
  return <AuthLeaderboardView />;
}
