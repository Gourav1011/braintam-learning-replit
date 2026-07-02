import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, Lock, Shield, Eye, Trash2, Mail, CheckCircle, Bell, Users } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const sections = [
  {
    title: "1. Introduction & Our Commitment",
    content: `Braintam Learning ("Braintam", "we", "us", "our") values the trust you place in us when you provide personal information about yourself or your child. In order to honour that trust, Braintam adheres to ethical standards in gathering, using, and safeguarding all information provided to us.

This Privacy Policy ("Policy") governs your use of the Braintam website (www.braintam.com), the Braintam mobile application, and all associated services managed by Braintam Learning ("Services"). Please read this Policy carefully before registering or using the platform. Your continued use of the Services constitutes acceptance of this Policy. If you do not agree with any provision, please refrain from using the platform.`,
  },
  {
    title: "2. Information We Collect",
    content: `When you register and use the Braintam platform, we collect the following categories of information:

Registration & Contact Information: Student name, age/grade, parent or guardian name, email address, phone number, and password created at sign-up.

Demographic & Academic Information: Grade, school name, city, subject preferences, course enrolments, test scores, homework submissions, assignment records, and live class attendance — collected to personalise your child's learning experience.

Payment Information: Payment transactions are processed by secure, PCI-DSS compliant third-party gateways. Braintam does not store credit/debit card details or banking credentials.

Technical & Device Information: Device type and model, mobile operating system, browser type and version, IP address, session duration, and usage behaviour — collected automatically when you access the platform.

Log Information: When you access the platform, our servers automatically record your web request, IP address, browser language, date and time of the request, and session identifiers.

User Communications: When you contact our support team by email or through in-app messaging, we retain those communications to process your enquiry and improve our services.

(Collectively referred to as "Information")`,
  },
  {
    title: "3. How We Use Your Information",
    content: `We use your Information for the following purposes:

• To deliver our educational services — live classes, course content, tests, homework, and all associated platform features.
• To personalise your child's learning journey by tracking progress and adapting recommendations to areas of improvement.
• To send important service communications — class schedules, assignment reminders, results, and platform updates.
• To process payments and issue receipts or refund confirmations.
• To respond promptly to support queries and grievances.
• To analyse aggregated, anonymised usage trends to improve platform quality and content.
• To conduct research and improve Braintam's products and educational offerings.
• To fulfil obligations under applicable laws, court orders, or requests from government or investigatory authorities.
• To send transactional service notifications considered an essential part of the Services you have opted into.

We do NOT use your Information for targeted advertising, third-party profiling for commercial gain, or any automated decision-making that materially affects your child's educational record.`,
  },
  {
    title: "4. Children's Privacy",
    content: `Braintam's platform is designed for students aged 5–16. We take children's privacy with the utmost seriousness. For students under 13, we require explicit parental or guardian consent at the time of registration. We collect only the data that is necessary for educational service delivery.

Parents and guardians have the right at any time to:
• Access all data Braintam holds about their child.
• Correct any inaccurate or outdated information.
• Request complete deletion of the child's account and all associated personal data.
• Revoke consent for data collection and processing.

To exercise any of these rights, please email support@braintam.com. A valid request to delete Information will be accommodated within a reasonable time. Please note that deletion of an account may result in termination of access to enrolled courses and services. Braintam complies with India's Information Technology Act, 2000 and its amendments, and follows applicable global best practices for children's data protection.`,
  },
  {
    title: "5. How We Use & Share Information with Third Parties",
    content: `Braintam shares your Information with third parties only in the following limited circumstances:

• Service Providers: We work with trusted third-party providers (including payment processors, cloud hosting providers, email/notification services, and analytics tools) who perform services on our behalf. These providers are contractually bound to confidentiality and may not use your Information for any purpose other than providing services to Braintam.

• Legal Obligations: We may share your Information where required by applicable law, in response to a court order, summons, or government or investigatory authority request, or to investigate or prevent potential fraud or security breaches.

• Business Continuity: In the event of a merger, acquisition, or sale of assets, your Information may be transferred to the successor entity, subject to equivalent privacy protections.

Braintam never sells, rents, or trades your personal data. Third parties who receive your Information are prohibited from independent use or further disclosure of that Information beyond what is necessary to provide the contracted service.`,
  },
  {
    title: "6. Data Security Measures",
    content: `Braintam implements physical, electronic, and procedural safeguards to protect your Information. Security measures include:

• All data is encrypted in transit using HTTPS/TLS and at rest using AES-256 encryption.
• Access to student data within Braintam is role-based — only authorised personnel who require access for legitimate operational purposes can view specific data categories.
• We conduct regular security audits and vulnerability assessments.
• Our cloud infrastructure uses reputable, ISO-27001 certified providers.

While Braintam endeavours to maintain robust security, no transmission over the internet is completely secure. We cannot guarantee absolute security of information transmitted to or from the platform, and Users transmit data at their own risk. In the unlikely event of a data breach, affected Users will be notified within 72 hours.`,
  },
  {
    title: "7. Cookies & Tracking Technologies",
    content: `Braintam uses cookies (small files placed on your device) to enhance your experience on the platform. Cookies are used to:

• Maintain your login session and remember preferences.
• Track your activity within the platform to personalise content and learning recommendations.
• Analyse aggregated, anonymised usage trends to improve platform quality.

Braintam does not use advertising cookies or track your activity across third-party websites. Most browsers are set to accept cookies by default. You may reset your browser to refuse cookies or to alert you when cookies are being sent. Please note: disabling cookies may affect the functionality of certain platform features.`,
  },
  {
    title: "8. Communication & Alerts",
    content: `Braintam may contact you by email, SMS, or phone call (via authorised third-party communication providers) to inform you about:

• Class schedules, reminders, and upcoming sessions.
• New courses, features, or service offerings relevant to your enrolled grade.
• Important account or policy updates.
• Responses to your support queries.

These communications are considered an essential part of the Services you have enrolled in. You may opt out of promotional or marketing communications at any time by emailing support@braintam.com. Please note that opting out of transactional communications (e.g., class reminders, receipts) may impair your use of the platform.`,
  },
  {
    title: "9. Public Forums & Community Features",
    content: `Braintam may offer community features such as discussion boards, doubt forums, or peer interaction tools. Any Information you post or share in such public areas — including your name, comments, files, or images — will be accessible to other registered users and will exist in a shared environment. All such sharing is done at your own risk. Please be mindful that information shared publicly may be viewable by others using the platform.`,
  },
  {
    title: "10. Links to Third-Party Websites",
    content: `The Braintam platform may contain links to third-party websites or services. Braintam may track whether such links are followed in order to improve its content recommendations. Clicking on external links may take you to sites outside the Braintam platform. Braintam is not responsible for the privacy practices, accuracy, or content of those third-party sites. We encourage users to read the privacy policy and terms of each external site they visit.`,
  },
  {
    title: "11. Data Retention",
    content: `Braintam retains your account Information for as long as your account remains active on the platform, and for a minimum of three years thereafter, unless you request earlier deletion. We may adjust this period based on legal and operational requirements — for example, extending retention where required by applicable law, or reducing it to manage storage efficiently.

Financial and payment records are retained for a minimum of seven years as required under Indian tax and accounting law. Learning records may be retained in anonymised form for platform improvement research. If you close your account and request deletion, your personal data will be deleted or anonymised within 30 days, subject to any applicable legal retention obligations.`,
  },
  {
    title: "12. Your Rights & Parental Controls",
    content: `You have the following rights regarding your personal data:

• Access — request a copy of all Information Braintam holds about you or your child.
• Correction — request correction of any inaccurate or incomplete data.
• Deletion — request complete deletion of your account and all associated personal data.
• Portability — receive your data in a structured, portable format.
• Withdrawal of Consent — withdraw your consent to data processing at any time (this may affect your ability to continue using platform services).

To exercise any of these rights, email support@braintam.com with the subject "Data Rights Request – [Your Name]". Braintam will respond within 30 days of receiving a valid request. Requests for deletion will be accommodated within a reasonable time and may result in account closure.`,
  },
  {
    title: "13. Email Opt-Out",
    content: `You may withdraw your consent to receive marketing or promotional email communications at any time by emailing support@braintam.com with the subject "Email Opt-Out". Braintam fully reserves the right to withdraw further usage of platform features if such withdrawal of consent prevents essential service delivery. Transactional communications related to active enrolments, payments, and security are not subject to marketing opt-out.`,
  },
  {
    title: "14. Access to & Accuracy of Your Information",
    content: `Braintam provides Users with the means to access and update their personal information through the platform's profile settings. Braintam takes stringent measures to protect your account password from exposure. If you forget your password, Braintam provides a secure password reset mechanism. Braintam will not disclose your password to any third party. If you believe any Information we hold is inaccurate, please contact support@braintam.com to request correction.`,
  },
  {
    title: "15. Changes to This Privacy Policy",
    content: `Braintam may update this Privacy Policy from time to time as our platform and applicable law evolves. We will notify registered Users of material changes via email or platform notification at least 14 days before changes take effect. The "Last Updated" date at the top of this page reflects the most recent revision. Your continued use of the platform following notice of changes shall be deemed acceptance of the updated Policy.`,
  },
  {
    title: "16. Your Consent",
    content: `By registering with and using Braintam, you expressly consent to our collection, processing, storage, disclosure, and handling of your Information as set forth in this Policy, both as currently written and as amended from time to time by Braintam. You understand that processing of Information includes collection, storage, use, disclosure, transfer, and deletion as described herein.`,
  },
  {
    title: "17. Grievance Officer & Contact",
    content: `If you have any concerns, complaints, or queries relating to the processing of your personal Information, or wish to report a privacy issue, please contact our Grievance Officer. Braintam will make all reasonable efforts to address your grievance at the earliest opportunity and no later than one month from the date of receipt of your complaint.

Grievance Officer: Braintam Data & Privacy Team
Company: Braintam Learning
Email: support@braintam.com (Subject: "Privacy Grievance – [Your Name]")

For general support queries, you may also reach us at support@braintam.com.`,
  },
];

export default function PrivacyPage() {
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
      <div className="py-14 px-4 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
        <Lock className="w-12 h-12 mx-auto mb-4 opacity-80" />
        <h1 className="text-4xl font-black mb-3">Privacy Policy</h1>
        <p className="text-blue-200 max-w-2xl mx-auto">
          Braintam Learning values your trust. We handle your child's data with honesty, purpose, and absolute respect for their privacy.
        </p>
        <p className="text-xs text-blue-300 mt-3">Last updated: June 2026</p>
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

        {/* Quick promise */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-8">
          <p className="text-sm font-semibold text-green-800 mb-1">🔒 Our Promise in Plain English</p>
          <p className="text-sm text-green-700 leading-relaxed">
            We use your child's data only to teach them better — never to profit from it, never to share it beyond what is needed to run the platform, and always with your right to access, correct, or delete it at any time.
          </p>
        </div>

        {/* Rights at a glance */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="font-black mb-4" style={{ color: NAVY }}>Your Rights at a Glance</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              "Access your & your child's data",
              "Correct inaccurate information",
              "Request full account & data deletion",
              "Export your data in portable format",
              "Withdraw consent at any time",
              "Know who can access your data",
            ].map(r => (
              <div key={r} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#16A34A" }} /> {r}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            To exercise any right: <a href="mailto:support@braintam.com" className="text-blue-600 underline">support@braintam.com</a> — Subject: "Data Rights Request – [Your Name]"
          </p>
        </div>

        {/* What we collect summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="font-black mb-4" style={{ color: NAVY }}>What We Collect — Summary</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: Users, title: "Registration Data", items: ["Name, grade, school", "Parent email & phone", "Account password (hashed)"] },
              { icon: Eye, title: "Learning Data", items: ["Test scores & results", "Homework submissions", "Class attendance"] },
              { icon: Bell, title: "Technical Data", items: ["Device & browser type", "IP address & session", "Usage behaviour"] },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="rounded-xl p-3" style={{ background: "#F8FAFF", border: "1px solid rgba(11,43,107,0.08)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: ORANGE }} />
                    <span className="text-xs font-bold" style={{ color: NAVY }}>{c.title}</span>
                  </div>
                  {c.items.map(item => (
                    <p key={item} className="text-xs text-gray-500 mt-0.5">· {item}</p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {sections.map(s => (
            <section key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-black text-base mb-3" style={{ color: NAVY }}>{s.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4494 100%)` }}>
          <Mail className="w-8 h-8 mx-auto mb-3 opacity-80" />
          <h3 className="text-xl font-black mb-2">Privacy Questions?</h3>
          <p className="text-blue-200 mb-4">Our data protection team responds within 24 hours for general queries and within 30 days for formal data subject requests.</p>
          <Button asChild className="font-bold px-8" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Privacy%20Query">Email support@braintam.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
