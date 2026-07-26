import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Loader2, BookOpen, GraduationCap, Star, Trophy } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { API_BASE as BASE } from "@/lib/api-base";
import { STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY } from "@/components/auth-provider";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const perks = [
  { icon: BookOpen, title: "Live Classes", desc: "Join live sessions with expert teachers" },
  { icon: Star, title: "Animated Videos", desc: "Learn with fun animated explainer videos" },
  { icon: GraduationCap, title: "Tests & Quizzes", desc: "Adaptive tests to track your progress" },
  { icon: Trophy, title: "Leaderboard", desc: "Compete and earn points with classmates" },
];

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid credentials. Please try again.");
        return;
      }
      const role = data.student?.role;
      if (role && role !== "student") {
        setError("This account is not a student account. Use the staff login portal.");
        return;
      }
      localStorage.removeItem(STAFF_TOKEN_KEY);
      localStorage.setItem(STUDENT_TOKEN_KEY, data.token);
      window.dispatchEvent(new CustomEvent("braintam:auth_change"));
      window.location.href = "/dashboard";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between lg:w-5/12 p-12 relative overflow-hidden flex-shrink-0"
        style={{ background: `linear-gradient(135deg, #0B1E4B 0%, ${NAVY} 50%, #1a1060 100%)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,107,26,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,107,26,0.10) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10">
          <Link href="/">
            <img src={braintamLogo} alt="Braintam" className="h-14 w-auto object-contain cursor-pointer" />
          </Link>
        </div>
        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Welcome back,<br />
              <span style={{ color: ORANGE }}>young learner!</span>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Sign in to continue your learning journey with Braintam — India's #1 platform for school students.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,107,26,0.18)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: ORANGE }} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-white/60 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-white/30 text-xs">© 2026 Braintam Learning. All Rights Reserved.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Link href="/">
            <img src={braintamLogo} alt="Braintam" className="h-14 w-auto object-contain mx-auto" />
          </Link>
        </div>

        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition-opacity" style={{ color: NAVY }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-black mb-1" style={{ color: NAVY }}>Student Sign In</h1>
            <p className="text-gray-500 text-sm">Access your dashboard, classes, and homework.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>
                Phone number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter your 10-digit phone number"
                required
                pattern="[0-9]{10}"
                autoComplete="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ color: NAVY, background: "#F8FAFC" }}
                onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
                onBlur={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold" style={{ color: NAVY }}>Password</label>
                <Link href="/forgot-password" className="text-xs hover:underline" style={{ color: ORANGE }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ color: NAVY, background: "#F8FAFC" }}
                  onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#E5E7EB")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: ORANGE }}>
              Sign up free
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
