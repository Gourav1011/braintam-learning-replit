import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListCourses, useListSubjects, getListCoursesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Star, Users } from "lucide-react";

export default function CoursesPage() {
  const [subject, setSubject] = useState<string>("all");
  const [search, setSearch] = useState("");

  const params = {
    subjectId: subject !== "all" ? Number(subject) : undefined,
    search: search.trim() || undefined,
  };

  const { data: courses, isLoading } = useListCourses(params, {
    query: { queryKey: getListCoursesQueryKey(params) }
  });
  const { data: subjects } = useListSubjects();

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            Courses
          </h1>
          <p className="text-muted-foreground mt-1">Your enrolled courses</p>
        </motion.div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-courses"
            />
          </div>
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
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : (courses ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {(courses ?? []).map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/courses/${course.id}`}>
                  <Card className="cursor-pointer overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary/20 h-full" data-testid={`course-card-${course.id}`}>
                    <div className="relative">
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-secondary text-white text-xs">Grade {course.grade}</Badge>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-white/90 text-foreground">{course.subjectName}</Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{course.teacher ?? "Braintam Teacher"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{course.totalLessons} lessons</span>
                        {course.rating && (
                          <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-yellow-500" />{course.rating}
                          </span>
                        )}
                      </div>
                      {course.completedLessons !== null && course.completedLessons !== undefined && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{Math.round((course.completedLessons / course.totalLessons) * 100)}%</span>
                          </div>
                          <Progress value={(course.completedLessons / course.totalLessons) * 100} className="h-1.5" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
