import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListHomework, useSubmitHomework, getListHomeworkQueryKey,
  useListAssignments, useSubmitAssignment, getListAssignmentsQueryKey,
  useListTests, getListTestsQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FileText, BookOpen, CheckSquare, Calendar, Clock, CheckCircle,
  AlertCircle, Send, Lock, ExternalLink, ChevronLeft, ChevronRight,
  Trophy, X, Play, Star, ClipboardCheck,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const EXPIRY_HW = 5;
const EXPIRY_ASGN = 14;

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

type ExtendedHw = {
  id: number;
  title: string;
  subjectName: string;
  grade: number;
  courseId: number | null;
  dueDate: string;
  description: string | null;
  maxMarks: number;
  status: string;
  marks: number | null;
  feedback: string | null;
  homeworkType?: string | null;
  driveLink?: string | null;
  questionsJson?: string | null;
  submittedAnswer?: string | null;
  attachmentUrl?: string | null;
};

type HwQuestion = { text: string; options: string[]; correctOption: number };

function parsedQuestions(json: string | null | undefined): HwQuestion[] {
  if (!json) return [];
  try { const q = JSON.parse(json); return Array.isArray(q) ? q : []; }
  catch { return []; }
}

function getInitialTab() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (t === "assignments") return "assignments";
  if (t === "tests") return "tests";
  return "homework";
}

const TAB_THEMES: Record<string, { color: string; bg: string; label: string; icon: React.ComponentType<any> }> = {
  homework:    { color: "#ff970f", bg: "#fff7ed", label: "Homework",    icon: FileText },
  assignments: { color: "#7257f5", bg: "#f5f3ff", label: "Assignments", icon: BookOpen },
  tests:       { color: "#18b96b", bg: "#f0fdf4", label: "Tests",       icon: CheckSquare },
};

type Tab = "homework" | "assignments" | "tests";
type StatusFilter = "all" | "pending" | "submitted" | "graded";

// ── Status pill ───────────────────────────────────────────────────────────

function StatusPill({ status, expired }: { status: string; expired?: boolean }) {
  if (expired) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Expired</span>
  );
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    submitted: "bg-blue-100 text-blue-700",
    graded: "bg-green-100 text-green-700",
    upcoming: "bg-indigo-100 text-indigo-700",
    active: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ── Homework card ─────────────────────────────────────────────────────────

function HomeworkCard({
  hw, onSubmit, onReview,
}: {
  hw: ExtendedHw;
  onSubmit: (hw: ExtendedHw) => void;
  onReview: (hw: ExtendedHw) => void;
}) {
  const days = daysUntil(hw.dueDate);
  const isExpired = hw.status === "pending" && days < -EXPIRY_HW;
  const isDone = hw.status === "submitted" || hw.status === "graded";
  const isUrgent = days <= 2 && days >= 0 && hw.status === "pending";
  const hwQuestions = parsedQuestions(hw.questionsJson);
  const isMcqHw = hwQuestions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white border transition-all ${
        isExpired ? "border-gray-200 opacity-55" :
        isUrgent ? "border-orange-300" :
        isDone ? "border-gray-100" : "border-gray-200"
      }`}
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isExpired ? "bg-gray-100" :
            hw.status === "graded" ? "bg-green-100" :
            hw.status === "submitted" ? "bg-blue-100" :
            isUrgent ? "bg-red-100" : "bg-amber-100"
          }`}>
            {isExpired ? <Lock className="w-5 h-5 text-gray-400" />
              : isMcqHw ? <CheckSquare className={`w-5 h-5 ${isDone ? "text-green-600" : "text-amber-600"}`} />
              : <FileText className={`w-5 h-5 ${
                hw.status === "graded" ? "text-green-600" :
                hw.status === "submitted" ? "text-blue-600" :
                isUrgent ? "text-red-600" : "text-amber-600"
              }`} />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-bold text-sm leading-snug ${isExpired ? "text-gray-400" : "text-gray-800"}`}>
                {hw.title}
                {isMcqHw && !isDone && <span className="ml-1.5 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full" style={{ background: "#ff970f" }}>MCQ</span>}
              </h3>
              <StatusPill status={hw.status} expired={isExpired} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[11px] text-gray-500 font-medium">{hw.subjectName}</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due {new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              {!isExpired && days <= 7 && hw.status === "pending" && (
                <span className={`text-[11px] font-bold ${isUrgent ? "text-red-600" : "text-orange-500"}`}>
                  {days === 0 ? "Due today!" : days < 0 ? "Overdue" : `${days}d left`}
                </span>
              )}
              <span className="text-[11px] text-gray-400">{hw.maxMarks} marks</span>
            </div>
            {hw.marks !== null && (
              <p className="text-xs font-bold text-green-600 mt-1">Score: {hw.marks}/{hw.maxMarks}</p>
            )}
            {hw.feedback && (
              <p className="text-xs text-gray-500 mt-1 italic">"{hw.feedback}"</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex gap-2">
          {hw.status === "pending" && !isExpired && (
            <button
              onClick={() => onSubmit(hw)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90"
              style={{ background: isMcqHw ? NAVY : ORANGE }}
            >
              <Send className="w-3.5 h-3.5" />
              {isMcqHw ? "Start Quiz" : "Submit"}
            </button>
          )}
          {isDone && isMcqHw && (
            <button
              onClick={() => onReview(hw)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Star className="w-3.5 h-3.5 text-amber-500" />
              Review Answers
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Assignment card ───────────────────────────────────────────────────────

function AssignmentCard({ asgn, onSubmit }: { asgn: any; onSubmit: (id: number) => void }) {
  const days = daysUntil(asgn.dueDate);
  const isUrgent = days <= 2 && days >= 0;
  const isExpired = asgn.status === "pending" && days < -EXPIRY_ASGN;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-white border transition-all ${
        isExpired ? "border-gray-200 opacity-55" :
        isUrgent && asgn.status === "pending" ? "border-purple-300" : "border-gray-200"
      }`}
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isExpired ? "bg-gray-100" :
            asgn.status === "graded" ? "bg-green-100" :
            asgn.status === "submitted" ? "bg-blue-100" :
            isUrgent ? "bg-red-100" : "bg-purple-100"
          }`}>
            {isExpired ? <Lock className="w-5 h-5 text-gray-400" />
              : <BookOpen className={`w-5 h-5 ${
                asgn.status === "graded" ? "text-green-600" :
                asgn.status === "submitted" ? "text-blue-600" :
                isUrgent ? "text-red-600" : "text-purple-600"
              }`} />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-bold text-sm leading-snug ${isExpired ? "text-gray-400" : "text-gray-800"}`}>
                {asgn.title}
              </h3>
              <StatusPill status={asgn.status} expired={isExpired} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[11px] text-gray-500 font-medium">{asgn.subjectName}</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due {new Date(asgn.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              {!isExpired && days <= 7 && asgn.status === "pending" && (
                <span className={`text-[11px] font-bold ${isUrgent ? "text-red-600" : "text-orange-500"}`}>
                  {days === 0 ? "Due today!" : days < 0 ? "Overdue" : `${days}d left`}
                </span>
              )}
            </div>
            {asgn.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{asgn.description}</p>
            )}
            {asgn.marks !== null && (
              <p className="text-xs font-bold text-green-600 mt-1">Score: {asgn.marks}/{asgn.maxMarks}</p>
            )}
          </div>
        </div>

        {asgn.status === "pending" && !isExpired && (
          <div className="mt-3">
            <button
              onClick={() => onSubmit(asgn.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
              style={{ background: "#7257f5" }}
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Test card ─────────────────────────────────────────────────────────────

function TestCard({ test }: { test: any }) {
  const isUpcoming = test.status === "upcoming" || test.status === "pending";
  const isActive = test.status === "active";
  const isCompleted = test.status === "completed" || test.status === "graded";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-gray-200 transition-all"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isCompleted ? "bg-green-100" : isActive ? "bg-emerald-100" : "bg-teal-100"
          }`}>
            <CheckSquare className={`w-5 h-5 ${
              isCompleted ? "text-green-600" : isActive ? "text-emerald-600" : "text-teal-600"
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-sm leading-snug text-gray-800">{test.title}</h3>
              <StatusPill status={isActive ? "active" : isCompleted ? "completed" : "upcoming"} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[11px] text-gray-500 font-medium">{test.subjectName}</span>
              {test.totalQuestions && (
                <span className="text-[11px] text-gray-400">{test.totalQuestions} questions</span>
              )}
              {test.duration && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{test.duration} min
                </span>
              )}
              {test.scheduledAt && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(test.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                </span>
              )}
            </div>
            {test.score !== null && test.score !== undefined && (
              <p className="text-xs font-bold text-green-600 mt-1">
                Score: {test.score}/{test.totalQuestions}
              </p>
            )}
          </div>
        </div>

        {(isUpcoming || isActive) && (
          <div className="mt-3">
            <Link href={`/tests/${test.id}`}>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all"
                style={{ background: isActive ? "#18b96b" : NAVY }}
              >
                <Play className="w-3.5 h-3.5" />
                {isActive ? "Start Now" : "Take Test"}
              </button>
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, { emoji: string; title: string; sub: string }> = {
    homework:    { emoji: "📚", title: "All caught up!", sub: "No homework here right now." },
    assignments: { emoji: "📝", title: "No assignments!", sub: "You have no assignments to submit." },
    tests:       { emoji: "🎯", title: "No tests!", sub: "No upcoming or pending tests." },
  };
  const m = msgs[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{m.emoji}</span>
      <p className="text-base font-bold text-gray-600">{m.title}</p>
      <p className="text-sm text-gray-400 mt-1">{m.sub}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Homework state
  const [submitting, setSubmitting] = useState<ExtendedHw | null>(null);
  const [answer, setAnswer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [hwSubmitted, setHwSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState<ExtendedHw | null>(null);
  const [reviewQ, setReviewQ] = useState(0);

  // Assignment state
  const [submittingAsgn, setSubmittingAsgn] = useState<number | null>(null);
  const [asgnAnswer, setAsgnAnswer] = useState("");

  const queryClient = useQueryClient();
  const hwParams = {};
  const asgnParams = {};
  const testParams = {};

  const { data: rawHomework, isLoading: hwLoading } = useListHomework(hwParams, {
    query: { queryKey: getListHomeworkQueryKey(hwParams) }
  });
  const { data: rawAssignments, isLoading: asgnLoading } = useListAssignments(asgnParams, {
    query: { queryKey: getListAssignmentsQueryKey(asgnParams) }
  });
  const { data: rawTests, isLoading: testLoading } = useListTests(testParams, {
    query: { queryKey: getListTestsQueryKey(testParams) }
  });

  const homework = (rawHomework ?? []) as unknown as ExtendedHw[];
  const assignments = rawAssignments ?? [];
  const tests = rawTests ?? [];

  // Counts for tab badges
  const pendingHw = homework.filter(h => h.status === "pending").length;
  const pendingAsgn = assignments.filter((a: any) => a.status === "pending").length;
  const pendingTests = tests.filter((t: any) => t.status === "upcoming" || t.status === "pending" || t.status === "active").length;

  const submitHwMutation = useSubmitHomework({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHomeworkQueryKey(hwParams) });
        setHwSubmitted(true);
      }
    }
  });

  const submitAsgnMutation = useSubmitAssignment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey(asgnParams) });
        setSubmittingAsgn(null);
        setAsgnAnswer("");
      }
    }
  });

  // MCQ derived
  const questions = submitting ? parsedQuestions(submitting.questionsJson) : [];
  const isMcq = !!(submitting && questions.length > 0);
  const mcqComplete = questions.length > 0 && questions.every((_, i) => mcqAnswers[i] !== undefined);
  const answeredCount = Object.keys(mcqAnswers).length;
  const currentQuestion = questions[currentQ];

  function openHwSubmit(hw: ExtendedHw) {
    setSubmitting(hw);
    setAnswer("");
    setAttachmentUrl("");
    setMcqAnswers({});
    setCurrentQ(0);
    setHwSubmitted(false);
  }

  function closeHwDialog() {
    if (submitHwMutation.isPending) return;
    setSubmitting(null);
    setHwSubmitted(false);
    setMcqAnswers({});
    setCurrentQ(0);
  }

  function selectOption(qi: number, oi: number) {
    if (hwSubmitted) return;
    setMcqAnswers(prev => ({ ...prev, [qi]: oi }));
    if (qi < questions.length - 1) {
      setTimeout(() => setCurrentQ(q => Math.min(questions.length - 1, q + 1)), 500);
    }
  }

  function handleWritingSubmit() {
    if (!submitting || !answer.trim()) return;
    submitHwMutation.mutate({ id: submitting.id, data: { answer, attachmentUrl: attachmentUrl.trim() || null } });
  }

  function handleMcqSubmit() {
    if (!submitting || !mcqComplete) return;
    const answerStr = JSON.stringify(questions.map((_, i) => mcqAnswers[i] ?? -1));
    submitHwMutation.mutate({ id: submitting.id, data: { answer: answerStr, attachmentUrl: null } });
  }

  // Status filter
  function applyFilter(items: any[]) {
    if (statusFilter === "all") return items;
    return items.filter(i => i.status === statusFilter);
  }

  const filteredHw = applyFilter(homework);
  const filteredAsgn = applyFilter(assignments);
  const filteredTests = statusFilter === "all" ? tests
    : statusFilter === "pending" ? tests.filter((t: any) => t.status === "upcoming" || t.status === "pending" || t.status === "active")
    : statusFilter === "submitted" || statusFilter === "graded" ? tests.filter((t: any) => t.status === "completed" || t.status === "graded")
    : tests;

  const isLoading = activeTab === "homework" ? hwLoading : activeTab === "assignments" ? asgnLoading : testLoading;

  return (
    <AppLayout>
      {/* ── Page header ── */}
      <div className="px-5 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#ff970f" }}>
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">My Tasks</h1>
              <p className="text-white/50 text-xs">Stay on top of your work</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* ── Tab bar ── */}
        <div className="flex gap-2">
          {(["homework", "assignments", "tests"] as Tab[]).map(tab => {
            const theme = TAB_THEMES[tab];
            const Icon = theme.icon;
            const count = tab === "homework" ? pendingHw : tab === "assignments" ? pendingAsgn : pendingTests;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setStatusFilter("all"); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl text-xs font-bold transition-all"
                style={{
                  background: isActive ? theme.color : "#f5f5f5",
                  color: isActive ? "white" : "#9CA3AF",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{theme.label}</span>
                <span className="sm:hidden">{theme.label.split(" ")[0]}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-white/25 text-white" : "bg-orange-500 text-white"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Status filter ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "pending", "submitted", "graded"] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize"
              style={{
                background: statusFilter === f ? NAVY : "#f5f5f5",
                color: statusFilter === f ? "white" : "#6B7280",
              }}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : activeTab === "homework" ? (
          filteredHw.length === 0 ? <EmptyState tab="homework" /> : (
            <div className="space-y-3">
              {filteredHw.map((hw, i) => (
                <HomeworkCard key={hw.id} hw={hw} onSubmit={openHwSubmit} onReview={hw => { setReviewing(hw); setReviewQ(0); }} />
              ))}
            </div>
          )
        ) : activeTab === "assignments" ? (
          filteredAsgn.length === 0 ? <EmptyState tab="assignments" /> : (
            <div className="space-y-3">
              {filteredAsgn.map((asgn: any) => (
                <AssignmentCard key={asgn.id} asgn={asgn} onSubmit={id => { setSubmittingAsgn(id); setAsgnAnswer(""); }} />
              ))}
            </div>
          )
        ) : (
          filteredTests.length === 0 ? <EmptyState tab="tests" /> : (
            <div className="space-y-3">
              {filteredTests.map((test: any) => <TestCard key={test.id} test={test} />)}
            </div>
          )
        )}
      </div>

      {/* ── MCQ Quiz — full-screen overlay ── */}
      {submitting && isMcq && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white" style={{ overscrollBehavior: "contain" }}>
          {hwSubmitted ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-5 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Quiz Submitted! 🎉</h2>
                <p className="text-gray-500 text-sm mt-1">{submitting.title}</p>
                <p className="text-sm text-gray-400 mt-2">You answered {answeredCount} of {questions.length} questions</p>
              </div>
              <Button onClick={closeHwDialog} style={{ background: NAVY, color: "white" }} className="px-8">Done</Button>
            </div>
          ) : (
            <>
              <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg,${NAVY},#123D7A)` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">MCQ Quiz</p>
                  <button onClick={closeHwDialog} className="text-white/60 hover:text-white p-1 -mr-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h2 className="text-white font-bold text-sm leading-snug line-clamp-2">{submitting.title}</h2>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-white/80 text-xs">Q {currentQ + 1}<span className="text-white/40"> / {questions.length}</span></span>
                  <span className="text-white/80 text-xs">{answeredCount}/{questions.length} answered</span>
                </div>
                <Progress value={(answeredCount / questions.length) * 100} className="mt-1.5 h-1 bg-white/20" />
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <p className="font-semibold text-sm leading-relaxed">
                      <span className="font-black mr-1.5" style={{ color: ORANGE }}>Q{currentQ + 1}.</span>
                      {currentQuestion?.text}
                    </p>
                    <div className="space-y-2">
                      {currentQuestion?.options.map((opt: string, oi: number) => {
                        const isSelected = mcqAnswers[currentQ] === oi;
                        return (
                          <button
                            key={oi}
                            onClick={() => selectOption(currentQ, oi)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all font-medium text-sm flex items-center gap-2.5 ${
                              isSelected ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <span
                              className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-black flex-shrink-0 transition-all ${isSelected ? "text-white" : "bg-gray-100 text-gray-500"}`}
                              style={isSelected ? { background: ORANGE } : {}}
                            >
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className={`text-sm ${isSelected ? "text-orange-800 font-semibold" : "text-gray-700"}`}>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex-shrink-0 border-t bg-white px-4 py-3 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0} className="gap-1 text-xs h-9 px-3">
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </Button>
                <div className="flex gap-1 overflow-x-auto max-w-[40vw] scrollbar-none">
                  {questions.map((_, qi) => (
                    <button key={qi} onClick={() => setCurrentQ(qi)}
                      className={`w-6 h-6 flex-shrink-0 rounded-md text-xs font-bold transition-all ${
                        qi === currentQ ? "text-white" : mcqAnswers[qi] !== undefined ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                      style={qi === currentQ ? { background: NAVY } : {}}
                    >{qi + 1}</button>
                  ))}
                </div>
                {currentQ < questions.length - 1 ? (
                  <Button size="sm" onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))} style={{ background: NAVY, color: "white" }} className="gap-1 text-xs h-9 px-3">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleMcqSubmit} disabled={!mcqComplete || submitHwMutation.isPending}
                    className="gap-1 text-xs h-9 px-3"
                    style={mcqComplete ? { background: "#16a34a", color: "white" } : {}}
                    data-testid="confirm-submit-hw"
                  >
                    {submitHwMutation.isPending ? "…" : mcqComplete ? "Submit ✓" : `${answeredCount}/${questions.length}`}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MCQ Review overlay ── */}
      {reviewing && (() => {
        const rqs = parsedQuestions(reviewing.questionsJson);
        let rAnswers: number[] = [];
        try { rAnswers = JSON.parse(reviewing.submittedAnswer ?? "[]"); } catch { rAnswers = []; }
        const rq = rqs[reviewQ];
        if (!rq) return null;
        const totalCorrect = rqs.filter((q, i) => rAnswers[i] === q.correctOption).length;
        return (
          <div className="fixed inset-0 z-[200] flex flex-col bg-white" style={{ overscrollBehavior: "contain" }}>
            <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg,${NAVY},#123D7A)` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Review Answers</p>
                <button onClick={() => setReviewing(null)} className="text-white/60 hover:text-white p-1 -mr-1"><X className="w-5 h-5" /></button>
              </div>
              <h2 className="text-white font-bold text-sm leading-snug line-clamp-2">{reviewing.title}</h2>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/80 text-xs">Q {reviewQ + 1}<span className="text-white/40"> / {rqs.length}</span></span>
                <span className="text-white/80 text-xs font-semibold">{totalCorrect}/{rqs.length} correct</span>
              </div>
              <Progress value={(totalCorrect / rqs.length) * 100} className="mt-1.5 h-1 bg-white/20" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                <motion.div key={reviewQ} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="space-y-3">
                  <p className="font-semibold text-sm leading-relaxed">
                    <span className="font-black mr-1.5" style={{ color: ORANGE }}>Q{reviewQ + 1}.</span>
                    {rq.text}
                  </p>
                  <div className="space-y-2">
                    {rq.options.map((opt: string, oi: number) => {
                      const isChosen = rAnswers[reviewQ] === oi;
                      const isCorrect = rq.correctOption === oi;
                      let border = "border-gray-200 bg-white";
                      let labelStyle = "bg-gray-100 text-gray-500";
                      let textStyle = "text-gray-600";
                      if (isCorrect) { border = "border-green-500 bg-green-50"; labelStyle = "bg-green-500 text-white"; textStyle = "text-green-800 font-semibold"; }
                      else if (isChosen) { border = "border-red-400 bg-red-50"; labelStyle = "bg-red-400 text-white"; textStyle = "text-red-700 font-semibold"; }
                      return (
                        <div key={oi} className={`w-full px-3 py-2.5 rounded-xl border-2 flex items-center gap-2.5 ${border}`}>
                          <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-black flex-shrink-0 ${labelStyle}`}>{String.fromCharCode(65 + oi)}</span>
                          <span className={`text-sm flex-1 ${textStyle}`}>{opt}</span>
                          {isCorrect && <span className="text-green-600 text-xs font-bold">✓</span>}
                          {isChosen && !isCorrect && <span className="text-red-500 text-xs font-bold">✗</span>}
                        </div>
                      );
                    })}
                  </div>
                  {rAnswers[reviewQ] !== undefined && rAnswers[reviewQ] !== rq.correctOption && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 font-semibold flex items-center gap-2">
                      <span className="text-green-500 text-base">✓</span>
                      Correct: <span className="font-black">{String.fromCharCode(65 + rq.correctOption)}. {rq.options[rq.correctOption]}</span>
                    </div>
                  )}
                  {rAnswers[reviewQ] === rq.correctOption && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 font-semibold flex items-center gap-2">
                      <span className="text-green-500 text-base">🎉</span>Correct! Well done.
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex-shrink-0 border-t bg-white px-4 py-3 flex items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => setReviewQ(q => Math.max(0, q - 1))} disabled={reviewQ === 0} className="gap-1 text-xs h-9 px-3">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
              <div className="flex gap-1 overflow-x-auto max-w-[40vw] scrollbar-none">
                {rqs.map((q, qi) => {
                  const chosen = rAnswers[qi];
                  const correct = q.correctOption;
                  const isRight = chosen === correct;
                  const isWrong = chosen !== undefined && chosen !== correct;
                  return (
                    <button key={qi} onClick={() => setReviewQ(qi)}
                      className={`w-6 h-6 flex-shrink-0 rounded-md text-xs font-bold transition-all ${
                        qi === reviewQ ? "ring-2 ring-offset-1" : isRight ? "bg-green-500 text-white" : isWrong ? "bg-red-400 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                      style={qi === reviewQ ? { background: NAVY, color: "#fff" } : {}}
                    >{qi + 1}</button>
                  );
                })}
              </div>
              {reviewQ < rqs.length - 1 ? (
                <Button size="sm" onClick={() => setReviewQ(q => Math.min(rqs.length - 1, q + 1))} style={{ background: NAVY, color: "white" }} className="gap-1 text-xs h-9 px-3">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setReviewing(null)} className="text-xs h-9 px-3">Done</Button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Writing Homework Dialog ── */}
      {submitting && !isMcq && (
        <Dialog open={true} onOpenChange={v => !v && closeHwDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{submitting.title}</DialogTitle></DialogHeader>
            {hwSubmitted ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="font-semibold text-lg">Homework Submitted!</p>
                <Button onClick={closeHwDialog} className="mt-2">Done</Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {submitting.driveLink && (
                    <a href={submitting.driveLink} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      Open homework resource / Google Drive
                    </a>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1.5">Your answer:</p>
                    <Textarea placeholder="Type your homework answer here..." value={answer} onChange={e => setAnswer(e.target.value)} rows={5} data-testid="homework-answer" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Attachment (optional — paste a Google Drive / image link):</p>
                    <Input placeholder="https://drive.google.com/..." value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeHwDialog} disabled={submitHwMutation.isPending}>Cancel</Button>
                  <Button onClick={handleWritingSubmit} disabled={!answer.trim() || submitHwMutation.isPending} data-testid="confirm-submit-hw">
                    {submitHwMutation.isPending ? "Submitting…" : "Submit Homework"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Assignment Dialog ── */}
      {submittingAsgn !== null && (
        <Dialog open={true} onOpenChange={v => { if (!v) { setSubmittingAsgn(null); setAsgnAnswer(""); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit Assignment</DialogTitle>
            </DialogHeader>
            <div>
              <p className="text-sm text-muted-foreground mb-1.5">Your answer:</p>
              <Textarea placeholder="Type your assignment answer here..." value={asgnAnswer} onChange={e => setAsgnAnswer(e.target.value)} rows={6} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSubmittingAsgn(null); setAsgnAnswer(""); }} disabled={submitAsgnMutation.isPending}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!asgnAnswer.trim()) return;
                  submitAsgnMutation.mutate({ id: submittingAsgn, data: { answer: asgnAnswer } });
                }}
                disabled={!asgnAnswer.trim() || submitAsgnMutation.isPending}
              >
                {submitAsgnMutation.isPending ? "Submitting…" : "Submit Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}

