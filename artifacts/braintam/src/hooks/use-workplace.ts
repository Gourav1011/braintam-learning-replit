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

export function useWorkplaceRealtime(activeConversationId: string | null): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef(activeConversationId);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

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
    socket.on("workplace:member_added", refreshMessage);
    socket.on("workplace:member_removed", refreshMessage);
    socket.on("workplace:conversation_added", refreshConversations);
    socket.on("workplace:task_created", refreshTasks);
    socket.on("workplace:task_updated", refreshTasks);
    socket.on("workplace:notification", () => {
      refreshNotifications();
      refreshConversations();
      refreshTasks();
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

export const useGetEmployees = (q: string = "") => {
  return useQuery({
    queryKey: ["workplace", "employees", q],
    queryFn: () => fetchWithAuth(`/api/workplace/employees?q=${encodeURIComponent(q)}`),
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
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) => 
      fetchWithAuth(`/api/workplace/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
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

export const useGetTasks = (view: "mine" | "assigned") => {
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
