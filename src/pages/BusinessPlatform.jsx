import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  CreditCard, Users, Building2, Plus, Edit2, CheckCircle,
  TrendingUp, DollarSign, Tag, Percent, GitBranch, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const planTypeColors = {
  free: "bg-slate-100 text-slate-700",
  starter: "bg-blue-100 text-blue-700",
  professional: "bg-violet-100 text-violet-700",
  enterprise: "bg-amber-100 text-amber-700",
  custom: "bg-emerald-100 text-emerald-700",
};

const subStatusColors = {
  active: "bg-emerald-100 text-emerald-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  paused: "bg-amber-100 text-amber-700",
};

export default function BusinessPlatform() {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "", description: "", plan_type: "starter", price_monthly: 0, price_annual: 0,
    seats_included: 1, seat_price: 0, trial_days: 0, allows_referrals: false,
    referral_commission_pct: 0, director_commission_pct: 0, features: "", is_active: true
  });

  const load = async () => {
    setLoading(true);
    const [p, s, inv, ref, o] = await Promise.all([
      base44.entities.SubscriptionPlan.list("-created_date", 50).catch(() => []),
      base44.entities.Subscription.list("-created_date", 200).catch(() => []),
      base44.entities.Invoice.list("-created_date", 100).catch(() => []),
      base44.entities.ReferralRecord.list("-created_date", 100).catch(() => []),
      base44.entities.Organization.list("-created_date", 100).catch(() => []),
    ]);
    setPlans(p); setSubs(s); setInvoices(inv); setReferrals(ref); setOrgs(o);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editingPlan) {
      setPlanForm({
        name: editingPlan.name, description: editingPlan.description || "",
        plan_type: editingPlan.plan_type, price_monthly: editingPlan.price_monthly || 0,
        price_annual: editingPlan.price_annual || 0, seats_included: editingPlan.seats_included || 1,
        seat_price: editingPlan.seat_price || 0, trial_days: editingPlan.trial_days || 0,
        allows_referrals: editingPlan.allows_referrals || false,
        referral_commission_pct: editingPlan.referral_commission_pct || 0,
        director_commission_pct: editingPlan.director_commission_pct || 0,
        features: (editingPlan.features || []).join("\n"), is_active: editingPlan.is_active !== false,
      });
    } else {
      setPlanForm({ name: "", description: "", plan_type: "starter", price_monthly: 0, price_annual: 0, seats_included: 1, seat_price: 0, trial_days: 0, allows_referrals: false, referral_commission_pct: 0, director_commission_pct: 0, features: "", is_active: true });
    }
  }, [editingPlan, planFormOpen]);

  const savePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...planForm,
      features: planForm.features.split("\n").map(s => s.trim()).filter(Boolean),
      price_monthly: Number(planForm.price_monthly),
      price_annual: Number(planForm.price_annual),
      seats_included: Number(planForm.seats_included),
      seat_price: Number(planForm.seat_price),
      trial_days: Number(planForm.trial_days),
      referral_commission_pct: Number(planForm.referral_commission_pct),
      director_commission_pct: Number(planForm.director_commission_pct),
    };
    if (editingPlan) await base44.entities.SubscriptionPlan.update(editingPlan.id, data);
    else await base44.entities.SubscriptionPlan.create(data);
    setSaving(false); setPlanFormOpen(false); setEditingPlan(null); load();
  };

  // Revenue metrics
  const activeSubs = subs.filter(s => s.status === "active");
  const totalMRR = activeSubs.reduce((sum, s) => sum + (s.mrr || 0), 0);
  const totalSeats = activeSubs.reduce((sum, s) => sum + (s.seats_purchased || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount_paid || 0), 0);
  const pendingCommissions = referrals.reduce((sum, r) => sum + ((r.commission_earned || 0) - (r.commission_paid || 0)), 0);

  const orgName = (id) => orgs.find(o => o.id === id)?.name || (id ? id.slice(0, 8) : "—");
  const planName = (id) => plans.find(p => p.id === id)?.name || "—";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Business</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-500" />Business Platform
          </h1>
          <p className="text-sm text-muted-foreground">{subs.length} subscriptions · {plans.length} plans · powered by Stripe</p>
        </div>
        <Button size="sm" onClick={() => { setEditingPlan(null); setPlanFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Plan</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "MRR", value: `$${totalMRR.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-blue-500" },
          { label: "Active Seats", value: totalSeats.toLocaleString(), icon: Users, color: "text-violet-500" },
          { label: "Pending Commissions", value: `$${pendingCommissions.toLocaleString()}`, icon: Percent, color: "text-amber-500" },
        ].map(kpi => (
          <Card key={kpi.label} className="p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-5 flex-wrap h-auto">
          <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions ({subs.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plans.length === 0 ? (
            <div className="text-center py-16"><CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground text-sm">No plans yet. Create your first subscription plan.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {plans.map(plan => (
                <Card key={plan.id} className="p-5 border border-border/60">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={`text-[10px] ${planTypeColors[plan.plan_type] || ""} mb-1`}>{plan.plan_type}</Badge>
                      <p className="font-semibold">{plan.name}</p>
                    </div>
                    <div className="flex gap-1">
                      {!plan.is_active && <Badge variant="outline" className="text-[9px] text-muted-foreground">Inactive</Badge>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingPlan(plan); setPlanFormOpen(true); }}><Edit2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                  {plan.description && <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><p className="text-xs text-muted-foreground">Monthly</p><p className="font-semibold">${plan.price_monthly}/mo</p></div>
                    <div><p className="text-xs text-muted-foreground">Annual</p><p className="font-semibold">${plan.price_annual}/yr</p></div>
                    <div><p className="text-xs text-muted-foreground">Seats</p><p className="font-semibold">{plan.seats_included} incl.</p></div>
                    <div><p className="text-xs text-muted-foreground">Trial</p><p className="font-semibold">{plan.trial_days} days</p></div>
                  </div>
                  {(plan.features || []).length > 0 && (
                    <div className="space-y-1">
                      {plan.features.slice(0, 4).map((f, i) => <p key={i} className="text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}</p>)}
                      {plan.features.length > 4 && <p className="text-xs text-muted-foreground">+{plan.features.length - 4} more</p>}
                    </div>
                  )}
                  {plan.allows_referrals && (
                    <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                      <GitBranch className="w-3 h-3 inline mr-1" />Referral: {plan.referral_commission_pct}% · Director: {plan.director_commission_pct}%
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions">
          {subs.length === 0 ? (
            <div className="text-center py-16"><Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground text-sm">No subscriptions yet.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/40">{["Organization","Plan","Status","Seats","MRR","Billing","Trial Ends"].map(h => <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody>
                  {subs.map(s => (
                    <tr key={s.id} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-medium">{orgName(s.organization_id)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{planName(s.plan_id)}</td>
                      <td className="py-2.5 px-3"><Badge className={`text-[10px] ${subStatusColors[s.status] || ""}`}>{s.status}</Badge></td>
                      <td className="py-2.5 px-3">{s.seats_used || 0}/{s.seats_purchased || 0}</td>
                      <td className="py-2.5 px-3">${(s.mrr || 0).toFixed(0)}/mo</td>
                      <td className="py-2.5 px-3 capitalize">{s.billing_cycle}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {invoices.length === 0 ? (
            <div className="text-center py-16"><CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground text-sm">No invoices yet.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/40">{["Invoice #","Organization","Status","Amount Due","Amount Paid","Due Date"].map(h => <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono text-xs">{inv.invoice_number || inv.id.slice(0,8)}</td>
                      <td className="py-2.5 px-3">{orgName(inv.organization_id)}</td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className={`text-[10px] ${inv.status === "paid" ? "border-emerald-300 text-emerald-700" : inv.status === "open" ? "border-amber-300 text-amber-700" : ""}`}>{inv.status}</Badge></td>
                      <td className="py-2.5 px-3">${(inv.amount_due || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-emerald-600">${(inv.amount_paid || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground text-xs">{inv.due_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="referrals">
          {referrals.length === 0 ? (
            <div className="text-center py-16"><GitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground text-sm">No referrals yet.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/40">{["Referrer","Referred Org","Code","Status","Earned","Paid"].map(h => <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r.id} className="border-b border-border/20 hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-medium">{r.referrer_name || r.referrer_user_id?.slice(0,8)}</td>
                      <td className="py-2.5 px-3">{r.referred_org_name || orgName(r.referred_org_id)}</td>
                      <td className="py-2.5 px-3 font-mono text-xs">{r.referral_code}</td>
                      <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge></td>
                      <td className="py-2.5 px-3 text-emerald-600">${(r.commission_earned || 0).toFixed(2)}</td>
                      <td className="py-2.5 px-3">${(r.commission_paid || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Plan Form */}
      <Dialog open={planFormOpen} onOpenChange={v => { setPlanFormOpen(v); if (!v) setEditingPlan(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPlan ? "Edit Plan" : "New Subscription Plan"}</DialogTitle></DialogHeader>
          <form onSubmit={savePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Plan Name</Label><Input value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} required /></div>
              <div><Label>Type</Label>
                <Select value={planForm.plan_type} onValueChange={v => setPlanForm({...planForm, plan_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["free","starter","professional","enterprise","custom"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={planForm.description} onChange={e => setPlanForm({...planForm, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Monthly Price ($)</Label><Input type="number" value={planForm.price_monthly} onChange={e => setPlanForm({...planForm, price_monthly: e.target.value})} /></div>
              <div><Label>Annual Price ($)</Label><Input type="number" value={planForm.price_annual} onChange={e => setPlanForm({...planForm, price_annual: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Seats Included</Label><Input type="number" value={planForm.seats_included} onChange={e => setPlanForm({...planForm, seats_included: e.target.value})} /></div>
              <div><Label>Per-Seat Price ($)</Label><Input type="number" value={planForm.seat_price} onChange={e => setPlanForm({...planForm, seat_price: e.target.value})} /></div>
              <div><Label>Trial Days</Label><Input type="number" value={planForm.trial_days} onChange={e => setPlanForm({...planForm, trial_days: e.target.value})} /></div>
            </div>
            <div><Label>Features (one per line)</Label><Textarea value={planForm.features} onChange={e => setPlanForm({...planForm, features: e.target.value})} rows={4} placeholder={"Unlimited evidence uploads\nJurisEngine access\n5 AI agents"} /></div>
            <div className="border-t border-border/40 pt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                <input type="checkbox" checked={planForm.allows_referrals} onChange={e => setPlanForm({...planForm, allows_referrals: e.target.checked})} />
                Enable Referral Commissions
              </label>
              {planForm.allows_referrals && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Referral Commission (%)</Label><Input type="number" value={planForm.referral_commission_pct} onChange={e => setPlanForm({...planForm, referral_commission_pct: e.target.value})} /></div>
                  <div><Label>Director Commission (%)</Label><Input type="number" value={planForm.director_commission_pct} onChange={e => setPlanForm({...planForm, director_commission_pct: e.target.value})} /></div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setPlanFormOpen(false); setEditingPlan(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editingPlan ? "Update" : "Create Plan"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}