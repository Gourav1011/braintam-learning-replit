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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { User, Star, Trophy, BookOpen, CheckSquare, School, Mail, Edit, Camera } from "lucide-react";
import { STUDENT_TOKEN_KEY, STAFF_TOKEN_KEY } from "@/components/auth-provider";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);

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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSchool, setEditSchool] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useGetStudentProfile();
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStudentProgressQueryKey() });
  }

  const openEdit = () => {
    setEditName(profile?.name ?? "");
    setEditSchool(profile?.school ?? "");
    setEditGrade(String(profile?.grade ?? "6"));
    setSaveError("");
    setEditing(true);
  };

  const handleUpdate = async () => {
    if (!editName.trim()) return;
    setSaveBusy(true);
    setSaveError("");
    try {
      const r = await patchProfile({ name: editName.trim(), school: editSchool, grade: Number(editGrade) });
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
      // silent — avatar just stays as initials
    } finally {
      setAvatarBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initials = (profile?.name ?? "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const statsCards = [
    { icon: Star, label: "Total Points", value: progress?.totalPoints ?? 0, color: "text-yellow-500 bg-yellow-50" },
    { icon: Trophy, label: "Rank", value: `#${progress?.rank ?? "—"}`, color: "text-orange-500 bg-orange-50" },
    { icon: BookOpen, label: "Courses Done", value: progress?.coursesCompleted ?? 0, color: "text-green-500 bg-green-50" },
    { icon: CheckSquare, label: "Tests Attempted", value: progress?.testsAttempted ?? 0, color: "text-purple-500 bg-purple-50" },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            My Profile
          </h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="border-2">
              <CardContent className="p-6 space-y-5">
                {profileLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="w-20 h-20 rounded-full mx-auto" />
                    <Skeleton className="w-40 h-6 mx-auto" />
                  </div>
                ) : (
                  <>
                    {/* Avatar with upload button */}
                    <div className="text-center">
                      <div className="relative inline-block">
                        {/* Avatar: fixed size, object-cover, no zoom */}
                        <div className="w-20 h-20 rounded-full mx-auto border-4 border-primary/20 overflow-hidden bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                          {profile?.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={profile.name}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <span className="text-white text-2xl font-bold select-none">{initials}</span>
                          )}
                        </div>
                        {/* Camera upload button */}
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Click the camera icon to change photo</p>
                      <h2 className="text-xl font-bold mt-3" data-testid="profile-name">{profile?.name}</h2>
                      <Badge variant="secondary" className="mt-1">Grade {profile?.grade}</Badge>
                    </div>

                    <div className="space-y-3 text-sm">
                      {profile?.email && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate" data-testid="profile-email">{profile.email}</span>
                        </div>
                      )}
                      {profile?.school && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <School className="w-4 h-4 flex-shrink-0" />
                          <span data-testid="profile-school">{profile.school}</span>
                        </div>
                      )}
                    </div>

                    <Button className="w-full" variant="outline" onClick={openEdit} data-testid="edit-profile-btn">
                      <Edit className="w-4 h-4 mr-2" /> Edit Profile
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats & Progress */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {statsCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                        <s.icon className="w-6 h-6" />
                      </div>
                      <div>
                        {progressLoading ? <Skeleton className="w-16 h-6" /> : (
                          <div className="text-2xl font-bold" data-testid={`stat-${s.label.toLowerCase().replace(/ /g, "-")}`}>{s.value}</div>
                        )}
                        <div className="text-xs text-muted-foreground">{s.label}</div>
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

        {/* Edit Dialog */}
        <Dialog open={editing} onOpenChange={setEditing}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="mt-1"
                  data-testid="edit-name-input"
                />
              </div>
              <div>
                <Label htmlFor="edit-school">School Name</Label>
                <Input
                  id="edit-school"
                  value={editSchool}
                  onChange={e => setEditSchool(e.target.value)}
                  placeholder="Your school name"
                  className="mt-1"
                  data-testid="edit-school-input"
                />
              </div>
              <div>
                <Label>Grade</Label>
                <Select value={editGrade} onValueChange={setEditGrade}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => (
                      <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button
                onClick={handleUpdate}
                disabled={saveBusy || !editName.trim()}
                data-testid="save-profile-btn"
              >
                {saveBusy ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
