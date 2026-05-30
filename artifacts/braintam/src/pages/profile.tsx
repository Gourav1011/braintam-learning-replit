import { useState, useRef } from "react";
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
  UserCheck, ChevronDown, ChevronUp,
} from "lucide-react";
import { STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY, useAuth } from "@/components/auth-provider";
import { PointsHub } from "@/components/points-hub";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
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
        resolve(canvas.toDataURL("image/jpeg", 0.82));
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useGetStudentProfile({
    query: { queryKey: getGetStudentProfileQueryKey(), enabled: !!student }
  });
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress({
    query: { queryKey: getGetStudentProgressQueryKey(), enabled: !!student }
  });

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

  const achievements = [
    ...(streak >= 1    ? [{ icon: "🔥", label: streak >= 7 ? `${streak} Day Streak!` : `${streak} Day Streak`, bg: "#fff7ed", border: "#fed7aa" }] : []),
    ...(totalPoints >= 50  ? [{ icon: "⭐", label: "Points Collector",    bg: "#fefce8", border: "#fde68a" }] : []),
    ...((progress?.testsAttempted ?? 0) > 0  ? [{ icon: "🏅", label: "First Quiz Done",     bg: "#f0fdf4", border: "#bbf7d0" }] : []),
    ...((progress?.coursesCompleted ?? 0) > 0 ? [{ icon: "🚀", label: "Course Explorer",     bg: "#eff6ff", border: "#bfdbfe" }] : []),
    ...((progress?.subjectWise?.length ?? 0) >= 2 ? [{ icon: "🧪", label: "Multi-Subject Learner", bg: "#faf5ff", border: "#e9d5ff" }] : []),
  ].slice(0, 6);

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
      <div className="p-4 max-w-2xl mx-auto space-y-5" style={{ background: "#F8FAFC" }}>

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

        {/* Achievements */}
        {achievements.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Achievements</h2>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map(ach => (
                <div key={ach.label} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border"
                  style={{ background: ach.bg, borderColor: ach.border }}>
                  <span className="text-xl">{ach.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{ach.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Know Your Personal Teacher */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-2 border-dashed border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg,${NAVY},#123D7A)` }}>
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800">Know Your Personal Teacher</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your dedicated mentor &amp; guide</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "#FFF3E0", color: ORANGE }}>
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Your assigned mentor teacher details will appear here once configured by the admin.
              </p>
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
    </AppLayout>
  );
}
