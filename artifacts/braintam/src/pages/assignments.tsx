import { useState } from "react";
import { motion } from "framer-motion";
import { useListAssignments, useSubmitAssignment, getListAssignmentsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Calendar, AlertCircle, Send, CheckCircle, FileText } from "lucide-react";

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function AssignmentsPage() {
  const [subject, setSubject] = useState<string>("all");
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const queryClient = useQueryClient();

  const params = { subjectId: subject !== "all" ? Number(subject) : undefined };
  const { data: assignments, isLoading } = useListAssignments(params, {
    query: { queryKey: getListAssignmentsQueryKey(params) }
  });

  const submitMutation = useSubmitAssignment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey(params) });
        setSubmitting(null);
        setAnswer("");
      }
    }
  });

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
            Assignments
          </h1>
          <p className="text-muted-foreground mt-1">Submit your assignments before the deadline</p>
        </motion.div>

        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            <SelectItem value="1">Mathematics</SelectItem>
            <SelectItem value="2">Science</SelectItem>
            <SelectItem value="3">English</SelectItem>
            <SelectItem value="4">Hindi</SelectItem>
            <SelectItem value="5">Social Science</SelectItem>
          </SelectContent>
        </Select>

        {isLoading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : (assignments ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No assignments pending</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(assignments ?? []).map((asgn, i) => {
              const days = daysUntil(asgn.dueDate);
              const isUrgent = days <= 2 && days >= 0;
              return (
                <motion.div key={asgn.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} data-testid={`assignment-card-${asgn.id}`}>
                  <Card className={`border-2 ${isUrgent && asgn.status === "pending" ? "border-red-300" : "border-border"}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-5">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${asgn.status === "graded" ? "bg-green-100" : asgn.status === "submitted" ? "bg-blue-100" : isUrgent ? "bg-red-100" : "bg-orange-100"}`}>
                          <FileText className={`w-6 h-6 ${asgn.status === "graded" ? "text-green-600" : asgn.status === "submitted" ? "text-blue-600" : isUrgent ? "text-red-600" : "text-orange-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-base">{asgn.title}</h3>
                            <div className="flex gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">{asgn.maxMarks} marks</Badge>
                              <Badge variant="secondary" className="text-xs">
                                {asgn.status.charAt(0).toUpperCase() + asgn.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{asgn.subjectName}</Badge>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Due: {new Date(asgn.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                            {days >= 0 && days <= 7 && (
                              <span className={`flex items-center gap-1 font-medium ${isUrgent ? "text-red-600" : "text-orange-500"}`}>
                                {isUrgent && <AlertCircle className="w-3.5 h-3.5" />}
                                {days === 0 ? "Due today!" : `${days}d left`}
                              </span>
                            )}
                          </div>
                          {asgn.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{asgn.description}</p>}
                          {asgn.marks !== null && <div className="mt-2 text-sm font-semibold text-green-600">Marks: {asgn.marks}/{asgn.maxMarks}</div>}
                        </div>
                        {asgn.status === "pending" && (
                          <Button onClick={() => { setSubmitting(asgn.id); setAnswer(""); }} className="flex-shrink-0" data-testid={`submit-asgn-${asgn.id}`}>
                            <Send className="w-4 h-4 mr-1" /> Submit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <Dialog open={!!submitting} onOpenChange={v => !v && setSubmitting(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Assignment</DialogTitle></DialogHeader>
            <Textarea placeholder="Write your answer..." value={answer} onChange={e => setAnswer(e.target.value)} rows={6} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitting(null)}>Cancel</Button>
              <Button onClick={() => submitting && submitMutation.mutate({ id: submitting, data: { answer } })} disabled={!answer.trim() || submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Assignment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
