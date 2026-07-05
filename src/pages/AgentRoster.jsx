import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Bot, Plus, Edit2, Trash2, Zap, Clock, CheckCircle, AlertTriangle,
  Send, Loader2, Shield, Brain, Search, TrendingUp, BarChart3, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import moment from "moment";

const AGENT_TYPES = [
  { value: "legal_research", label: "Legal Research", icon: "⚖️", dept: "Legal" },
  { value: "foia", label: "FOIA Agent", icon: "📂", dept: "Legal" },
  { value: "evidence", label: "Evidence Agent", icon: "🔬", dept: "Legal" },
  { value: "investigation", label: "Investigation", icon: "🔍", dept: "Legal" },
  { value: "court", label: "Court Agent", icon: "🏛️", dept: "Legal" },
  { value: "compliance", label: "Compliance", icon: "✅", dept: "Legal" },
  { value: "civil_rights", label: "Civil Rights", icon: "✊", dept: "Legal" },
  { value: "document_review", label: "Document Review", icon: "📄", dept: "Legal" },
  { value: "risk_assessment", label: "Risk Assessment", icon: "⚠️", dept: "Operations" },
  { value: "business_ops", label: "Business Ops", icon: "💼", dept: "Operations" },
  { value: "product_manager", label: "Product Manager", icon: "🎯", dept: "Engineering" },
  { value: "qa", label: "QA", icon: "🧪", dept: "Engineering" },
  { value: "architecture", label: "Architecture", icon: "🏗️", dept: "Engineering" },
  { value: "security", label: "Security", icon: "🔒", dept: "Security" },
  { value: "automation", label: "Automation", icon: "⚡", dept: "Engineering" },
  { value: "documentation", label: "Documentation", icon: "📚", dept: "Engineering" },
  { value: "marketing", label: "Marketing", icon: "📢", dept: "Marketing" },
  { value: "finance", label: "Finance", icon: "💰", dept: "Finance" },
  { value: "referral", label: "Referral Mgmt", icon: "🔗", dept: "Sales" },
  { value: "customer_support", label: "Customer Support", icon: "🎧", dept: "Support" },
  { value: "custom", label: "Custom", icon: "🤖", dept: "General" },
];

const statusColors = { active: "text-emerald-500", idle: "text-slate-400", paused: "text-amber-400", error: "text-red-500" };
const statusBg = { active: "bg-emerald-100 text-emerald-700", idle: "bg-slate-100 text-slate-600", paused: "bg-amber-100 text-amber-700", error: "bg-red-100 text-red-700" };

const emptyForm = { name: "", purpose: "", agent_type: "custom", department: "Engineering", skills: "", permissions: "", connected_modules: "", supervisor: "", canon_categories: "", assigned_work: "", status: "idle", avatar_color: "#6366f1" };

export default function AgentRoster() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [taskInput, setTaskInput] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [taskResult, setTaskResult] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");

  const load = () => {
    setLoading(true);
    base44.entities.AgentProfile.list("-created_date", 100).then(data => {
      setAgents(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, purpose: editing.purpose,
        agent_type: editing.agent_type || "custom",
        department: editing.department || "Engineering",
        skills: (editing.skills || []).join(", "),
        permissions: (editing.permissions || []).join(", "),
        connected_modules: (editing.connected_modules || []).join(", "),
        supervisor: editing.supervisor || "",
        canon_categories: (editing.canon_categories || []).join(", "),
        assigned_work: editing.assigned_work || "",
        status: editing.status || "idle",
        avatar_color: editing.avatar_color || "#6366f1",
      });
    } else { setForm(emptyForm); }
  }, [editing, formOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      permissions: form.permissions.split(",").map(s => s.trim()).filter(Boolean),
      connected_modules: form.connected_modules.split(",").map(s => s.trim()).filter(Boolean),
      canon_categories: form.canon_categories.split(",").map(s => s.trim()).filter(Boolean),
      activity_log: editing?.activity_log || [],
    };
    let result;
    if (editing) result = await base44.entities.AgentProfile.update(editing.id, data);
    else { result = await base44.entities.AgentProfile.create(data); setSelected(result); }
    setSaving(false); setFormOpen(false); setEditing(null); load();
  };

  const dispatchTask = async () => {
    if (!taskInput.trim() || !selected) return;
    setDispatching(true); setTaskResult(null);
    const agentType = AGENT_TYPES.find(t => t.value === selected.agent_type);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ${selected.name}, a specialized AI agent in the Nautical Compass OS (NCOS) system.

Agent Type: ${agentType?.label || selected.agent_type}
Role: ${selected.purpose}
Department: ${selected.department || "General"}
Skills: ${(selected.skills || []).join(", ")}
Connected Modules: ${(selected.connected_modules || []).join(", ")}
Supervisor: ${selected.supervisor || "None"}

TASK: ${taskInput}

Respond professionally and thoroughly as this specialized agent. If you are a legal agent, always note that your output is informational only and not legal advice. Never fabricate legal citations.`
    });
    const logEntry = { task: taskInput, response_preview: result.slice(0, 150), at: new Date().toISOString() };
    const updatedLog = [...(selected.activity_log || []), logEntry];
    const tasksCompleted = (selected.tasks_completed || 0) + 1;
    await base44.entities.AgentProfile.update(selected.id, {
      activity_log: updatedLog, status: "active",
      tasks_completed: tasksCompleted, last_active: new Date().toISOString()
    });
    setSelected({ ...selected, activity_log: updatedLog, status: "active", tasks_completed: tasksCompleted });
    setTaskResult(result); setTaskInput(""); setDispatching(false);
  };

  const grouped = agents.reduce((acc, a) => {
    const dept = a.department || "General";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(a);
    return acc;
  }, {});

  const filteredAgents = typeFilter === "all" ? agents : agents.filter(a => a.agent_type === typeFilter);

  // Metrics
  const totalTasks = agents.reduce((s, a) => s + (a.tasks_completed || 0), 0);
  const activeCount = agents.filter(a => a.status === "active").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">NCOS · AI Workforce</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-violet-500" />Agent Roster
          </h1>
          <p className="text-sm text-muted-foreground">{agents.length} agents · {activeCount} active · {totalTasks} tasks completed</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }} size="sm"><Plus className="w-4 h-4 mr-1.5" />Deploy Agent</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Agents", value: agents.length, color: "text-violet-500", icon: Bot },
          { label: "Active", value: activeCount, color: "text-emerald-500", icon: CheckCircle },
          { label: "Tasks Done", value: totalTasks, color: "text-blue-500", icon: BarChart3 },
          { label: "Departments", value: Object.keys(grouped).length, color: "text-amber-500", icon: Users },
        ].map(k => (
          <Card key={k.label} className="p-3 border border-border/60 flex items-center gap-3">
            <k.icon className={`w-5 h-5 ${k.color}`} />
            <div><p className="text-xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
          </Card>
        ))}
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-16"><Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" /><p className="text-muted-foreground text-sm">No agents deployed. Build your workforce.</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster */}
          <div className="lg:col-span-1">
            <div className="mb-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {AGENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
              {filteredAgents.map(agent => {
                const agentType = AGENT_TYPES.find(t => t.value === agent.agent_type);
                return (
                  <div key={agent.id} onClick={() => { setSelected(agent); setTaskResult(null); }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${selected?.id === agent.id ? "bg-primary/10 border-primary/30" : "hover:bg-muted border-transparent"}`}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 text-base" style={{ background: agent.avatar_color || "#6366f1" }}>
                      {agentType?.icon || agent.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge className={`text-[9px] px-1.5 ${statusBg[agent.status] || ""}`}>{agent.status}</Badge>
                        <span className="text-[9px] text-muted-foreground truncate">{agent.department}</span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground flex-shrink-0">{agent.tasks_completed || 0}✓</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          {selected && (
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-5 border border-border/60">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: selected.avatar_color || "#6366f1" }}>
                      {AGENT_TYPES.find(t => t.value === selected.agent_type)?.icon || "🤖"}
                    </div>
                    <div>
                      <h2 className="text-base font-bold">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground line-clamp-1">{selected.purpose}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-[10px] ${statusBg[selected.status] || ""}`}>{selected.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{selected.department}</Badge>
                        {selected.supervisor && <span className="text-[10px] text-muted-foreground">→ {selected.supervisor}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setFormOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={async () => { await base44.entities.AgentProfile.delete(selected.id); setSelected(null); load(); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                <Tabs defaultValue="dispatch">
                  <TabsList className="mb-4 flex-wrap h-auto">
                    <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dispatch" className="space-y-3">
                    <Textarea value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder={`Assign a task to ${selected.name}...`} rows={3} className="text-sm resize-none" />
                    <div className="flex justify-end">
                      <Button onClick={dispatchTask} disabled={dispatching || !taskInput.trim()}>
                        {dispatching ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Running...</> : <><Send className="w-4 h-4 mr-1.5" />Dispatch</>}
                      </Button>
                    </div>
                    {taskResult && (
                      <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap border border-border/40 max-h-72 overflow-y-auto leading-relaxed">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">↩ {selected.name.toUpperCase()}</p>
                        {taskResult}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-4">
                    {(selected.skills || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">SKILLS</p><div className="flex flex-wrap gap-1">{selected.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div></div>}
                    {(selected.permissions || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">PERMISSIONS</p><div className="flex flex-wrap gap-1">{selected.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}</div></div>}
                    {(selected.canon_categories || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">CANON CATEGORIES</p><div className="flex flex-wrap gap-1">{selected.canon_categories.map(c => <Badge key={c} className="text-xs bg-amber-50 text-amber-700 border border-amber-200">{c}</Badge>)}</div></div>}
                    {(selected.connected_modules || []).length > 0 && <div><p className="text-xs font-semibold text-muted-foreground mb-2">CONNECTED MODULES</p><div className="flex flex-wrap gap-1">{selected.connected_modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div></div>}
                    {selected.assigned_work && <div><p className="text-xs font-semibold text-muted-foreground mb-1">ASSIGNED WORK</p><p className="text-sm bg-muted p-3 rounded-lg">{selected.assigned_work}</p></div>}
                  </TabsContent>

                  <TabsContent value="metrics">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Tasks Completed", value: selected.tasks_completed || 0 },
                        { label: "Tasks Failed", value: selected.tasks_failed || 0 },
                        { label: "Activity Logs", value: (selected.activity_log || []).length },
                        { label: "Last Active", value: selected.last_active ? moment(selected.last_active).fromNow() : "Never" },
                      ].map(m => (
                        <Card key={m.label} className="p-3 border border-border/60 text-center">
                          <p className="text-2xl font-bold">{m.value}</p>
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="history">
                    {(selected.activity_log || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {[...(selected.activity_log || [])].reverse().map((entry, i) => (
                          <div key={i} className="p-3 bg-muted rounded-lg text-xs">
                            <p className="font-medium truncate">{entry.task}</p>
                            <p className="text-muted-foreground mt-0.5 line-clamp-2">{entry.response_preview}...</p>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Agent" : "Deploy AI Agent"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Agent Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div><Label>Agent Type</Label>
                <Select value={form.agent_type} onValueChange={v => { const t = AGENT_TYPES.find(x => x.value === v); setForm({...form, agent_type: v, department: t?.dept || form.department}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AGENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Purpose / Role Description</Label><Textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={2} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <div><Label>Supervisor</Label><Input value={form.supervisor} onChange={e => setForm({...form, supervisor: e.target.value})} placeholder="Agent or human name" /></div>
            </div>
            <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} /></div>
            <div><Label>Permissions (comma-separated)</Label><Input value={form.permissions} onChange={e => setForm({...form, permissions: e.target.value})} /></div>
            <div><Label>Canon Categories (comma-separated)</Label><Input value={form.canon_categories} onChange={e => setForm({...form, canon_categories: e.target.value})} placeholder="federal_statute, case_law..." /></div>
            <div><Label>Connected Modules</Label><Input value={form.connected_modules} onChange={e => setForm({...form, connected_modules: e.target.value})} placeholder="Evidence Vault, JurisEngine..." /></div>
            <div><Label>Assigned Work</Label><Textarea value={form.assigned_work} onChange={e => setForm({...form, assigned_work: e.target.value})} rows={2} /></div>
            <div className="flex items-center gap-3">
              <div className="flex-1"><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active","idle","paused"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Avatar Color</Label><input type="color" value={form.avatar_color} onChange={e => setForm({...form, avatar_color: e.target.value})} className="h-9 w-16 rounded cursor-pointer mt-1 border" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Deploy"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}