import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/api-base";
import { STUDENT_TOKEN_KEY } from "@/components/auth-provider";
import { CheckCircle2, Shield, Star, ChevronRight, X } from "lucide-react";

import braintamLogoImg from "@assets/logo_transparent-Photoroom_1782323218278.png";

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

// ── Countdown ───────────────────────────────────────────────
function useCountdown(initialSeconds = 870) {
  const [secs, setSecs] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return { h: "00", m, s, str: `${m}:${s}` };
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
function BookingModal({ grade, onConfirm, onClose, timer: modalTimer }: {
  grade: number;
  onConfirm: (phone: string) => void;
  onClose: () => void;
  timer: ReturnType<typeof useCountdown>;
}) {
  const [phase, setPhase]   = useState<"phone" | "booking" | "confirm">("phone");
  const [phone, setPhone]   = useState("");
  const [progress, setProgress] = useState(0);
  const [waiting]           = useState(() => Math.floor(Math.random() * 6) + 3);
  const price               = getPrice(grade);
  const disc                = getDisc(grade);
  const inputRef            = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === "phone") inputRef.current?.focus();
  }, [phase]);

  // Capture the lead as soon as a valid phone number has remained entered
  // for 800ms. Payment/Razorpay is not required for this capture.
  useEffect(() => {
    if (phase !== "phone" || !isValidPhone(phone)) return;

    const id = window.setTimeout(() => {
      void fetch(`${API_BASE}/api/payments/capture-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizePhone(phone),
          grade,
          utm_source: new URLSearchParams(window.location.search).get("utm_source") || undefined,
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
          utm_adset: new URLSearchParams(window.location.search).get("utm_adset") || undefined,
          utm_ad: new URLSearchParams(window.location.search).get("utm_ad") || undefined,
        }),
      }).catch(() => {
        // Lead capture must never block the enrolment/payment experience.
      });
    }, 800);

    return () => window.clearTimeout(id);
  }, [phone, grade, phase]);

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
                  <p className="text-lg font-black tabular-nums" style={{ color: "red" }}>{modalTimer.str}</p>
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
                Limited Discount Ends In: {modalTimer.str}
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

const WA_SUPPORT = "918492944473";

// ── Success Screen ───────────────────────────────────────────
function SuccessScreen({
  grade,
  phone,
  needsPasswordSetup,
  setupToken,
}: {
  grade: number;
  phone: string;
  needsPasswordSetup: boolean;
  setupToken: string;
}) {
  const cleanPhone = normalizePhone(phone);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [creatingPassword, setCreatingPassword] = useState(false);

  async function handleCreatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (!setupToken || !needsPasswordSetup) {
      setPasswordError("Password setup is unavailable. Please contact support.");
      return;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setCreatingPassword(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupToken,
          password,
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        token?: string;
        error?: string;
      };

      if (!res.ok || !data.success || !data.token) {
        setPasswordError(data.error ?? "Unable to create password. Please try again.");
        return;
      }

      localStorage.setItem(STUDENT_TOKEN_KEY, data.token);
      window.dispatchEvent(new CustomEvent("braintam:auth_change"));
      window.location.href = "/dashboard";
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setCreatingPassword(false);
    }
  }

  const waMsg = encodeURIComponent(
    `Hi, I have successfully enrolled in the Braintam Ignite Program and completed my payment.\n\nPhone: ${cleanPhone}\nClass: Class ${grade}\n\nPlease guide me with the class schedule and next steps.`
  );
  const waUrl = `https://wa.me/${WA_SUPPORT}?text=${waMsg}`;

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
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: NAVY }}>🎉 Congratulations!</h1>
        <p className="text-base font-bold mb-4" style={{ color: ORANGE }}>Your seat for the 6-Day Ignite Program has been reserved.</p>
        <div className="rounded-xl p-4 mb-5 text-left space-y-2"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <p className="text-sm font-bold flex items-center gap-2 text-green-700">✔ Enrollment Successful</p>
          <p className="text-sm font-bold flex items-center gap-2 text-green-700">✔ Payment Received: ₹{getPrice(grade)}</p>
          <p className="text-sm font-bold flex items-center gap-2 text-green-700">✔ Class: Class {grade}</p>
          <p className="text-sm font-bold flex items-center gap-2 text-green-700">✔ Demo Classes Starting Soon</p>
        </div>
        {needsPasswordSetup && setupToken ? (
          <form
            onSubmit={handleCreatePassword}
            className="mb-6 rounded-xl border border-gray-200 p-4 text-left"
          >
            <h2 className="font-extrabold text-base mb-1" style={{ color: NAVY }}>
              Create your student login
            </h2>

            <p className="text-xs text-gray-500 mb-4">
              Your login ID is <strong>{cleanPhone}</strong>. Create a password to access your classes and dashboard.
            </p>

            <label className="block text-xs font-bold mb-1" style={{ color: NAVY }}>
              Create password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
              placeholder="Minimum 6 characters"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2"
            />

            <label className="block text-xs font-bold mb-1" style={{ color: NAVY }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
              placeholder="Enter password again"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            />

            {passwordError && (
              <p className="text-red-600 text-xs mt-2">{passwordError}</p>
            )}

            <button
              type="submit"
              disabled={creatingPassword}
              className="w-full mt-4 py-3 rounded-xl font-extrabold text-white disabled:opacity-60"
              style={{ background: ORANGE }}
            >
              {creatingPassword ? "Creating Account..." : "Create Password & Start Learning"}
            </button>
          </form>
        ) : (
          <div
            className="rounded-xl p-4 mb-5 text-sm"
            style={{ background: "#fff7ed", color: NAVY }}
          >
            <strong>Student Login ID: {cleanPhone}</strong>
            <p className="text-xs mt-1 text-gray-500">
              Your enrollment is confirmed. If you already created a password, use your phone number to sign in.
            </p>
          </div>
        )}

        <p className="text-gray-500 mb-5 text-sm">
          Tap below to receive your class details and next steps.
        </p>
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full py-4 rounded-xl font-extrabold text-white text-base flex items-center justify-center gap-2 active:scale-95"
          style={{ background: "#25D366", boxShadow: "0 8px 20px rgba(37,211,102,0.4)" }}>
          <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.524 3.659 1.438 5.168L2 22l4.978-1.304A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" opacity=".3"/>
          </svg>
          Get Class Details
        </a>
        <p className="text-xs text-gray-400 mt-4">
          You'll receive your class schedule on WhatsApp within 24 hours.
        </p>
      </motion.div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function EnrollPage() {
  const [grade, setGrade]     = useState<number | null>(null);
  const [showModal, setModal] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const razorpayReady         = useRazorpay();
  const timer                 = useCountdown();
  const [seats]               = useState(() => Math.floor(Math.random() * 5) + 8);
  const enrolleeText          = useRollingText(ENROLLEES);

  // UTM params from URL (Meta Ads tracking)
  const [utms, setUtms] = useState({
    utm_source: "", utm_campaign: "", utm_adset: "", utm_ad: "",
  });

  // Read UTMs from URL on mount (grade always chosen via UI)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUtms({
      utm_source:   params.get("utm_source")   ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
      utm_adset:    params.get("utm_adset")    ?? "",
      utm_ad:       params.get("utm_ad")       ?? "",
    });
  }, []);

  const price = grade !== null ? getPrice(grade) : 39;
  const disc  = grade !== null ? getDisc(grade)  : getDisc(39);

  const handleConfirm = useCallback(async (phone: string) => {
    if (grade === null) return;
    setError(null);
    if (!razorpayReady) {
      setError("Payment is loading — please try again in a moment.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-demo-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizePhone(phone), grade,
          utm_source: utms.utm_source || undefined,
          utm_campaign: utms.utm_campaign || undefined,
          utm_adset: utms.utm_adset || undefined,
          utm_ad: utms.utm_ad || undefined,
        }),
      });
      const data = await res.json() as {
        orderId?: string; amount?: number; currency?: string; keyId?: string;
        error?: string; message?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            const vRes = await fetch(`${API_BASE}/api/payments/verify-demo-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                phone: normalizePhone(phone), grade,
                utm_source: utms.utm_source || undefined,
                utm_campaign: utms.utm_campaign || undefined,
                utm_adset: utms.utm_adset || undefined,
                utm_ad: utms.utm_ad || undefined,
              }),
            });
            const vData = await vRes.json() as {
              success?: boolean;
              error?: string;
              needsPasswordSetup?: boolean;
              setupToken?: string;
            };
            if (vData.success) {
              setConfirmedPhone(phone);
              setNeedsPasswordSetup(vData.needsPasswordSetup === true);
              setSetupToken(vData.setupToken ?? "");
              setSuccess(true);
            } else {
              setError(vData.error ?? "Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch {
            // Razorpay may have captured the payment, but without a successful
            // backend verification response we must not allow password setup.
            setConfirmedPhone(phone);
            setNeedsPasswordSetup(false);
            setSetupToken("");
            setSuccess(true);
          }
        },
        modal: { ondismiss() { setLoading(false); } },
      });
      rzp.open();
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }, [grade, razorpayReady, utms]);

  if (success) return (
    <SuccessScreen
      grade={grade ?? 0}
      phone={confirmedPhone}
      needsPasswordSetup={needsPasswordSetup}
      setupToken={setupToken}
    />
  );

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f5f7ff" }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center">
            <img src={braintamLogoImg} alt="Braintam" className="h-14 w-auto" />
          </div>
          <button onClick={() => grade !== null && setModal(true)}
            disabled={grade === null}
            className="text-xs font-extrabold px-4 py-2 rounded-full text-white transition-opacity"
            style={{ background: `linear-gradient(90deg,${ORANGE},#e85d12)`, opacity: grade === null ? 0.45 : 1 }}>
            Enroll Now
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-4 pb-32 space-y-4">

        {/* ── Hero Banner ── */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{ background: `linear-gradient(135deg,${NAVY} 0%,#0a3d8c 100%)` }}>

          {/* dot grid */}
          <div className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

          {/* Background elements — rocket + stars + math */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">

            {/* ── Proper coloured rocket — top-right, above girl, tilted 20° ── */}
            <svg className="absolute" style={{ top: "3%", right: "3%", width: 64, opacity: 0.95, transform: "rotate(20deg)", filter: "drop-shadow(0 4px 12px rgba(255,107,26,0.6))" }}
              viewBox="0 0 80 130" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Nose cone */}
              <path d="M40 4 C28 20 22 36 22 52 L58 52 C58 36 52 20 40 4Z" fill="#ef4444"/>
              <path d="M40 4 C34 20 32 36 32 52 L40 52 L40 4Z" fill="#dc2626"/>
              {/* Body */}
              <rect x="22" y="52" width="36" height="38" rx="3" fill="#f8fafc"/>
              <rect x="22" y="52" width="18" height="38" rx="3" fill="#f1f5f9"/>
              {/* Window */}
              <circle cx="40" cy="68" r="9" fill="#93c5fd"/>
              <circle cx="40" cy="68" r="6" fill="#3b82f6"/>
              <circle cx="37" cy="65" r="2" fill="rgba(255,255,255,0.5)"/>
              {/* Red band */}
              <rect x="22" y="82" width="36" height="5" fill="#ef4444"/>
              {/* Left fin */}
              <path d="M22 70 L6 95 L22 90 Z" fill="#ef4444"/>
              <path d="M22 70 L14 90 L22 90 Z" fill="#dc2626"/>
              {/* Right fin */}
              <path d="M58 70 L74 95 L58 90 Z" fill="#ef4444"/>
              <path d="M58 70 L66 90 L58 90 Z" fill="#dc2626"/>
              {/* Nozzle */}
              <rect x="32" y="90" width="16" height="6" rx="2" fill="#cbd5e1"/>
              {/* Flame outer */}
              <ellipse cx="40" cy="106" rx="10" ry="14" fill="#f97316" opacity="0.95"/>
              {/* Flame mid */}
              <ellipse cx="40" cy="108" rx="6" ry="11" fill="#fbbf24" opacity="0.9"/>
              {/* Flame inner */}
              <ellipse cx="40" cy="112" rx="3" ry="7" fill="#fef3c7" opacity="0.85"/>
            </svg>

            {/* Stars around the rocket */}
            {[
              { t: "✦", top: "2%",  right: "22%", sz: 10, op: 0.8 },
              { t: "✦", top: "10%", right: "10%", sz: 7,  op: 0.6 },
              { t: "★", top: "18%", right: "18%", sz: 8,  op: 0.5 },
              { t: "✦", top: "6%",  right: "30%", sz: 6,  op: 0.5 },
            ].map(({ t, top, right, sz, op }, i) => (
              <span key={i} className="absolute font-bold text-yellow-300"
                style={{ top, right, fontSize: sz, opacity: op }}>{t}</span>
            ))}

            {/* Math symbols on the left side only */}
            {[
              { t: "π",  top: "12%", left: "28%", sz: 16, op: 0.16 },
              { t: "∑",  top: "55%", left: "8%",  sz: 14, op: 0.14 },
              { t: "√",  top: "38%", left: "40%", sz: 13, op: 0.13 },
              { t: "²",  top: "30%", left: "18%", sz: 12, op: 0.15 },
              { t: "+",  top: "68%", left: "33%", sz: 18, op: 0.12 },
              { t: "△",  top: "45%", left: "14%", sz: 12, op: 0.13 },
            ].map(({ t, top, left, sz, op }, i) => (
              <span key={i} className="absolute font-bold text-white"
                style={{ top, left, fontSize: sz, opacity: op }}>{t}</span>
            ))}
          </div>

          <div className="relative z-10 flex items-end">
            <div className="flex-1 p-4 pb-3">
              {/* Live pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
                style={{ background: "rgba(255,107,26,0.25)", border: "1px solid rgba(255,107,26,0.6)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-bold text-orange-300">IGNITE COURSE · LIMITED SEATS</span>
              </div>

              <h1 className="text-xl font-extrabold text-white leading-snug mb-1">
                Unlock Your Child's<br />
                <span style={{ color: ORANGE }}>Full Potential</span>
              </h1>
              <p className="text-xs text-blue-200 mb-2 leading-relaxed">
                A 5-Day Live Program to Build Concepts,<br/>Confidence &amp; Champions! ✨
              </p>

              <ul className="space-y-1 mb-2">
                {[
                  "Maths, Science & Olympiads",
                  "30+ Core Concepts",
                  "40+ Solving Skills",
                  "IIT/NIT Expert Teachers",
                ].map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-blue-100">
                    <span className="text-orange-400 text-xs">▶</span> {f}
                  </li>
                ))}
              </ul>

              {/* Live enrollment ticker — fixed height so timer never shifts */}
              <div style={{ height: 28, overflow: "hidden" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={enrolleeText}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(255,255,255,0.12)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-green-300 truncate">{enrolleeText}</span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Countdown inside hero — pinned below ticker, never moves */}
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(220,38,38,0.25)", border: "1px solid rgba(220,38,38,0.5)" }}>
                <span className="text-sm animate-pulse">🔥</span>
                <span className="text-xs font-semibold text-red-300">Offer ends in</span>
                <span className="text-xl font-black tabular-nums text-white tracking-widest">
                  {timer.m}<span className="text-red-400 animate-pulse">:</span>{timer.s}
                </span>
                <span className="text-[9px] text-red-300 font-bold uppercase">mins</span>
              </div>
            </div>

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
              const isFull     = g === 9 || g === 10;
              return (
                <button key={g}
                  onClick={() => !isFull && setGrade(g)}
                  disabled={isFull}
                  className="py-2.5 rounded-xl text-xs font-bold transition-all border-2 relative flex flex-col items-center justify-center gap-0.5"
                  style={{
                    background:   isFull     ? "#f1f5f9" : isSelected ? ORANGE : "#f8faff",
                    color:        isFull     ? "#94a3b8" : isSelected ? "#fff"  : NAVY,
                    borderColor:  isFull     ? "#e2e8f0" : isSelected ? ORANGE  : "#e2e8f0",
                    boxShadow:    isSelected && !isFull ? "0 4px 14px rgba(255,107,26,0.4)" : "none",
                    transform:    isSelected && !isFull ? "scale(1.06)" : "scale(1)",
                    cursor:       isFull ? "not-allowed" : "pointer",
                  }}>
                  <span className="flex items-center gap-1">
                    {isSelected && !isFull && <span className="text-[10px]">✓</span>}
                    <span>Class {g}</span>
                  </span>
                  {isFull && (
                    <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm"
                      style={{ background: "#fee2e2", color: "#dc2626", letterSpacing: "0.03em" }}>
                      SEATS FULL
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-center text-gray-500 mt-3 flex items-center justify-center gap-1.5">
            <span className="text-green-500">✅</span> Classes 1–8 open · Batch starts soon
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
        <div className="max-w-2xl mx-auto px-4 pt-2.5 pb-1.5">
          <div className="flex items-center gap-3 mb-1.5">
            <div>
              {grade !== null ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black" style={{ color: ORANGE }}>₹{price}</span>
                    <span className="text-sm text-gray-400 line-through">₹{MRP}</span>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                      style={{ background: "#dcfce7", color: "#16a34a" }}>{disc}% OFF</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Only <strong className="text-red-500">{seats} seats</strong> left · Class {grade} selected
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-extrabold" style={{ color: NAVY }}>Select a class above</p>
                  <p className="text-xs text-gray-400">Choose your child's class to enroll</p>
                </>
              )}
            </div>
            <button
              onClick={() => { if (grade === null) return; setError(null); setModal(true); }}
              disabled={loading || grade === null}
              className="flex-1 py-3.5 rounded-xl font-extrabold text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-all"
              style={{
                background: grade !== null ? `linear-gradient(90deg,${ORANGE},#e85d12)` : "#94a3b8",
                boxShadow: grade !== null ? "0 6px 20px rgba(255,107,26,0.45)" : "none",
                cursor: grade === null ? "not-allowed" : "pointer",
              }}>
              {loading ? "Processing…" : "Enroll Now"}
              {!loading && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 pb-1">
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <Shield className="w-3 h-3 text-blue-500" /> Safe &amp; Secure Payments
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              ⚡ Instant Confirmation
            </span>
          </div>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {showModal && grade !== null && (
        <BookingModal
          grade={grade}
          onConfirm={handleConfirm}
          onClose={() => setModal(false)}
          timer={timer}
        />
      )}
    </div>
  );
}
