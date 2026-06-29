import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, Users, Video, ClipboardList, Eye, EyeOff, Loader2, Clock, Star, TrendingUp } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const TEAL = "#0891B2";
import { API_BASE as BASE } from "@/lib/api-base";

const perks = [
  { icon: Video,         title: "Live Class Manager",     desc: "Schedule, launch and monitor live sessions — with countdown timers and join links for every student" },
  { icon: BookOpen,      title: "Course & Lesson Builder",desc: "Create chapters, topics and lessons. Upload drive links, videos and study materials in minutes" },
  { icon: ClipboardList, title: "Homework & Assignments",  desc: "Set homework with MCQ or descriptive questions, assign marks and give per-student feedback" },
  { icon: Users,         title: "Attendance Tracking",    desc: "Mark per-class attendance, filter by date range and export reports for admin review" },
  { icon: Clock,         title: "Check-in / Check-out",   desc: "Log your work hours daily with a live timer. Submit your work summary and priorities at checkout" },
];

export default function TeacherLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid credentials");
        return;
      }
      const allowedTeacherRoles = ["teacher", "admin", "super_admin", "academic_mentor"];
      if (!allowedTeacherRoles.includes(data.student?.role)) {
        setError("This account does not have teacher access.");
        return;
      }
      localStorage.setItem("braintam_staff_token", data.token);
      localStorage.removeItem("braintam_student_token");
      window.location.href = "/teacher";
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
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{ width: "60%", background: `linear-gradient(135deg, ${NAVY} 0%, #0d3580 55%, #0a2660 100%)` }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: TEAL }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />

        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer w-fit">
              <img src={braintamLogo} alt="Braintam" className="w-44 h-auto object-contain" />
            </div>
          </Link>
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
              style={{ background: `${TEAL}25`, border: `1px solid ${TEAL}50`, color: "#67E8F9" }}>
              <BookOpen className="w-3.5 h-3.5" /> Teacher Portal
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-2">
              Welcome back,<br />
              <span style={{ color: "#67E8F9" }}>Educator!</span>
            </h1>
            <p className="text-white/65 text-sm leading-relaxed">
              Your complete teaching hub — classes, grading, attendance and daily work tracking, all in one place.
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Star,        val: "4.9★",    label: "Teacher Rating" },
              { icon: Users,       val: "500+",    label: "Classes Managed" },
              { icon: TrendingUp,  val: "98%",     label: "On-Time Rate" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <div className="font-black text-base text-white">{s.val}</div>
                <div className="text-white/45 text-[10px] text-center leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {perks.map(p => (
              <div key={p.title} className="flex items-start gap-3 rounded-xl p-3"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${TEAL}30` }}>
                  <p.icon className="w-4 h-4" style={{ color: "#67E8F9" }} />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{p.title}</div>
                  <div className="text-white/50 text-xs mt-0.5 leading-snug">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <p className="text-white/70 text-sm italic leading-snug">
              "Managing 200+ students used to feel overwhelming. With Braintam's portal I can grade, schedule and track attendance in under 10 minutes."
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: TEAL }}>P</div>
              <div>
                <div className="text-white text-xs font-semibold">Poonam</div>
                <div className="text-white/40 text-xs">Co-Founder & COO, Braintam</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-white/25 text-xs relative z-10">© 2026 Braintam Learning. All Rights Reserved.</div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:px-8 lg:py-8 bg-gray-50 overflow-y-auto relative">
        <Link href="/">
          <div
            className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: NAVY }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </div>
        </Link>

        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div
            className="w-full mb-5 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
            style={{ background: `${TEAL}12`, border: `1px solid ${TEAL}35`, color: TEAL }}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            Teacher Portal — sign in to manage your classes
          </div>

          <div className="w-full bg-white rounded-2xl shadow-xl p-7">
            <h2 className="text-2xl font-black mb-1" style={{ color: NAVY }}>Teacher Sign In</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials provided by your admin.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Email address</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@school.com"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{ border: `1.5px solid #E5E7EB`, color: NAVY, background: "#F8FAFC" }}
                  onFocus={e => (e.currentTarget.style.border = `1.5px solid ${TEAL}`)}
                  onBlur={e => (e.currentTarget.style.border = "1.5px solid #E5E7EB")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all pr-11"
                    style={{ border: `1.5px solid #E5E7EB`, color: NAVY, background: "#F8FAFC" }}
                    onFocus={e => (e.currentTarget.style.border = `1.5px solid ${TEAL}`)}
                    onBlur={e => (e.currentTarget.style.border = "1.5px solid #E5E7EB")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${TEAL}, #0669a1)` }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Signing in…" : "Sign In to Teacher Portal"}
              </button>
            </form>
          </div>

          <div className="flex gap-4 mt-5 text-xs text-gray-400 justify-center">
            <Link href="/admin/login">
              <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>Admin Login →</span>
            </Link>
            <span>·</span>
            <Link href="/mentor/login">
              <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>Mentor Login →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
