import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Hammer, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const stages = ["idea","planning","architecture","development","testing","approved","ready","deployed"];
const typeLabels = { internal_nc: "Internal NC", client_project: "Client Project", partner_project: "Partner", nc_venture: "NC Venture", experimental: "Experimental" };
const stageColors = { idea: "bg-slate-100 text-slate-600", planning: "bg-blue-100 text-blue-700", architecture: "bg-violet-100 text-violet-700", development: "bg-amber-100 text-amber-700", testing: "bg-orange-100 text-orange-700", approved: "bg-emerald-100 text-emerald-700", ready: "bg-emerald-100 text-emerald-700", deployed: "bg-emerald-100 text-emerald-700" };

export default function BuildStudio() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", owner_client: "", type: "internal_nc", main_prompt: "", goals: "", pages: "", automations: "", ai_agents: "", integrations: "", database_needs: "", security_needs: "", budget: "", timeline: "", status: "idea", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.BuildProject.list("-created_date", 100).then(data => {
      setProjects(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, owner_client: editing.owner_client || "", type: editing.type || "internal_nc",
        main_prompt: editing.main_prompt || "", goals: (editing.goals || []).join("\n"), pages: (editing.pages || []).join("\n"),
        automations: (editing.automations || []).join("\n"), ai_agents: (editing.ai_agents || []).join("\n"),
        integrations: (editing.integrations || []).join("\n"), database_needs: editing.database_needs || "",
        security_needs: editing.security_needs || "", budget: editing.budget || "", timeline: editing.timeline || "",
        status: editing.status || "idea", notes: editing.notes || ""
      });
    } else {
      setForm({ name: "", owner_client: "", type: "internal_nc", main_prompt: "", goals: "", pages: "", automations: "", ai_agents: "", integrations: "", database_needs: "", security_needs: "", budget: "", timeline: "", status: "idea", notes: "" });
    }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      budget: form.budget ? Number(form.budget) : undefined,
      goals: form.goals.split("\n").map(s => s.trim()).filter(Boolean),
      pages: form.pages.split("\n").map(s => s.trim()).filter(Boolean),
      automations: form.automations.split("\n").map(s => s.trim()).filter(Boolean),
      ai_agents: form.ai_agents.split("\n").map(s => s.trim()).filter(Boolean),
      integrations: form.integrations.split("\n").map(s => s.trim()).filter(Boolean),
    };
    if (editing) {
      await base44.entities.BuildProject.update(editing.id, data);
    } else {
      const created = await base44.entities.BuildProject.create(data);
      setSelected(created);
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Build Studio"
        subtitle="Internal and external project builder"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm"><Plus className="w-4 h-4 mr-1.5" />New Build Project</Button>}
      />

      {projects.length === 0 ? (
        <EmptyState icon={Hammer} title="No build projects" description="Start tracking internal and client builds" actionLabel="New Project" onAction={() => setFormOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {projects.map(p => (
              <Card key={p.id} className={`p-3 cursor-pointer transition-all ${selected?.id === p.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(p)}>
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.owner_client || "Internal"}</p>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline" className="text-[10px]">{typeLabels[p.type] || p.type}</Badge>
                  <Badge className={`text-[10px] ${stageColors[p.status] || ""}`}>{p.status}</Badge>
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
                    <p className="text-xs text-muted-foreground">{selected.owner_client || "Internal"} · {typeLabels[selected.type]}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`text-xs ${stageColors[selected.status] || ""}`}>{selected.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
                  </div>
                </div>
                <Tabs defaultValue="overview">
                  <TabsList className="mb-4 flex-wrap h-auto"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="scope">Scope</TabsTrigger><TabsTrigger value="tech">Tech</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    {selected.main_prompt && <div className="bg-muted p-3 rounded-lg text-sm italic">"{selected.main_prompt}"</div>}
                    {(selected.goals || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">GOALS</p><ul className="space-y-1">{selected.goals.map((g, i) => <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary mt-0.5">→</span>{g}</li>)}</ul></div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Budget</p><p className="font-medium">{selected.budget ? `$${Number(selected.budget).toLocaleString()}` : "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Timeline</p><p className="font-medium">{selected.timeline || "—"}</p></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="scope" className="space-y-4">
                    {(selected.pages || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">PAGES</p><div className="flex flex-wrap gap-1">{selected.pages.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div></div>}
                    {(selected.automations || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">AUTOMATIONS</p><div className="flex flex-wrap gap-1">{selected.automations.map(a => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}</div></div>}
                    {(selected.ai_agents || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">AI AGENTS</p><div className="flex flex-wrap gap-1">{selected.ai_agents.map(a => <Badge key={a} className="text-xs bg-violet-50 text-violet-700 border border-violet-200">{a}</Badge>)}</div></div>}
                  </TabsContent>
                  <TabsContent value="tech" className="space-y-4">
                    {(selected.integrations || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">INTEGRATIONS</p><div className="flex flex-wrap gap-1">{selected.integrations.map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)}</div></div>}
                    {selected.database_needs && <div><p className="text-xs font-semibold text-muted-foreground mb-1">DATABASE</p><p className="text-sm">{selected.database_needs}</p></div>}
                    {selected.security_needs && <div><p className="text-xs font-semibold text-muted-foreground mb-1">SECURITY</p><p className="text-sm">{selected.security_needs}</p></div>}
                  </TabsContent>
                  <TabsContent value="notes">
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap min-h-24">{selected.notes || "No notes."}</div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Build Project" : "New Build Project"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Project Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Owner / Client</Label><Input value={form.owner_client} onChange={e => setForm({...form, owner_client: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{stages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Main Prompt / Vision</Label><Textarea value={form.main_prompt} onChange={e => setForm({...form, main_prompt: e.target.value})} rows={2} /></div>
            <div><Label>Goals (one per line)</Label><Textarea value={form.goals} onChange={e => setForm({...form, goals: e.target.value})} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Pages (one per line)</Label><Textarea value={form.pages} onChange={e => setForm({...form, pages: e.target.value})} rows={3} /></div>
              <div><Label>Automations (one per line)</Label><Textarea value={form.automations} onChange={e => setForm({...form, automations: e.target.value})} rows={3} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>AI Agents (one per line)</Label><Textarea value={form.ai_agents} onChange={e => setForm({...form, ai_agents: e.target.value})} rows={3} /></div>
              <div><Label>Integrations (one per line)</Label><Textarea value={form.integrations} onChange={e => setForm({...form, integrations: e.target.value})} rows={3} /></div>
            </div>
            <div><Label>Database Needs</Label><Textarea value={form.database_needs} onChange={e => setForm({...form, database_needs: e.target.value})} rows={2} /></div>
            <div><Label>Security Requirements</Label><Textarea value={form.security_needs} onChange={e => setForm({...form, security_needs: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget ($)</Label><Input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} /></div>
              <div><Label>Timeline</Label><Input value={form.timeline} onChange={e => setForm({...form, timeline: e.target.value})} placeholder="e.g. Q3 2026" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}