import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Target, TrendingDown, TrendingUp, Users, RefreshCw, Loader2, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import moment from "moment";

export default function RetentionDashboard() {
  const [subs, setSubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [s, e] = await Promise.all([
      base44.entities.Subscription.list("-created_date", 500).catch(() => []),
      base44.entities.RevenueEvent.list("-event_date", 500).catch(() => []),
    ]);
    setSubs(s); setEvents(e); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const activeSubs = subs.filter(s => s.status === "active");
  const cancelledSubs = subs.filter(s => s.status === "cancelled");
  const trialSubs = subs.filter(s => s.status === "trialing");
  const pastDueSubs = subs.filter(s => ["past_due","grace_period"].includes(s.status));

  const mrr = activeSubs.reduce((t, s) => t + (s.mrr || 0), 0);
  const churnedMrr = cancelledSubs.reduce((t, s) => t + (s.mrr || 0), 0);
  const churnRate = subs.length > 0 ? (cancelledSubs.length / subs.length * 100) : 0;
  const retentionRate = 100 - churnRate;
  const expansionEvents = events.filter(e => ["upgrade","expansion"].includes(e.event_type));
  const expansionMrr = expansionEvents.reduce((t, e) => t + (e.mrr_impact || 0), 0);

  // Cohort-style monthly retention (last 6 months)
  const cohorts = Array.from({ length: 6 }, (_, i) => {
    const m = moment().subtract(5 - i, "months");
    const label = m.format("MMM YY");
    const newThisMonth = subs.filter(s => moment(s.created_date).isSame(m, "month")).length;
    const stillActive = subs.filter(s => moment(s.created_date).isSame(m, "month") && s.status === "active").length;
    const retention = newThisMonth > 0 ? Math.round((stillActive / newThisMonth) * 100) : 0;
    return { month: label, new: newThisMonth, retained: stillActive, retention };
  });

  // Churn risk — trialing near end, past due
  const atRisk = [
    ...trialSubs.filter(s => s.trial_ends_at && moment(s.trial_ends_at).isBefore(moment().add(3, "days"))).map(s => ({ ...s, risk: "trial_ending", riskLabel: "Trial ending <3 days" })),
    ...pastDueSubs.map(s => ({ ...s, risk: "past_due", riskLabel: "Past due / grace period" })),
    ...subs.filter(s => s.status === "active" && s.failed_payment_count > 0).map(s => ({ ...s, risk: "payment_failed", riskLabel: `${s.failed_payment_count} failed payment(s)` })),
  ];

  // Expansion opportunities — free/starter on active status
  const expansionOpportunities = activeSubs.filter(s => {
    const name = (s.plan_name || "").toLowerCase();
    return name.includes("free") || name.includes("starter") || name.includes("basic");
  });

  // Forecast — simple linear projection
  const newThisMonth = subs.filter(s => moment(s.created_date).isAfter(moment().startOf("month"))).length;
  const churnThisMonth = cancelledSubs.filter(s => s.cancelled_at && moment(s.cancelled_at).isAfter(moment().startOf("month"))).length;
  const netNew = newThisMonth - churnThisMonth;
  const forecastMonths = Array.from({ length: 6 }, (_, i) => ({
    month: moment().add(i + 1, "months").format("MMM"),
    projected_subs: Math.max(0, activeSubs.length + (netNew * (i + 1))),
    projected_mrr: Math.max(0, mrr + ((mrr / Math.max(1, activeSubs.length)) * netNew * (i + 1))),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Retention</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Target className="w-6 h-6 text-cyan-500" />Retention Dashboard</h1>
          <p className="text-sm text-muted-foreground">Churn · expansion · at-risk accounts · cohort retention · 6-month forecast</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      {/* Health KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Retention Rate", value: `${retentionRate.toFixed(1)}%`, color: retentionRate > 90 ? "text-emerald-600" : retentionRate > 70 ? "text-amber-600" : "text-red-600", sub: "Active / all-time" },
          { label: "Monthly Churn", value: `${churnRate.toFixed(1)}%`, color: churnRate < 5 ? "text-emerald-600" : churnRate < 10 ? "text-amber-600" : "text-red-600", sub: `${cancelledSubs.length} churned` },
          { label: "Expansion MRR", value: `$${expansionMrr.toLocaleString()}`, color: expansionMrr > 0 ? "text-emerald-600" : "text-gray-400", sub: `${expansionEvents.length} upgrades` },
          { label: "At-Risk Accounts", value: atRisk.length, color: atRisk.length > 0 ? "text-red-600" : "text-emerald-600", sub: "Need attention now" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <p className={`text-2xl font-bold mb-1 ${k.color}`}>{k.value}</p>
            <p className="text-xs font-medium">{k.label}</p>
            <p className="text-[10px] text-muted-foreground">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Retention progress bar */}
      <Card className="p-4 border border-border/60">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Customer Retention Health</p>
          <span className={`text-sm font-bold ${retentionRate > 90 ? "text-emerald-600" : "text-amber-600"}`}>{retentionRate.toFixed(1)}%</span>
        </div>
        <Progress value={retentionRate} className="h-3 mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Target: &gt;90% retention</span>
          <span>{retentionRate > 90 ? "✓ Healthy" : retentionRate > 70 ? "⚠ Needs improvement" : "🚨 Critical churn"}</span>
        </div>
      </Card>

      {/* At-Risk Accounts */}
      {atRisk.length > 0 && (
        <Card className="p-4 border border-red-200 bg-red-50/30">
          <p className="text-xs font-semibold text-red-700 uppercase mb-3 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />At-Risk Accounts ({atRisk.length})</p>
          <div className="space-y-2">
            {atRisk.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-red-100">
                <div>
                  <p className="font-medium">{s.customer_name || "Unknown"}</p>
                  <p className="text-muted-foreground">{s.plan_name || "—"} · ${s.mrr || 0}/mo</p>
                </div>
                <Badge variant="destructive" className="text-[9px]">{s.riskLabel}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cohort retention */}
      <Card className="p-4 border border-border/60">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Monthly Cohort Retention</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cohorts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="new" name="New Subscribers" fill="#3b82f6" radius={[3,3,0,0]} />
            <Bar dataKey="retained" name="Still Active" fill="#10b981" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 6-Month Forecast */}
      <Card className="p-4 border border-border/60">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">6-Month MRR Forecast</p>
          <Badge variant="outline" className="text-[9px]">Linear projection · {netNew >= 0 ? "+" : ""}{netNew} net/mo</Badge>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={forecastMonths}>
            <defs><linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => [`$${Math.round(v).toLocaleString()}`, "Projected MRR"]} />
            <Area type="monotone" dataKey="projected_mrr" stroke="#10b981" fill="url(#mrrGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Expansion opportunities */}
      {expansionOpportunities.length > 0 && (
        <Card className="p-4 border border-emerald-200 bg-emerald-50/30">
          <p className="text-xs font-semibold text-emerald-700 uppercase mb-3 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Expansion Opportunities ({expansionOpportunities.length})</p>
          <div className="space-y-2">
            {expansionOpportunities.slice(0, 8).map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border border-emerald-100">
                <div>
                  <p className="font-medium">{s.customer_name || "Unknown"}</p>
                  <p className="text-muted-foreground">{s.plan_name} · ${s.mrr}/mo · {s.seats_used || 0}/{s.seats_purchased} seats used</p>
                </div>
                <Badge variant="outline" className="text-[9px] text-emerald-700 border-emerald-300">Upsell candidate</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}