import type { Server } from "socket.io";

let io: Server | null = null;

export const workplaceConversationRoom = (conversationId: number | string) =>
  `workplace-conversation-${conversationId}`;
export const workplaceUserRoom = (userId: number | string) =>
  `workplace-user-${userId}`;

export function registerWorkplaceRealtime(server: Server): void {
  io = server;
}

export function emitWorkplaceConversation(conversationId: number, event: string, payload: unknown): void {
  io?.to(workplaceConversationRoom(conversationId)).emit(event, payload);
}

export function emitWorkplaceUser(userId: number, event: string, payload: unknown): void {
  io?.to(workplaceUserRoom(userId)).emit(event, payload);
}

export function removeWorkplaceUserFromConversation(userId: number, conversationId: number): void {
  const userSockets = io?.sockets.adapter.rooms.get(workplaceUserRoom(userId));
  for (const socketId of userSockets ?? []) {
    io?.sockets.sockets.get(socketId)?.leave(workplaceConversationRoom(conversationId));
  }
}