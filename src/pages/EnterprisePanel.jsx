import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Edit2, Users, DollarSign, TrendingUp, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

const tierColor = {
  starter: "bg-slate-100 text-slate-700",
  professional: "bg-blue-100 text-blue-700",
  enterprise: "bg-violet-100 text-violet-700",
  partner: "bg-amber-100 text-amber-700",
};
const statusColor = {
  prospect: "border-slate-300 text-slate-600",
  trial: "border-blue-300 text-blue-600",
  active: "border-emerald-300 text-emerald-600",
  churned: "border-red-300 text-red-600",
  suspended: "border-amber-300 text-amber-600",
};

const emptyForm = { name:"", domain:"", industry:"", tier:"starter", status:"prospect", primary_contact_name:"", primary_contact_email:"", billing_email:"", seat_count:1, max_seats:5, mrr:0, notes:"" };

export default function EnterprisePanel() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.EnterpriseOrg.list("-created_date", 200).catch(() => []);
    setOrgs(data);
    if (data.length > 0 && !selected) setSelected(data[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form, seat_count: Number(form.seat_count), max_seats: Number(form.max_seats), mrr: Number(form.mrr), arr: Number(form.mrr) * 12 };
    if (editId) await base44.entities.EnterpriseOrg.update(editId, data);
    else await base44.entities.EnterpriseOrg.create(data);
    setSaving(false); setShowForm(false); setEditId(null); setForm(emptyForm); load();
  };

  const openEdit = (org) => { setForm({ name:org.name||"", domain:org.domain||"", industry:org.industry||"", tier:org.tier||"starter", status:org.status||"prospect", primary_contact_name:org.primary_contact_name||"", primary_contact_email:org.primary_contact_email||"", billing_email:org.billing_email||"", seat_count:org.seat_count||1, max_seats:org.max_seats||5, mrr:org.mrr||0, notes:org.notes||"" }); setEditId(org.id); setShowForm(true); };

  const totalMRR = orgs.filter(o => o.status === "active").reduce((s, o) => s + (o.mrr || 0), 0);
  const activeCt = orgs.filter(o => o.status === "active").length;
  const trialCt = orgs.filter(o => o.status === "trial").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise Platform</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />Enterprise Organizations
          </h1>
          <p className="text-sm text-muted-foreground">Manage enterprise clients, tiers, seats, and contracts</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />Add Organization
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Orgs", value: orgs.length, color: "text-slate-700 bg-slate-50" },
          { label: "Active", value: activeCt, color: "text-emerald-600 bg-emerald-50" },
          { label: "In Trial", value: trialCt, color: "text-blue-600 bg-blue-50" },
          { label: "Enterprise MRR", value: `$${totalMRR.toLocaleString()}`, color: totalMRR > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50" },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color.split(" ")[0]}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {orgs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground mb-3">No enterprise organizations added yet.</p>
          <Button size="sm" onClick={() => setShowForm(true)}>Add First Organization</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Org list */}
          <div className="lg:col-span-1 space-y-2">
            {orgs.map(org => (
              <button key={org.id} onClick={() => setSelected(org)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === org.id ? "bg-primary/10 border-primary/30" : "border-border/40 hover:bg-muted"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold truncate flex-1">{org.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${tierColor[org.tier]}`}>{org.tier}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[9px] capitalize ${statusColor[org.status]}`}>{org.status}</Badge>
                  {org.mrr > 0 && <span className="text-[10px] text-emerald-600 font-medium">${org.mrr}/mo</span>}
                  <span className="text-[10px] text-muted-foreground">{org.seat_count || 1} seats</span>
                </div>
              </button>
            ))}
          </div>

          {/* Org detail */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold">{selected.name}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${tierColor[selected.tier]}`}>{selected.tier}</span>
                    </div>
                    <Badge variant="outline" className={`text-xs capitalize ${statusColor[selected.status]}`}>{selected.status}</Badge>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openEdit(selected)}>
                    <Edit2 className="w-3 h-3" />Edit
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "MRR", value: `$${(selected.mrr||0).toLocaleString()}`, icon: DollarSign },
                    { label: "ARR", value: `$${(selected.arr||(selected.mrr||0)*12).toLocaleString()}`, icon: TrendingUp },
                    { label: "Seats", value: `${selected.seat_count||1} / ${selected.max_seats||5}`, icon: Users },
                  ].map(m => (
                    <div key={m.label} className="p-3 bg-muted rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">{m.label}</p>
                      <p className="text-lg font-bold">{m.value}</p>
                    </div>
                  ))}
                </div>

                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {[
                    ["Domain", selected.domain], ["Industry", selected.industry],
                    ["Primary Contact", selected.primary_contact_name], ["Contact Email", selected.primary_contact_email],
                    ["Contract Start", selected.contract_start ? moment(selected.contract_start).format("MMM D, YYYY") : null],
                    ["Contract End", selected.contract_end ? moment(selected.contract_end).format("MMM D, YYYY") : null],
                  ].filter(([,v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>

                {(selected.enabled_modules||[]).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Enabled Modules</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.enabled_modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <div className="mt-4 p-3 bg-muted rounded text-xs text-muted-foreground">{selected.notes}</div>
                )}

                <p className="text-[10px] text-muted-foreground mt-4">Added {moment(selected.created_date).fromNow()}</p>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Organization" : "Add Enterprise Organization"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              {[["Organization Name","name","text"],["Domain","domain","text"],["Industry","industry","text"],["Primary Contact","primary_contact_name","text"],["Contact Email","primary_contact_email","email"],["Billing Email","billing_email","email"]].map(([label, key, type]) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">{label}</label>
                  <input type={type} className="w-full border rounded px-2.5 py-1.5 text-sm" value={form[key]||""} onChange={e => setForm({...form,[key]:e.target.value})} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Tier</label>
                <Select value={form.tier} onValueChange={v => setForm({...form, tier: v})}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["starter","professional","enterprise","partner"].map(t=><SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["prospect","trial","active","churned","suspended"].map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">MRR ($)</label>
                <input type="number" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.mrr} onChange={e => setForm({...form, mrr: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Seats Used</label><input type="number" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.seat_count} onChange={e => setForm({...form, seat_count: e.target.value})} /></div>
              <div><label className="text-xs font-semibold text-muted-foreground block mb-1">Max Seats</label><input type="number" className="w-full border rounded px-2.5 py-1.5 text-sm" value={form.max_seats} onChange={e => setForm({...form, max_seats: e.target.value})} /></div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Notes</label>
              <textarea className="w-full border rounded px-2.5 py-1.5 text-sm resize-none" rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving || !form.name}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                {editId ? "Update" : "Create"} Organization
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}