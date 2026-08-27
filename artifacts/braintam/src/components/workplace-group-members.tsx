import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserMinus, UserPlus, Users } from "lucide-react";
import { useAddGroupMember, useGetEmployees, useRemoveGroupMember } from "@/hooks/use-workplace";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function GroupMembersDialog({ conversation, onClose }: { conversation: any; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { data: employees = [] } = useGetEmployees(query);
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const members = conversation.members ?? [];
  const candidates = employees.filter((employee: any) => !members.some((member: any) => String(member.id) === String(employee.id)));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <div className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900"><Users className="w-4 h-4" /> Manage group</DialogTitle>
          <p className="mt-1 text-xs text-gray-500">Only group members can see this conversation and its messages.</p>
        </div>
        <div className="p-3 border-b bg-gray-50/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an employee to add" className="h-9 pl-9 bg-white" />
          </div>
          {query && candidates.slice(0, 5).map((employee: any) => (
            <div key={employee.id} className="mt-2 flex items-center gap-2 rounded-lg bg-white p-2 border">
              <span className="flex-1 truncate text-xs font-semibold text-gray-700">{employee.name}</span>
              <Button size="sm" className="h-7 bg-blue-600 text-xs hover:bg-blue-700" disabled={addMember.isPending} onClick={() => addMember.mutate({ conversationId: String(conversation.id), userId: String(employee.id) })}>
                <UserPlus className="mr-1 w-3.5 h-3.5" /> Add
              </Button>
            </div>
          ))}
        </div>
        <div className="max-h-[310px] overflow-y-auto p-2">
          {members.map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
              <Avatar className="h-8 w-8"><AvatarImage src={member.avatarUrl ?? ""} /><AvatarFallback className="bg-gray-100 text-xs text-gray-600">{initials(member.name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-gray-800">{member.name}</p><p className="capitalize text-[10px] text-gray-500">{String(member.role).replace("_", " ")}{member.isAdmin ? " · Admin" : ""}</p></div>
              {member.id !== conversation.createdById && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" title={`Remove ${member.name}`} disabled={removeMember.isPending} onClick={() => removeMember.mutate({ conversationId: String(conversation.id), userId: String(member.id) })}>
                  <UserMinus className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="border-t bg-gray-50/60 p-3"><Button variant="ghost" onClick={onClose}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}