import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // check every 2 minutes
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const initialBuildTime = useRef<number | null>(null);

  // ── Poll version.json for new builds ───────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function checkVersion() {
      try {
        const res = await fetch(`${BASE}/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { buildTime: number } = await res.json();
        if (initialBuildTime.current === null) {
          initialBuildTime.current = data.buildTime;
        } else if (data.buildTime !== initialBuildTime.current) {
          setShow(true);
          clearInterval(timer);
        }
      } catch {
        // network unavailable — ignore
      }
    }

    checkVersion();
    timer = setInterval(checkVersion, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // ── Listen for SW update events ────────────────────────────────────────────
  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent).detail === "updateAvailable") {
        setShow(true);
      }
    };
    window.addEventListener("swUpdate", handler);
    return () => window.removeEventListener("swUpdate", handler);
  }, []);

  function handleRefresh() {
    // Tell any waiting SW to take over, then reload
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage("skipWaiting");
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.location.reload();
          }, { once: true });
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2.5 text-white text-sm shadow-lg"
          style={{ background: "#0B2B6B" }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" style={{ animationDuration: "2s" }} />
            <span className="font-medium">New version available — refresh to get the latest updates.</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleRefresh}
              className="h-7 px-3 text-xs font-bold border-0"
              style={{ background: "#FF6B1A" }}
            >
              Refresh now
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
