import { Server } from "socket.io";
import type { Server as HttpServer } from "http";

// ── Types ──────────────────────────────────────────────────────
interface ChatMsg { id: string; name: string; role: string; text: string; ts: number; }
interface PollOpt { id: string; text: string; }
interface Poll { id: string; question: string; options: PollOpt[]; }

interface Room {
  chat: ChatMsg[];
  raisedHands: Map<string, string>; // socketId → displayName
  raiseHandEnabled: boolean;
  activePoll: Poll | null;
  pollAnswers: Map<string, { optionId: string; name: string; ts: number }>;
}

const rooms = new Map<string, Room>();

function getRoom(id: string): Room {
  if (!rooms.has(id)) {
    rooms.set(id, {
      chat: [],
      raisedHands: new Map(),
      raiseHandEnabled: false,
      activePoll: null,
      pollAnswers: new Map(),
    });
  }
  return rooms.get(id)!;
}

function topThree(room: Room) {
  if (!room.activePoll || room.pollAnswers.size === 0) return [];
  const counts: Record<string, number> = {};
  for (const a of room.pollAnswers.values()) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1;
  const topOpt = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topOpt) return [];
  return Array.from(room.pollAnswers.entries())
    .filter(([, a]) => a.optionId === topOpt)
    .sort((a, b) => a[1].ts - b[1].ts)
    .slice(0, 3)
    .map(([, a], i) => ({ name: a.name, rank: i + 1 }));
}

// ── Setup ──────────────────────────────────────────────────────
export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  io.on("connection", (socket) => {
    let currentRoomKey: string | null = null;
    let sessionId = "";
    let displayName = "Anonymous";
    let role = "student";

    socket.on("joinRoom", (data: { sessionId: string; name: string; userRole?: string }) => {
      sessionId = String(data.sessionId ?? "").slice(0, 100);
      displayName = String(data.name ?? "Anonymous").slice(0, 50);
      role = data.userRole ?? "student";
      currentRoomKey = `room:${sessionId}`;

      socket.join(currentRoomKey);
      const room = getRoom(sessionId);

      socket.emit("roomState", {
        chat: room.chat.slice(-50),
        raisedHands: Array.from(room.raisedHands.entries()).map(([sid, n]) => ({ sid, name: n })),
        raiseHandEnabled: room.raiseHandEnabled,
        activePoll: room.activePoll,
      });

      io.to(currentRoomKey).emit("userCount", io.sockets.adapter.rooms.get(currentRoomKey)?.size ?? 0);
    });

    socket.on("chatMessage", (data: { text: string }) => {
      if (!currentRoomKey || !data.text?.trim()) return;
      const room = getRoom(sessionId);
      const msg: ChatMsg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: displayName, role,
        text: String(data.text).trim().slice(0, 300),
        ts: Date.now(),
      };
      room.chat.push(msg);
      if (room.chat.length > 200) room.chat = room.chat.slice(-200);
      io.to(currentRoomKey).emit("chatMessage", msg);
    });

    socket.on("startPoll", (data: { question: string; options: string[] }) => {
      if (!currentRoomKey || (role !== "teacher" && role !== "admin")) return;
      const room = getRoom(sessionId);
      const opts = (data.options ?? []).filter(Boolean).slice(0, 6);
      if (!data.question?.trim() || opts.length < 2) return;
      room.activePoll = {
        id: `poll-${Date.now()}`,
        question: String(data.question).trim().slice(0, 200),
        options: opts.map((t, i) => ({ id: String.fromCharCode(65 + i), text: String(t).slice(0, 100) })),
      };
      room.pollAnswers = new Map();
      io.to(currentRoomKey).emit("pollStarted", room.activePoll);
    });

    socket.on("submitPoll", (data: { optionId: string }) => {
      if (!currentRoomKey) return;
      const room = getRoom(sessionId);
      if (!room.activePoll) return;
      room.pollAnswers.set(socket.id, { optionId: String(data.optionId), name: displayName, ts: Date.now() });
      const counts: Record<string, number> = {};
      for (const a of room.pollAnswers.values()) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1;
      socket.to(currentRoomKey).emit("pollUpdate", { counts, total: room.pollAnswers.size });
      socket.emit("pollSubmitted", { optionId: data.optionId });
    });

    socket.on("showLeaderboard", () => {
      if (!currentRoomKey || (role !== "teacher" && role !== "admin")) return;
      const room = getRoom(sessionId);
      io.to(currentRoomKey).emit("showLeaderboard", { top3: topThree(room) });
      room.activePoll = null;
      setTimeout(() => { if (currentRoomKey) io.to(currentRoomKey).emit("pollEnded"); }, 5500);
    });

    socket.on("raiseHand", (data: { raised: boolean }) => {
      if (!currentRoomKey) return;
      const room = getRoom(sessionId);
      if (!room.raiseHandEnabled) return;
      if (data.raised) room.raisedHands.set(socket.id, displayName);
      else room.raisedHands.delete(socket.id);
      io.to(currentRoomKey).emit("handsUpdate", Array.from(room.raisedHands.values()));
    });

    socket.on("toggleRaiseHand", (data: { enabled: boolean }) => {
      if (!currentRoomKey || (role !== "teacher" && role !== "admin")) return;
      const room = getRoom(sessionId);
      room.raiseHandEnabled = !!data.enabled;
      if (!room.raiseHandEnabled) room.raisedHands.clear();
      io.to(currentRoomKey).emit("raiseHandToggled", {
        enabled: room.raiseHandEnabled,
        hands: Array.from(room.raisedHands.values()),
      });
    });

    socket.on("attendanceHeartbeat", () => { socket.emit("heartbeatAck"); });

    socket.on("disconnect", () => {
      if (!currentRoomKey) return;
      const room = rooms.get(sessionId);
      if (room) room.raisedHands.delete(socket.id);
      const remaining = io.sockets.adapter.rooms.get(currentRoomKey)?.size ?? 0;
      io.to(currentRoomKey).emit("userCount", remaining);
      io.to(currentRoomKey).emit("handsUpdate", Array.from(room?.raisedHands.values() ?? []));
    });
  });

  return io;
}
