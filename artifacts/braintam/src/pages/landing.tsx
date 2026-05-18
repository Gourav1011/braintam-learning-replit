import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Star, Users, Video, BookOpen, Target, Brain,
  PlayCircle, Zap, X, ChevronRight, Shield, Award, Clock,
  Sparkles, GraduationCap, BarChart3, CheckCircle
} from "lucide-react";

const easing = [0.25, 0.1, 0.25, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: easing },
  }),
};

const features = [
  {
    icon: Video,
    title: "Live Intelligence",
    desc: "Real-time sessions with verified educators. Zero latency, full engagement.",
    accent: "#6366f1",
  },
  {
    icon: Zap,
    title: "Adaptive Engine",
    desc: "AI-powered content that learns your pace and targets your weak spots.",
    accent: "#8b5cf6",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    desc: "Granular progress tracking across every subject, chapter, and concept.",
    accent: "#6366f1",
  },
  {
    icon: Shield,
    title: "Curated Content",
    desc: "Every lesson vetted by academic experts. CBSE, ICSE, and state board aligned.",
    accent: "#8b5cf6",
  },
];

const testimonials = [
  {
    name: "Priya Verma",
    role: "Grade 8 · Mumbai",
    text: "My science score went from 65 to 89 in one term. Braintam's approach is unlike anything I've tried.",
    rating: 5,
    avatar: "PV",
  },
  {
    name: "Rakesh Sharma",
    role: "Parent · Delhi",
    text: "My son actually looks forward to studying now. The live class quality is exceptional.",
    rating: 5,
    avatar: "RS",
  },
  {
    name: "Ananya Singh",
    role: "Grade 10 · Bengaluru",
    text: "Scored 94% in boards. Braintam's test series was indistinguishable from the real exam.",
    rating: 5,
    avatar: "AS",
  },
];

const stats = [
  { value: "5L+", label: "Students" },
  { value: "4.9", label: "App Rating" },
  { value: "200+", label: "Courses" },
  { value: "94%", label: "Score Improvement" },
];

function ParticleField() {
  const count = 28;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const size = Math.random() * 3 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const dur = Math.random() * 8 + 6;
        const delay = Math.random() * 5;
        const opacity = Math.random() * 0.4 + 0.1;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${x}%`,
              top: `${y}%`,
              background: i % 2 === 0 ? "#6366f1" : "#8b5cf6",
              opacity,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [opacity, opacity * 0.3, opacity],
            }}
            transition={{
              duration: dur,
              delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <ParticleField />

      {/* Central orb */}
      <motion.div
        animate={{ scale: [1, 1.04, 1], rotate: [0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <div
          className="w-64 h-64 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 35% 35%, rgba(99,102,241,0.25), rgba(139,92,246,0.05))",
            border: "1px solid rgba(99,102,241,0.3)",
            boxShadow: "0 0 80px rgba(99,102,241,0.15), inset 0 0 40px rgba(99,102,241,0.05)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 30% 30%, rgba(99,102,241,0.4), rgba(139,92,246,0.2))",
              border: "1px solid rgba(99,102,241,0.5)",
              boxShadow: "0 0 40px rgba(99,102,241,0.3)",
            }}
          >
            <Brain className="w-14 h-14 text-indigo-400" />
          </div>
        </div>
      </motion.div>

      {/* Orbiting ring 1 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute w-96 h-96 rounded-full"
        style={{ border: "1px solid rgba(99,102,241,0.15)" }}
      />

      {/* Orbiting ring 2 */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute w-[28rem] h-[28rem] rounded-full"
        style={{ border: "1px dashed rgba(139,92,246,0.1)" }}
      />

      {/* Floating card — Live Class */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-6 right-4 z-20"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "12px 16px",
          minWidth: "160px",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-400 text-xs font-semibold tracking-wide">LIVE NOW</span>
        </div>
        <div className="text-white text-sm font-semibold">Algebra — Chapter 5</div>
        <div className="text-white/40 text-xs mt-0.5">234 students joined</div>
      </motion.div>

      {/* Floating card — Score */}
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-10 left-2 z-20"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          padding: "12px 16px",
        }}
      >
        <div className="text-white/50 text-xs mb-1">Latest Score</div>
        <div className="text-indigo-400 text-2xl font-black">95%</div>
        <div className="text-white/40 text-xs">Mathematics Quiz</div>
      </motion.div>

      {/* Floating card — Rank */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-16 right-2 z-20"
        style={{
          background: "rgba(99,102,241,0.1)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "16px",
          padding: "10px 14px",
        }}
      >
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-400" />
          <div>
            <div className="text-white text-xs font-bold">Rank #7</div>
            <div className="text-white/40 text-xs">Leaderboard</div>
          </div>
        </div>
      </motion.div>

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ background: "#6366f1" }} />
      <div className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full opacity-15 blur-2xl" style={{ background: "#8b5cf6" }} />
    </div>
  );
}

function JoinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: "rgba(9,13,26,0.85)", backdropFilter: "blur(12px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease: easing }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(15,18,35,0.95)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "24px",
              backdropFilter: "blur(40px)",
              boxShadow: "0 0 80px rgba(99,102,241,0.12)",
              padding: "40px",
              width: "100%",
              maxWidth: "440px",
            }}
          >
            <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <img src={braintamLogo} alt="Braintam" className="w-9 h-9 object-contain" />
              <span className="text-white font-bold text-lg">Braintam</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-1">Start learning today</h2>
            <p className="text-white/40 text-sm mb-8">Join 5 lakh+ students. Free forever.</p>

            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
              <select
                className="w-full px-4 py-3 rounded-xl text-white/60 text-sm outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <option value="">Select your grade</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-gray-900">Grade {i + 1}</option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 30px rgba(99,102,241,0.3)" }}
            >
              Create Free Account
            </button>

            <p className="text-white/25 text-xs text-center mt-4">
              Already have an account?{" "}
              <Link href="/login" onClick={onClose} className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign in</Link>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 4500);
    return () => clearInterval(t);
  }, []);

  const bg = "#090D1A";
  const surface = "rgba(255,255,255,0.04)";
  const border = "rgba(255,255,255,0.08)";

  return (
    <div style={{ background: bg, color: "#fff", fontFamily: "'Poppins', sans-serif" }} className="min-h-screen overflow-hidden">
      <JoinModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ─── NAVBAR ─── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easing }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? "rgba(9,13,26,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled ? `1px solid ${border}` : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={braintamLogo} alt="Braintam" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg text-white">Braintam</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            {["Courses", "Live Classes", "Leaderboard"].map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors duration-200">{l}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <span className="text-sm font-medium cursor-pointer transition-colors duration-200 hidden md:block" style={{ color: "rgba(255,255,255,0.5)" }}>
                Sign in
              </span>
            </Link>
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}
            >
              Join Free
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center pt-16 pb-10 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #6366f1, #8b5cf6, transparent)" }} />

        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-6 items-center">
          {/* Left */}
          <div className="space-y-8 relative z-10">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={0}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}
            >
              <Sparkles className="w-3 h-3" />
              India's most advanced learning platform
            </motion.div>

            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={1}
              className="text-5xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight"
            >
              The future of{" "}
              <span
                className="block"
                style={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #8b5cf6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                learning is here.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              custom={2}
              className="text-lg leading-relaxed max-w-md"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              AI-powered live classes, adaptive testing, and curated content for Grades 1–10. Built for results.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-wrap gap-3">
              <button
                onClick={() => setModalOpen(true)}
                className="group flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 0 40px rgba(99,102,241,0.3)",
                }}
              >
                Start for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link href="/login">
                <button
                  className="flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm transition-all duration-300 hover:bg-white/10"
                  style={{
                    background: surface,
                    border: `1px solid ${border}`,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <PlayCircle className="w-4 h-4" />
                  Watch demo
                </button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-4 flex-wrap">
              <div className="flex -space-x-2.5">
                {["#6366f1","#8b5cf6","#4f46e5","#7c3aed"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: c, borderColor: bg }}>
                    {["P","R","A","S"][i]}
                  </div>
                ))}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)" }} className="text-xs">
                <span className="text-white font-semibold">5,00,000+</span> students learning
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                <span className="text-xs text-white/40 ml-1">4.9</span>
              </div>
            </motion.div>
          </div>

          {/* Right — 3D visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: easing }}
            className="relative h-[480px] hidden lg:block"
          >
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ─── TRUST STRIP ─── */}
      <section className="py-8 px-6" style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
            >
              <div className="text-3xl font-black" style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── CORE FEATURES ─── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(99,102,241,0.8)" }}>
              Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Everything you need.<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>Nothing you don't.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i}
                className="group relative overflow-hidden rounded-2xl p-7 transition-all duration-300 cursor-default"
                style={{
                  background: surface,
                  border: `1px solid ${border}`,
                }}
                whileHover={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.06)" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                  >
                    <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1.5 text-white">{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</p>
                  </div>
                </div>
                {/* subtle glow on hover */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 transition-opacity blur-2xl" style={{ background: f.accent }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LIVE CLASS EXPERIENCE PREVIEW ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(99,102,241,0.8)" }}>Live Experience</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">A classroom reinvented.</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Every live session is engineered for focus, participation, and measurable outcomes.
            </p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            custom={1}
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: "rgba(12,15,30,0.9)",
              border: "1px solid rgba(99,102,241,0.2)",
              boxShadow: "0 0 80px rgba(99,102,241,0.08)",
            }}
          >
            {/* Top bar */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>braintam.live</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                LIVE — Algebra Ch.5
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>234 attending</div>
            </div>

            {/* Main content */}
            <div className="grid md:grid-cols-3 gap-0">
              {/* Video area */}
              <div className="md:col-span-2 p-6 space-y-4">
                <div
                  className="aspect-video rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                  <div className="text-center space-y-3 z-10 relative">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
                    >
                      <PlayCircle className="w-7 h-7 text-indigo-400" />
                    </motion.div>
                    <div className="text-sm font-semibold text-white/60">Dr. Priya Sharma · Mathematics</div>
                  </div>
                  {/* Whiteboard indicators */}
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                    {[60, 80, 45, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: h * 0.4 + "px", background: `rgba(99,102,241,${0.1 + i * 0.05})` }} />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Questions answered", value: "12" },
                    { label: "Your accuracy", value: "91%" },
                    { label: "Time in session", value: "23m" },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-xl font-black text-indigo-400">{s.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side panel */}
              <div className="p-4 space-y-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>LIVE CHAT</div>
                {[
                  { name: "Riya", msg: "Can you explain step 3 again?", time: "2m" },
                  { name: "Arjun", msg: "The formula makes sense now!", time: "1m" },
                  { name: "Priya", msg: "Is this in the exam?", time: "30s" },
                  { name: "Teacher", msg: "Yes! Watch carefully 👆", time: "now", highlight: true },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: c.highlight ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${c.highlight ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)"}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: c.highlight ? "#a5b4fc" : "rgba(255,255,255,0.6)" }}>{c.name}</span>
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>{c.time}</span>
                    </div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{c.msg}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 px-6" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(99,102,241,0.8)" }}>Social Proof</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Results that speak.</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i}
                className="rounded-2xl p-6 space-y-4 transition-all duration-300"
                style={{
                  background: surface,
                  border: i === testimonialIdx ? "1px solid rgba(99,102,241,0.4)" : `1px solid ${border}`,
                  boxShadow: i === testimonialIdx ? "0 0 30px rgba(99,102,241,0.1)" : "none",
                }}
              >
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === testimonialIdx ? 24 : 8,
                  height: 8,
                  background: i === testimonialIdx ? "#6366f1" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {/* Orb */}
            <div className="w-16 h-16 rounded-2xl mx-auto mb-8 flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 40px rgba(99,102,241,0.15)" }}>
              <GraduationCap className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Your academic<br />
              <span style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                breakthrough starts now.
              </span>
            </h2>
            <p className="text-base mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Join the platform trusted by half a million Indian students.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1} className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setModalOpen(true)}
              className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white text-sm transition-all duration-300 hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 50px rgba(99,102,241,0.35)" }}
            >
              Create free account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link href="/login">
              <button
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-sm transition-all duration-300 hover:bg-white/10"
                style={{ background: surface, border: `1px solid ${border}`, color: "rgba(255,255,255,0.6)" }}
              >
                Sign in
              </button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2}
            className="flex flex-wrap justify-center gap-6 text-xs"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {["No credit card needed", "Free forever plan", "CBSE & State Board aligned"].map(f => (
              <span key={f} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />{f}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pb-10 px-6" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto">
          <div className="py-10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src={braintamLogo} alt="Braintam" className="w-7 h-7 object-contain opacity-70" />
              <span className="font-bold text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Braintam</span>
            </div>

            <div className="flex flex-wrap gap-8 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              {["Courses", "Live Classes", "Tests", "Leaderboard", "About"].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>

            <div className="flex gap-6 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderTop: `1px solid ${border}`, color: "rgba(255,255,255,0.2)" }}>
            <span>© {new Date().getFullYear()} Braintam EdTech Pvt. Ltd. All rights reserved.</span>
            <span>Made with care in India 🇮🇳</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
