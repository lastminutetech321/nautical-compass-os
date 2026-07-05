import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Monitor, Plus, Edit2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const APP_TYPES = ["web_app","mobile_app","client_dashboard","admin_dashboard","enterprise_dashboard","api","desktop_app","widget"];
const TYPE_LABELS = { web_app: "Web App", mobile_app: "Mobile App", client_dashboard: "Client Dashboard", admin_dashboard: "Admin Dashboard", enterprise_dashboard: "Enterprise Dashboard", api: "API", desktop_app: "Desktop App", widget: "Widget" };
const STATUS_COLORS = { concept: "bg-slate-50 text-slate-600 border-slate-200", development: "bg-blue-50 text-blue-700 border-blue-200", beta: "bg-amber-50 text-amber-700 border-amber-200", live: "bg-emerald-50 text-emerald-700 border-emerald-200", deprecated: "bg-red-50 text-red-600 border-red-200" };
const TYPE_ICONS = { web_app: "🌐", mobile_app: "📱", client_dashboard: "🏢", admin_dashboard: "⚙️", enterprise_dashboard: "🏛️", api: "🔌", desktop_app: "💻", widget: "🧩" };

const emptyForm = { name: "", app_type: "web_app", description: "", owner_entity: "", ai_services_consumed: "", canon_categories_used: "", status: "concept", url: "", version: "1.0", notes: "" };

export default function PlatformApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.PlatformApplication.list("-created_date", 100).then(data => {
      setApps(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, app_type: editing.app_type, description: editing.description || "", owner_entity: editing.owner_entity || "", ai_services_consumed: (editing.ai_services_consumed || []).join(", "), canon_categories_used: (editing.canon_categories_used || []).join(", "), status: editing.status || "concept", url: editing.url || "", version: editing.version || "1.0", notes: editing.notes || "" });
    } else { setForm(emptyForm); }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, ai_services_consumed: form.ai_services_consumed.split(",").map(s => s.trim()).filter(Boolean), canon_categories_used: form.canon_categories_used.split(",").map(s => s.trim()).filter(Boolean) };
    let result;
    if (editing) { result = await base44.entities.PlatformApplication.update(editing.id, data); }
    else { result = await base44.entities.PlatformApplication.create(data); }
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
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Layer 4</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Monitor className="w-6 h-6 text-emerald-500" />Platform Applications</h1>
          <p className="text-sm text-muted-foreground">{apps.length} applications · presentation layers that consume AI services</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />Register App</Button>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-emerald-800 flex items-center gap-2">
        <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
        <strong>Layer 4 — Applications.</strong> Presentation layers only — no business logic. Applications consume AI services; AI services query the Canon; the Canon references Founder Vision.
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-16">
          <Monitor className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm mb-3">No applications registered yet.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Register App</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps.map(app => (
            <Card key={app.id} className={`p-4 border cursor-pointer hover:shadow-md transition-all ${selected?.id === app.id ? "border-primary shadow-md" : "border-border/60"}`} onClick={() => setSelected(app)}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{TYPE_ICONS[app.app_type] || "📦"}</span>
                  <div>
                    <p className="text-sm font-semibold">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{TYPE_LABELS[app.app_type]}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[app.status] || ""}`}>{app.status}</Badge>
              </div>
              {app.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{app.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1 flex-wrap">
                  {(app.ai_services_consumed || []).slice(0, 2).map(s => <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>)}
                  {(app.ai_services_consumed || []).length > 2 && <Badge variant="secondary" className="text-[9px]">+{(app.ai_services_consumed||[]).length-2}</Badge>}
                </div>
                <div className="flex gap-1.5">
                  {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-primary hover:underline"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  <button onClick={e => { e.stopPropagation(); setEditing(app); setFormOpen(true); }} className="text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Application" : "Register Application"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>App Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Type</Label>
                <Select value={form.app_type} onValueChange={v => setForm({...form, app_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APP_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Owner / Entity</Label><Input value={form.owner_entity} onChange={e => setForm({...form, owner_entity: e.target.value})} placeholder="Apex Vision Holdings" /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["concept","development","beta","live","deprecated"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>AI Services Consumed (comma-separated)</Label><Input value={form.ai_services_consumed} onChange={e => setForm({...form, ai_services_consumed: e.target.value})} placeholder="JurisEngine, Court Compass" /></div>
            <div><Label>Canon Categories Used</Label><Input value={form.canon_categories_used} onChange={e => setForm({...form, canon_categories_used: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} type="url" /></div>
              <div><Label>Version</Label><Input value={form.version} onChange={e => setForm({...form, version: e.target.value})} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Register"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}