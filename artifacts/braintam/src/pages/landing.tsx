import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { useState, useEffect } from "react";
import {
  ArrowRight, Star, Video, Zap, BarChart3, Shield,
  PlayCircle, GraduationCap, CheckCircle, X, Award,
  Sparkles, Brain, Users, Linkedin, Twitter, Mail,
  Phone, MapPin, Facebook, Instagram, Youtube, Apple, Play,
  BookOpen, Target
} from "lucide-react";

// ── Brand tokens ──────────────────────────────────────────────
const ORANGE  = "#FF6B1A";
const NAVY    = "#0B2B6B";
const BG      = "#06101F";          // very dark navy
const SURFACE = "rgba(11,43,107,0.18)";
const BORDER  = "rgba(255,107,26,0.18)";
const BORDER2 = "rgba(255,255,255,0.07)";

const ease = [0.25, 0.1, 0.25, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show:   (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.1, ease } }),
};

// ── Data ──────────────────────────────────────────────────────
const features = [
  { icon: Video,    title: "Live Intelligence",  desc: "Real-time classes with verified educators. Zero lag, full engagement.",           accent: ORANGE },
  { icon: Zap,      title: "Adaptive Engine",    desc: "AI-powered content that learns your pace and targets every weak spot.",           accent: "#FFA040" },
  { icon: BarChart3,title: "Deep Analytics",     desc: "Granular tracking across every subject, chapter, and concept.",                   accent: ORANGE },
  { icon: Shield,   title: "Curated Content",    desc: "Every lesson vetted by experts. CBSE, ICSE, and state board aligned.",           accent: "#FFA040" },
];

const team = [
  {
    name: "Vikram Nair", role: "Co-Founder & CEO",
    bio:  "IIT Delhi alumnus · 12 yrs EdTech. Previously led product at BYJU'S. Passionate about making quality education accessible to every Indian student.",
    avatar: "VN", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&q=80",
    tags: ["Strategy","Product","Vision"],
  },
  {
    name: "Dr. Priya Sharma", role: "Co-Founder & Head of Academics",
    bio:  "PhD IIM Ahmedabad · 15+ yrs teaching. Architect of Braintam's entire curriculum and CBSE-aligned pedagogical framework.",
    avatar: "PS", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=320&q=80",
    tags: ["Curriculum","Pedagogy","CBSE"],
  },
  {
    name: "Rohit Agarwal", role: "CTO & Co-Founder",
    bio:  "Ex-Google engineer · AI & edtech platform specialist. Built the scalable infrastructure used by 5 lakh+ students.",
    avatar: "RA", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&q=80",
    tags: ["AI/ML","Platform","Engineering"],
  },
  {
    name: "Anita Menon", role: "Head of Teacher Relations",
    bio:  "Former KV principal · 20 yrs education leadership. Recruits and mentors Braintam's nationwide star-teacher network.",
    avatar: "AM", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=320&q=80",
    tags: ["Teachers","Quality","Mentorship"],
  },
  {
    name: "Deepak Singh", role: "Head of Animated Content",
    bio:  "Award-winning animator · ex-Toppr. Created 1,000+ animated explainer videos loved by students across India.",
    avatar: "DS", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=320&q=80",
    tags: ["Animation","Content","Design"],
  },
  {
    name: "Sneha Kapoor", role: "VP – Student Success",
    bio:  "Child psychologist & learning coach. Designs the gamification, reward systems, and engagement loops that keep kids motivated daily.",
    avatar: "SK", photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=320&q=80",
    tags: ["Gamification","Psychology","UX"],
  },
];

const testimonials = [
  { name: "Priya Verma",    role: "Grade 8 · Mumbai",       text: "My science score jumped from 65 to 89 in one term. Braintam's approach is unlike anything I've tried.",          rating: 5, av: "PV" },
  { name: "Rakesh Sharma",  role: "Parent · Delhi",         text: "My son actually looks forward to studying now. The live class quality is exceptional.",                           rating: 5, av: "RS" },
  { name: "Ananya Singh",   role: "Grade 10 · Bengaluru",   text: "Scored 94% in boards. Braintam's test series felt exactly like the real exam.",                                  rating: 5, av: "AS" },
];

const stats = [
  { value: "5L+",  label: "Students" },
  { value: "4.9",  label: "App Rating" },
  { value: "200+", label: "Courses" },
  { value: "94%",  label: "Score Boost" },
];

const footerLinks = {
  Learn:   ["Live Classes","Courses","Animated Videos","Test Series","Homework Help"],
  Company: ["About Us","Careers","Press Kit","Blog","Contact"],
  Support: ["Help Center","Terms of Service","Privacy Policy","Refund Policy"],
};

// ── Particles ────────────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 24 }).map((_, i) => {
        const sz  = Math.random() * 2.5 + 1;
        const dur = Math.random() * 9 + 5;
        const delay = Math.random() * 6;
        const op  = Math.random() * 0.35 + 0.1;
        return (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: sz, height: sz, left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
                     background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? "#FFA040" : "#FFFFFF", opacity: op }}
            animate={{ y: [0, -28, 0], opacity: [op, op * 0.2, op] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }} />
        );
      })}
    </div>
  );
}

// ── Hero visual ───────────────────────────────────────────────
function HeroVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <Particles />

      {/* Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-[80px] opacity-20 pointer-events-none"
           style={{ background: `radial-gradient(circle, ${ORANGE}, ${NAVY})` }} />

      {/* Orb */}
      <motion.div animate={{ scale: [1, 1.03, 1], rotate: [0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10">
        <div className="w-60 h-60 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,107,26,0.2), rgba(11,43,107,0.1))`,
                   border: `1px solid rgba(255,107,26,0.3)`,
                   boxShadow: `0 0 70px rgba(255,107,26,0.12), inset 0 0 40px rgba(255,107,26,0.04)`,
                   backdropFilter: "blur(20px)" }}>
          <div className="w-32 h-32 rounded-full flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 30% 30%, rgba(255,107,26,0.35), rgba(11,43,107,0.25))`,
                     border: `1px solid rgba(255,107,26,0.5)`,
                     boxShadow: `0 0 40px rgba(255,107,26,0.25)` }}>
            <Brain className="w-12 h-12" style={{ color: ORANGE }} />
          </div>
        </div>
      </motion.div>

      {/* Rings */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute w-88 h-88 rounded-full" style={{ width: 340, height: 340, border: `1px solid rgba(255,107,26,0.12)` }} />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full" style={{ width: 420, height: 420, border: `1px dashed rgba(255,107,26,0.07)` }} />

      {/* Floating cards */}
      <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-6 right-4 z-20 rounded-2xl px-4 py-3"
        style={{ background: "rgba(255,107,26,0.1)", backdropFilter: "blur(20px)", border: `1px solid rgba(255,107,26,0.25)`, minWidth: 155 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-400 text-xs font-semibold tracking-wide">LIVE NOW</span>
        </div>
        <div className="text-white text-sm font-semibold">Algebra — Ch. 5</div>
        <div className="text-white/40 text-xs mt-0.5">234 students joined</div>
      </motion.div>

      <motion.div animate={{ y: [0, 13, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-10 left-2 z-20 rounded-2xl px-4 py-3"
        style={{ background: "rgba(11,43,107,0.35)", backdropFilter: "blur(20px)", border: `1px solid rgba(255,107,26,0.2)` }}>
        <div className="text-white/50 text-xs mb-1">Latest Score</div>
        <div className="text-2xl font-black" style={{ color: ORANGE }}>95%</div>
        <div className="text-white/40 text-xs">Mathematics Quiz</div>
      </motion.div>

      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-14 right-2 z-20 rounded-2xl px-3 py-2.5 flex items-center gap-2"
        style={{ background: "rgba(255,107,26,0.08)", backdropFilter: "blur(20px)", border: `1px solid rgba(255,107,26,0.2)` }}>
        <Award className="w-4 h-4" style={{ color: ORANGE }} />
        <div>
          <div className="text-white text-xs font-bold">Rank #7</div>
          <div className="text-white/40 text-xs">Leaderboard</div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Join Modal ────────────────────────────────────────────────
function JoinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }} onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: "rgba(6,16,31,0.88)", backdropFilter: "blur(14px)" }}>
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }} transition={{ duration: 0.3, ease }}
            onClick={e => e.stopPropagation()} className="relative w-full max-w-md rounded-3xl p-10"
            style={{ background: "rgba(8,16,38,0.97)", border: `1px solid rgba(255,107,26,0.25)`,
                     backdropFilter: "blur(40px)", boxShadow: `0 0 80px rgba(255,107,26,0.1)` }}>

            <button onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-white/40 hover:text-white"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-7">
              <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
              <span className="font-bold text-xl text-white">Braintam</span>
            </div>
            <h2 className="text-white text-2xl font-bold mb-1">Start learning today</h2>
            <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>Join 5 lakh+ students. Free forever.</p>

            <div className="space-y-3 mb-5">
              {[
                { placeholder: "Your name", type: "text" },
                { placeholder: "Email address", type: "email" },
              ].map(f => (
                <input key={f.placeholder} type={f.type} placeholder={f.placeholder}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 text-sm outline-none focus:ring-1 transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER2}` }}
                  onFocus={e => (e.target.style.borderColor = "rgba(255,107,26,0.5)")}
                  onBlur={e  => (e.target.style.borderColor = BORDER2)} />
              ))}
              <select className="w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-1 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER2}`, color: "rgba(255,255,255,0.5)" }}>
                <option value="">Select your grade</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i+1} value={i+1} className="bg-gray-900">Grade {i+1}</option>
                ))}
              </select>
            </div>

            <button onClick={onClose}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #e05500)`, boxShadow: `0 0 30px rgba(255,107,26,0.3)` }}>
              Create Free Account
            </button>
            <p className="text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              Already have an account?{" "}
              <Link href="/login" onClick={onClose} className="hover:opacity-80 transition-opacity" style={{ color: ORANGE }}>Sign in</Link>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [modalOpen,      setModalOpen]      = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: BG, color: "#fff", fontFamily: "'Poppins', sans-serif" }} className="min-h-screen overflow-hidden">
      <JoinModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── NAVBAR ── */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{ background: scrolled ? "rgba(6,16,31,0.92)" : "transparent",
                 backdropFilter: scrolled ? "blur(24px)" : "none",
                 borderBottom: scrolled ? `1px solid ${BORDER}` : "1px solid transparent" }}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo — 3× bigger, name shown */}
          <div className="flex items-center gap-3">
            <img src={braintamLogo} alt="Braintam" className="w-16 h-16 object-contain" />
            <span className="font-black text-2xl tracking-tight text-white">Braintam</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            {["Courses", "Live Classes", "Leaderboard"].map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <span className="hidden md:block text-sm font-medium cursor-pointer hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}>
                Sign in
              </span>
            </Link>
            <button onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 20px rgba(255,107,26,0.35)` }}>
              Join Free
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 px-6 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-12 blur-[120px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${ORANGE}55, ${NAVY}33, transparent)` }} />

        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-8 relative z-10">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.3)`, color: "#FFA870" }}>
              <Sparkles className="w-3 h-3" />
              India's most advanced learning platform
            </motion.div>

            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="text-5xl lg:text-[4.5rem] font-black leading-[1.05] tracking-tight">
              The future of{" "}
              <span className="block" style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #FFA040 60%, #FF6B1A 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                learning is here.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-lg leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.45)" }}>
              AI-powered live classes, adaptive testing, and curated content for Grades 1–10. Built for results.
            </motion.p>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-wrap gap-3">
              <button onClick={() => setModalOpen(true)}
                className="group flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 40px rgba(255,107,26,0.35)` }}>
                Start for free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link href="/login">
                <button className="flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm transition-all hover:bg-white/10"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.7)" }}>
                  <PlayCircle className="w-4 h-4" /> Watch demo
                </button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-4 flex-wrap">
              <div className="flex -space-x-2.5">
                {[ORANGE, NAVY, "#c94e00", "#1a4a99"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: c, borderColor: BG }}>
                    {["P","R","A","S"][i]}
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span className="text-white font-semibold">5,00,000+</span> students learning
              </span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                <span className="text-xs text-white/40 ml-1">4.9</span>
              </div>
            </motion.div>
          </div>

          {/* Right — 3D visual */}
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease }} className="relative h-[480px] hidden lg:block">
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="py-8 px-6" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}>
              <div className="text-3xl font-black" style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CORE FEATURES ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Platform</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Everything you need.<br />
              <span style={{ color: "rgba(255,255,255,0.25)" }}>Nothing you don't.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="group relative overflow-hidden rounded-2xl p-7 transition-all duration-300 cursor-default"
                style={{ background: SURFACE, border: `1px solid ${BORDER2}` }}
                whileHover={{ borderColor: "rgba(255,107,26,0.35)", background: "rgba(255,107,26,0.06)" }}>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.2)` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1.5 text-white">{f.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</p>
                  </div>
                </div>
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10 blur-2xl transition-opacity"
                  style={{ background: f.accent }} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE CLASS PREVIEW ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Live Experience</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">A classroom reinvented.</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Every live session is engineered for focus, participation, and measurable outcomes.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="relative rounded-3xl overflow-hidden"
            style={{ background: "rgba(8,18,40,0.9)", border: `1px solid rgba(255,107,26,0.18)`,
                     boxShadow: `0 0 80px rgba(255,107,26,0.06)` }}>
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>braintam.live</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE — Algebra Ch.5
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>234 attending</div>
            </div>
            <div className="grid md:grid-cols-3 gap-0">
              <div className="md:col-span-2 p-6 space-y-4">
                <div className="aspect-video rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{ background: "rgba(255,107,26,0.04)", border: `1px solid rgba(255,107,26,0.1)` }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-navy-500/5" />
                  <div className="text-center space-y-3 z-10 relative">
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}
                      className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                      style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.3)` }}>
                      <PlayCircle className="w-7 h-7" style={{ color: ORANGE }} />
                    </motion.div>
                    <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Dr. Priya Sharma · Mathematics</div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2 items-end">
                    {[60, 80, 45, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 rounded-sm" style={{ height: h * 0.35 + "px", background: `rgba(255,107,26,${0.1 + i * 0.05})` }} />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: "Questions answered", value: "12" }, { label: "Your accuracy", value: "91%" }, { label: "Time in session", value: "23m" }].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-xl font-black" style={{ color: ORANGE }}>{s.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 space-y-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>LIVE CHAT</div>
                {[
                  { name: "Riya",    msg: "Can you explain step 3 again?", time: "2m" },
                  { name: "Arjun",   msg: "The formula makes sense now!",  time: "1m" },
                  { name: "Priya",   msg: "Is this in the exam?",          time: "30s" },
                  { name: "Teacher", msg: "Yes! Watch carefully 👆",       time: "now", hi: true },
                ].map((c, i) => (
                  <div key={i} className="rounded-xl p-3"
                    style={{ background: c.hi ? "rgba(255,107,26,0.08)" : "rgba(255,255,255,0.02)",
                             border: `1px solid ${c.hi ? "rgba(255,107,26,0.25)" : "rgba(255,255,255,0.05)"}` }}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: c.hi ? "#FFA870" : "rgba(255,255,255,0.6)" }}>{c.name}</span>
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

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-14 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Social Proof</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Results that speak.</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="rounded-2xl p-6 space-y-4 transition-all duration-300"
                style={{ background: SURFACE, border: i === testimonialIdx ? `1px solid rgba(255,107,26,0.45)` : `1px solid ${BORDER2}`,
                         boxShadow: i === testimonialIdx ? `0 0 30px rgba(255,107,26,0.08)` : "none" }}>
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_,j) => <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}>
                    {t.av}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setTestimonialIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{ width: i === testimonialIdx ? 24 : 8, height: 8,
                         background: i === testimonialIdx ? ORANGE : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM SECTION ── */}
      <section className="py-24 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-16 space-y-3">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Meet the Team</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">
              Built by educators &{" "}
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                innovators.
              </span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              Decades of experience in education, technology, and design — united by one mission: make every Indian student unstoppable.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {team.map((m, i) => (
              <motion.div key={m.name} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1"
                style={{ background: SURFACE, border: `1px solid ${BORDER2}` }}
                whileHover={{ borderColor: "rgba(255,107,26,0.3)", boxShadow: `0 0 40px rgba(255,107,26,0.07)` }}>

                {/* Photo */}
                <div className="relative h-52 overflow-hidden">
                  <img src={m.photo} alt={m.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,16,31,0.92) 0%, rgba(6,16,31,0.3) 50%, transparent 100%)" }} />
                  {/* Social on hover */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {[Twitter, Linkedin].map((Icon, j) => (
                      <a key={j} href="#"
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </a>
                    ))}
                  </div>
                  {/* Name overlay */}
                  <div className="absolute bottom-4 left-5">
                    <div className="text-white font-bold text-base leading-tight">{m.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,165,64,0.9)" }}>{m.role}</div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{m.bio}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.tags.map(tag => (
                      <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.2)`, color: "#FFA870" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Careers nudge */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mt-12 rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,107,26,0.05)", border: `1px dashed rgba(255,107,26,0.2)` }}>
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.25)` }}>
              <Users className="w-6 h-6" style={{ color: ORANGE }} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Want to join our mission?</h3>
            <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.35)" }}>
              We're always looking for passionate educators, engineers, and designers who believe in quality education for every child.
            </p>
            <button className="px-7 py-3 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 24px rgba(255,107,26,0.25)` }}>
              View Open Roles <ArrowRight className="inline w-3.5 h-3.5 ml-1" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-8 flex items-center justify-center"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.25)`, boxShadow: `0 0 40px rgba(255,107,26,0.15)` }}>
              <GraduationCap className="w-8 h-8" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Your academic<br />
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                breakthrough starts now.
              </span>
            </h2>
            <p className="text-base mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Join the platform trusted by half a million Indian students.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
            className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setModalOpen(true)}
              className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white text-sm transition-all hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 50px rgba(255,107,26,0.35)` }}>
              Create free account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link href="/login">
              <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-sm transition-all hover:bg-white/10"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(255,255,255,0.6)" }}>
                Sign in
              </button>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={2}
            className="flex flex-wrap justify-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {["No credit card needed", "Free forever plan", "CBSE & State Board aligned"].map(f => (
              <span key={f} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" style={{ color: ORANGE }} />{f}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        {/* Links row */}
        <div className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
              <span className="font-black text-lg text-white">Braintam</span>
            </div>
            <p className="text-xs leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              India's premium EdTech platform for school students in grades 1–10.
            </p>
            <div className="space-y-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" style={{ color: ORANGE }} />support@braintam.in</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" style={{ color: ORANGE }} />+91 800-BRAIN-TAM</div>
              <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" style={{ color: ORANGE }} />New Delhi, India</div>
            </div>
            <div className="flex gap-2 pt-1">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#"
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-white">{section}</div>
              {links.map(l => (
                <a key={l} href="#" className="block text-xs transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.35)" }}>{l}</a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${BORDER2}` }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            © {new Date().getFullYear()} Braintam EdTech Pvt. Ltd. All rights reserved.
          </span>
          <div className="flex gap-6 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            <Link href="/terms"   className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <a href="#" className="hover:text-white/50 transition-colors">Sitemap</a>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Made with ❤️ in India 🇮🇳</span>
        </div>
      </footer>
    </div>
  );
}
