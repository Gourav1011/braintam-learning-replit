import { useState } from "react";
import { useSignUp } from "@clerk/react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { STUDENT_TOKEN_KEY } from "@/components/auth-provider";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);

export const BOARDS = [
  "CBSE", "ICSE", "IGCSE", "IB (International Baccalaureate)", "NIOS", "State Board",
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

// ── Password input with show/hide toggle ──────────────────────
function PasswordInput({
  id, label, value, onChange, placeholder, error,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string; error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-semibold text-sm" style={{ color: NAVY }}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "Enter password"}
          className="h-11 pr-10 border-gray-200"
          style={{ color: NAVY }}
          autoComplete={id === "password" ? "new-password" : "off"}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Branding left panel ────────────────────────────────────────
function LeftPanel({ step }: { step: number }) {
  const steps = [
    { label: "Account Details", desc: "Name, email & password" },
    { label: "Verify Email", desc: "Confirm with OTP" },
    { label: "Your Profile", desc: "Grade, board & location" },
  ];

  return (
    <div
      className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 60%, #0d2260 100%)` }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "#3b5fc0" }} />

      <div className="relative z-10">
        <img src={braintamLogo} alt="Braintam" className="w-44 h-auto object-contain" />
      </div>

      <div className="space-y-8 relative z-10">
        <div>
          <h1 className="text-white font-black text-4xl leading-tight mb-3">
            Start your journey<br />
            <span style={{ color: ORANGE }}>with Braintam!</span>
          </h1>
          <p className="text-white/70 text-sm">Takes less than 2 minutes to get started.</p>
        </div>

        {/* Step indicators */}
        <div className="space-y-3">
          {steps.map((s, i) => {
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <div key={s.label} className={`flex items-center gap-3 rounded-xl p-3 transition-all ${active ? "border" : ""}`}
                style={{
                  background: active ? "rgba(255,107,26,0.15)" : done ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(255,107,26,0.4)" : "1px solid transparent",
                }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all`}
                  style={{
                    background: done ? "#22C55E" : active ? ORANGE : "rgba(255,255,255,0.15)",
                    color: "white",
                  }}>
                  {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <div>
                  <div className={`font-semibold text-sm ${active ? "text-white" : "text-white/60"}`}>{s.label}</div>
                  <div className="text-white/40 text-xs">{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-3 rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-white font-semibold text-sm">Leaderboard & daily rewards</div>
            <div className="text-white/50 text-xs mt-0.5">Earn coins every day, compete across India</div>
          </div>
        </div>
      </div>

      <div className="text-white/30 text-xs relative z-10">© 2025 Braintam Learning. All Rights Reserved.</div>
    </div>
  );
}

// ── Step 1: Account details ────────────────────────────────────
function Step1({
  onNext,
}: {
  onNext: (firstName: string, lastName: string, email: string, phone: string) => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signUp, isLoaded } = useSignUp() as any;
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim() || !email.includes("@")) e.email = "Enter a valid email";
    const digits = phone.replace(/\D/g, "");
    if (!digits || digits.length !== 10) e.phone = "Enter a valid 10-digit mobile number";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (!isLoaded) { setErrors({ general: "Authentication is still loading — please wait a moment and try again." }); return; }
    if (!signUp) { setErrors({ general: "Sign-up is not available right now. Please refresh the page." }); return; }
    setBusy(true);
    setErrors({});
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      onNext(firstName.trim(), lastName.trim(), email.trim().toLowerCase(), phone.replace(/\D/g, ""));
    } catch (err: any) {
      const clerkErr = err?.errors?.[0];
      let msg = clerkErr?.longMessage ?? clerkErr?.message ?? "Something went wrong. Please try again.";
      if (clerkErr?.code === "form_identifier_exists" || msg.toLowerCase().includes("already")) {
        msg = "This email is already registered. Please sign in instead.";
      } else if (clerkErr?.code === "form_password_pwned" || msg.toLowerCase().includes("password")) {
        msg = "Please choose a stronger password (min 8 characters, avoid common passwords).";
      }
      setErrors({ general: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="font-black text-2xl" style={{ color: NAVY }}>Create your account</h2>
        <p className="text-gray-500 text-sm mt-1">Step 1 of 3 — your login details</p>
      </div>

      {/* General error — shown at TOP so it's always visible */}
      {errors.general && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm text-red-700 font-medium flex items-start gap-2">
          <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
          <span>{errors.general}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName" className="font-semibold text-sm" style={{ color: NAVY }}>First Name *</Label>
          <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)}
            placeholder="Arjun" className="h-11 border-gray-200" style={{ color: NAVY }} />
          {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName" className="font-semibold text-sm" style={{ color: NAVY }}>Last Name *</Label>
          <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)}
            placeholder="Sharma" className="h-11 border-gray-200" style={{ color: NAVY }} />
          {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="font-semibold text-sm" style={{ color: NAVY }}>Email Address *</Label>
        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="arjun@gmail.com" className="h-11 border-gray-200" style={{ color: NAVY }} />
        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
      </div>

      {/* Phone — collected here, used in Step 3 profile; email-only verification */}
      <div className="space-y-1.5">
        <Label htmlFor="phone1" className="font-semibold text-sm" style={{ color: NAVY }}>Phone Number *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">+91</span>
          <Input
            id="phone1"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            className="h-11 pl-[4.25rem] border-gray-200"
            style={{ color: NAVY }}
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
      </div>

      <PasswordInput id="password" label="Password *" value={password} onChange={setPassword}
        placeholder="Min 8 characters" error={errors.password} />

      <PasswordInput id="confirmPassword" label="Confirm Password *" value={confirmPassword}
        onChange={setConfirmPassword} placeholder="Re-enter your password" error={errors.confirmPassword} />

      <Button type="submit" disabled={busy || !isLoaded} className="w-full h-12 font-bold text-base rounded-xl text-white"
        style={{ background: ORANGE }}>
        {!isLoaded ? "Loading…" : busy ? "Creating account…" : "Continue →"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a href={`${BASE}/sign-in`} className="font-semibold hover:underline" style={{ color: ORANGE }}>
          Sign in
        </a>
      </p>
    </form>
  );
}

// ── Step 2: Email verification ─────────────────────────────────
function Step2({
  email,
  firstName,
  lastName,
  onNext,
  onBack,
}: {
  email: string; firstName: string; lastName: string;
  onNext: () => void; onBack: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signUp, isLoaded } = useSignUp() as any;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length < 6) { setError("Enter the 6-digit code"); return; }
    if (!isLoaded || !signUp) return;
    setBusy(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        // Sync with our DB immediately
        const r = await fetch(`${BASE}/api/auth/clerk-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name: `${firstName} ${lastName}` }),
        });
        if (r.ok) {
          const data = await r.json();
          localStorage.setItem(STUDENT_TOKEN_KEY, data.token);
        }
        onNext();
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Invalid code";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!isLoaded || !signUp || resending) return;
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch {}
    finally { setResending(false); }
  };

  return (
    <form onSubmit={verify} className="space-y-5">
      <div>
        <h2 className="font-black text-2xl" style={{ color: NAVY }}>Verify your email</h2>
        <p className="text-gray-500 text-sm mt-1">Step 2 of 3 — we sent a 6-digit code to</p>
        <p className="font-semibold text-sm mt-0.5" style={{ color: NAVY }}>{email}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="otp" className="font-semibold text-sm" style={{ color: NAVY }}>Verification Code *</Label>
        <Input
          id="otp"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          className="h-14 text-center text-2xl font-bold tracking-widest border-gray-200"
          style={{ color: NAVY }}
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <Button type="submit" disabled={busy || code.length < 6} className="w-full h-12 font-bold text-base rounded-xl text-white"
        style={{ background: ORANGE }}>
        {busy ? "Verifying…" : "Verify & Continue →"}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button type="button" onClick={resend} disabled={resending}
          className="font-semibold hover:underline" style={{ color: resent ? "#22C55E" : ORANGE }}>
          {resent ? "✓ Code sent!" : resending ? "Sending…" : "Resend code"}
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Profile details ────────────────────────────────────
function Step3({ firstName, initialPhone }: { firstName: string; initialPhone: string }) {
  const [, setLocation] = useLocation();
  const [phone, setPhone] = useState(initialPhone);
  const [grade, setGrade] = useState("");
  const [board, setBoard] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    const digits = phone.replace(/\D/g, "");
    if (!digits || digits.length !== 10) e.phone = "Enter a valid 10-digit mobile number";
    if (!grade) e.grade = "Please select your grade";
    if (!board) e.board = "Please select your board";
    if (!state) e.state = "Please select your state";
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setBusy(true);
    setErrors({});

    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    try {
      const r = await fetch(`${BASE}/api/student/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          grade: Number(grade),
          board,
          state,
          city: city.trim() || undefined,
          phone: phone.replace(/\D/g, ""),
          school: undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed to save profile");
      setLocation("/dashboard");
    } catch {
      setErrors({ general: "Could not save your details. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="font-black text-2xl" style={{ color: NAVY }}>
          {firstName ? `Hi ${firstName}! 👋` : "Almost there! 👋"}
        </h2>
        <p className="text-gray-500 text-sm mt-1">Step 3 of 3 — personalise your learning</p>
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone" className="font-semibold text-sm" style={{ color: NAVY }}>Mobile Number * (10 digits)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">+91</span>
          <Input
            id="phone"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
            className="h-11 pl-12 border-gray-200"
            style={{ color: NAVY }}
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        {errors.phone
          ? <p className="text-xs text-red-500">{errors.phone}</p>
          : <p className="text-xs text-gray-400">Used to send important notifications</p>}
      </div>

      {/* Grade */}
      <div className="space-y-1.5">
        <Label className="font-semibold text-sm" style={{ color: NAVY }}>Grade *</Label>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="h-11 border-gray-200">
            <SelectValue placeholder="Select your grade" />
          </SelectTrigger>
          <SelectContent>
            {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.grade && <p className="text-xs text-red-500">{errors.grade}</p>}
      </div>

      {/* Board */}
      <div className="space-y-1.5">
        <Label className="font-semibold text-sm" style={{ color: NAVY }}>Board *</Label>
        <Select value={board} onValueChange={setBoard}>
          <SelectTrigger className="h-11 border-gray-200">
            <SelectValue placeholder="CBSE / ICSE / State Board…" />
          </SelectTrigger>
          <SelectContent>
            {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.board && <p className="text-xs text-red-500">{errors.board}</p>}
      </div>

      {/* State */}
      <div className="space-y-1.5">
        <Label className="font-semibold text-sm" style={{ color: NAVY }}>State / UT *</Label>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="h-11 border-gray-200">
            <SelectValue placeholder="Select your state" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.state && <p className="text-xs text-red-500">{errors.state}</p>}
      </div>

      {/* City (optional) */}
      <div className="space-y-1.5">
        <Label htmlFor="city" className="font-semibold text-sm" style={{ color: NAVY }}>
          City <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </Label>
        <Input id="city" value={city} onChange={e => setCity(e.target.value)}
          placeholder="Mumbai, Delhi, Bengaluru…" className="h-11 border-gray-200" style={{ color: NAVY }} />
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          {errors.general}
        </div>
      )}

      <Button type="submit" disabled={busy} className="w-full h-12 font-bold text-base rounded-xl text-white"
        style={{ background: ORANGE }}>
        {busy ? "Saving…" : "Start Learning 🚀"}
      </Button>
    </form>
  );
}

// ── Main sign-up page ──────────────────────────────────────────
type SignupStep = 1 | 2 | 3;

export function SignUpPageContent() {
  const [step, setStep] = useState<SignupStep>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="w-full max-w-md">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <Step1
              onNext={(fn, ln, em, ph) => {
                setFirstName(fn); setLastName(ln); setEmail(em); setPhone(ph);
                setStep(2);
              }}
            />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div key="step2"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <Step2
              email={email} firstName={firstName} lastName={lastName}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          </motion.div>
        )}
        {step === 3 && (
          <motion.div key="step3"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
            <Step3 firstName={firstName} initialPhone={phone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SignUpPage() {
  const [step, setStep] = useState<SignupStep>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="min-h-screen flex">
      <LeftPanel step={step} />

      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-gray-50 min-h-screen lg:min-h-0 relative">
        {/* Back to home */}
        {step === 1 && (
          <a href="/"
            className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: NAVY }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </a>
        )}

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>

        {/* Progress dots (mobile) */}
        <div className="flex gap-2 mb-6 lg:hidden">
          {[1, 2, 3].map(s => (
            <div key={s} className="h-1.5 rounded-full transition-all"
              style={{
                width: s === step ? "2rem" : "0.5rem",
                background: s <= step ? ORANGE : "#E5E7EB",
              }} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <Step1
                  onNext={(fn, ln, em, ph) => {
                    setFirstName(fn); setLastName(ln); setEmail(em); setPhone(ph);
                    setStep(2);
                  }}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <Step2
                  email={email} firstName={firstName} lastName={lastName}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                <Step3 firstName={firstName} initialPhone={phone} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
