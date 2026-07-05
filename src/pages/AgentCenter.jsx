import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Plus, Zap, CheckCircle, Clock, AlertTriangle, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const statusIcons = { active: CheckCircle, idle: Clock, paused: Clock, error: AlertTriangle };
const statusColors = { active: "text-emerald-500", idle: "text-slate-400", paused: "text-amber-400", error: "text-red-500" };

const defaultCapabilities = ["invoke_llm","upload_file","send_email","generate_image","generate_speech","web_search","read_entities","write_entities"];

export default function AgentCenter() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", purpose: "", skills: "", permissions: "", connected_modules: "", assigned_work: "", status: "idle", capabilities: [], avatar_color: "#6366f1" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.AgentProfile.list("-created_date", 50).then(data => {
      setAgents(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, purpose: editing.purpose,
        skills: (editing.skills || []).join(", "),
        permissions: (editing.permissions || []).join(", "),
        connected_modules: (editing.connected_modules || []).join(", "),
        assigned_work: editing.assigned_work || "",
        status: editing.status || "idle",
        capabilities: editing.capabilities || [],
        avatar_color: editing.avatar_color || "#6366f1"
      });
    } else {
      setForm({ name: "", purpose: "", skills: "", permissions: "", connected_modules: "", assigned_work: "", status: "idle", capabilities: [], avatar_color: "#6366f1" });
    }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      permissions: form.permissions.split(",").map(s => s.trim()).filter(Boolean),
      connected_modules: form.connected_modules.split(",").map(s => s.trim()).filter(Boolean),
      activity_log: editing?.activity_log || [],
    };
    if (editing) {
      await base44.entities.AgentProfile.update(editing.id, data);
    } else {
      const created = await base44.entities.AgentProfile.create(data);
      setSelected(created);
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const toggleCapability = (cap) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap) ? f.capabilities.filter(c => c !== cap) : [...f.capabilities, cap]
    }));
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    await base44.entities.AgentProfile.update(selected.id, { status });
    setSelected({ ...selected, status });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="AI Agent Center"
        subtitle={`${agents.length} agents configured`}
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Agent</Button>}
      />

      {agents.length === 0 ? (
        <EmptyState icon={Bot} title="No agents configured" description="Add your AI agent workforce" actionLabel="Add Agent" onAction={() => { setEditing(null); setFormOpen(true); }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent list */}
          <div className="space-y-2">
            {agents.map(agent => {
              const StatusIcon = statusIcons[agent.status] || Clock;
              return (
                <Card key={agent.id} className={`p-3 cursor-pointer transition-all ${selected?.id === agent.id ? "border-primary shadow-md" : "border-border/60 hover:shadow-sm"}`} onClick={() => setSelected(agent)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: agent.avatar_color || "#6366f1" }}>
                      {agent.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{agent.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <StatusIcon className={`w-3 h-3 ${statusColors[agent.status] || "text-slate-400"}`} />
                        <span className="text-[10px] text-muted-foreground capitalize">{agent.status}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <div className="lg:col-span-2">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ background: selected.avatar_color || "#6366f1" }}>
                      {selected.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground">{selected.purpose}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <Select value={selected.status} onValueChange={updateStatus}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>{["active","idle","paused","error"].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5 mr-1.5" />Edit</Button>
                  </div>
                </div>

                <Tabs defaultValue="overview">
                  <TabsList className="mb-4"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="capabilities">Capabilities</TabsTrigger><TabsTrigger value="work">Assigned Work</TabsTrigger></TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    {(selected.skills || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">SKILLS</p><div className="flex flex-wrap gap-1">{selected.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></div>
                    )}
                    {(selected.permissions || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">PERMISSIONS</p><div className="flex flex-wrap gap-1">{selected.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div></div>
                    )}
                    {(selected.connected_modules || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">CONNECTED MODULES</p><div className="flex flex-wrap gap-1">{selected.connected_modules.map(m => <Badge key={m} variant="outline" className="text-xs bg-primary/5">{m}</Badge>)}</div></div>
                    )}
                  </TabsContent>
                  <TabsContent value="capabilities">
                    <div className="grid grid-cols-2 gap-2">
                      {defaultCapabilities.map(cap => (
                        <div key={cap} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${(selected.capabilities || []).includes(cap) ? "bg-primary/5 border-primary/30 text-primary" : "bg-muted border-border/40 text-muted-foreground"}`}>
                          <Zap className="w-3.5 h-3.5" />{cap.replace(/_/g, " ")}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="work">
                    <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap min-h-24">{selected.assigned_work || "No assigned work."}</div>
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          )}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Agent" : "Add Agent"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agent Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","idle","paused","error"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Purpose / Description</Label><Textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={2} required /></div>
            <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="research, writing, code review" /></div>
            <div><Label>Permissions (comma-separated)</Label><Input value={form.permissions} onChange={e => setForm({...form, permissions: e.target.value})} placeholder="read:evidence, write:documents" /></div>
            <div><Label>Connected Modules (comma-separated)</Label><Input value={form.connected_modules} onChange={e => setForm({...form, connected_modules: e.target.value})} placeholder="Evidence Vault, Case Timeline" /></div>
            <div>
              <Label className="mb-2 block">Capabilities</Label>
              <div className="grid grid-cols-2 gap-2">
                {defaultCapabilities.map(cap => (
                  <label key={cap} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${form.capabilities.includes(cap) ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border/40"}`}>
                    <input type="checkbox" checked={form.capabilities.includes(cap)} onChange={() => toggleCapability(cap)} className="hidden" />
                    <Zap className="w-3.5 h-3.5" />{cap.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Assigned Work</Label><Textarea value={form.assigned_work} onChange={e => setForm({...form, assigned_work: e.target.value})} rows={3} placeholder="What is this agent currently working on?" /></div>
            <div className="flex items-center gap-3"><Label>Avatar Color</Label><input type="color" value={form.avatar_color} onChange={e => setForm({...form, avatar_color: e.target.value})} className="h-8 w-16 rounded cursor-pointer" /></div>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}