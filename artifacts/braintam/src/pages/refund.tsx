import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, XCircle, Mail } from "lucide-react";

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
        <h1 className="text-4xl md:text-5xl font-black mb-4">Fair Refund Policy</h1>
        <p className="text-lg text-blue-200 max-w-xl mx-auto">We stand behind the quality of our 6-Day Smart Learning Course. If it's not the right fit, we'll make it right — quickly and without hassle.</p>
        <p className="text-xs text-blue-300 mt-3">Last updated: January 2026</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-14 space-y-10">

        {/* Core Promise */}
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 flex gap-4">
          <ShieldCheck className="w-8 h-8 flex-shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
          <div>
            <h2 className="font-black text-lg mb-2" style={{ color: NAVY }}>Our Commitment to You</h2>
            <p className="text-gray-600 leading-relaxed">
              We invest enormous care in creating and delivering the 6-Day Smart Learning Course. We are confident that if your child attends with an open mind, they will see measurable results. At the same time, we understand that circumstances change. Our refund policy is designed to be fair — to you and to us.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-6" style={{ color: NAVY }}>Refund Eligibility by Timeline</h2>
          <div className="space-y-4">
            {[
              {
                label: "Before the Course Starts", eligible: true,
                desc: "Full refund, no questions asked. If you change your mind before the first session begins, simply email us and we will process a 100% refund within 5–7 business days.",
                icon: CheckCircle, color: "#16A34A",
              },
              {
                label: "After Day 1 (Before Day 3)", eligible: true,
                desc: "Full refund available. If you attend Day 1 or Day 2 and decide the course is not right for your child, you are still entitled to a complete refund. Email us before Day 3 begins.",
                icon: CheckCircle, color: "#16A34A",
              },
              {
                label: "After Day 3 (Days 3–6)", eligible: false,
                desc: "Refunds are not available after Day 2 is completed. By Day 3, the majority of the core curriculum has been delivered — the rapid calculation techniques, shortcuts, and practice exercises that form the heart of the course.",
                icon: XCircle, color: "#DC2626",
              },
              {
                label: "After the Course Ends", eligible: false,
                desc: "No refunds are available once the 6-day programme has concluded. Recordings and course materials remain accessible for 30 days post-completion.",
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

        {/* Special Cases */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>Special Circumstances</h2>
          <div className="space-y-4">
            {[
              {
                title: "Medical Emergency or Serious Illness",
                desc: "If your child is unable to attend due to a verified medical emergency occurring during the 6-day window, please email support@braintam.com with documentation. We will either issue a full refund or provide a free seat in the next available batch — your choice.",
              },
              {
                title: "Technical Failure on Braintam's End",
                desc: "If a session is cancelled or significantly disrupted due to a platform failure on our side, we will either reschedule the session at no cost or issue a proportionate refund for the affected session(s).",
              },
              {
                title: "Batch Transfer Request",
                desc: "Changed your mind about the timing? You may transfer to a different batch before Day 1 — completely free. Email support@braintam.com with at least 24 hours' notice.",
              },
              {
                title: "Dissatisfaction with Course Quality",
                desc: "If you feel the course did not meet the standard we described before Day 3, we treat this as a full refund case and will process it without requiring detailed justification. Your trust matters more to us than any single fee.",
              },
            ].map(sc => (
              <div key={sc.title} className="border-l-4 pl-4 py-1" style={{ borderColor: ORANGE }}>
                <p className="font-bold text-sm mb-1" style={{ color: NAVY }}>{sc.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{sc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black mb-5" style={{ color: NAVY }}>How to Request a Refund</h2>
          <div className="space-y-4">
            {[
              "Email support@braintam.com with the subject line: \"Refund Request — [Your Name] — [Child's Grade]\".",
              "Include your registered email address and order/payment confirmation number.",
              "Briefly describe the reason for your request (optional but helpful).",
              "We will acknowledge your email within 4 hours and process the refund within 5–7 business days to your original payment method.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0" style={{ background: NAVY }}>{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
          <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-700 font-semibold">⏱ Refund Timeline: Approved refunds are processed within 5–7 business days. Depending on your bank or payment provider, the amount may appear in your account within an additional 2–3 business days.</p>
          </div>
        </section>

        {/* Batch Transfer */}
        <section className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6" style={{ color: ORANGE }} />
            <h2 className="text-xl font-black" style={{ color: NAVY }}>Prefer a Transfer Instead?</h2>
          </div>
          <p className="text-gray-600 leading-relaxed mb-4">
            If the timing doesn't work rather than the course itself, consider a free batch transfer. We always have new cohorts starting — email us and we'll find you the best fit.
          </p>
          <p className="text-sm font-semibold" style={{ color: NAVY }}>Batch transfers are available free of charge before Day 1 of your enrolled batch.</p>
        </section>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h3 className="text-2xl font-black mb-2">Have a Refund Query?</h3>
          <p className="text-blue-200 mb-5">Email us — we respond within 24 hours and handle every case individually.</p>
          <Button asChild className="font-bold px-10 py-3" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Refund%20Request">Email support@braintam.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
