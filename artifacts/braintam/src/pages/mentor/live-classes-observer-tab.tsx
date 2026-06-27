import { useState, useEffect } from "react";
import { Loader2, Video, RefreshCw, Calendar, Clock, Users, Monitor, ExternalLink, BookOpen } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

interface MentorSession {
  id: number;
  topic: string;
  dayNumber: number;
  scheduledAt: string;
  duration: number;
  status: string;
  joinUrl: string | null;
  recordingUrl: string | null;
  batchId: number;
  batchTitle: string;
  batchGrade: number | null;
  batchSubject: string | null;
}

type Mode = "today" | "upcoming" | "completed";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

function statusBadge(s: string) {
  if (s === "live")      return { bg: "#DCFCE7", color: "#059669", label: "🔴 LIVE" };
  if (s === "completed") return { bg: "#F3F4F6", color: "#6B7280", label: "✓ Completed" };
  return { bg: "#DBEAFE", color: "#2563EB", label: "⏰ Upcoming" };
}

function SessionCard({ s, onJoin, onAttend }: { s: MentorSession; onJoin: () => void; onAttend: () => void; }) {
  const { bg, color, label } = statusBadge(s.status);
  const isLiveOrSoon = s.status === "live" || s.status === "scheduled";
  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow ${s.status === "live" ? "border-red-200" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm truncate" style={{ color: NAVY }}>{s.topic}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: bg, color }}>{label}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 mt-2">
            <div className="text-[10px]">
              <span className="text-gray-400">Batch</span>
              <div className="font-semibold text-gray-700 truncate">{s.batchTitle}</div>
            </div>
            <div className="text-[10px]">
              <span className="text-gray-400">Grade</span>
              <div className="font-semibold text-gray-700">{s.batchGrade ? `Grade ${s.batchGrade}` : "—"}</div>
            </div>
            <div className="text-[10px]">
              <span className="text-gray-400">Day</span>
              <div className="font-semibold text-gray-700">Day {s.dayNumber}</div>
            </div>
            <div className="text-[10px]">
              <span className="text-gray-400">Subject</span>
              <div className="font-semibold text-gray-700 truncate">{s.batchSubject ?? "—"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(s.scheduledAt)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTime(s.scheduledAt)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration} min</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {isLiveOrSoon && (
            <button onClick={onJoin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
              style={{ background: s.status === "live" ? "#DC2626" : NAVY }}>
              <Monitor className="w-3.5 h-3.5" />
              Join Classroom
            </button>
          )}
          {s.status === "completed" && (
            <button onClick={onAttend}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              <Users className="w-3.5 h-3.5" />
              Attendance
            </button>
          )}
          {s.joinUrl && (
            <a href={s.joinUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
              📹 Meet Link
            </a>
          )}
          {s.recordingUrl && s.status === "completed" && (
            <a href={s.recordingUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
              <ExternalLink className="w-3 h-3" /> Recording
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function LiveClassesObserverTab({ apiFetch, mentorName }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
  mentorName?: string;
}) {
  const [mode, setMode] = useState<Mode>("today");
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendSession, setAttendSession] = useState<MentorSession | null>(null);

  async function load(m: Mode) {
    setLoading(true);
    try {
      const r = await apiFetch(`/mentor/live-sessions?mode=${m}`);
      if (r.ok) setSessions(await r.json());
      else setSessions([]);
    } catch { setSessions([]); }
    setLoading(false);
  }

  useEffect(() => { void load(mode); }, [mode]);

  function joinClassroom(s: MentorSession) {
    const url = `/live/${s.id}?role=mentor${s.joinUrl ? `&meetLink=${encodeURIComponent(s.joinUrl)}` : ""}`;
    window.location.href = url;
  }

  const tabs: { key: Mode; label: string }[] = [
    { key: "today",     label: "Today" },
    { key: "upcoming",  label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Live Classes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Sessions from your assigned batches</p>
        </div>
        <button onClick={() => load(mode)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> Refresh
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setMode(t.key)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: mode === t.key ? "white" : "transparent", color: mode === t.key ? NAVY : "#6B7280", boxShadow: mode === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Video className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-400">No {mode} sessions</p>
          <p className="text-xs text-gray-400 mt-1">
            {mode === "today" ? "No sessions scheduled for today" :
             mode === "upcoming" ? "No upcoming sessions in your batches" :
             "No completed sessions yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <SessionCard
              key={s.id}
              s={s}
              onJoin={() => joinClassroom(s)}
              onAttend={() => setAttendSession(s)}
            />
          ))}
        </div>
      )}

      {attendSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-base" style={{ color: NAVY }}>Session Details</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div><span className="font-semibold">Topic:</span> {attendSession.topic}</div>
              <div><span className="font-semibold">Batch:</span> {attendSession.batchTitle}</div>
              <div><span className="font-semibold">Grade:</span> Grade {attendSession.batchGrade}</div>
              <div><span className="font-semibold">Day:</span> Day {attendSession.dayNumber}</div>
              <div><span className="font-semibold">Date:</span> {fmt(attendSession.scheduledAt)}</div>
              <div><span className="font-semibold">Duration:</span> {attendSession.duration} min</div>
            </div>
            <button onClick={() => setAttendSession(null)}
              className="w-full py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 text-gray-600">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
