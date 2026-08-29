import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, Globe, School, Building2, Handshake, CheckCircle, BarChart3 } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const partnerTypes = [
  {
    icon: School, title: "School Partners", color: NAVY,
    desc: "Integrate Braintam's 6-Day Smart Learning Course into your school's supplementary curriculum. Our blended learning model works alongside existing CBSE/ICSE teaching without disrupting the timetable.",
    benefits: [
      "Dedicated school dashboard with student performance tracking",
      "Bulk enrolment at institutional pricing",
      "Monthly progress reports for parents and teachers",
      "On-site or virtual orientation workshops for teachers",
      "Co-branded certificates for student achievers",
    ],
  },
  {
    icon: Building2, title: "Coaching Institute Partners", color: "#7C3AED",
    desc: "Supercharge your students' results. Braintam's rapid calculation and mental math modules are used by leading coaching institutes as a competitive edge for JEE, NEET, and Olympiad aspirants.",
    benefits: [
      "White-labelled course bundles for your brand",
      "API access to integrate Braintam content into your LMS",
      "Revenue-sharing on student enrolments",
      "Co-branded marketing collateral and digital assets",
      "Priority access to new courses and beta features",
    ],
  },
  {
    icon: Globe, title: "EdTech & Content Partners", color: ORANGE,
    desc: "We collaborate with EdTech platforms, content creators, and educational publishers to co-develop and distribute premium learning content for Indian school students.",
    benefits: [
      "Content licensing for textbooks, apps, and platforms",
      "Co-produced animated video series",
      "Joint research and outcome studies",
      "Cross-promotional campaigns to shared audiences",
      "Expert educators available for podcasts and webinars",
    ],
  },
  {
    icon: Handshake, title: "Corporate & CSR Partners", color: "#16A34A",
    desc: "Support quality education at scale. Our CSR partnership programme enables corporations to sponsor Braintam access for underserved students across India — with full impact reporting.",
    benefits: [
      "Sponsor student subscriptions in target geographies",
      "Full impact reports: enrolments, completions, outcomes",
      "Brand visibility across Braintam's platform and communications",
      "Employee volunteering opportunities with student mentoring",
      "Annual impact partnership certificates and recognition",
    ],
  },
];

const metrics = [
  { value: "100+", label: "School Partners" },
  { value: "500+", label: "Cities Reached" },
  { value: "50,000+", label: "Students Impacted" },
  { value: "4.9★", label: "Partner Satisfaction" },
];

export default function GlobalAlliancesPage() {
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
          <Globe className="w-4 h-4" style={{ color: ORANGE }} /> Schools · Institutes · Corporates · EdTech
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Global Alliances</h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">We believe the best learning outcomes happen through collaboration. Braintam partners with schools, coaching institutes, and organisations that share our commitment to transforming how India's children learn.</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map(m => (
            <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
              <p className="text-2xl font-black" style={{ color: NAVY }}>{m.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Partner Types */}
        <section>
          <h2 className="text-2xl font-black text-center mb-8" style={{ color: NAVY }}>Partnership Tracks</h2>
          <div className="space-y-6">
            {partnerTypes.map(pt => {
              const Icon = pt.icon;
              return (
                <div key={pt.title} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${pt.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: pt.color }} />
                    </div>
                    <h3 className="text-xl font-black" style={{ color: NAVY }}>{pt.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-5">{pt.desc}</p>
                  <ul className="space-y-2">
                    {pt.benefits.map(b => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: pt.color }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Process */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="w-6 h-6" style={{ color: ORANGE }} />
            <h2 className="text-2xl font-black" style={{ color: NAVY }}>How We Work Together</h2>
          </div>
          <div className="space-y-5">
            {[
              { step: "01", title: "Initial Conversation", desc: "Email us at support@braintam.com with your organisation name, type, and what you're hoping to achieve. We'll respond within 24 hours." },
              { step: "02", title: "Discovery Call", desc: "A 30-minute call with our partnerships team to understand your needs, student profile, and objectives. We'll share relevant case studies and pricing." },
              { step: "03", title: "Proposal & Agreement", desc: "We draft a customised partnership proposal with clear deliverables, timelines, and pricing. Our agreements are straightforward and fair." },
              { step: "04", title: "Onboarding & Launch", desc: "Our dedicated onboarding team handles everything — from student account setup to teacher training. You're live within 7 working days." },
              { step: "05", title: "Ongoing Support", desc: "A dedicated Braintam Alliance Manager is assigned to your account. Monthly reviews, performance dashboards, and proactive support — always." },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ background: NAVY }}>{s.step}</div>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: NAVY }}>{s.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Handshake className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Start a Partnership Conversation</h3>
          <p className="text-blue-200 mb-6">Tell us about your organisation and we'll design a partnership that creates real value for your students.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-bold px-8 py-3" style={{ background: ORANGE }}>
              <a href="mailto:support@braintam.com?subject=Partnership%20Enquiry">Email Our Alliances Team</a>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3">
              <Link href="/enroll">See the 6-Day Course</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
