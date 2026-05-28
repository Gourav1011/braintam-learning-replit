import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Clock, Bell, PlayCircle, User, BookOpen } from "lucide-react";

export interface LiveClassCardData {
  id: number;
  title: string;
  teacher: string;
  teacherAvatar?: string | null;
  subjectName?: string;
  chapterName?: string;
  scheduledAt: string;
  duration: number;
  joinUrl?: string | null;
  recordingUrl?: string | null;
  studentsJoined?: number | null;
  thumbnailUrl?: string | null;
}

type LiveStatus = "UPCOMING" | "LIVE" | "COMPLETED";

function getStatus(scheduledAt: string, duration: number): LiveStatus {
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const end = start + duration * 60_000;
  if (now < start) return "UPCOMING";
  if (now >= start && now < end) return "LIVE";
  return "COMPLETED";
}

function useCountdown(scheduledAt: string, duration: number) {
  const [status, setStatus] = useState<LiveStatus>(() => getStatus(scheduledAt, duration));
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const tick = () => {
      const s = getStatus(scheduledAt, duration);
      setStatus(s);
      if (s === "UPCOMING") {
        const diff = new Date(scheduledAt).getTime() - Date.now();
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        if (h > 24) setCountdown(`${Math.floor(h / 24)}d ${h % 24}h`);
        else if (h > 0) setCountdown(`${h}h ${m}m`);
        else setCountdown(`${m}m`);
      } else {
        setCountdown("");
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [scheduledAt, duration]);

  return { status, countdown };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

interface LiveClassCardProps {
  lc: LiveClassCardData;
  onNotify?: (id: number) => void;
}

export function LiveClassCard({ lc, onNotify }: LiveClassCardProps) {
  const { status, countdown } = useCountdown(lc.scheduledAt, lc.duration);
  const [notified, setNotified] = useState(false);

  const handleNotify = () => {
    setNotified(true);
    onNotify?.(lc.id);
  };

  const initials = lc.teacher.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200">
        {/* Coloured top strip */}
        <div
          className="h-1.5 w-full"
          style={{
            background: status === "LIVE"
              ? "linear-gradient(90deg,#ef4444,#f97316)"
              : status === "COMPLETED"
              ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
              : "linear-gradient(90deg,#0B2B6B,#1a4298)",
          }}
        />

        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 leading-tight line-clamp-2 text-sm">
                {lc.title}
              </p>
              {lc.chapterName && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />{lc.chapterName}
                </p>
              )}
            </div>

            {/* Status badge */}
            {status === "LIVE" ? (
              <Badge className="flex-shrink-0 bg-red-500 hover:bg-red-500 text-white text-xs border-0 flex items-center gap-1 px-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </Badge>
            ) : status === "COMPLETED" ? (
              <Badge variant="secondary" className="flex-shrink-0 text-xs">Done</Badge>
            ) : (
              <Badge variant="outline" className="flex-shrink-0 text-xs border-blue-200 text-blue-700 bg-blue-50">
                Upcoming
              </Badge>
            )}
          </div>

          {/* Meta row — teacher, subject */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-[#0B2B6B] to-[#1a4298] flex items-center justify-center overflow-hidden">
              {lc.teacherAvatar
                ? <img src={lc.teacherAvatar} alt={lc.teacher} className="w-full h-full object-cover" />
                : <span className="text-white text-[10px] font-bold">{initials}</span>
              }
            </div>
            <div className="text-xs text-gray-600 flex-1 min-w-0">
              <span className="font-medium">{lc.teacher}</span>
              {lc.subjectName && (
                <span className="text-gray-400"> · {lc.subjectName}</span>
              )}
            </div>
            {lc.studentsJoined != null && lc.studentsJoined > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                <User className="w-3 h-3" />{lc.studentsJoined}
              </span>
            )}
          </div>

          {/* Time row */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDateTime(lc.scheduledAt)}
            </span>
            <span className="text-gray-300">·</span>
            <span>{lc.duration} min</span>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-2 pt-1">
            {status === "LIVE" && lc.joinUrl && (
              <Button
                size="sm"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs h-8 font-semibold"
                onClick={() => window.open(lc.joinUrl!, "_blank", "noopener")}
              >
                <Video className="w-3.5 h-3.5 mr-1.5" />
                Join Now
              </Button>
            )}

            {status === "LIVE" && !lc.joinUrl && (
              <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs h-8" disabled>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" />
                Class in Progress
              </Button>
            )}

            {status === "COMPLETED" && lc.recordingUrl && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8 border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={() => window.open(lc.recordingUrl!, "_blank", "noopener")}
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Recording Available
              </Button>
            )}

            {status === "COMPLETED" && !lc.recordingUrl && (
              <span className="flex-1 text-center text-xs text-gray-400 italic">
                Recording processing…
              </span>
            )}

            {status === "UPCOMING" && (
              <>
                {countdown && (
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg flex-shrink-0">
                    in {countdown}
                  </span>
                )}
                <Button
                  size="sm"
                  variant={notified ? "secondary" : "outline"}
                  className="flex-1 text-xs h-8"
                  onClick={handleNotify}
                  disabled={notified}
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  {notified ? "Notified ✓" : "Notify Me"}
                </Button>
                {lc.joinUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-[#0B2B6B] text-[#0B2B6B] hover:bg-[#0B2B6B] hover:text-white"
                    onClick={() => window.open(lc.joinUrl!, "_blank", "noopener")}
                  >
                    Join
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
