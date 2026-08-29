import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, BookOpen, Clock, Tag, TrendingUp } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const articles = [
  {
    category: "Study Techniques", readTime: "6 min", featured: true,
    title: "The Vedic Maths Shortcut Every Grade 5–10 Student Needs to Know",
    excerpt: "Multiplying two 2-digit numbers in under 3 seconds sounds impossible — until you learn the crisscross method. This one technique alone has boosted our students' calculation speed by an average of 2.8×.",
    tags: ["Maths", "Speed", "Grade 6–10"],
    color: NAVY,
  },
  {
    category: "Exam Strategy", readTime: "5 min", featured: true,
    title: "How to Prepare for the IMO Olympiad in 30 Days (Grade 4–8 Guide)",
    excerpt: "A step-by-step 30-day study plan used by Braintam's top IMO scholars. Covers chapter prioritisation, mock test frequency, and the one mistake 80% of Olympiad aspirants make in Week 3.",
    tags: ["Olympiad", "IMO", "Study Plan"],
    color: "#7C3AED",
  },
  {
    category: "Parent Guide", readTime: "4 min", featured: false,
    title: "5 Signs Your Child is Ready for JEE Foundation (and 3 Signs They're Not)",
    excerpt: "Starting JEE Foundation too early can backfire. We help parents understand the cognitive and conceptual readiness markers that determine when (Grade 8 or Grade 9) a child should begin.",
    tags: ["JEE", "Parents", "Planning"],
    color: ORANGE,
  },
  {
    category: "Mental Health", readTime: "5 min", featured: false,
    title: "Exam Anxiety is Real — Here's How to Help Your Child Manage It",
    excerpt: "Research-backed breathing techniques, study schedule adjustments, and mindset reframes that Braintam's counsellors use with students before high-stakes exams. Simple, actionable, effective.",
    tags: ["Wellbeing", "Exams", "Parents"],
    color: "#16A34A",
  },
  {
    category: "Study Techniques", readTime: "7 min", featured: false,
    title: "The Pomodoro Method for Students: A Grade-by-Grade Guide",
    excerpt: "Not all study sessions are equal. We break down how different age groups (Grades 1–4, 5–7, 8–10) should structure their study blocks for maximum retention with minimum burnout.",
    tags: ["Productivity", "Study Tips", "All Grades"],
    color: "#0891B2",
  },
  {
    category: "Exam Strategy", readTime: "6 min", featured: false,
    title: "NTSE 2026: Complete State-Wise Cutoff Analysis and What It Means for You",
    excerpt: "We analysed NTSE Stage 1 results from 28 states to find the patterns. Which states have the toughest cutoffs? What's the safest score to target? Our data-driven breakdown has the answers.",
    tags: ["NTSE", "Analysis", "Grade 10"],
    color: "#DC2626",
  },
  {
    category: "Skill Building", readTime: "4 min", featured: false,
    title: "Why Every Student (Not Just Engineers) Should Learn Basic Coding",
    excerpt: "Computational thinking — the ability to break problems into logical steps — is now as important as reading. We explain how Braintam's coding curriculum builds this skill from Grade 4 onwards.",
    tags: ["Coding", "Future Skills", "Grade 4–10"],
    color: "#CA8A04",
  },
  {
    category: "Study Techniques", readTime: "5 min", featured: false,
    title: "Memory Palaces for Students: Remember Entire History Chapters in 20 Minutes",
    excerpt: "The ancient technique used by world memory champions — adapted for school students. Our Social Science educators explain how to build a memory palace for CBSE History chapters.",
    tags: ["Memory", "History", "Social Science"],
    color: "#7C3AED",
  },
];

export default function KnowledgeHubPage() {
  const featured = articles.filter(a => a.featured);
  const rest = articles.filter(a => !a.featured);

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
          <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} /> Expert Insights for Students & Parents
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Knowledge Hub</h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">Evidence-based study strategies, exam guides, and learning science — written by Braintam's expert educators for students in Grades 1–10.</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14">

        {/* Featured */}
        <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>Featured Articles</h2>
        <div className="grid md:grid-cols-2 gap-5 mb-12">
          {featured.map(a => (
            <div key={a.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-2 w-full" style={{ background: a.color }} />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${a.color}15`, color: a.color }}>{a.category}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{a.readTime} read</span>
                </div>
                <h3 className="font-black text-base leading-snug mb-3" style={{ color: NAVY }}>{a.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{a.excerpt}</p>
                <div className="flex flex-wrap gap-1.5">
                  {a.tags.map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      <Tag className="w-2.5 h-2.5" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* All Articles */}
        <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>All Articles</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {rest.map(a => (
            <div key={a.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${a.color}15`, color: a.color }}>{a.category}</span>
                <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" />{a.readTime} read</span>
              </div>
              <h3 className="font-bold text-sm leading-snug mb-2" style={{ color: NAVY }}>{a.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{a.excerpt}</p>
            </div>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Get Weekly Study Tips in Your Inbox</h3>
          <p className="text-blue-200 mb-6">Join 25,000+ parents and students who receive our expert learning insights every week — free.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="font-bold px-8 py-3" style={{ background: ORANGE }}>
              <a href="mailto:support@braintam.com?subject=Subscribe%20to%20Knowledge%20Hub">Subscribe Free →</a>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-3">
              <Link href="/enroll">Start the 6-Day Course</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
