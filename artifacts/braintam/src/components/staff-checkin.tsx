import { useState, useEffect } from "react";
import { Clock, LogOut as CheckOutIcon, X, Loader2, Send } from "lucide-react";

const GREEN = "#059669";
const ORANGE = "#FF6B1A";
const NAVY = "#0B2B6B";

interface CheckinRecord {
  id: number; userId: number; checkDate: string;
  checkInTime: string | null; checkOutTime: string | null;
  workSummary: string | null; challenges: string | null;
  pendingTasks: string | null; tomorrowPriorities: string | null;
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}

function fmtElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function workingHours(checkIn: string, checkOut: string | null): string {
  const out = checkOut ? new Date(checkOut) : new Date();
  const diff = Math.floor((out.getTime() - new Date(checkIn).getTime()) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return `${h}h ${m}m`;
}

interface Props {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  role: string;
  /** compact = sidebar inline strip; default = banner across top of content */
  compact?: boolean;
}

export function StaffCheckin({ apiFetch, role, compact = false }: Props) {
  const [record, setRecord] = useState<CheckinRecord | null | undefined>(undefined);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [workSummary, setWorkSummary] = useState("");
  const [challenges, setChallenges] = useState("");
  const [pendingTasks, setPendingTasks] = useState("");
  const [tomorrowPriorities, setTomorrowPriorities] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    apiFetch("/staff/checkin/today")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setRecord(d);
        if (d?.checkInTime && !d?.checkOutTime) {
          const secs = Math.floor((Date.now() - new Date(d.checkInTime).getTime()) / 1000);
          setElapsed(Math.max(0, secs));
        }
      })
      .catch(() => setRecord(null));
  }, []);

  // Live HH:MM:SS tick while checked in and not checked out
  useEffect(() => {
    if (!record?.checkInTime || record?.checkOutTime) return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [record?.checkInTime, record?.checkOutTime]);

  async function checkIn() {
    setCheckingIn(true);
    try {
      const r = await apiFetch("/staff/checkin", { method: "POST" });
      if (r.ok) {
        const d = await r.json();
        setRecord(d);
        setElapsed(0);
      }
    } catch { /* ignore */ }
    setCheckingIn(false);
  }

  async function checkOut() {
    setCheckingOut(true);
    try {
      const r = await apiFetch("/staff/checkin/checkout", {
        method: "PATCH",
        body: JSON.stringify({
          workSummary: workSummary || null, challenges: challenges || null,
          pendingTasks: pendingTasks || null, tomorrowPriorities: tomorrowPriorities || null,
        }),
      });
      if (r.ok) { setRecord(await r.json()); setShowCheckout(false); }
    } catch { /* ignore */ }
    setCheckingOut(false);
  }

  if (record === undefined) return null;

  const checkedIn = !!record?.checkInTime;
  const checkedOut = !!record?.checkOutTime;

  // ── COMPACT MODE (sidebar) ────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <div className="rounded-xl border px-3 py-2 space-y-1.5"
          style={{ borderColor: checkedOut ? "#BBF7D0" : checkedIn ? "#BFDBFE" : "#FED7AA", background: checkedOut ? "#F0FDF4" : checkedIn ? "#EFF6FF" : "#FFF7ED" }}>

          {/* Time display: In → Out */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: checkedIn ? (checkedOut ? GREEN : "#2563EB") : ORANGE }} />
            <span style={{ color: checkedIn ? "#374151" : ORANGE }}>
              {checkedIn ? fmtTime(record!.checkInTime!) : "--:--"}
            </span>
            <span className="text-gray-300 font-normal">→</span>
            <span style={{ color: checkedOut ? GREEN : "#9CA3AF" }}>
              {checkedOut ? fmtTime(record!.checkOutTime!) : "--:--"}
            </span>
          </div>

          {/* Running timer when checked in */}
          {checkedIn && !checkedOut && (
            <div className="font-black text-sm tabular-nums" style={{ color: "#2563EB", letterSpacing: "0.04em" }}>
              {fmtElapsed(elapsed)}
            </div>
          )}

          {/* Status row + button */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold"
              style={{ color: checkedOut ? GREEN : checkedIn ? "#2563EB" : ORANGE }}>
              {checkedOut ? `✓ ${workingHours(record!.checkInTime!, record!.checkOutTime!)}` : checkedIn ? "Running…" : "Not checked in"}
            </span>
            {!checkedIn && (
              <button onClick={checkIn} disabled={checkingIn}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: checkingIn ? "#9CA3AF" : ORANGE }}>
                {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                {checkingIn ? "…" : "Check In"}
              </button>
            )}
            {checkedIn && !checkedOut && (
              <button onClick={() => setShowCheckout(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white flex-shrink-0"
                style={{ background: NAVY }}>
                <CheckOutIcon className="w-3 h-3" /> Out
              </button>
            )}
          </div>
        </div>

        {showCheckout && <CheckoutModal role={role} record={record!} elapsed={elapsed} checkingOut={checkingOut} workSummary={workSummary} setWorkSummary={setWorkSummary} challenges={challenges} setChallenges={setChallenges} pendingTasks={pendingTasks} setPendingTasks={setPendingTasks} tomorrowPriorities={tomorrowPriorities} setTomorrowPriorities={setTomorrowPriorities} onClose={() => setShowCheckout(false)} onSubmit={checkOut} />}
      </>
    );
  }

  // ── BANNER MODE (across main content top) ───────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 text-xs"
        style={{ background: checkedOut ? "#F0FDF4" : checkedIn ? "#EFF6FF" : "#FFF7ED", borderBottom: "1px solid", borderColor: checkedOut ? "#BBF7D0" : checkedIn ? "#BFDBFE" : "#FED7AA" }}>
        <div className="flex items-center gap-3">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: checkedIn ? (checkedOut ? GREEN : "#2563EB") : ORANGE }} />
          <span className="font-semibold" style={{ color: "#374151" }}>
            In: <strong>{checkedIn ? fmtTime(record!.checkInTime!) : "--:--"}</strong>
            <span className="mx-1.5 text-gray-300">→</span>
            Out: <strong style={{ color: checkedOut ? GREEN : "#9CA3AF" }}>{checkedOut ? fmtTime(record!.checkOutTime!) : "--:--"}</strong>
          </span>
          {checkedIn && !checkedOut && (
            <span className="font-black tabular-nums" style={{ color: "#2563EB", fontSize: "13px" }}>{fmtElapsed(elapsed)}</span>
          )}
        </div>
        {!checkedIn && (
          <button onClick={checkIn} disabled={checkingIn}
            className="flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-white ml-3"
            style={{ background: checkingIn ? "#9CA3AF" : ORANGE }}>
            {checkingIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
            {checkingIn ? "…" : "Check In"}
          </button>
        )}
        {checkedIn && !checkedOut && (
          <button onClick={() => setShowCheckout(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-white ml-3"
            style={{ background: NAVY }}>
            <CheckOutIcon className="w-3 h-3" /> Check Out
          </button>
        )}
      </div>

      {showCheckout && <CheckoutModal role={role} record={record!} elapsed={elapsed} checkingOut={checkingOut} workSummary={workSummary} setWorkSummary={setWorkSummary} challenges={challenges} setChallenges={setChallenges} pendingTasks={pendingTasks} setPendingTasks={setPendingTasks} tomorrowPriorities={tomorrowPriorities} setTomorrowPriorities={setTomorrowPriorities} onClose={() => setShowCheckout(false)} onSubmit={checkOut} />}
    </>
  );
}

// ── Shared checkout modal ─────────────────────────────────────────────────
function CheckoutModal({ role, record, elapsed, checkingOut, workSummary, setWorkSummary, challenges, setChallenges, pendingTasks, setPendingTasks, tomorrowPriorities, setTomorrowPriorities, onClose, onSubmit }: {
  role: string; record: CheckinRecord; elapsed: number; checkingOut: boolean;
  workSummary: string; setWorkSummary: (v: string) => void;
  challenges: string; setChallenges: (v: string) => void;
  pendingTasks: string; setPendingTasks: (v: string) => void;
  tomorrowPriorities: string; setTomorrowPriorities: (v: string) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  function fmtElapsed(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b rounded-t-2xl" style={{ background: NAVY }}>
          <div>
            <div className="font-black text-white text-sm">Check Out</div>
            <div className="text-white/60 text-[11px] mt-0.5">
              In: {fmtTime(record.checkInTime!)} · Duration: <span className="tabular-nums font-bold">{fmtElapsed(elapsed)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">Summarise your day before checking out.</p>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Work Summary</label>
            <textarea value={workSummary} onChange={e => setWorkSummary(e.target.value)} rows={3}
              placeholder="What did you accomplish today?"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
          </div>
          {role === "mentor" && (
            <>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Challenges</label>
                <textarea value={challenges} onChange={e => setChallenges(e.target.value)} rows={2}
                  placeholder="Any difficulties or blockers?"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Pending Tasks</label>
                <textarea value={pendingTasks} onChange={e => setPendingTasks(e.target.value)} rows={2}
                  placeholder="Tasks left incomplete?"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
              </div>
            </>
          )}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase">Tomorrow's Priorities</label>
            <textarea value={tomorrowPriorities} onChange={e => setTomorrowPriorities(e.target.value)} rows={2}
              placeholder="What are your top priorities for tomorrow?"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:border-blue-400 resize-none" />
          </div>
          <button onClick={onSubmit} disabled={checkingOut}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: checkingOut ? "#9CA3AF" : NAVY }}>
            {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {checkingOut ? "Submitting…" : "Submit & Check Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
