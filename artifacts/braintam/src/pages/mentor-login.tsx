import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, UserCheck, BarChart2, MessageSquare, Bell, Eye, EyeOff, Loader2, Target, BookOpen, TrendingUp, CheckCircle2 } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const AMBER = "#D97706";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const perks = [
  { icon: Target,        title: "Full CRM Pipeline",      desc: "Track every student through New Lead → Paid Student with lead stage management" },
  { icon: UserCheck,     title: "Student 360 Profiles",   desc: "Permanent timeline, parent info, health scores and full history in one view" },
  { icon: MessageSquare, title: "Follow-Up Management",   desc: "Status-coded reminders — Due Today, Overdue, Upcoming, Completed" },
  { icon: Bell,          title: "Task Management",        desc: "Assign and track mentor tasks: Call Parent, Fee Reminder, Attendance Follow-Up" },
];

type Step = "credentials" | "select-portal";

export default function MentorLoginPage() {
  const [step, setStep]               = useState<Step>("credentials");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [dbMentorType, setDbMentorType] = useState<"sales" | "academic">("academic");
  const [savedToken, setSavedToken]   = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

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

      const token = data.token as string;
      setSavedToken(token);

      // Fetch dashboard to detect mentorType
      try {
        const dr = await fetch(`${BASE}/api/mentor/dashboard`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (dr.ok) {
          const dd = await dr.json();
          setDbMentorType(dd.mentorType === "sales" ? "sales" : "academic");
        }
      } catch {
        // ignore — default to academic
      }

      setStep("select-portal");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function enterPortal(choice: "academic" | "sales") {
    if (choice !== dbMentorType) {
      setAccessDenied(true);
      return;
    }
    setAccessDenied(false);
    localStorage.setItem("braintam_staff_token", savedToken);
    localStorage.removeItem("braintam_student_token");
    localStorage.setItem("braintam_mentor_portal_type", choice);
    window.location.href = "/mentor";
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
              <Target className="w-3.5 h-3.5" /> BTL CRM
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              Welcome back,<br />
              <span style={{ color: "#6EE7B7" }}>Mentor!</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Your Student Success CRM — pipeline management, permanent timelines, and follow-up tracking all in one place.
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
              "BTL CRM gives me a clear 360° view of every student — from lead stage to permanent timeline. I can act before they fall behind."
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

        <div className="text-white/25 text-xs relative z-10">© 2026 Braintam Learning. All Rights Reserved.</div>
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

        <div className="w-full max-w-[420px]">

          {/* ── Step 1: Credentials ── */}
          {step === "credentials" && (
            <>
              <div className="w-full mb-5 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
                style={{ background: `${GREEN}12`, border: `1px solid ${GREEN}35`, color: GREEN }}>
                <Target className="w-4 h-4 flex-shrink-0" />
                BTL CRM — sign in to manage your students
              </div>

              <div className="w-full bg-white rounded-2xl shadow-xl p-7">
                <h2 className="text-2xl font-black mb-1" style={{ color: NAVY }}>BTL CRM Sign In</h2>
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
                    {loading ? "Signing in…" : "Sign In to BTL CRM"}
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
            </>
          )}

          {/* ── Step 2: Select portal type ── */}
          {step === "select-portal" && (
            <div className="w-full bg-white rounded-2xl shadow-xl p-7">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5" style={{ color: GREEN }} />
                <h2 className="text-xl font-black" style={{ color: NAVY }}>Signed in!</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Which portal would you like to open today?
              </p>

              {/* Detected type info */}
              <div className="mb-5 px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{
                  background: dbMentorType === "sales" ? "#FFFBEB" : "#ECFDF5",
                  border: `1px solid ${dbMentorType === "sales" ? "#FCD34D" : "#6EE7B7"}`,
                  color: dbMentorType === "sales" ? AMBER : GREEN,
                }}>
                {dbMentorType === "sales" ? "💼" : "📚"}
                Your account is set up as a <strong className="ml-1">{dbMentorType === "sales" ? "Sales Mentor" : "Academic Mentor"}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Academic card */}
                <button
                  onClick={() => enterPortal("academic")}
                  className="relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left group"
                  style={{
                    borderColor: dbMentorType === "academic" ? GREEN : "#E5E7EB",
                    background: dbMentorType === "academic" ? "#ECFDF5" : "white",
                  }}>
                  {dbMentorType === "academic" && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: GREEN, color: "white" }}>Your role</span>
                  )}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: dbMentorType === "academic" ? `${GREEN}20` : "#F3F4F6" }}>
                    <BookOpen className="w-6 h-6" style={{ color: dbMentorType === "academic" ? GREEN : "#9CA3AF" }} />
                  </div>
                  <div className="text-center">
                    <div className="font-black text-sm" style={{ color: dbMentorType === "academic" ? GREEN : "#374151" }}>
                      📚 Academic
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                      Students, follow-ups, attendance & homework
                    </div>
                  </div>
                </button>

                {/* Sales card */}
                <button
                  onClick={() => enterPortal("sales")}
                  className="relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all text-left group"
                  style={{
                    borderColor: dbMentorType === "sales" ? AMBER : "#E5E7EB",
                    background: dbMentorType === "sales" ? "#FFFBEB" : "white",
                  }}>
                  {dbMentorType === "sales" && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: AMBER, color: "white" }}>Your role</span>
                  )}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: dbMentorType === "sales" ? `${AMBER}20` : "#F3F4F6" }}>
                    <TrendingUp className="w-6 h-6" style={{ color: dbMentorType === "sales" ? AMBER : "#9CA3AF" }} />
                  </div>
                  <div className="text-center">
                    <div className="font-black text-sm" style={{ color: dbMentorType === "sales" ? AMBER : "#374151" }}>
                      💼 Sales (SSM)
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                      Lead pipeline, conversions & follow-ups
                    </div>
                  </div>
                </button>
              </div>

              {accessDenied && (
                <div className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200 flex items-start gap-2">
                  <span className="text-base leading-none mt-0.5">🚫</span>
                  <div>
                    <div className="font-black">Access Denied</div>
                    <div className="text-xs font-normal mt-0.5">
                      Your account is set up as a <strong>{dbMentorType === "sales" ? "Sales (SSM)" : "Academic"} Mentor</strong>. You cannot open the {dbMentorType === "sales" ? "Academic" : "Sales"} portal. Contact your admin to change your account type.
                    </div>
                  </div>
                </div>
              )}

              {!accessDenied && (
                <p className="text-[10px] text-gray-400 text-center mt-4">
                  Select the portal that matches your role above.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
