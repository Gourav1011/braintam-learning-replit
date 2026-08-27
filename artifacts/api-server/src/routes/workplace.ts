import { Router } from "express";
import { and, asc, desc, eq, gt, ilike, inArray, lt, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  workplaceConversationsTable,
  workplaceMembersTable,
  workplaceMessagesTable,
  workplaceNotificationsTable,
  workplaceTasksTable,
} from "@workspace/db";
import { requireRole } from "../middlewares/auth.js";
import {
  beginWorkplaceMembershipRevocation,
  emitWorkplaceConversation,
  emitWorkplaceUser,
  isWorkplaceMembershipRevoked,
  revokeWorkplaceUserConversation,
  restoreWorkplaceMembership,
} from "../lib/workplace-realtime.js";

const router = Router();
const workplaceAuth = requireRole(
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
  if (isWorkplaceMembershipRevoked(userId, conversationId)) return null;
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

async function hasConversationAccess(conversationId: number | null, userId: number): Promise<boolean> {
  return conversationId == null || Boolean(await isMember(conversationId, userId));
}

function notificationAccessCondition(userId: number) {
  return sql`(
    ${workplaceNotificationsTable.conversationId} IS NULL
    OR EXISTS (
      SELECT 1
      FROM ${workplaceMembersTable}
      WHERE ${workplaceMembersTable.conversationId} = ${workplaceNotificationsTable.conversationId}
        AND ${workplaceMembersTable.userId} = ${userId}
    )
  )`;
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
  if (conversationId && (
    isWorkplaceMembershipRevoked(userId, conversationId) ||
    !await hasConversationAccess(conversationId, userId)
  )) {
    return null;
  }
  const [notification] = await db.insert(workplaceNotificationsTable).values({
    userId,
    type,
    title,
    body,
    actorId,
    conversationId,
    taskId,
  }).returning();
  if (conversationId && (
    isWorkplaceMembershipRevoked(userId, conversationId) ||
    !await hasConversationAccess(conversationId, userId)
  )) {
    await db.delete(workplaceNotificationsTable).where(eq(workplaceNotificationsTable.id, notification.id));
    return null;
  }
  emitWorkplaceUser(userId, "workplace:notification", notification, conversationId);
  return notification;
}

async function conversationSummary(conversationId: number, userId: number) {
  if (!await isMember(conversationId, userId)) return null;
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
    .innerJoin(usersTable, eq(workplaceMembersTable.userId, usersTable.id))
    .where(eq(workplaceMembersTable.conversationId, conversationId))
    .orderBy(asc(workplaceMembersTable.joinedAt));
  const member = members.find((item) => item.id === userId);
  if (!member) return null;
  const lastMessage = await db
    .select({
      id: workplaceMessagesTable.id,
      content: workplaceMessagesTable.content,
      createdAt: workplaceMessagesTable.createdAt,
      senderId: workplaceMessagesTable.senderId,
      senderName: usersTable.name,
    })
    .from(workplaceMessagesTable)
    .innerJoin(usersTable, eq(workplaceMessagesTable.senderId, usersTable.id))
    .where(eq(workplaceMessagesTable.conversationId, conversationId))
    .orderBy(desc(workplaceMessagesTable.createdAt))
    .limit(1);
  const unread = member.lastReadAt
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
  if (!await isMember(conversationId, userId)) return null;
  return {
    ...conversation,
    displayName: conversation.type === "group"
      ? conversation.name || "Untitled group"
      : others[0]?.name || "Direct conversation",
    members,
    unreadCount: Number(unread[0]?.count ?? 0),
    lastMessage: lastMessage[0] ?? null,
  };
}

router.get("/workplace/employees", workplaceAuth, async (req, res): Promise<void> => {
  const query = cleanText(req.query.q, 80);
  const conditions = [
    eq(usersTable.isActive, true),
    eq(usersTable.isDeleted, false),
    or(...employeeRoles.map((role) => eq(usersTable.role, role))),
  ];
  if (query) {
    conditions.push(or(
      ilike(usersTable.name, `%${query}%`),
      ilike(usersTable.email, `%${query}%`),
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

router.get("/workplace/badges", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const unreadMessageCondition = and(
    sql`(${workplaceMembersTable.lastReadAt} IS NULL OR ${workplaceMessagesTable.createdAt} > ${workplaceMembersTable.lastReadAt})`,
    sql`${workplaceMessagesTable.senderId} <> ${userId}`,
  );
  const [directMessages, groupMessages, outstandingTasks, unreadAlerts] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(workplaceMembersTable)
      .innerJoin(workplaceConversationsTable, eq(workplaceMembersTable.conversationId, workplaceConversationsTable.id))
      .innerJoin(workplaceMessagesTable, eq(workplaceMessagesTable.conversationId, workplaceConversationsTable.id))
      .where(and(
        eq(workplaceMembersTable.userId, userId),
        eq(workplaceConversationsTable.type, "direct"),
        unreadMessageCondition,
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(workplaceMembersTable)
      .innerJoin(workplaceConversationsTable, eq(workplaceMembersTable.conversationId, workplaceConversationsTable.id))
      .innerJoin(workplaceMessagesTable, eq(workplaceMessagesTable.conversationId, workplaceConversationsTable.id))
      .where(and(
        eq(workplaceMembersTable.userId, userId),
        eq(workplaceConversationsTable.type, "group"),
        unreadMessageCondition,
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(workplaceTasksTable)
      .where(and(
        eq(workplaceTasksTable.assigneeId, userId),
        inArray(workplaceTasksTable.status, ["pending", "in_progress"]),
      )),
    db.select({ count: sql<number>`count(*)` })
      .from(workplaceNotificationsTable)
      .where(and(
        eq(workplaceNotificationsTable.userId, userId),
        sql`${workplaceNotificationsTable.readAt} IS NULL`,
        notificationAccessCondition(userId),
      )),
  ]);
  const conversations = Number(directMessages[0]?.count ?? 0);
  const groups = Number(groupMessages[0]?.count ?? 0);
  const tasks = Number(outstandingTasks[0]?.count ?? 0);
  res.json({
    conversations,
    groups,
    tasks,
    alerts: Number(unreadAlerts[0]?.count ?? 0),
    total: conversations + groups + tasks,
  });
});

router.get("/workplace/conversations", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const members = await db.select({ conversationId: workplaceMembersTable.conversationId })
    .from(workplaceMembersTable)
    .where(eq(workplaceMembersTable.userId, userId));
  const summaries = (await Promise.all(
    members.map(({ conversationId }) => conversationSummary(conversationId, userId)),
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
  if (!await isMember(conversationId, req.authUser!.id)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 100);
  const before = req.query.before ? new Date(String(req.query.before)) : null;
  const conditions = [eq(workplaceMessagesTable.conversationId, conversationId)];
  if (before && !Number.isNaN(before.getTime())) conditions.push(lt(workplaceMessagesTable.createdAt, before));
  const rows = await db.select({
    id: workplaceMessagesTable.id,
    conversationId: workplaceMessagesTable.conversationId,
    content: workplaceMessagesTable.content,
    mentionsJson: workplaceMessagesTable.mentionsJson,
    createdAt: workplaceMessagesTable.createdAt,
    senderId: workplaceMessagesTable.senderId,
    senderName: usersTable.name,
    senderRole: usersTable.role,
    avatarUrl: usersTable.avatarUrl,
  }).from(workplaceMessagesTable)
    .innerJoin(usersTable, eq(workplaceMessagesTable.senderId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(workplaceMessagesTable.createdAt))
    .limit(limit);
  if (!await isMember(conversationId, req.authUser!.id)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  res.json({ messages: rows.reverse(), hasMore: rows.length === limit });
});

router.post("/workplace/conversations/:id/messages", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) { res.status(400).json({ error: "Invalid conversation." }); return; }
  if (!await isMember(conversationId, req.authUser!.id)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  const content = cleanText(req.body?.content, 1000);
  if (!content) { res.status(400).json({ error: "Message cannot be empty." }); return; }
  const mentions = [...content.matchAll(/@([a-zA-Z0-9._-]+)/g)].map((match) => match[1].toLowerCase()).slice(0, 10);
  const [message] = await db.insert(workplaceMessagesTable).values({
    conversationId,
    senderId: req.authUser!.id,
    content,
    mentionsJson: JSON.stringify(mentions),
  }).returning();
  if (!await isMember(conversationId, req.authUser!.id)) {
    await db.delete(workplaceMessagesTable).where(eq(workplaceMessagesTable.id, message.id));
    res.status(403).json({ error: "Conversation access denied." });
    return;
  }
  await db.update(workplaceConversationsTable).set({
    lastMessageAt: message.createdAt,
    updatedAt: new Date(),
  }).where(eq(workplaceConversationsTable.id, conversationId));
  if (!await isMember(conversationId, req.authUser!.id)) {
    await db.delete(workplaceMessagesTable).where(eq(workplaceMessagesTable.id, message.id));
    res.status(403).json({ error: "Conversation access denied." });
    return;
  }
  const members = await db.select({ userId: workplaceMembersTable.userId, name: usersTable.name })
    .from(workplaceMembersTable)
    .innerJoin(usersTable, eq(workplaceMembersTable.userId, usersTable.id))
    .where(eq(workplaceMembersTable.conversationId, conversationId));
  const payload = { ...message, senderName: req.authUser!.name, senderRole: req.authUser!.role };
  emitWorkplaceConversation(conversationId, "workplace:message", payload);
  for (const member of members) {
    emitWorkplaceUser(member.userId, "workplace:message", payload, conversationId);
    if (member.userId !== req.authUser!.id) {
      const mentionNames = member.name.toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.replace(/[^a-z0-9._-]/g, ""));
      const isMentioned = mentions.some((mention) => mentionNames.includes(mention));
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

router.post("/workplace/conversations/:id/read", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = parseId(req.params.id);
  if (!conversationId) { res.status(400).json({ error: "Invalid conversation." }); return; }
  if (!await isMember(conversationId, req.authUser!.id)) { res.status(403).json({ error: "Conversation access denied." }); return; }
  const now = new Date();
  await db.update(workplaceMembersTable).set({ lastReadAt: now })
    .where(and(eq(workplaceMembersTable.conversationId, conversationId), eq(workplaceMembersTable.userId, req.authUser!.id)));
  if (!await isMember(conversationId, req.authUser!.id)) { res.status(403).json({ error: "Conversation access denied." }); return; }
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
  restoreWorkplaceMembership(employee.id, conversationId);
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
  if (!await isMember(conversationId, targetId)) {
    res.status(404).json({ error: "Member not found." });
    return;
  }
  beginWorkplaceMembershipRevocation(targetId, conversationId);
  let removed: boolean;
  try {
    removed = await db.transaction(async (tx) => {
      const [deletedMember] = await tx.delete(workplaceMembersTable).where(and(
        eq(workplaceMembersTable.conversationId, conversationId),
        eq(workplaceMembersTable.userId, targetId),
      )).returning({ id: workplaceMembersTable.id });
      if (!deletedMember) return false;
      await tx.delete(workplaceNotificationsTable).where(and(
        eq(workplaceNotificationsTable.userId, targetId),
        eq(workplaceNotificationsTable.conversationId, conversationId),
      ));
      return true;
    });
  } catch (error) {
    restoreWorkplaceMembership(targetId, conversationId);
    throw error;
  }
  if (!removed) {
    res.status(404).json({ error: "Member not found." });
    return;
  }
  revokeWorkplaceUserConversation(targetId, conversationId, { conversationId, userId: targetId });
  emitWorkplaceConversation(conversationId, "workplace:member_removed", { conversationId, userId: targetId });
  res.json({ ok: true });
});

router.get("/workplace/tasks", workplaceAuth, async (req, res): Promise<void> => {
  const userId = req.authUser!.id;
  const view = req.query.view === "assigned" ? "assigned" : "mine";
  const condition = view === "assigned"
    ? eq(workplaceTasksTable.assignedById, userId)
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
    createdAt: workplaceTasksTable.createdAt,
    updatedAt: workplaceTasksTable.updatedAt,
    assigneeId: workplaceTasksTable.assigneeId,
    assigneeName: sql<string>`assignee.name`,
    assignedById: workplaceTasksTable.assignedById,
    assignedByName: sql<string>`assigner.name`,
  }).from(workplaceTasksTable)
    .innerJoin(sql`users assignee`, sql`assignee.id = ${workplaceTasksTable.assigneeId}`)
    .innerJoin(sql`users assigner`, sql`assigner.id = ${workplaceTasksTable.assignedById}`)
    .where(condition)
    .orderBy(asc(workplaceTasksTable.status), asc(workplaceTasksTable.dueDate), desc(workplaceTasksTable.createdAt));
  const visibleTasks = (await Promise.all(
    tasks.map(async (task) => await hasConversationAccess(task.conversationId, userId) ? task : null),
  )).filter(Boolean);
  res.json({ tasks: visibleTasks });
});

router.post("/workplace/tasks", workplaceAuth, async (req, res): Promise<void> => {
  const conversationId = req.body?.conversationId == null ? null : parsePositiveId(req.body.conversationId);
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
  }).returning();
  if (resolvedConversationId && (
    !await isMember(resolvedConversationId, req.authUser!.id) ||
    !await isMember(resolvedConversationId, assigneeId)
  )) {
    await db.delete(workplaceTasksTable).where(eq(workplaceTasksTable.id, task.id));
    res.status(403).json({ error: "Conversation access denied." });
    return;
  }
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
  if (task.assigneeId !== req.authUser!.id && task.assignedById !== req.authUser!.id) {
    res.status(403).json({ error: "Task access denied." }); return;
  }
  if (!await hasConversationAccess(task.conversationId, req.authUser!.id)) {
    res.status(403).json({ error: "Conversation access denied." });
    return;
  }
  const nextStatus = req.body?.status;
  if (nextStatus !== undefined && (!["pending", "in_progress", "completed"].includes(String(nextStatus)) ||
    (task.assigneeId !== req.authUser!.id && nextStatus !== task.status))) {
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
    updatedAt: new Date(),
  }).where(eq(workplaceTasksTable.id, taskId)).returning();
  if (!await hasConversationAccess(task.conversationId, req.authUser!.id)) {
    await db.update(workplaceTasksTable).set({
      status: task.status,
      updatedAt: task.updatedAt,
    }).where(and(
      eq(workplaceTasksTable.id, taskId),
      eq(workplaceTasksTable.updatedAt, updated.updatedAt),
    ));
    res.status(403).json({ error: "Conversation access denied." });
    return;
  }
  if (nextStatus && nextStatus !== task.status) {
    const recipient = task.assigneeId === req.authUser!.id ? task.assignedById : task.assigneeId;
    await createNotification(recipient, nextStatus === "completed" ? "task_completed" : "task_updated", nextStatus === "completed" ? "Task completed" : "Task status updated", `${req.authUser!.name} marked "${task.title}" ${nextStatus.replace("_", " ")}.`, req.authUser!.id, task.conversationId ?? undefined, task.id);
    if (task.conversationId) emitWorkplaceConversation(task.conversationId, "workplace:task_updated", updated);
  }
  res.json(updated);
});

router.get("/workplace/notifications", workplaceAuth, async (req, res): Promise<void> => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const notifications = await db.select().from(workplaceNotificationsTable)
    .where(and(
      eq(workplaceNotificationsTable.userId, req.authUser!.id),
      notificationAccessCondition(req.authUser!.id),
    ))
    .orderBy(desc(workplaceNotificationsTable.createdAt))
    .limit(limit);
  const visibleNotifications = notifications.filter((notification) =>
    notification.conversationId == null ||
    !isWorkplaceMembershipRevoked(req.authUser!.id, notification.conversationId));
  const unread = await db.select({ conversationId: workplaceNotificationsTable.conversationId }).from(workplaceNotificationsTable)
    .where(and(
      eq(workplaceNotificationsTable.userId, req.authUser!.id),
      sql`${workplaceNotificationsTable.readAt} IS NULL`,
      notificationAccessCondition(req.authUser!.id),
    ));
  const unreadCount = unread.filter((notification) =>
    notification.conversationId == null ||
    !isWorkplaceMembershipRevoked(req.authUser!.id, notification.conversationId)).length;
  res.json({ notifications: visibleNotifications, unreadCount });
});

router.post("/workplace/notifications/read", workplaceAuth, async (req, res): Promise<void> => {
  const notificationId = req.body?.id == null ? null : parsePositiveId(req.body.id);
  const where = notificationId
    ? and(
      eq(workplaceNotificationsTable.id, notificationId),
      eq(workplaceNotificationsTable.userId, req.authUser!.id),
      notificationAccessCondition(req.authUser!.id),
    )
    : and(
      eq(workplaceNotificationsTable.userId, req.authUser!.id),
      notificationAccessCondition(req.authUser!.id),
    );
  await db.update(workplaceNotificationsTable).set({ readAt: new Date() }).where(where);
  res.json({ ok: true });
});

export default router;