import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, RefreshCw, Loader2, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import moment from "moment";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function RevenueAnalytics() {
  const [subs, setSubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, e, i] = await Promise.all([
      base44.entities.Subscription.list("-created_date", 500).catch(() => []),
      base44.entities.RevenueEvent.list("-created_date", 1000).catch(() => []),
      base44.entities.Invoice.list("-created_date", 500).catch(() => []),
    ]);
    setSubs(s); setEvents(e); setInvoices(i); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const activeSubs = subs.filter(s => s.status === "active");
  const cancelledSubs = subs.filter(s => s.status === "cancelled");
  const mrr = activeSubs.reduce((t, s) => t + (s.mrr || 0), 0);
  const arr = mrr * 12;

  // LTV = avg MRR × avg subscription lifetime in months
  const avgMrr = activeSubs.length > 0 ? mrr / activeSubs.length : 0;
  const avgLifetimeMonths = cancelledSubs.length > 0
    ? cancelledSubs.reduce((t, s) => { const months = s.cancelled_at && s.current_period_start ? moment(s.cancelled_at).diff(moment(s.current_period_start), "months") : 6; return t + months; }, 0) / cancelledSubs.length
    : 12;
  const ltv = avgMrr * Math.max(avgLifetimeMonths, 1);

  // Churn rate
  const churnRate = subs.length > 0 ? ((cancelledSubs.length / subs.length) * 100).toFixed(1) : 0;

  // Expansion revenue (upgrades)
  const expansionRevenue = events.filter(e => e.event_type === "expansion" || e.event_type === "upgrade").reduce((t, e) => t + (e.mrr_impact || 0), 0);

  // Contraction
  const contractionRevenue = Math.abs(events.filter(e => e.event_type === "downgrade" || e.event_type === "contraction").reduce((t, e) => t + (e.mrr_impact || 0), 0));

  // MRR by month (last 6 months)
  const mrrByMonth = Array.from({ length: 6 }, (_, i) => {
    const m = moment().subtract(5 - i, "months");
    const monthKey = m.format("YYYY-MM");
    const monthSubs = subs.filter(s => {
      const start = moment(s.current_period_start || s.created_date);
      const end = s.cancelled_at ? moment(s.cancelled_at) : moment();
      return start.isBefore(m.endOf("month")) && end.isAfter(m.startOf("month")) && s.status !== "cancelled";
    });
    return { month: m.format("MMM"), mrr: monthSubs.reduce((t, s) => t + (s.mrr || 0), 0), subs: monthSubs.length };
  });

  // Revenue by provider
  const byProvider = {};
  subs.filter(s => s.status === "active").forEach(s => {
    const p = s.payment_provider || "stripe";
    byProvider[p] = (byProvider[p] || 0) + (s.mrr || 0);
  });
  const providerData = Object.entries(byProvider).map(([name, value]) => ({ name: name.replace(/_/g," "), value }));

  // Plan breakdown
  const byPlan = {};
  activeSubs.forEach(s => {
    const p = s.plan_name || s.plan_id || "Unknown";
    byPlan[p] = (byPlan[p] || 0) + (s.mrr || 0);
  });
  const planData = Object.entries(byPlan).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Revenue event history (last 30 days)
  const eventsByDay = {};
  const revenueTypes = ["new_subscription", "renewal", "expansion", "recovery", "manual_payment", "bank_transfer"];
  events.filter(e => moment(e.event_date || e.created_date).isAfter(moment().subtract(30, "days")) && revenueTypes.includes(e.event_type))
    .forEach(e => {
      const day = moment(e.event_date || e.created_date).format("MMM D");
      eventsByDay[day] = (eventsByDay[day] || 0) + (e.amount || 0);
    });
  const dailyRevenue = Object.entries(eventsByDay).sort((a, b) => moment(a[0], "MMM D").diff(moment(b[0], "MMM D"))).map(([day, amount]) => ({ day, amount }));

  const kpis = [
    { label: "MRR", value: `$${mrr.toLocaleString()}`, sub: "Monthly Recurring Revenue", color: "text-emerald-600", icon: TrendingUp },
    { label: "ARR", value: `$${arr.toLocaleString()}`, sub: "Annual Recurring Revenue", color: "text-blue-600", icon: BarChart3 },
    { label: "LTV", value: `$${ltv.toFixed(0)}`, sub: `Avg lifetime value · ${avgLifetimeMonths.toFixed(0)}mo avg`, color: "text-indigo-600", icon: Target },
    { label: "Avg MRR/Customer", value: `$${avgMrr.toFixed(0)}`, sub: `${activeSubs.length} active customers`, color: "text-purple-600", icon: DollarSign },
    { label: "Churn Rate", value: `${churnRate}%`, sub: `${cancelledSubs.length} cancelled`, color: parseFloat(churnRate) > 5 ? "text-red-600" : "text-emerald-600", icon: TrendingDown },
    { label: "Expansion MRR", value: `$${expansionRevenue.toLocaleString()}`, sub: "Upgrades this period", color: "text-emerald-600", icon: TrendingUp },
    { label: "Contraction MRR", value: `$${contractionRevenue.toLocaleString()}`, sub: "Downgrades this period", color: contractionRevenue > 0 ? "text-red-600" : "text-gray-400", icon: TrendingDown },
    { label: "Net MRR Change", value: `${expansionRevenue - contractionRevenue >= 0 ? "+" : ""}$${(expansionRevenue - contractionRevenue).toLocaleString()}`, sub: "Expansion minus contraction", color: expansionRevenue - contractionRevenue >= 0 ? "text-emerald-600" : "text-red-600", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Analytics</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="w-6 h-6 text-amber-500" />Revenue Analytics</h1>
          <p className="text-sm text-muted-foreground">MRR · ARR · LTV · CAC · Churn · Expansion · Provider breakdown</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className={`w-4 h-4 ${k.color}`} />
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* MRR Trend */}
      <Card className="p-4 border border-border/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">MRR Trend (6 Months)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={mrrByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => [`$${v}`, "MRR"]} />
            <Line type="monotone" dataKey="mrr" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Provider breakdown */}
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">MRR by Payment Provider</p>
          {providerData.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No active subscriptions yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={providerData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {providerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => [`$${v}`, "MRR"]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Plan breakdown */}
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">MRR by Plan</p>
          {planData.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No active subscriptions yet</div>
          ) : (
            <div className="space-y-2">
              {planData.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium truncate">{p.name}</span>
                      <span className="text-xs font-bold text-emerald-600 ml-2">${p.value.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (p.value / Math.max(1, mrr)) * 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Daily Revenue */}
      {dailyRevenue.length > 0 && (
        <Card className="p-4 border border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Daily Revenue (Last 30 Days)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => [`$${v}`, "Revenue"]} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}