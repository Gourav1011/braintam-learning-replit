import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api-base";
import { STAFF_TOKEN_KEY } from "@/components/auth-provider";

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem(STAFF_TOKEN_KEY);
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!res.ok) throw new Error("API error");
  return res.json();
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
): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef(activeConversationId);
  const notificationRef = useRef(onNotification);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => { notificationRef.current = onNotification; }, [onNotification]);

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
    const refreshTasks = () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "tasks"] });
    };
    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "notifications"] });
    };
    const refreshMessage = (event: { conversationId?: number | string }) => {
      refreshConversations();
      if (String(event.conversationId) === String(activeConversationRef.current)) {
        queryClient.invalidateQueries({ queryKey: ["workplace", "messages", activeConversationRef.current] });
      }
    };
    socket.on("workplace:message", refreshMessage);
    socket.on("workplace:message_edited", refreshMessage);
    socket.on("workplace:message_deleted", refreshMessage);
    socket.on("workplace:member_added", refreshMessage);
    socket.on("workplace:member_removed", refreshMessage);
    socket.on("workplace:conversation_added", refreshConversations);
    const refreshTaskEvent = (event: { id?: number | string; taskId?: number | string }) => {
      refreshTasks();
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workplace", "conversations"] });
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
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["workplace", "messages", variables.conversationId] }),
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, conversationId }: { id: string; conversationId: string }) =>
      fetchWithAuth(`/api/workplace/messages/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["workplace", "messages", variables.conversationId] }),
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
    },
  });
};
