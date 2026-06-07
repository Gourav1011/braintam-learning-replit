import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Clock, CheckCircle2, UserX, ChevronDown, ChevronUp } from "lucide-react";

const NAVY = "#0B2B6B";
const GREEN = "#059669";
const ORANGE = "#FF6B1A";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
    credentials: "include",
  });
}

interface CheckinRow {
  id: number; userId: number; userName: string | null; userRole: string | null;
  checkDate: string; checkInTime: string | null; checkOutTime: string | null;
  device: string | null; browser: string | null;
  workSummary: string | null; challenges: string | null;
  pendingTasks: string | null; tomorrowPriorities: string | null;
}
interface NotCheckedIn { id: number; name: string; role: string; isActive: boolean }
interface AttendanceData { checkins: CheckinRow[]; notCheckedIn: NotCheckedIn[]; date: string }

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}
function workHours(checkIn: string, checkOut: string | null) {
  const out = checkOut ? new Date(checkOut) : new Date();
  const m = Math.floor((out.getTime() - new Date(checkIn).getTime()) / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function roleColor(r: string | null) {
  if (r === "admin") return { bg: "#FEF3C7", color: "#D97706" };
  if (r === "teacher") return { bg: "#DBEAFE", color: "#2563EB" };
  if (r === "mentor") return { bg: "#DCFCE7", color: "#059669" };
  return { bg: "#F3F4F6", color: "#6B7280" };
}

function CheckinCard({ row }: { row: CheckinRow }) {
  const [open, setOpen] = useState(false);
  const hasCheckout = !!row.checkOutTime;
  const { bg, color } = roleColor(row.userRole);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: NAVY }}>
            {(row.userName ?? "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm" style={{ color: NAVY }}>{row.userName ?? "Unknown"}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: bg, color }}>{row.userRole}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />In: {row.checkInTime ? fmtTime(row.checkInTime) : "—"}</span>
              {hasCheckout && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" />Out: {fmtTime(row.checkOutTime!)}</span>}
              {row.checkInTime && <span className="font-semibold" style={{ color: hasCheckout ? GREEN : ORANGE }}>{workHours(row.checkInTime, row.checkOutTime)}</span>}
              {row.device && <span>{row.device}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: hasCheckout ? "#DCFCE7" : "#DBEAFE", color: hasCheckout ? GREEN : "#2563EB" }}>
            {hasCheckout ? "Checked Out" : "Active"}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-2 pt-3">
          {row.workSummary && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Work Summary</div>
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{row.workSummary}</p></div>
          )}
          {row.challenges && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Challenges</div>
              <p className="text-xs text-gray-600 bg-orange-50 rounded-lg p-2">{row.challenges}</p></div>
          )}
          {row.pendingTasks && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pending Tasks</div>
              <p className="text-xs text-gray-600 bg-yellow-50 rounded-lg p-2">{row.pendingTasks}</p></div>
          )}
          {row.tomorrowPriorities && (
            <div><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tomorrow's Priorities</div>
              <p className="text-xs text-gray-600 bg-blue-50 rounded-lg p-2">{row.tomorrowPriorities}</p></div>
          )}
          {!row.workSummary && !row.challenges && !row.pendingTasks && !row.tomorrowPriorities && (
            <p className="text-xs text-gray-400 italic">No checkout summary provided yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function EmployeeAttendanceTab() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(d: string) {
    setLoading(true);
    const r = await apiFetch(`/admin/employee-attendance?date=${d}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }

  useEffect(() => { void load(date); }, [date]);

  const checkedOut = data?.checkins.filter(c => c.checkOutTime).length ?? 0;
  const checkedIn = (data?.checkins.length ?? 0) - checkedOut;
  const notIn = data?.notCheckedIn.length ?? 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-base" style={{ color: NAVY }}>Staff Attendance</h3>
          <p className="text-xs text-gray-500 mt-0.5">Employee check-in / check-out records</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <button onClick={() => load(date)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-black" style={{ color: NAVY }}>{data?.checkins.length ?? 0}</div>
          <div className="text-[11px] font-bold text-blue-600 mt-0.5">Checked In</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-black" style={{ color: GREEN }}>{checkedOut}</div>
          <div className="text-[11px] font-bold mt-0.5" style={{ color: GREEN }}>Checked Out</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <div className="text-2xl font-black text-red-500">{notIn}</div>
          <div className="text-[11px] font-bold text-red-500 mt-0.5">Not Checked In</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} /></div>
      ) : (
        <>
          {/* Checked in staff */}
          {(data?.checkins.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Checked In — {data!.checkins.length} staff</h4>
              <div className="space-y-2">
                {data!.checkins.map(row => <CheckinCard key={row.id} row={row} />)}
              </div>
            </div>
          )}

          {/* Not checked in */}
          {(data?.notCheckedIn.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Not Checked In — {data!.notCheckedIn.length} staff</h4>
              <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
                {data!.notCheckedIn.map((s, i) => {
                  const { bg, color } = roleColor(s.role);
                  return (
                    <div key={s.id} className={`flex items-center justify-between px-4 py-2.5 ${i < data!.notCheckedIn.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-red-400" />
                        <span className="font-semibold text-sm" style={{ color: NAVY }}>{s.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: bg, color }}>{s.role}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">Absent</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!data || (data.checkins.length === 0 && data.notCheckedIn.length === 0) ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No attendance records for {date}</p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
