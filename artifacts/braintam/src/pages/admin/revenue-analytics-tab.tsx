import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, Clock, AlertTriangle, RefreshCw,
  CheckCircle2, XCircle, Loader2, CreditCard, Users,
} from "lucide-react";
import { API_BASE } from "@/lib/api-base";

const NAVY  = "#0B2B6B";
const ORANGE = "#FF6B1A";
const GREEN  = "#059669";
const RED    = "#EF4444";
const BLUE   = "#3B82F6";

function apiFetch(path: string) {
  const token = localStorage.getItem("braintam_staff_token");
  return fetch(`${API_BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function rupees(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type Summary = {
  razorpayCollectedPaise: number;
  razorpayCount: number;
  igniteCollectedPaise: number;
  igniteCount: number;
  masteryCollectedRupees: number;
  masteryCount: number;
  pendingLinksPaise: number;
  pendingLinksCount: number;
  failedPaise: number;
  failedCount: number;
  pendingMasteryRupees: number;
  pendingMasteryCount: number;
};

type Monthly = { month: string; amountRupees: number; count: number };
type ByGrade = { grade: number; amountRupees: number; count: number };
type ByType  = { type: string; amountRupees: number; count: number };
type Payment = {
  id: number;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amountRupees: number;
  status: string;
  paymentType: string;
  grade: number | null;
  webhookVerified: boolean;
  createdAt: string;
};

type Data = {
  summary: Summary;
  monthly: Monthly[];
  byGrade: ByGrade[];
  byType: ByType[];
  recentPayments: Payment[];
};

const STATUS_COLORS: Record<string, string> = {
  captured: "bg-green-100 text-green-700",
  created:  "bg-blue-100 text-blue-700",
  failed:   "bg-red-100 text-red-700",
  refunded: "bg-yellow-100 text-yellow-700",
};

const GRADE_COLORS = [
  "#0B2B6B", "#1A4BA8", "#2563EB", "#3B82F6",
  "#60A5FA", "#93C5FD", "#FF6B1A", "#FB923C",
  "#FDBA74", "#FED7AA",
];

export function RevenueAnalyticsTab() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconcileFilter, setReconcileFilter] = useState<"all" | "captured" | "failed" | "created">("all");

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch("/admin/revenue-analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: NAVY }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-500">{error ?? "Failed to load"}</p>
        <button onClick={load} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: NAVY }}>Retry</button>
      </div>
    );
  }

  const { summary, monthly, byGrade, byType, recentPayments } = data;

  // Total collected = Ignite (paise→rupees) + Mastery (rupees already)
  const igniteRupees  = Math.round(summary.igniteCollectedPaise / 100);
  const totalCollected = igniteRupees + summary.masteryCollectedRupees;
  const totalPending   = Math.round(summary.pendingLinksPaise / 100) + summary.pendingMasteryRupees;
  const totalFailed    = Math.round(summary.failedPaise / 100);

  const kpis = [
    {
      label: "Total Collected",
      value: rupees(totalCollected),
      sub: `${summary.igniteCount + summary.masteryCount} transactions`,
      icon: DollarSign, bg: "#DCFCE7", color: GREEN,
    },
    {
      label: "Ignite Revenue",
      value: rupees(igniteRupees),
      sub: `${summary.igniteCount} paid students`,
      icon: TrendingUp, bg: "#DBEAFE", color: BLUE,
    },
    {
      label: "Mastery Revenue",
      value: rupees(summary.masteryCollectedRupees),
      sub: `${summary.masteryCount} approved`,
      icon: Users, bg: "#EDE9FE", color: "#7C3AED",
    },
    {
      label: "Pending",
      value: rupees(totalPending),
      sub: `${summary.pendingLinksCount + summary.pendingMasteryCount} open`,
      icon: Clock, bg: "#FEF9C3", color: "#CA8A04",
    },
    {
      label: "Failed / Dropped",
      value: rupees(totalFailed),
      sub: `${summary.failedCount} transactions`,
      icon: XCircle, bg: "#FEE2E2", color: RED,
    },
    {
      label: "Razorpay Collected",
      value: rupees(Math.round(summary.razorpayCollectedPaise / 100)),
      sub: `${summary.razorpayCount} captured`,
      icon: CreditCard, bg: "#F0FDF4", color: GREEN,
    },
  ];

  const monthlyChartData = monthly.map(m => ({
    name: m.month.slice(5), // MM
    month: m.month,
    Revenue: m.amountRupees,
    Count: m.count,
  }));

  const filteredPayments = recentPayments.filter(
    p => reconcileFilter === "all" || p.status === reconcileFilter,
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black" style={{ color: NAVY }}>Revenue Analytics</h2>
          <p className="text-xs text-gray-500">Fee collections, trends, and Razorpay reconciliation</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
          style={{ background: NAVY }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
            </div>
            <div className="text-lg font-black leading-tight" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[10px] font-semibold text-gray-500 mt-0.5 truncate">{k.label}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Monthly Revenue Trend</h3>
            <span className="text-[10px] text-gray-400 ml-auto">Last 12 months · Ignite</span>
          </div>
          {monthly.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ORANGE} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(v: number) => [rupees(v), "Revenue"]}
                  labelFormatter={(_l, payload) => payload?.[0]?.payload?.month ?? ""}
                />
                <Area type="monotone" dataKey="Revenue" stroke={ORANGE} strokeWidth={2}
                  fill="url(#revGrad)" dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Grade-wise breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" style={{ color: BLUE }} />
            <h3 className="font-bold text-sm" style={{ color: NAVY }}>Revenue by Grade</h3>
            <span className="text-[10px] text-gray-400 ml-auto">Ignite</span>
          </div>
          {byGrade.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byGrade} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `G${v}`} />
                <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(v: number, _n, props) => [
                    `${rupees(v)} · ${props.payload?.count} students`, `Grade ${props.payload?.grade}`,
                  ]}
                />
                <Bar dataKey="amountRupees" radius={[4, 4, 0, 0]}>
                  {byGrade.map((_e, i) => (
                    <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Second row: Payment type + Collections vs Pending */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Payment Type Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-sm mb-3" style={{ color: NAVY }}>Revenue by Payment Type</h3>
          {byType.length === 0 ? (
            <div className="h-20 flex items-center justify-center text-xs text-gray-400">No captured payments</div>
          ) : (
            <div className="space-y-2.5">
              {byType.map((t, i) => {
                const max = Math.max(...byType.map(x => x.amountRupees), 1);
                const pct = Math.round((t.amountRupees / max) * 100);
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <div className="w-20 text-[11px] font-semibold text-gray-600 capitalize truncate shrink-0">{t.type}</div>
                    <div className="flex-1 h-5 rounded-lg overflow-hidden bg-gray-100">
                      <div
                        className="h-full rounded-lg transition-all"
                        style={{ width: `${pct}%`, background: GRADE_COLORS[i % GRADE_COLORS.length] }}
                      />
                    </div>
                    <div className="w-24 text-right shrink-0">
                      <span className="text-[11px] font-bold" style={{ color: NAVY }}>{rupees(t.amountRupees)}</span>
                      <span className="text-[9px] text-gray-400 ml-1">({t.count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collections vs Pending overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-sm mb-3" style={{ color: NAVY }}>Collections vs Pending</h3>
          <div className="space-y-3">
            {[
              { label: "Collected",      value: totalCollected,                       color: GREEN,    icon: CheckCircle2 },
              { label: "Pending Links",  value: Math.round(summary.pendingLinksPaise / 100), color: "#CA8A04", icon: Clock },
              { label: "Pending Mastery",value: summary.pendingMasteryRupees,         color: "#7C3AED", icon: Clock },
              { label: "Failed",         value: totalFailed,                          color: RED,      icon: XCircle },
            ].map(row => {
              const total = totalCollected + totalPending + totalFailed || 1;
              const pct = Math.round((row.value / total) * 100);
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <row.icon className="w-4 h-4 shrink-0" style={{ color: row.color }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="font-semibold text-gray-600">{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>{rupees(row.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Razorpay Reconciliation Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <CreditCard className="w-4 h-4" style={{ color: NAVY }} />
          <h3 className="font-bold text-sm" style={{ color: NAVY }}>Razorpay Order Reconciliation</h3>
          <div className="ml-auto flex gap-1.5">
            {(["all", "captured", "created", "failed"] as const).map(f => (
              <button
                key={f}
                onClick={() => setReconcileFilter(f)}
                className="text-[10px] px-2.5 py-1 rounded-lg font-semibold capitalize transition-colors"
                style={reconcileFilter === f
                  ? { background: NAVY, color: "#fff" }
                  : { background: "#F3F4F6", color: "#6B7280" }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase font-semibold text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Razorpay Order ID</th>
                <th className="px-3 py-2 text-left">Payment ID</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Grade</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Webhook</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-400">No payments found</td>
                </tr>
              ) : filteredPayments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-gray-400">{p.id}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-500 max-w-[130px] truncate" title={p.razorpayOrderId ?? ""}>
                    {p.razorpayOrderId ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-500 max-w-[130px] truncate" title={p.razorpayPaymentId ?? ""}>
                    {p.razorpayPaymentId ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 capitalize text-gray-600">{p.paymentType}</td>
                  <td className="px-3 py-2 text-gray-600">{p.grade ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-bold" style={{ color: NAVY }}>{rupees(p.amountRupees)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold capitalize ${STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {p.webhookVerified
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      : <XCircle className="w-3.5 h-3.5 text-gray-300" />
                    }
                  </td>
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmt(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
