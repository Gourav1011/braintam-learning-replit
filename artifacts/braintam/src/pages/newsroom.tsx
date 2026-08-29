import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, Newspaper, Download, ExternalLink, Award, Users, TrendingUp, Globe } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const pressReleases = [
  {
    date: "May 2026", tag: "Platform Launch",
    title: "Braintam Launches 2.0 — India's Most Comprehensive EdTech Platform for Grades 1–10",
    excerpt: "Braintam today announced the launch of its upgraded platform featuring 200+ expert-crafted courses, AI-adaptive testing, live class infrastructure, and a new Olympiad preparation suite covering IMO, NSO, IEO, and NTSE.",
  },
  {
    date: "March 2026", tag: "Milestone",
    title: "Braintam Crosses 50,000 Active Students Across 500+ Indian Cities",
    excerpt: "Braintam has achieved a landmark 50,000 active student milestone, with learners spanning Tier 1 cities to remote Tier 3 towns. The platform's 6-Day Smart Learning Course reports a 94% completion rate — among the highest in Indian EdTech.",
  },
  {
    date: "January 2026", tag: "Partnership",
    title: "Braintam Partners with 100+ Schools for Integrated Smart Learning Programmes",
    excerpt: "Under its Global Alliances initiative, Braintam has formalised institutional partnerships with 100+ CBSE and ICSE schools, offering blended learning programmes that combine classroom teaching with Braintam's digital content.",
  },
  {
    date: "October 2025", tag: "Awards",
    title: "Braintam Wins 'Best EdTech Product for School Learning' at India EdTech Summit 2025",
    excerpt: "Braintam was recognised at the India EdTech Summit 2025 for its innovative 6-Day Smart Learning Course, which demonstrated the fastest measurable learning outcomes in the primary school segment among all nominees.",
  },
  {
    date: "June 2025", tag: "Research",
    title: "Braintam Study Finds Students Who Learn Vedic Maths Score 42% Higher in School Maths Tests",
    excerpt: "A six-month longitudinal study of 2,000 Braintam students reveals a statistically significant correlation between Braintam's rapid calculation training and school Mathematics performance, with the strongest effect seen in Grades 5–8.",
  },
];

const mediaFeatures = [
  { outlet: "The Hindu Education Plus", quote: "Braintam's approach to mental mathematics is genuinely revolutionary — it's not just about speed, it's about building a child's mathematical confidence from the ground up." },
  { outlet: "Economic Times", quote: "Among India's new wave of EdTech platforms, Braintam stands out for its clear focus on measurable outcomes rather than passive content consumption." },
  { outlet: "YourStory", quote: "The 6-Day Smart Learning Course is one of the most well-designed micro-learning experiences we've seen in the Indian school education space." },
  { outlet: "India Today Education", quote: "Parents are raving about the rapid improvement in their children's calculation speed. Braintam has clearly found a genuine gap in the market." },
];

const milestones = [
  { icon: Users, value: "50,000+", label: "Active Students" },
  { icon: Globe, value: "500+", label: "Cities Covered" },
  { icon: Award, value: "200+", label: "Expert Courses" },
  { icon: TrendingUp, value: "94%", label: "Course Completion Rate" },
];

export default function NewsroomPage() {
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
          <Newspaper className="w-4 h-4" style={{ color: ORANGE }} /> Press & Media Resources
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Newsroom</h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">Official press releases, media features, and company milestones. For media enquiries, contact <a href="mailto:support@braintam.com" className="underline text-white">support@braintam.com</a></p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* Milestones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {milestones.map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: ORANGE }} />
                <p className="text-2xl font-black" style={{ color: NAVY }}>{m.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{m.label}</p>
              </div>
            );
          })}
        </div>

        {/* Press Releases */}
        <section>
          <h2 className="text-2xl font-black mb-6" style={{ color: NAVY }}>Press Releases</h2>
          <div className="space-y-4">
            {pressReleases.map(pr => (
              <div key={pr.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${NAVY}12`, color: NAVY }}>{pr.tag}</span>
                  <span className="text-xs text-gray-400">{pr.date}</span>
                </div>
                <h3 className="font-black text-base leading-snug mb-2" style={{ color: NAVY }}>{pr.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{pr.excerpt}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Media Features */}
        <section>
          <h2 className="text-2xl font-black mb-6" style={{ color: NAVY }}>As Featured In</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {mediaFeatures.map(mf => (
              <div key={mf.outlet} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed italic mb-3">"{mf.quote}"</p>
                <p className="font-bold text-sm" style={{ color: NAVY }}>— {mf.outlet}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Media Kit */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black mb-4" style={{ color: NAVY }}>Media Kit & Resources</h2>
          <p className="text-gray-600 leading-relaxed mb-5">
            Journalists, bloggers, and content creators covering education and EdTech are welcome to use our official brand assets. Please email us for access to our full media kit.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {[
              { label: "Official Logo Pack (PNG, SVG, Dark/Light)", icon: Download },
              { label: "Product Screenshots & App Preview", icon: Download },
              { label: "Founder Bio & Headshot", icon: Download },
              { label: "Company Fact Sheet (PDF)", icon: Download },
            ].map(r => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: NAVY }} />
                  <span className="text-sm text-gray-600">{r.label}</span>
                </div>
              );
            })}
          </div>
          <Button asChild className="font-bold gap-2" style={{ background: NAVY }}>
            <a href="mailto:support@braintam.com?subject=Media%20Kit%20Request"><ExternalLink className="w-4 h-4" />Request Media Kit</a>
          </Button>
        </section>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Media Enquiries</h3>
          <p className="text-blue-200 mb-6">For interviews, data requests, or story pitches, our communications team responds within 24 hours.</p>
          <Button asChild className="font-bold px-10 py-3 text-base" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Media%20Enquiry">Contact Our Press Team</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
