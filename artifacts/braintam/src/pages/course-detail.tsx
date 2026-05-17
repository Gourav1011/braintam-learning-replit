import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { useGetCourse, getGetCourseQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Play, Clock, Star, CheckCircle, Lock } from "lucide-react";

export default function CourseDetailPage() {
  const [, params] = useRoute("/courses/:id");
  const id = Number(params?.id);

  const { data: course, isLoading } = useGetCourse(id, {
    query: { enabled: !!id, queryKey: getGetCourseQueryKey(id) }
  });

  const completedLessons = course?.lessons?.filter(l => l.completed).length ?? 0;
  const totalLessons = course?.lessons?.length ?? 0;
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-64 rounded-2xl" />
            <Skeleton className="w-96 h-8" />
            <Skeleton className="w-full h-40" />
          </div>
        ) : !course ? (
          <div className="text-center py-20 text-muted-foreground">Course not found</div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden shadow-lg">
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-64 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex gap-2 mb-2">
                  <Badge className="bg-primary">{course.subjectName}</Badge>
                  <Badge className="bg-secondary">Grade {course.grade}</Badge>
                </div>
                <h1 className="text-3xl font-bold">{course.title}</h1>
                {course.teacher && <p className="text-white/80 mt-1">by {course.teacher}</p>}
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {course.description && (
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-muted-foreground leading-relaxed">{course.description}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Course Lessons ({totalLessons})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {course.lessons?.map((lesson, i) => (
                      <motion.div
                        key={lesson.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${lesson.completed ? "bg-green-50 border-green-200" : "bg-card hover:bg-muted/40 border-border hover:border-primary/20"}`}
                        data-testid={`lesson-${lesson.id}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${lesson.completed ? "bg-green-500 text-white" : "bg-primary/10 text-primary"}`}>
                          {lesson.completed ? <CheckCircle className="w-5 h-5" /> : lesson.videoUrl ? <Play className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{lesson.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />{lesson.duration} min
                          </div>
                        </div>
                        {lesson.videoUrl && (
                          <Button size="sm" variant="ghost" className="text-primary" onClick={() => window.open(lesson.videoUrl!, "_blank")}>
                            Watch
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">{Math.round(progress)}%</div>
                      <div className="text-sm text-muted-foreground">Complete</div>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="text-sm text-center text-muted-foreground">
                      {completedLessons} of {totalLessons} lessons done
                    </div>
                    <Button className="w-full" size="lg">
                      {completedLessons === 0 ? "Start Course" : "Continue Learning"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Lessons</span>
                      <span className="font-semibold">{totalLessons}</span>
                    </div>
                    {course.rating && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rating</span>
                        <span className="font-semibold flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{course.rating}
                        </span>
                      </div>
                    )}
                    {course.teacher && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Teacher</span>
                        <span className="font-semibold">{course.teacher}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
