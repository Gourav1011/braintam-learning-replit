import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, Lightbulb, Target, Heart, Rocket, Users, Star } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <nav className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <img src={braintamLogo} alt="Braintam" className="w-12 h-12 object-contain" />
          <span className="font-bold text-lg" style={{ color: NAVY }}>Braintam</span>
          <Button variant="ghost" size="sm" asChild className="ml-auto gap-1.5">
            <Link href="/"><ArrowLeft className="w-4 h-4" />Back to Home</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="py-16 px-4 text-center text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-8 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: "#3B82F6" }} />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            <Heart className="w-4 h-4" style={{ color: ORANGE }} /> Made in India, Built for Every Child
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3">Our Story</h1>

          {/* TAM callout */}
          <div className="inline-block mb-5 px-5 py-3 rounded-2xl" style={{ background: "rgba(255,107,26,0.15)", border: "1px solid rgba(255,107,26,0.35)" }}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: ORANGE }}>What "Braintam" means</p>
            <p className="text-white font-black text-lg leading-snug">
              <span style={{ color: ORANGE }}>Brain</span> + <span style={{ color: ORANGE }}>T</span>alent <span style={{ color: ORANGE }}>A</span>dvancement <span style={{ color: ORANGE }}>M</span>ission
            </p>
          </div>

          <p className="text-lg text-blue-200 max-w-xl mx-auto">
            An educational organisation dedicated to advancing young minds by developing their <strong className="text-white">Talent</strong>, <strong className="text-white">Attitude</strong>, and <strong className="text-white">Mindset</strong> through innovative learning, mentorship, and skill-building programs.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-14 max-w-3xl space-y-12">

        {/* Origin */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}18` }}>
              <Lightbulb className="w-5 h-5" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>Where It All Began</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            Braintam was founded by two friends with a shared mission — to transform the way students learn.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            One is an <strong>educator with over 20 years of teaching experience</strong> in Mumbai. The other is a <strong>Data Analyst, EdTech expert, and mentor</strong> who has worked with more than 2,000 students. Through years of teaching, mentoring, and researching student learning patterns, they noticed a common problem: students were studying harder than ever, yet many lacked confidence, strong fundamentals, and effective learning skills.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            They also observed that many large EdTech platforms were heavily focused on sales and enrollments, but often fell short when it came to personalized guidance, student progress tracking, and long-term support.
          </p>
          <p className="text-gray-600 leading-relaxed">
            This inspired them to create Braintam — <strong>a platform that puts student growth before sales.</strong> By combining academics with Mental Math, Mind Mapping, Logical Reasoning, Memory Techniques, and effective study skills, Braintam helps students become confident learners, faster thinkers, and future-ready individuals.
          </p>
        </section>

        {/* Founders */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}12` }}>
              <Users className="w-5 h-5" style={{ color: NAVY }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>The Founders</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl p-6 border" style={{ background: `linear-gradient(135deg, ${NAVY}08, ${NAVY}03)`, borderColor: `${NAVY}20` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-4"
                style={{ background: `linear-gradient(135deg, ${NAVY}, #1a4494)` }}>👨‍🏫</div>
              <p className="font-black text-base mb-1" style={{ color: NAVY }}>The Educator</p>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: ORANGE }}>20+ Years of Teaching · Mumbai</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                A seasoned classroom teacher who has spent over two decades shaping young minds. His deep understanding of how students think, struggle, and grow forms the academic backbone of Braintam.
              </p>
            </div>
            <div className="rounded-2xl p-6 border" style={{ background: `linear-gradient(135deg, ${ORANGE}08, ${ORANGE}03)`, borderColor: `${ORANGE}20` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-4"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, #e55a0a)` }}>📊</div>
              <p className="font-black text-base mb-1" style={{ color: NAVY }}>The EdTech Expert</p>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: ORANGE }}>Data Analyst · 2,000+ Students Mentored</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                A data-driven mentor who has worked closely with 2,000+ students, uncovering patterns in how they learn and where they lose confidence. He brings the technology, structure, and personalization that make Braintam stand apart.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}18` }}>
              <Target className="w-5 h-5" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>Our Mission</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-5">
            We believe every child in India — from Grade 1 to Grade 10 — deserves access to world-class learning techniques, regardless of their city, school, or family background. Our mission is to make premium, results-driven education accessible, affordable, and enjoyable.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🧠", title: "Mental Math & Mind Mapping", desc: "Build faster thinking and stronger recall through proven cognitive techniques." },
              { icon: "🔗", title: "Logical Reasoning", desc: "Develop analytical skills that help students across every subject and exam." },
              { icon: "💾", title: "Memory Techniques", desc: "Equip students with tools to retain more and revise less — for life." },
              { icon: "📚", title: "Effective Study Skills", desc: "Teach students how to study smarter, not just harder — building lifelong habits." },
            ].map(m => (
              <div key={m.title} className="flex gap-3 p-4 rounded-xl bg-[#F8FAFF] border border-gray-100">
                <span className="text-2xl flex-shrink-0">{m.icon}</span>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: NAVY }}>{m.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Problem We Solve */}
        <section className="rounded-2xl p-8 border" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white">What Makes Us Different</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: "🎯", label: "Student Growth First", desc: "We measure success by student progress — not enrollment numbers or sales targets." },
              { icon: "🤝", label: "Personalized Guidance", desc: "Every student gets dedicated mentorship, not just access to a course library." },
              { icon: "📈", label: "Progress Tracking", desc: "Detailed, data-driven insights so parents and students always know where they stand." },
            ].map(v => (
              <div key={v.label} className="text-center p-5 rounded-xl bg-white/10 backdrop-blur border border-white/10">
                <div className="text-3xl mb-2">{v.icon}</div>
                <p className="font-bold text-sm mb-1 text-white">{v.label}</p>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What We Stand For */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}12` }}>
              <Star className="w-5 h-5" style={{ color: NAVY }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>What We Stand For</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: "🔬", label: "Evidence-Based", desc: "Every technique we teach is backed by cognitive science and measurable outcomes." },
              { icon: "🤝", label: "Trust First", desc: "Transparent pricing, fair support, and long-term commitment to every student's journey." },
              { icon: "🌱", label: "Child-Centred", desc: "Our content, pace, and design are built around how children actually learn best." },
            ].map(v => (
              <div key={v.label} className="text-center p-5 rounded-xl bg-[#F8FAFF] border border-gray-100">
                <div className="text-3xl mb-2">{v.icon}</div>
                <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>{v.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing line + CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <div className="text-4xl mb-4">💡</div>
          <blockquote className="text-xl font-black mb-2 leading-snug">
            "True education doesn't end with enrollment —<br className="hidden sm:block" /> it begins there."
          </blockquote>
          <p className="text-blue-200 text-sm mb-7 mt-3">Join thousands of students who are learning smarter, growing faster, and building real confidence.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-bold px-8 py-3" style={{ background: ORANGE }}>
              <Link href="/register">Start Learning Today →</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3">
              <a href="mailto:support@braintam.com">Connect With Us</a>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
