import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tag, Plus, Edit, Trash2, Loader2, DollarSign, Users, Zap, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PLAN_COLORS = { free: "border-gray-200 bg-gray-50/50", starter: "border-blue-200 bg-blue-50/50", professional: "border-indigo-200 bg-indigo-50/50", enterprise: "border-amber-200 bg-amber-50/50", family: "border-pink-200 bg-pink-50/50", team: "border-cyan-200 bg-cyan-50/50", custom: "border-purple-200 bg-purple-50/50" };
const BILLING_MODEL_LABELS = { flat_rate: "Flat Rate", per_seat: "Per Seat", usage_based: "Usage Based", tiered: "Tiered", hybrid: "Hybrid" };

const BLANK = {
  name: "", description: "", plan_type: "starter", billing_model: "flat_rate",
  price_monthly: 0, price_annual: 0, currency: "USD",
  seats_included: 1, max_seats: 100, seat_price: 0,
  usage_unit: "", usage_price_per_unit: 0, usage_included_units: 0,
  trial_days: 14, grace_period_days: 3,
  is_active: true, is_public: true, sort_order: 0,
  features: [], tags: [], notes: ""
};

export default function PricingEngine() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); const p = await base44.entities.SubscriptionPlan.list("sort_order").catch(() => []); setPlans(p); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(BLANK); setEditing(null); setFeatureInput(""); setOpen(true); };
  const openEdit = (p) => { setForm({ ...p, features: p.features || [] }); setEditing(p.id); setFeatureInput(""); setOpen(true); };

  const addFeature = () => { if (!featureInput.trim()) return; setForm(f => ({ ...f, features: [...(f.features || []), featureInput.trim()] })); setFeatureInput(""); };
  const removeFeature = (i) => setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form, price_monthly: Number(form.price_monthly), price_annual: Number(form.price_annual),
      seat_price: Number(form.seat_price), seats_included: Number(form.seats_included),
      max_seats: Number(form.max_seats), trial_days: Number(form.trial_days),
      usage_price_per_unit: Number(form.usage_price_per_unit), usage_included_units: Number(form.usage_included_units),
    };
    if (editing) await base44.entities.SubscriptionPlan.update(editing, payload);
    else await base44.entities.SubscriptionPlan.create(payload);
    setSaving(false); setOpen(false); load();
  };

  const remove = async (p) => { if (!confirm("Delete this plan?")) return; await base44.entities.SubscriptionPlan.delete(p.id); load(); };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Pricing</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Tag className="w-6 h-6 text-emerald-500" />Pricing Engine</h1>
          <p className="text-sm text-muted-foreground">Plans · seat licensing · usage billing · family & enterprise tiers · annual/monthly · free trials</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />New Plan</Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No pricing plans defined. Create your first plan to begin generating subscriptions.</p>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1.5" />Create First Plan</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <Card key={p.id} className={`p-5 border ${PLAN_COLORS[p.plan_type] || "border-border"} relative`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-base">{p.name}</p>
                    {!p.is_active && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                    {!p.is_public && <Badge variant="outline" className="text-[9px]">Hidden</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] capitalize">{p.plan_type}</Badge>
                    <Badge variant="outline" className="text-[9px]">{BILLING_MODEL_LABELS[p.billing_model]}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => remove(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mb-3">{p.description}</p>}

              {/* Pricing */}
              <div className="flex items-end gap-3 mb-3">
                <div>
                  <span className="text-2xl font-bold">${Number(p.price_monthly || 0).toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                {p.price_annual > 0 && (
                  <div className="text-sm text-emerald-600 font-medium">${Number(p.price_annual || 0).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/yr</span></div>
                )}
              </div>

              {/* Billing model details */}
              <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                {p.billing_model === "per_seat" && <p><Users className="w-3 h-3 inline mr-1" />{p.seats_included} seats included · +${p.seat_price}/seat up to {p.max_seats}</p>}
                {p.billing_model === "usage_based" && <p><Zap className="w-3 h-3 inline mr-1" />{p.usage_included_units} {p.usage_unit || "units"} · +${p.usage_price_per_unit} per unit</p>}
                {p.trial_days > 0 && <p className="text-amber-600 font-medium">✓ {p.trial_days}-day free trial</p>}
                {p.grace_period_days > 0 && <p>Grace period: {p.grace_period_days} days</p>}
              </div>

              {/* Features */}
              {(p.features || []).length > 0 && (
                <div className="space-y-1 border-t border-border/40 pt-3">
                  {p.features.slice(0, 5).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs"><CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />{f}</div>
                  ))}
                  {p.features.length > 5 && <p className="text-xs text-muted-foreground">+{p.features.length - 5} more features</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Plan" : "Create Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Plan Name</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Plan Type</label>
                <Select value={form.plan_type} onValueChange={v => setForm({ ...form, plan_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["free","starter","professional","enterprise","family","team","custom"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Description</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><label className="text-xs font-semibold block mb-1">Billing Model</label>
              <Select value={form.billing_model} onValueChange={v => setForm({ ...form, billing_model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BILLING_MODEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Monthly Price ($)</label><Input type="number" min="0" value={form.price_monthly} onChange={e => setForm({ ...form, price_monthly: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Annual Price ($)</label><Input type="number" min="0" value={form.price_annual} onChange={e => setForm({ ...form, price_annual: e.target.value })} /></div>
            </div>
            {(form.billing_model === "per_seat" || form.billing_model === "hybrid") && (
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold block mb-1">Seats Included</label><Input type="number" min="1" value={form.seats_included} onChange={e => setForm({ ...form, seats_included: e.target.value })} /></div>
                <div><label className="text-xs font-semibold block mb-1">Max Seats</label><Input type="number" min="1" value={form.max_seats} onChange={e => setForm({ ...form, max_seats: e.target.value })} /></div>
                <div><label className="text-xs font-semibold block mb-1">Price/Extra Seat ($)</label><Input type="number" min="0" value={form.seat_price} onChange={e => setForm({ ...form, seat_price: e.target.value })} /></div>
              </div>
            )}
            {(form.billing_model === "usage_based" || form.billing_model === "hybrid") && (
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-semibold block mb-1">Usage Unit</label><Input value={form.usage_unit} onChange={e => setForm({ ...form, usage_unit: e.target.value })} placeholder="e.g. API calls" /></div>
                <div><label className="text-xs font-semibold block mb-1">Included Units</label><Input type="number" min="0" value={form.usage_included_units} onChange={e => setForm({ ...form, usage_included_units: e.target.value })} /></div>
                <div><label className="text-xs font-semibold block mb-1">Price/Extra Unit ($)</label><Input type="number" min="0" step="0.001" value={form.usage_price_per_unit} onChange={e => setForm({ ...form, usage_price_per_unit: e.target.value })} /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Free Trial Days</label><Input type="number" min="0" value={form.trial_days} onChange={e => setForm({ ...form, trial_days: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Grace Period Days</label><Input type="number" min="0" value={form.grace_period_days} onChange={e => setForm({ ...form, grace_period_days: e.target.value })} /></div>
            </div>

            {/* Features */}
            <div>
              <label className="text-xs font-semibold block mb-1">Features</label>
              <div className="flex gap-2 mb-2">
                <Input value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())} placeholder="Add feature and press Enter" />
                <Button type="button" size="sm" variant="outline" onClick={addFeature}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.features || []).map((f, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">{f}<button onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 ml-1">×</button></span>
                ))}
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />Active</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_public} onChange={e => setForm({ ...form, is_public: e.target.checked })} className="rounded" />Public</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Plan"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}