import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft, FileText, Mail, Shield, AlertCircle, Scale } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const sections = [
  {
    title: "1. Acceptance of Terms & Modification",
    content: `By accessing or using the Braintam platform (www.braintam.com), the Braintam mobile application, or any associated services operated by Braintam Learning ("Braintam", "we", "us", "our"), you ("User", "you") acknowledge that you have read, understood, and agree to be bound by this Platform User Agreement ("Agreement"), as well as our Privacy Policy and all applicable policies incorporated herein by reference.

If you are enrolling a child or minor, you confirm that you are the student's parent or legal guardian and accept this Agreement on their behalf. If you do not agree with any part of this Agreement, please discontinue access to the platform immediately.

Braintam reserves the right to modify the terms, conditions, and notices of this Agreement at its discretion. We will notify registered Users of material changes via push notification or email. Continued use of the platform after such notification constitutes acceptance of the revised Agreement.

Users may request access to this Agreement or any platform policy in any language listed under Schedule 8 of the Indian Constitution by writing to us at support@braintam.com.`,
  },
  {
    title: "2. Description of Platform & Services",
    content: `Braintam Learning operates an online educational platform designed for school students in Grades 1–10, offering live classes, recorded video lessons, homework, assignments, chapter tests, animated explainer videos, leaderboard-based gamification, and supporting study materials. Our curriculum aligns with CBSE, ICSE, and IB frameworks.

The Platform is intended for access by Indian residents. Although the Platform may be technically accessible from other regions, content, pricing, and services are designed for users in India. Use from outside India is at the User's own risk and is subject to any applicable local laws in that jurisdiction. Braintam makes no representation that its content is appropriate or lawful for access in locations outside India.`,
  },
  {
    title: "3. Eligibility & Account Registration",
    content: `Our services are designed for students aged 5–16 (Grades 1–10). To create an account, you must provide accurate, complete, and current information including the student's name, grade, parent/guardian name, a valid email address, and a contact number.

You are solely responsible for maintaining the confidentiality of your account login credentials and for all activities that occur under your account. You agree to notify Braintam immediately at support@braintam.com if you suspect any unauthorised use of or access to your account.

Braintam reserves the right to suspend or terminate any account where incorrect or misleading information has been provided, or where the User has violated this Agreement.`,
  },
  {
    title: "4. Use of the Platform",
    content: `The Platform and all content on it are provided solely for personal, non-commercial educational use. As a condition of access, you agree not to:

(a) Use the Platform for any purpose that is unlawful or illegal under any law in force within or outside India;
(b) Reverse engineer, modify, copy, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell any information, software, products, or intellectual property obtained from the Platform;
(c) Reproduce or copy content for commercial or non-commercial purposes without prior written consent;
(d) Attempt to gain unauthorised access to any part of the Platform, its servers, or networks;
(e) Share login credentials with any third party, or allow others to access your account;
(f) Record, screenshot, or capture live sessions without written permission from Braintam;
(g) Upload, post, or share any content that is harmful, abusive, obscene, pornographic, paedophilic, invasive of another's privacy, or discriminatory on the basis of gender, religion, caste, race, or ethnicity;
(h) Upload content belonging to another person without having the right to do so;
(i) Upload content that infringes any patent, trademark, copyright, or other proprietary rights;
(j) Upload or transmit software viruses or any code designed to interrupt, destroy, or limit platform functionality;
(k) Impersonate any person, entity, or misrepresent your affiliation with any person;
(l) Interfere with the experience of other Users or disrupt the Platform's normal operation.

Braintam reserves the right to act against any User who violates this section, including content removal, account suspension, or legal action.`,
  },
  {
    title: "5. Course Enrolment & Access",
    content: `Upon successful payment, you will receive access to your enrolled course(s) as specified at the time of purchase. Course access is personal, non-transferable, and may not be shared with third parties. Live session recordings are made available for a defined period post-completion as communicated at the time of enrolment.

Braintam reserves the right to modify course schedules, content, topics, or assigned educators with reasonable advance notice where operationally feasible. Such changes do not constitute grounds for a refund unless the modification is material and Braintam is unable to provide a comparable alternative.`,
  },
  {
    title: "6. Fees & Payment",
    content: `All fees are displayed in Indian Rupees (INR) and are inclusive of applicable GST unless expressly stated otherwise. Payment must be completed in full prior to course commencement. Braintam accepts UPI, net banking, credit/debit cards, and approved EMI options through authorised third-party payment gateways.

Braintam does not store your payment card or banking details. All payment data is handled exclusively by PCI-DSS compliant payment processors. Braintam shall not be held liable for any unauthorised transactions arising from misuse of payment credentials outside the Braintam platform.`,
  },
  {
    title: "7. Refund Policy",
    content: `Our Fair Refund Policy governs all refund requests. In summary: full refunds are available before the course starts or before Day 3 of the 6-Day Smart Learning Course; no refunds are available after Day 2 is completed, except in documented medical emergencies or platform failures directly attributable to Braintam. For complete details, please review our Refund Policy page. To initiate a refund request, email support@braintam.com with your order details.`,
  },
  {
    title: "8. Intellectual Property & Ownership",
    content: `All content on the Braintam platform — including but not limited to course videos, animated lessons, worksheets, test questions, written materials, logos, user interface designs, software, and source code — is the exclusive intellectual property of Braintam Learning or its duly licensed content partners, and is protected by applicable Indian copyright law and international intellectual property law.

You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use course content solely for personal, non-commercial educational purposes during your active subscription or enrolment period. You do not acquire any ownership rights by using the platform.

Any third-party content published on the Platform with the consent of the rights holder will carry appropriate attribution. Braintam reserves the right to remove such content if a valid dispute is raised by the original rights holder. Unauthorised submission, reproduction, or distribution of copyrighted content is illegal and may result in personal civil or criminal liability.`,
  },
  {
    title: "9. Disclaimer of Warranties",
    content: `Braintam has endeavoured to ensure that all information and content on the Platform is accurate and of high quality. However, Braintam makes no warranty — express or implied — regarding the accuracy, completeness, fitness for purpose, or uninterrupted availability of the Platform or its content.

Braintam shall not be held responsible for temporary unavailability of the Platform due to maintenance, technical failure, force majeure, or any other reason. Any material downloaded or obtained through the Platform is done entirely at the User's discretion and risk. Braintam is not liable for any damage to the User's device or system arising from such downloads.

Braintam does not guarantee specific academic outcomes for any student. Educational results depend on individual effort, consistency, and other factors beyond Braintam's control.`,
  },
  {
    title: "10. Links to Third-Party Sites",
    content: `The Braintam Platform may contain links to external websites or embedded features from third-party services ("Linked Sites"). Linked Sites are not under Braintam's control, and Braintam is not responsible for their content, privacy practices, accuracy, or availability. Braintam does not endorse any Linked Site and encourages Users to review the terms and privacy policies of each third-party site they visit.

Upon registration, you consent to receiving calls and messages through authorised third-party service providers for service-related communications and updates about Braintam offerings.`,
  },
  {
    title: "11. Student Protection & Safety",
    content: `Braintam is committed to maintaining a safe, respectful, and supportive environment for all students. All educators on the platform are background-verified and trained in child-safe communication practices. Live sessions are moderated.

Inappropriate conduct by any User — whether a student, parent, or educator — will result in immediate account suspension pending review. Braintam reserves the right to permanently terminate access to accounts that are found to have engaged in abusive, inappropriate, or illegal behaviour. For complete details, please review our Student Protection Policy.`,
  },
  {
    title: "12. Contact Us & Grievance Redressal",
    content: `Braintam provides contact and support features within the Platform. By submitting a query or contact request, you permit Braintam to respond to you on your registered contact details for the purpose of resolving your query or informing you about platform services.

Braintam will acknowledge User queries and complaints within 24 hours and endeavour to resolve grievances within 15 days of receipt. Complaints relating to content removal under Section 4 of this Agreement will be addressed within 72 hours.

Grievance Officer: Braintam Support Team
Braintam Learning
Email: support@braintam.com
Grievance Contact: support@braintam.com (Subject: "Grievance – [Your Issue]")`,
  },
  {
    title: "13. Breach & Account Suspension",
    content: `Without prejudice to any other remedies available under this Agreement or applicable law, Braintam may — at its sole discretion and without prior notice where warranted — warn Users, limit platform activity, temporarily or permanently suspend access, and/or refuse future access if a User is found to be in breach of this Agreement. Braintam reserves the right to initiate appropriate legal proceedings for any breach that causes or risks causing harm to the platform, its users, or to Braintam Learning.`,
  },
  {
    title: "14. Privacy & Data Protection",
    content: `Your privacy and your child's privacy are of the utmost importance to Braintam. Our Privacy Policy governs how we collect, use, store, and protect personal data. By using the Braintam platform, you consent to the data practices described in our Privacy Policy, which is incorporated into this Agreement by reference. Please review our Privacy Policy at braintam.com/privacy.`,
  },
  {
    title: "15. Limitation of Liability & Indemnification",
    content: `To the maximum extent permitted by applicable Indian law, Braintam and its affiliates, officers, employees, agents, and service providers shall not be liable for any indirect, incidental, special, consequential, or exemplary damages — including but not limited to loss of profits, data, goodwill, or other intangible losses — arising from your use of or inability to use the Platform.

Braintam's total liability for any direct claim arising from your use of the Platform is limited to the fees paid by you for the relevant course in the three months preceding the claim.

You agree to indemnify, defend, and hold harmless Braintam Learning, its affiliates, directors, officers, employees, and authorised service providers from any losses, liabilities, claims, damages, costs, and legal fees arising from: (a) your use of the Platform in violation of this Agreement; (b) your violation of any applicable law; (c) your infringement of any third-party intellectual property or other rights.`,
  },
  {
    title: "16. Severability",
    content: `If any provision of this Agreement is held to be invalid, illegal, or unenforceable under applicable law, such invalidity shall attach only to that specific provision. All remaining provisions shall continue in full force and effect.`,
  },
  {
    title: "17. Force Majeure",
    content: `Braintam shall not be held liable for any failure or delay in performing its obligations under this Agreement where such failure or delay results from circumstances beyond Braintam's reasonable control, including but not limited to natural disasters, government actions, internet or telecommunications failures, power outages, acts of war or terrorism, or pandemic-related disruptions. Braintam's obligations shall be suspended for the duration of the Force Majeure event.`,
  },
  {
    title: "18. Governing Law & Dispute Resolution",
    content: `This Agreement shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles. In the event of any dispute arising from or relating to this Agreement or your use of the Platform, Braintam encourages you to contact us first at support@braintam.com — we resolve the vast majority of disputes amicably and promptly. If formal proceedings become necessary, such disputes shall be subject to the exclusive jurisdiction of the competent courts in Delhi, India.`,
  },
  {
    title: "19. Contact",
    content: `For questions, concerns, or requests relating to these Terms & Conditions, please contact:

Braintam Learning
Email: support@braintam.com
Subject: "Terms Query – [Your Name]"

We respond to all queries within 24 hours, Monday to Saturday.`,
  },
];

export default function TermsPage() {
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
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-80" />
        <h1 className="text-4xl font-black mb-3">Terms & Conditions</h1>
        <p className="text-blue-200 max-w-2xl mx-auto">
          This Platform User Agreement governs your access to and use of the Braintam platform and all associated services operated by Braintam Learning.
        </p>
        <p className="text-xs text-blue-300 mt-3">Last updated: June 2026 · Effective immediately</p>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl">

        {/* Intro box */}
        <div className="rounded-2xl p-5 mb-8 border" style={{ background: "rgba(11,43,107,0.04)", borderColor: "rgba(11,43,107,0.12)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: NAVY }}>📋 About This Agreement</p>
          <p className="text-sm text-gray-600 leading-relaxed">
            This Agreement is between you (or you as parent/guardian of a student) and <strong>Braintam Learning</strong>, the company operating the Braintam platform at www.braintam.com. By using the platform you confirm you have read and accepted all terms below. Questions? Email{" "}
            <a href="mailto:support@braintam.com" className="font-bold underline" style={{ color: ORANGE }}>support@braintam.com</a>.
          </p>
        </div>

        {/* Quick highlights */}
        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Shield, label: "Child-safe platform", sub: "All educators verified" },
            { icon: AlertCircle, label: "Fair refund policy", sub: "Before Day 3 of course" },
            { icon: Scale, label: "Indian law governed", sub: "Courts in Delhi, India" },
          ].map(b => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: ORANGE }} />
                <p className="text-xs font-bold" style={{ color: NAVY }}>{b.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.sub}</p>
              </div>
            );
          })}
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
          <h3 className="text-xl font-black mb-2">Questions About These Terms?</h3>
          <p className="text-blue-200 mb-4">Our team responds to every legal or policy query within 24 hours, Monday to Saturday.</p>
          <Button asChild className="font-bold px-8" style={{ background: ORANGE }}>
            <a href="mailto:support@braintam.com?subject=Terms%20Query">Email support@braintam.com</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
