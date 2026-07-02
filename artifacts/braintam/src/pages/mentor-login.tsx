import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, UserCheck, BarChart2, MessageSquare, Bell, Eye, EyeOff, Loader2, Target, BookOpen, TrendingUp, CheckCircle2 } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";
const AMBER = "#D97706";
import { API_BASE as BASE } from "@/lib/api-base";

const perks = [
  { icon: Target,        title: "Full CRM Pipeline",       desc: "Move students through every stage — New Lead → Demo → Follow-Up → Interested → Paid — with one-click status updates" },
  { icon: UserCheck,     title: "Student 360° Profiles",   desc: "Permanent activity timeline, parent contact, health score, academic history and all follow-ups in one powerful view" },
  { icon: MessageSquare, title: "Smart Follow-Up Engine",  desc: "Status-coded reminders color-coded by urgency — Overdue, Due Today, Upcoming and Completed — so nothing slips through" },
  { icon: Bell,          title: "Real-time Notifications", desc: "Instant alerts for new assignments, payment updates, demo enrollments and follow-up tasks assigned by admin" },
  { icon: TrendingUp,    title: "EOD Reports & Analytics", desc: "Log daily calls, follow-ups and doubt sessions. Submit end-of-day summaries with tomorrow's priorities to admin" },
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
      if (!["mentor", "academic_mentor", "sales_mentor", "super_admin"].includes(data.student?.role)) {
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
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{ width: "60%", background: `linear-gradient(135deg, ${NAVY} 0%, #0a3d2b 55%, #064d35 100%)` }}>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: GREEN }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />

        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer w-fit">
              <img src={braintamLogo} alt="Braintam" className="w-56 h-auto object-contain" />
            </div>
          </Link>
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
              style={{ background: `${GREEN}25`, border: `1px solid ${GREEN}50`, color: "#6EE7B7" }}>
              <Target className="w-3.5 h-3.5" /> Mentor CRM Portal
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-2">
              Welcome back,<br />
              <span style={{ color: "#6EE7B7" }}>Mentor!</span>
            </h1>
            <p className="text-white/65 text-sm leading-relaxed">
              Your Student Success hub — pipeline, 360° profiles, follow-ups, EOD reports and real-time notifications all in one place.
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: "360°",    label: "Student Profiles" },
              { val: "CRM",     label: "Full Pipeline" },
              { val: "Live",    label: "Notifications" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}>
                <div className="font-black text-base text-white">{s.val}</div>
                <div className="text-white/45 text-[10px] text-center leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {perks.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${GREEN}30` }}>
                    <Icon className="w-4 h-4" style={{ color: "#6EE7B7" }} />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{p.title}</div>
                    <div className="text-white/50 text-xs mt-0.5 leading-snug">{p.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <p className="text-white/70 text-sm italic leading-snug">
              "BTL CRM gives me a clear 360° view of every student — from lead to paid. I can track follow-ups, log calls and submit EOD reports without switching apps."
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ background: GREEN }}>S</div>
              <div>
                <div className="text-white text-xs font-semibold">Sales Mentor Team</div>
                <div className="text-white/40 text-xs">Student Success, Braintam</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-white/25 text-xs relative z-10">© 2026 Braintam Learning. All Rights Reserved.</div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto relative">

        {/* Back link */}
        <Link href="/">
          <div className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer z-10" style={{ color: NAVY }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </div>
        </Link>

        {/* Mobile logo */}
        <div className="flex items-center gap-2 pt-16 px-8 pb-4 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-14 h-14 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>

        {/* Content — fills entire right panel, centered vertically */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[460px] space-y-5">

            {/* ── Step 1: Credentials ── */}
            {step === "credentials" && (
              <>
                {/* CRM badge */}
                <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl"
                  style={{ background: `${GREEN}12`, border: `1px solid ${GREEN}35`, color: GREEN }}>
                  <Target className="w-4 h-4 flex-shrink-0" />
                  BTL CRM — sign in to manage your students
                </div>

                {/* Form card */}
                <div className="bg-white rounded-2xl p-8" style={{ border: "1.5px solid #E5E7EB", boxShadow: "0 4px 24px rgba(11,43,107,0.07)" }}>
                  <h2 className="text-2xl font-black mb-1" style={{ color: NAVY }}>BTL CRM Sign In</h2>
                  <p className="text-sm text-gray-500 mb-7">Enter your credentials provided by your admin.</p>

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
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${GREEN}, #047857)` }}>
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? "Signing in…" : "Sign In to BTL CRM"}
                    </button>
                  </form>
                </div>

                {/* Other portal links */}
                <div className="flex gap-4 text-xs text-gray-400 justify-center">
                  <Link href="/admin/login">
                    <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>Admin Login →</span>
                  </Link>
                  <span>·</span>
                  <Link href="/teacher/login">
                    <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>Teacher Login →</span>
                  </Link>
                </div>
              </>
            )}

            {/* ── Step 2: Select portal ── */}
            {step === "select-portal" && (
              <>
                {/* Success header */}
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                  style={{ background: "#ECFDF5", border: `1.5px solid #6EE7B7` }}>
                  <CheckCircle2 className="w-7 h-7 flex-shrink-0" style={{ color: GREEN }} />
                  <div>
                    <div className="font-black text-lg leading-tight" style={{ color: NAVY }}>Signed in!</div>
                    <div className="text-sm text-gray-500 leading-tight">Which portal would you like to open today?</div>
                  </div>
                </div>

                {/* Account type badge */}
                <div className="px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: dbMentorType === "sales" ? "#FFFBEB" : "#ECFDF5",
                    border: `1.5px solid ${dbMentorType === "sales" ? "#FCD34D" : "#6EE7B7"}`,
                    color: dbMentorType === "sales" ? AMBER : GREEN,
                  }}>
                  <span className="text-base">{dbMentorType === "sales" ? "💼" : "📚"}</span>
                  Your account is set up as a{" "}
                  <strong>{dbMentorType === "sales" ? "Sales Mentor" : "Academic Mentor"}</strong>
                </div>

                {/* Portal cards — full width side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Academic */}
                  <button onClick={() => enterPortal("academic")}
                    className="relative flex flex-col items-center gap-4 py-7 px-5 rounded-2xl border-2 transition-all hover:scale-[1.02]"
                    style={{
                      borderColor: dbMentorType === "academic" ? GREEN : "#E5E7EB",
                      background: dbMentorType === "academic" ? "#ECFDF5" : "#FAFAFA",
                      boxShadow: dbMentorType === "academic" ? `0 4px 16px ${GREEN}25` : "0 2px 8px rgba(0,0,0,0.05)",
                    }}>
                    {dbMentorType === "academic" && (
                      <span className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: GREEN, color: "#fff" }}>Your role</span>
                    )}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: dbMentorType === "academic" ? `${GREEN}20` : "#F3F4F6" }}>
                      <BookOpen className="w-7 h-7" style={{ color: dbMentorType === "academic" ? GREEN : "#9CA3AF" }} />
                    </div>
                    <div className="text-center">
                      <div className="font-black text-base mb-1" style={{ color: dbMentorType === "academic" ? GREEN : "#374151" }}>
                        📚 Academic
                      </div>
                      <div className="text-[11px] text-gray-400 leading-snug">
                        Students, follow-ups,<br />attendance & homework
                      </div>
                    </div>
                  </button>

                  {/* Sales */}
                  <button onClick={() => enterPortal("sales")}
                    className="relative flex flex-col items-center gap-4 py-7 px-5 rounded-2xl border-2 transition-all hover:scale-[1.02]"
                    style={{
                      borderColor: dbMentorType === "sales" ? AMBER : "#E5E7EB",
                      background: dbMentorType === "sales" ? "#FFFBEB" : "#FAFAFA",
                      boxShadow: dbMentorType === "sales" ? `0 4px 16px ${AMBER}25` : "0 2px 8px rgba(0,0,0,0.05)",
                    }}>
                    {dbMentorType === "sales" && (
                      <span className="absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: AMBER, color: "#fff" }}>Your role</span>
                    )}
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: dbMentorType === "sales" ? `${AMBER}20` : "#F3F4F6" }}>
                      <TrendingUp className="w-7 h-7" style={{ color: dbMentorType === "sales" ? AMBER : "#9CA3AF" }} />
                    </div>
                    <div className="text-center">
                      <div className="font-black text-base mb-1" style={{ color: dbMentorType === "sales" ? AMBER : "#374151" }}>
                        💼 Sales (SSM)
                      </div>
                      <div className="text-[11px] text-gray-400 leading-snug">
                        Lead pipeline,<br />conversions & follow-ups
                      </div>
                    </div>
                  </button>
                </div>

                {/* Access denied */}
                {accessDenied && (
                  <div className="px-4 py-3 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200 flex items-start gap-2">
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
                  <p className="text-[11px] text-gray-400 text-center">
                    Click the portal that matches your role · Highlighted is your assigned type
                  </p>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
