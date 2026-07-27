import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, GraduationCap, MessageCircle, Sparkles, X } from "lucide-react";
import { STUDENT_TOKEN_KEY, useAuth } from "./auth-provider";
import { API_BASE } from "@/lib/api-base";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

const IGNITE_DELAY_MS = 15_000;
const OPPORTUNITY_DELAY_MS = 5 * 60_000;

const IGNITE_SESSION_KEY = "braintam_join_ignite_popup_seen";
const OPPORTUNITY_SESSION_KEY = "braintam_mastery_opportunity_popup_seen";

interface DemoPaywallProps {
  children: ReactNode;
}

export function DemoPaywall({ children }: DemoPaywallProps) {
  const { student } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [showMentor, setShowMentor] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [enrollStatus, setEnrollStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  const state = student?.studentPortalState;

  const isJoinIgnite = state === "none";
  const isOpportunity =
    state === "ignite_day2_plus" || state === "completed_ignite";

  useEffect(() => {
    setShowModal(false);
    setShowMentor(false);

    if (!state || state === "mastery" || state === "ignite_before_day2") {
      return;
    }

    const sessionKey = isJoinIgnite
      ? IGNITE_SESSION_KEY
      : isOpportunity
        ? OPPORTUNITY_SESSION_KEY
        : null;

    if (!sessionKey || sessionStorage.getItem(sessionKey) === "1") {
      return;
    }

    const delay = isJoinIgnite ? IGNITE_DELAY_MS : OPPORTUNITY_DELAY_MS;

    const timer = window.setTimeout(() => {
      // Eligibility came from the latest authenticated profile state.
      // Never show any sales popup if this render has become Mastery.
      if (student?.studentPortalState === "mastery") return;

      sessionStorage.setItem(sessionKey, "1");
      setShowModal(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [state, isJoinIgnite, isOpportunity, student?.studentPortalState]);

  const close = () => {
    setShowModal(false);
    setShowMentor(false);
  };

  const requestScholarshipPrice = async () => {
    if (requestStatus === "loading" || requestStatus === "sent") return;

    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    if (!token) {
      setRequestStatus("error");
      return;
    }

    setRequestStatus("loading");

    try {
      const response = await fetch(`${API_BASE}/api/student/request-mastery-opportunity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setRequestStatus(response.ok ? "sent" : "error");
    } catch {
      setRequestStatus("error");
    }
  };
  const requestEnrollment = async () => {
    if (enrollStatus === "loading" || enrollStatus === "sent") return;

    const token = localStorage.getItem(STUDENT_TOKEN_KEY);
    if (!token) {
      setEnrollStatus("error");
      return;
    }

    setEnrollStatus("loading");

    try {
      const response = await fetch(`${API_BASE}/api/student/request-mastery-opportunity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestType: "enroll" }),
      });

      setEnrollStatus(response.ok ? "sent" : "error");
    } catch {
      setEnrollStatus("error");
    }
  };



  return (
    <>
      {children}

      <AnimatePresence>
        {showModal && (isJoinIgnite || isOpportunity) && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{
              background: "rgba(11,43,107,0.55)",
              backdropFilter: "blur(2px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={close}
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div
                className="flex flex-col items-center px-6 pb-6 pt-8 text-center"
                style={{
                  background: `linear-gradient(135deg, ${NAVY} 0%, #1a4298 100%)`,
                }}
              >
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: `${ORANGE}22` }}
                >
                  <GraduationCap className="h-8 w-8" style={{ color: ORANGE }} />
                </div>

                <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-200">
                  <Sparkles className="h-4 w-4" />
                  Your next step
                </div>

                <h2 className="text-xl font-extrabold text-white">
                  {isJoinIgnite
                    ? "Join Ignite Booster"
                    : "Unlock Your Mastery Opportunity"}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-white/75">
                  {isJoinIgnite
                    ? "Start your Ignite learning journey with Braintam."
                    : "You may be eligible for a special Mastery enrollment opportunity."}
                </p>
              </div>

              <div className="flex flex-col gap-3 px-6 py-5">
                {isJoinIgnite ? (
                  <Link href="/enroll" onClick={close}>
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
                      style={{ background: ORANGE }}
                    >
                      Join Ignite Booster
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={requestScholarshipPrice}
                      disabled={requestStatus === "loading" || requestStatus === "sent"}
                      className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
                      style={{ background: ORANGE }}
                    >
                      {requestStatus === "loading"
                        ? "Sending Request..."
                        : requestStatus === "sent"
                          ? "Request Sent"
                          : "Check My Scholarship Price"}
                    </button>

                    {requestStatus === "sent" && (
                      <p className="text-center text-xs text-gray-600">
                        Your assigned Ignite mentor has received your request.
                      </p>
                    )}

                    {requestStatus === "error" && (
                      <p className="text-center text-xs text-gray-600">
                        Unable to send the request. Contact your mentor or Support.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowMentor((v) => !v)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold"
                      style={{ borderColor: NAVY, color: NAVY }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Contact My Mentor
                    </button>

                    {showMentor && (
                      <div className="rounded-xl bg-gray-50 px-4 py-3 text-center text-sm">
                        {student?.igniteMentor ? (
                          <>
                            <p className="font-bold" style={{ color: NAVY }}>
                              {student.igniteMentor.name || "Your Ignite Mentor"}
                            </p>
                            {student.igniteMentor.phone ? (
                              <p className="mt-1 text-gray-700">
                                {student.igniteMentor.phone}
                              </p>
                            ) : (
                              <p className="mt-1 text-gray-600">
                                Contact number is not available yet.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-600">
                            Mentor not assigned yet. Contact Support.
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={requestEnrollment}
                      disabled={enrollStatus === "loading" || enrollStatus === "sent"}
                      className="w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60"
                      style={{ background: NAVY }}
                    >
                      {enrollStatus === "loading"
                        ? "Sending Request..."
                        : enrollStatus === "sent"
                          ? "Enrollment Request Sent"
                          : "Enroll Now"}
                    </button>

                    {enrollStatus === "sent" && (
                      <p className="text-center text-xs text-gray-600">
                        Your mentor has received your enrollment request and can send your payment link.
                      </p>
                    )}

                    {enrollStatus === "error" && (
                      <p className="text-center text-xs text-gray-600">
                        Unable to send the request. Contact your mentor or Support.
                      </p>
                    )}

                    <p className="text-center text-xs font-semibold text-gray-500">
                      Limited seats available
                    </p>
                  </>
                )}

                <button
                  type="button"
                  onClick={close}
                  className="text-xs font-semibold text-gray-500"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
