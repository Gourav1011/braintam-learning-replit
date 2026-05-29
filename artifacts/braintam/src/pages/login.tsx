import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, STUDENT_TOKEN_KEY } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import {
  Mail, Lock, Phone, Eye, EyeOff, ArrowLeft, CheckCircle,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function LeftPanel() {
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
            Welcome back!<br />
            <span style={{ color: ORANGE }}>Keep learning.</span>
          </h1>
          <p className="text-white/70 text-sm leading-relaxed max-w-sm">
            Pick up exactly where you left off — your classes, tests, and progress are all waiting for you.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "5L+", label: "Students" },
            { value: "500+", label: "Live Classes" },
            { value: "4.9★", label: "Rating" },
            { value: "40%", label: "Score Boost" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="text-white font-black text-lg leading-none">{s.value}</div>
              <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-white/80 text-sm italic leading-relaxed">
            "Braintam transformed the way my son studies. His confidence in Maths went up by 50%!"
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{ background: ORANGE }}>R</div>
            <div>
              <div className="text-white text-xs font-semibold">Rahul Verma</div>
              <div className="text-white/50 text-xs">Parent, Pune</div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-white/30 text-xs relative z-10">© 2025 Braintam Learning. All Rights Reserved.</div>
    </div>
  );
}

type LoginMode = "login" | "forgot";
type LoginTab = "email" | "phone";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm text-red-700 font-medium flex items-start gap-2">
      <span className="text-red-500 text-base leading-none mt-0.5">⚠</span>
      <span>{message}</span>
    </div>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { refreshAuth } = useAuth();

  const [mode, setMode] = useState<LoginMode>("login");
  const [tab, setTab] = useState<LoginTab>("email");

  /* Login state */
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  /* Forgot-password state */
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotTab, setForgotTab] = useState<LoginTab>("email");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const persistToken = (token: string) => {
    localStorage.setItem(STUDENT_TOKEN_KEY, token);
    refreshAuth();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const body: Record<string, string> = { password };
    if (tab === "email") {
      if (!email.includes("@")) { setLoginError("Enter a valid email address"); return; }
      body.email = email.trim().toLowerCase();
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length !== 10) { setLoginError("Enter a valid 10-digit mobile number"); return; }
      body.phone = digits;
    }
    if (!password) { setLoginError("Password is required"); return; }
    setLoginBusy(true);
    try {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setLoginError(data.error ?? "Invalid credentials. Please check and try again.");
        return;
      }
      persistToken(data.token);
      setLocation("/dashboard");
    } catch {
      setLoginError("Network error. Please check your connection.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 6) { setResetError("New password must be at least 6 characters"); return; }
    const body: Record<string, string> = { newPassword };
    if (forgotTab === "email") {
      if (!forgotEmail.includes("@")) { setResetError("Enter a valid email address"); return; }
      body.email = forgotEmail.trim().toLowerCase();
    } else {
      const digits = forgotPhone.replace(/\D/g, "");
      if (digits.length !== 10) { setResetError("Enter a valid 10-digit mobile number"); return; }
      body.phone = digits;
    }
    setResetBusy(true);
    try {
      const r = await fetch(`${BASE}/api/auth/reset-password-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setResetError(data.error ?? "Account not found. Please check and try again."); return; }
      persistToken(data.token);
      setResetSuccess(true);
      setTimeout(() => setLocation("/dashboard"), 1200);
    } catch {
      setResetError("Network error. Please try again.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <LeftPanel />

      <div className="flex-1 lg:max-w-xl flex flex-col">
        {/* Back link */}
        <div className="flex items-center p-4 lg:p-6">
          <button
            type="button"
            onClick={() => mode === "login" ? setLocation("/") : setMode("login")}
            className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {mode === "login" ? "Back" : "Back to Sign In"}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">

              {/* ── Login form ── */}
              {mode === "login" && (
                <motion.div key="login"
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                      <h2 className="font-black text-2xl" style={{ color: NAVY }}>Sign in to Braintam</h2>
                      <p className="text-gray-500 text-sm mt-1">Continue your learning journey</p>
                    </div>

                    {/* Tab toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 p-1 gap-1">
                      {(["email", "phone"] as LoginTab[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setTab(t); setLoginError(""); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={tab === t
                            ? { background: NAVY, color: "white" }
                            : { background: "transparent", color: "#6B7280" }}
                        >
                          {t === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          {t === "email" ? "Email" : "Phone Number"}
                        </button>
                      ))}
                    </div>

                    {loginError && <ErrorBanner message={loginError} />}

                    {/* Email or Phone field */}
                    <AnimatePresence mode="wait">
                      {tab === "email" ? (
                        <motion.div key="email-field"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                          className="space-y-1.5">
                          <Label htmlFor="email" className="font-semibold text-sm" style={{ color: NAVY }}>
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="arjun@gmail.com"
                              className="h-11 pl-10 border-gray-200"
                              style={{ color: NAVY }}
                              autoComplete="email"
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="phone-field"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                          className="space-y-1.5">
                          <Label htmlFor="phone" className="font-semibold text-sm" style={{ color: NAVY }}>
                            Phone Number
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">+91</span>
                            <Input
                              id="phone"
                              value={phone}
                              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              placeholder="9876543210"
                              className="h-11 pl-[4.25rem] border-gray-200"
                              style={{ color: NAVY }}
                              inputMode="numeric"
                              maxLength={10}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="font-semibold text-sm" style={{ color: NAVY }}>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="h-11 pl-10 pr-10 border-gray-200"
                          style={{ color: NAVY }}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setLoginError(""); }}
                        className="text-sm font-semibold hover:underline"
                        style={{ color: ORANGE }}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={loginBusy}
                      className="w-full h-12 font-bold text-base rounded-xl text-white"
                      style={{ background: ORANGE }}
                    >
                      {loginBusy ? "Signing in…" : "Sign In →"}
                    </Button>

                    {/* Divider + Clerk Google sign-in */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-2 text-gray-400">or</span>
                      </div>
                    </div>

                    <a
                      href={`${BASE}/sign-in`}
                      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-gray-200 text-sm font-semibold transition hover:bg-gray-50"
                      style={{ color: NAVY }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </a>

                    <p className="text-center text-sm text-gray-500">
                      Don't have an account?{" "}
                      <a href={`${BASE}/sign-up`} className="font-semibold hover:underline" style={{ color: ORANGE }}>
                        Sign up free
                      </a>
                    </p>
                  </form>
                </motion.div>
              )}

              {/* ── Forgot password form ── */}
              {mode === "forgot" && (
                <motion.div key="forgot"
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
                  <form onSubmit={handleReset} className="space-y-5">
                    <div>
                      <h2 className="font-black text-2xl" style={{ color: NAVY }}>Reset Password</h2>
                      <p className="text-gray-500 text-sm mt-1">Enter your registered email or phone to set a new password</p>
                    </div>

                    {/* Tab toggle for forgot */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-200 p-1 gap-1">
                      {(["email", "phone"] as LoginTab[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setForgotTab(t); setResetError(""); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
                          style={forgotTab === t
                            ? { background: NAVY, color: "white" }
                            : { background: "transparent", color: "#6B7280" }}
                        >
                          {t === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          {t === "email" ? "Email" : "Phone Number"}
                        </button>
                      ))}
                    </div>

                    {resetError && <ErrorBanner message={resetError} />}

                    {resetSuccess && (
                      <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-sm text-green-700 font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        Password reset! Redirecting to your dashboard…
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      {forgotTab === "email" ? (
                        <motion.div key="forgot-email"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                          className="space-y-1.5">
                          <Label htmlFor="forgotEmail" className="font-semibold text-sm" style={{ color: NAVY }}>Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              id="forgotEmail"
                              type="email"
                              value={forgotEmail}
                              onChange={e => setForgotEmail(e.target.value)}
                              placeholder="arjun@gmail.com"
                              className="h-11 pl-10 border-gray-200"
                              style={{ color: NAVY }}
                            />
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="forgot-phone"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                          className="space-y-1.5">
                          <Label htmlFor="forgotPhone" className="font-semibold text-sm" style={{ color: NAVY }}>Phone Number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">+91</span>
                            <Input
                              id="forgotPhone"
                              value={forgotPhone}
                              onChange={e => setForgotPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                              placeholder="9876543210"
                              className="h-11 pl-[4.25rem] border-gray-200"
                              style={{ color: NAVY }}
                              inputMode="numeric"
                              maxLength={10}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="font-semibold text-sm" style={{ color: NAVY }}>New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="h-11 pl-10 pr-10 border-gray-200"
                          style={{ color: NAVY }}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={resetBusy || resetSuccess}
                      className="w-full h-12 font-bold text-base rounded-xl text-white"
                      style={{ background: ORANGE }}
                    >
                      {resetBusy ? "Resetting…" : "Reset Password & Sign In"}
                    </Button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
