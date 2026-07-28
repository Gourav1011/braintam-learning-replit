import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown, ChevronRight, Play, Video, BookOpen, ClipboardList,
  CheckSquare, FileText, Clock, Calendar, MessageCircle, BarChart2,
  PlayCircle, CheckCircle2, AlertCircle, Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { API_BASE as BASE } from "@/lib/api-base";

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
interface Assignment {
  id: number; title: string; dueDate: string; status: string;
  maxMarks: number; obtainedMarks?: number | null;
}
interface Recording {
  id: number; title: string; recordedAt: string; duration: number;
  teacher: string; videoUrl: string | null; thumbnailUrl: string | null;
}

type CourseTab = "syllabus" | "assignments" | "recordings" | "reports" | "mentor";

const CONTENT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  LIVE_CLASS:  { label: "Live Class",  bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",   icon: Video },
  RECORDING:   { label: "Recording",   bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",  icon: Play },
  HOMEWORK:    { label: "Homework",    bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200",icon: BookOpen },
  ASSIGNMENT:  { label: "Assignment",  bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200", icon: ClipboardList },
  TEST:        { label: "Test",        bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", icon: CheckSquare },
};

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}
function fmtDateTime(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function ContentCard({ item }: { item: ContentItem }) {
  const [showNotStarted, setShowNotStarted] = useState(false);

  const cfg = CONTENT_CONFIG[item.contentType] ?? { label: item.contentType, bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", icon: FileText };
  const Icon = cfg.icon;
  const isLiveNow = item.contentType === "LIVE_CLASS" && item.status === "live";
  const date = item.scheduledAt ? fmtDateTime(item.scheduledAt)
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
        {isLiveNow && (
          <Link href={`/live/${item.id}?role=student&title=${encodeURIComponent(item.title)}`}>
            <Button size="sm" className="text-xs h-7 px-3 bg-red-500 hover:bg-red-600 text-white">Join</Button>
          </Link>
        )}
        {!isLiveNow && item.contentType === "LIVE_CLASS" && item.status === "upcoming" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-3"
            onClick={() => setShowNotStarted(true)}
          >
            ⏰ Not Started
          </Button>
        )}
        {item.contentType === "RECORDING" && item.videoUrl && (
          <Button size="sm" variant="outline" className={`text-xs h-7 px-3 ${cfg.text} ${cfg.border} hover:${cfg.bg}`}
            onClick={() => window.open(item.videoUrl!, "_blank")}>Watch</Button>
        )}
      </div>

      {showNotStarted && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowNotStarted(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-3xl mb-2">⏰</div>

            <h3 className="text-lg font-black text-gray-900">
              Class hasn't started yet
            </h3>

            {item.scheduledAt && (
              <p className="mt-2 text-sm text-gray-600">
                🕒 Class starts at{" "}
                <span className="font-bold text-gray-900">
                  {new Date(item.scheduledAt).toLocaleTimeString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Get your notebook ready! 📚 We'll see you in class soon.
            </p>

            <button
              type="button"
              onClick={() => setShowNotStarted(false)}
              className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold text-white"
              style={{ background: "#0B2D5C" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);
  const count = topic.content.length;
  const liveClass = topic.content.find(c => c.contentType === "LIVE_CLASS");
  const scheduledDate = liveClass?.scheduledAt ? fmtDate(liveClass.scheduledAt) : null;

  return (
    <div className="ml-3 border-l-2 border-gray-100 pl-3 my-0.5">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 w-full py-1.5 text-left group">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1 min-w-0 truncate">{topic.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {scheduledDate && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              <Calendar className="w-3 h-3" />{scheduledDate}
            </span>
          )}
          {count > 0 && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">{count}</span>}
        </div>
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
  // Find earliest scheduled live class for date range
  const dates = chapter.topics.flatMap(t => t.content.filter(c => c.contentType === "LIVE_CLASS" && c.scheduledAt).map(c => c.scheduledAt!)).sort();
  const dateRange = dates.length > 0 ? fmtDate(dates[0]) + (dates.length > 1 ? ` – ${fmtDate(dates[dates.length - 1])}` : "") : null;

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
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">{topicCount} topics · {contentCount} items</span>
            {dateRange && (
              <span className="text-xs text-blue-600 flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />{dateRange}
              </span>
            )}
          </div>
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

const TAB_CONFIG: { id: CourseTab; label: string; icon: React.ElementType }[] = [
  { id: "syllabus",     label: "Syllabus",       icon: BookOpen },
  { id: "assignments",  label: "Assignments",    icon: ClipboardList },
  { id: "recordings",   label: "Recordings",     icon: PlayCircle },
  { id: "reports",      label: "Reports",        icon: BarChart2 },
  { id: "mentor",       label: "Mentor Support", icon: MessageCircle },
];

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const id = Number(params?.id);
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<CourseTab>("syllabus");
  const { student } = useAuth();

  const { data, isLoading } = useQuery<SyllabusData>({
    queryKey: ["course-syllabus", id],
    queryFn: () => fetch(`${BASE}/api/course-syllabus/${id}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
    enabled: !!id,
  });

  const { data: assignments } = useQuery<Assignment[]>({
    queryKey: ["assignments"],
    queryFn: () => apiFetch("/assignments").then(r => r.ok ? r.json() : []),
    enabled: activeTab === "assignments",
  });

  const { data: recordings } = useQuery<Recording[]>({
    queryKey: ["recordings"],
    queryFn: () => apiFetch("/recordings").then(r => r.ok ? r.json() : []),
    enabled: activeTab === "recordings",
  });

  const toggleChapter = (cid: number) =>
    setOpenChapters(prev => { const n = new Set(prev); n.has(cid) ? n.delete(cid) : n.add(cid); return n; });

  const chapters = data?.chapters ?? [];
  const course = data?.course;
  const chapterCount = chapters.length;
  const topicCount = chapters.reduce((s, c) => s + c.topics.length, 0);

  // Compute live class stats for reports
  const allContent = chapters.flatMap(c => c.topics.flatMap(t => t.content));
  const liveClasses = allContent.filter(c => c.contentType === "LIVE_CLASS");
  const completedClasses = liveClasses.filter(c => c.status === "completed").length;
  const upcomingClasses = liveClasses.filter(c => c.status === "upcoming").length;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-12">
        {isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="w-full h-52 rounded-2xl" />
            <Skeleton className="w-64 h-5" />
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

            {/* Quick stats bar */}
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
                <Video className="w-4 h-4 text-orange-500" /><strong>{liveClasses.length}</strong>&nbsp;Classes
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

            {/* ── Tabs ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 overflow-x-auto">
              <div className="flex min-w-max">
                {TAB_CONFIG.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      <Icon className="w-3.5 h-3.5" />{tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                SYLLABUS TAB — Full-year planner
                ══════════════════════════════════════════════════════ */}
            {activeTab === "syllabus" && (
              <div>
                <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Full Year Planner</h2>
                  {chapterCount > 0 && (
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => setOpenChapters(new Set(chapters.map(c => c.id)))}
                        className="text-blue-600 hover:underline">Expand All</button>
                      <button onClick={() => setOpenChapters(new Set())}
                        className="text-gray-500 hover:underline">Collapse</button>
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2.5">
                  {chapterCount === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-gray-500">Syllabus coming soon</p>
                      <p className="text-sm mt-1">Your teacher will publish the full year plan here shortly.</p>
                    </div>
                  ) : (
                    chapters.map((ch, i) => (
                      <ChapterRow key={ch.id} chapter={ch} index={i}
                        isOpen={openChapters.has(ch.id)} onToggle={() => toggleChapter(ch.id)} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                ASSIGNMENTS TAB
                ══════════════════════════════════════════════════════ */}
            {activeTab === "assignments" && (
              <div className="p-4 space-y-3">
                {!assignments ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
                ) : assignments.length === 0 ? (
                  <div className="text-center py-14 text-gray-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No assignments yet</p>
                  </div>
                ) : (
                  assignments.map(a => {
                    const statusColor = a.status === "graded" ? "text-green-600 bg-green-50 border-green-200"
                      : a.status === "submitted" ? "text-blue-600 bg-blue-50 border-blue-200"
                      : a.status === "expired" ? "text-gray-400 bg-gray-50 border-gray-200"
                      : "text-orange-600 bg-orange-50 border-orange-200";
                    const statusIcon = a.status === "graded" ? <CheckCircle2 className="w-3 h-3" />
                      : a.status === "submitted" ? <CheckSquare className="w-3 h-3" />
                      : <AlertCircle className="w-3 h-3" />;
                    return (
                      <div key={a.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: NAVY }}>
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${statusColor}`}>
                                {statusIcon} {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                              </span>
                              <span className="text-xs text-gray-400">Due {fmtDate(a.dueDate)}</span>
                              {a.status === "graded" && a.obtainedMarks != null && (
                                <span className="text-xs font-bold text-green-600">{a.obtainedMarks}/{a.maxMarks} marks</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                RECORDINGS TAB
                ══════════════════════════════════════════════════════ */}
            {activeTab === "recordings" && (
              <div className="p-4 space-y-3">
                {!recordings ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : recordings.length === 0 ? (
                  <div className="text-center py-14 text-gray-400">
                    <PlayCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No recordings yet</p>
                  </div>
                ) : (
                  recordings.map(r => (
                    <div key={r.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                          {r.thumbnailUrl
                            ? <img src={r.thumbnailUrl} className="w-full h-full object-cover" alt={r.title} />
                            : <div className="w-full h-full flex items-center justify-center" style={{ background: NAVY }}>
                                <Play className="w-4 h-4 text-white" />
                              </div>}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">{fmtDate(r.recordedAt)}</span>
                            {r.duration && (
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />{r.duration} min
                              </span>
                            )}
                          </div>
                          {r.teacher && <p className="text-xs text-gray-500 mt-0.5">by {r.teacher}</p>}
                        </div>
                        {r.videoUrl && (
                          <Button size="sm" variant="outline" className="text-xs flex-shrink-0"
                            onClick={() => window.open(r.videoUrl!, "_blank")}>Watch</Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                REPORTS TAB
                ══════════════════════════════════════════════════════ */}
            {activeTab === "reports" && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Chapters", value: chapterCount, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Total Topics", value: topicCount, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Live Classes", value: liveClasses.length, icon: Video, color: "text-orange-600", bg: "bg-orange-50" },
                    { label: "Completed Classes", value: completedClasses, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
                    { label: "Upcoming Classes", value: upcomingClasses, icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Assignments", value: assignments?.length ?? "—", icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" },
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.bg}`}>
                          <Icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                {liveClasses.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">Course Progress</p>
                      <p className="text-sm font-bold" style={{ color: ORANGE }}>{Math.round(completedClasses / liveClasses.length * 100)}%</p>
                    </div>
                    <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.round(completedClasses / liveClasses.length * 100)}%`, background: ORANGE }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{completedClasses} of {liveClasses.length} classes completed</p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════
                MENTOR SUPPORT TAB
                ══════════════════════════════════════════════════════ */}
            {activeTab === "mentor" && (
              <div className="p-4 space-y-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: NAVY }}>
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Your Assigned Mentor</h3>
                    <p className="text-sm text-gray-500 mt-1">Your Braintam mentor will guide you through the full year and help with doubts, motivation, and academic planning.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { icon: "📞", title: "Schedule a Call", desc: "Book a 1-on-1 session with your mentor at a convenient time." },
                    { icon: "💬", title: "Ask a Doubt", desc: "Send your academic doubts and get a response within 24 hours." },
                    { icon: "📈", title: "Progress Review", desc: "Get a weekly progress review with personalized tips from your mentor." },
                    { icon: "🎯", title: "Study Plan", desc: "Your mentor creates a customized study plan based on your performance." },
                  ].map(item => (
                    <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 text-center">
                  <p className="text-sm font-semibold text-orange-700">Need help right now?</p>
                  <p className="text-xs text-orange-600 mt-1 mb-3">Your mentor is available Mon–Sat, 9am–7pm IST.</p>
                  <Button size="sm" className="text-white gap-1.5" style={{ background: ORANGE }}>
                    <MessageCircle className="w-3.5 h-3.5" /> Contact Mentor
                  </Button>
                </div>

                {student?.name && (
                  <p className="text-xs text-center text-gray-400">Mentor support for {student.name} · {course.title}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
