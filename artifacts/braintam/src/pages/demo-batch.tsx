import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Video, BookOpen, ChevronLeft, ExternalLink, Play } from "lucide-react";
import { useLocation } from "wouter";

import { API_BASE as BASE } from "@/lib/api-base";

interface DemoBatch {
  id: number; title: string; description: string | null;
  teacherName: string | null; bannerUrl: string | null; joinLink: string | null;
  startDate: string | null; endDate: string | null; status: string;
  grade: number | null; subject: string | null; totalDays: number;
}

interface DemoSession {
  id: number; batchId: number; title: string; description: string | null;
  dayNumber: number; scheduledAt: string; duration: number;
  joinUrl: string | null; recordingUrl: string | null; homeworkText: string | null;
  bannerUrl: string | null; status: string; isPublished: boolean;
}

interface BatchDetail { batch: DemoBatch; sessions: DemoSession[]; }

function getSessionStatus(session: DemoSession): "upcoming" | "live" | "completed" | "recording" {
  if (session.status === "live") return "live";
  if (session.recordingUrl) return "recording";
  const now = Date.now();
  const start = new Date(session.scheduledAt).getTime();
  const end = start + session.duration * 60 * 1000;
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "completed";
}

function Countdown({ target }: { target: string }) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const d = Math.floor(h / 24);
  if (d > 0) return <span className="text-xs text-blue-600 font-semibold">Starts in {d}d {h % 24}h</span>;
  if (h > 0) return <span className="text-xs text-blue-600 font-semibold">Starts in {h}h {m}m</span>;
  return <span className="text-xs text-blue-600 font-semibold">Starts in {m} min</span>;
}

function SessionCard({ session }: { session: DemoSession }) {
  const status = getSessionStatus(session);
  const scheduled = new Date(session.scheduledAt);
  const dateStr = scheduled.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = scheduled.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const statusBadge = {
    upcoming:  { color: "bg-blue-100 text-blue-700",  label: "Upcoming" },
    live:      { color: "bg-red-100 text-red-700",    label: "Live Now" },
    completed: { color: "bg-gray-100 text-gray-600",  label: "Completed" },
    recording: { color: "bg-purple-100 text-purple-700", label: "Recorded" },
  }[status];

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Day number */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ background: status === "live" ? "#EF4444" : "#0B2B6B" }}>
          {session.dayNumber}
        </div>
        {status === "live" && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 flex-1 min-w-0 leading-tight">{session.title}</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge.color}`}>{statusBadge.label}</span>
        </div>
        {session.description && (
          <p className="text-xs text-gray-500 mb-1.5 line-clamp-2">{session.description}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateStr} · {timeStr}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration} min</span>
          {status === "upcoming" && <Countdown target={session.scheduledAt} />}
        </div>
        {session.homeworkText && (
          <div className="mt-2 text-xs bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 text-purple-700">
            <BookOpen className="w-3 h-3 inline-block mr-1" />
            <span className="font-medium">Homework: </span>{session.homeworkText}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0 justify-center">
        {status === "live" && session.joinUrl && (
          <Button size="sm" className="text-xs h-7 px-3 bg-red-500 hover:bg-red-600 text-white"
            onClick={() => window.open(session.joinUrl!, "_blank")}>
            <Video className="w-3 h-3 mr-1" />Join
          </Button>
        )}
        {status === "upcoming" && session.joinUrl && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-3"
            onClick={() => window.open(session.joinUrl!, "_blank")}>
            <ExternalLink className="w-3 h-3 mr-1" />Join
          </Button>
        )}
        {session.recordingUrl && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-3 text-purple-600 border-purple-200 hover:bg-purple-50"
            onClick={() => window.open(session.recordingUrl!, "_blank")}>
            <Play className="w-3 h-3 mr-1" />Watch
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function DemoBatchPage() {
  const [, params] = useRoute("/demo-batches/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);

  const { data, isLoading } = useQuery<BatchDetail>({
    queryKey: ["demo-batch", id],
    queryFn: () => fetch(`${BASE}/api/demo-batches/${id}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    enabled: !!id,
  });

  const batch = data?.batch;
  const sessions = data?.sessions ?? [];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-12">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="w-full h-48 rounded-2xl" />
            <Skeleton className="w-64 h-5" />
            <Skeleton className="w-full h-24" />
            <Skeleton className="w-full h-24" />
          </div>
        ) : !batch ? (
          <div className="text-center py-20 text-gray-400">Batch not found</div>
        ) : (
          <>
            {/* Back */}
            <button onClick={() => setLocation("/courses")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors px-4 pt-4 pb-2">
              <ChevronLeft className="w-4 h-4" />Back to My Learning
            </button>

            {/* Hero */}
            <div className="relative h-48 overflow-hidden md:rounded-b-3xl"
              style={{ background: "linear-gradient(135deg,#0B2B6B 0%,#1a4298 100%)" }}>
              {batch.bannerUrl && (
                <img src={batch.bannerUrl} alt={batch.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="flex gap-2 mb-1.5 flex-wrap">
                  {batch.grade && <Badge className="bg-white/20 text-white border-0 text-xs">Grade {batch.grade}</Badge>}
                  {batch.subject && <Badge className="bg-orange-500 text-white border-0 text-xs">{batch.subject}</Badge>}
                  <Badge className="bg-white/20 text-white border-0 text-xs">{batch.totalDays}-Day Batch</Badge>
                </div>
                <h1 className="text-xl font-bold leading-tight">{batch.title}</h1>
                {batch.teacherName && <p className="text-white/70 text-sm mt-0.5">by {batch.teacherName}</p>}
              </div>
            </div>

            {/* Info bar */}
            {(batch.startDate || batch.endDate) && (
              <div className="flex items-center gap-4 px-5 py-3 bg-white border-b border-gray-100 text-sm text-gray-600 overflow-x-auto">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {batch.startDate && new Date(batch.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  {batch.endDate && ` – ${new Date(batch.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </span>
              </div>
            )}

            {/* Description */}
            {batch.description && (
              <div className="px-5 py-3 bg-white border-b border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed">{batch.description}</p>
              </div>
            )}

            {/* Sessions header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Sessions ({sessions.length})</h2>
            </div>

            {/* Sessions */}
            <div className="p-4 space-y-3">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Video className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Sessions will be scheduled soon</p>
                </div>
              ) : (
                sessions.map(s => <SessionCard key={s.id} session={s} />)
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
