import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { db } from "@workspace/db";
import {
  sessionAttendanceTable,
  pollAnalyticsTable,
  leaderboardAnalyticsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

// ── Room naming ────────────────────────────────────────────────
const globalRoom = (sid: string) => `session-${sid}`;
const teacherRoom = (sid: string) => `session-${sid}-teachers`;
const groupRoom = (sid: string, gid: string | number) => `session-${sid}-grp-${gid}`;

// ── Types ──────────────────────────────────────────────────────
interface CacheEntry {
  lastSeenAt: Date;
  currentStatus: "LIVE" | "BACKSTAGE" | "ABSENT";
  name: string;
  mentorGroupId: string | null;
  phone: string | null;
  sessionId: string;
  userId: string;
  role: string;
}

interface PollOpt { id: string; text: string; }
interface Poll {
  id: string;
  question: string;
  options: PollOpt[];
  startedAt: number;
}

interface PollAnswer {
  optionId: string;
  optionText: string;
  name: string;
  userId: string;
  responseTimeMs: number;
  ts: number;
}

interface ChatMsg {
  id: string;
  name: string;
  role: string;
  text: string;
  isAnnouncement: boolean;
  ts: number;
}

interface SessionRoom {
  chat: ChatMsg[];
  raisedHands: Map<string, { name: string; mentorGroupId: string | null }>;
  raiseHandEnabled: boolean;
  activePoll: Poll | null;
  pollAnswers: Map<string, PollAnswer>;
}

// ── In-memory caches ───────────────────────────────────────────
// Key: `${sessionId}-${userId}`
const liveStateCache = new Map<string, CacheEntry>();
const sessionRooms = new Map<string, SessionRoom>();

function getSessionRoom(sid: string): SessionRoom {
  if (!sessionRooms.has(sid)) {
    sessionRooms.set(sid, {
      chat: [],
      raisedHands: new Map(),
      raiseHandEnabled: false,
      activePoll: null,
      pollAnswers: new Map(),
    });
  }
  return sessionRooms.get(sid)!;
}

// ── Status derivation ──────────────────────────────────────────
function deriveStatus(entry: CacheEntry): "LIVE" | "BACKSTAGE" | "ABSENT" {
  if (!entry.lastSeenAt) return "ABSENT";
  const delta = (Date.now() - entry.lastSeenAt.getTime()) / 1000;
  return delta <= 15 ? "LIVE" : "BACKSTAGE";
}

// ── Leaderboard helper ─────────────────────────────────────────
function computeTop3(room: SessionRoom): Array<{ name: string; rank: number; userId: string; optionId: string; responseTimeMs: number }> {
  if (!room.activePoll || room.pollAnswers.size === 0) return [];
  const counts: Record<string, number> = {};
  for (const a of room.pollAnswers.values()) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1;
  const topOpt = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topOpt) return [];
  return Array.from(room.pollAnswers.values())
    .filter(a => a.optionId === topOpt)
    .sort((a, b) => a.responseTimeMs - b.responseTimeMs)
    .slice(0, 3)
    .map((a, i) => ({ name: a.name, rank: i + 1, userId: a.userId, optionId: a.optionId, responseTimeMs: a.responseTimeMs }));
}

// ── DB helpers (fire-and-forget) ───────────────────────────────
function upsertAttendanceHeartbeat(sessionId: string, userId: string, name: string, mentorGroupId: string | null, role: string) {
  const now = new Date();
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;

  db.insert(sessionAttendanceTable)
    .values({
      sessionId: sid,
      studentId: userId,
      studentName: name,
      mentorGroupId: mentorGroupId ? Number(mentorGroupId) : undefined,
      role,
      joinedAt: now,
      lastSeenAt: now,
      totalDurationSeconds: 0,
    })
    .onConflictDoUpdate({
      target: [sessionAttendanceTable.sessionId, sessionAttendanceTable.studentId],
      set: {
        lastSeenAt: now,
        totalDurationSeconds: sql`${sessionAttendanceTable.totalDurationSeconds} + 15`,
      },
    })
    .catch(() => { /* non-critical */ });
}

function markLeft(sessionId: string, userId: string) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;
  const now = new Date();
  db.update(sessionAttendanceTable)
    .set({ leftAt: now })
    .where(and(eq(sessionAttendanceTable.sessionId, sid), eq(sessionAttendanceTable.studentId, userId)))
    .catch(() => { /* non-critical */ });
}

function persistPollAnswer(sessionId: string, poll: Poll, answer: PollAnswer) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;
  const optText = poll.options.find(o => o.id === answer.optionId)?.text ?? "";
  db.insert(pollAnalyticsTable)
    .values({
      sessionId: sid,
      pollId: poll.id,
      pollQuestion: poll.question,
      studentId: answer.userId,
      studentName: answer.name,
      optionId: answer.optionId,
      optionText: optText,
      responseTimeMs: answer.responseTimeMs,
      answeredAt: new Date(),
    })
    .catch(() => { /* non-critical */ });
}

function persistLeaderboard(sessionId: string, pollId: string, top3: ReturnType<typeof computeTop3>) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid) || top3.length === 0) return;
  db.insert(leaderboardAnalyticsTable)
    .values(top3.map(e => ({
      sessionId: sid,
      pollId,
      rank: e.rank,
      studentId: e.userId,
      studentName: e.name,
      optionId: e.optionId,
      responseTimeMs: e.responseTimeMs,
      recordedAt: new Date(),
    })))
    .catch(() => { /* non-critical */ });
}

// ── Setup ──────────────────────────────────────────────────────
export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  // ── Auth middleware — context from handshake query ──────────
  io.use((socket, next) => {
    const q = socket.handshake.query;
    (socket as any).ctx = {
      sessionId: String(q["sessionId"] ?? ""),
      userId:    String(q["userId"] ?? `anon-${Math.random().toString(36).slice(2)}`),
      role:      String(q["role"] ?? "student").toLowerCase(),
      groupId:   q["groupId"] ? String(q["groupId"]) : null,
      name:      String(q["name"] ?? "Student").slice(0, 50),
      phone:     q["phone"] ? String(q["phone"]) : null,
    };
    next();
  });

  // ── 5-second backstage sweeper ─────────────────────────────
  setInterval(() => {
    const now = Date.now();
    for (const [cacheKey, entry] of liveStateCache.entries()) {
      if (entry.currentStatus === "LIVE") {
        const delta = (now - entry.lastSeenAt.getTime()) / 1000;
        if (delta > 15) {
          entry.currentStatus = "BACKSTAGE";
          io.to(teacherRoom(entry.sessionId))
            .to(entry.mentorGroupId ? groupRoom(entry.sessionId, entry.mentorGroupId) : teacherRoom(entry.sessionId))
            .emit("studentBackstage", {
              userId: entry.userId,
              name: entry.name,
              mentorGroupId: entry.mentorGroupId,
              timestamp: new Date(),
            });
        }
      }
    }
  }, 5000);

  io.on("connection", (socket) => {
    const ctx = (socket as any).ctx as {
      sessionId: string; userId: string; role: string;
      groupId: string | null; name: string; phone: string | null;
    };

    const { sessionId, userId, role, groupId, name, phone } = ctx;
    const isStaff = role === "teacher" || role === "admin";
    const isMentor = role === "mentor";

    // ── Join socket rooms ─────────────────────────────────────
    socket.join(globalRoom(sessionId));
    if (isStaff) {
      socket.join(teacherRoom(sessionId));
    } else if (groupId) {
      socket.join(groupRoom(sessionId, groupId));
    }

    // ── Send initial room state to joiner ─────────────────────
    const room = getSessionRoom(sessionId);
    socket.emit("roomState", {
      chat: room.chat.slice(-50),
      raisedHands: Array.from(room.raisedHands.entries()).map(([uid, h]) => ({ uid, ...h })),
      raiseHandEnabled: room.raiseHandEnabled,
      activePoll: room.activePoll,
    });

    // ── Heartbeat (students only, every 15s) ──────────────────
    socket.on("heartbeat:ping", () => {
      if (isStaff) return; // teachers/admins don't need attendance tracking
      const now = new Date();
      const cacheKey = `${sessionId}-${userId}`;
      const prev = liveStateCache.get(cacheKey);
      const prevStatus = prev?.currentStatus ?? "ABSENT";

      liveStateCache.set(cacheKey, {
        lastSeenAt: now,
        currentStatus: "LIVE",
        name, mentorGroupId: groupId, phone, sessionId, userId, role,
      });

      // Persist to DB
      upsertAttendanceHeartbeat(sessionId, userId, name, groupId, role);

      // Emit state transition event only on change
      if (prevStatus !== "LIVE") {
        const eventType = prevStatus === "BACKSTAGE" ? "studentReturned" : "studentJoined";
        const payload = { userId, name, mentorGroupId: groupId, phone, lastSeenAt: now };
        io.to(teacherRoom(sessionId))
          .to(groupId ? groupRoom(sessionId, groupId) : teacherRoom(sessionId))
          .emit(eventType, payload);
      }

      socket.emit("heartbeat:ack");
    });

    // ── Chat message ──────────────────────────────────────────
    socket.on("chat:send", (rawText: string) => {
      const text = String(rawText ?? "").replace(/[<>]/g, "").trim().slice(0, 300);
      if (!text) return;

      const msg: ChatMsg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name, role, text,
        isAnnouncement: isStaff,
        ts: Date.now(),
      };

      room.chat.push(msg);
      if (room.chat.length > 200) room.chat = room.chat.slice(-200);

      if (isStaff) {
        // Teacher/Admin announcement → everyone
        io.to(globalRoom(sessionId)).emit("chat:message", msg);
      } else if (groupId) {
        // Mentor/Student → their group + mirror to teachers
        io.to(groupRoom(sessionId, groupId))
          .to(teacherRoom(sessionId))
          .emit("chat:message", msg);
      } else {
        socket.emit("chat:message", msg);
      }
    });

    // ── Raise hand (student) ──────────────────────────────────
    socket.on("student:raiseHand", () => {
      if (!room.raiseHandEnabled) return;
      const raised = room.raisedHands.has(userId);
      if (raised) {
        room.raisedHands.delete(userId);
      } else {
        room.raisedHands.set(userId, { name, mentorGroupId: groupId });
      }
      const payload = { userId, name, mentorGroupId: groupId, raised: !raised, ts: new Date() };
      io.to(groupId ? groupRoom(sessionId, groupId) : globalRoom(sessionId))
        .to(teacherRoom(sessionId))
        .emit("classroom:handRaised", payload);
    });

    // ── Toggle raise hand (teacher) ───────────────────────────
    socket.on("toggleRaiseHand", (data: { enabled: boolean }) => {
      if (!isStaff) return;
      room.raiseHandEnabled = !!data.enabled;
      if (!room.raiseHandEnabled) room.raisedHands.clear();
      io.to(globalRoom(sessionId)).emit("raiseHandToggled", {
        enabled: room.raiseHandEnabled,
        hands: [],
      });
    });

    // ── Poll: start (teacher) ─────────────────────────────────
    socket.on("startPoll", (data: { question: string; options: string[] }) => {
      if (!isStaff) return;
      const opts = (data.options ?? []).filter(Boolean).slice(0, 6);
      if (!data.question?.trim() || opts.length < 2) return;
      room.activePoll = {
        id: `poll-${Date.now()}`,
        question: String(data.question).trim().slice(0, 200),
        options: opts.map((t, i) => ({ id: String.fromCharCode(65 + i), text: String(t).slice(0, 100) })),
        startedAt: Date.now(),
      };
      room.pollAnswers = new Map();
      io.to(globalRoom(sessionId)).emit("pollStarted", room.activePoll);
    });

    // ── Poll: submit answer (student) ─────────────────────────
    socket.on("submitPoll", (data: { optionId: string }) => {
      if (!room.activePoll || room.pollAnswers.has(userId)) return;
      const responseTimeMs = Date.now() - room.activePoll.startedAt;
      const answer: PollAnswer = {
        optionId: String(data.optionId),
        optionText: room.activePoll.options.find(o => o.id === data.optionId)?.text ?? "",
        name, userId, responseTimeMs, ts: Date.now(),
      };
      room.pollAnswers.set(userId, answer);

      // Persist answer
      persistPollAnswer(sessionId, room.activePoll, answer);

      // Live counts to teacher
      const counts: Record<string, number> = {};
      for (const a of room.pollAnswers.values()) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1;
      io.to(teacherRoom(sessionId)).emit("pollUpdate", { counts, total: room.pollAnswers.size });
      socket.emit("pollSubmitted", { optionId: data.optionId });
    });

    // ── Show leaderboard (teacher) ────────────────────────────
    socket.on("showLeaderboard", () => {
      if (!isStaff || !room.activePoll) return;
      const top3 = computeTop3(room);
      const pollId = room.activePoll.id;

      // Persist leaderboard
      persistLeaderboard(sessionId, pollId, top3);

      // Broadcast to everyone for 5s, then close poll
      io.to(globalRoom(sessionId)).emit("showLeaderboard", { top3 });
      room.activePoll = null;
      setTimeout(() => io.to(globalRoom(sessionId)).emit("pollEnded"), 5500);
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (!isStaff) {
        markLeft(sessionId, userId);
        const cacheKey = `${sessionId}-${userId}`;
        const entry = liveStateCache.get(cacheKey);
        if (entry) entry.currentStatus = "ABSENT";
      }
      room.raisedHands.delete(userId);
    });
  });

  return io;
}
