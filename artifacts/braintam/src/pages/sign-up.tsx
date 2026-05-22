import { useState, useEffect } from "react";
import { SignUp } from "@clerk/react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export const SIGNUP_PROFILE_KEY = "braintam_signup_profile";
const SIGNUP_STEP_KEY = "braintam_signup_step";

export const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);

export const BOARDS = [
  "CBSE",
  "ICSE",
  "IGCSE",
  "IB (International Baccalaureate)",
  "NIOS",
  "State Board",
];

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu", "Delhi",
  "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function isOAuthCallback() {
  const p = window.location.pathname;
  return p.includes("sso-callback") || p.includes("factor-one") || p.includes("factor-two");
}

function ProfileStep({ onContinue }: { onContinue: () => void }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [state, setState] = useState("");
  const [board, setBoard] = useState("");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SIGNUP_PROFILE_KEY);
      if (stored) {
        const d = JSON.parse(stored);
        if (d.name) setName(d.name);
        if (d.grade) setGrade(d.grade);
        if (d.state) setState(d.state);
        if (d.board) setBoard(d.board);
      }
    } catch {}
  }, []);

  const canContinue = name.trim() && grade && state && board;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    sessionStorage.setItem(SIGNUP_PROFILE_KEY, JSON.stringify({ name, grade, state, board }));
    onContinue();
  };

  const fieldBorder = "border-[#E5E7EB] focus-visible:ring-[#FF6B1A] focus-visible:border-[#FF6B1A]";

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl shadow-xl w-[440px] max-w-full overflow-hidden"
    >
      <div className="p-8">
        <div className="mb-5">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: NAVY }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-6">
          <img src={braintamLogo} alt="Braintam" className="w-14 h-14 object-contain mx-auto mb-3" />
          <h2 className="font-black text-xl" style={{ color: NAVY }}>Join Braintam today</h2>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            India's #1 platform for Grades 1–10
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: NAVY }}>Full Name</Label>
            <Input
              placeholder="e.g. Arjun Sharma"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className={`h-11 ${fieldBorder}`}
              style={{ color: NAVY }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: NAVY }}>Grade</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className={`h-11 ${fieldBorder}`} style={{ color: grade ? NAVY : "#9CA3AF" }}>
                <SelectValue placeholder="Select your grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map(g => (
                  <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: NAVY }}>State / UT</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className={`h-11 ${fieldBorder}`} style={{ color: state ? NAVY : "#9CA3AF" }}>
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold" style={{ color: NAVY }}>Board</Label>
            <Select value={board} onValueChange={setBoard}>
              <SelectTrigger className={`h-11 ${fieldBorder}`} style={{ color: board ? NAVY : "#9CA3AF" }}>
                <SelectValue placeholder="Select your board" />
              </SelectTrigger>
              <SelectContent>
                {BOARDS.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={!canContinue}
            className="w-full h-12 font-bold text-base rounded-xl mt-2 transition-all"
            style={{
              background: canContinue ? `linear-gradient(135deg, ${ORANGE}, #e05500)` : "#E5E7EB",
              color: canContinue ? "white" : "#9CA3AF",
              boxShadow: canContinue ? "0 4px 24px rgba(255,107,26,0.3)" : "none",
            }}
          >
            Continue →
          </Button>
        </form>

        <p className="text-xs text-center mt-5" style={{ color: "#6B7280" }}>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: ORANGE }}>
            Sign in
          </Link>
        </p>
      </div>

      <div className="px-8 py-3 text-center text-[10px]" style={{ background: "#F9FAFB", color: "#9CA3AF" }}>
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline">Terms</Link> &{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>
      </div>
    </motion.div>
  );
}

function AuthStep({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.25 }}
      className="w-[440px] max-w-full"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 mb-3 text-sm font-medium hover:opacity-70 transition-opacity"
        style={{ color: NAVY }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/onboarding`}
      />
    </motion.div>
  );
}

export function SignUpPageContent() {
  const [step, setStep] = useState<1 | 2>(() => {
    if (isOAuthCallback()) return 2;
    return sessionStorage.getItem(SIGNUP_STEP_KEY) === "2" ? 2 : 1;
  });

  const goToStep2 = () => {
    sessionStorage.setItem(SIGNUP_STEP_KEY, "2");
    setStep(2);
  };

  const goToStep1 = () => {
    sessionStorage.removeItem(SIGNUP_STEP_KEY);
    setStep(1);
  };

  return (
    <AnimatePresence mode="wait">
      {step === 1
        ? <ProfileStep key="step1" onContinue={goToStep2} />
        : <AuthStep key="step2" onBack={goToStep1} />
      }
    </AnimatePresence>
  );
}
