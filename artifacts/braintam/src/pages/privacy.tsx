import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <img src={braintamLogo} alt="Braintam" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg text-primary">Braintam</span>
          <Button variant="ghost" size="sm" asChild className="ml-auto">
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
          </Button>
        </div>
      </nav>
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-6 prose prose-sm">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: January 2025</p>

        <section>
          <h2 className="text-xl font-bold mt-6">1. Information We Collect</h2>
          <p className="text-muted-foreground leading-relaxed">We collect information you provide during registration (name, email, phone, grade) and information about your use of the platform (test scores, course progress, homework submissions). We may also collect device and usage information to improve our service.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">2. How We Use Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">We use your information to provide and personalize the educational experience, track your learning progress, send you relevant notifications about upcoming classes and tests, and improve our platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">3. Data Sharing</h2>
          <p className="text-muted-foreground leading-relaxed">We do not sell your personal data. We may share anonymized, aggregated data for research purposes. We work with trusted third-party service providers who are bound by confidentiality agreements.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">4. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">Braintam is designed for school students. We take children's privacy very seriously. We comply with the Information Technology Act, 2000 and its amendments regarding protection of personal information of minors. Parental consent is encouraged for children under 13.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">5. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">We implement industry-standard security measures including encryption and secure servers to protect your data. However, no method of internet transmission is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">6. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at privacy@braintam.in.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">7. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">We use cookies and local storage to maintain your session and preferences. You can disable cookies in your browser settings, though this may affect platform functionality.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">8. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">For privacy-related queries: privacy@braintam.in | Braintam Learning Pvt. Ltd., New Delhi, India</p>
        </section>
      </div>
    </div>
  );
}
