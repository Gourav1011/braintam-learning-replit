import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Phone, GraduationCap,
  Star, Clock, Users, Shield,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";
const DEMO_PRICE = 49; // ₹49 = 4900 paise on the backend

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

// ── Helpers ───────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  return d.slice(1);
  return d;
}

function isValidPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizePhone(raw));
}

// Load the Razorpay checkout.js script once
function useRazorpay() {
  const [ready, setReady] = useState(!!window.Razorpay);
  useEffect(() => {
    if (window.Razorpay) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, []);
  return ready;
}

// ── Success screen ────────────────────────────────────────────
function SuccessScreen({ grade, phone }: { grade: number; phone: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#fff7f0 100%)" }}>
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "#e8f5e9" }}>
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: NAVY }}>You're enrolled!</h2>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Payment confirmed. Class details for <strong>Grade {grade}</strong> will be
          sent to <strong>+91&nbsp;{normalizePhone(phone)}</strong> via WhatsApp within
          24 hours.
        </p>
        <div className="rounded-xl p-4 text-left mb-6"
          style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p className="text-sm font-bold mb-2" style={{ color: ORANGE }}>What happens next?</p>
          <ul className="text-sm space-y-1" style={{ color: "#92400e" }}>
            <li>• Your mentor will WhatsApp the class schedule</li>
            <li>• Classes begin within 24–48 hours</li>
            <li>• 5-day live experience, ₹{DEMO_PRICE} total — no hidden charges</li>
          </ul>
        </div>
        <p className="text-xs text-gray-400">
          Questions? WhatsApp us at&nbsp;
          <a href="https://wa.me/919876543210"
            className="underline font-semibold" style={{ color: NAVY }}>
            +91 98765 43210
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function EnrollPage() {
  const [phone, setPhone]               = useState("");
  const [grade, setGrade]               = useState(6);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);
  const [accountNote, setAccountNote]   = useState<string | null>(null);
  const razorpayReady                   = useRazorpay();

  async function handleEnroll() {
    setError(null);
    setAccountNote(null);

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
        if (res.status === 409) {
          setError(data.message ?? "This number is already enrolled in an active demo batch. Please contact support.");
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Surface non-blocking notice for re-enrolling accounts
      if (data.existingAccount) {
        const { accountType, name } = data.existingAccount;
        setAccountNote(
          `Note: ${name ? name + " — " : ""}account type "${accountType}" already exists for this number. Payment will update your enrollment.`
        );
      }

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         data.keyId,
        amount:      data.amount,
        currency:    data.currency ?? "INR",
        order_id:    data.orderId,
        name:        "Braintam",
        description: `5-Day Live Demo — Grade ${grade}`,
        prefill:     { contact: `91${normalizePhone(phone)}` },
        theme:       { color: NAVY },
        handler() {
          // Razorpay calls this on successful payment capture
          // The webhook handles enrollment asynchronously
          setSuccess(true);
        },
        modal: {
          ondismiss() { setLoading(false); },
        },
      });
      rzp.open();
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }

  if (success) return <SuccessScreen grade={grade} phone={phone} />;

  return (
    <div className="min-h-screen"
      style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#fff7f0 100%)" }}>

      {/* ── Header ── */}
      <div className="py-4 px-6" style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: ORANGE }}>
            <span className="text-white font-black text-sm">B</span>
          </div>
          <span className="text-white font-bold text-lg">Braintam</span>
          <span className="text-blue-200 text-sm ml-2 hidden sm:block">
            India's Premium EdTech
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3"
            style={{ background: "#fff3e6", color: ORANGE }}>
            🎯 Limited-Time Demo Offer
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3" style={{ color: NAVY }}>
            5-Day Live Demo Class
          </h1>
          <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
            Try Braintam before committing. Your child attends 5 live classes
            with expert teachers — for just&nbsp;
            <span className="font-bold" style={{ color: ORANGE }}>₹{DEMO_PRICE}</span>.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Left — enrolment form ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-md p-6"
          >
            {/* Price badge */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-extrabold text-lg" style={{ color: NAVY }}>
                Register Now
              </h2>
              <div className="text-right">
                <span className="text-2xl font-black" style={{ color: ORANGE }}>
                  ₹{DEMO_PRICE}
                </span>
                <span className="text-xs text-gray-400 block">one-time · 5 days</span>
              </div>
            </div>

            {/* Grade selector */}
            <div className="mb-5">
              <label className="flex items-center gap-1 text-xs font-bold mb-2
                text-gray-500 uppercase tracking-wide">
                <GraduationCap className="w-3.5 h-3.5" />
                Child's Grade (1–10)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(g => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className="w-9 h-9 rounded-lg text-sm font-bold transition-all border"
                    style={{
                      background:   grade === g ? NAVY : "#f8faff",
                      color:        grade === g ? "#fff" : NAVY,
                      borderColor:  grade === g ? NAVY : "#e2e8f0",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="flex items-center gap-1 text-xs font-bold mb-2
                text-gray-500 uppercase tracking-wide">
                <Phone className="w-3.5 h-3.5" />
                Parent's WhatsApp Number
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden
                focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm
                  border-r border-gray-200 font-medium select-none">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setError(null);
                    setAccountNote(null);
                  }}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Class schedule will be sent to this number via WhatsApp
              </p>
            </div>

            {/* Non-blocking account notice */}
            <AnimatePresence>
              {accountNote && !error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-3 rounded-xl bg-blue-50 text-blue-700 text-xs leading-relaxed"
                >
                  {accountNote}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <button
              onClick={handleEnroll}
              disabled={loading || phone.length < 10}
              className="w-full py-3.5 rounded-xl font-extrabold text-white text-base
                transition-all active:scale-95"
              style={{
                background: loading || phone.length < 10
                  ? "#94a3b8"
                  : `linear-gradient(90deg,${NAVY},#1a4fa0)`,
                cursor: loading || phone.length < 10 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Opening payment…" : `Pay ₹${DEMO_PRICE} & Enroll`}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3 flex items-center
              justify-center gap-1">
              <Shield className="w-3 h-3" />
              Secured by Razorpay · 256-bit encryption
            </p>
          </motion.div>

          {/* ── Right — benefits & trust ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* What's included */}
            <div className="bg-white rounded-2xl shadow-md p-5">
              <h3 className="font-extrabold text-sm uppercase tracking-wide mb-3"
                style={{ color: NAVY }}>
                What's included — Grade {grade}
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-600">
                {[
                  "5 live online classes with expert teachers",
                  "Doubt-clearing sessions after every class",
                  "Practice worksheets & speed-tricks for Grade " + grade,
                  "WhatsApp group with dedicated mentor",
                  "Progress report at the end of the demo week",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { Icon: Users, value: "10,000+", label: "Students" },
                { Icon: Star,  value: "4.8 ★",   label: "Rating"   },
                { Icon: Clock, value: "Live",     label: "Classes"  },
              ].map(({ Icon, value, label }) => (
                <div key={label}
                  className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: ORANGE }} />
                  <p className="font-extrabold text-sm" style={{ color: NAVY }}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Guarantee */}
            <div className="rounded-xl p-4 text-sm"
              style={{ background: "linear-gradient(135deg,#fff7ed,#fff)", border: "1px solid #fed7aa" }}>
              <p className="font-bold mb-1" style={{ color: ORANGE }}>
                100% Satisfaction Guarantee
              </p>
              <p className="text-gray-500 text-xs leading-relaxed">
                If your child doesn't enjoy the first class, we'll refund ₹{DEMO_PRICE}{" "}
                in full — no questions asked.
              </p>
            </div>

            {/* FAQ teaser */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Common questions
              </p>
              {[
                ["When do classes start?", "Within 24–48 hours of enrollment."],
                ["What device is needed?", "Any smartphone or tablet with internet."],
                ["Is it live or recorded?",  "100% live — interact with the teacher in real time."],
              ].map(([q, a]) => (
                <div key={q} className="mb-2 last:mb-0">
                  <p className="text-xs font-semibold" style={{ color: NAVY }}>{q}</p>
                  <p className="text-xs text-gray-400">{a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
