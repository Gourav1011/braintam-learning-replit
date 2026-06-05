import { SignUp } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: ORANGE,
    colorForeground: NAVY,
    colorMutedForeground: "#6B7280",
    colorDanger: "#EF4444",
    colorBackground: "#FFFFFF",
    colorInput: "#F8FAFC",
    colorInputForeground: NAVY,
    colorNeutral: "#D1D5DB",
    fontFamily: "Poppins, sans-serif",
    borderRadius: "12px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#0B2B6B] font-bold",
    headerSubtitle: "text-[#6B7280]",
    socialButtonsBlockButtonText: "text-[#0B2B6B] font-semibold",
    socialButtonsBlockButton: "border border-[#D1D5DB] hover:bg-gray-50",
    formFieldLabel: "text-[#0B2B6B] font-medium",
    formFieldInput: "border-[#D1D5DB] text-[#0B2B6B]",
    formButtonPrimary: "bg-[#FF6B1A] hover:bg-[#e05a0f] text-white font-bold",
    footerActionLink: "text-[#FF6B1A] font-semibold hover:text-[#e05a0f]",
    footerActionText: "text-[#6B7280]",
    dividerText: "text-[#6B7280]",
    dividerLine: "bg-[#D1D5DB]",
    identityPreviewEditButton: "text-[#FF6B1A]",
    formFieldSuccessText: "text-green-600",
    alertText: "text-[#EF4444]",
    alert: "bg-red-50 border-red-200",
    otpCodeFieldInput: "border-[#D1D5DB] text-[#0B2B6B]",
    logoBox: "mt-1",
    logoImage: "rounded-xl",
    footerAction: "bg-gray-50",
    main: "gap-4",
  },
};

const STATS = [
  { value: "5L+", label: "Students" },
  { value: "50+", label: "Teachers" },
  { value: "4.9★", label: "Rating" },
  { value: "98%", label: "Retention" },
];

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a7a 60%, #0d2260 100%)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: "#3b5fc0" }} />

        <div className="relative z-10">
          <img src={braintamLogo} alt="Braintam" className="w-44 h-auto object-contain" />
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              Start your journey<br />
              <span style={{ color: ORANGE }}>with Braintam!</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Live classes, adaptive tests, animated videos and more — built for Grades 1–10.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="text-white font-black text-lg leading-none">{s.value}</div>
                <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-white/80 text-sm italic leading-relaxed">
              "Braintam transformed the way my daughter studies. Her grades improved by 40% in just 3 months!"
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ background: ORANGE }}>P</div>
              <div>
                <div className="text-white text-xs font-semibold">Priya Nair</div>
                <div className="text-white/50 text-xs">Parent, Chennai</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-white/30 text-xs relative z-10">© 2026 Braintam Learning LLP. All Rights Reserved.</div>
      </div>

      {/* Right — Clerk SignUp */}
      <div className="flex-1 lg:max-w-xl flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <SignUp
            routing="path"
            path={`${basePath}/sign-up`}
            signInUrl={`${basePath}/sign-in`}
            forceRedirectUrl={`${basePath}/onboarding`}
            appearance={clerkAppearance}
          />
        </div>
      </div>
    </div>
  );
}
