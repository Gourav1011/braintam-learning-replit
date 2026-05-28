import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown, ChevronRight, Play, Video, BookOpen, ClipboardList,
  CheckSquare, FileText, Clock,
} from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface ContentItem {
  id: number; contentType: string; title: string;
  teacher?: string; scheduledAt?: string; recordedAt?: string; dueDate?: string;
  duration?: number; status?: string; joinUrl?: string; videoUrl?: string;
  thumbnailUrl?: string;
}
interface Topic {
  id: number; name: string; description: string | null; order: number; content: ContentItem[];
}
interface Chapter {
  id: number; name: string; description: string | null; order: number; topics: Topic[];
}
interface SyllabusData {
  course: {
    id: number; title: string; grade: number; board: string | null;
    description: string | null; thumbnailUrl: string; teacher: string | null;
    rating: number | null; subjectName: string; totalLessons: number;
  };
  chapters: Chapter[];
}

const CONTENT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  LIVE_CLASS:  { label: "Live Class",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   icon: Video },
  RECORDING:   { label: "Recording",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",  icon: Play },
  HOMEWORK:    { label: "Homework",    bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200",icon: BookOpen },
  ASSIGNMENT:  { label: "Assignment",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", icon: ClipboardList },
  TEST:        { label: "Test",        bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", icon: CheckSquare },
};

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ContentCard({ item }: { item: ContentItem }) {
  const cfg = CONTENT_CONFIG[item.contentType] ?? { label: item.contentType, bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: FileText };
  const Icon = cfg.icon;
  const isLiveNow = item.contentType === "LIVE_CLASS" && item.status === "live";
  const date = item.scheduledAt ? fmtDate(item.scheduledAt)
    : item.recordedAt ? fmtDate(item.recordedAt)
    : item.dueDate ? `Due ${fmtDate(item.dueDate)}` : "";

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-4 h-4 ${cfg.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
          {isLiveNow && (
            <span className="flex items-center gap-1 text-xs text-red-600 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />LIVE NOW
            </span>
          )}
          {date && <span className="text-xs text-gray-400">{date}</span>}
          {item.duration != null && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{item.duration} min
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        {isLiveNow && item.joinUrl && (
          <Button size="sm" className="text-xs h-7 px-3 bg-red-500 hover:bg-red-600 text-white"
            onClick={() => window.open(item.joinUrl!, "_blank")}>Join</Button>
        )}
        {!isLiveNow && item.contentType === "LIVE_CLASS" && item.status === "upcoming" && item.joinUrl && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-3"
            onClick={() => window.open(item.joinUrl!, "_blank")}>Join</Button>
        )}
        {item.contentType === "RECORDING" && item.videoUrl && (
          <Button size="sm" variant="outline" className={`text-xs h-7 px-3 ${cfg.text} ${cfg.border} hover:${cfg.bg}`}
            onClick={() => window.open(item.videoUrl!, "_blank")}>Watch</Button>
        )}
      </div>
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);
  const count = topic.content.length;
  return (
    <div className="ml-3 border-l-2 border-gray-100 pl-3 my-0.5">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 w-full py-1.5 text-left group">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1 min-w-0 truncate">{topic.name}</span>
        {count > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md flex-shrink-0">{count}</span>}
      </button>
      {open && (
        <div className="space-y-1.5 pb-2 pr-1">
          {count === 0
            ? <p className="text-xs text-gray-400 italic py-1">No content yet</p>
            : topic.content.map(item => <ContentCard key={`${item.contentType}-${item.id}`} item={item} />)}
        </div>
      )}
    </div>
  );
}

function ChapterRow({ chapter, index, isOpen, onToggle }: {
  chapter: Chapter; index: number; isOpen: boolean; onToggle: () => void;
}) {
  const topicCount = chapter.topics.length;
  const contentCount = chapter.topics.reduce((s, t) => s + t.content.length, 0);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <button onClick={onToggle}
        className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0B2B6B 0%, #1a4298 100%)" }}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-tight truncate">{chapter.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{topicCount} topics · {contentCount} items</p>
        </div>
        {isOpen
          ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100">
          <div className="p-3 bg-gray-50/50">
            {chapter.description && (
              <p className="text-xs text-gray-500 italic px-2 mb-2">{chapter.description}</p>
            )}
            {topicCount === 0
              ? <p className="text-sm text-gray-400 text-center py-3">No topics yet</p>
              : <div className="space-y-0.5">{chapter.topics.map(t => <TopicRow key={t.id} topic={t} />)}</div>}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const id = Number(params?.id);
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<SyllabusData>({
    queryKey: ["course-syllabus", id],
    queryFn: () => fetch(`${BASE}/api/course-syllabus/${id}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    enabled: !!id,
  });

  const toggleChapter = (cid: number) =>
    setOpenChapters(prev => { const n = new Set(prev); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });

  const chapters = data?.chapters ?? [];
  const course = data?.course;
  const chapterCount = chapters.length;
  const topicCount = chapters.reduce((s, c) => s + c.topics.length, 0);
  const contentCount = chapters.reduce((s, c) => s + c.topics.reduce((ss, t) => ss + t.content.length, 0), 0);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-12">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="w-full h-52 rounded-2xl" />
            <Skeleton className="w-64 h-5" />
            <Skeleton className="w-full h-14" />
            <Skeleton className="w-full h-14" />
            <Skeleton className="w-full h-14" />
          </div>
        ) : !course ? (
          <div className="text-center py-20 text-gray-400">Course not found</div>
        ) : (
          <>
            {/* Hero */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="relative h-52 overflow-hidden md:rounded-b-3xl">
              {course.thumbnailUrl
                ? <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#0B2B6B 0%,#1a4298 100%)" }} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="flex gap-2 mb-1.5 flex-wrap">
                  {course.subjectName && (
                    <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-xs border-0">{course.subjectName}</Badge>
                  )}
                  <Badge className="bg-white/20 hover:bg-white/20 text-white text-xs backdrop-blur-sm border-0">Grade {course.grade}</Badge>
                  {course.board && <Badge className="bg-white/20 hover:bg-white/20 text-white text-xs backdrop-blur-sm border-0">{course.board}</Badge>}
                </div>
                <h1 className="text-xl font-bold leading-tight">{course.title}</h1>
                {course.teacher && <p className="text-white/70 text-sm mt-0.5">by {course.teacher}</p>}
              </div>
            </motion.div>

            {/* Stats */}
            <div className="flex items-center gap-5 px-5 py-3 bg-white border-b border-gray-100 text-sm overflow-x-auto">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-gray-600">
                <BookOpen className="w-4 h-4 text-blue-500" /><strong>{chapterCount}</strong>&nbsp;Chapters
              </span>
              <span className="w-px h-4 bg-gray-200 flex-shrink-0" />
              <span className="flex items-center gap-1.5 whitespace-nowrap text-gray-600">
                <FileText className="w-4 h-4 text-purple-500" /><strong>{topicCount}</strong>&nbsp;Topics
              </span>
              <span className="w-px h-4 bg-gray-200 flex-shrink-0" />
              <span className="flex items-center gap-1.5 whitespace-nowrap text-gray-600">
                <Video className="w-4 h-4 text-orange-500" /><strong>{contentCount}</strong>&nbsp;Items
              </span>
              {course.rating && (
                <><span className="w-px h-4 bg-gray-200 flex-shrink-0" />
                <span className="whitespace-nowrap text-gray-600">⭐ {course.rating}</span></>
              )}
            </div>

            {/* Description */}
            {course.description && (
              <div className="px-5 py-3 bg-white border-b border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
              </div>
            )}

            {/* Syllabus header */}
            <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Course Syllabus</h2>
              {chapterCount > 0 && (
                <div className="flex gap-3 text-xs">
                  <button onClick={() => setOpenChapters(new Set(chapters.map(c => c.id)))}
                    className="text-blue-600 hover:underline">Expand All</button>
                  <button onClick={() => setOpenChapters(new Set())}
                    className="text-gray-500 hover:underline">Collapse</button>
                </div>
              )}
            </div>

            {/* Chapters */}
            <div className="p-4 space-y-2.5">
              {chapterCount === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-gray-500">Syllabus coming soon</p>
                  <p className="text-sm mt-1">Chapters and topics will appear here once published by your teacher</p>
                </div>
              ) : (
                chapters.map((ch, i) => (
                  <ChapterRow key={ch.id} chapter={ch} index={i}
                    isOpen={openChapters.has(ch.id)} onToggle={() => toggleChapter(ch.id)} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
