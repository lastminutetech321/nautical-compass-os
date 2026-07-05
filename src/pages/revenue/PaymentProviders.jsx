import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CreditCard, Plus, Check, AlertTriangle, Settings, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROVIDER_META = {
  stripe: { icon: "💳", color: "bg-indigo-50 border-indigo-200", label: "Stripe", desc: "Full subscriptions, webhooks, SCA-ready", capabilities: ["subscriptions", "one_time", "refunds", "webhooks", "trials"] },
  square: { icon: "🟦", color: "bg-blue-50 border-blue-200", label: "Square", desc: "POS + online payments, strong US presence", capabilities: ["subscriptions", "one_time", "refunds", "webhooks"] },
  paypal: { icon: "🅿️", color: "bg-sky-50 border-sky-200", label: "PayPal", desc: "Broad consumer adoption, international", capabilities: ["subscriptions", "one_time", "refunds", "webhooks"] },
  authorizenet: { icon: "🔐", color: "bg-orange-50 border-orange-200", label: "Authorize.net", desc: "Enterprise ACH + card, established gateway", capabilities: ["subscriptions", "one_time", "refunds"] },
  manual_invoice: { icon: "📄", color: "bg-gray-50 border-gray-200", label: "Manual Invoice", desc: "PDF invoices, net terms, offline tracking", capabilities: ["one_time", "custom_terms"] },
  bank_transfer: { icon: "🏦", color: "bg-emerald-50 border-emerald-200", label: "Bank Transfer / ACH", desc: "Direct bank transfers, ACH, wire", capabilities: ["one_time", "recurring"] },
  custom: { icon: "⚙️", color: "bg-purple-50 border-purple-200", label: "Custom Processor", desc: "Integrate any payment processor via abstraction layer", capabilities: ["custom"] },
};

const BLANK = { name: "", provider_type: "stripe", display_name: "", sandbox_mode: true, is_active: false, is_default: false, config: {}, notes: "" };

export default function PaymentProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); const p = await base44.entities.PaymentProvider.list().catch(() => []); setProviders(p); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openNew = (type) => {
    const meta = PROVIDER_META[type];
    setForm({ ...BLANK, provider_type: type, name: meta.label, display_name: meta.label });
    setEditing(null); setOpen(true);
  };

  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    if (editing) await base44.entities.PaymentProvider.update(editing, form);
    else await base44.entities.PaymentProvider.create(form);
    setSaving(false); setOpen(false); load();
  };

  const setDefault = async (p) => {
    await Promise.all(providers.map(pr => base44.entities.PaymentProvider.update(pr.id, { is_default: pr.id === p.id })));
    load();
  };

  const toggle = async (p) => { await base44.entities.PaymentProvider.update(p.id, { is_active: !p.is_active }); load(); };
  const remove = async (p) => { if (!confirm("Remove this provider?")) return; await base44.entities.PaymentProvider.delete(p.id); load(); };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Revenue OS · Abstraction Layer</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CreditCard className="w-6 h-6 text-indigo-500" />Payment Providers</h1>
          <p className="text-sm text-muted-foreground">Multi-provider abstraction — Stripe is one of many. Business logic never changes per provider.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1.5" />Refresh</Button>
      </div>

      {/* Architecture note */}
      <Card className="p-4 border border-blue-200 bg-blue-50/50">
        <p className="text-xs font-semibold text-blue-800 mb-1">Payment Abstraction Architecture</p>
        <p className="text-xs text-blue-700">NCOS uses a provider-agnostic payment layer. Subscriptions, invoices, and revenue events are stored in NCOS entities — not provider-specific. Each record carries a <code className="bg-blue-100 px-1 rounded">payment_provider</code> field. Adding a new provider requires only configuration, not code changes.</p>
      </Card>

      {/* Configured providers */}
      {providers.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Configured Providers</p>
          <div className="space-y-3">
            {providers.map(p => {
              const meta = PROVIDER_META[p.provider_type] || PROVIDER_META.custom;
              return (
                <Card key={p.id} className={`p-4 border ${meta.color}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{p.display_name || p.name}</p>
                          {p.is_default && <Badge className="text-[9px] h-4 px-1.5 bg-emerald-600">Default</Badge>}
                          {p.sandbox_mode && <Badge variant="outline" className="text-[9px] h-4 px-1.5">Sandbox</Badge>}
                          <Badge variant={p.is_active ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">{p.is_active ? "Active" : "Inactive"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!p.is_default && p.is_active && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDefault(p)}>Set Default</Button>}
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => toggle(p)}>{p.is_active ? "Deactivate" : "Activate"}</Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(p)}><Settings className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => remove(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground mt-2 pl-11">{p.notes}</p>}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available providers to add */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Add Payment Provider</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(PROVIDER_META).map(([type, meta]) => {
            const already = providers.find(p => p.provider_type === type);
            return (
              <Card key={type} className={`p-4 border ${meta.color} ${already ? "opacity-60" : "cursor-pointer hover:shadow-md transition-shadow"}`} onClick={() => !already && openNew(type)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{meta.icon}</span>
                  {already ? <Badge variant="outline" className="text-[9px]">Configured</Badge> : <Plus className="w-4 h-4 text-muted-foreground" />}
                </div>
                <p className="font-semibold text-sm mb-1">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {meta.capabilities.map(c => <span key={c} className="text-[9px] px-1.5 py-0.5 bg-white/70 rounded border text-muted-foreground">{c}</span>)}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Configure"} Payment Provider</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-semibold block mb-1">Display Name</label><Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
            <div><label className="text-xs font-semibold block mb-1">Provider Type</label>
              <Select value={form.provider_type} onValueChange={v => setForm({ ...form, provider_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PROVIDER_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="rounded" />Active</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.sandbox_mode} onChange={e => setForm({ ...form, sandbox_mode: e.target.checked })} className="rounded" />Sandbox / Test Mode</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded" />Default</label>
            </div>
            <div><label className="text-xs font-semibold block mb-1">Notes / Config Instructions</label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Webhook URL, account notes, etc." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Provider"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}