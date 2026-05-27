import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Smartphone, Globe, Download, CheckCircle,
  ArrowLeft, Star, Zap, Wifi, BookOpen,
  ChevronRight, Shield
} from "lucide-react";
import braintamLogo from "@assets/imresizer-Gemini_Generated_Image_40tk9140tk9140tk-removebg-pre_1779898987915.png";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const EASE: any = [0.22, 1, 0.36, 1];

const FEATURES = [
  { icon: Zap, title: "Live Classes", desc: "Join real-time interactive sessions with top educators" },
  { icon: BookOpen, title: "Offline Access", desc: "Download videos & worksheets for no-internet learning" },
  { icon: Shield, title: "Progress Sync", desc: "Everything auto-saves across all your devices" },
  { icon: Star, title: "Push Notifications", desc: "Never miss a class, deadline, or new assignment" },
  { icon: Wifi, title: "Smart Downloads", desc: "Auto-download on Wi-Fi, save mobile data" },
  { icon: Globe, title: "Same Account", desc: "One login for website, app, and tablet" },
];

export default function DownloadAppPage() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(ios);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleWebInstall = async () => {
    if (installPrompt) {
      await (installPrompt as any).prompt();
    } else {
      if (isIos) {
        alert("To install:\n1. Tap Share (↑) at the bottom\n2. Select \"Add to Home Screen\"");
      } else {
        alert("To install:\n1. Tap the menu (⋮) in your browser\n2. Select \"Add to Home Screen\" or \"Install App\"");
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FF", fontFamily: "Poppins, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(11,43,107,0.06)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" style={{ color: NAVY }} />
          </Link>
          <img src={braintamLogo} alt="Braintam" className="h-8 w-auto" />
          <span className="font-bold text-lg hidden sm:block" style={{ color: NAVY }}>Braintam</span>
          <span className="ml-auto text-sm font-semibold hidden sm:block" style={{ color: NAVY }}>Download the App</span>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-12 pb-8 md:pt-20 md:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center max-w-xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
            style={{ background: "rgba(255,107,26,0.1)", color: ORANGE }}>
            <Star className="w-4 h-4 fill-current" />
            Rated 4.9 by 50,000+ families
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: NAVY }}>
            Learn Anytime, <span style={{ color: ORANGE }}>Anywhere</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: "#64748B" }}>
            Get the full Braintam experience on your phone or tablet. 
            Live classes, homework, tests — all in your pocket.
          </p>
        </motion.div>

        {/* Download Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mt-8">
          {/* Android */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#E8F5E9" }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path d="M3.18 23.76c.3.17.65.19.97.07L15.88 12 12 8.12 3.18 23.76Z" fill="#EA4335"/>
                <path d="M20.7 10.67 17.6 8.9 13.4 12l4.2 4.1 3.1-1.78a1.74 1.74 0 0 0 0-3.06Z" fill="#FBBC04"/>
                <path d="M3.18.24A1.74 1.74 0 0 0 2.5 1.6V22.4c0 .54.26 1.01.68 1.36L15.88 12 3.18.24Z" fill="#4285F4"/>
                <path d="M3.18 23.76 12 12 3.18.24c-.3.17-.65.19-.97.07A1.74 1.74 0 0 0 2.5 1.6V22.4c0 .54.26 1.01.68 1.36Z" fill="#34A853"/>
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: NAVY }}>Android</h3>
            <p className="text-sm mb-5" style={{ color: "#94A3B8" }}>APK & Google Play</p>
            <div className="space-y-2.5">
              <a
                href="https://play.google.com/store/apps/details?id=com.braintam"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                style={{ background: NAVY }}
              >
                <Download className="w-4 h-4" />
                Google Play
              </a>
              <a
                href="https://replit.app/@braintam/braintam-android"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:bg-gray-50"
                style={{ border: "1.5px solid #E2E8F0", color: NAVY }}
              >
                <Smartphone className="w-4 h-4" />
                Direct APK
              </a>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Auto-updates enabled
            </div>
          </motion.div>

          {/* iOS */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#F3E8FF" }}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="#7C3AED">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: NAVY }}>iPhone & iPad</h3>
            <p className="text-sm mb-5" style={{ color: "#94A3B8" }}>App Store</p>
            <a
              href="https://apps.apple.com/app/braintam"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
              style={{ background: NAVY }}
            >
              <Download className="w-4 h-4" />
              App Store
            </a>
            <div className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              iOS 15+ supported
            </div>
          </motion.div>

          {/* Web App */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
            className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow relative overflow-hidden"
          >
            {isStandalone && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold"
                style={{ background: "#DCFCE7", color: "#166534" }}>
                Installed
              </div>
            )}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#FFF4EE" }}>
              <Globe className="w-7 h-7" style={{ color: ORANGE }} />
            </div>
            <h3 className="font-bold text-lg mb-1" style={{ color: NAVY }}>Web App</h3>
            <p className="text-sm mb-5" style={{ color: "#94A3B8" }}>No download needed</p>
            <button
              onClick={handleWebInstall}
              disabled={isStandalone}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: ORANGE }}
            >
              {isStandalone ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Already Installed
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install Web App
                </>
              )}
            </button>
            <div className="mt-4 flex items-center gap-1.5 text-xs" style={{ color: "#94A3B8" }}>
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Works on all browsers
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: NAVY }}>Why use the app?</h2>
            <p className="text-sm" style={{ color: "#94A3B8" }}>Everything from the website, optimized for mobile</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
                viewport={{ once: true }}
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: "#F8FAFC" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FFF4EE" }}>
                  <f.icon className="w-5 h-5" style={{ color: ORANGE }} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-0.5" style={{ color: NAVY }}>{f.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: "#94A3B8" }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How it syncs */}
        <div className="mt-8 bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: NAVY }}>How Auto-Sync Works</h2>
            <p className="text-sm" style={{ color: "#94A3B8" }}>Everything stays in sync across all your devices</p>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
            {[
              { step: "1", text: "Make any change on the website" },
              { step: "2", text: "Data saved to your Braintam account" },
              { step: "3", text: "App picks it up automatically" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
                  style={{ background: i === 1 ? NAVY : ORANGE }}>
                  {item.step}
                </div>
                <span className="text-sm font-medium" style={{ color: NAVY }}>{item.text}</span>
                {i < 2 && <ChevronRight className="w-4 h-4 hidden md:block" style={{ color: "#CBD5E1" }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Back to home */}
      <div className="max-w-6xl mx-auto px-5 pb-12 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: NAVY }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Braintam Home
        </Link>
      </div>
    </div>
  );
}
