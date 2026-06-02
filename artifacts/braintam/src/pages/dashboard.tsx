import { Redirect } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetStudentDashboard, useGetLeaderboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth, STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY } from "@/components/auth-provider";
import { Video, BookOpen, FileText, CheckSquare, Flame, PlayCircle, Bell, X, ChevronRight, Zap, Trophy, Megaphone } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";

const NAVY   = "#0A2342";
const NAVY2  = "#123D7A";
const GOLD   = "#D4AF37";
const BG     = "#F8FAFC";

// ── Space Journey XP Levels ───────────────────────────────────────
const JOURNEY_LEVELS = [
  { planet: "🌍", name: "Earth Explorer",    minXP: 0,    maxXP: 100,   reward: "🎖 Explorer Badge"  },
  { planet: "🌙", name: "Moon Explorer",     minXP: 100,  maxXP: 300,   reward: "🌙 Moon Badge"      },
  { planet: "🔴", name: "Mars Explorer",     minXP: 300,  maxXP: 600,   reward: "🔴 Mars Badge"      },
  { planet: "🪐", name: "Saturn Explorer",   minXP: 600,  maxXP: 1000,  reward: "🪐 Saturn Ring"     },
  { planet: "🌌", name: "Galaxy Master",     minXP: 1000, maxXP: 2000,  reward: "🌌 Galaxy Medal"    },
  { planet: "🚀", name: "Universe Champion", minXP: 2000, maxXP: Infinity, reward: "🚀 Champion Crown" },
];

function SpaceLearningJourney({ points, rank }: { points: number; rank: number | null | undefined }) {
  const rawIdx = JOURNEY_LEVELS.findIndex(l => points < l.maxXP);
  const idx     = rawIdx === -1 ? JOURNEY_LEVELS.length - 1 : rawIdx;
  const current = JOURNEY_LEVELS[idx];
  const next    = JOURNEY_LEVELS[idx + 1] ?? null;
  const pct     = next
    ? Math.min(100, Math.round(((points - current.minXP) / (current.maxXP - current.minXP)) * 100))
    : 100;
  const xpNeeded = next ? Math.max(0, current.maxXP - points) : 0;

  return (
    <Link href="/space-journey">
    <div className="rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
      style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)` }}>
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">🚀</span>
          <h2 className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Braintam Space Learning Journey</h2>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <div>
            <p className="text-4xl leading-none">{current.planet}</p>
            <p className="text-white font-extrabold text-base mt-1">{current.name}</p>
            <p className="text-white/50 text-xs mt-0.5">{points} XP{rank ? ` · Rank #${rank}` : ""}</p>
          </div>
          {next && (
            <div className="ml-auto text-right">
              <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-1">Next Planet</p>
              <p className="text-3xl leading-none">{next.planet}</p>
              <p className="text-white/60 text-xs font-semibold mt-0.5">{next.name}</p>
            </div>
          )}
        </div>
        <div className="mb-1.5">
          <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, #FF6B1A, ${GOLD})` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/40 text-[10px]">{current.minXP} XP</span>
            {next && <span className="text-white/40 text-[10px]">{current.maxXP} XP</span>}
          </div>
        </div>
        {next
          ? <p className="text-white/60 text-xs">
              <span className="text-orange-400 font-bold">{xpNeeded} XP</span> needed to reach {next.name}
            </p>
          : <p className="text-yellow-300 text-xs font-bold">🏆 Maximum Level — Universe Champion!</p>}
        <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.08)" }}>
          <span className="text-white/50 text-[11px]">Next Reward:</span>
          <span className="text-yellow-300 text-[11px] font-bold">{next?.reward ?? "🏆 Universe Crown"}</span>
          <ChevronRight className="w-3 h-3 text-white/30 ml-auto" />
        </div>
      </div>
    </div>
    </Link>
  );
}

function TodaysMissions({
  streak, pendingHw, upcomingTests, isLoading,
}: { streak: number; pendingHw: number; upcomingTests: number; isLoading: boolean }) {
  const missions = [
    { icon: "🎥", label: "Attend Live Class",  done: false,                            href: "/live-classes", pts: "+10 XP" },
    { icon: "📚", label: "Complete Homework",  done: !isLoading && pendingHw === 0,    href: "/homework",     pts: "+5 XP"  },
    { icon: "📝", label: "Complete a Test",    done: !isLoading && upcomingTests === 0, href: "/tests",       pts: "+10 XP" },
    { icon: "🔥", label: "Maintain Streak",    done: streak > 0,                       href: "/profile",      pts: "+5 XP"  },
  ];
  const completed = missions.filter(m => m.done).length;

  return (
    <div className="rounded-2xl overflow-hidden border border-orange-100 bg-white"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
      <div className="px-4 pt-3.5 pb-3"
        style={{ background: "linear-gradient(135deg, #FF6B1A, #e05510)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span>🎯</span>
            <h2 className="text-white font-extrabold text-sm">Today's Missions</h2>
          </div>
          <span className="text-white/80 text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
            {completed}/{missions.length}
          </span>
        </div>
        <p className="text-white/70 text-xs">Complete all missions · earn +20 XP bonus</p>
        <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${(completed / missions.length) * 100}%` }} />
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {missions.map(m => (
          <Link key={m.label} href={m.href}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all
              ${m.done ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-transparent hover:border-orange-100 hover:bg-orange-50/40"}`}>
              <span className="text-lg leading-none">{m.icon}</span>
              <span className={`flex-1 text-sm font-semibold ${m.done ? "text-green-700 line-through decoration-green-400/60" : "text-gray-700"}`}>
                {m.label}
              </span>
              {m.done
                ? <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">✓</span>
                : <span className="text-xs font-bold text-orange-500 flex-shrink-0">{m.pts}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const activityIcons: Record<string, any> = {
  live_class: Video,
  recording: PlayCircle,
  homework: FileText,
  assignment: FileText,
  test: CheckSquare,
  video: PlayCircle,
  course: BookOpen,
};

const activityColors: Record<string, string> = {
  live_class:  "text-blue-500 bg-blue-50",
  recording:   "text-blue-500 bg-blue-50",
  homework:    "text-orange-500 bg-orange-50",
  assignment:  "text-purple-500 bg-purple-50",
  test:        "text-green-500 bg-green-50",
  video:       "text-cyan-500 bg-cyan-50",
  course:      "text-indigo-500 bg-indigo-50",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, opts?: RequestInit) {
  const staffToken   = localStorage.getItem(STAFF_TOKEN_KEY);
  const studentToken = localStorage.getItem(STUDENT_TOKEN_KEY);
  const token = studentToken || staffToken;
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

// ── Daily Coin Popup ─────────────────────────────────────────────
function CoinPopup({ onClose }: { onClose: () => void }) {
  const [claiming, setClaiming]   = useState(false);
  const [claimed, setClaimed]     = useState(false);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const coins = 10;

  const claim = async () => {
    setClaiming(true);
    try {
      const r = await apiFetch("/student/claim-daily-coins", { method: "POST" });
      if (r.ok) {
        const data = await r.json();
        setTotalPoints(data.totalPoints);
        setClaimed(true);
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-100 rounded-full opacity-60" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-100 rounded-full opacity-60" />
        </div>
        <div className="relative">
          {!claimed ? (
            <>
              <div className="bt-float-sm bt-sway text-6xl mb-4 inline-block select-none">🪙</div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Daily Reward!</h2>
              <p className="text-gray-500 text-sm mb-6">Come back every day to collect your coins and climb the leaderboard!</p>
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl py-4 px-6 mb-6 shadow-inner">
                <p className="text-white text-xs font-semibold uppercase tracking-wider mb-1">Today's reward</p>
                <p className="text-white text-4xl font-black">+{coins} Coins</p>
              </div>
              <Button onClick={claim} disabled={claiming} className="w-full h-12 text-base font-bold rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg, #FF6B1A, #e55a10)" }}>
                {claiming ? "Claiming..." : "🎉 Claim Now"}
              </Button>
              <button onClick={onClose} className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full">Remind me later</button>
            </>
          ) : (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.5, type: "spring" }} className="text-6xl mb-4 inline-block">🎊</motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-extrabold text-gray-900 mb-1">Coins Claimed!</motion.h2>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-gray-500 text-sm mb-6">
                {totalPoints !== null ? `You now have ${totalPoints} total points.` : `+${coins} coins added to your balance!`} See you tomorrow!
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-green-50 border border-green-200 rounded-2xl py-3 px-6 mb-6">
                <p className="text-green-700 font-bold text-2xl">+{coins} 🪙</p>
                <p className="text-green-600 text-xs mt-1">Added to your score</p>
              </motion.div>
              <Button onClick={onClose} className="w-full h-12 text-base font-bold rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})` }}>
                Continue Learning 📚
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Hero Banner Carousel ─────────────────────────────────────────
const BANNERS = [
  {
    emoji: "🚀",
    title: "Summer Learning Camp",
    sub: "Join India's Most Interactive Learning Program",
    cta: "Explore Now",
    href: "/courses",
    from: "#1e3a8a",
    to: "#0A2342",
  },
  {
    emoji: "🏆",
    title: "Live Classes This Week",
    sub: "Don't miss your scheduled classes — join now!",
    cta: "View Classes",
    href: "/live-classes",
    from: "#7c3aed",
    to: "#4c1d95",
  },
  {
    emoji: "⭐",
    title: "Climb the Leaderboard",
    sub: "Complete homework & tests to earn XP points",
    cta: "See Rankings",
    href: "/leaderboard",
    from: "#b45309",
    to: "#78350f",
  },
];

function HeroBanner() {
  const [idx, setIdx]   = useState(0);
  const [dir, setDir]   = useState(1);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = (next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDir(1);
      setIdx(i => (i + 1) % BANNERS.length);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const b = BANNERS[idx];

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 130 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={idx}
          initial={{ x: dir * 80, opacity: 0 }}
          animate={{ x: 0,        opacity: 1 }}
          exit={{  x: -dir * 80,  opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center px-5 py-5"
          style={{ background: `linear-gradient(135deg, ${b.from}, ${b.to})` }}
        >
          <div className="flex-1">
            <p className="text-3xl mb-1">{b.emoji}</p>
            <h2 className="text-white font-extrabold text-lg leading-tight">{b.title}</h2>
            <p className="text-white/70 text-xs mt-1 mb-3">{b.sub}</p>
            <Link href={b.href}>
              <button
                className="text-xs font-bold px-4 py-1.5 rounded-full transition-opacity hover:opacity-90"
                style={{ background: GOLD, color: NAVY }}
              >
                {b.cta} →
              </button>
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* Invisible height spacer */}
      <div style={{ minHeight: 130 }} />
      {/* Dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className="rounded-full transition-all"
            style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? GOLD : "rgba(255,255,255,0.4)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Announcements Strip ───────────────────────────────────────────
interface Announcement {
  id: number;
  title: string;
  body: string;
  grade: number | null;
  isActive: boolean;
}

function AnnouncementStrip() {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    apiFetch("/student/announcements")
      .then(r => r.ok ? r.json() : [])
      .then((data: Announcement[]) => setItems(data))
      .catch(() => {});
  }, []);

  const visible = items.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const BG_COLORS = [
    "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
    "linear-gradient(135deg,#7c3aed,#6d28d9)",
    "linear-gradient(135deg,#b45309,#92400e)",
    "linear-gradient(135deg,#065f46,#047857)",
    "linear-gradient(135deg,#9d174d,#be185d)",
  ];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Megaphone className="w-3.5 h-3.5" style={{ color: NAVY2 }} />
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY2 }}>Announcements</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {visible.map((ann, i) => (
          <div
            key={ann.id}
            className="flex-shrink-0 rounded-2xl p-3.5 relative"
            style={{
              background: BG_COLORS[i % BG_COLORS.length],
              minWidth: 220,
              maxWidth: 260,
            }}
          >
            <button
              onClick={() => setDismissed(prev => new Set([...prev, ann.id]))}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-3 h-3 text-white/70" />
            </button>
            <p className="text-white font-bold text-sm leading-tight pr-5">{ann.title}</p>
            <p className="text-white/70 text-xs mt-1 leading-snug line-clamp-3">{ann.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gradient Stat Card ────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  gradient: string;
  href: string;
  desc: string;
  index: number;
  isLoading: boolean;
}

function StatCard({ label, value, icon: Icon, gradient, href, desc, index, isLoading }: StatCardProps) {
  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants}>
      <Link href={href}>
        <div
          className="relative rounded-2xl p-4 cursor-pointer overflow-hidden hover:-translate-y-1 transition-transform"
          style={{ background: gradient, minHeight: 110 }}
          data-testid={`stat-card-${index}`}
        >
          <div className="absolute top-3 right-3 opacity-20">
            <Icon className="w-12 h-12 text-white" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {isLoading ? (
            <div className="w-10 h-7 bg-white/30 rounded animate-pulse mb-1" />
          ) : (
            <div className="text-3xl font-extrabold text-white">{value}</div>
          )}
          <div className="text-white/90 text-xs font-semibold leading-tight">{label}</div>
          <div className="text-white/60 text-[10px] mt-0.5">{desc}</div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────
export default function DashboardPage() {
  const { student, role, isLoading: authLoading } = useAuth();
  const [showCoinPopup, setShowCoinPopup]         = useState(false);
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!authLoading && role === "admin")   return <Redirect to="/admin" />;
  if (!authLoading && role === "teacher") return <Redirect to="/teacher" />;

  const { data: dashboard, isLoading } = useGetStudentDashboard();
  const { data: leaderboard }          = useGetLeaderboard();

  useEffect(() => {
    if (!student) return;
    apiFetch("/student/daily-coin-status")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !data.claimed) {
          setShowCoinPopup(true);
          if (data.nextRefreshAt) {
            const ms = new Date(data.nextRefreshAt).getTime() - Date.now();
            if (ms > 0) midnightTimerRef.current = setTimeout(() => setShowCoinPopup(true), ms);
          }
        } else if (data && data.claimed && data.nextRefreshAt) {
          const ms = new Date(data.nextRefreshAt).getTime() - Date.now();
          if (ms > 0) midnightTimerRef.current = setTimeout(() => setShowCoinPopup(true), ms);
        }
      })
      .catch(() => {});
    return () => { if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current); };
  }, [student?.id]);

  const firstName = dashboard?.studentName?.split(" ")[0] ?? student?.name?.split(" ")[0] ?? "Student";
  const streak    = dashboard?.streakDays ?? 0;
  const points    = dashboard?.points ?? 0;
  const rankNum   = dashboard?.rank;

  const statCards = [
    {
      label: "Live Classes",
      value: dashboard?.upcomingLiveClasses ?? 0,
      icon: Video,
      gradient: "linear-gradient(135deg, #1d4ed8, #1e40af)",
      href: "/live-classes",
      desc: "Upcoming today",
    },
    {
      label: "Homework",
      value: dashboard?.pendingHomework ?? 0,
      icon: FileText,
      gradient: "linear-gradient(135deg, #ea580c, #c2410c)",
      href: "/homework",
      desc: "Pending tasks",
    },
    {
      label: "Assignments",
      value: dashboard?.pendingAssignments ?? 0,
      icon: BookOpen,
      gradient: "linear-gradient(135deg, #7c3aed, #6d28d9)",
      href: "/assignments",
      desc: "Due soon",
    },
    {
      label: "Tests",
      value: dashboard?.upcomingTests ?? 0,
      icon: CheckSquare,
      gradient: "linear-gradient(135deg, #059669, #047857)",
      href: "/tests",
      desc: "Upcoming",
    },
  ];

  // Achievements — always shown with locked/unlocked states (Part 8)
  const allAchievements = [
    { icon: "🔥", label: "3-Day Streak",       unlocked: streak >= 3,   color: "#fff7ed", border: "#fed7aa" },
    { icon: "🔥", label: "7-Day Streak",       unlocked: streak >= 7,   color: "#fff7ed", border: "#fed7aa" },
    { icon: "⭐", label: "Points Collector",   unlocked: points >= 50,  color: "#fefce8", border: "#fde68a" },
    { icon: "💎", label: "XP Pro (200+)",      unlocked: points >= 200, color: "#f0f9ff", border: "#bae6fd" },
    { icon: "📚", label: "Homework Hero",      unlocked: !isLoading && (dashboard?.pendingHomework ?? 1) === 0, color: "#eff6ff", border: "#bfdbfe" },
    { icon: "✅", label: "Test Ace",           unlocked: !isLoading && (dashboard?.upcomingTests ?? 1) === 0,   color: "#f0fdf4", border: "#bbf7d0" },
    { icon: "🚀", label: "Space Explorer",     unlocked: points >= 100, color: "#faf5ff", border: "#e9d5ff" },
    { icon: "🌟", label: "Top 5 Learner",      unlocked: !!rankNum && rankNum <= 5,                             color: "#fefce8", border: "#fde68a" },
  ];

  const hasNoCourse = !isLoading && !authLoading && !!dashboard &&
    (dashboard as any).enrolledCourseCount === 0;

  return (
    <AppLayout>
      <AnimatePresence>
        {showCoinPopup && <CoinPopup onClose={() => setShowCoinPopup(false)} />}
      </AnimatePresence>

      {/* ── Navy Header ──────────────────────────────────────────── */}
      <div
        className="px-4 pt-5 pb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)` }}
      >
        {/* subtle pattern dots */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative max-w-6xl mx-auto flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="space-y-1.5">
                <div className="w-40 h-6 bg-white/20 rounded-lg animate-pulse" />
                <div className="w-56 h-4 bg-white/10 rounded-lg animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-white/70 text-sm font-medium">👋 Hi {firstName}</p>
                <h1 className="text-white text-xl font-extrabold leading-tight mt-0.5">
                  Ready to become a<br />
                  <span style={{ color: GOLD }}>Top Performer</span> today?
                </h1>
              </>
            )}

            {/* Streak + Points + Rank row */}
            <div className="flex flex-wrap gap-2 mt-3">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
                data-testid="points-display"
              >
                <span style={{ color: GOLD }}>🪙</span>
                <span>{points} pts</span>
              </div>
              {streak > 0 && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
                  data-testid="streak-counter"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>{streak}d streak</span>
                </div>
              )}
              {rankNum && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
                >
                  <Trophy className="w-3.5 h-3.5" style={{ color: GOLD }} />
                  <span>Rank #{rankNum}</span>
                </div>
              )}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>Grade {dashboard?.grade ?? student?.grade ?? "—"}</span>
              </div>
            </div>
          </div>

          {/* Notification bell */}
          <button className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "rgba(255,255,255,0.12)" }}>
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* ── Page Body ─────────────────────────────────────────────── */}
      <div className="space-y-5 p-4 md:p-6 md:max-w-6xl md:mx-auto" style={{ background: BG }}>

        {/* Hero Banner */}
        <HeroBanner />

        {/* Space Learning Journey + Today's Missions — side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SpaceLearningJourney points={points} rank={rankNum} />
          <TodaysMissions
            streak={streak}
            pendingHw={dashboard?.pendingHomework ?? 0}
            upcomingTests={dashboard?.upcomingTests ?? 0}
            isLoading={isLoading}
          />
        </div>

        {/* Announcements from admin */}
        <AnnouncementStrip />

        {/* No course banner — improved empty state */}
        {hasNoCourse && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border-2 border-dashed border-orange-200 p-6 flex flex-col items-center text-center gap-3"
              style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)" }}>
              <div className="text-5xl">📚</div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Your journey starts soon!</h2>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
                  You haven't been enrolled in a course yet. Once your admin adds you, your live classes, homework, tests and progress will all appear here.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-4 py-2 rounded-full">
                <span>📞</span>
                <span>Contact your teacher or admin to get started</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Stats */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((card, i) => (
              <StatCard key={card.label} {...card} index={i} isLoading={isLoading} />
            ))}
          </div>
        </div>

        {/* Continue Learning */}
        {(dashboard?.subjectProgress?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Continue Learning</h2>
              <Link href="/courses">
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: NAVY2 }}>
                  All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {dashboard!.subjectProgress!.map((sp, i) => (
                <motion.div
                  key={sp.subjectId}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="w-full"
                >
                  <Link href="/courses">
                    <div
                      className="rounded-2xl p-3.5 cursor-pointer hover:shadow-md transition-shadow"
                      style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}
                      data-testid={`subject-progress-${sp.subjectId}`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center text-base"
                        style={{ background: sp.color ? `${sp.color}22` : "#e0e7ff" }}
                      >
                        📖
                      </div>
                      <div className="text-xs font-bold text-gray-800 truncate">{sp.subjectName}</div>
                      <div className="text-[10px] text-gray-400 mb-2">{Math.round(sp.progress)}% done</div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${sp.progress}%`, background: sp.color || NAVY2 }}
                        />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard Preview */}
        {(leaderboard?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Top Learners This Week</h2>
              <Link href="/leaderboard">
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: NAVY2 }}>
                  View All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {/* Top 3 podium */}
            <div
              className="rounded-2xl p-4 mb-3"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)` }}
            >
              <div className="flex items-end justify-center gap-3">
                {/* 2nd */}
                {leaderboard && leaderboard[1] && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center text-lg font-bold text-white shadow">
                      {leaderboard[1].studentName.charAt(0)}
                    </div>
                    <div className="text-white text-[10px] font-semibold truncate w-16 text-center">{leaderboard[1].studentName.split(" ")[0]}</div>
                    <div className="text-white/60 text-[9px]">{leaderboard[1].points} pts</div>
                    <div className="w-12 h-10 rounded-t-xl flex items-center justify-center text-base font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}>🥈</div>
                  </div>
                )}
                {/* 1st */}
                {leaderboard && leaderboard[0] && (
                  <div className="flex flex-col items-center gap-1 -mb-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ background: GOLD, color: NAVY }}>
                      {leaderboard[0].studentName.charAt(0)}
                    </div>
                    <div className="text-white text-xs font-bold truncate w-20 text-center">{leaderboard[0].studentName.split(" ")[0]}</div>
                    <div className="text-[10px]" style={{ color: GOLD }}>{leaderboard[0].points} pts</div>
                    <div className="w-14 h-14 rounded-t-xl flex items-center justify-center text-xl font-bold" style={{ background: "rgba(255,255,255,0.15)" }}>🥇</div>
                  </div>
                )}
                {/* 3rd */}
                {leaderboard && leaderboard[2] && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white shadow" style={{ background: "#b45309" }}>
                      {leaderboard[2].studentName.charAt(0)}
                    </div>
                    <div className="text-white text-[10px] font-semibold truncate w-16 text-center">{leaderboard[2].studentName.split(" ")[0]}</div>
                    <div className="text-white/60 text-[9px]">{leaderboard[2].points} pts</div>
                    <div className="w-12 h-8 rounded-t-xl flex items-center justify-center text-base font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#b45309" }}>🥉</div>
                  </div>
                )}
              </div>
            </div>

            {/* Ranks 4-5 */}
            <div className="space-y-2">
              {(leaderboard ?? []).slice(3, 5).map((entry, i) => (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  data-testid={`leaderboard-entry-${entry.rank}`}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{entry.rank}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{entry.studentName}</div>
                  </div>
                  <div className="text-xs font-bold" style={{ color: NAVY2 }}>{entry.points} pts</div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements — all 8 with locked/unlocked states */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Achievements</h2>
            <span className="text-xs text-gray-400 font-medium">
              {allAchievements.filter(a => a.unlocked).length}/{allAchievements.length} earned
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {allAchievements.map((ach, i) => (
              <motion.div
                key={ach.label}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border overflow-hidden"
                style={{
                  background:   ach.unlocked ? ach.color  : "#f5f5f5",
                  borderColor:  ach.unlocked ? ach.border : "#e5e5e5",
                  opacity:      ach.unlocked ? 1 : 0.65,
                }}
              >
                <span className="text-xl leading-none">{ach.unlocked ? ach.icon : "🔒"}</span>
                <span className={`text-xs font-semibold leading-tight flex-1 ${ach.unlocked ? "text-gray-700" : "text-gray-400"}`}>
                  {ach.label}
                </span>
                {ach.unlocked && (
                  <span className="absolute top-1 right-1.5 text-[8px] font-bold text-green-600 uppercase tracking-wide">
                    ✓
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {(dashboard?.recentActivity?.length ?? 0) > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Recent Activity</h2>
              <Link href="/recordings">
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: NAVY2 }}>
                  View All <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="w-full h-14 rounded-2xl" />)
              ) : (
                (dashboard?.recentActivity ?? []).slice(0, 5).map((item, i) => {
                  const Icon       = activityIcons[item.type] ?? BookOpen;
                  const colorClass = activityColors[item.type] ?? "text-gray-500 bg-gray-50";
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                      data-testid={`activity-item-${item.id}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.subjectName} · {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                      </div>
                      {item.score !== null && item.score !== undefined && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">{item.score}%</Badge>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Bottom padding for mobile nav */}
        <div className="h-2" />
      </div>

    </AppLayout>
  );
}
