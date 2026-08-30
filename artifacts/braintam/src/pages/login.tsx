import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";
import { STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY } from "@/components/auth-provider";
import { StudentAuthShell } from "@/components/student-auth-shell";
import { getStudentAuthRedirect } from "@/lib/student-auth";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const redirectTo = getStudentAuthRedirect(window.location.search);

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
      setLocation(redirectTo, { replace: true });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <StudentAuthShell
      eyebrow="Student access"
      title="Welcome back,"
      highlightedTitle="young learner!"
      description="Sign in to continue your learning journey with live classes, practice, rewards, and support in one place."
    >
      <div className="mb-7">
        <h1 className="text-2xl font-black mb-1" style={{ color: NAVY }}>Student Sign In</h1>
        <p className="text-gray-500 text-sm">Use your registered phone number and password.</p>
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
            pattern="[6-9][0-9]{9}"
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
              aria-label={showPw ? "Hide password" : "Show password"}
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
        <Link href={`/register${window.location.search}`} className="font-semibold hover:underline" style={{ color: ORANGE }}>
          Sign up free
        </Link>
      </p>
    </StudentAuthShell>
  );
}
