import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";
import {
  STUDENT_TOKEN_KEY,
  STAFF_TOKEN_KEY,
} from "@/components/auth-provider";
import { braintamLogo } from "@/lib/brand-assets";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanName.length < 2) {
      setError("Please enter the student's name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    const gradeNumber = Number(grade);
    if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 10) {
      setError("Please select the student's grade.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          grade: gradeNumber,
          password,
        }),
      });

      const data = await res.json() as {
        token?: string;
        error?: string;
        student?: {
          role?: string;
        };
      };

      if (!res.ok || !data.token) {
        setError(data.error ?? "Unable to create your account. Please try again.");
        return;
      }

      if (data.student?.role && data.student.role !== "student") {
        setError("This phone number cannot be registered as a student account.");
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
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{
        background: "linear-gradient(135deg,#F8FAFC,#FFF7F0)",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-70"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-7 sm:p-8">
          <Link href="/">
            <img
              src={braintamLogo}
              alt="Braintam"
              className="h-14 w-auto object-contain mx-auto mb-5"
            />
          </Link>

          <div className="text-center mb-7">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(255,107,26,0.12)" }}
            >
              <GraduationCap className="w-6 h-6" style={{ color: ORANGE }} />
            </div>

            <h1 className="text-2xl font-black" style={{ color: NAVY }}>
              Start learning for free
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Create your Braintam student account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: NAVY }}
              >
                Student name
              </label>

              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                maxLength={100}
                required
                placeholder="Enter student name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: NAVY }}
              >
                Mobile number
              </label>

              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                autoComplete="tel"
                pattern="[6-9][0-9]{9}"
                required
                placeholder="Enter 10-digit mobile number"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              />
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: NAVY }}
              >
                Grade
              </label>

              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2"
              >
                <option value="">Select grade</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Grade {i + 1}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-1.5"
                style={{ color: NAVY }}
              >
                Create password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  maxLength={128}
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3.5 font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${ORANGE}, #D95300)`,
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating account..." : "Create Account — Join Free"}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: ORANGE }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
