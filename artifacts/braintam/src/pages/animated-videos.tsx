import { useState } from "react";
import { motion } from "framer-motion";
import { useListAnimatedVideos, useListSubjects, getListAnimatedVideosQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Clock, Eye, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m` : `${seconds}s`;
}

const subjectColors: Record<string, string> = {
  Mathematics: "from-blue-500 to-cyan-400",
  Science: "from-green-500 to-emerald-400",
  English: "from-purple-500 to-violet-400",
  Hindi: "from-orange-500 to-amber-400",
  "Social Science": "from-yellow-500 to-amber-300",
  "Computer Science": "from-sky-500 to-blue-400",
};

export default function AnimatedVideosPage() {
  const [subject, setSubject] = useState<string>("all");
  const { student } = useAuth();

  const effectiveGrade = student?.effectiveGrade ?? student?.grade;

  const params = {
    grade: effectiveGrade,
    subjectId: subject !== "all" ? Number(subject) : undefined,
  };

  const { data: videos, isLoading } = useListAnimatedVideos(params, {
    query: { queryKey: getListAnimatedVideosQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            Animated Videos
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn through fun animated concept explanations
            {effectiveGrade && <span className="ml-2 text-sm font-medium text-primary">· Grade {effectiveGrade}</span>}
          </p>
        </motion.div>

        <div className="flex gap-3 flex-wrap">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-60" />)}
          </div>
        ) : (videos ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No animated videos found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {(videos ?? []).map((video, i) => {
              const gradient = subjectColors[video.subjectName] ?? "from-primary to-secondary";
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  data-testid={`video-card-${video.id}`}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-2 cursor-pointer group border-2 hover:border-purple-200">
                    <div className="relative">
                      <div className={`w-full h-44 bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-20">
                          {[...Array(4)].map((_, j) => (
                            <motion.div
                              key={j}
                              className="absolute rounded-full bg-white"
                              style={{ width: 30 + j * 20, height: 30 + j * 20, left: `${15 + j * 20}%`, top: `${10 + j * 15}%` }}
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2 + j, repeat: Infinity }}
                            />
                          ))}
                        </div>
                        <div className="relative z-10 text-center text-white">
                          <motion.div
                            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto group-hover:scale-110 transition-transform"
                            whileHover={{ scale: 1.2 }}
                          >
                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                          </motion.div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{video.title}</h3>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{video.subjectName}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" />{video.views ?? 0}
                        </span>
                      </div>
                      <Button size="sm" className="w-full" onClick={() => window.open(video.videoUrl, "_blank")}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Watch Now
                      </Button>
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
