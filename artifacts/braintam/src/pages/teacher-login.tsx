import { SignIn } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, Users, Video, ClipboardList } from "lucide-react";
import braintamLogo from "@assets/transparent_braintam_logo_1779010882793.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const TEAL = "#0891B2";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const perks = [
  { icon: Video,        title: "Manage Live Classes",   desc: "Schedule, start and monitor your live sessions" },
  { icon: BookOpen,     title: "Course Management",     desc: "Create and update lessons across your courses" },
  { icon: ClipboardList,title: "Grade Submissions",      desc: "Review and grade homework and assignments" },
  { icon: Users,        title: "Track Attendance",      desc: "Mark and view attendance for every class" },
];

export default function TeacherLoginPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between flex-1 p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #0d3580 55%, #0a2660 100%)` }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: TEAL }} />
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
              style={{ background: `${TEAL}25`, border: `1px solid ${TEAL}50`, color: "#67E8F9" }}
            >
              <BookOpen className="w-3.5 h-3.5" /> Teacher Portal
            </div>
            <h1 className="text-white font-black text-4xl leading-tight mb-3">
              Welcome back,<br />
              <span style={{ color: "#67E8F9" }}>Educator!</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-sm">
              Your complete teaching hub — classes, grading, attendance and student progress all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {perks.map(p => (
              <div
                key={p.title}
                className="flex items-start gap-3 rounded-xl p-3.5"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${TEAL}30` }}>
                  <p.icon className="w-4 h-4" style={{ color: "#67E8F9" }} />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{p.title}</div>
                  <div className="text-white/50 text-xs mt-0.5">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <p className="text-white/70 text-sm italic">
              "Braintam's teacher portal makes managing 200+ students feel effortless. Everything I need is right here."
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ background: TEAL }}>P</div>
              <div>
                <div className="text-white text-xs font-semibold">Poonam</div>
                <div className="text-white/40 text-xs">Co-Founder & COO, Braintam</div>
              </div>
            </div>
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
          style={{ background: `${TEAL}12`, border: `1px solid ${TEAL}35`, color: TEAL }}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          Teacher Portal — sign in to manage your classes
        </div>

        <SignIn
          routing="path"
          path={`${basePath}/teacher/login`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/teacher`}
          appearance={{
            theme: shadcn,
            cssLayerName: "clerk",
            variables: {
              colorPrimary: TEAL,
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
              formButtonPrimary: `bg-[${TEAL}] hover:opacity-90 text-white font-bold`,
              footerActionLink: `text-[${TEAL}] font-semibold`,
            },
          }}
        />

        <p className="text-xs text-center mt-5 text-gray-400">
          Admin?{" "}
          <Link href="/admin/login">
            <span className="font-semibold cursor-pointer hover:opacity-70 transition-opacity" style={{ color: NAVY }}>
              Admin login →
            </span>
          </Link>
        </p>
      </div>
    </div>
  );
}
