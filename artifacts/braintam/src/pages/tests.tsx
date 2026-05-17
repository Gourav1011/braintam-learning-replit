import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListTests, getListTestsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Clock, Calendar, Trophy, AlertCircle, PlayCircle } from "lucide-react";

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `Starts in ${Math.floor(h/24)} days`;
  return h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`;
}

const statusConfig = {
  upcoming: { label: "Upcoming", bg: "bg-blue-100 text-blue-700", icon: Calendar },
  ongoing: { label: "Ongoing", bg: "bg-green-100 text-green-700", icon: PlayCircle },
  completed: { label: "Completed", bg: "bg-gray-100 text-gray-700", icon: CheckSquare },
};

export default function TestsPage() {
  const [grade, setGrade] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const params = {
    grade: grade !== "all" ? Number(grade) : undefined,
    status: status !== "all" ? (status as "upcoming" | "ongoing" | "completed") : undefined,
  };

  const { data: tests, isLoading } = useListTests(params, {
    query: { queryKey: getListTestsQueryKey(params) }
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-purple-600" />
            </div>
            Tests & Quizzes
          </h1>
          <p className="text-muted-foreground mt-1">Assess your learning with chapter-wise tests</p>
        </motion.div>

        <div className="flex gap-3 flex-wrap">
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="w-36" data-testid="grade-filter">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[1,2,3,4,5,6,7,8,9,10].map(g => (
                <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40" data-testid="status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
        ) : (tests ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No tests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(tests ?? []).map((test, i) => {
              const cfg = statusConfig[test.status as keyof typeof statusConfig];
              const Icon = cfg.icon;
              const timer = test.status === "upcoming" ? countdown(test.scheduledAt) : null;
              const isOngoing = test.status === "ongoing";
              return (
                <motion.div key={test.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} data-testid={`test-card-${test.id}`}>
                  <Card className={`border-2 ${isOngoing ? "border-green-400 shadow-md" : "border-border"}`}>
                    <CardContent className="p-5 flex items-start gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg.split(" ")[0]}`}>
                        <Icon className={`w-6 h-6 ${cfg.bg.split(" ")[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base">{test.title}</h3>
                          <Badge className={`text-xs flex-shrink-0 ${cfg.bg}`}>{cfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-xs">{test.subjectName}</Badge>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(test.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.duration} min</span>
                          <span>{test.totalQuestions} questions</span>
                        </div>
                        {timer && (
                          <div className="mt-2 text-xs font-semibold text-blue-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />{timer}
                          </div>
                        )}
                        {test.score !== null && test.score !== undefined && test.maxScore && (
                          <div className="mt-2 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-semibold">Score: {test.score}/{test.maxScore} ({Math.round((test.score/test.maxScore)*100)}%)</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isOngoing ? (
                          <Link href={`/tests/${test.id}`}>
                            <Button className="bg-green-600 hover:bg-green-700" data-testid={`start-test-${test.id}`}>
                              <PlayCircle className="w-4 h-4 mr-1" /> Start Now
                            </Button>
                          </Link>
                        ) : test.status === "upcoming" ? (
                          <Button variant="outline" disabled>Upcoming</Button>
                        ) : (
                          <Button variant="outline" size="sm">Review</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
