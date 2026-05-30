import { useState } from "react";
import { motion } from "framer-motion";
import { useListHomework, useSubmitHomework, getListHomeworkQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Send, Lock, ExternalLink } from "lucide-react";

const EXPIRY_DAYS = 5;

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

function parsedQuestions(json: string | null | undefined): Array<{ type: string; text: string; options: string[]; correctOption: number }> {
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
        setSubmitting(null);
        setAnswer("");
        setAttachmentUrl("");
        setMcqAnswers({});
      }
    }
  });

  const isMcq = submitting && (submitting.homeworkType === "mcq") && parsedQuestions(submitting.questionsJson).length > 0;
  const questions = submitting ? parsedQuestions(submitting.questionsJson) : [];

  const handleSubmit = () => {
    if (!submitting) return;
    if (isMcq) {
      const answerStr = JSON.stringify(questions.map((_, i) => mcqAnswers[i] ?? -1));
      submitMutation.mutate({ id: submitting.id, data: { answer: answerStr, attachmentUrl: null } });
    } else {
      if (!answer.trim()) return;
      submitMutation.mutate({ id: submitting.id, data: { answer, attachmentUrl: attachmentUrl.trim() || null } });
    }
  };

  const mcqComplete = isMcq && questions.every((_, i) => mcqAnswers[i] !== undefined);

  const handleSelectMcq = (qi: number, oi: number) => {
    const newAnswers = { ...mcqAnswers, [qi]: oi };
    setMcqAnswers(newAnswers);
    if (!submitting) return;
    const allDone = questions.every((_, i) => newAnswers[i] !== undefined);
    if (allDone) {
      const answerStr = JSON.stringify(questions.map((_, i) => newAnswers[i] ?? -1));
      setTimeout(() => {
        submitMutation.mutate({ id: submitting.id, data: { answer: answerStr, attachmentUrl: null } });
      }, 400);
    }
  };

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
              const hwQuestions = parsedQuestions(hw.questionsJson);
              const isMcqHw = hw.homeworkType === "mcq" && hwQuestions.length > 0;
              return (
                <motion.div
                  key={hw.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  data-testid={`homework-card-${hw.id}`}
                >
                  <Card className={`border-2 transition-all ${
                    isExpired
                      ? "border-gray-200 bg-gray-50 opacity-60"
                      : isUrgent && hw.status === "pending"
                        ? "border-red-300 bg-red-50/30"
                        : "border-border"
                  }`}>
                    <CardContent className="p-5 flex items-start gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isExpired ? "bg-gray-200" :
                        hw.status === "graded" ? "bg-green-100" :
                        hw.status === "submitted" ? "bg-blue-100" :
                        isUrgent ? "bg-red-100" : "bg-yellow-100"
                      }`}>
                        {isExpired
                          ? <Lock className="w-6 h-6 text-gray-400" />
                          : <FileText className={`w-6 h-6 ${hw.status === "graded" ? "text-green-600" : hw.status === "submitted" ? "text-blue-600" : isUrgent ? "text-red-600" : "text-yellow-600"}`} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`font-bold text-base ${isExpired ? "text-gray-400" : ""}`}>{hw.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isMcqHw && (
                              <Badge className="text-xs border bg-blue-50 text-blue-600 border-blue-200">📝 {hwQuestions.length} Qs</Badge>
                            )}
                            {hw.homeworkType === "writing" && (
                              <Badge className="text-xs border bg-orange-50 text-orange-600 border-orange-200">✍ Writing</Badge>
                            )}
                            {isExpired && (
                              <Badge className="text-xs border bg-gray-100 text-gray-400 border-gray-200">Expired</Badge>
                            )}
                            <Badge className={`text-xs border flex-shrink-0 ${statusColors[hw.status] ?? ""}`}>
                              {hw.status.charAt(0).toUpperCase() + hw.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">{hw.subjectName}</Badge>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          {isExpired ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              Submission closed
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
                        {hw.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{hw.description}</p>}
                        {hw.driveLink && hw.homeworkType === "writing" && (
                          <a href={hw.driveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline font-medium">
                            <ExternalLink className="w-3 h-3" /> View homework resource
                          </a>
                        )}
                        {hw.marks !== null && hw.marks !== undefined && (
                          <div className="mt-2 text-sm font-semibold text-green-600">
                            Score: {hw.marks}/{hw.maxMarks}
                          </div>
                        )}
                        {isExpired && (
                          <p className="text-xs text-gray-400 mt-2">
                            This homework expired {EXPIRY_DAYS} days after the due date and can no longer be submitted.
                          </p>
                        )}
                      </div>
                      {hw.status === "pending" && !isExpired && (
                        <Button onClick={() => { setSubmitting(hw); setAnswer(""); setAttachmentUrl(""); setMcqAnswers({}); }} className="flex-shrink-0" data-testid={`submit-hw-${hw.id}`}>
                          <Send className="w-4 h-4 mr-1" /> Submit
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Submit Dialog */}
        <Dialog open={!!submitting} onOpenChange={v => !v && setSubmitting(null)}>
          <DialogContent className={isMcq ? "max-w-2xl" : "max-w-lg"}>
            <DialogHeader>
              <DialogTitle>{submitting?.title}</DialogTitle>
            </DialogHeader>

            {/* MCQ Quiz */}
            {isMcq && (
              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground">Select the correct answer for each question</p>
                {questions.map((q, qi) => (
                  <div key={qi} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50">
                    <p className="font-semibold text-sm">
                      <span className="text-orange-500 font-black mr-2">Q{qi + 1}.</span>{q.text}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
                      {q.options.map((opt: string, oi: number) => (
                        <label key={oi} className={`flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 border-2 transition-all text-sm ${
                          mcqAnswers[qi] === oi
                            ? "border-orange-400 bg-orange-50 font-semibold"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}>
                          <input
                            type="radio"
                            name={`q${qi}`}
                            checked={mcqAnswers[qi] === oi}
                            onChange={() => handleSelectMcq(qi, oi)}
                            className="accent-orange-500"
                          />
                          <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Writing Homework */}
            {!isMcq && (
              <div className="space-y-3">
                {submitting?.driveLink && (
                  <a href={submitting.driveLink} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
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
                  <p className="text-xs text-muted-foreground mb-1">Upload image (optional — paste a Google Drive / image link):</p>
                  <Input
                    placeholder="https://drive.google.com/... or image URL"
                    value={attachmentUrl}
                    onChange={e => setAttachmentUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitting(null)} disabled={submitMutation.isPending}>Cancel</Button>
              {isMcq ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!mcqComplete || submitMutation.isPending}
                  data-testid="confirm-submit-hw"
                >
                  {submitMutation.isPending
                    ? "Submitting…"
                    : mcqComplete
                    ? "Submit Quiz ✓"
                    : `${Object.keys(mcqAnswers).length}/${questions.length} answered`}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!answer.trim() || submitMutation.isPending}
                  data-testid="confirm-submit-hw"
                >
                  {submitMutation.isPending ? "Submitting…" : "Submit Homework"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
