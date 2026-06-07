import { useState, useEffect } from "react";
import { Loader2, Video, ExternalLink, RefreshCw, Calendar, Clock, Users } from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#059669";

interface LiveClass {
  id: number; title: string; grade: number; scheduledAt: string; duration: number;
  status: string; joinUrl: string | null; teacher: string; subjectId: number | null; studentsJoined: number | null;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
}

function statusColor(s: string) {
  if (s === "live") return { bg: "#DCFCE7", color: "#059669" };
  if (s === "completed") return { bg: "#F3F4F6", color: "#6B7280" };
  return { bg: "#DBEAFE", color: "#2563EB" };
}

function ClassCard({ cls }: { cls: LiveClass }) {
  const { bg, color } = statusColor(cls.status);
  const isUpcoming = new Date(cls.scheduledAt) > new Date();
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-sm" style={{ color: NAVY }}>{cls.title}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: bg, color }}>{cls.status === "live" ? "🔴 LIVE" : cls.status}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Grade {cls.grade}</span>
            <span className="flex items-center gap-1"><Video className="w-3 h-3" />{cls.teacher}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.duration} min</span>
            {cls.studentsJoined != null && cls.studentsJoined > 0 && (
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.studentsJoined} joined</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
            <Calendar className="w-3 h-3" />
            {fmtDate(cls.scheduledAt)} at {fmtTime(cls.scheduledAt)}
          </div>
        </div>
        {cls.joinUrl && (isUpcoming || cls.status === "live") && (
          <a href={cls.joinUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: cls.status === "live" ? GREEN : NAVY }}>
            <ExternalLink className="w-3.5 h-3.5" />
            {cls.status === "live" ? "Join Live" : "Join"}
          </a>
        )}
      </div>
    </div>
  );
}

export function LiveClassesObserverTab({ apiFetch }: {
  apiFetch: (path: string, opts?: RequestInit) => Promise<Response>;
}) {
  const [mode, setMode] = useState<"upcoming" | "past">("upcoming");
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(m: "upcoming" | "past") {
    setLoading(true);
    const r = await apiFetch(`/mentor/observer/live-classes?mode=${m}`);
    if (r.ok) setClasses(await r.json());
    setLoading(false);
  }

  useEffect(() => { void load(mode); }, [mode]);

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: NAVY }}>Live Classes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Observer mode — you can join and observe classes</p>
        </div>
        <button onClick={() => load(mode)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> Refresh
        </button>
      </div>

      {/* Mode switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(["upcoming", "past"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
            style={{ background: mode === m ? "white" : "transparent", color: mode === m ? NAVY : "#6B7280", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {m === "upcoming" ? "Upcoming (14 days)" : "Past (30 days)"}
          </button>
        ))}
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs text-blue-700 bg-blue-50 border-blue-200">
        <Video className="w-4 h-4 flex-shrink-0" />
        Observer mode: you can join and watch classes. Creating, editing, or deleting classes is done by teachers only.
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} /></div>
      ) : classes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Video className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-400">No {mode} classes found</p>
          <p className="text-xs text-gray-400 mt-1">Classes for your students' grades will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => <ClassCard key={cls.id} cls={cls} />)}
        </div>
      )}
    </div>
  );
}
