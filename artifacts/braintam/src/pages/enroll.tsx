import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api-base";
import { CheckCircle2, Shield, Star, ChevronRight, X } from "lucide-react";

import studentHeroImg from "@assets/Untitled_design_(6)-Photoroom_1780079465208.png";

const braintamLogo = "/logo.svg";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const MRP    = 599;

const GRADE_PRICE: Record<number, number> = {
  1: 99, 2: 99,
  3: 39, 4: 39, 5: 39, 6: 39, 7: 39, 8: 39,
  9: 89, 10: 89,
};
const getPrice = (g: number) => GRADE_PRICE[g] ?? 39;
const getDisc  = (g: number) => Math.round(((MRP - getPrice(g)) / MRP) * 100);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Razorpay: any; }
}

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  return d.slice(1);
  return d;
}
const isValidPhone = (r: string) => /^[6-9]\d{9}$/.test(normalizePhone(r));

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

// ── Countdown (15 min) ──────────────────────────────────────
function useCountdown(initialSeconds = 900) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// ── Rolling enrollment notifications ────────────────────────
const ENROLLEES = [
  "A***a from Delhi just enrolled",
  "R***h from Mumbai just enrolled",
  "S***a from Rajasthan just enrolled",
  "P***i from Punjab just enrolled",
  "K***n from Karnataka just enrolled",
  "M***a from UP just enrolled",
];
function useRollingText(items: string[], interval = 3000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % items.length), interval);
    return () => clearInterval(id);
  }, [items, interval]);
  return items[idx];
}

// ── Booking urgency modal ────────────────────────────────────
function BookingModal({ grade, onConfirm, onClose }: {
  grade: number;
  onConfirm: (phone: string) => void;
  onClose: () => void;
}) {
  const [phase, setPhase]   = useState<"phone" | "booking" | "confirm">("phone");
  const [phone, setPhone]   = useState("");
  const [progress, setProgress] = useState(0);
  const [waiting]           = useState(() => Math.floor(Math.random() * 6) + 3);
  const price               = getPrice(grade);
  const disc                = getDisc(grade);
  const timerStr            = useCountdown(595);
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "phone") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "booking") return;
    setProgress(0);
    const start = Date.now();
    const duration = 2800;
    const id = setInterval(() => {
      const pct = Math.min(((Date.now() - start) / duration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(id);
        setTimeout(() => setPhase("confirm"), 200);
      }
    }, 30);
    return () => clearInterval(id);
  }, [phase]);

  function handlePhoneSubmit() {
    if (!isValidPhone(phone)) return;
    setPhase("booking");
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="sheet"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden"
          style={{ background: "#fff" }}
        >
          {/* ── Phase: phone input ── */}
          {phase === "phone" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: ORANGE }}>
                    IGNITE COURSE — CLASS {grade}
                  </p>
                  <h2 className="text-lg font-extrabold" style={{ color: NAVY }}>
                    Reserve Your Seat
                  </h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl"
                style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Total Fee (Inc. taxes)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black" style={{ color: ORANGE }}>₹{price}</span>
                    <span className="text-sm text-gray-400 line-through">₹{MRP}</span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: "#dcfce7", color: "#16a34a" }}>{disc}% OFF</span>
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500">Offer ends in</p>
                  <p className="text-lg font-black tabular-nums" style={{ color: "red" }}>{timerStr}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">Enter parent's WhatsApp number to continue:</p>
              <div className="flex items-center border-2 rounded-xl overflow-hidden mb-4 transition-all"
                style={{ borderColor: isValidPhone(phone) ? ORANGE : "#e2e8f0" }}>
                <span className="px-3 py-3.5 bg-gray-50 text-gray-500 text-sm border-r border-gray-200 font-semibold select-none">+91</span>
                <input
                  ref={inputRef}
                  type="tel" inputMode="numeric" maxLength={10}
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className="flex-1 px-3 py-3.5 text-sm outline-none bg-white"
                />
                {isValidPhone(phone) && <CheckCircle2 className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />}
              </div>

              <button
                onClick={handlePhoneSubmit}
                disabled={!isValidPhone(phone)}
                className="w-full py-4 rounded-xl font-extrabold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  background: isValidPhone(phone) ? `linear-gradient(90deg,${ORANGE},#e85d12)` : "#94a3b8",
                  cursor: isValidPhone(phone) ? "pointer" : "not-allowed",
                  boxShadow: isValidPhone(phone) ? "0 8px 20px rgba(255,107,26,0.4)" : "none",
                }}>
                Book My Seat <ChevronRight className="w-5 h-5" />
              </button>

              <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secured by Razorpay · 256-bit SSL
              </p>
            </div>
          )}

          {/* ── Phase: booking animation ── */}
          {phase === "booking" && (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500 mb-3">Try to process your order…</p>
              <div className="rounded-2xl p-5 mb-4"
                style={{ background: `linear-gradient(135deg,${ORANGE},#e85d12)` }}>
                <h2 className="text-xl font-extrabold text-white mb-3">Seats Almost Full.</h2>
                <div className="w-full h-3 rounded-full bg-white/30 overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.05 }}
                  />
                </div>
                <p className="text-white/90 text-sm">{waiting} parents are waiting in line…</p>
              </div>
              <p className="text-sm font-bold" style={{ color: NAVY }}>
                Boost Score 100% with IIT Best Teachers 🏆
              </p>
            </div>
          )}

          {/* ── Phase: confirm ── */}
          {phase === "confirm" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-extrabold" style={{ color: NAVY }}>
                  🎉 Seat Reserved!
                </h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="rounded-xl p-4 mb-4"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Class {grade} Total Fee</span>
                  <span className="font-black" style={{ color: NAVY }}>₹{price}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Includes all taxes</span>
                  <span className="text-gray-400 line-through">₹{MRP}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-1 text-center">
                Trusted by India's best students & parents
              </p>
              <p className="text-xs text-center font-bold mb-4" style={{ color: "red" }}>
                Limited Discount Ends In: {timerStr}
              </p>

              <button
                onClick={() => onConfirm(phone)}
                className="w-full py-4 rounded-xl font-extrabold text-white text-base flex items-center justify-center gap-2 active:scale-95"
                style={{ background: `linear-gradient(90deg,${ORANGE},#e85d12)`, boxShadow: "0 8px 20px rgba(255,107,26,0.4)" }}>
                Confirm & Pay ₹{price}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Success Screen ───────────────────────────────────────────
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
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: NAVY }}>Congratulations! 🎉</h1>
        <p className="text-lg font-bold mb-4" style={{ color: ORANGE }}>Your seat is confirmed.</p>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Your <strong>Ignite Course — Grade {grade}</strong> enrollment is confirmed.
          Class details will be shared on{" "}
          <strong>+91 {normalizePhone(phone)}</strong> via WhatsApp within <strong>24 hours</strong>.
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
          <a href="https://wa.me/919876543210" className="underline font-semibold" style={{ color: NAVY }}>
            Chat with us on WhatsApp
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function EnrollPage() {
  const [grade, setGrade]     = useState(6);
  const [showModal, setModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const razorpayReady         = useRazorpay();
  const timerStr              = useCountdown(900);
  const [seats]               = useState(() => Math.floor(Math.random() * 5) + 8);
  const enrolleeText          = useRollingText(ENROLLEES);

  const price = getPrice(grade);
  const disc  = getDisc(grade);

  const handleConfirm = useCallback(async (phone: string) => {
    setError(null);
    if (!razorpayReady) {
      setError("Payment is loading — please try again in a moment.");
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
      setModal(false);
      const rzp = new window.Razorpay({
        key: data.keyId, amount: data.amount, currency: data.currency ?? "INR",
        order_id: data.orderId,
        name: "Braintam", description: `Ignite Course — Grade ${grade}`,
        prefill: { contact: `91${normalizePhone(phone)}` },
        theme: { color: ORANGE },
        handler() { setConfirmedPhone(phone); setSuccess(true); },
        modal: { ondismiss() { setLoading(false); } },
      });
      rzp.open();
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }, [grade, razorpayReady]);

  if (success) return <SuccessScreen grade={grade} phone={confirmedPhone} />;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f5f7ff" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={braintamLogo} alt="Braintam" className="h-9 w-auto" />
            <span className="font-extrabold text-base tracking-tight" style={{ color: NAVY }}>Braintam</span>
          </div>
          <button onClick={() => setModal(true)}
            className="text-xs font-extrabold px-4 py-2 rounded-full text-white"
            style={{ background: `linear-gradient(90deg,${ORANGE},#e85d12)` }}>
            Enroll Now
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 pb-32 space-y-4">

        {/* ── Hero Banner ── */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: `linear-gradient(135deg,${NAVY} 0%,#0a3d8c 100%)` }}>

          {/* dot grid */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className="relative z-10 flex items-end">
            <div className="flex-1 p-5 pb-4">
              {/* Live pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
                style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.5)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-bold text-orange-300">IGNITE COURSE · LIMITED SEATS</span>
              </div>

              <h1 className="text-xl font-extrabold text-white leading-snug mb-3">
                Unlock Your Child's<br />
                <span style={{ color: ORANGE }}>Full Potential</span>
              </h1>

              <ul className="space-y-1.5 mb-3">
                {[
                  "Maths, Science & Olympiads",
                  "50+ Core Concepts",
                  "50+ Solving Skills",
                  "IIT/NIT Teachers",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-blue-100">
                    <span className="text-orange-400">▶</span> {f}
                  </li>
                ))}
              </ul>

              {/* Live enrollment ticker */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={enrolleeText}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-green-300">{enrolleeText}</span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Girl photo */}
            <div className="flex-shrink-0 self-end pr-2">
              <img src={studentHeroImg} alt="Braintam student"
                className="w-36 h-auto object-contain"
                style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.4))" }} />
            </div>
          </div>

          {/* Course info strip */}
          <div className="relative z-10 px-5 py-2.5 flex items-center justify-between"
            style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-xs text-blue-200 font-semibold">Ignite Course · 5-Day Live Program</span>
            <span className="text-xs text-blue-300">⏱ Offer ends: {timerStr}</span>
          </div>
        </div>

        {/* ── Grade Selector ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-extrabold text-base mb-1" style={{ color: NAVY }}>
            Choose Class to Boost Score (2025–26) 🔥
          </h2>
          <p className="text-xs text-gray-400 mb-4">Select your child's class below</p>

          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(g => {
              const isSelected = grade === g;
              return (
                <button key={g} onClick={() => setGrade(g)}
                  className="py-3 rounded-xl text-sm font-bold transition-all border-2 relative"
                  style={{
                    background:   isSelected ? ORANGE : "#f8faff",
                    color:        isSelected ? "#fff" : NAVY,
                    borderColor:  isSelected ? ORANGE : "#e2e8f0",
                    boxShadow:    isSelected ? "0 4px 14px rgba(255,107,26,0.4)" : "none",
                    transform:    isSelected ? "scale(1.06)" : "scale(1)",
                  }}>
                  Class {g}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-center text-gray-400 mt-3">
            ✅ Classes 1–10 open · Batch starts soon
          </p>
        </div>

        {/* ── Social Proof / Rating ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
            style={{ background: `linear-gradient(90deg,${NAVY},#0a3d8c)` }}>
            <span className="text-white font-extrabold text-sm flex-1">⭐ Highly Rated by Parents & Students</span>
            <div className="flex">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: "Kabir's Parent", city: "Mumbai", text: "The teachers explain every concept in detail. My child loves the way of teaching." },
              { name: "Priya Sharma", city: "Delhi", text: "Best decision we made this year. My daughter asks for more sessions every day!" },
              { name: "Rohan", city: "Bangalore", text: "Cleared my doubts in every class. Scores improved a lot. Highly recommend." },
            ].map(({ name, city, text }) => (
              <div key={name} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#f8faff" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
                  style={{ background: NAVY }}>{name[0]}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: NAVY }}>{name}</span>
                    <span className="text-xs text-gray-400">· {city}</span>
                    <div className="flex ml-auto">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── What you get ── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-extrabold text-sm mb-3" style={{ color: NAVY }}>What's included in Ignite Course:</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["📚", "5 Live Sessions"],
              ["⚡", "Concept Clarity"],
              ["💬", "WhatsApp Support"],
              ["🏆", "Olympiad Tricks"],
              ["📝", "Daily Worksheets"],
              ["🎯", "Doubt Solving"],
            ].map(([emoji, label]) => (
              <div key={label} className="flex items-center gap-2 text-xs text-gray-700 p-2 rounded-lg"
                style={{ background: "#f8faff" }}>
                <span>{emoji}</span> {label}
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium text-center">
            {error}
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Price Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black" style={{ color: ORANGE }}>₹{price}</span>
              <span className="text-sm text-gray-400 line-through">₹{MRP}</span>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                style={{ background: "#dcfce7", color: "#16a34a" }}>{disc}% OFF</span>
            </div>
            <p className="text-xs text-gray-400">
              Only <strong className="text-red-500">{seats} seats</strong> left · Class {grade} selected
            </p>
          </div>
          <button
            onClick={() => { setError(null); setModal(true); }}
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl font-extrabold text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
            style={{
              background: `linear-gradient(90deg,${ORANGE},#e85d12)`,
              boxShadow: "0 6px 20px rgba(255,107,26,0.45)",
            }}>
            {loading ? "Processing…" : "Enroll Now"}
            {!loading && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {showModal && (
        <BookingModal
          grade={grade}
          onConfirm={handleConfirm}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}
