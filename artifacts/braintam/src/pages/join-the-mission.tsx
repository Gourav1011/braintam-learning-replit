import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, Rocket, Users, Lightbulb, Heart, Globe, Code, BookOpen, Video } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const roles = [
  { icon: BookOpen, title: "Senior Subject Expert", dept: "Academics", type: "Full-Time · Remote", desc: "Design and deliver live classes for Grades 6–10. Specialisations needed: Mathematics, Science, or English. Minimum 5 years teaching experience with competitive exam coaching background." },
  { icon: Video, title: "Curriculum & Content Designer", dept: "Content", type: "Full-Time · Hybrid", desc: "Create structured course curricula, animated video scripts, and assessment frameworks aligned with CBSE/ICSE and Olympiad standards. Experience with NCERT and competitive exam content preferred." },
  { icon: Code, title: "Full-Stack Engineer", dept: "Engineering", type: "Full-Time · Remote", desc: "Build and scale our EdTech platform using React, Node.js, and PostgreSQL. You'll work on features that directly impact 50,000+ students — from adaptive tests to live class infrastructure." },
  { icon: Globe, title: "School Partnerships Manager", dept: "Growth", type: "Full-Time · Field + Remote", desc: "Drive institutional partnerships with schools and coaching institutes across India. Own the complete B2B sales cycle from outreach to onboarding. Experience in EdTech or institutional sales preferred." },
  { icon: Lightbulb, title: "Learning Experience Designer", dept: "Product", type: "Full-Time · Remote", desc: "Reimagine how children learn online. Design intuitive, engaging student journeys from onboarding through course completion. Strong UX/UI background with a passion for education." },
  { icon: Heart, title: "Student Success Coach", dept: "Student Support", type: "Part-Time · Remote", desc: "Be the friendly voice students and parents hear when they need guidance. Handle queries, motivate learners, and ensure every student completes their course with a smile." },
];

const perks = [
  { emoji: "🌏", label: "100% Remote-First", desc: "Work from anywhere in India." },
  { emoji: "📚", label: "Learning Budget", desc: "₹30,000/year for courses and books." },
  { emoji: "🏥", label: "Health Insurance", desc: "Full family cover from Day 1." },
  { emoji: "🕐", label: "Flexible Hours", desc: "Results matter, not clock-in times." },
  { emoji: "🎯", label: "Mission-Driven", desc: "Your work reaches 50,000+ students." },
  { emoji: "🚀", label: "Equity Options", desc: "Be a stakeholder in Braintam's growth." },
];

export default function JoinTheMissionPage() {
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
      <div className="py-16 px-4 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
          <Rocket className="w-4 h-4" style={{ color: ORANGE }} /> We're Hiring Across India
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Join the Mission</h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">Help us build the future of education. At Braintam, your work doesn't just fill a job description — it changes the trajectory of a child's life.</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* Why Braintam */}
        <section>
          <h2 className="text-2xl font-black text-center mb-6" style={{ color: NAVY }}>Why Braintam?</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <p className="text-gray-600 leading-relaxed mb-5">
              We are not just another EdTech startup. Braintam is a mission — to ensure that every Indian school student, regardless of their background, has access to world-class learning techniques that genuinely transform their academic performance.
            </p>
            <p className="text-gray-600 leading-relaxed mb-5">
              Our <strong>6-Day Smart Learning Course</strong> is already changing the lives of students across 500+ Indian cities. As we scale, we're looking for passionate, driven individuals who want to be part of something that truly matters.
            </p>
            <p className="text-gray-600 leading-relaxed">
              If you wake up excited about education, technology, or making a difference — you belong here.
            </p>
          </div>
        </section>

        {/* Perks */}
        <section>
          <h2 className="text-2xl font-black text-center mb-6" style={{ color: NAVY }}>What We Offer</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perks.map(p => (
              <div key={p.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{p.emoji}</span>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: NAVY }}>{p.label}</p>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Open Roles */}
        <section>
          <h2 className="text-2xl font-black text-center mb-6" style={{ color: NAVY }}>Open Roles</h2>
          <div className="space-y-4">
            {roles.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex flex-wrap items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${NAVY}12` }}>
                      <Icon className="w-5 h-5" style={{ color: NAVY }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-base" style={{ color: NAVY }}>{r.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${ORANGE}15`, color: ORANGE }}>{r.dept}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{r.type}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How to Apply */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black mb-4" style={{ color: NAVY }}>How to Apply</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We keep our hiring process simple, human, and fast. No lengthy portals — just send us a note.
          </p>
          <ol className="space-y-3 mb-6">
            {[
              "Email your CV and a short cover letter (max 200 words) to support@braintam.com.",
              "Subject line: \"Application — [Role Name]\".",
              "Tell us one thing you'd change about how children learn mathematics in India.",
              "We'll respond within 48 hours.",
            ].map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: NAVY }}>{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Users className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Ready to Change Education?</h3>
          <p className="text-blue-200 mb-6">Drop us your details and let's start a conversation.</p>
          <Button asChild className="font-bold px-10 py-3 text-base" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Application%20%E2%80%94%20Braintam">Apply Now — support@braintam.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
