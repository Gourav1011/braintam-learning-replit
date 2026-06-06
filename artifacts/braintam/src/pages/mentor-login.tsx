import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, UserCheck, BarChart2, MessageSquare, Bell, Eye, EyeOff, Loader2 } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const perks = [
  { icon: UserCheck,     title: "Monitor Your Students",  desc: "Track attendance, homework, and test performance at a glance" },
  { icon: BarChart2,     title: "Student Health Scores",   desc: "Automated risk scoring to identify students who need attention" },
  { icon: MessageSquare, title: "Follow-Up Notes",          desc: "Log parent calls, reminders, and issue resolutions" },
  { icon: Bell,          title: "Smart Alerts",             desc: "Get notified when a student goes inactive or misses submissions" },
];

export default function MentorLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid credentials"); return; }
      if (data.student?.role !== "mentor" && data.student?.role !== "admin") {
        setError("This account does not have mentor access.");
        return;
      }
      localStorage.setItem("braintam_staff_token", data.token);
      localStorage.removeItem("braintam_student_token");
      window.location.href = "/mentor";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between lg:w-5/12 p-12 relative overflow-hidden flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0a3d2b 55%, #064d35 100%)` }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: GREEN }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />

        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer w-fit">
              <img src={braintamLogo} alt="Braintam" className="w-44 h-auto object-contain" />
            </div>
          </Link>
        </div>

        <div className="space-y-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
              style={{ background: `${GREEN}25`, border: `1px solid ${GREEN}50`, color: "#6EE7B7" }}>
              <UserCheck className="w-3.5 h-3.5" /> Mentor Portal
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              Welcome back,<br />
              <span style={{ color: "#6EE7B7" }}>Mentor!</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Your Student Success hub — monitor progress, log follow-ups, and keep every student on track.
            </p>
          </div>

          <div className="space-y-3">
            {perks.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex items-start gap-3 rounded-xl p-3.5"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${GREEN}30` }}>
                    <Icon className="w-4 h-4" style={{ color: "#6EE7B7" }} />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{p.title}</div>
                    <div className="text-white/50 text-xs mt-0.5">{p.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <p className="text-white/70 text-sm italic">
              "The Mentor Portal gives me a clear picture of every student's progress — I can act before they fall behind."
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ background: GREEN }}>M</div>
              <div>
                <div className="text-white text-xs font-semibold">Mentor Team</div>
                <div className="text-white/40 text-xs">Student Success, Braintam</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-white/25 text-xs relative z-10">© 2026 Braintam Learning LLP. All Rights Reserved.</div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 lg:px-8 lg:py-8 bg-gray-50 overflow-y-auto relative">
        <Link href="/">
          <div className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer" style={{ color: NAVY }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </div>
        </Link>

        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="w-full mb-5 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
            style={{ background: `${GREEN}12`, border: `1px solid ${GREEN}35`, color: GREEN }}>
            <UserCheck className="w-4 h-4 flex-shrink-0" />
            Mentor Portal — sign in to manage your students
          </div>

          <div className="w-full bg-white rounded-2xl shadow-xl p-7">
            <h2 className="text-2xl font-black mb-1" style={{ color: NAVY }}>Mentor Sign In</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials provided by your admin.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Email address</label>
                <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@braintam.com"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{ border: "1.5px solid #E5E7EB", color: NAVY, background: "#F8FAFC" }}
                  onFocus={e => (e.currentTarget.style.border = `1.5px solid ${GREEN}`)}
                  onBlur={e => (e.currentTarget.style.border = "1.5px solid #E5E7EB")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: NAVY }}>Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all pr-11"
                    style={{ border: "1.5px solid #E5E7EB", color: NAVY, background: "#F8FAFC" }}
                    onFocus={e => (e.currentTarget.style.border = `1.5px solid ${GREEN}`)}
                    onBlur={e => (e.currentTarget.style.border = "1.5px solid #E5E7EB")}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-200">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${GREEN}, #047857)` }}>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Signing in…" : "Sign In to Mentor Portal"}
              </button>
            </form>
          </div>

          <div className="flex gap-4 mt-5 text-xs text-center text-gray-400 justify-center">
            <Link href="/admin/login">
              <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>Admin →</span>
            </Link>
            <span>·</span>
            <Link href="/teacher/login">
              <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>Teacher →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
