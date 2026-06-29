import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { db } from "@workspace/db";
import {
  sessionAttendanceTable,
  pollAnalyticsTable,
  leaderboardAnalyticsTable,
  chatMessagesTable,
  stageSlotsTable,
  blockedWordsTable,
  chatViolationsTable,
  chatModerationTable,
} from "@workspace/db";
import { eq, and, sql, gt, desc } from "drizzle-orm";

// ── Room naming ────────────────────────────────────────────────
const globalRoom  = (sid: string) => `session-${sid}`;
const teacherRoom = (sid: string) => `session-${sid}-teachers`;
const groupRoom   = (sid: string, gid: string | number) => `session-${sid}-grp-${gid}`;

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
  correctOptionId: string | null;   // teacher-set correct answer; never sent to students
}

interface PollAnswer {
  optionId: string;
  optionText: string;
  name: string;
  userId: string;
  mentorGroupId: string | null;
  isCorrect: boolean;
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
  raisedHands: Map<string, { name: string; mentorGroupId: string | null }>;
  raiseHandEnabled: boolean;
  activePoll: Poll | null;
  pollAnswers: Map<string, PollAnswer>;
  stageSlots: Map<string, StageSlotEntry>;  // key = studentId
  teacher: { name: string; userId: string } | null;
}

interface StageSlotEntry {
  studentId: string;
  studentName: string;
  slotNumber: number;
  isMuted: boolean;
  mentorGroupId: string | null;
}

// ── In-memory caches ───────────────────────────────────────────
const liveStateCache = new Map<string, CacheEntry>();
const sessionRooms   = new Map<string, SessionRoom>();

// ── Chat Moderation caches ──────────────────────────────────────
// blockedWordSet: lowercased active blocked words, refreshed every 60s
let blockedWordSet: Set<string> = new Set();
async function refreshBlockedWords(): Promise<void> {
  try {
    const rows = await db
      .select({ word: blockedWordsTable.word })
      .from(blockedWordsTable)
      .where(eq(blockedWordsTable.isActive, true));
    blockedWordSet = new Set(rows.map(r => r.word.toLowerCase()));
  } catch { /* keep old set on error */ }
}

// chatModerationCache: per-student status loaded on join, invalidated on strike
interface ChatModerationEntry {
  chatStatus: string;  // 'active' | 'blocked'
  chatViolationCount: number;
}
const chatModerationCache = new Map<string, ChatModerationEntry>();

async function loadChatStatus(studentId: string): Promise<ChatModerationEntry> {
  try {
    const [row] = await db
      .select({
        chatStatus: chatModerationTable.chatStatus,
        chatViolationCount: chatModerationTable.chatViolationCount,
      })
      .from(chatModerationTable)
      .where(eq(chatModerationTable.studentId, studentId));
    const entry: ChatModerationEntry = row
      ? { chatStatus: row.chatStatus, chatViolationCount: row.chatViolationCount }
      : { chatStatus: "active", chatViolationCount: 0 };
    chatModerationCache.set(studentId, entry);
    return entry;
  } catch {
    return { chatStatus: "active", chatViolationCount: 0 };
  }
}

// Filter message text — replace blocked words with ---
function filterMessage(text: string): { filtered: string; matchedWord: string | null } {
  if (blockedWordSet.size === 0) return { filtered: text, matchedWord: null };
  let filtered = text;
  let matchedWord: string | null = null;
  for (const word of blockedWordSet) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (re.test(filtered)) {
      matchedWord = matchedWord ?? word;
      filtered = filtered.replace(re, "---");
    }
  }
  return { filtered, matchedWord };
}

async function applyStrike(
  studentId: string,
  studentName: string,
  phone: string | null,
  sessionId: string,
  mentorGroupId: string | null,
  originalMessage: string,
  matchedWord: string,
): Promise<{ newCount: number; nowBlocked: boolean }> {
  // Persist violation
  await db.insert(chatViolationsTable).values({
    studentId,
    studentName,
    sessionId: Number(sessionId) || null,
    mentorGroupId: mentorGroupId ? Number(mentorGroupId) : null,
    message: originalMessage,
    matchedWord,
  }).catch(() => {});

  // Upsert moderation row and increment count
  const existing = chatModerationCache.get(studentId) ?? { chatStatus: "active", chatViolationCount: 0 };
  const newCount = existing.chatViolationCount + 1;
  const nowBlocked = newCount >= 3;

  await db
    .insert(chatModerationTable)
    .values({
      studentId,
      studentName,
      phone: phone ?? undefined,
      chatStatus: nowBlocked ? "blocked" : "active",
      chatViolationCount: newCount,
      chatBlockedAt: nowBlocked ? new Date() : undefined,
      chatBlockReason: nowBlocked ? "Inappropriate Language" : undefined,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatModerationTable.studentId,
      set: {
        chatViolationCount: sql`${chatModerationTable.chatViolationCount} + 1`,
        chatStatus: nowBlocked ? "blocked" : sql`${chatModerationTable.chatStatus}`,
        chatBlockedAt: nowBlocked ? new Date() : sql`${chatModerationTable.chatBlockedAt}`,
        chatBlockReason: nowBlocked
          ? "Inappropriate Language"
          : sql`${chatModerationTable.chatBlockReason}`,
        phone: phone ? phone : sql`${chatModerationTable.phone}`,
        updatedAt: new Date(),
      },
    })
    .catch(() => {});

  // Update local cache
  chatModerationCache.set(studentId, {
    chatStatus: nowBlocked ? "blocked" : "active",
    chatViolationCount: newCount,
  });

  return { newCount, nowBlocked };
}

function getSessionRoom(sid: string): SessionRoom {
  if (!sessionRooms.has(sid)) {
    sessionRooms.set(sid, {
      raisedHands: new Map(),
      raiseHandEnabled: false,
      activePoll: null,
      pollAnswers: new Map(),
      stageSlots: new Map(),
      teacher: null,
    });
  }
  return sessionRooms.get(sid)!;
}

// ── Sprint 3: Load active stage slots from DB for a session ────
async function loadStageSlots(sessionId: string): Promise<StageSlotEntry[]> {
  try {
    const rows = await db
      .select()
      .from(stageSlotsTable)
      .where(eq(stageSlotsTable.sessionId, sessionId));
    return rows.map(r => ({
      studentId: r.studentId,
      studentName: r.studentName,
      slotNumber: r.slotNumber,
      isMuted: r.isMuted,
      mentorGroupId: r.mentorGroupId ?? null,
    }));
  } catch { return []; }
}

// ── Sprint 2: Seed liveStateCache from DB on startup ──────────
async function seedCacheFromDB(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 30_000);
    const rows = await db
      .select()
      .from(sessionAttendanceTable)
      .where(gt(sessionAttendanceTable.lastSeenAt, cutoff));

    for (const row of rows) {
      const key = `${row.sessionId}-${row.studentId}`;
      liveStateCache.set(key, {
        lastSeenAt: row.lastSeenAt ?? new Date(),
        currentStatus: "LIVE",
        name: row.studentName,
        mentorGroupId: row.mentorGroupId != null ? String(row.mentorGroupId) : null,
        phone: null,
        sessionId: String(row.sessionId),
        userId: row.studentId,
        role: row.role,
      });
    }
    if (rows.length > 0) {
      console.log(`[socket] Restored ${rows.length} LIVE student(s) from DB after restart`);
    }
  } catch (err) {
    console.error("[socket] liveStateCache seed failed:", err);
  }
}

// ── Sprint 2: Chat persistence helpers ────────────────────────
// groupId filtering: students only see teacher messages + their own group's messages
async function loadRecentChat(
  sessionId: string,
  groupId: string | null,
  isStaff: boolean,
): Promise<ChatMsg[]> {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return [];
  const gid = groupId ? Number(groupId) : null;
  const showAll = isStaff || gid === null || Number.isNaN(gid ?? NaN);
  try {
    const rows = await db
      .select()
      .from(chatMessagesTable)
      .where(
        showAll
          ? eq(chatMessagesTable.sessionId, sid)
          : and(
              eq(chatMessagesTable.sessionId, sid),
              sql`(${chatMessagesTable.mentorGroupId} IS NULL OR ${chatMessagesTable.mentorGroupId} = ${gid})`,
            ),
      )
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(100);
    return rows.reverse().map(r => ({
      id: String(r.id),
      name: r.senderName,
      role: r.senderRole,
      text: r.message,
      isAnnouncement: r.isAnnouncement,
      ts: r.createdAt.getTime(),
    }));
  } catch {
    return [];
  }
}

function persistChat(
  sessionId: string,
  senderId: string,
  msg: ChatMsg,
  mentorGroupId: string | null,
): void {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;
  db.insert(chatMessagesTable)
    .values({
      sessionId: sid,
      mentorGroupId: mentorGroupId ? Number(mentorGroupId) : undefined,
      senderId,
      senderName: msg.name,
      senderRole: msg.role,
      message: msg.text,
      isAnnouncement: msg.isAnnouncement,
    })
    .catch(() => {});
}

// ── DB helpers (fire-and-forget) ───────────────────────────────
function upsertAttendanceHeartbeat(
  sessionId: string, userId: string, name: string,
  mentorGroupId: string | null, role: string,
) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;
  const now = new Date();
  db.insert(sessionAttendanceTable)
    .values({
      sessionId: sid, studentId: userId, studentName: name,
      mentorGroupId: mentorGroupId ? Number(mentorGroupId) : undefined,
      role, joinedAt: now, lastSeenAt: now, totalDurationSeconds: 0,
    })
    .onConflictDoUpdate({
      target: [sessionAttendanceTable.sessionId, sessionAttendanceTable.studentId],
      set: {
        lastSeenAt: now,
        totalDurationSeconds: sql`${sessionAttendanceTable.totalDurationSeconds} + 15`,
      },
    })
    .catch(() => {});
}

function markLeft(sessionId: string, userId: string) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;
  db.update(sessionAttendanceTable)
    .set({ leftAt: new Date() })
    .where(and(eq(sessionAttendanceTable.sessionId, sid), eq(sessionAttendanceTable.studentId, userId)))
    .catch(() => {});
}

// ── Sprint 1: Poll analytics with mentor_group_id + is_correct ─
function persistPollAnswer(sessionId: string, poll: Poll, answer: PollAnswer) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid)) return;
  db.insert(pollAnalyticsTable)
    .values({
      sessionId: sid,
      pollId: poll.id,
      pollQuestion: poll.question,
      correctOptionId: poll.correctOptionId,
      studentId: answer.userId,
      studentName: answer.name,
      mentorGroupId: answer.mentorGroupId ? Number(answer.mentorGroupId) : undefined,
      optionId: answer.optionId,
      optionText: answer.optionText,
      isCorrect: answer.isCorrect,
      responseTimeMs: answer.responseTimeMs,
      answeredAt: new Date(),
    })
    .catch(() => {});
}

// ── Sprint 1: Leaderboard ranks by is_correct DESC, response_time ASC ──
function computeTop3(room: SessionRoom): Array<{
  name: string; rank: number; userId: string;
  optionId: string; responseTimeMs: number; isCorrect: boolean;
}> {
  if (!room.activePoll || room.pollAnswers.size === 0) return [];

  const answers = Array.from(room.pollAnswers.values());
  const sorted = answers.sort((a, b) => {
    // Correct answers first
    if (b.isCorrect !== a.isCorrect) return (b.isCorrect ? 1 : 0) - (a.isCorrect ? 1 : 0);
    // Then fastest response
    return a.responseTimeMs - b.responseTimeMs;
  });

  return sorted.slice(0, 3).map((a, i) => ({
    name: a.name,
    rank: i + 1,
    userId: a.userId,
    optionId: a.optionId,
    responseTimeMs: a.responseTimeMs,
    isCorrect: a.isCorrect,
  }));
}

function persistLeaderboard(
  sessionId: string,
  pollId: string,
  top3: ReturnType<typeof computeTop3>,
  mentorGroupId: string | null,
) {
  const sid = Number(sessionId);
  if (Number.isNaN(sid) || top3.length === 0) return;
  db.insert(leaderboardAnalyticsTable)
    .values(top3.map(e => ({
      sessionId: sid,
      pollId,
      rank: e.rank,
      studentId: e.userId,
      studentName: e.name,
      mentorGroupId: mentorGroupId ? Number(mentorGroupId) : undefined,
      optionId: e.optionId,
      isCorrect: e.isCorrect,
      responseTimeMs: e.responseTimeMs,
      recordedAt: new Date(),
    })))
    .catch(() => {});
}

// ── Setup ──────────────────────────────────────────────────────
export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socket.io",
  });

  // Seed liveStateCache immediately from DB (Sprint 2)
  seedCacheFromDB().catch(() => {});

  // Load blocked words on startup + refresh every 60s
  refreshBlockedWords().catch(() => {});
  setInterval(() => refreshBlockedWords().catch(() => {}), 60_000);

  // ── Auth middleware — context from handshake query ──────────
  io.use((socket, next) => {
    const q = socket.handshake.query;
    (socket as any).ctx = {
      sessionId:  String(q["sessionId"] ?? ""),
      userId:     String(q["userId"] ?? `anon-${Math.random().toString(36).slice(2)}`),
      role:       String(q["role"] ?? "student").toLowerCase(),
      groupId:    q["groupId"] ? String(q["groupId"]) : null,
      name:       String(q["name"] ?? "Student").slice(0, 50),
      phone:      q["phone"] ? String(q["phone"]) : null,
    };
    next();
  });

  // ── 5-second backstage sweeper ─────────────────────────────
  setInterval(() => {
    const now = Date.now();
    for (const entry of liveStateCache.values()) {
      if (entry.currentStatus === "LIVE") {
        const delta = (now - entry.lastSeenAt.getTime()) / 1000;
        if (delta > 15) {
          entry.currentStatus = "BACKSTAGE";
          io.to(teacherRoom(entry.sessionId))
            .to(entry.mentorGroupId
              ? groupRoom(entry.sessionId, entry.mentorGroupId)
              : teacherRoom(entry.sessionId))
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
    const isStaff  = role === "teacher" || role === "admin";
    const isMentor = role === "mentor";

    // ── Join rooms ────────────────────────────────────────────
    socket.join(globalRoom(sessionId));
    if (isStaff) {
      socket.join(teacherRoom(sessionId));
    } else if (isMentor && groupId) {
      socket.join(groupRoom(sessionId, groupId));
      socket.join(teacherRoom(sessionId)); // mentors also see teacher room
    } else if (groupId) {
      socket.join(groupRoom(sessionId, groupId));
    }

    const room = getSessionRoom(sessionId);

    // ── Send initial room state (async — loads chat + stage from DB) ──
    (async () => {
      const [recentChat, dbStageSlots] = await Promise.all([
        loadRecentChat(sessionId, groupId, isStaff),
        loadStageSlots(sessionId),
      ]);

      // Seed in-memory stageSlots if empty (handles server restart)
      if (room.stageSlots.size === 0 && dbStageSlots.length > 0) {
        for (const s of dbStageSlots) room.stageSlots.set(s.studentId, s);
      }

      socket.emit("roomState", {
        chat: recentChat,
        raisedHands: Array.from(room.raisedHands.entries())
          .map(([uid, h]) => ({ uid, ...h })),
        raiseHandEnabled: room.raiseHandEnabled,
        activePoll: room.activePoll
          ? { ...room.activePoll, correctOptionId: undefined }
          : null,
        stage: Array.from(room.stageSlots.values()),
        teacher: room.teacher,
      });
    })().catch(() => {
      socket.emit("roomState", {
        chat: [],
        raisedHands: [],
        raiseHandEnabled: room.raiseHandEnabled,
        activePoll: null,
        stage: [],
      });
    });

    // ── Load chat moderation status for students ───────────────
    if (!isStaff && !isMentor) {
      loadChatStatus(userId).then(status => {
        if (status.chatStatus === "blocked") {
          socket.emit("chat:blocked", {
            message: "🚫 Chat access has been temporarily disabled. Please contact your mentor.",
          });
        }
      }).catch(() => {});
    }

    // ── Teacher presence broadcast ─────────────────────────────
    if (isStaff) {
      room.teacher = { name, userId };
      // Notify everyone already in the room that teacher is here
      socket.to(globalRoom(sessionId)).emit("teacher:joined", { name, userId });
    }

    // ── Heartbeat (students & mentors, every 15s) ─────────────
    socket.on("heartbeat:ping", () => {
      if (isStaff) return;
      const now = new Date();
      const cacheKey = `${sessionId}-${userId}`;
      const prev = liveStateCache.get(cacheKey);
      const prevStatus = prev?.currentStatus ?? "ABSENT";

      liveStateCache.set(cacheKey, {
        lastSeenAt: now,
        currentStatus: "LIVE",
        name, mentorGroupId: groupId, phone, sessionId, userId, role,
      });

      upsertAttendanceHeartbeat(sessionId, userId, name, groupId, role);

      if (prevStatus !== "LIVE") {
        const eventType = prevStatus === "BACKSTAGE" ? "studentReturned" : "studentJoined";
        const payload   = { userId, name, mentorGroupId: groupId, phone, lastSeenAt: now };
        io.to(teacherRoom(sessionId))
          .to(groupId ? groupRoom(sessionId, groupId) : teacherRoom(sessionId))
          .emit(eventType, payload);
      }
      socket.emit("heartbeat:ack");
    });

    // ── Chat (Sprint 2 — DB-persisted + moderation) ─────────────
    socket.on("chat:send", (rawText: string) => {
      const rawSanitized = String(rawText ?? "").replace(/[<>]/g, "").trim().slice(0, 300);
      if (!rawSanitized) return;

      // Staff bypass all moderation
      if (isStaff) {
        const msg: ChatMsg = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name, role, text: rawSanitized,
          isAnnouncement: true,
          ts: Date.now(),
        };
        persistChat(sessionId, userId, msg, null);
        io.to(globalRoom(sessionId)).emit("chat:message", msg);
        return;
      }

      // ── Check blocked status ────────────────────────────────
      const modEntry = chatModerationCache.get(userId) ?? { chatStatus: "active", chatViolationCount: 0 };
      if (modEntry.chatStatus === "blocked") {
        socket.emit("chat:blocked", {
          message: "🚫 Chat access has been temporarily disabled. Please contact your mentor.",
        });
        return;
      }

      // ── Filter against blocked words ────────────────────────
      const { filtered, matchedWord } = filterMessage(rawSanitized);

      if (matchedWord) {
        // Apply strike asynchronously then emit filtered message + warning
        applyStrike(userId, name, phone, sessionId, groupId, rawSanitized, matchedWord)
          .then(({ newCount, nowBlocked }) => {
            if (nowBlocked) {
              socket.emit("chat:blocked", {
                message: "🚫 Chat access has been temporarily disabled. Please contact your mentor.",
              });
              // Don't broadcast the message
            } else {
              // Broadcast filtered message to group
              const msg: ChatMsg = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                name, role, text: filtered,
                isAnnouncement: false,
                ts: Date.now(),
              };
              if (groupId) {
                persistChat(sessionId, userId, msg, groupId);
                io.to(groupRoom(sessionId, groupId))
                  .to(teacherRoom(sessionId))
                  .emit("chat:message", msg);
              } else {
                socket.emit("chat:message", msg);
              }

              // Strike warning to sender only
              const strikeMsg = newCount === 1
                ? "⚠️ Warning (Strike 1/3): Your message contained inappropriate language and was filtered."
                : "🚨 Final Warning (Strike 2/3): One more violation will permanently block your chat.";
              socket.emit("chat:warning", { message: strikeMsg, strikeCount: newCount });
            }
          })
          .catch(() => {});
        return;
      }

      // ── Clean message — broadcast normally ─────────────────
      const msg: ChatMsg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name, role, text: rawSanitized,
        isAnnouncement: false,
        ts: Date.now(),
      };
      if (groupId) {
        persistChat(sessionId, userId, msg, groupId);
        io.to(groupRoom(sessionId, groupId))
          .to(teacherRoom(sessionId))
          .emit("chat:message", msg);
      } else {
        socket.emit("chat:message", msg);
      }
    });

    // ── Raise hand ─────────────────────────────────────────────
    socket.on("student:raiseHand", () => {
      if (!room.raiseHandEnabled) return;
      const raised = room.raisedHands.has(userId);
      if (raised) room.raisedHands.delete(userId);
      else room.raisedHands.set(userId, { name, mentorGroupId: groupId });
      const payload = { uid: userId, name, mentorGroupId: groupId, raised: !raised, ts: new Date() };
      io.to(groupId ? groupRoom(sessionId, groupId) : globalRoom(sessionId))
        .to(teacherRoom(sessionId))
        .emit("classroom:handRaised", payload);
    });

    socket.on("toggleRaiseHand", (data: { enabled: boolean }) => {
      if (!isStaff) return;
      room.raiseHandEnabled = !!data.enabled;
      if (!room.raiseHandEnabled) room.raisedHands.clear();
      io.to(globalRoom(sessionId)).emit("raiseHandToggled", { enabled: room.raiseHandEnabled, hands: [] });
    });

    // ── Sprint 1: Poll with correct answer support ─────────────
    socket.on("startPoll", (data: {
      question: string;
      options: string[];
      correctOptionId?: string;   // teacher marks correct answer at creation
    }) => {
      if (!isStaff) return;
      const opts = (data.options ?? []).filter(Boolean).slice(0, 6);
      if (!data.question?.trim() || opts.length < 2) return;

      const pollOptions: PollOpt[] = opts.map((t, i) => ({
        id: String.fromCharCode(65 + i),
        text: String(t).slice(0, 100),
      }));

      room.activePoll = {
        id: `poll-${Date.now()}`,
        question: String(data.question).trim().slice(0, 200),
        options: pollOptions,
        startedAt: Date.now(),
        correctOptionId: data.correctOptionId ?? null,
      };
      room.pollAnswers = new Map();

      // Send poll to all — but strip correctOptionId for everyone except teacher's own socket
      const studentPayload = { ...room.activePoll, correctOptionId: undefined };
      io.to(teacherRoom(sessionId)).emit("pollStarted", room.activePoll); // teacher sees answer
      socket.broadcast.to(globalRoom(sessionId)).emit("pollStarted", studentPayload);
    });

    // ── Poll submit — score is_correct server-side ─────────────
    socket.on("submitPoll", (data: { optionId: string }) => {
      if (!room.activePoll || room.pollAnswers.has(userId)) return;
      const responseTimeMs = Date.now() - room.activePoll.startedAt;
      const optId    = String(data.optionId);
      const isCorrect = room.activePoll.correctOptionId != null
        ? optId === room.activePoll.correctOptionId
        : true; // No correct answer set → everyone is "correct" for ranking

      const answer: PollAnswer = {
        optionId: optId,
        optionText: room.activePoll.options.find(o => o.id === optId)?.text ?? "",
        name, userId,
        mentorGroupId: groupId,
        isCorrect,
        responseTimeMs,
        ts: Date.now(),
      };
      room.pollAnswers.set(userId, answer);
      persistPollAnswer(sessionId, room.activePoll, answer);

      // Live counts to teacher
      const counts: Record<string, number> = {};
      for (const a of room.pollAnswers.values()) counts[a.optionId] = (counts[a.optionId] ?? 0) + 1;
      io.to(teacherRoom(sessionId)).emit("pollUpdate", { counts, total: room.pollAnswers.size });

      socket.emit("pollSubmitted", { optionId: optId, isCorrect });
    });

    // ── Sprint 3: Stage orchestration ─────────────────────────
    socket.on("stage:approveStudent", async (payload: {
      studentId: string; studentName: string; studentGroupId: string;
    }) => {
      if (!isStaff) return;
      const occupied = new Set(Array.from(room.stageSlots.values()).map(s => s.slotNumber));
      let openSlot: number | null = null;
      for (let i = 1; i <= 5; i++) { if (!occupied.has(i)) { openSlot = i; break; } }

      if (!openSlot) {
        socket.emit("stage:error", { message: "Stage full — max 5 students." });
        return;
      }
      if (room.stageSlots.has(payload.studentId)) {
        socket.emit("stage:error", { message: "Student is already on stage." });
        return;
      }

      const entry: StageSlotEntry = {
        studentId: payload.studentId,
        studentName: payload.studentName,
        slotNumber: openSlot,
        isMuted: true,
        mentorGroupId: payload.studentGroupId || null,
      };
      room.stageSlots.set(payload.studentId, entry);

      // Persist to DB (non-blocking)
      db.insert(stageSlotsTable).values({
        sessionId,
        studentId: payload.studentId,
        studentName: payload.studentName,
        mentorGroupId: payload.studentGroupId || null,
        slotNumber: openSlot,
        isMuted: true,
      }).onConflictDoNothing().catch(() => {});

      // Clear hand from raise-hand queue
      room.raisedHands.delete(payload.studentId);
      io.to(globalRoom(sessionId)).emit("classroom:handRaised", {
        uid: payload.studentId, name: payload.studentName,
        mentorGroupId: payload.studentGroupId || null, raised: false, ts: new Date(),
      });

      io.to(globalRoom(sessionId)).emit("stage:studentInvited", {
        studentId: payload.studentId,
        studentName: payload.studentName,
        slotNumber: openSlot,
        isMuted: true,
        mentorGroupId: payload.studentGroupId || null,
      });
    });

    // ── Teacher directly invites student to stage (Give Mic) ──
    socket.on("stage:inviteStudent", (payload: { studentId: string; studentName: string; studentGroupId: string }) => {
      if (!isStaff) return;
      if (room.stageSlots.size >= 5) {
        socket.emit("stage:error", { message: "Stage full — max 5 students." });
        return;
      }
      if (room.stageSlots.has(payload.studentId)) {
        socket.emit("stage:error", { message: "Student is already on stage." });
        return;
      }
      // Broadcast to whole room; student side checks if invite is for them
      io.to(globalRoom(sessionId)).emit("stage:micInvite", {
        studentId: payload.studentId,
        studentName: payload.studentName,
        fromTeacher: name,
      });
    });

    // ── Student accepts mic invite → gets put on stage ────────
    socket.on("stage:acceptInvite", () => {
      if (isStaff || isMentor) return;
      if (room.stageSlots.size >= 5 || room.stageSlots.has(userId)) return;

      const occupied = new Set(Array.from(room.stageSlots.values()).map(s => s.slotNumber));
      let openSlot: number | null = null;
      for (let i = 1; i <= 5; i++) { if (!occupied.has(i)) { openSlot = i; break; } }
      if (!openSlot) return;

      const entry: StageSlotEntry = {
        studentId: userId, studentName: name,
        slotNumber: openSlot, isMuted: true, mentorGroupId: groupId || null,
      };
      room.stageSlots.set(userId, entry);

      db.insert(stageSlotsTable).values({
        sessionId, studentId: userId, studentName: name,
        mentorGroupId: groupId || null, slotNumber: openSlot, isMuted: true,
      }).onConflictDoNothing().catch(() => {});

      room.raisedHands.delete(userId);
      io.to(globalRoom(sessionId)).emit("classroom:handRaised", {
        uid: userId, name, mentorGroupId: groupId || null, raised: false, ts: new Date(),
      });
      io.to(globalRoom(sessionId)).emit("stage:studentInvited", {
        studentId: userId, studentName: name,
        slotNumber: openSlot, isMuted: true, mentorGroupId: groupId || null,
      });
    });

    socket.on("stage:toggleMute", (payload: { studentId: string; isMuted: boolean }) => {
      if (!isStaff) return;
      const entry = room.stageSlots.get(payload.studentId);
      if (!entry) return;
      entry.isMuted = payload.isMuted;

      db.update(stageSlotsTable)
        .set({ isMuted: payload.isMuted })
        .where(and(eq(stageSlotsTable.sessionId, sessionId), eq(stageSlotsTable.studentId, payload.studentId)))
        .catch(() => {});

      io.to(globalRoom(sessionId)).emit("stage:muteStateChanged", {
        studentId: payload.studentId, isMuted: payload.isMuted,
      });
    });

    socket.on("stage:removeStudent", (payload: { studentId: string }) => {
      if (!isStaff) return;
      room.stageSlots.delete(payload.studentId);

      db.delete(stageSlotsTable)
        .where(and(eq(stageSlotsTable.sessionId, sessionId), eq(stageSlotsTable.studentId, payload.studentId)))
        .catch(() => {});

      io.to(globalRoom(sessionId)).emit("stage:studentRemoved", { studentId: payload.studentId });
    });

    // ── Leaderboard (Sprint 1 — ranked by correctness then speed) ──
    socket.on("showLeaderboard", () => {
      if (!isStaff || !room.activePoll) return;
      const top3   = computeTop3(room);
      const pollId = room.activePoll.id;
      persistLeaderboard(sessionId, pollId, top3, groupId);
      io.to(globalRoom(sessionId)).emit("showLeaderboard", { top3 });
      room.activePoll = null;
      setTimeout(() => io.to(globalRoom(sessionId)).emit("pollEnded"), 5500);
    });

    // ── End Class (teacher only) ──────────────────────────────
    socket.on("class:end", () => {
      if (!isStaff) return;

      const sid = Number(sessionId);

      // Mark all still-live students as left
      for (const [key, entry] of liveStateCache.entries()) {
        if (!key.startsWith(`${sessionId}-`)) continue;
        if (entry.currentStatus !== "ABSENT") {
          entry.currentStatus = "ABSENT";
          if (!Number.isNaN(sid)) {
            db.update(sessionAttendanceTable)
              .set({ leftAt: new Date() })
              .where(
                and(
                  eq(sessionAttendanceTable.sessionId, sid),
                  eq(sessionAttendanceTable.studentId, entry.userId)
                )
              )
              .catch(() => {});
          }
        }
      }

      // Clear all stage slots for this session from DB
      db.delete(stageSlotsTable)
        .where(eq(stageSlotsTable.sessionId, sessionId))
        .catch(() => {});

      // Remove room from in-memory Map → frees memory
      sessionRooms.delete(sessionId);

      // Notify all connected sockets then disconnect them after 4s
      io.to(globalRoom(sessionId)).emit("class:ended", { sessionId });
      setTimeout(() => {
        io.in(globalRoom(sessionId)).disconnectSockets(true);
      }, 4000);
    });

    // ── Mentor silently suggests a student to the teacher ─────
    socket.on("mentor:suggestStudent", (payload: { studentId: string; studentName: string }) => {
      if (!isMentor) return;
      // No popup — just highlight the student at top of teacher's list
      io.to(teacherRoom(sessionId)).emit("teacher:studentSuggested", {
        studentId: payload.studentId,
        studentName: payload.studentName,
      });
    });

    // ── Staff Chat (teacher + mentor private channel) ──────────
    socket.on("staffChat:send", (rawText: string) => {
      if (!isStaff && !isMentor) return;
      const text = String(rawText ?? "").replace(/[<>]/g, "").trim().slice(0, 300);
      if (!text) return;
      const msg = {
        id: `sc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name, role, text, ts: Date.now(),
      };
      io.to(teacherRoom(sessionId)).emit("staffChat:message", msg);
    });

    // ── Attendance snapshot on demand (5-second client heartbeat) ────
    socket.on("request:attendance", () => {
      const snap = Array.from(liveStateCache.entries())
        .filter(([k]) => k.startsWith(`${sessionId}-`))
        .map(([, v]) => v);
      socket.emit("attendance:snapshot", { students: snap });
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (isStaff) {
        room.teacher = null;
        io.to(globalRoom(sessionId)).emit("teacher:left", { name, userId });
      } else {
        markLeft(sessionId, userId);
        const entry = liveStateCache.get(`${sessionId}-${userId}`);
        if (entry) entry.currentStatus = "ABSENT";

        // Sprint 3: auto-remove from stage if present
        if (room.stageSlots.has(userId)) {
          room.stageSlots.delete(userId);
          db.delete(stageSlotsTable)
            .where(and(eq(stageSlotsTable.sessionId, sessionId), eq(stageSlotsTable.studentId, userId)))
            .catch(() => {});
          io.to(globalRoom(sessionId)).emit("stage:studentRemoved", { studentId: userId });
        }
      }
      room.raisedHands.delete(userId);
    });
  });

  return io;
}
