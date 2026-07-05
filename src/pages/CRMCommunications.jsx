import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, MessageSquare, Phone, Mail, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";

const TYPE_ICONS = { email: Mail, call: Phone, meeting: Users, sms: MessageSquare, linkedin: MessageSquare, in_person: Users, note: MessageSquare, other: MessageSquare };
const OUTCOME_COLORS = { positive:"bg-emerald-100 text-emerald-700", neutral:"bg-slate-100 text-slate-600", negative:"bg-red-100 text-red-700", follow_up_needed:"bg-amber-100 text-amber-700", won:"bg-emerald-100 text-emerald-700", lost:"bg-red-100 text-red-700" };
const STATUS_COLORS = { scheduled:"bg-blue-100 text-blue-700", completed:"bg-emerald-100 text-emerald-700", missed:"bg-red-100 text-red-700", cancelled:"bg-slate-100 text-slate-600", no_response:"bg-amber-100 text-amber-700" };
const emptyForm = { subject:"", type:"email", direction:"outbound", status:"completed", outcome:"neutral", date:"", duration_minutes:"", summary:"", body:"", next_steps:"", assigned_to:"" };

export default function CRMCommunications() {
  const [comms, setComms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, contact_id: "", organization_id: "" });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    const [c, ct, or_] = await Promise.all([
      base44.entities.CRMCommunication.list("-created_date", 500).catch(() => []),
      base44.entities.Contact.list("-created_date", 200).catch(() => []),
      base44.entities.Organization.list("-created_date", 200).catch(() => []),
    ]);
    setComms(c); setContacts(ct); setOrgs(or_);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...form, duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined };
    const result = await base44.entities.CRMCommunication.create(data);
    setSaving(false); setFormOpen(false); setForm({ ...emptyForm, contact_id: "", organization_id: "" }); setSelected(result); load();
  };

  const filtered = comms.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || `${c.subject} ${c.summary}`.toLowerCase().includes(q);
    const matchT = typeFilter === "all" || c.type === typeFilter;
    return matchQ && matchT;
  });

  const todayComms = comms.filter(c => c.date && moment(c.date).isSame(moment(), "day")).length;
  const followUps = comms.filter(c => c.outcome === "follow_up_needed").length;
  const positiveComms = comms.filter(c => c.outcome === "positive").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><MessageSquare className="w-6 h-6 text-pink-500" />Communication Log</h1>
          <p className="text-sm text-muted-foreground">{comms.length} communications · {todayComms} today</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ ...emptyForm, contact_id: "", organization_id: "", date: moment().format("YYYY-MM-DD") }); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Log Communication</Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-black text-blue-600">{comms.length}</p></Card>
        <Card className={`p-4 border ${followUps>0?"border-amber-200 bg-amber-50":"border-border/60"}`}><p className="text-xs text-muted-foreground">Follow-ups Needed</p><p className={`text-2xl font-black ${followUps>0?"text-amber-700":"text-emerald-600"}`}>{followUps}</p></Card>
        <Card className="p-4 border border-border/60"><p className="text-xs text-muted-foreground">Positive Outcomes</p><p className="text-2xl font-black text-emerald-600">{positiveComms}</p></Card>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search communications..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{["email","call","meeting","sms","linkedin","in_person","note","other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">No communications logged.</p>
            </div>
          ) : filtered.map(c => {
            const TypeIcon = TYPE_ICONS[c.type] || MessageSquare;
            const contact = contacts.find(ct => ct.id === c.contact_id);
            return (
              <Card key={c.id} className={`p-3 cursor-pointer transition-all ${selected?.id===c.id?"border-primary shadow-md":"border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(c)}>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{c.subject}</p>
                    <p className="text-[10px] text-muted-foreground">{contact ? `${contact.first_name} ${contact.last_name}` : "—"} · {c.date ? moment(c.date).fromNow() : "—"}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge className={`text-[9px] ${OUTCOME_COLORS[c.outcome]||""}`}>{c.outcome||"neutral"}</Badge>
                      <Badge className={`text-[9px] ${STATUS_COLORS[c.status]||""}`}>{c.status||"completed"}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {selected && (
          <div className="lg:col-span-2">
            <Card className="p-5 border border-border/60">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-semibold">{selected.subject}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{selected.type} · {selected.direction} · {selected.date ? moment(selected.date).format("MMM D, YYYY") : "—"}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={`text-xs ${OUTCOME_COLORS[selected.outcome]||""}`}>{selected.outcome}</Badge>
                  <Badge className={`text-xs ${STATUS_COLORS[selected.status]||""}`}>{selected.status}</Badge>
                </div>
              </div>
              {selected.summary && <div className="p-3 bg-muted rounded-lg mb-3 text-sm"><strong className="text-xs text-muted-foreground block mb-1">Summary</strong>{selected.summary}</div>}
              {selected.body && <div className="p-3 bg-muted/50 rounded-lg mb-3 text-sm whitespace-pre-wrap"><strong className="text-xs text-muted-foreground block mb-1">Full Body</strong>{selected.body}</div>}
              {selected.next_steps && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3"><p className="text-xs font-semibold text-amber-800">Next Steps</p><p className="text-sm text-amber-700">{selected.next_steps}</p></div>}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selected.duration_minutes && <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Duration: </span>{selected.duration_minutes}min</div>}
                {selected.assigned_to && <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Assigned: </span>{selected.assigned_to}</div>}
              </div>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm({...form,subject:e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form,type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["email","call","meeting","sms","linkedin","in_person","note","voicemail","other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Direction</Label>
                <Select value={form.direction} onValueChange={v => setForm({...form,direction:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["inbound","outbound","internal"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact</Label>
                <Select value={form.contact_id} onValueChange={v => setForm({...form,contact_id:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select contact" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Organization</Label>
                <Select value={form.organization_id} onValueChange={v => setForm({...form,organization_id:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select org" /></SelectTrigger>
                  <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({...form,duration_minutes:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form,status:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["scheduled","completed","missed","cancelled","no_response"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Outcome</Label>
                <Select value={form.outcome} onValueChange={v => setForm({...form,outcome:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["positive","neutral","negative","follow_up_needed","won","lost"].map(o => <SelectItem key={o} value={o}>{o.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Summary</Label><Textarea value={form.summary} onChange={e => setForm({...form,summary:e.target.value})} rows={2} /></div>
            <div><Label>Next Steps</Label><Textarea value={form.next_steps} onChange={e => setForm({...form,next_steps:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":"Log Communication"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}