import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api-base";
import {
  CheckCircle2, Shield, Users, Star, Clock,
  BookOpen, Target, Video, Headphones, FileText, Zap,
  GraduationCap, Phone, ChevronRight, Award,
} from "lucide-react";

import studentHeroImg from "@assets/Untitled_design_(6)-Photoroom_1780079465208.png";
import brandedKidImg  from "@assets/ChatGPT_Image_May_29,_2026,_09_13_20_PM_1780069417528.png";

const braintamLogo = "/logo.svg";

// ── Brand ─────────────────────────────────────────────────────
const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const MRP    = 599;

// ── Grade-based pricing (mirrors backend exactly) ─────────────
// Grade 1–2: ₹99 · Grade 3–8: ₹39 · Grade 9–10: ₹89
const GRADE_PRICE: Record<number, number> = {
  1: 99, 2: 99,
  3: 39, 4: 39, 5: 39, 6: 39, 7: 39, 8: 39,
  9: 89, 10: 89,
};
const getPrice  = (g: number) => GRADE_PRICE[g] ?? 39;
const getDisc   = (g: number) => Math.round(((MRP - getPrice(g)) / MRP) * 100);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Razorpay: any; }
}

// ── Phone helpers ─────────────────────────────────────────────
function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  return d.slice(1);
  return d;
}
const isValidPhone = (r: string) => /^[6-9]\d{9}$/.test(normalizePhone(r));

// ── Load Razorpay checkout.js once ───────────────────────────
function useRazorpay() {
  const [ready, setReady] = useState(!!window.Razorpay);
  useEffect(() => {
    if (window.Razorpay) return;
    const s = Object.assign(document.createElement("script"), {
      src: "https://checkout.razorpay.com/v1/checkout.js",
      async: true,
      onload: () => setReady(true),
    });
    document.body.appendChild(s);
  }, []);
  return ready;
}

// ── Countdown timer (15 min, resets on mount) ─────────────────
function useCountdown(initialSeconds = 900) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return { h, m, s, expired: secs === 0 };
}

// ── Static content ────────────────────────────────────────────
const FEATURES = [
  { icon: Video,      title: "Live Interactive Classes",    desc: "Daily live classes with IIT/NIT teachers" },
  { icon: BookOpen,   title: "Core Concepts Made Easy",     desc: "50+ must-know concepts, simplified" },
  { icon: FileText,   title: "Practice Worksheets",         desc: "Daily practice to build confidence" },
  { icon: Headphones, title: "Doubt Solving Support",       desc: "Doubts solved on WhatsApp instantly" },
  { icon: Target,     title: "Olympiad Preparation",        desc: "Tricks & shortcuts for competitions" },
  { icon: Zap,        title: "IIT/NIT Mentor Support",      desc: "Guided by mentors from top institutes" },
];

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Parent of Aanya, Grade 7 · Delhi",
    text: "The teachers explain every concept with real-life examples. My daughter loves the sessions and asks for more. Best decision we made this year!",
    initial: "P",
    color: "#4f46e5",
  },
  {
    name: "Kabir's Parent",
    role: "Grade 6 · Mumbai",
    text: "It is really good because the teachers explain every concept in detail with real life examples. My child loves the way of teaching.",
    initial: "K",
    color: "#0ea5e9",
  },
  {
    name: "Rohan",
    role: "Class 10 · Bangalore",
    text: "Best platform for concept clarity. Regular tests and feedback helped me improve my scores a lot. Cleared my doubts in every class.",
    initial: "R",
    color: "#16a34a",
  },
];

const TEACHERS = [
  { name: "Poonam Ma'am",   tag: "IIT Delhi · Math",    bio: "Makes every concept click",        initial: "P", color: "#7c3aed" },
  { name: "Gourav Sir",     tag: "NIT Trichy · Science", bio: "Hands-on & visual approach",       initial: "G", color: "#0284c7" },
  { name: "Priya Ma'am",    tag: "IIT Bombay · English", bio: "Strong foundations, fast results", initial: "P", color: "#059669" },
];

// ── Success Screen ────────────────────────────────────────────
function SuccessScreen({ grade, phone }: { grade: number; phone: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg,#f0f4ff,#fff7f0)" }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg,#bbf7d0,#d1fae5)" }}>
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: NAVY }}>
          Congratulations! 🎉
        </h1>
        <p className="text-lg font-bold mb-4" style={{ color: ORANGE }}>
          Your seat is reserved.
        </p>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Your <strong>Ignite Course — Grade {grade}</strong> enrollment is confirmed.
          Class details will be shared on{" "}
          <strong>+91&nbsp;{normalizePhone(phone)}</strong> via WhatsApp within{" "}
          <strong>24 hours</strong>.
        </p>

        <div className="rounded-xl p-4 mb-6 text-left"
          style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p className="text-sm font-bold mb-2" style={{ color: ORANGE }}>What happens next?</p>
          <ul className="space-y-1.5 text-sm" style={{ color: "#92400e" }}>
            <li>✅ Mentor will WhatsApp your class schedule</li>
            <li>✅ Classes begin within 24–48 hours</li>
            <li>✅ 5 live sessions, no hidden charges</li>
            <li>✅ 100% refund if you're not satisfied</li>
          </ul>
        </div>

        <p className="text-xs text-gray-400">
          Questions?{" "}
          <a href="https://wa.me/919876543210" className="underline font-semibold"
            style={{ color: NAVY }}>
            Chat with us on WhatsApp
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ── Enrollment Form Card ──────────────────────────────────────
function EnrollForm({
  grade, setGrade, phone, setPhone,
  loading, error, accountNote, onSubmit,
}: {
  grade: number; setGrade: (g: number) => void;
  phone: string; setPhone: (p: string) => void;
  loading: boolean; error: string | null; accountNote: string | null;
  onSubmit: () => void;
}) {
  const price = getPrice(grade);
  const disc  = getDisc(grade);

  return (
    <div id="enroll-form" className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <h2 className="font-extrabold text-xl mb-1" style={{ color: NAVY }}>
        Enroll for Ignite Course
      </h2>
      <p className="text-sm text-gray-500 mb-4">Select Grade & Enter Parent's Mobile Number</p>

      {/* Price badge */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl font-black" style={{ color: ORANGE }}>₹{price}</span>
        <span className="text-lg text-gray-400 line-through font-medium">₹{MRP}</span>
        <span className="text-xs font-extrabold px-2 py-1 rounded-full"
          style={{ background: "#dcfce7", color: "#16a34a" }}>
          {disc}% OFF
        </span>
      </div>

      {/* Step 1 — Grade */}
      <div className="mb-5">
        <p className="flex items-center gap-1.5 text-xs font-bold mb-2 text-gray-600 uppercase tracking-wide">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black"
            style={{ background: ORANGE }}>1</span>
          Select Grade
        </p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
            <button key={g} onClick={() => setGrade(g)}
              className="py-2.5 rounded-xl text-sm font-bold transition-all border"
              style={{
                background:  grade === g ? ORANGE : "#f8faff",
                color:       grade === g ? "#fff"  : NAVY,
                borderColor: grade === g ? ORANGE  : "#e2e8f0",
                boxShadow:   grade === g ? "0 4px 12px rgba(255,107,26,0.35)" : "none",
              }}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — Phone */}
      <div className="mb-4">
        <p className="flex items-center gap-1.5 text-xs font-bold mb-2 text-gray-600 uppercase tracking-wide">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black"
            style={{ background: ORANGE }}>2</span>
          Enter Parent's Mobile Number
        </p>
        <div className="flex items-center border-2 rounded-xl overflow-hidden transition-all"
          style={{ borderColor: phone.length === 10 ? ORANGE : "#e2e8f0" }}>
          <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-200 font-semibold select-none">
            +91
          </span>
          <input
            type="tel" inputMode="numeric" maxLength={10}
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Enter 10 digit mobile number"
            className="flex-1 px-3 py-3 text-sm outline-none bg-white"
          />
          {phone.length === 10 && isValidPhone(phone) && (
            <CheckCircle2 className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <span>💬</span> We will send course details on WhatsApp
        </p>
      </div>

      {/* Account notice */}
      <AnimatePresence>
        {accountNote && !error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 rounded-xl bg-blue-50 text-blue-700 text-xs leading-relaxed">
            {accountNote}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <button onClick={onSubmit} disabled={loading || phone.length < 10}
        className="w-full py-4 rounded-xl font-extrabold text-white text-base flex items-center
          justify-center gap-2 transition-all active:scale-95"
        style={{
          background: loading || phone.length < 10
            ? "#94a3b8"
            : `linear-gradient(90deg,${ORANGE},#e85d12)`,
          cursor: loading || phone.length < 10 ? "not-allowed" : "pointer",
          boxShadow: loading || phone.length < 10 ? "none" : "0 8px 20px rgba(255,107,26,0.4)",
        }}>
        {loading ? "Opening payment…" : `Continue to Pay ₹${price}`}
        {!loading && <ChevronRight className="w-5 h-5" />}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5" />
        Secured by Razorpay · 256-bit SSL Encryption
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function EnrollPage() {
  const [grade, setGrade]         = useState(6);
  const [phone, setPhone]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [accountNote, setNote]    = useState<string | null>(null);
  const razorpayReady             = useRazorpay();
  const timer                     = useCountdown(900);
  // Simulated seat count: 12 seats, decreasing by 1 every ~3 min for urgency
  const [seats]                   = useState(() => Math.floor(Math.random() * 5) + 8);

  const price = getPrice(grade);

  const scrollToForm = useCallback(() => {
    document.getElementById("enroll-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function handleEnroll() {
    setError(null);
    setNote(null);
    if (!isValidPhone(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!razorpayReady) {
      setError("Payment system is loading — please try again in a moment.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), grade }),
      });
      const data = await res.json() as {
        orderId?: string; amount?: number; currency?: string; keyId?: string;
        existingAccount?: { accountType: string; name?: string };
        error?: string; message?: string;
      };
      if (!res.ok) {
        setError(res.status === 409
          ? (data.message ?? "Already enrolled. Please contact support.")
          : (data.error ?? "Something went wrong. Please try again."));
        setLoading(false);
        return;
      }
      if (data.existingAccount) {
        const { accountType, name } = data.existingAccount;
        setNote(`Note: ${name ? name + " — " : ""}account type "${accountType}" already exists for this number.`);
      }
      const rzp = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency ?? "INR",
        order_id: data.orderId,
        name: "Braintam", description: `Ignite Course — Grade ${grade}`,
        prefill: { contact: `91${normalizePhone(phone)}` },
        theme: { color: ORANGE },
        handler() { setSuccess(true); },
        modal: { ondismiss() { setLoading(false); } },
      });
      rzp.open();
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }

  if (success) return <SuccessScreen grade={grade} phone={phone} />;

  return (
    <div className="min-h-screen bg-white font-sans pb-24">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={braintamLogo} alt="Braintam" className="h-10 w-auto" />
            <span className="hidden sm:block font-extrabold text-lg tracking-tight" style={{ color: NAVY }}>Braintam</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-600">
            {[
              { icon: GraduationCap, label: "IIT/NIT Teachers" },
              { icon: Video,         label: "Live Classes"      },
              { icon: Zap,           label: "Concept Clarity"   },
              { icon: Award,         label: "Proven Results"    },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 hover:text-orange-500 transition-colors cursor-default">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            ))}
          </nav>
          <button onClick={scrollToForm}
            className="text-xs font-bold px-4 py-2 rounded-full text-white transition-all active:scale-95"
            style={{ background: `linear-gradient(90deg,${ORANGE},#e85d12)` }}>
            Enroll Now
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ background: `linear-gradient(135deg,${NAVY} 0%,#0a3d8c 100%)` }}
        className="text-white pt-10 pb-12 px-4 overflow-hidden relative">

        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center relative z-10">
          {/* Left — text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.4)" }}>
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-xs font-bold text-orange-300">IGNITE COURSE · LIMITED SEATS</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
              A Strong Start Today,<br />
              <span style={{ color: ORANGE }}>A Bright Future</span> Tomorrow!
            </h1>
            <p className="text-blue-100 text-base mb-4 leading-relaxed">
              5-Day Live Program for Classes 1–10 · IIT/NIT Mentors · WhatsApp Support
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {["Concepts Made Easy", "Learn from IITians", "Live Interactive Classes", "Doubt Solving Support"].map(f => (
                <span key={f} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <CheckCircle2 className="w-3 h-3 text-green-400" /> {f}
                </span>
              ))}
            </div>

            {/* Live enrollment ticker */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex -space-x-2">
                {["#7c3aed","#0284c7","#059669","#d97706"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-navy flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: c, borderColor: NAVY }}>
                    {["P","K","R","A"][i]}
                  </div>
                ))}
              </div>
              <span className="text-blue-200 text-sm">
                Trusted by <strong className="text-white">India's Best</strong> Students & Parents
              </span>
            </div>

            {/* Live enrollment notification */}
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2.5 }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-300">S***a from Rajasthan just enrolled</span>
            </motion.div>

            </div>

          {/* Right column — girl photo, all screen sizes */}
          <div className="flex items-end justify-center">
            <img src={studentHeroImg} alt="Braintam student"
              className="w-64 sm:w-72 md:w-80 h-auto object-contain"
              style={{ filter: "drop-shadow(0 12px 36px rgba(0,0,0,0.45))" }} />
          </div>

        </div>
      </section>

      {/* ── Urgency + Form (mobile) / Urgency only (desktop) ── */}
      <section className="py-8 px-4" style={{ background: "#fafafa" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6 items-start">

          {/* Urgency Card */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🔥</span>
              <span className="font-extrabold text-red-600 text-sm">Limited Seats Available!</span>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex gap-2">
                {[
                  { val: timer.h, label: "Hours" },
                  { val: timer.m, label: "Minutes" },
                  { val: timer.s, label: "Seconds" },
                ].map(({ val, label }, i) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="text-center">
                      <div className="text-3xl font-black tabular-nums" style={{ color: ORANGE }}>{val}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                    {i < 2 && <span className="text-2xl font-black text-gray-300 pb-4">:</span>}
                  </div>
                ))}
              </div>
              <div className="ml-auto text-center">
                <div className="text-2xl font-black" style={{ color: NAVY }}>{seats}</div>
                <div className="text-xs text-gray-400">Seats left</div>
              </div>
            </div>

            {/* Benefits list */}
            <ul className="space-y-3 mb-5">
              {[
                ["📚", "5-Day Ignite Program"],
                ["⚡", "Basics + Tricks + Practice"],
                ["💬", "WhatsApp Access in 24 hrs"],
                ["🛑", "If you don't like it, just stop. No commitment after demo."],
              ].map(([emoji, text]) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span>{emoji}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            {/* Secure badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <Shield className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-700">100% Safe & Secure</p>
                <p className="text-xs text-green-600">Secured by Razorpay · 256-bit SSL Encryption</p>
              </div>
            </div>
          </div>

          {/* Form — all screen sizes */}
          <div>
            <EnrollForm
              grade={grade} setGrade={setGrade}
              phone={phone} setPhone={setPhone}
              loading={loading} error={error} accountNote={accountNote}
              onSubmit={handleEnroll}
            />
          </div>

          {/* Pricing table — desktop right col */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h3 className="font-extrabold text-base mb-4" style={{ color: NAVY }}>
              Grade-wise Pricing
            </h3>
            <div className="space-y-3">
              {[
                { label: "Grade 1–2",  price: 99,  popular: false },
                { label: "Grade 3–8",  price: 39,  popular: true  },
                { label: "Grade 9–10", price: 89,  popular: false },
              ].map(({ label, price: p, popular }) => (
                <div key={label}
                  className="flex items-center justify-between p-3 rounded-xl border transition-all"
                  style={{
                    borderColor: popular ? ORANGE : "#e2e8f0",
                    background:  popular ? "#fff7f0" : "#fafafa",
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                    {popular && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                        style={{ background: ORANGE, color: "#fff" }}>Most Popular</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">₹{MRP}</span>
                    <span className="font-black text-lg" style={{ color: ORANGE }}>₹{p}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              One-time payment · No hidden charges · 100% refundable
            </p>
          </div>
        </div>
      </section>

      {/* ── What's Included ── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-2" style={{ color: NAVY }}>
            What's Included in the{" "}
            <span style={{ color: ORANGE }}>Ignite Course?</span>
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">
            Everything your child needs to build confidence and score better
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="flex flex-col items-center text-center p-4 rounded-2xl border border-gray-100
                  hover:shadow-md hover:-translate-y-1 transition-all bg-white group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-all"
                  style={{ background: "#fff7f0" }}>
                  <Icon className="w-6 h-6" style={{ color: ORANGE }} />
                </div>
                <p className="text-xs font-bold mb-1 leading-tight" style={{ color: NAVY }}>{title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Teachers ── */}
      <section className="py-14 px-4" style={{ background: "#f8faff" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-2" style={{ color: NAVY }}>
            Learn With <span style={{ color: ORANGE }}>IIT/NIT Teachers</span>
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">
            Mentors from India's top institutes — 98% IIT/NIT rate
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TEACHERS.map(({ name, tag, bio, initial, color }) => (
              <div key={name}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100
                  flex items-start gap-4 hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                  style={{ background: color }}>
                  {initial}
                </div>
                <div>
                  <p className="font-extrabold text-sm" style={{ color: NAVY }}>{name}</p>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: ORANGE }}>{tag}</p>
                  <p className="text-xs text-gray-500">"{bio}"</p>
                  <div className="flex gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-2" style={{ color: NAVY }}>
            Loved by <span style={{ color: ORANGE }}>Parents & Students</span>
          </h2>
          <div className="flex items-center justify-center gap-1 mb-10">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current text-yellow-400" />
            ))}
            <span className="text-sm text-gray-600 ml-2 font-semibold">4.9/5 from 10,000+ reviews</span>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, initial, color }) => (
              <div key={name}
                className="bg-white rounded-2xl p-5 shadow-md border border-gray-100
                  hover:shadow-lg transition-all">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 italic mb-4 leading-relaxed">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: color }}>
                    {initial}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: NAVY }}>{name}</p>
                    <p className="text-xs text-gray-400">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-8 px-4" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Users,    value: "India's Best", label: "Students & Parents" },
            { icon: Award,    value: "500+",        label: "Top IIT/NIT Teachers" },
            { icon: BookOpen, value: "50+",         label: "Core Concepts"       },
            { icon: Target,   value: "300+",        label: "Quizzes & Tests"     },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,107,26,0.2)" }}>
                <Icon className="w-5 h-5" style={{ color: ORANGE }} />
              </div>
              <div>
                <p className="font-extrabold text-white text-lg leading-none">{value}</p>
                <p className="text-blue-200 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-14 px-4 text-center bg-white">
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: NAVY }}>
          Still thinking? The seat won't wait.
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Only <strong style={{ color: "red" }}>{seats} seats</strong> remaining for this batch.
        </p>
        <button onClick={scrollToForm}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-extrabold text-white text-lg
            transition-all active:scale-95"
          style={{
            background: `linear-gradient(90deg,${ORANGE},#e85d12)`,
            boxShadow: "0 8px 24px rgba(255,107,26,0.4)",
          }}>
          Reserve My Child's Seat
          <ChevronRight className="w-5 h-5" />
        </button>
        <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Trusted · Secure · Reliable · Your child's bright future starts here.
        </p>
      </section>

      {/* ── Mobile pricing section ── */}
      <section className="md:hidden py-8 px-4" style={{ background: "#f8faff" }}>
        <div className="max-w-lg mx-auto">
          <h3 className="font-extrabold text-base mb-4 text-center" style={{ color: NAVY }}>
            Grade-wise Pricing
          </h3>
          <div className="space-y-3">
            {[
              { label: "Grade 1–2",  price: 99, popular: false },
              { label: "Grade 3–8",  price: 39, popular: true  },
              { label: "Grade 9–10", price: 89, popular: false },
            ].map(({ label, price: p, popular }) => (
              <div key={label}
                className="flex items-center justify-between p-3 rounded-xl border"
                style={{ borderColor: popular ? ORANGE : "#e2e8f0", background: popular ? "#fff7f0" : "#fff" }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  {popular && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: ORANGE, color: "#fff" }}>Popular</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 line-through">₹{MRP}</span>
                  <span className="font-black text-lg" style={{ color: ORANGE }}>₹{p}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl"
        style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-blue-200 text-xs">Grade {grade} selected</p>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-extrabold text-xl">₹{price}</span>
              <span className="text-blue-300 text-xs line-through">₹{MRP}</span>
              <span className="text-green-400 text-xs font-bold">{getDisc(grade)}% off</span>
            </div>
          </div>
          <button onClick={handleEnroll}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-extrabold text-white
              text-sm transition-all active:scale-95 flex-shrink-0"
            style={{
              background: loading ? "#94a3b8" : `linear-gradient(90deg,${ORANGE},#e85d12)`,
              boxShadow: loading ? "none" : "0 4px 16px rgba(255,107,26,0.5)",
            }}>
            {loading ? "Opening…" : "Enroll Now"}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
