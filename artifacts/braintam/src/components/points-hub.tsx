import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Flame, Gift, Zap, CheckSquare, BookOpen, FileText, Trophy } from "lucide-react";
import { STAFF_TOKEN_KEY, STUDENT_TOKEN_KEY } from "@/components/auth-provider";
import { getGetStudentProfileQueryKey, getGetStudentProgressQueryKey } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(STAFF_TOKEN_KEY) ?? localStorage.getItem(STUDENT_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PointsHubData {
  totalPoints: number;
  rank?: number | null;
  streakDays: number;
  dailyLoginClaimed?: boolean;
}

interface PointsHubProps {
  data?: PointsHubData;
  isLoading?: boolean;
  onPointsClaimed?: (newTotal: number) => void;
}

const ACTION_CONFIG: Record<string, { label: string; pts: string; color: string; icon: React.ElementType }> = {
  "Correct Answer":    { label: "Correct Answer",    pts: "+10", color: "bg-green-50 text-green-700 border-green-200",  icon: CheckSquare },
  "Wrong Answer":      { label: "Wrong Answer",      pts: "−2",  color: "bg-red-50 text-red-700 border-red-200",        icon: Zap },
  "Homework Done":     { label: "Homework Done",     pts: "+5",  color: "bg-purple-50 text-purple-700 border-purple-200", icon: FileText },
  "Test Completed":    { label: "Test Completed",    pts: "+15", color: "bg-blue-50 text-blue-700 border-blue-200",     icon: CheckSquare },
  "Test Passed":       { label: "Test Passed (≥60%)",pts: "+25", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Trophy },
  "Assignment Done":   { label: "Assignment Done",   pts: "+5",  color: "bg-orange-50 text-orange-700 border-orange-200", icon: BookOpen },
  "7-Day Streak":      { label: "7-Day Streak Bonus",pts: "+20", color: "bg-amber-50 text-amber-700 border-amber-200",  icon: Flame },
};

interface ClaimResult {
  claimed: boolean;
  pointsAdded: number;
  streakBonus: boolean;
  streakDays: number;
  totalPoints: number;
}

export function PointsHub({ data, isLoading, onPointsClaimed }: PointsHubProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [alreadyClaimed, setAlreadyClaimed] = useState(data?.dailyLoginClaimed ?? false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const queryClient = useQueryClient();

  const totalPoints = claimResult?.totalPoints ?? data?.totalPoints ?? 0;
  const streakDays  = claimResult?.streakDays  ?? data?.streakDays  ?? 0;

  // Sync alreadyClaimed when the profile query finishes loading
  // (useState initial value is stale when data arrives asynchronously)
  useEffect(() => {
    if (data?.dailyLoginClaimed) setAlreadyClaimed(true);
  }, [data?.dailyLoginClaimed]);

  async function claimDailyLogin() {
    setClaiming(true);
    try {
      const r = await fetch(`${BASE}/api/student/daily-login`, {
        method: "POST",
        credentials: "include",
        headers: { ...getAuthHeaders() },
      });
      if (!r.ok) throw new Error("Failed");
      const result: ClaimResult = await r.json();
      setClaimResult(result);
      setAlreadyClaimed(true);
      if (result.claimed) {
        onPointsClaimed?.(result.totalPoints);
      }
      // Refresh profile + progress so dailyLoginClaimed stays true on re-mount
      void queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetStudentProgressQueryKey() });
    } catch {
      setAlreadyClaimed(true);
    } finally {
      setClaiming(false);
    }
  }

  return (
    <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50/60 to-orange-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <Star className="w-4.5 h-4.5 text-amber-500" />
          </div>
          Points Hub
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Points + Streak */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            {isLoading ? (
              <Skeleton className="w-24 h-9" />
            ) : (
              <motion.div
                key={totalPoints}
                initial={{ scale: 1.15, color: "#f59e0b" }}
                animate={{ scale: 1, color: "inherit" }}
                transition={{ duration: 0.35 }}
                className="text-3xl font-bold text-gray-900"
              >
                {totalPoints.toLocaleString("en-IN")}
                <span className="text-base font-normal text-muted-foreground ml-1">pts</span>
              </motion.div>
            )}
            {data?.rank != null && (
              <p className="text-xs text-muted-foreground mt-0.5">Rank #{data.rank} on leaderboard</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 bg-orange-100 rounded-xl px-3 py-2">
            <Flame className="w-5 h-5 text-orange-500" />
            {isLoading ? <Skeleton className="w-8 h-5" /> : (
              <span className="text-lg font-bold text-orange-600 leading-none">{streakDays}</span>
            )}
            <span className="text-[10px] text-orange-500 font-medium">day streak</span>
          </div>
        </div>

        {/* Daily Login Claim Banner */}
        <AnimatePresence mode="wait">
          {!alreadyClaimed ? (
            <motion.div
              key="claim"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#0B2B6B] to-[#1a4298] text-white"
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Claim Daily Login</p>
                <p className="text-xs text-white/70">+5 points · keep your streak alive!</p>
              </div>
              <Button
                size="sm"
                className="flex-shrink-0 bg-[#FF6B1A] hover:bg-orange-500 text-white border-0 h-8 px-3 text-xs font-bold"
                onClick={claimDailyLogin}
                disabled={claiming}
              >
                {claiming ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : "Claim"}
              </Button>
            </motion.div>
          ) : claimResult?.claimed ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200"
            >
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-lg">🎉</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  +{claimResult.pointsAdded} points claimed!
                  {claimResult.streakBonus && " 🔥 Streak Bonus!"}
                </p>
                <p className="text-xs text-green-600">Day {claimResult.streakDays} streak</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="already"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100"
            >
              <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-xs text-gray-600">Daily login already claimed. Come back tomorrow!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Points Breakdown */}
        <div>
          <button
            onClick={() => setShowBreakdown(p => !p)}
            className="text-xs text-muted-foreground hover:text-gray-900 transition-colors flex items-center gap-1 font-medium"
          >
            {showBreakdown ? "▾" : "▸"} How to earn points
          </button>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-2"
              >
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(ACTION_CONFIG).map(cfg => (
                    <div
                      key={cfg.label}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs ${cfg.color}`}
                    >
                      <cfg.icon className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1 min-w-0 truncate">{cfg.label}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1 border-current font-bold flex-shrink-0 ${cfg.color}`}
                      >
                        {cfg.pts}
                      </Badge>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
