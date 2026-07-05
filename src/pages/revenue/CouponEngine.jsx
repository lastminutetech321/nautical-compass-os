import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tag, Plus, Edit, Trash2, Loader2, Megaphone, Calendar, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const BLANK_COUPON = { code: "", name: "", coupon_type: "percent_off", discount_pct: 0, discount_amount: 0, free_trial_days: 0, free_months: 0, applies_to: "all", duration: "once", duration_months: 1, max_redemptions: null, valid_from: "", valid_until: "", is_active: true, single_use_per_customer: true, created_by: "" };
const BLANK_PROMO = { name: "", description: "", promotion_type: "launch_offer", status: "draft", discount_pct: 0, discount_amount: 0, free_trial_days: 0, headline: "", cta_text: "", starts_at: "", ends_at: "", max_redemptions: null };

export default function CouponEngine() {
  const [coupons, setCoupons] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponOpen, setCouponOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [couponForm, setCouponForm] = useState(BLANK_COUPON);
  const [promoForm, setPromoForm] = useState(BLANK_PROMO);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [c, p] = await Promise.all([
      base44.entities.Coupon.list("-created_date").catch(() => []),
      base44.entities.Promotion.list("-created_date").catch(() => []),
    ]);
    setCoupons(c); setPromos(p); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveCoupon = async () => {
    setSaving(true);
    const payload = { ...couponForm, discount_pct: Number(couponForm.discount_pct), discount_amount: Number(couponForm.discount_amount), free_trial_days: Number(couponForm.free_trial_days), free_months: Number(couponForm.free_months) };
    if (editingCoupon) await base44.entities.Coupon.update(editingCoupon, payload);
    else await base44.entities.Coupon.create(payload);
    setSaving(false); setCouponOpen(false); load();
  };

  const savePromo = async () => {
    setSaving(true);
    if (editingPromo) await base44.entities.Promotion.update(editingPromo, promoForm);
    else await base44.entities.Promotion.create(promoForm);
    setSaving(false); setPromoOpen(false); load();
  };

  const deleteCoupon = async (id) => { if (!confirm("Delete coupon?")) return; await base44.entities.Coupon.delete(id); load(); };
  const deletePromo = async (id) => { if (!confirm("Delete promotion?")) return; await base44.entities.Promotion.delete(id); load(); };
  const togglePromo = async (p) => { await base44.entities.Promotion.update(p.id, { status: p.status === "active" ? "paused" : "active" }); load(); };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Discounts</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Tag className="w-6 h-6 text-purple-500" />Coupon & Promotion Engine</h1>
        <p className="text-sm text-muted-foreground">Coupons · discount codes · promotions · win-back campaigns · launch offers</p>
      </div>

      <Tabs defaultValue="coupons">
        <TabsList>
          <TabsTrigger value="coupons">Coupons ({coupons.length})</TabsTrigger>
          <TabsTrigger value="promotions">Promotions ({promos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setCouponForm(BLANK_COUPON); setEditingCoupon(null); setCouponOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Coupon</Button></div>
          {coupons.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl"><Tag className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">No coupons yet</p></div>
          ) : (
            <div className="space-y-3">
              {coupons.map(c => (
                <Card key={c.id} className="p-4 border border-border/60">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-bold px-3 py-1.5 bg-purple-50 border border-purple-200 rounded text-purple-700">{c.code}</div>
                      <div>
                        <p className="font-medium text-sm">{c.name || c.code}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px]">{c.coupon_type?.replace("_"," ")}</Badge>
                          <Badge variant={c.is_active ? "default" : "secondary"} className="text-[9px]">{c.is_active ? "Active" : "Inactive"}</Badge>
                          {c.duration !== "once" && <Badge variant="outline" className="text-[9px]">{c.duration}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {c.coupon_type === "percent_off" && <p className="text-lg font-bold text-purple-600">{c.discount_pct}% off</p>}
                        {c.coupon_type === "amount_off" && <p className="text-lg font-bold text-purple-600">${c.discount_amount} off</p>}
                        {c.coupon_type === "free_trial_extension" && <p className="text-lg font-bold text-amber-600">+{c.free_trial_days} trial days</p>}
                        {c.coupon_type === "free_months" && <p className="text-lg font-bold text-emerald-600">{c.free_months} free months</p>}
                        <p className="text-xs text-muted-foreground">{c.redemption_count || 0}{c.max_redemptions ? `/${c.max_redemptions}` : ""} uses</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setCouponForm({...c}); setEditingCoupon(c.id); setCouponOpen(true); }}><Edit className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => deleteCoupon(c.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </div>
                  {(c.valid_from || c.valid_until) && (
                    <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Calendar className="w-3 h-3" />{c.valid_from && `From ${moment(c.valid_from).format("MMM D, YYYY")}`}{c.valid_from && c.valid_until && " — "}{c.valid_until && `Until ${moment(c.valid_until).format("MMM D, YYYY")}`}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <div className="flex justify-end"><Button size="sm" onClick={() => { setPromoForm(BLANK_PROMO); setEditingPromo(null); setPromoOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Promotion</Button></div>
          {promos.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl"><Megaphone className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-30" /><p className="text-sm text-muted-foreground">No promotions yet</p></div>
          ) : (
            <div className="space-y-3">
              {promos.map(p => (
                <Card key={p.id} className={`p-4 border ${p.status === "active" ? "border-amber-200 bg-amber-50/30" : "border-border/60"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{p.name}</p>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className={`text-[9px] ${p.status === "active" ? "bg-amber-500" : ""}`}>{p.status}</Badge>
                        <Badge variant="outline" className="text-[9px]">{p.promotion_type?.replace("_"," ")}</Badge>
                      </div>
                      {p.headline && <p className="text-xs font-medium text-amber-700">"{p.headline}"</p>}
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {p.discount_pct > 0 && <span className="text-purple-600 font-medium">{p.discount_pct}% off</span>}
                        {p.free_trial_days > 0 && <span className="text-amber-600 font-medium">+{p.free_trial_days} trial days</span>}
                        {p.ends_at && <span><Calendar className="w-3 h-3 inline mr-0.5" />Ends {moment(p.ends_at).format("MMM D")}</span>}
                        <span>{p.redemption_count || 0} redemptions</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => togglePromo(p)}>{p.status === "active" ? "Pause" : "Activate"}</Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setPromoForm({...p}); setEditingPromo(p.id); setPromoOpen(true); }}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={() => deletePromo(p.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Coupon Dialog */}
      <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCoupon ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Code (uppercase)</label><Input value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" /></div>
              <div><label className="text-xs font-semibold block mb-1">Name</label><Input value={couponForm.name} onChange={e => setCouponForm({ ...couponForm, name: e.target.value })} /></div>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Coupon Type</label>
              <Select value={couponForm.coupon_type} onValueChange={v => setCouponForm({ ...couponForm, coupon_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["percent_off","amount_off","free_trial_extension","free_months","custom"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {couponForm.coupon_type === "percent_off" && <div><label className="text-xs font-semibold block mb-1">Discount %</label><Input type="number" min="0" max="100" value={couponForm.discount_pct} onChange={e => setCouponForm({ ...couponForm, discount_pct: e.target.value })} /></div>}
            {couponForm.coupon_type === "amount_off" && <div><label className="text-xs font-semibold block mb-1">Discount Amount ($)</label><Input type="number" min="0" value={couponForm.discount_amount} onChange={e => setCouponForm({ ...couponForm, discount_amount: e.target.value })} /></div>}
            {couponForm.coupon_type === "free_trial_extension" && <div><label className="text-xs font-semibold block mb-1">Extra Trial Days</label><Input type="number" min="0" value={couponForm.free_trial_days} onChange={e => setCouponForm({ ...couponForm, free_trial_days: e.target.value })} /></div>}
            {couponForm.coupon_type === "free_months" && <div><label className="text-xs font-semibold block mb-1">Free Months</label><Input type="number" min="0" value={couponForm.free_months} onChange={e => setCouponForm({ ...couponForm, free_months: e.target.value })} /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Duration</label>
                <Select value={couponForm.duration} onValueChange={v => setCouponForm({ ...couponForm, duration: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="once">Once</SelectItem><SelectItem value="repeating">Repeating</SelectItem><SelectItem value="forever">Forever</SelectItem></SelectContent>
                </Select>
              </div>
              {couponForm.duration === "repeating" && <div><label className="text-xs font-semibold block mb-1">Duration Months</label><Input type="number" min="1" value={couponForm.duration_months} onChange={e => setCouponForm({ ...couponForm, duration_months: e.target.value })} /></div>}
              <div><label className="text-xs font-semibold block mb-1">Max Redemptions</label><Input type="number" min="0" value={couponForm.max_redemptions || ""} onChange={e => setCouponForm({ ...couponForm, max_redemptions: e.target.value || null })} placeholder="Unlimited" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Valid From</label><Input type="date" value={couponForm.valid_from} onChange={e => setCouponForm({ ...couponForm, valid_from: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Valid Until</label><Input type="date" value={couponForm.valid_until} onChange={e => setCouponForm({ ...couponForm, valid_until: e.target.value })} /></div>
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={couponForm.is_active} onChange={e => setCouponForm({ ...couponForm, is_active: e.target.checked })} />Active</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={couponForm.single_use_per_customer} onChange={e => setCouponForm({ ...couponForm, single_use_per_customer: e.target.checked })} />Single use per customer</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCouponOpen(false)}>Cancel</Button>
              <Button onClick={saveCoupon} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Coupon"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promo Dialog */}
      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPromo ? "Edit Promotion" : "New Promotion"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold block mb-1">Name</label><Input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} /></div>
            <div><label className="text-xs font-semibold block mb-1">Type</label>
              <Select value={promoForm.promotion_type} onValueChange={v => setPromoForm({ ...promoForm, promotion_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["launch_offer","seasonal","win_back","referral_bonus","enterprise_deal","partner_deal","custom"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Headline</label><Input value={promoForm.headline} onChange={e => setPromoForm({ ...promoForm, headline: e.target.value })} placeholder="Limited time offer — 50% off!" /></div>
            <div><label className="text-xs font-semibold block mb-1">Description</label><Textarea value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Discount %</label><Input type="number" min="0" max="100" value={promoForm.discount_pct} onChange={e => setPromoForm({ ...promoForm, discount_pct: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Extra Trial Days</label><Input type="number" min="0" value={promoForm.free_trial_days} onChange={e => setPromoForm({ ...promoForm, free_trial_days: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold block mb-1">Starts</label><Input type="date" value={promoForm.starts_at} onChange={e => setPromoForm({ ...promoForm, starts_at: e.target.value })} /></div>
              <div><label className="text-xs font-semibold block mb-1">Ends</label><Input type="date" value={promoForm.ends_at} onChange={e => setPromoForm({ ...promoForm, ends_at: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPromoOpen(false)}>Cancel</Button>
              <Button onClick={savePromo} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Promotion"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}