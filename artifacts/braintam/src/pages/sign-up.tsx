import { SignUp } from "@clerk/react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export const SIGNUP_PROFILE_KEY = "braintam_signup_profile";

export const GRADES = Array.from({ length: 10 }, (_, i) => i + 1);

export const BOARDS = [
  "CBSE", "ICSE", "IGCSE", "IB (International Baccalaureate)", "NIOS", "State Board",
];

export const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu", "Delhi",
  "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignUpPageContent() {
  return (
    <div className="w-[440px] max-w-full space-y-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"
        style={{ color: NAVY }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <div className="text-center">
        <img src={braintamLogo} alt="Braintam" className="w-12 h-12 object-contain mx-auto mb-2" />
        <p className="text-xs font-semibold" style={{ color: ORANGE }}>
          India's #1 platform for Grades 1–10
        </p>
      </div>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/onboarding`}
        appearance={{
          variables: { colorPrimary: ORANGE, colorText: NAVY },
          elements: { card: "shadow-xl rounded-2xl" },
        }}
      />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 60%, #0d2260 100%)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
        <div className="relative z-10">
          <img src={braintamLogo} alt="Braintam" className="w-60 h-auto object-contain" />
        </div>
        <div className="space-y-4 relative z-10">
          <h1 className="text-white font-black text-4xl leading-tight">
            Start your journey<br />
            <span style={{ color: ORANGE }}>with Braintam!</span>
          </h1>
          <p className="text-white/70 text-sm">Sign up with Google or email — takes less than a minute.</p>
          {[
            { icon: "📚", title: "Board-aligned content", desc: "CBSE, ICSE, State Board and more" },
            { icon: "🎯", title: "Grade-wise learning paths", desc: "Curated for Grades 1–10" },
            { icon: "🏆", title: "Leaderboard & points", desc: "Compete with students across India" },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)" }}>
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-white font-semibold text-sm">{item.title}</div>
                <div className="text-white/50 text-xs mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-white/30 text-xs relative z-10">© 2025 Braintam Learning. All Rights Reserved.</div>
      </div>

      {/* Right: Clerk form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen lg:min-h-0">
        <SignUpPageContent />
      </div>
    </div>
  );
}
