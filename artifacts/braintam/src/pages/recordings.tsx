import { useState } from "react";
import { motion } from "framer-motion";
import { useListRecordings, useListSubjects, getListRecordingsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaySquare, Clock, Eye, Calendar } from "lucide-react";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function RecordingsPage() {
  const [grade, setGrade] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");

  const params = {
    grade: grade !== "all" ? Number(grade) : undefined,
    subjectId: subject !== "all" ? Number(subject) : undefined,
  };

  const { data: recordings, isLoading } = useListRecordings(params, {
    query: { queryKey: getListRecordingsQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <PlaySquare className="w-6 h-6 text-blue-600" />
            </div>
            Recorded Classes
          </h1>
          <p className="text-muted-foreground mt-1">Watch past live sessions anytime</p>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : (recordings ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <PlaySquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No recordings available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(recordings ?? []).map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-testid={`recording-card-${rec.id}`}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-2 hover:border-blue-200">
                  <div className="relative">
                    {rec.thumbnailUrl ? (
                      <img src={rec.thumbnailUrl} alt={rec.title} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-gradient-to-br from-secondary to-primary/60 flex items-center justify-center">
                        <PlaySquare className="w-16 h-16 text-white/60" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatDuration(rec.duration)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                        <PlaySquare className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold text-sm leading-tight line-clamp-2">{rec.title}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{rec.teacher}</span>
                      <Badge variant="secondary" className="text-xs">{rec.subjectName}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{new Date(rec.recordedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />{rec.views ?? 0} views
                      </span>
                    </div>
                    <Button size="sm" className="w-full mt-2" variant="outline" onClick={() => window.open(rec.videoUrl, "_blank")}>
                      Watch Recording
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
