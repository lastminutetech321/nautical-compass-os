import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Cpu, Plus, BookOpen, Edit2, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

const SERVICE_TYPES = ["juris_engine","resource_compass","labor_rail","court_compass","authority_compass","investigation_compass","custom"];
const STATUS_COLORS = { active: "bg-emerald-50 text-emerald-700 border-emerald-200", beta: "bg-blue-50 text-blue-700 border-blue-200", planned: "bg-amber-50 text-amber-700 border-amber-200", deprecated: "bg-slate-50 text-slate-500 border-slate-200" };
const TYPE_LABELS = { juris_engine: "JurisEngine", resource_compass: "Resource Compass", labor_rail: "Labor Rail", court_compass: "Court Compass", authority_compass: "Authority Compass", investigation_compass: "Investigation Compass", custom: "Custom" };

const emptyForm = { name: "", service_type: "custom", description: "", department: "", system_prompt_template: "", canon_categories: "", capabilities: "", consuming_applications: "", status: "planned", version: "1.0" };

export default function AIServicesLayer() {
  const [services, setServices] = useState([]);
  const [canonEntries, setCanonEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      base44.entities.AIService.list("-created_date", 100),
      base44.entities.CanonEntry.filter({ status: "active" }, "-created_date", 500).catch(() => []),
    ]);
    setServices(s);
    setCanonEntries(c);
    if (s.length > 0 && !selected) setSelected(s[0]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, service_type: editing.service_type, description: editing.description || "", department: editing.department || "", system_prompt_template: editing.system_prompt_template || "", canon_categories: (editing.canon_categories || []).join(", "), capabilities: (editing.capabilities || []).join(", "), consuming_applications: (editing.consuming_applications || []).join(", "), status: editing.status || "planned", version: editing.version || "1.0" });
    } else { setForm(emptyForm); }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, canon_categories: form.canon_categories.split(",").map(s => s.trim()).filter(Boolean), capabilities: form.capabilities.split(",").map(s => s.trim()).filter(Boolean), consuming_applications: form.consuming_applications.split(",").map(s => s.trim()).filter(Boolean), agent_profile_ids: editing?.agent_profile_ids || [] };
    let result;
    if (editing) { result = await base44.entities.AIService.update(editing.id, data); }
    else { result = await base44.entities.AIService.create({ ...data, call_count: 0 }); }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    setSelected(result);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Layer 3</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Cpu className="w-6 h-6 text-blue-500" />AI Services</h1>
          <p className="text-sm text-muted-foreground">{services.length} services · each references the NC Canon, not hardcoded rules</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Service</Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-blue-800 flex items-center gap-2">
        <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
        <strong>Layer 3 — AI Services.</strong> Each service pulls knowledge from the NC Canon at runtime. Updating the Canon improves all services automatically.
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16">
          <Cpu className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm mb-3">No AI services yet. Define your first service.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />New Service</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {services.map(svc => (
              <Card key={svc.id} className={`p-3 cursor-pointer transition-all ${selected?.id === svc.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(svc)}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold truncate">{svc.name}</p>
                  <Badge variant="outline" className={`text-[10px] border flex-shrink-0 ${STATUS_COLORS[svc.status] || ""}`}>{svc.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[svc.service_type] || svc.service_type}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  <BookOpen className="w-3 h-3" />{(svc.canon_categories || []).length} canon refs
                  <Zap className="w-3 h-3 ml-1" />{svc.call_count || 0} calls
                </div>
              </Card>
            ))}
          </div>

          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="text-base font-semibold">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[selected.service_type] || selected.service_type}</Badge>
                      <Badge variant="outline" className={`text-xs border ${STATUS_COLORS[selected.status] || ""}`}>{selected.status}</Badge>
                      <span className="text-xs text-muted-foreground">v{selected.version}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                </div>

                {selected.description && <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>}

                <Tabs defaultValue="canon">
                  <TabsList className="mb-4"><TabsTrigger value="canon">Canon References</TabsTrigger><TabsTrigger value="prompt">System Prompt</TabsTrigger><TabsTrigger value="apps">Applications</TabsTrigger></TabsList>
                  <TabsContent value="canon" className="space-y-3">
                    {(selected.canon_categories || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No canon categories configured.</p>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">CANON CATEGORIES USED</p>
                        <div className="flex flex-wrap gap-1.5 mb-4">{selected.canon_categories.map(c => <Badge key={c} variant="outline" className="text-xs">{c.replace(/_/g," ")}</Badge>)}</div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">ACTIVE CANON ENTRIES ({canonEntries.filter(e => (selected.canon_categories || []).includes(e.category) || (e.ai_services || []).some(s => s.toLowerCase().includes(selected.name.toLowerCase()))).length})</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {canonEntries.filter(e => (selected.canon_categories || []).includes(e.category) || (e.ai_services || []).some(s => s.toLowerCase().includes(selected.name.toLowerCase()))).map(entry => (
                            <div key={entry.id} className="flex items-center gap-2 text-xs p-2 bg-violet-50 border border-violet-100 rounded">
                              <BookOpen className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                              <span className="font-medium">{entry.title}</span>
                              {entry.citation && <span className="text-muted-foreground">· {entry.citation}</span>}
                              {entry.verified && <CheckCircle className="w-3 h-3 text-emerald-500 ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="prompt">
                    {selected.system_prompt_template ? (
                      <pre className="bg-muted p-4 rounded-lg text-xs whitespace-pre-wrap overflow-auto max-h-64">{selected.system_prompt_template}</pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">No system prompt template defined.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="apps">
                    {(selected.consuming_applications || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No applications registered.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">{selected.consuming_applications.map(a => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}</div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit AI Service" : "New AI Service"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Service Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Type</Label>
                <Select value={form.service_type} onValueChange={v => setForm({...form, service_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div><Label>Canon Categories (comma-separated)</Label><Input value={form.canon_categories} onChange={e => setForm({...form, canon_categories: e.target.value})} placeholder="civil_rights, standing_doctrine, federal_statute" /></div>
            <div><Label>System Prompt Template</Label><Textarea value={form.system_prompt_template} onChange={e => setForm({...form, system_prompt_template: e.target.value})} rows={5} placeholder="You are {service_name}. You must reference the NC Canon before answering..." className="text-sm font-mono" /></div>
            <div><Label>Capabilities (comma-separated)</Label><Input value={form.capabilities} onChange={e => setForm({...form, capabilities: e.target.value})} /></div>
            <div><Label>Consuming Applications</Label><Input value={form.consuming_applications} onChange={e => setForm({...form, consuming_applications: e.target.value})} placeholder="NC Web App, Client Dashboard, API" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["planned","beta","active","deprecated"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Version</Label><Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}