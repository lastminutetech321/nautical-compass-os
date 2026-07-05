import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Handshake, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";

const HEALTH_COLORS = { cold:"bg-slate-100 text-slate-600", warm:"bg-amber-100 text-amber-700", hot:"bg-red-100 text-red-700", at_risk:"bg-orange-100 text-orange-700", strong:"bg-emerald-100 text-emerald-700" };
const TYPE_COLORS = { referral_partner:"bg-blue-100 text-blue-700", reseller:"bg-violet-100 text-violet-700", integration:"bg-cyan-100 text-cyan-700", strategic:"bg-emerald-100 text-emerald-700", attorney:"bg-red-100 text-red-700", government_agency:"bg-indigo-100 text-indigo-700", board_member:"bg-yellow-100 text-yellow-700", vendor:"bg-slate-100 text-slate-600", investor:"bg-amber-100 text-amber-700", advisor:"bg-pink-100 text-pink-700" };
const PARTNER_TYPES = ["referral_partner","reseller","integration","strategic","attorney","government_agency","board_member","vendor","investor","advisor"];
const emptyForm = { name:"", type:"referral_partner", status:"prospect", lifecycle_stage:"lead", relationship_health:"warm", industry:"", website:"", agreement_type:"", agreement_start:"", agreement_end:"", commission_pct:"", assigned_to:"", assigned_agent:"", last_contact_date:"", next_action:"", next_action_date:"", notes:"" };

export default function CRMPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CRMPartner.list("-created_date", 300).catch(() => []);
    setPartners(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name:p.name||"", type:p.type||"referral_partner", status:p.status||"prospect", lifecycle_stage:p.lifecycle_stage||"lead", relationship_health:p.relationship_health||"warm", industry:p.industry||"", website:p.website||"", agreement_type:p.agreement_type||"", agreement_start:p.agreement_start||"", agreement_end:p.agreement_end||"", commission_pct:p.commission_pct||"", assigned_to:p.assigned_to||"", assigned_agent:p.assigned_agent||"", last_contact_date:p.last_contact_date||"", next_action:p.next_action||"", next_action_date:p.next_action_date||"", notes:p.notes||"" });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...form, commission_pct: form.commission_pct ? Number(form.commission_pct) : 0 };
    const result = editing ? await base44.entities.CRMPartner.update(editing.id, data) : await base44.entities.CRMPartner.create(data);
    setSaving(false); setFormOpen(false); setEditing(null); setSelected(result); load();
  };

  const filtered = partners.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || `${p.name} ${p.industry}`.toLowerCase().includes(q);
    const matchT = typeFilter === "all" || p.type === typeFilter;
    return matchQ && matchT;
  });

  const activePartners = partners.filter(p => p.status === "active").length;
  const atRisk = partners.filter(p => p.relationship_health === "at_risk").length;
  const totalRevGen = partners.reduce((s, p) => s + (p.revenue_generated || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Handshake className="w-6 h-6 text-cyan-500" />Partner Network</h1>
          <p className="text-sm text-muted-foreground">{partners.length} partners · {activePartners} active</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Partner</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Active Partners</p><p className="text-2xl font-black text-emerald-600">{activePartners}</p></Card>
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Revenue Generated</p><p className="text-2xl font-black text-blue-600">${totalRevGen.toLocaleString()}</p></Card>
        <Card className={`p-4 border ${atRisk>0?"border-orange-200 bg-orange-50":"border-border/60"}`}><p className="text-xs text-muted-foreground">At Risk</p><p className={`text-2xl font-black ${atRisk>0?"text-orange-600":"text-emerald-600"}`}>{atRisk}</p></Card>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search partners..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{PARTNER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Handshake className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No partners yet.</p>
              <Button size="sm" className="mt-3" onClick={() => setFormOpen(true)}>Add Partner</Button>
            </div>
          ) : filtered.map(p => {
            const overdue = p.next_action_date && moment(p.next_action_date).isBefore(moment());
            return (
              <Card key={p.id} className={`p-3 cursor-pointer transition-all ${selected?.id===p.id?"border-primary shadow-md":"border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(p)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.industry || "—"}</p>
                  </div>
                  {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge className={`text-[9px] ${TYPE_COLORS[p.type]||"bg-slate-100 text-slate-600"}`}>{(p.type||"").replace(/_/g," ")}</Badge>
                  <Badge className={`text-[9px] ${HEALTH_COLORS[p.relationship_health]||""}`}>{p.relationship_health}</Badge>
                </div>
                {p.revenue_generated > 0 && <p className="text-xs text-emerald-600 font-semibold mt-1">${p.revenue_generated.toLocaleString()} generated</p>}
              </Card>
            );
          })}
        </div>

        {selected && (
          <div className="lg:col-span-2">
            <Card className="p-5 border border-border/60">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{(selected.type||"").replace(/_/g," ")} · {selected.industry || "—"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>Edit</Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[["Status", selected.status||"—"],["Lifecycle", selected.lifecycle_stage||"—"],["Health", (selected.relationship_health||"—").replace(/_/g," ")],["Commission", selected.commission_pct ? `${selected.commission_pct}%` : "—"],["Revenue Generated", selected.revenue_generated ? `$${selected.revenue_generated.toLocaleString()}` : "—"],["Referrals Sent", selected.referrals_sent||0],["Referrals Converted", selected.referrals_converted||0],["Assigned To", selected.assigned_to||"—"]].map(([l,v]) => (
                  <div key={l} className="p-2.5 bg-muted/50 rounded-lg"><p className="text-[10px] text-muted-foreground">{l}</p><p className="text-xs font-medium capitalize">{v}</p></div>
                ))}
              </div>
              {selected.agreement_type && <div className="p-3 bg-muted rounded-lg mb-3 text-xs"><strong>Agreement:</strong> {selected.agreement_type}{selected.agreement_start ? ` · ${selected.agreement_start} → ${selected.agreement_end || "ongoing"}` : ""}</div>}
              {selected.next_action && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3"><p className="text-xs font-semibold text-amber-800">Next Action</p><p className="text-sm text-amber-700">{selected.next_action}</p></div>}
              {selected.notes && <div className="p-3 bg-muted rounded-lg text-sm">{selected.notes}</div>}
            </Card>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Partner" : "New Partner"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Partner Name *</Label><Input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm({...form,type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{PARTNER_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form,status:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["prospect","active","inactive","at_risk","churned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Relationship Health</Label>
                <Select value={form.relationship_health} onValueChange={v => setForm({...form,relationship_health:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["cold","warm","hot","at_risk","strong"].map(h => <SelectItem key={h} value={h}>{h.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Commission (%)</Label><Input type="number" min="0" max="100" value={form.commission_pct} onChange={e => setForm({...form,commission_pct:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({...form,industry:e.target.value})} /></div>
              <div><Label>Website</Label><Input value={form.website} onChange={e => setForm({...form,website:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agreement Start</Label><Input type="date" value={form.agreement_start} onChange={e => setForm({...form,agreement_start:e.target.value})} /></div>
              <div><Label>Agreement End</Label><Input type="date" value={form.agreement_end} onChange={e => setForm({...form,agreement_end:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Last Contact</Label><Input type="date" value={form.last_contact_date} onChange={e => setForm({...form,last_contact_date:e.target.value})} /></div>
              <div><Label>Next Action Date</Label><Input type="date" value={form.next_action_date} onChange={e => setForm({...form,next_action_date:e.target.value})} /></div>
            </div>
            <div><Label>Next Action</Label><Input value={form.next_action} onChange={e => setForm({...form,next_action:e.target.value})} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":editing?"Update":"Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}