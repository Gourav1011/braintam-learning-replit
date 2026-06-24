import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { GRADES, BOARDS, STATES } from "@/pages/sign-up";
import { STUDENT_TOKEN_KEY } from "@/components/auth-provider";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
import { API_BASE as BASE } from "@/lib/api-base";

export default function OnboardingPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();

  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("");
  const [state, setState] = useState("");
  const [board, setBoard] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const digits = phone.replace(/\D/g, "");
  const canSubmit = grade && state && board && digits.length === 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem(STUDENT_TOKEN_KEY);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE}/api/student/profile`, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify({
          name: user?.fullName ?? user?.firstName ?? undefined,
          grade: Number(grade),
          state,
          board,
          ...(digits ? { phone: digits } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setLocation("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    async function checkExistingProfile() {
      try {
        const token = localStorage.getItem(STUDENT_TOKEN_KEY);
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${BASE}/api/student/profile`, {
          credentials: "include",
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.grade && data.state && data.board) {
            setLocation("/dashboard");
          }
        }
      } catch {}
    }
    checkExistingProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 60%, #0d2260 100%)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
        <div className="relative z-10">
          <img src={braintamLogo} alt="Braintam" className="w-72 h-auto object-contain" />
        </div>
        <div className="space-y-6 relative z-10">
          <div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              One last step<br />
              <span style={{ color: ORANGE }}>to get started!</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Tell us about yourself so we can personalise your learning journey.
            </p>
          </div>
          {[
            { icon: "📚", title: "Board-aligned content", desc: "CBSE, ICSE, State Board and more" },
            { icon: "🎯", title: "Grade-wise learning paths", desc: "Curated for Grades 1–10" },
            { icon: "🏆", title: "Compete on the leaderboard", desc: "With students across India" },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)" }}>
              <span className="text-2xl mt-0.5">{item.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{item.title}</div>
                <div className="text-white/50 text-xs mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-white/30 text-xs relative z-10">© 2026 Braintam Learning. All Rights Reserved.</div>
      </div>

      {/* Right — profile form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-gray-50 min-h-screen lg:min-h-0">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: `${ORANGE}18` }}>🎓</div>
            <h2 className="font-black text-2xl" style={{ color: NAVY }}>
              {user?.firstName ? `Hi ${user.firstName}! 👋` : "Almost there! 👋"}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Tell us about yourself to personalise your feed</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone — required, no OTP */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>
                Mobile Number *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">+91</span>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="h-11 pl-[4.25rem] border-gray-200"
                  style={{ color: NAVY }}
                  inputMode="numeric"
                  maxLength={10}
                />
              </div>
              <p className="text-xs text-gray-400">For important class & test reminders</p>
            </div>

            {/* Grade */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>Grade *</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-11 border-gray-200" style={{ color: grade ? NAVY : "#9CA3AF" }}>
                  <SelectValue placeholder="Select your grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Board */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>Board *</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger className="h-11 border-gray-200" style={{ color: board ? NAVY : "#9CA3AF" }}>
                  <SelectValue placeholder="CBSE / ICSE / State Board…" />
                </SelectTrigger>
                <SelectContent>
                  {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>State / UT *</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-11 border-gray-200" style={{ color: state ? NAVY : "#9CA3AF" }}>
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {error && <p className="text-sm text-red-500 text-center">{error}</p>}

            <Button
              type="submit"
              disabled={!canSubmit || saving}
              className="w-full h-12 font-bold text-base rounded-xl text-white mt-2"
              style={{ background: canSubmit ? ORANGE : "#E5E7EB", color: canSubmit ? "white" : "#9CA3AF" }}
            >
              {saving ? "Saving…" : "Let's go 🚀"}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            You can update these details anytime from your profile.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
