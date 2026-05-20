import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Star, Video, Zap, BarChart3, Shield,
  PlayCircle, GraduationCap, CheckCircle, X, Award,
  Sparkles, Brain, Users, Linkedin, Twitter, Mail,
  Phone, MapPin, Facebook, Instagram, Youtube,
  MessageCircle, BookOpen
} from "lucide-react";

// ── Brand tokens ──────────────────────────────────────────────
const ORANGE  = "#FF6B1A";
const NAVY    = "#0B2B6B";
const BG      = "#06101F";
const SURFACE = "rgba(11,43,107,0.18)";
const BORDER  = "rgba(255,107,26,0.18)";
const BORDER2 = "rgba(255,255,255,0.07)";
const ease    = [0.25, 0.1, 0.25, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease } }),
};

// ── Data ──────────────────────────────────────────────────────
const features = [
  { icon: Video,     title: "Live Classes",      desc: "Real-time sessions with verified educators. Zero lag.",       accent: ORANGE },
  { icon: Zap,       title: "Adaptive Engine",   desc: "AI-powered content that targets every weak spot.",           accent: "#FFA040" },
  { icon: BarChart3, title: "Deep Analytics",    desc: "Granular tracking across every subject and concept.",        accent: ORANGE },
  { icon: Shield,    title: "Curated Content",   desc: "Every lesson vetted by experts. All boards covered.",        accent: "#FFA040" },
];

const tickerStats = [
  { icon: Users,    value: "50+",    label: "Expert Teachers" },
  { icon: BookOpen, value: "1,000+", label: "Active Students" },
  { icon: Star,     value: "4.9 ★",  label: "Rating" },
  { icon: CheckCircle, value: "98%", label: "Retention" },
  { icon: Award,    value: "200+",   label: "Courses" },
  { icon: Brain,    value: "5L+",    label: "Students Served" },
];

const programs = [
  {
    icon: "🌱",
    name: "Foundation Program",
    tag: "Early Edge",
    grades: "Grades 1–5",
    price: "₹29,999",
    period: "/ year",
    freq: "3–4 live classes weekly • Maths, English & Science",
    features: ["Concept-first teaching","Reading + phonics","Mental maths drills","Weekly worksheets","Doubt rooms"],
    color: "#22c55e",
    demo: true,
  },
  {
    icon: "🚀",
    name: "Mastery Program",
    tag: "Boards + Olympiads",
    grades: "Grades 6–10",
    price: "₹34,999",
    period: "/ year",
    freq: "4–5 live classes weekly • Full NCERT coverage",
    features: ["Complete syllabus","Advanced problems","Weekly tests","Doubt solving","Mock exams"],
    color: ORANGE,
    popular: true,
    demo: true,
  },
  {
    icon: "🏆",
    name: "Elite Program",
    tag: "JEE · NEET",
    grades: "Grades 11–12",
    price: "₹37,999",
    period: "/ year",
    freq: "6–7 live classes weekly • Boards + Exam-Ready Prep",
    features: ["Boards + JEE/NEET plan","Mock tests","Daily targets","Doubt rooms","Personal mentor"],
    color: "#a78bfa",
    demo: true,
  },
];

const team = [
  { name: "Gourav Manhas",      role: "Co-Founder & CEO",            bio: "IIT Kanpur · 5 yrs EdTech . Drives the vision to make quality education accessible for every Indian student.", photo: "https://images.unsplash.com/photo-1779267102994-5fd194d300fc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D", tags: ["Strategy","Vision"] },
  { name: "Poonam", role: "Co-Founder & COO", bio: "MBA from ICFAI · 20+ yrs teaching. Architect of Braintam's CBSE/ICSE/IB curriculum framework.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80", tags: ["Curriculum","Pedagogy"] },
  { name: "Rohit Agarwal",    role: "CTO & Co-Founder",            bio: "Ex-Google engineer · AI specialist. Built the platform infrastructure used by 5 lakh+ students daily.", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80", tags: ["AI/ML","Engineering"] },
  { name: "Anita Menon",      role: "Head of Teacher Relations",   bio: "Former KV principal · 20 yrs leadership. Recruits and mentors Braintam's nationwide star-teacher network.", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80", tags: ["Teachers","Quality"] },
  { name: "Deepak Singh",     role: "Head of Animated Content",    bio: "Award-winning animator · ex-Toppr. Created 1,000+ animated explainer videos loved across India.", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80", tags: ["Animation","Design"] },
  { name: "Sneha Kapoor",     role: "VP – Student Success",        bio: "Child psychologist & learning coach. Designs gamification and engagement loops that keep kids motivated.", photo: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80", tags: ["Psychology","UX"] },
  { name: "Arjun Mehta",      role: "VP – Sales & Partnerships",   bio: "Former McKinsey consultant · 10 yrs B2C EdTech. Leads school partnerships and institutional sales across India.", photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80", tags: ["Sales","Growth"] },
  { name: "Kavya Iyer",       role: "Head of Design",              bio: "Ex-Swiggy design lead · Crafts Braintam's premium visual language and ensures every pixel earns its place.", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80", tags: ["Design","Brand"] },
];

const testimonials = [
  { title: "Doubt rooms",           text: "Response is fast and patient — unlike others. Great for board exam prep.",          name: "Rahul",  date: "Jan 2025", rating: 5 },
  { title: "Practical and fun",     text: "Concepts taught with games and tricks — my child actually enjoys practice time now.", name: "Priya",  date: "Feb 2025", rating: 5 },
  { title: "Great mentor support",  text: "Mentors set small goals and follow up — real improvement in tests within months.",   name: "Advik",  date: "Apr 2025", rating: 5 },
  { title: "Worth every rupee",     text: "Structured classes, notes, and timely feedback make this a premium experience.",     name: "Neha",   date: "Jun 2025", rating: 5 },
  { title: "Best in class",         text: "My daughter's confidence jumped after just 2 months. Highly recommend Braintam!",    name: "Sunita", date: "Mar 2025", rating: 5 },
  { title: "Exam ready",            text: "The mock tests are spot-on. My son scored 91% in his boards — thank you Braintam!", name: "Ramesh", date: "May 2025", rating: 5 },
];

const footerLinks = {
  Learn:   ["Live Classes","Courses","Animated Videos","Test Series","Homework Help"],
  Company: ["About Us","Careers","Press Kit","Blog","Contact"],
  Support: ["Help Center","Terms of Service","Privacy Policy","Refund Policy"],
};

// ── Particles ─────────────────────────────────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => {
        const sz = Math.random() * 2.5 + 1;
        const dur = Math.random() * 9 + 5;
        const delay = Math.random() * 6;
        const op = Math.random() * 0.3 + 0.1;
        return (
          <motion.div key={i} className="absolute rounded-full"
            style={{ width: sz, height: sz, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                     background: i % 3 === 0 ? ORANGE : i % 3 === 1 ? "#FFA040" : "#fff", opacity: op }}
            animate={{ y: [0, -24, 0], opacity: [op, op * 0.2, op] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeInOut" }} />
        );
      })}
    </div>
  );
}

// ── Hero Visual ───────────────────────────────────────────────
function HeroVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <Particles />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-[80px] opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ORANGE}, ${NAVY})` }} />
      <motion.div animate={{ scale: [1, 1.03, 1], rotate: [0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="relative z-10">
        <div className="w-56 h-56 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle at 35% 35%, rgba(255,107,26,0.2), rgba(11,43,107,0.1))`,
                   border: `1px solid rgba(255,107,26,0.3)`, boxShadow: `0 0 70px rgba(255,107,26,0.12)`, backdropFilter: "blur(20px)" }}>
          <div className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 30% 30%, rgba(255,107,26,0.35), rgba(11,43,107,0.25))`,
                     border: `1px solid rgba(255,107,26,0.5)`, boxShadow: `0 0 40px rgba(255,107,26,0.25)` }}>
            <Brain className="w-11 h-11" style={{ color: ORANGE }} />
          </div>
        </div>
      </motion.div>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full" style={{ width: 320, height: 320, border: `1px solid rgba(255,107,26,0.12)` }} />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="absolute rounded-full" style={{ width: 400, height: 400, border: `1px dashed rgba(255,107,26,0.07)` }} />

      <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-6 right-4 z-20 rounded-2xl px-4 py-3"
        style={{ background: "rgba(255,107,26,0.1)", backdropFilter: "blur(20px)", border: `1px solid rgba(255,107,26,0.25)`, minWidth: 155 }}>
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /><span className="text-red-400 text-xs font-semibold">LIVE NOW</span></div>
        <div className="text-white text-sm font-semibold">Algebra — Ch. 5</div>
        <div className="text-white/40 text-xs mt-0.5">Premium · Expert-led session</div>
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
        <div><div className="text-white text-xs font-bold">Rank #7</div><div className="text-white/40 text-xs">Leaderboard</div></div>
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
              style={{ background: "rgba(255,255,255,0.05)" }}><X className="w-4 h-4" /></button>
            <div className="flex items-center justify-center mb-6">
              <img src={braintamLogo} alt="Braintam" className="w-14 h-14 object-contain" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-1 text-center">Start learning today</h2>
            <p className="text-sm mb-7 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>Join 5 lakh+ students across India.</p>
            <div className="space-y-3 mb-5">
              {[{ p: "Your full name", t: "text" }, { p: "Email address", t: "email" }, { p: "Password", t: "password" }].map(f => (
                <input key={f.p} type={f.t} placeholder={f.p}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER2}` }}
                  onFocus={e => (e.target.style.borderColor = "rgba(255,107,26,0.5)")}
                  onBlur={e => (e.target.style.borderColor = BORDER2)} />
              ))}
              {[
                { ph: "Select your grade", opts: Array.from({ length: 10 }, (_, i) => `Grade ${i + 1}`) },
                { ph: "Select your board", opts: ["CBSE","ICSE","IB (International Baccalaureate)","State Board – Maharashtra","State Board – Tamil Nadu","State Board – Karnataka","State Board – UP","State Board – Gujarat","Other State Board"] },
              ].map(s => (
                <select key={s.ph} className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER2}`, color: "rgba(255,255,255,0.5)" }}>
                  <option value="">{s.ph}</option>
                  {s.opts.map(o => <option key={o} value={o} className="bg-gray-900">{o}</option>)}
                </select>
              ))}
            </div>
            <Link href="/register" onClick={onClose}>
              <button className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #e05500)`, boxShadow: `0 0 30px rgba(255,107,26,0.3)` }}>
                Create Account — Join Free
              </button>
            </Link>
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

// ── Infinite Ticker ───────────────────────────────────────────
function StatsTicker() {
  const doubled = [...tickerStats, ...tickerStats];
  return (
    <div className="overflow-hidden py-6" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <motion.div className="flex gap-10 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
        {doubled.map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,107,26,0.1)" }}>
              <s.icon className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
            <div>
              <div className="text-base font-black" style={{ color: ORANGE }}>{s.value}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
            <div className="ml-6 w-px h-8" style={{ background: BORDER }} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Team Horizontal Accordion ─────────────────────────────────
function TeamAccordion() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="flex gap-2 h-80 w-full overflow-hidden">
      {team.map((m, i) => (
        <motion.div key={m.name}
          animate={{ flex: active === i ? 5 : 1 }}
          transition={{ duration: 0.45, ease }}
          className="relative overflow-hidden rounded-2xl cursor-pointer flex-shrink-0"
          style={{ minWidth: 60, border: `1px solid ${active === i ? "rgba(255,107,26,0.4)" : BORDER2}` }}
          onMouseEnter={() => setActive(i)}
          onMouseLeave={() => setActive(null)}>
          {/* Photo */}
          <img src={m.photo} alt={m.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(6,16,31,0.97) 0%, rgba(6,16,31,0.6) 45%, rgba(6,16,31,0.15) 100%)` }} />
          {/* Orange side indicator when collapsed */}
          {active !== i && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: ORANGE }} />
          )}
          {/* Content — always visible at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <AnimatePresence>
              {active === i ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }} className="space-y-2">
                  <div className="text-white font-bold text-sm leading-tight">{m.name}</div>
                  <div className="text-xs font-semibold" style={{ color: ORANGE }}>{m.role}</div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{m.bio}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(255,107,26,0.15)", border: `1px solid rgba(255,107,26,0.3)`, color: "#FFA870" }}>{t}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {[Twitter, Linkedin].map((Icon, j) => (
                      <a key={j} href="#" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}>
                        <Icon className="w-3 h-3 text-white" />
                      </a>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-white text-xs font-bold truncate" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 120 }}>
                    {m.name}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Orange glow on active */}
          {active === i && (
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 40px rgba(255,107,26,0.08)` }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Testimonials Loop ─────────────────────────────────────────
function TestimonialsLoop() {
  const doubled = [...testimonials, ...testimonials];
  return (
    <div className="overflow-hidden">
      <motion.div className="flex gap-4 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
        {doubled.map((t, i) => (
          <div key={i} className="flex-shrink-0 w-72 rounded-2xl p-5 space-y-3"
            style={{ background: SURFACE, border: `1px solid ${BORDER2}` }}>
            <div className="flex gap-0.5">
              {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
            </div>
            <div className="font-bold text-sm text-white">{t.title}</div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{t.text}</p>
            <div className="flex justify-between items-center pt-1" style={{ borderTop: `1px solid ${BORDER2}` }}>
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>{t.name}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{t.date}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{ background: BG, color: "#fff", fontFamily: "'Poppins', sans-serif" }} className="min-h-screen overflow-x-hidden">
      <JoinModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── NAVBAR ── */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{ background: scrolled ? "rgba(6,16,31,0.92)" : "transparent",
                 backdropFilter: scrolled ? "blur(24px)" : "none",
                 borderBottom: scrolled ? `1px solid ${BORDER}` : "1px solid transparent" }}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <img src={braintamLogo} alt="Braintam" className="w-24 h-24 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
            {["Courses","Live Classes","Leaderboard"].map(l => (
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <span className="hidden md:block text-sm font-medium cursor-pointer hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.45)" }}>Sign in</span>
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
      <section className="relative min-h-screen flex items-center pt-20 pb-10 px-6 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full opacity-10 blur-[120px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${ORANGE}55, ${NAVY}33, transparent)` }} />
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-7 relative z-10">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.3)`, color: "#FFA870" }}>
              <Sparkles className="w-3 h-3" /> India's most advanced learning platform
            </motion.div>
            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="text-5xl lg:text-[4.25rem] font-black leading-[1.05] tracking-tight">
              The future of{" "}
              <span className="block" style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #FFA040 60%, #FF6B1A 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                learning is here.
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-lg leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.45)" }}>
              AI-powered live classes, adaptive testing, and curated content for Grades 1–12. Built for results.
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
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-5 flex-wrap">
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
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease }} className="relative h-[440px] hidden lg:block">
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ── STATS TICKER ── */}
      <StatsTicker />

      {/* ── FEATURES (compact 4-col) ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Platform</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Everything you need. <span style={{ color: "rgba(255,255,255,0.25)" }}>Nothing you don't.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-default"
                style={{ background: SURFACE, border: `1px solid ${BORDER2}` }}
                whileHover={{ borderColor: "rgba(255,107,26,0.35)", background: "rgba(255,107,26,0.06)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.2)` }}>
                  <f.icon className="w-4.5 h-4.5 w-5 h-5" style={{ color: f.accent }} />
                </div>
                <h3 className="font-bold text-sm mb-1.5 text-white">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROGRAMS / PRICING ── */}
      <section className="py-20 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-12 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Programs</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Premium live learning programs</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>EMI available · Demo class at ₹49 · Enroll directly</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {programs.map((p, i) => (
              <motion.div key={p.name} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="relative rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300"
                style={{ background: p.popular ? `rgba(255,107,26,0.08)` : SURFACE,
                         border: `2px solid ${p.popular ? "rgba(255,107,26,0.5)" : BORDER2}`,
                         boxShadow: p.popular ? `0 0 40px rgba(255,107,26,0.1)` : "none" }}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}>
                    Most Popular
                  </div>
                )}
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl mb-1">{p.icon}</div>
                    <div className="text-white font-bold text-base">{p.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{p.grades}</div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,107,26,0.15)", color: "#FFA870" }}>{p.tag}</span>
                </div>
                {/* Price */}
                <div>
                  <span className="text-3xl font-black" style={{ color: p.color }}>{p.price}</span>
                  <span className="text-sm ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>{p.period}</span>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{p.freq}</div>
                </div>
                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />{f}
                    </li>
                  ))}
                </ul>
                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <button onClick={() => {}} className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                    style={{ background: p.popular ? `linear-gradient(135deg, ${ORANGE}, #c94e00)` : NAVY,
                             boxShadow: p.popular ? `0 0 24px rgba(255,107,26,0.3)` : "none" }}>
                    Enroll Now {p.price}
                  </button>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
                      style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER2}`, color: "rgba(255,255,255,0.7)" }}>
                      Demo ₹49
                    </button>
                    <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                      style={{ background: "#22c55e", color: "#fff" }}>
                      <MessageCircle className="w-3.5 h-3.5" /> Chat
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM HORIZONTAL ACCORDION ── */}
      <section className="py-20 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Meet the Team</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              Built by educators &{" "}
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>innovators.</span>
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Hover over a card to learn more</p>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <TeamAccordion />
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS LOOP ── */}
      <section className="py-20 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-10 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,107,26,0.8)" }}>Reviews</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">What families say about Braintam</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Real experiences from our learning community</p>
          </motion.div>
          <TestimonialsLoop />
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-7 flex items-center justify-center"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.25)`, boxShadow: `0 0 40px rgba(255,107,26,0.15)` }}>
              <GraduationCap className="w-7 h-7" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Your academic<br />
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                breakthrough starts now.
              </span>
            </h2>
            <p className="text-sm mt-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Trusted by 5 lakh+ Indian students across CBSE · ICSE · IB · All State Boards.
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
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-10">
          <div className="space-y-4">
            <img src={braintamLogo} alt="Braintam" className="w-16 h-16 object-contain" />
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              India's premium EdTech platform for school students in grades 1–12.
            </p>
            <div className="space-y-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" style={{ color: ORANGE }} />support@braintam.in</div>
              <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" style={{ color: ORANGE }} />84929 44473</div>
            </div>
            <div className="flex gap-2">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </a>
              ))}
            </div>
          </div>
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section} className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-white">{section}</div>
              {links.map(l => (
                <a key={l} href="#" className="block text-xs transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.35)" }}>{l}</a>
              ))}
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: `1px solid ${BORDER2}` }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>© {new Date().getFullYear()} Braintam EdTech Pvt. Ltd.</span>
          <div className="flex gap-5 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            <Link href="/terms"   className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Made with ❤️ in India 🇮🇳</span>
        </div>
      </footer>
    </div>
  );
}
