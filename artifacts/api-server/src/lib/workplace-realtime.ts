import type { Server } from "socket.io";

let io: Server | null = null;
const revokedMemberships = new Set<string>();

export const workplaceConversationRoom = (conversationId: number | string) =>
  `workplace-conversation-${conversationId}`;
export const workplaceUserRoom = (userId: number | string) =>
  `workplace-user-${userId}`;

function membershipKey(userId: number | string, conversationId: number | string) {
  return `${userId}:${conversationId}`;
}

export function registerWorkplaceRealtime(server: Server): void {
  io = server;
}

export function emitWorkplaceConversation(conversationId: number, event: string, payload: unknown): void {
  io?.to(workplaceConversationRoom(conversationId)).emit(event, payload);
}

export function emitWorkplaceUser(
  userId: number,
  event: string,
  payload: unknown,
  conversationId?: number,
): void {
  if (conversationId && isWorkplaceMembershipRevoked(userId, conversationId)) return;
  io?.to(workplaceUserRoom(userId)).emit(event, payload);
}

export function isWorkplaceMembershipRevoked(userId: number, conversationId: number): boolean {
  return revokedMemberships.has(membershipKey(userId, conversationId));
}

export function restoreWorkplaceMembership(userId: number, conversationId: number): void {
  revokedMemberships.delete(membershipKey(userId, conversationId));
  const userSockets = io?.sockets.adapter.rooms.get(workplaceUserRoom(userId));
  for (const socketId of userSockets ?? []) {
    io?.sockets.sockets.get(socketId)?.join(workplaceConversationRoom(conversationId));
  }
}

export function beginWorkplaceMembershipRevocation(userId: number, conversationId: number): void {
  revokedMemberships.add(membershipKey(userId, conversationId));
  removeWorkplaceUserFromConversation(userId, conversationId);
}

export function revokeWorkplaceUserConversation(
  userId: number,
  conversationId: number,
  payload: unknown,
): void {
  beginWorkplaceMembershipRevocation(userId, conversationId);
  const userSockets = io?.sockets.adapter.rooms.get(workplaceUserRoom(userId));
  for (const socketId of userSockets ?? []) {
    const socket = io?.sockets.sockets.get(socketId);
    if (!socket) continue;
    socket.leave(workplaceConversationRoom(conversationId));
    socket.emit("workplace:conversation_removed", payload);
  }
}

export function removeWorkplaceUserFromConversation(userId: number, conversationId: number): void {
  const userSockets = io?.sockets.adapter.rooms.get(workplaceUserRoom(userId));
  for (const socketId of userSockets ?? []) {
    io?.sockets.sockets.get(socketId)?.leave(workplaceConversationRoom(conversationId));
  }
}
