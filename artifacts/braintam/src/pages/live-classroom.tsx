import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { io, type Socket } from "socket.io-client";
import { useLiveKit } from "@/hooks/use-livekit";
import {
  Video, VideoOff, Users, MessageSquare, BarChart2, Send,
  Trophy, Monitor, Hand, Settings, ChevronLeft, ChevronRight, Mic, X, Upload,
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
interface LeaderboardEntry {
  name: string; rank: number;
  userId?: string; isCorrect?: boolean; responseTimeMs?: number;
}
interface RaisedHand { uid: string; name: string; mentorGroupId: string | null; }

// Sprint 3 — Stage overlay
interface StageSlot {
  studentId: string;
  studentName: string;
  slotNumber: number;
  isMuted: boolean;
  mentorGroupId: string | null;
  stageExpiresAt?: number | null;
}

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
      // Keep the full path (design ID + hash) — only replace the trailing
      // /edit or /view segment, then add /view?embed
      // e.g. /design/<id>/<hash>/edit  →  /design/<id>/<hash>/view?embed
      // e.g. /design/<id>/<hash>/view  →  /design/<id>/<hash>/view?embed
      const cleanPath = u.pathname.replace(/\/(edit|view)\/?$/, "");
      return `https://www.canva.com${cleanPath}/view?embed`;
    }
  } catch { /* fall through */ }
  return url;
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

// ── Annotation canvas ──────────────────────────────────────────
const PEN_COLORS = [
  { id: "orange", hex: "#FF6B1A", label: "Orange" },
  { id: "red",    hex: "#EF4444", label: "Red" },
  { id: "blue",   hex: "#3B82F6", label: "Blue" },
  { id: "green",  hex: "#22C55E", label: "Green" },
] as const;
type PenColorId = typeof PEN_COLORS[number]["id"];

function AnnotationCanvas({
  mode, penColor, canvasRef,
}: { mode: "none" | "pen" | "highlighter"; penColor: string; canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
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
    if (mode === "pen") { ctx.strokeStyle = penColor; ctx.lineWidth = 3; ctx.globalAlpha = 1; }
    else { ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 24; ctx.globalAlpha = 0.18; }
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

// ── Teacher Sidebar — present (LIVE) students only; mentor-suggested → purple top ──
function TeacherSidebar({
  registry, suggestedStudents, collapsed, onCollapse, onGiveMic, stageSlots,
}: {
  registry: Map<string, AttendanceRecord>;
  suggestedStudents: Set<string>;
  collapsed: boolean;
  onCollapse: () => void;
  onGiveMic: (s: AttendanceRecord) => void;
  stageSlots: StageSlot[];
}) {
  const [search, setSearch] = useState("");
  const liveStudents = Array.from(registry.values()).filter(s => s.status === "LIVE");
  const sorted = [...liveStudents].sort((a, b) => {
    const as_ = suggestedStudents.has(a.userId) ? 0 : 1;
    const bs_ = suggestedStudents.has(b.userId) ? 0 : 1;
    if (as_ !== bs_) return as_ - bs_;
    return a.name.localeCompare(b.name);
  });
  const q = search.trim().toLowerCase();
  const filtered = q ? sorted.filter(s => s.name.toLowerCase().includes(q)) : sorted;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 border-r border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 40 }}>
        <button onClick={onCollapse} className="text-gray-500 hover:text-gray-300 mb-3">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div style={{ color: GREEN }} className="text-xs font-bold">{liveStudents.length}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 200 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">
          Present ({liveStudents.length})
        </span>
        <button onClick={onCollapse} className="text-gray-500 hover:text-gray-300">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="px-2 py-1.5 border-b border-gray-800">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search student…"
          className="w-full bg-gray-800 text-white text-[10px] rounded-md px-2 py-1 border border-gray-700 outline-none placeholder-gray-600 focus:border-gray-600"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="text-[10px] text-gray-600 text-center mt-6">No students present</p>}
        {filtered.map(s => {
          const isSuggested = suggestedStudents.has(s.userId);
          const alreadyOnStage = stageSlots.some(sl => sl.studentId === s.userId);
          const stageFull = stageSlots.length >= 5;
          return (
            <div key={s.userId} className={`px-3 py-2 border-b border-gray-800/50 ${isSuggested ? "bg-purple-900/20" : "hover:bg-gray-800/40"}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isSuggested ? "#A855F7" : GREEN }} />
                <span className={`text-[11px] font-semibold truncate flex-1 ${isSuggested ? "text-purple-200" : "text-gray-200"}`}>
                  {s.name}
                </span>
                {isSuggested && <span className="text-[8px] text-purple-400 flex-shrink-0 font-bold">★</span>}
                {alreadyOnStage ? (
                  <span className="text-[8px] text-green-400 font-bold flex-shrink-0">🎤</span>
                ) : (
                  <button
                    disabled={stageFull}
                    onClick={() => onGiveMic(s)}
                    title="Give Mic"
                    className={`flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded font-bold transition-all flex-shrink-0 ${stageFull ? "text-gray-600 cursor-not-allowed" : "bg-green-800/50 text-green-300 hover:bg-green-700/60"}`}
                  ><Mic className="w-2.5 h-2.5" /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {suggestedStudents.size > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-800 flex-shrink-0">
          <span className="text-[9px] text-purple-400">🟣 = Mentor suggested</span>
        </div>
      )}
    </div>
  );
}

// ── Mentor Sidebar — group stats + absent call buttons ─────────
function MentorSidebar({
  registry, myGroupId, collapsed, onCollapse,
}: {
  registry: Map<string, AttendanceRecord>;
  myGroupId: string;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const myStudents  = Array.from(registry.values()).filter(s => s.mentorGroupId === myGroupId);
  const live        = myStudents.filter(s => s.status === "LIVE").length;
  const backstage   = myStudents.filter(s => s.status === "BACKSTAGE").length;
  const absent      = myStudents.filter(s => s.status === "ABSENT").length;
  const absentList  = myStudents.filter(s => s.status === "ABSENT");
  const presentList = myStudents.filter(s => s.status !== "ABSENT");

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 border-r border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 40 }}>
        <button onClick={onCollapse} className="text-gray-500 hover:text-gray-300 mb-3">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="space-y-1 text-center">
          <div style={{ color: GREEN }} className="text-xs font-bold">{live}</div>
          <div style={{ color: YELLOW }} className="text-xs font-bold">{backstage}</div>
          <div className="text-xs font-bold text-red-400">{absent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 200 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide">
          Group {myGroupId || "—"}
        </span>
        <button onClick={onCollapse} className="text-gray-500 hover:text-gray-300">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex flex-col items-center py-2 border-r border-gray-800">
          <span className="text-base font-black" style={{ color: GREEN }}>{live}</span>
          <span className="text-[8px] font-semibold" style={{ color: GREEN }}>Live</span>
        </div>
        <div className="flex flex-col items-center py-2 border-r border-gray-800">
          <span className="text-base font-black" style={{ color: YELLOW }}>{backstage}</span>
          <span className="text-[8px] font-semibold" style={{ color: YELLOW }}>Away</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="text-base font-black text-red-400">{absent}</span>
          <span className="text-[8px] font-semibold text-red-600">Absent</span>
        </div>
      </div>
      {absentList.length > 0 && (
        <div className="border-b border-gray-800 flex-shrink-0 max-h-36 overflow-y-auto">
          <p className="text-[9px] text-red-400 font-bold px-3 pt-1.5 pb-0.5 uppercase tracking-wide">📞 Call Absent</p>
          {absentList.map(s => (
            <div key={s.userId} className="flex items-center justify-between px-3 py-1 hover:bg-gray-800/40">
              <span className="text-[10px] text-gray-300 truncate flex-1">{s.name}</span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleOutbound(s.phone, "TEL")} title="Call"
                  className="text-[8px] bg-blue-900/50 text-blue-300 hover:bg-blue-800 px-1.5 py-0.5 rounded font-bold">📞</button>
                <button onClick={() => handleOutbound(s.phone, "WA")} title="WhatsApp"
                  className="text-[8px] bg-green-900/50 text-green-300 hover:bg-green-800 px-1.5 py-0.5 rounded font-bold">WA</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {presentList.length === 0 && <p className="text-[10px] text-gray-600 text-center mt-4">No students live</p>}
        {presentList.map(s => (
          <div key={s.userId} className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-800/50 hover:bg-gray-800/40">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: s.status === "LIVE" ? GREEN : YELLOW }} />
            <span className="text-[10px] text-gray-300 truncate">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics helper ───────────────────────────────────────────
function trackEvent(
  event: string,
  sessionId: string,
  userId: string,
  role: string,
  metadata: Record<string, unknown> = {}
) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, sessionId, userId, role, metadata }),
  }).catch(() => {/* fire-and-forget */});
}

// ── Main page ──────────────────────────────────────────────────
export default function LiveClassroom() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "demo";
  const search = new URLSearchParams(window.location.search);

  const role          = (search.get("role") ?? "student").toLowerCase();
  const rawName       = search.get("name") ?? "Student";
  // Staff/mentors get their role prefixed for on-screen display (e.g. "teacher priya", "mentor moses");
  // students are shown by name only (e.g. "devik manhas").
  const name          = role === "student" ? rawName : `${role} ${rawName}`;
  const userId        = search.get("userId") ?? `u-${rawName.toLowerCase().replace(/\s+/g, "-")}`;
  const groupId       = search.get("groupId") ?? "";
  const phone         = search.get("phone") ?? "";
  const title         = search.get("title") ?? `Live Class · ${sessionId}`;
  const meetLink      = search.get("meetLink") ?? "";      // Sprint 2 — Join Meet button
  const recordingUrl  = search.get("recordingUrl") ?? "";  // Sprint 2 — View Recording button

  const { socket, connected } = useClassroomSocket(sessionId, userId, name, role, groupId, phone);
  const isStaff  = role === "teacher" || role === "admin";
  const isMentor = role === "mentor";
  const canSeeAttendance = isStaff || isMentor;

  // ── LiveKit — teacher/student video, backend-authorized ─────
  const livekit = useLiveKit({ sessionId, enabled: connected });

  // ── State ──────────────────────────────────────────────────
  const [presentationUrl, setPresentationUrl] = useState(search.get("url") ?? "");
  const [urlInput, setUrlInput] = useState(search.get("url") ?? "");
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [panelMode, setPanelMode] = useState<"chat" | "poll" | "staffchat">("chat");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatBlocked, setChatBlocked] = useState(false);
  const [chatWarning, setChatWarning] = useState<{ message: string; strikeCount: number } | null>(null);
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

  // Mentor-suggested students (purple highlight, sorted to top in teacher sidebar)
  const [suggestedStudents, setSuggestedStudents] = useState<Set<string>>(new Set());

  // Staff Chat (teacher ↔ mentor private channel)
  const [staffChat, setStaffChat] = useState<Array<{ id: string; name: string; role: string; text: string; ts: number }>>([]);
  const [staffChatInput, setStaffChatInput] = useState("");

  // ── Sprint 3: Stage state ─────────────────────────────────
  const [stageSlots, setStageSlots] = useState<StageSlot[]>([]);

  // ── Teacher presence (shown in camera panel for all roles) ──
  const [teacherInfo, setTeacherInfo] = useState<{ name: string; userId: string; online: boolean } | null>(
    isStaff ? { name, userId, online: true } : null
  );

  // ── Mic invite (Give Mic flow) ────────────────────────────
  const [micInvite, setMicInvite] = useState<{ studentId: string; studentName: string; fromTeacher: string } | null>(null);

  // ── Payment badge (draggable, student + mentor only) ─────
  const grade        = search.get("grade") ?? "3";
  const programName  = search.get("programName") ?? "Mastery Program";
  const origPrice    = search.get("originalPrice") ?? "24000";
  const salePrice    = search.get("scholarshipPrice") ?? "12000";
  const payLink      = search.get("paymentLink") ?? "/enroll";
  const [showBrochure, setShowBrochure] = useState(false);
  const [badgeDismissed, setBadgeDismissed] = useState(false);
  const [badgePos, setBadgePos] = useState({ x: 0, y: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  // Initialise position once after first render
  const badgeInitDone = useRef(false);
  useEffect(() => {
    if (!badgeInitDone.current) {
      setBadgePos({ x: window.innerWidth - 150, y: window.innerHeight / 2 - 30 });
      badgeInitDone.current = true;
    }
  }, []);
  const onBadgePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - badgePos.x, y: e.clientY - badgePos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [badgePos]);
  const onBadgePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setBadgePos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  }, []);
  const onBadgePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging.current) {
      isDragging.current = false;
      // If barely moved, treat as click → open brochure
      const dx = Math.abs(e.clientX - (badgePos.x + dragOffset.current.x));
      const dy = Math.abs(e.clientY - (badgePos.y + dragOffset.current.y));
      if (dx < 5 && dy < 5) {
        setShowBrochure(true);
        trackEvent("popup_opened", sessionId, userId, role, { grade, programName });
      }
    }
  }, [badgePos, sessionId, userId, role, grade, programName]);

  // ── Annotation ─────────────────────────────────────────────
  const [annotMode, setAnnotMode] = useState<"none" | "pen" | "highlighter">("none");
  const [penColorId, setPenColorId] = useState<PenColorId>("orange");
  const penColor = PEN_COLORS.find(c => c.id === penColorId)?.hex ?? ORANGE;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clearAnnotations = useCallback(() => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }, []);

  // ── Slide upload ────────────────────────────────────────────
  const cleanupUploadedSlide = useCallback(async (filename: string) => {
    try {
      await fetch(`/api/slides/${filename}`, { method: "DELETE" });
    } catch { /* best-effort */ }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/slides/upload", { method: "POST", body: formData });
      if (!res.ok) { alert("Upload failed — file may be too large or wrong type."); return; }
      const data = await res.json() as { filename: string; fileUrl: string; isPptx: boolean };

      // Cleanup previous uploaded file if any
      if (uploadedFilename) void cleanupUploadedSlide(uploadedFilename);
      setUploadedFilename(data.filename);

      if (data.isPptx) {
        // Use Office Online viewer for PPT/PPTX
        const publicBase = window.location.origin;
        const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicBase + data.fileUrl)}`;
        setPresentationUrl(embedUrl);
      } else {
        // PDF — serve directly from our server (same origin, browser renders natively)
        setPresentationUrl(data.fileUrl);
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadedFilename, cleanupUploadedSlide]);

  // ── Slide navigation (arrow buttons) ───────────────────────
  const navigateSlide = useCallback((dir: "prev" | "next") => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Try to focus the iframe and send an arrow key event
    iframe.focus();
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.dispatchEvent(new KeyboardEvent("keydown", {
        key: dir === "next" ? "ArrowRight" : "ArrowLeft",
        code: dir === "next" ? "ArrowRight" : "ArrowLeft",
        bubbles: true, cancelable: true,
      }));
    } catch { /* cross-origin — Canva has own nav */ }
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
      if (isStaff) { void livekit.setCamera(false); }
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCameraOn(true);
        // Teacher's camera publishes into LiveKit so students/mentors can see them.
        if (isStaff) { void livekit.setCamera(true); }
      } catch { alert("Camera unavailable"); }
    }
  }, [cameraOn, isStaff, livekit]);

  // ── Mic (independent of camera — teacher must be able to talk without video) ──
  const toggleMic = useCallback(async () => {
    if (!isStaff) return;
    const next = !livekit.micPublishing;
    await livekit.setMic(next);
  }, [isStaff, livekit]);

  // ── Poll form (Sprint 1 — includes correct answer) ────────
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", "", "", ""]);
  const [pollCorrectIdx, setPollCorrectIdx] = useState<number | null>(null); // index into pollOpts
  const [myPollCorrect, setMyPollCorrect] = useState<boolean | null>(null);  // feedback after submit

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

    socket.on("roomState", (s: {
      chat: ChatMsg[]; raisedHands: RaisedHand[]; raiseHandEnabled: boolean;
      activePoll: Poll | null; stage?: StageSlot[];
      teacher?: { name: string; userId: string } | null;
    }) => {
      setChat(s.chat);
      setRaisedHands(s.raisedHands);
      setRaiseHandEnabled(s.raiseHandEnabled);
      if (s.activePoll) { setActivePoll(s.activePoll); setPanelMode("poll"); }
      if (s.stage) setStageSlots(s.stage);
      // Only update teacherInfo from roomState if we're not the teacher (teacher sets own info at mount)
      if (!isStaff && s.teacher) {
        setTeacherInfo({ name: s.teacher.name, userId: s.teacher.userId, online: true });
      }
    });

    socket.on("chat:message", (msg: ChatMsg) => setChat(p => [...p, msg].slice(-100)));
    socket.on("chat:blocked", () => {
      setChatBlocked(true);
    });
    socket.on("chat:warning", (data: { message: string; strikeCount: number }) => {
      setChatWarning(data);
      setTimeout(() => setChatWarning(null), 6000);
    });

    socket.on("pollStarted", (poll: Poll) => {
      setActivePoll(poll); setMyPollAnswer(null); setPollCounts({}); setPollTotal(0); setPanelMode("poll");
    });
    socket.on("pollEnded", () => { setActivePoll(null); setMyPollAnswer(null); setMyPollCorrect(null); setPanelMode("chat"); });
    socket.on("pollUpdate", ({ counts, total }: { counts: Record<string, number>; total: number }) => {
      setPollCounts(counts); setPollTotal(total);
    });
    socket.on("showLeaderboard", ({ top3, leaderboard: full }: { top3: LeaderboardEntry[]; leaderboard?: LeaderboardEntry[] }) => {
      // Group-scoped Top 20 when available (student/mentor view), fall back to top3 for older payloads.
      setLeaderboard(full && full.length > 0 ? full : top3);
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

    socket.on("pollSubmitted", ({ optionId, isCorrect }: { optionId: string; isCorrect: boolean }) => {
      setMyPollAnswer(optionId);
      setMyPollCorrect(isCorrect);
    });

    // ── Sprint 3: Stage events ────────────────────────────────
    socket.on("stage:studentInvited", (slot: StageSlot) => {
      setStageSlots(prev => {
        const filtered = prev.filter(s => s.studentId !== slot.studentId);
        return [...filtered, slot].sort((a, b) => a.slotNumber - b.slotNumber);
      });
      // Backend already granted this student LiveKit publish rights for the 60s window — start publishing.
      if (slot.studentId === userId && !isStaff) {
        void livekit.setCamera(true);
        void livekit.setMic(!slot.isMuted);
      }
    });
    socket.on("stage:muteStateChanged", ({ studentId, isMuted }: { studentId: string; isMuted: boolean }) => {
      setStageSlots(prev => prev.map(s => s.studentId === studentId ? { ...s, isMuted } : s));
      if (studentId === userId && !isStaff) void livekit.setMic(!isMuted);
    });
    socket.on("stage:studentRemoved", ({ studentId }: { studentId: string }) => {
      setStageSlots(prev => prev.filter(s => s.studentId !== studentId));
      if (studentId === userId && !isStaff) {
        void livekit.setCamera(false);
        void livekit.setMic(false);
      }
    });
    socket.on("stage:error", ({ message }: { message: string }) => alert(message));

    // ── Teacher presence ──────────────────────────────────────
    socket.on("teacher:joined", (d: { name: string; userId: string }) => {
      setTeacherInfo({ name: d.name, userId: d.userId, online: true });
    });
    socket.on("teacher:left", (d: { name: string; userId: string }) => {
      setTeacherInfo(prev => prev ? { ...prev, online: false } : { name: d.name, userId: d.userId, online: false });
    });

    // ── Give Mic invite (student sees accept dialog) ──────────
    socket.on("stage:micInvite", (d: { studentId: string; studentName: string; fromTeacher: string }) => {
      if (d.studentId === userId && !isStaff && !isMentor) {
        setMicInvite(d);
      }
    });

    // ── Attendance snapshot — handle server response ──────────
    socket.on("attendance:snapshot", ({ students }: { students: AttendanceRecord[] }) => {
      students.forEach(s => upsert(s));
    });

    // ── Mentor suggests student → silent purple highlight in teacher's list ──
    socket.on("teacher:studentSuggested", ({ studentId }: { studentId: string }) => {
      setSuggestedStudents(prev => new Set([...prev, studentId]));
    });

    // ── Staff Chat (teacher ↔ mentor private) ─────────────────
    socket.on("staffChat:message", (msg: { id: string; name: string; role: string; text: string; ts: number }) => {
      setStaffChat(prev => [...prev, msg].slice(-150));
    });

    // ── Class ended — redirect everyone out ──────────────────
    socket.on("class:ended", () => {
      setTimeout(() => {
        window.location.href = isStaff ? "/teacher" : "/dashboard";
      }, 3500);
    });

    // ── Attendance 5-second heartbeat ─────────────────────────
    const attendanceTick = setInterval(() => {
      if (canSeeAttendance) socket.emit("request:attendance");
    }, 5000);

    return () => {
      clearInterval(attendanceTick);
      socket.off("roomState"); socket.off("chat:message");
      socket.off("pollStarted"); socket.off("pollEnded"); socket.off("pollUpdate");
      socket.off("showLeaderboard"); socket.off("studentJoined"); socket.off("studentReturned");
      socket.off("studentBackstage"); socket.off("classroom:handRaised");
      socket.off("raiseHandToggled"); socket.off("pollSubmitted");
      socket.off("stage:studentInvited"); socket.off("stage:muteStateChanged");
      socket.off("stage:studentRemoved"); socket.off("stage:error");
      socket.off("teacher:joined"); socket.off("teacher:left");
      socket.off("stage:micInvite");
      socket.off("attendance:snapshot");
      socket.off("class:ended");
      socket.off("teacher:studentSuggested");
      socket.off("staffChat:message");
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
    // correctOptionId is the letter (A, B, C…) of the correct option
    const correctOptionId = pollCorrectIdx !== null
      ? String.fromCharCode(65 + pollCorrectIdx)
      : undefined;
    socket.emit("startPoll", { question: pollQ, options: opts, correctOptionId });
    setShowPollForm(false); setPollQ(""); setPollOpts(["", "", "", ""]); setPollCorrectIdx(null);
  };

  const toggleHand = () => {
    socket?.emit("student:raiseHand");
    setMyHandRaised(p => !p);
  };

  const toggleRaiseHandFeature = (enabled: boolean) => socket?.emit("toggleRaiseHand", { enabled });

  const sendStaffChat = () => {
    if (!socket || !staffChatInput.trim()) return;
    socket.emit("staffChat:send", staffChatInput.trim());
    setStaffChatInput("");
  };

  const suggestToTeacher = (h: RaisedHand) => {
    socket?.emit("mentor:suggestStudent", { studentId: h.uid, studentName: h.name });
  };

  // ── Sprint 3: Stage actions ───────────────────────────────
  const approveToStage = (hand: RaisedHand) => {
    socket?.emit("stage:approveStudent", {
      studentId: hand.uid,
      studentName: hand.name,
      studentGroupId: hand.mentorGroupId ?? "",
    });
  };
  const inviteToStage = (s: AttendanceRecord) => {
    socket?.emit("stage:inviteStudent", {
      studentId: s.userId,
      studentName: s.name,
      studentGroupId: s.mentorGroupId ?? "",
    });
  };
  const acceptMicInvite = () => {
    socket?.emit("stage:acceptInvite");
    setMicInvite(null);
  };
  const toggleStageMute = (studentId: string, isMuted: boolean) => {
    socket?.emit("stage:toggleMute", { studentId, isMuted });
  };
  const removeFromStage = (studentId: string) => {
    socket?.emit("stage:removeStudent", { studentId });
  };

  // Visible hands (mentor: only their group; staff: all)
  const visibleHands = raisedHands.filter(h => {
    if (isStaff) return true;
    if (isMentor) return h.mentorGroupId === groupId;
    return false;
  });

  // ── Sprint 3: derived stage helpers ──────────────────────
  const mySlot = stageSlots.find(s => s.studentId === userId);
  const myOnStage = !!mySlot;

  // Backend-authoritative 60s stage countdown (stageExpiresAt is set by the server; we only render the tick).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (stageSlots.length === 0) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stageSlots.length]);
  const secondsLeft = (slot: StageSlot | undefined): number | null => {
    if (!slot?.stageExpiresAt) return null;
    const ms = slot.stageExpiresAt - nowTick;
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  };

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
          {/* Sprint 2 — Meet + Recording quick-access */}
          {meetLink && (
            <a href={meetLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: "#1A73E8" }}>
              📹 Join Meet
            </a>
          )}
          {recordingUrl && (
            <a href={recordingUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ background: "#7C3AED" }}>
              🎬 Recording
            </a>
          )}
          {/* End Class — teacher only */}
          {isStaff && (
            <button
              onClick={() => {
                if (window.confirm("End class for everyone? This will disconnect all students and mentors.")) {
                  if (uploadedFilename) void cleanupUploadedSlide(uploadedFilename);
                  socket?.emit("class:end");
                }
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#DC2626" }}
            >
              ⏹ End Class
            </button>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isStaff ? "bg-blue-900/60 text-blue-300" : isMentor ? "bg-purple-900/60 text-purple-300" : "bg-gray-800 text-gray-400"}`}>
            {isStaff ? "Teacher" : isMentor ? "Mentor" : "Student"} · {name}
          </span>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — teacher sees present-only list; mentor sees group stats */}
        {isStaff && (
          <TeacherSidebar
            registry={registry}
            suggestedStudents={suggestedStudents}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(p => !p)}
            onGiveMic={inviteToStage}
            stageSlots={stageSlots}
          />
        )}
        {isMentor && (
          <MentorSidebar
            registry={registry}
            myGroupId={groupId}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed(p => !p)}
          />
        )}

        {/* ═══════════════════════════════════════════════════
            PRESENTATION PANEL (left, ~80%)
        ═══════════════════════════════════════════════════ */}
        <div className="flex flex-col relative bg-gray-950 flex-1 min-w-0">

          {/* URL bar + Upload (teacher only, no URL yet) */}
          {isStaff && !presentationUrl && (
            <div className="flex gap-2 p-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); e.target.value = ""; }}
              />
              <input
                className="flex-1 bg-gray-800 text-white text-sm rounded-xl px-4 py-2 border border-gray-700 focus:border-blue-500 outline-none placeholder-gray-600"
                placeholder="Canva: Share → Embed link   |   or paste a PDF URL"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setPresentationUrl(urlInput)}
              />
              <button
                onClick={() => setPresentationUrl(urlInput)}
                disabled={!urlInput.trim()}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-40"
                style={{ background: NAVY }}
              >Present</button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Upload PDF or PPT"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "#059669" }}
              >
                {isUploading
                  ? <span className="animate-spin text-base">⏳</span>
                  : <Upload className="w-4 h-4" />}
                <span>{isUploading ? "Uploading…" : "Upload PPT/PDF"}</span>
              </button>
            </div>
          )}

          {/* Slides / PDF */}
          <div className="relative flex-1 overflow-hidden">
            {embedUrl ? (
              <iframe ref={iframeRef} src={embedUrl} className="w-full h-full border-0" allow="fullscreen" title="Presentation" allowFullScreen />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-4">
                <Monitor className="w-20 h-20 opacity-10" />
                <p className="text-sm">
                  {isStaff ? "Paste a Canva or PDF URL above to start presenting" : "Waiting for teacher to share slides…"}
                </p>
              </div>
            )}
            {/* Annotation canvas — always present so pen/highlight/clear always work */}
            {isStaff && <AnnotationCanvas mode={annotMode} penColor={penColor} canvasRef={canvasRef} />}

            {/* Sprint 3 — "You're on stage" banner for invited students */}
            {myOnStage && !isStaff && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-green-700/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
                🎤 You're on stage
                <span className="text-green-200 font-normal">{mySlot?.isMuted ? "— muted" : "— mic on"}</span>
                {secondsLeft(mySlot) !== null && (
                  <span className="text-white font-black bg-green-900/60 px-2 py-0.5 rounded-full">{secondsLeft(mySlot)}s</span>
                )}
              </div>
            )}

            {/* Sprint 3 — Dynamic 5-slot stage overlay */}
            {stageSlots.length > 0 && (
              <div data-testid="stage-overlay" className="absolute bottom-4 left-4 right-4 flex gap-2 justify-center z-40 pointer-events-none">
                {stageSlots.map(slot => (
                  <div
                    key={slot.studentId}
                    data-testid="stage-slot"
                    data-student-id={slot.studentId}
                    className="w-28 rounded-xl overflow-hidden shadow-2xl pointer-events-auto flex flex-col border-2 relative"
                    style={{ background: "#0f172a", borderColor: slot.studentId === userId ? "#10B981" : "#334155" }}>
                    {/* LiveKit video for this staged student, avatar fallback until they publish */}
                    <div className="h-12 flex items-center justify-center bg-gray-900/80 relative overflow-hidden">
                      <video
                        key={`${slot.studentId}-${livekit.trackVersion}`}
                        ref={(el) => livekit.attachParticipantVideo(slot.studentId, el)}
                        autoPlay
                        playsInline
                        muted={slot.studentId === userId}
                        className="w-full h-full object-cover absolute inset-0"
                        style={{ display: livekit.stagePublishers.has(slot.studentId) ? "block" : "none" }}
                      />
                      {!livekit.stagePublishers.has(slot.studentId) && (
                        <div className="text-xl select-none">👤</div>
                      )}
                    </div>

                    {/* Name + mute bar */}
                    <div className="px-1.5 py-1 bg-black/70 flex items-center justify-between gap-1">
                      <span className="text-[9px] text-white font-semibold truncate flex-1">{slot.studentName}</span>
                      <span className="text-[10px]">{slot.isMuted ? "🔇" : "🔊"}</span>
                    </div>

                    {/* Teacher controls — always visible (no hover dependency) */}
                    {isStaff && (
                      <div className="flex justify-center gap-1 bg-gray-900/90 px-1 py-1">
                        <button
                          data-testid={`stage-mute-${slot.studentId}`}
                          onClick={() => toggleStageMute(slot.studentId, !slot.isMuted)}
                          className="text-[8px] bg-gray-700 hover:bg-gray-500 text-white px-1.5 py-0.5 rounded font-bold">
                          {slot.isMuted ? "Unmute" : "Mute"}
                        </button>
                        <button
                          data-testid={`stage-remove-${slot.studentId}`}
                          onClick={() => removeFromStage(slot.studentId)}
                          className="text-[8px] bg-red-700 hover:bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Slot number badge */}
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-blue-600/80 flex items-center justify-center text-[8px] text-white font-black">
                      {slot.slotNumber}
                    </div>

                    {/* Backend-authoritative countdown */}
                    {secondsLeft(slot) !== null && (
                      <div className="absolute top-1 left-6 text-[8px] font-black text-white bg-black/60 px-1 rounded">
                        {secondsLeft(slot)}s
                      </div>
                    )}

                    {/* "You" badge */}
                    {slot.studentId === userId && (
                      <div className="absolute top-1 right-1 text-[8px] bg-green-600 text-white px-1 rounded font-bold">You</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Annotation toolbar (teacher only) */}
          {isStaff && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-t border-gray-800 flex-shrink-0 flex-wrap">
              <span className="text-[10px] text-gray-500 font-semibold mr-1 uppercase tracking-wide">Annotate</span>
              {(["none", "pen", "highlighter"] as const).map(m => (
                <button key={m} onClick={() => setAnnotMode(m)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${annotMode === m
                    ? m === "pen" ? "bg-orange-600 text-white" : m === "highlighter" ? "bg-yellow-500 text-black" : "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                  {m === "none" ? "Off" : m === "pen" ? "✏️ Pen" : "🖍️ Highlight"}
                </button>
              ))}
              {/* Pen color swatches — only visible in pen mode */}
              {annotMode === "pen" && (
                <div className="flex items-center gap-1 ml-1 border-l border-gray-700 pl-2">
                  {PEN_COLORS.map(c => (
                    <button
                      key={c.id}
                      title={c.label}
                      onClick={() => setPenColorId(c.id)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${penColorId === c.id ? "border-white scale-110" : "border-transparent hover:border-gray-400"}`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              )}
              <button onClick={clearAnnotations} className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 ml-1">🗑 Clear</button>
              {presentationUrl && (
                <>
                  {/* ‹ › slide navigation — always visible when presenting */}
                  <div className="flex items-center gap-1 ml-auto border-l border-gray-700 pl-3">
                    <button
                      onClick={() => navigateSlide("prev")}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-600 text-white transition-all active:scale-95"
                      title="Previous slide">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => navigateSlide("next")}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-600 text-white transition-all active:scale-95"
                      title="Next slide">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => { setPresentationUrl(""); setUrlInput(""); if (uploadedFilename) { void cleanupUploadedSlide(uploadedFilename); setUploadedFilename(null); } }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 ml-2">
                    <Settings className="w-3 h-3 inline mr-1" />Change Slide
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            RIGHT PANEL (20% fixed)
        ═══════════════════════════════════════════════════ */}
        <div className="flex flex-col border-l border-gray-800 bg-gray-900 flex-shrink-0" style={{ width: 300 }}>

          {/* ── Teacher Camera Panel (all roles see teacher here) ── */}
          <div className="relative bg-black flex-shrink-0" style={{ height: 190 }}>
            {/* Label */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
              <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Teacher</span>
            </div>

            {isStaff ? (
              /* ── Teacher sees their own camera ── */
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ display: cameraOn ? "block" : "none" }} />
                {!cameraOn && (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">👤</div>
                    <p className="text-[10px] text-gray-500">Teacher</p>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                  <button onClick={toggleMic} className="p-1.5 rounded-full transition-all" style={{ background: livekit.micPublishing ? GREEN : "rgba(31,41,55,0.8)", color: livekit.micPublishing ? "white" : "#d1d5db" }} title={livekit.micPublishing ? "Mute microphone" : "Unmute microphone"}>
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={toggleCamera} className="p-1.5 rounded-full bg-gray-800/80 text-gray-300 hover:bg-gray-700 transition-all" title={cameraOn ? "Turn off camera" : "Turn on camera"}>
                    {cameraOn ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {((cameraOn && !livekit.cameraPublishing) || (livekit.micPublishing && !livekit.connected)) && (
                  <span className="absolute bottom-2 left-2 text-[8px] text-yellow-400 font-bold">connecting…</span>
                )}
              </>
            ) : teacherInfo ? (
              teacherInfo.online ? (
                /* ── Teacher is live — real LiveKit video when published, avatar fallback otherwise ── */
                <>
                  <video
                    ref={livekit.teacherVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ display: livekit.teacherPresent ? "block" : "none" }}
                  />
                  <audio ref={livekit.teacherAudioRef} autoPlay />
                  {!livekit.teacherPresent && (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl">👤</div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                      </div>
                      <p className="text-[11px] text-white font-semibold">Teacher</p>
                      <p className="text-[9px] text-gray-500">Camera off</p>
                    </div>
                  )}
                </>
              ) : (
                /* ── Teacher disconnected — reconnecting placeholder ── */
                <div className="flex flex-col items-center justify-center h-full gap-2 px-3 text-center">
                  <div className="relative">
                    {/* Pulsing ring */}
                    <span className="absolute inset-0 rounded-full animate-ping bg-yellow-500/30" />
                    <div className="relative w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl opacity-60">👤</div>
                  </div>
                  <p className="text-[10px] text-gray-300 font-semibold">Teacher</p>
                  <p className="text-[9px] text-yellow-400 leading-tight font-bold">📡 Teacher is reconnecting…</p>
                  <p className="text-[8px] text-gray-500 leading-tight">Stream will restore automatically</p>
                </div>
              )
            ) : (
              /* ── Teacher hasn't joined yet ── */
              <div className="flex flex-col items-center justify-center h-full gap-2 px-3 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800/60 flex items-center justify-center text-2xl opacity-40">👤</div>
                <p className="text-[10px] text-gray-500 leading-tight">Waiting for teacher to join…</p>
              </div>
            )}
          </div>

          {/* Raised hands queue (teacher/mentor) — Sprint 3: approve to stage */}
          {canSeeAttendance && visibleHands.length > 0 && (
            <div className="border-b border-yellow-800/30 flex-shrink-0 max-h-32 overflow-y-auto">
              <p className="text-[9px] text-yellow-400 font-bold px-3 pt-1.5 pb-0.5 uppercase tracking-wide">
                ✋ Q&A Queue ({visibleHands.length})
              </p>
              {visibleHands.map(h => {
                const alreadyOnStage = stageSlots.some(s => s.studentId === h.uid);
                const stageFull = stageSlots.length >= 5;
                const isSuggested = suggestedStudents.has(h.uid);
                return (
                  <div key={h.uid} className={`flex items-center justify-between px-3 py-1 ${isSuggested ? "bg-purple-900/20" : "hover:bg-yellow-900/10"}`}>
                    <span className="text-[10px] text-yellow-300 truncate max-w-[90px]">{h.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isStaff && !alreadyOnStage && !stageFull && (
                        <button
                          onClick={() => approveToStage(h)}
                          className="text-[9px] bg-green-700 hover:bg-green-600 text-white px-1.5 py-0.5 rounded font-bold"
                          title="Approve to stage">
                          → Stage
                        </button>
                      )}
                      {isMentor && !isSuggested && (
                        <button
                          onClick={() => suggestToTeacher(h)}
                          className="text-[9px] bg-purple-800 hover:bg-purple-700 text-purple-200 px-1.5 py-0.5 rounded font-bold"
                          title="Suggest to teacher">
                          ★ Suggest
                        </button>
                      )}
                      {isMentor && isSuggested && (
                        <span className="text-[9px] text-purple-400 font-bold">★ Sent</span>
                      )}
                      {alreadyOnStage && (
                        <span className="text-[9px] text-green-400">On stage</span>
                      )}
                      {isStaff && stageFull && !alreadyOnStage && (
                        <span className="text-[9px] text-gray-500">Full</span>
                      )}
                    </div>
                  </div>
                );
              })}
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
            {(isStaff || isMentor) && (
              <button onClick={() => setPanelMode("staffchat")}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold border-b-2 transition-all ${panelMode === "staffchat" ? "border-purple-500 text-purple-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                🔒 Staff
              </button>
            )}
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

              {/* Messages — students only see own mentor + teacher */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {chat.length === 0 && <p className="text-[11px] text-gray-600 text-center mt-6">No messages yet</p>}
                {chat
                  .filter(msg => {
                    // Teacher/mentor see everything
                    if (isStaff || isMentor) return true;
                    // Students: always see teacher/admin messages
                    if (msg.role === "teacher" || msg.role === "admin") return true;
                    // Students: hide other mentors' messages (server already routes,
                    // but filter here for safety on initial load)
                    if (msg.role === "mentor" && (msg as any).mentorGroupId != null && (msg as any).mentorGroupId !== groupId) return false;
                    return true;
                  })
                  .map(msg => (
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

              {/* Chat warning toast */}
              {chatWarning && (
                <div className={`mx-2 mb-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border flex-shrink-0 ${chatWarning.strikeCount >= 2 ? "bg-red-900/40 border-red-700 text-red-300" : "bg-yellow-900/40 border-yellow-700 text-yellow-300"}`}>
                  {chatWarning.message}
                </div>
              )}

              {/* Blocked banner or chat input */}
              {!isStaff && chatBlocked ? (
                <div className="mx-2 mb-2 px-3 py-2.5 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-xs font-medium flex-shrink-0 text-center">
                  🚫 Your chat access is temporarily disabled. Please contact your mentor.
                </div>
              ) : (
                <div className="p-2 border-t border-gray-800 flex gap-1.5 flex-shrink-0">
                  <input
                    className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 outline-none placeholder-gray-600 focus:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder={isStaff ? "Announce to all…" : "Say something…"}
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    maxLength={300}
                    disabled={!isStaff && chatBlocked}
                  />
                  <button onClick={sendChat} disabled={!isStaff && chatBlocked} className="p-1.5 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: NAVY }}>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
                    {/* Sprint 1 — options with correct-answer radio */}
                    <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide">Options · tap ✓ to mark correct</p>
                    {pollOpts.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isCorrect = pollCorrectIdx === i;
                      return (
                        <div key={i} className="flex gap-1.5 items-center">
                          <button
                            onClick={() => setPollCorrectIdx(isCorrect ? null : i)}
                            className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-black border transition-all ${isCorrect ? "bg-green-500 border-green-400 text-white" : "border-gray-600 text-gray-500 hover:border-green-600"}`}
                            title="Mark as correct answer"
                          >✓</button>
                          <input
                            className={`flex-1 bg-gray-800 text-white text-xs rounded-xl px-3 py-2 border outline-none placeholder-gray-600 ${isCorrect ? "border-green-600" : "border-gray-700"}`}
                            placeholder={`Option ${letter}`} value={opt}
                            onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }}
                          />
                        </div>
                      );
                    })}
                    {pollCorrectIdx === null && (
                      <p className="text-[9px] text-yellow-600">No correct answer marked — all responses score equally</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={launchPoll} className="flex-1 py-2 text-xs font-bold text-white rounded-xl" style={{ background: ORANGE }}>🚀 Launch</button>
                      <button onClick={() => { setShowPollForm(false); setPollCorrectIdx(null); }} className="px-3 py-2 text-xs text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700">Cancel</button>
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
                    <p className={`text-xs text-center font-semibold ${
                      myPollAnswer
                        ? myPollCorrect === true
                          ? "text-green-400"
                          : myPollCorrect === false
                          ? "text-red-400"
                          : "text-blue-400"
                        : "text-gray-500"
                    }`}>
                      {myPollAnswer
                        ? myPollCorrect === true
                          ? "✓ Correct!"
                          : myPollCorrect === false
                          ? "✗ Wrong answer"
                          : "✓ Submitted!"
                        : "Tap to answer"}
                    </p>
                  )}
                </div>
              )}

              {!activePoll && !showPollForm && !isStaff && (
                <p className="text-xs text-gray-600 text-center mt-8">No active poll</p>
              )}
            </div>
          )}

          {/* ── STAFF CHAT (teacher ↔ mentor private) ──────────── */}
          {panelMode === "staffchat" && (isStaff || isMentor) && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-gray-800 flex-shrink-0">
                <p className="text-[9px] text-purple-400 font-semibold uppercase tracking-wide">
                  🔒 Private staff channel — not visible to students
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {staffChat.length === 0 && (
                  <p className="text-[11px] text-gray-600 text-center mt-6">No messages yet</p>
                )}
                {staffChat.map(msg => (
                  <div key={msg.id}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-purple-400">{msg.name}</span>
                      <span className={`text-[8px] rounded px-1 font-bold ${msg.role === "mentor" ? "bg-purple-900/60 text-purple-400" : "bg-blue-900/60 text-blue-400"}`}>
                        {msg.role === "mentor" ? "M" : "T"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 leading-snug break-words">{msg.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 px-2 py-2 border-t border-gray-800 flex-shrink-0">
                <input
                  value={staffChatInput}
                  onChange={e => setStaffChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendStaffChat()}
                  placeholder="Message staff…"
                  className="flex-1 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 border border-gray-700 focus:border-purple-600 outline-none placeholder-gray-600"
                />
                <button onClick={sendStaffChat} disabled={!staffChatInput.trim()}
                  className="p-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-40 transition-all flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Leaderboard overlay (5s auto-close, group-scoped Top 20) ── */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="rounded-3xl p-8 text-center shadow-2xl" style={{ background: NAVY, minWidth: 320, maxHeight: "80vh" }}>
            <div className="text-4xl mb-3">🏆</div>
            <h2 className="text-white font-black text-xl mb-1">Top Responders!</h2>
            <p className="text-blue-300 text-xs mb-5">Fastest correct answers · Top {leaderboard.length}</p>
            <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: "50vh" }}>
              {leaderboard.map(e => (
                <div key={e.rank} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-1.5">
                  <span className="text-lg w-6 text-center">
                    {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : e.rank}
                  </span>
                  <span className="text-white font-bold flex-1 text-left text-sm">{e.name}</span>
                </div>
              ))}
            </div>
            <p className="text-blue-400 text-xs mt-4 opacity-70">Auto-closes in 5s</p>
          </div>
        </div>
      )}

      {/* ── Mic Invite Dialog (student: teacher gave mic) ── */}
      {micInvite && (
        <div className="fixed inset-0 flex items-end justify-center pb-24 z-50 pointer-events-none">
          <div className="pointer-events-auto animate-bounce-once rounded-2xl shadow-2xl border border-green-700/50 px-5 py-4 flex flex-col items-center gap-3 max-w-xs w-full mx-4"
            style={{ background: "linear-gradient(135deg,#0d2247,#0B2B6B)" }}>
            <div className="text-3xl">🎤</div>
            <p className="text-white font-bold text-sm text-center">
              {micInvite.fromTeacher} invited you on stage!
            </p>
            <p className="text-blue-300 text-[11px] text-center">You'll be muted by default. Accept to join the stage.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={acceptMicInvite}
                className="flex-1 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90"
                style={{ background: GREEN }}
              >
                ✓ Accept
              </button>
              <button
                onClick={() => setMicInvite(null)}
                className="flex-1 py-2 text-sm font-bold text-gray-300 rounded-xl bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Draggable Payment Badge (student + mentor only) ── */}
      {!isStaff && !badgeDismissed && (
        <div
          ref={badgeRef}
          data-testid="payment-badge"
          className="fixed z-40 select-none"
          style={{ left: badgePos.x, top: badgePos.y, touchAction: "none" }}
          onPointerDown={onBadgePointerDown}
          onPointerMove={onBadgePointerMove}
          onPointerUp={onBadgePointerUp}
        >
          <div className="rounded-full shadow-2xl border border-orange-500/60 px-3 py-2 flex items-center gap-2 text-white text-[10px] font-bold whitespace-nowrap cursor-grab active:cursor-grabbing"
            style={{ background: "linear-gradient(135deg,#FF6B1A,#c84b00)" }}>
            <span className="text-base">🚀</span>
            <span>Grade {grade} {programName}</span>
            {/* Dismiss — stops propagation so it doesn't trigger brochure open */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setBadgeDismissed(true); }}
              className="ml-1 w-4 h-4 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-[9px] text-white/80 hover:text-white transition-all flex-shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Payment Brochure Popup ── */}
      {showBrochure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm"
            style={{ background: "linear-gradient(160deg,#0a1f44 0%,#0B2B6B 60%,#1a0533 100%)" }}>
            {/* Close */}
            <button onClick={() => { setShowBrochure(false); trackEvent("popup_closed", sessionId, userId, role, { grade }); }}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Top graphic strip */}
            <div className="h-2 w-full" style={{ background: "linear-gradient(90deg,#FF6B1A,#ffd700,#FF6B1A)" }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-3 text-center">
              <div className="inline-flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/40 rounded-full px-3 py-1 mb-3">
                <span className="text-[10px] text-orange-300 font-bold uppercase tracking-wide">🌟 Scholarship Offer · Grade {grade}</span>
              </div>
              <h2 className="text-white font-black text-xl leading-tight">
                {programName}
              </h2>
              <p className="text-blue-300 text-xs mt-1">Full Academic Year · Expert Teachers · 1-on-1 Mentorship</p>
            </div>

            {/* Price block */}
            <div className="mx-6 rounded-2xl p-4 mb-4 text-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,107,26,0.3)" }}>
              <p className="text-gray-400 text-[11px] mb-1">Original Price</p>
              <p className="text-gray-500 text-sm line-through">₹{Number(origPrice).toLocaleString("en-IN")}</p>
              <div className="my-2 flex items-center justify-center gap-2">
                <span className="text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">50% OFF</span>
              </div>
              <p className="text-white font-black text-3xl">₹{Number(salePrice).toLocaleString("en-IN")}</p>
              <p className="text-orange-300 text-[10px] mt-1 font-semibold">🔥 Limited seats · Scholarship valid now</p>
            </div>

            {/* Features */}
            <div className="mx-6 mb-5 space-y-2">
              {[
                { icon: "🧑‍🏫", text: "Best teachers from across India" },
                { icon: "🤝", text: "1-on-1 mentor support throughout the year" },
                { icon: "📅", text: "Full academic year coverage" },
                { icon: "📊", text: "Weekly tests & personalised reports" },
                { icon: "🎯", text: "Grade " + grade + " aligned curriculum" },
                { icon: "💻", text: "Live + recorded classes, accessible anytime" },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-2.5">
                  <span className="text-base flex-shrink-0">{f.icon}</span>
                  <span className="text-gray-200 text-[11px]">{f.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6">
              <a
                href={payLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  trackEvent("cta_clicked", sessionId, userId, role, { grade, programName, salePrice });
                  trackEvent("payment_started", sessionId, userId, role, { grade, programName, salePrice, payLink });
                }}
                className="block w-full py-3 text-center text-white font-black text-sm rounded-2xl shadow-lg transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(90deg,#FF6B1A,#e05500)" }}>
                🎓 Grab My Seat Now
              </a>
              <p className="text-gray-500 text-[10px] text-center mt-2">No hidden charges · Secure payment</p>
            </div>

            {/* Bottom graphic */}
            <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#FF6B1A,#ffd700,#FF6B1A)" }} />
          </div>
        </div>
      )}

    </div>
  );
}