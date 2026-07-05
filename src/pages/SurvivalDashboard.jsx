import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  BarChart3, Clock, Target, Zap, Plus, RefreshCw, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

export default function SurvivalDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    period: moment().format("MMMM YYYY"),
    period_date: moment().format("YYYY-MM-DD"),
    monthly_platform_cost: 0, ai_api_cost: 0, hosting_cost: 0, other_costs: 0,
    stripe_revenue: 0, subscription_mrr: 0, unpaid_invoices: 0, cash_on_hand: 0,
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [m, s, i] = await Promise.all([
      base44.entities.SurvivalMetric.list("-period_date", 12).catch(() => []),
      base44.entities.Subscription.filter({ status: "active" }).catch(() => []),
      base44.entities.Invoice.filter({ status: "open" }).catch(() => []),
    ]);
    setMetrics(m); setSubs(s.filter(sub => sub.status === "active")); setInvoices(i);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const latest = metrics[0];
  const totalCosts = latest ? (latest.monthly_platform_cost || 0) + (latest.ai_api_cost || 0) + (latest.hosting_cost || 0) + (latest.other_costs || 0) : 0;
  const totalRevenue = latest ? (latest.stripe_revenue || 0) + (latest.subscription_mrr || 0) : 0;
  const netMonthly = totalRevenue - totalCosts;
  const liveUnpaid = invoices.reduce((s, i) => s + (i.amount_due || 0), 0);
  const liveMRR = subs.reduce((s, sub) => s + (sub.mrr || 0), 0);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const totalC = Number(form.monthly_platform_cost) + Number(form.ai_api_cost) + Number(form.hosting_cost) + Number(form.other_costs);
    const totalR = Number(form.stripe_revenue) + Number(form.subscription_mrr);
    const breakEven = totalC;
    const cash = Number(form.cash_on_hand);
    const runway = totalC > 0 && cash > 0 ? Number((cash / totalC).toFixed(1)) : 0;
    const required = Math.max(0, breakEven - totalR);
    const actions = [];
    if (totalR === 0) actions.push("Convert first paying subscriber — any revenue beats zero MRR");
    if (Number(form.unpaid_invoices) > 0) actions.push(`Collect $${Number(form.unpaid_invoices).toLocaleString()} in outstanding invoices now`);
    if (required > 0) actions.push(`Add $${required.toLocaleString()}/mo in new subscriptions to reach break-even`);
    actions.push("Upsell existing users to Professional plan");
    actions.push("Activate referral program for commission-based growth");
    await base44.entities.SurvivalMetric.create({
      ...form, monthly_platform_cost: Number(form.monthly_platform_cost), ai_api_cost: Number(form.ai_api_cost),
      hosting_cost: Number(form.hosting_cost), other_costs: Number(form.other_costs),
      stripe_revenue: Number(form.stripe_revenue), subscription_mrr: Number(form.subscription_mrr),
      unpaid_invoices: Number(form.unpaid_invoices), cash_on_hand: cash,
      break_even_mrr: breakEven, cash_runway_months: runway,
      required_new_sales: required, highest_value_actions: actions,
    });
    setSaving(false); setFormOpen(false); load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Survival Engine</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" />Founder Survival Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Platform financial health, runway, and revenue actions</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Record Period</Button>
        </div>
      </div>

      {/* Live signals from entities */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Live MRR (Subscriptions)", value: `$${liveMRR.toLocaleString()}`, icon: TrendingUp, color: liveMRR > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
          { label: "Active Subscriptions", value: subs.length, icon: CheckCircle, color: subs.length > 0 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50" },
          { label: "Open Invoices", value: invoices.length, icon: AlertTriangle, color: invoices.length > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50" },
          { label: "Uncollected", value: `$${liveUnpaid.toLocaleString()}`, icon: DollarSign, color: liveUnpaid > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
        ].map(k => (
          <Card key={k.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
            <p className="text-xl font-bold pl-10">{k.value}</p>
          </Card>
        ))}
      </div>

      {!latest ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No survival metrics recorded. Record your first period to begin tracking runway.</p>
          <Button onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Record First Period</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Latest period snapshot */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Latest Period: {latest.period}</p>
            <Badge variant="outline" className="text-xs">{moment(latest.period_date).format("MMM D, YYYY")}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Monthly Costs", value: `$${totalCosts.toLocaleString()}`, color: "text-red-600 bg-red-50", icon: TrendingDown },
              { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, color: "text-emerald-600 bg-emerald-50", icon: TrendingUp },
              { label: "Net Monthly", value: `${netMonthly >= 0 ? "+" : ""}$${netMonthly.toLocaleString()}`, color: netMonthly >= 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50", icon: BarChart3 },
              { label: "Cash Runway", value: latest.cash_runway_months ? `${latest.cash_runway_months} mo` : "N/A", color: (latest.cash_runway_months || 0) >= 6 ? "text-emerald-600 bg-emerald-50" : (latest.cash_runway_months || 0) > 0 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50", icon: Clock },
            ].map(k => (
              <Card key={k.label} className="p-4 border border-border/60">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.color}`}><k.icon className="w-4 h-4" /></div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                </div>
                <p className={`text-xl font-bold pl-10 ${k.color.split(" ")[0]}`}>{k.value}</p>
              </Card>
            ))}
          </div>

          {/* Break-even progress */}
          {latest.break_even_mrr > 0 && (
            <Card className="p-4 border border-border/60">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Break-Even Progress</p>
                <span className="text-xs text-muted-foreground">Target: ${latest.break_even_mrr.toLocaleString()}/mo</span>
              </div>
              <Progress value={Math.min(100, Math.round((totalRevenue / Math.max(1, latest.break_even_mrr)) * 100))} className="h-3 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Current: ${totalRevenue.toLocaleString()}/mo</span>
                {latest.required_new_sales > 0 ? (
                  <span className="text-amber-600 font-medium">Need ${latest.required_new_sales.toLocaleString()} more to break even</span>
                ) : (
                  <span className="text-emerald-600 font-medium">✓ Break-even reached</span>
                )}
              </div>
            </Card>
          )}

          {/* Cost breakdown + highest value actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Cost Breakdown</p>
              {[
                { label: "Platform/Base44", val: latest.monthly_platform_cost || 0 },
                { label: "AI/API Costs", val: latest.ai_api_cost || 0 },
                { label: "Hosting", val: latest.hosting_cost || 0 },
                { label: "Other", val: latest.other_costs || 0 },
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-medium">${c.val.toLocaleString()}</span>
                </div>
              ))}
              <div className="border-t border-border/40 pt-2 flex items-center justify-between text-sm font-bold">
                <span>Total</span><span className="text-red-600">${totalCosts.toLocaleString()}/mo</span>
              </div>
            </Card>

            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center gap-1"><Zap className="w-3.5 h-3.5" />Highest-Value Revenue Actions</p>
              {(latest.highest_value_actions || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Record a period to generate revenue action recommendations.</p>
              ) : (
                <ul className="space-y-2">
                  {latest.highest_value_actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-emerald-600 font-bold flex-shrink-0 mt-0.5">{i+1}.</span>{a}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Revenue risks */}
          <div className="space-y-2">
            {netMonthly < 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span><strong>Platform is operating at a loss</strong> of ${Math.abs(netMonthly).toLocaleString()}/mo. Cash runway is finite. Revenue activation is critical.</span>
              </div>
            )}
            {liveUnpaid > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                <span><strong>${liveUnpaid.toLocaleString()} in unpaid invoices</strong> is outstanding. Collect before pursuing new revenue.</span>
              </div>
            )}
            {liveMRR === 0 && subs.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span><strong>Zero active subscriptions.</strong> Platform has no recurring revenue. Convert first subscriber to begin MRR.</span>
              </div>
            )}
          </div>

          {/* History table */}
          {metrics.length > 1 && (
            <Card className="p-4 border border-border/60">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Period History</p>
              <div className="space-y-2">
                {metrics.map(m => {
                  const c = (m.monthly_platform_cost||0)+(m.ai_api_cost||0)+(m.hosting_cost||0)+(m.other_costs||0);
                  const r = (m.stripe_revenue||0)+(m.subscription_mrr||0);
                  const n = r - c;
                  return (
                    <div key={m.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                      <span className="font-medium">{m.period}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-red-600">-${c.toLocaleString()}</span>
                        <span className="text-emerald-600">+${r.toLocaleString()}</span>
                        <span className={n >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>{n >= 0 ? "+" : ""}${n.toLocaleString()}</span>
                        {m.cash_runway_months > 0 && <Badge variant="outline" className="text-[9px]">{m.cash_runway_months}mo runway</Badge>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Survival Period</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Period Label</label><Input value={form.period} onChange={e => setForm({...form, period: e.target.value})} placeholder="July 2026" required /></div>
              <div><label className="text-xs font-semibold block mb-1">Period Date</label><Input type="date" value={form.period_date} onChange={e => setForm({...form, period_date: e.target.value})} required /></div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide border-t pt-3">Monthly Costs</p>
            <div className="grid grid-cols-2 gap-3">
              {[["Platform/Base44 ($)","monthly_platform_cost"],["AI/API Costs ($)","ai_api_cost"],["Hosting ($)","hosting_cost"],["Other ($)","other_costs"]].map(([label,key]) => (
                <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><Input type="number" min="0" value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} /></div>
              ))}
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide border-t pt-3">Revenue</p>
            <div className="grid grid-cols-2 gap-3">
              {[["Stripe Revenue ($)","stripe_revenue"],["Subscription MRR ($)","subscription_mrr"],["Unpaid Invoices ($)","unpaid_invoices"],["Cash on Hand ($)","cash_on_hand"]].map(([label,key]) => (
                <div key={key}><label className="text-xs text-muted-foreground block mb-1">{label}</label><Input type="number" min="0" value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} /></div>
              ))}
            </div>
            <div><label className="text-xs text-muted-foreground block mb-1">Notes</label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Period"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}