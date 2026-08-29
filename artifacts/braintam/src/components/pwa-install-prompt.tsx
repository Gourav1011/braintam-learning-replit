import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { braintamLogo } from "@/lib/brand-assets";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const dismissedAt = localStorage.getItem("pwa_dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa_dismissed", String(Date.now()));
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto"
      >
        <div
          className="rounded-2xl p-4 shadow-2xl border border-white/20"
          style={{ background: "#0B2B6B" }}
        >
          <div className="flex items-start gap-3">
            <img src={braintamLogo} alt="Braintam" className="w-10 h-10 rounded-xl flex-shrink-0 object-contain" style={{ background: "#FF6B1A" }} />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">
                Install Braintam App
              </p>
              <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
                Add to your home screen for instant access to classes, homework & tests.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
              style={{ background: "#FF6B1A" }}
            >
              <Download className="w-4 h-4" />
              Install Now
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-xl font-medium text-sm text-white/70 hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
