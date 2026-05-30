import { useState, useRef } from "react";
import { motion } from "framer-motion";
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
import { User, Star, Trophy, BookOpen, CheckSquare, School, Mail, Pencil, Camera, Phone, MapPin, FileText, ClipboardList, Lock, X, Check, UserCheck } from "lucide-react";
import { STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY, useAuth } from "@/components/auth-provider";
import { PointsHub } from "@/components/points-hub";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Rajahmundry", "Kakinada"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Anand"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Dharamshala", "Baddi"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar"],
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli", "Belgaum", "Dharwad", "Tumkur", "Davangere"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Palakkad", "Kannur"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Rewa", "Sagar"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Navi Mumbai", "Kolhapur", "Pimpri-Chinchwad"],
  "Manipur": ["Imphal", "Thoubal", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei"],
  "Nagaland": ["Kohima", "Dimapur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer", "Bhilwara"],
  "Sikkim": ["Gangtok", "Namchi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Tripura": ["Agartala", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Ghaziabad", "Meerut", "Varanasi", "Allahabad", "Bareilly", "Noida", "Aligarh", "Moradabad", "Gorakhpur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Bardhaman"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi", "Dwarka", "Rohini", "Janakpuri"],
  "Chandigarh": ["Chandigarh"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Puducherry": ["Puducherry", "Karaikal"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Dadra and Nagar Haveli": ["Silvassa"],
  "Lakshadweep": ["Kavaratti"],
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

  const cancelEdit = () => {
    setEditing(false);
    setSaveError("");
  };

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
    } catch {
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const citiesForState = CITIES_BY_STATE[editState] ?? [];
  const initials = (p?.name ?? "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const statsCards = [
    { icon: Star, label: "Total Points", value: progress?.totalPoints ?? 0, color: "text-yellow-500 bg-yellow-50" },
    { icon: Trophy, label: "Overall Rank", value: `#${progress?.rank ?? "—"}`, color: "text-orange-500 bg-orange-50" },
    { icon: BookOpen, label: "Courses Done", value: progress?.coursesCompleted ?? 0, color: "text-green-500 bg-green-50" },
    { icon: CheckSquare, label: "Tests Attempted", value: progress?.testsAttempted ?? 0, color: "text-purple-500 bg-purple-50" },
    { icon: FileText, label: "Homework Done", value: (progress as any)?.homeworkCompleted ?? 0, color: "text-blue-500 bg-blue-50" },
    { icon: ClipboardList, label: "Assignments Done", value: (progress as any)?.assignmentsCompleted ?? 0, color: "text-pink-500 bg-pink-50" },
  ];

  const streak        = (student as any)?.streak ?? 0;
  const totalPoints   = progress?.totalPoints ?? (student as any)?.points ?? 0;
  const rankNum       = progress?.rank ?? (student as any)?.rank ?? null;

  const achievements = [
    ...(streak >= 1    ? [{ icon: "🔥", label: streak >= 7 ? `${streak} Day Streak!` : `${streak} Day Streak`, bg: "#fff7ed", border: "#fed7aa" }] : []),
    ...(totalPoints >= 50  ? [{ icon: "⭐", label: "Points Collector",    bg: "#fefce8", border: "#fde68a" }] : []),
    ...((progress?.testsAttempted ?? 0) > 0  ? [{ icon: "🏅", label: "First Quiz Done",     bg: "#f0fdf4", border: "#bbf7d0" }] : []),
    ...((progress?.coursesCompleted ?? 0) > 0 ? [{ icon: "🚀", label: "Course Explorer",     bg: "#eff6ff", border: "#bfdbfe" }] : []),
    ...((progress?.subjectWise?.length ?? 0) >= 2 ? [{ icon: "🧪", label: "Multi-Subject Learner", bg: "#faf5ff", border: "#e9d5ff" }] : []),
  ].slice(0, 6);

  return (
    <AppLayout>
      {/* Premium Navy Hero */}
      <div
        className="px-4 pt-6 pb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0A2342 0%,#123D7A 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl border-2 border-white/30 overflow-hidden" style={{ background: "linear-gradient(135deg,#1d4ed8,#0A2342)" }}>
              {p?.avatarUrl ? (
                <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">{initials}</span>
              )}
            </div>
          </div>
          {/* Name + grade */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-lg font-extrabold truncate">{p?.name ?? student?.name ?? "Student"}</h1>
            <p className="text-white/60 text-xs mt-0.5">Grade {p?.grade ?? student?.grade ?? "—"} · {p?.school || "Braintam Student"}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(212,175,55,0.25)", border: "1px solid rgba(212,175,55,0.4)", color: "#D4AF37" }}>
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
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-5" style={{ background: "#F8FAFC" }}>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Achievements</h2>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map(ach => (
                <div
                  key={ach.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border"
                  style={{ background: ach.bg, borderColor: ach.border }}
                >
                  <span className="text-xl">{ach.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 leading-tight">{ach.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription plan */}
        {(() => {
          const courses: { id: number; title: string }[] = (p as any)?.enrolledCourses ?? [];
          const subtitle = courses.length > 0
            ? courses.map(c => c.title).join(" · ")
            : "No courses enrolled yet";
          return (
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: "linear-gradient(135deg,#0A2342,#123D7A)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "rgba(212,175,55,0.2)" }}>👑</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Enrolled Courses</p>
                <p className="text-white/60 text-xs truncate">{subtitle}</p>
              </div>
              {courses.length > 0 && (
                <span className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: "#D4AF37", color: "#0A2342" }}>Active</span>
              )}
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-2">
              <CardContent className="p-6 space-y-5">
                {profileLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="w-20 h-20 rounded-full mx-auto" />
                    <Skeleton className="w-40 h-6 mx-auto" />
                    <Skeleton className="w-32 h-4 mx-auto" />
                  </div>
                ) : (
                  <>
                    {/* Avatar */}
                    <div className="text-center">
                      <div className="relative inline-block">
                        <div className="w-20 h-20 rounded-full mx-auto border-4 border-primary/20 overflow-hidden bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                          {p?.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" draggable={false} />
                          ) : (
                            <span className="text-white text-2xl font-bold select-none">{initials}</span>
                          )}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarBusy}
                          className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                          title="Change profile picture"
                        >
                          {avatarBusy
                            ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            : <Camera className="w-3.5 h-3.5 text-gray-500" />
                          }
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Tap camera to change photo</p>
                    </div>

                    {/* ── READ-ONLY VIEW ── */}
                    {!editing && (
                      <div className="space-y-3">
                        {/* Name row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Full Name</p>
                            <p className="font-bold text-base truncate" data-testid="profile-name">{p?.name ?? "—"}</p>
                          </div>
                          <button
                            onClick={openEdit}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                            title="Edit profile"
                            data-testid="edit-profile-btn"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>

                        <div className="h-px bg-gray-100" />

                        {/* Grade */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Grade</p>
                          <Badge variant="secondary">Grade {p?.grade ?? "—"}</Badge>
                        </div>

                        {/* Email — read-only */}
                        {p?.email && (
                          <div className="flex items-start gap-2.5">
                            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm truncate" data-testid="profile-email">{p.email}</p>
                            </div>
                            <Lock className="w-3.5 h-3.5 text-gray-300 mt-1 flex-shrink-0" />
                          </div>
                        )}

                        {/* Phone — read-only, always show if available */}
                        <div className="flex items-start gap-2.5">
                          <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="text-sm">{p?.phone ?? <span className="text-gray-400 italic">Not provided</span>}</p>
                          </div>
                          <Lock className="w-3.5 h-3.5 text-gray-300 mt-1 flex-shrink-0" />
                        </div>

                        {/* School */}
                        <div className="flex items-start gap-2.5">
                          <School className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">School</p>
                            <p className="text-sm" data-testid="profile-school">{p?.school || <span className="text-gray-400 italic">Not set</span>}</p>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm">
                              {[p?.city, p?.state].filter(Boolean).join(", ") || <span className="text-gray-400 italic">Not set</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── EDIT MODE ── */}
                    {editing && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">Editing Profile</p>

                        {/* Name */}
                        <div className="space-y-1">
                          <Label className="text-xs">Full Name *</Label>
                          <Input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Your full name"
                            data-testid="edit-name-input"
                          />
                        </div>

                        {/* School */}
                        <div className="space-y-1">
                          <Label className="text-xs">School Name</Label>
                          <Input
                            value={editSchool}
                            onChange={e => setEditSchool(e.target.value)}
                            placeholder="e.g. Delhi Public School"
                            data-testid="edit-school-input"
                          />
                        </div>

                        {/* State */}
                        <div className="space-y-1">
                          <Label className="text-xs">State</Label>
                          <Select
                            value={editState || "__none__"}
                            onValueChange={v => {
                              const val = v === "__none__" ? "" : v;
                              setEditState(val);
                              setEditCity("");
                            }}
                          >
                            <SelectTrigger data-testid="edit-state-select">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                              <SelectItem value="__none__">— Select State —</SelectItem>
                              {INDIAN_STATES.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* City */}
                        <div className="space-y-1">
                          <Label className="text-xs">City</Label>
                          {citiesForState.length > 0 ? (
                            <Select
                              value={editCity || "__none__"}
                              onValueChange={v => setEditCity(v === "__none__" ? "" : v)}
                            >
                              <SelectTrigger data-testid="edit-city-select">
                                <SelectValue placeholder="Select City" />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                <SelectItem value="__none__">— Select City —</SelectItem>
                                {citiesForState.map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={editCity}
                              onChange={e => setEditCity(e.target.value)}
                              placeholder={editState ? "Enter city name" : "Select state first"}
                              disabled={!editState}
                              data-testid="edit-city-input"
                            />
                          )}
                        </div>

                        {/* Email — always locked */}
                        {p?.email && (
                          <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 truncate flex-1">{p.email}</span>
                            <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />
                          </div>
                        )}

                        {/* Phone — editable only if not yet set */}
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            Phone Number
                            {p?.phone && <Lock className="w-3 h-3 text-gray-300" />}
                          </Label>
                          {p?.phone ? (
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-2.5 flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-600 flex-1">{p.phone}</span>
                              <span className="text-xs text-gray-400 italic">Cannot be changed</span>
                            </div>
                          ) : (
                            <div className="relative">
                              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <Input
                                value={editPhone}
                                onChange={e => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile number"
                                className="pl-8"
                                maxLength={10}
                                inputMode="numeric"
                              />
                            </div>
                          )}
                        </div>

                        {saveError && <p className="text-xs text-red-500">{saveError}</p>}

                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={handleUpdate}
                            disabled={saveBusy || !editName.trim()}
                            className="flex-1"
                            data-testid="save-profile-btn"
                          >
                            {saveBusy
                              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : <><Check className="w-3.5 h-3.5 mr-1" /> Save</>
                            }
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saveBusy} className="flex-1">
                            <X className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats & Progress */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statsCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div>
                        {progressLoading ? <Skeleton className="w-12 h-5" /> : (
                          <div className="text-xl font-bold" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>{s.value}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subject Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {progressLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-6" />)
                ) : (
                  (progress?.subjectWise ?? []).map((sp) => (
                    <div key={sp.subjectId} data-testid={`progress-${sp.subjectId}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{sp.subjectName}</span>
                        <span className="text-muted-foreground">{Math.round(sp.progress)}%</span>
                      </div>
                      <Progress value={sp.progress} className="h-2" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Know Your Personal Teacher */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-2 border-dashed border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#0A2342,#123D7A)" }}
                >
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800">Know Your Personal Teacher</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your dedicated mentor &amp; guide</p>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "#FFF3E0", color: "#FF6B1A" }}
                >
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Your assigned mentor teacher details will appear here once configured by the admin. They'll guide you through your learning journey.
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
