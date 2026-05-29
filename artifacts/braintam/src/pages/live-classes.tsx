import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListLiveClasses, useListSubjects, useJoinLiveClass, getListLiveClassesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Clock, Users, Calendar, Sparkles, ArrowRight, Wifi, BookOpen, Star, Zap, CheckCircle, Monitor } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const FEATURES = [
  { emoji: "🎥", title: "Crystal Clear HD Video", desc: "Zero lag. Full HD streaming. As if the teacher is right there in the room.", color: "#3B82F6" },
  { emoji: "👨‍🏫", title: "IIT & IIM Alumni Teachers", desc: "India's top educators, handpicked for subject mastery and student engagement.", color: "#10B981" },
  { emoji: "🙋", title: "Instant Doubt Resolution", desc: "Raise your hand digitally. Get answered live — no confusion left behind.", color: ORANGE },
  { emoji: "📊", title: "AI Progress Tracking", desc: "Smart analysis of every class. Know exactly what to revise before your next test.", color: "#8B5CF6" },
];

const DEMO_CLASSES = [
  { title: "Algebra Made Easy — Grade 6 Maths", teacher: "Dr. Ramesh Kumar (IIT Delhi)", time: "Today, 4:00 PM", subject: "Mathematics", seats: 12, grade: 6, status: "upcoming" },
  { title: "Cell Division & Life Processes", teacher: "Ms. Anita Singh (AIIMS)", time: "Tomorrow, 5:30 PM", subject: "Science", seats: 8, grade: 7, status: "upcoming" },
  { title: "Advanced Reading & Comprehension", teacher: "Mr. James D'Souza (St. Xavier's)", time: "Sat, 10:00 AM", subject: "English", seats: 15, grade: 5, status: "upcoming" },
];

const STATS = [
  { value: "500+", label: "Live Classes monthly" },
  { value: "98%", label: "Student satisfaction" },
  { value: "50+", label: "Expert teachers" },
  { value: "10,000+", label: "Students taught" },
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

// ── Animated student-at-laptop scene ────────────────────────────────────
function StudentScene() {
  return (
    <div className="relative w-full max-w-sm mx-auto h-64 select-none">
      {/* Floating notification bubbles */}
      <motion.div animate={{ y: [0, -10, 0], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}
        className="absolute top-2 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
        <Wifi className="w-3 h-3" /> Class is LIVE!
      </motion.div>

      <motion.div animate={{ y: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.8 }}
        className="absolute top-8 left-0 bg-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 border border-gray-100"
        style={{ color: NAVY }}>
        ⭐ 4.9 Rating
      </motion.div>

      <motion.div animate={{ y: [0, -6, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.8, repeat: Infinity, delay: 1.5 }}
        className="absolute top-1 left-1/3 bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
        🎯 98% Score!
      </motion.div>

      {/* Desk */}
      <div className="absolute bottom-0 left-4 right-4 h-3 rounded-full bg-gray-300 shadow-md" />

      {/* Laptop body */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-52">
        {/* Screen */}
        <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(255,107,26,0)", "0 0 0 6px rgba(255,107,26,0.15)", "0 0 0 0 rgba(255,107,26,0)"] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="w-52 h-32 rounded-t-xl border-4 border-gray-700 bg-gray-900 overflow-hidden relative">
          {/* Braintam screen interface */}
          <div className="h-full flex flex-col" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 100%)` }}>
            {/* Top bar */}
            <div className="px-2 py-1 flex items-center gap-1.5" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-white/60 text-[8px] ml-2 font-mono">braintam.com/live</span>
            </div>
            {/* Teacher video area */}
            <div className="flex-1 relative p-1">
              <div className="w-full h-full rounded-lg bg-blue-800/50 flex flex-col items-center justify-center gap-1">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-black">R</div>
                </motion.div>
                <span className="text-white/70 text-[7px] font-semibold">Dr. Ramesh Kumar</span>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
                  className="w-16 h-1 rounded-full bg-green-400 mt-0.5" />
              </div>
            </div>
            {/* Bottom toolbar */}
            <div className="px-2 py-1 flex items-center justify-center gap-2" style={{ background: "rgba(0,0,0,0.3)" }}>
              <motion.div animate={{ backgroundColor: ["#ef4444", "#22c55e", "#ef4444"] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-4 h-4 rounded-full flex items-center justify-center">
                <Video className="w-2.5 h-2.5 text-white" />
              </motion.div>
              <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-[6px] text-white">🎤</span>
              </div>
              <div className="text-[7px] text-white/60 ml-1">245 watching</div>
            </div>
          </div>
        </motion.div>

        {/* Laptop base/keyboard */}
        <div className="w-56 -ml-2 h-4 rounded-b-lg bg-gray-600 shadow-xl" />
        <div className="w-60 -ml-4 h-2 rounded-b-xl bg-gray-500 shadow-2xl" />
      </div>

      {/* Student figure */}
      <motion.div
        animate={{ rotate: [-1, 1, -1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 ml-16">
        {/* Head */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-xl shadow-md border-2 border-amber-200 -mb-1">
          😊
        </div>
        {/* Body */}
        <div className="w-14 h-10 rounded-t-2xl flex items-center justify-center -ml-2 shadow"
          style={{ background: `linear-gradient(to bottom, ${NAVY}, #1a4a9b)` }}>
          <span className="text-[10px] text-white/80 font-bold">STUDENT</span>
        </div>
        {/* Arm reaching to laptop (implied by position) */}
      </motion.div>

      {/* Happy sparkles around student */}
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ y: [0, -20, -40], opacity: [1, 0.5, 0], x: [0, (i - 1) * 15, (i - 1) * 30] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
          className="absolute bottom-20 right-10 text-xs">
          {["⭐", "✨", "🌟"][i]}
        </motion.div>
      ))}

      {/* Chair legs (simple) */}
      <div className="absolute bottom-0 left-1/2 ml-8 flex gap-6">
        <div className="w-1.5 h-8 bg-gray-400 rounded-full" />
        <div className="w-1.5 h-8 bg-gray-400 rounded-full" />
      </div>
    </div>
  );
}

function PublicLiveClassesView() {
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFF" }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-20 pb-0 px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 60%, #0f3580 100%)` }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-8 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
          <div className="absolute bottom-0 left-16 w-64 h-64 rounded-full opacity-8 blur-3xl" style={{ background: "#3B82F6" }} />
        </div>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center relative z-10">
          {/* Left: text */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="pt-8 pb-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-6"
              style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.4)", color: ORANGE }}>
              <Sparkles className="w-3.5 h-3.5" /> 500+ Live Classes Every Month
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
              Live Classes That <br />
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Make You Smile
              </span>
            </h1>
            <p className="text-white/70 text-lg mb-8">
              Learn live with India's best teachers — ask questions, get instant answers, and watch your scores soar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-7 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 4px 24px rgba(255,107,26,0.45)" }}>
                  Book FREE Demo Class <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/sign-in">
                <button className="px-7 py-3.5 rounded-full font-bold text-white border border-white/30 hover:bg-white/10 transition-colors text-base">
                  Student Login
                </button>
              </Link>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mt-7">
              {["No credit card", "HD Video quality", "Cancel anytime"].map(t => (
                <div key={t} className="flex items-center gap-1.5 text-white/60 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />{t}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: animation scene */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="flex items-end justify-center pb-0">
            <StudentScene />
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i + 0.4 }}
              className="bg-white rounded-2xl p-4 shadow-md text-center border border-gray-100">
              <div className="text-2xl font-black" style={{ color: i % 2 === 0 ? NAVY : ORANGE }}>{s.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Feature cards ── */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl font-black" style={{ color: NAVY }}>Why Students Love Our Live Classes</h2>
          <p className="text-gray-500 mt-2">Everything you need to learn better, live.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -5, boxShadow: "0 16px 40px rgba(0,0,0,0.1)" }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner"
                style={{ background: `${f.color}18` }}>
                {f.emoji}
              </div>
              <div>
                <h3 className="font-black text-base mb-1" style={{ color: NAVY }}>{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Upcoming demo classes ── */}
      <section className="py-12 px-6" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-3"
              style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-red-500" />
              Upcoming Demo Classes — Open to all
            </span>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>Join a FREE Demo Class Today</h2>
          </motion.div>
          <div className="space-y-3">
            {DEMO_CLASSES.map((cls, i) => (
              <motion.div key={cls.title}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-orange-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4a9b)` }}>
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm" style={{ color: NAVY }}>{cls.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{cls.teacher}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{cls.time}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.seats} seats left</span>
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(11,43,107,0.07)", color: NAVY }}>{cls.subject}</span>
                  </div>
                </div>
                <Link href="/sign-up">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                    className="px-4 py-2 rounded-full text-white text-xs font-bold flex-shrink-0"
                    style={{ background: ORANGE }}>
                    Book Free Seat
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 text-center" style={{ background: NAVY }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl mb-6">🎓</motion.div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Your first class is FREE</h2>
          <p className="text-white/60 mb-8 text-lg max-w-xl mx-auto">
            Join 10,000+ students already attending live classes. No risk, no payment needed.
          </p>
          <Link href="/sign-up">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              className="px-10 py-4 rounded-full font-black text-white text-lg flex items-center gap-2 mx-auto"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 8px 32px rgba(255,107,26,0.5)" }}>
              Book My FREE Demo Class <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      <div className="bg-black/90 text-white/40 text-center py-4 text-xs">
        © 2026 Braintam · India's Premium EdTech Platform
      </div>
    </div>
  );
}

// ── Authenticated view ──────────────────────────────────────────────────
function AuthLiveClassesView() {
  const [subject, setSubject] = useState<string>("all");
  const queryClient = useQueryClient();
  const { student } = useAuth();

  const effectiveGrade = student?.effectiveGrade ?? student?.grade;

  const params = {
    grade: effectiveGrade,
    subjectId: subject !== "all" ? Number(subject) : undefined,
  };

  const { data: classes, isLoading } = useListLiveClasses(params, {
    query: { queryKey: getListLiveClassesQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  const joinMutation = useJoinLiveClass({
    mutation: {
      onSuccess: (data) => {
        if (data.joinUrl) window.open(data.joinUrl, "_blank", "noopener,noreferrer");
      }
    }
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Video className="w-6 h-6 text-red-500" />
            </div>
            Live Classes
          </h1>
          <p className="text-muted-foreground mt-1">
            Join live sessions with top educators
            {effectiveGrade && <span className="ml-2 text-sm font-medium text-primary">· Grade {effectiveGrade}</span>}
          </p>
        </motion.div>

        <div className="flex gap-3 flex-wrap">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-44" data-testid="subject-filter"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(subjects ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : (classes ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No live classes scheduled</p>
            <p className="text-sm">Check back soon for upcoming sessions</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(classes ?? []).map((cls, i) => (
              <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} data-testid={`live-class-card-${cls.id}`}>
                <Card className={`overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-2 ${cls.status === "live" ? "border-red-400" : "border-transparent"}`}>
                  <div className="h-3" style={{ background: `linear-gradient(to right, ${NAVY}, ${ORANGE})` }} />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base leading-tight">{cls.title}</h3>
                      {cls.status === "live" ? (
                        <Badge className="bg-red-500 text-white flex-shrink-0 animate-pulse">LIVE</Badge>
                      ) : cls.status === "upcoming" ? (
                        <Badge variant="outline" className="flex-shrink-0 text-xs border-primary text-primary">{countdown(cls.scheduledAt)}</Badge>
                      ) : (
                        <Badge variant="secondary" className="flex-shrink-0">Ended</Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-secondary">{cls.teacher?.charAt(0)}</span>
                        </div>
                        <span>{cls.teacher}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">{cls.subjectName}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(cls.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{cls.duration} min</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{cls.studentsJoined ?? 0} joined</span>
                      </div>
                    </div>
                    <Button className="w-full" variant={cls.status === "live" ? "default" : "outline"}
                      disabled={cls.status === "ended" || joinMutation.isPending}
                      onClick={() => joinMutation.mutate({ id: cls.id })}
                      data-testid={`join-class-${cls.id}`}>
                      {cls.status === "live" ? "Join Now" : cls.status === "upcoming" ? "Remind Me" : "Class Ended"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function LiveClassesPage() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: `${ORANGE} transparent transparent transparent` }} />
      </div>
    );
  }

  if (!student) return <PublicLiveClassesView />;
  return <AuthLiveClassesView />;
}
