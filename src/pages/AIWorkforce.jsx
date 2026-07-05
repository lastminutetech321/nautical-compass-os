import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Plus, Edit2, Trash2, Zap, Clock, CheckCircle, AlertTriangle, Send, Loader2 } from "lucide-react";
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

const statusIcons = { active: CheckCircle, idle: Clock, paused: Clock, error: AlertTriangle };
const statusColors = { active: "text-emerald-500", idle: "text-slate-400", paused: "text-amber-400", error: "text-red-500" };
const deptColors = { "Executive": "bg-blue-100 text-blue-800", "Engineering": "bg-violet-100 text-violet-800", "Legal": "bg-amber-100 text-amber-800", "Evidence": "bg-red-100 text-red-800", "Operations": "bg-emerald-100 text-emerald-800", "Marketing": "bg-pink-100 text-pink-800", "Finance": "bg-slate-100 text-slate-700", "Security": "bg-orange-100 text-orange-800", "QA": "bg-cyan-100 text-cyan-800" };

const DEPARTMENTS = ["Executive","Engineering","Legal","Evidence","Operations","Marketing","Finance","Security","QA","Customer Support","Build Studio"];

export default function AIWorkforce() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [taskInput, setTaskInput] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [taskResult, setTaskResult] = useState(null);
  const [form, setForm] = useState({ name: "", purpose: "", department: "Engineering", skills: "", permissions: "", connected_modules: "", assigned_work: "", status: "idle", capabilities: [], avatar_color: "#6366f1" });
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
        department: editing.department || "Engineering",
        skills: (editing.skills || []).join(", "),
        permissions: (editing.permissions || []).join(", "),
        connected_modules: (editing.connected_modules || []).join(", "),
        assigned_work: editing.assigned_work || "",
        status: editing.status || "idle",
        capabilities: editing.capabilities || [],
        avatar_color: editing.avatar_color || "#6366f1"
      });
    } else {
      setForm({ name: "", purpose: "", department: "Engineering", skills: "", permissions: "", connected_modules: "", assigned_work: "", status: "idle", capabilities: [], avatar_color: "#6366f1" });
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
    let result;
    if (editing) {
      result = await base44.entities.AgentProfile.update(editing.id, data);
    } else {
      result = await base44.entities.AgentProfile.create(data);
      setSelected(result);
    }
    setSaving(false);
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.AgentProfile.delete(id);
    setSelected(null);
    load();
  };

  const dispatchTask = async () => {
    if (!taskInput.trim() || !selected) return;
    setDispatching(true);
    setTaskResult(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${selected.name}, an AI employee at Nautical Compass OS.

Your role: ${selected.purpose}
Your department: ${selected.department || "General"}
Your skills: ${(selected.skills || []).join(", ")}
Your connected modules: ${(selected.connected_modules || []).join(", ")}

TASK ASSIGNED: ${taskInput}

Respond as this AI employee would — professional, thorough, and in-character. Provide your full response to the task.`
    });
    // Log to activity
    const logEntry = { task: taskInput, response_preview: result.slice(0, 100), at: new Date().toISOString() };
    const updatedLog = [...(selected.activity_log || []), logEntry];
    await base44.entities.AgentProfile.update(selected.id, { activity_log: updatedLog, status: "active" });
    setSelected({ ...selected, activity_log: updatedLog, status: "active" });
    setTaskResult(result);
    setTaskInput("");
    setDispatching(false);
  };

  // Group agents by department
  const grouped = agents.reduce((acc, a) => {
    const dept = a.department || "General";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(a);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · AI Workforce</p>
          <h1 className="text-2xl font-bold tracking-tight">AI Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">{agents.length} agents · {agents.filter(a => a.status === "active").length} active</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm"><Plus className="w-4 h-4 mr-1.5" />Hire Agent</Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No AI employees yet. Start hiring.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster */}
          <div className="space-y-4 lg:col-span-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {Object.entries(grouped).map(([dept, deptAgents]) => (
              <div key={dept}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">{dept}</p>
                <div className="space-y-1">
                  {deptAgents.map(agent => {
                    const StatusIcon = statusIcons[agent.status] || Clock;
                    return (
                      <div
                        key={agent.id}
                        onClick={() => { setSelected(agent); setTaskResult(null); }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selected?.id === agent.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"}`}
                      >
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: agent.avatar_color || "#6366f1" }}>
                          {agent.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{agent.name}</p>
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`w-3 h-3 ${statusColors[agent.status] || "text-slate-400"}`} />
                            <span className="text-[10px] text-muted-foreground capitalize">{agent.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Agent Detail */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style={{ background: selected.avatar_color || "#6366f1" }}>
                      {selected.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground">{selected.purpose}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] ${deptColors[selected.department] || "bg-slate-100 text-slate-600"}`}>{selected.department || "General"}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{selected.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(selected.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <Tabs defaultValue="dispatch">
                  <TabsList className="mb-4">
                    <TabsTrigger value="dispatch">Dispatch Task</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dispatch" className="space-y-3">
                    <div className="flex gap-2">
                      <Textarea
                        value={taskInput}
                        onChange={e => setTaskInput(e.target.value)}
                        placeholder={`Assign a task to ${selected.name}...`}
                        rows={3}
                        className="text-sm resize-none"
                      />
                      <Button onClick={dispatchTask} disabled={dispatching || !taskInput.trim()} className="flex-shrink-0 h-auto px-3">
                        {dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    {taskResult && (
                      <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/40 max-h-72 overflow-y-auto">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">RESPONSE FROM {selected.name.toUpperCase()}</p>
                        {taskResult}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-4">
                    {(selected.skills || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">SKILLS</p><div className="flex flex-wrap gap-1">{selected.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></div>
                    )}
                    {(selected.permissions || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">PERMISSIONS</p><div className="flex flex-wrap gap-1">{selected.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div></div>
                    )}
                    {(selected.connected_modules || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">CONNECTED MODULES</p><div className="flex flex-wrap gap-1">{selected.connected_modules.map(m => <Badge key={m} variant="outline" className="text-xs bg-primary/5">{m}</Badge>)}</div></div>
                    )}
                    {(selected.capabilities || []).length > 0 && (
                      <div><p className="text-xs font-semibold text-muted-foreground mb-2">CAPABILITIES</p><div className="flex flex-wrap gap-1">{selected.capabilities.map(c => <Badge key={c} className="text-xs bg-violet-50 text-violet-700 border border-violet-200">{c.replace(/_/g," ")}</Badge>)}</div></div>
                    )}
                    {selected.assigned_work && <div><p className="text-xs font-semibold text-muted-foreground mb-1">ASSIGNED WORK</p><p className="text-sm bg-muted p-3 rounded-lg">{selected.assigned_work}</p></div>}
                  </TabsContent>

                  <TabsContent value="history">
                    {(selected.activity_log || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                    ) : (
                      <div className="space-y-2">
                        {[...(selected.activity_log || [])].reverse().map((entry, i) => (
                          <div key={i} className="p-3 bg-muted rounded-lg text-xs">
                            <p className="font-medium truncate">{entry.task}</p>
                            <p className="text-muted-foreground mt-0.5 truncate">{entry.response_preview}...</p>
                            <p className="text-muted-foreground mt-1">{moment(entry.at).fromNow()}</p>
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

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Agent" : "Hire AI Employee"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name / Title</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="e.g. Chief Architect" /></div>
              <div>
                <Label>Department</Label>
                <Select value={form.department} onValueChange={v => setForm({...form, department: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Purpose / Role Description</Label><Textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={2} required /></div>
            <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} /></div>
            <div><Label>Connected Modules</Label><Input value={form.connected_modules} onChange={e => setForm({...form, connected_modules: e.target.value})} placeholder="Evidence Vault, Case Timeline..." /></div>
            <div><Label>Assigned Work</Label><Textarea value={form.assigned_work} onChange={e => setForm({...form, assigned_work: e.target.value})} rows={2} /></div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","idle","paused"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Avatar Color</Label><input type="color" value={form.avatar_color} onChange={e => setForm({...form, avatar_color: e.target.value})} className="h-9 w-16 rounded cursor-pointer mt-1 border" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Hire"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}