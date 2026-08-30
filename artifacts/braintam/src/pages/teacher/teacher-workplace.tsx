import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Circle,
  Clock,
  Inbox,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  Reply,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { GroupMembersDialog } from "@/components/workplace-group-members";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateDirectConversation,
  useCreateGroupConversation,
  useCreateTask,
  useCreateTaskRemark,
  useDeleteMessage,
  useEditMessage,
  useGetConversations,
  useGetEmployees,
  useGetMessages,
  useGetNotifications,
  useGetTask,
  useGetTasks,
  useGetWorkplaceBadges,
  useReadConversation,
  useReadNotification,
  useSendMessage,
  useUpdateTask,
  useWorkplaceRealtime,
  type WorkplaceNotification,
} from "@/hooks/use-workplace";

export type TeacherWorkplaceSection = "conversations" | "groups" | "tasks" | "notifications";

type IconType = ElementType<{ className?: string }>;

const NAV_ITEMS: { id: TeacherWorkplaceSection; label: string; description: string; icon: IconType; badge: "conversations" | "groups" | "tasks" | "alerts" }[] = [
  { id: "conversations", label: "Conversations", description: "Direct messages and team chats", icon: MessageSquare, badge: "conversations" },
  { id: "groups", label: "Groups", description: "Your shared teacher spaces", icon: Users, badge: "groups" },
  { id: "tasks", label: "My Tasks", description: "Work assigned to you or by you", icon: CheckSquare, badge: "tasks" },
  { id: "notifications", label: "Alerts", description: "Mentions and workplace updates", icon: Bell, badge: "alerts" },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
}

function formatConversationTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function StatusPill({ status }: { status: string }) {
  const styles = status === "completed"
    ? "bg-emerald-50 text-emerald-700"
    : status === "in_progress"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles}`}>{statusLabel(status)}</span>;
}

function EmptyPanel({ icon: Icon, title, description }: { icon: IconType; title: string; description: string }) {
  return (
    <div className="flex h-full min-h-[18rem] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function InlineQueryError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <AlertCircle className="h-7 w-7 text-red-400" />
      <div>
        <p className="text-xs font-bold text-slate-700">{title}</p>
        <p className="mt-1 text-[10px] text-slate-400">Check your connection and try again.</p>
      </div>
      <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={onRetry}>Try again</Button>
    </div>
  );
}

export default function TeacherWorkplace({
  initialSection = "conversations",
  onSectionChange,
  onExit,
}: {
  initialSection?: TeacherWorkplaceSection;
  onSectionChange?: (section: TeacherWorkplaceSection) => void;
  onExit?: () => void;
}) {
  const { data: badgeData, isLoading: badgesLoading, isError: badgesError, refetch: refetchBadges } = useGetWorkplaceBadges();
  const { data: conversationData, isLoading: conversationsLoading, isError: conversationsError, refetch: refetchConversations } = useGetConversations();
  const readConversationMutation = useReadConversation();
  const readNotificationMutation = useReadNotification();
  const [activeSection, setActiveSection] = useState<TeacherWorkplaceSection>(initialSection);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<WorkplaceNotification[]>([]);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveSection(initialSection);
    setSelectedConversationId(null);
    setSelectedTaskId(null);
  }, [initialSection]);

  const activeConversation = useMemo(
    () => conversationData?.conversations?.find((conversation: any) => String(conversation.id) === String(selectedConversationId)),
    [conversationData, selectedConversationId],
  );

  const selectSection = (section: TeacherWorkplaceSection) => {
    setActiveSection(section);
    setSelectedConversationId(null);
    setSelectedTaskId(null);
    onSectionChange?.(section);
  };

  const openConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedTaskId(null);
    readConversationMutation.mutate(conversationId, {
      onError: () => toast.error("Could not mark this conversation as read."),
    });
  };

  const openTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSelectedConversationId(null);
  };

  const handleNotification = (notification: WorkplaceNotification) => {
    setToasts((current) => current.some((item) => String(item.id) === String(notification.id))
      ? current
      : [...current, notification].slice(-3));
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToasts([]), 5500);
  };

  const openNotification = (notification: WorkplaceNotification) => {
    setToasts((current) => current.filter((item) => String(item.id) !== String(notification.id)));
    readNotificationMutation.mutate(String(notification.id), {
      onError: () => toast.error("The alert could not be marked as read."),
    });
    if (notification.taskId) {
      selectSection("tasks");
      setSelectedTaskId(String(notification.taskId));
    } else if (notification.conversationId) {
      selectSection("conversations");
      setSelectedConversationId(String(notification.conversationId));
    }
  };

  useWorkplaceRealtime(selectedConversationId, handleNotification, (conversationId) => {
    setSelectedConversationId((current) => String(current) === conversationId ? null : current);
  });

  if (badgesLoading || conversationsLoading) return <TeacherWorkplaceLoading />;
  if (badgesError || conversationsError) {
    return (
      <TeacherWorkplaceError onRetry={() => {
        void refetchBadges();
        void refetchConversations();
      }} />
    );
  }

  const selectedDetail = selectedConversationId || selectedTaskId;
  const totalUnread = Number(badgeData?.total || 0) + Number(badgeData?.alerts || 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f7f9fc]">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {onExit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-slate-500 md:hidden"
                  aria-label="Back to Teacher Portal"
                  onClick={onExit}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0B2B6B] text-white shadow-sm">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-[#0B2B6B]">Teacher Workplace</h1>
                <p className="text-[11px] text-slate-500">Stay aligned with your teaching team.</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-700 sm:inline-flex">
              {totalUnread > 0 ? `${totalUnread} updates waiting` : "You’re all caught up"}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 text-[11px]"
              onClick={() => {
                void refetchBadges();
                void refetchConversations();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
        <nav className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const count = Number(badgeData?.[item.badge] || 0);
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={`group flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? "border-indigo-200 bg-indigo-50 text-[#0B2B6B] shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-100 hover:bg-slate-50"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold">{item.label}</span>
                  <span className="hidden truncate text-[9px] text-slate-400 lg:block">{item.description}</span>
                </span>
                {count > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-indigo-600 px-1 text-[9px] font-black text-white">{count > 99 ? "99+" : count}</span>}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden p-3 md:p-4">
        <aside className={`w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:w-[310px] ${selectedDetail ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
          {activeSection === "conversations" && <ConversationRail groupsOnly={false} selectedId={selectedConversationId} onSelect={openConversation} />}
          {activeSection === "groups" && <ConversationRail groupsOnly selectedId={selectedConversationId} onSelect={openConversation} />}
          {activeSection === "tasks" && <TaskRail selectedId={selectedTaskId} onSelect={openTask} />}
          {activeSection === "notifications" && <AlertRail onOpen={openNotification} />}
        </aside>
        <main className={`min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:ml-4 ${selectedDetail ? "flex" : "hidden md:flex"}`}>
          {activeSection === "notifications" && <EmptyPanel icon={Bell} title="Your alerts" description="Open an alert from the list to jump directly to its conversation or task." />}
          {activeSection === "conversations" && (
            selectedConversationId
              ? <ChatPanel conversation={activeConversation} conversationId={selectedConversationId} onBack={() => setSelectedConversationId(null)} />
              : <EmptyPanel icon={MessageSquare} title="Choose a conversation" description="Select a teammate or group from the list to start collaborating." />
          )}
          {activeSection === "groups" && (
            selectedConversationId
              ? <ChatPanel conversation={activeConversation} conversationId={selectedConversationId} onBack={() => setSelectedConversationId(null)} />
              : <EmptyPanel icon={Users} title="Choose a group" description="Open a group conversation to share updates with your teaching team." />
          )}
          {activeSection === "tasks" && (
            selectedTaskId
              ? <TaskDetailPanel taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} onViewConversation={(conversationId) => { selectSection("conversations"); setSelectedConversationId(conversationId); }} />
              : <EmptyPanel icon={CheckSquare} title="Choose a task" description="Select a task to see its owner, due date, work updates, and status controls." />
          )}
        </main>
      </div>

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] space-y-2">
          {toasts.map((notification) => (
            <button key={notification.id} type="button" onClick={() => openNotification(notification)} className="w-full rounded-xl border border-indigo-100 bg-white p-3 text-left shadow-lg transition hover:border-indigo-300">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900"><Bell className="h-4 w-4 text-indigo-600" />{notification.title}</div>
              <p className="mt-1 truncate text-[11px] text-slate-500">{notification.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TeacherWorkplaceLoading() {
  return (
    <div className="flex h-full min-h-[30rem] items-center justify-center bg-[#f7f9fc] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><MessageSquare className="h-5 w-5 animate-pulse" /></div>
        <h2 className="mt-4 text-sm font-bold text-slate-900">Opening Teacher Workplace</h2>
        <p className="mt-1 text-xs text-slate-500">Loading your conversations and work updates.</p>
        <div className="mt-5 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-5/6" /><Skeleton className="h-10 w-2/3" /></div>
      </div>
    </div>
  );
}

function TeacherWorkplaceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full min-h-[30rem] items-center justify-center bg-[#f7f9fc] p-6">
      <div className="max-w-sm rounded-2xl border border-red-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-500"><AlertCircle className="h-5 w-5" /></div>
        <h2 className="mt-4 text-sm font-bold text-slate-900">Workplace could not be opened</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">We couldn’t load your conversations. Check your connection and try again.</p>
        <Button variant="outline" size="sm" className="mt-5 h-8 text-xs" onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

function ConversationRail({ groupsOnly, selectedId, onSelect }: { groupsOnly: boolean; selectedId: string | null; onSelect: (id: string) => void }) {
  const { data, isLoading } = useGetConversations();
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const conversations = (data?.conversations || []).filter((conversation: any) =>
    (!groupsOnly || conversation.type === "group")
    && String(conversation.displayName || "").toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-sm font-bold text-slate-900">{groupsOnly ? "Groups" : "Conversations"}</p><p className="mt-0.5 text-[10px] text-slate-400">{groupsOnly ? "Shared spaces for your team" : "Direct and team messages"}</p></div>
          <Button size="icon" className="h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-700" aria-label="Start a conversation" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 text-white" /></Button>
        </div>
        <div className="relative mt-3"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={groupsOnly ? "Search groups" : "Search conversations"} className="h-9 border-slate-200 bg-slate-50 pl-8 text-xs shadow-none focus-visible:ring-indigo-200" /></div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {isLoading ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />) : conversations.length === 0 ? (
          <div className="px-4 py-12 text-center"><MessageSquare className="mx-auto h-7 w-7 text-slate-200" /><p className="mt-2 text-xs font-semibold text-slate-500">{search ? "No matching conversations" : groupsOnly ? "No groups yet" : "No conversations yet"}</p><p className="mt-1 text-[10px] text-slate-400">Use the plus button to start one.</p></div>
        ) : conversations.map((conversation: any) => (
          <button key={conversation.id} type="button" onClick={() => onSelect(String(conversation.id))} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${selectedId === String(conversation.id) ? "border-indigo-200 bg-indigo-50" : "border-transparent hover:border-slate-100 hover:bg-slate-50"}`}>
            <div className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${conversation.type === "group" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
              {conversation.type === "group" ? <Users className="h-4 w-4" /> : initials(conversation.displayName)}
              {conversation.unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-white bg-indigo-600 px-1 text-[8px] font-black text-white">{conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}</span>}
            </div>
            <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-xs font-bold text-slate-800">{conversation.displayName}</span><span className="shrink-0 text-[9px] text-slate-400">{formatConversationTime(conversation.lastMessageAt)}</span></span><span className={`mt-1 block truncate text-[10px] ${conversation.unreadCount > 0 ? "font-semibold text-slate-700" : "text-slate-400"}`}>{conversation.lastMessage?.content || "Start a new conversation"}</span></span>
          </button>
        ))}
      </div>
      {newOpen && <NewConversationDialog onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); onSelect(id); }} />}
    </div>
  );
}

function ChatPanel({ conversation, conversationId, onBack }: { conversation: any; conversationId: string; onBack: () => void }) {
  const { student } = useAuth();
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = useGetMessages(conversationId);
  const sendMutation = useSendMessage();
  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const messages = data?.pages.slice().reverse().flatMap((page: any) => page.messages || []) || [];
  const isGroupAdmin = conversation?.type === "group" && conversation.members?.some((member: any) => String(member.id) === String(student?.id) && member.isAdmin);

  useEffect(() => {
    if (scrollRef.current && !isFetchingNextPage) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [data?.pages[0]?.messages?.length, isFetchingNextPage]);

  if (!conversation) return <div className="flex flex-1 items-center justify-center"><Skeleton className="h-5 w-40" /></div>;

  const handleSend = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!content.trim() || sendMutation.isPending) return;
    sendMutation.mutate(
      { conversationId, content: content.trim() },
      {
        onSuccess: () => setContent(""),
        onError: () => toast.error("Your message was not sent. Please try again."),
      },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fbfcfe]">
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-400 md:hidden" onClick={onBack}><ChevronRight className="h-5 w-5 rotate-180" /></Button>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${conversation.type === "group" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{conversation.type === "group" ? <Users className="h-4 w-4" /> : initials(conversation.displayName)}</div>
          <div className="min-w-0"><h2 className="truncate text-sm font-bold text-slate-900">{conversation.displayName}</h2><p className="text-[10px] text-slate-400">{conversation.type === "group" ? `${conversation.members?.length || 0} members` : "Direct conversation"}</p></div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" title="Assign task" onClick={() => setTaskOpen(true)}><CheckSquare className="h-4 w-4" /></Button>
          {isGroupAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" title="Manage group members" onClick={() => setMembersOpen(true)}><MoreVertical className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-8">
        {isLoading ? <><Skeleton className="h-12 w-2/3 rounded-2xl" /><Skeleton className="ml-auto h-16 w-3/4 rounded-2xl" /><Skeleton className="h-12 w-1/2 rounded-2xl" /></> : isError ? <InlineQueryError title="Messages could not be loaded" onRetry={() => { void refetch(); }} /> : messages.length === 0 ? <p className="py-12 text-center text-xs text-slate-400">This is the beginning of your conversation.</p> : <>
          {hasNextPage && <div className="text-center"><Button variant="outline" size="sm" className="h-7 text-[10px]" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? "Loading older messages…" : "Load older messages"}</Button></div>}
          {messages.map((message: any) => {
            const isMe = String(message.senderId) === String(student?.id);
            return <div key={message.id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && <span className="mb-1 ml-1 text-[10px] font-semibold text-slate-500">{message.senderName}</span>}
              <div className={`relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed md:max-w-[70%] ${isMe ? "rounded-tr-sm border border-indigo-100 bg-indigo-50 text-[#183b72]" : "rounded-tl-sm border border-slate-200 bg-white text-slate-700 shadow-sm"}`}>
                {editing?.id === message.id ? <Textarea autoFocus value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); editMutation.mutate({ id: String(message.id), content: editing.content, conversationId }, { onSuccess: () => setEditing(null), onError: () => toast.error("The message could not be updated.") }); } }} className="min-h-[36px] bg-white text-xs text-slate-900" /> : message.content}
                <span className="mt-1 block text-right text-[9px] text-slate-400">{format(new Date(message.createdAt), "h:mm a")}{message.editedAt ? " · Edited" : ""}</span>
              </div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 opacity-0 transition group-hover:opacity-100"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align={isMe ? "end" : "start"} className="text-xs"><DropdownMenuItem onClick={() => setContent((value) => `${value}${value ? "\n" : ""}Replying to ${message.senderName}: `)}><Reply className="mr-2 h-3.5 w-3.5" />Reply</DropdownMenuItem><DropdownMenuItem onClick={() => navigator.clipboard?.writeText(message.content)}><Pencil className="mr-2 h-3.5 w-3.5" />Copy message</DropdownMenuItem>{isMe && !message.deletedAt && <><DropdownMenuItem onClick={() => setEditing({ id: message.id, content: message.content })}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate({ id: String(message.id), conversationId }, { onError: () => toast.error("The message could not be deleted.") })}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu>
            </div>;
          })}
        </>}
      </div>
      <form onSubmit={handleSend} className="shrink-0 border-t border-slate-200 bg-white p-3 md:p-4">
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50">
          <Textarea disabled={isError} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(event); } }} placeholder={isError ? "Reload messages to continue" : "Write a message…"} className="min-h-[38px] max-h-28 resize-none border-0 bg-transparent px-2 py-2 text-xs shadow-none focus-visible:ring-0" />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700" disabled={isError || !content.trim() || sendMutation.isPending}><Send className="h-4 w-4 text-white" /></Button>
        </div>
        <p className="mt-1.5 px-1 text-[9px] text-slate-400">Press Enter to send · Shift + Enter for a new line</p>
      </form>
      {taskOpen && <NewTaskDialog conversationId={conversationId} members={conversation.members} onClose={() => setTaskOpen(false)} onCreated={() => setTaskOpen(false)} />}
      {membersOpen && <GroupMembersDialog conversation={conversation} onClose={() => setMembersOpen(false)} />}
    </div>
  );
}

function NewConversationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [query, setQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: employees, isLoading, isError, refetch } = useGetEmployees(query);
  const directMutation = useCreateDirectConversation();
  const groupMutation = useCreateGroupConversation();
  const toggle = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-5"><DialogTitle className="text-base">Start a conversation</DialogTitle><DialogDescription className="sr-only">Find a colleague for a direct message or create a teacher group.</DialogDescription><div className="mt-3 flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setMode("direct")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === "direct" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Direct message</button><button type="button" onClick={() => setMode("group")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === "group" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>New group</button></div></DialogHeader>
        <div className="space-y-3 border-b bg-slate-50/70 p-4">{mode === "group" && <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className="bg-white text-xs" />}<div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or employee ID" className="bg-white pl-9 text-xs" /></div></div>
        <div className="max-h-72 overflow-y-auto p-2">{!query.trim() ? <p className="p-8 text-center text-xs text-slate-400">Type a colleague’s name to search.</p> : isLoading ? <div className="space-y-2 p-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : isError ? <InlineQueryError title="Colleagues could not be loaded" onRetry={() => { void refetch(); }} /> : employees?.length ? employees.map((employee: any) => <button type="button" key={employee.id} onClick={() => mode === "direct" ? directMutation.mutate({ userId: String(employee.id) }, { onSuccess: (conversation: any) => onCreated(String(conversation.id)), onError: () => toast.error("The conversation could not be started.") }) : toggle(String(employee.id))} className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left hover:bg-slate-50"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{initials(employee.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-800">{employee.name}</span><span className="block truncate text-[10px] capitalize text-slate-400">{String(employee.role || "").replace("_", " ")}{employee.employeeId ? ` · ${employee.employeeId}` : ""}</span></span>{mode === "group" && <span className={`grid h-5 w-5 place-items-center rounded border ${selectedIds.includes(String(employee.id)) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>{selectedIds.includes(String(employee.id)) && <CheckCircle2 className="h-3.5 w-3.5" />}</span>}</button>) : <p className="p-8 text-center text-xs text-slate-400">No colleagues found.</p>}</div>
        {mode === "group" && <DialogFooter className="border-t p-3"><span className="mr-auto self-center text-[10px] text-slate-400">{selectedIds.length} selected</span><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button size="sm" className="bg-indigo-600 text-xs hover:bg-indigo-700" disabled={!groupName.trim() || selectedIds.length === 0 || groupMutation.isPending} onClick={() => groupMutation.mutate({ name: groupName.trim(), memberIds: selectedIds }, { onSuccess: (conversation: any) => onCreated(String(conversation.id)), onError: () => toast.error("The group could not be created.") })}>Create group</Button></DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

function TaskRail({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [view, setView] = useState<"mine" | "assigned" | "completed">("mine");
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useGetTasks(view);
  const tasks = (data?.tasks || []).filter((task: any) => !query.trim() || [task.title, task.assigneeName, task.assignedByName, task.priority, task.status].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">My Tasks</p><p className="mt-0.5 text-[10px] text-slate-400">Track work across your team</p></div><Button size="sm" className="h-8 bg-indigo-600 px-2.5 text-[10px] hover:bg-indigo-700" onClick={() => setNewOpen(true)}><Plus className="mr-1 h-3.5 w-3.5" /> New</Button></div><div className="mt-3 flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setView("mine")} className={`flex-1 rounded-md py-1.5 text-[10px] font-bold ${view === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Mine</button><button type="button" onClick={() => setView("assigned")} className={`flex-1 rounded-md py-1.5 text-[10px] font-bold ${view === "assigned" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Assigned</button><button type="button" onClick={() => setView("completed")} className={`flex-1 rounded-md py-1.5 text-[10px] font-bold ${view === "completed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Done</button></div><div className="relative mt-3"><Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="h-8 pl-8 text-[10px]" /></div></div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">{isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full rounded-xl" />) : isError ? <InlineQueryError title="Tasks could not be loaded" onRetry={() => { void refetch(); }} /> : tasks.length === 0 ? <div className="px-4 py-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-slate-200" /><p className="mt-2 text-xs font-semibold text-slate-500">{query ? "No matching tasks" : "No tasks here"}</p></div> : tasks.map((task: any) => <button type="button" key={task.id} onClick={() => onSelect(String(task.id))} className={`w-full rounded-xl border p-3 text-left transition ${selectedId === String(task.id) ? "border-indigo-200 bg-indigo-50" : "border-slate-100 hover:border-indigo-100 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-xs font-bold text-slate-800">{task.title}</span><StatusPill status={task.status} /></div><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">{task.dueDate && <span className={new Date(task.dueDate) < new Date() && task.status !== "completed" ? "font-semibold text-red-500" : ""}><Calendar className="mr-1 inline h-3 w-3" />{format(new Date(task.dueDate), "MMM d")}</span>}<span><UserPlus className="mr-1 inline h-3 w-3" />{view === "mine" ? task.assignedByName || "Former employee" : task.assigneeName || "Former employee"}</span></div></button>)}</div>
      {newOpen && <NewTaskDialog onClose={() => setNewOpen(false)} onCreated={(id) => { setNewOpen(false); onSelect(id); }} />}
    </div>
  );
}

function TaskDetailPanel({ taskId, onBack, onViewConversation }: { taskId: string; onBack: () => void; onViewConversation: (id: string) => void }) {
  const { student } = useAuth();
  const { data, isLoading, isError, refetch } = useGetTask(taskId);
  const { data: conversationData } = useGetConversations();
  const [remark, setRemark] = useState("");
  const [reassignOpen, setReassignOpen] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const task = data?.task;
  const {
    data: employeeResults,
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useGetEmployees(employeeQuery, reassignOpen && task?.conversationId ? String(task.conversationId) : null);
  const remarkMutation = useCreateTaskRemark();
  const updateMutation = useUpdateTask();
  useEffect(() => {
    if (remarkMutation.isError) toast.error("The work update could not be added.");
  }, [remarkMutation.error, remarkMutation.isError]);
  useEffect(() => {
    if (updateMutation.isError) toast.error("The task could not be updated.");
  }, [updateMutation.error, updateMutation.isError]);
  if (isLoading) return <div className="flex flex-1 items-center justify-center"><Skeleton className="h-6 w-44" /></div>;
  if (isError || !task) return <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><AlertCircle className="h-8 w-8 text-red-400" /><p className="text-sm font-bold text-slate-800">Task could not be loaded</p><p className="text-xs text-slate-500">It may have been removed or you may no longer have access.</p><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button><Button size="sm" onClick={onBack}>Back to tasks</Button></div></div>;
  const isAssignee = String(task.assigneeId) === String(student?.id);
  const isAssigner = String(task.assignedById) === String(student?.id);
  const isAdmin = ["admin", "super_admin"].includes(String(student?.role));
  const canReassign = task.status !== "completed" && isAssigner;
  const linkedConversation = conversationData?.conversations?.find((conversation: any) => String(conversation.id) === String(task.conversationId));
  const eligibleEmployees = (employeeResults || []).filter((employee: any) => !linkedConversation?.members?.length || linkedConversation.members.some((member: any) => String(member.id) === String(employee.id)));
  const dueDays = task.dueDate ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000) : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#fbfcfe]">
      <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6"><div className="flex min-w-0 items-center gap-2"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 md:hidden" onClick={onBack}><ChevronRight className="h-5 w-5 rotate-180" /></Button><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Task details</p><h2 className="truncate text-sm font-black text-slate-900">{task.title}</h2></div></div><div className="flex gap-2">{task.conversationId && <Button variant="outline" size="sm" className="h-8 px-2 text-[10px]" aria-label="View linked conversation" onClick={() => onViewConversation(String(task.conversationId))}><MessageSquare className="h-3.5 w-3.5 text-indigo-600 sm:mr-1.5" /><span className="hidden sm:inline">View conversation</span></Button>}<Button variant="ghost" size="sm" className="hidden text-[10px] text-slate-500 md:inline-flex" onClick={onBack}>Close <X className="ml-1 h-3.5 w-3.5" /></Button></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2"><StatusPill status={task.status} /><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${task.priority === "high" ? "bg-red-50 text-red-600" : task.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}>{task.priority} priority</span>{task.dueDate && <span className={`text-[10px] ${dueDays !== null && dueDays < 0 ? "font-bold text-red-500" : "text-slate-400"}`}><Calendar className="mr-1 inline h-3 w-3" />{format(new Date(task.dueDate), "MMM d, yyyy")}{dueDays !== null && dueDays < 0 ? " · overdue" : ""}</span>}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><InfoCell label="Assigned to" value={task.assignee?.name || task.assigneeName || "Former employee"} /><InfoCell label="Assigned by" value={task.assigner?.name || task.assignedByName || "Former employee"} /></div>
        {task.description && <section className="mt-5"><h3 className="text-xs font-bold text-slate-800">Description</h3><p className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">{task.description}</p></section>}
        {canReassign && <section className="mt-5 rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-700">Need another owner?</span><Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setReassignOpen((value) => !value)}><UserPlus className="mr-1 h-3.5 w-3.5" /> Reassign</Button></div>{reassignOpen && <div className="mt-3"><Input value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder="Search eligible employee" className="h-8 text-xs" />{employeesLoading && <p className="mt-2 text-[10px] text-slate-400">Loading eligible employees…</p>}{employeesError && <p className="mt-2 text-[10px] text-red-500">Eligible employees could not be loaded. <button type="button" className="font-bold underline" onClick={() => { void refetchEmployees(); }}>Try again</button></p>}{!employeesLoading && !employeesError && employeeQuery.trim() && eligibleEmployees.length === 0 && <p className="mt-2 text-[10px] text-slate-400">No eligible employees found.</p>}{!employeesError && eligibleEmployees.slice(0, 6).map((employee: any) => <button type="button" key={employee.id} className="mt-1 block w-full rounded-lg p-2 text-left text-xs hover:bg-slate-50" onClick={() => updateMutation.mutate({ id: taskId, assigneeId: String(employee.id) }, { onSuccess: () => { setReassignOpen(false); setEmployeeQuery(""); } })}>{employee.name}</button>)}</div>}</section>}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><section><div className="flex items-center gap-2"><h3 className="text-xs font-bold text-slate-800">Work updates</h3><span className="text-[10px] text-slate-400">@mentions notify participants</span></div>{isAssignee || isAssigner ? <div className="mt-2 flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2"><Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Add an update…" className="min-h-[42px] border-0 text-xs shadow-none focus-visible:ring-0" /><Button size="sm" className="h-8 bg-indigo-600 text-[10px] hover:bg-indigo-700" disabled={!remark.trim() || remarkMutation.isPending} onClick={() => remarkMutation.mutate({ taskId, content: remark.trim() }, { onSuccess: () => setRemark("") })}>Add</Button></div> : <p className="mt-2 rounded-xl border border-dashed border-slate-200 bg-white p-3 text-[10px] text-slate-400">This task is view-only for you.</p>}<div className="mt-3 space-y-2">{(data?.remarks || []).map((item: any) => <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex justify-between gap-2 text-[10px]"><span className="font-bold text-slate-700">{item.authorName}</span><span className="text-slate-400">{format(new Date(item.createdAt), "MMM d · h:mm a")}</span></div><p className="mt-1 text-xs leading-relaxed text-slate-600">{item.content}</p></div>)}</div></section><section><h3 className="text-xs font-bold text-slate-800">Activity</h3><div className="mt-3 space-y-3">{(data?.events || []).map((event: any) => <div key={event.id} className="flex gap-2.5"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-600"><Circle className="h-2 w-2 fill-current" /></span><div><p className="text-[10px] font-semibold capitalize text-slate-700">{statusLabel(event.eventType || "task updated")}</p><p className="mt-0.5 text-[9px] text-slate-400">{format(new Date(event.createdAt), "MMM d, yyyy · h:mm a")} · {event.actorName || "System"}</p></div></div>)}</div></section></div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 md:px-6"><span className="mr-auto text-[10px] font-semibold text-slate-500">{isAssignee ? "Update your status" : "Only the assignee can update status"}</span>{task.status === "completed" && <Button variant="outline" size="sm" className="h-8 text-[10px]" disabled={!(isAssignee || isAdmin) || updateMutation.isPending} onClick={() => updateMutation.mutate({ id: taskId, status: "in_progress" })}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reopen</Button>}<Button variant={task.status === "pending" ? "default" : "outline"} size="sm" className="h-8 text-[10px]" disabled>{task.status === "pending" && <Circle className="mr-1 h-3 w-3" />}Pending</Button><Button variant={task.status === "in_progress" ? "default" : "outline"} size="sm" className="h-8 text-[10px]" disabled={!isAssignee || task.status !== "pending" || updateMutation.isPending} onClick={() => updateMutation.mutate({ id: taskId, status: "in_progress" })}><Clock className="mr-1 h-3 w-3" />In progress</Button><Button variant={task.status === "completed" ? "default" : "outline"} size="sm" className="h-8 text-[10px]" disabled={!isAssignee || task.status !== "in_progress" || updateMutation.isPending} onClick={() => updateMutation.mutate({ id: taskId, status: "completed" })}><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Button></div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-xs font-semibold text-slate-800">{value}</p></div>;
}

function NewTaskDialog({ onClose, onCreated, conversationId, members }: { onClose: () => void; onCreated: (id: string) => void; conversationId?: string; members?: any[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const { data: employees, isFetching, isError, refetch } = useGetEmployees(query, conversationId);
  const createMutation = useCreateTask();
  const eligible = (employees || []).filter((employee: any) => !members?.length || members.some((member: any) => String(member.id) === String(employee.id)));
  return (
    <Dialog open onOpenChange={onClose}><DialogContent className="max-w-md gap-0 overflow-hidden p-0"><DialogHeader className="border-b p-5"><DialogTitle className="text-base">Create task</DialogTitle><DialogDescription className="sr-only">Assign a Workplace task to an eligible colleague.</DialogDescription></DialogHeader><form onSubmit={(event) => { event.preventDefault(); if (!title.trim() || !assigneeId) return; createMutation.mutate({ conversationId, title: title.trim(), description: description.trim() || undefined, assigneeId, priority, dueDate: dueDate || undefined }, { onSuccess: (task: any) => onCreated(String(task.id)), onError: () => toast.error("The task could not be created.") }); }}><div className="space-y-4 p-5"><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Task title</label><Input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs to be done?" className="text-xs" /></div><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Assignee</label><Input required={!assigneeId} value={assigneeId ? assigneeName : query} onChange={(event) => { setAssigneeId(""); setAssigneeName(""); setQuery(event.target.value); }} placeholder="Search employee" className="text-xs" />{isFetching && <p className="mt-1 text-[10px] text-slate-400">Searching…</p>}{isError && <p className="mt-1 text-[10px] text-red-500">Assignees could not be loaded. <button type="button" className="font-bold underline" onClick={() => { void refetch(); }}>Try again</button></p>}{!isError && !assigneeId && query && <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border bg-white p-1">{eligible.slice(0, 8).map((employee: any) => <button type="button" key={employee.id} className="flex w-full justify-between rounded p-2 text-left text-xs hover:bg-slate-50" onClick={() => { setAssigneeId(String(employee.id)); setAssigneeName(employee.name); setQuery(""); }}><span>{employee.name}</span><span className="text-[10px] text-slate-400">{employee.employeeId || employee.role}</span></button>)}</div>}</div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority</label><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="h-9 w-full rounded-md border border-input bg-white px-2 text-xs"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Due date</label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="text-xs" /></div></div><div><label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context or instructions" className="min-h-20 resize-none text-xs" /></div></div><DialogFooter className="border-t bg-slate-50/70 p-4"><Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button type="submit" size="sm" className="bg-indigo-600 text-xs hover:bg-indigo-700" disabled={createMutation.isPending || !title.trim() || !assigneeId}>Create task</Button></DialogFooter></form></DialogContent></Dialog>
  );
}

function AlertRail({ onOpen }: { onOpen: (notification: WorkplaceNotification) => void }) {
  const { data, isLoading, isError, refetch } = useGetNotifications();
  const notifications = data?.notifications || [];
  return (
    <div className="flex min-h-0 flex-1 flex-col"><div className="border-b border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-900">Alerts</p><p className="mt-0.5 text-[10px] text-slate-400">Mentions, tasks, and new messages</p></div>{data?.unreadCount > 0 && <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">{data.unreadCount} new</span>}</div></div><div className="min-h-0 flex-1 overflow-y-auto">{isLoading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="border-b border-slate-100 p-4"><Skeleton className="h-12 w-full" /></div>) : isError ? <InlineQueryError title="Alerts could not be loaded" onRetry={() => { void refetch(); }} /> : notifications.length === 0 ? <div className="px-5 py-14 text-center"><Inbox className="mx-auto h-9 w-9 text-slate-200" /><p className="mt-3 text-xs font-semibold text-slate-500">All caught up</p><p className="mt-1 text-[10px] text-slate-400">New workplace updates will appear here.</p></div> : notifications.map((notification: any) => <button type="button" key={notification.id} onClick={() => onOpen(notification)} className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${!notification.readAt ? "bg-indigo-50/40" : "bg-white"}`}><div className="flex items-start gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${notification.type?.includes("task") ? "bg-amber-50 text-amber-600" : notification.type?.includes("message") ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>{notification.type?.includes("task") ? <CheckSquare className="h-4 w-4" /> : notification.type?.includes("message") ? <MessageSquare className="h-4 w-4" /> : <Bell className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{notification.title}</span><span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-slate-500">{notification.body}</span><span className="mt-2 block text-[9px] text-slate-400">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span></span></div></button>)}</div></div>
  );
}