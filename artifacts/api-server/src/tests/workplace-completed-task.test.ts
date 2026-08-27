import assert from "node:assert/strict";
import { test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { io, type Socket } from "socket.io-client";
import {
  db,
  pool,
  usersTable,
  workplaceConversationsTable,
  workplaceMembersTable,
  workplaceNotificationsTable,
  workplaceTasksTable,
} from "@workspace/db";
import { generateAuthToken } from "../lib/auth-token.js";

const baseUrl = (process.env.WORKPLACE_TEST_BASE_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");
const runId = `${Date.now()}-${process.pid}`;
const title = `Workplace regression ${runId}`;

type JsonObject = Record<string, any>;

type Fixture = {
  assignee: { id: number; name: string };
  assigner: { id: number; name: string };
  auditAdmin: { id: number; name: string };
  nonParticipant: { id: number; name: string };
  conversationId: number;
};

async function apiRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: JsonObject }> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  headers.set("content-type", "application/json");

  const response = await fetch(`${baseUrl}/api${path}`, { ...init, headers });
  const body = await response.json() as JsonObject;
  return { response, body };
}

function expectStatus(response: Response, expected: number, body: JsonObject): void {
  assert.equal(
    response.status,
    expected,
    `${response.status} response: ${JSON.stringify(body)}`,
  );
}

async function connectWorkplaceSocket(token: string): Promise<Socket> {
  const socket = io(baseUrl, {
    path: "/api/socket.io",
    auth: { token },
    query: { workplace: "1" },
    transports: ["websocket"],
    reconnection: false,
    timeout: 5_000,
  });

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  return socket;
}

async function createFixture(): Promise<Fixture> {
  return db.transaction(async (tx) => {
    const [assignee] = await tx.insert(usersTable).values({
      name: `Former Assignee ${runId}`,
      email: `workplace-assignee-${runId}@example.invalid`,
      role: "teacher",
      accountType: "teacher",
    }).returning({ id: usersTable.id, name: usersTable.name });
    const [assigner] = await tx.insert(usersTable).values({
      name: `Former Assigner ${runId}`,
      email: `workplace-assigner-${runId}@example.invalid`,
      role: "admin",
      accountType: "admin",
    }).returning({ id: usersTable.id, name: usersTable.name });
    const [auditAdmin] = await tx.insert(usersTable).values({
      name: `Workplace Audit Admin ${runId}`,
      email: `workplace-audit-${runId}@example.invalid`,
      role: "super_admin",
      accountType: "admin",
    }).returning({ id: usersTable.id, name: usersTable.name });
    const [nonParticipant] = await tx.insert(usersTable).values({
      name: `Unrelated Staff ${runId}`,
      email: `workplace-unrelated-${runId}@example.invalid`,
      role: "teacher",
      accountType: "teacher",
    }).returning({ id: usersTable.id, name: usersTable.name });

    const [conversation] = await tx.insert(workplaceConversationsTable).values({
      type: "group",
      name: `Regression fixture ${runId}`,
      createdById: assigner.id,
    }).returning({ id: workplaceConversationsTable.id });

    await tx.insert(workplaceMembersTable).values([
      { conversationId: conversation.id, userId: assigner.id, isAdmin: true },
      { conversationId: conversation.id, userId: assignee.id, isAdmin: false },
    ]);

    return {
      assignee,
      assigner,
      auditAdmin,
      nonParticipant,
      conversationId: conversation.id,
    };
  });
}

async function cleanFixture(fixture: Fixture): Promise<void> {
  const userIds = [
    fixture.assignee.id,
    fixture.assigner.id,
    fixture.auditAdmin.id,
    fixture.nonParticipant.id,
  ];

  await db.delete(workplaceNotificationsTable).where(inArray(workplaceNotificationsTable.userId, userIds));
  await db.delete(workplaceTasksTable).where(and(
    eq(workplaceTasksTable.conversationId, fixture.conversationId),
    inArray(workplaceTasksTable.assigneeId, userIds),
  ));
  await db.delete(workplaceConversationsTable).where(eq(
    workplaceConversationsTable.id,
    fixture.conversationId,
  ));
  await db.delete(usersTable).where(inArray(usersTable.id, userIds));
}

test("completed Workplace tasks can be reopened without losing audit history or leaking realtime payloads", async () => {
  const fixture = await createFixture();
  const assigneeToken = generateAuthToken(fixture.assignee.id);
  const assignerToken = generateAuthToken(fixture.assigner.id);
  const auditAdminToken = generateAuthToken(fixture.auditAdmin.id);
  const nonParticipantToken = generateAuthToken(fixture.nonParticipant.id);
  let nonParticipantSocket: Socket | undefined;
  let taskId: number | undefined;

  try {
    nonParticipantSocket = await connectWorkplaceSocket(nonParticipantToken);
    const leakedTaskPayloads: unknown[] = [];
    for (const eventName of [
      "workplace:task_created",
      "workplace:task_updated",
      "workplace:task_reassigned",
      "workplace:task_remark",
    ]) {
      nonParticipantSocket.on(eventName, (payload: JsonObject) => {
        if (
          payload?.title === title ||
          payload?.id === taskId ||
          payload?.taskId === taskId
        ) {
          leakedTaskPayloads.push({ eventName, payload });
        }
      });
    }

    const created = await apiRequest("/workplace/tasks", assignerToken, {
      method: "POST",
      body: JSON.stringify({
        conversationId: fixture.conversationId,
        assigneeId: fixture.assignee.id,
        title,
        description: "Must preserve the complete task audit trail.",
        priority: "high",
      }),
    });
    expectStatus(created.response, 201, created.body);
    taskId = created.body.id;
    assert.equal(created.body.status, "pending");
    assert.equal(created.body.assigneeId, fixture.assignee.id);

    const started = await apiRequest(`/workplace/tasks/${taskId}`, assigneeToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    });
    expectStatus(started.response, 200, started.body);
    assert.equal(started.body.status, "in_progress");

    const remark = await apiRequest(`/workplace/tasks/${taskId}/remarks`, assigneeToken, {
      method: "POST",
      body: JSON.stringify({ content: `Progress note ${runId}` }),
    });
    expectStatus(remark.response, 201, remark.body);

    const completed = await apiRequest(`/workplace/tasks/${taskId}`, assigneeToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    expectStatus(completed.response, 200, completed.body);
    assert.equal(completed.body.status, "completed");
    assert.equal(completed.body.completedById, fixture.assignee.id);
    assert.ok(completed.body.completedAt, "completion timestamp should be recorded");

    await db.update(usersTable)
      .set({ isActive: false })
      .where(inArray(usersTable.id, [fixture.assignee.id, fixture.assigner.id]));

    const completedDetail = await apiRequest(`/workplace/tasks/${taskId}`, auditAdminToken);
    expectStatus(completedDetail.response, 200, completedDetail.body);
    assert.equal(completedDetail.body.task.status, "completed");
    assert.equal(completedDetail.body.task.assignee.id, fixture.assignee.id);
    assert.equal(completedDetail.body.task.assignee.name, fixture.assignee.name);
    assert.equal(completedDetail.body.task.assigner.id, fixture.assigner.id);
    assert.equal(completedDetail.body.task.assigner.name, fixture.assigner.name);
    assert.equal(completedDetail.body.task.completedBy.id, fixture.assignee.id);
    assert.equal(completedDetail.body.task.completedBy.name, fixture.assignee.name);

    const reopened = await apiRequest(`/workplace/tasks/${taskId}`, auditAdminToken, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
    });
    expectStatus(reopened.response, 200, reopened.body);
    assert.equal(reopened.body.status, "in_progress");
    assert.equal(reopened.body.completedById, fixture.assignee.id);
    assert.equal(reopened.body.completedAt, completed.body.completedAt);

    await db.update(usersTable)
      .set({ isActive: true })
      .where(eq(usersTable.id, fixture.assignee.id));

    const reopenedDetail = await apiRequest(`/workplace/tasks/${taskId}`, assigneeToken);
    expectStatus(reopenedDetail.response, 200, reopenedDetail.body);
    assert.equal(reopenedDetail.body.task.status, "in_progress");
    assert.equal(reopenedDetail.body.task.completedById, fixture.assignee.id);
    assert.equal(reopenedDetail.body.task.completedAt, completed.body.completedAt);
    assert.equal(reopenedDetail.body.remarks.length, 1);
    assert.equal(reopenedDetail.body.remarks[0].content, `Progress note ${runId}`);
    assert.deepEqual(
      [...new Set(reopenedDetail.body.events.map((event: JsonObject) => event.eventType))].sort(),
      ["task_completed", "task_created", "task_reopened", "task_status_changed", "work_update_added"].sort(),
      "reopening should preserve every prior task event",
    );

    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.deepEqual(
      leakedTaskPayloads,
      [],
      "a nonparticipant must not receive task realtime payloads",
    );
  } finally {
    nonParticipantSocket?.disconnect();
    await cleanFixture(fixture);
    await pool.end();
  }
});