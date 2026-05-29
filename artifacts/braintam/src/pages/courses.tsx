import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useListCourses, useListSubjects, getListCoursesQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, Star, Users, Trophy, Sparkles, ArrowRight, GraduationCap, Zap, Award } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const DEMO_COURSES = [
  { title: "Mathematics — CBSE Grade 6", subject: "Mathematics", grade: 6, lessons: 48, rating: 4.9, students: 1240, emoji: "📐", from: "#3B82F6", to: "#6366F1" },
  { title: "Science & Technology Gr 7", subject: "Science", grade: 7, lessons: 52, rating: 4.8, students: 980, emoji: "🔬", from: "#10B981", to: "#0D9488" },
  { title: "English Language Arts", subject: "English", grade: 5, lessons: 36, rating: 4.7, students: 820, emoji: "📚", from: "#8B5CF6", to: "#A855F7" },
  { title: "Social Studies — India Gr 8", subject: "Social Studies", grade: 8, lessons: 44, rating: 4.9, students: 1050, emoji: "🌏", from: "#F59E0B", to: "#EF4444" },
  { title: "Hindi — Vyakaran Plus", subject: "Hindi", grade: 4, lessons: 28, rating: 4.6, students: 760, emoji: "🗣️", from: "#EC4899", to: "#F43F5E" },
  { title: "Computer Science Basics Gr 9", subject: "Computers", grade: 9, lessons: 60, rating: 5.0, students: 1420, emoji: "💻", from: "#06B6D4", to: "#3B82F6" },
];

const TOPPERS = [
  { name: "Arjun Sharma", grade: 8, school: "Delhi Public School", score: "98%", subject: "Mathematics", city: "New Delhi", achievement: "State Topper 🏆", initials: "AS", color: "from-amber-400 to-orange-500" },
  { name: "Priya Patel", grade: 7, school: "Kendriya Vidyalaya", score: "96%", subject: "Science", city: "Mumbai", achievement: "National Finalist 🥇", initials: "PP", color: "from-blue-400 to-indigo-600" },
  { name: "Riya Gupta", grade: 9, school: "DAV Public School", score: "95%", subject: "English", city: "Pune", achievement: "School Topper ⭐", initials: "RG", color: "from-pink-400 to-rose-600" },
];

const STATS = [
  { value: "200+", label: "Courses", icon: BookOpen },
  { value: "50+", label: "Expert Teachers", icon: GraduationCap },
  { value: "10,000+", label: "Happy Students", icon: Users },
  { value: "4.9★", label: "Avg Rating", icon: Star },
];

function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(255,255,255,0.97)" : "rgba(11,43,107,0.95)", backdropFilter: "blur(20px)", boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none" }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/"><img src={braintamLogo} alt="Braintam" className="h-10 object-contain cursor-pointer" /></Link>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          {([["Courses", "/courses"], ["Live Classes", "/live-classes"], ["Leaderboard", "/leaderboard"]] as [string, string][]).map(([l, href]) => (
            <Link key={l} href={href}>
              <span className={`cursor-pointer transition-colors font-semibold ${scrolled ? "text-gray-700 hover:text-orange-500" : "text-white/80 hover:text-white"}`}>{l}</span>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in"><span className={`text-sm font-semibold cursor-pointer ${scrolled ? "text-gray-700" : "text-white/90"}`}>Sign In</span></Link>
          <Link href="/sign-up">
            <button className="px-5 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)` }}>Join Free</button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function FloatBadge({ children, delay = 0, x = 0, y = 0 }: { children: React.ReactNode; delay?: number; x?: number; y?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      className="absolute bg-white rounded-xl shadow-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 border border-gray-100"
      style={{ left: x, top: y }}>
      {children}
    </motion.div>
  );
}

function PublicCoursesView() {
  return (
    <div className="min-h-screen" style={{ background: "#F8FAFF" }}>
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-24 pb-16 px-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4a9b 60%, #0f3580 100%)` }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-10 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
          <div className="absolute bottom-0 left-20 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: "#3B82F6" }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-6"
              style={{ background: "rgba(255,107,26,0.2)", border: "1px solid rgba(255,107,26,0.4)", color: ORANGE }}>
              <Sparkles className="w-3.5 h-3.5" /> India's #1 EdTech Platform for Grades 1–10
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-5">
              Explore India's <br />
              <span style={{ background: `linear-gradient(135deg, ${ORANGE}, #FFA040)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Best Courses
              </span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-8">
              CBSE · ICSE · State Board · IIT Foundation — taught by India's top educators. Start learning today.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/sign-up">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                  className="px-8 py-3.5 rounded-full font-bold text-white text-base flex items-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: `0 4px 24px rgba(255,107,26,0.45)` }}>
                  Book Demo Class Free <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <Link href="/sign-in">
                <button className="px-8 py-3.5 rounded-full font-bold text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 transition-colors text-base">
                  Already a student?
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div className="max-w-5xl mx-auto px-6 -mt-6 relative z-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-lg text-center border border-gray-100">
              <div className="text-2xl font-black" style={{ color: i % 2 === 0 ? NAVY : ORANGE }}>{s.value}</div>
              <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Popular Courses ── */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-center mb-10">
          <h2 className="text-3xl font-black" style={{ color: NAVY }}>Popular Courses</h2>
          <p className="text-gray-500 mt-2">Designed to help students excel — across every subject and grade</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEMO_COURSES.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
              whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer">
              <div className="h-36 flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
                <span className="text-5xl">{c.emoji}</span>
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-bold">
                  Grade {c.grade}
                </div>
              </div>
              <div className="p-4 space-y-2.5">
                <h3 className="font-bold text-sm leading-snug" style={{ color: NAVY }}>{c.title}</h3>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{c.lessons} lessons</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: "rgba(11,43,107,0.08)", color: NAVY }}>{c.subject}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />{c.rating}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/sign-up">
            <motion.button whileHover={{ scale: 1.04 }}
              className="px-8 py-3 rounded-full font-bold text-white text-sm"
              style={{ background: NAVY }}>
              View All Courses — Join Free
            </motion.button>
          </Link>
        </div>
      </section>

      {/* ── AI Topper Students ── */}
      <section className="py-16 px-6" style={{ background: `linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)` }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-4"
              style={{ background: "rgba(255,107,26,0.1)", color: ORANGE }}>
              <Trophy className="w-3.5 h-3.5" /> AI-Powered Learning Results
            </span>
            <h2 className="text-3xl font-black" style={{ color: NAVY }}>Meet Our Star Toppers</h2>
            <p className="text-gray-500 mt-2">Real students. Real results. Powered by Braintam.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TOPPERS.map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl"
                  style={{ background: `linear-gradient(to right, ${NAVY}, ${ORANGE})` }} />

                {/* Floating achievement badge */}
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
                  className="absolute top-4 right-4 text-lg">{t.achievement.split(" ")[1]}</motion.div>

                {/* Avatar */}
                <div className="relative mx-auto w-20 h-20 mb-4">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                    {t.initials}
                  </div>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1 -right-1 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                </div>

                <h3 className="font-black text-base" style={{ color: NAVY }}>{t.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t.school} · {t.city}</p>
                <p className="text-xs text-gray-400 mt-0.5">Grade {t.grade} · {t.subject}</p>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-2xl font-black" style={{ color: ORANGE }}>{t.score}</span>
                  <span className="text-xs text-gray-400 font-medium">Score</span>
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(11,43,107,0.07)", color: NAVY }}>
                  <Award className="w-3 h-3" /> {t.achievement.split(" ")[0]}
                </div>

                {/* Stars */}
                <div className="flex justify-center gap-1 mt-3">
                  {[1, 2, 3, 4, 5].map(s => (
                    <motion.div key={s} animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: s * 0.2 }}>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-100">
              <Zap className="w-5 h-5" style={{ color: ORANGE }} />
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: NAVY }}>AI-Personalised Learning Path</p>
                <p className="text-xs text-gray-500">Our AI adapts to each student's pace, identifying weak areas and focusing practice exactly where needed.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 text-center" style={{ background: NAVY }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Ready to become a topper?</h2>
          <p className="text-white/60 mb-8 text-lg">Join 10,000+ students already learning on Braintam</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/sign-up">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                className="px-10 py-4 rounded-full font-black text-white text-lg flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #c94e00)`, boxShadow: "0 8px 32px rgba(255,107,26,0.5)" }}>
                Book a FREE Demo Class <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-4">No credit card required · Cancel anytime</p>
        </motion.div>
      </section>

      {/* Footer */}
      <div className="bg-black/90 text-white/40 text-center py-4 text-xs">
        © 2026 Braintam · India's Premium EdTech Platform
      </div>
    </div>
  );
}

// ── Authenticated view ──────────────────────────────────────────────────
function AuthCoursesView() {
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
            <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="search-courses" />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-44" data-testid="subject-filter"><SelectValue placeholder="All Subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {(subjects ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
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
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/courses/${course.id}`}>
                  <Card className="cursor-pointer overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary/20 h-full" data-testid={`course-card-${course.id}`}>
                    <div className="relative">
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-40 object-cover" />
                      <div className="absolute top-2 right-2"><Badge className="bg-secondary text-white text-xs">Grade {course.grade}</Badge></div>
                      <div className="absolute bottom-2 left-2"><Badge variant="secondary" className="text-xs bg-white/90 text-foreground">{course.subjectName}</Badge></div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2">{course.title}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /><span>{course.teacher ?? "Braintam Teacher"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{course.totalLessons} lessons</span>
                        {course.rating && <span className="flex items-center gap-1 text-yellow-500 font-semibold"><Star className="w-3.5 h-3.5 fill-yellow-500" />{course.rating}</span>}
                      </div>
                      {course.completedLessons !== null && course.completedLessons !== undefined && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span><span>{Math.round((course.completedLessons / course.totalLessons) * 100)}%</span>
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

export default function CoursesPage() {
  const { student, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8FAFF" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-t-transparent rounded-full" style={{ borderColor: `${ORANGE} transparent transparent transparent` }} />
      </div>
    );
  }

  if (!student) return <PublicCoursesView />;
  return <AuthCoursesView />;
}
