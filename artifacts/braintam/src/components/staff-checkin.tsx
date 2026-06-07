import { useState, useEffect } from "react";
import { Clock, CheckCircle2, LogOut as CheckOutIcon, X, Loader2, Send } from "lucide-react";

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

function workingHours(checkIn: string, checkOut: string | null): string {
  const out = checkOut ? new Date(checkOut) : new Date();
  const diff = Math.floor((out.getTime() - new Date(checkIn).getTime()) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return `${h}h ${m}m`;
}

export function StaffCheckin({ apiFetch, role }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  role: string;
}) {
  const [record, setRecord] = useState<CheckinRecord | null | undefined>(undefined);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [workSummary, setWorkSummary] = useState("");
  const [challenges, setChallenges] = useState("");
  const [pendingTasks, setPendingTasks] = useState("");
  const [tomorrowPriorities, setTomorrowPriorities] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    apiFetch("/staff/checkin/today").then(r => r.ok ? r.json() : null).then(d => setRecord(d));
  }, []);

  async function checkIn() {
    setCheckingIn(true);
    const r = await apiFetch("/staff/checkin", { method: "POST" });
    if (r.ok) setRecord(await r.json());
    setCheckingIn(false);
  }

  async function checkOut() {
    setCheckingOut(true);
    const r = await apiFetch("/staff/checkin/checkout", {
      method: "PATCH",
      body: JSON.stringify({
        workSummary: workSummary || null,
        challenges: challenges || null,
        pendingTasks: pendingTasks || null,
        tomorrowPriorities: tomorrowPriorities || null,
      }),
    });
    if (r.ok) { setRecord(await r.json()); setShowCheckout(false); }
    setCheckingOut(false);
  }

  // Loading state
  if (record === undefined) return null;

  const checkedIn = !!record?.checkInTime;
  const checkedOut = !!record?.checkOutTime;

  return (
    <>
      {/* Banner */}
      <div className="flex items-center justify-between px-4 py-2 text-xs" style={{ background: checkedOut ? "#F0FDF4" : checkedIn ? "#EFF6FF" : "#FFF7ED", borderBottom: "1px solid", borderColor: checkedOut ? "#BBF7D0" : checkedIn ? "#BFDBFE" : "#FED7AA" }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: checkedOut ? `${GREEN}20` : checkedIn ? "#2563EB20" : `${ORANGE}20` }}>
            {checkedOut ? <CheckCircle2 className="w-3 h-3" style={{ color: GREEN }} />
              : checkedIn ? <Clock className="w-3 h-3 text-blue-600" />
                : <Clock className="w-3 h-3" style={{ color: ORANGE }} />}
          </div>
          {checkedOut ? (
            <span className="font-semibold text-green-700">
              Checked in {fmtTime(record!.checkInTime!)} · Checked out {fmtTime(record!.checkOutTime!)} · {workingHours(record!.checkInTime!, record!.checkOutTime!)}
            </span>
          ) : checkedIn ? (
            <span className="font-semibold text-blue-700">
              Checked in at {fmtTime(record!.checkInTime!)} · Working: {workingHours(record!.checkInTime!, null)}
            </span>
          ) : (
            <span className="font-semibold" style={{ color: ORANGE }}>You haven't checked in today</span>
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

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setShowCheckout(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: NAVY }}>
              <div>
                <div className="font-black text-white text-sm">Check Out</div>
                <div className="text-white/60 text-[11px] mt-0.5">Checked in: {fmtTime(record!.checkInTime!)} · Duration: {workingHours(record!.checkInTime!, null)}</div>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-500">Please summarise your day before checking out.</p>

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

              <button onClick={checkOut} disabled={checkingOut}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: checkingOut ? "#9CA3AF" : NAVY }}>
                {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {checkingOut ? "Submitting…" : "Submit & Check Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
