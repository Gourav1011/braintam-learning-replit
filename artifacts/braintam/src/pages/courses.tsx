import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useListCourses, useListSubjects, getListCoursesQueryKey } from "@workspace/api-client-react";
import { API_BASE } from "@/lib/api-base";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Star, Users, Trophy, Sparkles, ArrowRight, GraduationCap, Zap, Award, CheckCircle, MessageCircle, Clock, Lock, Flame, ChevronRight } from "lucide-react";
import { useAuth, STUDENT_TOKEN_KEY } from "@/components/auth-provider";
import { braintamLogo } from "@/lib/brand-assets";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const IGNITE = "#059669";

// ── Grade course data ──────────────────────────────────────────
interface GradeCourseData {
  specialty: string;
  specialtyIcon: string;
  bubbleColor: string;
  demoHighlights: string[];
  demo: { topics: string[]; desc: string };
  full: { subjects: string[]; desc: string; price: string };
}

const GRADE_DATA: Record<number, GradeCourseData> = {
  1:  { specialty: "Abacus-based Mental Maths",       specialtyIcon: "🧮", bubbleColor: "#FF6B1A",
        demoHighlights: ["Number Tricks", "Concept Clarity", "Mind Mapping", "Fun Recall"],
        demo: { topics: ["Counting & Numbers", "Phonics & Reading", "Shapes & Patterns"],   desc: "Fun tricks to build a rock-solid foundation." },
        full: { subjects: ["Numbers", "English", "EVS"],        desc: "Complete Grade 1 syllabus with tests & mentor support.",  price: "₹39,999" } },
  2:  { specialty: "Times Tables Speed Mastery",       specialtyIcon: "⚡", bubbleColor: "#3B82F6",
        demoHighlights: ["Fast Calculation", "Short Tricks", "Quick Recall", "Mind Maps"],
        demo: { topics: ["Multiplication Basics", "Story Writing", "Maps & Globe"],          desc: "Core concepts in an engaging 5-day camp." },
        full: { subjects: ["Maths", "English", "EVS"],          desc: "Structured full-year program with live classes daily.",   price: "₹39,999" } },
  3:  { specialty: "Vedic Maths Shortcuts",            specialtyIcon: "🔢", bubbleColor: "#8B5CF6",
        demoHighlights: ["Vedic Shortcuts", "Concept Clarity", "Speed Maths", "Mind Mapping"],
        demo: { topics: ["Fractions & Decimals", "Grammar Basics", "Our Environment"],       desc: "Hands-on learning for quick concept clarity." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Chapter-by-chapter coverage with weekly tests.",          price: "₹39,999" } },
  4:  { specialty: "Speed Reading Techniques",         specialtyIcon: "📖", bubbleColor: "#10B981",
        demoHighlights: ["Fast Calculation", "LCM/HCF Tricks", "Reading Speed", "Concept Maps"],
        demo: { topics: ["LCM & HCF", "Reading Skills", "Forces & Motion"],                 desc: "Jump-start key concepts across all subjects." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Deep-dive into Grade 4 syllabus with doubt sessions.",    price: "₹49,999" } },
  5:  { specialty: "Science Olympiad Foundation",      specialtyIcon: "🔭", bubbleColor: "#F59E0B",
        demoHighlights: ["Algebra Basics", "Short Tricks", "Concept Clarity", "Mind Mapping"],
        demo: { topics: ["Algebra Intro", "Essay Writing", "Solar System"],                  desc: "Get a head-start before the full program." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Complete CBSE/ICSE syllabus + Olympiad prep built in.",   price: "₹49,999" } },
  6:  { specialty: "Algebra Thinking & Logic",         specialtyIcon: "📐", bubbleColor: "#EC4899",
        demoHighlights: ["Algebra Shortcuts", "Fast Calculation", "Logic Building", "Mind Maps"],
        demo: { topics: ["Integers & Ratios", "Creative Writing", "Living World"],           desc: "Middle-school concepts demystified in 5 days." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Live classes 5–6×/week with weekly mock exams.",         price: "₹49,999" } },
  7:  { specialty: "IQ & Olympiad Prep",               specialtyIcon: "🏆", bubbleColor: "#06B6D4",
        demoHighlights: ["Equation Tricks", "Fast Formulae", "IQ Hacks", "Concept Clarity"],
        demo: { topics: ["Linear Equations", "Advanced Grammar", "Heat & Light"],            desc: "Solve tricky problems with expert shortcuts." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Comprehensive coverage + dedicated Olympiad modules.",    price: "₹59,999" } },
  8:  { specialty: "Board Exam Strategy",              specialtyIcon: "📋", bubbleColor: "#6366F1",
        demoHighlights: ["Short Tricks", "Rapid Recall", "Answer Mapping", "Fast Calculation"],
        demo: { topics: ["Quadratic Basics", "Literature Analysis", "Cell Biology"],         desc: "Board-prep strategies unlocked in 5 days." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Board-aligned syllabus + full mock test series.",        price: "₹59,999" } },
  9:  { specialty: "JEE / NEET Foundation",            specialtyIcon: "🚀", bubbleColor: "#EF4444",
        demoHighlights: ["Polynomial Tricks", "Fast Derivation", "Concept Clarity", "Mind Mapping"],
        demo: { topics: ["Polynomials", "Comprehension Skills", "Chemical Reactions"],       desc: "Crack Grade 9 concepts with top educators." },
        full: { subjects: ["Maths", "Science", "Social"],       desc: "CBSE/ICSE full syllabus + JEE/NEET foundation start.",   price: "₹59,999" } },
  10: { specialty: "90+ Board Score Program",          specialtyIcon: "🎯", bubbleColor: "#FF6B1A",
        demoHighlights: ["Trig Shortcuts", "Answer Writing", "Speed Revision", "Mind Maps"],
        demo: { topics: ["Trigonometry", "Board Writing Skills", "Genetics Basics"],         desc: "Score 90+ in boards with targeted practice." },
        full: { subjects: ["Maths", "Science", "Social"],       desc: "Board exam mastery + competitive exam readiness.",       price: "₹62,999" } },
};

const TOPPERS = [
  { name: "Arjun Sharma",  grade: 8,  school: "Delhi Public School",  score: "98%", subject: "Mathematics", city: "New Delhi",  achievement: "State Topper 🏆",      initials: "AS", color: "from-amber-400 to-orange-500" },
  { name: "Priya Patel",   grade: 7,  school: "Kendriya Vidyalaya",   score: "96%", subject: "Science",     city: "Mumbai",    achievement: "National Finalist 🥇",  initials: "PP", color: "from-blue-400 to-indigo-600"  },
  { name: "Riya Gupta",    grade: 9,  school: "DAV Public School",    score: "95%", subject: "English",     city: "Pune",      achievement: "School Topper ⭐",      initials: "RG", color: "from-pink-400 to-rose-600"    },
];

const STATS = [
  { value: "430+",        label: "Sessions per Grade / Year", icon: BookOpen     },
  { value: "Grades 1–10", label: "All Classes Covered",       icon: GraduationCap },
  { value: "CBSE·ICSE·IB",label: "Hybrid Curriculum",         icon: Award        },
  { value: "4.9★",        label: "Parent Rating",             icon: Star         },
];

// ── Nav ────────────────────────────────────────────────────────
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
              <span className={`cursor-pointer transition-colors font-semibold ${scrolled ? "text-gray-700 hover:text-orange-500" : "text-white/80 hover:text-white"}`}>{l}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><span className={`text-sm font-semibold cursor-pointer ${scrolled ? "text-gray-700" : "text-white/90"}`}>Sign In</span></Link>
          <Link href="/register">
            <button className="px-5 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}>Join Free</button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Grade Tab Selector ─────────────────────────────────────────
function GradeTabs({ active, onChange }: { active: number; onChange: (g: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9CA3AF" }}>Select Grade</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(g => {
          const isActive = active === g;
          return (
            <button
              key={g}
              onClick={() => onChange(g)}
              className="relative flex-shrink-0 w-9 h-9 rounded-full text-xs font-black transition-all duration-200 overflow-hidden"
              style={{
                background: isActive ? `linear-gradient(135deg, ${NAVY}, #1a3a7a)` : "white",
                color: isActive ? "white" : "#6B7280",
                boxShadow: isActive
                  ? `0 4px 14px rgba(11,43,107,0.35), 0 0 0 2px rgba(255,107,26,0.5)`
                  : "0 1px 3px rgba(0,0,0,0.08)",
                border: isActive ? "none" : "1.5px solid #E5E7EB",
              }}
            >
              {g}
              {isActive && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: ORANGE }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Grade-based Ignite pricing (mirrors backend + enroll page) ─
const IGNITE_PRICE: Record<number, number> = {
  1: 99, 2: 99,
  3: 39, 4: 39, 5: 39, 6: 39, 7: 39, 8: 39,
  9: 89, 10: 89,
};
const IGNITE_MRP = 599;
const getIgnitePrice = (g: number) => IGNITE_PRICE[g] ?? 39;
const getIgniteDisc  = (g: number) =>
  Math.round(((IGNITE_MRP - getIgnitePrice(g)) / IGNITE_MRP) * 100);

// ── Ignite Course Card (was Demo Card) ────────────────────────
function DemoCard({ grade, data, demoHighlights, bubbleColor }: {
  grade: number; data: GradeCourseData["demo"];
  demoHighlights: string[]; bubbleColor: string;
}) {
  const price = getIgnitePrice(grade);
  const disc  = getIgniteDisc(grade);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-2xl border-2 p-6 flex flex-col gap-4 relative overflow-hidden"
      style={{ background: "white", borderColor: "rgba(255,107,26,0.2)", boxShadow: "0 8px 32px rgba(255,107,26,0.08)" }}
    >
      {/* Decorative bubbles */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-xl pointer-events-none"
        style={{ background: bubbleColor }} />
      <div className="absolute -bottom-8 -left-4 w-32 h-32 rounded-full opacity-8 blur-2xl pointer-events-none"
        style={{ background: ORANGE }} />
      <div className="absolute top-1/2 right-4 w-12 h-12 rounded-full opacity-6 blur-lg pointer-events-none"
        style={{ background: bubbleColor }} />

      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${ORANGE}, #FFA040)` }} />

      <div className="flex items-start justify-between relative z-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full"
          style={{ background: "rgba(255,107,26,0.12)", color: ORANGE }}>
          ⚡ 5-Day Ignite
        </span>
        <span className="text-xs text-gray-400 font-medium">Try before you invest</span>
      </div>

      {/* Demo highlights chips */}
      <div className="relative z-10 flex flex-wrap gap-1.5">
        {demoHighlights.map(h => (
          <span key={h} className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: `${bubbleColor}18`, color: bubbleColor, border: `1px solid ${bubbleColor}35` }}>
            {h}
          </span>
        ))}
      </div>

      <div className="relative z-10">
        <h3 className="text-xl font-black leading-tight" style={{ color: NAVY }}>
          5-Day Ignite Course — Grade {grade}
        </h3>
        <p className="text-gray-500 text-sm mt-1">{data.desc}</p>
      </div>

      <div className="flex flex-wrap gap-2 relative z-10">
        {data.topics.map(t => (
          <span key={t} className="text-xs px-3 py-1 rounded-full font-medium border"
            style={{ background: "rgba(11,43,107,0.04)", borderColor: "rgba(11,43,107,0.12)", color: NAVY }}>
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-400 relative z-10">
        <Clock className="w-3.5 h-3.5" />
        <span>5–6 classes / week</span>
      </div>

      <div className="border-t border-gray-100 pt-3 flex items-center gap-2 relative z-10">
        <span className="font-black text-2xl" style={{ color: ORANGE }}>₹{price}</span>
        <span className="text-sm text-gray-400 line-through">₹{IGNITE_MRP}</span>
        <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
          style={{ background: "#dcfce7", color: "#16a34a" }}>{disc}% OFF</span>
        <span className="text-xs text-gray-400 font-medium ml-auto">5-Day program</span>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <Link href="/enroll" className="flex-1">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl font-black text-sm text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 4px 16px rgba(255,107,26,0.35)` }}>
            Enroll Now — ₹{price}
          </motion.button>
        </Link>
        <Link href="/connect">
          <button className="text-xs font-semibold whitespace-nowrap hover:underline" style={{ color: NAVY }}>
            Why Ignite?
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

// ── Full Year Card ─────────────────────────────────────────────
function FullYearCard({ grade, data, specialty, specialtyIcon, bubbleColor }: {
  grade: number; data: GradeCourseData["full"];
  specialty: string; specialtyIcon: string; bubbleColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
      className="rounded-2xl border-2 p-6 flex flex-col gap-4 relative overflow-hidden"
      style={{ background: "white", borderColor: "rgba(11,43,107,0.18)", boxShadow: "0 8px 40px rgba(11,43,107,0.1)" }}
    >
      {/* Decorative bubbles */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-8 blur-2xl pointer-events-none"
        style={{ background: NAVY }} />
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-xl pointer-events-none"
        style={{ background: bubbleColor }} />
      <div className="absolute top-1/3 right-8 w-16 h-16 rounded-full opacity-5 blur-xl pointer-events-none"
        style={{ background: bubbleColor }} />

      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${NAVY}, #3B6FD4)` }} />

      <div className="flex items-start justify-between relative z-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full text-white"
          style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3a7a)` }}>
          🏆 Full Year
        </span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,107,26,0.1)", color: ORANGE }}>Best value</span>
      </div>

      {/* Specialty badge */}
      <div className="relative z-10 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: `${bubbleColor}14`, border: `1px solid ${bubbleColor}30` }}>
        <span className="text-base">{specialtyIcon}</span>
        <div>
          <span className="text-xs font-black" style={{ color: bubbleColor }}>Grade Specialty</span>
          <p className="text-xs font-semibold text-gray-700 leading-tight">{specialty}</p>
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="text-xl font-black leading-tight" style={{ color: NAVY }}>
          Live Full Syllabus — Grade {grade}
        </h3>
        <p className="text-gray-500 text-sm mt-1">{data.desc}</p>
      </div>

      <div className="flex flex-wrap gap-2 relative z-10">
        {data.subjects.map(s => (
          <span key={s} className="text-xs px-3 py-1 rounded-full font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${NAVY}CC, #1a3a7aCC)` }}>
            {s}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-400 relative z-10">
        <Clock className="w-3.5 h-3.5" />
        <span>5–6 classes / week</span>
      </div>

      {/* Perks */}
      <div className="grid grid-cols-2 gap-1.5 relative z-10">
        {["Live classes", "Doubt sessions", "Mock tests", "Mentor support"].map(f => (
          <div key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ORANGE }} />
            {f}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3 relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="font-black text-2xl" style={{ color: NAVY }}>{data.price}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: "#16A34A" }}>EMI available</span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <Link href={`/enroll-full?grade=${grade}`} className="flex-1">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl font-black text-sm border-2 transition-all"
            style={{ borderColor: NAVY, color: NAVY, background: "white" }}>
            Enroll Full
          </motion.button>
        </Link>
        <Link href="/connect">
          <button className="flex items-center gap-1 text-xs font-semibold whitespace-nowrap hover:underline"
            style={{ color: "#6B7280" }}>
            <MessageCircle className="w-3.5 h-3.5" /> Talk to Counsellor
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

// ── Why Parents Choose Braintam ─────────────────────────────────
function WhyParents() {
  const extras = [
    { icon: "📊", title: "Structured practice & progress reports", desc: "Parents get weekly PDF reports on weak areas." },
    { icon: "🏅", title: "Tight & focused delivery", desc: "No filler content — every class mapped to the syllabus." },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className="mt-10 rounded-2xl overflow-hidden border border-gray-100"
      style={{ background: "linear-gradient(135deg, #F8FAFF 0%, #EEF4FF 100%)" }}>

      {/* Dual Teacher highlight */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-black text-lg" style={{ color: NAVY }}>Why parents choose Braintam</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black px-2.5 py-0.5 rounded-full text-white" style={{ background: ORANGE }}>
            Signature
          </span>
          <span className="text-xs font-bold" style={{ color: NAVY }}>Dual Teacher Model — only at Braintam</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* IIT/NIT Expert */}
          <div className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: `linear-gradient(135deg, ${NAVY}F2, #1a3a7a)` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,107,26,0.3)", border: "1px solid rgba(255,107,26,0.5)" }}>
              <span className="text-base">🎓</span>
            </div>
            <div>
              <p className="font-black text-sm text-white">NIT / IIT Experienced Teacher</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>Live classes with real-time Q&A every session.</p>
            </div>
          </div>
          {/* Personal Mentor */}
          <div className="flex items-start gap-3 rounded-xl p-3 border"
            style={{ background: "white", borderColor: `rgba(11,43,107,0.12)` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `rgba(11,43,107,0.08)`, border: `1px solid rgba(11,43,107,0.15)` }}>
              <span className="text-base">🤝</span>
            </div>
            <div>
              <p className="font-black text-sm" style={{ color: NAVY }}>Personal Mentor</p>
              <p className="text-xs mt-0.5 text-gray-500">1-on-1 calls, progress tracking & parent updates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-6" />

      {/* Other reasons */}
      <div className="grid sm:grid-cols-2 gap-4 px-6 py-5">
        {extras.map(r => (
          <div key={r.title} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{r.icon}</span>
            <div>
              <p className="font-bold text-sm" style={{ color: NAVY }}>{r.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Public Courses View ─────────────────────────────────────────
function PublicCoursesView() {
  const [activeGrade, setActiveGrade] = useState(1);

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFF" }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-24 pb-16 px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 60%, #0f3580 100%)` }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
          <div className="absolute bottom-0 left-20 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: "#3B82F6" }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-6"
              style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.4)", color: ORANGE }}>
              <Sparkles className="w-3.5 h-3.5" /> Premium EdTech Platform for Grades 1–10
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-5">
              Explore India's <br />
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Best Courses
              </span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-5">
              Full School Syllabus + Competitive Exam Preparation — taught by India's top educators.
            </p>

            {/* Dual teacher strip */}
            <div className="inline-flex flex-wrap items-center justify-center gap-3 mb-8 px-5 py-3 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,107,26,0.3)", border: "1px solid rgba(255,107,26,0.5)" }}>
                  <GraduationCap className="w-4 h-4" style={{ color: ORANGE }} />
                </div>
                <span className="text-sm font-bold text-white">NIT/IIT Experienced Teacher</span>
              </div>
              <span className="text-white/30 text-lg font-thin hidden sm:block">+</span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Personal Mentor</span>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-black"
                style={{ background: ORANGE, color: "white" }}>Dual Teacher Model</span>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/enroll">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 4px 24px rgba(255,107,26,0.45)` }}>
                  Enroll in Ignite Course <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/login">
                <button className="px-8 py-3.5 rounded-full font-bold text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 transition-colors text-base">
                  Already a student?
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="max-w-5xl mx-auto px-6 -mt-6 relative z-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-lg text-center border border-gray-100">
              <div className="text-2xl font-black" style={{ color: i % 2 === 0 ? NAVY : ORANGE }}>{s.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Grade-Based Courses ── */}
      <section className="max-w-5xl mx-auto px-6 py-14">
        {/* Section header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3a7a)` }}>
              <img src={braintamLogo} alt="" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight" style={{ color: NAVY }}>
                Braintam Live Courses · Grades 1–10
              </h2>
              <p className="text-gray-500 text-sm">Full School Syllabus + Competitive Exam Preparation</p>
            </div>
          </div>
        </motion.div>

        {/* Grade tabs */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-6">
          <GradeTabs active={activeGrade} onChange={setActiveGrade} />
        </motion.div>

        {/* Two cards */}
        <AnimatePresence mode="wait">
          <motion.div key={activeGrade}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="grid md:grid-cols-2 gap-5">
            <DemoCard
              grade={activeGrade}
              data={GRADE_DATA[activeGrade].demo}
              demoHighlights={GRADE_DATA[activeGrade].demoHighlights}
              bubbleColor={GRADE_DATA[activeGrade].bubbleColor}
            />
            <FullYearCard
              grade={activeGrade}
              data={GRADE_DATA[activeGrade].full}
              specialty={GRADE_DATA[activeGrade].specialty}
              specialtyIcon={GRADE_DATA[activeGrade].specialtyIcon}
              bubbleColor={GRADE_DATA[activeGrade].bubbleColor}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Discount CTA Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative mt-6 rounded-2xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 55%, #0d1f4a 100%)` }}
        >
          {/* Background bubbles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10 blur-2xl pointer-events-none"
            style={{ background: ORANGE }} />
          <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-8 blur-2xl pointer-events-none"
            style={{ background: ORANGE }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-16 rounded-full opacity-5 blur-3xl pointer-events-none"
            style={{ background: ORANGE }} />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 px-6 py-5">
            {/* Left: text */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,107,26,0.25)", border: "1px solid rgba(255,107,26,0.4)" }}>
                <span className="text-xl">🎁</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                    style={{ background: ORANGE, color: "white" }}>LIMITED OFFER</span>
                  <span className="text-white font-black text-base">Get an exclusive discount!</span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Try the Ignite Course <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span> or contact our team — mention this page and unlock a special price on the Full Year plan.
                </p>
              </div>
            </div>

            {/* Right: CTAs */}
            <div className="flex items-center gap-2.5 flex-shrink-0 w-full sm:w-auto">
              <Link href="/enroll" className="flex-1 sm:flex-initial">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 4px 18px rgba(255,107,26,0.45)` }}>
                  ⚡ Enroll — Ignite Course
                </motion.button>
              </Link>
              <Link href="/connect" className="flex-1 sm:flex-initial">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}>
                  💬 Talk to Team
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Why parents choose Braintam */}
        <WhyParents />
      </section>

      {/* ── AI Topper Students ── */}
      <section className="py-16 px-6" style={{ background: `linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-4"
              style={{ background: "rgba(255,107,26,0.1)", color: ORANGE }}>
              <Trophy className="w-3.5 h-3.5" /> AI-Powered Learning Results
            </span>
            <h2 className="text-3xl font-black" style={{ color: NAVY }}>Meet Our Star Toppers</h2>
            <p className="text-gray-500 mt-2">Real students. Real results. Powered by Braintam.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TOPPERS.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl"
                  style={{ background: `linear-gradient(to right, ${NAVY}, ${ORANGE})` }} />
                <div className="bt-float-sm absolute top-4 right-4 text-lg">{t.achievement.split(" ")[1]}</div>
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                    {t.initials}
                  </div>
                  <div className="bt-spin-slow absolute -top-1 -right-1 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h3 className="font-black text-base" style={{ color: NAVY }}>{t.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t.school} · {t.city}</p>
                <p className="text-xs text-gray-400 mt-0.5">Grade {t.grade} · {t.subject}</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-2xl font-black" style={{ color: ORANGE }}>{t.score}</span>
                  <span className="text-xs text-gray-400 font-medium">Score</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(11,43,107,0.07)", color: NAVY }}>
                  <Award className="w-3 h-3" /> {t.achievement.split(" ")[0]}
                </div>
                <div className="flex justify-center gap-1 mt-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-100">
              <Zap className="w-5 h-5" style={{ color: ORANGE }} />
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: NAVY }}>AI-Personalised Learning Path</p>
                <p className="text-xs text-gray-500">Our AI adapts to each student's pace, identifying weak areas and focusing practice exactly where needed.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 text-center" style={{ background: NAVY }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Ready to become a topper?</h2>
          <p className="text-white/60 mb-8 text-lg">430+ guided sessions per grade · CBSE · ICSE · IB hybrid curriculum</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/enroll">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="px-10 py-4 rounded-full font-black text-white text-lg flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 8px 32px rgba(255,107,26,0.5)" }}>
                Enroll in Ignite Course <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-4">No credit card required · Cancel anytime</p>
        </motion.div>
      </section>

      <div className="bg-black/90 text-white/40 text-center py-4 text-xs">
        © 2026 Braintam Learning · India's Premium EdTech Platform
      </div>
    </div>
  );
}

// ── Authenticated view ──────────────────────────────────────────────────
const SUBJ_EMOJIS = ["📘", "🧪", "📖", "🗺️", "🎨", "🏃", "🔢", "🌍"];
const SUBJ_COLORS = ["#1d4ed8", "#059669", "#7c3aed", "#b45309", "#0891b2", "#dc2626", "#d97706", "#0f766e"];

function WeekRoadmap({ progress }: { progress: number }) {
  const weeks = [
    { label: "Week 1", threshold: 25 },
    { label: "Week 2", threshold: 50 },
    { label: "Week 3", threshold: 75 },
    { label: "Week 4", threshold: 100 },
  ];
  return (
    <div className="flex gap-1.5">
      {weeks.map((w, i) => {
        const done = progress >= w.threshold;
        const current = progress >= (w.threshold - 25) && progress < w.threshold;
        const locked = progress < (w.threshold - 25) && !done;
        return (
          <div key={w.label} className="flex-1 text-center">
            <div className={`h-1.5 rounded-full mb-1 ${done ? "bg-green-500" : current ? "bg-orange-400" : "bg-gray-200"}`} />
            <span className="text-[9px] font-bold" style={{ color: done ? "#16a34a" : current ? ORANGE : "#9ca3af" }}>
              {done ? "✅" : current ? "🔵" : "🔒"} W{i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AdventureCourseCard({ course, idx }: { course: any; idx: number }) {
  const accentColor = SUBJ_COLORS[idx % SUBJ_COLORS.length];
  const emoji = SUBJ_EMOJIS[idx % SUBJ_EMOJIS.length];
  const pct = (course.totalLessons && course.completedLessons != null)
    ? Math.min(100, Math.round((course.completedLessons / course.totalLessons) * 100))
    : 0;
  const completedLessons = course.completedLessons ?? 0;
  const totalLessons = course.totalLessons ?? 0;
  const xpEarned = Math.round(pct * 2);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
      <Link href={`/courses/${course.id}`}>
        <div className="rounded-3xl overflow-hidden cursor-pointer hover:shadow-xl transition-all"
          style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}
          data-testid={`adventure-card-${course.id}`}>

          {/* Header strip */}
          <div className="relative h-32 md:h-36 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${accentColor}ee, ${accentColor}aa)` }}>
            {course.thumbnailUrl && (
              <img src={course.thumbnailUrl} alt={course.title}
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30" />
            )}
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="text-3xl">{emoji}</span>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                    {course.subjectName}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,215,0,0.3)", color: "#fde68a" }}>
                    ⚡ {xpEarned} XP earned
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-white font-black text-sm md:text-base line-clamp-2 leading-snug">{course.title}</h3>
                <p className="text-white/70 text-xs mt-0.5">{completedLessons}/{totalLessons} lessons</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-gray-600">Progress</span>
                <span className="font-black" style={{ color: accentColor }}>{pct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                  style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />
              </div>
            </div>

            {/* Week roadmap */}
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Weekly Roadmap</p>
              <WeekRoadmap progress={pct} />
            </div>

            {/* Next mission */}
            <div className="flex items-center justify-between p-2.5 rounded-xl"
              style={{ background: `${accentColor}0f` }}>
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Next Mission</p>
                  <p className="text-xs font-bold" style={{ color: accentColor }}>
                    {pct === 0 ? "Start your first lesson!"
                     : pct < 25 ? "Complete Week 1 lessons"
                     : pct < 50 ? "Finish Week 2 content"
                     : pct < 75 ? "Tackle Week 3 challenges"
                     : pct < 100 ? "Complete the final week!"
                     : "🏆 Course completed!"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: accentColor }} />
            </div>

            <button className="w-full py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
              {pct === 0 ? "🚀 Start Adventure" : pct === 100 ? "✅ Review Course" : "▶ Continue Learning"}
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

interface DemoBatchItem {
  batch: {
    id: number; title: string; description: string | null; teacherName: string | null;
    bannerUrl: string | null; joinLink: string | null; startDate: string | null;
    endDate: string | null; status: string; grade: number | null; subject: string | null; totalDays: number;
  };
  sessions: Array<{
    id: number; title: string; dayNumber: number; scheduledAt: string;
    duration: number; joinUrl: string | null; status: string; isPublished: boolean;
  }>;
}

interface CompletedCourse {
  enrollmentId: number;
  courseId: number;
  courseTitle: string;
  grade: number;
  totalLessons: number;
  subjectCount: number;
  recordingCount: number;
  chapterCount: number;
  academicYear: string | null;
  enrolledAt: string;
  completedAt: string | null;
  completionNote: string | null;
}

function AuthCoursesView() {
  const [subject, setSubject] = useState<string>("all");
  const [search, setSearch]   = useState("");
  const [activeTab, setActiveTab] = useState<"current" | "completed">("current");
  const { student } = useAuth();

  const [, setLocation] = useLocation();
  const [demoBatches, setDemoBatches] = useState<DemoBatchItem[]>([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    if (!token) { setDemoLoading(false); return; }
    fetch(`${API_BASE}/api/student/my-demo-batches`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: DemoBatchItem[]) => setDemoBatches(data))
      .catch(() => {})
      .finally(() => setDemoLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "completed") return;
    setCompletedLoading(true);
    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    fetch(`${API_BASE}/api/student/my-courses/completed`, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: CompletedCourse[]) => setCompletedCourses(data))
      .catch(() => {})
      .finally(() => setCompletedLoading(false));
  }, [activeTab]);

  const params = {
    subjectId: subject !== "all" ? Number(subject) : undefined,
    search: search.trim() || undefined,
  };

  const { data: courses, isLoading } = useListCourses(params, {
    query: { queryKey: getListCoursesQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  const subjectProgress = useMemo(() => {
    if (!courses) return [];
    const map: Record<number, { id: number; name: string; total: number; done: number; idx: number }> = {};
    let idx = 0;
    courses.forEach(c => {
      if (!c.subjectId) return;
      if (!map[c.subjectId]) { map[c.subjectId] = { id: c.subjectId, name: c.subjectName ?? "", total: 0, done: 0, idx: idx++ }; }
      map[c.subjectId].total += c.totalLessons ?? 0;
      map[c.subjectId].done  += c.completedLessons ?? 0;
    });
    return Object.values(map);
  }, [courses]);

  // Subject icon/color helpers
  const getSubjStyle = (name: string, fallbackIdx: number) => {
    const n = name.toLowerCase();
    if (n.includes("math")) return { color: "#2563eb", icon: "123", text: true };
    if (n.includes("science")) return { color: "#059669", icon: "🧪", text: false };
    if (n.includes("english")) return { color: "#ea580c", icon: "📖", text: false };
    if (n.includes("hindi")) return { color: "#db2777", icon: "अ", text: true };
    if (n.includes("computer")) return { color: "#7c3aed", icon: "💻", text: false };
    if (n.includes("evs") || n.includes("environment")) return { color: "#0891b2", icon: "🌍", text: false };
    if (n.includes("social") || n.includes("sst")) return { color: "#b45309", icon: "🗺️", text: false };
    return { color: SUBJ_COLORS[fallbackIdx % SUBJ_COLORS.length], icon: SUBJ_EMOJIS[fallbackIdx % SUBJ_EMOJIS.length], text: false };
  };

  const continueLearningSubj = subjectProgress.filter(s => s.done > 0)
    .sort((a, b) => (b.done / Math.max(b.total, 1)) - (a.done / Math.max(a.total, 1)))[0] ?? null;

  return (
    <AppLayout>
      {/* ── WHITE HEADER ── */}
      <div style={{ background: "white", borderBottom: "1px solid #f0f4f8" }}>
        <div className="px-4 pt-5 pb-4 max-w-5xl mx-auto relative overflow-hidden">
          {/* Desktop decorative */}
          <div className="hidden md:block absolute right-6 top-2 pointer-events-none select-none" style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 58, animation: "float 6s ease-in-out infinite" }}>🌍</div>
            <div style={{ fontSize: 40, textAlign: "right", marginTop: -6, animation: "float 5s ease-in-out infinite 0.8s" }}>👨‍🚀</div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black leading-tight" style={{ color: NAVY }}>
            My Learning <span style={{ fontStyle: "normal" }}>📖</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Explore your subjects and keep learning</p>

          {/* Tab pills */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setActiveTab("current")}
              className="px-5 py-2 rounded-full text-sm font-black transition-all"
              style={{
                background: activeTab === "current" ? NAVY : "#f1f5f9",
                color: activeTab === "current" ? "white" : "#64748b",
              }}
            >
              Current Learning
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className="px-5 py-2 rounded-full text-sm font-black transition-all flex items-center gap-1.5"
              style={{
                background: activeTab === "completed" ? "#059669" : "#f1f5f9",
                color: activeTab === "completed" ? "white" : "#64748b",
              }}
            >
              Completed Courses
              {completedCourses.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }}>
                  {completedCourses.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT AREA ── */}
      <div className="px-4 pb-8 py-4 md:p-6 max-w-5xl mx-auto space-y-4" style={{ background: "#f8fafc" }}>

        {/* ════════ COMPLETED COURSES TAB ════════ */}
        {activeTab === "completed" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🎓</span>
              <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: NAVY }}>Completed Courses</h2>
              {completedCourses.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "#d1fae5", color: "#059669" }}>
                  {completedCourses.length} Course{completedCourses.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {completedLoading ? (
              <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
            ) : completedCourses.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-white">
                <div className="text-5xl mb-3">🎓</div>
                <p className="text-sm font-bold text-gray-700">No completed courses yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Your completed programs will appear here — all lessons, recordings, and materials stay accessible.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {completedCourses.map((c, i) => (
                  <motion.div key={c.enrollmentId}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl overflow-hidden bg-white"
                    style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.07)", border: "1.5px solid #d1fae5" }}>
                    <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#059669,#34d399)" }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "#d1fae5", color: "#059669" }}>✓ Completed</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Grade {c.grade}</span>
                            {c.academicYear && <span className="text-[10px] font-bold text-gray-400">Academic Year {c.academicYear}</span>}
                          </div>
                          <h3 className="text-base font-black leading-tight" style={{ color: NAVY }}>{c.courseTitle}</h3>
                          {c.completedAt && (
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Completed {new Date(c.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f0fdf4" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" />
                          </svg>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {[
                          { icon: "📚", count: c.subjectCount, label: "Subjects" },
                          { icon: "📖", count: c.totalLessons, label: "Lessons" },
                          { icon: "🎥", count: c.recordingCount, label: "Recordings" },
                          { icon: "📋", count: c.chapterCount, label: "Materials" },
                        ].map(stat => (
                          <div key={stat.label} className="rounded-xl py-2.5 px-1 text-center" style={{ background: "#f8fafc" }}>
                            <div className="text-base leading-none mb-0.5">{stat.icon}</div>
                            <div className="text-sm font-black" style={{ color: NAVY }}>{stat.count}</div>
                            <div className="text-[9px] text-gray-400 font-medium">{stat.label}</div>
                          </div>
                        ))}
                      </div>
                      <Link href={`/courses/${c.courseId}`} className="block mt-4">
                        <button className="w-full py-2.5 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg,#059669,#34d399)" }}>
                          Open Completed Course →
                        </button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
                <div className="rounded-xl p-4 flex gap-3 items-start" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <span className="text-lg flex-shrink-0">ℹ️</span>
                  <p className="text-xs text-green-700 font-medium leading-relaxed">
                    All content in completed courses — lessons, recordings, and study materials — remains accessible for review.
                    New submissions are closed unless your admin reopens the course.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ CURRENT LEARNING TAB ════════ */}
        {activeTab === "current" && (
          <>
            {/* Search row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search subjects or lessons..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-11 text-sm rounded-2xl border-gray-200 bg-white"
                  data-testid="search-courses"
                />
              </div>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-36 h-11 text-sm rounded-2xl border-gray-200 bg-white font-semibold" data-testid="subject-filter">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {(subjects ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── CURRENT PROGRAM card ── */}
            {demoLoading && <Skeleton className="h-52 rounded-2xl" />}
            {!demoLoading && demoBatches.length > 0 && (() => {
              const { batch, sessions } = demoBatches[0];
              const completedCount = sessions.filter(s => s.status === "completed").length;
              const pct = batch.totalDays > 0 ? Math.round((completedCount / batch.totalDays) * 100) : 0;
              const nextSession = sessions.find(s => s.status === "upcoming" || s.status === "live");
              const displaySessions = sessions.slice(0, 5);
              return (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: "1px solid #e2e8f0", borderLeft: "4px solid #059669", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: program info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#059669" }}>Current Program</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl">🚀</span>
                          <h3 className="text-base font-black" style={{ color: NAVY }}>{batch.title}</h3>
                          {batch.grade && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Grade {batch.grade}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">Day {completedCount} of {batch.totalDays} completed</p>

                        {/* Day dots */}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {displaySessions.map(s => {
                            const isDone = s.status === "completed";
                            const isLive = s.status === "live";
                            return (
                              <div key={s.id}
                                className="flex items-center justify-center gap-0.5 px-2.5 py-1 rounded-full text-[10px] font-black border"
                                style={{
                                  background: isDone ? "#059669" : isLive ? "#fff7ed" : "#f8fafc",
                                  borderColor: isDone ? "#059669" : isLive ? "#f97316" : "#e2e8f0",
                                  color: isDone ? "white" : isLive ? "#f97316" : "#94a3b8",
                                  minWidth: 36,
                                }}>
                                {isDone ? "✓" : ""} D{s.dayNumber}
                              </div>
                            );
                          })}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#059669" }} />
                          </div>
                          <span className="text-xs font-black shrink-0" style={{ color: "#059669" }}>{pct}%</span>
                        </div>
                      </div>

                      {/* Right: next session */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-sm">📅</span>
                          <span className="text-[10px] font-black" style={{ color: ORANGE }}>Next session</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight max-w-[88px]">
                          {nextSession
                            ? new Date(nextSession.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                            : "No session scheduled yet"}
                        </p>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-4">
                      {nextSession?.joinUrl && nextSession.status === "live" && (
                        <a href={nextSession.joinUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 block text-center py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
                          style={{ background: "#EF4444", boxShadow: "0 4px 12px rgba(239,68,68,0.3)" }}>
                          🔴 Join Live Class
                        </a>
                      )}
                      <button onClick={() => setLocation(`/demo-batches/${batch.id}`)}
                        className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
                        style={{ background: "#059669", boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}>
                        View Program →
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* ── CONTINUE LEARNING card ── */}
            {continueLearningSubj && (() => {
              const sp = continueLearningSubj;
              const pct = sp.total > 0 ? Math.round((sp.done / sp.total) * 100) : 0;
              const s = getSubjStyle(sp.name, sp.idx);
              return (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4"
                  style={{ border: "1px solid #ede9fe", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#7c3aed" }}>Continue Learning</p>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black"
                      style={{ background: `${s.color}18`, fontSize: s.text ? 15 : 22, color: s.color }}>
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black" style={{ color: NAVY }}>{sp.name}</h3>
                      <p className="text-[11px] text-gray-400">{sp.done} of {sp.total} lessons done</p>
                      <div className="mt-1.5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#7c3aed" }} />
                      </div>
                      <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "#7c3aed" }}>{pct}%</p>
                    </div>
                    <button
                      className="px-4 py-2.5 rounded-xl text-xs font-black text-white flex-shrink-0 transition-all hover:opacity-90"
                      style={{ background: "#7c3aed" }}
                      onClick={() => setSubject(String(sp.id))}>
                      Continue →
                    </button>
                  </div>
                </motion.div>
              );
            })()}

            {/* ── MY SUBJECTS horizontal scroll ── */}
            {subjectProgress.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📖</span>
                    <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: NAVY }}>My Subjects</h2>
                  </div>
                  <button className="text-xs font-bold" style={{ color: "#059669" }}
                    onClick={() => setSubject("all")}>See All ›</button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
                  {subjectProgress.map(sp => {
                    const pct = sp.total > 0 ? Math.round((sp.done / sp.total) * 100) : 0;
                    const s = getSubjStyle(sp.name, sp.idx);
                    return (
                      <div
                        key={sp.id}
                        className="flex-shrink-0 rounded-2xl p-3.5 bg-white flex flex-col"
                        style={{ width: 132, scrollSnapAlign: "start", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", border: "1px solid #f1f5f9" }}>
                        {/* Colored circle icon */}
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mb-2.5 font-black"
                          style={{ background: s.color, color: "white", fontSize: s.text ? 14 : 22, flexShrink: 0 }}>
                          {s.icon}
                        </div>
                        <p className="text-xs font-black leading-tight mb-0.5 truncate" style={{ color: NAVY }}>{sp.name}</p>
                        <p className="text-[10px] text-gray-400 mb-2">{sp.total} Lessons</p>
                        {/* Progress accent line */}
                        <div className="w-full h-1 rounded-full overflow-hidden mb-1.5" style={{ background: `${s.color}20` }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                        <p className="text-[9px] mb-2.5 font-semibold" style={{ color: pct > 0 ? s.color : "#94a3b8" }}>
                          {pct > 0 ? `${pct}% Complete` : "Not Started"}
                        </p>
                        <button
                          className="w-full mt-auto py-1.5 rounded-lg text-[10px] font-black border transition-all"
                          style={{
                            borderColor: s.color,
                            color: pct > 0 ? "white" : s.color,
                            background: pct > 0 ? s.color : "transparent",
                          }}
                          onClick={() => setSubject(String(sp.id))}>
                          {pct > 0 ? "Continue →" : "Start Learning →"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── ANIMATED VIDEOS banner ── */}
            <Link href="/animated-videos">
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="relative overflow-hidden rounded-2xl cursor-pointer select-none"
                style={{ background: "linear-gradient(135deg,#c8f7dc 0%,#a7f3c8 40%,#d1fae5 100%)", border: "1.5px solid #6ee7b7", boxShadow: "0 4px 20px rgba(16,185,129,0.15)" }}>
                <span className="absolute top-3 right-36 text-lg opacity-60 pointer-events-none">⭐</span>
                <span className="absolute bottom-3 right-52 text-sm opacity-50 pointer-events-none">✨</span>
                <div className="flex items-center gap-4 px-5 py-5">
                  {/* TV icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-14 rounded-2xl flex items-center justify-center text-4xl shadow-md"
                      style={{ background: "linear-gradient(145deg,#34d399,#059669)" }}>📺</div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                      style={{ background: "#059669" }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="white"><polygon points="2,1 9,5 2,9" /></svg>
                    </div>
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: "#065f46" }}>Animated Videos</p>
                    <h3 className="text-lg font-black leading-tight" style={{ color: "#064e3b" }}>ANIMATED VIDEOS</h3>
                    <p className="text-xs mt-1 font-medium" style={{ color: "#047857" }}>Fun videos and stories that make learning easy!</p>
                    <button className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black text-white shadow-md"
                      style={{ background: "#059669" }}>Explore Videos →</button>
                  </div>
                  <span className="text-3xl flex-shrink-0">🍿</span>
                </div>
              </motion.div>
            </Link>

            {/* ── Browse All Courses (desktop search results) ── */}
            {(search || subject !== "all") && (
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Search Results ({courses?.length ?? 0})
                </h2>
                {isLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
                  </div>
                ) : (courses ?? []).length === 0 ? (
                  <div className="text-center py-10 rounded-2xl border border-dashed border-gray-200 bg-white">
                    <p className="text-sm font-bold text-gray-700">No courses found</p>
                    <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(courses ?? []).map((course, i) => {
                      const pct = (course.totalLessons && course.completedLessons != null)
                        ? Math.round((course.completedLessons / course.totalLessons) * 100) : null;
                      const s = getSubjStyle(course.subjectName ?? "", i);
                      return (
                        <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                          <Link href={`/courses/${course.id}`}>
                            <div className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all bg-white"
                              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }} data-testid={`course-card-${course.id}`}>
                              <div className="relative h-24">
                                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {course.completedLessons != null && (
                                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#22c55e", color: "white" }}>✓ Enrolled</div>
                                )}
                              </div>
                              <div className="p-2.5">
                                <h3 className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight mb-1">{course.title}</h3>
                                {pct !== null ? (
                                  <>
                                    <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                                      <span>Progress</span><span className="font-bold" style={{ color: s.color }}>{pct}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-[9px] text-gray-400">{course.totalLessons} lessons</p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="h-2" />
      </div>
    </AppLayout>
  );
}

export default function CoursesPage() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <div className="bt-spin-fast w-8 h-8 border-4 rounded-full" style={{ borderColor: `${ORANGE} transparent transparent transparent` }} />
      </div>
    );
  }

  if (!student) return <PublicCoursesView />;
  return <AuthCoursesView />;
}
