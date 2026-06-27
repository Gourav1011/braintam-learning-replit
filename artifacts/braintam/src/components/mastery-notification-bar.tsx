import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, CreditCard, UserCheck, RotateCcw } from "lucide-react";
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

interface MasteryNotification {
  id: number;
  mentorId: number;
  type: string;
  title: string;
  body: string;
  masteryStudentId: number | null;
  studentName: string | null;
  amount: number | null;
  isRead: boolean;
  createdAt: string;
}

function notifIcon(type: string) {
  switch (type) {
    case "payment_approved": return CreditCard;
    case "student_assigned": return UserCheck;
    case "student_renewed":  return RotateCcw;
    default:                 return Bell;
  }
}

function notifEmoji(type: string) {
  switch (type) {
    case "payment_approved": return "💰";
    case "student_assigned": return "👤";
    case "student_renewed":  return "🎉";
    default:                 return "🔔";
  }
}

function fmtAmount(n: number | null) {
  if (!n) return "";
  return ` ₹${n.toLocaleString("en-IN")}`;
}

interface Props {
  onNotificationClick?: (n: MasteryNotification) => void;
}

export function MasteryNotificationBar({ onNotificationClick }: Props) {
  const [notifs, setNotifs]       = useState<MasteryNotification[]>([]);
  const [expanded, setExpanded]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tickerRef                 = useRef<HTMLDivElement>(null);
  const animRef                   = useRef<number>(0);
  const posRef                    = useRef(0);

  const load = useCallback(async () => {
    const r = await apiFetch("/mentor/mastery/notifications");
    if (r.ok) {
      const data = await r.json() as MasteryNotification[];
      setNotifs(data.slice(0, 30));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll ticker
  useEffect(() => {
    const el = tickerRef.current;
    if (!el || notifs.length === 0 || expanded || dismissed) return;

    let speed = 0.6;
    function tick() {
      posRef.current -= speed;
      const width = el!.scrollWidth / 2;
      if (Math.abs(posRef.current) >= width) posRef.current = 0;
      el!.style.transform = `translateX(${posRef.current}px)`;
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [notifs, expanded, dismissed]);

  async function markAllRead() {
    await apiFetch("/mentor/mastery/notifications/read-all", { method: "POST" });
    load();
  }

  async function markRead(id: number) {
    await apiFetch(`/mentor/mastery/notifications/${id}/read`, { method: "POST" });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }

  const unread = notifs.filter(n => !n.isRead).length;

  if (notifs.length === 0 || dismissed) return null;

  const tickerItems = [...notifs, ...notifs]; // duplicate for seamless loop

  return (
    <div className="relative" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Collapsed ticker bar */}
      {!expanded && (
        <div className="flex items-center bg-gradient-to-r from-[#0B2B6B] to-[#1a3d7c] rounded-2xl overflow-hidden shadow-sm">
          {/* Left label */}
          <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 border-r border-white/10">
            <Bell className="w-3.5 h-3.5 text-white/70" />
            <span className="text-xs font-black text-white whitespace-nowrap">Notifications</span>
            {unread > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                style={{ background: "#FF6B1A" }}>{unread}</span>
            )}
          </div>

          {/* Scrolling ticker */}
          <div className="flex-1 overflow-hidden py-2.5 cursor-pointer" onClick={() => setExpanded(true)}>
            <div ref={tickerRef} className="flex items-center gap-8 whitespace-nowrap" style={{ willChange: "transform" }}>
              {tickerItems.map((n, i) => (
                <span key={`${n.id}-${i}`} className="flex items-center gap-1.5 text-xs text-white/90">
                  <span>{notifEmoji(n.type)}</span>
                  <span className={n.isRead ? "text-white/60" : "font-semibold text-white"}>
                    {n.body}{n.amount ? fmtAmount(n.amount) : ""}
                  </span>
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />}
                </span>
              ))}
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 px-3 py-2.5 flex-shrink-0 border-l border-white/10">
            <button onClick={() => setExpanded(true)}
              className="text-[10px] text-white/70 hover:text-white font-semibold px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
              View All
            </button>
            <button onClick={() => setDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded notification center */}
      {expanded && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
            style={{ background: "linear-gradient(135deg, #0B2B6B 0%, #1a3d7c 100%)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-white" />
              <span className="text-sm font-black text-white">Notification Center</span>
              {unread > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                  style={{ background: "#FF6B1A" }}>{unread} new</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead}
                  className="text-[10px] text-white/70 hover:text-white font-semibold px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setExpanded(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">No notifications yet</div>
            ) : notifs.map(n => {
              const Icon = notifIcon(n.type);
              return (
                <div key={n.id}
                  className={`flex items-start gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.isRead ? "opacity-60" : ""}`}
                  onClick={() => {
                    markRead(n.id);
                    onNotificationClick?.(n);
                  }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    n.type === "payment_approved" ? "bg-green-100" :
                    n.type === "student_assigned" ? "bg-blue-100" :
                    "bg-orange-100"
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      n.type === "payment_approved" ? "text-green-700" :
                      n.type === "student_assigned" ? "text-blue-700" :
                      "text-orange-700"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${n.isRead ? "text-gray-600" : "font-semibold text-gray-800"}`}>
                      {notifEmoji(n.type)} {n.body}{n.amount ? fmtAmount(n.amount) : ""}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: "#FF6B1A" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
