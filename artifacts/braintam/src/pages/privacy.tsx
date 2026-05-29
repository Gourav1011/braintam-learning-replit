import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, Lock, Shield, Eye, Trash2, Mail, CheckCircle } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const sections = [
  {
    title: "1. Our Data Commitment in Plain English",
    content: "Braintam collects the minimum personal data necessary to provide your child with an excellent learning experience. We do not sell student data. We do not use it for advertising. We do not share it with third parties except as required to operate the platform (e.g., payment processors, cloud hosting). Your child's data belongs to your family — and we treat it that way.",
  },
  {
    title: "2. What Information We Collect",
    content: "Registration Data: Student name, grade, parent/guardian email address, and phone number. Learning Data: Course enrolments, test scores, homework submissions, live class attendance, and lesson completion records. Technical Data: Device type, browser type, IP address, and session duration — collected automatically to ensure platform performance and security. Payment Data: Payment is processed by secure third-party gateways (we do not store card details). Communications: Emails or messages sent to our support team.",
  },
  {
    title: "3. How We Use Your Information",
    content: "To deliver the 6-Day Smart Learning Course and all other Braintam services. To personalise your child's learning journey and track progress. To send important course updates, schedules, and notifications. To process payments and issue receipts. To respond to support queries. To improve the platform based on aggregated, anonymised usage patterns. We do NOT use your data for targeted advertising, profiling for commercial purposes, or automated decision-making that affects your child's education.",
  },
  {
    title: "4. Children's Privacy (COPPA & IT Act Compliance)",
    content: "Braintam's services are designed for students aged 5–16. We take children's privacy extremely seriously. For students under 13, we require parental consent at registration. We collect only the data necessary for educational purposes. Parents and guardians can request access to their child's data, correction of inaccurate data, or complete deletion of the account at any time by emailing support@braintam.com. We comply with India's Information Technology Act, 2000 (and its amendments) and applicable global best practices for children's data protection.",
  },
  {
    title: "5. Data Security Measures",
    content: "All data is encrypted in transit (HTTPS/TLS) and at rest using AES-256 encryption. Access to student data within Braintam is role-based — only authorised staff can access specific types of data for legitimate purposes. We conduct regular security audits and vulnerability assessments. Our cloud infrastructure uses reputable, ISO-27001 certified providers. In the unlikely event of a data breach, we will notify affected users within 72 hours.",
  },
  {
    title: "6. Data Sharing & Third Parties",
    content: "We share your data only with: (a) Payment processors (to complete transactions — they receive only the data necessary for payment). (b) Cloud infrastructure providers (to host the platform securely). (c) Communication tools (to send you emails and notifications). All third-party providers are contractually bound to confidentiality and may not use your data for any purpose other than providing services to Braintam. We never sell, rent, or trade your personal data.",
  },
  {
    title: "7. Cookies & Tracking",
    content: "Braintam uses essential cookies to maintain your login session and remember your preferences. We use analytics cookies (anonymised) to understand how the platform is used so we can improve it. We do not use advertising cookies or track your activity across other websites. You can disable cookies in your browser settings, though this may affect platform functionality.",
  },
  {
    title: "8. Data Retention",
    content: "We retain your account data for as long as you have an active account with Braintam. If you close your account, we delete or anonymise your personal data within 30 days, unless retention is required by law (e.g., financial records for tax compliance, which are retained for 7 years as required by Indian law). Learning records may be retained in anonymised form for research and platform improvement.",
  },
  {
    title: "9. Your Rights",
    content: "You have the right to: Access — request a copy of all personal data we hold about you or your child. Correction — request correction of any inaccurate data. Deletion — request deletion of your account and all associated personal data. Portability — receive your data in a portable format. Withdrawal of Consent — withdraw consent for data processing at any time (this may affect your ability to use the platform). To exercise any of these rights, email support@braintam.com. We respond within 30 days.",
  },
  {
    title: "10. Changes to This Policy",
    content: "We may update this Data Commitment periodically. Significant changes will be communicated via email to your registered address at least 14 days before taking effect. The 'Last Updated' date at the top of this page reflects the most recent revision.",
  },
  {
    title: "11. Contact Our Data Protection Team",
    content: "For any privacy-related questions, data requests, or concerns, email support@braintam.com with the subject 'Privacy / Data Request'. We respond within 24 hours for general queries and within 30 days for formal data subject requests.",
  },
];

export default function PrivacyPage() {
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
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-80" />
        <h1 className="text-4xl font-black mb-3">Data Commitment</h1>
        <p className="text-blue-200 max-w-xl mx-auto">We handle your child's data with the same care we bring to their education — with honesty, purpose, and absolute respect for their privacy.</p>
        <p className="text-xs text-blue-300 mt-3">Last updated: January 2026</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">

        {/* Commitment badges */}
        <div className="grid sm:grid-cols-4 gap-3 mb-8">
          {[
            { icon: Shield, label: "Data Never Sold" },
            { icon: Eye, label: "No Ad Tracking" },
            { icon: Lock, label: "AES-256 Encrypted" },
            { icon: Trash2, label: "Delete on Request" },
          ].map(b => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: ORANGE }} />
                <p className="text-xs font-bold" style={{ color: NAVY }}>{b.label}</p>
              </div>
            );
          })}
        </div>

        {/* Quick summary */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-semibold text-green-800 mb-1">🔒 Our Promise in One Sentence</p>
          <p className="text-sm text-green-700 leading-relaxed">
            We use your child's data only to teach them better — never to profit from it, never to share it beyond what's needed to run the platform, and always with your right to access or delete it.
          </p>
        </div>

        {/* Rights quick list */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="font-black mb-4" style={{ color: NAVY }}>Your Rights at a Glance</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {["Access your data", "Correct inaccurate data", "Delete your account & data", "Export your data", "Withdraw consent", "Know who sees your data"].map(r => (
              <div key={r} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} /> {r}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">To exercise any right: <a href="mailto:support@braintam.com" className="text-blue-600 underline">support@braintam.com</a></p>
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
          <h3 className="text-xl font-black mb-2">Privacy Questions?</h3>
          <p className="text-blue-200 mb-4">Our data protection team responds within 24 hours.</p>
          <Button asChild className="font-bold px-8" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Privacy%20Query">Email support@braintam.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
