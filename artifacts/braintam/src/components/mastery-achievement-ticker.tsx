import { useState, useEffect, useRef, useCallback } from "react";
import { Trophy } from "lucide-react";
import { API_BASE as BASE } from "@/lib/api-base";

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

interface AchievementTicker {
  id: number;
  mentorId: number;
  mentorName: string;
  studentName: string | null;
  amount: number | null;
  eventSource: string;
  isShown: boolean;
  createdAt: string;
}

type AnimState = "idle" | "entering" | "visible" | "exiting";

const ENTER_MS  = 600;
const HOLD_MS   = 3500;
const EXIT_MS   = 500;
const POLL_MS   = 12000;

export function MasteryAchievementTicker() {
  const [queue, setQueue]       = useState<AchievementTicker[]>([]);
  const [current, setCurrent]   = useState<AchievementTicker | null>(null);
  const [anim, setAnim]         = useState<AnimState>("idle");
  const processingRef           = useRef(false);
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNew = useCallback(async () => {
    const r = await apiFetch("/mentor/mastery/achievement-tickers");
    if (!r.ok) return;
    const data = await r.json() as AchievementTicker[];
    if (data.length > 0) {
      setQueue(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newItems = data.filter(t => !existingIds.has(t.id));
        return [...prev, ...newItems];
      });
    }
  }, []);

  // Poll for new tickers
  useEffect(() => {
    fetchNew();
    const interval = setInterval(fetchNew, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchNew]);

  // Process queue one-by-one (no loop)
  useEffect(() => {
    if (processingRef.current || current || queue.length === 0) return;
    processingRef.current = true;

    const next = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrent(next);
    setAnim("entering");

    // Mark shown immediately
    apiFetch(`/mentor/mastery/achievement-tickers/${next.id}/shown`, { method: "POST" }).catch(() => null);

    // Enter → visible
    timerRef.current = setTimeout(() => {
      setAnim("visible");
      // Hold → exit
      timerRef.current = setTimeout(() => {
        setAnim("exiting");
        // Exit → done
        timerRef.current = setTimeout(() => {
          setCurrent(null);
          setAnim("idle");
          processingRef.current = false;
        }, EXIT_MS);
      }, HOLD_MS);
    }, ENTER_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [queue, current]);

  if (!current) return null;

  const translate =
    anim === "entering" ? "translateX(-120%)" :
    anim === "exiting"  ? "translateX(120%)"  :
    "translateX(0)";

  const opacity = anim === "visible" ? 1 : 0;

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-md"
      style={{
        background:  "linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)",
        transform:   translate,
        opacity,
        transition:  `transform ${anim === "entering" ? ENTER_MS : EXIT_MS}ms cubic-bezier(.22,.68,0,1.2), opacity ${anim === "entering" ? ENTER_MS : EXIT_MS}ms ease`,
        fontFamily:  "Poppins, sans-serif",
        willChange:  "transform, opacity",
      }}
    >
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <Trophy className="w-4 h-4 text-white" />
      </div>
      <p className="text-sm font-black text-white">
        🏆 Mentor {current.mentorName} got 1 successful payment
        {current.amount ? ` · ₹${current.amount.toLocaleString("en-IN")}` : ""}
      </p>
    </div>
  );
}
