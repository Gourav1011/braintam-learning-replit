import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, FileText, Mail } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: "By accessing or using Braintam's platform, website, or services (including the 6-Day Smart Learning Course), you confirm that you have read, understood, and agree to be bound by these Terms & Conditions. If you are enrolling a child, you confirm you are their parent or legal guardian and accept these terms on their behalf. If you do not agree to any part of these terms, please do not use our services.",
  },
  {
    title: "2. Description of Services",
    content: "Braintam provides an online educational platform for school students in Grades 1–10, offering live classes, pre-recorded video lessons, homework, tests, assessments, animated videos, and supporting materials. Our flagship offering is the 6-Day Smart Learning Course — a live, instructor-led programme focused on rapid calculation, Vedic Mathematics, and mental math techniques.",
  },
  {
    title: "3. Eligibility & Account Registration",
    content: "Our services are designed for students aged 5–16 (Grades 1–10). To register an account, you must provide accurate, current, and complete information including the student's name, grade, and a valid parental email address. You are responsible for maintaining the confidentiality of your account credentials and for all activities conducted under your account. You agree to notify us immediately at support@braintam.com if you suspect unauthorised access to your account.",
  },
  {
    title: "4. Course Enrolment & Access",
    content: "Upon successful payment, you will receive access to your enrolled course(s) as specified at the time of purchase. Course access is non-transferable and may not be shared with third parties. Live session recordings are made available for 30 days post-completion. Braintam reserves the right to modify course schedules, content, or educators with reasonable advance notice where possible.",
  },
  {
    title: "5. Fees & Payment",
    content: "All fees are displayed in Indian Rupees (INR) inclusive of applicable taxes unless otherwise stated. Payment must be completed in full prior to course commencement. We accept UPI, net banking, credit/debit cards, and approved EMI options. All payment processing is handled by secure, PCI-DSS compliant third-party payment gateways. Braintam does not store your payment card details.",
  },
  {
    title: "6. Refund Policy",
    content: "Our Fair Refund Policy governs all refund requests. In summary: full refunds are available before the course starts or before Day 3 of the 6-Day Smart Learning Course; no refunds are available after Day 2 is completed except in documented medical emergencies or platform failures attributable to Braintam. For full details, please review our Fair Refund Policy page. To request a refund, email support@braintam.com.",
  },
  {
    title: "7. Intellectual Property",
    content: "All content on the Braintam platform — including course videos, animated lessons, worksheets, test questions, written materials, logos, and software — is the exclusive intellectual property of Braintam Learning Private Limited or its licensed content partners. You are granted a limited, non-exclusive, non-transferable licence to access and use course content solely for personal, non-commercial educational purposes. Reproduction, redistribution, sale, or public display of any Braintam content is strictly prohibited without prior written consent.",
  },
  {
    title: "8. Acceptable Use",
    content: "You agree not to: (a) use the platform for any unlawful purpose; (b) attempt to gain unauthorised access to any part of the platform; (c) share your login credentials with others; (d) record live sessions without written permission; (e) post, transmit, or share any content that is harmful, abusive, or inappropriate; (f) interfere with the platform's operation or other users' experience. Braintam reserves the right to suspend or terminate accounts that violate these terms.",
  },
  {
    title: "9. Student Protection & Safety",
    content: "Braintam is committed to maintaining a safe, respectful, and supportive environment for all students. All educators are background-verified and trained in child-safe communication. Live sessions are moderated. Inappropriate conduct by any user — student, parent, or educator — will result in immediate account suspension. For full details, please review our Student Protection page.",
  },
  {
    title: "10. Privacy & Data",
    content: "Your privacy and the privacy of your child is of the utmost importance to us. Our Data Commitment (Privacy Policy) governs how we collect, use, store, and protect personal data. By using Braintam, you consent to the data practices described in our Data Commitment, which is incorporated by reference into these Terms & Conditions.",
  },
  {
    title: "11. Disclaimers & Limitation of Liability",
    content: "Braintam's services are provided 'as is' and 'as available'. While we strive for excellence, we do not warrant that the platform will be uninterrupted, error-free, or that results will be guaranteed for every student. To the maximum extent permitted by law, Braintam's liability for any claim arising from your use of the service is limited to the fees you paid for the relevant course in the 3 months preceding the claim.",
  },
  {
    title: "12. Modifications to Terms",
    content: "Braintam reserves the right to update these Terms & Conditions at any time. Significant changes will be communicated via email to your registered address at least 14 days before taking effect. Continued use of the platform following notice of changes constitutes acceptance of the revised terms.",
  },
  {
    title: "13. Governing Law & Disputes",
    content: "These Terms & Conditions are governed by the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Delhi, India. We encourage you to reach out to support@braintam.com before initiating any formal proceedings — we resolve the vast majority of disputes amicably and quickly.",
  },
  {
    title: "14. Contact",
    content: "For any questions, concerns, or requests relating to these Terms & Conditions, please email support@braintam.com. We respond within 24 hours, Monday to Saturday.",
  },
];

export default function TermsPage() {
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
      <div className="py-14 px-4 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-80" />
        <h1 className="text-4xl font-black mb-3">Terms & Conditions</h1>
        <p className="text-blue-200 max-w-xl mx-auto">Plain English. No fine print. Everything you need to know about using Braintam's platform.</p>
        <p className="text-xs text-blue-300 mt-3">Last updated: January 2026 · Effective immediately</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">

        {/* Quick Summary */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-semibold text-amber-800 mb-1">📋 Quick Summary</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            By using Braintam, you agree to use our platform respectfully and lawfully, pay for services as agreed, and keep your account secure. We protect your child's data and safety. Refunds are available before Day 3 of the 6-Day Course. Questions? Email <a href="mailto:support@braintam.com" className="font-bold underline">support@braintam.com</a>.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map(s => (
            <section key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-black text-base mb-3" style={{ color: NAVY }}>{s.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{s.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Mail className="w-8 h-8 mx-auto mb-3 opacity-80" />
          <h3 className="text-xl font-black mb-2">Questions About These Terms?</h3>
          <p className="text-blue-200 mb-4">We respond to every legal or policy query within 24 hours.</p>
          <Button asChild className="font-bold px-8" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Terms%20Query">Email support@braintam.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
