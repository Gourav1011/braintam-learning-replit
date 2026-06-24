import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import expertCardImg   from "@assets/Untitled_design_(6)-Photoroom_1780079465208.png";
import brandedStudentImg from "@assets/ChatGPT_Image_May_29,_2026,_09_13_20_PM_1780069417528.png";
import poonamPhoto from "@assets/poonam_cofounder.png";
import { useState, useEffect, useRef } from "react";
import {
  ArrowRight, Star, Video, Zap, BarChart3, Shield,
  PlayCircle, GraduationCap, CheckCircle, X, Award,
  Sparkles, Brain, Users, Mail,
  Phone, MapPin,
  MessageCircle, BookOpen,
  Smartphone, Globe
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
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
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

// ── App store links (update these when ready) ─────────────────
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.braintam";
const APP_STORE_URL   = "https://apps.apple.com/app/braintam";

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
  { icon: Video,       value: "430+",         label: "Classes per Grade / Year" },
  { icon: BookOpen,    value: "4,200+",        label: "Total Live Classes / Year" },
  { icon: CheckCircle, value: "CBSE·ICSE·IB",  label: "Hybrid Syllabus" },
  { icon: Star,        value: "4.9 ★",         label: "Parent Rating" },
  { icon: Users,       value: "Grades 1–10",   label: "All Classes Covered" },
  { icon: Brain,       value: "24×7",          label: "Doubt Support" },
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
  { name: "Poonam", role: "Co-Founder & COO", bio: "MBA from ICFAI · 20+ yrs teaching. Architect of Braintam's CBSE/ICSE/IB curriculum framework.", photo: poonamPhoto, tags: ["Curriculum","Pedagogy"] },
  { name: "Rohit",    role: "Master Teachers",            bio: "Ex-Google engineer · AI specialist. Built the platform infrastructure powering 4,200+ live classes annually.", photo: "https://unsplash.com/photos/a-man-with-a-beard-wearing-sunglasses-and-a-t-shirt-Qq37SLi34Dg", tags: ["AI/ML","Engineering"] },
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
  Company: [
    { label: "Our Story",         href: "/our-story" },
    { label: "Meet the Mentors",  href: "/meet-the-masters" },
    { label: "Careers",           href: "/join-the-mission" },
    { label: "Contact Us",        href: "/connect" },
  ],
  Support: [
    { label: "Help Center",       href: "/help" },
    { label: "Parent Dashboard",  href: "/dashboard" },
    { label: "Privacy Policy",    href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Refund Policy",     href: "/refund" },
  ],
};

// ── Particles ─────────────────────────────────────────────────
const PARTICLES = [
  { sz:2, l:"8%",  t:"12%", dur:"9s",  dl:"0s",   op:0.25, c:ORANGE   },
  { sz:3, l:"22%", t:"38%", dur:"13s", dl:"1.2s",  op:0.18, c:"#FFA040"},
  { sz:2, l:"41%", t:"22%", dur:"10s", dl:"0.5s",  op:0.20, c:"#fff"   },
  { sz:2, l:"58%", t:"55%", dur:"11s", dl:"2s",    op:0.22, c:ORANGE   },
  { sz:3, l:"73%", t:"18%", dur:"14s", dl:"0.8s",  op:0.15, c:"#FFA040"},
  { sz:2, l:"87%", t:"42%", dur:"8s",  dl:"1.5s",  op:0.28, c:"#fff"   },
  { sz:2, l:"15%", t:"70%", dur:"12s", dl:"3s",    op:0.20, c:ORANGE   },
  { sz:3, l:"64%", t:"78%", dur:"9s",  dl:"0.3s",  op:0.18, c:"#FFA040"},
];
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((p, i) => (
        <div key={i} className="absolute rounded-full"
          style={{ width: p.sz, height: p.sz, left: p.l, top: p.t, background: p.c,
                   "--op": p.op, opacity: p.op,
                   animation: `bt-particle ${p.dur} ease-in-out infinite ${p.dl}` } as React.CSSProperties} />
      ))}
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
        style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(255,107,26,0.13) 0%, transparent 60%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 35% 70%, rgba(11,43,107,0.10) 0%, transparent 55%)" }} />

      {/* ── Floating toppers badge ── */}
      <div className="bt-float absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full"
        style={{ background: NAVY, boxShadow: "0 8px 24px rgba(11,43,107,0.25)" }}>
        <span className="text-xs sm:text-sm">🏆</span>
        <span className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">430+ live classes per grade, every year</span>
      </div>

      {/* ── Main student photo ── */}
      <div className="relative z-10 flex items-end justify-center mt-6" style={{ height: "340px" }}>
        <img
          src={expertCardImg}
          alt="Braintam student"
          className="h-full w-auto object-contain block"
          style={{ filter: "drop-shadow(0 12px 36px rgba(11,43,107,0.22))", maxWidth: "280px" }}
        />

        {/* ── Left floating card: Ananya ── */}
        {(() => { const s = toppers[2]; return (
          <div className="bt-float-a absolute left-0 top-1/4 rounded-2xl p-2.5 w-[96px] sm:w-32 flex-shrink-0"
            style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.08)`,
                     boxShadow: "0 12px 32px rgba(11,43,107,0.14)" }}>
            <div className="relative mb-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mx-auto text-white text-xs sm:text-sm font-black"
                style={{ background: `linear-gradient(135deg, ${s.avatarFrom}, ${s.avatarTo})`,
                         boxShadow: `0 4px 10px ${s.avatarFrom}40` }}>
                {s.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 text-xs sm:text-sm leading-none">{s.medal}</div>
            </div>
            <div className="font-bold text-center truncate" style={{ color: TEXT, fontSize: 8 }}>{s.name}</div>
            <div className="text-center truncate mb-1" style={{ color: MUTED, fontSize: 7 }}>{s.grade}</div>
            <div className="flex justify-center mb-1">
              <span className="font-bold px-1.5 py-0.5 rounded-full truncate" style={{ background: s.tagBg, color: s.tagColor, fontSize: 7 }}>{s.tag}</span>
            </div>
            <div className="text-center font-black" style={{ color: s.tagColor, fontSize: 13 }}>{s.score}</div>
            <div className="flex justify-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 7 }}>★</span>)}
            </div>
          </div>
        ); })()}

        {/* ── Right floating card: Rohan ── */}
        {(() => { const s = toppers[1]; return (
          <div className="bt-float-c absolute right-0 top-1/4 rounded-2xl p-2.5 w-[96px] sm:w-32 flex-shrink-0"
            style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.08)`,
                     boxShadow: "0 12px 32px rgba(11,43,107,0.14)" }}>
            <div className="relative mb-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mx-auto text-white text-xs sm:text-sm font-black"
                style={{ background: `linear-gradient(135deg, ${s.avatarFrom}, ${s.avatarTo})`,
                         boxShadow: `0 4px 10px ${s.avatarFrom}40` }}>
                {s.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 text-xs sm:text-sm leading-none">{s.medal}</div>
            </div>
            <div className="font-bold text-center truncate" style={{ color: TEXT, fontSize: 8 }}>{s.name}</div>
            <div className="text-center truncate mb-1" style={{ color: MUTED, fontSize: 7 }}>{s.grade}</div>
            <div className="flex justify-center mb-1">
              <span className="font-bold px-1.5 py-0.5 rounded-full" style={{ background: s.tagBg, color: s.tagColor, fontSize: 7 }}>{s.tag}</span>
            </div>
            <div className="text-center font-black" style={{ color: s.tagColor, fontSize: 13 }}>{s.score}</div>
            <div className="flex justify-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 7 }}>★</span>)}
            </div>
          </div>
        ); })()}

        {/* ── Top featured card: Kaniahya ── */}
        {(() => { const s = toppers[0]; return (
          <div className="bt-float-b absolute -top-4 right-8 sm:right-16 z-30 rounded-2xl p-2.5 sm:p-3.5 w-[110px] sm:w-36"
            style={{ background: "#fff", border: `2px solid rgba(255,107,26,0.25)`,
                     boxShadow: "0 16px 40px rgba(11,43,107,0.18), 0 0 0 2px rgba(255,107,26,0.08)" }}>
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-base sm:text-lg">👑</div>
            <div className="relative mb-1.5 mt-0.5">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mx-auto text-white text-sm sm:text-base font-black"
                style={{ background: `linear-gradient(135deg, ${s.avatarFrom}, ${s.avatarTo})`,
                         boxShadow: `0 6px 14px ${s.avatarFrom}50` }}>
                {s.initial}
              </div>
              <div className="absolute -bottom-1 -right-1 text-sm leading-none">{s.medal}</div>
            </div>
            <div className="font-bold text-center truncate" style={{ color: TEXT, fontSize: 9 }}>{s.name}</div>
            <div className="text-center truncate mb-1" style={{ color: MUTED, fontSize: 7 }}>{s.grade}</div>
            <div className="flex justify-center mb-1">
              <span className="font-bold px-1.5 py-0.5 rounded-full" style={{ background: s.tagBg, color: s.tagColor, fontSize: 7 }}>{s.tag}</span>
            </div>
            <div className="text-center font-black" style={{ color: s.tagColor, fontSize: 16 }}>{s.score}</div>
            <div className="text-center italic hidden sm:block px-0.5" style={{ color: MUTED, fontSize: 8 }}>"{s.quote}"</div>
            <div className="flex justify-center gap-0.5 mt-1">
              {[...Array(5)].map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 8 }}>★</span>)}
            </div>
          </div>
        ); })()}
      </div>

      {/* ── Bottom badge ── */}
      <div className="bt-float-down absolute bottom-0 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl"
        style={{ background: "#fff", border: `1px solid rgba(11,43,107,0.1)`,
                 boxShadow: "0 8px 28px rgba(11,43,107,0.13)" }}>
        <div className="flex -space-x-1.5">
          {["#FF6B1A","#3B82F6","#10B981"].map((c, i) => (
            <div key={i} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-white font-bold"
              style={{ background: c, fontSize: 9 }}>{"PRA"[i]}</div>
          ))}
        </div>
        <div className="font-semibold whitespace-nowrap" style={{ color: TEXT, fontSize: 10 }}>
          <span className="font-black" style={{ color: ORANGE }}>4,200+</span> Classes Every Year
        </div>
      </div>
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
            <p className="text-sm mb-7 text-center" style={{ color: MUTED }}>Hybrid CBSE · ICSE · IB syllabus. Grades 1–10.</p>
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
      <div className="bt-marquee-22 flex gap-10 w-max">
        {doubled.map((s, i) => (
          <div key={i} className="flex items-center gap-3 px-6 py-2 flex-shrink-0 select-none">
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
      </div>
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
      <div className="bt-marquee-30 flex gap-4 w-max">
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
      </div>
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
            {([["Courses","/courses"],["Live Classes","/live-classes"],["Leaderboard","/leaderboard"]] as [string,string][]).map(([l, href]) => (
              <Link key={l} href={href}>
                <span className="cursor-pointer transition-colors" style={{ color: MUTED }}
                  onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                  onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>{l}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <span className="hidden md:block text-sm font-medium cursor-pointer transition-colors" style={{ color: MUTED }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>Sign in</span>
            </Link>
            <Link href="/sign-up">
              <button className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 20px rgba(255,107,26,0.35)` }}>
                Join Free
              </button>
            </Link>
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
              <Link href="/sign-up">
                <button className="group flex items-center gap-2 px-6 py-3 md:px-7 md:py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 0 40px rgba(255,107,26,0.35)` }}>
                  Start for free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/sign-in">
                <button className="group flex items-center gap-2 px-6 py-3 md:px-7 md:py-3.5 rounded-full font-semibold text-sm transition-all hover:scale-105"
                  style={{ background: NAVY, color: "#fff", boxShadow: "0 4px 18px rgba(11,43,107,0.28)" }}>
                  <GraduationCap className="w-4 h-4" /> Student Login
                </button>
              </Link>
            </motion.div>

            {/* ── 5-Day Trial CTA ── */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
              <a href="/enroll"
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
                    5-Day Ignite Course —{" "}
                    <span style={{ color: ORANGE }}>from ₹39 only</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform flex-shrink-0" style={{ color: ORANGE }} />
              </a>
            </motion.div>
            {/* ── Hero Stat Cards ── */}
            <div className="grid grid-cols-2 gap-2.5 max-w-sm">
              {[
                { emoji: "📚", value: "430+", label: "Sessions per Grade / Year", accent: ORANGE },
                { emoji: "🚀", value: "4,200+", label: "Total Sessions Across Grades", accent: "#7C3AED" },
                { emoji: "📅", value: "52 Weeks", label: "Structured Year-Round Learning", accent: "#0EA5E9" },
                { emoji: "🎯", value: "CBSE·ICSE·IB", label: "Hybrid Curriculum", accent: "#10B981" },
              ].map((s, i) => (
                <motion.div key={s.label} variants={fadeUp} initial="hidden" animate="show" custom={4 + i * 0.3}
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: SURFACE, border: `1px solid rgba(11,43,107,0.1)`, boxShadow: "0 2px 12px rgba(11,43,107,0.06)" }}>
                  <div className="text-base leading-none">{s.emoji}</div>
                  <div className="text-sm font-black leading-tight" style={{ color: s.accent }}>{s.value}</div>
                  <div className="leading-snug" style={{ color: MUTED, fontSize: 10 }}>{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease }} className="relative h-[260px] sm:h-[380px] lg:h-[440px] block">
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

      {/* ── ACADEMIC EXCELLENCE ── */}
      <section className="py-8 md:py-14 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-6 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Academic Excellence</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>
              Everything covered. <span style={{ color: ORANGE }}>Every grade.</span>
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: MUTED }}>
              A complete academic ecosystem built around structured growth — not just content delivery.
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { emoji: "🎓", title: "Grades 1–10 Covered", desc: "Full curriculum from foundational to board-level across all grades." },
              { emoji: "📖", title: "6 Core Academic Subjects", desc: "Maths, Science, English, Social Studies, Hindi & more — all NCERT-aligned." },
              { emoji: "📝", title: "Weekly Homework & Assessments", desc: "Structured practice sets after every concept, with graded results." },
              { emoji: "🎥", title: "Live Classes + Recordings", desc: "Attend live or watch anytime — every session is recorded and searchable." },
              { emoji: "📊", title: "Progress Tracking & Reports", desc: "Chapter-wise mastery heatmaps shared with parents every week." },
              { emoji: "🏆", title: "Olympiad & Foundation Prep", desc: "Dedicated tracks for NSO, IMO, NTSE, and other competitive exams." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="rounded-2xl p-4 md:p-5 flex flex-col gap-2 transition-all duration-300"
                style={{ background: SURFACE, border: `1px solid ${BORDER2}` }}
                whileHover={{ y: -3, boxShadow: "0 8px 28px rgba(11,43,107,0.1)", borderColor: "rgba(255,107,26,0.25)" }}>
                <div className="text-2xl">{item.emoji}</div>
                <div className="font-bold text-sm leading-snug" style={{ color: TEXT }}>{item.title}</div>
                <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DUAL TEACHER MODEL ── */}
      <section className="py-8 md:py-14 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-6 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Our Signature Model</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>
              Every child gets <span style={{ color: ORANGE }}>two teachers.</span>
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: MUTED }}>
              Not one — two. A NIT/IIT experienced teacher who teaches live, and a personal mentor who tracks your child's growth every week.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Card 1 — Expert Teacher */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0}
              className="relative rounded-2xl p-6 overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 100%)`, boxShadow: "0 12px 40px rgba(11,43,107,0.2)" }}>
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-10 blur-2xl" style={{ background: ORANGE }} />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,107,26,0.25)", border: "1.5px solid rgba(255,107,26,0.5)" }}>
                  <GraduationCap className="w-6 h-6" style={{ color: ORANGE }} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: "rgba(255,107,26,0.9)" }}>Teacher 1</div>
                  <h3 className="text-lg font-black text-white leading-tight">NIT / IIT Experienced Teacher</h3>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Your child's live class teacher — a highly experienced graduate of NIT or IIT. Real-time teaching, concept-building, and live Q&A every session.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["Live Classes", "Real-time Q&A", "Concept Clarity"].map(t => (
                      <span key={t} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(255,107,26,0.2)", color: "rgba(255,200,150,0.95)", border: "1px solid rgba(255,107,26,0.3)" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2 — Personal Mentor */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={1}
              className="relative rounded-2xl p-6 overflow-hidden border-2"
              style={{ background: "white", borderColor: "rgba(255,107,26,0.2)", boxShadow: "0 12px 40px rgba(11,43,107,0.08)" }}>
              <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full opacity-8 blur-2xl" style={{ background: NAVY }} />
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgba(11,43,107,0.08)`, border: `1.5px solid rgba(11,43,107,0.15)` }}>
                  <Users className="w-6 h-6" style={{ color: NAVY }} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: NAVY }}>Teacher 2</div>
                  <h3 className="text-lg font-black leading-tight" style={{ color: NAVY }}>Personal Mentor</h3>
                  <p className="text-sm mt-1.5 leading-relaxed" style={{ color: MUTED }}>
                    Dedicated 1-on-1 mentor who calls every fortnight, tracks weak areas, shares progress reports with parents, and keeps your child on track.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["1-on-1 Calls", "Progress Reports", "Parent Updates"].map(t => (
                      <span key={t} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: `rgba(11,43,107,0.07)`, color: NAVY, border: `1px solid rgba(11,43,107,0.15)` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom note */}
          <motion.p variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-center text-xs mt-5 font-semibold" style={{ color: MUTED }}>
            🏆 Combined, this is the structure behind every Braintam student's consistent academic progress.
          </motion.p>
        </div>
      </section>

      {/* ── WHY BRAINTAM ── */}
      <section className="py-8 md:py-14 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-8 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Why Braintam</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>
              Learning outcomes,{" "}
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                not just content.
              </span>
            </h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: MUTED }}>
              Transparent learning. No inflated claims. Built around consistent academic growth.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {[
              { icon: "✅", title: "Concept-Based Learning", desc: "Every topic taught from first principles — not just exam shortcuts." },
              { icon: "✅", title: "Weekly Assessments", desc: "Regular chapter tests to identify gaps before they become problems." },
              { icon: "✅", title: "Structured Learning Plans", desc: "A clear academic roadmap for every grade, every subject, every week." },
              { icon: "✅", title: "Teacher-Guided Progress", desc: "Expert teachers + personal mentors track each student individually." },
              { icon: "✅", title: "Homework & Practice Worksheets", desc: "Daily reinforcement sets graded within 24 hours with step-by-step feedback." },
              { icon: "✅", title: "Live + Recorded Learning", desc: "Never miss a class — every session recorded and accessible anytime." },
              { icon: "✅", title: "Performance Tracking", desc: "Concept mastery heatmaps and weekly progress reports sent to parents." },
              { icon: "✅", title: "Academic Foundation Building", desc: "Designed to build lasting understanding, not just exam-day recall." },
            ].map((item, i) => (
              <motion.div key={item.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="flex items-start gap-3 rounded-2xl p-4"
                style={{ background: SURFACE, border: `1px solid ${BORDER2}` }}>
                <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="font-bold text-sm leading-snug mb-0.5" style={{ color: TEXT }}>{item.title}</div>
                  <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Trust strip */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mt-8 rounded-2xl p-5 text-center"
            style={{ background: `linear-gradient(135deg, rgba(11,43,107,0.04), rgba(255,107,26,0.04))`, border: `1px solid rgba(11,43,107,0.1)` }}>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold" style={{ color: MUTED }}>
              {[
                "Transparent Learning. No Inflated Claims.",
                "Every Student Learns Through Structured Guidance.",
                "Live Classes · Recordings · Homework · Tests · Progress Tracking — All in One Platform.",
              ].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 flex-shrink-0" style={{ color: ORANGE }} />{t}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PROGRAMS / PRICING ── */}
      <section className="py-6 md:py-12 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-5 md:mb-8 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Programs</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>Premium live learning programs</h2>
            <p className="text-sm" style={{ color: MUTED }}>EMI available · Ignite Course from ₹39 · Enroll directly</p>
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
                    <a href="/enroll"
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:bg-orange-50"
                      style={{ background: "#FFF7F0", border: `1px solid rgba(255,107,26,0.25)`, color: ORANGE }}>
                      Ignite ₹39+
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
          {/* Header with student photo */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center gap-6 mb-6 md:mb-8">
            {/* Student photo — branded */}
            <div className="flex-shrink-0 hidden md:block">
              <img src={brandedStudentImg} alt="Braintam student"
                className="w-48 rounded-2xl object-cover shadow-lg"
                style={{ border: `3px solid rgba(255,107,26,0.2)` }} />
            </div>
            <div className="text-center md:text-left space-y-2 flex-1">
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Reviews</div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>What families say about Braintam</h2>
              <p className="text-sm" style={{ color: MUTED }}>Real experiences from our learning community</p>
              {/* Trust row */}
              <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,107,26,0.08)", color: ORANGE }}>
                  <Star className="w-3 h-3 fill-current" /> 4.9/5 Parent Rating
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(11,43,107,0.06)", color: NAVY }}>
                  👨‍👩‍👧 Trusted by India's Best Students
                </div>
              </div>
            </div>
            {/* Mobile: show transparent cutout photo */}
            <div className="md:hidden flex justify-center">
              <img src={expertCardImg} alt="Braintam student"
                className="w-32 h-auto object-contain"
                style={{ filter: "drop-shadow(0 4px 16px rgba(11,43,107,0.18))" }} />
            </div>
          </motion.div>
          <TestimonialsLoop />
        </div>
      </section>

      {/* ── OUR VISION ── */}
      <section className="py-8 md:py-14 px-6" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="text-center mb-8 space-y-2">
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: ORANGE }}>Our Vision</div>
            <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: TEXT }}>
              Building India's most{" "}
              <span style={{ color: ORANGE }}>trusted</span> learning ecosystem.
            </h2>
            <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: MUTED }}>
              These are our goals — ambitious targets we are actively working towards. We believe in sharing our vision openly.
            </p>
            {/* "Future goals" label */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mx-auto mt-2"
              style={{ background: "rgba(255,107,26,0.08)", border: "1.5px dashed rgba(255,107,26,0.4)", color: ORANGE }}>
              🎯 These are future goals — not current achievements
            </div>
          </motion.div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "🎯", goal: "10,000", unit: "Students", desc: "Learning through Braintam across India" },
              { emoji: "📚", goal: "100,000+", unit: "Learning Hours", desc: "Delivered to students every year" },
              { emoji: "📝", goal: "1 Million", unit: "Questions Solved", desc: "Through practice, tests & homework" },
              { emoji: "🚀", goal: "Most Trusted", unit: "EdTech", desc: "Built on transparency, not hype" },
            ].map((item, i) => (
              <motion.div key={item.unit} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={i}
                className="rounded-2xl p-5 text-center flex flex-col items-center gap-2 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${NAVY}08, ${ORANGE}06)`, border: `1.5px dashed rgba(11,43,107,0.18)` }}>
                <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(255,107,26,0.1)", color: ORANGE }}>GOAL</div>
                <div className="text-2xl">{item.emoji}</div>
                <div className="font-black text-lg leading-tight" style={{ color: TEXT }}>{item.goal}</div>
                <div className="text-xs font-bold" style={{ color: ORANGE }}>{item.unit}</div>
                <p className="text-xs leading-snug" style={{ color: MUTED }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
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
              430+ live classes per grade · 4,200+ classes per year · Hybrid CBSE · ICSE · IB syllabus.
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
        {/* Background blobs — static, no JS animation needed */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(255,107,26,0.18) 0%, transparent 70%)`, filter: "blur(40px)", opacity: 0.8 }} />
        <div className="absolute bottom-0 left-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(255,107,26,0.12) 0%, transparent 70%)`, filter: "blur(50px)", opacity: 0.6 }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">

            {/* Left — text + buttons */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="flex-1 text-center lg:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.4)", color: "#FFA870" }}>
                <Sparkles className="w-3 h-3" /> Available on Android, iOS &amp; Web
              </div>
              <h2 className="text-2xl md:text-3xl font-black leading-tight text-white">
                Learn anywhere,{" "}
                <span style={{ background: "linear-gradient(135deg, #FF6B1A, #FFA040)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  anytime.
                </span>
              </h2>
              <p className="text-sm leading-relaxed max-w-md mx-auto lg:mx-0"
                style={{ color: "rgba(255,255,255,0.6)" }}>
                Live classes, doubt solving, animated videos, and progress tracking — on your phone, tablet, or laptop.
              </p>

              {/* Store badges */}
              <div className="flex flex-col sm:flex-row gap-3 items-center lg:items-start justify-center lg:justify-start flex-wrap">
                {/* Google Play */}
                <motion.a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                  style={{ background: "#000", border: "1.5px solid rgba(255,255,255,0.15)", minWidth: 155, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
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
                <motion.a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                  style={{ background: "#000", border: "1.5px solid rgba(255,255,255,0.15)", minWidth: 155, boxShadow: "0 6px 24px rgba(0,0,0,0.4)" }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 flex-shrink-0" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-white/60 leading-none mb-0.5" style={{ fontSize: 9 }}>DOWNLOAD ON THE</div>
                    <div className="text-white font-bold text-sm leading-tight">App Store</div>
                  </div>
                </motion.a>

                {/* Web App — highlighted */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #FF8C42)`, minWidth: 155, boxShadow: `0 8px 28px rgba(255,107,26,0.45)`, border: "1.5px solid rgba(255,255,255,0.25)" }}
                  onClick={() => {
                    if (window.matchMedia("(display-mode: standalone)").matches) {
                      alert("Braintam is already installed!");
                    } else if ((window as any).deferredPrompt) {
                      (window as any).deferredPrompt.prompt();
                    } else {
                      alert("Install Braintam:\n1. Tap the menu (⋮) in your browser\n2. Select \"Add to Home Screen\" or \"Install App\"");
                    }
                  }}>
                  <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20"
                    style={{ background: "white", transform: "translate(30%, -30%)" }} />
                  <Globe className="w-6 h-6 text-white flex-shrink-0 relative z-10" />
                  <div className="text-left relative z-10">
                    <div className="flex items-center gap-1 mb-0.5">
                      <div className="text-white/80 leading-none" style={{ fontSize: 9 }}>INSTANT ACCESS</div>
                      <span className="text-[8px] font-black bg-white/20 text-white px-1 py-0.5 rounded leading-none">NEW</span>
                    </div>
                    <div className="text-white font-bold text-sm leading-tight">Web App</div>
                  </div>
                </motion.div>
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
                      <div key={c.label}
                        className={`rounded-xl p-2.5 flex items-center gap-2.5 ${["bt-float-sm","bt-float-sm-2","bt-float-sm-3"][i]}`}
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
                      </div>
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
              <div className="bt-float-sm absolute -left-8 top-16 px-3 py-2 rounded-2xl flex items-center gap-2"
                style={{ background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", minWidth: 100 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
                <div>
                  <div className="font-black text-sm" style={{ color: NAVY }}>4.9</div>
                  <div className="text-gray-400" style={{ fontSize: 9 }}>10K reviews</div>
                </div>
              </div>
              <div className="bt-float-down absolute -right-6 bottom-20 px-3 py-2 rounded-2xl flex items-center gap-2"
                style={{ background: ORANGE, boxShadow: `0 8px 32px rgba(255,107,26,0.4)`, minWidth: 110 }}>
                <Users className="w-4 h-4 text-white flex-shrink-0" />
                <div>
                  <div className="font-black text-sm text-white">5L+</div>
                  <div className="text-white/70" style={{ fontSize: 9 }}>Students</div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex flex-col md:flex-row gap-5 items-stretch">

            {/* Left: brand block */}
            <div className="flex-shrink-0 md:w-56 space-y-2">
              {/* Logo */}
              <img src={braintamLogo} alt="Braintam" className="w-12 h-12 object-contain" />
              <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                <span style={{ color: "rgba(255,107,26,0.8)" }}>Brain + Talent Advancement Mission</span><br />
                Advancing young minds through innovative learning, mentorship & skill-building for Grades 1–10.
              </p>
              <div className="space-y-1 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 flex-shrink-0" style={{ color: ORANGE }} />support@braintam.com</div>
                <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 flex-shrink-0" style={{ color: ORANGE }} />+91 84929 44473</div>
                <div className="flex items-start gap-1.5"><MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                  <span>C/23, Durvas Complex, near Capital Mall Gate No. 5, Nallasopara (E), Palghar, 401209</span>
                </div>
              </div>
              {/* Social icons at the bottom */}
              <div className="flex gap-2 pt-1">
                {[
                  { Icon: WaIcon, href: "https://wa.me/918492944473" },
                  { Icon: IgIcon, href: "https://www.instagram.com/braintamofficial/" },
                  { Icon: FbIcon, href: "https://facebook.com/braintam" },
                  { Icon: YtIcon, href: "https://www.youtube.com/@BraintamOfficial" },
                ].map(({ Icon, href }, i) => (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = ORANGE)}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </a>
                ))}
              </div>
            </div>

            {/* Middle: Company + Support links */}
            <div className="flex-1 grid grid-cols-2 gap-6">
              {Object.entries(footerLinks).map(([group, links]) => (
                <div key={group}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: ORANGE }}>{group}</p>
                  <ul className="space-y-2">
                    {links.map(({ label, href }) => (
                      <li key={label}>
                        <Link href={href}
                          className="text-xs transition-colors hover:text-white"
                          style={{ color: "rgba(255,255,255,0.45)" }}>
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Right: student image */}
            <div className="flex-shrink-0 md:w-80 hidden md:flex items-end justify-center"
              style={{ marginBottom: "-20px", marginLeft: "-48px" }}>
              <img src={expertCardImg} alt="Braintam student"
                className="w-full h-auto block object-contain"
                style={{
                  transform: "translateY(-18px) scale(1.12)",
                  transformOrigin: "bottom center",
                  filter: "drop-shadow(0 6px 20px rgba(0,0,0,0.5))"
                }} />
            </div>
          </div>

        </div>


        {/* Bottom bar */}
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>© {new Date().getFullYear()} Braintam Learning. All Rights Reserved.</span>
          <div className="flex gap-5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            <Link href="/terms"   className="hover:text-white transition-colors">Terms & Conditions</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/refund"  className="hover:text-white transition-colors">Refund Policy</Link>
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
