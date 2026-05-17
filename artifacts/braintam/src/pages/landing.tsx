import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { PlayCircle, BookOpen, Video, Target, ArrowRight, Star, Users, Brain, CheckCircle2 } from "lucide-react";

const features = [
  { icon: Video, title: "Interactive Live Classes", desc: "Learn in real-time with top educators. Ask doubts, answer polls, and engage with peers." },
  { icon: PlayCircle, title: "Rich Animated Videos", desc: "Complex concepts broken down into simple, fun animated stories that stick in your brain." },
  { icon: Target, title: "Adaptive Testing", desc: "Practice with smart quizzes that adjust to your learning pace and highlight improvement areas." },
  { icon: BookOpen, title: "Comprehensive Courses", desc: "Full syllabus coverage for grades 1-10 with structured lessons and detailed notes." }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      <nav className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={braintamLogo} alt="Braintam Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-2xl text-primary">Braintam</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-full">
              <Link href="/register">Join for Free</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 px-4">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">
                  <Star className="w-4 h-4 fill-current" /> India's Premium Learning App
                </div>
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight text-foreground">
                  Rewire your <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">brain</span> for success.
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                  Curious minds from Grade 1-10 come here to learn, play, and conquer exams. Experience learning that feels like magic.
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button size="lg" asChild className="rounded-full text-lg h-14 px-8 bg-primary hover:bg-primary/90 hover:scale-105 transition-all">
                    <Link href="/register">
                      Start Learning Now <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full text-lg h-14 px-8 border-2 hover:bg-secondary/5">
                    Explore Courses
                  </Button>
                </div>
                <div className="flex items-center gap-6 pt-8 border-t border-border/50">
                  <div className="flex -space-x-4">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-secondary/20 flex items-center justify-center text-xs font-bold z-10">
                        <Users className="w-5 h-5 text-secondary" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="font-bold text-lg">500,000+</div>
                    <div className="text-sm text-muted-foreground">Students joined</div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative h-[600px] hidden lg:block"
              >
                {/* Floating abstract UI elements representing the platform */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-[3rem] blur-3xl -z-10"></div>
                <div className="relative h-full w-full bg-card rounded-[2rem] border shadow-2xl p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="h-40 bg-secondary/5 rounded-xl border-2 border-dashed border-secondary/20 flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-primary opacity-50" />
                    </div>
                    <div className="flex gap-4">
                      <div className="h-24 flex-1 bg-blue-500/10 rounded-xl"></div>
                      <div className="h-24 flex-1 bg-green-500/10 rounded-xl"></div>
                      <div className="h-24 flex-1 bg-orange-500/10 rounded-xl"></div>
                    </div>
                    <div className="h-32 bg-purple-500/10 rounded-xl mt-4"></div>
                  </div>
                  
                  {/* Floating badges */}
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="absolute -right-6 top-20 bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-xl border flex items-center gap-3"
                  >
                    <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                      <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">Math Quiz</div>
                      <div className="text-xs text-muted-foreground">Score: 95%</div>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute -left-8 bottom-32 bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-xl border flex items-center gap-3"
                  >
                    <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                      <Video className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-red-500 mb-1">LIVE NOW</div>
                      <div className="text-sm font-bold">Science 101</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-card px-4 border-y">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold">Everything you need to excel</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Braintam provides a holistic learning ecosystem tailored to the Indian curriculum.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-background p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow group cursor-default"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-secondary -z-20"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 -z-10"></div>
          <div className="container mx-auto max-w-4xl text-center text-white space-y-8">
            <Brain className="w-20 h-20 mx-auto text-primary opacity-90" />
            <h2 className="text-4xl md:text-6xl font-bold">Ready to unlock your potential?</h2>
            <p className="text-xl text-secondary-foreground/80 max-w-2xl mx-auto">
              Join thousands of students who are achieving their academic goals with Braintam.
            </p>
            <Button size="lg" asChild className="bg-primary hover:bg-white hover:text-primary text-white rounded-full h-16 px-10 text-xl font-bold mt-8 shadow-[0_0_40px_-10px_rgba(255,107,26,0.5)] transition-all">
              <Link href="/register">Create Free Account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-card py-12 px-4 border-t text-center text-muted-foreground">
        <div className="container mx-auto flex items-center justify-center gap-3 mb-6">
          <img src={braintamLogo} alt="Braintam Logo" className="w-8 h-8 opacity-50 grayscale" />
          <span className="font-bold text-xl">Braintam</span>
        </div>
        <p>© {new Date().getFullYear()} Braintam EdTech. All rights reserved.</p>
      </footer>
    </div>
  );
}
