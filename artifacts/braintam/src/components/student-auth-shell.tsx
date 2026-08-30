import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, GraduationCap, Star, Trophy } from "lucide-react";
import { Link } from "wouter";
import { braintamLogo } from "@/lib/brand-assets";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const benefits = [
  { icon: BookOpen, title: "Live Classes", description: "Learn live with expert teachers" },
  { icon: Star, title: "Animated Lessons", description: "Understand concepts visually" },
  { icon: GraduationCap, title: "Tests & Practice", description: "Build confidence every week" },
  { icon: Trophy, title: "Rewards", description: "Earn points, badges, and ranks" },
];

interface StudentAuthShellProps {
  eyebrow: string;
  title: string;
  highlightedTitle: string;
  description: string;
  children: ReactNode;
}

export function StudentAuthShell({
  eyebrow,
  title,
  highlightedTitle,
  description,
  children,
}: StudentAuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: "Poppins, sans-serif" }}>
      <aside
        className="hidden lg:flex lg:w-5/12 flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, #0B1E4B 0%, ${NAVY} 52%, #1a1060 100%)` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(255,107,26,0.17) 0%, transparent 48%), radial-gradient(circle at 82% 82%, rgba(124,58,237,0.12) 0%, transparent 52%)",
          }}
        />

        <Link href="/" className="relative z-10 w-fit">
          <img src={braintamLogo} alt="Braintam" className="h-16 w-auto object-contain" />
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] mb-3" style={{ color: "#FDBA74" }}>
              {eyebrow}
            </p>
            <h2 className="text-4xl font-black text-white leading-tight">
              {title}
              <br />
              <span style={{ color: ORANGE }}>{highlightedTitle}</span>
            </h2>
            <p className="text-white/70 text-sm leading-relaxed mt-4 max-w-md">{description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {benefits.map(({ icon: Icon, title: benefitTitle, description: benefitDescription }) => (
              <div
                key={benefitTitle}
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Icon className="w-5 h-5 mb-2" style={{ color: ORANGE }} />
                <p className="text-white text-sm font-bold">{benefitTitle}</p>
                <p className="text-white/50 text-xs mt-1">{benefitDescription}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/30 text-xs">
          © 2026 Braintam Learning. All Rights Reserved.
        </p>
      </aside>

      <main className="flex-1 min-h-screen flex items-center justify-center px-5 py-12 sm:px-8 bg-[#F8FAFC] relative">
        <Link
          href="/"
          className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden block w-fit mx-auto mb-7">
            <img src={braintamLogo} alt="Braintam" className="h-16 w-auto object-contain" />
          </Link>
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-7 sm:p-9">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}