import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { io, type Socket } from "socket.io-client";
import {
  Video, VideoOff, Users, MessageSquare, BarChart2, Send,
  Trophy, CreditCard, Monitor, Hand, Settings,
} from "lucide-react";

const NAVY = "#0B2B6B";
const ORANGE = "#FF6B1A";

// ── Types ──────────────────────────────────────────────────────
interface ChatMsg { id: string; name: string; role: string; text: string; ts: number; }
interface PollOpt { id: string; text: string; }
interface Poll { id: string; question: string; options: PollOpt[]; }
interface LeaderboardEntry { name: string; rank: number; }

// ── Socket hook ────────────────────────────────────────────────
function useSocket(sessionId: string, name: string, role: string) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    setSocket(s);
    s.on("connect", () => {
      s.emit("joinRoom", { sessionId, name, userRole: role });
    });
    return () => { s.disconnect(); };
  }, [sessionId, name, role]);

  return socket;
}

// ── Helpers ────────────────────────────────────────────────────
function getEmbedUrl(url: string): string {
  if (!url.trim()) return "";
  try {
    if (url.includes("canva.com/design/")) {
      const u = new URL(url);
      if (!u.pathname.includes("/view")) {
        u.pathname = u.pathname.replace(/\/?$/, "/view");
      }
      u.searchParams.set("embed", "");
      return u.toString();
    }
  } catch { /* fall through */ }
  return url; // PDF or other
}

// ── Annotation canvas ──────────────────────────────────────────
function AnnotationCanvas({
  mode,
  canvasRef,
}: {
  mode: "none" | "pen" | "highlighter";
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
  const isDrawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / r.width;
    const scaleY = canvasRef.current!.height / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "none") return;
    isDrawing.current = true;
    last.current = getPos(e);
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !last.current || mode === "none" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (mode === "pen") {
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 22;
      ctx.globalAlpha = 0.35;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    last.current = pos;
  };

  const onUp = () => { isDrawing.current = false; last.current = null; };

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: mode !== "none" ? "auto" : "none",
        cursor: mode === "pen" ? "crosshair" : mode === "highlighter" ? "cell" : "default",
      }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function LiveClassroom() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "demo";
  const search = new URLSearchParams(window.location.search);
  const role = search.get("role") ?? "student";
  const name = search.get("name") ?? "Student";
  const sessionTitle = search.get("title") ?? `Live Class · ${sessionId}`;

  const socket = useSocket(sessionId, name, role);
  const isTeacher = role === "teacher" || role === "admin";

  // ── Presentation state ─────────────────────────────────────
  const [presentationUrl, setPresentationUrl] = useState(search.get("url") ?? "");
  const [urlInput, setUrlInput] = useState(search.get("url") ?? "");

  // ── Classroom state ────────────────────────────────────────
  const [panelMode, setPanelMode] = useState<"chat" | "poll">("chat");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [raiseHandEnabled, setRaiseHandEnabled] = useState(false);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [myPollAnswer, setMyPollAnswer] = useState<string | null>(null);
  const [pollCounts, setPollCounts] = useState<Record<string, number>>({});
  const [pollTotal, setPollTotal] = useState(0);

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      } catch { alert("Camera not available or permission denied."); }
    }
  }, [cameraOn]);

  // ── Poll form (teacher) ────────────────────────────────────
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpts, setPollOpts] = useState(["", "", "", ""]);

  // ── Chat auto-scroll ───────────────────────────────────────
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // ── Heartbeat ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const t = setInterval(() => socket.emit("attendanceHeartbeat"), 30_000);
    return () => clearInterval(t);
  }, [socket]);

  // ── Socket events ──────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on("roomState", (s: { chat: ChatMsg[]; raisedHands: { name: string }[]; raiseHandEnabled: boolean; activePoll: Poll | null }) => {
      setChat(s.chat);
      setRaisedHands(s.raisedHands.map(h => h.name));
      setRaiseHandEnabled(s.raiseHandEnabled);
      if (s.activePoll) { setActivePoll(s.activePoll); setPanelMode("poll"); }
    });
    socket.on("chatMessage", (msg: ChatMsg) => setChat(prev => [...prev, msg].slice(-100)));
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
    socket.on("handsUpdate", (hands: string[]) => setRaisedHands(hands));
    socket.on("raiseHandToggled", ({ enabled }: { enabled: boolean }) => {
      setRaiseHandEnabled(enabled);
      if (!enabled) setMyHandRaised(false);
    });
    socket.on("userCount", (count: number) => setUserCount(count));

    return () => {
      socket.off("roomState"); socket.off("chatMessage");
      socket.off("pollStarted"); socket.off("pollEnded");
      socket.off("pollUpdate"); socket.off("showLeaderboard");
      socket.off("handsUpdate"); socket.off("raiseHandToggled"); socket.off("userCount");
    };
  }, [socket]);

  // ── Actions ────────────────────────────────────────────────
  const sendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit("chatMessage", { text: chatInput.trim() });
    setChatInput("");
  };

  const submitPoll = (optionId: string) => {
    if (!socket || myPollAnswer) return;
    socket.emit("submitPoll", { optionId });
    setMyPollAnswer(optionId);
  };

  const launchPoll = () => {
    if (!socket) return;
    const opts = pollOpts.filter(o => o.trim());
    if (!pollQuestion.trim() || opts.length < 2) { alert("Add a question and at least 2 options"); return; }
    socket.emit("startPoll", { question: pollQuestion, options: opts });
    setShowPollForm(false); setPollQuestion(""); setPollOpts(["", "", "", ""]);
  };

  const showLeaderboard = () => socket?.emit("showLeaderboard");

  const toggleHand = () => {
    const next = !myHandRaised;
    setMyHandRaised(next);
    socket?.emit("raiseHand", { raised: next });
  };

  const toggleRaiseHandFeature = (enabled: boolean) => {
    socket?.emit("toggleRaiseHand", { enabled });
    setRaiseHandEnabled(enabled);
  };

  const embedUrl = getEmbedUrl(presentationUrl);

  // ── Role badge color ───────────────────────────────────────
  const roleBg = isTeacher ? "bg-blue-900/60 text-blue-300" : "bg-gray-800 text-gray-400";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-950" style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide">LIVE</span>
          </div>
          <span className="text-white font-bold text-sm truncate max-w-[300px]">{sessionTitle}</span>
          <span className="text-gray-600 text-xs">#{sessionId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" /> {userCount}
          </span>
          {isTeacher && annotMode !== "none" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold">
              {annotMode === "pen" ? "✏️ Pen" : "🖍️ Highlight"}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleBg}`}>
            {isTeacher ? "Teacher" : "Student"} · {name}
          </span>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════════════════════════════════════════════════════
            LEFT 80% — Presentation
        ════════════════════════════════════════════════════ */}
        <div className="flex flex-col relative bg-gray-950" style={{ width: "80%" }}>

          {/* URL input bar (teacher, no URL loaded) */}
          {isTeacher && !presentationUrl && (
            <div className="flex gap-2 p-3 bg-gray-900 border-b border-gray-800">
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
              >
                Present
              </button>
            </div>
          )}

          {/* Slides / PDF area */}
          <div className="relative flex-1 overflow-hidden">
            {embedUrl ? (
              <>
                <iframe
                  src={embedUrl}
                  className="w-full h-full border-0"
                  allow="fullscreen"
                  title="Presentation"
                  allowFullScreen
                />
                <AnnotationCanvas mode={annotMode} canvasRef={canvasRef} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                <Monitor className="w-20 h-20 opacity-10" />
                {isTeacher
                  ? <p className="text-sm">Paste a Canva or PDF URL above to begin presenting</p>
                  : <p className="text-sm">Waiting for teacher to share a presentation…</p>}
              </div>
            )}
          </div>

          {/* Annotation toolbar (teacher only) */}
          {isTeacher && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-t border-gray-800 flex-shrink-0">
              <span className="text-[10px] text-gray-500 font-semibold mr-1 uppercase tracking-wide">Annotate</span>
              {(["none", "pen", "highlighter"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setAnnotMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    annotMode === m
                      ? m === "pen" ? "bg-orange-600 text-white"
                        : m === "highlighter" ? "bg-yellow-600 text-white"
                        : "bg-gray-700 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {m === "none" ? "Off" : m === "pen" ? "✏️ Pen" : "🖍️ Highlight"}
                </button>
              ))}
              <button
                onClick={clearAnnotations}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-all"
              >
                🗑 Clear
              </button>
              {presentationUrl && (
                <button
                  onClick={() => { setPresentationUrl(""); setUrlInput(""); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-all ml-auto"
                >
                  <Settings className="w-3 h-3 inline mr-1" />Change Slide
                </button>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            RIGHT 20% — Side panel
        ════════════════════════════════════════════════════ */}
        <div className="flex flex-col border-l border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: "20%", minWidth: 220 }}>

          {/* Teacher camera preview */}
          <div className="relative bg-black flex-shrink-0" style={{ height: 160 }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ display: cameraOn ? "block" : "none" }}
            />
            {!cameraOn && (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">👤</div>
                <p className="text-[10px] text-gray-600">{name}</p>
              </div>
            )}
            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              title={cameraOn ? "Turn camera off" : "Turn camera on"}
              className="absolute bottom-2 right-2 p-1.5 rounded-full bg-gray-800/80 text-gray-300 hover:bg-gray-700 transition-all"
            >
              {cameraOn ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Panel tab bar */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            <button
              onClick={() => setPanelMode("chat")}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                panelMode === "chat" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <MessageSquare className="w-3 h-3" /> Chat
              {chat.length > 0 && panelMode !== "chat" && (
                <span className="bg-blue-500 text-white text-[8px] font-black rounded-full px-1 ml-0.5">
                  {chat.length > 99 ? "99+" : chat.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setPanelMode("poll")}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${
                panelMode === "poll" ? "border-orange-500 text-orange-400" : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              <BarChart2 className="w-3 h-3" /> Poll
              {activePoll && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-0.5" />}
            </button>
          </div>

          {/* ── CHAT PANEL ── */}
          {panelMode === "chat" && (
            <div className="flex flex-col flex-1 overflow-hidden">

              {/* Raised hands strip */}
              {raisedHands.length > 0 && (
                <div className="px-3 py-1.5 bg-yellow-900/20 border-b border-yellow-800/30 flex-shrink-0">
                  <p className="text-[10px] text-yellow-400 font-semibold leading-snug">
                    ✋ {raisedHands.slice(0, 3).join(", ")}
                    {raisedHands.length > 3 ? ` +${raisedHands.length - 3} more` : ""}
                  </p>
                </div>
              )}

              {/* Teacher controls */}
              {isTeacher && (
                <div className="px-3 py-2 border-b border-gray-800 flex-shrink-0">
                  <button
                    onClick={() => toggleRaiseHandFeature(!raiseHandEnabled)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                      raiseHandEnabled
                        ? "bg-yellow-600/30 text-yellow-300 border border-yellow-700/30"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    ✋ {raiseHandEnabled ? "Close Q&A" : "Open Q&A"}
                  </button>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {chat.length === 0 && (
                  <p className="text-[11px] text-gray-600 text-center mt-6">No messages yet</p>
                )}
                {chat.map(msg => (
                  <div key={msg.id}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-gray-400">{msg.name}</span>
                      {(msg.role === "teacher" || msg.role === "admin") && (
                        <span className="text-[8px] bg-blue-900/60 text-blue-400 rounded px-1 font-bold">T</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-200 leading-snug break-words">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="p-2 border-t border-gray-800 flex gap-1.5 flex-shrink-0">
                <input
                  className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 outline-none placeholder-gray-600 focus:border-gray-600"
                  placeholder="Say something…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  maxLength={300}
                />
                <button
                  onClick={sendChat}
                  className="p-1.5 rounded-lg text-white transition-all hover:opacity-80"
                  style={{ background: NAVY }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Raise hand (student) */}
              {!isTeacher && raiseHandEnabled && (
                <div className="p-2 border-t border-gray-800 flex-shrink-0">
                  <button
                    onClick={toggleHand}
                    className={`w-full py-2 text-xs font-bold rounded-xl transition-all ${
                      myHandRaised ? "bg-yellow-500 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <Hand className="w-3 h-3 inline mr-1" />
                    {myHandRaised ? "Lower Hand" : "Raise Hand"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── POLL PANEL ── */}
          {panelMode === "poll" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

              {/* Teacher: create poll */}
              {isTeacher && !activePoll && (
                <>
                  {!showPollForm ? (
                    <button
                      onClick={() => setShowPollForm(true)}
                      className="w-full py-2.5 text-sm font-bold text-white rounded-xl"
                      style={{ background: ORANGE }}
                    >
                      + Create Poll
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        className="w-full bg-gray-800 text-white text-xs rounded-xl px-3 py-2 border border-gray-700 outline-none placeholder-gray-600"
                        placeholder="Question…"
                        value={pollQuestion}
                        onChange={e => setPollQuestion(e.target.value)}
                      />
                      {pollOpts.map((opt, i) => (
                        <input
                          key={i}
                          className="w-full bg-gray-800 text-white text-xs rounded-xl px-3 py-2 border border-gray-700 outline-none placeholder-gray-600"
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          value={opt}
                          onChange={e => {
                            const next = [...pollOpts]; next[i] = e.target.value;
                            setPollOpts(next);
                          }}
                        />
                      ))}
                      <div className="flex gap-2">
                        <button
                          onClick={launchPoll}
                          className="flex-1 py-2 text-xs font-bold text-white rounded-xl"
                          style={{ background: ORANGE }}
                        >
                          🚀 Launch
                        </button>
                        <button
                          onClick={() => setShowPollForm(false)}
                          className="px-3 py-2 text-xs text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Active poll */}
              {activePoll && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white leading-snug">{activePoll.question}</p>
                  {activePoll.options.map(opt => {
                    const count = pollCounts[opt.id] ?? 0;
                    const pct = pollTotal > 0 ? Math.round((count / pollTotal) * 100) : 0;
                    const chosen = myPollAnswer === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => submitPoll(opt.id)}
                        disabled={!!myPollAnswer && !isTeacher}
                        className={`w-full text-left rounded-xl px-3 py-2.5 text-xs font-semibold relative overflow-hidden transition-all ${
                          chosen ? "text-white" : "text-gray-200 bg-gray-800 hover:bg-gray-700 disabled:hover:bg-gray-800"
                        }`}
                        style={chosen ? { background: NAVY } : {}}
                      >
                        {isTeacher && pollTotal > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500/20 rounded-xl"
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <span className="relative flex justify-between">
                          <span>{opt.id}. {opt.text}</span>
                          {isTeacher && pollTotal > 0 && (
                            <span className="text-gray-400 ml-2">{pct}%</span>
                          )}
                        </span>
                      </button>
                    );
                  })}

                  {isTeacher && (
                    <button
                      onClick={showLeaderboard}
                      className="w-full py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5"
                      style={{ background: "#7C3AED" }}
                    >
                      <Trophy className="w-3.5 h-3.5" /> Show Top 3
                    </button>
                  )}

                  {!isTeacher && (
                    <p className={`text-xs text-center font-semibold ${myPollAnswer ? "text-green-400" : "text-gray-500"}`}>
                      {myPollAnswer ? "✓ Submitted!" : "Tap to answer"}
                    </p>
                  )}
                </div>
              )}

              {!activePoll && !showPollForm && !isTeacher && (
                <p className="text-xs text-gray-600 text-center mt-8">No active poll</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard overlay (5 seconds) ── */}
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
