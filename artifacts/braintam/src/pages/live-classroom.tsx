import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { io, type Socket } from "socket.io-client";
import {
  Video, VideoOff, Users, MessageSquare, BarChart2, Send,
  Trophy, CreditCard, Monitor, Hand, Settings, ChevronLeft, ChevronRight,
  Phone, PhoneCall,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN = "#10B981";
const YELLOW = "#F59E0B";

// ── Types ──────────────────────────────────────────────────────
interface ChatMsg {
  id: string; name: string; role: string;
  text: string; isAnnouncement: boolean; ts: number;
}
interface PollOpt { id: string; text: string; }
interface Poll { id: string; question: string; options: PollOpt[]; startedAt?: number; }
interface LeaderboardEntry { name: string; rank: number; }
interface RaisedHand { uid: string; name: string; mentorGroupId: string | null; }

interface AttendanceRecord {
  userId: string;
  name: string;
  phone: string | null;
  mentorGroupId: string | null;
  status: "LIVE" | "BACKSTAGE" | "ABSENT";
  totalDurationSeconds: number;
  joinedAt: number | null;
}

// ── Outbound call/WhatsApp routing ─────────────────────────────
function handleOutbound(phone: string | null, protocol: "TEL" | "WA"): void {
  if (!phone) { alert("No phone number available"); return; }
  const num = phone.replace(/\D/g, "");
  const isTouch = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (protocol === "TEL") {
    if (isTouch) window.location.href = `tel:${num}`;
    else { navigator.clipboard.writeText(num).catch(() => {}); alert(`📞 ${num} copied to clipboard`); }
  } else {
    window.open(isTouch ? `https://wa.me/${num}` : `https://web.whatsapp.com/send?phone=${num}`, "_blank");
  }
}

// ── Socket hook ────────────────────────────────────────────────
function useClassroomSocket(
  sessionId: string, userId: string, name: string,
  role: string, groupId: string, phone: string
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      query: { sessionId, userId, name, role, groupId: groupId || "", phone: phone || "" },
    });
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    setSocket(s);
    return () => { s.disconnect(); };
  }, [sessionId, userId, name, role, groupId, phone]);

  return { socket, connected };
}

// ── Helpers ────────────────────────────────────────────────────
function getEmbedUrl(url: string): string {
  if (!url.trim()) return "";
  try {
    if (url.includes("canva.com/design/")) {
      const u = new URL(url);
      if (!u.pathname.includes("/view")) u.pathname = u.pathname.replace(/\/?$/, "/view");
      u.searchParams.set("embed", "");
      return u.toString();
    }
  } catch { /* fall through */ }
  return url;
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

// ── Annotation canvas ──────────────────────────────────────────
function AnnotationCanvas({
  mode, canvasRef,
}: { mode: "none" | "pen" | "highlighter"; canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const isDrawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const pos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvasRef.current!.width / r.width),
      y: (e.clientY - r.top) * (canvasRef.current!.height / r.height),
    };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => { if (mode !== "none") { isDrawing.current = true; last.current = pos(e); } };
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !last.current || mode === "none" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (mode === "pen") { ctx.strokeStyle = ORANGE; ctx.lineWidth = 3; ctx.globalAlpha = 1; }
    else { ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 22; ctx.globalAlpha = 0.35; }
    ctx.stroke(); ctx.globalAlpha = 1; last.current = p;
  };
  const onUp = () => { isDrawing.current = false; last.current = null; };

  return (
    <canvas
      ref={canvasRef} width={1280} height={720}
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: mode !== "none" ? "auto" : "none",
        cursor: mode === "pen" ? "crosshair" : mode === "highlighter" ? "cell" : "default",
      }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
    />
  );
}

// ── Attendance Sidebar ─────────────────────────────────────────
function AttendanceSidebar({
  registry, myGroupId, role, collapsed, onCollapse,
}: {
  registry: Map<string, AttendanceRecord>;
  myGroupId: string;
  role: string;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const [tab, setTab] = useState<"LIVE" | "BACKSTAGE" | "ABSENT">("LIVE");

  const isStaff = role === "teacher" || role === "admin";
  const isMentor = role === "mentor";

  const students = Array.from(registry.values()).filter(s => {
    if (isStaff) return true;
    if (isMentor) return s.mentorGroupId === myGroupId;
    return false;
  });

  const byStatus = students.filter(s => s.status === tab);

  const counts = {
    LIVE: students.filter(s => s.status === "LIVE").length,
    BACKSTAGE: students.filter(s => s.status === "BACKSTAGE").length,
    ABSENT: students.filter(s => s.status === "ABSENT").length,
  };

  const statusColor = { LIVE: GREEN, BACKSTAGE: YELLOW, ABSENT: "#EF4444" };
  const tabLabel = { LIVE: "Live Class", BACKSTAGE: "Backstage", ABSENT: "Absent" };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 border-r border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 40 }}>
        <button onClick={onCollapse} className="text-gray-500 hover:text-gray-300 mb-3">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="space-y-2 text-center">
          <div style={{ color: GREEN }} className="text-xs font-bold">{counts.LIVE}</div>
          <div style={{ color: YELLOW }} className="text-xs font-bold">{counts.BACKSTAGE}</div>
          <div className="text-xs font-bold text-red-400">{counts.ABSENT}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 220 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">Attendance</span>
        <button onClick={onCollapse} className="text-gray-500 hover:text-gray-300">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {(["LIVE", "BACKSTAGE", "ABSENT"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[9px] font-bold flex flex-col items-center gap-0.5 transition-all border-b-2 ${
              tab === t ? "border-current" : "border-transparent text-gray-600 hover:text-gray-400"
            }`}
            style={tab === t ? { color: statusColor[t] } : {}}
          >
            <span className="text-base font-black">{counts[t]}</span>
            <span>{tabLabel[t]}</span>
          </button>
        ))}
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto">
        {byStatus.length === 0 && (
          <p className="text-[10px] text-gray-600 text-center mt-6">No students</p>
        )}
        {byStatus.map(s => (
          <div key={s.userId} className="px-3 py-2 border-b border-gray-800/50 hover:bg-gray-800/40">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor[tab] }} />
              <span className="text-[11px] text-gray-200 font-semibold truncate flex-1">{s.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-gray-500">
                {s.joinedAt ? fmtDuration(Math.round((Date.now() - s.joinedAt) / 1000)) : "—"}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOutbound(s.phone, "TEL")}
                  title="Call"
                  className="p-1 rounded text-gray-500 hover:text-green-400 hover:bg-gray-700 transition-all"
                >
                  <PhoneCall className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => handleOutbound(s.phone, "WA")}
                  title="WhatsApp"
                  className="p-1 rounded text-gray-500 hover:text-green-400 hover:bg-gray-700 transition-all"
                >
                  <span className="text-[9px] font-bold">WA</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function LiveClassroom() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "demo";
  const search = new URLSearchParams(window.location.search);

  const role     = (search.get("role") ?? "student").toLowerCase();
  const name     = search.get("name") ?? "Student";
  const userId   = search.get("userId") ?? `u-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const groupId  = search.get("groupId") ?? "";
  const phone    = search.get("phone") ?? "";
  const title    = search.get("title") ?? `Live Class · ${sessionId}`;

  const { socket, connected } = useClassroomSocket(sessionId, userId, name, role, groupId, phone);
  const isStaff  = role === "teacher" || role === "admin";
  const isMentor = role === "mentor";
  const canSeeAttendance = isStaff || isMentor;

  // ── State ──────────────────────────────────────────────────
  const [presentationUrl, setPresentationUrl] = useState(search.get("url") ?? "");
  const [urlInput, setUrlInput] = useState(search.get("url") ?? "");

  const [panelMode, setPanelMode] = useState<"chat" | "poll">("chat");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [raiseHandEnabled, setRaiseHandEnabled] = useState(false);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [myPollAnswer, setMyPollAnswer] = useState<string | null>(null);
  const [pollCounts, setPollCounts] = useState<Record<string, number>>({});
  const [pollTotal, setPollTotal] = useState(0);
  const [userCount, setUserCount] = useState(0);

  // Attendance registry
  const [registry, setRegistry] = useState<Map<string, AttendanceRecord>>(new Map());

  // ── Annotation ─────────────────────────────────────────────
  const [annotMode, setAnnotMode] = useState<"none" | "pen" | "highlighter">("none");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clearAnnotations = useCallback(() => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }, []);

  // ── Camera ─────────────────────────────────────────────────
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCameraOn(true);
      } catch { alert("Camera unavailable"); }
    }
  }, [cameraOn]);

  // ── Poll form ──────────────────────────────────────────────
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", "", "", ""]);

  // ── Sidebar ────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Chat scroll ────────────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // ── Heartbeat (15s) ────────────────────────────────────────
  useEffect(() => {
    if (!socket || isStaff || isMentor) return;
    const ping = () => socket.emit("heartbeat:ping");
    ping(); // ping immediately on connect
    const t = setInterval(ping, 15_000);
    return () => clearInterval(t);
  }, [socket, isStaff, isMentor]);

  // ── Helper to upsert registry entry ───────────────────────
  const upsert = useCallback((rec: Partial<AttendanceRecord> & { userId: string }) => {
    setRegistry(prev => {
      const m = new Map(prev);
      const existing = m.get(rec.userId) ?? {
        userId: rec.userId, name: rec.name ?? "?",
        phone: null, mentorGroupId: null,
        status: "ABSENT", totalDurationSeconds: 0, joinedAt: null,
      };
      m.set(rec.userId, { ...existing, ...rec });
      return m;
    });
  }, []);

  // ── Socket events ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("roomState", (s: { chat: ChatMsg[]; raisedHands: RaisedHand[]; raiseHandEnabled: boolean; activePoll: Poll | null }) => {
      setChat(s.chat);
      setRaisedHands(s.raisedHands);
      setRaiseHandEnabled(s.raiseHandEnabled);
      if (s.activePoll) { setActivePoll(s.activePoll); setPanelMode("poll"); }
    });

    socket.on("chat:message", (msg: ChatMsg) => setChat(p => [...p, msg].slice(-100)));

    socket.on("pollStarted", (poll: Poll) => {
      setActivePoll(poll); setMyPollAnswer(null); setPollCounts({}); setPollTotal(0); setPanelMode("poll");
    });
    socket.on("pollEnded", () => { setActivePoll(null); setMyPollAnswer(null); setPanelMode("chat"); });
    socket.on("pollUpdate", ({ counts, total }: { counts: Record<string, number>; total: number }) => {
      setPollCounts(counts); setPollTotal(total);
    });
    socket.on("showLeaderboard", ({ top3 }: { top3: LeaderboardEntry[] }) => {
      setLeaderboard(top3);
      setTimeout(() => setLeaderboard(null), 5000);
    });

    // Attendance events
    socket.on("studentJoined", (d: { userId: string; name: string; mentorGroupId: string | null; phone: string | null }) => {
      upsert({ userId: d.userId, name: d.name, phone: d.phone, mentorGroupId: d.mentorGroupId, status: "LIVE", joinedAt: Date.now() });
    });
    socket.on("studentReturned", (d: { userId: string; name: string; mentorGroupId: string | null }) => {
      upsert({ userId: d.userId, name: d.name, mentorGroupId: d.mentorGroupId, status: "LIVE" });
    });
    socket.on("studentBackstage", (d: { userId: string; name?: string; mentorGroupId?: string | null }) => {
      upsert({ userId: d.userId, name: d.name, mentorGroupId: d.mentorGroupId ?? null, status: "BACKSTAGE" });
    });

    // Raise hand
    socket.on("classroom:handRaised", (d: { uid: string; name: string; mentorGroupId: string | null; raised: boolean }) => {
      setRaisedHands(prev => {
        const filtered = prev.filter(h => h.uid !== d.uid);
        return d.raised ? [...filtered, { uid: d.uid, name: d.name, mentorGroupId: d.mentorGroupId }] : filtered;
      });
    });
    socket.on("raiseHandToggled", ({ enabled }: { enabled: boolean }) => {
      setRaiseHandEnabled(enabled);
      if (!enabled) { setMyHandRaised(false); setRaisedHands([]); }
    });

    socket.on("pollSubmitted", ({ optionId }: { optionId: string }) => setMyPollAnswer(optionId));

    return () => {
      socket.off("roomState"); socket.off("chat:message");
      socket.off("pollStarted"); socket.off("pollEnded"); socket.off("pollUpdate");
      socket.off("showLeaderboard"); socket.off("studentJoined"); socket.off("studentReturned");
      socket.off("studentBackstage"); socket.off("classroom:handRaised");
      socket.off("raiseHandToggled"); socket.off("pollSubmitted");
    };
  }, [socket, upsert]);

  // ── Actions ────────────────────────────────────────────────
  const sendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit("chat:send", chatInput.trim());
    setChatInput("");
  };

  const submitPoll = (optionId: string) => {
    if (!socket || myPollAnswer) return;
    socket.emit("submitPoll", { optionId });
  };

  const launchPoll = () => {
    if (!socket) return;
    const opts = pollOpts.filter(o => o.trim());
    if (!pollQ.trim() || opts.length < 2) { alert("Add a question and at least 2 options"); return; }
    socket.emit("startPoll", { question: pollQ, options: opts });
    setShowPollForm(false); setPollQ(""); setPollOpts(["", "", "", ""]);
  };

  const toggleHand = () => {
    socket?.emit("student:raiseHand");
    setMyHandRaised(p => !p);
  };

  const toggleRaiseHandFeature = (enabled: boolean) => socket?.emit("toggleRaiseHand", { enabled });

  // Visible hands (mentor: only their group; staff: all)
  const visibleHands = raisedHands.filter(h => {
    if (isStaff) return true;
    if (isMentor) return h.mentorGroupId === groupId;
    return false;
  });

  const embedUrl = getEmbedUrl(presentationUrl);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-950" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-red-500 animate-pulse" : "bg-gray-600"}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${connected ? "text-red-400" : "text-gray-600"}`}>
              {connected ? "LIVE" : "Connecting…"}
            </span>
          </div>
          <span className="text-white font-bold text-sm truncate max-w-xs">{title}</span>
          <span className="text-gray-600 text-xs">#{sessionId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" />
            {Array.from(registry.values()).filter(r => r.status === "LIVE").length || userCount}
          </span>
          {(isStaff || isMentor) && (
            <span className="text-[10px] text-gray-500">
              {Array.from(registry.values()).filter(r => r.status === "BACKSTAGE").length} backstage
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isStaff ? "bg-blue-900/60 text-blue-300" : isMentor ? "bg-purple-900/60 text-purple-300" : "bg-gray-800 text-gray-400"}`}>
            {isStaff ? "Teacher" : isMentor ? "Mentor" : "Student"} · {name}
          </span>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Attendance sidebar (teacher / mentor only) */}
        {canSeeAttendance && (
          <AttendanceSidebar
            registry={registry}
            myGroupId={groupId}
            role={role}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(p => !p)}
          />
        )}

        {/* ═══════════════════════════════════════════════════
            PRESENTATION PANEL (left, ~80%)
        ═══════════════════════════════════════════════════ */}
        <div className="flex flex-col relative bg-gray-950 flex-1 min-w-0">

          {/* URL bar (teacher only, no URL yet) */}
          {isStaff && !presentationUrl && (
            <div className="flex gap-2 p-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
              <input
                className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2 border border-gray-700 focus:border-blue-500 outline-none placeholder-gray-600"
                placeholder="Paste Canva share link or PDF URL to start presenting…"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setPresentationUrl(urlInput)}
              />
              <button
                onClick={() => setPresentationUrl(urlInput)}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ background: NAVY }}
              >Present</button>
            </div>
          )}

          {/* Slides / PDF */}
          <div className="relative flex-1 overflow-hidden">
            {embedUrl ? (
              <>
                <iframe src={embedUrl} className="w-full h-full border-0" allow="fullscreen" title="Presentation" allowFullScreen />
                <AnnotationCanvas mode={annotMode} canvasRef={canvasRef} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                <Monitor className="w-20 h-20 opacity-10" />
                <p className="text-sm">
                  {isStaff ? "Paste a Canva or PDF URL above to start presenting" : "Waiting for teacher to share slides…"}
                </p>
              </div>
            )}
          </div>

          {/* Annotation toolbar (teacher only) */}
          {isStaff && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-gray-800 flex-shrink-0">
              <span className="text-[10px] text-gray-500 font-semibold mr-1 uppercase tracking-wide">Annotate</span>
              {(["none", "pen", "highlighter"] as const).map(m => (
                <button key={m} onClick={() => setAnnotMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${annotMode === m
                    ? m === "pen" ? "bg-orange-600 text-white" : m === "highlighter" ? "bg-yellow-600 text-white" : "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  {m === "none" ? "Off" : m === "pen" ? "✏️ Pen" : "🖍️ Highlight"}
                </button>
              ))}
              <button onClick={clearAnnotations} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 ml-1">🗑 Clear</button>
              {presentationUrl && (
                <button onClick={() => { setPresentationUrl(""); setUrlInput(""); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 ml-auto">
                  <Settings className="w-3 h-3 inline mr-1" />Change Slide
                </button>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            RIGHT PANEL (20% fixed)
        ═══════════════════════════════════════════════════ */}
        <div className="flex flex-col border-l border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 240 }}>

          {/* Camera */}
          <div className="relative bg-black flex-shrink-0" style={{ height: 150 }}>
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ display: cameraOn ? "block" : "none" }} />
            {!cameraOn && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">👤</div>
                <p className="text-[10px] text-gray-600">{name}</p>
              </div>
            )}
            <button onClick={toggleCamera} className="absolute bottom-2 right-2 p-1.5 rounded-full bg-gray-800/80 text-gray-300 hover:bg-gray-700 transition-all">
              {cameraOn ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Raised hands (teacher/mentor) */}
          {canSeeAttendance && visibleHands.length > 0 && (
            <div className="px-3 py-1.5 bg-yellow-900/20 border-b border-yellow-800/30 flex-shrink-0">
              <p className="text-[10px] text-yellow-400 font-semibold">
                ✋ {visibleHands.slice(0, 4).map(h => h.name).join(", ")}
                {visibleHands.length > 4 ? ` +${visibleHands.length - 4}` : ""}
              </p>
            </div>
          )}

          {/* Panel tabs */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            <button onClick={() => setPanelMode("chat")}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${panelMode === "chat" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              <MessageSquare className="w-3 h-3" /> Chat
            </button>
            <button onClick={() => setPanelMode("poll")}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${panelMode === "poll" ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              <BarChart2 className="w-3 h-3" /> Poll {activePoll && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5" />}
            </button>
          </div>

          {/* ── CHAT ─────────────────────────────────────────── */}
          {panelMode === "chat" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Teacher controls */}
              {isStaff && (
                <div className="px-3 py-2 border-b border-gray-800 flex-shrink-0">
                  <button
                    onClick={() => toggleRaiseHandFeature(!raiseHandEnabled)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${raiseHandEnabled ? "bg-yellow-600/30 text-yellow-300 border border-yellow-700/30" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                    ✋ {raiseHandEnabled ? "Close Q&A" : "Open Q&A"}
                  </button>
                </div>
              )}

              {/* Messages — group-scoped label */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {chat.length === 0 && <p className="text-[11px] text-gray-600 text-center mt-6">No messages yet</p>}
                {chat.map(msg => (
                  <div key={msg.id} className={msg.isAnnouncement ? "bg-blue-900/20 rounded-lg px-2 py-1" : ""}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-gray-400">{msg.name}</span>
                      {(msg.role === "teacher" || msg.role === "admin") && <span className="text-[8px] bg-blue-900/60 text-blue-400 rounded px-1 font-bold">T</span>}
                      {msg.role === "mentor" && <span className="text-[8px] bg-purple-900/60 text-purple-400 rounded px-1 font-bold">M</span>}
                      {msg.isAnnouncement && <span className="text-[8px] bg-yellow-900/60 text-yellow-400 rounded px-1 font-bold">📢</span>}
                    </div>
                    <p className="text-xs text-gray-200 leading-snug break-words">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-2 border-t border-gray-800 flex gap-1.5 flex-shrink-0">
                <input
                  className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 outline-none placeholder-gray-600 focus:border-gray-600"
                  placeholder={isStaff ? "Announce to all…" : "Say something…"}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  maxLength={300}
                />
                <button onClick={sendChat} className="p-1.5 rounded-lg text-white" style={{ background: NAVY }}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Raise hand for students */}
              {!isStaff && !isMentor && raiseHandEnabled && (
                <div className="p-2 border-t border-gray-800 flex-shrink-0">
                  <button onClick={toggleHand}
                    className={`w-full py-2 text-xs font-bold rounded-xl transition-all ${myHandRaised ? "bg-yellow-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                    <Hand className="w-3 h-3 inline mr-1" />{myHandRaised ? "Lower Hand" : "Raise Hand"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── POLL ─────────────────────────────────────────── */}
          {panelMode === "poll" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {isStaff && !activePoll && (
                !showPollForm ? (
                  <button onClick={() => setShowPollForm(true)} className="w-full py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: ORANGE }}>
                    + Create Poll
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input className="w-full bg-gray-800 text-white text-xs rounded-xl px-3 py-2 border border-gray-700 outline-none placeholder-gray-600"
                      placeholder="Question…" value={pollQ} onChange={e => setPollQ(e.target.value)} />
                    {pollOpts.map((opt, i) => (
                      <input key={i} className="w-full bg-gray-800 text-white text-xs rounded-xl px-3 py-2 border border-gray-700 outline-none placeholder-gray-600"
                        placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
                        onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }} />
                    ))}
                    <div className="flex gap-2">
                      <button onClick={launchPoll} className="flex-1 py-2 text-xs font-bold text-white rounded-xl" style={{ background: ORANGE }}>🚀 Launch</button>
                      <button onClick={() => setShowPollForm(false)} className="px-3 py-2 text-xs text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700">Cancel</button>
                    </div>
                  </div>
                )
              )}

              {activePoll && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white leading-snug">{activePoll.question}</p>
                  {activePoll.options.map(opt => {
                    const count = pollCounts[opt.id] ?? 0;
                    const pct = pollTotal > 0 ? Math.round((count / pollTotal) * 100) : 0;
                    const chosen = myPollAnswer === opt.id;
                    return (
                      <button key={opt.id} onClick={() => submitPoll(opt.id)} disabled={!!myPollAnswer && !isStaff}
                        className={`w-full text-left rounded-xl px-3 py-2.5 text-xs font-semibold relative overflow-hidden transition-all ${chosen ? "text-white" : "text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:hover:bg-gray-800"}`}
                        style={chosen ? { background: NAVY } : {}}>
                        {isStaff && pollTotal > 0 && <div className="absolute inset-y-0 left-0 bg-blue-500/20 rounded-xl" style={{ width: `${pct}%` }} />}
                        <span className="relative flex justify-between">
                          <span>{opt.id}. {opt.text}</span>
                          {isStaff && pollTotal > 0 && <span className="text-gray-400 ml-2">{pct}%</span>}
                        </span>
                      </button>
                    );
                  })}
                  {isStaff && (
                    <button onClick={() => socket?.emit("showLeaderboard")}
                      className="w-full py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5" style={{ background: "#7C3AED" }}>
                      <Trophy className="w-3.5 h-3.5" /> Show Top 3
                    </button>
                  )}
                  {!isStaff && (
                    <p className={`text-xs text-center font-semibold ${myPollAnswer ? "text-green-400" : "text-gray-500"}`}>
                      {myPollAnswer ? "✓ Submitted!" : "Tap to answer"}
                    </p>
                  )}
                </div>
              )}

              {!activePoll && !showPollForm && !isStaff && (
                <p className="text-xs text-gray-600 text-center mt-8">No active poll</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard overlay (5s auto-close) ── */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="rounded-3xl p-8 text-center shadow-2xl" style={{ background: NAVY, minWidth: 300 }}>
            <div className="text-4xl mb-3">🏆</div>
            <h2 className="text-white font-black text-xl mb-1">Top Responders!</h2>
            <p className="text-blue-300 text-xs mb-5">Fastest correct answers</p>
            <div className="space-y-2">
              {leaderboard.map(e => (
                <div key={e.rank} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2">
                  <span className="text-2xl">{e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : "🥉"}</span>
                  <span className="text-white font-bold">{e.name}</span>
                </div>
              ))}
            </div>
            <p className="text-blue-400 text-xs mt-4 opacity-70">Auto-closes in 5s</p>
          </div>
        </div>
      )}

      {/* ── Payment FAB ── */}
      <button
        className="fixed bottom-5 right-5 flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-bold shadow-2xl z-40 hover:opacity-90 transition-all"
        style={{ background: ORANGE }}
        onClick={() => window.open("/enroll", "_blank")}
      >
        <CreditCard className="w-3.5 h-3.5" /> Upgrade Course
      </button>
    </div>
  );
}