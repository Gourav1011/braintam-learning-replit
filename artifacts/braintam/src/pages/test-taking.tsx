import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetTest, useSubmitTest, getGetTestQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Trophy } from "lucide-react";

export default function TestTakingPage() {
  const [, params] = useRoute("/tests/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number; passed: boolean; correctAnswers: number; wrongAnswers: number } | null>(null);

  const { data: test, isLoading } = useGetTest(id, {
    query: { enabled: !!id, queryKey: getGetTestQueryKey(id) }
  });

  const submitMutation = useSubmitTest({
    mutation: {
      onSuccess: (data) => {
        setResult({
          score: data.score ?? 0,
          maxScore: data.maxScore ?? 0,
          percentage: data.percentage ?? 0,
          passed: data.passed ?? false,
          correctAnswers: data.correctAnswers ?? 0,
          wrongAnswers: data.wrongAnswers ?? 0,
        });
        setShowConfirm(false);
      }
    }
  });

  useEffect(() => {
    if (test?.duration) {
      setTimeLeft(test.duration * 60);
    }
  }, [test]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const timer = setInterval(() => setTimeLeft(t => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    const answerList = Object.entries(answers).map(([qId, opt]) => ({ questionId: Number(qId), selectedOption: opt }));
    submitMutation.mutate({ id, data: { answers: answerList } });
  };

  if (isLoading) return <AppLayout><div className="p-6"><Skeleton className="w-full h-96" /></div></AppLayout>;
  if (!test) return <AppLayout><div className="p-6 text-center text-muted-foreground">Test not found</div></AppLayout>;

  const questions = test.questions ?? [];
  const question = questions[currentQ];
  const answered = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answered / questions.length) * 100 : 0;

  if (result) {
    return (
      <AppLayout>
        <div className="p-6 max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${result.passed ? "bg-green-100" : "bg-red-100"}`}>
              {result.passed ? <CheckCircle className="w-12 h-12 text-green-600" /> : <XCircle className="w-12 h-12 text-red-600" />}
            </div>
            <div>
              <h2 className="text-3xl font-bold">{result.passed ? "Congratulations!" : "Keep Practicing!"}</h2>
              <p className="text-muted-foreground mt-1">{test.title}</p>
            </div>
            <Card className="text-left">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{result.percentage}%</div>
                  <div className="text-muted-foreground text-sm mt-1">Score: {result.score}/{result.maxScore}</div>
                </div>
                <Progress value={result.percentage} className="h-4" />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-green-50 rounded-xl p-3">
                    <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                    <div className="font-bold text-xl text-green-600">{result.correctAnswers}</div>
                    <div className="text-xs text-muted-foreground">Correct</div>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                    <div className="font-bold text-xl text-red-600">{result.wrongAnswers}</div>
                    <div className="text-xs text-muted-foreground">Wrong</div>
                  </div>
                </div>
                {result.passed && (
                  <div className="flex items-center gap-2 bg-yellow-50 rounded-xl p-3">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700">+{Math.round(result.score * 10)} points earned!</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setLocation("/tests")}>Back to Tests</Button>
              <Button className="flex-1" onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{test.title}</h2>
            <p className="text-sm text-muted-foreground">Question {currentQ + 1} of {questions.length}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${timeLeft !== null && timeLeft < 300 ? "bg-red-100 text-red-600" : "bg-muted text-foreground"}`} data-testid="timer">
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answered} answered</span>
            <span>{questions.length - answered} remaining</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        {question && (
          <AnimatePresence mode="wait">
            <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card className="border-2">
                <CardContent className="p-6 space-y-6">
                  <p className="text-lg font-semibold leading-relaxed">{question.text}</p>
                  <div className="space-y-3">
                    {question.options.map((opt, oi) => {
                      const isSelected = answers[question.id] === oi;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers(prev => ({ ...prev, [question.id]: oi }))}
                          className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium ${isSelected ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 hover:bg-muted/40"}`}
                          data-testid={`option-${oi}`}
                        >
                          <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-sm mr-3 flex-shrink-0 ${isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <div className="flex gap-1">
            {questions.map((q, qi) => (
              <button
                key={qi}
                onClick={() => setCurrentQ(qi)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${qi === currentQ ? "bg-primary text-white" : answers[q.id] !== undefined ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}
                data-testid={`q-nav-${qi}`}
              >
                {qi + 1}
              </button>
            ))}
          </div>
          {currentQ < questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setShowConfirm(true)} className="bg-green-600 hover:bg-green-700" data-testid="submit-test-btn">
              Submit Test
            </Button>
          )}
        </div>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Test?</DialogTitle></DialogHeader>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>You have answered <strong>{answered}</strong> of <strong>{questions.length}</strong> questions.</p>
              {answered < questions.length && <p className="text-orange-600 font-medium">Warning: {questions.length - answered} questions are unanswered.</p>}
              <p>Are you sure you want to submit?</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Review Answers</Button>
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} data-testid="confirm-submit-test">
                {submitMutation.isPending ? "Submitting..." : "Yes, Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
