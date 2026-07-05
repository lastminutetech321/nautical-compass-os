import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Building2, User, AlertTriangle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const HEALTH_COLORS = { cold:"bg-slate-100 text-slate-600", warm:"bg-amber-100 text-amber-700", hot:"bg-red-100 text-red-700", at_risk:"bg-orange-100 text-orange-700", strong:"bg-emerald-100 text-emerald-700" };
const TYPE_COLORS = { member:"bg-blue-100 text-blue-700", prospect:"bg-amber-100 text-amber-700", enterprise_client:"bg-violet-100 text-violet-700", partner:"bg-emerald-100 text-emerald-700", attorney:"bg-red-100 text-red-700", government_agency:"bg-indigo-100 text-indigo-700", board_member:"bg-yellow-100 text-yellow-700", vendor:"bg-slate-100 text-slate-600" };
const emptyContactForm = { first_name:"", last_name:"", email:"", phone:"", title:"", contact_type:"other", lifecycle_stage:"prospect", relationship_health:"warm", status:"active", organization_id:"", assigned_to:"", assigned_agent:"", last_contact_date:"", next_action:"", next_action_date:"", revenue_value:"", notes:"", linkedin_url:"" };
const emptyOrgForm = { name:"", type:"prospect", status:"prospect", lifecycle_stage:"prospect", relationship_health:"cold", industry:"", website:"", email:"", phone:"", address:"", size:"1-10", revenue_value:"", mrr:"", assigned_to:"", assigned_agent:"", next_action:"", next_action_date:"", notes:"" };

export default function CRMContacts() {
  const [contacts, setContacts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editingOrg, setEditingOrg] = useState(null);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [orgForm, setOrgForm] = useState(emptyOrgForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState("contact");

  const load = async () => {
    setLoading(true);
    const [c, o] = await Promise.all([
      base44.entities.Contact.list("-created_date", 500).catch(() => []),
      base44.entities.Organization.list("-created_date", 300).catch(() => []),
    ]);
    setContacts(c); setOrgs(o);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveContact = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...contactForm, revenue_value: contactForm.revenue_value ? Number(contactForm.revenue_value) : 0 };
    const result = editingContact ? await base44.entities.Contact.update(editingContact.id, data) : await base44.entities.Contact.create(data);
    setSaving(false); setContactFormOpen(false); setEditingContact(null); setSelected(result); setSelectedType("contact"); load();
  };

  const saveOrg = async (e) => {
    e.preventDefault(); setSaving(true);
    const data = { ...orgForm, revenue_value: orgForm.revenue_value ? Number(orgForm.revenue_value) : 0, mrr: orgForm.mrr ? Number(orgForm.mrr) : 0 };
    const result = editingOrg ? await base44.entities.Organization.update(editingOrg.id, data) : await base44.entities.Organization.create(data);
    setSaving(false); setOrgFormOpen(false); setEditingOrg(null); setSelected(result); setSelectedType("org"); load();
  };

  const openEditContact = (c) => { setEditingContact(c); setContactForm({ first_name:c.first_name||"", last_name:c.last_name||"", email:c.email||"", phone:c.phone||"", title:c.title||"", contact_type:c.contact_type||"other", lifecycle_stage:c.lifecycle_stage||"prospect", relationship_health:c.relationship_health||"warm", status:c.status||"active", organization_id:c.organization_id||"", assigned_to:c.assigned_to||"", assigned_agent:c.assigned_agent||"", last_contact_date:c.last_contact_date||"", next_action:c.next_action||"", next_action_date:c.next_action_date||"", revenue_value:c.revenue_value||"", notes:c.notes||"", linkedin_url:c.linkedin_url||"" }); setContactFormOpen(true); };
  const openEditOrg = (o) => { setEditingOrg(o); setOrgForm({ name:o.name||"", type:o.type||"prospect", status:o.status||"prospect", lifecycle_stage:o.lifecycle_stage||"prospect", relationship_health:o.relationship_health||"cold", industry:o.industry||"", website:o.website||"", email:o.email||"", phone:o.phone||"", address:o.address||"", size:o.size||"1-10", revenue_value:o.revenue_value||"", mrr:o.mrr||"", assigned_to:o.assigned_to||"", assigned_agent:o.assigned_agent||"", next_action:o.next_action||"", next_action_date:o.next_action_date||"", notes:o.notes||"" }); setOrgFormOpen(true); };

  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || `${c.first_name} ${c.last_name} ${c.email} ${c.title}`.toLowerCase().includes(q);
    const matchT = typeFilter === "all" || c.contact_type === typeFilter;
    return matchQ && matchT;
  });
  const filteredOrgs = orgs.filter(o => {
    const q = search.toLowerCase();
    return !q || `${o.name} ${o.industry} ${o.email}`.toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Enterprise CRM</p>
          <h1 className="text-2xl font-bold tracking-tight">Contacts & Organizations</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contacts · {orgs.length} organizations</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingOrg(null); setOrgForm(emptyOrgForm); setOrgFormOpen(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Organization</Button>
          <Button size="sm" onClick={() => { setEditingContact(null); setContactForm(emptyContactForm); setContactFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Contact</Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts & orgs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{["member","prospect","enterprise_client","partner","attorney","government_agency","board_member","vendor"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="mb-4">
          <TabsTrigger value="contacts">Contacts ({filteredContacts.length})</TabsTrigger>
          <TabsTrigger value="orgs">Organizations ({filteredOrgs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No contacts yet.</p>
                </div>
              ) : filteredContacts.map(c => {
                const org = orgs.find(o => o.id === c.organization_id);
                const overdue = c.next_action_date && moment(c.next_action_date).isBefore(moment());
                return (
                  <Card key={c.id} className={`p-3 cursor-pointer transition-all ${selected?.id===c.id&&selectedType==="contact"?"border-primary shadow-md":"border-border/60 hover:shadow-sm"}`} onClick={() => { setSelected(c); setSelectedType("contact"); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.title}{org ? ` · ${org.name}` : ""}</p>
                      </div>
                      {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge className={`text-[9px] ${TYPE_COLORS[c.contact_type]||"bg-slate-100 text-slate-600"}`}>{(c.contact_type||"other").replace(/_/g," ")}</Badge>
                      <Badge className={`text-[9px] ${HEALTH_COLORS[c.relationship_health]||""}`}>{c.relationship_health}</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
            {selected && selectedType === "contact" && (
              <div className="lg:col-span-2">
                <Card className="p-5 border border-border/60">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{selected.first_name} {selected.last_name}</h2>
                      <p className="text-xs text-muted-foreground">{selected.title}</p>
                      <p className="text-xs text-muted-foreground">{selected.email}{selected.phone ? ` · ${selected.phone}` : ""}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEditContact(selected)}>Edit</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[["Type", (selected.contact_type||"—").replace(/_/g," ")],["Lifecycle", selected.lifecycle_stage||"—"],["Health", selected.relationship_health||"—"],["Last Contact", selected.last_contact_date ? moment(selected.last_contact_date).format("MMM D, YYYY") : "—"],["Assigned To", selected.assigned_to||"—"],["Revenue Value", selected.revenue_value ? `$${Number(selected.revenue_value).toLocaleString()}` : "—"]].map(([l,v]) => (
                      <div key={l} className="p-2.5 bg-muted/50 rounded-lg"><p className="text-[10px] text-muted-foreground">{l}</p><p className="text-xs font-medium capitalize">{v}</p></div>
                    ))}
                  </div>
                  {selected.next_action && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3"><p className="text-xs font-semibold text-amber-800">Next Action</p><p className="text-sm text-amber-700">{selected.next_action}</p></div>}
                  {selected.notes && <div className="p-3 bg-muted rounded-lg text-sm">{selected.notes}</div>}
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="orgs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filteredOrgs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No organizations yet.</p>
                </div>
              ) : filteredOrgs.map(o => (
                <Card key={o.id} className={`p-3 cursor-pointer transition-all ${selected?.id===o.id&&selectedType==="org"?"border-primary shadow-md":"border-border/60 hover:shadow-sm"}`} onClick={() => { setSelected(o); setSelectedType("org"); }}>
                  <p className="text-sm font-semibold truncate">{o.name}</p>
                  <p className="text-[10px] text-muted-foreground">{o.industry || "—"} · {o.size || "—"}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge className={`text-[9px] ${HEALTH_COLORS[o.relationship_health]||""}`}>{o.relationship_health}</Badge>
                    <Badge variant="outline" className="text-[9px] capitalize">{(o.type||"").replace(/_/g," ")}</Badge>
                    {o.mrr > 0 && <span className="text-[9px] text-emerald-600 font-semibold">${o.mrr.toLocaleString()}/mo</span>}
                  </div>
                </Card>
              ))}
            </div>
            {selected && selectedType === "org" && (
              <div className="lg:col-span-2">
                <Card className="p-5 border border-border/60">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground">{selected.industry} · {selected.size}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openEditOrg(selected)}>Edit</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[["Type", (selected.type||"—").replace(/_/g," ")],["Status", selected.status||"—"],["Health", selected.relationship_health||"—"],["MRR", selected.mrr ? `$${Number(selected.mrr).toLocaleString()}/mo` : "—"],["ARR", selected.arr ? `$${Number(selected.arr).toLocaleString()}` : "—"],["Assigned To", selected.assigned_to||"—"]].map(([l,v]) => (
                      <div key={l} className="p-2.5 bg-muted/50 rounded-lg"><p className="text-[10px] text-muted-foreground">{l}</p><p className="text-xs font-medium capitalize">{v}</p></div>
                    ))}
                  </div>
                  {selected.next_action && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3"><p className="text-xs font-semibold text-amber-800">Next Action</p><p className="text-sm text-amber-700">{selected.next_action}</p></div>}
                  {selected.notes && <div className="p-3 bg-muted rounded-lg text-sm">{selected.notes}</div>}
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Form */}
      <Dialog open={contactFormOpen} onOpenChange={v => { setContactFormOpen(v); if (!v) setEditingContact(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingContact ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
          <form onSubmit={saveContact} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={contactForm.first_name} onChange={e => setContactForm({...contactForm,first_name:e.target.value})} required /></div>
              <div><Label>Last Name *</Label><Input value={contactForm.last_name} onChange={e => setContactForm({...contactForm,last_name:e.target.value})} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={contactForm.email} onChange={e => setContactForm({...contactForm,email:e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={contactForm.phone} onChange={e => setContactForm({...contactForm,phone:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={contactForm.title} onChange={e => setContactForm({...contactForm,title:e.target.value})} /></div>
              <div><Label>Organization</Label>
                <Select value={contactForm.organization_id} onValueChange={v => setContactForm({...contactForm,organization_id:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select org" /></SelectTrigger>
                  <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Type</Label>
                <Select value={contactForm.contact_type} onValueChange={v => setContactForm({...contactForm,contact_type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["member","prospect","enterprise_client","partner","attorney","government_agency","board_member","vendor","advisor","other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Relationship Health</Label>
                <Select value={contactForm.relationship_health} onValueChange={v => setContactForm({...contactForm,relationship_health:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["cold","warm","hot","at_risk","strong"].map(h => <SelectItem key={h} value={h}>{h.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Last Contact</Label><Input type="date" value={contactForm.last_contact_date} onChange={e => setContactForm({...contactForm,last_contact_date:e.target.value})} /></div>
              <div><Label>Next Action Date</Label><Input type="date" value={contactForm.next_action_date} onChange={e => setContactForm({...contactForm,next_action_date:e.target.value})} /></div>
            </div>
            <div><Label>Next Action</Label><Input value={contactForm.next_action} onChange={e => setContactForm({...contactForm,next_action:e.target.value})} /></div>
            <div><Label>Notes</Label><Textarea value={contactForm.notes} onChange={e => setContactForm({...contactForm,notes:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setContactFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":editingContact?"Update":"Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Org Form */}
      <Dialog open={orgFormOpen} onOpenChange={v => { setOrgFormOpen(v); if (!v) setEditingOrg(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingOrg ? "Edit Organization" : "New Organization"}</DialogTitle></DialogHeader>
          <form onSubmit={saveOrg} className="space-y-3">
            <div><Label>Organization Name *</Label><Input value={orgForm.name} onChange={e => setOrgForm({...orgForm,name:e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={orgForm.type} onValueChange={v => setOrgForm({...orgForm,type:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["client","enterprise_client","member","prospect","partner","vendor","government","nonprofit","internal"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Relationship Health</Label>
                <Select value={orgForm.relationship_health} onValueChange={v => setOrgForm({...orgForm,relationship_health:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["cold","warm","hot","at_risk","strong"].map(h => <SelectItem key={h} value={h}>{h.replace(/_/g," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Industry</Label><Input value={orgForm.industry} onChange={e => setOrgForm({...orgForm,industry:e.target.value})} /></div>
              <div><Label>Size</Label>
                <Select value={orgForm.size} onValueChange={v => setOrgForm({...orgForm,size:v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["1-10","11-50","51-200","201-500","500+"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Website</Label><Input value={orgForm.website} onChange={e => setOrgForm({...orgForm,website:e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={orgForm.email} onChange={e => setOrgForm({...orgForm,email:e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>MRR ($)</Label><Input type="number" value={orgForm.mrr} onChange={e => setOrgForm({...orgForm,mrr:e.target.value})} /></div>
              <div><Label>Assigned To</Label><Input value={orgForm.assigned_to} onChange={e => setOrgForm({...orgForm,assigned_to:e.target.value})} /></div>
            </div>
            <div><Label>Next Action</Label><Input value={orgForm.next_action} onChange={e => setOrgForm({...orgForm,next_action:e.target.value})} /></div>
            <div><Label>Notes</Label><Textarea value={orgForm.notes} onChange={e => setOrgForm({...orgForm,notes:e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOrgFormOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving?"Saving...":editingOrg?"Update":"Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}