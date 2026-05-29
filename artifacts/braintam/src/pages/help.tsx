import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, HelpCircle, CheckCircle, Clock, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const faqs = [
  {
    category: "6-Day Smart Learning Course",
    questions: [
      {
        q: "What exactly is the 6-Day Smart Learning Course?",
        a: "The 6-Day Smart Learning Course is Braintam's flagship programme — an intensive, live-taught course spanning 6 consecutive days. Each session (approximately 60–90 minutes) focuses on rapid calculation techniques, Vedic Maths shortcuts, and mental math strategies tailored to your child's grade level (1–10). By Day 6, most students can calculate 2–3× faster than before, with significantly higher accuracy. The course includes live classes, daily homework, practice tests, and a final assessment.",
      },
      {
        q: "What age group or grade is the course designed for?",
        a: "The 6-Day Smart Learning Course is available for students in Grades 1 through 10. Content is fully grade-differentiated — a Grade 2 child works on basic number sense and addition shortcuts, while a Grade 10 student tackles algebraic speed methods and advanced mental arithmetic. During enrolment, select your child's current grade to be placed in the correct cohort.",
      },
      {
        q: "What will my child actually learn in 6 days?",
        a: "Depending on grade, students learn: rapid multiplication (including 2-digit × 2-digit in under 5 seconds), division shortcuts, fraction and percentage calculation tricks, pattern recognition, number sense building exercises, and mental addition/subtraction techniques. Every technique is from the Vedic Maths tradition and has been validated by our teaching team across thousands of students. Most parents report that their child's school test scores improve within 2–4 weeks of completing the course.",
      },
      {
        q: "Is the course conducted live or pre-recorded?",
        a: "The 6-Day Smart Learning Course is conducted live — with a real Braintam Master teaching in real time. Sessions are interactive: students ask questions, solve problems on screen, and participate in speed challenges. Live recordings are made available for 7 days after each session so your child can rewatch anything they missed.",
      },
      {
        q: "What if my child misses one of the 6 days?",
        a: "We understand that life happens. Session recordings are shared within 2 hours of each live class and remain accessible for 7 days. If your child misses a session, they can catch up via the recording. If they miss more than 2 sessions due to illness or an emergency, email support@braintam.com — we will arrange placement in the next available batch at no extra cost.",
      },
      {
        q: "What equipment does my child need?",
        a: "A smartphone, tablet, or laptop with a stable internet connection is sufficient. We recommend a screen at least 7 inches wide for the best experience. No additional software is required — all classes are delivered through a browser-based link sent to your registered email.",
      },
    ],
  },
  {
    category: "Enrolment & Payment",
    questions: [
      {
        q: "How do I enrol my child?",
        a: "Visit the Enrol page on Braintam, select your child's grade, choose a batch time, and complete payment. You'll receive a confirmation email within 2 hours with your child's login credentials and the class schedule. If you face any difficulty, email support@braintam.com.",
      },
      {
        q: "What payment methods are accepted?",
        a: "We accept UPI (PhonePe, GPay, Paytm), net banking, credit/debit cards, and EMI options. All transactions are processed securely. You will receive a payment receipt via email immediately after purchase.",
      },
      {
        q: "Is the course fee a one-time payment?",
        a: "Yes. The 6-Day Smart Learning Course is a single, one-time payment — no hidden fees, no subscriptions, no auto-renewals. The fee includes all 6 live sessions, recordings, daily practice materials, and the final assessment certificate.",
      },
    ],
  },
  {
    category: "Technical Support",
    questions: [
      {
        q: "I can't log in to the platform. What should I do?",
        a: "First, check that you are using the email address you registered with. Try the 'Forgot Password' option. If the problem persists, email support@braintam.com with the subject 'Login Issue' and your registered email — we'll fix it within 4 hours.",
      },
      {
        q: "The live class video is buffering or freezing. How do I fix this?",
        a: "This is almost always an internet speed issue. Try: (1) Moving closer to your WiFi router. (2) Switching from WiFi to mobile data or vice versa. (3) Closing other apps and browser tabs. (4) Refreshing the page. If the problem continues, email support@braintam.com immediately and we'll ensure your child gets a makeup session.",
      },
      {
        q: "My child's homework submission is not going through.",
        a: "Check that the file size is under 10 MB (for image uploads) and that you have a stable connection. If the problem persists, email the submission directly to support@braintam.com with your child's name, grade, and the homework title.",
      },
    ],
  },
  {
    category: "Refunds & Changes",
    questions: [
      {
        q: "What is Braintam's refund policy?",
        a: "We offer a fair, no-questions-asked refund if requested before the start of Day 3 of the course. After Day 2, refunds are not available as most of the core learning has been delivered. For full details, see our Fair Refund Policy page.",
      },
      {
        q: "Can I transfer my enrolment to a different batch?",
        a: "Yes. Email support@braintam.com at least 24 hours before your batch start date and we will transfer you to the next available cohort for your child's grade — at no charge.",
      },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-sm leading-snug" style={{ color: NAVY }}>{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
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
          <Clock className="w-4 h-4" style={{ color: ORANGE }} /> 24-Hour Response · Real Human Support
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Priority Help Center</h1>
        <p className="text-lg text-blue-200 max-w-xl mx-auto">Find instant answers to the most common questions about Braintam's 6-Day Smart Learning Course — or reach our team directly.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-12">

        {/* Support promise */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: CheckCircle, label: "Real Answers", desc: "No copy-paste replies. Every response is written by a Braintam team member." },
            { icon: Clock, label: "24-Hour SLA", desc: "We guarantee a response to every support email within 24 hours." },
            { icon: HelpCircle, label: "No Issue Too Small", desc: "Technical glitch, billing question, course feedback — we handle it all." },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: ORANGE }} />
                <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>{s.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>

        {/* FAQ Sections */}
        {faqs.map(section => (
          <section key={section.category}>
            <h2 className="text-xl font-black mb-4" style={{ color: NAVY }}>{section.category}</h2>
            <div className="space-y-2">
              {section.questions.map(faq => (
                <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </section>
        ))}

        {/* Direct Support CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Didn't Find Your Answer?</h3>
          <p className="text-blue-200 mb-2">Our support team is standing by. Every email gets a real, helpful response.</p>
          <p className="text-xl font-black mb-5" style={{ color: ORANGE }}>support@braintam.com</p>
          <Button asChild className="font-bold px-10 py-3" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com">Email Us Now</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
