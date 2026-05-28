import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Users, Play, ChevronRight, Zap } from "lucide-react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface DemoBatch {
  id: number; title: string; description: string | null;
  teacherName: string | null; bannerUrl: string | null; joinLink: string | null;
  startDate: string | null; endDate: string | null; status: string;
  isActive: boolean; grade: number | null; subject: string | null; totalDays: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  upcoming:  { bg: "bg-blue-100",   text: "text-blue-700",  label: "Upcoming" },
  active:    { bg: "bg-green-100",  text: "text-green-700", label: "Active" },
  completed: { bg: "bg-gray-100",   text: "text-gray-600",  label: "Completed" },
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function DemoBatchesPage() {
  const [, setLocation] = useLocation();

  const { data: batches = [], isLoading } = useQuery<DemoBatch[]>({
    queryKey: ["demo-batches"],
    queryFn: () => fetch(`${BASE}/api/demo-batches`).then(r => r.json()),
  });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-orange-500" />
            <h1 className="text-2xl font-bold" style={{ color: "#0B2B6B" }}>Demo Batches</h1>
          </div>
          <p className="text-gray-500 text-sm">Free workshops &amp; demo classes — join and experience Braintam live</p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-44 rounded-2xl" />)}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-gray-500">No demo batches right now</p>
            <p className="text-sm mt-1">Check back soon — we run workshops regularly!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {batches.map((batch, i) => {
              const sc = STATUS_COLORS[batch.status] ?? STATUS_COLORS.upcoming;
              return (
                <motion.div key={batch.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Banner */}
                  <div className="relative h-36 bg-gradient-to-br from-navy-800 to-blue-700 overflow-hidden"
                    style={{ background: "linear-gradient(135deg,#0B2B6B 0%,#1a4298 100%)" }}>
                    {batch.bannerUrl && (
                      <img src={batch.bannerUrl} alt={batch.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h3 className="font-bold text-lg leading-tight">{batch.title}</h3>
                      {batch.teacherName && <p className="text-white/70 text-sm">by {batch.teacherName}</p>}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {batch.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{batch.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                      {batch.grade && (
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Grade {batch.grade}</span>
                      )}
                      {batch.subject && (
                        <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5" />{batch.subject}</span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{batch.totalDays}-Day Batch</span>
                      {batch.startDate && (
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(batch.startDate)}{batch.endDate ? ` – ${fmtDate(batch.endDate)}` : ""}</span>
                      )}
                    </div>
                    <Button
                      className="w-full text-white font-semibold"
                      style={{ background: "#FF6B1A" }}
                      onClick={() => setLocation(`/demo-batches/${batch.id}`)}>
                      View Batch <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
