import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetStudentProfile, useGetStudentProgress, getGetStudentProfileQueryKey, getGetStudentProgressQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  User, Star, Trophy, BookOpen, CheckSquare, School, Mail, Pencil,
  Camera, Phone, MapPin, FileText, ClipboardList, Lock, X, Check,
  UserCheck, ChevronDown, ChevronUp, Zap, ChevronRight,
} from "lucide-react";
import { STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY, useAuth } from "@/components/auth-provider";
import { PointsHub } from "@/components/points-hub";

import { API_BASE as BASE } from "@/lib/api-base";
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(STAFF_TOKEN_KEY) ?? localStorage.getItem(STUDENT_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function patchProfile(data: Record<string, unknown>) {
  return fetch(`${BASE}/api/student/profile`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
}

function resizeImageToBase64(file: File, maxPx = 120): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        canvas.width = maxPx;
        canvas.height = maxPx;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxPx, maxPx);
        // Iteratively compress until ≤ 10 KB (~13 700 base64 chars)
        let quality = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > 13_700 && quality > 0.05) {
          quality = Math.round((quality - 0.1) * 10) / 10;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Chandigarh", "Jammu and Kashmir", "Ladakh", "Puducherry",
  "Andaman and Nicobar Islands", "Dadra and Nagar Haveli", "Lakshadweep",
];

const CITIES_BY_STATE: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Dharamshala"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Navi Mumbai"],
  "Manipur": ["Imphal"],
  "Meghalaya": ["Shillong", "Tura"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  "Tripura": ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Ghaziabad", "Meerut", "Varanasi", "Noida", "Gorakhpur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini"],
  "Chandigarh": ["Chandigarh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"],
  "Ladakh": ["Leh", "Kargil"],
  "Puducherry": ["Puducherry"],
};

export default function ProfilePage() {
  const { student } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [selectedBadgeIdx, setSelectedBadgeIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useGetStudentProfile({
    query: { queryKey: getGetStudentProfileQueryKey(), enabled: !!student }
  });
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress({
    query: { queryKey: getGetStudentProgressQueryKey(), enabled: !!student }
  });

  const [myMentor, setMyMentor] = useState<{ id: number; name: string; phone: string | null; email: string } | null | "loading">("loading");

  useEffect(() => {
    if (!student) return;
    fetch(`${BASE}/api/student/my-mentor`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => setMyMentor(data))
      .catch(() => setMyMentor(null));
  }, [student]);

  const p = profile as any;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStudentProgressQueryKey() });
  }

  const openEdit = () => {
    setEditName(p?.name ?? "");
    setEditSchool(p?.school ?? "");
    setEditState(p?.state ?? "");
    setEditCity(p?.city ?? "");
    setEditPhone(p?.phone ?? "");
    setSaveError("");
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setSaveError(""); };

  const handleUpdate = async () => {
    if (!editName.trim()) return;
    setSaveBusy(true);
    setSaveError("");
    try {
      const r = await patchProfile({
        name: editName.trim(),
        school: editSchool,
        state: editState,
        city: editCity,
        ...(!p?.phone && editPhone.trim() ? { phone: editPhone.trim() } : {}),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update");
      }
      invalidate();
      setEditing(false);
    } catch (e: any) {
      setSaveError(e.message ?? "Failed to save");
    } finally {
      setSaveBusy(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageToBase64(file, 120);
      const r = await patchProfile({ avatarUrl: dataUrl });
      if (!r.ok) throw new Error("Upload failed");
      invalidate();
    } catch { /* silent */ } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const citiesForState = CITIES_BY_STATE[editState] ?? [];
  const initials = (p?.name ?? student?.name ?? "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
  const totalPoints = progress?.totalPoints ?? (student as any)?.points ?? 0;
  const rankNum     = progress?.rank ?? (student as any)?.rank ?? null;
  const streak      = (student as any)?.streak ?? 0;

  const enrolledCourses: { id: number; title: string }[] = p?.enrolledCourses ?? [];

  const fmt = (done: number | undefined, total: number | undefined) => {
    const d = done ?? 0;
    const t = total ?? 0;
    return t > 0 ? `${d}/${t}` : `${d}`;
  };

  const statsCards = [
    { icon: Star,          label: "Total Points",      value: progress?.totalPoints ?? 0,                                                            color: "text-yellow-500 bg-yellow-50" },
    { icon: Trophy,        label: "Overall Rank",       value: `#${progress?.rank ?? "—"}`,                                                          color: "text-orange-500 bg-orange-50" },
    { icon: CheckSquare,   label: "Tests Done",         value: fmt(progress?.testsAttempted, progress?.testsTotal),                                   color: "text-purple-500 bg-purple-50" },
    { icon: FileText,      label: "Homework Done",      value: fmt(progress?.homeworkSubmitted, progress?.homeworkTotal),                             color: "text-blue-500 bg-blue-50" },
    { icon: ClipboardList, label: "Assignments Done",   value: fmt(progress?.assignmentsSubmitted, progress?.assignmentsTotal),                       color: "text-pink-500 bg-pink-50" },
    { icon: BookOpen,      label: "Avg Score",          value: progress?.averageScore !== undefined ? `${Math.round(progress.averageScore)}%` : "—",  color: "text-green-500 bg-green-50" },
  ];

  const allAchievements = [
    {
      icon: "🔥", label: "3-Day Streak", unlocked: streak >= 3,
      bg: "#fff7ed", border: "#fed7aa", glowColor: "#fb923c",
      description: "Login and learn for 3 days in a row without breaking your streak.",
      requirement: `Maintain a 3-day learning streak (current: ${streak} days)`,
      reward: "+15 Bonus XP", rewardXP: 15,
      progress: Math.min(100, Math.round((streak / 3) * 100)),
      progressText: `${Math.min(streak, 3)}/3 days`,
    },
    {
      icon: "🔥", label: "7-Day Streak", unlocked: streak >= 7,
      bg: "#fff7ed", border: "#fed7aa", glowColor: "#ef4444",
      description: "A whole week of consistent learning — you're on fire!",
      requirement: `Maintain a 7-day learning streak (current: ${streak} days)`,
      reward: "+20 Bonus XP", rewardXP: 20,
      progress: Math.min(100, Math.round((streak / 7) * 100)),
      progressText: `${Math.min(streak, 7)}/7 days`,
    },
    {
      icon: "⭐", label: "Points Collector", unlocked: totalPoints >= 50,
      bg: "#fefce8", border: "#fde68a", glowColor: "#eab308",
      description: "You've collected your first real XP by completing activities on Braintam.",
      requirement: `Earn 50 total XP (current: ${totalPoints} XP)`,
      reward: "+10 Bonus XP", rewardXP: 10,
      progress: Math.min(100, Math.round((totalPoints / 50) * 100)),
      progressText: `${Math.min(totalPoints, 50)}/50 XP`,
    },
    {
      icon: "💎", label: "XP Pro (200+)", unlocked: totalPoints >= 200,
      bg: "#f0f9ff", border: "#bae6fd", glowColor: "#3b82f6",
      description: "You've proven yourself as a dedicated learner with 200+ XP earned.",
      requirement: `Earn 200 total XP (current: ${totalPoints} XP)`,
      reward: "+25 Bonus XP", rewardXP: 25,
      progress: Math.min(100, Math.round((totalPoints / 200) * 100)),
      progressText: `${Math.min(totalPoints, 200)}/200 XP`,
    },
    {
      icon: "🏅", label: "First Quiz Done", unlocked: (progress?.testsAttempted ?? 0) > 0,
      bg: "#f0fdf4", border: "#bbf7d0", glowColor: "#22c55e",
      description: "You took the leap! Completing your first test shows real courage.",
      requirement: `Attempt at least 1 test (completed: ${progress?.testsAttempted ?? 0})`,
      reward: "+15 Bonus XP", rewardXP: 15,
      progress: (progress?.testsAttempted ?? 0) > 0 ? 100 : 0,
      progressText: `${progress?.testsAttempted ?? 0}/1 tests`,
    },
    {
      icon: "🚀", label: "Course Explorer", unlocked: (progress?.coursesCompleted ?? 0) > 0,
      bg: "#eff6ff", border: "#bfdbfe", glowColor: "#6366f1",
      description: "You've completed your first full course — the universe is your playground!",
      requirement: `Complete at least 1 course (completed: ${progress?.coursesCompleted ?? 0})`,
      reward: "+50 Bonus XP", rewardXP: 50,
      progress: (progress?.coursesCompleted ?? 0) > 0 ? 100 : 0,
      progressText: `${progress?.coursesCompleted ?? 0}/1 courses`,
    },
    {
      icon: "🧪", label: "Multi-Subject Learner", unlocked: (progress?.subjectWise?.length ?? 0) >= 2,
      bg: "#faf5ff", border: "#e9d5ff", glowColor: "#8b5cf6",
      description: "Learning across multiple subjects shows true academic curiosity!",
      requirement: `Study at least 2 subjects (current: ${progress?.subjectWise?.length ?? 0})`,
      reward: "+20 Bonus XP", rewardXP: 20,
      progress: Math.min(100, Math.round(((progress?.subjectWise?.length ?? 0) / 2) * 100)),
      progressText: `${progress?.subjectWise?.length ?? 0}/2 subjects`,
    },
    {
      icon: "🏆", label: "Top 5 Learner", unlocked: !!rankNum && rankNum <= 5,
      bg: "#fefce8", border: "#fde68a", glowColor: "#f59e0b",
      description: "You're in the top 5 on your grade's leaderboard — absolutely elite!",
      requirement: `Reach rank #5 or higher (current rank: ${rankNum ? `#${rankNum}` : "unranked"})`,
      reward: "+100 Bonus XP", rewardXP: 100,
      progress: rankNum ? Math.min(100, Math.round(((10 - Math.min(rankNum, 10)) / 5) * 100)) : 0,
      progressText: rankNum ? `Rank #${rankNum}` : "Not yet ranked",
    },
    {
      icon: "🌍", label: "Earth Explorer", unlocked: totalPoints >= 0,
      bg: "#f0fdf4", border: "#86efac", glowColor: "#22c55e",
      description: "You began your Braintam Space Journey! Every champion starts on Earth.",
      requirement: "Create your account and start learning",
      reward: "🎖 Explorer Badge", rewardXP: 0,
      progress: 100,
      progressText: "Completed!",
    },
    {
      icon: "🌙", label: "Moon Explorer", unlocked: totalPoints >= 100,
      bg: "#f8fafc", border: "#cbd5e1", glowColor: "#94a3b8",
      description: "Reach 100 XP to launch from Earth and land on the Moon!",
      requirement: `Earn 100 XP (current: ${totalPoints} XP)`,
      reward: "🌙 Moon Badge", rewardXP: 30,
      progress: Math.min(100, Math.round((totalPoints / 100) * 100)),
      progressText: `${Math.min(totalPoints, 100)}/100 XP`,
    },
    {
      icon: "🔴", label: "Mars Explorer", unlocked: totalPoints >= 300,
      bg: "#fff1f2", border: "#fecdd3", glowColor: "#ef4444",
      description: "Conquer Mars by earning 300 XP — you're a true space explorer!",
      requirement: `Earn 300 XP (current: ${totalPoints} XP)`,
      reward: "🔴 Mars Badge", rewardXP: 50,
      progress: Math.min(100, Math.round((totalPoints / 300) * 100)),
      progressText: `${Math.min(totalPoints, 300)}/300 XP`,
    },
    {
      icon: "🪐", label: "Saturn Explorer", unlocked: totalPoints >= 600,
      bg: "#fffbeb", border: "#fde68a", glowColor: "#f59e0b",
      description: "Reach Saturn's rings at 600 XP — you're among the greats!",
      requirement: `Earn 600 XP (current: ${totalPoints} XP)`,
      reward: "🪐 Saturn Ring", rewardXP: 100,
      progress: Math.min(100, Math.round((totalPoints / 600) * 100)),
      progressText: `${Math.min(totalPoints, 600)}/600 XP`,
    },
  ];

  return (
    <AppLayout>
      {/* ── Hero: Full student profile at top ── */}
      <div
        className="px-4 pt-5 pb-5 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #123D7A 100%)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative">
          {/* Top row: Avatar + Name + Edit button */}
          <div className="flex items-start gap-4">
            {/* Avatar with camera */}
            <div className="relative flex-shrink-0">
              <div className="w-18 h-18 w-[72px] h-[72px] rounded-2xl border-2 border-white/30 overflow-hidden"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#0A2342)" }}>
                {profileLoading ? (
                  <div className="w-full h-full bg-white/10 animate-pulse" />
                ) : p?.avatarUrl ? (
                  <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Change photo"
              >
                {avatarBusy
                  ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5 text-gray-600" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + grade + edit button */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {profileLoading
                    ? <div className="h-6 w-36 bg-white/20 rounded animate-pulse mb-1" />
                    : <h1 className="text-white text-xl font-extrabold leading-tight truncate" data-testid="profile-name">
                        {p?.name ?? student?.name ?? "Student"}
                      </h1>
                  }
                  <p className="text-white/60 text-xs mt-0.5">
                    Grade {p?.grade ?? student?.grade ?? "—"} · {p?.school || "Braintam Student"}
                  </p>
                </div>
                <button
                  onClick={editing ? cancelEdit : openEdit}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 transition-all"
                  style={editing
                    ? { background: "rgba(255,255,255,0.15)", color: "white" }
                    : { background: ORANGE, color: "white" }}
                  data-testid="edit-profile-btn"
                >
                  {editing ? <><X className="w-3 h-3" /> Cancel</> : <><Pencil className="w-3 h-3" /> Edit Profile</>}
                </button>
              </div>

              {/* Points / Streak / Rank */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(212,175,55,0.25)", border: "1px solid rgba(212,175,55,0.4)", color: "#D4AF37" }}>
                  🪙 {totalPoints} pts
                </span>
                {streak > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>
                    🔥 {streak}d streak
                  </span>
                )}
                {rankNum && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>
                    🏆 Rank #{rankNum}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
            {p?.email && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
                <span className="truncate" data-testid="profile-email">{p.email}</span>
                <Lock className="w-3 h-3 text-white/30 flex-shrink-0" />
              </div>
            )}
            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Phone className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
              {p?.phone
                ? <span>{p.phone}</span>
                : <span className="italic text-white/40">Phone not set</span>}
            </div>
            {p?.school && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <School className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
                <span className="truncate" data-testid="profile-school">{p.school}</span>
              </div>
            )}
            {(p?.city || p?.state) && (
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
                <span className="truncate">{[p.city, p.state].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Inline Edit Form ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="bg-white border-b border-gray-200 px-4 py-4 space-y-3 max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: NAVY }}>Edit Profile</p>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Name */}
                <div className="space-y-1">
                  <Label className="text-xs">Full Name *</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)}
                    placeholder="Your full name" data-testid="edit-name-input" />
                </div>

                {/* School */}
                <div className="space-y-1">
                  <Label className="text-xs">School Name</Label>
                  <Input value={editSchool} onChange={e => setEditSchool(e.target.value)}
                    placeholder="e.g. Delhi Public School" data-testid="edit-school-input" />
                </div>

                {/* State */}
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Select value={editState || "__none__"} onValueChange={v => { setEditState(v === "__none__" ? "" : v); setEditCity(""); }}>
                    <SelectTrigger data-testid="edit-state-select"><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="__none__">— Select State —</SelectItem>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  {citiesForState.length > 0 ? (
                    <Select value={editCity || "__none__"} onValueChange={v => setEditCity(v === "__none__" ? "" : v)}>
                      <SelectTrigger data-testid="edit-city-select"><SelectValue placeholder="Select City" /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="__none__">— Select City —</SelectItem>
                        {citiesForState.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={editCity} onChange={e => setEditCity(e.target.value)}
                      placeholder={editState ? "Enter city name" : "Select state first"}
                      disabled={!editState} data-testid="edit-city-input" />
                  )}
                </div>
              </div>

              {/* Email — locked */}
              {p?.email && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 truncate flex-1">{p.email}</span>
                  <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                </div>
              )}

              {/* Phone */}
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  Phone Number {p?.phone && <Lock className="w-3 h-3 text-gray-300" />}
                </Label>
                {p?.phone ? (
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-600 flex-1">{p.phone}</span>
                    <span className="text-xs text-gray-400 italic">Cannot be changed</span>
                  </div>
                ) : (
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input value={editPhone}
                      onChange={e => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number" className="pl-8" maxLength={10} inputMode="numeric" />
                  </div>
                )}
              </div>

              {saveError && <p className="text-xs text-red-500">{saveError}</p>}

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleUpdate} disabled={saveBusy || !editName.trim()}
                  className="flex-1" data-testid="save-profile-btn"
                  style={{ background: NAVY, color: "white" }}>
                  {saveBusy
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><Check className="w-3.5 h-3.5 mr-1" /> Save Changes</>}
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saveBusy} className="flex-1">
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className="p-4 md:p-6 md:max-w-5xl md:mx-auto space-y-5" style={{ background: "#F8FAFC" }}>

        {/* Enrolled Courses */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${NAVY}, #123D7A)` }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "rgba(212,175,55,0.2)" }}>👑</div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Enrolled Courses</p>
            {profileLoading
              ? <div className="h-3 w-40 bg-white/20 rounded animate-pulse mt-1" />
              : <p className="text-white/60 text-xs mt-0.5 line-clamp-2">
                  {enrolledCourses.length > 0
                    ? enrolledCourses.map(c => c.title).join(" · ")
                    : "No courses enrolled yet"}
                </p>
            }
          </div>
          {enrolledCourses.length > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
              style={{ background: "#D4AF37", color: NAVY }}>
              {enrolledCourses.length} Active
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {statsCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i }}>
              <Card>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    {progressLoading
                      ? <Skeleton className="w-10 h-5 mb-0.5" />
                      : <div className="text-xl font-bold" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>{s.value}</div>
                    }
                    <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Two-column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left column: score + subject progress */}
          <div className="space-y-5">
            {/* Average score */}
            {!progressLoading && progress?.averageScore !== undefined && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold">Average Test Score</span>
                    <span className="font-bold text-primary">{Math.round(progress.averageScore)}%</span>
                  </div>
                  <Progress value={progress.averageScore} className="h-3" />
                </CardContent>
              </Card>
            )}

            {/* Subject Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subject Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progressLoading
                  ? [...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-6" />)
                  : (progress?.subjectWise ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-3">No subject data yet</p>
                    : (progress?.subjectWise ?? []).map(sp => (
                        <div key={sp.subjectId} data-testid={`progress-${sp.subjectId}`}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{sp.subjectName}</span>
                            <span className="text-muted-foreground">{Math.round(sp.progress)}%</span>
                          </div>
                          <Progress value={sp.progress} className="h-2" />
                        </div>
                      ))
                }
              </CardContent>
            </Card>
          </div>

          {/* Right column: achievements + teacher + points hub */}
          <div className="space-y-5">
            {/* Achievement Gallery */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">🏅 Achievement Gallery</h2>
                  <p className="text-[10px] text-gray-400 mt-0.5">Tap a badge to learn more</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                  style={{ background: "rgba(11,43,107,0.08)", color: NAVY }}>
                  {allAchievements.filter(a => a.unlocked).length}/{allAchievements.length} earned
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {allAchievements.map((ach, idx) => (
                  <motion.button
                    key={ach.label}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedBadgeIdx(selectedBadgeIdx === idx ? null : idx)}
                    className="relative flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border text-center cursor-pointer transition-all"
                    style={{
                      background: ach.unlocked ? ach.bg : "#f9f9f9",
                      borderColor: selectedBadgeIdx === idx ? ach.glowColor : ach.unlocked ? ach.border : "#e5e7eb",
                      boxShadow: selectedBadgeIdx === idx ? `0 0 12px ${ach.glowColor}55` : ach.unlocked ? `0 2px 8px ${ach.glowColor}22` : "none",
                    }}
                    data-testid={`badge-${ach.label.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <span className={`text-2xl leading-none ${ach.unlocked ? "" : "grayscale opacity-40"}`}>
                      {ach.icon}
                    </span>
                    <span className={`text-[10px] font-bold leading-tight ${ach.unlocked ? "text-gray-700" : "text-gray-400"}`}>
                      {ach.label}
                    </span>
                    {ach.unlocked ? (
                      <span className="absolute top-1 right-1.5 text-[8px] font-black text-green-600 bg-green-100 rounded-full px-1">✓</span>
                    ) : (
                      <div className="w-full px-1">
                        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-orange-400" style={{ width: `${ach.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Badge detail panel */}
              <AnimatePresence>
                {selectedBadgeIdx !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 rounded-3xl border p-4 relative"
                    style={{
                      background: allAchievements[selectedBadgeIdx].unlocked
                        ? allAchievements[selectedBadgeIdx].bg
                        : "#f9f9f9",
                      borderColor: allAchievements[selectedBadgeIdx].glowColor + "66",
                      boxShadow: `0 4px 20px ${allAchievements[selectedBadgeIdx].glowColor}22`,
                    }}
                  >
                    <button
                      onClick={() => setSelectedBadgeIdx(null)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-600" />
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                        style={{ background: allAchievements[selectedBadgeIdx].border + "66" }}>
                        {allAchievements[selectedBadgeIdx].unlocked
                          ? allAchievements[selectedBadgeIdx].icon
                          : <span className="grayscale opacity-50">{allAchievements[selectedBadgeIdx].icon}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-gray-800">{allAchievements[selectedBadgeIdx].label}</h3>
                          {allAchievements[selectedBadgeIdx].unlocked ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Earned</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">🔒 Locked</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{allAchievements[selectedBadgeIdx].description}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="font-bold text-gray-400 flex-shrink-0">Requirement:</span>
                        <span>{allAchievements[selectedBadgeIdx].requirement}</span>
                      </div>
                      {!allAchievements[selectedBadgeIdx].unlocked && (
                        <div>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Progress</span>
                            <span className="font-bold">{allAchievements[selectedBadgeIdx].progressText}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${allAchievements[selectedBadgeIdx].progress}%` }}
                              transition={{ duration: 0.6 }}
                              style={{ background: `linear-gradient(90deg, ${allAchievements[selectedBadgeIdx].glowColor}, ${allAchievements[selectedBadgeIdx].glowColor}99)` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs font-bold" style={{ color: "#ca8a04" }}>Reward: {allAchievements[selectedBadgeIdx].reward}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Know Your Mentor */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border-2 border-blue-100 overflow-hidden">
                <CardContent className="p-0">
                  {/* Header strip */}
                  <div className="flex items-center gap-3 px-4 py-3"
                    style={{ background: `linear-gradient(135deg,${NAVY},#1A3F8A)` }}>
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">Know Your Mentor</p>
                      <p className="text-[11px] text-blue-200">Your dedicated guide &amp; support</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3">
                    {myMentor === "loading" ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                        </div>
                      </div>
                    ) : myMentor === null ? (
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "#F3F4F6" }}>
                          <UserCheck className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-400">No mentor assigned yet</p>
                          <p className="text-xs text-gray-400 mt-0.5">Your admin will assign one soon</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {/* Avatar circle with initial */}
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-lg"
                          style={{ background: `linear-gradient(135deg,${ORANGE},#e85d04)` }}>
                          {myMentor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-800 truncate">{myMentor.name}</p>
                          {myMentor.phone ? (
                            <a href={`tel:${myMentor.phone}`}
                              className="flex items-center gap-1 mt-1 group">
                              <Phone className="w-3 h-3 flex-shrink-0" style={{ color: NAVY }} />
                              <span className="text-xs font-semibold group-hover:underline" style={{ color: NAVY }}>
                                {myMentor.phone}
                              </span>
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">No contact number added</p>
                          )}
                          {myMentor.email && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{myMentor.email}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{ background: "#ECFDF5", color: "#059669" }}>
                            Active
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Points Hub */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <PointsHub
                data={{
                  totalPoints:       progress?.totalPoints ?? student?.points ?? 0,
                  rank:              progress?.rank        ?? student?.rank  ?? null,
                  streakDays:        student?.streak       ?? 0,
                  dailyLoginClaimed: (p as any)?.dailyLoginClaimed ?? false,
                }}
                isLoading={progressLoading}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
