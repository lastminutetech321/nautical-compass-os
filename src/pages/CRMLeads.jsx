import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Users, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

const LIFECYCLE = ["lead","prospect","qualified","opportunity","proposal","negotiation","won","lost","inactive"];
const HEALTH_COLORS = { cold:"bg-slate-100 text-slate-600", warm:"bg-amber-100 text-amber-700", hot:"bg-red-100 text-red-700", at_risk:"bg-orange-100 text-orange-700", strong:"bg-emerald-100 text-emerald-700" };
const STATUS_COLORS = { new:"bg-blue-100 text-blue-700", contacted:"bg-amber-100 text-amber-700", engaged:"bg-violet-100 text-violet-700", qualified:"bg-emerald-100 text-emerald-700", disqualified:"bg-slate-100 text-slate-600", converted:"bg-green-100 text-green-700" };
const emptyForm = { first_name:"", last_name:"", email:"", phone:"", company:"", title:"", source:"other", lifecycle_stage:"lead", status:"new", priority:"medium", relationship_health:"cold", revenue_potential:"", probability:"", assigned_to:"", assigned_agent:"", last_contact_date:"", next_action:"", next_action_date:"", notes:"" };

export default function CRMLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.CRMLead.list("-created_date", 500).catch(() => []);
    setLeads(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openEdit = (lead) => {
    setEditing(lead);
    setForm({ first_name:lead.first_name||"", last_name:lead.last_name||"", email:lead.email||"", phone:lead.phone||"", company:lead.company||"", title:lead.title||"", source:lead.source||"other", lifecycle_stage:lead.lifecycle_stage||"lead", status:lead.status||"new", priority:lead.priority||"medium", relationship_health:lead.relationship_health||"cold", revenue_potential:lead.revenue_potential||"", probability:lead.probability||"", assigned_to:lead.assigned_to||"", assigned_agent:lead.assigned_agent||"", last_contact_date:lead.last_contact_date||"", next_action:lead.next_action||"", next_action_date:lead.next_action_date||"", notes:lead.notes||"" });
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...form, revenue_potential: form.revenue_potential ? Number(form.revenue_potential) : 0, probability: form.probability ? Number(form.probability) : 0 };
    const result = editing ? await base44.entities.CRMLead.update(editing.id, data) : await base44.entities.CRMLead.create(data);
    setSaving(false); setFormOpen(false); setEditing(null); setSelected(result); load();
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || `${l.first_name} ${l.last_name} ${l.email} ${l.company}`.toLowerCase().includes(q);
    const matchS = stageFilter === "all" || l.lifecycle_stage === stageFilter;
    return matchQ && matchS;
  });

  const newCount = leads.filter(l => l.status === "new").length;
  const qualifiedCount = leads.filter(l => l.lifecycle_stage === "qualified").length;
  const atRisk = leads.filter(l => l.relationship_health === "at_risk").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="w-6 h-6 text-blue-500" />Lead Registry</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads · {newCount} new · {qualifiedCount} qualified</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setForm(emptyForm); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Lead</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-2xl font-black text-blue-600">{leads.length}</p></Card>
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Qualified</p><p className="text-2xl font-black text-emerald-600">{qualifiedCount}</p></Card>
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">At Risk</p><p className={`text-2xl font-black ${atRisk>0?"text-red-600":"text-emerald-600"}`}>{atRisk}</p></Card>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All stages" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Stages</SelectItem>{LIFECYCLE.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No leads yet.</p>
              <Button size="sm" className="mt-3" onClick={() => setFormOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" />Add Lead</Button>
            </div>
          ) : filtered.map(lead => {
            const overdue = lead.next_action_date && moment(lead.next_action_date).isBefore(moment());
            return (
              <Card key={lead.id} className={`p-3 cursor-pointer transition-all ${selected?.id===lead.id?"border-primary shadow-md":"border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(lead)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{lead.first_name} {lead.last_name}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.company || "—"} · {lead.title || "—"}</p>
                  </div>
                  {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge className={`text-[9px] ${STATUS_COLORS[lead.status]||""}`}>{lead.status}</Badge>
                  <Badge className={`text-[9px] ${HEALTH_COLORS[lead.relationship_health]||""}`}>{lead.relationship_health}</Badge>
                  <Badge variant="outline" className="text-[9px] capitalize">{lead.source}</Badge>
                </div>
                {lead.revenue_potential > 0 && <p className="text-xs text-emerald-600 font-semibold mt-1">${lead.revenue_potential.toLocaleString()} potential</p>}
                {lead.next_action && <p className={`text-[9px] mt-1 ${overdue?"text-red-600 font-medium":"text-muted-foreground"}`}>→ {lead.next_action}</p>}
              </Card>
            );
          })}
        </div>

        {selected && (
          <div className="lg:col-span-2">
            <Card className="p-5 border border-border/60">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold">{selected.first_name} {selected.last_name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.company} · {selected.title}</p>
                  <p className="text-xs text-muted-foreground">{selected.email} · {selected.phone}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(selected)}>Edit</Button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Lifecycle Stage", value: selected.lifecycle_stage },
                  { label: "Status", value: selected.status },
                  { label: "Relationship Health", value: selected.relationship_health },
                  { label: "Source", value: selected.source },
                  { label: "Revenue Potential", value: selected.revenue_potential ? `$${Number(selected.revenue_potential).toLocaleString()}` : "—" },
                  { label: "Probability", value: selected.probability ? `${selected.probability}%` : "—" },
                  { label: "Assigned To", value: selected.assigned_to || "—" },
                  { label: "Assigned Agent", value: selected.assigned_agent || "—" },
                  { label: "Last Contact", value: selected.last_contact_date ? moment(selected.last_contact_date).format("MMM D, YYYY") : "—" },
                  { label: "Next Action Date", value: selected.next_action_date ? moment(selected.next_action_date).format("MMM D, YYYY") : "—" },
                ].map(f => (
                  <div key={f.label} className="p-2.5 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground capitalize">{f.label}</p>
                    <p className="text-xs font-medium capitalize">{String(f.value).replace(/_/g," ")}</p>
                  </div>
                ))}
              </div>
              {selected.next_action && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">Next Action</p>
                  <p className="text-sm text-amber-700">{selected.next_action}</p>
                </div>
              )}
              {selected.notes && <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">{selected.notes}</div>}
            </Card>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Lead" : "New Lead"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm({...form,first_name:e.target.value})} required /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm({...form,last_name:e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({...form,company:e.target.value})} /></div>
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form,title:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Source</Label>
                <Select value={form.source} onValueChange={v => setForm({...form,source:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["website","referral","outbound","event","social","partner","inbound","cold","other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Lifecycle Stage</Label>
                <Select value={form.lifecycle_stage} onValueChange={v => setForm({...form,lifecycle_stage:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{LIFECYCLE.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form,status:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["new","contacted","engaged","qualified","disqualified","converted"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Relationship Health</Label>
                <Select value={form.relationship_health} onValueChange={v => setForm({...form,relationship_health:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["cold","warm","hot","at_risk","strong"].map(h => <SelectItem key={h} value={h}>{h.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Revenue Potential ($)</Label><Input type="number" value={form.revenue_potential} onChange={e => setForm({...form,revenue_potential:e.target.value})} /></div>
              <div><Label>Probability (%)</Label><Input type="number" min="0" max="100" value={form.probability} onChange={e => setForm({...form,probability:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm({...form,assigned_to:e.target.value})} /></div>
              <div><Label>Assigned AI Agent</Label><Input value={form.assigned_agent} onChange={e => setForm({...form,assigned_agent:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Last Contact Date</Label><Input type="date" value={form.last_contact_date} onChange={e => setForm({...form,last_contact_date:e.target.value})} /></div>
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