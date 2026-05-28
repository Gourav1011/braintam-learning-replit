import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown, ChevronRight, Video, Play, BookOpen,
  ClipboardList, CheckSquare, FileText, Clock,
  Upload, Eye, Bell, ArrowRight, Lock,
} from "lucide-react";
import { STAFF_TOKEN_KEY, STUDENT_TOKEN_KEY } from "@/components/auth-provider";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(STAFF_TOKEN_KEY) ?? localStorage.getItem(STUDENT_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Data types ──────────────────────────────────────────────────────────────
export interface ContentItem {
  id: number;
  contentType: "LIVE_CLASS" | "RECORDING" | "HOMEWORK" | "ASSIGNMENT" | "TEST";
  title: string;
  teacher?: string;
  scheduledAt?: string;
  recordedAt?: string;
  dueDate?: string;
  duration?: number;
  status?: string;     // "upcoming" | "live" | "completed" | "UPCOMING" | "LIVE" | "COMPLETED"
  joinUrl?: string;
  videoUrl?: string;
  recordingUrl?: string;
  attachmentUrl?: string;
  maxMarks?: number;
  isCompleted?: boolean;
}

export interface Topic {
  id: number;
  name: string;
  description: string | null;
  order: number;
  content: ContentItem[];
}

export interface Chapter {
  id: number;
  name: string;
  description: string | null;
  order: number;
  topics: Topic[];
}

export interface SyllabusData {
  course: {
    id: number;
    title: string;
    grade: number;
    board: string | null;
    description: string | null;
    thumbnailUrl: string;
    teacher: string | null;
    rating: number | null;
    subjectName: string;
    totalLessons: number;
  };
  chapters: Chapter[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function isLive(item: ContentItem) {
  const s = (item.status ?? "").toLowerCase();
  return item.contentType === "LIVE_CLASS" && (s === "live" || s === "LIVE");
}
function isCompleted(item: ContentItem) {
  const s = (item.status ?? "").toLowerCase();
  return s === "completed" || s === "completed" || item.isCompleted;
}
function isUpcoming(item: ContentItem) {
  const s = (item.status ?? "").toLowerCase();
  return s === "upcoming" || s === "";
}

// ─── Content type display config ─────────────────────────────────────────────
const CONTENT_CONFIG: Record<ContentItem["contentType"], {
  label: string; bg: string; text: string; border: string; icon: React.ElementType;
}> = {
  LIVE_CLASS:  { label: "Live Class",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    icon: Video },
  RECORDING:   { label: "Recording",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   icon: Play },
  HOMEWORK:    { label: "Homework",    bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: BookOpen },
  ASSIGNMENT:  { label: "Assignment",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  icon: ClipboardList },
  TEST:        { label: "Test",        bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  icon: CheckSquare },
};

// ─── Action button logic ──────────────────────────────────────────────────────
function ActionButton({ item, courseId }: { item: ContentItem; courseId: number }) {
  const [notified, setNotified] = useState(false);

  // LIVE CLASS actions
  if (item.contentType === "LIVE_CLASS") {
    if (isLive(item)) {
      return (
        <Button
          size="sm"
          className="h-7 px-3 text-xs bg-red-500 hover:bg-red-600 text-white font-semibold"
          onClick={() => item.joinUrl && window.open(item.joinUrl, "_blank", "noopener")}
          disabled={!item.joinUrl}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1.5" />
          Join Now
        </Button>
      );
    }
    if (isCompleted(item)) {
      if (item.recordingUrl || item.videoUrl) {
        return (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => window.open((item.recordingUrl ?? item.videoUrl)!, "_blank", "noopener")}
          >
            <Play className="w-3 h-3 mr-1" />
            Watch
          </Button>
        );
      }
      return (
        <span className="text-xs text-gray-400 italic">Processing…</span>
      );
    }
    // Upcoming
    return (
      <div className="flex items-center gap-1.5">
        {item.joinUrl && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs border-[#0B2B6B]/30 text-[#0B2B6B] hover:bg-[#0B2B6B] hover:text-white"
            onClick={() => window.open(item.joinUrl!, "_blank", "noopener")}
          >
            Join
          </Button>
        )}
        <Button
          size="sm"
          variant={notified ? "secondary" : "ghost"}
          className="h-7 px-2 text-xs"
          onClick={() => setNotified(true)}
          disabled={notified}
          title="Get notified when this class starts"
        >
          <Bell className="w-3 h-3 mr-1" />
          {notified ? "✓" : "Notify"}
        </Button>
      </div>
    );
  }

  // RECORDING
  if (item.contentType === "RECORDING") {
    const url = item.videoUrl ?? item.recordingUrl;
    return url ? (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => window.open(url, "_blank", "noopener")}
      >
        <Eye className="w-3 h-3 mr-1" />
        Watch
      </Button>
    ) : (
      <span className="text-xs text-gray-400 italic">Coming soon</span>
    );
  }

  // HOMEWORK
  if (item.contentType === "HOMEWORK") {
    if (isCompleted(item)) {
      return (
        <Badge variant="secondary" className="text-xs h-6 px-2 bg-green-50 text-green-700 border border-green-200">
          ✓ Submitted
        </Badge>
      );
    }
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => window.location.assign(`${BASE}/homework`)}
            >
              <FileText className="w-3 h-3 mr-1" />
              Submit
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-48">
            Go to the Homework page to write and submit your answer
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // ASSIGNMENT
  if (item.contentType === "ASSIGNMENT") {
    if (isCompleted(item)) {
      return (
        <Badge variant="secondary" className="text-xs h-6 px-2 bg-green-50 text-green-700 border border-green-200">
          ✓ Uploaded
        </Badge>
      );
    }
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => window.location.assign(`${BASE}/assignments`)}
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-48">
            Go to Assignments to upload your file or written answer
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // TEST
  if (item.contentType === "TEST") {
    if (isCompleted(item)) {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
          onClick={() => window.location.assign(`${BASE}/tests`)}
        >
          <ArrowRight className="w-3 h-3 mr-1" />
          Results
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white"
        onClick={() => window.location.assign(`${BASE}/tests`)}
      >
        <CheckSquare className="w-3 h-3 mr-1" />
        Start Test
      </Button>
    );
  }

  return null;
}

// ─── ContentCard ─────────────────────────────────────────────────────────────
function ContentCard({ item, courseId }: { item: ContentItem; courseId: number }) {
  const cfg = CONTENT_CONFIG[item.contentType];
  const Icon = cfg.icon;
  const live = isLive(item);

  const date = item.scheduledAt ? fmtDate(item.scheduledAt)
    : item.recordedAt ? fmtDate(item.recordedAt)
    : item.dueDate ? `Due ${fmtDate(item.dueDate)}` : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white
        border transition-all duration-150
        ${live ? "border-red-200 shadow-sm shadow-red-50" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"}
      `}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {cfg.label}
          </span>
          {live && (
            <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE NOW
            </span>
          )}
          {date && <span className="text-[10px] text-gray-400">{date}</span>}
          {item.duration != null && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />{item.duration} min
            </span>
          )}
          {item.maxMarks != null && (
            <span className="text-[10px] text-gray-400">{item.maxMarks} marks</span>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex-shrink-0">
        <ActionButton item={item} courseId={courseId} />
      </div>
    </motion.div>
  );
}

// ─── TopicRow ─────────────────────────────────────────────────────────────────
function TopicRow({ topic, courseId }: { topic: Topic; courseId: number }) {
  const [open, setOpen] = useState(false);
  const count = topic.content.length;
  const liveCount = topic.content.filter(isLive).length;

  return (
    <div className="ml-4 border-l-2 border-gray-100 pl-3 my-0.5">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 w-full py-2 text-left group"
      >
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1 min-w-0 truncate">
          {topic.name}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {liveCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {count > 0 && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
              {count}
            </span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pb-2 pr-1">
              {count === 0 ? (
                <p className="text-xs text-gray-400 italic py-1 pl-1">No content yet</p>
              ) : (
                topic.content.map(item => (
                  <ContentCard
                    key={`${item.contentType}-${item.id}`}
                    item={item}
                    courseId={courseId}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ChapterRow ───────────────────────────────────────────────────────────────
function ChapterRow({
  chapter, index, courseId, isOpen, onToggle,
}: {
  chapter: Chapter; index: number; courseId: number;
  isOpen: boolean; onToggle: () => void;
}) {
  const topicCount = chapter.topics.length;
  const contentCount = chapter.topics.reduce((s, t) => s + t.content.length, 0);
  const liveCount = chapter.topics.flatMap(t => t.content).filter(isLive).length;

  return (
    <div className={`
      border rounded-2xl overflow-hidden bg-white shadow-sm transition-shadow
      ${isOpen ? "shadow-md border-[#0B2B6B]/20" : "border-gray-200 hover:border-gray-300"}
    `}>
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
      >
        {/* Chapter number badge */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0B2B6B 0%, #1a4298 100%)" }}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 leading-tight truncate">
              {chapter.name}
            </p>
            {liveCount > 0 && (
              <Badge className="h-4 px-1.5 text-[10px] bg-red-500 hover:bg-red-500 text-white border-0 flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                LIVE
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {topicCount} topic{topicCount !== 1 ? "s" : ""} · {contentCount} item{contentCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {contentCount === 0 && (
            <Lock className="w-3.5 h-3.5 text-gray-300" />
          )}
          {isOpen
            ? <ChevronDown className="w-5 h-5 text-gray-400" />
            : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-3 bg-gray-50/50">
              {chapter.description && (
                <p className="text-xs text-gray-500 italic px-1 mb-2">{chapter.description}</p>
              )}
              {topicCount === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No topics yet</p>
              ) : (
                <div className="space-y-0.5">
                  {chapter.topics
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map(t => (
                      <TopicRow key={t.id} topic={t} courseId={courseId} />
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CourseSyllabus (main export) ─────────────────────────────────────────────
interface CourseSyllabusProps {
  courseId: number;
  /** Pre-loaded data — skip the internal fetch if provided. */
  data?: SyllabusData;
}

export function CourseSyllabus({ courseId, data: prefetch }: CourseSyllabusProps) {
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<SyllabusData>({
    queryKey: ["course-syllabus", courseId],
    queryFn: () =>
      fetch(`${BASE}/api/course-syllabus/${courseId}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      }).then(r => {
        if (!r.ok) throw new Error("Not found");
        return r.json() as Promise<SyllabusData>;
      }),
    enabled: !!courseId && !prefetch,
    initialData: prefetch,
  });

  const toggleChapter = (cid: number) =>
    setOpenChapters(prev => {
      const n = new Set(prev);
      n.has(cid) ? n.delete(cid) : n.add(cid);
      return n;
    });

  const chapters = data?.chapters ?? [];
  const sorted = chapters.slice().sort((a, b) => a.order - b.order);
  const liveCount = sorted.flatMap(c => c.topics.flatMap(t => t.content)).filter(isLive).length;

  if (isLoading) {
    return (
      <div className="space-y-2.5 p-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="w-full h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Syllabus header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-gray-900 text-base">Course Syllabus</h2>
          {liveCount > 0 && (
            <Badge className="bg-red-500 hover:bg-red-500 text-white text-xs border-0 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {liveCount} Live Now
            </Badge>
          )}
        </div>
        {sorted.length > 0 && (
          <div className="flex gap-3 text-xs">
            <button
              onClick={() => setOpenChapters(new Set(sorted.map(c => c.id)))}
              className="text-[#0B2B6B] hover:underline font-medium"
            >
              Expand All
            </button>
            <button
              onClick={() => setOpenChapters(new Set())}
              className="text-gray-400 hover:underline"
            >
              Collapse
            </button>
          </div>
        )}
      </div>

      {/* Chapters */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold text-gray-500">Syllabus coming soon</p>
          <p className="text-sm mt-1">Chapters and topics will appear here once published by your teacher</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((ch, i) => (
            <ChapterRow
              key={ch.id}
              chapter={ch}
              index={i}
              courseId={courseId}
              isOpen={openChapters.has(ch.id)}
              onToggle={() => toggleChapter(ch.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
