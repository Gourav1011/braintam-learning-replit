import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import braintamLogo from "@assets/imresizer-Gemini_Generated_Image_40tk9140tk9140tk-removebg-pre_1779898987915.png";
import { SIGNUP_PROFILE_KEY, GRADES, BOARDS, STATES } from "@/pages/sign-up";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function OnboardingPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.fullName ?? user?.firstName ?? "");
  const [grade, setGrade] = useState("");
  const [state, setState] = useState("");
  const [board, setBoard] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = name.trim() && grade && state && board;

  async function saveProfile(n: string, g: number, s: string, b: string) {
    const res = await fetch(`${BASE}/api/student/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, grade: g, state: s, board: b }),
    });
    if (!res.ok) throw new Error("Failed to save");
  }

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SIGNUP_PROFILE_KEY);
      if (stored) {
        const d = JSON.parse(stored);
        if (d.name && d.grade && d.state && d.board) {
          sessionStorage.removeItem(SIGNUP_PROFILE_KEY);
          setAutoSaving(true);
          saveProfile(d.name, Number(d.grade), d.state, d.board)
            .then(() => setLocation("/dashboard"))
            .catch(() => {
              setAutoSaving(false);
              setName(d.name || (user?.fullName ?? ""));
              setGrade(d.grade || "");
              setState(d.state || "");
              setBoard(d.board || "");
            });
          return;
        }
        if (d.name) setName(d.name);
        if (d.grade) setGrade(d.grade);
        if (d.state) setState(d.state);
        if (d.board) setBoard(d.board);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await saveProfile(name.trim(), Number(grade), state, board);
      sessionStorage.removeItem(SIGNUP_PROFILE_KEY);
      setLocation("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (autoSaving) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F9FAFB" }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto animate-pulse"
            style={{ background: `${ORANGE}20` }}>
            <img src={braintamLogo} alt="" className="w-10 h-10 object-contain" />
          </div>
          <p className="font-semibold" style={{ color: NAVY }}>Setting up your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 60%, #0d2260 100%)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "#3b5fc0" }} />
        <div className="relative z-10">
          <img src={braintamLogo} alt="Braintam" className="w-72 h-auto object-contain" />
        </div>
        <div className="space-y-6 relative z-10">
          <div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              Just one step<br />
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
        <div className="text-white/30 text-xs relative z-10">© 2025 Braintam Learning. All Rights Reserved.</div>
      </div>

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
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: `${ORANGE}18` }}>🎓</div>
            <h2 className="font-black text-2xl" style={{ color: NAVY }}>Complete your profile</h2>
            <p className="text-gray-500 text-sm mt-1">Help us personalise your experience</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>Full Name</Label>
              <Input
                placeholder="e.g. Arjun Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="h-11 border-gray-200 focus-visible:ring-orange-500"
                style={{ color: NAVY }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-11 border-gray-200" style={{ color: grade ? NAVY : "#9CA3AF" }}>
                  <SelectValue placeholder="Select your grade" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>State / UT</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-11 border-gray-200" style={{ color: state ? NAVY : "#9CA3AF" }}>
                  <SelectValue placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm" style={{ color: NAVY }}>Board</Label>
              <Select value={board} onValueChange={setBoard}>
                <SelectTrigger className="h-11 border-gray-200" style={{ color: board ? NAVY : "#9CA3AF" }}>
                  <SelectValue placeholder="Select your board" />
                </SelectTrigger>
                <SelectContent>
                  {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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
              {saving ? "Saving…" : "Let's go →"}
            </Button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-6">
            You can update these details anytime from your profile.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
