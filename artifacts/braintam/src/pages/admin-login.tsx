import { SignIn } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Link } from "wouter";
import { ArrowLeft, Shield, Users, BarChart3, Bell, BookOpen } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const RED = "#DC2626";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const perks = [
  { icon: BarChart3, title: "Platform Analytics",   desc: "Real-time stats on users, enrollments and submissions" },
  { icon: Users,     title: "User Management",      desc: "Create, promote and manage teachers and students" },
  { icon: BookOpen,  title: "Assign & Enroll",      desc: "Assign teachers to courses and enroll students" },
  { icon: Bell,      title: "Announcements",        desc: "Push notices and banners to the entire platform" },
];

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, #0B1E4B 0%, ${NAVY} 50%, #1a1060 100%)` }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: RED }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: ORANGE }} />

        <div className="relative z-10">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer w-fit">
              <img src={braintamLogo} alt="Braintam" className="w-44 h-auto object-contain" />
            </div>
          </Link>
        </div>

        <div className="space-y-8 relative z-10">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.35)", color: "#FCA5A5" }}
            >
              <Shield className="w-3.5 h-3.5" /> Admin Panel
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              Control Centre<br />
              <span style={{ color: "#FCA5A5" }}>for Braintam</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Full platform control — users, teachers, content, announcements and deep analytics, all from one place.
            </p>
          </div>

          <div className="space-y-3">
            {perks.map(p => (
              <div
                key={p.title}
                className="flex items-start gap-3 rounded-xl p-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(220,38,38,0.20)" }}>
                  <p.icon className="w-4 h-4" style={{ color: "#FCA5A5" }} />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{p.title}</div>
                  <div className="text-white/50 text-xs mt-0.5">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.20)" }}
          >
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FCA5A5" }} />
            <p className="text-white/60 text-xs leading-relaxed">
              This portal is restricted to authorised administrators only. Unauthorised access attempts are logged and reported.
            </p>
          </div>
        </div>

        <div className="text-white/25 text-xs relative z-10">© 2025 Braintam Learning. All Rights Reserved.</div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-gray-50 min-h-screen lg:min-h-0 relative">
        <Link href="/">
          <div
            className="absolute top-5 left-5 flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity cursor-pointer"
            style={{ color: NAVY }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </div>
        </Link>

        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <img src={braintamLogo} alt="Braintam" className="w-10 h-10 object-contain" />
          <span className="font-black text-xl" style={{ color: NAVY }}>Braintam</span>
        </div>

        <div
          className="w-full max-w-[440px] mb-5 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
          style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: RED }}
        >
          <Shield className="w-4 h-4 flex-shrink-0" />
          Admin Portal — authorised personnel only
        </div>

        <SignIn
          routing="path"
          path={`${basePath}/admin/login`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/admin`}
          appearance={{
            theme: shadcn,
            cssLayerName: "clerk",
            variables: {
              colorPrimary: RED,
              colorForeground: NAVY,
              colorBackground: "#FFFFFF",
              colorInput: "#F8FAFC",
              fontFamily: "Poppins, sans-serif",
              borderRadius: "12px",
            },
            elements: {
              rootBox: "w-full flex justify-center",
              cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
              card: "!shadow-none !border-0 !bg-transparent !rounded-none",
              footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
              formButtonPrimary: "bg-red-600 hover:bg-red-700 text-white font-bold",
              footerActionLink: "text-red-600 font-semibold",
            },
          }}
        />

        <p className="text-xs text-center mt-5 text-gray-400">
          Teacher?{" "}
          <Link href="/teacher/login">
            <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>
              Teacher login →
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}
