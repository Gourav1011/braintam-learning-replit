import { Router } from "express";
import { and, asc, desc, eq, gt, ilike, inArray, lt, ne, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  workplaceConversationsTable,
  workplaceMembersTable,
  workplaceMessagesTable,
  workplaceMessageEditsTable,
  workplaceNotificationsTable,
  workplaceTasksTable,
  workplaceTaskRemarksTable,
  workplaceTaskEventsTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import {
  emitWorkplaceConversation,
  emitWorkplaceUser,
  removeWorkplaceUserFromConversation,
} from "../lib/workplace-realtime.js";

const router = Router();
const workplaceAuth = requireRole(
  "super_admin",
  "admin",
  "teacher",
  "mentor",
  "sales_mentor",
  "academic_mentor",
);

const employeeRoles = ["admin", "teacher", "mentor", "sales_mentor", "academic_mentor", "super_admin"];

function parsePositiveId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseId(value: string | string[]): number | null {
  return parsePositiveId(Array.isArray(value) ? value[0] : value);
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

async function isMember(conversationId: number, userId: number) {
  const [member] = await db
    .select()
    .from(workplaceMembersTable)
    .where(and(
      eq(workplaceMembersTable.conversationId, conversationId),
      eq(workplaceMembersTable.userId, userId),
    ))
    .limit(1);
  return member ?? null;
}
function isWorkplaceAdmin(req: any): boolean {
  return ["admin", "super_admin"].includes(req.authUser!.role);
}
async function canAccessConversation(req: any, conversationId: number): Promise<boolean> {
  return isWorkplaceAdmin(req) || Boolean(await isMember(conversationId, req.authUser!.id));
}
async function conversationMemberIds(conversationId: number): Promise<number[]> {
  const rows = await db.select({ userId: workplaceMembersTable.userId }).from(workplaceMembersTable)
    .where(eq(workplaceMembersTable.conversationId, conversationId));
  return rows.map((row) => row.userId);
}
async function authorizedMentionIds(conversationId: number, rawIds: unknown): Promise<number[] | null> {
  if (!Array.isArray(rawIds)) return [];
  const ids = [...new Set(rawIds.map(parsePositiveId).filter((id): id is number => id !== null))].slice(0, 20);
  const memberIds = await conversationMemberIds(conversationId);
  return ids.every((id) => memberIds.includes(id)) ? ids : null;
}

async function getConversation(conversationId: number) {
  const [conversation] = await db
    .select()
    .from(workplaceConversationsTable)
    .where(eq(workplaceConversationsTable.id, conversationId))
    .limit(1);
  return conversation ?? null;
}

async function employeeById(userId: number) {
  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      department: usersTable.department,
      employeeId: usersTable.employeeId,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(and(
      eq(usersTable.id, userId),
      eq(usersTable.isActive, true),
      eq(usersTable.isDeleted, false),
      or(...employeeRoles.map((role) => eq(usersTable.role, role))),
    ))
    .limit(1);
  return user ?? null;
}

async function createNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  actorId?: number,
  conversationId?: number,
  taskId?: number,
) {
  const [notification] = await db.insert(workplaceNotificationsTable).values({
    userId,
    type,
    title,
    body,
    actorId,
    conversationId,
    taskId,
  }).returning();
  emitWorkplaceUser(userId, "workplace:notification", notification);
  return notification;
}

async function conversationSummary(conversationId: number, userId: number, allowHistorical = false) {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;
  const members = await db
    .select({
      id: workplaceMembersTable.userId,
      isAdmin: workplaceMembersTable.isAdmin,
      lastReadAt: workplaceMembersTable.lastReadAt,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(workplaceMembersTable)
    .leftJoin(usersTable, eq(workplaceMembersTable.userId, usersTable.id))
    .where(eq(workplaceMembersTable.conversationId, conversationId))
    .orderBy(asc(workplaceMembersTable.joinedAt));
  const member = members.find((item) => item.id === userId);
  if (!member && !allowHistorical) return null;
  const lastMessage = await db
    .select({
      id: workplaceMessagesTable.id,
      content: workplaceMessagesTable.content,
      createdAt: workplaceMessagesTable.createdAt,
      senderId: workplaceMessagesTable.senderId,
      senderName: usersTable.name,
      deletedAt: workplaceMessagesTable.deletedAt,
    })
    .from(workplaceMessagesTable)
    .leftJoin(usersTable, eq(workplaceMessagesTable.senderId, usersTable.id))
    .where(eq(workplaceMessagesTable.conversationId, conversationId))
    .orderBy(desc(workplaceMessagesTable.createdAt))
    .limit(1);
  const unread = member?.lastReadAt
    ? await db.select({ count: sql<number>`count(*)` })
      .from(workplaceMessagesTable)
      .where(and(
        eq(workplaceMessagesTable.conversationId, conversationId),
        gt(workplaceMessagesTable.createdAt, member.lastReadAt),
        sql`${workplaceMessagesTable.senderId} <> ${userId}`,
      ))
    : await db.select({ count: sql<number>`count(*)` })
      .from(workplaceMessagesTable)
      .where(and(
        eq(workplaceMessagesTable.conversationId, conversationId),
        sql`${workplaceMessagesTable.senderId} <> ${userId}`,
      ));
  const others = members.filter((item) => item.id !== userId);
  return {
    ...conversation,
    displayName: conversation.type === "group"
      ? conversation.name || "Untitled group"
       : others[0]?.name || "Direct conversation",
    members,
    unreadCount: Number(unread[0]?.count ?? 0),
    lastMessage: lastMessage[0] && lastMessage[0].deletedAt && !allowHistorical
      ? { ...lastMessage[0], content: "This message was deleted." }
      : lastMessage[0] ?? null,
  };
}

router.get("/workplace/employees", workplaceAuth, async (req, res): Promise<void> => {
  const query = cleanText(req.query.q, 80);
  const conditions = [
    eq(usersTable.isActive, true),
    eq(usersTable.isDeleted, false),
    ne(usersTable.id, req.authUser!.id),
    or(...employeeRoles.map((role) => eq(usersTable.role, role))),
  ];
  const conversationId = parsePositiveId(req.query.conversationId);
  if (conversationId) {
    if (!await canAccessConversation(req, conversationId)) {
      res.status(403).json({ error: "Conversation access denied." });
      return;
    }
    const memberIds = await conversationMemberIds(conversationId);
    if (memberIds.length === 0) {
      res.json([]);
      return;
    }
    conditions.push(inArray(usersTable.id, memberIds) as any);
  }
  if (query) {
    conditions.push(or(
      ilike(usersTable.name, `%${query}%`),
      ilike(usersTable.email, `%${query}%`),
      ilike(usersTable.phone, `%${query}%`),
      ilike(usersTable.employeeId, `%${query}%`),
      ilike(usersTable.department, `%${query}%`),
    ) as any);
  }
  const employees = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    department: usersTable.department,
    employeeId: usersTable.employeeId,
    avatarUrl: usersTable.avatarUrl,
  }).from(usersTable).where(and(...conditions)).orderBy(asc(usersTable.name)).limit(30);
  res.json(employees);
});

router.get("/workplace/conversations", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const members = isWorkplaceAdmin(req)
    ? await db.select({ conversationId: workplaceConversationsTable.id }).from(workplaceConversationsTable)
    : await db.select({ conversationId: workplaceMembersTable.conversationId })
      .from(workplaceMembersTable).where(eq(workplaceMembersTable.userId, userId));
  const summaries = (await Promise.all(
    members.map(({ conversationId }) => conversationSummary(conversationId, userId, isWorkplaceAdmin(req))),
  )).filter(Boolean);
  summaries.sort((a, b) =>
    new Date(b!.lastMessageAt).getTime() - new Date(a!.lastMessageAt).getTime());
  res.json({ conversations: summaries });
});

router.post("/workplace/conversations/direct", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const targetId = parsePositiveId(req.body?.userId);
  if (!targetId || targetId === userId) {
    res.status(400).json({ error: "Choose another employee." });
    return;
  }
  const target = await employeeById(targetId);
  if (!target) { res.status(404).json({ error: "Employee not found." }); return; }

  const existing = await db.select({ conversationId: workplaceMembersTable.conversationId })
    .from(workplaceMembersTable)
    .innerJoin(workplaceConversationsTable, eq(workplaceMembersTable.conversationId, workplaceConversationsTable.id))
    .where(and(
      eq(workplaceMembersTable.userId, userId),
      eq(workplaceConversationsTable.type, "direct"),
    ));
  for (const row of existing) {
    const other = await db.select({ userId: workplaceMembersTable.userId })
      .from(workplaceMembersTable)
      .where(and(
        eq(workplaceMembersTable.conversationId, row.conversationId),
        eq(workplaceMembersTable.userId, target.id),
      )).limit(1);
    if (other.length) {
      const summary = await conversationSummary(row.conversationId, userId);
      res.json(summary);
      return;
    }
  }
  const [conversation] = await db.insert(workplaceConversationsTable).values({
    type: "direct",
    createdById: userId,
  }).returning();
  await db.insert(workplaceMembersTable).values([
    { conversationId: conversation.id, userId, isAdmin: true },
    { conversationId: conversation.id, userId: target.id, isAdmin: false },
  ]);
  emitWorkplaceUser(target.id, "workplace:conversation_added", { conversationId: conversation.id });
  const summary = await conversationSummary(conversation.id, userId);
  res.status(201).json(summary);
});

router.post("/workplace/conversations/group", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const name = cleanText(req.body?.name, 80);
  const rawMembers = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
  const memberIds = [...new Set([userId, ...rawMembers.map((id: unknown) => parsePositiveId(id) ?? 0)])]
    .filter((id) => id > 0);
  if (!name || memberIds.length < 2) {
    res.status(400).json({ error: "A group name and at least one other employee are required." });
    return;
  }
  const employees = await db.select({ id: usersTable.id }).from(usersTable).where(and(
    inArray(usersTable.id, memberIds),
    eq(usersTable.isActive, true),
    eq(usersTable.isDeleted, false),
    or(...employeeRoles.map((role) => eq(usersTable.role, role))),
  ));
  if (employees.length !== memberIds.length) {
    res.status(400).json({ error: "One or more selected employees cannot join this group." });
    return;
  }
  const [conversation] = await db.insert(workplaceConversationsTable).values({
    type: "group",
    name,
    createdById: userId,
  }).returning();
  await db.insert(workplaceMembersTable).values(memberIds.map((memberId) => ({
    conversationId: conversation.id,
    userId: memberId,
    isAdmin: memberId === userId,
  })));
  const summary = await conversationSummary(conversation.id, userId);
  for (const memberId of memberIds) {
    if (memberId !== userId) {
      await createNotification(memberId, "group_added", "Added to a group", `${req.authUser!.name} added you to ${name}.`, userId, conversation.id);
      emitWorkplaceUser(memberId, "workplace:conversation_added", { conversationId: conversation.id });
    }
  }
  res.status(201).json(summary);
});

router.get("/workplace/conversations/:id/messages", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) { res.status(400).json({ error: "Invalid conversation." }); return; }
  if (!await canAccessConversation(req, conversationId)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const conditions = [eq(workplaceMessagesTable.conversationId, conversationId)];
  if (before && !Number.isNaN(before.getTime())) conditions.push(lt(workplaceMessagesTable.createdAt, before));
  const rows = await db.select({
    id: workplaceMessagesTable.id,
    conversationId: workplaceMessagesTable.conversationId,
    content: workplaceMessagesTable.content,
    mentionsJson: workplaceMessagesTable.mentionsJson,
    editedAt: workplaceMessagesTable.editedAt,
    deletedAt: workplaceMessagesTable.deletedAt,
    deletedById: workplaceMessagesTable.deletedById,
    createdAt: workplaceMessagesTable.createdAt,
    senderId: workplaceMessagesTable.senderId,
    senderName: usersTable.name,
    senderRole: usersTable.role,
    avatarUrl: usersTable.avatarUrl,
  }).from(workplaceMessagesTable)
    .leftJoin(usersTable, eq(workplaceMessagesTable.senderId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(workplaceMessagesTable.createdAt))
    .limit(limit);
  const messages = rows.reverse().map((row) => row.deletedAt && !isWorkplaceAdmin(req)
    ? { ...row, content: "This message was deleted.", mentionsJson: null }
    : row);
  res.json({ messages, hasMore: rows.length === limit });
});

router.post("/workplace/conversations/:id/messages", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) { res.status(400).json({ error: "Invalid conversation." }); return; }
  if (!await canAccessConversation(req, conversationId)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  const content = cleanText(req.body?.content, 1000);
  if (!content) { res.status(400).json({ error: "Message cannot be empty." }); return; }
  const mentions = [...content.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((match) => match[1].toLowerCase()).slice(0, 10);
  const explicitMentionIds = await authorizedMentionIds(conversationId, req.body?.mentionUserIds);
  if (!explicitMentionIds) { res.status(400).json({ error: "Mention recipients must be conversation members." }); return; }
  const [message] = await db.insert(workplaceMessagesTable).values({
    conversationId,
    senderId: req.authUser!.id,
    content,
    mentionsJson: JSON.stringify({ names: mentions, userIds: explicitMentionIds }),
  }).returning();
  await db.update(workplaceConversationsTable).set({
    lastMessageAt: message.createdAt,
    updatedAt: new Date(),
  }).where(eq(workplaceConversationsTable.id, conversationId));
  const members = await db.select({ userId: workplaceMembersTable.userId, name: usersTable.name })
    .from(workplaceMembersTable)
    .innerJoin(usersTable, eq(workplaceMembersTable.userId, usersTable.id))
    .where(eq(workplaceMembersTable.conversationId, conversationId));
  const payload = { ...message, senderName: req.authUser!.name, senderRole: req.authUser!.role };
  emitWorkplaceConversation(conversationId, "workplace:message", payload);
  for (const member of members) {
    if (member.userId !== req.authUser!.id) {
      const mentionNames = member.name.toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.replace(/[^a-z0-9._-]/g, ""));
      const isMentioned = explicitMentionIds.includes(member.userId) || mentions.some((mention) => mentionNames.includes(mention));
      await createNotification(
        member.userId,
        isMentioned ? "mention" : "message",
        isMentioned ? `${req.authUser!.name} mentioned you` : "New workplace message",
        content.slice(0, 140),
        req.authUser!.id,
        conversationId,
      );
    }
  }
  res.status(201).json(payload);
});

router.patch("/workplace/messages/:id", workplaceAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.id);
  const content = cleanText(req.body?.content, 1000);
  if (!messageId || !content) { res.status(400).json({ error: "Message content is required." }); return; }
  const [message] = await db.select().from(workplaceMessagesTable).where(eq(workplaceMessagesTable.id, messageId)).limit(1);
  if (!message) { res.status(404).json({ error: "Message not found." }); return; }
  if (!await canAccessConversation(req, message.conversationId) || message.senderId !== req.authUser!.id) {
    res.status(403).json({ error: "Message edit denied." }); return;
  }
  if (message.deletedAt) { res.status(400).json({ error: "Deleted messages cannot be edited." }); return; }
  const now = new Date();
  const [updated] = await db.update(workplaceMessagesTable).set({ content, editedAt: now })
    .where(eq(workplaceMessagesTable.id, messageId)).returning();
  await db.insert(workplaceMessageEditsTable).values({ messageId, previousContent: message.content, newContent: content, editorId: req.authUser!.id, createdAt: now });
  emitWorkplaceConversation(message.conversationId, "workplace:message_edited", updated);
  res.json(updated);
});

router.delete("/workplace/messages/:id", workplaceAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.id);
  if (!messageId) { res.status(400).json({ error: "Invalid message." }); return; }
  const [message] = await db.select().from(workplaceMessagesTable).where(eq(workplaceMessagesTable.id, messageId)).limit(1);
  if (!message) { res.status(404).json({ error: "Message not found." }); return; }
  if (!await canAccessConversation(req, message.conversationId) || message.senderId !== req.authUser!.id) {
    res.status(403).json({ error: "Message deletion denied." }); return;
  }
  const [updated] = await db.update(workplaceMessagesTable).set({ deletedAt: new Date(), deletedById: req.authUser!.id })
    .where(eq(workplaceMessagesTable.id, messageId)).returning();
  emitWorkplaceConversation(message.conversationId, "workplace:message_deleted", { ...updated, content: "This message was deleted." });
  res.json({ ok: true, message: isWorkplaceAdmin(req) ? updated : { ...updated, content: "This message was deleted." } });
});

router.get("/workplace/messages/:id/edits", workplaceAuth, async (req, res): Promise<void> => {
  const messageId = parseId(req.params.id);
  if (!messageId) { res.status(400).json({ error: "Invalid message." }); return; }
  const [message] = await db.select().from(workplaceMessagesTable).where(eq(workplaceMessagesTable.id, messageId)).limit(1);
  if (!message) { res.status(404).json({ error: "Message not found." }); return; }
  if (!await canAccessConversation(req, message.conversationId)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  if (message.deletedAt && !isWorkplaceAdmin(req)) { res.status(403).json({ error: "Deleted message edit history is restricted." }); return; }
  const edits = await db.select({
    id: workplaceMessageEditsTable.id, previousContent: workplaceMessageEditsTable.previousContent,
    newContent: workplaceMessageEditsTable.newContent, editorId: workplaceMessageEditsTable.editorId,
    createdAt: workplaceMessageEditsTable.createdAt, editorName: usersTable.name,
  }).from(workplaceMessageEditsTable).leftJoin(usersTable, eq(workplaceMessageEditsTable.editorId, usersTable.id))
    .where(eq(workplaceMessageEditsTable.messageId, messageId)).orderBy(asc(workplaceMessageEditsTable.createdAt));
  res.json({ edits });
});

router.post("/workplace/conversations/:id/read", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) { res.status(400).json({ error: "Invalid conversation." }); return; }
  if (!await isMember(conversationId, req.authUser!.id)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  const now = new Date();
  await db.update(workplaceMembersTable).set({ lastReadAt: now })
    .where(and(eq(workplaceMembersTable.conversationId, conversationId), eq(workplaceMembersTable.userId, req.authUser!.id)));
  emitWorkplaceConversation(conversationId, "workplace:read", { conversationId, userId: req.authUser!.id, readAt: now });
  res.json({ conversationId, readAt: now });
});

router.post("/workplace/conversations/:id/members", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  const userId = parsePositiveId(req.body?.userId);
  if (!conversationId || !userId) { res.status(400).json({ error: "Invalid member." }); return; }
  const member = await isMember(conversationId, req.authUser!.id);
  const conversation = await getConversation(conversationId);
  if (!member || !conversation || conversation.type !== "group" || !member.isAdmin) {
    res.status(403).json({ error: "Only group admins can add members." });
    return;
  }
  const employee = await employeeById(userId);
  if (!employee || await isMember(conversationId, employee.id)) {
    res.status(400).json({ error: "Employee is unavailable or already a member." });
    return;
  }
  await db.insert(workplaceMembersTable).values({ conversationId, userId: employee.id, isAdmin: false });
  await createNotification(employee.id, "group_added", "Added to a group", `${req.authUser!.name} added you to ${conversation.name || "a workplace group"}.`, req.authUser!.id, conversationId);
  emitWorkplaceUser(employee.id, "workplace:conversation_added", { conversationId });
  emitWorkplaceConversation(conversationId, "workplace:member_added", { conversationId, employee });
  res.status(201).json(employee);
});

router.delete("/workplace/conversations/:id/members/:userId", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  const targetId = parseId(req.params.userId);
  if (!conversationId || !targetId) { res.status(400).json({ error: "Invalid member." }); return; }
  const member = await isMember(conversationId, req.authUser!.id);
  const conversation = await getConversation(conversationId);
  if (!member || !conversation || conversation.type !== "group" || !member.isAdmin) {
    res.status(403).json({ error: "Only group admins can remove members." });
    return;
  }
  if (targetId === conversation.createdById) { res.status(400).json({ error: "The group creator cannot be removed." }); return; }
  await db.delete(workplaceMembersTable).where(and(
    eq(workplaceMembersTable.conversationId, conversationId),
    eq(workplaceMembersTable.userId, targetId),
  ));
  removeWorkplaceUserFromConversation(targetId, conversationId);
  emitWorkplaceConversation(conversationId, "workplace:member_removed", { conversationId, userId: targetId });
  res.json({ ok: true });
});

router.get("/workplace/tasks", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const view = ["mine", "assigned", "completed"].includes(String(req.query.view)) ? String(req.query.view) : "mine";
  const ownership = isWorkplaceAdmin(req) && view !== "completed" ? undefined
    : view === "assigned" ? eq(workplaceTasksTable.assignedById, userId)
    : view === "completed" ? (isWorkplaceAdmin(req) ? eq(workplaceTasksTable.status, "completed") : and(eq(workplaceTasksTable.assigneeId, userId), eq(workplaceTasksTable.status, "completed")))
      : eq(workplaceTasksTable.assigneeId, userId);
  const tasks = await db.select({
    id: workplaceTasksTable.id,
    conversationId: workplaceTasksTable.conversationId,
    title: workplaceTasksTable.title,
    description: workplaceTasksTable.description,
    dueDate: workplaceTasksTable.dueDate,
    priority: workplaceTasksTable.priority,
    status: workplaceTasksTable.status,
    crmReferenceId: workplaceTasksTable.crmReferenceId,
    completedAt: workplaceTasksTable.completedAt,
    completedById: workplaceTasksTable.completedById,
    sourceMessageId: workplaceTasksTable.sourceMessageId,
    createdAt: workplaceTasksTable.createdAt,
    updatedAt: workplaceTasksTable.updatedAt,
    assigneeId: workplaceTasksTable.assigneeId,
    assigneeName: sql<string>`assignee.name`,
    assignedById: workplaceTasksTable.assignedById,
    assignedByName: sql<string>`assigner.name`,
  }).from(workplaceTasksTable)
    .innerJoin(sql`users assignee`, sql`assignee.id = ${workplaceTasksTable.assigneeId}`)
    .innerJoin(sql`users assigner`, sql`assigner.id = ${workplaceTasksTable.assignedById}`)
    .where(ownership)
    .orderBy(asc(workplaceTasksTable.status), asc(workplaceTasksTable.dueDate), desc(workplaceTasksTable.createdAt));
  res.json({ tasks });
});

router.post("/workplace/tasks", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = req.body?.conversationId == null ? null : parsePositiveId(req.body.conversationId);
  const sourceMessageId = req.body?.sourceMessageId == null ? null : parsePositiveId(req.body.sourceMessageId);
  const assigneeId = parsePositiveId(req.body?.assigneeId);
  const title = cleanText(req.body?.title, 160);
  if (!assigneeId || !title || (req.body?.conversationId != null && !conversationId)) {
    res.status(400).json({ error: "Task title and assignee are required." });
    return;
  }
  const resolvedConversationId = conversationId ?? null;
  if (resolvedConversationId && !await isMember(resolvedConversationId, req.authUser!.id)) {
    res.status(403).json({ error: "Conversation access denied." }); return;
  }
  if (!await employeeById(assigneeId)) { res.status(404).json({ error: "Assignee not found." }); return; }
  if (resolvedConversationId && !await isMember(resolvedConversationId, assigneeId)) {
    res.status(400).json({ error: "Assignee must be a conversation member." }); return;
  }
  if (sourceMessageId) {
    const [source] = await db.select().from(workplaceMessagesTable).where(eq(workplaceMessagesTable.id, sourceMessageId)).limit(1);
    if (!source || source.conversationId !== resolvedConversationId) { res.status(400).json({ error: "Source message must belong to the task conversation." }); return; }
  }
  const dueDate = req.body?.dueDate ? String(req.body.dueDate) : null;
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) { res.status(400).json({ error: "Invalid due date." }); return; }
  const priority = String(req.body?.priority || "medium");
  if (!["low", "medium", "high"].includes(priority)) { res.status(400).json({ error: "Invalid priority." }); return; }
  const [task] = await db.insert(workplaceTasksTable).values({
    conversationId: resolvedConversationId,
    title,
    description: cleanText(req.body?.description, 1000) || null,
    assigneeId,
    assignedById: req.authUser!.id,
    dueDate,
    priority,
    crmReferenceId: cleanText(req.body?.crmReferenceId, 120) || null,
    sourceMessageId,
  }).returning();
  await db.insert(workplaceTaskEventsTable).values({ taskId: task.id, eventType: "created", actorId: req.authUser!.id, newAssigneeId: assigneeId, newStatus: task.status });
  if (task.assigneeId !== req.authUser!.id) {
    await createNotification(task.assigneeId, "task_assigned", "New task assigned", `${req.authUser!.name} assigned you: ${task.title}`, req.authUser!.id, resolvedConversationId ?? undefined, task.id);
  }
  if (resolvedConversationId) emitWorkplaceConversation(resolvedConversationId, "workplace:task_created", task);
  res.status(201).json(task);
});

router.patch("/workplace/tasks/:id", workplaceAuth, async (req, res): Promise<void> => {
  const taskId = parseId(req.params.id);
  if (!taskId) { res.status(400).json({ error: "Invalid task." }); return; }
  const [task] = await db.select().from(workplaceTasksTable).where(eq(workplaceTasksTable.id, taskId)).limit(1);
  if (!task) { res.status(404).json({ error: "Task not found." }); return; }
  if (task.assigneeId !== req.authUser!.id && task.assignedById !== req.authUser!.id && !isWorkplaceAdmin(req)) {
    res.status(403).json({ error: "Task access denied." }); return;
  }
  const nextStatus = req.body?.status;
  const nextAssigneeId = req.body?.assigneeId === undefined ? undefined : parsePositiveId(req.body.assigneeId);
  if (req.body?.assigneeId !== undefined && !nextAssigneeId) { res.status(400).json({ error: "Invalid assignee." }); return; }
  if (nextAssigneeId && nextAssigneeId !== task.assigneeId) {
    if (task.status === "completed") { res.status(400).json({ error: "Completed tasks cannot be reassigned." }); return; }
    if (task.assignedById !== req.authUser!.id && !isWorkplaceAdmin(req)) { res.status(403).json({ error: "Only the assigner can reassign this task." }); return; }
    if (!await employeeById(nextAssigneeId) || (task.conversationId && !await isMember(task.conversationId, nextAssigneeId))) {
      res.status(400).json({ error: "Assignee must be an eligible conversation member." }); return;
    }
  }
  if (nextStatus !== undefined && (!["pending", "in_progress", "completed"].includes(String(nextStatus)) ||
    (task.assigneeId !== req.authUser!.id && !isWorkplaceAdmin(req) && nextStatus !== task.status))) {
    res.status(403).json({ error: "Only the assignee can change task status." }); return;
  }
  const permittedTransitions: Record<string, string[]> = {
    pending: ["in_progress"],
    in_progress: ["completed"],
    completed: [],
  };
  if (nextStatus !== undefined && nextStatus !== task.status && !permittedTransitions[task.status]?.includes(String(nextStatus))) {
    res.status(400).json({ error: "Tasks progress from Pending to In Progress to Completed." });
    return;
  }
  const [updated] = await db.update(workplaceTasksTable).set({
    ...(nextStatus !== undefined ? { status: nextStatus } : {}),
    ...(nextAssigneeId ? { assigneeId: nextAssigneeId } : {}),
    ...(nextStatus === "completed" ? { completedAt: new Date(), completedById: req.authUser!.id } : {}),
    updatedAt: new Date(),
  }).where(eq(workplaceTasksTable.id, taskId)).returning();
  if (nextStatus && nextStatus !== task.status) {
    await db.insert(workplaceTaskEventsTable).values({ taskId, eventType: "status_changed", actorId: req.authUser!.id, oldStatus: task.status, newStatus: String(nextStatus) });
    const recipient = task.assigneeId === req.authUser!.id ? task.assignedById : task.assigneeId;
    await createNotification(recipient, nextStatus === "completed" ? "task_completed" : "task_updated", nextStatus === "completed" ? "Task completed" : "Task status updated", `${req.authUser!.name} marked "${task.title}" ${nextStatus.replace("_", " ")}.`, req.authUser!.id, task.conversationId ?? undefined, task.id);
    if (task.conversationId) emitWorkplaceConversation(task.conversationId, "workplace:task_updated", updated);
  }
  if (nextAssigneeId && nextAssigneeId !== task.assigneeId) {
    await db.insert(workplaceTaskEventsTable).values({ taskId, eventType: "reassigned", actorId: req.authUser!.id, oldAssigneeId: task.assigneeId, newAssigneeId: nextAssigneeId });
    await createNotification(nextAssigneeId, "task_reassigned", "Task reassigned to you", `${req.authUser!.name} assigned you: ${task.title}`, req.authUser!.id, task.conversationId ?? undefined, task.id);
    if (task.conversationId) emitWorkplaceConversation(task.conversationId, "workplace:task_reassigned", updated);
  }
  res.json(updated);
});

async function canAccessTask(req: any, task: typeof workplaceTasksTable.$inferSelect): Promise<boolean> {
  return isWorkplaceAdmin(req) || task.assigneeId === req.authUser!.id || task.assignedById === req.authUser!.id
    || Boolean(task.conversationId && await isMember(task.conversationId, req.authUser!.id));
}

router.get("/workplace/tasks/:id", workplaceAuth, async (req, res): Promise<void> => {
  const taskId = parseId(req.params.id);
  if (!taskId) { res.status(400).json({ error: "Invalid task." }); return; }
  const [task] = await db.select().from(workplaceTasksTable).where(eq(workplaceTasksTable.id, taskId)).limit(1);
  if (!task) { res.status(404).json({ error: "Task not found." }); return; }
  if (!await canAccessTask(req, task)) { res.status(403).json({ error: "Task access denied." }); return; }
  const [conversation] = task.conversationId
    ? await db.select({ id: workplaceConversationsTable.id, type: workplaceConversationsTable.type, name: workplaceConversationsTable.name })
      .from(workplaceConversationsTable).where(eq(workplaceConversationsTable.id, task.conversationId)).limit(1)
    : [];
  const [assignee] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, task.assigneeId)).limit(1);
  const [assigner] = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable).where(eq(usersTable.id, task.assignedById)).limit(1);
  const remarks = await db.select({
    id: workplaceTaskRemarksTable.id, taskId: workplaceTaskRemarksTable.taskId, authorId: workplaceTaskRemarksTable.authorId,
    content: workplaceTaskRemarksTable.content, mentionsJson: workplaceTaskRemarksTable.mentionsJson, createdAt: workplaceTaskRemarksTable.createdAt,
    authorName: usersTable.name,
  }).from(workplaceTaskRemarksTable).leftJoin(usersTable, eq(workplaceTaskRemarksTable.authorId, usersTable.id))
    .where(eq(workplaceTaskRemarksTable.taskId, taskId)).orderBy(asc(workplaceTaskRemarksTable.createdAt));
  const events = await db.select().from(workplaceTaskEventsTable)
    .where(eq(workplaceTaskEventsTable.taskId, taskId)).orderBy(asc(workplaceTaskEventsTable.createdAt));
  res.json({ task: { ...task, assignee, assigner }, remarks, events, conversation: conversation ?? null });
});

router.get("/workplace/tasks/:id/remarks", workplaceAuth, async (req, res): Promise<void> => {
  const taskId = parseId(req.params.id);
  if (!taskId) { res.status(400).json({ error: "Invalid task." }); return; }
  const [task] = await db.select().from(workplaceTasksTable).where(eq(workplaceTasksTable.id, taskId)).limit(1);
  if (!task) { res.status(404).json({ error: "Task not found." }); return; }
  if (!await canAccessTask(req, task)) { res.status(403).json({ error: "Task access denied." }); return; }
  const remarks = await db.select({
    id: workplaceTaskRemarksTable.id, taskId: workplaceTaskRemarksTable.taskId, authorId: workplaceTaskRemarksTable.authorId,
    content: workplaceTaskRemarksTable.content, mentionsJson: workplaceTaskRemarksTable.mentionsJson, createdAt: workplaceTaskRemarksTable.createdAt, authorName: usersTable.name,
  }).from(workplaceTaskRemarksTable).leftJoin(usersTable, eq(workplaceTaskRemarksTable.authorId, usersTable.id))
    .where(eq(workplaceTaskRemarksTable.taskId, taskId)).orderBy(asc(workplaceTaskRemarksTable.createdAt));
  res.json({ remarks });
});

router.post("/workplace/tasks/:id/remarks", workplaceAuth, async (req, res): Promise<void> => {
  const taskId = parseId(req.params.id);
  const content = cleanText(req.body?.content, 1000);
  if (!taskId || !content) { res.status(400).json({ error: "Remark content is required." }); return; }
  const [task] = await db.select().from(workplaceTasksTable).where(eq(workplaceTasksTable.id, taskId)).limit(1);
  if (!task) { res.status(404).json({ error: "Task not found." }); return; }
  if (!await canAccessTask(req, task)) { res.status(403).json({ error: "Task access denied." }); return; }
  const rawMentionIds = req.body?.mentionUserIds;
  const standaloneMentionIds = rawMentionIds == null ? [] : Array.isArray(rawMentionIds)
    ? [...new Set(rawMentionIds.map(parsePositiveId))]
    : null;
  if (!task.conversationId && (!standaloneMentionIds || standaloneMentionIds.some((id) => id === null)
    || standaloneMentionIds.some((id) => id !== task.assigneeId && id !== task.assignedById))) {
    res.status(400).json({ error: "Mention recipients must be the task assignee or assigner." }); return;
  }
  const mentionIds = task.conversationId
    ? await authorizedMentionIds(task.conversationId, rawMentionIds)
    : standaloneMentionIds as number[];
  if (!mentionIds) { res.status(400).json({ error: "Mention recipients must be conversation members." }); return; }
  const [remark] = await db.insert(workplaceTaskRemarksTable).values({
    taskId, authorId: req.authUser!.id, content, mentionsJson: JSON.stringify({ userIds: mentionIds }),
  }).returning();
  const recipients = mentionIds.length ? mentionIds : [task.assigneeId, task.assignedById];
  for (const userId of [...new Set(recipients)]) if (userId !== req.authUser!.id) {
    await createNotification(userId, mentionIds.includes(userId) ? "task_mention" : "task_remark",
      mentionIds.includes(userId) ? `${req.authUser!.name} mentioned you on a task` : "New task remark",
      content.slice(0, 140), req.authUser!.id, task.conversationId ?? undefined, taskId);
  }
  if (task.conversationId) emitWorkplaceConversation(task.conversationId, "workplace:task_remark", remark);
  res.status(201).json(remark);
});

router.get("/workplace/notifications", workplaceAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const notifications = await db.select().from(workplaceNotificationsTable)
    .where(eq(workplaceNotificationsTable.userId, req.authUser!.id))
    .orderBy(desc(workplaceNotificationsTable.createdAt))
    .limit(limit);
  const unread = await db.select({ count: sql<number>`count(*)` }).from(workplaceNotificationsTable)
    .where(and(eq(workplaceNotificationsTable.userId, req.authUser!.id), sql`${workplaceNotificationsTable.readAt} IS NULL`));
  res.json({ notifications, unreadCount: Number(unread[0]?.count ?? 0) });
});

router.post("/workplace/notifications/read", workplaceAuth, async (req, res): Promise<void> => {
  const notificationId = req.body?.id == null ? null : parsePositiveId(req.body.id);
  const where = notificationId
    ? and(eq(workplaceNotificationsTable.id, notificationId), eq(workplaceNotificationsTable.userId, req.authUser!.id))
    : eq(workplaceNotificationsTable.userId, req.authUser!.id);
  await db.update(workplaceNotificationsTable).set({ readAt: new Date() }).where(where);
  res.json({ ok: true });
});

export default router;