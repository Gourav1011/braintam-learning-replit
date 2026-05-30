import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListHomework, useSubmitHomework, getListHomeworkQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Send, Lock, ExternalLink, ChevronLeft, ChevronRight, Trophy, X } from "lucide-react";

const EXPIRY_DAYS = 5;
const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  graded: "bg-green-100 text-green-700 border-green-200",
};

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
};

type HwQuestion = { text: string; options: string[]; correctOption: number };

function parsedQuestions(json: string | null | undefined): HwQuestion[] {
  if (!json) return [];
  try {
    const q = JSON.parse(json);
    return Array.isArray(q) ? q : [];
  } catch { return []; }
}

export default function HomeworkPage() {
  const [subject, setSubject] = useState<string>("all");
  const [submitting, setSubmitting] = useState<ExtendedHw | null>(null);

  const [answer, setAnswer] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const queryClient = useQueryClient();
  const params = { subjectId: subject !== "all" ? Number(subject) : undefined };

  const { data: rawHomework, isLoading } = useListHomework(params, {
    query: { queryKey: getListHomeworkQueryKey(params) }
  });

  const homework = (rawHomework ?? []) as unknown as ExtendedHw[];

  const submitMutation = useSubmitHomework({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHomeworkQueryKey(params) });
        setSubmitted(true);
      }
    }
  });

  const questions: HwQuestion[] = submitting ? parsedQuestions(submitting.questionsJson) : [];
  // Detect MCQ from questionsJson data (not homeworkType) — backward-compatible with
  // old records where homework_type defaulted to "writing" before the column existed.
  const isMcq = !!(submitting && questions.length > 0);
  const mcqComplete = questions.length > 0 && questions.every((_, i) => mcqAnswers[i] !== undefined);
  const answeredCount = Object.keys(mcqAnswers).length;

  function openSubmit(hw: ExtendedHw) {
    setSubmitting(hw);
    setAnswer("");
    setAttachmentUrl("");
    setMcqAnswers({});
    setCurrentQ(0);
    setSubmitted(false);
  }

  function closeDialog() {
    if (submitMutation.isPending) return;
    setSubmitting(null);
    setSubmitted(false);
    setMcqAnswers({});
    setCurrentQ(0);
  }

  function selectOption(qi: number, oi: number) {
    if (submitted) return;
    setMcqAnswers(prev => ({ ...prev, [qi]: oi }));
    if (qi < questions.length - 1) {
      setTimeout(() => setCurrentQ(q => Math.min(questions.length - 1, q + 1)), 500);
    }
  }

  function handleWritingSubmit() {
    if (!submitting || !answer.trim()) return;
    submitMutation.mutate({ id: submitting.id, data: { answer, attachmentUrl: attachmentUrl.trim() || null } });
  }

  function handleMcqSubmit() {
    if (!submitting || !mcqComplete) return;
    const answerStr = JSON.stringify(questions.map((_, i) => mcqAnswers[i] ?? -1));
    submitMutation.mutate({ id: submitting.id, data: { answer: answerStr, attachmentUrl: null } });
  }

  const currentQuestion = questions[currentQ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            Homework
          </h1>
          <p className="text-muted-foreground mt-1">Complete and submit your homework on time</p>
        </motion.div>

        <div className="flex gap-3">
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="1">Mathematics</SelectItem>
              <SelectItem value="2">Science</SelectItem>
              <SelectItem value="3">English</SelectItem>
              <SelectItem value="4">Hindi</SelectItem>
              <SelectItem value="5">Social Science</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : homework.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No homework pending</p>
          </div>
        ) : (
          <div className="space-y-4">
            {homework.map((hw, i) => {
              const days = daysUntil(hw.dueDate);
              const isUrgent = days <= 2 && days >= 0;
              const isExpired = hw.status === "pending" && days < -EXPIRY_DAYS;
              const isDone = hw.status === "submitted" || hw.status === "graded";
              const hwQuestions = parsedQuestions(hw.questionsJson);
              // Detect MCQ from questionsJson presence (backward-compat with rows stored as "writing")
              const isMcqHw = hwQuestions.length > 0;

              return (
                <motion.div
                  key={hw.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  data-testid={`homework-card-${hw.id}`}
                  className={isExpired || isDone ? "pointer-events-none select-none" : ""}
                >
                  <Card className={`border-2 transition-all ${
                    isExpired
                      ? "border-gray-200 bg-gray-100 opacity-50"
                      : isDone
                        ? "border-gray-200 bg-gray-50 opacity-70"
                        : isUrgent
                          ? "border-red-300 bg-red-50/30"
                          : "border-border"
                  }`}>
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isExpired || isDone ? "bg-gray-200" :
                        isUrgent ? "bg-red-100" : "bg-yellow-100"
                      }`}>
                        {isExpired
                          ? <Lock className="w-6 h-6 text-gray-400" />
                          : isDone
                            ? <CheckCircle className="w-6 h-6 text-gray-400" />
                            : <FileText className={`w-6 h-6 ${isUrgent ? "text-red-600" : "text-yellow-600"}`} />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title row with badges */}
                        <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                          <h3 className={`font-bold text-base leading-snug ${isExpired || isDone ? "text-gray-400" : ""}`}>
                            {hw.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isMcqHw && (
                              <Badge className="text-xs border bg-blue-50 text-blue-600 border-blue-200">📝 {hwQuestions.length} MCQs</Badge>
                            )}
                            {!isMcqHw && hw.homeworkType === "writing" && (
                              <Badge className="text-xs border bg-orange-50 text-orange-600 border-orange-200">✍ Writing</Badge>
                            )}
                            {isExpired && (
                              <Badge className="text-xs border bg-gray-100 text-gray-400 border-gray-200">Expired</Badge>
                            )}
                            <Badge className={`text-xs border ${statusColors[hw.status] ?? ""}`}>
                              {hw.status.charAt(0).toUpperCase() + hw.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-xs">{hw.subjectName}</Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          {isExpired ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <Clock className="w-3.5 h-3.5" />Submission closed
                            </span>
                          ) : days >= 0 && days <= 7 ? (
                            <span className={`flex items-center gap-1 font-medium ${isUrgent ? "text-red-600" : "text-orange-500"}`}>
                              {isUrgent && <AlertCircle className="w-3.5 h-3.5" />}
                              {days === 0 ? "Due today!" : `${days}d left`}
                            </span>
                          ) : days < 0 && !isExpired ? (
                            <span className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                              Overdue · {Math.abs(days)}d ago
                            </span>
                          ) : null}
                        </div>

                        {/* Description */}
                        {hw.description && (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{hw.description}</p>
                        )}

                        {/* Drive link */}
                        {hw.driveLink && !isMcqHw && !isDone && (
                          <a
                            href={hw.driveLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline font-medium pointer-events-auto"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" /> View homework resource
                          </a>
                        )}

                        {/* Score / status */}
                        {hw.marks !== null && hw.marks !== undefined && (
                          <p className="mt-1.5 text-sm font-semibold text-green-600">
                            Score: {hw.marks}/{hw.maxMarks}
                          </p>
                        )}
                        {isExpired && (
                          <p className="text-xs text-gray-400 mt-1">Expired — submission closed</p>
                        )}
                        {isDone && (
                          <p className="text-xs text-gray-400 mt-1">
                            {hw.status === "graded" ? "Graded by teacher" : "Submitted — awaiting review"}
                          </p>
                        )}

                        {/* Submit / Start Quiz button — below content, right-aligned */}
                        {hw.status === "pending" && !isExpired && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              onClick={() => openSubmit(hw)}
                              data-testid={`submit-hw-${hw.id}`}
                              style={{ background: isMcqHw ? NAVY : ORANGE, color: "white" }}
                            >
                              {isMcqHw ? "📝 Start Quiz" : <><Send className="w-4 h-4 mr-1.5" />Submit Homework</>}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── MCQ Quiz — full-screen overlay ── */}
        {submitting && isMcq && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ overscrollBehavior: "contain" }}>
            {submitted ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-5 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Quiz Submitted!</h2>
                  <p className="text-muted-foreground text-sm mt-1">{submitting.title}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You answered {answeredCount} of {questions.length} questions
                  </p>
                </div>
                <Button onClick={closeDialog} style={{ background: NAVY, color: "white" }} className="px-8">
                  Done
                </Button>
              </div>
            ) : (
              <>
                {/* Header — fixed height, gradient */}
                <div className="flex-shrink-0 px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg,${NAVY},#123D7A)` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">MCQ Quiz</p>
                    <button onClick={closeDialog} className="text-white/60 hover:text-white p-1 -mr-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <h2 className="text-white font-bold text-sm leading-snug line-clamp-2">{submitting.title}</h2>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/80 text-xs">
                      Q {currentQ + 1}<span className="text-white/40"> / {questions.length}</span>
                    </span>
                    <span className="text-white/80 text-xs">{answeredCount}/{questions.length} answered</span>
                  </div>
                  <Progress value={(answeredCount / questions.length) * 100} className="mt-1.5 h-1 bg-white/20" />
                </div>

                {/* Scrollable question body */}
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
                        {currentQuestion.text}
                      </p>

                      <div className="space-y-2">
                        {currentQuestion.options.map((opt: string, oi: number) => {
                          const isSelected = mcqAnswers[currentQ] === oi;
                          return (
                            <button
                              key={oi}
                              onClick={() => selectOption(currentQ, oi)}
                              className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all font-medium text-sm flex items-center gap-2.5 ${
                                isSelected
                                  ? "border-orange-400 bg-orange-50"
                                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <span
                                className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-black flex-shrink-0 transition-all ${
                                  isSelected ? "text-white" : "bg-gray-100 text-gray-500"
                                }`}
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

                {/* Sticky footer — always visible */}
                <div className="flex-shrink-0 border-t bg-white px-4 py-3 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                    disabled={currentQ === 0}
                    className="gap-1 text-xs h-9 px-3"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </Button>

                  {/* Question dot navigator — scrolls if many Qs */}
                  <div className="flex gap-1 overflow-x-auto max-w-[40vw] scrollbar-none">
                    {questions.map((_, qi) => (
                      <button
                        key={qi}
                        onClick={() => setCurrentQ(qi)}
                        className={`w-6 h-6 flex-shrink-0 rounded-md text-xs font-bold transition-all ${
                          qi === currentQ
                            ? "text-white"
                            : mcqAnswers[qi] !== undefined
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-400"
                        }`}
                        style={qi === currentQ ? { background: NAVY } : {}}
                      >
                        {qi + 1}
                      </button>
                    ))}
                  </div>

                  {currentQ < questions.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                      style={{ background: NAVY, color: "white" }}
                      className="gap-1 text-xs h-9 px-3"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleMcqSubmit}
                      disabled={!mcqComplete || submitMutation.isPending}
                      className="gap-1 text-xs h-9 px-3"
                      style={mcqComplete ? { background: "#16a34a", color: "white" } : {}}
                      data-testid="confirm-submit-hw"
                    >
                      {submitMutation.isPending ? "…" : mcqComplete ? "Submit ✓" : `${answeredCount}/${questions.length}`}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Writing Homework Dialog ── */}
        {submitting && !isMcq && (
          <Dialog open={true} onOpenChange={v => !v && closeDialog()}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{submitting.title}</DialogTitle>
              </DialogHeader>

              {submitted ? (
                <div className="py-6 text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="font-semibold text-lg">Homework Submitted!</p>
                  <Button onClick={closeDialog} className="mt-2">Done</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {submitting.driveLink && (
                      <a
                        href={submitting.driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        Open homework resource / Google Drive
                      </a>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">Your answer:</p>
                      <Textarea
                        placeholder="Type your homework answer here..."
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        rows={5}
                        data-testid="homework-answer"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Attachment (optional — paste a Google Drive / image link):</p>
                      <Input
                        placeholder="https://drive.google.com/... or image URL"
                        value={attachmentUrl}
                        onChange={e => setAttachmentUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog} disabled={submitMutation.isPending}>Cancel</Button>
                    <Button
                      onClick={handleWritingSubmit}
                      disabled={!answer.trim() || submitMutation.isPending}
                      data-testid="confirm-submit-hw"
                    >
                      {submitMutation.isPending ? "Submitting…" : "Submit Homework"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* ── MCQ homework with no questions (fallback) ── */}
        {submitting && submitting.homeworkType === "mcq" && questions.length === 0 && (
          <Dialog open={true} onOpenChange={v => !v && closeDialog()}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>{submitting.title}</DialogTitle></DialogHeader>
              <div className="py-4 text-center text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-orange-400" />
                <p className="text-sm">This MCQ homework has no questions set up yet. Please check back later.</p>
              </div>
              <DialogFooter><Button variant="outline" onClick={closeDialog}>Close</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
