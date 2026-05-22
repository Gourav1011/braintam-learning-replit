import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Star, Video, Zap, BarChart3, Shield,
  PlayCircle, GraduationCap, CheckCircle, X, Award,
  Sparkles, Brain, Users, Mail,
  Phone, MapPin,
  MessageCircle, BookOpen
} from "lucide-react";

function FbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function IgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
    </svg>
  );
}
function YtIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}
function LiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

// ── Brand tokens ──────────────────────────────────────────────
const ORANGE  = "#FF6B1A";
const NAVY    = "#0B2B6B";
const BG      = "#F5F7FF";
const SURFACE = "rgba(255,255,255,0.95)";
const BORDER  = "rgba(255,107,26,0.2)";
const BORDER2 = "rgba(11,43,107,0.1)";
const TEXT    = "#0B2B6B";
const MUTED   = "#374151";
const ease    = [0.25, 0.1, 0.25, 1] as const;

// ── Razorpay payment links (update these when ready) ──────────
const RAZORPAY_ENROLL_URL = "https://rzp.io/l/braintam-enroll";
const RAZORPAY_DEMO_URL   = "https://rzp.io/l/braintam-demo";
const RAZORPAY_TRIAL_URL  = "https://rzp.io/l/braintam-trial";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease } }),
};

// ── Data ──────────────────────────────────────────────────────
const features = [
  {
    icon: Video, accent: ORANGE, title: "Live Classes", stat: "5 days/week",
    desc: "Real-time sessions with India's top educators — zero lag, full interaction.",
    bullets: ["Doubt clearing every session","Class recordings included","CBSE, ICSE & State boards"],
  },
  {
    icon: Zap, accent: "#7C3AED", title: "Adaptive Tests", stat: "1,000+ questions",
    desc: "AI picks the right questions based on your child's level and gaps.",
    bullets: ["Chapter-wise mock exams","Instant detailed results","Rank among all students"],
  },
  {
    icon: Brain, accent: "#0EA5E9", title: "Animated Videos", stat: "500+ videos",
    desc: "Curriculum-mapped animated explainers for every concept, Grades 1–10.",
    bullets: ["2–10 min bite-sized lessons","Watch recordings anytime","Hindi + English medium"],
  },
  {
    icon: BookOpen, accent: "#10B981", title: "Homework & Practice", stat: "Daily sets",
    desc: "Auto-graded daily homework with step-by-step solutions.",
    bullets: ["Parent reports after every set","Photo submission support","Graded within 24 hrs"],
  },
  {
    icon: Award, accent: "#F59E0B", title: "Leaderboard & Badges", stat: "50+ badges",
    desc: "Gamified learning that keeps students motivated and competitive.",
    bullets: ["School & national rankings","Monthly topper certificates","Streak rewards & coins"],
  },
  {
    icon: BarChart3, accent: ORANGE, title: "Deep Analytics", stat: "Weekly reports",
    desc: "Granular subject-wise tracking with weak-topic alerts for parents.",
    bullets: ["Concept mastery heatmap","Study time tracking","Email reports to parents"],
  },
  {
    icon: MessageCircle, accent: "#EC4899", title: "24×7 Doubt Solver", stat: "Expert verified",
    desc: "Post doubts by text or photo — answered by verified subject experts.",
    bullets: ["Voice & video doubt support","Searchable doubt archive","Peer answer community"],
  },
  {
    icon: Users, accent: "#6366F1", title: "Parent Dashboard", stat: "Live updates",
    desc: "Complete visibility into your child's learning journey, anytime.",
    bullets: ["Live class attendance","Grade & assignment tracker","Monthly progress PDF"],
  },
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
    grades: "Grades 1–3",
    price: "₹39,999",
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
    grades: "Grades 4–6",
    price: "₹49,999",
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
    grades: "Grades 7-9",
    price: "₹59,999",
    period: "/ year",
    freq: "6–7 live classes weekly • Boards + Exam-Ready Prep",
    features: ["Boards + JEE/NEET plan","Mock tests","Daily targets","Doubt rooms","Personal mentor"],
    color: "#a78bfa",
    demo: true,
  },
];

const team = [
  { name: "Gourav Manhas",      role: "Co-Founder & CEO",            bio: "IIT Kanpur · 5 yrs in learning tech. Drives the vision to make quality education accessible for every Indian student.", photo: "https://images.unsplash.com/photo-1779267102994-5fd194d300fc", tags: ["Strategy","Vision"] },
  { name: "Poonam", role: "Co-Founder & COO", bio: "MBA from ICFAI · 20+ yrs teaching. Architect of Braintam's CBSE/ICSE/IB curriculum framework.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80", tags: ["Curriculum","Pedagogy"] },
  { name: "Rohit",    role: "Master Teachers",            bio: "Ex-Google engineer · AI specialist. Built the platform infrastructure used by 5 lakh+ students daily.", photo: "https://unsplash.com/photos/a-man-with-a-beard-wearing-sunglasses-and-a-t-shirt-Qq37SLi34Dg", tags: ["AI/ML","Engineering"] },
  { name: "Anita Menon",      role: "Head of Teacher Relations",   bio: "Former KV principal · 20 yrs leadership. Recruits and mentors Braintam's nationwide star-teacher network.", photo: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=500&auto=format&fit=crop&q=80", tags: ["Teachers","Quality"] },
  { name: "Deepak Singh",     role: "Head of Animated Content",    bio: "Award-winning animator · ex-Toppr. Created 1,000+ animated explainer videos loved across India.", photo: "", tags: ["Animation","Design"] },
  { name: "Sneha Kapoor",     role: "VP – Student Success",        bio: "Child psychologist & learning coach. Designs gamification and engagement loops that keep kids motivated.", photo: "https://unsplash.com/photos/a-plastic-head-of-a-person-wearing-a-hat-n5B7nnlZNRY", tags: ["Psychology","UX"] },
  { name: "Arjun Mehta",      role: "VP – Sales & Partnerships",   bio: "Former McKinsey consultant · 10 yrs B2C sales. Leads school partnerships and institutional sales across India.", photo: "https://unsplash.com/photos/a-man-with-a-beard-wearing-sunglasses-and-a-t-shirt-Qq37SLi34Dg", tags: ["Sales","Growth"] },
  { name: "Kavya Iyer",       role: "Head of Design",              bio: "Ex-Swiggy design lead · Crafts Braintam's premium visual language and ensures every pixel earns its place.", photo: "https://unsplash.com/photos/a-plastic-head-of-a-person-wearing-a-hat-n5B7nnlZNRY", tags: ["Design","Brand"] },
];

const testimonials = [
  { title: "Doubt rooms",           text: "Response is fast and patient — unlike others. Great for board exam prep.",          name: "Rahul",  date: "Jan 2025", rating: 5 },
  { title: "Practical and fun",     text: "Concepts taught with games and tricks — my child actually enjoys practice time now.", name: "Priya",  date: "Feb 2025", rating: 5 },
  { title: "Great mentor support",  text: "Mentors set small goals and follow up — real improvement in tests within months.",   name: "Advik",  date: "Apr 2025", rating: 5 },
  { title: "Worth every rupee",     text: "Structured classes, notes, and timely feedback make this a premium experience.",     name: "Neha",   date: "Jun 2025", rating: 5 },
  { title: "Best in class",         text: "My daughter's confidence jumped after just 2 months. Highly recommend Braintam!",    name: "Sunita", date: "Mar 2025", rating: 5 },
  { title: "Exam ready",            text: "The mock tests are spot-on. My son scored 91% in his boards — thank you Braintam!", name: "Ramesh", date: "May 2025", rating: 5 },
];

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Learn: [
    { label: "Live Classes",      href: "/live-classes" },
    { label: "Courses",           href: "/courses" },
    { label: "Animated Videos",   href: "/animated-videos" },
    { label: "Test Series",       href: "/tests" },
    { label: "Homework Help",     href: "/homework" },
    { label: "Leaderboard",       href: "/leaderboard" },
    { label: "Assignments",       href: "/assignments" },
    { label: "Recordings",        href: "/recordings" },
  ],
  Company: [
    { label: "About Braintam",    href: "#about" },
    { label: "Our Educators",     href: "#educators" },
    { label: "Careers",           href: "#careers" },
    { label: "Blog & Insights",   href: "#blog" },
    { label: "Press & Media",     href: "#press" },
    { label: "Partnerships",      href: "#partners" },
    { label: "Contact Us",        href: "#contact" },
  ],
  Support: [
    { label: "Help Center",       href: "#help" },
    { label: "Terms of Service",  href: "/terms" },
    { label: "Privacy Policy",    href: "/privacy" },
    { label: "Refund Policy",     href: "#refund" },
    { label: "Student Safety",    href: "#safety" },
    { label: "Parent Dashboard",  href: "/dashboard" },
    { label: "Report an Issue",   href: "#report" },
  ],
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

// ── Hero Visual — Student Toppers ─────────────────────────────
const toppers = [
  {
    name: "Kaniahya Sharma",
    grade: "JK Board",
    initial: "K",
    score: "485/500",
    rank: "#1",
    medal: "🥇",
    tag: "Board Topper",
    stars: 5,
    quote: "Braintam made me love studying!",
    avatarFrom: "#FF6B1A",
    avatarTo: "#c94e00",
    tagColor: "#FF6B1A",
    tagBg: "rgba(255,107,26,0.1)",
  },
  {
    name: "Rohan Verma",
    grade: "Grade 10 · Mumbai",
    initial: "R",
    score: "97%",
    rank: "#2",
    medal: "🥈",
    tag: "Science Star",
    stars: 5,
    quote: "Live classes changed everything!",
    avatarFrom: "#3B82F6",
    avatarTo: "#1d4ed8",
    tagColor: "#3B82F6",
    tagBg: "rgba(59,130,246,0.1)",
  },
  {
    name: "Ananya Singh",
    grade: "Grade 6 · Bangalore",
    initial: "A",
    score: "95%",
    rank: "#3",
    medal: "🥉",
    tag: "All-Rounder",
    stars: 5,
    quote: "Best platform for school kids!",
    avatarFrom: "#10B981",
    avatarTo: "#059669",
    tagColor: "#10B981",
    tagBg: "rgba(16,185,129,0.1)",
  },
] as const;

function HeroVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 65% 30%, rgba(255,107,26,0.10) 0%, transparent 55%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 30% 75%, rgba(11,43,107,0.08) 0%, transparent 55%)" }} />

      {/* ── Floating toppers badge ── */}
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full"
        style={{ background: NAVY, boxShadow: "0 8px 24px rgba(11,43,107,0.25)" }}>
        <span style={{ fontSize: 14 }}>🏆</span>
        <span className="text-xs font-bold text-white">10,000+ Toppers across India</span>
      </motion.div>

      {/* ── Three student cards ── */}
      <div className="relative z-10 flex items-end gap-4 mt-6">

        {/* Card: Ananya — left, slightly lower */}
        {(() => { const s = toppers[2]; return (
          <motion.div key={s.name}
            animate={{ y: [4, -8, 4] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="rounded-3xl p-4 w-40 flex-shrink-0"
            style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.08)`,
                     boxShadow: "0 16px 48px rgba(11,43,107,0.12)" }}>
            {/* Avatar */}
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-white text-xl font-black"
                style={{ background: `linear-gradient(135deg, ${s.avatarFrom}, ${s.avatarTo})`,
                         boxShadow: `0 8px 20px ${s.avatarFrom}40` }}>
                {s.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 text-lg leading-none">{s.medal}</div>
            </div>
            <div className="text-xs font-bold text-center mb-0.5" style={{ color: TEXT }}>{s.name}</div>
            <div className="text-xs text-center mb-2" style={{ color: MUTED }}>{s.grade}</div>
            <div className="flex justify-center mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.tagBg, color: s.tagColor }}>{s.tag}</span>
            </div>
            <div className="text-center">
              <div className="text-lg font-black" style={{ color: s.tagColor }}>{s.score}</div>
            </div>
            <div className="flex justify-center gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 10 }}>★</span>)}
            </div>
          </motion.div>
        ); })()}

        {/* Card: Priya — center, tallest (gold, featured) */}
        {(() => { const s = toppers[0]; return (
          <motion.div key={s.name}
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-3xl p-5 w-44 flex-shrink-0 relative"
            style={{ background: "#fff", border: `2px solid rgba(255,107,26,0.2)`,
                     boxShadow: "0 24px 60px rgba(11,43,107,0.18), 0 0 0 4px rgba(255,107,26,0.06)" }}>
            {/* Crown */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl">👑</div>
            {/* Avatar */}
            <div className="relative mb-3 mt-1">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-white text-2xl font-black"
                style={{ background: `linear-gradient(135deg, ${s.avatarFrom}, ${s.avatarTo})`,
                         boxShadow: `0 10px 24px ${s.avatarFrom}50` }}>
                {s.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 text-xl leading-none">{s.medal}</div>
            </div>
            <div className="text-sm font-bold text-center mb-0.5" style={{ color: TEXT }}>{s.name}</div>
            <div className="text-xs text-center mb-2" style={{ color: MUTED }}>{s.grade}</div>
            <div className="flex justify-center mb-3">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: s.tagBg, color: s.tagColor }}>{s.tag}</span>
            </div>
            <div className="text-center mb-2">
              <div className="text-2xl font-black" style={{ color: s.tagColor }}>{s.score}</div>
            </div>
            <div className="text-xs text-center italic px-1" style={{ color: MUTED }}>"{s.quote}"</div>
            <div className="flex justify-center gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 11 }}>★</span>)}
            </div>
          </motion.div>
        ); })()}

        {/* Card: Rohan — right, slightly lower */}
        {(() => { const s = toppers[1]; return (
          <motion.div key={s.name}
            animate={{ y: [4, -10, 4] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
            className="rounded-3xl p-4 w-40 flex-shrink-0"
            style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.08)`,
                     boxShadow: "0 16px 48px rgba(11,43,107,0.12)" }}>
            {/* Avatar */}
            <div className="relative mb-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-white text-xl font-black"
                style={{ background: `linear-gradient(135deg, ${s.avatarFrom}, ${s.avatarTo})`,
                         boxShadow: `0 8px 20px ${s.avatarFrom}40` }}>
                {s.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 text-lg leading-none">{s.medal}</div>
            </div>
            <div className="text-xs font-bold text-center mb-0.5" style={{ color: TEXT }}>{s.name}</div>
            <div className="text-xs text-center mb-2" style={{ color: MUTED }}>{s.grade}</div>
            <div className="flex justify-center mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.tagBg, color: s.tagColor }}>{s.tag}</span>
            </div>
            <div className="text-center">
              <div className="text-lg font-black" style={{ color: s.tagColor }}>{s.score}</div>
            </div>
            <div className="flex justify-center gap-0.5 mt-2">
              {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 10 }}>★</span>)}
            </div>
          </motion.div>
        ); })()}
      </div>

      {/* ── Bottom floating: "Join them" CTA badge ── */}
      <motion.div animate={{ y: [0, 7, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl"
        style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.1)`,
                 boxShadow: "0 8px 28px rgba(11,43,107,0.13)" }}>
        <div className="flex -space-x-2">
          {["#FF6B1A","#3B82F6","#10B981"].map((c, i) => (
            <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
              style={{ background: c }}>{"PRA"[i]}</div>
          ))}
        </div>
        <div className="text-xs font-semibold" style={{ color: TEXT }}>
          <span className="font-black" style={{ color: ORANGE }}>5,00,000+</span> students already learning
        </div>
      </motion.div>
    </div>
  );
}

// ── Join Modal ────────────────────────────────────────────────
function JoinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");

  const inputStyle = {
    background: "#F8FAFC",
    border: `1.5px solid rgba(11,43,107,0.12)`,
    color: TEXT,
    borderRadius: "12px",
    padding: "12px 16px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
    transition: "border-color 0.15s",
  };
  const selectStyle = { ...inputStyle, color: grade ? TEXT : MUTED };

  const handleJoin = (e: React.MouseEvent) => {
    if (name.trim() || grade || board) {
      try {
        sessionStorage.setItem("braintam_signup_profile", JSON.stringify({ name, grade, board }));
      } catch {}
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }} onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{ background: "rgba(11,43,107,0.5)", backdropFilter: "blur(14px)" }}>
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }} transition={{ duration: 0.3, ease }}
            onClick={e => e.stopPropagation()} className="relative w-full max-w-md rounded-3xl p-10"
            style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.1)`,
                     boxShadow: "0 24px 80px rgba(11,43,107,0.18)" }}>
            <button onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
              style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            <div className="flex items-center justify-center mb-6">
              <img src={braintamLogo} alt="Braintam" className="w-14 h-14 object-contain" />
            </div>
            <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: TEXT }}>Start learning today</h2>
            <p className="text-sm mb-7 text-center" style={{ color: MUTED }}>Join 5 lakh+ students across India.</p>
            <div className="space-y-3 mb-5">
              <input
                type="text" placeholder="Your full name" value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = ORANGE)}
                onBlur={e => (e.target.style.borderColor = "rgba(11,43,107,0.12)")}
              />
              {[{ p: "Email address", t: "email" }, { p: "Password", t: "password" }].map(f => (
                <input key={f.p} type={f.t} placeholder={f.p}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = ORANGE)}
                  onBlur={e => (e.target.style.borderColor = "rgba(11,43,107,0.12)")} />
              ))}
              <select value={grade} onChange={e => setGrade(e.target.value)}
                style={{ ...selectStyle, color: grade ? TEXT : MUTED }}>
                <option value="">Select your grade</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>Grade {i + 1}</option>
                ))}
              </select>
              <select value={board} onChange={e => setBoard(e.target.value)}
                style={{ ...selectStyle, color: board ? TEXT : MUTED }}>
                <option value="">Select your board</option>
                {["CBSE", "ICSE", "IGCSE", "IB (International Baccalaureate)", "NIOS", "State Board"].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <Link href="/sign-up" onClick={handleJoin}>
              <button className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #e05500)`, boxShadow: `0 0 30px rgba(255,107,26,0.25)` }}>
                Create Account — Join Free
              </button>
            </Link>
            <p className="text-xs text-center mt-4" style={{ color: MUTED }}>
              Already have an account?{" "}
              <Link href="/sign-in" onClick={onClose} className="hover:opacity-80 transition-opacity" style={{ color: ORANGE }}>Sign in</Link>
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
              <div className="text-xs" style={{ color: MUTED }}>{s.label}</div>
            </div>
            <div className="ml-6 w-px h-8" style={{ background: BORDER }} />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Team Card (module-level so React never unmounts on re-render) ──
interface TeamCardProps {
  m: typeof team[0];
  i: number;
  height: number;
  small?: boolean;
  hovered: number | null;
  onEnter: (i: number) => void;
  onLeave: () => void;
  onTap: (i: number) => void;
}
function TeamCard({ m, i, height, small, hovered, onEnter, onLeave, onTap }: TeamCardProps) {
  const active = hovered === i;
  return (
    <motion.div
      animate={{ flex: active ? 5 : 1 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-2xl flex-shrink-0"
      style={{
        minWidth: small ? 48 : 56,
        height,
        border: `1px solid ${active ? "rgba(255,107,26,0.45)" : BORDER2}`,
        transition: "border-color 0.3s",
      }}
      onMouseEnter={() => onEnter(i)}
      onMouseLeave={onLeave}
      onClick={() => onTap(i)}>
      {/* Photo */}
      {m.photo
        ? <img src={m.photo} alt={m.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        : <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${NAVY}, #1a3a7a)` }}>
            <span className="font-black text-white opacity-20" style={{ fontSize: small ? 32 : 40 }}>{m.name.charAt(0)}</span>
          </div>
      }
      {/* Gradient */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(6,16,31,0.97) 0%, rgba(6,16,31,0.55) 50%, rgba(6,16,31,0.05) 100%)" }} />
      {/* Orange stripe when collapsed */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: ORANGE, opacity: active ? 0 : 1, transition: "opacity 0.3s" }} />
      {/* Collapsed label */}
      <div className="absolute bottom-0 left-0 right-0 p-3"
        style={{ opacity: active ? 0 : 1, transition: "opacity 0.2s", pointerEvents: active ? "none" : "auto" }}>
        <div className="text-white font-bold"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 110, fontSize: small ? 9 : 11 }}>
          {m.name}
        </div>
      </div>
      {/* Expanded detail */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5"
        style={{ opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.3s, transform 0.3s", pointerEvents: active ? "auto" : "none" }}>
        <div className="text-white font-bold leading-tight" style={{ fontSize: small ? 11 : 13 }}>{m.name}</div>
        <div className="font-semibold" style={{ color: ORANGE, fontSize: small ? 9 : 11 }}>{m.role}</div>
        <p className="leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontSize: small ? 9 : 11 }}>{m.bio}</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          {m.tags.map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(255,107,26,0.15)", border: "1px solid rgba(255,107,26,0.3)", color: "#FFA870", fontSize: 9 }}>{t}</span>
          ))}
        </div>
        {!small && (
          <div className="flex gap-2 pt-0.5">
            {[XIcon, LiIcon].map((Icon, j) => (
              <a key={j} href="#" className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}>
                <Icon className="w-3 h-3 text-white" />
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Team Section ──────────────────────────────────────────────
function TeamAccordion() {
  const [hovered, setHovered] = useState<number | null>(null);
  const onEnter = (i: number) => setHovered(i);
  const onLeave = () => setHovered(null);
  const onTap   = (i: number) => setHovered(prev => prev === i ? null : i);

  return (
    <>
      {/* Mobile: 2-col grid */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {team.map((m, i) => (
          <TeamCard key={m.name} m={m} i={i} height={190} small hovered={hovered} onEnter={onEnter} onLeave={onLeave} onTap={onTap} />
        ))}
      </div>
      {/* Desktop: horizontal hover accordion */}
      <div className="hidden sm:flex gap-2 w-full" style={{ height: 300 }}>
        {team.map((m, i) => (
          <TeamCard key={m.name} m={m} i={i} height={300} hovered={hovered} onEnter={onEnter} onLeave={onLeave} onTap={onTap} />
        ))}
      </div>
    </>
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
            <div className="font-bold text-sm" style={{ color: TEXT }}>{t.title}</div>
            <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{t.text}</p>
            <div className="flex justify-between items-center pt-1" style={{ borderTop: `1px solid ${BORDER2}` }}>
              <span className="text-xs font-semibold" style={{ color: TEXT }}>{t.name}</span>
              <span className="text-xs" style={{ color: MUTED }}>{t.date}</span>
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
    <div style={{ background: BG, color: TEXT, fontFamily: "'Poppins', sans-serif" }} className="min-h-screen overflow-x-hidden">
      <JoinModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── NAVBAR ── */}
      <motion.nav initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{ background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
                 backdropFilter: scrolled ? "blur(24px)" : "none",
                 borderBottom: scrolled ? `1px solid rgba(11,43,107,0.1)` : "1px solid transparent",
                 boxShadow: scrolled ? "0 2px 20px rgba(11,43,107,0.08)" : "none" }}>
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <img src={braintamLogo} alt="Braintam" className="w-24 h-24 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: MUTED }}>
            {["Courses","Live Classes","Leaderboard"].map(l => (
              <a key={l} href="#" className="hover:text-navy-900 transition-colors" style={{ color: MUTED }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <span className="hidden md:block text-sm font-medium cursor-pointer transition-colors" style={{ color: MUTED }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>Sign in</span>
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
      <section className="relative flex items-center pt-20 pb-6 md:pt-24 md:pb-10 px-6 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full opacity-10 blur-[120px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${ORANGE}55, ${NAVY}33, transparent)` }} />
        <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          <div className="space-y-5 md:space-y-7 relative z-10">
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.3)`, color: ORANGE }}>
              <Sparkles className="w-3 h-3" /> India's most advanced learning platform
            </motion.div>
            <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="text-4xl sm:text-5xl lg:text-[4.25rem] font-black leading-[1.05] tracking-tight">
              The future of{" "}
              <span className="block" style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #FFA040 60%, #FF6B1A 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                paddingLeft: "2px", marginLeft: "-2px" }}>
                learning is here.
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2}
              className="text-base md:text-lg leading-relaxed max-w-md" style={{ color: MUTED }}>
              AI-powered live classes, adaptive testing, and curated content for Grades 1–10. Built for results.
            </motion.p>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="flex flex-wrap gap-3">
              <button onClick={() => setModalOpen(true)}
                className="group flex items-center gap-2 px-6 py-3 md:px-7 md:py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 40px rgba(255,107,26,0.35)` }}>
                Start for free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link href="/sign-in">
                <button className="flex items-center gap-2 px-6 py-3 md:px-7 md:py-3.5 rounded-full font-semibold text-sm transition-all hover:bg-white/10"
                  style={{ background: "#fff", border: `1px solid ${BORDER2}`, color: TEXT,
                           boxShadow: "0 2px 12px rgba(11,43,107,0.08)" }}>
                  <PlayCircle className="w-4 h-4" /> Watch demo
                </button>
              </Link>
            </motion.div>

            {/* ── 5-Day Trial CTA ── */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
              <a href={RAZORPAY_TRIAL_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all hover:scale-[1.02] group"
                style={{ background: `linear-gradient(135deg, #fff8f3, #fff3ea)`,
                         border: `2px solid rgba(255,107,26,0.35)`,
                         boxShadow: "0 4px 24px rgba(255,107,26,0.15)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold" style={{ color: ORANGE }}>LIMITED OFFER</div>
                  <div className="font-black text-sm leading-tight" style={{ color: TEXT }}>
                    5-Day Live Class Trial —{" "}
                    <span style={{ color: ORANGE }}>₹99 only</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" style={{ color: ORANGE }} />
              </a>
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4} className="flex items-center gap-4 md:gap-5 flex-wrap">
              <div className="flex -space-x-2.5">
                {[ORANGE, NAVY, "#c94e00", "#1a4a99"].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: c, borderColor: BG }}>
                    {["P","R","A","S"][i]}
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: MUTED }}>
                <span className="font-semibold" style={{ color: TEXT }}>5,00,000+</span> students learning
              </span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                <span className="text-xs ml-1" style={{ color: MUTED }}>4.9</span>
              </div>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease }} className="relative h-[300px] sm:h-[440px] hidden lg:block">
            <HeroVisual />
          </motion.div>
        </div>
      </section>

      {/* ── STATS TICKER ── */}
      <StatsTicker />

      {/* ── FEATURES (rich 2→4 col) ── */}
      <section className="py-5 md:py-10 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-4 md:mb-6 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Platform</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>
              Everything your child needs to excel.
            </h2>
            <p className="text-sm max-w-xl mx-auto" style={{ color: MUTED }}>
              Live classes · Adaptive tests · Animated videos · Doubt solving · Parent updates — all in one place.
            </p>
          </motion.div>
          {/* Horizontal scroll row */}
          <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6 pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="flex gap-3 w-max">
              {features.map((f, i) => (
                <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                  className="flex-shrink-0 rounded-2xl p-4 flex flex-col gap-2.5 transition-all duration-300 cursor-default"
                  style={{ width: 168, background: SURFACE, border: `1px solid ${BORDER2}` }}
                  whileHover={{ y: -3, boxShadow: `0 8px 28px rgba(11,43,107,0.1)`, borderColor: `${f.accent}44` }}>
                  {/* Icon + stat */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}30` }}>
                      <f.icon className="w-4 h-4" style={{ color: f.accent }} />
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full leading-none"
                      style={{ background: `${f.accent}12`, color: f.accent, border: `1px solid ${f.accent}25`, fontSize: 10 }}>
                      {f.stat}
                    </span>
                  </div>
                  {/* Title + desc */}
                  <div>
                    <h3 className="font-bold text-sm leading-snug mb-1" style={{ color: TEXT }}>{f.title}</h3>
                    <p className="leading-relaxed" style={{ color: MUTED, fontSize: 11 }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROGRAMS / PRICING ── */}
      <section className="py-6 md:py-12 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-5 md:mb-8 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Programs</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>Premium live learning programs</h2>
            <p className="text-sm" style={{ color: MUTED }}>EMI available · Demo class at ₹99 · Enroll directly</p>
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
                    <div className="font-bold text-base" style={{ color: TEXT }}>{p.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: MUTED }}>{p.grades}</div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,107,26,0.15)", color: "#FFA870" }}>{p.tag}</span>
                </div>
                {/* Price */}
                <div>
                  <span className="text-3xl font-black" style={{ color: p.color }}>{p.price}</span>
                  <span className="text-sm ml-1" style={{ color: MUTED }}>{p.period}</span>
                  <div className="text-xs mt-1" style={{ color: MUTED }}>{p.freq}</div>
                </div>
                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: p.color }} />{f}
                    </li>
                  ))}
                </ul>
                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <a href={RAZORPAY_ENROLL_URL} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-3 rounded-xl font-bold text-sm text-white text-center transition-all hover:opacity-90"
                    style={{ background: p.popular ? `linear-gradient(135deg, ${ORANGE}, #c94e00)` : NAVY,
                             boxShadow: p.popular ? `0 0 24px rgba(255,107,26,0.3)` : "none" }}>
                    Enroll Now {p.price}
                  </a>
                  <div className="flex gap-2">
                    <a href={RAZORPAY_DEMO_URL} target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:bg-gray-100"
                      style={{ background: "#F1F5F9", border: `1px solid ${BORDER2}`, color: TEXT }}>
                      Demo ₹99
                    </a>
                    <a href="https://wa.me/918492944473?text=Hi%20Braintam%2C%20I'm%20interested%20in%20this%20plan!"
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                      style={{ background: "#25D366", color: "#fff" }}>
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM HORIZONTAL ACCORDION ── */}
      <section className="py-6 md:py-12 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-4 md:mb-7 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Meet the Team</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>
              Built by educators &{" "}
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>innovators.</span>
            </h2>
            <p className="text-sm" style={{ color: MUTED }}>Hover over a card to learn more about each team member</p>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <TeamAccordion />
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS LOOP ── */}
      <section className="py-6 md:py-12 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-4 md:mb-7 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Reviews</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>What families say about Braintam</h2>
            <p className="text-sm" style={{ color: MUTED }}>Real experiences from our learning community</p>
          </motion.div>
          <TestimonialsLoop />
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-5 px-2">
        <div className="max-w-3xl mx-auto text-center space-y-7">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-7 flex items-center justify-center"
              style={{ background: "rgba(255,107,26,0.1)", border: `1px solid rgba(255,107,26,0.25)`, boxShadow: `0 0 40px rgba(255,107,26,0.15)` }}>
              <GraduationCap className="w-7 h-7" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: TEXT }}>
              Your academic<br />
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                breakthrough starts now.
              </span>
            </h2>
            <p className="text-sm mt-4" style={{ color: MUTED }}>
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
            <Link href="/sign-in">
              <button className="flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-sm transition-all hover:bg-white/10"
                style={{ background: "#fff", border: `1px solid ${BORDER2}`, color: TEXT,
                       boxShadow: "0 2px 12px rgba(11,43,107,0.08)" }}>
                Sign in
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── APP DOWNLOAD ── */}
      <section className="relative overflow-hidden py-8 md:py-12 px-6"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0e3580 50%, #1a1a5e 100%)` }}>
        {/* Animated background blobs */}
        <motion.div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(255,107,26,0.18) 0%, transparent 70%)`, filter: "blur(40px)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute bottom-0 left-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(255,107,26,0.12) 0%, transparent 70%)`, filter: "blur(50px)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">

            {/* Left — text + buttons */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="flex-1 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.4)", color: "#FFA870" }}>
                <Sparkles className="w-3 h-3" /> Available on Android &amp; iOS
              </div>
              <h2 className="text-2xl md:text-3xl font-black leading-tight text-white">
                Learn anywhere,{" "}
                <span style={{ background: "linear-gradient(135deg, #FF6B1A, #FFA040)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  anytime.
                </span>
              </h2>
              <p className="text-sm leading-relaxed max-w-md mx-auto lg:mx-0"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                Live classes, doubt solving, animated videos, and progress tracking — all from your phone.
              </p>

              {/* Store badges */}
              <div className="flex flex-col sm:flex-row gap-4 items-center lg:items-start justify-center lg:justify-start">
                {/* Google Play */}
                <motion.a href="#" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                  style={{ background: "#000", border: "1.5px solid rgba(255,255,255,0.15)", minWidth: 160, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" fill="none">
                    <path d="M3.18 23.76c.3.17.65.19.97.07L15.88 12 12 8.12 3.18 23.76Z" fill="#EA4335"/>
                    <path d="M20.7 10.67 17.6 8.9 13.4 12l4.2 4.1 3.1-1.78a1.74 1.74 0 0 0 0-3.06Z" fill="#FBBC04"/>
                    <path d="M3.18.24A1.74 1.74 0 0 0 2.5 1.6V22.4c0 .54.26 1.01.68 1.36L15.88 12 3.18.24Z" fill="#4285F4"/>
                    <path d="M3.18 23.76 12 12 3.18.24c-.3.17-.65.19-.97.07A1.74 1.74 0 0 0 2.5 1.6V22.4c0 .54.26 1.01.68 1.36Z" fill="#34A853"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-white/60 leading-none mb-0.5" style={{ fontSize: 9 }}>GET IT ON</div>
                    <div className="text-white font-bold text-sm leading-tight">Google Play</div>
                  </div>
                </motion.a>

                {/* App Store */}
                <motion.a href="#" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                  style={{ background: "#000", border: "1.5px solid rgba(255,255,255,0.15)", minWidth: 160, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-white/60 leading-none mb-0.5" style={{ fontSize: 9 }}>DOWNLOAD ON THE</div>
                    <div className="text-white font-bold text-sm leading-tight">App Store</div>
                  </div>
                </motion.a>
              </div>

              {/* Small trust row */}
              <div className="flex items-center gap-4 justify-center lg:justify-start flex-wrap pt-1">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "#4ade80" }} /> Free to download
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "#4ade80" }} /> Works on all devices
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "#4ade80" }} /> 4.9 ★ rated
                </div>
              </div>
            </motion.div>

            {/* Right — animated phone mockup */}
            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease }} viewport={{ once: true }}
              className="flex-shrink-0 relative hidden md:block" style={{ width: 220, height: 270 }}>
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-[40px] blur-2xl opacity-30"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)` }} />
              {/* Phone shell */}
              <div className="relative w-full h-full rounded-[36px] overflow-hidden border-4 border-white/10"
                style={{ background: "linear-gradient(160deg, #1a2a5e 0%, #0e1a3a 100%)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-white/10" />
                {/* Screen content */}
                <div className="absolute inset-x-3 top-8 bottom-3 rounded-3xl overflow-hidden"
                  style={{ background: "#F5F7FF" }}>
                  {/* App top bar */}
                  <div className="px-3 pt-3 pb-2 flex items-center gap-2"
                    style={{ background: NAVY }}>
                    <div className="w-5 h-5 rounded-full" style={{ background: ORANGE }} />
                    <span className="text-white font-bold text-xs">Braintam</span>
                  </div>
                  {/* Floating cards */}
                  <div className="p-2 space-y-2">
                    {[
                      { label: "Live Class", sub: "Maths · 4 PM", color: ORANGE, dot: "#4ade80" },
                      { label: "Your Score", sub: "92% · Science Test", color: "#7C3AED", dot: ORANGE },
                      { label: "Homework", sub: "2 pending", color: "#0EA5E9", dot: "#facc15" },
                    ].map((c, i) => (
                      <motion.div key={c.label}
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
                        className="rounded-xl p-2.5 flex items-center gap-2.5"
                        style={{ background: "#fff", boxShadow: "0 2px 12px rgba(11,43,107,0.1)", border: "1px solid rgba(11,43,107,0.06)" }}>
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                          style={{ background: `${c.color}15` }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-navy text-xs" style={{ color: NAVY, fontSize: 10 }}>{c.label}</div>
                          <div className="text-gray-400 truncate" style={{ fontSize: 9 }}>{c.sub}</div>
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                      </motion.div>
                    ))}
                  </div>
                  {/* Bottom tab bar */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2 border-t"
                    style={{ background: "#fff", borderColor: "rgba(11,43,107,0.08)" }}>
                    {["🏠","📚","🏆","👤"].map((e, i) => (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <span style={{ fontSize: 14 }}>{e}</span>
                        <div className="w-1 h-1 rounded-full" style={{ background: i === 0 ? ORANGE : "transparent" }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating badge — rating */}
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-8 top-16 px-3 py-2 rounded-2xl flex items-center gap-2"
                style={{ background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", minWidth: 100 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <div>
                  <div className="font-black text-sm" style={{ color: NAVY }}>4.9</div>
                  <div className="text-gray-400" style={{ fontSize: 9 }}>10K reviews</div>
                </div>
              </motion.div>
              {/* Floating badge — downloads */}
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -right-6 bottom-20 px-3 py-2 rounded-2xl flex items-center gap-2"
                style={{ background: ORANGE, boxShadow: `0 8px 32px rgba(255,107,26,0.4)`, minWidth: 110 }}>
                <Users className="w-4 h-4 text-white flex-shrink-0" />
                <div>
                  <div className="font-black text-sm text-white">5L+</div>
                  <div className="text-white/70" style={{ fontSize: 9 }}>Students</div>
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-6 md:pt-14 md:pb-10">
          {/* Top row: logo block + 3 link columns */}
          <div className="flex flex-col gap-10 md:flex-row md:gap-12">

            {/* Brand / contact */}
            <div className="space-y-4 md:w-56 flex-shrink-0">
              <img src={braintamLogo} alt="Braintam" className="w-14 h-14 object-contain" />
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                India's premium learning platform for school students in grades 1–12. Live classes, adaptive tests, animated videos, and more.
              </p>
              <div className="space-y-1.5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ORANGE }} />support@braintam.com / braintam20@gmail.com</div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 flex-shrink-0" sty  le={{ color: ORANGE }} />+91 84929 44473</div>
                <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                  <span>009 Yashwantviva township, Vasai (E) Mumbai 401209</span>
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { Icon: FbIcon,  href: "https://facebook.com/braintam" },
                  { Icon: XIcon,   href: "https://twitter.com/braintam" },
                  { Icon: IgIcon,  href: "https://instagram.com/braintamofficoal" },
                  { Icon: YtIcon,  href: "https://youtube.com/@braintam" },
                ].map(({ Icon, href }, i) => (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns — always 3-across */}
            <div className="grid grid-cols-3 gap-6 flex-1">
              {Object.entries(footerLinks).map(([section, links]) => (
                <div key={section} className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-white">{section}</div>
                  {links.map(({ label, href }) => (
                    href.startsWith("/") ? (
                      <Link key={label} href={href}
                        className="block text-xs transition-colors hover:text-white"
                        style={{ color: "rgba(255,255,255,0.5)" }}>
                        {label}
                      </Link>
                    ) : (
                      <a key={label} href={href}
                        className="block text-xs transition-colors hover:text-white cursor-pointer"
                        style={{ color: "rgba(255,255,255,0.5)" }}>
                        {label}
                      </a>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>© {new Date().getFullYear()} Braintam Learning. All Rights Reserved.</span>
          <div className="flex gap-5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            <Link href="/terms"   className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href="#refund"     className="hover:text-white transition-colors cursor-pointer">Refund</a>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Made with ❤️ in India 🇮🇳</span>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/918492944473?text=Hi%20Braintam%2C%20I%20need%20help!"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl hover:scale-110 transition-transform"
        style={{ background: "#25D366" }}
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.003 2C8.28 2 2 8.28 2 16.003c0 2.478.651 4.9 1.885 7.02L2 30l7.174-1.858A13.95 13.95 0 0 0 16.003 30C23.72 30 30 23.72 30 16.003 30 8.28 23.72 2 16.003 2zm0 25.538a11.564 11.564 0 0 1-5.89-1.614l-.422-.251-4.258 1.103 1.13-4.134-.277-.44a11.537 11.537 0 0 1-1.746-6.2c0-6.373 5.19-11.563 11.563-11.563 6.374 0 11.563 5.19 11.563 11.563 0 6.374-5.19 11.536-11.663 11.536zm6.34-8.645c-.347-.174-2.058-1.015-2.376-1.13-.32-.115-.551-.174-.783.173-.231.347-.898 1.13-1.101 1.362-.202.231-.405.26-.752.086-.347-.173-1.464-.54-2.789-1.72-1.03-.918-1.725-2.052-1.928-2.399-.202-.347-.022-.534.152-.707.156-.155.347-.405.52-.607.174-.203.231-.347.347-.578.115-.231.058-.434-.029-.607-.087-.174-.783-1.883-1.072-2.58-.283-.678-.57-.585-.783-.596l-.665-.012c-.231 0-.607.087-.924.434-.318.347-1.215 1.188-1.215 2.897s1.244 3.36 1.418 3.592c.173.231 2.447 3.737 5.93 5.239.829.358 1.476.572 1.98.732.832.264 1.59.227 2.188.138.668-.1 2.058-.842 2.348-1.655.29-.812.29-1.508.202-1.655-.086-.145-.318-.231-.665-.405z"/>
        </svg>
      </a>
    </div>
  );
}
