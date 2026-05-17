import { useState } from "react";
import { motion } from "framer-motion";
import { useListLiveClasses, useListSubjects, useJoinLiveClass, getListLiveClassesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Clock, Users, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h/24)}d ${h%24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function LiveClassesPage() {
  const [grade, setGrade] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");
  const queryClient = useQueryClient();

  const params = {
    grade: grade !== "all" ? Number(grade) : undefined,
    subjectId: subject !== "all" ? Number(subject) : undefined,
  };

  const { data: classes, isLoading } = useListLiveClasses(params, {
    query: { queryKey: getListLiveClassesQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  const joinMutation = useJoinLiveClass({
    mutation: {
      onSuccess: (data) => {
        window.open(data.joinUrl, "_blank");
      }
    }
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Video className="w-6 h-6 text-red-500" />
            </div>
            Live Classes
          </h1>
          <p className="text-muted-foreground mt-1">Join live sessions with top educators</p>
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
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-44" data-testid="subject-filter">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(subjects ?? []).map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : (classes ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No live classes scheduled</p>
            <p className="text-sm">Check back soon for upcoming sessions</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(classes ?? []).map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`live-class-card-${cls.id}`}
              >
                <Card className={`overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 border-2 ${cls.status === "live" ? "border-red-400" : "border-transparent"}`}>
                  <div className="h-3" style={{ background: `linear-gradient(to right, #0B2B6B, #FF6B1A)` }} />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base leading-tight">{cls.title}</h3>
                      {cls.status === "live" ? (
                        <Badge className="bg-red-500 text-white flex-shrink-0 animate-pulse">LIVE</Badge>
                      ) : cls.status === "upcoming" ? (
                        <Badge variant="outline" className="flex-shrink-0 text-xs border-primary text-primary">{countdown(cls.scheduledAt)}</Badge>
                      ) : (
                        <Badge variant="secondary" className="flex-shrink-0">Ended</Badge>
                      )}
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-secondary">{cls.teacher?.charAt(0)}</span>
                        </div>
                        <span>{cls.teacher}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">{cls.subjectName}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(cls.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{cls.duration} min</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{cls.studentsJoined ?? 0} joined</span>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant={cls.status === "live" ? "default" : "outline"}
                      disabled={cls.status === "ended" || joinMutation.isPending}
                      onClick={() => joinMutation.mutate({ id: cls.id })}
                      data-testid={`join-class-${cls.id}`}
                    >
                      {cls.status === "live" ? "Join Now" : cls.status === "upcoming" ? "Remind Me" : "Class Ended"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
