import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useListCourses, useListSubjects, getListCoursesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Star, Users, Trophy, Sparkles, ArrowRight, GraduationCap, Zap, Award, CheckCircle, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

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
        full: { subjects: ["Numbers", "English", "EVS"],        desc: "Complete Grade 1 syllabus with tests & mentor support.",  price: "₹22,999" } },
  2:  { specialty: "Times Tables Speed Mastery",       specialtyIcon: "⚡", bubbleColor: "#3B82F6",
        demoHighlights: ["Fast Calculation", "Short Tricks", "Quick Recall", "Mind Maps"],
        demo: { topics: ["Multiplication Basics", "Story Writing", "Maps & Globe"],          desc: "Core concepts in an engaging 6-day camp." },
        full: { subjects: ["Maths", "English", "EVS"],          desc: "Structured full-year program with live classes daily.",   price: "₹24,999" } },
  3:  { specialty: "Vedic Maths Shortcuts",            specialtyIcon: "🔢", bubbleColor: "#8B5CF6",
        demoHighlights: ["Vedic Shortcuts", "Concept Clarity", "Speed Maths", "Mind Mapping"],
        demo: { topics: ["Fractions & Decimals", "Grammar Basics", "Our Environment"],       desc: "Hands-on learning for quick concept clarity." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Chapter-by-chapter coverage with weekly tests.",          price: "₹25,999" } },
  4:  { specialty: "Speed Reading Techniques",         specialtyIcon: "📖", bubbleColor: "#10B981",
        demoHighlights: ["Fast Calculation", "LCM/HCF Tricks", "Reading Speed", "Concept Maps"],
        demo: { topics: ["LCM & HCF", "Reading Skills", "Forces & Motion"],                 desc: "Jump-start key concepts across all subjects." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Deep-dive into Grade 4 syllabus with doubt sessions.",    price: "₹26,999" } },
  5:  { specialty: "Science Olympiad Foundation",      specialtyIcon: "🔭", bubbleColor: "#F59E0B",
        demoHighlights: ["Algebra Basics", "Short Tricks", "Concept Clarity", "Mind Mapping"],
        demo: { topics: ["Algebra Intro", "Essay Writing", "Solar System"],                  desc: "Get a head-start before the full program." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Complete CBSE/ICSE syllabus + Olympiad prep built in.",   price: "₹27,999" } },
  6:  { specialty: "Algebra Thinking & Logic",         specialtyIcon: "📐", bubbleColor: "#EC4899",
        demoHighlights: ["Algebra Shortcuts", "Fast Calculation", "Logic Building", "Mind Maps"],
        demo: { topics: ["Integers & Ratios", "Creative Writing", "Living World"],           desc: "Middle-school concepts demystified in 6 days." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Live classes 5–6×/week with weekly mock exams.",         price: "₹29,999" } },
  7:  { specialty: "IQ & Olympiad Prep",               specialtyIcon: "🏆", bubbleColor: "#06B6D4",
        demoHighlights: ["Equation Tricks", "Fast Formulae", "IQ Hacks", "Concept Clarity"],
        demo: { topics: ["Linear Equations", "Advanced Grammar", "Heat & Light"],            desc: "Solve tricky problems with expert shortcuts." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Comprehensive coverage + dedicated Olympiad modules.",    price: "₹31,999" } },
  8:  { specialty: "Board Exam Strategy",              specialtyIcon: "📋", bubbleColor: "#6366F1",
        demoHighlights: ["Short Tricks", "Rapid Recall", "Answer Mapping", "Fast Calculation"],
        demo: { topics: ["Quadratic Basics", "Literature Analysis", "Cell Biology"],         desc: "Board-prep strategies unlocked in 6 days." },
        full: { subjects: ["Maths", "English", "Science"],      desc: "Board-aligned syllabus + full mock test series.",        price: "₹33,999" } },
  9:  { specialty: "JEE / NEET Foundation",            specialtyIcon: "🚀", bubbleColor: "#EF4444",
        demoHighlights: ["Polynomial Tricks", "Fast Derivation", "Concept Clarity", "Mind Mapping"],
        demo: { topics: ["Polynomials", "Comprehension Skills", "Chemical Reactions"],       desc: "Crack Grade 9 concepts with top educators." },
        full: { subjects: ["Maths", "Science", "Social"],       desc: "CBSE/ICSE full syllabus + JEE/NEET foundation start.",   price: "₹35,999" } },
  10: { specialty: "90+ Board Score Program",          specialtyIcon: "🎯", bubbleColor: "#FF6B1A",
        demoHighlights: ["Trig Shortcuts", "Answer Writing", "Speed Revision", "Mind Maps"],
        demo: { topics: ["Trigonometry", "Board Writing Skills", "Genetics Basics"],         desc: "Score 90+ in boards with targeted practice." },
        full: { subjects: ["Maths", "Science", "Social"],       desc: "Board exam mastery + competitive exam readiness.",       price: "₹37,999" } },
};

const TOPPERS = [
  { name: "Arjun Sharma",  grade: 8,  school: "Delhi Public School",  score: "98%", subject: "Mathematics", city: "New Delhi",  achievement: "State Topper 🏆",      initials: "AS", color: "from-amber-400 to-orange-500" },
  { name: "Priya Patel",   grade: 7,  school: "Kendriya Vidyalaya",   score: "96%", subject: "Science",     city: "Mumbai",    achievement: "National Finalist 🥇",  initials: "PP", color: "from-blue-400 to-indigo-600"  },
  { name: "Riya Gupta",    grade: 9,  school: "DAV Public School",    score: "95%", subject: "English",     city: "Pune",      achievement: "School Topper ⭐",      initials: "RG", color: "from-pink-400 to-rose-600"    },
];

const STATS = [
  { value: "200+",    label: "Courses",         icon: BookOpen    },
  { value: "50+",     label: "Expert Teachers", icon: GraduationCap },
  { value: "10,000+", label: "Happy Students",  icon: Users       },
  { value: "4.9★",   label: "Avg Rating",      icon: Star        },
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
        <Link href="/"><img src={braintamLogo} alt="Braintam" className="h-10 object-contain cursor-pointer" /></Link>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          {([["Courses", "/courses"], ["Live Classes", "/live-classes"], ["Leaderboard", "/leaderboard"]] as [string, string][]).map(([l, href]) => (
            <Link key={l} href={href}>
              <span className={`cursor-pointer transition-colors font-semibold ${scrolled ? "text-gray-700 hover:text-orange-500" : "text-white/80 hover:text-white"}`}>{l}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in"><span className={`text-sm font-semibold cursor-pointer ${scrolled ? "text-gray-700" : "text-white/90"}`}>Sign In</span></Link>
          <Link href="/sign-up">
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

// ── Demo Card ─────────────────────────────────────────────────
function DemoCard({ grade, data, demoHighlights, bubbleColor }: {
  grade: number; data: GradeCourseData["demo"];
  demoHighlights: string[]; bubbleColor: string;
}) {
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
          ⚡ 6-Day Demo
        </span>
        <span className="text-xs text-gray-400 font-medium">Short preview</span>
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
          6-Day Core Concepts — Grade {grade}
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
        <span className="font-black text-2xl" style={{ color: ORANGE }}>₹99</span>
        <span className="text-xs text-gray-400 font-medium">6-Day program</span>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <Link href="/sign-up" className="flex-1">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="w-full py-3 rounded-xl font-black text-sm text-white transition-all"
            style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3a7a)`, boxShadow: `0 4px 16px rgba(11,43,107,0.3)` }}>
            Join Demo
          </motion.button>
        </Link>
        <Link href="/connect">
          <button className="text-xs font-semibold whitespace-nowrap hover:underline" style={{ color: NAVY }}>
            Why this demo?
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
        <Link href="/sign-up" className="flex-1">
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
              <p className="font-black text-sm text-white">IIT / NIT Expert Teacher</p>
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
              <Sparkles className="w-3.5 h-3.5" /> India's #1 EdTech Platform for Grades 1–10
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
                <span className="text-sm font-bold text-white">IIT/NIT Expert Teacher</span>
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
              <Link href="/sign-up">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 4px 24px rgba(255,107,26,0.45)` }}>
                  Book Demo Class — ₹99 <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/sign-in">
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
              <img src={braintamLogo} alt="" className="w-7 h-7 object-contain" />
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
                  Join a demo class <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span> or contact our team — mention this page and unlock a special price on the Full Year plan.
                </p>
              </div>
            </div>

            {/* Right: CTAs */}
            <div className="flex items-center gap-2.5 flex-shrink-0 w-full sm:w-auto">
              <Link href="/sign-up" className="flex-1 sm:flex-initial">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 4px 18px rgba(255,107,26,0.45)` }}>
                  ⚡ Join Demo — ₹99
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
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                  className="absolute top-4 right-4 text-lg">{t.achievement.split(" ")[1]}</motion.div>
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                    {t.initials}
                  </div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1 -right-1 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </motion.div>
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
                    <motion.div key={s} animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: s * 0.2 }}>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </motion.div>
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
          <p className="text-white/60 mb-8 text-lg">Join 10,000+ students already learning on Braintam</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/sign-up">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="px-10 py-4 rounded-full font-black text-white text-lg flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 8px 32px rgba(255,107,26,0.5)" }}>
                Book a FREE Demo Class <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-4">No credit card required · Cancel anytime</p>
        </motion.div>
      </section>

      <div className="bg-black/90 text-white/40 text-center py-4 text-xs">
        © 2026 Braintam · India's Premium EdTech Platform
      </div>
    </div>
  );
}

// ── Authenticated view ──────────────────────────────────────────────────
function AuthCoursesView() {
  const [subject, setSubject] = useState<string>("all");
  const [search, setSearch] = useState("");

  const params = {
    subjectId: subject !== "all" ? Number(subject) : undefined,
    search: search.trim() || undefined,
  };

  const { data: courses, isLoading } = useListCourses(params, {
    query: { queryKey: getListCoursesQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            Courses
          </h1>
          <p className="text-muted-foreground mt-1">Your enrolled courses</p>
        </motion.div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="search-courses" />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-44" data-testid="subject-filter"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(subjects ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (courses ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {(courses ?? []).map((course, i) => (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/courses/${course.id}`}>
                  <Card className="cursor-pointer overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary/20 h-full" data-testid={`course-card-${course.id}`}>
                    <div className="relative">
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-40 object-cover" />
                      <div className="absolute top-2 right-2"><Badge className="bg-secondary text-white text-xs">Grade {course.grade}</Badge></div>
                      <div className="absolute bottom-2 left-2"><Badge variant="secondary" className="text-xs bg-white/90 text-foreground">{course.subjectName}</Badge></div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /><span>{course.teacher ?? "Braintam Teacher"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{course.totalLessons} lessons</span>
                        {course.rating && <span className="flex items-center gap-1 text-yellow-500 font-semibold"><Star className="w-3.5 h-3.5 fill-yellow-500" />{course.rating}</span>}
                      </div>
                      {course.completedLessons !== null && course.completedLessons !== undefined && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span><span>{Math.round((course.completedLessons / course.totalLessons) * 100)}%</span>
                          </div>
                          <Progress value={(course.completedLessons / course.totalLessons) * 100} className="h-1.5" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function CoursesPage() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-t-transparent rounded-full" style={{ borderColor: `${ORANGE} transparent transparent transparent` }} />
      </div>
    );
  }

  if (!student) return <PublicCoursesView />;
  return <AuthCoursesView />;
}
