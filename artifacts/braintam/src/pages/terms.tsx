import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: January 2025</p>

        <section>
          <h2 className="text-xl font-bold mt-6">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">By using Braintam, you agree to these Terms of Service. These terms govern your use of our educational platform, including all content, features, and services available on the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">2. Use of Service</h2>
          <p className="text-muted-foreground leading-relaxed">Braintam is designed for students in grades 1–10. You agree to use the platform only for lawful educational purposes. You must not misuse the platform, attempt to gain unauthorized access, or use it in any way that could harm other users.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">3. Account Registration</h2>
          <p className="text-muted-foreground leading-relaxed">When creating an account, you agree to provide accurate information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">4. Content</h2>
          <p className="text-muted-foreground leading-relaxed">All educational content provided on Braintam is for personal, non-commercial use only. You may not reproduce, distribute, or commercially exploit any content without our explicit written permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">5. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">Braintam is provided "as is". We make no warranties regarding the accuracy or reliability of content. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">6. Changes to Terms</h2>
          <p className="text-muted-foreground leading-relaxed">We may update these terms at any time. Continued use of the platform after changes constitutes your acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mt-6">7. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">For questions about these Terms, please contact us at support@braintam.in</p>
        </section>
      </div>
    </div>
  );
}
