import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, XCircle, Mail, AlertCircle } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export default function RefundPage() {
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
          <ShieldCheck className="w-4 h-4" style={{ color: ORANGE }} /> Transparent · Fair · No Fine Print
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4">Refund Policy</h1>
        <p className="text-lg text-blue-200 max-w-xl mx-auto">We stand behind the quality of our courses and programmes. If something isn't right, we'll make it right — promptly and without hassle.</p>
        <p className="text-xs text-blue-300 mt-3">Last updated: May 2026</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-8">

        {/* 3 Key Rules — highlighted cards */}
        <section>
          <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>Policy at a Glance</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Clock,
                color: "#0B2B6B",
                bg: "#EFF6FF",
                border: "#BFDBFE",
                heading: "7-Day Window",
                body: "Refund requests must be submitted within 7 days of your enrolment date.",
              },
              {
                icon: XCircle,
                color: "#DC2626",
                bg: "#FFF5F5",
                border: "#FECACA",
                heading: "No Refund After Usage",
                body: "Once you have made significant use of course content, refunds are no longer available.",
              },
              {
                icon: CheckCircle,
                color: "#16A34A",
                bg: "#F0FDF4",
                border: "#DCFCE7",
                heading: "7–10 Working Days",
                body: "Approved refunds are processed and returned to your original payment method within 7–10 working days.",
              },
            ].map(card => {
              const Icon = card.icon;
              return (
                <div key={card.heading} className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: card.bg, borderColor: card.border }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: card.color + "15" }}>
                    <Icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                  <p className="font-black text-base" style={{ color: NAVY }}>{card.heading}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{card.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Eligibility */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-6" style={{ color: NAVY }}>Refund Eligibility</h2>
          <div className="space-y-4">
            {[
              {
                label: "Within 7 days of enrolment — minimal usage",
                eligible: true,
                desc: "If you enrolled recently and have not made significant use of the course content, you are entitled to a full refund. Submit your request within 7 days of your enrolment date.",
                icon: CheckCircle, color: "#16A34A",
              },
              {
                label: "Within 7 days — but significant usage",
                eligible: false,
                desc: "If you have watched a substantial portion of the course videos, attended live sessions, or accessed the majority of the course materials, a refund cannot be issued even within the 7-day window.",
                icon: XCircle, color: "#DC2626",
              },
              {
                label: "After 7 days of enrolment",
                eligible: false,
                desc: "Refund requests submitted more than 7 days after enrolment cannot be accepted, regardless of course usage.",
                icon: XCircle, color: "#DC2626",
              },
            ].map(t => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="flex gap-4 p-4 rounded-xl border" style={{ borderColor: t.eligible ? "#DCFCE7" : "#FEE2E2", background: t.eligible ? "#F0FDF4" : "#FFF5F5" }}>
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: t.color }} />
                  <div>
                    <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>{t.label}
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: t.eligible ? "#DCFCE7" : "#FEE2E2", color: t.color }}>
                        {t.eligible ? "✓ Eligible" : "✗ Not Eligible"}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* What counts as significant usage */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <div className="flex gap-3 items-center mb-5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: ORANGE }} />
            <h2 className="text-xl font-black" style={{ color: NAVY }}>What Counts as "Significant Usage"?</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">Significant usage means you have accessed and consumed a meaningful portion of the course. This includes:</p>
          <ul className="space-y-2">
            {[
              "Watching more than 30% of the course video content",
              "Attending 2 or more live class sessions",
              "Completing 3 or more graded assignments, tests, or exercises",
              "Downloading course materials (worksheets, PDFs, etc.)",
            ].map(item => (
              <li key={item} className="flex gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ORANGE }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-4 italic">If you are unsure whether your usage qualifies, email us — we'll review your account activity and give you an honest answer.</p>
        </section>

        {/* Special cases */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>Special Circumstances</h2>
          <div className="space-y-4">
            {[
              {
                title: "Medical Emergency or Serious Illness",
                desc: "If your child is unable to continue due to a verified medical emergency, email support@braintam.com with documentation. We will issue a full refund or provide a free seat in the next available batch — your choice.",
              },
              {
                title: "Technical Failure on Braintam's End",
                desc: "If a session is cancelled or significantly disrupted due to a platform failure on our side, we will reschedule the session at no cost or issue a proportionate refund for the affected session(s).",
              },
              {
                title: "Batch Transfer (Free Alternative)",
                desc: "If the timing doesn't suit you rather than the course itself, you may transfer to a different batch for free before Day 1. Email support@braintam.com with at least 24 hours' notice.",
              },
            ].map(sc => (
              <div key={sc.title} className="border-l-4 pl-4 py-1" style={{ borderColor: ORANGE }}>
                <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>{sc.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{sc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to request */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>How to Request a Refund</h2>
          <div className="space-y-4">
            {[
              "Email support@braintam.com with the subject line: \"Refund Request — [Your Name] — [Enrolment Date]\".",
              "Include your registered email address and payment confirmation/order number.",
              "Briefly describe the reason for your request (optional but helpful).",
              "We will acknowledge your email within 4 hours and, if approved, process the refund within 7–10 working days to your original payment method.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: NAVY }}>{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 font-semibold">Processing Time: Approved refunds are processed within <strong>7–10 working days</strong>. Depending on your bank or payment provider, the amount may take an additional 2–3 business days to appear in your account.</p>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Questions About a Refund?</h3>
          <p className="text-blue-200 mb-5">Email us — we respond within 4 hours and handle every case individually and fairly.</p>
          <Button asChild className="font-bold px-10 py-3" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Refund%20Request">Email support@braintam.com</a>
          </Button>
        </div>

      </div>
    </div>
  );
}
