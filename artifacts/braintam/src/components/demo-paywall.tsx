import { ReactNode } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "./auth-provider";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

interface DemoPaywallProps {
  children: ReactNode;
}

export function DemoPaywall({ children }: DemoPaywallProps) {
  const { student } = useAuth();

  if (!student?.isDemoStudent) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh]">
      <div
        className="pointer-events-none select-none"
        style={{ filter: "blur(5px)", opacity: 0.45 }}
        aria-hidden="true"
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: "white", border: `2px solid ${ORANGE}22` }}
        >
          <div
            className="px-6 pt-7 pb-5 flex flex-col items-center text-center"
            style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a4298 100%)` }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              style={{ background: `${ORANGE}22`, border: `2px solid ${ORANGE}55` }}
            >
              <Lock className="w-8 h-8" style={{ color: ORANGE }} />
            </div>
            <h2 className="text-white text-xl font-extrabold leading-tight mb-1">
              You're on a Free Demo
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              You can see what Braintam offers — enroll in a long-term course to unlock everything!
            </p>
          </div>

          <div className="px-6 py-5 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "📚", label: "Live Classes" },
                { icon: "✅", label: "Homework & Tests" },
                { icon: "🎥", label: "Recorded Lessons" },
                { icon: "🏆", label: "Leaderboard" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-gray-600"
                  style={{ background: "#F8FAFC", border: "1px solid #E5E7EB" }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  <Lock className="w-3 h-3 ml-auto text-gray-300" />
                </div>
              ))}
            </div>

            <Link href="/demo-batches">
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#EFF6FF", color: NAVY, border: `1px solid #BFDBFE` }}
              >
                <Sparkles className="w-4 h-4" style={{ color: NAVY }} />
                View My Demo Sessions
              </button>
            </Link>

            <Link href="/enroll">
              <button
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-md transition-all hover:opacity-90 hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #e55b10 100%)`, color: "white" }}
              >
                Enroll Now — Unlock All Features
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
