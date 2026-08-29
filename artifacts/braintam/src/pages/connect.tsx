import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { braintamLogo } from "@/lib/brand-assets";
import { ArrowLeft, Mail, MessageCircle, Phone, Clock, MapPin, Heart } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const channels = [
  {
    icon: Mail, title: "Email Support", color: NAVY,
    info: "support@braintam.com",
    desc: "Our most reliable channel. We respond to every email within 24 hours — and we genuinely read every message.",
    action: "mailto:support@braintam.com",
    actionLabel: "Send an Email",
  },
  {
    icon: MessageCircle, title: "WhatsApp Chat", color: "#25D366",
    info: "Available on request",
    desc: "For enrolled students and active course participants. Ask your course coordinator for the direct WhatsApp link.",
    action: "mailto:support@braintam.com?subject=WhatsApp%20Contact%20Request",
    actionLabel: "Request WhatsApp Link",
  },
  {
    icon: Phone, title: "Phone Support", color: ORANGE,
    info: "For urgent matters",
    desc: "Phone support is available for enrolment-related queries and technical emergencies. Email us to schedule a callback.",
    action: "mailto:support@braintam.com?subject=Callback%20Request",
    actionLabel: "Schedule a Callback",
  },
];

const faqs = [
  { q: "How do I enrol in the 6-Day Smart Learning Course?", a: "Visit our Enrol page, select your child's grade and a batch timing that works for you, and complete the registration. Our team will confirm within 2 hours." },
  { q: "My child is having trouble accessing the platform — what should I do?", a: "Email support@braintam.com with your registered email address and a brief description of the issue. Our technical team will resolve it within 4 hours." },
  { q: "Can I change my batch or reschedule a class?", a: "Yes. Email us at support@braintam.com at least 12 hours before the scheduled class. We'll do our best to accommodate you." },
  { q: "I want to speak to someone about the course before enrolling.", a: "We love talking to parents. Email support@braintam.com with 'Course Enquiry' in the subject and we'll arrange a free 15-minute call." },
];

export default function ConnectPage() {
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
          <Heart className="w-4 h-4" style={{ color: ORANGE }} /> We're Here for You — Always
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Connect With Us</h1>
        <p className="text-lg text-blue-200 max-w-xl mx-auto">A real person reads every message we receive. Reach out — we genuinely love hearing from students, parents, and partners.</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-12">

        {/* Response commitment */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap gap-6">
          {[
            { icon: Clock, label: "24-Hour Response", desc: "Every email answered within 24 hours, Monday–Saturday." },
            { icon: MapPin, label: "Based in India", desc: "Our support team is in the same timezone as you." },
            { icon: Heart, label: "Human Support", desc: "No bots. A real Braintam team member reads and responds." },
          ].map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="flex items-start gap-3 flex-1 min-w-[200px]">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                <div>
                  <p className="font-bold text-sm" style={{ color: NAVY }}>{c.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary CTA */}
        <div className="rounded-2xl p-10 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Mail className="w-14 h-14 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-black mb-2">Send Us a Message</h2>
          <p className="text-blue-200 mb-2">The fastest way to reach us is always email.</p>
          <p className="text-2xl font-black mb-6" style={{ color: ORANGE }}>support@braintam.com</p>
          <Button asChild className="font-bold px-10 py-3 text-base" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com">Open Email →</a>
          </Button>
          <p className="text-blue-300 text-xs mt-4">We respond within 24 hours · Monday to Saturday · 9 AM – 7 PM IST</p>
        </div>

        {/* Channels */}
        <section>
          <h2 className="text-2xl font-black mb-5" style={{ color: NAVY }}>All Contact Channels</h2>
          <div className="space-y-4">
            {channels.map(ch => {
              const Icon = ch.icon;
              return (
                <div key={ch.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${ch.color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: ch.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm" style={{ color: NAVY }}>{ch.title}</p>
                    <p className="text-xs font-semibold mb-1" style={{ color: ch.color }}>{ch.info}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{ch.desc}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="flex-shrink-0 border-gray-200 text-xs">
                    <a href={ch.action}>{ch.actionLabel}</a>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick FAQs */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black mb-5" style={{ color: NAVY }}>Quick Answers</h2>
          <div className="space-y-5">
            {faqs.map(faq => (
              <div key={faq.q}>
                <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>Q: {faq.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Enroll CTA */}
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-3">Ready to begin your child's learning journey?</p>
          <Button asChild className="font-bold px-10 py-3" style={{ background: NAVY }}>
            <Link href="/enroll">Enrol in the 6-Day Course →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
