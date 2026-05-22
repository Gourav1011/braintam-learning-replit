import { Redirect } from "wouter";
import { motion } from "framer-motion";
import { useGetStudentDashboard, useGetLeaderboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { Video, BookOpen, FileText, CheckSquare, Award, Flame, ArrowRight, PlayCircle, Star } from "lucide-react";
import { Link } from "wouter";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

const activityIcons: Record<string, any> = {
  live_class: Video,
  recording: PlayCircle,
  homework: FileText,
  assignment: FileText,
  test: CheckSquare,
  video: PlayCircle,
  course: BookOpen,
};

const activityColors: Record<string, string> = {
  live_class: "text-red-500 bg-red-50",
  recording: "text-blue-500 bg-blue-50",
  homework: "text-yellow-500 bg-yellow-50",
  assignment: "text-orange-500 bg-orange-50",
  test: "text-purple-500 bg-purple-50",
  video: "text-cyan-500 bg-cyan-50",
  course: "text-green-500 bg-green-50",
};

export default function DashboardPage() {
  const { student, role, isLoading: authLoading } = useAuth();

  if (!authLoading && role === "admin") return <Redirect to="/admin" />;
  if (!authLoading && role === "teacher") return <Redirect to="/teacher" />;

  const { data: dashboard, isLoading } = useGetStudentDashboard();
  const { data: leaderboard } = useGetLeaderboard();

  const statCards = [
    { label: "Upcoming Live Classes", value: dashboard?.upcomingLiveClasses ?? 0, icon: Video, color: "text-red-500", bg: "bg-red-50", href: "/live-classes" },
    { label: "Pending Homework", value: dashboard?.pendingHomework ?? 0, icon: FileText, color: "text-yellow-500", bg: "bg-yellow-50", href: "/homework" },
    { label: "Pending Assignments", value: dashboard?.pendingAssignments ?? 0, icon: BookOpen, color: "text-orange-500", bg: "bg-orange-50", href: "/assignments" },
    { label: "Upcoming Tests", value: dashboard?.upcomingTests ?? 0, icon: CheckSquare, color: "text-purple-500", bg: "bg-purple-50", href: "/tests" },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isLoading ? <Skeleton className="w-64 h-8" /> : `Welcome back, ${dashboard?.studentName?.split(" ")[0] ?? student?.name?.split(" ")[0] ?? "Student"}!`}
            </h1>
            <p className="text-muted-foreground mt-1">Grade {dashboard?.grade ?? student?.grade ?? "—"} | Keep up the great work!</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl" data-testid="streak-counter">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-orange-600">{dashboard?.streakDays ?? 0} day streak</span>
            </div>
            <div className="flex items-center gap-2 bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-xl" data-testid="points-display">
              <Star className="w-5 h-5 text-secondary" />
              <span className="font-bold text-secondary">{dashboard?.points ?? 0} pts</span>
              <span className="text-muted-foreground text-sm">• Rank #{dashboard?.rank ?? "—"}</span>
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}>
              <Link href={card.href}>
                <Card className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1 border-2 hover:border-primary/20" data-testid={`stat-card-${i}`}>
                  <CardContent className="p-5">
                    <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    {isLoading ? (
                      <Skeleton className="w-12 h-8 mb-1" />
                    ) : (
                      <div className="text-3xl font-bold text-foreground">{card.value}</div>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">{card.label}</div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Subject Progress */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Subject Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-8" />)
                ) : (
                  dashboard?.subjectProgress?.map((sp, i) => (
                    <motion.div key={sp.subjectId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} data-testid={`subject-progress-${sp.subjectId}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{sp.subjectName}</span>
                        <span className="text-muted-foreground">{Math.round(sp.progress)}%</span>
                      </div>
                      <Progress value={sp.progress} className="h-2.5" style={{ "--progress-indicator-color": sp.color } as any} />
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Leaderboard Preview */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2"><Award className="w-5 h-5 text-yellow-500" /> Top Rankers</span>
                  <Link href="/leaderboard">
                    <Button variant="ghost" size="sm" className="text-primary text-xs">View All</Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(leaderboard ?? []).slice(0, 5).map((entry, i) => (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className={`flex items-center gap-3 p-2 rounded-lg ${i < 3 ? "bg-yellow-50" : "bg-muted/30"}`}
                    data-testid={`leaderboard-entry-${entry.rank}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      {entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{entry.studentName}</div>
                      <div className="text-xs text-muted-foreground">{entry.points} pts</div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Recent Activity</span>
                <Button variant="ghost" size="sm" className="text-primary text-xs" asChild>
                  <Link href="/recordings">View All <ArrowRight className="ml-1 w-3 h-3" /></Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="w-full h-12" />)
                ) : (
                  (dashboard?.recentActivity ?? []).slice(0, 5).map((item, i) => {
                    const Icon = activityIcons[item.type] ?? BookOpen;
                    const colorClass = activityColors[item.type] ?? "text-gray-500 bg-gray-50";
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        data-testid={`activity-item-${item.id}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.subjectName} • {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                        </div>
                        {item.score !== null && item.score !== undefined && (
                          <Badge variant="secondary" className="text-xs">{item.score}%</Badge>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
