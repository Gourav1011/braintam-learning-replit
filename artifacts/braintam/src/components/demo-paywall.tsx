import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles, ArrowRight, X } from "lucide-react";
import { useAuth } from "./auth-provider";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const POPUP_DELAY_MS = 15_000;

interface DemoPaywallProps {
  children: ReactNode;
}

export function DemoPaywall({ children }: DemoPaywallProps) {
  const { student } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const isDemoStudent = !!student?.isDemoStudent;

  useEffect(() => {
    if (!isDemoStudent) { setShowModal(false); return; }
    const t = setTimeout(() => setShowModal(true), POPUP_DELAY_MS);
    return () => clearTimeout(t);
  }, [isDemoStudent]);

  // Students always see the real content — the unlock prompt is a dismissible
  // popup, not a blocking overlay, so it never hides courses/classes/etc.
  return (
    <>
      {children}
      <AnimatePresence>
        {isDemoStudent && showModal && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ background: "rgba(11,43,107,0.55)", backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: "white", border: `2px solid ${ORANGE}22` }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

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
                    </div>
                  ))}
                </div>

                <Link href="/demo-batches" onClick={() => setShowModal(false)}>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: "#EFF6FF", color: NAVY, border: `1px solid #BFDBFE` }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: NAVY }} />
                    View My Demo Sessions
                  </button>
                </Link>

                <Link href="/enroll" onClick={() => setShowModal(false)}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
