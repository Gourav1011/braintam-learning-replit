import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api-base";
import { STAFF_TOKEN_KEY } from "@/components/auth-provider";

const fetchWithAuth = async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem(STAFF_TOKEN_KEY);
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!res.ok) throw new Error("API error");
  return res.json() as Promise<T>;
};

export type WorkplaceBadges = {
  conversations: number;
  groups: number;
  tasks: number;
  alerts: number;
  total: number;
};

export type WorkplaceNotification = {
  id: number | string;
  title: string;
  body: string;
  type: string;
  conversationId?: number | string | null;
  taskId?: number | string | null;
  createdAt?: string;
};

export function useWorkplaceRealtime(
  activeConversationId: string | null,
  onNotification?: (notification: WorkplaceNotification) => void,
  onConversationRemoved?: (conversationId: string) => void,
): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef(activeConversationId);
  const notificationRef = useRef(onNotification);
  const conversationRemovedRef = useRef(onConversationRemoved);
  const handledActiveMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => { notificationRef.current = onNotification; }, [onNotification]);
  useEffect(() => { conversationRemovedRef.current = onConversationRemoved; }, [onConversationRemoved]);

  useEffect(() => {
    const token = localStorage.getItem(STAFF_TOKEN_KEY);
    if (!token) return;
    const socket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      query: { workplace: "1" },
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      if (activeConversationRef.current) {
        socket.emit("workplace:join", activeConversationRef.current);
      }
    });

    const refreshConversations = () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
    };
    const refreshBadges = () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    };
    const refreshTasks = () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "tasks"] });
    };
    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "notifications"] });
    };
    const refreshMessage = (event: { conversationId?: number | string }) => {
      refreshConversations();
      refreshBadges();
      if (String(event.conversationId) === String(activeConversationRef.current)) {
        queryClient.invalidateQueries({ queryKey: ["workplace", "messages", activeConversationRef.current] });
      }
    };
    const refreshIncomingMessage = (event: { id?: number | string; conversationId?: number | string }) => {
      const conversationId = String(event.conversationId ?? "");
      if (conversationId && conversationId === String(activeConversationRef.current)) {
        const eventId = event.id == null ? null : `${conversationId}:${event.id}`;
        if (eventId && handledActiveMessageIdsRef.current.has(eventId)) return;
        if (eventId) {
          handledActiveMessageIdsRef.current.add(eventId);
          if (handledActiveMessageIdsRef.current.size > 100) {
            handledActiveMessageIdsRef.current.delete(handledActiveMessageIdsRef.current.values().next().value!);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["workplace", "messages", conversationId] });
        queryClient.setQueryData(["workplace", "conversations"], (current: any) => {
          if (!current?.conversations) return current;
          return {
            ...current,
            conversations: current.conversations.map((conversation: any) =>
              String(conversation.id) === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
            ),
          };
        });
        // Keep server state in sync without creating another socket or marking any other chat read.
        void fetchWithAuth(`/api/workplace/conversations/${conversationId}/read`, { method: "POST" })
          .catch(() => undefined)
          .finally(() => {
            queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
            queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
          });
        return;
      }
      refreshConversations();
      refreshBadges();
    };
    socket.on("workplace:message", refreshIncomingMessage);
    socket.on("workplace:message_edited", refreshMessage);
    socket.on("workplace:message_deleted", refreshMessage);
    socket.on("workplace:member_added", refreshMessage);
    socket.on("workplace:member_removed", refreshMessage);
    socket.on("workplace:conversation_added", () => {
      refreshConversations();
      refreshBadges();
    });
    socket.on("workplace:conversation_removed", (event: { conversationId?: number | string }) => {
      const conversationId = String(event.conversationId ?? "");
      if (!conversationId) return;
      queryClient.setQueryData(["workplace", "conversations"], (current: any) => {
        if (!current?.conversations) return current;
        return {
          ...current,
          conversations: current.conversations.filter((conversation: any) => String(conversation.id) !== conversationId),
        };
      });
      queryClient.removeQueries({ queryKey: ["workplace", "messages", conversationId] });
      queryClient.setQueryData(["workplace", "notifications"], (current: any) => {
        if (!current?.notifications) return current;
        const notifications = current.notifications.filter((notification: any) =>
          String(notification.conversationId) !== conversationId,
        );
        return {
          ...current,
          notifications,
          unreadCount: notifications.filter((notification: any) => !notification.readAt).length,
        };
      });
      refreshTasks();
      refreshNotifications();
      refreshBadges();
      conversationRemovedRef.current?.(conversationId);
    });
    const refreshTaskEvent = (event: { id?: number | string; taskId?: number | string }) => {
      refreshTasks();
      refreshBadges();
      const taskId = event.id ?? event.taskId;
      if (taskId) queryClient.invalidateQueries({ queryKey: ["workplace", "task", String(taskId)] });
    };
    socket.on("workplace:task_created", refreshTaskEvent);
    socket.on("workplace:task_updated", refreshTaskEvent);
    socket.on("workplace:task_reassigned", refreshTaskEvent);
    socket.on("workplace:task_remark", refreshTaskEvent);
    socket.on("workplace:notification", (notification: WorkplaceNotification) => {
      refreshNotifications();
      refreshConversations();
      refreshTasks();
      refreshBadges();
      // The page owns presentation; keeping this callback here preserves one socket.
      const isOpenMessageNotification = ["message", "mention"].includes(notification.type)
        && String(notification.conversationId ?? "") === String(activeConversationRef.current ?? "");
      if (!isOpenMessageNotification) {
        notificationRef.current?.(notification);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  useEffect(() => {
    if (!activeConversationId) return;
    socketRef.current?.emit("workplace:join", activeConversationId);
    return () => {
      socketRef.current?.emit("workplace:leave", activeConversationId);
    };
  }, [activeConversationId]);
}

export const useGetEmployees = (q: string = "", conversationId?: string | null) => {
  return useQuery({
    queryKey: ["workplace", "employees", q, conversationId || null],
    queryFn: () => fetchWithAuth(`/api/workplace/employees?q=${encodeURIComponent(q)}${conversationId ? `&conversationId=${encodeURIComponent(conversationId)}` : ""}`),
    enabled: Boolean(q.trim() || conversationId),
    staleTime: 15_000,
  });
};

export const useGetConversations = () => {
  return useQuery({
    queryKey: ["workplace", "conversations"],
    queryFn: () => fetchWithAuth(`/api/workplace/conversations`),
  });
};

export const useGetWorkplaceBadges = () => {
  return useQuery<WorkplaceBadges>({
    queryKey: ["workplace", "badges"],
    queryFn: () => fetchWithAuth<WorkplaceBadges>("/api/workplace/badges"),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
};

export const useCreateDirectConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string }) => 
      fetchWithAuth(`/api/workplace/conversations/direct`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useCreateGroupConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; memberIds: string[] }) => 
      fetchWithAuth(`/api/workplace/conversations/group`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useGetMessages = (conversationId: string | null) => {
  return useInfiniteQuery({
    queryKey: ["workplace", "messages", conversationId],
    queryFn: ({ pageParam }) => {
      const qs = pageParam ? `?limit=40&before=${encodeURIComponent(pageParam as string)}` : "?limit=40";
      return fetchWithAuth(`/api/workplace/conversations/${conversationId}/messages${qs}`);
    },
    getNextPageParam: (lastPage: any) => 
      lastPage.hasMore && lastPage.messages.length > 0 
        ? lastPage.messages[0].createdAt 
        : undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content, mentionUserIds = [] }: { conversationId: string; content: string; mentionUserIds?: string[] }) =>
      fetchWithAuth(`/api/workplace/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content, mentionUserIds }),
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useReadConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => 
      fetchWithAuth(`/api/workplace/conversations/${conversationId}/read`, {
        method: "POST",
      }),
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ["workplace", "conversations"] });
      await queryClient.cancelQueries({ queryKey: ["workplace", "badges"] });
      const previousConversations = queryClient.getQueryData(["workplace", "conversations"]);
      const previousBadges = queryClient.getQueryData<WorkplaceBadges>(["workplace", "badges"]);
      const conversation = (previousConversations as any)?.conversations?.find(
        (item: any) => String(item.id) === String(conversationId),
      );
      const unreadCount = Number(conversation?.unreadCount || 0);
      queryClient.setQueryData(["workplace", "conversations"], (current: any) => {
        if (!current?.conversations) return current;
        return {
          ...current,
          conversations: current.conversations.map((item: any) =>
            String(item.id) === String(conversationId) ? { ...item, unreadCount: 0 } : item,
          ),
        };
      });
      if (unreadCount > 0) {
        queryClient.setQueryData<WorkplaceBadges>(["workplace", "badges"], (current) => {
          if (!current) return current;
          const key = conversation?.type === "group" ? "groups" : "conversations";
          const reduction = Math.min(unreadCount, Number(current[key] || 0));
          return {
            ...current,
            [key]: Math.max(0, Number(current[key] || 0) - reduction),
            total: Math.max(0, Number(current.total || 0) - reduction),
          };
        });
      }
      return { previousConversations, previousBadges };
    },
    onError: (_error, _conversationId, context) => {
      if (context?.previousConversations) queryClient.setQueryData(["workplace", "conversations"], context.previousConversations);
      if (context?.previousBadges) queryClient.setQueryData(["workplace", "badges"], context.previousBadges);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      fetchWithAuth(`/api/workplace/conversations/${conversationId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      fetchWithAuth(`/api/workplace/conversations/${conversationId}/members/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useGetTasks = (view: "mine" | "assigned" | "completed") => {
  return useQuery({
    queryKey: ["workplace", "tasks", view],
    queryFn: () => fetchWithAuth(`/api/workplace/tasks?view=${view}`),
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      conversationId?: string;
      title: string;
      description?: string;
      assigneeId: string;
      dueDate?: string;
      priority: "low" | "medium" | "high";
      crmReferenceId?: string;
    }) => 
      fetchWithAuth(`/api/workplace/tasks`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "pending" | "in_progress" | "completed" }) => 
      fetchWithAuth(`/api/workplace/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useGetTask = (id: string | null) => useQuery({
  queryKey: ["workplace", "task", id],
  queryFn: () => fetchWithAuth(`/api/workplace/tasks/${id}`),
  enabled: !!id,
});

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: "pending" | "in_progress" | "completed"; assigneeId?: string }) =>
      fetchWithAuth(`/api/workplace/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "task", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useAddTaskRemark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content, mentionUserIds = [] }: { taskId: string; content: string; mentionUserIds?: string[] }) =>
      fetchWithAuth(`/api/workplace/tasks/${taskId}/remarks`, { method: "POST", body: JSON.stringify({ content, mentionUserIds }) }),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["workplace", "task", variables.taskId] }),
  });
};
// Name retained for the task detail composer; both use the same exposed route.
export const useCreateTaskRemark = useAddTaskRemark;

export const useEditMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, conversationId }: { id: string; content: string; conversationId: string }) =>
      fetchWithAuth(`/api/workplace/messages/${id}`, { method: "PATCH", body: JSON.stringify({ content }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, conversationId }: { id: string; conversationId: string }) =>
      fetchWithAuth(`/api/workplace/messages/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};

export const useGetMessageEdits = (id: string | null) => useQuery({
  queryKey: ["workplace", "message-edits", id],
  queryFn: () => fetchWithAuth(`/api/workplace/messages/${id}/edits`),
  enabled: !!id,
});

export const useGetNotifications = () => {
  return useQuery({
    queryKey: ["workplace", "notifications"],
    queryFn: () => fetchWithAuth(`/api/workplace/notifications`),
  });
};

export const useReadNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => 
      fetchWithAuth(`/api/workplace/notifications/read`, {
        method: "POST",
        body: JSON.stringify(id ? { id } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["workplace", "badges"] });
    },
  });
};
