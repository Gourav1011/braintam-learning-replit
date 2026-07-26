import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");

  const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
  const validPhone = /^[6-9]\d{9}$/.test(cleanPhone);

  const subject = encodeURIComponent("Student Password Reset Request");
  const body = encodeURIComponent(
    `Hello Braintam Support,\n\nI need help resetting my student account password.\n\nRegistered phone number: ${cleanPhone}\n\nThank you.`
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: "#F8FAFC", fontFamily: "Poppins, sans-serif" }}
    >
      <div className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl p-7 sm:p-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm mb-7 hover:opacity-70"
          style={{ color: NAVY }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: "#FFF3EB" }}
        >
          <KeyRound className="w-6 h-6" style={{ color: ORANGE }} />
        </div>

        <h1 className="text-2xl font-black mb-2" style={{ color: NAVY }}>
          Forgot your password?
        </h1>

        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Enter your registered phone number. For account security, password
          recovery currently requires verification by the Braintam support team.
        </p>

        <label
          className="block text-sm font-semibold mb-1.5"
          style={{ color: NAVY }}
        >
          Registered phone number
        </label>

        <input
          type="tel"
          inputMode="numeric"
          value={cleanPhone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter your 10-digit phone number"
          maxLength={10}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 mb-4"
          style={{ background: "#F8FAFC", color: NAVY }}
        />

        <a
          href={
            validPhone
              ? `mailto:support@braintam.com?subject=${subject}&body=${body}`
              : undefined
          }
          aria-disabled={!validPhone}
          className={`w-full rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 transition-opacity ${
            validPhone
              ? "text-white hover:opacity-90"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          style={validPhone ? { background: ORANGE } : undefined}
          onClick={(e) => {
            if (!validPhone) e.preventDefault();
          }}
        >
          <Mail className="w-4 h-4" />
          Contact support
        </a>

        <p className="text-xs text-gray-400 text-center mt-5">
          Self-service OTP password recovery will be available after account
          verification is enabled.
        </p>
      </div>
    </div>
  );
}
