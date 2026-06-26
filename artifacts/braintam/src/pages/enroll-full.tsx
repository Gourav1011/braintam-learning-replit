import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api-base";
import { CheckCircle2, Shield, Star, ArrowLeft, Phone, User, BookOpen } from "lucide-react";
import braintamLogoImg from "@assets/logo_transparent-Photoroom_1782323218278.png";

const NAVY   = "#0B2B6B";
const ORANGE = "#FF6B1A";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { Razorpay: any; }
}

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

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  return d.slice(1);
  return d;
}
const isValidPhone = (r: string) => /^[6-9]\d{9}$/.test(normalizePhone(r));

const GRADE_PRICES: Record<number, { price: string; amountPaise: number }> = {
  1: { price: "₹29,998", amountPaise: 2999800 },
  2: { price: "₹31,998", amountPaise: 3199800 },
  3: { price: "₹33,998", amountPaise: 3399800 },
  4: { price: "₹35,998", amountPaise: 3599800 },
  5: { price: "₹37,998", amountPaise: 3799800 },
  6: { price: "₹41,998", amountPaise: 4199800 },
  7: { price: "₹43,998", amountPaise: 4399800 },
  8: { price: "₹49,998", amountPaise: 4999800 },
};

const PROGRAMS: Record<string, {
  name: string; icon: string; grades: string; price: string; amountPaise: number;
  color: string; tag: string; features: string[];
}> = {
  foundation: {
    name: "Foundation Program",
    icon: "🌱", grades: "Grades 1–3", price: "₹29,998",
    amountPaise: 2999800, color: "#22c55e", tag: "Early Edge",
    features: ["Concept-first teaching","Reading + phonics","Mental maths drills","Weekly worksheets","Doubt rooms"],
  },
  mastery: {
    name: "Mastery Program",
    icon: "🚀", grades: "Grades 4–6", price: "₹35,998",
    amountPaise: 3599800, color: ORANGE, tag: "Boards + Olympiads",
    features: ["Complete syllabus","Advanced problems","Weekly tests","Doubt solving","Mock exams"],
  },
  elite: {
    name: "Elite Program",
    icon: "🏆", grades: "Grades 7–8", price: "₹43,998",
    amountPaise: 4399800, color: "#a78bfa", tag: "JEE · NEET",
    features: ["Boards + JEE/NEET plan","Mock tests","Daily targets","Doubt rooms","Personal mentor"],
  },
};

const GRADE_RANGES: Record<string, number[]> = {
  foundation: [1,2,3],
  mastery:    [4,5,6],
  elite:      [7,8],
};

const GRADE_TO_PROGRAM: Record<number, string> = {
  1: "foundation", 2: "foundation", 3: "foundation",
  4: "mastery",    5: "mastery",    6: "mastery",
  7: "elite",      8: "elite",
};

function SuccessScreen({ program, grade, phone }: { program: string; grade: number; phone: string }) {
  const p = PROGRAMS[program] ?? PROGRAMS.mastery;
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#f5f7ff" }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(34,197,94,0.12)" }}>
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-4xl mb-2">{p.icon}</div>
        <h2 className="text-2xl font-black mb-1" style={{ color: NAVY }}>You're enrolled!</h2>
        <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
          Welcome to the <strong>{p.name}</strong> — Grade {grade}.<br />
          Our team will reach you on <strong>{phone}</strong> within 24 hours to complete setup.
        </p>
        <div className="rounded-xl p-4 text-left space-y-2 mb-6"
          style={{ background: "rgba(11,43,107,0.04)", border: "1px solid rgba(11,43,107,0.1)" }}>
          {["Classes begin within 24–48 hours","Welcome kit sent to your WhatsApp","100% refund within 7 days if not satisfied"].map(t => (
            <div key={t} className="flex items-center gap-2 text-xs font-medium" style={{ color: NAVY }}>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{t}
            </div>
          ))}
        </div>
        <a href="/" className="block w-full py-3 rounded-xl font-bold text-white text-sm text-center"
          style={{ background: `linear-gradient(135deg,${NAVY},#1a3a7a)` }}>
          Back to Home
        </a>
      </motion.div>
    </div>
  );
}

export default function EnrollFullPage() {
  const params = new URLSearchParams(window.location.search);

  // Support ?grade=X (mentor flow) OR ?program=xxx (landing flow)
  const gradeParam = parseInt(params.get("grade") ?? "0", 10);
  const derivedProgramFromGrade = gradeParam >= 1 && gradeParam <= 9 ? GRADE_TO_PROGRAM[gradeParam] : null;
  const initialProgramKey = derivedProgramFromGrade ?? params.get("program") ?? "mastery";

  const [programKey, setProgramKey] = useState(initialProgramKey);
  const program = PROGRAMS[programKey] ?? PROGRAMS.mastery;
  const validGrades = GRADE_RANGES[programKey] ?? [4,5,6];

  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState(gradeParam >= 1 && gradeParam <= 8 ? gradeParam : validGrades[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmedPhone, setConfirmedPhone] = useState("");
  const razorpayReady = useRazorpay();

  // Sync grade when programKey changes
  useEffect(() => {
    const vg = GRADE_RANGES[programKey] ?? [4,5,6];
    if (!vg.includes(grade)) setGrade(vg[0]);
  }, [programKey]);  // eslint-disable-line react-hooks/exhaustive-deps

  // When grade dropdown changes — auto-switch program
  const handleGradeDropdown = (g: number) => {
    const newProg = GRADE_TO_PROGRAM[g];
    if (newProg) { setProgramKey(newProg); setGrade(g); }
  };

  // Grade-specific price (overrides program default)
  const gradePrice = GRADE_PRICES[grade] ?? { price: program.price, amountPaise: program.amountPaise };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Please enter your child's name."); return; }
    if (!isValidPhone(phone)) { setError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!razorpayReady) { setError("Payment is loading — please try again in a moment."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/create-full-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), grade, program: programKey, name: name.trim() }),
      });
      const data = await res.json() as {
        orderId?: string; amount?: number; currency?: string; keyId?: string;
        programName?: string; error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency ?? "INR",
        order_id: data.orderId,
        name: "Braintam",
        description: `${data.programName ?? program.name} — Grade ${grade}`,
        prefill: { contact: `91${normalizePhone(phone)}`, name: name.trim() },
        theme: { color: ORANGE },
        handler() { setConfirmedPhone(normalizePhone(phone)); setSuccess(true); },
        modal: { ondismiss() { setLoading(false); } },
      });
      rzp.open();
    } catch {
      setError("Network error — please check your connection and try again.");
      setLoading(false);
    }
  }, [name, phone, grade, programKey, razorpayReady, program.name]);

  if (success) return <SuccessScreen program={programKey} grade={grade} phone={confirmedPhone} />;

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f5f7ff" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-2.5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: NAVY }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </a>
          <img src={braintamLogoImg} alt="Braintam" className="h-10 w-auto" />
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 pb-20">
        <div className="grid md:grid-cols-2 gap-6 items-start">

          {/* Left — program info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Program card */}
            <div className="rounded-2xl p-6 mb-4"
              style={{ background: `linear-gradient(135deg,${NAVY} 0%,#0a3d8c 100%)` }}>
              <div className="text-4xl mb-3">{program.icon}</div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-2"
                style={{ background: "rgba(255,107,26,0.2)", color: "#FFA870" }}>{program.tag}</div>
              <h1 className="text-2xl font-black text-white mb-1">{program.name}</h1>
              <p className="text-white/60 text-sm mb-3">{program.grades} · Full Year Program</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-black" style={{ color: ORANGE }}>{gradePrice.price}</span>
                <span className="text-white/50 text-sm">/ year · Grade {grade}</span>
              </div>
              <div className="space-y-2">
                {program.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: ORANGE }} />{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Star className="w-4 h-4" />, val: "4.9★", label: "Parent Rating" },
                { icon: <Shield className="w-4 h-4" />, val: "100%", label: "Refund Policy" },
                { icon: <BookOpen className="w-4 h-4" />, val: "CBSE", label: "Curriculum" },
              ].map(b => (
                <div key={b.label} className="rounded-xl p-3 text-center bg-white border border-gray-100">
                  <div className="flex justify-center mb-1" style={{ color: ORANGE }}>{b.icon}</div>
                  <div className="font-black text-sm" style={{ color: NAVY }}>{b.val}</div>
                  <div className="text-xs text-gray-400">{b.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — enrollment form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-black mb-1" style={{ color: NAVY }}>Secure your spot</h2>
              <p className="text-sm text-gray-500 mb-5">Fill in the details below to complete enrollment</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                    Student Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter student's full name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                      style={{ borderColor: "#E5E7EB", color: NAVY }}
                      onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
                      onBlur={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                    Parent / Student Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={13}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                      style={{ borderColor: "#E5E7EB", color: NAVY }}
                      onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
                      onBlur={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    />
                  </div>
                </div>

                {/* Grade — dropdown selector */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: NAVY }}>
                    Select Grade
                  </label>
                  <select
                    value={grade}
                    onChange={e => handleGradeDropdown(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border text-sm font-semibold outline-none transition-all appearance-none"
                    style={{ borderColor: "#E5E7EB", color: NAVY, background: "#fff" }}
                    onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
                    onBlur={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  >
                    {[1,2,3,4,5,6,7,8].map(g => (
                      <option key={g} value={g}>Grade {g} — {GRADE_PRICES[g].price}</option>
                    ))}
                    <option value={9} disabled>Grade 9 — Batch Full</option>
                    <option value={10} disabled>Grade 10 — Batch Full</option>
                  </select>
                  <p className="text-[11px] mt-1" style={{ color: "#9CA3AF" }}>
                    Program auto-selected: <span className="font-semibold" style={{ color: NAVY }}>{program.name}</span>
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3 font-medium">{error}</div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-xl font-black text-white text-base transition-all"
                  style={{ background: loading ? "#9CA3AF" : `linear-gradient(135deg,${ORANGE},#c94e00)`,
                           boxShadow: loading ? "none" : "0 4px 20px rgba(255,107,26,0.35)" }}>
                  {loading ? "Opening Payment…" : `Pay ${gradePrice.price} Securely`}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <Shield className="w-3 h-3" /> Secured by Razorpay · 256-bit SSL
                </div>
              </form>
            </div>

            {/* EMI note */}
            <div className="mt-3 rounded-xl p-4 text-xs text-center"
              style={{ background: "rgba(11,43,107,0.04)", color: "#6B7280" }}>
              💳 EMI available on cards above ₹5,000 · UPI / Net Banking / Cards accepted
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
