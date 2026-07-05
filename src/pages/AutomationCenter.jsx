import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Zap, Play, Pause, FlaskConical, CheckCircle, AlertTriangle, Edit2, Trash2 } from "lucide-react";
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

const DEPARTMENTS = ["Executive","Engineering","Legal","Evidence","Operations","Marketing","Finance","Security","QA","Customer Support"];
const modeColors = { testing: "bg-amber-50 text-amber-700 border-amber-200", production: "bg-emerald-50 text-emerald-700 border-emerald-200", disabled: "bg-slate-50 text-slate-500 border-slate-200" };
const statusColors = { active: "text-emerald-500", paused: "text-amber-500", error: "text-red-500", draft: "text-slate-400" };

export default function AutomationCenter() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", department: "Engineering", trigger_type: "manual", mode: "testing", status: "draft", actions: "", conditions: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Automation.list("-created_date", 100).then(data => {
      setAutomations(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, description: editing.description || "", department: editing.department || "Engineering",
        trigger_type: editing.trigger_type || "manual", mode: editing.mode || "testing", status: editing.status || "draft",
        actions: (editing.actions || []).map(a => typeof a === "string" ? a : JSON.stringify(a)).join("\n"),
        conditions: (editing.conditions || []).map(c => typeof c === "string" ? c : JSON.stringify(c)).join("\n"),
      });
    } else {
      setForm({ name: "", description: "", department: "Engineering", trigger_type: "manual", mode: "testing", status: "draft", actions: "", conditions: "" });
    }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      actions: form.actions.split("\n").map(s => s.trim()).filter(Boolean).map(s => ({ action: s })),
      conditions: form.conditions.split("\n").map(s => s.trim()).filter(Boolean).map(s => ({ condition: s })),
    };
    if (editing) {
      await base44.entities.Automation.update(editing.id, data);
    } else {
      const created = await base44.entities.Automation.create({ ...data, logs: [], run_count: 0 });
      setSelected(created);
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const newStatus = selected.status === "active" ? "paused" : "active";
    await base44.entities.Automation.update(selected.id, { status: newStatus });
    setSelected({ ...selected, status: newStatus });
    load();
  };

  const cycleMode = async () => {
    if (!selected) return;
    const modes = ["testing", "production", "disabled"];
    const next = modes[(modes.indexOf(selected.mode) + 1) % modes.length];
    await base44.entities.Automation.update(selected.id, { mode: next });
    setSelected({ ...selected, mode: next });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · Automation</p>
          <h1 className="text-2xl font-bold tracking-tight">Automation Center</h1>
          <p className="text-sm text-muted-foreground">{automations.length} automations · {automations.filter(a => a.status === "active").length} active</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1.5" />New Automation</Button>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-16">
          <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm mb-4">No automations yet. Create your first automation.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4 mr-1.5" />New Automation</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {automations.map(a => (
              <Card key={a.id} className={`p-3 cursor-pointer transition-all ${selected?.id === a.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(a)}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold truncate">{a.name}</p>
                  <Zap className={`w-3.5 h-3.5 flex-shrink-0 ${statusColors[a.status] || "text-slate-400"}`} />
                </div>
                <p className="text-xs text-muted-foreground">{a.department}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`text-[10px] border ${modeColors[a.mode] || ""}`}>{a.mode}</Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.trigger_type}</Badge>
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
                    <p className="text-xs text-muted-foreground">{selected.department} · {selected.trigger_type} trigger</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={cycleMode}>
                      <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                      <span className={`text-xs ${modeColors[selected.mode]?.split(" ")[1] || ""}`}>{selected.mode}</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={toggleStatus}>
                      {selected.status === "active" ? <Pause className="w-3.5 h-3.5 mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                      {selected.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                {selected.description && <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>}

                <Tabs defaultValue="config">
                  <TabsList className="mb-4"><TabsTrigger value="config">Configuration</TabsTrigger><TabsTrigger value="logs">Logs ({(selected.logs || []).length})</TabsTrigger></TabsList>
                  <TabsContent value="config" className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">TRIGGER</p>
                      <Badge variant="outline" className="text-xs capitalize">{selected.trigger_type}</Badge>
                      {selected.trigger_config && <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">{JSON.stringify(selected.trigger_config, null, 2)}</pre>}
                    </div>
                    {(selected.conditions || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">CONDITIONS</p>
                        <ul className="space-y-1">{selected.conditions.map((c, i) => <li key={i} className="text-xs bg-muted p-2 rounded">{typeof c === "string" ? c : c.condition}</li>)}</ul>
                      </div>
                    )}
                    {(selected.actions || []).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">ACTIONS</p>
                        <ul className="space-y-1">{selected.actions.map((a, i) => <li key={i} className="text-xs bg-muted p-2 rounded flex items-center gap-2"><Zap className="w-3 h-3 text-primary flex-shrink-0" />{typeof a === "string" ? a : a.action}</li>)}</ul>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Runs: {selected.run_count || 0}</span>
                      {selected.last_run && <span>Last run: {moment(selected.last_run).fromNow()}</span>}
                    </div>
                  </TabsContent>
                  <TabsContent value="logs">
                    {(selected.logs || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No logs yet</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {[...(selected.logs || [])].reverse().map((log, i) => (
                          <div key={i} className="text-xs p-2 bg-muted rounded flex items-start gap-2">
                            {log.success ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                            <div><p>{log.message}</p><p className="text-muted-foreground">{moment(log.at).fromNow()}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Automation" : "New Automation"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm({...form, department: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Trigger Type</Label>
                <Select value={form.trigger_type} onValueChange={v => setForm({...form, trigger_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["manual","schedule","event","webhook","condition"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Conditions (one per line)</Label><Textarea value={form.conditions} onChange={e => setForm({...form, conditions: e.target.value})} rows={3} placeholder="If project status = active&#10;If due date within 7 days" /></div>
            <div><Label>Actions (one per line)</Label><Textarea value={form.actions} onChange={e => setForm({...form, actions: e.target.value})} rows={4} placeholder="Send email notification&#10;Update task status&#10;Invoke AI agent" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Mode</Label>
                <Select value={form.mode} onValueChange={v => setForm({...form, mode: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["testing","production","disabled"].map(m => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["draft","active","paused"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}