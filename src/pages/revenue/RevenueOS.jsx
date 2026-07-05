import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Users, AlertTriangle, BarChart3, RefreshCw, Loader2, ArrowRight, Zap, Shield, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

export default function RevenueOS() {
  const [data, setData] = useState({ subs: [], invoices: [], events: [], plans: [], collections: [], providers: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [subs, invoices, events, plans, collections, providers] = await Promise.all([
      base44.entities.Subscription.list("-created_date", 200).catch(() => []),
      base44.entities.Invoice.list("-created_date", 200).catch(() => []),
      base44.entities.RevenueEvent.list("-created_date", 500).catch(() => []),
      base44.entities.SubscriptionPlan.list().catch(() => []),
      base44.entities.CollectionsQueue.filter({ status: { $nin: ["resolved", "written_off"] } }).catch(() => []),
      base44.entities.PaymentProvider.list().catch(() => []),
    ]);
    setData({ subs, invoices, events, plans, collections, providers });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeSubs = data.subs.filter(s => s.status === "active");
  const trialSubs = data.subs.filter(s => s.status === "trialing");
  const pastDueSubs = data.subs.filter(s => s.status === "past_due" || s.status === "grace_period");
  const cancelledThisMonth = data.subs.filter(s => s.status === "cancelled" && s.cancelled_at && moment(s.cancelled_at).isAfter(moment().startOf("month")));

  const mrr = activeSubs.reduce((s, sub) => s + (sub.mrr || 0), 0);
  const arr = mrr * 12;
  const trialMrr = trialSubs.reduce((s, sub) => s + (sub.mrr || 0), 0);
  const openInvoicesTotal = data.invoices.filter(i => i.status === "open").reduce((s, i) => s + (i.amount_due || 0), 0);
  const collectionsTotal = data.collections.reduce((s, c) => s + (c.amount_owed || 0), 0);
  const activeProviders = data.providers.filter(p => p.is_active);

  // MoM growth from events
  const thisMonthRevenue = data.events
    .filter(e => moment(e.event_date || e.created_date).isAfter(moment().startOf("month")) && ["new_subscription","renewal","expansion","recovery","manual_payment","bank_transfer"].includes(e.event_type))
    .reduce((s, e) => s + (e.amount || 0), 0);

  const modules = [
    { label: "Pricing Engine", path: "/revenue/pricing", icon: "💰", desc: "Plans · seats · usage · billing models", color: "border-emerald-200 bg-emerald-50/50" },
    { label: "Subscription Engine", path: "/revenue/subscriptions", icon: "🔄", desc: "Active subs · trials · lifecycle", color: "border-blue-200 bg-blue-50/50" },
    { label: "Invoice Manager", path: "/revenue/invoices", icon: "📄", desc: "Open invoices · manual · bank transfer", color: "border-indigo-200 bg-indigo-50/50" },
    { label: "Coupon & Discount Engine", path: "/revenue/coupons", icon: "🏷️", desc: "Coupons · promotions · discounts", color: "border-purple-200 bg-purple-50/50" },
    { label: "Collections Queue", path: "/revenue/collections", icon: "⚠️", desc: "Failed payments · recovery · overdue", color: "border-red-200 bg-red-50/50" },
    { label: "Revenue Analytics", path: "/revenue/analytics", icon: "📊", desc: "MRR · ARR · LTV · CAC · churn", color: "border-amber-200 bg-amber-50/50" },
    { label: "Retention Dashboard", path: "/revenue/retention", icon: "🎯", desc: "Churn · expansion · forecasting", color: "border-cyan-200 bg-cyan-50/50" },
    { label: "Payment Providers", path: "/revenue/providers", icon: "🔌", desc: "Stripe · Square · PayPal · Manual", color: "border-gray-200 bg-gray-50/50" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Revenue OS</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />NC Revenue Operating System
          </h1>
          <p className="text-sm text-muted-foreground">Multi-provider payment abstraction · full subscription lifecycle · revenue intelligence</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "MRR", value: `$${mrr.toLocaleString()}`, icon: TrendingUp, color: mrr > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
          { label: "ARR", value: `$${arr.toLocaleString()}`, icon: BarChart3, color: arr > 0 ? "text-emerald-600 bg-emerald-50" : "text-gray-400 bg-gray-50" },
          { label: "Active Subs", value: activeSubs.length, icon: Users, color: activeSubs.length > 0 ? "text-blue-600 bg-blue-50" : "text-gray-400 bg-gray-50" },
          { label: "Trialing", value: trialSubs.length, icon: Zap, color: "text-amber-600 bg-amber-50" },
          { label: "Past Due", value: pastDueSubs.length, icon: AlertTriangle, color: pastDueSubs.length > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
          { label: "Open Invoices", value: `$${openInvoicesTotal.toLocaleString()}`, icon: DollarSign, color: openInvoicesTotal > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50" },
          { label: "Collections", value: `$${collectionsTotal.toLocaleString()}`, icon: Shield, color: collectionsTotal > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
          { label: "This Month", value: `$${thisMonthRevenue.toLocaleString()}`, icon: Target, color: thisMonthRevenue > 0 ? "text-emerald-600 bg-emerald-50" : "text-gray-400 bg-gray-50" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <div className={`w-7 h-7 rounded-md flex items-center justify-center mb-2 ${k.color}`}><k.icon className="w-3.5 h-3.5" /></div>
            <p className="text-lg font-bold leading-none mb-1">{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Provider status */}
      <Card className="p-4 border border-border/60">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Provider Abstraction Layer</p>
          <Link to="/revenue/providers"><Button size="sm" variant="ghost" className="text-xs h-7">Manage Providers <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
        </div>
        {data.providers.length === 0 ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground py-2">
            <CreditCard className="w-4 h-4 opacity-40" />
            <span>No payment providers configured. <Link to="/revenue/providers" className="text-primary underline">Configure providers →</Link></span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.providers.map(p => (
              <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${p.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-muted-foreground"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${p.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                {p.display_name || p.name}
                {p.is_default && <Badge className="text-[9px] h-4 px-1 bg-emerald-600">Default</Badge>}
                {p.sandbox_mode && <Badge variant="outline" className="text-[9px] h-4 px-1">Sandbox</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Alerts */}
      {(pastDueSubs.length > 0 || data.collections.length > 0 || cancelledThisMonth.length > 0) && (
        <div className="space-y-2">
          {pastDueSubs.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{pastDueSubs.length} subscription(s) past due</strong> — requires immediate recovery action.</span>
              <Link to="/revenue/collections" className="ml-auto underline font-medium">View →</Link>
            </div>
          )}
          {data.collections.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>${collectionsTotal.toLocaleString()} in collections queue</strong> across {data.collections.length} account(s).</span>
              <Link to="/revenue/collections" className="ml-auto underline font-medium">Manage →</Link>
            </div>
          )}
          {cancelledThisMonth.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
              <span><strong>{cancelledThisMonth.length} cancellation(s) this month</strong> — review churn causes.</span>
              <Link to="/revenue/retention" className="ml-auto underline font-medium">Analyze →</Link>
            </div>
          )}
        </div>
      )}

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map(m => (
          <Link key={m.path} to={m.path}>
            <Card className={`p-4 border hover:shadow-md transition-shadow cursor-pointer h-full ${m.color}`}>
              <p className="text-2xl mb-2">{m.icon}</p>
              <p className="font-semibold text-sm mb-1">{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                Open <ArrowRight className="w-3 h-3" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}