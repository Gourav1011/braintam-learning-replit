import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, Shield, Eye, Lock, Users, AlertTriangle, Heart, CheckCircle, Mail } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const pillars = [
  {
    icon: Eye, title: "Moderated Live Classrooms", color: NAVY,
    desc: "Every live class is hosted by a verified Braintam educator and monitored by a session moderator. Chat functions are controlled — students can ask questions through the platform's structured Q&A, eliminating unmoderated public chat.",
    points: [
      "Session moderator present in every live class",
      "Screen-share and video controls managed by the educator",
      "No unsupervised peer-to-peer communication during sessions",
      "Recordings reviewed for quality and safety before being made available",
    ],
  },
  {
    icon: Lock, title: "Secure Data & Privacy", color: "#7C3AED",
    desc: "We take the privacy of children with the utmost seriousness. Student data is encrypted, never sold, and accessed only by authorised Braintam staff for the purpose of improving your child's learning experience.",
    points: [
      "End-to-end encryption for all student data",
      "No third-party advertising or data monetisation",
      "COPPA and IT Act (India) compliant data practices",
      "Parental consent required for students under 13",
      "Data deletion available on request within 30 days",
    ],
  },
  {
    icon: Users, title: "Verified Educator Network", color: ORANGE,
    desc: "Every Braintam educator undergoes a rigorous vetting process before being permitted to teach on the platform. We conduct background checks, qualification verification, and a standardised teaching assessment.",
    points: [
      "Identity and qualification verification for all educators",
      "Background screening before onboarding",
      "Ongoing performance monitoring via student feedback",
      "Zero-tolerance policy for inappropriate conduct",
      "Dedicated escalation path for educator concerns",
    ],
  },
  {
    icon: Heart, title: "Positive Learning Environment", color: "#16A34A",
    desc: "We actively cultivate an environment of encouragement, respect, and growth. Our educators are trained in child-centred communication, and our platform design eliminates comparison-based anxiety.",
    points: [
      "No public shaming or negative reinforcement",
      "Inclusive content respectful of all backgrounds and abilities",
      "Leaderboards are opt-in — students choose their visibility",
      "Educators trained in supportive, growth-mindset pedagogy",
      "Anonymous feedback option for students who feel uncomfortable",
    ],
  },
];

const reportSteps = [
  { step: "01", title: "Contact Us Immediately", desc: "Email support@braintam.com with the subject 'Student Safety Report'. Include the date, time, and a description of the incident." },
  { step: "02", title: "Acknowledgement Within 2 Hours", desc: "Our student protection team will acknowledge your report within 2 hours during business hours (9 AM – 7 PM IST, Mon–Sat). For urgent matters, we monitor emails 24/7." },
  { step: "03", title: "Investigation", desc: "We will investigate every report thoroughly and impartially. The reporting student's identity is kept strictly confidential throughout the process." },
  { step: "04", title: "Resolution & Follow-Up", desc: "We will communicate our findings and the action taken within 72 hours of the initial report. If further steps are required, we will guide the family through the process." },
];

export default function StudentProtectionPage() {
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
          <Shield className="w-4 h-4" style={{ color: ORANGE }} /> Safety First — Always
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Student Protection</h1>
        <p className="text-lg text-blue-200 max-w-2xl mx-auto">The safety, dignity, and wellbeing of every child on our platform is non-negotiable. Here is exactly how we protect every student, every day.</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-14 space-y-14">

        {/* Commitment Banner */}
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 flex gap-4">
          <Shield className="w-8 h-8 flex-shrink-0 mt-0.5" style={{ color: NAVY }} />
          <div>
            <h2 className="font-black text-lg mb-2" style={{ color: NAVY }}>Our Student Protection Commitment</h2>
            <p className="text-gray-600 leading-relaxed">
              Braintam is a platform built for children. We hold ourselves to the highest standards of child safety — not because regulations require it, but because we genuinely care about every student who trusts us with their learning. Every design decision, every hire, every policy is evaluated through the lens of: <strong>"Is this safe for a child?"</strong>
            </p>
          </div>
        </div>

        {/* Four Pillars */}
        <section>
          <h2 className="text-2xl font-black text-center mb-8" style={{ color: NAVY }}>Our Four Protection Pillars</h2>
          <div className="space-y-6">
            {pillars.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${p.color}15` }}>
                      <Icon className="w-6 h-6" style={{ color: p.color }} />
                    </div>
                    <h3 className="text-xl font-black" style={{ color: NAVY }}>{p.title}</h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-5">{p.desc}</p>
                  <ul className="space-y-2">
                    {p.points.map(pt => (
                      <li key={pt} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: p.color }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Platform Rules */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>Platform Community Standards</h2>
          <p className="text-gray-600 leading-relaxed mb-5">All students, parents, and educators using Braintam agree to uphold these non-negotiable standards:</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Treat every student and educator with respect",
              "No bullying, harassment, or exclusionary language",
              "No sharing of personal contact details in platform chat",
              "No recording of live sessions without written permission",
              "Accounts are personal — do not share login credentials",
              "Report suspicious behaviour immediately to our team",
              "No inappropriate content in submissions or communications",
              "Adults must supervise children under 10 during live sessions",
            ].map(rule => (
              <div key={rule} className="flex items-start gap-2 p-3 rounded-xl bg-[#F8FAFF] border border-gray-100">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
                <span className="text-sm text-gray-600">{rule}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reporting */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <AlertTriangle className="w-6 h-6" style={{ color: ORANGE }} />
            <h2 className="text-xl font-black" style={{ color: NAVY }}>How to Report a Safety Concern</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            If a student, parent, or educator encounters anything on the Braintam platform that feels unsafe, inappropriate, or concerning — please report it immediately. No concern is too small.
          </p>
          <div className="space-y-4">
            {reportSteps.map(s => (
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
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Report a Safety Concern</h3>
          <p className="text-blue-200 mb-2">Our student protection team responds within 2 hours.</p>
          <p className="text-xl font-black mb-5" style={{ color: ORANGE }}>support@braintam.com</p>
          <Button asChild className="font-bold px-10 py-3" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Student%20Safety%20Report">Report Now →</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
