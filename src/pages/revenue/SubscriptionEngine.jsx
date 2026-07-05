import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Plus, Search, Filter, Users, Loader2, Edit, Trash2, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import moment from "moment";

const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trialing: "bg-amber-50 text-amber-700 border-amber-200",
  past_due: "bg-red-50 text-red-700 border-red-200",
  grace_period: "bg-orange-50 text-orange-700 border-orange-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  paused: "bg-blue-50 text-blue-700 border-blue-200",
  expired: "bg-gray-50 text-gray-400 border-gray-200",
};
const STATUS_ICONS = { active: CheckCircle, trialing: Clock, past_due: AlertTriangle, grace_period: AlertTriangle, cancelled: XCircle, paused: Clock, expired: XCircle };

const BLANK = {
  customer_name: "", customer_email: "", plan_id: "", plan_name: "", status: "trialing",
  billing_cycle: "monthly", payment_provider: "stripe", seats_purchased: 1, seats_used: 0,
  mrr: 0, arr: 0, trial_ends_at: "", current_period_start: moment().format("YYYY-MM-DD"),
  current_period_end: moment().add(30, "days").format("YYYY-MM-DD"),
  coupon_code: "", discount_pct: 0, notes: ""
};

export default function SubscriptionEngine() {
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, p, pr] = await Promise.all([
      base44.entities.Subscription.list("-created_date", 200).catch(() => []),
      base44.entities.SubscriptionPlan.filter({ is_active: true }).catch(() => []),
      base44.entities.PaymentProvider.filter({ is_active: true }).catch(() => []),
    ]);
    setSubs(s); setPlans(p); setProviders(pr); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(BLANK); setEditing(null); setOpen(true); };
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const plan = plans.find(p => p.id === form.plan_id);
    const mrr = plan ? (form.billing_cycle === "annual" ? (plan.price_annual || 0) / 12 : (plan.price_monthly || 0)) * Number(form.seats_purchased || 1) : Number(form.mrr || 0);
    const payload = { ...form, seats_purchased: Number(form.seats_purchased), mrr, arr: mrr * 12, plan_name: plan?.name || form.plan_name };
    if (editing) await base44.entities.Subscription.update(editing, payload);
    else {
      await base44.entities.Subscription.create(payload);
      await base44.entities.RevenueEvent.create({ event_type: "new_subscription", customer_name: form.customer_name, customer_email: form.customer_email, plan_id: form.plan_id, plan_name: plan?.name, payment_provider: form.payment_provider, amount: mrr, mrr_impact: mrr, arr_impact: mrr * 12, billing_cycle: form.billing_cycle, event_date: new Date().toISOString() });
    }
    setSaving(false); setOpen(false); load();
  };

  const cancel = async (s) => {
    if (!confirm("Cancel this subscription?")) return;
    await base44.entities.Subscription.update(s.id, { status: "cancelled", cancelled_at: new Date().toISOString() });
    await base44.entities.RevenueEvent.create({ event_type: "cancellation", customer_name: s.customer_name, subscription_id: s.id, plan_id: s.plan_id, plan_name: s.plan_name, payment_provider: s.payment_provider, mrr_impact: -(s.mrr || 0), arr_impact: -(s.arr || 0), churn_reason: "manual_cancellation", event_date: new Date().toISOString() });
    load();
  };

  const filtered = subs.filter(s => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchSearch = !search || (s.customer_name || "").toLowerCase().includes(search.toLowerCase()) || (s.customer_email || "").toLowerCase().includes(search.toLowerCase()) || (s.plan_name || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = { active: subs.filter(s => s.status === "active").length, trialing: subs.filter(s => s.status === "trialing").length, past_due: subs.filter(s => s.status === "past_due").length, cancelled: subs.filter(s => s.status === "cancelled").length };
  const mrr = subs.filter(s => s.status === "active").reduce((t, s) => t + (s.mrr || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Subscriptions</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="w-6 h-6 text-blue-500" />Subscription Engine</h1>
          <p className="text-sm text-muted-foreground">Full lifecycle · trials · grace periods · seat licensing · multi-provider</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />New Subscription</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "MRR", value: `$${mrr.toLocaleString()}`, color: "text-emerald-600" },
          { label: "Active", value: stats.active, color: "text-emerald-600" },
          { label: "Trialing", value: stats.trialing, color: "text-amber-600" },
          { label: "Past Due", value: stats.past_due, color: "text-red-600" },
          { label: "Cancelled", value: stats.cancelled, color: "text-gray-500" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60 text-center">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48"><Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" /><Input className="pl-8 h-9" placeholder="Search customer, email, plan..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["active","trialing","past_due","grace_period","cancelled","paused","expired"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/40">
              <tr>
                {["Customer","Plan","Status","Billing","MRR","Provider","Period","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">No subscriptions found</td></tr>
              ) : filtered.map(s => {
                const Icon = STATUS_ICONS[s.status] || CheckCircle;
                return (
                  <tr key={s.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-xs">{s.customer_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{s.customer_email || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{s.plan_name || s.plan_id || "—"}{s.seats_purchased > 1 && <span className="text-muted-foreground"> ×{s.seats_purchased}</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border font-medium ${STATUS_STYLES[s.status] || ""}`}>
                        <Icon className="w-2.5 h-2.5" />{s.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">{s.billing_cycle}</td>
                    <td className="px-4 py-3 text-xs font-medium text-emerald-700">${(s.mrr || 0).toLocaleString()}/mo</td>
                    <td className="px-4 py-3 text-xs capitalize">{s.payment_provider?.replace("_", " ") || "stripe"}</td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground">{s.current_period_end ? moment(s.current_period_end).format("MMM D, YYYY") : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)}><Edit className="w-3 h-3" /></Button>
                        {s.status !== "cancelled" && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => cancel(s)}><XCircle className="w-3 h-3" /></Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Subscription" : "New Subscription"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Customer Name</label><Input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Email</label><Input value={form.customer_email} onChange={e => setForm({ ...form, customer_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Plan</label>
                <Select value={form.plan_id} onValueChange={v => { const p = plans.find(pl => pl.id === v); setForm({ ...form, plan_id: v, plan_name: p?.name || "", mrr: p?.price_monthly || 0 }); }}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price_monthly}/mo</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Billing Cycle</label>
                <Select value={form.billing_cycle} onValueChange={v => setForm({ ...form, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="annual">Annual</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["trialing","active","past_due","grace_period","paused","cancelled","expired"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-semibold block mb-1">Payment Provider</label>
                <Select value={form.payment_provider} onValueChange={v => setForm({ ...form, payment_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["stripe","square","paypal","authorizenet","manual_invoice","bank_transfer","custom"].map(p => <SelectItem key={p} value={p} className="capitalize">{p.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Seats</label><Input type="number" min="1" value={form.seats_purchased} onChange={e => setForm({ ...form, seats_purchased: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">MRR ($)</label><Input type="number" min="0" value={form.mrr} onChange={e => setForm({ ...form, mrr: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Coupon</label><Input value={form.coupon_code} onChange={e => setForm({ ...form, coupon_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Period Start</label><Input type="date" value={form.current_period_start} onChange={e => setForm({ ...form, current_period_start: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Period End</label><Input type="date" value={form.current_period_end} onChange={e => setForm({ ...form, current_period_end: e.target.value })} /></div>
            </div>
            {form.status === "trialing" && <div><label className="text-xs font-semibold block mb-1">Trial Ends At</label><Input type="date" value={form.trial_ends_at?.split("T")[0] || ""} onChange={e => setForm({ ...form, trial_ends_at: e.target.value })} /></div>}
            <div><label className="text-xs font-semibold block mb-1">Notes</label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}