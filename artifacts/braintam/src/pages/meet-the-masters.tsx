import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, Award, BookOpen, Zap, Brain } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const masters = [
  {
    name: "Dr. Priya Sharma", role: "Head of Mathematics & Rapid Calculation",
    initials: "PS", color: NAVY,
    quals: ["IIT Delhi — M.Sc. Mathematics", "15 years competitive exam coaching", "500+ NTSE, JEE rank-holders trained"],
    bio: "Dr. Priya pioneered Braintam's signature rapid-calculation curriculum. Her teaching philosophy: 'Speed is a skill, not a gift.' She has coached over 10,000 students using Vedic Maths and shortcut frameworks, consistently producing top performers in IMO, NTSE, and JEE.",
    expertise: ["Vedic Mathematics", "Mental Arithmetic", "Algebra", "Number Theory"],
  },
  {
    name: "Mr. Rajesh Verma", role: "Senior Science Educator",
    initials: "RV", color: "#7C3AED",
    quals: ["NIT Trichy — B.Tech Physics", "12 years Science Olympiad training", "NSO Gold Medal coach"],
    bio: "Rajesh specialises in making abstract science concepts tangible and exciting. His animated explanation style has helped thousands of students crack NSO and build a strong foundation for NEET. He believes every student is a scientist waiting to be discovered.",
    expertise: ["Physics Fundamentals", "Chemistry Concepts", "NSO / NEET Prep", "Experimental Learning"],
  },
  {
    name: "Ms. Kavya Nair", role: "Computer Science & Coding Expert",
    initials: "KN", color: "#0891B2",
    quals: ["BITS Pilani — B.E. Computer Science", "Google-certified educator", "8 years coding education"],
    bio: "Kavya brings Silicon Valley thinking to school classrooms. From basic digital literacy for Grade 1 to Python programming for Grade 10, she makes technology joyful and accessible. Her students regularly win national-level Cyber Olympiad competitions.",
    expertise: ["Python & Scratch", "Cyber Olympiad", "Digital Literacy", "Problem Solving"],
  },
  {
    name: "Dr. Meera Krishnan", role: "NTSE & Competitive Exam Strategist",
    initials: "MK", color: "#DC2626",
    quals: ["TIFR Mumbai — Ph.D. Mathematics", "20 years NTSE coaching", "Author of 3 competitive exam guides"],
    bio: "Dr. Meera is one of India's most decorated NTSE coaches, with over 300 NTSE scholars under her guidance. She demystifies MAT (Mental Ability Test) and SAT through a structured, pattern-based approach that transforms anxious students into confident test-takers.",
    expertise: ["NTSE MAT & SAT", "Logical Reasoning", "Pattern Recognition", "Mental Ability"],
  },
  {
    name: "Mr. Kapil Bansal", role: "JEE Foundation Mathematics",
    initials: "KB", color: "#16A34A",
    quals: ["IIT Bombay — B.Tech", "13 years JEE Main & Advanced coaching", "500+ IIT selections"],
    bio: "Kapil bridges the gap between school mathematics and JEE-level thinking. Starting from Grade 8, he builds the conceptual depth and problem-solving agility that separate average students from IIT rank-holders. His JEE Foundation programme is Braintam's highest-rated course.",
    expertise: ["JEE Maths", "Algebra & Calculus Basics", "Number Theory", "Geometry"],
  },
  {
    name: "Ms. Anita Kapoor", role: "English Language & Olympiad Specialist",
    initials: "AK", color: "#CA8A04",
    quals: ["Delhi University — M.A. English Literature", "CELTA Certified", "10 years IEO coaching"],
    bio: "Anita believes strong English skills unlock every academic door. Through immersive reading, structured writing, and vocabulary expansion techniques, she prepares students for IEO competitions and beyond. Her students consistently achieve Achiever-level scores.",
    expertise: ["English Grammar", "Reading Comprehension", "Creative Writing", "IEO Preparation"],
  },
];

export default function MeetTheMastersPage() {
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
          <Award className="w-4 h-4" style={{ color: ORANGE }} /> IIT · NIT · TIFR Trained Educators
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Meet the Masters</h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">Our educators aren't just teachers — they are mentors, champions, and lifelong learners who bring extraordinary expertise into every classroom.</p>
      </div>

      {/* Pillars */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-3 gap-5 mb-14">
          {[
            { icon: Brain, title: "Mental Math Pioneers", desc: "Specialists in rapid calculation techniques that boost speed by 3× in just 6 days." },
            { icon: Award, title: "Olympiad Champions", desc: "Coaches with a combined 500+ IMO, NSO, IEO, and NTSE scholar mentorships." },
            { icon: Zap, title: "IIT / NIT Pedigree", desc: "Every Master holds a top-tier Indian or international academic qualification." },
          ].map(p => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${ORANGE}18` }}>
                  <Icon className="w-6 h-6" style={{ color: ORANGE }} />
                </div>
                <h3 className="font-bold mb-1" style={{ color: NAVY }}>{p.title}</h3>
                <p className="text-sm text-gray-500">{p.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Master Cards */}
        <h2 className="text-2xl font-black text-center mb-8" style={{ color: NAVY }}>Our Educators</h2>
        <div className="space-y-6">
          {masters.map(m => (
            <div key={m.name} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl" style={{ background: m.color }}>
                    {m.initials}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-black text-lg" style={{ color: NAVY }}>{m.name}</h3>
                      <p className="text-sm font-semibold" style={{ color: ORANGE }}>{m.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{m.bio}</p>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {m.quals.map(q => (
                      <span key={q} className="flex items-center gap-1 text-xs text-gray-500">
                        <BookOpen className="w-3 h-3 flex-shrink-0" style={{ color: NAVY }} /> {q}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.expertise.map(e => (
                      <span key={e} className="text-xs px-2.5 py-0.5 rounded-full font-semibold" style={{ background: `${m.color}12`, color: m.color }}>
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <h3 className="text-2xl font-black mb-2">Learn Directly from the Masters</h3>
          <p className="text-blue-200 mb-6">Book your child's place in our 6-Day Smart Learning Course — taught live by India's finest educators.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-bold px-8 py-3" style={{ background: ORANGE }}>
              <Link href="/enroll">Book the 6-Day Course →</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3">
              <a href="mailto:support@braintam.com">Ask About Our Educators</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
