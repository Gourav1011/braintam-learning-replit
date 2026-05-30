import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListTests, getListTestsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Clock, Calendar, Trophy, AlertCircle, PlayCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `Starts in ${Math.floor(h / 24)} days`;
  return h > 0 ? `Starts in ${h}h ${m}m` : `Starts in ${m}m`;
}

function formatScheduled(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

const STATUS_ORDER: Record<string, number> = { ongoing: 0, active: 0, upcoming: 1, completed: 2 };

const statusStyle: Record<string, { dot: string; badge: string; label: string }> = {
  upcoming:  { dot: "bg-blue-400",  badge: "bg-blue-100 text-blue-700",   label: "Upcoming" },
  ongoing:   { dot: "bg-green-500", badge: "bg-green-100 text-green-700", label: "Ongoing" },
  active:    { dot: "bg-green-500", badge: "bg-green-100 text-green-700", label: "Live Now" },
  completed: { dot: "bg-gray-300",  badge: "bg-gray-100 text-gray-600",   label: "Completed" },
};

export default function TestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { student } = useAuth();
  const effectiveGrade = student?.effectiveGrade ?? student?.grade;

  const params = {
    grade: effectiveGrade,
    status: statusFilter !== "all" ? (statusFilter as "upcoming" | "ongoing" | "completed") : undefined,
  };

  const { data: rawTests, isLoading } = useListTests(params, {
    query: { queryKey: getListTestsQueryKey(params) }
  });

  // Sort: ongoing first → upcoming ascending → completed ascending
  const tests = [...(rawTests ?? [])].sort((a, b) => {
    const ao = STATUS_ORDER[a.status] ?? 1;
    const bo = STATUS_ORDER[b.status] ?? 1;
    if (ao !== bo) return ao - bo;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-purple-600" />
            </div>
            Tests &amp; Quizzes
          </h1>
          <p className="text-muted-foreground mt-1">
            Assess your learning with chapter-wise tests
            {effectiveGrade && <span className="ml-2 text-sm font-medium text-primary">· Grade {effectiveGrade}</span>}
          </p>
        </motion.div>

        {/* Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No tests found</p>
            <p className="text-sm mt-1">Check back later for upcoming tests</p>
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-white shadow-sm">
            {tests.map((test, i) => {
              const st = statusStyle[test.status] ?? statusStyle.upcoming;
              const isOngoing = test.status === "ongoing" || (test.status as string) === "active";
              const isUpcoming = test.status === "upcoming";
              const isCompleted = test.status === "completed";
              const timer = isUpcoming ? countdown(test.scheduledAt) : null;

              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  data-testid={`test-card-${test.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 truncate">{test.title}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-[10px] py-0">{test.subjectName}</Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatScheduled(test.scheduledAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{test.duration} min
                      </span>
                      <span>{test.totalQuestions} Qs</span>
                    </div>
                    {/* Countdown for upcoming */}
                    {timer && (
                      <div className="mt-0.5 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{timer}
                      </div>
                    )}
                    {/* Score for completed */}
                    {isCompleted && test.score != null && test.maxScore && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-yellow-600">
                        <Trophy className="w-3 h-3" />
                        {test.score}/{test.maxScore} ({Math.round((test.score / test.maxScore) * 100)}%)
                      </div>
                    )}
                  </div>

                  {/* Action — right side */}
                  <div className="flex-shrink-0">
                    {isOngoing ? (
                      <Link href={`/tests/${test.id}`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" data-testid={`start-test-${test.id}`}>
                          <PlayCircle className="w-3.5 h-3.5 mr-1" /> Start
                        </Button>
                      </Link>
                    ) : isCompleted ? (
                      <Button variant="outline" size="sm">Review</Button>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
