import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, Lightbulb, Target, Heart, Rocket, Users, Star } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <nav className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <img src={braintamLogo} alt="Braintam" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg" style={{ color: NAVY }}>Braintam</span>
          <Button variant="ghost" size="sm" asChild className="ml-auto gap-1.5">
            <Link href="/"><ArrowLeft className="w-4 h-4" />Back to Home</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <div className="py-16 px-4 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
          <Heart className="w-4 h-4" style={{ color: ORANGE }} /> Made in India, Built for Every Child
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Our Story</h1>
        <p className="text-lg text-blue-200 max-w-xl mx-auto">How a simple question — <em>"Why do kids fear Mathematics?"</em> — led to a movement that's changing how India's children learn.</p>
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
            Braintam was born from a conversation in a Delhi classroom in 2022. Our founder, watching a bright Grade 5 student struggle with a simple multiplication problem — not because she lacked intelligence, but because she had never been taught <em>how</em> to think fast — realised that the Indian education system was teaching children <em>what</em> to learn, but rarely <em>how</em> to learn it efficiently.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            The insight was simple but powerful: <strong>mental speed and calculation confidence</strong> are the foundation of every academic subject. A child who can calculate quickly and think mathematically doesn't just excel at Maths — they excel across Science, Economics, Competitive Exams, and life itself.
          </p>
          <p className="text-gray-600 leading-relaxed">
            That insight became the seed of Braintam's flagship programme — the <strong>6-Day Smart Learning Course</strong> — a concentrated, expert-led experience designed to rewire the way children approach numbers, patterns, and problem-solving.
          </p>
        </section>

        {/* Mission */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${NAVY}12` }}>
              <Target className="w-5 h-5" style={{ color: NAVY }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>Our Mission</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-5">
            We believe every child in India — from Grade 1 to Grade 10 — deserves access to world-class learning techniques, regardless of their city, school, or family background. Our mission is to make premium, results-driven education accessible, affordable, and enjoyable.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🎯", title: "Results in 6 Days", desc: "Measurable improvement in calculation speed and mental agility — guaranteed." },
              { icon: "🧠", title: "Smart Techniques", desc: "Vedic Maths, shortcut methods, and proven rapid-calculation frameworks." },
              { icon: "👩‍🏫", title: "Expert Masters", desc: "Taught by educators with 10+ years of competitive exam coaching experience." },
              { icon: "🌍", title: "Pan-India Reach", desc: "Serving students across 500+ cities with live online and hybrid learning." },
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

        {/* Journey */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${ORANGE}18` }}>
              <Rocket className="w-5 h-5" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>The Journey So Far</h2>
          </div>
          <div className="space-y-5">
            {[
              { year: "2022", label: "The Idea", desc: "First prototype of the Smart Learning Course tested with 50 students in Delhi. Results were extraordinary — average calculation speed improved by 3×." },
              { year: "2023", label: "Going Digital", desc: "Braintam launched its first online cohort, reaching 500 students across 12 states. Live classes, homework, and tests — all in one platform." },
              { year: "2024", label: "Scaling Up", desc: "Partnered with 100+ schools. Built the full LMS with animated videos, adaptive tests, and real-time leaderboards. 10,000+ students enrolled." },
              { year: "2025", label: "Premium Platform", desc: "Launched Braintam 2.0 — a complete EdTech ecosystem for Grades 1–10, Olympiad preparation, JEE/NEET Foundation, and beyond." },
              { year: "2026", label: "Today", desc: "Serving 50,000+ students, with 200+ expert-crafted courses and a team of 50+ educators. India's most trusted rapid-learning platform for school students." },
            ].map((ev, i) => (
              <div key={ev.year} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: i % 2 === 0 ? NAVY : ORANGE }}>{ev.year}</div>
                  {i < 4 && <div className="w-0.5 flex-1 mt-1" style={{ background: "#E5E7EB" }} />}
                </div>
                <div className="pb-5">
                  <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>{ev.label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
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
              { icon: "🤝", label: "Trust First", desc: "Transparent pricing, fair refund policies, and dedicated support — always." },
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

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Users className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Be Part of the Story</h3>
          <p className="text-blue-200 mb-6">Join 50,000+ students who are learning faster, scoring higher, and loving the process.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-bold px-8 py-3" style={{ background: ORANGE }}>
              <Link href="/enroll">Enroll in the 6-Day Course →</Link>
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
