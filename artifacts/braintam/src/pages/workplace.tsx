import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MessageSquare, CheckSquare, Bell, Search, Plus, 
  Send, MoreVertical, Calendar, Clock, AlertCircle, 
  CheckCircle2, Circle, ArrowRight, UserPlus, FileText,
  Users, ChevronRight, Inbox, Copy, Reply, AtSign, Pencil, Trash2, History
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { 
  useGetEmployees, useGetConversations, useCreateDirectConversation, 
  useCreateGroupConversation, useGetMessages, useSendMessage, 
  useReadConversation, useGetTasks, useCreateTask, useWorkplaceRealtime,
  useAddGroupMember, useRemoveGroupMember,
  useUpdateTaskStatus, useGetNotifications, useReadNotification, useEditMessage, useDeleteMessage, useGetMessageEdits,
  useGetTask, useUpdateTask, useCreateTaskRemark, useGetWorkplaceBadges, type WorkplaceNotification
} from "@/hooks/use-workplace";
import { useAuth } from "@/components/auth-provider";
import { GroupMembersDialog } from "@/components/workplace-group-members";

type Tab = "messages" | "tasks" | "notifications";
export type WorkplaceSection = "conversations" | "groups" | "tasks" | "notifications";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function Initials({ name }: { name: string }) {
  return <>{name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}</>;
}

function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function WorkplacePage({ initialSection = "conversations", onSectionChange }: {
  initialSection?: WorkplaceSection;
  onSectionChange?: (section: WorkplaceSection) => void;
}) {
  const [activeSection, setActiveSection] = useState<WorkplaceSection>(initialSection);
  const activeTab: Tab = activeSection === "tasks" ? "tasks" : activeSection === "notifications" ? "notifications" : "messages";
  
  // Selection state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<WorkplaceNotification[]>([]);
  const { data: badgeData } = useGetWorkplaceBadges();
  const selectSection = (section: WorkplaceSection) => {
    setActiveSection(section);
    setSelectedConversationId(null);
    setSelectedTaskId(null);
    onSectionChange?.(section);
  };
  useEffect(() => {
    setActiveSection(initialSection);
    setSelectedConversationId(null);
    setSelectedTaskId(null);
  }, [initialSection]);
  const handleNotification = (notification: WorkplaceNotification) => {
    setToasts(current => current.some(item => String(item.id) === String(notification.id)) ? current : [...current, notification].slice(-4));
  };
  useWorkplaceRealtime(selectedConversationId, handleNotification, (conversationId) => {
    setSelectedConversationId((current) => String(current) === conversationId ? null : current);
  });
  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => setToasts(current => current.slice(1)), 5500);
    return () => window.clearTimeout(timer);
  }, [toasts]);
  const chatUnread = Number(badgeData?.conversations || 0) + Number(badgeData?.groups || 0);
  const unreadNotifications = Number(badgeData?.alerts || 0);
  const taskUnread = Number(badgeData?.tasks || 0);
  const openNotification = (notification: WorkplaceNotification) => {
    setToasts(current => current.filter(item => String(item.id) !== String(notification.id)));
    if (notification.taskId) { selectSection("tasks"); setSelectedTaskId(String(notification.taskId)); }
    else if (notification.conversationId) { selectSection("conversations"); setSelectedConversationId(String(notification.conversationId)); }
  };
  
  return (
      <div className="flex min-h-0 h-full bg-white overflow-hidden relative">
        {/* Left Panel */}
        <div className={`w-full md:w-80 border-r flex flex-col bg-gray-50/30 flex-shrink-0 absolute inset-y-0 left-0 md:relative z-20 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          (activeTab === "messages" && selectedConversationId) || (activeTab === "tasks" && selectedTaskId) 
            ? "-translate-x-full" 
            : "translate-x-0"
        }`}>
          <div className="p-3 border-b bg-white">
            <div className="flex bg-gray-100/80 p-1 rounded-lg">
              <TabButton active={activeTab === "messages"} onClick={() => selectSection("conversations")} icon={MessageSquare} label="Chat" count={chatUnread} />
              <TabButton active={activeTab === "tasks"} onClick={() => selectSection("tasks")} icon={CheckSquare} label="Tasks" count={taskUnread} />
              <TabButton active={activeTab === "notifications"} onClick={() => selectSection("notifications")} icon={Bell} label="Alerts" count={unreadNotifications} />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {activeTab === "messages" && (
              <ConversationsList 
                selectedId={selectedConversationId} 
                onSelect={setSelectedConversationId} 
                groupsOnly={activeSection === "groups"}
              />
            )}
            {activeTab === "tasks" && (
              <TasksList 
                selectedId={selectedTaskId} 
                onSelect={setSelectedTaskId} 
              />
            )}
            {activeTab === "notifications" && (
              <NotificationsList onOpen={openNotification} />
            )}
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative z-10 w-full h-full">
          {activeTab === "messages" && (
            selectedConversationId ? (
              <ChatView conversationId={selectedConversationId} onBack={() => setSelectedConversationId(null)} />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center">
                <EmptyState icon={MessageSquare} title="No conversation selected" description="Choose a conversation from the list to start collaborating." />
              </div>
            )
          )}
          
          {activeTab === "tasks" && (
            selectedTaskId ? (
              <TaskDetailView taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onViewConversation={(id) => { selectSection("conversations"); setSelectedConversationId(id); }} />
            ) : (
              <div className="hidden md:flex flex-1 items-center justify-center">
                <EmptyState icon={CheckSquare} title="No task selected" description="Select a task to view details or update its status." />
              </div>
            )
          )}
          
          {activeTab === "notifications" && (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <EmptyState icon={Bell} title="Notifications" description="Select an alert from the left to view its context." />
            </div>
          )}
        </div>
        <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] space-y-2">
          {toasts.map(notification => <button key={notification.id} onClick={() => openNotification(notification)} className="w-full rounded-lg border bg-white p-3 text-left shadow-lg hover:bg-gray-50">
            <div className="flex gap-2 text-xs font-bold text-gray-900"><Bell className="h-4 w-4 text-blue-600" />{notification.title}</div>
            <p className="mt-1 truncate text-xs text-gray-600">{notification.body}</p>
          </button>)}
        </div>
      </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count = 0 }: { active: boolean; onClick: () => void; icon: any; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
        active ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
       {count > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] text-white">{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-5">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 max-w-[240px]">{description}</p>
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────

function ConversationsList({ selectedId, onSelect, groupsOnly = false }: { selectedId: string | null; onSelect: (id: string) => void; groupsOnly?: boolean }) {
  const { data, isLoading } = useGetConversations();
  const [search, setSearch] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const conversations = data?.conversations || [];
  
  const filtered = conversations.filter((c: any) => 
    (!groupsOnly || c.type === "group") && c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b sticky top-0 bg-gray-50/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={groupsOnly ? "Search groups..." : "Search chats..."}
              className="h-8 pl-8 text-xs bg-white border-gray-200 shadow-none focus-visible:ring-1" 
            />
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 bg-white" onClick={() => setShowNewDialog(true)}>
            <Plus className="w-4 h-4 text-gray-600" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 p-2 space-y-0.5">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">No conversations found.</div>
        ) : (
          filtered.map((c: any) => (
            <button
              key={c.id}
              onClick={() => onSelect(String(c.id))}
              className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left ${
                selectedId === String(c.id) ? "bg-blue-50" : "hover:bg-gray-100/60"
              }`}
            >
              <div className="relative shrink-0 mt-0.5">
                <Avatar className="w-9 h-9 border border-gray-100">
                  <AvatarFallback className={`text-xs font-bold ${c.type === 'group' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.type === 'group' ? <Users className="w-4 h-4" /> : <Initials name={c.displayName} />}
                  </AvatarFallback>
                </Avatar>
                {c.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{c.displayName}</span>
                  {c.lastMessageAt && (
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                      {formatTime(c.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 ${c.unreadCount > 0 ? "font-semibold text-gray-900" : "text-gray-500"}`}>
                  {c.lastMessage ? c.lastMessage.content : "New conversation"}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {showNewDialog && <NewConversationDialog onClose={() => setShowNewDialog(false)} onCreated={onSelect} />}
    </div>
  );
}

function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { student } = useAuth();
  const [content, setContent] = useState("");
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: convData } = useGetConversations();
  const conversation = convData?.conversations?.find((c: any) => String(c.id) === conversationId);
  const isGroupAdmin = conversation?.type === "group" && conversation.members?.some(
    (member: any) => String(member.id) === String(student?.id) && member.isAdmin,
  );
  
  const { data, isLoading, isSuccess, isFetchingNextPage, hasNextPage, fetchNextPage } = useGetMessages(conversationId);
  
  const messages = data?.pages.slice().reverse().flatMap((page: any) => page.messages) || [];
  
  const sendMutation = useSendMessage();
  const editMutation = useEditMessage();
  const deleteMutation = useDeleteMessage();
  const readMutation = useReadConversation();
  const hasRead = useRef<string | null>(null);
  
  useEffect(() => {
    if (isSuccess && conversation?.unreadCount > 0 && hasRead.current !== conversationId) {
      hasRead.current = conversationId;
      readMutation.mutate(conversationId, {
        // Keep this conversation marked as attempted for its entire mount.
        // The conversation query will refresh its unread count; resetting here
        // would cause the effect to post /read again on every invalidation.
      });
    }
  }, [conversationId, conversation?.unreadCount, isSuccess, readMutation]);

  useEffect(() => {
    if (scrollRef.current && !isFetchingNextPage) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.pages[0]?.messages?.length]); // Only scroll to bottom on new messages or initial load

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sendMutation.isPending) return;
    const mentionUserIds = (conversation.members || []).filter((member: any) =>
      content.toLowerCase().includes(`@${String(member.name || "").toLowerCase()}`),
    ).map((member: any) => String(member.id));
    sendMutation.mutate({ conversationId, content: content.trim(), mentionUserIds }, {
      onSuccess: () => setContent("")
    });
  };
  const mentionMatch = content.match(/@([^@\s]*)$/);
  const mentionQuery = mentionMatch?.[1].toLowerCase() ?? "";
  const debouncedMentionQuery = useDebouncedValue(mentionQuery);
  const { data: mentionSearchResults, isFetching: isSearchingMentions } = useGetEmployees(
    debouncedMentionQuery,
    conversation?.id ? conversationId : null,
  );
  const isDebouncingMention = mentionQuery !== debouncedMentionQuery;
  const mentionMembers = mentionMatch && !isDebouncingMention ? (mentionSearchResults || []).slice(0, 6) : [];
  const insertMention = (member: any) => setContent(current => current.replace(/@([^@\s]*)$/, `@${member.name} `));

  if (!conversation) return <div className="flex-1 flex items-center justify-center"><Skeleton className="w-32 h-4" /></div>;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Header */}
      <div className="h-14 border-b bg-white flex items-center justify-between px-2 md:px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden h-8 w-8 text-gray-400">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <Avatar className="w-8 h-8">
            <AvatarFallback className={`text-xs font-bold ${conversation.type === 'group' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
              {conversation.type === 'group' ? <Users className="w-4 h-4" /> : <Initials name={conversation.displayName} />}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">{conversation.displayName}</h2>
            {conversation.type === 'group' && (
              <p className="text-[10px] text-gray-500 font-medium">
                {conversation.members?.length || 0} members
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Assign task" onClick={() => setShowTaskDialog(true)} className="h-8 w-8 text-gray-400 hover:text-gray-600">
            <CheckSquare className="w-4 h-4" />
          </Button>
          {isGroupAdmin && (
          <Button variant="ghost" size="icon" title="Manage group members" onClick={() => setShowMembersDialog(true)} className="h-8 w-8 text-gray-400 hover:text-gray-600">
            <MoreVertical className="w-4 h-4" />
          </Button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-2/3 rounded-2xl rounded-tl-sm self-start" />
            <Skeleton className="h-16 w-3/4 rounded-2xl rounded-tr-sm self-end" />
            <Skeleton className="h-12 w-1/2 rounded-2xl rounded-tl-sm self-start" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs font-medium">
            This is the beginning of your conversation.
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center pb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="text-xs text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 h-7"
                >
                  {isFetchingNextPage ? "Loading..." : "Load older messages"}
                </Button>
              </div>
            )}
            {messages.map((msg: any, i: number, arr: any[]) => {
              const isMe = String(msg.senderId) === String(student?.id);
              const showHeader = !isMe && (i === 0 || arr[i-1].senderId !== msg.senderId);
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                  <span className="text-[10px] font-semibold text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                )}
                <div 
                  className={`relative max-w-[75%] px-3.5 py-2 text-sm leading-relaxed ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm' 
                      : 'bg-white text-gray-900 border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm'
                  }`}
                >
                  {editing?.id === msg.id ? (
                    <Textarea autoFocus value={editing.content} onChange={e => setEditing({ ...editing, content: e.target.value })} onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); editMutation.mutate({ id: String(msg.id), content: editing.content, conversationId }, { onSuccess: () => setEditing(null) }); }
                    }} className="min-h-[36px] bg-white text-gray-900" />
                  ) : msg.content}
                  <div className={`text-[9px] mt-1 opacity-70 text-right ${isMe ? 'text-white' : 'text-gray-400'}`}>
                    {format(new Date(msg.createdAt), "h:mm a")}{msg.editedAt && " · Edited"}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align={isMe ? "end" : "start"} className="text-xs">
                    <DropdownMenuItem onClick={() => setContent(`${content ? `${content}\n` : ""}Replying to ${msg.senderName}: `)}><Reply className="mr-2 h-3.5 w-3.5" />Reply</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigator.clipboard?.writeText(msg.content)}><Copy className="mr-2 h-3.5 w-3.5" />Copy</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setContent(`${content}@${msg.senderName} `)}><AtSign className="mr-2 h-3.5 w-3.5" />Mention</DropdownMenuItem>
                    {msg.editedAt && (!msg.deletedAt || ["admin", "super_admin"].includes(String(student?.role))) && <DropdownMenuItem onClick={() => setHistoryId(String(msg.id))}><History className="mr-2 h-3.5 w-3.5" />Edit history</DropdownMenuItem>}
                    {isMe && !msg.deletedAt && <><DropdownMenuItem onClick={() => setEditing({ id: msg.id, content: msg.content })}><Pencil className="mr-2 h-3.5 w-3.5" />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate({ id: String(msg.id), conversationId })}><Trash2 className="mr-2 h-3.5 w-3.5" />Delete</DropdownMenuItem></>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
          </>
        )}
      </div>
      
      {/* Composer */}
      <div className="p-2.5 bg-white border-t">
        {mentionMatch && (mentionMembers.length > 0 || isSearchingMentions || isDebouncingMention) && <div className="mb-1 max-w-xs rounded-md border bg-white p-1 shadow-md">
          {(isSearchingMentions || isDebouncingMention) && <div className="px-2 py-1.5 text-xs text-gray-500">Searching employees...</div>}
          {mentionMembers.map((member: any) => <button type="button" key={member.id} onClick={() => insertMention(member)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100"><Avatar className="h-5 w-5"><AvatarFallback className="text-[8px]"><Initials name={member.name} /></AvatarFallback></Avatar>@{member.name}</button>)}
        </div>}
        <form onSubmit={handleSend} className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all shadow-sm">
          <Textarea 
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Type a message..." 
            className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 py-2.5 px-3 text-sm"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!content.trim() || sendMutation.isPending}
            className={`h-9 w-9 shrink-0 rounded-lg mb-0.5 ${content.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-transparent text-gray-400 hover:bg-transparent'}`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
      {showTaskDialog && (
        <NewTaskDialog
          conversationId={conversationId}
          members={conversation.members}
          onClose={() => setShowTaskDialog(false)}
          onCreated={() => setShowTaskDialog(false)}
        />
      )}
      {showMembersDialog && (
        <GroupMembersDialog
          conversation={conversation}
          onClose={() => setShowMembersDialog(false)}
        />
      )}
      {historyId && <MessageHistoryDialog messageId={historyId} onClose={() => setHistoryId(null)} />}
    </div>
  );
}

function MessageHistoryDialog({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const { data, isLoading } = useGetMessageEdits(messageId);
  return <Dialog open onOpenChange={onClose}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit history</DialogTitle></DialogHeader>
    {isLoading ? <Skeleton className="h-20 w-full" /> : <div className="max-h-80 space-y-3 overflow-auto text-xs">{data?.edits?.length ? data.edits.map((edit: any) => <div key={edit.id} className="rounded border p-2"><p><b>Original:</b> {edit.previousContent}</p><p><b>Edited:</b> {edit.newContent}</p><p className="mt-1 text-gray-500">{edit.editorName} · {format(new Date(edit.createdAt), "PP p")}</p></div>) : "No edit records."}</div>}
  </DialogContent></Dialog>;
}

function NewConversationDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [q, setQ] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedQ = useDebouncedValue(q);
  const { data, isLoading } = useGetEmployees(debouncedQ);
  const directMut = useCreateDirectConversation();
  const groupMut = useCreateGroupConversation();
  
  const handleSelect = (userId: string) => {
    directMut.mutate({ userId }, {
      onSuccess: (res) => {
        onCreated(res.id);
        onClose();
      }
    });
  };
  const toggleMember = (userId: string) => {
    setSelectedIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
  };
  const createGroup = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    groupMut.mutate({ name: groupName.trim(), memberIds: selectedIds }, {
      onSuccess: (res) => { onCreated(res.id); onClose(); },
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 bg-white">
        <div className="p-4 border-b space-y-3">
          <DialogTitle className="text-base font-bold text-gray-900">Start a conversation</DialogTitle>
          <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
            <button onClick={() => setMode("direct")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === "direct" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>Direct message</button>
            <button onClick={() => setMode("group")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${mode === "group" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}>New group</button>
          </div>
        </div>
        {mode === "group" && (
          <div className="p-3 border-b bg-gray-50/50">
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="h-9 bg-white shadow-sm" />
          </div>
        )}
        <div className="p-3 border-b bg-gray-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
               placeholder="Search employee..."
              className="pl-9 h-9 bg-white shadow-sm"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
           {isLoading || q.trim() !== debouncedQ.trim() ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
           ) : !q.trim() ? (
             <div className="p-8 text-center text-sm text-gray-500">Type a name, phone, or employee ID to search.</div>
           ) : data?.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No colleagues found.</div>
          ) : (
            <div className="p-2 space-y-1">
              {data?.map((emp: any) => (
                <button
                  key={emp.id}
                  onClick={() => mode === "direct" ? handleSelect(String(emp.id)) : toggleMember(String(emp.id))}
                  disabled={directMut.isPending || groupMut.isPending}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={emp.avatarUrl} />
                    <AvatarFallback className="text-xs bg-gray-100 text-gray-600"><Initials name={emp.name} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{emp.name}</div>
                    <div className="text-[10px] text-gray-500 truncate capitalize">{emp.role.replace('_', ' ')} &middot; {emp.department}</div>
                  </div>
                  {mode === "group" && (
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${selectedIds.includes(String(emp.id)) ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"}`}>
                      {selectedIds.includes(String(emp.id)) && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {mode === "group" && (
          <DialogFooter className="p-3 border-t bg-gray-50/50">
            <span className="mr-auto text-xs text-gray-500 self-center">{selectedIds.length} colleague{selectedIds.length === 1 ? "" : "s"} selected</span>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={createGroup} disabled={!groupName.trim() || selectedIds.length === 0 || groupMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">Create group</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────

function TasksList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const [view, setView] = useState<"mine" | "assigned" | "completed">("mine");
  const { data, isLoading } = useGetTasks(view);
  const [showNewTask, setShowNewTask] = useState(false);
  
  const tasks = data?.tasks || [];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-2.5 border-b sticky top-0 bg-gray-50/95 backdrop-blur z-10">
        <div className="flex items-center justify-between">
          <div className="bg-gray-200/50 p-1 rounded-md flex">
            <button
              onClick={() => setView("mine")}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${view === "mine" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setView("assigned")}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${view === "assigned" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              Assigned by Me
            </button>
            <button onClick={() => setView("completed")} className={`px-3 py-1 rounded text-xs font-semibold transition-all ${view === "completed" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>Completed</button>
          </div>
          <Button size="sm" className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold" onClick={() => setShowNewTask(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
        ) : tasks.length === 0 ? (
            <div className="py-7 text-center flex flex-col items-center">
             <CheckCircle2 className="w-7 h-7 text-gray-200 mb-1.5" />
            <p className="text-xs font-semibold text-gray-500">No tasks found</p>
          </div>
        ) : (
          tasks.map((t: any) => (
            <button
              key={t.id}
              onClick={() => onSelect(String(t.id))}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                selectedId === String(t.id)
                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                  : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 line-clamp-1">{t.title}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  t.status === 'completed' ? 'bg-green-100 text-green-700' :
                  t.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                {t.dueDate && (
                  <span className={`text-[10px] font-medium flex items-center gap-1 ${
                    new Date(t.dueDate) < new Date() && t.status !== 'completed' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {format(new Date(t.dueDate), "MMM d")}
                  </span>
                )}
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  {view === "mine" ? `By ${t.assignedByName}` : `To ${t.assigneeName}`}
                </span>
                <span className="text-[10px] capitalize text-gray-500">{t.priority} priority</span>
              </div>
            </button>
          ))
        )}
      </div>

      {showNewTask && <NewTaskDialog onClose={() => setShowNewTask(false)} onCreated={onSelect} />}
    </div>
  );
}

function TaskDetailView({ taskId, onClose, onViewConversation }: { taskId: string; onClose: () => void; onViewConversation: (id: string) => void }) {
  const { student } = useAuth();
  const { data: detail, isLoading, isError, refetch } = useGetTask(taskId);
  const [remark, setRemark] = useState("");
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showReassign, setShowReassign] = useState(false);
  const task = detail?.task;
  const debouncedEmployeeQuery = useDebouncedValue(employeeQuery);
  const { data: employeeResults, isFetching: isSearchingEmployees } = useGetEmployees(
    debouncedEmployeeQuery,
    showReassign && task?.conversationId ? String(task.conversationId) : null,
  );
  const { data: conversationData } = useGetConversations();
  const remarkMut = useCreateTaskRemark();
  const updateMut = useUpdateTask();

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Skeleton className="w-40 h-6" /></div>;
  if (isError || !task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-5 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Task could not be loaded</p>
          <p className="mt-1 text-xs text-gray-500">The task may have been removed or you may not have access.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
          <Button size="sm" onClick={onClose}>Back to tasks</Button>
        </div>
      </div>
    );
  }
  const isAdmin = ["admin", "super_admin"].includes(String(student?.role));
  const canChangeStatus = isAdmin || String(task.assigneeId) === String(student?.id);
  const canReassign = task.status !== "completed" && (isAdmin || String(task.assignedById) === String(student?.id));
  const linkedConversation = (conversationData?.conversations || []).find((item: any) => String(item.id) === String(task.conversationId));
  const eligibleEmployees = task.conversationId
    ? (employeeResults || []).filter((employee: any) => linkedConversation?.members?.some((member: any) => String(member.id) === String(employee.id)))
    : (employeeResults || []);
  const mentionQuery = remark.match(/@([^@\s]*)$/)?.[1].toLowerCase();
  const taskParticipants = linkedConversation?.members?.length
    ? linkedConversation.members
    : [task.assignee, task.assigner].filter(Boolean);
  const mentionMembers = mentionQuery === undefined ? [] : taskParticipants.filter((member: any) => String(member.name || "").toLowerCase().includes(mentionQuery)).slice(0, 6);
  const insertRemarkMention = (member: any) => setRemark(value => value.replace(/@([^@\s]*)$/, `@${member.name} `));
  const remarkMentionIds = taskParticipants.filter((member: any) => remark.toLowerCase().includes(`@${String(member.name || "").toLowerCase()}`)).map((member: any) => String(member.id));

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="h-12 border-b flex items-center justify-between px-3 md:px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden h-8 w-8 text-gray-400 -ml-2">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <h2 className="text-sm font-bold text-gray-900">Task Details</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="hidden md:flex text-gray-400 hover:text-gray-600 text-xs">
          Close
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 md:p-4 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            task.priority === 'high' ? 'bg-red-100 text-red-700' :
            task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {task.priority} Priority
          </span>
          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
            task.status === 'completed' ? 'bg-green-100 text-green-700' :
            task.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
        
        <h1 className="text-xl font-black text-gray-900 mb-4">{task.title}</h1>
        
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Assignee</span>
            <div className="text-sm font-semibold text-gray-900">{task.assignee?.name || task.assigneeName}</div>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Reporter</span>
            <div className="text-sm font-semibold text-gray-900">{task.assigner?.name || task.assignedByName}</div>
          </div>
          {task.dueDate && (
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Due Date</span>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                {format(new Date(task.dueDate), "PPP")}
              </div>
            </div>
          )}
        </div>
        
        {task.description && (
          <div className="mb-5">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" /> Description
            </h3>
            <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
              {task.description}
            </div>
          </div>
        )}
        {canReassign && <div className="mb-5 rounded-lg border border-gray-100 p-3">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-gray-800">Assigned to: {task.assignee?.name}</span><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowReassign(value => !value)}>Reassign</Button></div>
          {showReassign && <div className="mt-2 space-y-1"><Input value={employeeQuery} onChange={e => setEmployeeQuery(e.target.value)} placeholder="Search eligible employee…" className="h-8 text-xs" />
            {isSearchingEmployees && <p className="px-2 text-[10px] text-gray-500">Searching employees...</p>}
            {eligibleEmployees.map((employee: any) => <button key={employee.id} className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100" onClick={() => updateMut.mutate({ id: taskId, assigneeId: String(employee.id) }, { onSuccess: () => { setShowReassign(false); setEmployeeQuery(""); } })}>{employee.name}</button>)}
          </div>}
        </div>}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-900">Work updates</h3>
          <div className="space-y-2">
            {(detail?.remarks || []).map((item: any) => <div key={item.id} className="rounded-lg border border-gray-100 p-3 text-xs"><b>{item.authorName}</b><span className="ml-2 text-gray-400">{format(new Date(item.createdAt), "PP p")}</span><p className="mt-1 whitespace-pre-wrap text-gray-600">{item.content}</p></div>)}
          </div>
          {mentionMembers.length > 0 && <div className="mb-1 max-w-xs rounded border bg-white p-1 shadow-sm">{mentionMembers.map((member: any) => <button type="button" key={member.id} onClick={() => insertRemarkMention(member)} className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100">@{member.name}</button>)}</div>}
          <p className="mb-1 text-[10px] text-gray-500">@ mentions notify participants only; they never change the assignee.</p>
          <div className="mt-2 flex gap-2"><Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add a work update…" className="min-h-[42px] text-xs" /><Button size="sm" disabled={!remark.trim() || remarkMut.isPending} onClick={() => remarkMut.mutate({ taskId, content: remark.trim(), mentionUserIds: remarkMentionIds }, { onSuccess: () => setRemark("") })}>Add</Button></div>
        </div>
        {(detail?.events || []).length > 0 && <div className="mb-4"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-900">Activity</h3><div className="space-y-1 border-l pl-3 text-xs text-gray-500">{detail.events.map((event: any) => <p key={event.id}>{event.eventType.replace("_", " ")} · {format(new Date(event.createdAt), "PP p")}</p>)}</div></div>}
        {task.conversationId && <Button variant="outline" size="sm" onClick={() => onViewConversation(String(task.conversationId))}>View conversation</Button>}
      </div>
      
      <div className="p-2.5 border-t bg-gray-50/50 flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600 mr-auto">{canChangeStatus ? "Update Status:" : "Only the assignee can update status"}</span>
        <Button 
          variant={task.status === "pending" ? "default" : "outline"}
          size="sm"
          disabled
          className={task.status === "pending" ? "bg-gray-900 text-white" : "bg-white"}
        >
          <Circle className="w-3.5 h-3.5 mr-1.5" /> Pending
        </Button>
        <Button 
          variant={task.status === "in_progress" ? "default" : "outline"}
          size="sm"
          onClick={() => updateMut.mutate({ id: taskId, status: "in_progress" })}
          disabled={!canChangeStatus || updateMut.isPending || task.status !== "pending"}
          className={task.status === "in_progress" ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-white"}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" /> In Progress
        </Button>
        <Button 
          variant={task.status === "completed" ? "default" : "outline"}
          size="sm"
          onClick={() => updateMut.mutate({ id: taskId, status: "completed" })}
          disabled={!canChangeStatus || updateMut.isPending || task.status !== "in_progress"}
          className={task.status === "completed" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-white"}
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Completed
        </Button>
      </div>
    </div>
  );
}

function NewTaskDialog({ onClose, onCreated, conversationId, members }: {
  onClose: () => void;
  onCreated: (id: string) => void;
  conversationId?: string;
  members?: any[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedAssigneeName, setSelectedAssigneeName] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  
  const debouncedAssigneeSearch = useDebouncedValue(assigneeSearch);
  const { data: employees, isFetching: isSearchingAssignees } = useGetEmployees(debouncedAssigneeSearch, conversationId);
  const createMut = useCreateTask();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assigneeId) return;
    
    createMut.mutate({
      conversationId,
      title,
      description,
      assigneeId,
      priority,
      dueDate: dueDate || undefined
    }, {
      onSuccess: (res: any) => {
        onCreated(res.id);
        onClose();
      }
    });
  };

  const eligibleEmployees = members?.length
    ? (employees || []).filter((employee: any) => members.some((member: any) => String(member.id) === String(employee.id)))
    : (employees || []);
  const selectedAssignee = eligibleEmployees.find((employee: any) => String(employee.id) === assigneeId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 bg-white">
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b bg-gray-50/50">
            <DialogTitle className="text-base font-bold text-gray-900">Create Task</DialogTitle>
          </div>
          
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Task Title *</label>
              <Input 
                value={title} onChange={e => setTitle(e.target.value)} 
                placeholder="What needs to be done?" 
                className="bg-white" autoFocus required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Assignee *</label>
              <Input
                value={assigneeId ? (selectedAssignee?.name || selectedAssigneeName) : assigneeSearch}
                onChange={e => { setAssigneeId(""); setSelectedAssigneeName(""); setAssigneeSearch(e.target.value); }}
                placeholder="Search employee..."
                className="bg-white"
                required={!assigneeId}
              />
              {isSearchingAssignees && <p className="mt-1 text-[10px] text-gray-500">Searching employees...</p>}
              {!assigneeId && assigneeSearch.trim() && eligibleEmployees.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-md border bg-white p-1">
                  {eligibleEmployees.slice(0, 8).map((emp: any) => (
                    <button type="button" key={emp.id} onClick={() => { setAssigneeId(String(emp.id)); setSelectedAssigneeName(emp.name); setAssigneeSearch(""); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-100">
                      <span className="font-medium">{emp.name}</span>
                      <span className="ml-auto text-[10px] text-gray-500">{emp.employeeId || emp.role?.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              )}
              {!assigneeId && assigneeSearch.trim() && !isSearchingAssignees && eligibleEmployees.length === 0 && (
                <p className="mt-1 text-[10px] text-gray-500">No permitted employees found.</p>
              )}
              {assigneeId && <p className="mt-1 text-[10px] text-gray-500">Selected: {selectedAssignee?.name || selectedAssigneeName}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Priority</label>
                <select 
                  value={priority} 
                  onChange={e => setPriority(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">Due Date</label>
                <Input 
                  type="date"
                  value={dueDate} onChange={e => setDueDate(e.target.value)} 
                  className="bg-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">Description</label>
              <Textarea 
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Add context or instructions..."
                className="bg-white min-h-[100px] resize-none"
              />
            </div>
          </div>
          
          <div className="p-4 border-t bg-gray-50/50 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending || !title || !assigneeId} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────

function NotificationsList({ onOpen }: { onOpen: (notification: WorkplaceNotification) => void }) {
  const { data, isLoading } = useGetNotifications();
  const readMut = useReadNotification();
  
  const notifications = data?.notifications || [];
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
        {data?.unreadCount > 0 && (
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
            {data.unreadCount} New
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-0">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <div key={i} className="p-4 border-b border-gray-50"><Skeleton className="h-10 w-full" /></div>)
        ) : notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Inbox className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-500">All caught up!</p>
            <p className="text-xs text-gray-400 mt-1">No new notifications.</p>
          </div>
        ) : (
          notifications.map((n: any) => (
            <button key={n.id} onClick={() => { if (!n.readAt) readMut.mutate(String(n.id)); onOpen(n); }} className={`w-full p-4 border-b border-gray-50 text-left transition-colors hover:bg-gray-50/50 ${!n.readAt ? 'bg-blue-50/30' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  n.type.includes('task') ? 'bg-amber-100 text-amber-600' :
                  n.type.includes('message') ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {n.type.includes('task') ? <CheckSquare className="w-4 h-4" /> : 
                   n.type.includes('message') ? <MessageSquare className="w-4 h-4" /> : 
                   <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-snug">{n.title}</p>
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
