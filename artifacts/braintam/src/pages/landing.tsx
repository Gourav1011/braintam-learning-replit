import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import {
  PlayCircle, BookOpen, Video, Target, ArrowRight, Star, Users,
  Brain, CheckCircle2, Smartphone, Apple, Play, Quote,
  ChevronLeft, ChevronRight, Mail, Phone, MapPin,
  Facebook, Twitter, Instagram, Youtube, GraduationCap,
  Zap, Shield, Trophy, Clock
} from "lucide-react";
import { useState, useEffect } from "react";

const features = [
  { icon: Video, title: "Live Classes", desc: "Real-time sessions with top educators. Ask doubts instantly.", color: "text-red-500 bg-red-50" },
  { icon: PlayCircle, title: "Animated Videos", desc: "Complex concepts made fun with rich animations.", color: "text-purple-500 bg-purple-50" },
  { icon: Target, title: "Adaptive Tests", desc: "Smart quizzes that adjust to your level and track growth.", color: "text-green-500 bg-green-50" },
  { icon: BookOpen, title: "Full Syllabus", desc: "All subjects, grades 1–10, aligned to CBSE & state boards.", color: "text-blue-500 bg-blue-50" },
];

const courses = [
  { title: "Algebra Foundations", subject: "Mathematics", grade: 6, lessons: 12, rating: 4.8, teacher: "Dr. Priya Sharma", color: "from-blue-500 to-cyan-400", img: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&q=80" },
  { title: "Photosynthesis & Plant Life", subject: "Science", grade: 6, lessons: 8, rating: 4.9, teacher: "Dr. Anita Patel", color: "from-green-500 to-emerald-400", img: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=400&q=80" },
  { title: "English Grammar Mastery", subject: "English", grade: 6, lessons: 14, rating: 4.5, teacher: "Meena Iyer", color: "from-purple-500 to-violet-400", img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80" },
  { title: "The Human Body", subject: "Science", grade: 7, lessons: 15, rating: 4.7, teacher: "Dr. Suresh Kumar", color: "from-orange-500 to-amber-400", img: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&q=80" },
  { title: "Indian History - Medieval", subject: "Social Science", grade: 7, lessons: 10, rating: 4.7, teacher: "Dr. Ravi Prakash", color: "from-yellow-500 to-amber-400", img: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=80" },
  { title: "Intro to Computers", subject: "Computer Science", grade: 5, lessons: 10, rating: 4.3, teacher: "Deepak Singh", color: "from-sky-500 to-blue-400", img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80" },
];

const subjectColors: Record<string, string> = {
  Mathematics: "bg-blue-100 text-blue-700",
  Science: "bg-green-100 text-green-700",
  English: "bg-purple-100 text-purple-700",
  Hindi: "bg-red-100 text-red-700",
  "Social Science": "bg-yellow-100 text-yellow-700",
  "Computer Science": "bg-sky-100 text-sky-700",
};

const testimonials = [
  {
    name: "Priya Verma",
    role: "Grade 8 Student",
    school: "Kendriya Vidyalaya, Mumbai",
    avatar: "P",
    rating: 5,
    text: "Braintam's animated videos helped me understand concepts I struggled with for years. My science marks jumped from 65% to 89% in just one term!",
    color: "from-pink-400 to-rose-500",
  },
  {
    name: "Rakesh Sharma",
    role: "Parent",
    school: "Father of Grade 6 student",
    avatar: "R",
    rating: 5,
    text: "My son used to dread math. After 3 months on Braintam, he actually looks forward to studying. The live classes with real teachers made all the difference.",
    color: "from-blue-400 to-indigo-500",
  },
  {
    name: "Ananya Singh",
    role: "Grade 10 Student",
    school: "DPS Vasant Kunj, Delhi",
    avatar: "A",
    rating: 5,
    text: "The test series on Braintam is incredible — exactly like the real board exam format. I scored 94% in my boards. Braintam was my secret weapon!",
    color: "from-green-400 to-emerald-500",
  },
  {
    name: "Kavitha Menon",
    role: "Mother",
    school: "Parent of twin daughters, Grade 5",
    avatar: "K",
    rating: 5,
    text: "Both my daughters use Braintam and they compete with each other on the leaderboard! It's made learning into a fun game. Best investment for their future.",
    color: "from-amber-400 to-orange-500",
  },
  {
    name: "Arjun Kapoor",
    role: "Grade 9 Student",
    school: "Ryan International, Bengaluru",
    avatar: "A",
    rating: 5,
    text: "I was always afraid of exams, but after practicing with Braintam's adaptive tests every day, I feel confident and prepared. Highly recommend!",
    color: "from-purple-400 to-violet-500",
  },
  {
    name: "Sunita Joshi",
    role: "Teacher & Parent",
    school: "Navodaya Vidyalaya",
    avatar: "S",
    rating: 5,
    text: "As a teacher, I'm impressed by the quality and accuracy of Braintam's content. As a parent, I'm thrilled to see my child so engaged in learning.",
    color: "from-teal-400 to-cyan-500",
  },
];

const reviews = [
  { platform: "Google Play", rating: 4.8, count: "12,400+", label: "★★★★★ on Play Store" },
  { platform: "App Store", rating: 4.9, count: "8,200+", label: "★★★★★ on App Store" },
  { platform: "Trustpilot", rating: 4.7, count: "5,100+", label: "★★★★★ on Trustpilot" },
];

const stats = [
  { label: "Students", value: "5,00,000+", icon: Users },
  { label: "Live Classes", value: "50,000+", icon: Video },
  { label: "Courses", value: "200+", icon: BookOpen },
  { label: "Avg Score Boost", value: "40%", icon: Zap },
];

const footerLinks = {
  "Learn": ["Live Classes", "Courses", "Animated Videos", "Recorded Classes", "Test Series", "Homework Help"],
  "Subjects": ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"],
  "Company": ["About Us", "Careers", "Press Kit", "Blog", "Partnerships", "Contact"],
  "Support": ["Help Center", "Terms of Service", "Privacy Policy", "Refund Policy", "Report an Issue", "Community"],
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const visibleCount = 3;

  useEffect(() => {
    const t = setInterval(() => {
      setTestimonialIdx(i => (i + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const visible = [
    testimonials[testimonialIdx % testimonials.length],
    testimonials[(testimonialIdx + 1) % testimonials.length],
    testimonials[(testimonialIdx + 2) % testimonials.length],
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      {/* ─── NAV ─── */}
      <nav className="border-b bg-card/90 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
            <span className="font-bold text-2xl text-primary">Braintam</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            {["Courses", "Live Classes", "Tests", "Leaderboard"].map(l => (
              <a key={l} href="#" className="hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" asChild><Link href="/login">Login</Link></Button>
            <Button size="sm" asChild className="bg-primary hover:bg-primary/90 text-white rounded-full px-5">
              <Link href="/register">Join Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* ─── HERO ─── */}
        <section className="relative pt-20 pb-32 px-4">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                  <Star className="w-4 h-4 fill-current" /> India's #1 Learning App for Grades 1–10
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight text-foreground">
                  Rewire your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">brain</span> for success.
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Curious minds from Grade 1–10 come here to learn, play, and conquer exams. Experience learning that feels like magic.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild className="rounded-full text-lg h-14 px-8 bg-primary hover:bg-primary/90 hover:scale-105 transition-all">
                    <Link href="/register">Start Learning Now <ArrowRight className="ml-2" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full text-lg h-14 px-8 border-2 hover:bg-secondary/5">
                    Explore Courses
                  </Button>
                </div>
                <div className="flex items-center gap-8 pt-6 border-t border-border/50">
                  <div className="flex -space-x-3">
                    {["#FF6B1A","#0B2B6B","#16A34A","#7C3AED"].map((c, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-background flex items-center justify-center text-white text-xs font-bold" style={{ background: c }}>
                        {["P","R","A","S"][i]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="font-bold text-lg">5,00,000+</div>
                    <div className="text-sm text-muted-foreground">Students learning daily</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarRating rating={5} />
                    <span className="text-sm font-semibold ml-1">4.9/5</span>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative h-[600px] hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-[3rem] blur-3xl -z-10" />
                <div className="relative h-full w-full bg-card rounded-[2rem] border shadow-2xl p-6 overflow-hidden">
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-40 bg-secondary/5 rounded-xl border-2 border-dashed border-secondary/20 flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-primary opacity-50" />
                    </div>
                    <div className="flex gap-4">
                      <div className="h-24 flex-1 bg-blue-500/10 rounded-xl" />
                      <div className="h-24 flex-1 bg-green-500/10 rounded-xl" />
                      <div className="h-24 flex-1 bg-orange-500/10 rounded-xl" />
                    </div>
                    <div className="h-32 bg-purple-500/10 rounded-xl" />
                  </div>
                  <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute -right-6 top-20 bg-white p-4 rounded-xl shadow-xl border flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg"><Target className="w-6 h-6 text-green-600" /></div>
                    <div><div className="text-sm font-bold">Math Quiz</div><div className="text-xs text-muted-foreground">Score: 95%</div></div>
                  </motion.div>
                  <motion.div animate={{ y: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute -left-8 bottom-32 bg-white p-4 rounded-xl shadow-xl border flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-lg"><Video className="w-6 h-6 text-red-600" /></div>
                    <div><div className="text-xs font-bold text-red-500 mb-1">LIVE NOW</div><div className="text-sm font-bold">Science 101</div></div>
                  </motion.div>
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3.5, delay: 1 }} className="absolute -right-6 bottom-24 bg-white p-3 rounded-xl shadow-xl border">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <div><div className="text-xs font-bold">Rank #7</div><div className="text-xs text-muted-foreground">Leaderboard</div></div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── STATS STRIP ─── */}
        <section className="py-10 bg-secondary">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
              {stats.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <div className="text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
                  <div className="text-white/70 text-sm mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section className="py-24 bg-card px-4 border-y">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16 space-y-4">
              <Badge variant="secondary" className="text-sm px-4 py-1">Why Braintam?</Badge>
              <h2 className="text-3xl md:text-5xl font-bold">Everything you need to excel</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A complete learning ecosystem built for Indian school students.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-background p-7 rounded-2xl border shadow-sm hover:shadow-lg transition-all group cursor-default hover:-translate-y-1">
                  <div className={`w-13 h-13 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${f.color}`}>
                    <f.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── COURSES SECTION ─── */}
        <section className="py-24 px-4 bg-background">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
              <div className="space-y-3">
                <Badge className="bg-primary/10 text-primary border-0 text-sm px-4 py-1">Popular Courses</Badge>
                <h2 className="text-3xl md:text-5xl font-bold">
                  Learn from the{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">best teachers</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl">
                  Hand-picked courses covering every subject across all grades — structured, engaging, and exam-ready.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all">
                <Link href="/register">View All Courses <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Link href="/register">
                    <div className="group cursor-pointer bg-card rounded-2xl border-2 border-transparent hover:border-primary/20 shadow-sm hover:shadow-xl transition-all overflow-hidden hover:-translate-y-1">
                      <div className="relative">
                        <img src={c.img} alt={c.title} className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${subjectColors[c.subject] ?? "bg-gray-100 text-gray-700"}`}>
                            {c.subject}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 bg-secondary text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          Grade {c.grade}
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-primary text-white text-center text-sm font-semibold py-2 rounded-xl">
                            Start Free Trial
                          </div>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors">{c.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-bold text-secondary flex-shrink-0">
                            {c.teacher.charAt(0)}
                          </div>
                          <span className="truncate">{c.teacher}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <BookOpen className="w-3.5 h-3.5" />{c.lessons} lessons
                          </span>
                          <span className="flex items-center gap-1 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{c.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Subject Chips */}
            <div className="flex flex-wrap justify-center gap-3 mt-12">
              {["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer Science"].map((subj, i) => (
                <motion.div key={subj} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Link href="/register">
                    <div className={`px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-transparent hover:border-primary/20 ${subjectColors[subj] ?? "bg-gray-100 text-gray-700"}`}>
                      {subj}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="py-24 px-4 bg-card border-y">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16 space-y-3">
              <Badge variant="secondary" className="text-sm px-4 py-1">How It Works</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Start learning in 3 easy steps</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-primary/30 to-primary/30" />
              {[
                { step: "01", icon: GraduationCap, title: "Create Free Account", desc: "Sign up with email or phone in under 60 seconds. Pick your grade and subjects." },
                { step: "02", icon: Play, title: "Join Live or Watch", desc: "Attend live classes or watch recorded sessions and animated videos anytime." },
                { step: "03", icon: Trophy, title: "Test & Earn Points", desc: "Take tests, complete homework, climb the leaderboard and celebrate your wins." },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center space-y-4 relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-orange-400 text-white text-3xl font-black flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
                    {s.step}
                  </div>
                  <div className="w-12 h-12 bg-background rounded-xl border-2 border-primary/20 flex items-center justify-center mx-auto -mt-2">
                    <s.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── REVIEWS / RATINGS ─── */}
        <section className="py-24 px-4 bg-background">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16 space-y-3">
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-sm px-4 py-1">Reviews</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Loved by students & parents</h2>
              <p className="text-muted-foreground">Rated highly across every platform</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {reviews.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="bg-card rounded-2xl border-2 border-yellow-100 p-8 text-center space-y-4 hover:shadow-xl transition-all">
                  <div className="text-5xl font-black text-foreground">{r.rating}</div>
                  <StarRating rating={r.rating} />
                  <div className="text-sm text-muted-foreground font-medium">{r.label}</div>
                  <div className="text-2xl font-bold text-primary">{r.count}</div>
                  <div className="text-xs text-muted-foreground">ratings on {r.platform}</div>
                </motion.div>
              ))}
            </div>

            {/* Overall trust bar */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-gradient-to-r from-secondary to-secondary/80 rounded-2xl p-8 text-white flex flex-wrap items-center justify-between gap-6">
              <div>
                <div className="text-4xl font-black">4.8 / 5.0</div>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={5} />
                  <span className="text-white/80 text-sm">Overall rating</span>
                </div>
              </div>
              <div className="space-y-2 flex-1 max-w-xs">
                {[["5 stars", 78], ["4 stars", 16], ["3 stars", 4], ["2 stars", 1], ["1 star", 1]].map(([label, pct]) => (
                  <div key={String(label)} className="flex items-center gap-3 text-sm">
                    <span className="text-white/70 w-14 flex-shrink-0">{label}</span>
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-white/70 w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">25,700+</div>
                <div className="text-white/70 text-sm">Total reviews</div>
                <div className="flex gap-2 mt-3">
                  {[Shield, CheckCircle2, Trophy].map((Icon, i) => (
                    <div key={i} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="py-24 px-4 bg-card border-y overflow-hidden">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16 space-y-3">
              <Badge variant="secondary" className="text-sm px-4 py-1">Testimonials</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">What our learners say</h2>
              <p className="text-muted-foreground">Real stories from students and parents across India</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {visible.map((t, i) => (
                <motion.div key={`${testimonialIdx}-${i}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-background rounded-2xl border-2 hover:border-primary/20 p-7 shadow-sm hover:shadow-lg transition-all relative flex flex-col gap-4">
                  <Quote className="w-8 h-8 text-primary/20 absolute top-5 right-5" />
                  <StarRating rating={t.rating} />
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} text-white font-bold flex items-center justify-center flex-shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.role}</div>
                      <div className="text-xs text-muted-foreground">{t.school}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Carousel controls */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setTestimonialIdx(i => (i - 1 + testimonials.length) % testimonials.length)}
                className="w-10 h-10 rounded-full border-2 border-border hover:border-primary flex items-center justify-center transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)}
                    className={`rounded-full transition-all ${i === testimonialIdx % testimonials.length ? "w-6 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`} />
                ))}
              </div>
              <button onClick={() => setTestimonialIdx(i => (i + 1) % testimonials.length)}
                className="w-10 h-10 rounded-full border-2 border-border hover:border-primary flex items-center justify-center transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── DOWNLOAD APP ─── */}
        <section className="py-24 px-4 bg-background">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-gradient-to-br from-secondary via-secondary/95 to-primary/80 rounded-3xl overflow-hidden relative">
              <div className="absolute inset-0 opacity-10">
                {[...Array(6)].map((_, i) => (
                  <motion.div key={i} className="absolute rounded-full border-2 border-white"
                    style={{ width: (i + 1) * 100, height: (i + 1) * 100, right: `-${i * 30}px`, bottom: `-${i * 20}px` }}
                    animate={{ rotate: 360 }} transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }} />
                ))}
              </div>
              <div className="relative z-10 grid lg:grid-cols-2 gap-10 p-10 md:p-16 items-center">
                <div className="text-white space-y-7">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium">
                    <Smartphone className="w-4 h-4" /> Now available on Android & iOS
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black leading-tight">
                    Learn anytime,<br />anywhere with the<br />
                    <span className="text-primary">Braintam App</span>
                  </h2>
                  <p className="text-white/80 text-lg leading-relaxed">
                    Offline access to videos, live class notifications, instant doubt-solving, and a personalized feed — all in your pocket.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <a href="#" className="flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl hover:bg-black/80 transition-colors group">
                      <Play className="w-6 h-6 fill-white group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs text-white/60">Get it on</div>
                        <div className="text-base font-bold leading-tight">Google Play</div>
                      </div>
                    </a>
                    <a href="#" className="flex items-center gap-3 bg-black text-white px-6 py-3.5 rounded-2xl hover:bg-black/80 transition-colors group">
                      <Apple className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <div>
                        <div className="text-xs text-white/60">Download on the</div>
                        <div className="text-base font-bold leading-tight">App Store</div>
                      </div>
                    </a>
                  </div>
                  <div className="flex items-center gap-8 pt-2">
                    {[["4.9★", "Play Store"], ["4.8★", "App Store"], ["1M+", "Downloads"]].map(([val, lbl]) => (
                      <div key={lbl}>
                        <div className="text-xl font-black text-primary">{val}</div>
                        <div className="text-white/60 text-xs">{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 relative">
                  <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="relative w-52 bg-white rounded-[2rem] shadow-2xl overflow-hidden border-4 border-white/20">
                    <div className="h-6 bg-gray-100 flex items-center justify-center">
                      <div className="w-12 h-1 bg-gray-300 rounded-full" />
                    </div>
                    <div className="bg-gradient-to-b from-secondary to-primary p-4 text-white space-y-3">
                      <div className="flex items-center gap-2">
                        <img src={braintamLogo} alt="Braintam" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-sm">Braintam</span>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3">
                        <div className="text-xs font-semibold opacity-80">🔴 LIVE NOW</div>
                        <div className="text-sm font-bold mt-1">Algebra – Chapter 5</div>
                        <div className="text-xs opacity-70 mt-0.5">Dr. Priya Sharma • 234 joined</div>
                        <div className="mt-2 bg-primary text-white text-xs text-center py-1.5 rounded-lg font-bold">Join Now</div>
                      </div>
                      <div className="space-y-2">
                        {["Science Animated Video", "Hindi Homework Due Tomorrow"].map(item => (
                          <div key={item} className="bg-white/10 rounded-lg p-2 text-xs font-medium">{item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-background p-3 space-y-2">
                      {[72, 89, 58].map((v, j) => (
                        <div key={j} className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{["Maths", "Science", "English"][j]}</span>
                            <span>{v}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${v}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                    className="relative w-44 bg-white rounded-[1.5rem] shadow-xl overflow-hidden border-4 border-white/20 mt-12">
                    <div className="h-5 bg-gray-100 flex items-center justify-center">
                      <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="text-xs font-bold">Leaderboard 🏆</div>
                      {[["Priya V.", 2850, "🥇"], ["Rohan G.", 2720, "🥈"], ["You", 1240, "#7"]].map(([n, p, r]) => (
                        <div key={String(n)} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${n === "You" ? "bg-primary/10 border border-primary/20" : "bg-muted/40"}`}>
                          <span className="text-base">{r}</span>
                          <span className="font-semibold flex-1 truncate">{n}</span>
                          <span className="font-bold text-primary">{Number(p).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA SECTION ─── */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-secondary -z-20" />
          <div className="absolute inset-0 opacity-5 -z-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
          <div className="container mx-auto max-w-4xl text-center text-white space-y-8">
            <Brain className="w-20 h-20 mx-auto text-primary opacity-90" />
            <h2 className="text-4xl md:text-6xl font-bold">Ready to unlock your potential?</h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Join 5 lakh+ students who are achieving their academic dreams with Braintam.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-white rounded-full h-16 px-10 text-xl font-bold shadow-[0_0_40px_-10px_rgba(255,107,26,0.5)] transition-all hover:scale-105">
                <Link href="/register">Create Free Account</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full h-16 px-10 text-xl font-bold border-white/30 text-white hover:bg-white/10 transition-all">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 pt-4 text-white/60 text-sm">
              {["No credit card required", "Cancel anytime", "CBSE & State Board aligned", "Available in Hindi & English"].map(f => (
                <span key={f} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" />{f}</span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="bg-secondary text-white">
        {/* Top footer */}
        <div className="container mx-auto max-w-6xl px-4 py-16">
          <div className="grid lg:grid-cols-5 gap-10">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-5">
              <div className="flex items-center gap-3">
                <img src={braintamLogo} alt="Braintam" className="w-12 h-12 object-contain" />
                <span className="font-black text-2xl text-primary">Braintam</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-sm">
                India's premium EdTech platform for school students in grades 1–10. Empowering every student with quality education, live classes, and adaptive learning.
              </p>
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />support@braintam.in</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />+91 800-BRAIN-TAM</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />New Delhi, India 110001</div>
              </div>
              <div className="flex gap-3 pt-2">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section} className="space-y-4">
                <h4 className="font-bold text-white text-sm tracking-wide">{section}</h4>
                <ul className="space-y-2">
                  {links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-white/50 text-sm hover:text-primary transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* App store strip */}
        <div className="border-t border-white/10">
          <div className="container mx-auto max-w-6xl px-4 py-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-white/50 text-sm flex items-center gap-3">
              <Smartphone className="w-4 h-4" />
              Download the Braintam app for the best experience
            </div>
            <div className="flex gap-3">
              <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-primary/80 transition-colors px-4 py-2 rounded-xl text-xs font-semibold">
                <Play className="w-4 h-4" /> Google Play
              </a>
              <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-primary/80 transition-colors px-4 py-2 rounded-xl text-xs font-semibold">
                <Apple className="w-4 h-4" /> App Store
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="container mx-auto max-w-6xl px-4 py-5 flex flex-wrap items-center justify-between gap-3 text-white/40 text-xs">
            <span>© {new Date().getFullYear()} Braintam EdTech Pvt. Ltd. All rights reserved.</span>
            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <a href="#" className="hover:text-primary transition-colors">Cookies</a>
              <a href="#" className="hover:text-primary transition-colors">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
