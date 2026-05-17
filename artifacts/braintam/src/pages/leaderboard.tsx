import { useState } from "react";
import { motion } from "framer-motion";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Star, School, Crown } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

const medals = ["🥇", "🥈", "🥉"];
const medalColors = [
  "bg-gradient-to-br from-yellow-400 to-amber-500 text-white",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-white",
  "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
];

export default function LeaderboardPage() {
  const [grade, setGrade] = useState<string>("all");
  const { student } = useAuth();

  const params = { grade: grade !== "all" ? Number(grade) : undefined };
  const { data: leaderboard, isLoading } = useGetLeaderboard(params, {
    query: { queryKey: getGetLeaderboardQueryKey(params) }
  });

  const top3 = (leaderboard ?? []).slice(0, 3);
  const rest = (leaderboard ?? []).slice(3);

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            Leaderboard
          </h1>
          <p className="text-muted-foreground mt-1">See how you rank against other students</p>
        </motion.div>

        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger className="w-40" data-testid="grade-filter">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {[1,2,3,4,5,6,7,8,9,10].map(g => (
              <SelectItem key={g} value={String(g)}>Grade {g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Top 3 Podium */}
        {!isLoading && top3.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-white border-0 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-end justify-center gap-4">
                  {/* 2nd place */}
                  <div className="text-center flex-1">
                    <Avatar className="w-16 h-16 mx-auto border-4 border-white/30">
                      <AvatarFallback className={`${medalColors[1]} text-lg font-bold`}>
                        {top3[1]?.studentName?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-2 font-bold text-sm truncate">{top3[1]?.studentName}</div>
                    <div className="text-xs text-white/70">{top3[1]?.points} pts</div>
                    <div className="mt-2 bg-white/20 rounded-t-xl h-16 flex items-center justify-center text-2xl">
                      {medals[1]}
                    </div>
                  </div>
                  {/* 1st place */}
                  <div className="text-center flex-1">
                    <div className="relative">
                      <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                      <Avatar className="w-20 h-20 mx-auto border-4 border-yellow-400">
                        <AvatarFallback className={`${medalColors[0]} text-2xl font-bold`}>
                          {top3[0]?.studentName?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="mt-2 font-bold text-base truncate">{top3[0]?.studentName}</div>
                    <div className="text-xs text-white/70">{top3[0]?.points} pts</div>
                    <div className="mt-2 bg-white/20 rounded-t-xl h-24 flex items-center justify-center text-2xl">
                      {medals[0]}
                    </div>
                  </div>
                  {/* 3rd place */}
                  <div className="text-center flex-1">
                    <Avatar className="w-16 h-16 mx-auto border-4 border-white/30">
                      <AvatarFallback className={`${medalColors[2]} text-lg font-bold`}>
                        {top3[2]?.studentName?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-2 font-bold text-sm truncate">{top3[2]?.studentName}</div>
                    <div className="text-xs text-white/70">{top3[2]?.points} pts</div>
                    <div className="mt-2 bg-white/20 rounded-t-xl h-10 flex items-center justify-center text-2xl">
                      {medals[2]}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Rest of the list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              [...Array(7)].map((_, i) => <Skeleton key={i} className="w-full h-16" />)
            ) : (
              (leaderboard ?? []).map((entry, i) => {
                const isCurrentUser = entry.studentName === student?.name;
                return (
                  <motion.div
                    key={entry.rank}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-colors ${isCurrentUser ? "border-primary bg-primary/5" : i < 3 ? "bg-yellow-50 border-yellow-200" : "border-transparent hover:bg-muted/40"}`}
                    data-testid={`leaderboard-row-${entry.rank}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? medalColors[0] : i === 1 ? medalColors[1] : i === 2 ? medalColors[2] : "bg-muted text-muted-foreground"}`}>
                      {entry.rank}
                    </div>
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-secondary/10 text-secondary font-bold">
                        {entry.studentName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {entry.studentName}
                        {isCurrentUser && <Badge className="text-xs py-0">You</Badge>}
                      </div>
                      {entry.school && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <School className="w-3 h-3" />{entry.school}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-bold text-sm flex-shrink-0">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      {entry.points.toLocaleString()}
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
